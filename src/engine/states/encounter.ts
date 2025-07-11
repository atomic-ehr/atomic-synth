import { State, createBaseState } from '../state.ts';
import { Module, StateDefinition, Person, Encounter, CodeableConcept } from '../../types/index.ts';
import { generateUUID } from '../../utils/uuid.ts';

export interface EncounterState extends State {
  type: 'Encounter';
  encounterClass: string;
  reason?: string;
  codes?: any[];
  wellness?: boolean;
}

export function createEncounterState(
  name: string,
  module: Module,
  definition: StateDefinition
): EncounterState {
  const base = createBaseState(name, module, definition);
  
  return {
    ...base,
    type: 'Encounter',
    encounterClass: definition.encounter_class || 'ambulatory',
    reason: definition.reason,
    codes: definition.codes,
    wellness: definition.wellness,
    
    async process(person: Person, time: number): Promise<boolean> {
      // Create encounter
      const encounter: Encounter = {
        id: generateUUID(),
        type: 'Encounter',
        startTime: time,
        encounterClass: this.encounterClass as any,
        codes: {
          coding: this.codes || [{
            system: 'SNOMED-CT',
            code: '308646001',
            display: 'Death certification'
          }],
          text: this.codes?.[0]?.display || 'Encounter'
        }
      };
      
      // Add reason if specified
      if (this.reason) {
        // Look up the reason from attributes or conditions
        const reasonCondition = person.record.conditions.find(
          c => c.codes.coding.some(code => code.code === this.reason)
        );
        
        if (reasonCondition) {
          encounter.reason = reasonCondition.codes;
        }
      }
      
      // Add to health record
      person.record.encounters.push(encounter);
      
      // Store as current encounter for other states to reference
      person.attributes.set('current_encounter', encounter);
      
      // Store reference for this state
      this.entry = encounter;
      
      return true;
    },
    
    clone(): EncounterState {
      return createEncounterState(name, module, definition);
    }
  } as EncounterState;
}