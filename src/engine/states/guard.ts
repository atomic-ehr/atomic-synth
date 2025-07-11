import { State, createBaseState } from '../state.ts';
import { Module, StateDefinition, Person, ConditionDefinition } from '../../types/index.ts';
import { evaluateCondition } from '../condition.ts';

export interface GuardState extends State {
  type: 'Guard';
  allow?: ConditionDefinition;
}

export function createGuardState(
  name: string,
  module: Module,
  definition: StateDefinition
): GuardState {
  const base = createBaseState(name, module, definition);
  
  return {
    ...base,
    type: 'Guard',
    allow: definition.allow,
    
    async process(person: Person, time: number): Promise<boolean> {
      // If no condition specified, always allow
      if (!this.allow) {
        return true;
      }
      
      // Evaluate the condition
      return evaluateCondition(this.allow, person, time);
    },
    
    clone(): GuardState {
      return createGuardState(name, module, definition);
    }
  } as GuardState;
}