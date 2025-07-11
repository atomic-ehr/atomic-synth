# Synthea Java Code Architecture Summary

## Core Architecture Overview

Synthea's Java implementation follows a state machine pattern where patient health is simulated through a series of states connected by transitions. The system is designed to be modular, extensible, and capable of generating realistic patient data at scale.

## 1. State System (engine/State.java)

The State system is the foundation of Synthea's module engine. Each state represents a point in a patient's healthcare journey.

### Base State Types

#### Control Flow States
- **Initial**: Entry point for every module (exactly one per module)
- **Terminal**: End state that terminates module execution
- **Simple**: Pass-through state with no medical actions
- **Guard**: Conditional gate that blocks progression until conditions are met
- **Delay**: Introduces time delays (exact or range-based) in the simulation
- **CallSubmodule**: Executes another module and returns

#### Clinical Action States
- **Encounter**: Initiates a healthcare encounter (office visit, emergency, etc.)
- **EncounterEnd**: Concludes an active encounter
- **ConditionOnset**: Patient develops a medical condition
- **ConditionEnd**: Resolves or ends a condition
- **AllergyOnset**: Patient develops an allergy
- **AllergyEnd**: Allergy is resolved
- **MedicationOrder**: Prescribes medication with dosing instructions
- **MedicationEnd**: Discontinues a medication
- **CarePlanStart**: Initiates a treatment plan
- **CarePlanEnd**: Concludes a care plan
- **Procedure**: Performs a medical procedure
- **Observation**: Records clinical measurements (labs, vitals, etc.)
- **MultiObservation**: Groups related observations
- **DiagnosticReport**: Creates diagnostic reports from observations
- **ImagingStudy**: Represents imaging procedures (X-ray, MRI, etc.)
- **Device**: Medical device implantation
- **DeviceEnd**: Device removal
- **Supply**: Medical supply items
- **Immunization**: Vaccination administration
- **VitalSign**: Sets patient vital signs

#### Utility States
- **SetAttribute**: Sets arbitrary attributes on the patient
- **Counter**: Increments/decrements numeric attributes
- **Symptom**: Manages symptom severity
- **Death**: Handles patient death

### State Execution Model
```java
public abstract boolean process(Person person, long time);
```
- States are cloned before execution to maintain immutability
- Each state tracks entry/exit times
- States can generate HealthRecord entries
- Return value indicates whether to continue processing

## 2. Module System (engine/Module.java)

### Module Structure
- Modules are JSON files defining state machines
- Each module has a unique name and version
- States are connected by transitions
- Modules can call submodules for reusability

### Module Loading
- Scans module directories at startup
- Parses JSON into Java objects using Gson
- Validates module structure
- Supports module overrides via properties

### Module Execution
```java
public boolean process(Person person, long time)
```
- Starts at "Initial" state
- Follows transitions based on conditions
- Maintains execution history
- Handles time rewinding for delays
- Continues until Terminal state or module completion

## 3. Transition System (engine/Transition.java)

### Transition Types

#### DirectTransition
- Unconditionally moves to specified state
- Simplest transition type

#### ConditionalTransition
- Evaluates conditions to determine next state
- Supports complex boolean logic

#### DistributedTransition
- Random selection based on probabilities
- Ensures distributions sum to 1.0

#### ComplexTransition
- Combines conditional and distributed logic
- Most flexible transition type

#### LookupTableTransition
- CSV-based transition tables
- Supports age/time-based progressions

#### TypeOfCareTransition
- Selects based on encounter type
- Useful for care pathway modeling

## 4. Person Model (world/agents/Person.java)

### Core Attributes
- **Demographics**: Name, birthdate, gender, race, ethnicity
- **Location**: Address, coordinates, movement history
- **Attributes**: Generic key-value storage for any data
- **VitalSigns**: Generators for vital sign values
- **Symptoms**: Active symptoms with severity scores

### Health Tracking
- **record**: Primary HealthRecord instance
- **records**: Map of records per provider (split records)
- **chronicMedications**: Long-term medication list
- **onsetConditionRecord**: Condition timeline tracking
- **lossOfCareEnabled**: Simulates care continuity issues

### Module Integration
- **history**: Tracks module execution
- **hadPreviousState**: Quick lookup for state visits
- **currentModules**: Active module instances

## 5. HealthRecord System (world/concepts/HealthRecord.java)

### Record Structure
- **encounters**: All healthcare visits
- **conditions**: Active and resolved conditions
- **allergies**: Allergy list
- **observations**: All observations/labs
- **procedures**: Medical procedures
- **medications**: Prescription history
- **immunizations**: Vaccination records
- **careplans**: Treatment plans
- **imaging**: Imaging studies

### Entry Base Class
All medical entries extend from Entry:
```java
public UUID uuid;
public long start;
public long stop;
public Code[] codes;
```

### Key Entry Types

#### Encounter
- Represents any healthcare visit
- Links to provider and clinician
- Contains reason codes
- Groups related entries

#### Observation
- Clinical measurements
- Supports various value types
- Can be grouped in reports

#### Medication
- Prescription details
- Dosing instructions
- Refill information
- Stop reasons

#### Procedure
- Medical procedures
- Duration tracking
- Reason codes
- Device associations

## 6. Provider System (world/agents/Provider.java)

### Provider Types
- **HOSPITAL**: Inpatient facilities
- **PRIMARY**: Primary care offices
- **URGENT**: Urgent care centers
- **EMERGENCY**: Emergency departments
- **WELLNESS**: Preventive care
- **HOSPICE**: End-of-life care
- **SNF**: Skilled nursing facilities

### Provider Selection
- Geographic proximity
- Network participation
- Specialty matching
- Capacity constraints

### Clinician Management
- Specialty-based assignment
- Workload tracking
- NPI number generation

## 7. Generator System (engine/Generator.java)

### Population Generation
- Configurable population size
- Demographic distributions
- Geographic constraints
- Time period simulation

### Threading Model
- Configurable thread pool
- Parallel person generation
- Thread-safe statistics collection

### Execution Flow
1. Initialize location and demographics
2. Create person with attributes
3. Run all modules chronologically
4. Export completed records
5. Track statistics

## 8. Key Design Patterns

### State Machine Pattern
- Core architecture for medical logic
- Clear state transitions
- Temporal progression

### Factory Pattern
- State creation from JSON
- Dynamic module loading
- Export format selection

### Strategy Pattern
- Provider selection algorithms
- Payer adjustment strategies
- Export formatting

### Observer Pattern
- Health record event tracking
- Cost accumulation
- Statistics collection

### Singleton Pattern
- Module collection management
- Terminology services
- Configuration access

## 9. Time Management

### Simulation Time
- Millisecond precision
- Configurable time steps (default: 7 days)
- Support for exact and fuzzy delays

### Age Progression
- Birth to death lifecycle
- Age-specific conditions
- Time-based transitions

## 10. Randomness and Reproducibility

### Random Number Generation
- Separate generators for population and clinical decisions
- Seed-based reproducibility
- Per-person random streams

### Distribution Support
- Normal distributions
- Uniform distributions
- Custom probability curves

## Implementation Considerations for TypeScript

### Type Safety
- Leverage TypeScript's type system for state definitions
- Use discriminated unions for state types
- Strong typing for medical codes

### Async Considerations
- Module loading can be async
- Export operations may benefit from streaming
- Consider worker threads for generation

### Module System
- JSON Schema validation
- Hot module reloading for development
- TypeScript interfaces for states

### Performance
- Efficient cloning strategies
- Memory management for large populations
- Streaming exports for large datasets

This architecture provides a robust foundation for simulating realistic patient health records through configurable state machines, with careful attention to medical accuracy, temporal consistency, and scalability.