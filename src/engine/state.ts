import { Module, StateDefinition, Person, Entry } from '../types/index.ts';
import { Transition, createTransition } from './transition.ts';

// State interface - using interface instead of abstract class per requirements
export interface State {
  name: string;
  module: Module;
  definition: StateDefinition;
  transition?: Transition;
  
  // Lifecycle methods
  process(person: Person, time: number): Promise<boolean>;
  clone(): State;
  
  // Entry management
  entry?: Entry;
  entered?: number;
  exited?: number;
}

// Base implementation for common state functionality
export function createBaseState(
  name: string,
  module: Module,
  definition: StateDefinition
): Partial<State> {
  const transition = createTransition(definition);
  
  return {
    name,
    module,
    definition,
    transition,
    
    clone(): State {
      const cloned = createState(name, module, definition);
      // Don't copy runtime state
      cloned.entered = undefined;
      cloned.exited = undefined;
      cloned.entry = undefined;
      return cloned;
    }
  };
}

// State factory function
export function createState(
  name: string,
  module: Module,
  definition: StateDefinition
): State {
  const type = definition.type;
  const stateCreator = stateRegistry.get(type);
  
  if (!stateCreator) {
    throw new Error(`Unknown state type: ${type}`);
  }
  
  return stateCreator(name, module, definition);
}

// State creator function type
export type StateCreator = (
  name: string,
  module: Module,
  definition: StateDefinition
) => State;

// State registry for extensibility
export const stateRegistry = new Map<string, StateCreator>();

// Register a state type
export function registerStateType(type: string, creator: StateCreator): void {
  stateRegistry.set(type, creator);
}

// Helper to check if we should continue processing
export function shouldContinue(state: State, person: Person, time: number): boolean {
  // Terminal states always return false
  if (state.definition.type === 'Terminal') {
    return false;
  }
  
  // Dead patients don't continue (unless it's a death-related state)
  if (!person.attributes.get('alive') && state.definition.type !== 'Death') {
    return false;
  }
  
  return true;
}