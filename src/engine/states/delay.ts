import { State, createBaseState } from '../state.ts';
import { Module, StateDefinition, Person, Duration, Range } from '../../types/index.ts';
import { Random } from '../../utils/random.ts';

export interface DelayState extends State {
  type: 'Delay';
  exact?: Duration;
  range?: Range & { unit: string };
  next?: number; // When the delay completes
}

export function createDelayState(
  name: string,
  module: Module,
  definition: StateDefinition
): DelayState {
  const base = createBaseState(name, module, definition);
  
  return {
    ...base,
    type: 'Delay',
    exact: definition.exact,
    range: definition.range,
    
    async process(person: Person, time: number): Promise<boolean> {
      // First time entering this state
      if (!this.entered) {
        this.entered = time;
        
        // Calculate delay duration
        let delayMs: number;
        
        if (this.exact) {
          delayMs = convertToMs(this.exact.quantity, this.exact.unit);
        } else if (this.range) {
          const random = Random.fromPerson(person);
          const value = random.random() * (this.range.high - this.range.low) + this.range.low;
          delayMs = convertToMs(value, this.range.unit);
        } else {
          // No delay specified, continue immediately
          return true;
        }
        
        this.next = time + delayMs;
      }
      
      // Check if delay has completed
      return time >= (this.next || time);
    },
    
    clone(): DelayState {
      return createDelayState(name, module, definition);
    }
  } as DelayState;
}

function convertToMs(value: number, unit: string): number {
  switch (unit) {
    case 'years':
      return value * 365.25 * 24 * 60 * 60 * 1000;
    case 'months':
      return value * 30.4375 * 24 * 60 * 60 * 1000;
    case 'weeks':
      return value * 7 * 24 * 60 * 60 * 1000;
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'minutes':
      return value * 60 * 1000;
    case 'seconds':
      return value * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}