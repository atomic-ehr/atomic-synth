# Synthea Modules Documentation

## Overview

Synthea modules are JSON-based state machines that define how specific health conditions, treatments, and healthcare processes are simulated over a patient's lifetime. Each module represents a distinct aspect of health, from chronic diseases to acute conditions, preventive care to end-of-life scenarios.

## Module Structure

### Basic Module Format

```json
{
  "name": "Module Name",
  "remarks": ["Optional comments about the module"],
  "states": {
    "Initial": {
      "type": "Initial",
      "direct_transition": "Next_State"
    },
    "Next_State": {
      "type": "StateType",
      // State-specific properties
      "transition": "Another_State"
    },
    "Terminal": {
      "type": "Terminal"
    }
  }
}
```

### Required Elements

1. **name**: Module identifier (string)
2. **states**: Object containing all state definitions
3. **Initial state**: Exactly one state with `"type": "Initial"`

### Optional Elements

- **remarks**: Array of documentation strings
- **gmf_version**: Generic Module Framework version (defaults to 1.0)

## State Types

### 1. Control Flow States

#### Initial
Entry point for every module. Each module must have exactly one.
```json
{
  "type": "Initial",
  "direct_transition": "First_State"
}
```

#### Terminal
Ends module execution. Module will not process further.
```json
{
  "type": "Terminal"
}
```

#### Simple
Pass-through state with no action, useful for branching logic.
```json
{
  "type": "Simple",
  "direct_transition": "Next_State"
}
```

#### Guard
Blocks progression until conditions are met.
```json
{
  "type": "Guard",
  "allow": {
    "condition_type": "Age",
    "operator": ">=",
    "quantity": 18,
    "unit": "years"
  },
  "direct_transition": "Adult_State"
}
```

#### Delay
Pauses execution for a specified time period.
```json
{
  "type": "Delay",
  "range": {
    "low": 1,
    "high": 7,
    "unit": "days"
  },
  "direct_transition": "After_Delay"
}
```

#### CallSubmodule
Executes another module and returns.
```json
{
  "type": "CallSubmodule",
  "submodule": "medications/otc_pain_reliever",
  "direct_transition": "After_Submodule"
}
```

### 2. Clinical Action States

#### Encounter
Represents a healthcare visit.
```json
{
  "type": "Encounter",
  "encounter_class": "ambulatory",
  "reason": "diabetes_screening",
  "codes": [{
    "system": "SNOMED-CT",
    "code": "185349003",
    "display": "Encounter for check up"
  }],
  "direct_transition": "Perform_Tests"
}
```

Encounter classes:
- `ambulatory`: Outpatient visit
- `emergency`: Emergency department
- `inpatient`: Hospital admission
- `urgent`: Urgent care
- `wellness`: Preventive care

#### EncounterEnd
Ends the current encounter.
```json
{
  "type": "EncounterEnd",
  "discharge_disposition": {
    "system": "NUBC",
    "code": "01",
    "display": "Discharged to home"
  },
  "direct_transition": "Post_Encounter"
}
```

#### ConditionOnset
Patient develops a medical condition.
```json
{
  "type": "ConditionOnset",
  "target_encounter": "Diagnosis_Encounter",
  "assign_to_attribute": "diabetes",
  "codes": [{
    "system": "SNOMED-CT",
    "code": "44054006",
    "display": "Diabetes mellitus type 2"
  }],
  "direct_transition": "Prescribe_Medication"
}
```

#### ConditionEnd
Resolves or ends a condition.
```json
{
  "type": "ConditionEnd",
  "condition_onset": "Appendicitis_Onset",
  "direct_transition": "Recovered"
}
```

#### MedicationOrder
Prescribes medication.
```json
{
  "type": "MedicationOrder",
  "codes": [{
    "system": "RxNorm",
    "code": "860975",
    "display": "Metformin 500mg"
  }],
  "reason": "diabetes",
  "prescription": {
    "dosage": {
      "amount": 1,
      "frequency": 2,
      "period": 1,
      "unit": "days"
    },
    "duration": {
      "quantity": 30,
      "unit": "days"
    },
    "refills": 5
  },
  "direct_transition": "Next_State"
}
```

#### MedicationEnd
Stops a medication.
```json
{
  "type": "MedicationEnd",
  "medication_order": "Metformin_Order",
  "reason": "ineffective",
  "direct_transition": "Try_Different_Med"
}
```

#### Procedure
Performs a medical procedure.
```json
{
  "type": "Procedure",
  "codes": [{
    "system": "SNOMED-CT",
    "code": "80146002",
    "display": "Appendectomy"
  }],
  "duration": {
    "low": 30,
    "high": 90,
    "unit": "minutes"
  },
  "reason": "appendicitis",
  "direct_transition": "Recovery"
}
```

#### Observation
Records clinical measurements.
```json
{
  "type": "Observation",
  "category": "laboratory",
  "unit": "mg/dL",
  "codes": [{
    "system": "LOINC",
    "code": "2339-0",
    "display": "Glucose"
  }],
  "range": {
    "low": 110,
    "high": 125
  },
  "direct_transition": "Check_Result"
}
```

#### MultiObservation
Groups related observations.
```json
{
  "type": "MultiObservation",
  "category": "laboratory",
  "codes": [{
    "system": "LOINC",
    "code": "58410-2",
    "display": "CBC panel"
  }],
  "observations": [
    {
      "codes": [{
        "system": "LOINC",
        "code": "6690-2",
        "display": "WBC"
      }],
      "unit": "10*3/uL",
      "range": {"low": 4.5, "high": 11.0}
    },
    {
      "codes": [{
        "system": "LOINC",
        "code": "789-8",
        "display": "RBC"
      }],
      "unit": "10*6/uL",
      "range": {"low": 4.5, "high": 5.9}
    }
  ],
  "direct_transition": "Evaluate_Results"
}
```

#### ImagingStudy
Represents imaging procedures.
```json
{
  "type": "ImagingStudy",
  "procedure_code": {
    "system": "SNOMED-CT",
    "code": "168731009",
    "display": "Chest X-ray"
  },
  "series": [{
    "body_site": {
      "system": "SNOMED-CT",
      "code": "51185008",
      "display": "Thoracic structure"
    },
    "modality": {
      "system": "DICOM-DCM",
      "code": "CR",
      "display": "Computed Radiography"
    },
    "instances": [{
      "title": "PA view",
      "sop_class": {
        "system": "DICOM-SOP",
        "code": "1.2.840.10008.5.1.4.1.1.1.1"
      }
    }]
  }],
  "direct_transition": "Review_Results"
}
```

### 3. Utility States

#### SetAttribute
Stores data on the patient.
```json
{
  "type": "SetAttribute",
  "attribute": "diabetes_type",
  "value": "type2",
  "direct_transition": "Continue"
}
```

#### Counter
Tracks numeric values.
```json
{
  "type": "Counter",
  "attribute": "hospital_visits",
  "action": "increment",
  "direct_transition": "Check_Count"
}
```

#### Symptom
Sets symptom severity (0-100 scale).
```json
{
  "type": "Symptom",
  "symptom": "Chest Pain",
  "cause": "heart_attack",
  "range": {
    "low": 50,
    "high": 100
  },
  "direct_transition": "Seek_Care"
}
```

#### Death
Handles patient death.
```json
{
  "type": "Death",
  "exact": {
    "quantity": 7,
    "unit": "days"
  },
  "condition_onset": "Terminal_Cancer",
  "direct_transition": "Terminal"
}
```

## Transition Types

### Direct Transition
Always transitions to the specified state.
```json
"direct_transition": "Next_State"
```

### Conditional Transition
Transitions based on logical conditions.
```json
"conditional_transition": [
  {
    "condition": {
      "condition_type": "Attribute",
      "attribute": "diabetes",
      "operator": "==",
      "value": true
    },
    "transition": "Diabetic_Path"
  },
  {
    "transition": "Non_Diabetic_Path"  // Default if no conditions match
  }
]
```

### Distributed Transition
Random selection based on probabilities (must sum to 1.0).
```json
"distributed_transition": [
  {
    "transition": "Common_Outcome",
    "distribution": 0.7
  },
  {
    "transition": "Uncommon_Outcome",
    "distribution": 0.2
  },
  {
    "transition": "Rare_Outcome",
    "distribution": 0.1
  }
]
```

### Complex Transition
Combines conditional and distributed logic.
```json
"complex_transition": [
  {
    "condition": {
      "condition_type": "Age",
      "operator": "<",
      "quantity": 18,
      "unit": "years"
    },
    "distributions": [
      {
        "transition": "Pediatric_Common",
        "distribution": 0.8
      },
      {
        "transition": "Pediatric_Rare",
        "distribution": 0.2
      }
    ]
  },
  {
    "distributions": [
      {
        "transition": "Adult_Common",
        "distribution": 0.6
      },
      {
        "transition": "Adult_Uncommon",
        "distribution": 0.4
      }
    ]
  }
]
```

### Lookup Table Transition
Transitions based on CSV lookup tables.
```json
"lookup_table_transition": [
  {
    "transition": "Outcome_State",
    "default_probability": 0.1,
    "lookup_table_name": "diabetes_outcomes.csv"
  }
]
```

## Condition Logic

### Condition Types

#### Age
```json
{
  "condition_type": "Age",
  "operator": ">=",
  "quantity": 65,
  "unit": "years"
}
```

#### Gender
```json
{
  "condition_type": "Gender",
  "gender": "F"
}
```

#### Attribute
```json
{
  "condition_type": "Attribute",
  "attribute": "smoker",
  "operator": "==",
  "value": true
}
```

#### Symptom
```json
{
  "condition_type": "Symptom",
  "symptom": "Chest Pain",
  "operator": ">",
  "value": 50
}
```

#### Observation
```json
{
  "condition_type": "Observation",
  "codes": [{
    "system": "LOINC",
    "code": "2339-0"
  }],
  "operator": ">",
  "value": 126
}
```

#### Active Condition
```json
{
  "condition_type": "Active Condition",
  "codes": [{
    "system": "SNOMED-CT",
    "code": "44054006"
  }]
}
```

#### Active Medication
```json
{
  "condition_type": "Active Medication",
  "codes": [{
    "system": "RxNorm",
    "code": "860975"
  }]
}
```

### Boolean Logic
Combine conditions with AND, OR, NOT:
```json
{
  "condition_type": "And",
  "conditions": [
    {
      "condition_type": "Age",
      "operator": ">=",
      "quantity": 40,
      "unit": "years"
    },
    {
      "condition_type": "Attribute",
      "attribute": "bmi",
      "operator": ">",
      "value": 30
    }
  ]
}
```

## Module Organization

### Directory Structure
```
modules/
├── allergies.json                    # Top-level modules
├── asthma.json
├── diabetes.json
├── allergies/                        # Submodules
│   ├── allergy_panel.json
│   ├── environmental_allergy_incidence.json
│   └── food_allergy_incidence.json
├── medications/                      # Medication submodules
│   ├── otc_pain_reliever.json
│   └── maintenance_inhaler.json
└── lookup_tables/                    # CSV data files
    ├── diabetes_outcomes.csv
    └── medication_distributions.csv
```

### Module Categories

1. **Disease Modules**: Model specific conditions (diabetes, heart disease, cancer)
2. **Wellness Modules**: Preventive care and routine checkups
3. **Treatment Modules**: Medication and procedure protocols
4. **Submodules**: Reusable components called by other modules
5. **Utility Modules**: Supporting functions (death, symptoms)

## Best Practices

### 1. Module Design
- Keep modules focused on a single health aspect
- Use submodules for reusable logic
- Document complex logic with remarks
- Follow medical coding standards (SNOMED-CT, LOINC, RxNorm)

### 2. State Naming
- Use descriptive, self-documenting names
- Follow consistent naming patterns
- Group related states with prefixes

### 3. Transition Logic
- Ensure all paths lead to Terminal or valid states
- Validate probability distributions sum to 1.0
- Consider edge cases and rare outcomes
- Use guards to prevent impossible states

### 4. Medical Accuracy
- Base probabilities on epidemiological data
- Follow clinical guidelines for treatments
- Use appropriate time delays
- Include both common and rare pathways

### 5. Performance
- Minimize deeply nested submodule calls
- Use guards efficiently to skip unnecessary processing
- Consider module interaction effects

## Module Interactions

Modules communicate through patient attributes:

```json
// Module A sets an attribute
{
  "type": "SetAttribute",
  "attribute": "diabetes_diagnosed",
  "value": true
}

// Module B reads the attribute
{
  "type": "Guard",
  "allow": {
    "condition_type": "Attribute",
    "attribute": "diabetes_diagnosed",
    "operator": "==",
    "value": true
  }
}
```

Common shared attributes:
- Disease states (diabetes, hypertension, etc.)
- Risk factors (smoker, BMI, family history)
- Treatment status (on_metformin, post_surgery)
- Clinical values (last_glucose, last_bp)

## Validation Rules

1. **Structure**: Valid JSON with required fields
2. **Initial State**: Exactly one Initial state
3. **Transitions**: All states have valid transitions (except Terminal)
4. **References**: All transition targets exist
5. **Probabilities**: Distributed transitions sum to 1.0
6. **Codes**: Medical codes use valid systems
7. **Units**: Observations use appropriate units
8. **Time**: Delays use valid time units

## Example: Simple Diabetes Module

```json
{
  "name": "Simple Diabetes",
  "states": {
    "Initial": {
      "type": "Initial",
      "direct_transition": "Age_Guard"
    },
    
    "Age_Guard": {
      "type": "Guard",
      "allow": {
        "condition_type": "Age",
        "operator": ">=",
        "quantity": 45,
        "unit": "years"
      },
      "direct_transition": "Diabetes_Risk_Check"
    },
    
    "Diabetes_Risk_Check": {
      "type": "Simple",
      "distributed_transition": [
        {
          "transition": "Develop_Diabetes",
          "distribution": 0.1
        },
        {
          "transition": "Stay_Healthy",
          "distribution": 0.9
        }
      ]
    },
    
    "Develop_Diabetes": {
      "type": "ConditionOnset",
      "codes": [{
        "system": "SNOMED-CT",
        "code": "44054006",
        "display": "Diabetes mellitus type 2"
      }],
      "direct_transition": "Prescribe_Metformin"
    },
    
    "Prescribe_Metformin": {
      "type": "MedicationOrder",
      "codes": [{
        "system": "RxNorm",
        "code": "860975",
        "display": "Metformin 500mg"
      }],
      "direct_transition": "Living_With_Diabetes"
    },
    
    "Stay_Healthy": {
      "type": "Terminal"
    },
    
    "Living_With_Diabetes": {
      "type": "Terminal"
    }
  }
}
```

This module framework provides the foundation for generating realistic, temporally consistent patient data through interconnected state machines representing various aspects of health and healthcare.