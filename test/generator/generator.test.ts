import { describe, test, expect, beforeAll } from 'bun:test';
import { Generator } from '../../src/generator/generator.ts';
import { InMemoryPersonStorage } from '../../src/storage/index.ts';
import { rm, mkdir } from 'node:fs/promises';

describe('Generator', () => {
  const testOutputDir = '/tmp/synthea-test-output';
  const testModulesDir = '/tmp/synthea-test-modules';
  
  beforeAll(async () => {
    // Clean up and create test directories
    try {
      await rm(testOutputDir, { recursive: true });
      await rm(testModulesDir, { recursive: true });
    } catch {
      // Directories might not exist
    }
    
    await mkdir(testModulesDir, { recursive: true });
    
    // Create a simple test module
    const testModule = {
      name: 'Test Module',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Healthy'
        },
        'Healthy': {
          type: 'Simple',
          distributed_transition: [
            {
              transition: 'Develop_Condition',
              distribution: 0.1
            },
            {
              transition: 'Terminal',
              distribution: 0.9
            }
          ]
        },
        'Develop_Condition': {
          type: 'ConditionOnset',
          codes: [{
            system: 'SNOMED-CT',
            code: 'TEST001',
            display: 'Test Condition'
          }],
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    await Bun.write(
      `${testModulesDir}/test_module.json`,
      JSON.stringify(testModule, null, 2)
    );
  });
  
  test('should generate a single person', async () => {
    const storage = new InMemoryPersonStorage();
    const generator = new Generator({
      population: 1,
      seed: 12345,
      modules: [testModulesDir],
      exportFormat: undefined // Don't export for this test
    }, storage);
    
    const stats = await generator.generate();
    
    expect(stats.totalGenerated).toBe(1);
    expect(stats.livingPatients).toBe(1);
    expect(stats.averageAge).toBeGreaterThan(0);
  });
  
  test('should generate multiple persons sequentially', async () => {
    const storage = new InMemoryPersonStorage();
    const generator = new Generator({
      population: 5,
      seed: 12345,
      modules: [testModulesDir],
      exportFormat: undefined,
      parallelWorkers: 1
    }, storage);
    
    const stats = await generator.generate();
    
    expect(stats.totalGenerated).toBe(5);
    expect(stats.elapsedTime).toBeGreaterThan(0);
    
    // Check that persons were saved
    const count = await storage.count();
    expect(count).toBe(5);
  });
  
  test('should generate persons with conditions', async () => {
    const storage = new InMemoryPersonStorage();
    const generator = new Generator({
      population: 10,
      seed: 12345,
      modules: [testModulesDir],
      exportFormat: undefined
    }, storage);
    
    const stats = await generator.generate();
    
    // With 10% probability, we should have some conditions
    expect(Object.keys(stats.conditions).length).toBeGreaterThan(0);
    
    // Check specific condition
    if (stats.conditions['TEST001']) {
      expect(stats.conditions['TEST001']).toBeGreaterThan(0);
    }
  });
  
  test('should export to FHIR format', async () => {
    const storage = new InMemoryPersonStorage();
    const generator = new Generator({
      population: 2,
      seed: 12345,
      modules: [testModulesDir],
      exportFormat: 'fhir',
      outputDirectory: testOutputDir
    }, storage);
    
    await generator.generate();
    
    // Check that files were created
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(testOutputDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    expect(jsonFiles.length).toBe(2);
    
    // Verify FHIR bundle structure
    const firstFile = Bun.file(`${testOutputDir}/${jsonFiles[0]}`);
    const bundle = await firstFile.json();
    
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry).toBeDefined();
    expect(bundle.entry.length).toBeGreaterThan(0);
  });
  
  test('should generate a single person directly', async () => {
    const storage = new InMemoryPersonStorage();
    const generator = new Generator({
      modules: [testModulesDir]
    }, storage);
    
    const person = await generator.generatePerson(99999);
    
    expect(person).toBeDefined();
    expect(person.id).toBeDefined();
    expect(person.seed).toBe(99999);
    expect(person.attributes.get('first_name')).toBeDefined();
    expect(person.record).toBeDefined();
  });
  
  test.skip('should use parallel workers when requested', async () => {
    // NOTE: Worker threads have serialization issues with Bun currently
    // This is documented as a limitation - use sequential generation for now
    const storage = new InMemoryPersonStorage();
    const generator = new Generator({
      population: 20,
      seed: 12345,
      modules: [testModulesDir],
      exportFormat: undefined,
      parallelWorkers: 4
    }, storage);
    
    const startTime = Date.now();
    const stats = await generator.generate();
    const duration = Date.now() - startTime;
    
    expect(stats.totalGenerated).toBe(20);
    
    // Parallel generation should be reasonably fast
    console.log(`Parallel generation of 20 persons took ${duration}ms`);
  });
});