import { 
  StateDefinition, 
  Person,
  ConditionalTransitionOption,
  DistributedTransitionOption,
  ComplexTransitionOption
} from '../types/index.ts';
import { evaluateCondition } from './condition.ts';
import { Random } from '../utils/random.ts';

// Transition interface
export interface Transition {
  follow(person: Person, time: number): string | null;
}

// Direct transition - always goes to the specified state
export class DirectTransition implements Transition {
  constructor(private targetState: string) {}
  
  follow(_person: Person, _time: number): string {
    return this.targetState;
  }
}

// Conditional transition - chooses based on conditions
export class ConditionalTransition implements Transition {
  constructor(private options: ConditionalTransitionOption[]) {}
  
  follow(person: Person, time: number): string | null {
    for (const option of this.options) {
      if (!option.condition || evaluateCondition(option.condition, person, time)) {
        return option.transition;
      }
    }
    return null; // No conditions matched
  }
}

// Distributed transition - random selection with probabilities
export class DistributedTransition implements Transition {
  private cumulativeProbabilities: number[];
  
  constructor(private options: DistributedTransitionOption[]) {
    // Validate probabilities sum to 1.0
    const sum = options.reduce((acc, opt) => acc + opt.distribution, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error(`Distributed transition probabilities must sum to 1.0, got ${sum}`);
    }
    
    // Calculate cumulative probabilities for efficient selection
    this.cumulativeProbabilities = [];
    let cumulative = 0;
    for (const option of options) {
      cumulative += option.distribution;
      this.cumulativeProbabilities.push(cumulative);
    }
  }
  
  follow(person: Person, _time: number): string {
    const random = Random.fromPerson(person);
    const value = random.random();
    
    for (let i = 0; i < this.cumulativeProbabilities.length; i++) {
      if (value <= this.cumulativeProbabilities[i]) {
        return this.options[i]!.transition;
      }
    }
    
    // Fallback to last option (should not happen with valid probabilities)
    return this.options[this.options.length - 1]!.transition;
  }
}

// Complex transition - combines conditional and distributed logic
export class ComplexTransition implements Transition {
  private conditionalTransitions: Map<number, ConditionalTransition | DistributedTransition>;
  
  constructor(private options: ComplexTransitionOption[]) {
    this.conditionalTransitions = new Map();
    
    for (let i = 0; i < options.length; i++) {
      const option = options[i]!;
      
      if (option.distributions) {
        this.conditionalTransitions.set(i, new DistributedTransition(option.distributions));
      } else if (option.transition) {
        // Simple transition target
        this.conditionalTransitions.set(i, new DirectTransition(option.transition));
      }
    }
  }
  
  follow(person: Person, time: number): string | null {
    for (let i = 0; i < this.options.length; i++) {
      const option = this.options[i]!;
      
      if (!option.condition || evaluateCondition(option.condition, person, time)) {
        const transition = this.conditionalTransitions.get(i);
        if (transition) {
          return transition.follow(person, time);
        }
      }
    }
    
    return null;
  }
}

// Factory function to create appropriate transition type
export function createTransition(definition: StateDefinition): Transition | undefined {
  if (definition.direct_transition) {
    return new DirectTransition(definition.direct_transition);
  }
  
  if (definition.conditional_transition) {
    return new ConditionalTransition(definition.conditional_transition);
  }
  
  if (definition.distributed_transition) {
    return new DistributedTransition(definition.distributed_transition);
  }
  
  if (definition.complex_transition) {
    return new ComplexTransition(definition.complex_transition);
  }
  
  // No transition defined (valid for Terminal states)
  return undefined;
}