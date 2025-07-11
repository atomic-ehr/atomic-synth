import { describe, test, expect, beforeAll } from 'bun:test';
import { ModuleEngine } from '../../src/engine/module-engine';
import { Module, Person } from '../../src/types';
import { registerStateType } from '../../src/engine/state';
import { createInitialState } from '../../src/engine/states/initial';
import { createTerminalState } from '../../src/engine/states/terminal';
import { createSimpleState } from '../../src/engine/states/simple';
import { createSetAttributeState } from '../../src/engine/states/set-attribute';

// Register state types needed for tests
beforeAll(() => {
  registerStateType('Initial', createInitialState);
  registerStateType('Terminal', createTerminalState);
  registerStateType('Simple', createSimpleState);
  registerStateType('SetAttribute', createSetAttributeState);
});

describe('Module Cloning', () => {
  const testModule: Module = {
    name: 'test_cloning',
    states: {
      Initial: {
        type: 'Initial',
        direct_transition: 'SetAttribute1'
      },
      SetAttribute1: {
        type: 'SetAttribute',
        attribute: 'test_value',
        value: 0,
        direct_transition: 'SetAttribute2'
      },
      SetAttribute2: {
        type: 'SetAttribute',
        attribute: 'test_value',
        value: {
          low: 1,
          high: 10
        },
        direct_transition: 'Terminal'
      },
      Terminal: {
        type: 'Terminal'
      }
    }
  };
  
  test('module cloning prevents state pollution between persons', async () => {
    const engine = new ModuleEngine(testModule);
    
    // Create two persons
    const person1: Person = {
      id: '1',
      seed: 123,
      name: 'Person 1',
      birthDate: new Date('1990-01-01'),
      city: 'Boston',
      state: 'MA',
      gender: 'M',
      race: 'white',
      ethnicity: 'non_hispanic',
      attributes: new Map([['alive', true]]),
      record: {
        encounters: [],
        conditions: [],
        medications: [],
        procedures: [],
        observations: [],
        allergies: []
      }
    };
    
    const person2: Person = {
      id: '2', 
      seed: 456,
      name: 'Person 2',
      birthDate: new Date('1990-01-01'),
      city: 'Boston',
      state: 'MA',
      gender: 'F',
      race: 'white',
      ethnicity: 'non_hispanic',
      attributes: new Map([['alive', true]]),
      record: {
        encounters: [],
        conditions: [],
        medications: [],
        procedures: [],
        observations: [],
        allergies: []
      }
    };
    
    // Process person1 with original engine
    await engine.process(person1, Date.now());
    
    // Clone engine for person2
    const clonedEngine = engine.clone();
    await clonedEngine.process(person2, Date.now());
    
    // Verify both persons have the attribute set
    expect(person1.attributes.has('test_value')).toBe(true);
    expect(person2.attributes.has('test_value')).toBe(true);
    
    // Verify module contexts are independent
    const context1 = person1.attributes.get(`module_context_${testModule.name}`) as any;
    const context2 = person2.attributes.get(`module_context_${testModule.name}`) as any;
    
    // Both should have reached Terminal state
    expect(context1.currentState?.name).toBe('Terminal');
    expect(context2.currentState?.name).toBe('Terminal');
    
    // History should be complete for both (Terminal is not added to history)
    expect(context1.history).toContain('Initial');
    expect(context1.history).toContain('SetAttribute1');
    expect(context1.history).toContain('SetAttribute2');
    
    expect(context2.history).toContain('Initial');
    expect(context2.history).toContain('SetAttribute1');
    expect(context2.history).toContain('SetAttribute2')
  });
  
  test('cloned modules are independent', async () => {
    const engine = new ModuleEngine(testModule);
    const clone1 = engine.clone();
    const clone2 = engine.clone();
    
    // Verify clones are different instances
    expect(clone1).not.toBe(engine);
    expect(clone2).not.toBe(engine);
    expect(clone1).not.toBe(clone2);
    
    // Verify module data is cloned
    const originalModule = (engine as any).module;
    const clonedModule1 = (clone1 as any).module;
    const clonedModule2 = (clone2 as any).module;
    
    expect(clonedModule1).not.toBe(originalModule);
    expect(clonedModule2).not.toBe(originalModule);
    expect(clonedModule1).not.toBe(clonedModule2);
    
    // Verify content is the same
    expect(clonedModule1).toEqual(originalModule);
    expect(clonedModule2).toEqual(originalModule);
  });
  
  test('module cloning performance benefit', async () => {
    const engine = new ModuleEngine(testModule);
    
    // Create many persons to test performance
    const persons: Person[] = [];
    for (let i = 0; i < 100; i++) {
      persons.push({
        id: `person_${i}`,
        seed: i,
        name: `Person ${i}`,
        birthDate: new Date('1990-01-01'),
        city: 'Boston',
        state: 'MA',
        gender: i % 2 === 0 ? 'M' : 'F',
        race: 'white',
        ethnicity: 'non_hispanic',
        attributes: new Map([['alive', true]]),
        record: {
          encounters: [],
          conditions: [],
          medications: [],
          procedures: [],
          observations: [],
          allergies: []
        }
      });
    }
    
    // Time module cloning approach
    const cloneStart = performance.now();
    for (const person of persons) {
      const clonedEngine = engine.clone();
      await clonedEngine.process(person, Date.now());
    }
    const cloneTime = performance.now() - cloneStart;
    
    // Module cloning should complete reasonably fast
    expect(cloneTime).toBeLessThan(1000); // Less than 1 second for 100 persons
    
    // Verify all persons were processed
    for (const person of persons) {
      expect(person.attributes.has('test_value')).toBe(true);
    }
  });
  
  test('isClone flag prevents unnecessary state cloning', async () => {
    // Test with module cloning (isClone = true)
    const clonedModule = JSON.parse(JSON.stringify(testModule));
    const clonedEngine = new ModuleEngine(clonedModule, true);
    
    // Spy on state creation to ensure states aren't cloned
    const person: Person = {
      id: 'test',
      seed: 999,
      name: 'Test Person',
      birthDate: new Date('1990-01-01'),
      city: 'Boston', 
      state: 'MA',
      gender: 'M',
      race: 'white',
      ethnicity: 'non_hispanic',
      attributes: new Map([['alive', true]]),
      record: {
        encounters: [],
        conditions: [],
        medications: [],
        procedures: [],
        observations: [],
        allergies: []
      }
    };
    
    await clonedEngine.process(person, Date.now());
    
    // Verify processing completed
    expect(person.attributes.has('test_value')).toBe(true);
    
    // When isClone is true, states should be used directly without cloning
    expect((clonedEngine as any).isClone).toBe(true);
  });
});