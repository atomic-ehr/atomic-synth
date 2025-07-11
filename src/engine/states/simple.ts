import { State, createBaseState } from '../state.ts';
import { Module, StateDefinition, Person } from '../../types/index.ts';

export interface SimpleState extends State {
  type: 'Simple';
}

export function createSimpleState(
  name: string,
  module: Module,
  definition: StateDefinition
): SimpleState {
  const base = createBaseState(name, module, definition);
  
  return {
    ...base,
    type: 'Simple',
    
    async process(_person: Person, _time: number): Promise<boolean> {
      // Simple state does nothing, just transitions
      return true;
    },
    
    clone(): SimpleState {
      return createSimpleState(name, module, definition);
    }
  } as SimpleState;
}