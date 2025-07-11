# Synthea Overview for TypeScript Reimplementation

## What is Synthea?

Synthea™ is a Synthetic Patient Population Simulator that generates realistic (but not real) patient data and associated health records. The system simulates complete patient lifecycles from birth to death, creating comprehensive medical histories that can be exported in various healthcare data formats.

## Core Architecture

### 1. Generator System
- **Main Entry Point**: `Generator` class manages the population generation process
- **Multithreading**: Supports parallel generation with configurable thread pool size
- **Population Management**: Tracks statistics and manages person generation lifecycle
- **Configurable Parameters**: Demographics, population size, time ranges, geographic locations

### 2. Module System
The heart of Synthea is its modular rule system that models different medical conditions and patient states:

- **Module Definition**: JSON-based state machines that define medical logic
- **State Types**: Various state types (Initial, Delay, Guard, Encounter, Condition, Medication, etc.)
- **Transitions**: Multiple transition types (Direct, Conditional, Distributed, Complex, LookupTable)
- **Submodules**: Modular design allows reusable components

### 3. Person Lifecycle
- **Birth to Death**: Complete lifecycle simulation with age progression
- **Demographics**: Configurable demographics based on census data
- **Attributes**: Maintains person attributes (age, gender, race, socioeconomic factors)
- **Health Records**: Comprehensive health record tracking throughout life

### 4. Healthcare Concepts
- **Encounters**: Primary care, emergency, urgent care, wellness visits
- **Conditions**: Disease onset, progression, and resolution
- **Medications**: Prescription logic and medication management
- **Procedures**: Medical procedures and surgeries
- **Observations**: Vital signs, lab results, diagnostic observations
- **Care Plans**: Treatment plans and care management
- **Immunizations**: Vaccination schedules and tracking

### 5. Provider & Payer System
- **Providers**: Hospitals, clinics, and individual practitioners
- **Payers**: Insurance companies and plans
- **Geographic Distribution**: Location-based provider assignment
- **Specialties**: Clinician specialties and referral logic

## Key Components for TypeScript Implementation

### 1. Core Engine Components
- **Module.java**: Module loading and management system
- **State.java**: Base state class and state type implementations
- **Transition.java**: Transition logic between states
- **Generator.java**: Population generation orchestrator
- **Logic.java**: Conditional logic evaluation system

### 2. Data Models
- **Person**: Patient demographics and attributes
- **HealthRecord**: Complete medical history storage
- **Provider**: Healthcare facility representation
- **Payer**: Insurance company and plan models
- **Encounter/Entry**: Medical event data structures

### 3. Module Features
- **Generic Module Framework (GMF)**: JSON-based module definition format
- **State Machine**: States connected by transitions with conditions
- **Temporal Logic**: Time-based delays and age-specific conditions
- **Probabilistic Transitions**: Weighted random state transitions
- **Lookup Tables**: CSV-based data for complex distributions

### 4. Export System
- **Multiple Formats**: FHIR (R4, STU3, DSTU2), C-CDA, CSV, CPCDS
- **Bulk Export**: ndjson format for large datasets
- **Configurable Output**: Selective data export options

## Configuration System
- **synthea.properties**: Main configuration file
- **Customizable Settings**:
  - Population demographics
  - Export formats and options
  - Geographic locations
  - Time ranges and seeds
  - Module enable/disable
  - Provider and payer data

## Module Structure Example
```json
{
  "name": "Module Name",
  "states": {
    "Initial": {
      "type": "Initial",
      "direct_transition": "Next_State"
    },
    "Next_State": {
      "type": "Simple",
      "distributed_transition": [
        {
          "transition": "State_A",
          "distribution": 0.6
        },
        {
          "transition": "State_B", 
          "distribution": 0.4
        }
      ]
    }
  }
}
```

## Key Design Patterns
1. **State Machine Pattern**: Core module execution flow
2. **Factory Pattern**: State creation from JSON definitions
3. **Singleton Pattern**: Module and provider management
4. **Observer Pattern**: Health record event tracking
5. **Strategy Pattern**: Export format handling

## Essential Features for Reimplementation
1. **Module Engine**: JSON module parsing and state machine execution
2. **Person Simulation**: Demographic generation and aging
3. **Time Management**: Simulation time stepping and scheduling
4. **Health Records**: Medical data structure and management
5. **Provider Assignment**: Geographic and specialty-based matching
6. **Export Pipeline**: Format-specific data transformation
7. **Random Number Generation**: Reproducible randomness with seeds
8. **Configuration Loading**: Property-based system configuration