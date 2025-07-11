import { Module, Person, StateDefinition } from '../types/index.ts';
import { State, createState } from './state.ts';

export interface ModuleContext {
  history: string[];
  currentState?: State;
  states: Map<string, State>;
}

export class ModuleEngine {
  private module: Module;
  private states: Map<string, State>;
  private isClone: boolean = false;
  
  constructor(module: Module, isClone: boolean = false) {
    this.module = module;
    this.states = new Map();
    this.isClone = isClone;
    
    // Create all states
    for (const [name, definition] of Object.entries(module.states)) {
      this.states.set(name, createState(name, module, definition));
    }
  }
  
  // Clone the entire module engine to avoid state pollution
  clone(): ModuleEngine {
    // Deep clone the module
    const clonedModule = JSON.parse(JSON.stringify(this.module));
    return new ModuleEngine(clonedModule, true);
  }
  
  // Process module for a person at a given time
  async process(person: Person, time: number): Promise<void> {
    // Get or create module context for this person
    const contextKey = `module_context_${this.module.name}`;
    let context = person.attributes.get(contextKey) as ModuleContext;
    
    if (!context) {
      context = {
        history: [],
        states: new Map()
      };
      person.attributes.set(contextKey, context);
    }
    
    // Find initial state if this is the first run
    if (!context.currentState) {
      const initialState = this.findInitialState();
      if (!initialState) {
        throw new Error(`Module ${this.module.name} has no Initial state`);
      }
      // When using module cloning, states don't need individual cloning
      context.currentState = this.isClone ? initialState : initialState.clone();
    }
    
    // Process states until we can't continue
    let continueProcessing = true;
    let iterations = 0;
    const maxIterations = 1000; // Prevent infinite loops
    
    while (continueProcessing && iterations < maxIterations) {
      iterations++;
      
      const state = context.currentState!;
      
      // Process the current state
      const shouldContinue = await state.process(person, time);
      
      if (!shouldContinue) {
        // State indicated we should stop (e.g., Guard not satisfied, Delay not complete)
        break;
      }
      
      // Record state in history
      if (!context.history.includes(state.name)) {
        context.history.push(state.name);
      }
      
      // Check for terminal state
      if (state.definition.type === 'Terminal') {
        context.currentState = undefined;
        break;
      }
      
      // Get next state from transition
      if (!state.transition) {
        // No transition defined (shouldn't happen except for Terminal)
        break;
      }
      
      const nextStateName = state.transition.follow(person, time);
      if (!nextStateName) {
        // No valid transition
        break;
      }
      
      // Get the next state
      const nextState = this.states.get(nextStateName);
      if (!nextState) {
        throw new Error(`State ${nextStateName} not found in module ${this.module.name}`);
      }
      
      // When using module cloning, states don't need individual cloning
      context.currentState = this.isClone ? nextState : nextState.clone();
    }
    
    if (iterations >= maxIterations) {
      throw new Error(`Module ${this.module.name} exceeded maximum iterations`);
    }
  }
  
  // Find the Initial state
  private findInitialState(): State | undefined {
    for (const state of this.states.values()) {
      if (state.definition.type === 'Initial') {
        return state;
      }
    }
    return undefined;
  }
  
  // Validate module structure
  validate(): string[] {
    const errors: string[] = [];
    
    // Check for Initial state
    const hasInitial = Array.from(this.states.values()).some(
      state => state.definition.type === 'Initial'
    );
    
    if (!hasInitial) {
      errors.push('Module must have exactly one Initial state');
    }
    
    // Check all transitions point to valid states
    for (const [name, state] of this.states.entries()) {
      const transitions = this.getTransitionTargets(state.definition);
      
      for (const target of transitions) {
        if (!this.states.has(target)) {
          errors.push(`State ${name} transitions to unknown state: ${target}`);
        }
      }
    }
    
    // Check distributed transitions sum to 1.0
    for (const [name, state] of this.states.entries()) {
      if (state.definition.distributed_transition) {
        const sum = state.definition.distributed_transition.reduce(
          (acc, t) => acc + t.distribution,
          0
        );
        
        if (Math.abs(sum - 1.0) > 0.001) {
          errors.push(`State ${name} distributed transitions sum to ${sum}, expected 1.0`);
        }
      }
    }
    
    return errors;
  }
  
  // Get all possible transition targets from a state
  private getTransitionTargets(definition: StateDefinition): string[] {
    const targets: string[] = [];
    
    if (definition.direct_transition) {
      targets.push(definition.direct_transition);
    }
    
    if (definition.conditional_transition) {
      targets.push(...definition.conditional_transition.map(t => t.transition));
    }
    
    if (definition.distributed_transition) {
      targets.push(...definition.distributed_transition.map(t => t.transition));
    }
    
    if (definition.complex_transition) {
      for (const option of definition.complex_transition) {
        if (option.transition) {
          targets.push(option.transition);
        }
        if (option.distributions) {
          targets.push(...option.distributions.map(d => d.transition));
        }
      }
    }
    
    return targets;
  }
}