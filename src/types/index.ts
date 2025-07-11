// Core types for Synthea TypeScript implementation

// Medical coding types
export interface Coding {
  system: string;
  code: string;
  display?: string;
  version?: string;
}

export interface CodeableConcept {
  coding: Coding[];
  text?: string;
}

// Time and duration types
export type TimeUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

export interface Duration {
  quantity: number;
  unit: TimeUnit;
}

export interface Range {
  low: number;
  high: number;
  unit?: string;
}

// Module definition types
export interface Module {
  name: string;
  gmf_version?: number;
  remarks?: string[];
  states: Record<string, StateDefinition>;
}

// State definition - the JSON representation
export interface StateDefinition {
  type: string;
  remarks?: string[];
  // Transition properties (only one should be present)
  direct_transition?: string;
  conditional_transition?: ConditionalTransitionOption[];
  distributed_transition?: DistributedTransitionOption[];
  complex_transition?: ComplexTransitionOption[];
  // State-specific properties are handled by specific state types
  [key: string]: any;
}

// Transition options
export interface ConditionalTransitionOption {
  condition?: ConditionDefinition;
  transition: string;
}

export interface DistributedTransitionOption {
  distribution: number;
  transition: string;
}

export interface ComplexTransitionOption {
  condition?: ConditionDefinition;
  distributions?: DistributedTransitionOption[];
  transition?: string;
}

// Condition types
export interface ConditionDefinition {
  condition_type: string;
  [key: string]: any;
}

// Person and health record types
export interface Person {
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
  
  // Location
  location?: {
    city: string;
    state: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface HealthRecord {
  encounters: Encounter[];
  conditions: Condition[];
  medications: Medication[];
  observations: Observation[];
  procedures: Procedure[];
  immunizations: Immunization[];
  carePlans: CarePlan[];
  allergies: Allergy[];
  devices: Device[];
  imagingStudies: ImagingStudy[];
}

// Clinical entry types
export interface Entry {
  id: string;
  startTime: number;
  endTime?: number;
  codes: CodeableConcept;
  type: string;
}

export interface Encounter extends Entry {
  type: 'Encounter';
  encounterClass: 'ambulatory' | 'emergency' | 'inpatient' | 'urgent' | 'wellness' | 'hospice' | 'snf' | 'home' | 'virtual';
  reason?: CodeableConcept;
  discharge?: CodeableConcept;
  provider?: string;
  clinician?: string;
}

export interface Condition extends Entry {
  type: 'Condition';
  clinicalStatus: 'active' | 'resolved' | 'inactive';
}

export interface Medication extends Entry {
  type: 'Medication';
  dosage?: {
    amount: number;
    frequency: number;
    period: number;
    unit: string;
  };
  duration?: Duration;
  prescriber?: string;
  stopReason?: CodeableConcept;
}

export interface Observation extends Entry {
  type: 'Observation';
  category?: string;
  value?: any;
  unit?: string;
}

export interface Procedure extends Entry {
  type: 'Procedure';
  duration?: Duration;
  reason?: CodeableConcept;
}

export interface Immunization extends Entry {
  type: 'Immunization';
  series?: string;
  doseQuantity?: {
    value: number;
    unit: string;
  };
}

export interface CarePlan extends Entry {
  type: 'CarePlan';
  activities?: CodeableConcept[];
  reason?: CodeableConcept;
}

export interface Allergy extends Entry {
  type: 'Allergy';
  allergyType?: 'food' | 'drug' | 'environmental' | 'biologic';
  category?: 'food' | 'medication' | 'environment' | 'biologic';
  criticality?: 'low' | 'high' | 'unable-to-assess';
  reactions?: AllergyReaction[];
}

export interface AllergyReaction {
  manifestation: CodeableConcept;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface Device extends Entry {
  type: 'Device';
  manufacturer?: string;
  model?: string;
  udi?: string;
}

export interface ImagingStudy extends Entry {
  type: 'ImagingStudy';
  modality: CodeableConcept;
  bodySite?: CodeableConcept;
  series?: ImagingSeries[];
}

export interface ImagingSeries {
  modality: CodeableConcept;
  bodySite?: CodeableConcept;
  instances?: ImagingInstance[];
}

export interface ImagingInstance {
  title: string;
  sopClass: CodeableConcept;
}

// Generator types
export interface GeneratorOptions {
  population: number;
  seed?: number;
  parallelWorkers?: number;
  modules?: string[];
  exportFormat?: 'fhir' | 'csv' | 'json';
  outputDirectory?: string;
  timestep?: number;
  referenceTime?: number;
}

export interface GenerationStats {
  totalGenerated: number;
  livingPatients: number;
  deceasedPatients: number;
  averageAge: number;
  conditions: Record<string, number>;
  medications: Record<string, number>;
  procedures: Record<string, number>;
  elapsedTime: number;
}

// Export types
export interface ExportOptions {
  format: 'fhir' | 'csv' | 'json';
  outputDirectory: string;
  prettyPrint?: boolean;
  bulkData?: boolean;
}