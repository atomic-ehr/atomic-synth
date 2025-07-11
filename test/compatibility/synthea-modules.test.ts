import { describe, test, expect, beforeAll } from 'bun:test';
import { ModuleLoader } from '../../src/engine/module-loader.ts';
import { ModuleEngine } from '../../src/engine/module-engine.ts';
import { PersonFactory } from '../../src/models/person-factory.ts';
import { registerAllStates } from '../../src/engine/states/index.ts';

describe('Synthea Module Compatibility', () => {
  beforeAll(() => {
    registerAllStates();
  });
  
  test('should load and validate a simple Synthea test module', async () => {
    const modulePath = '/Users/niquola/atomic-ehr-org/atomic-synth/refs/synthea/src/test/resources/generic/delay.json';
    const loader = new ModuleLoader();
    const result = await loader.loadModule(modulePath);
    
    expect(result.errors.length).toBe(0);
    expect(result.module.name).toBe('Delay');
    expect(Object.keys(result.module.states).length).toBeGreaterThan(0);
  });
  
  test('should execute a basic flow with delays', async () => {
    // Create a simplified delay module for testing
    const module = {
      name: 'Simple Delay Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Short_Delay'
        },
        'Short_Delay': {
          type: 'Delay',
          exact: {
            quantity: 1,
            unit: 'seconds'
          },
          direct_transition: 'Mark_Complete'
        },
        'Mark_Complete': {
          type: 'SetAttribute',
          attribute: 'delay_complete',
          value: true,
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    const person = PersonFactory.createPerson();
    
    // Process at start time
    const startTime = Date.now();
    await engine.process(person, startTime);
    
    // Should not be complete yet (delay not finished)
    expect(person.attributes.get('delay_complete')).toBeUndefined();
    
    // Process after delay
    await engine.process(person, startTime + 2000);
    
    // Should be complete now
    expect(person.attributes.get('delay_complete')).toBe(true);
  });
  
  test('should handle encounter state from real module', async () => {
    const module = {
      name: 'Encounter Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Wellness_Encounter'
        },
        'Wellness_Encounter': {
          type: 'Encounter',
          wellness: true,
          encounter_class: 'ambulatory',
          codes: [{
            system: 'SNOMED-CT',
            code: '410620009',
            display: 'Well child visit'
          }],
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    const person = PersonFactory.createPerson();
    
    await engine.process(person, Date.now());
    
    expect(person.record.encounters.length).toBe(1);
    expect(person.record.encounters[0]?.codes.coding[0]?.code).toBe('410620009');
  });
  
  test('should handle distributed transitions', async () => {
    const module = {
      name: 'Distributed Transition Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Choice'
        },
        'Choice': {
          type: 'Simple',
          distributed_transition: [
            {
              transition: 'Path_A',
              distribution: 0.0  // Always skip
            },
            {
              transition: 'Path_B',
              distribution: 1.0  // Always take
            }
          ]
        },
        'Path_A': {
          type: 'SetAttribute',
          attribute: 'path',
          value: 'A',
          direct_transition: 'Terminal'
        },
        'Path_B': {
          type: 'SetAttribute',
          attribute: 'path',
          value: 'B',
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    
    // Test multiple times to ensure deterministic behavior
    for (let i = 0; i < 5; i++) {
      const person = PersonFactory.createPerson({ seed: 12345 + i });
      await engine.process(person, Date.now());
      expect(person.attributes.get('path')).toBe('B');
    }
  });
  
  test('should handle conditional transitions with age', async () => {
    const module = {
      name: 'Age Conditional Test',
      states: {
        'Initial': {
          type: 'Initial',
          direct_transition: 'Age_Check'
        },
        'Age_Check': {
          type: 'Simple',
          conditional_transition: [
            {
              condition: {
                condition_type: 'Age',
                operator: '<',
                quantity: 18,
                unit: 'years'
              },
              transition: 'Child'
            },
            {
              condition: {
                condition_type: 'Age',
                operator: '>=',
                quantity: 65,
                unit: 'years'
              },
              transition: 'Senior'
            },
            {
              transition: 'Adult'  // Default
            }
          ]
        },
        'Child': {
          type: 'SetAttribute',
          attribute: 'age_group',
          value: 'child',
          direct_transition: 'Terminal'
        },
        'Adult': {
          type: 'SetAttribute',
          attribute: 'age_group',
          value: 'adult',
          direct_transition: 'Terminal'
        },
        'Senior': {
          type: 'SetAttribute',
          attribute: 'age_group',
          value: 'senior',
          direct_transition: 'Terminal'
        },
        'Terminal': {
          type: 'Terminal'
        }
      }
    };
    
    const engine = new ModuleEngine(module);
    
    // Test with different ages
    const childPerson = PersonFactory.createPerson({
      birthDate: new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000) // 10 years old
    });
    await engine.process(childPerson, Date.now());
    expect(childPerson.attributes.get('age_group')).toBe('child');
    
    const adultPerson = PersonFactory.createPerson({
      birthDate: new Date(Date.now() - 30 * 365.25 * 24 * 60 * 60 * 1000) // 30 years old
    });
    await engine.process(adultPerson, Date.now());
    expect(adultPerson.attributes.get('age_group')).toBe('adult');
    
    const seniorPerson = PersonFactory.createPerson({
      birthDate: new Date(Date.now() - 70 * 365.25 * 24 * 60 * 60 * 1000) // 70 years old
    });
    await engine.process(seniorPerson, Date.now());
    expect(seniorPerson.attributes.get('age_group')).toBe('senior');
  });
});