import { State, createBaseState } from '../state.ts';
import { Module, StateDefinition, Person } from '../../types/index.ts';

export interface InitialState extends State {
  type: 'Initial';
}

export function createInitialState(
  name: string,
  module: Module,
  definition: StateDefinition
): InitialState {
  const base = createBaseState(name, module, definition);
  
  return {
    ...base,
    type: 'Initial',
    
    async process(_person: Person, _time: number): Promise<boolean> {
      // Initial state does nothing, just transitions
      return true;
    },
    
    clone(): InitialState {
      return createInitialState(name, module, definition);
    }
  } as InitialState;
}