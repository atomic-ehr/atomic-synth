import { Person, HealthRecord } from '../types/index.ts';
import { Random } from '../utils/random.ts';
import { generateUUID } from '../utils/uuid.ts';

export interface PersonFactoryOptions {
  seed?: number;
  birthDate?: Date;
  gender?: 'M' | 'F';
  location?: {
    city: string;
    state: string;
    country: string;
  };
}

export class PersonFactory {
  // Common first names by gender
  private static readonly FIRST_NAMES = {
    M: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher'],
    F: ['Mary', 'Patricia', 'Linda', 'Barbara', 'Elizabeth', 'Jennifer', 'Maria', 'Susan', 'Margaret', 'Dorothy']
  };
  
  // Common last names
  private static readonly LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'
  ];
  
  // Race options (simplified)
  private static readonly RACES = [
    'White', 'Black or African American', 'Asian', 'American Indian or Alaska Native', 
    'Native Hawaiian or Other Pacific Islander', 'Other'
  ];
  
  // Ethnicity options
  private static readonly ETHNICITIES = [
    'Hispanic or Latino', 'Not Hispanic or Latino'
  ];
  
  static createPerson(options: PersonFactoryOptions = {}): Person {
    const seed = options.seed || Date.now() + Math.random() * 1000000;
    const random = new Random(seed);
    
    // Determine gender
    const gender = options.gender || (random.randomBoolean() ? 'M' : 'F');
    
    // Generate birth date (between 0 and 100 years ago)
    let birthDate: Date;
    if (options.birthDate) {
      birthDate = options.birthDate;
    } else {
      const ageInDays = random.randomInt(0, 365 * 100);
      birthDate = new Date(Date.now() - ageInDays * 24 * 60 * 60 * 1000);
    }
    
    // Generate names
    const firstName = random.choice(this.FIRST_NAMES[gender]) || 'Unknown';
    const lastName = random.choice(this.LAST_NAMES) || 'Unknown';
    
    // Generate demographics
    const race = random.choice(this.RACES) || 'Other';
    const ethnicity = random.choice(this.ETHNICITIES) || 'Not Hispanic or Latino';
    
    // Create person
    const person: Person = {
      id: generateUUID(),
      seed,
      attributes: new Map([
        ['alive', true],
        ['first_name', firstName],
        ['last_name', lastName],
        ['name', `${firstName} ${lastName}`]
      ]),
      record: this.createEmptyHealthRecord(),
      birthDate,
      gender,
      race,
      ethnicity,
      location: options.location || {
        city: 'Boston',
        state: 'MA', 
        country: 'US'
      }
    };
    
    return person;
  }
  
  private static createEmptyHealthRecord(): HealthRecord {
    return {
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
    };
  }
}