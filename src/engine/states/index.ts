// Export all state implementations
export * from './initial.ts';
export * from './terminal.ts';
export * from './simple.ts';
export * from './delay.ts';
export * from './guard.ts';
export * from './encounter.ts';
export * from './condition-onset.ts';
export * from './set-attribute.ts';

// Register all state types
import { registerStateType } from '../state.ts';
import { createInitialState } from './initial.ts';
import { createTerminalState } from './terminal.ts';
import { createSimpleState } from './simple.ts';
import { createDelayState } from './delay.ts';
import { createGuardState } from './guard.ts';
import { createEncounterState } from './encounter.ts';
import { createConditionOnsetState } from './condition-onset.ts';
import { createSetAttributeState } from './set-attribute.ts';

export function registerAllStates(): void {
  registerStateType('Initial', createInitialState);
  registerStateType('Terminal', createTerminalState);
  registerStateType('Simple', createSimpleState);
  registerStateType('Delay', createDelayState);
  registerStateType('Guard', createGuardState);
  registerStateType('Encounter', createEncounterState);
  registerStateType('ConditionOnset', createConditionOnsetState);
  registerStateType('SetAttribute', createSetAttributeState);
}