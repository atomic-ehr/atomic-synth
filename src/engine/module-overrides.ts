import { Module, StateDefinition } from '../types/index.ts';
import { Config, getConfig } from '../config/config.ts';

export interface ModuleOverride {
  // Module name to override
  module: string;
  // State name to override (optional, if not provided applies to all states)
  state?: string;
  // Property path to override (e.g., "distributed_transition.0.distribution")
  path: string;
  // New value
  value: any;
}

export interface ModuleOverrideConfig {
  // List of module overrides
  overrides?: ModuleOverride[];
  // Map of module name to override values
  modules?: Record<string, Record<string, any>>;
}

export class ModuleOverrideManager {
  private config: Config;
  private overrides: ModuleOverride[] = [];
  
  constructor(config?: Config) {
    this.config = config || getConfig();
    this.loadOverrides();
  }
  
  // Load overrides from configuration
  private loadOverrides(): void {
    // Load explicit overrides list
    const overridesList = this.config.getArray('modules.overrides', []);
    for (const override of overridesList) {
      if (override.module && override.path) {
        this.overrides.push(override);
      }
    }
    
    // Load module-specific overrides
    const moduleOverrides = this.config.get('modules.overrides_by_module', {});
    for (const [moduleName, overrides] of Object.entries(moduleOverrides)) {
      if (typeof overrides === 'object') {
        for (const [path, value] of Object.entries(overrides as Record<string, any>)) {
          this.overrides.push({
            module: moduleName,
            path,
            value
          });
        }
      }
    }
  }
  
  // Apply overrides to a module
  applyOverrides(module: Module): Module {
    // Clone the module to avoid modifying the original
    const overriddenModule = JSON.parse(JSON.stringify(module));
    
    // Apply each override
    for (const override of this.overrides) {
      if (override.module === module.name || override.module === '*') {
        this.applyOverride(overriddenModule, override);
      }
    }
    
    return overriddenModule;
  }
  
  // Apply a single override to a module
  private applyOverride(module: Module, override: ModuleOverride): void {
    if (override.state) {
      // Override specific state
      const state = module.states[override.state];
      if (state) {
        this.setValueByPath(state, override.path, override.value);
      }
    } else {
      // Override at module level or all states
      if (override.path.startsWith('states.')) {
        // Path includes state name
        this.setValueByPath(module, override.path, override.value);
      } else {
        // Apply to all states
        for (const state of Object.values(module.states)) {
          try {
            this.setValueByPath(state, override.path, override.value);
          } catch {
            // Ignore if path doesn't exist in this state
          }
        }
      }
    }
  }
  
  // Set a value in an object by dot-separated path
  private setValueByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array indices
      if (/^\d+$/.test(part)) {
        const index = parseInt(part);
        if (!Array.isArray(current)) {
          throw new Error(`Expected array at ${parts.slice(0, i).join('.')}`);
        }
        if (!current[index]) {
          current[index] = {};
        }
        current = current[index];
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      const index = parseInt(lastPart);
      if (!Array.isArray(current)) {
        throw new Error(`Expected array at ${parts.slice(0, -1).join('.')}`);
      }
      current[index] = value;
    } else {
      current[lastPart] = value;
    }
  }
  
  // Add an override programmatically
  addOverride(override: ModuleOverride): void {
    this.overrides.push(override);
  }
  
  // Clear all overrides
  clearOverrides(): void {
    this.overrides = [];
  }
  
  // Get all current overrides
  getOverrides(): ModuleOverride[] {
    return [...this.overrides];
  }
}

// Global override manager instance
let globalOverrideManager: ModuleOverrideManager | null = null;

// Get or create the global override manager
export function getOverrideManager(): ModuleOverrideManager {
  if (!globalOverrideManager) {
    globalOverrideManager = new ModuleOverrideManager();
  }
  return globalOverrideManager;
}