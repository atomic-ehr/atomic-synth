import { State, createBaseState } from '../state.ts';
import { Module, StateDefinition, Person, Condition } from '../../types/index.ts';
import { generateUUID } from '../../utils/uuid.ts';

export interface ConditionOnsetState extends State {
  type: 'ConditionOnset';
  targetEncounter?: string;
  assignToAttribute?: string;
  codes?: any[];
}

export function createConditionOnsetState(
  name: string,
  module: Module,
  definition: StateDefinition
): ConditionOnsetState {
  const base = createBaseState(name, module, definition);
  
  return {
    ...base,
    type: 'ConditionOnset',
    targetEncounter: definition.target_encounter,
    assignToAttribute: definition.assign_to_attribute,
    codes: definition.codes,
    
    async process(person: Person, time: number): Promise<boolean> {
      // Create condition
      const condition: Condition = {
        id: generateUUID(),
        type: 'Condition',
        startTime: time,
        clinicalStatus: 'active',
        codes: {
          coding: this.codes || [{
            system: 'SNOMED-CT', 
            code: '367498001',
            display: 'Condition'
          }],
          text: this.codes?.[0]?.display || 'Condition'
        }
      };
      
      // Add to health record
      person.record.conditions.push(condition);
      
      // Assign to attribute if specified
      if (this.assignToAttribute) {
        person.attributes.set(this.assignToAttribute, condition);
      }
      
      // Store reference for this state
      this.entry = condition;
      
      return true;
    },
    
    clone(): ConditionOnsetState {
      return createConditionOnsetState(name, module, definition);
    }
  } as ConditionOnsetState;
}