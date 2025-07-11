import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Config, getConfig, initConfig } from '../../src/config/config.ts';
import { writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Config', () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Create temporary directory
    testDir = join(tmpdir(), `synthea-config-test-${Date.now()}`);
    await Bun.$`mkdir -p ${testDir}`;
  });
  
  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
    
    // Clear global config
    getConfig().clear();
  });
  
  test('should set and get configuration values', () => {
    const config = new Config();
    
    config.set('test.value', 42);
    expect(config.get('test.value')).toBe(42);
    
    config.set('nested.deep.value', 'hello');
    expect(config.get('nested.deep.value')).toBe('hello');
    
    expect(config.get('non.existent', 'default')).toBe('default');
  });
  
  test('should handle type-specific getters', () => {
    const config = new Config();
    
    // Boolean
    config.set('bool.true', true);
    config.set('bool.false', false);
    config.set('bool.string', 'true');
    config.set('bool.number', 1);
    
    expect(config.getBoolean('bool.true')).toBe(true);
    expect(config.getBoolean('bool.false')).toBe(false);
    expect(config.getBoolean('bool.string')).toBe(true);
    expect(config.getBoolean('bool.number')).toBe(true);
    expect(config.getBoolean('bool.missing', true)).toBe(true);
    
    // Number
    config.set('num.int', 42);
    config.set('num.float', 3.14);
    config.set('num.string', '123');
    config.set('num.invalid', 'abc');
    
    expect(config.getNumber('num.int')).toBe(42);
    expect(config.getNumber('num.float')).toBe(3.14);
    expect(config.getNumber('num.string')).toBe(123);
    expect(config.getNumber('num.invalid', 99)).toBe(99);
    
    // String
    config.set('str.text', 'hello');
    config.set('str.number', 42);
    config.set('str.bool', true);
    
    expect(config.getString('str.text')).toBe('hello');
    expect(config.getString('str.number')).toBe('42');
    expect(config.getString('str.bool')).toBe('true');
    
    // Array
    config.set('arr.list', [1, 2, 3]);
    config.set('arr.csv', 'a, b, c');
    
    expect(config.getArray('arr.list')).toEqual([1, 2, 3]);
    expect(config.getArray('arr.csv')).toEqual(['a', 'b', 'c']);
    expect(config.getArray('arr.missing')).toEqual([]);
  });
  
  test('should load from JSON file', async () => {
    const config = new Config();
    const configPath = join(testDir, 'config.json');
    
    await writeFile(configPath, JSON.stringify({
      generator: {
        population: 100,
        seed: 12345
      },
      modules: {
        path: './custom/modules'
      }
    }));
    
    await config.loadFromFile(configPath);
    
    expect(config.get('generator.population')).toBe(100);
    expect(config.get('generator.seed')).toBe(12345);
    expect(config.get('modules.path')).toBe('./custom/modules');
  });
  
  test('should load from YAML file', async () => {
    const config = new Config();
    const configPath = join(testDir, 'config.yaml');
    
    await writeFile(configPath, `
generator:
  population: 200
  seed: 54321
modules:
  path: ./yaml/modules
  overrides:
    - name: diabetes
      value: 0.15
`);
    
    await config.loadFromFile(configPath);
    
    expect(config.get('generator.population')).toBe(200);
    expect(config.get('generator.seed')).toBe(54321);
    expect(config.get('modules.path')).toBe('./yaml/modules');
    expect(config.get('modules.overrides')).toEqual([
      { name: 'diabetes', value: 0.15 }
    ]);
  });
  
  test('should load from environment variables', () => {
    const config = new Config();
    
    process.env.SYNTHEA_GENERATOR_POPULATION = '500';
    process.env.SYNTHEA_GENERATOR_SEED = '99999';
    process.env.SYNTHEA_MODULES_PATH = '/env/modules';
    process.env.SYNTHEA_ENABLE_FEATURE = 'true';
    process.env.SYNTHEA_RATIO = '0.75';
    process.env.SYNTHEA_COMPLEX = '{"key": "value"}';
    
    config.loadFromEnv();
    
    expect(config.get('generator.population')).toBe(500);
    expect(config.get('generator.seed')).toBe(99999);
    expect(config.get('modules.path')).toBe('/env/modules');
    expect(config.get('enable.feature')).toBe(true);
    expect(config.get('ratio')).toBe(0.75);
    expect(config.get('complex')).toEqual({ key: 'value' });
  });
  
  test('should use custom environment prefix', () => {
    const config = new Config({ envPrefix: 'CUSTOM_' });
    
    process.env.CUSTOM_TEST_VALUE = '42';
    process.env.SYNTHEA_OTHER_VALUE = '99';
    
    config.loadFromEnv();
    
    expect(config.get('test.value')).toBe(42);
    expect(config.get('other.value')).toBeUndefined();
  });
  
  test('should handle hierarchical overrides', async () => {
    const config = new Config({
      defaults: {
        generator: {
          population: 10,
          seed: 111
        },
        modules: {
          path: './default/modules'
        }
      }
    });
    
    // File override
    const configPath = join(testDir, 'override.json');
    await writeFile(configPath, JSON.stringify({
      generator: {
        population: 50
      }
    }));
    
    await config.loadFromFile(configPath);
    
    // Environment override
    process.env.SYNTHEA_GENERATOR_SEED = '999';
    config.loadFromEnv();
    
    // Check final values
    expect(config.get('generator.population')).toBe(50); // From file
    expect(config.get('generator.seed')).toBe(999); // From env
    expect(config.get('modules.path')).toBe('./default/modules'); // From defaults
  });
  
  test('should deep merge configurations', async () => {
    const config = new Config();
    
    // Load base config
    const baseConfig = join(testDir, 'base.json');
    await writeFile(baseConfig, JSON.stringify({
      generator: {
        population: 100,
        options: {
          includeDeceased: false,
          minAge: 0
        }
      }
    }));
    
    await config.loadFromFile(baseConfig);
    
    // Load override config
    const overrideConfig = join(testDir, 'override.json');
    await writeFile(overrideConfig, JSON.stringify({
      generator: {
        options: {
          includeDeceased: true,
          maxAge: 100
        }
      }
    }));
    
    await config.loadFromFile(overrideConfig);
    
    // Check merged result
    expect(config.get('generator.population')).toBe(100);
    expect(config.get('generator.options.includeDeceased')).toBe(true);
    expect(config.get('generator.options.minAge')).toBe(0);
    expect(config.get('generator.options.maxAge')).toBe(100);
  });
  
  test('should handle missing files gracefully', async () => {
    const config = new Config();
    const missingPath = join(testDir, 'missing.json');
    
    // Should not throw
    await config.loadFromFile(missingPath);
    
    expect(config.getAll()).toEqual({});
  });
  
  test('should initialize with default locations', async () => {
    // Create a config file in test directory
    const configPath = join(testDir, 'synthea.json');
    await writeFile(configPath, JSON.stringify({
      test: { value: 42 }
    }));
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    try {
      const config = await initConfig();
      expect(config.get('test.value')).toBe(42);
    } finally {
      process.chdir(originalCwd);
    }
  });
  
  test('should clear all configuration', () => {
    const config = new Config();
    
    config.set('test.value', 42);
    config.set('another.value', 'hello');
    
    expect(config.get('test.value')).toBe(42);
    
    config.clear();
    
    expect(config.get('test.value')).toBeUndefined();
    expect(config.get('another.value')).toBeUndefined();
    expect(config.getAll()).toEqual({});
  });
  
  test('should return copy of all configuration', () => {
    const config = new Config();
    
    config.set('test.value', 42);
    config.set('nested.object', { key: 'value' });
    
    const all = config.getAll();
    
    // Modify returned object
    all.test.value = 99;
    all.nested.object.key = 'modified';
    
    // Original should be unchanged
    expect(config.get('test.value')).toBe(42);
    expect(config.get('nested.object.key')).toBe('value');
  });
});