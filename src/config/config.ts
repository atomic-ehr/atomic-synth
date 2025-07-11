import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as yaml from 'yaml';
import { join } from 'node:path';

export interface ConfigOptions {
  // File paths to load config from (in order of precedence)
  configFiles?: string[];
  // Environment variable prefix (default: SYNTHEA_)
  envPrefix?: string;
  // Default values
  defaults?: Record<string, any>;
}

export class Config {
  private data: Record<string, any> = {};
  private envPrefix: string;
  
  constructor(options: ConfigOptions = {}) {
    this.envPrefix = options.envPrefix || 'SYNTHEA_';
    
    // Start with defaults
    if (options.defaults) {
      this.data = { ...options.defaults };
    }
  }
  
  // Load configuration from various sources
  async load(options: ConfigOptions = {}): Promise<void> {
    // 1. Load from config files (later files override earlier ones)
    if (options.configFiles) {
      for (const file of options.configFiles) {
        await this.loadFromFile(file);
      }
    }
    
    // 2. Load from environment variables (highest priority)
    this.loadFromEnv();
  }
  
  // Load configuration from a file
  async loadFromFile(filePath: string): Promise<void> {
    if (!existsSync(filePath)) {
      return; // Silently skip non-existent files
    }
    
    try {
      const content = await readFile(filePath, 'utf-8');
      let config: Record<string, any>;
      
      if (filePath.endsWith('.json')) {
        config = JSON.parse(content);
      } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        config = yaml.parse(content) || {};
      } else {
        // Try JSON first, then YAML
        try {
          config = JSON.parse(content);
        } catch {
          config = yaml.parse(content) || {};
        }
      }
      
      // Merge with existing config (deep merge)
      this.data = this.deepMerge(this.data, config);
    } catch (error) {
      console.warn(`Failed to load config from ${filePath}:`, error);
    }
  }
  
  // Load configuration from environment variables
  loadFromEnv(): void {
    const env = process.env;
    
    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith(this.envPrefix)) {
        // Convert SYNTHEA_GENERATOR_POPULATION to generator.population
        const configKey = key
          .substring(this.envPrefix.length)
          .toLowerCase()
          .replace(/_/g, '.');
        
        // Try to parse value as JSON for complex types
        let parsedValue: any = value;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // If not JSON, check for boolean/number
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          else if (/^\d+$/.test(value)) parsedValue = parseInt(value);
          else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value);
        }
        
        this.set(configKey, parsedValue);
      }
    }
  }
  
  // Get a configuration value
  get(key: string, defaultValue?: any): any {
    const keys = key.split('.');
    let value = this.data;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
  
  // Set a configuration value
  set(key: string, value: any): void {
    const keys = key.split('.');
    let current = this.data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  // Get a boolean configuration value
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get(key, defaultValue);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return !!value;
  }
  
  // Get a number configuration value
  getNumber(key: string, defaultValue: number = 0): number {
    const value = this.get(key, defaultValue);
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }
  
  // Get a string configuration value
  getString(key: string, defaultValue: string = ''): string {
    const value = this.get(key, defaultValue);
    return String(value);
  }
  
  // Get an array configuration value
  getArray(key: string, defaultValue: any[] = []): any[] {
    const value = this.get(key, defaultValue);
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(s => s.trim());
    }
    return defaultValue;
  }
  
  // Get all configuration data
  getAll(): Record<string, any> {
    return JSON.parse(JSON.stringify(this.data));
  }
  
  // Clear all configuration
  clear(): void {
    this.data = {};
  }
  
  // Deep merge two objects
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
            output[key] = this.deepMerge(target[key], source[key]);
          } else {
            output[key] = source[key];
          }
        } else {
          output[key] = source[key];
        }
      }
    }
    
    return output;
  }
}

// Global configuration instance
let globalConfig: Config | null = null;

// Get or create the global configuration
export function getConfig(): Config {
  if (!globalConfig) {
    globalConfig = new Config();
  }
  return globalConfig;
}

// Initialize configuration from default locations
export async function initConfig(options?: ConfigOptions): Promise<Config> {
  const config = getConfig();
  
  // Default config file locations
  const defaultFiles = [
    'synthea.json',
    'synthea.yaml',
    'config/synthea.json',
    'config/synthea.yaml',
    join(process.cwd(), 'synthea.json'),
    join(process.cwd(), 'synthea.yaml')
  ];
  
  const configFiles = options?.configFiles || defaultFiles;
  
  await config.load({
    ...options,
    configFiles
  });
  
  return config;
}