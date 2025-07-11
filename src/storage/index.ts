import { Person } from '../types/index.ts';

// Storage interface for persons
export interface PersonStorage {
  save(person: Person): Promise<void>;
  saveBatch(persons: Person[]): Promise<void>;
  get(id: string): Promise<Person | null>;
  getAll(): Promise<Person[]>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

// In-memory storage implementation
export class InMemoryPersonStorage implements PersonStorage {
  private persons: Map<string, Person> = new Map();
  
  async save(person: Person): Promise<void> {
    this.persons.set(person.id, person);
  }
  
  async saveBatch(persons: Person[]): Promise<void> {
    for (const person of persons) {
      this.persons.set(person.id, person);
    }
  }
  
  async get(id: string): Promise<Person | null> {
    return this.persons.get(id) || null;
  }
  
  async getAll(): Promise<Person[]> {
    return Array.from(this.persons.values());
  }
  
  async clear(): Promise<void> {
    this.persons.clear();
  }
  
  async count(): Promise<number> {
    return this.persons.size;
  }
}

// File-based storage implementation
export class FileBasedPersonStorage implements PersonStorage {
  constructor(private directory: string) {}
  
  async save(person: Person): Promise<void> {
    const filepath = `${this.directory}/${person.id}.json`;
    const json = JSON.stringify(person, this.replacer, 2);
    await Bun.write(filepath, json);
  }
  
  async saveBatch(persons: Person[]): Promise<void> {
    // Save in parallel for better performance
    const promises = persons.map(person => this.save(person));
    await Promise.all(promises);
  }
  
  async get(id: string): Promise<Person | null> {
    try {
      const filepath = `${this.directory}/${id}.json`;
      const file = Bun.file(filepath);
      const json = await file.json();
      return this.reviver(json);
    } catch {
      return null;
    }
  }
  
  async getAll(): Promise<Person[]> {
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(this.directory);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const persons: Person[] = [];
    for (const file of jsonFiles) {
      const filepath = `${this.directory}/${file}`;
      const content = await Bun.file(filepath).json();
      persons.push(this.reviver(content));
    }
    
    return persons;
  }
  
  async clear(): Promise<void> {
    const { rm } = await import('node:fs/promises');
    try {
      await rm(this.directory, { recursive: true });
      await this.ensureDirectory();
    } catch {
      // Directory might not exist
    }
  }
  
  async count(): Promise<number> {
    const { readdir } = await import('node:fs/promises');
    try {
      const files = await readdir(this.directory);
      return files.filter(f => f.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }
  
  private async ensureDirectory(): Promise<void> {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(this.directory, { recursive: true });
  }
  
  // JSON replacer to handle Map serialization
  private replacer(key: string, value: any): any {
    if (value instanceof Map) {
      return {
        _type: 'Map',
        entries: Array.from(value.entries())
      };
    }
    if (value instanceof Date) {
      return {
        _type: 'Date',
        value: value.toISOString()
      };
    }
    return value;
  }
  
  // JSON reviver to handle Map deserialization
  private reviver(obj: any): Person {
    // Recursively process the object
    const processValue = (value: any): any => {
      if (value && typeof value === 'object') {
        if (value._type === 'Map') {
          return new Map(value.entries);
        }
        if (value._type === 'Date') {
          return new Date(value.value);
        }
        if (Array.isArray(value)) {
          return value.map(processValue);
        }
        // Process nested objects
        const processed: any = {};
        for (const [k, v] of Object.entries(value)) {
          processed[k] = processValue(v);
        }
        return processed;
      }
      return value;
    };
    
    const person = processValue(obj);
    
    // Ensure attributes is a Map
    if (!(person.attributes instanceof Map)) {
      person.attributes = new Map(Object.entries(person.attributes || {}));
    }
    
    // Ensure dates are Date objects
    if (!(person.birthDate instanceof Date)) {
      person.birthDate = new Date(person.birthDate);
    }
    if (person.deathDate && !(person.deathDate instanceof Date)) {
      person.deathDate = new Date(person.deathDate);
    }
    
    return person as Person;
  }
}

// Hybrid storage that saves to both memory and file
export class HybridPersonStorage implements PersonStorage {
  private memory: InMemoryPersonStorage;
  private file: FileBasedPersonStorage;
  
  constructor(directory: string) {
    this.memory = new InMemoryPersonStorage();
    this.file = new FileBasedPersonStorage(directory);
  }
  
  async save(person: Person): Promise<void> {
    await Promise.all([
      this.memory.save(person),
      this.file.save(person)
    ]);
  }
  
  async saveBatch(persons: Person[]): Promise<void> {
    await Promise.all([
      this.memory.saveBatch(persons),
      this.file.saveBatch(persons)
    ]);
  }
  
  async get(id: string): Promise<Person | null> {
    // Try memory first, then file
    const memoryResult = await this.memory.get(id);
    if (memoryResult) {
      return memoryResult;
    }
    return this.file.get(id);
  }
  
  async getAll(): Promise<Person[]> {
    // Get from memory (should be complete if both are in sync)
    return this.memory.getAll();
  }
  
  async clear(): Promise<void> {
    await Promise.all([
      this.memory.clear(),
      this.file.clear()
    ]);
  }
  
  async count(): Promise<number> {
    return this.memory.count();
  }
}