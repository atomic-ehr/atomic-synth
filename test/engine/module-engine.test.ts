import { describe, test, expect, beforeAll } from 'bun:test';
import { ModuleEngine } from '../../src/engine/module-engine.ts';
import { Module, Person, HealthRecord } from '../../src/types/index.ts';
import { registerAllStates } from '../../src/engine/states/index.ts';

// Register all state types before tests
beforeAll(() => {
  registerAllStates();
});

describe('ModuleEngine', () => {
  // Helper to create a test person
  function createTestPerson(): Person {
    return {
      id: 'test-person',
      seed: 12345,
      attributes: new Map([['alive', true]]),
      record: {
        encounters: [],
        conditions: [],
        medications: [],
        observations: [],
        procedures: [],
        immunizations: [],
        carePlans: [],
        allergies: [],
        devices: [],
        imagingStudies: []
      },
      birthDate: new Date('1980-01-01'),
      gender: 'M',
      race: 'White',
      ethnicity: 'Not Hispanic or Latino'
    };
  }
  
  test('should process a simple module', async () => {
    const module: Module = {
      name: 'Simple Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Set_Value'
        },
        'Set_Value': {
          type: 'SetAttribute',
          attribute: 'test_value',
          value: 42,
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    const person = createTestPerson();
    
    await engine.process(person, Date.now());
    
    expect(person.attributes.get('test_value')).toBe(42);
  });
  
  test('should handle conditional transitions', async () => {
    const module: Module = {
      name: 'Conditional Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Check_Gender'
        },
        'Check_Gender': {
          type: 'Simple',
          conditional_transition: [
            {
              condition: {
                condition_type: 'Gender',
                gender: 'M'
              },
              transition: 'Male_Path'
            },
            {
              transition: 'Female_Path'
            }
          ]
        },
        'Male_Path': {
          type: 'SetAttribute',
          attribute: 'path',
          value: 'male',
          direct_transition: 'Terminal'
        },
        'Female_Path': {
          type: 'SetAttribute',
          attribute: 'path',
          value: 'female',
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    const person = createTestPerson();
    
    await engine.process(person, Date.now());
    
    expect(person.attributes.get('path')).toBe('male');
  });
  
  test('should handle guard states', async () => {
    const module: Module = {
      name: 'Guard Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Age_Guard'
        },
        'Age_Guard': {
          type: 'Guard',
          allow: {
            condition_type: 'Age',
            operator: '>=',
            quantity: 18,
            unit: 'years'
          },
          direct_transition: 'Adult'
        },
        'Adult': {
          type: 'SetAttribute',
          attribute: 'is_adult',
          value: true,
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    const person = createTestPerson();
    
    await engine.process(person, Date.now());
    
    expect(person.attributes.get('is_adult')).toBe(true);
  });
  
  test('should create encounters', async () => {
    const module: Module = {
      name: 'Encounter Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Doctor_Visit'
        },
        'Doctor_Visit': {
          type: 'Encounter',
          encounter_class: 'ambulatory',
          codes: [{
            system: 'SNOMED-CT',
            code: '185349003',
            display: 'Encounter for check up'
          }],
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    const person = createTestPerson();
    
    await engine.process(person, Date.now());
    
    expect(person.record.encounters.length).toBe(1);
    expect(person.record.encounters[0]?.encounterClass).toBe('ambulatory');
  });
  
  test('should validate module structure', () => {
    const invalidModule: Module = {
      name: 'Invalid Test',
      states: {
        'Not_Initial': {
          type: 'Simple',
          direct_transition: 'Missing_State'
        }
      }
    };
    
    const engine = new ModuleEngine(invalidModule);
    const errors = engine.validate();
    
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain('Module must have exactly one Initial state');
    expect(errors.some(e => e.includes('Missing_State'))).toBe(true);
  });
  
  test('should handle delay states', async () => {
    const module: Module = {
      name: 'Delay Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Wait'
        },
        'Wait': {
          type: 'Delay',
          exact: {
            quantity: 100,
            unit: 'seconds'
          },
          direct_transition: 'After_Wait'
        },
        'After_Wait': {
          type: 'SetAttribute',
          attribute: 'waited',
          value: true,
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    const person = createTestPerson();
    const startTime = Date.now();
    
    // First process - should stop at delay
    await engine.process(person, startTime);
    expect(person.attributes.get('waited')).toBeUndefined();
    
    // Process after delay - should continue
    await engine.process(person, startTime + 101000);
    expect(person.attributes.get('waited')).toBe(true);
  });
});