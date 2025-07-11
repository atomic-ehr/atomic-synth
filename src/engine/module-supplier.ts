import { Module } from '../types/index.ts';
import { ModuleEngine } from './module-engine.ts';

export interface ModuleSupplierInfo {
  name: string;
  path: string;
  // Optional metadata loaded from scanning the file
  remarks?: string[];
  gmfVersion?: number;
}

export interface ModuleSupplier {
  info: ModuleSupplierInfo;
  getModule(): Promise<Module>;
  getEngine(): Promise<ModuleEngine>;
  // Clears cached module forcing reload on next access
  clearCache(): void;
}

export class LazyModuleSupplier implements ModuleSupplier {
  info: ModuleSupplierInfo;
  private _cachedModule?: Module;
  private _cachedEngine?: ModuleEngine;
  
  constructor(info: ModuleSupplierInfo) {
    this.info = info;
  }
  
  async getModule(): Promise<Module> {
    if (!this._cachedModule) {
      // Load and parse JSON file only when first requested
      const file = Bun.file(this.info.path);
      const json = await file.json();
      
      // Validate basic structure
      if (!json.name || !json.states) {
        throw new Error(`Module at ${this.info.path} must have name and states properties`);
      }
      
      this._cachedModule = json as Module;
    }
    
    return this._cachedModule;
  }
  
  async getEngine(): Promise<ModuleEngine> {
    if (!this._cachedEngine) {
      const module = await this.getModule();
      this._cachedEngine = new ModuleEngine(module);
    }
    
    return this._cachedEngine;
  }
  
  clearCache(): void {
    this._cachedModule = undefined;
    this._cachedEngine = undefined;
  }
  
  // Clone the module to avoid state pollution between persons
  async cloneModule(): Promise<Module> {
    const module = await this.getModule();
    return JSON.parse(JSON.stringify(module));
  }
}

// Factory function to create module suppliers from paths
export async function createModuleSupplier(path: string): Promise<ModuleSupplier> {
  // Quick scan to get module name without full parse
  const file = Bun.file(path);
  const text = await file.text();
  
  // Extract name using simple regex to avoid full JSON parse
  const nameMatch = text.match(/"name"\s*:\s*"([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : path.split('/').pop()?.replace('.json', '') || 'unknown';
  
  // Extract remarks if they exist
  const remarksMatch = text.match(/"remarks"\s*:\s*\[([^\]]*)\]/);
  let remarks: string[] | undefined;
  if (remarksMatch) {
    try {
      remarks = JSON.parse(`[${remarksMatch[1]}]`);
    } catch {
      // Ignore parse errors for remarks
    }
  }
  
  // Extract GMF version if exists
  const versionMatch = text.match(/"gmf_version"\s*:\s*(\d+)/);
  const gmfVersion = versionMatch ? parseInt(versionMatch[1]) : undefined;
  
  const info: ModuleSupplierInfo = {
    name,
    path,
    remarks,
    gmfVersion
  };
  
  return new LazyModuleSupplier(info);
}