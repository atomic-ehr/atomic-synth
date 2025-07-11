import { Person } from '../types/index.ts';

// Seedable random number generator using Linear Congruential Generator (LCG)
export class Random {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  // Generate random number between 0 and 1
  random(): number {
    // LCG parameters from Numerical Recipes
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;
    
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }
  
  // Generate random integer between min (inclusive) and max (exclusive)
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }
  
  // Generate random boolean with given probability
  randomBoolean(probability: number = 0.5): boolean {
    return this.random() < probability;
  }
  
  // Generate normally distributed random number
  gaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    let u = 0, v = 0;
    while (u === 0) u = this.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = this.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
  }
  
  // Select random element from array
  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.randomInt(0, array.length)];
  }
  
  // Shuffle array in place
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }
  
  // Create a Random instance from a person's seed
  static fromPerson(person: Person): Random {
    return new Random(person.seed);
  }
  
  // Create a child Random with a new seed based on current state
  child(): Random {
    return new Random(this.randomInt(0, 2 ** 32));
  }
}

// Global random instance for general use
export const globalRandom = new Random(Date.now());