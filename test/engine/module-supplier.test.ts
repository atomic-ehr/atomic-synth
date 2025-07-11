import { describe, test, expect, beforeEach } from 'bun:test';
import { LazyModuleSupplier, createModuleSupplier } from '../../src/engine/module-supplier';
import { Module } from '../../src/types';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { registerStateType } from '../../src/engine/state';
import { createInitialState } from '../../src/engine/states/initial';
import { createTerminalState } from '../../src/engine/states/terminal';

// Register state types needed for tests
registerStateType('Initial', createInitialState);
registerStateType('Terminal', createTerminalState);

describe('Module Supplier', () => {
  let testDir: string;
  
  beforeEach(async () => {
    // Create a temporary directory for test modules
    testDir = join(tmpdir(), `synthea-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });
  
  test('LazyModuleSupplier delays parsing until first access', async () => {
    // Create a test module file
    const modulePath = join(testDir, 'test_module.json');
    const moduleContent = {
      name: 'test_module',
      gmf_version: 2,
      remarks: ['Test module for lazy loading'],
      states: {
        Initial: {
          type: 'Initial',
          direct_transition: 'Terminal'
        },
        Terminal: {
          type: 'Terminal'
        }
      }
    };
    
    await writeFile(modulePath, JSON.stringify(moduleContent, null, 2));
    
    // Create supplier
    const supplier = new LazyModuleSupplier({
      name: 'test_module',
      path: modulePath
    });
    
    // Module should not be loaded yet
    expect((supplier as any)._cachedModule).toBeUndefined();
    expect((supplier as any)._cachedEngine).toBeUndefined();
    
    // Access module - should trigger loading
    const module = await supplier.getModule();
    expect(module.name).toBe('test_module');
    expect((supplier as any)._cachedModule).toBeDefined();
    
    // Second access should use cache
    const module2 = await supplier.getModule();
    expect(module2).toBe(module); // Same instance
  });
  
  test('Module cloning creates independent copies', async () => {
    const modulePath = join(testDir, 'clone_test.json');
    const moduleContent = {
      name: 'clone_test',
      states: {
        Initial: {
          type: 'Initial',
          direct_transition: 'Terminal'
        },
        Terminal: {
          type: 'Terminal'
        }
      }
    };
    
    await writeFile(modulePath, JSON.stringify(moduleContent, null, 2));
    
    const supplier = new LazyModuleSupplier({
      name: 'clone_test',
      path: modulePath
    });
    
    // Get original and clone
    const original = await supplier.getModule();
    const clone = await supplier.cloneModule();
    
    // Should be different instances
    expect(clone).not.toBe(original);
    expect(clone).toEqual(original);
    
    // Modifications to clone should not affect original
    clone.name = 'modified';
    expect(original.name).toBe('clone_test');
    expect(clone.name).toBe('modified');
  });
  
  test('createModuleSupplier extracts metadata without full parse', async () => {
    const modulePath = join(testDir, 'metadata_test.json');
    const moduleContent = {
      name: 'metadata_module',
      gmf_version: 2,
      remarks: [
        'This is a test module',
        'It has multiple remarks'
      ],
      states: {
        Initial: {
          type: 'Initial',
          direct_transition: 'Terminal'
        },
        Terminal: {
          type: 'Terminal'
        }
      }
    };
    
    await writeFile(modulePath, JSON.stringify(moduleContent, null, 2));
    
    // Create supplier using factory
    const supplier = await createModuleSupplier(modulePath);
    
    // Should have extracted metadata without full parse
    expect(supplier.info.name).toBe('metadata_module');
    expect(supplier.info.path).toBe(modulePath);
    expect(supplier.info.gmfVersion).toBe(2);
    expect(supplier.info.remarks).toEqual([
      'This is a test module',
      'It has multiple remarks'
    ]);
    
    // Module should not be loaded yet
    expect((supplier as any)._cachedModule).toBeUndefined();
  });
  
  test('clearCache forces reload on next access', async () => {
    const modulePath = join(testDir, 'cache_test.json');
    let version = 1;
    
    const writeModule = async () => {
      const moduleContent = {
        name: 'cache_test',
        version: version++,
        states: {
          Initial: {
            type: 'Initial',
            direct_transition: 'Terminal'
          },
          Terminal: {
            type: 'Terminal'
          }
        }
      };
      await writeFile(modulePath, JSON.stringify(moduleContent, null, 2));
    };
    
    await writeModule();
    
    const supplier = new LazyModuleSupplier({
      name: 'cache_test',
      path: modulePath
    });
    
    // First load
    const module1 = await supplier.getModule();
    expect((module1 as any).version).toBe(1);
    
    // Update file
    await writeModule();
    
    // Should still get cached version
    const module2 = await supplier.getModule();
    expect((module2 as any).version).toBe(1);
    
    // Clear cache
    supplier.clearCache();
    
    // Should load new version
    const module3 = await supplier.getModule();
    expect((module3 as any).version).toBe(2);
  });
  
  test('getEngine creates and caches ModuleEngine', async () => {
    const modulePath = join(testDir, 'engine_test.json');
    const moduleContent = {
      name: 'engine_test',
      states: {
        Initial: {
          type: 'Initial',
          direct_transition: 'Terminal'
        },
        Terminal: {
          type: 'Terminal'
        }
      }
    };
    
    await writeFile(modulePath, JSON.stringify(moduleContent, null, 2));
    
    const supplier = new LazyModuleSupplier({
      name: 'engine_test',
      path: modulePath
    });
    
    // Engine should not exist yet
    expect((supplier as any)._cachedEngine).toBeUndefined();
    
    // Get engine
    const engine1 = await supplier.getEngine();
    expect(engine1).toBeDefined();
    expect((supplier as any)._cachedEngine).toBeDefined();
    
    // Second access should return cached
    const engine2 = await supplier.getEngine();
    expect(engine2).toBe(engine1);
  });
  
  test('handles invalid module files gracefully', async () => {
    const modulePath = join(testDir, 'invalid.json');
    await writeFile(modulePath, '{ invalid json');
    
    const supplier = new LazyModuleSupplier({
      name: 'invalid',
      path: modulePath
    });
    
    // Should throw when trying to load
    await expect(supplier.getModule()).rejects.toThrow();
  });
});