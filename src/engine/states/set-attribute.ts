import { State, createBaseState } from '../state.ts';
import { Module, StateDefinition, Person } from '../../types/index.ts';

export interface SetAttributeState extends State {
  type: 'SetAttribute';
  attribute: string;
  value: any;
}

export function createSetAttributeState(
  name: string,
  module: Module,
  definition: StateDefinition
): SetAttributeState {
  const base = createBaseState(name, module, definition);
  
  return {
    ...base,
    type: 'SetAttribute',
    attribute: definition.attribute,
    value: definition.value,
    
    async process(person: Person, _time: number): Promise<boolean> {
      // Set the attribute on the person
      person.attributes.set(this.attribute, this.value);
      return true;
    },
    
    clone(): SetAttributeState {
      return createSetAttributeState(name, module, definition);
    }
  } as SetAttributeState;
}