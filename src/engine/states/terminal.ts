import { State, createBaseState } from '../state.ts';
import { Module, StateDefinition, Person } from '../../types/index.ts';

export interface TerminalState extends State {
  type: 'Terminal';
}

export function createTerminalState(
  name: string,
  module: Module,
  definition: StateDefinition
): TerminalState {
  const base = createBaseState(name, module, definition);
  
  return {
    ...base,
    type: 'Terminal',
    
    async process(_person: Person, _time: number): Promise<boolean> {
      // Terminal state always returns false to stop processing
      return false;
    },
    
    clone(): TerminalState {
      return createTerminalState(name, module, definition);
    }
  } as TerminalState;
}