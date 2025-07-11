import { Module } from '../types/index.ts';
import { ModuleEngine } from './module-engine.ts';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface ModuleLoadResult {
  module: Module;
  engine: ModuleEngine;
  errors: string[];
}

export class ModuleLoader {
  private modules: Map<string, ModuleLoadResult> = new Map();
  
  // Load a single module from a file
  async loadModule(path: string): Promise<ModuleLoadResult> {
    try {
      // Read and parse JSON file
      const file = Bun.file(path);
      const json = await file.json();
      
      // Validate basic structure
      if (!json.name || !json.states) {
        throw new Error('Module must have name and states properties');
      }
      
      const module: Module = json;
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
  
  // Load all modules from a directory
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
  
  // Clear all loaded modules
  clear(): void {
    this.modules.clear();
  }
}