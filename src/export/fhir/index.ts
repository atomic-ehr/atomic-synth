import { Person, HealthRecord, Encounter, Condition, Medication, Observation, Procedure } from '../../types/index.ts';

// FHIR R4 types (simplified for POC)
export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'transaction' | 'collection';
  entry: BundleEntry[];
}

export interface BundleEntry {
  fullUrl: string;
  resource: FHIRResource;
  request?: {
    method: 'POST' | 'PUT';
    url: string;
  };
}

export type FHIRResource = 
  | FHIRPatient 
  | FHIREncounter 
  | FHIRCondition 
  | FHIRMedicationRequest
  | FHIRObservation
  | FHIRProcedure;

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  name: Array<{
    use: string;
    family: string;
    given: string[];
  }>;
  gender: string;
  birthDate: string;
  deceasedDateTime?: string;
  address?: Array<{
    use: string;
    line: string[];
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>;
}

export interface FHIREncounter {
  resourceType: 'Encounter';
  id: string;
  status: string;
  class: {
    system: string;
    code: string;
    display: string;
  };
  type?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  subject: {
    reference: string;
  };
  period: {
    start: string;
    end?: string;
  };
  reasonCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  }>;
}

export interface FHIRCondition {
  resourceType: 'Condition';
  id: string;
  clinicalStatus: {
    coding: Array<{
      system: string;
      code: string;
    }>;
  };
  verificationStatus: {
    coding: Array<{
      system: string;
      code: string;
    }>;
  };
  code: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  encounter?: {
    reference: string;
  };
  onsetDateTime: string;
  abatementDateTime?: string;
}

export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  status: string;
  intent: string;
  medicationCodeableConcept: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  encounter?: {
    reference: string;
  };
  authoredOn: string;
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: string;
      };
    };
    doseAndRate?: Array<{
      doseQuantity?: {
        value: number;
        unit: string;
      };
    }>;
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  status: string;
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  encounter?: {
    reference: string;
  };
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
}

export interface FHIRProcedure {
  resourceType: 'Procedure';
  id: string;
  status: string;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  encounter?: {
    reference: string;
  };
  performedDateTime?: string;
  performedPeriod?: {
    start: string;
    end?: string;
  };
}

// FHIR Exporter
export class FHIRExporter {
  // Export a person to a FHIR Bundle
  exportPerson(person: Person): FHIRBundle {
    const bundle: FHIRBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: []
    };
    
    // Add Patient resource
    const patient = this.createPatient(person);
    bundle.entry.push({
      fullUrl: `urn:uuid:${person.id}`,
      resource: patient,
      request: {
        method: 'POST',
        url: 'Patient'
      }
    });
    
    // Add Encounters
    for (const encounter of person.record.encounters) {
      const fhirEncounter = this.createEncounter(encounter, person.id);
      bundle.entry.push({
        fullUrl: `urn:uuid:${encounter.id}`,
        resource: fhirEncounter,
        request: {
          method: 'POST',
          url: 'Encounter'
        }
      });
    }
    
    // Add Conditions
    for (const condition of person.record.conditions) {
      const fhirCondition = this.createCondition(condition, person.id);
      bundle.entry.push({
        fullUrl: `urn:uuid:${condition.id}`,
        resource: fhirCondition,
        request: {
          method: 'POST',
          url: 'Condition'
        }
      });
    }
    
    // Add Medications
    for (const medication of person.record.medications) {
      const fhirMedication = this.createMedicationRequest(medication, person.id);
      bundle.entry.push({
        fullUrl: `urn:uuid:${medication.id}`,
        resource: fhirMedication,
        request: {
          method: 'POST',
          url: 'MedicationRequest'
        }
      });
    }
    
    // Add Observations
    for (const observation of person.record.observations) {
      const fhirObservation = this.createObservation(observation, person.id);
      bundle.entry.push({
        fullUrl: `urn:uuid:${observation.id}`,
        resource: fhirObservation,
        request: {
          method: 'POST',
          url: 'Observation'
        }
      });
    }
    
    // Add Procedures
    for (const procedure of person.record.procedures) {
      const fhirProcedure = this.createProcedure(procedure, person.id);
      bundle.entry.push({
        fullUrl: `urn:uuid:${procedure.id}`,
        resource: fhirProcedure,
        request: {
          method: 'POST',
          url: 'Procedure'
        }
      });
    }
    
    return bundle;
  }
  
  private createPatient(person: Person): FHIRPatient {
    const patient: FHIRPatient = {
      resourceType: 'Patient',
      id: person.id,
      name: [{
        use: 'official',
        family: person.attributes.get('last_name') || 'Doe',
        given: [person.attributes.get('first_name') || 'John']
      }],
      gender: person.gender === 'M' ? 'male' : 'female',
      birthDate: person.birthDate.toISOString().split('T')[0]!
    };
    
    if (person.deathDate) {
      patient.deceasedDateTime = person.deathDate.toISOString();
    }
    
    if (person.location) {
      patient.address = [{
        use: 'home',
        line: [person.attributes.get('address') || '123 Main St'],
        city: person.location.city,
        state: person.location.state,
        postalCode: person.attributes.get('zip') || '00000',
        country: person.location.country || 'US'
      }];
    }
    
    return patient;
  }
  
  private createEncounter(encounter: Encounter, patientId: string): FHIREncounter {
    return {
      resourceType: 'Encounter',
      id: encounter.id,
      status: encounter.endTime ? 'finished' : 'in-progress',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: encounter.encounterClass,
        display: encounter.encounterClass
      },
      type: [{
        coding: encounter.codes.coding,
        text: encounter.codes.text
      }],
      subject: {
        reference: `Patient/${patientId}`
      },
      period: {
        start: new Date(encounter.startTime).toISOString(),
        end: encounter.endTime ? new Date(encounter.endTime).toISOString() : undefined
      },
      reasonCode: encounter.reason ? [{
        coding: encounter.reason.coding
      }] : undefined
    };
  }
  
  private createCondition(condition: Condition, patientId: string): FHIRCondition {
    return {
      resourceType: 'Condition',
      id: condition.id,
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: condition.clinicalStatus
        }]
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed'
        }]
      },
      code: {
        coding: condition.codes.coding,
        text: condition.codes.text
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      onsetDateTime: new Date(condition.startTime).toISOString(),
      abatementDateTime: condition.endTime ? new Date(condition.endTime).toISOString() : undefined
    };
  }
  
  private createMedicationRequest(medication: Medication, patientId: string): FHIRMedicationRequest {
    const request: FHIRMedicationRequest = {
      resourceType: 'MedicationRequest',
      id: medication.id,
      status: medication.endTime ? 'stopped' : 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: medication.codes.coding,
        text: medication.codes.text
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      authoredOn: new Date(medication.startTime).toISOString()
    };
    
    if (medication.dosage) {
      request.dosageInstruction = [{
        timing: {
          repeat: {
            frequency: medication.dosage.frequency,
            period: medication.dosage.period,
            periodUnit: 'd'
          }
        },
        doseAndRate: [{
          doseQuantity: {
            value: medication.dosage.amount,
            unit: medication.dosage.unit
          }
        }]
      }];
    }
    
    return request;
  }
  
  private createObservation(observation: Observation, patientId: string): FHIRObservation {
    const obs: FHIRObservation = {
      resourceType: 'Observation',
      id: observation.id,
      status: 'final',
      code: {
        coding: observation.codes.coding,
        text: observation.codes.text
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      effectiveDateTime: new Date(observation.startTime).toISOString()
    };
    
    // Add value based on type
    if (typeof observation.value === 'number' && observation.unit) {
      obs.valueQuantity = {
        value: observation.value,
        unit: observation.unit
      };
    } else if (typeof observation.value === 'string') {
      obs.valueString = observation.value;
    } else if (typeof observation.value === 'boolean') {
      obs.valueBoolean = observation.value;
    }
    
    return obs;
  }
  
  private createProcedure(procedure: Procedure, patientId: string): FHIRProcedure {
    return {
      resourceType: 'Procedure',
      id: procedure.id,
      status: 'completed',
      code: {
        coding: procedure.codes.coding,
        text: procedure.codes.text
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      performedPeriod: {
        start: new Date(procedure.startTime).toISOString(),
        end: procedure.endTime ? new Date(procedure.endTime).toISOString() : new Date(procedure.startTime).toISOString()
      }
    };
  }
  
  // Export to file
  async exportToFile(person: Person, filepath: string): Promise<void> {
    const bundle = this.exportPerson(person);
    const json = JSON.stringify(bundle, null, 2);
    await Bun.write(filepath, json);
  }
}