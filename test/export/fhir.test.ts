import { describe, test, expect } from 'bun:test';
import { FHIRExporter } from '../../src/export/fhir/index.ts';
import { Person, Encounter, Condition } from '../../src/types/index.ts';

describe('FHIRExporter', () => {
  function createTestPerson(): Person {
    const person: Person = {
      id: 'test-person-123',
      seed: 12345,
      attributes: new Map([
        ['alive', true],
        ['first_name', 'John'],
        ['last_name', 'Doe'],
        ['address', '123 Main St'],
        ['zip', '12345']
      ]),
      record: {
        encounters: [],
        conditions: [],
        medications: [],
        observations: [],
        procedures: [],
        immunizations: [],
        carePlans: [],
        allergies: [],
        devices: [],
        imagingStudies: []
      },
      birthDate: new Date('1980-01-01'),
      gender: 'M',
      race: 'White',
      ethnicity: 'Not Hispanic or Latino',
      location: {
        city: 'Boston',
        state: 'MA',
        country: 'US'
      }
    };
    
    // Add an encounter
    const encounter: Encounter = {
      id: 'enc-123',
      type: 'Encounter',
      startTime: Date.now() - 3600000, // 1 hour ago
      endTime: Date.now(),
      encounterClass: 'ambulatory',
      codes: {
        coding: [{
          system: 'SNOMED-CT',
          code: '185349003',
          display: 'Encounter for check up'
        }],
        text: 'Encounter for check up'
      }
    };
    person.record.encounters.push(encounter);
    
    // Add a condition
    const condition: Condition = {
      id: 'cond-123',
      type: 'Condition',
      startTime: Date.now() - 86400000, // 1 day ago
      clinicalStatus: 'active',
      codes: {
        coding: [{
          system: 'SNOMED-CT',
          code: '44054006',
          display: 'Diabetes mellitus type 2'
        }],
        text: 'Diabetes mellitus type 2'
      }
    };
    person.record.conditions.push(condition);
    
    return person;
  }
  
  test('should export a person to FHIR Bundle', () => {
    const exporter = new FHIRExporter();
    const person = createTestPerson();
    
    const bundle = exporter.exportPerson(person);
    
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry.length).toBeGreaterThan(0);
  });
  
  test('should include Patient resource', () => {
    const exporter = new FHIRExporter();
    const person = createTestPerson();
    
    const bundle = exporter.exportPerson(person);
    const patientEntry = bundle.entry.find(e => e.resource.resourceType === 'Patient');
    
    expect(patientEntry).toBeDefined();
    expect(patientEntry!.resource.id).toBe('test-person-123');
    
    const patient = patientEntry!.resource as any;
    expect(patient.name[0].given[0]).toBe('John');
    expect(patient.name[0].family).toBe('Doe');
    expect(patient.gender).toBe('male');
    expect(patient.birthDate).toBe('1980-01-01');
  });
  
  test('should include Encounter resources', () => {
    const exporter = new FHIRExporter();
    const person = createTestPerson();
    
    const bundle = exporter.exportPerson(person);
    const encounterEntries = bundle.entry.filter(e => e.resource.resourceType === 'Encounter');
    
    expect(encounterEntries.length).toBe(1);
    
    const encounter = encounterEntries[0]!.resource as any;
    expect(encounter.status).toBe('finished');
    expect(encounter.class.code).toBe('ambulatory');
    expect(encounter.type[0].coding[0].code).toBe('185349003');
  });
  
  test('should include Condition resources', () => {
    const exporter = new FHIRExporter();
    const person = createTestPerson();
    
    const bundle = exporter.exportPerson(person);
    const conditionEntries = bundle.entry.filter(e => e.resource.resourceType === 'Condition');
    
    expect(conditionEntries.length).toBe(1);
    
    const condition = conditionEntries[0]!.resource as any;
    expect(condition.clinicalStatus.coding[0].code).toBe('active');
    expect(condition.code.coding[0].code).toBe('44054006');
    expect(condition.code.text).toBe('Diabetes mellitus type 2');
  });
  
  test('should export to file', async () => {
    const exporter = new FHIRExporter();
    const person = createTestPerson();
    
    const tmpFile = '/tmp/test-fhir-export.json';
    await exporter.exportToFile(person, tmpFile);
    
    const file = Bun.file(tmpFile);
    const content = await file.json();
    
    expect(content.resourceType).toBe('Bundle');
    expect(content.entry.length).toBeGreaterThan(0);
  });
});