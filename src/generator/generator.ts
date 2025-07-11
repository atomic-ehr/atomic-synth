import { 
  GeneratorOptions, 
  GenerationStats, 
  Person 
} from '../types/index.ts';
import { PersonFactory } from '../models/person-factory.ts';
import { ModuleLoader } from '../engine/module-loader.ts';
import { PersonStorage, InMemoryPersonStorage } from '../storage/index.ts';
import { FHIRExporter } from '../export/fhir/index.ts';
import { WorkerPool } from './worker-pool.ts';
import { registerAllStates } from '../engine/states/index.ts';

export class Generator {
  private options: GeneratorOptions;
  private storage: PersonStorage;
  private moduleLoader: ModuleLoader;
  private workerPool?: WorkerPool;
  private startTime: number = 0;
  
  constructor(
    options: GeneratorOptions,
    storage: PersonStorage = new InMemoryPersonStorage()
  ) {
    this.options = {
      population: 1,
      timestep: 604800000, // 1 week in ms
      referenceTime: Date.now(),
      parallelWorkers: 1,
      outputDirectory: './output',
      exportFormat: 'fhir',
      ...options
    };
    
    this.storage = storage;
    this.moduleLoader = new ModuleLoader();
    
    // Register all state types
    registerAllStates();
    
    // Initialize worker pool if parallel generation requested
    if (this.options.parallelWorkers && this.options.parallelWorkers > 1) {
      this.workerPool = new WorkerPool(this.options.parallelWorkers);
    }
  }
  
  // Main generation method
  async generate(): Promise<GenerationStats> {
    this.startTime = Date.now();
    
    // Load modules
    const modulesDir = this.options.modules?.[0] || './modules';
    const modules = await this.moduleLoader.loadAllModules(modulesDir);
    
    console.log(`Loaded ${modules.size} modules`);
    
    // Generate persons
    const persons = await this.generatePopulation();
    
    // Export if requested
    if (this.options.exportFormat) {
      await this.exportPersons(persons);
    }
    
    // Calculate statistics
    const stats = this.calculateStats(persons);
    
    // Cleanup
    if (this.workerPool) {
      await this.workerPool.terminate();
    }
    
    return stats;
  }
  
  // Generate a single person
  async generatePerson(seed?: number): Promise<Person> {
    const person = PersonFactory.createPerson({
      seed: seed || this.options.seed
    });
    
    // Process all modules for this person
    const modules = this.moduleLoader.getAllModules();
    
    for (const [name, moduleResult] of modules) {
      if (moduleResult.errors.length > 0) {
        console.warn(`Skipping module ${name} due to errors`);
        continue;
      }
      
      // Simulate person's entire life
      let time = person.birthDate.getTime();
      const endTime = this.options.referenceTime || Date.now();
      
      while (time <= endTime && person.attributes.get('alive')) {
        await moduleResult.engine.process(person, time);
        time += this.options.timestep || 604800000; // 1 week
      }
    }
    
    // Save person
    await this.storage.save(person);
    
    return person;
  }
  
  // Generate the population
  private async generatePopulation(): Promise<Person[]> {
    const population = this.options.population;
    const baseSeeds = this.generateSeeds(population);
    
    if (this.workerPool && population > 10) {
      // Use workers for parallel generation
      return this.generateWithWorkers(baseSeeds);
    } else {
      // Generate sequentially
      return this.generateSequentially(baseSeeds);
    }
  }
  
  // Generate persons sequentially
  private async generateSequentially(seeds: number[]): Promise<Person[]> {
    const persons: Person[] = [];
    
    for (let i = 0; i < seeds.length; i++) {
      const person = await this.generatePerson(seeds[i]);
      persons.push(person);
      
      // Progress logging
      if ((i + 1) % 10 === 0) {
        console.log(`Generated ${i + 1}/${seeds.length} persons`);
      }
    }
    
    return persons;
  }
  
  // Generate persons using workers
  private async generateWithWorkers(seeds: number[]): Promise<Person[]> {
    console.log(`Generating ${seeds.length} persons using ${this.options.parallelWorkers} workers`);
    
    const results = await this.workerPool!.generate(seeds, {
      modules: this.options.modules,
      timestep: this.options.timestep,
      referenceTime: this.options.referenceTime
    });
    
    // Save all persons
    await this.storage.saveBatch(results);
    
    return results;
  }
  
  // Generate seeds for persons
  private generateSeeds(count: number): number[] {
    const baseSeed = this.options.seed || Date.now();
    const seeds: number[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate deterministic seeds based on base seed
      seeds.push(baseSeed + i * 1000);
    }
    
    return seeds;
  }
  
  // Export persons to files
  private async exportPersons(persons: Person[]): Promise<void> {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(this.options.outputDirectory!, { recursive: true });
    
    if (this.options.exportFormat === 'fhir') {
      const exporter = new FHIRExporter();
      
      for (const person of persons) {
        const filepath = `${this.options.outputDirectory}/${person.id}.json`;
        await exporter.exportToFile(person, filepath);
      }
      
      console.log(`Exported ${persons.length} FHIR bundles to ${this.options.outputDirectory}`);
    }
    
    // Add other export formats as needed
  }
  
  // Calculate generation statistics
  private calculateStats(persons: Person[]): GenerationStats {
    const elapsedTime = Date.now() - this.startTime;
    
    const stats: GenerationStats = {
      totalGenerated: persons.length,
      livingPatients: 0,
      deceasedPatients: 0,
      averageAge: 0,
      conditions: {},
      medications: {},
      procedures: {},
      elapsedTime
    };
    
    let totalAge = 0;
    
    for (const person of persons) {
      // Living vs deceased
      if (person.deathDate) {
        stats.deceasedPatients++;
      } else {
        stats.livingPatients++;
      }
      
      // Age calculation
      const ageMs = (this.options.referenceTime || Date.now()) - person.birthDate.getTime();
      totalAge += ageMs / (365.25 * 24 * 60 * 60 * 1000);
      
      // Condition counts
      for (const condition of person.record.conditions) {
        const code = condition.codes.coding[0]?.code || 'unknown';
        stats.conditions[code] = (stats.conditions[code] || 0) + 1;
      }
      
      // Medication counts
      for (const medication of person.record.medications) {
        const code = medication.codes.coding[0]?.code || 'unknown';
        stats.medications[code] = (stats.medications[code] || 0) + 1;
      }
      
      // Procedure counts
      for (const procedure of person.record.procedures) {
        const code = procedure.codes.coding[0]?.code || 'unknown';
        stats.procedures[code] = (stats.procedures[code] || 0) + 1;
      }
    }
    
    stats.averageAge = persons.length > 0 ? totalAge / persons.length : 0;
    
    return stats;
  }
}