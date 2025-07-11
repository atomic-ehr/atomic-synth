import { parentPort } from 'worker_threads';
import { Person } from '../types/index.ts';
import { PersonFactory } from '../models/person-factory.ts';
import { ModuleLoader } from '../engine/module-loader.ts';
import { registerAllStates } from '../engine/states/index.ts';
import type { WorkerMessage, WorkerResult } from './worker-pool.ts';

// Register state types
registerAllStates();

// Module loader instance
const moduleLoader = new ModuleLoader();
let modulesLoaded = false;

// Handle messages from main thread
parentPort?.on('message', async (message: WorkerMessage) => {
  try {
    if (message.cmd === 'generate') {
      const result = await handleGenerate(message.seeds || [], message.options || {});
      parentPort?.postMessage(result);
    } else if (message.cmd === 'terminate') {
      process.exit(0);
    }
  } catch (error) {
    const result: WorkerResult = {
      persons: [],
      error: error instanceof Error ? error.message : String(error)
    };
    parentPort?.postMessage(result);
  }
});

// Generate persons in this worker
async function handleGenerate(seeds: number[], options: any): Promise<WorkerResult> {
  // Load modules if not already loaded
  if (!modulesLoaded) {
    const modulesDir = options.modules?.[0] || './modules';
    await moduleLoader.loadAllModules(modulesDir);
    modulesLoaded = true;
  }
  
  const persons: any[] = []; // Serialize to plain objects
  const modules = moduleLoader.getAllModules();
  
  for (const seed of seeds) {
    const person = PersonFactory.createPerson({ seed });
    
    // Process all modules for this person
    for (const [name, moduleResult] of modules) {
      if (moduleResult.errors.length > 0) {
        continue;
      }
      
      // Simulate person's entire life
      let time = person.birthDate.getTime();
      const endTime = options.referenceTime || Date.now();
      const timestep = options.timestep || 604800000; // 1 week
      
      while (time <= endTime && person.attributes.get('alive')) {
        await moduleResult.engine.process(person, time);
        time += timestep;
      }
    }
    
    // Serialize person for transfer
    persons.push(serializePerson(person));
  }
  
  return {
    persons
  };
}

// Serialize person to plain object for worker transfer
function serializePerson(person: Person): any {
  return {
    id: person.id,
    seed: person.seed,
    attributes: Array.from(person.attributes.entries()),
    record: person.record,
    birthDate: person.birthDate.toISOString(),
    deathDate: person.deathDate?.toISOString(),
    gender: person.gender,
    race: person.race,
    ethnicity: person.ethnicity,
    location: person.location
  };
}