import { Module } from '../types/index.ts';
import { ModuleEngine } from './module-engine.ts';
import { ModuleSupplier, createModuleSupplier } from './module-supplier.ts';
import { ModuleOverrideManager, getOverrideManager } from './module-overrides.ts';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface ModuleLoadResult {
  module: Module;
  engine: ModuleEngine;
  errors: string[];
}

export class ModuleLoader {
  private modules: Map<string, ModuleLoadResult> = new Map();
  private suppliers: Map<string, ModuleSupplier> = new Map();
  private overrideManager: ModuleOverrideManager;
  
  constructor(overrideManager?: ModuleOverrideManager) {
    this.overrideManager = overrideManager || getOverrideManager();
  }
  
  // Register a module supplier (lazy loading)
  async registerModuleSupplier(path: string): Promise<void> {
    const supplier = await createModuleSupplier(path);
    this.suppliers.set(supplier.info.name, supplier);
  }
  
  // Load a single module from a file (immediate loading for backward compatibility)
  async loadModule(path: string): Promise<ModuleLoadResult> {
    try {
      // Create supplier and immediately load
      const supplier = await createModuleSupplier(path);
      this.suppliers.set(supplier.info.name, supplier);
      
      let module = await supplier.getModule();
      
      // Apply overrides
      module = this.overrideManager.applyOverrides(module);
      
      const engine = new ModuleEngine(module);
      const errors = engine.validate();
      
      const result: ModuleLoadResult = {
        module,
        engine,
        errors
      };
      
      // Cache the result
      this.modules.set(module.name, result);
      
      return result;
    } catch (error) {
      return {
        module: { name: 'error', states: {} },
        engine: new ModuleEngine({ name: 'error', states: {} }),
        errors: [`Failed to load module: ${error}`]
      };
    }
  }
  
  // Get a module supplier by name
  getSupplier(name: string): ModuleSupplier | undefined {
    return this.suppliers.get(name);
  }
  
  // Get all registered suppliers
  getAllSuppliers(): Map<string, ModuleSupplier> {
    return new Map(this.suppliers);
  }
  
  // Get a module with overrides applied
  async getModuleWithOverrides(name: string): Promise<Module | undefined> {
    const supplier = this.suppliers.get(name);
    if (!supplier) {
      return undefined;
    }
    
    let module = await supplier.getModule();
    return this.overrideManager.applyOverrides(module);
  }
  
  // Scan and register all module suppliers from a directory (lazy loading)
  async scanModules(directory: string): Promise<Map<string, ModuleSupplier>> {
    const suppliers = new Map<string, ModuleSupplier>();
    
    try {
      // Get all JSON files in directory and subdirectories
      const files = await this.findModuleFiles(directory);
      
      // Register each module supplier
      for (const file of files) {
        try {
          const supplier = await createModuleSupplier(file);
          this.suppliers.set(supplier.info.name, supplier);
          suppliers.set(supplier.info.name, supplier);
        } catch (error) {
          console.warn(`Failed to create supplier for ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to scan modules:', error);
    }
    
    return suppliers;
  }
  
  // Load all modules from a directory (immediate loading for backward compatibility)
  async loadAllModules(directory: string): Promise<Map<string, ModuleLoadResult>> {
    const results = new Map<string, ModuleLoadResult>();
    
    try {
      // Get all JSON files in directory and subdirectories
      const files = await this.findModuleFiles(directory);
      
      // Load each module
      for (const file of files) {
        const result = await this.loadModule(file);
        if (result.errors.length === 0) {
          results.set(result.module.name, result);
        } else {
          console.warn(`Module ${file} has errors:`, result.errors);
        }
      }
    } catch (error) {
      console.error('Failed to load modules:', error);
    }
    
    return results;
  }
  
  // Find all JSON files in a directory recursively
  private async findModuleFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    
    async function scanDir(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          // Recurse into subdirectories
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    }
    
    await scanDir(directory);
    return files;
  }
  
  // Get a loaded module by name
  getModule(name: string): ModuleLoadResult | undefined {
    return this.modules.get(name);
  }
  
  // Get all loaded modules
  getAllModules(): Map<string, ModuleLoadResult> {
    return new Map(this.modules);
  }
  
  // Clear all loaded modules and suppliers
  clear(): void {
    this.modules.clear();
    this.suppliers.clear();
  }
}