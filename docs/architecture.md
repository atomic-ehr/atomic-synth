# Synthea TypeScript POC Architecture

## Overview

This document outlines the architecture for a TypeScript implementation of Synthea, focusing on a clean, performant design that maintains compatibility with existing Synthea modules while leveraging TypeScript's type system and Bun.js runtime capabilities.

## Design Principles

1. **Type Safety First**: Leverage TypeScript's type system for compile-time guarantees
2. **Performance**: Use Bun's native performance features and worker threads for parallelization
3. **Simplicity**: Keep the POC focused on core functionality
4. **Compatibility**: Support existing Synthea JSON modules where reasonable
5. **Extensibility**: Design for future additions without major refactoring

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Interface                           │
├─────────────────────────────────────────────────────────────┤
│                    Generator Engine                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Module    │  │   Person     │  │   Time/Clock    │   │
│  │   Loader    │  │   Factory    │  │   Manager       │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                  State Machine Engine                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   State     │  │  Transition  │  │    Logic        │   │
│  │  Registry   │  │   Engine     │  │   Evaluator     │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   Data Models                                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Person    │  │HealthRecord │  │   Clinical      │   │
│  │             │  │              │  │   Concepts      │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                  Export Pipeline                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │    FHIR     │  │     CSV      │  │   File Writer   │   │
│  │  Exporter   │  │   Exporter   │  │                 │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Generator Engine

The main orchestrator that manages the patient generation process.

```typescript
interface GeneratorOptions {
  population: number;
  seed?: number;
  parallelWorkers?: number;
  modules?: string[];
  exportFormat?: 'fhir' | 'csv' | 'json';
  outputDirectory?: string;
}

class Generator {
  constructor(options: GeneratorOptions);
  async generate(): Promise<GenerationStats>;
  async generatePerson(seed: number): Promise<Person>;
}
```

**Key Features:**
- Worker pool management for parallel generation
- Progress tracking and statistics
- Configurable generation parameters
- Memory-efficient streaming for large populations

### 2. Module System

#### Module Loader
Loads and validates Synthea JSON modules.

```typescript
interface Module {
  name: string;
  gmf_version?: number;
  states: Record<string, State>;
}

class ModuleLoader {
  async loadModule(path: string): Promise<Module>;
  async loadAllModules(directory: string): Promise<Map<string, Module>>;
  validateModule(module: Module): ValidationResult;
}
```

#### State Registry
Factory pattern for creating state instances from JSON definitions.

```typescript
abstract class State {
  name: string;
  module: Module;
  
  abstract process(person: Person, time: number): Promise<boolean>;
  clone(): State;
}

class StateRegistry {
  register(type: string, factory: StateFactory): void;
  createState(definition: StateDefinition): State;
}
```

### 3. State Types

Core state implementations following Synthea's design:

```typescript
// Control Flow States
class InitialState extends State {}
class TerminalState extends State {}
class GuardState extends State {}
class DelayState extends State {}

// Clinical States
class EncounterState extends State {}
class ConditionOnsetState extends State {}
class MedicationOrderState extends State {}
class ObservationState extends State {}
class ProcedureState extends State {}

// Utility States
class SetAttributeState extends State {}
class CounterState extends State {}
```

### 4. Transition System

Handles state transitions with various strategies:

```typescript
interface Transition {
  follow(person: Person, time: number): string | null;
}

class DirectTransition implements Transition {}
class ConditionalTransition implements Transition {}
class DistributedTransition implements Transition {}
class ComplexTransition implements Transition {}
```

### 5. Data Models

#### Person Model
```typescript
interface Person {
  id: string;
  seed: number;
  attributes: Map<string, any>;
  record: HealthRecord;
  
  // Demographics
  birthDate: Date;
  deathDate?: Date;
  gender: 'M' | 'F';
  race: string;
  ethnicity: string;
  
  // Runtime
  alive(time: number): boolean;
  age(time: number): number;
}
```

#### Health Record
```typescript
interface HealthRecord {
  encounters: Encounter[];
  conditions: Condition[];
  medications: Medication[];
  observations: Observation[];
  procedures: Procedure[];
  immunizations: Immunization[];
  
  addEntry(entry: Entry): void;
  getActiveConditions(time: number): Condition[];
  getActiveMedications(time: number): Medication[];
}
```

### 6. Clinical Concepts

FHIR-aligned data structures:

```typescript
interface CodeableConcept {
  coding: Coding[];
  text?: string;
}

interface Coding {
  system: string;
  code: string;
  display?: string;
}

interface Entry {
  id: string;
  startTime: number;
  endTime?: number;
  codes: CodeableConcept;
}

interface Encounter extends Entry {
  type: EncounterType;
  reason?: CodeableConcept;
  discharge?: CodeableConcept;
}

interface Condition extends Entry {
  clinicalStatus: 'active' | 'resolved';
}

interface Medication extends Entry {
  dosage?: Dosage;
  prescriber?: string;
}
```

### 7. Export System

Modular export pipeline:

```typescript
interface Exporter {
  export(person: Person): Promise<void>;
  exportBatch(persons: Person[]): Promise<void>;
}

class FHIRExporter implements Exporter {
  async export(person: Person): Promise<void> {
    const bundle = this.createBundle(person);
    await this.writeBundle(bundle);
  }
}

class CSVExporter implements Exporter {
  async exportBatch(persons: Person[]): Promise<void> {
    // Stream CSV rows for memory efficiency
  }
}
```

## Implementation Strategy

### Phase 1: Core Engine (Week 1)
1. Basic state machine implementation
2. Module loader with JSON parsing
3. Simple person generation
4. Core state types (Initial, Terminal, Simple, Delay)

### Phase 2: Clinical States (Week 2)
1. Implement clinical state types
2. Health record management
3. Condition/Medication tracking
4. Basic observation recording

### Phase 3: Transitions & Logic (Week 3)
1. All transition types
2. Conditional logic evaluator
3. Attribute management
4. Temporal progression

### Phase 4: Export & Polish (Week 4)
1. FHIR R4 export
2. CSV export option
3. Performance optimization
4. Testing and documentation

## Performance Considerations

### Parallelization Strategy
```typescript
class WorkerPool {
  private workers: Worker[];
  
  async generateBatch(seeds: number[]): Promise<Person[]> {
    // Distribute work across Bun workers
    const chunks = this.chunkArray(seeds, this.workers.length);
    const results = await Promise.all(
      chunks.map((chunk, i) => 
        this.workers[i].postMessage({ cmd: 'generate', seeds: chunk })
      )
    );
    return results.flat();
  }
}
```

### Memory Management
- Stream large datasets instead of loading all into memory
- Use object pools for frequently created objects
- Clear person data after export if not needed

### Optimization Opportunities
1. **Module Compilation**: Pre-compile modules to optimized format
2. **State Caching**: Cache immutable state instances
3. **Lazy Loading**: Load modules on-demand
4. **SIMD Operations**: Use Bun's SIMD support for random number generation

## Configuration

Simple configuration via environment variables or JSON:

```typescript
interface Config {
  modules: {
    directory: string;
    enabled?: string[];
    disabled?: string[];
  };
  export: {
    directory: string;
    format: 'fhir' | 'csv' | 'json';
    fhir?: {
      version: 'R4' | 'STU3';
      bulkData: boolean;
    };
  };
  generation: {
    defaultPopulation: number;
    timestep: number; // milliseconds
    referenceTime?: number;
  };
}
```

## Error Handling

Comprehensive error handling with clear messages:

```typescript
class ModuleError extends Error {
  constructor(module: string, state: string, message: string) {
    super(`[${module}:${state}] ${message}`);
  }
}

class ValidationError extends Error {
  constructor(errors: ValidationIssue[]) {
    super(`Module validation failed:\n${errors.map(e => e.toString()).join('\n')}`);
  }
}
```

## Testing Strategy

1. **Unit Tests**: Each state type, transition logic, data models
2. **Integration Tests**: Module execution, person generation
3. **Performance Tests**: Benchmark against Java Synthea
4. **Compatibility Tests**: Validate against existing modules

## Future Extensibility

The architecture supports future additions:
- Provider/Payer systems via plugin interfaces
- Additional export formats
- Physiology simulations
- Geographic modeling
- Custom state types via registry

This design provides a clean, performant foundation for the Synthea TypeScript POC while maintaining the flexibility to grow into a full implementation.