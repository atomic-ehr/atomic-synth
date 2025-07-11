import { describe, test, expect, beforeEach } from 'bun:test';
import { InMemoryPersonStorage, FileBasedPersonStorage, HybridPersonStorage } from '../../src/storage/index.ts';
import { PersonFactory } from '../../src/models/person-factory.ts';
import { rm } from 'node:fs/promises';

describe('PersonStorage', () => {
  const testDir = '/tmp/synthea-test-storage';
  
  beforeEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });
  
  describe('InMemoryPersonStorage', () => {
    test('should save and retrieve a person', async () => {
      const storage = new InMemoryPersonStorage();
      const person = PersonFactory.createPerson();
      
      await storage.save(person);
      const retrieved = await storage.get(person.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(person.id);
      expect(retrieved?.attributes.get('first_name')).toBe(person.attributes.get('first_name'));
    });
    
    test('should save batch of persons', async () => {
      const storage = new InMemoryPersonStorage();
      const persons = Array.from({ length: 5 }, () => PersonFactory.createPerson());
      
      await storage.saveBatch(persons);
      const count = await storage.count();
      
      expect(count).toBe(5);
    });
    
    test('should get all persons', async () => {
      const storage = new InMemoryPersonStorage();
      const persons = Array.from({ length: 3 }, () => PersonFactory.createPerson());
      
      await storage.saveBatch(persons);
      const all = await storage.getAll();
      
      expect(all.length).toBe(3);
      expect(all.map(p => p.id).sort()).toEqual(persons.map(p => p.id).sort());
    });
    
    test('should clear storage', async () => {
      const storage = new InMemoryPersonStorage();
      const person = PersonFactory.createPerson();
      
      await storage.save(person);
      expect(await storage.count()).toBe(1);
      
      await storage.clear();
      expect(await storage.count()).toBe(0);
    });
  });
  
  describe('FileBasedPersonStorage', () => {
    test('should save and retrieve a person', async () => {
      const storage = new FileBasedPersonStorage(testDir);
      const person = PersonFactory.createPerson();
      
      await storage.save(person);
      const retrieved = await storage.get(person.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(person.id);
      expect(retrieved?.attributes.get('first_name')).toBe(person.attributes.get('first_name'));
    });
    
    test('should handle Map serialization correctly', async () => {
      const storage = new FileBasedPersonStorage(testDir);
      const person = PersonFactory.createPerson();
      person.attributes.set('test_key', 'test_value');
      person.attributes.set('nested', { foo: 'bar' });
      
      await storage.save(person);
      const retrieved = await storage.get(person.id);
      
      expect(retrieved?.attributes).toBeInstanceOf(Map);
      expect(retrieved?.attributes.get('test_key')).toBe('test_value');
      expect(retrieved?.attributes.get('nested')).toEqual({ foo: 'bar' });
    });
    
    test('should handle Date serialization correctly', async () => {
      const storage = new FileBasedPersonStorage(testDir);
      const person = PersonFactory.createPerson();
      const birthDate = new Date('1990-05-15');
      person.birthDate = birthDate;
      
      await storage.save(person);
      const retrieved = await storage.get(person.id);
      
      expect(retrieved?.birthDate).toBeInstanceOf(Date);
      expect(retrieved?.birthDate.toISOString()).toBe(birthDate.toISOString());
    });
    
    test('should save batch of persons', async () => {
      const storage = new FileBasedPersonStorage(testDir);
      const persons = Array.from({ length: 5 }, () => PersonFactory.createPerson());
      
      await storage.saveBatch(persons);
      const count = await storage.count();
      
      expect(count).toBe(5);
    });
    
    test('should return null for non-existent person', async () => {
      const storage = new FileBasedPersonStorage(testDir);
      const retrieved = await storage.get('non-existent-id');
      
      expect(retrieved).toBeNull();
    });
  });
  
  describe('HybridPersonStorage', () => {
    test('should save to both memory and file', async () => {
      const storage = new HybridPersonStorage(testDir);
      const person = PersonFactory.createPerson();
      
      await storage.save(person);
      
      // Check that it's in memory
      const fromMemory = await storage.get(person.id);
      expect(fromMemory).toBeDefined();
      
      // Check that it's also on disk
      const fileStorage = new FileBasedPersonStorage(testDir);
      const fromFile = await fileStorage.get(person.id);
      expect(fromFile).toBeDefined();
    });
    
    test('should retrieve from memory first, then file', async () => {
      const storage = new HybridPersonStorage(testDir);
      const person = PersonFactory.createPerson();
      
      // Save directly to file only
      const fileStorage = new FileBasedPersonStorage(testDir);
      await fileStorage.save(person);
      
      // Should still be able to get it
      const retrieved = await storage.get(person.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(person.id);
    });
    
    test('should clear both storages', async () => {
      const storage = new HybridPersonStorage(testDir);
      const persons = Array.from({ length: 3 }, () => PersonFactory.createPerson());
      
      await storage.saveBatch(persons);
      expect(await storage.count()).toBe(3);
      
      await storage.clear();
      expect(await storage.count()).toBe(0);
      
      // Verify file storage is also cleared
      const fileStorage = new FileBasedPersonStorage(testDir);
      expect(await fileStorage.count()).toBe(0);
    });
  });
});