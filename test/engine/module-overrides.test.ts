import { describe, test, expect, beforeEach } from 'bun:test';
import { ModuleOverrideManager } from '../../src/engine/module-overrides';
import { Module } from '../../src/types';
import { Config } from '../../src/config/config';

describe('Module Overrides', () => {
  let overrideManager: ModuleOverrideManager;
  let testModule: Module;
  
  beforeEach(() => {
    testModule = {
      name: 'test_module',
      states: {
        Initial: {
          type: 'Initial',
          direct_transition: 'Choice'
        },
        Choice: {
          type: 'Simple',
          distributed_transition: [
            {
              transition: 'Path1',
              distribution: 0.7
            },
            {
              transition: 'Path2', 
              distribution: 0.3
            }
          ]
        },
        Path1: {
          type: 'SetAttribute',
          attribute: 'test_attr',
          value: 'original',
          direct_transition: 'Terminal'
        },
        Path2: {
          type: 'Simple',
          direct_transition: 'Terminal'
        },
        Terminal: {
          type: 'Terminal'
        }
      }
    };
  });
  
  test('should apply simple value override', () => {
    const config = new Config();
    overrideManager = new ModuleOverrideManager(config);
    
    overrideManager.addOverride({
      module: 'test_module',
      state: 'Path1',
      path: 'value',
      value: 'overridden'
    });
    
    const overridden = overrideManager.applyOverrides(testModule);
    
    expect(overridden.states.Path1.value).toBe('overridden');
    expect(testModule.states.Path1.value).toBe('original'); // Original unchanged
  });
  
  test('should apply distribution override', () => {
    const config = new Config();
    overrideManager = new ModuleOverrideManager(config);
    
    overrideManager.addOverride({
      module: 'test_module',
      state: 'Choice',
      path: 'distributed_transition.0.distribution',
      value: 0.5
    });
    
    overrideManager.addOverride({
      module: 'test_module',
      state: 'Choice',
      path: 'distributed_transition.1.distribution',
      value: 0.5
    });
    
    const overridden = overrideManager.applyOverrides(testModule);
    
    expect(overridden.states.Choice.distributed_transition?.[0].distribution).toBe(0.5);
    expect(overridden.states.Choice.distributed_transition?.[1].distribution).toBe(0.5);
  });
  
  test('should apply wildcard module override', () => {
    const config = new Config();
    overrideManager = new ModuleOverrideManager(config);
    
    overrideManager.addOverride({
      module: '*',
      path: 'type',
      value: 'Modified'
    });
    
    const overridden = overrideManager.applyOverrides(testModule);
    
    // All states should have modified type (though this would break the module)
    expect(overridden.states.Initial.type).toBe('Modified');
    expect(overridden.states.Choice.type).toBe('Modified');
    expect(overridden.states.Path1.type).toBe('Modified');
  });
  
  test('should load overrides from config', () => {
    const config = new Config();
    config.set('modules.overrides', [
      {
        module: 'test_module',
        state: 'Path1',
        path: 'attribute',
        value: 'config_attr'
      }
    ]);
    
    overrideManager = new ModuleOverrideManager(config);
    
    const overridden = overrideManager.applyOverrides(testModule);
    expect(overridden.states.Path1.attribute).toBe('config_attr');
  });
  
  test('should load module-specific overrides from config', () => {
    const config = new Config();
    config.set('modules.overrides_by_module', {
      test_module: {
        'states.Path1.value': 'module_override',
        'states.Choice.distributed_transition.0.distribution': 0.9,
        'states.Choice.distributed_transition.1.distribution': 0.1
      }
    });
    
    overrideManager = new ModuleOverrideManager(config);
    
    const overridden = overrideManager.applyOverrides(testModule);
    expect(overridden.states.Path1.value).toBe('module_override');
    expect(overridden.states.Choice.distributed_transition?.[0].distribution).toBe(0.9);
    expect(overridden.states.Choice.distributed_transition?.[1].distribution).toBe(0.1);
  });
  
  test('should handle nested path overrides', () => {
    const complexModule: Module = {
      name: 'complex',
      states: {
        Test: {
          type: 'ConditionOnset',
          target_encounter: 'Test',
          codes: [
            {
              system: 'SNOMED-CT',
              code: '12345',
              display: 'Original Display'
            }
          ],
          direct_transition: 'Terminal'
        },
        Terminal: {
          type: 'Terminal'
        }
      }
    };
    
    const config = new Config();
    overrideManager = new ModuleOverrideManager(config);
    
    overrideManager.addOverride({
      module: 'complex',
      state: 'Test',
      path: 'codes.0.display',
      value: 'Overridden Display'
    });
    
    const overridden = overrideManager.applyOverrides(complexModule);
    expect((overridden.states.Test as any).codes[0].display).toBe('Overridden Display');
  });
  
  test('should ignore invalid paths gracefully', () => {
    const config = new Config();
    overrideManager = new ModuleOverrideManager(config);
    
    overrideManager.addOverride({
      module: 'test_module',
      path: 'non.existent.path',
      value: 'ignored'
    });
    
    // Should not throw
    const overridden = overrideManager.applyOverrides(testModule);
    expect(overridden).toBeDefined();
  });
  
  test('should clear overrides', () => {
    const config = new Config();
    overrideManager = new ModuleOverrideManager(config);
    
    overrideManager.addOverride({
      module: 'test_module',
      state: 'Path1',
      path: 'value',
      value: 'overridden'
    });
    
    expect(overrideManager.getOverrides()).toHaveLength(1);
    
    overrideManager.clearOverrides();
    
    expect(overrideManager.getOverrides()).toHaveLength(0);
    
    const overridden = overrideManager.applyOverrides(testModule);
    expect(overridden.states.Path1.value).toBe('original');
  });
  
  test('should handle array creation for new paths', () => {
    const simpleModule: Module = {
      name: 'simple',
      states: {
        Test: {
          type: 'Simple',
          direct_transition: 'Terminal'
        },
        Terminal: {
          type: 'Terminal'
        }
      }
    };
    
    const config = new Config();
    overrideManager = new ModuleOverrideManager(config);
    
    // This would add a distributed transition where none existed
    overrideManager.addOverride({
      module: 'simple',
      state: 'Test',
      path: 'distributed_transition',
      value: [
        { transition: 'Terminal', distribution: 1.0 }
      ]
    });
    
    const overridden = overrideManager.applyOverrides(simpleModule);
    expect((overridden.states.Test as any).distributed_transition).toEqual([
      { transition: 'Terminal', distribution: 1.0 }
    ]);
    expect((overridden.states.Test as any).direct_transition).toBe('Terminal');
  });
});