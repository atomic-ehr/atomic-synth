import { ConditionDefinition, Person, CodeableConcept } from '../types/index.ts';

// Condition evaluation function
export function evaluateCondition(
  condition: ConditionDefinition,
  person: Person,
  time: number
): boolean {
  const conditionType = condition.condition_type;
  
  switch (conditionType) {
    case 'Age':
      return evaluateAgeCondition(condition, person, time);
    
    case 'Gender':
      return evaluateGenderCondition(condition, person);
    
    case 'Attribute':
      return evaluateAttributeCondition(condition, person);
    
    case 'Symptom':
      return evaluateSymptomCondition(condition, person);
    
    case 'Observation':
      return evaluateObservationCondition(condition, person);
    
    case 'Active Condition':
      return evaluateActiveCondition(condition, person, time);
    
    case 'Active Medication':
      return evaluateActiveMedication(condition, person, time);
    
    case 'And':
      return evaluateAndCondition(condition, person, time);
    
    case 'Or':
      return evaluateOrCondition(condition, person, time);
    
    case 'Not':
      return evaluateNotCondition(condition, person, time);
    
    case 'True':
      return true;
    
    case 'False':
      return false;
    
    default:
      throw new Error(`Unknown condition type: ${conditionType}`);
  }
}

// Age condition evaluation
function evaluateAgeCondition(
  condition: ConditionDefinition,
  person: Person,
  time: number
): boolean {
  const ageInMs = time - person.birthDate.getTime();
  const ageInYears = ageInMs / (365.25 * 24 * 60 * 60 * 1000);
  
  let targetAge = condition.quantity;
  if (condition.unit && condition.unit !== 'years') {
    // Convert to years
    targetAge = convertToYears(condition.quantity, condition.unit);
  }
  
  return evaluateNumericCondition(ageInYears, condition.operator, targetAge);
}

// Gender condition evaluation
function evaluateGenderCondition(
  condition: ConditionDefinition,
  person: Person
): boolean {
  return person.gender === condition.gender;
}

// Attribute condition evaluation
function evaluateAttributeCondition(
  condition: ConditionDefinition,
  person: Person
): boolean {
  const attributeValue = person.attributes.get(condition.attribute);
  
  if (condition.operator) {
    return evaluateNumericCondition(attributeValue, condition.operator, condition.value);
  }
  
  // Simple equality check
  return attributeValue === condition.value;
}

// Symptom condition evaluation
function evaluateSymptomCondition(
  condition: ConditionDefinition,
  person: Person
): boolean {
  const symptoms = person.attributes.get('symptoms') || {};
  const symptomValue = symptoms[condition.symptom] || 0;
  
  return evaluateNumericCondition(symptomValue, condition.operator, condition.value);
}

// Observation condition evaluation
function evaluateObservationCondition(
  condition: ConditionDefinition,
  person: Person
): boolean {
  // Find most recent observation matching the codes
  const observations = person.record.observations;
  const matchingObs = observations
    .filter(obs => codesMatch(obs.codes, condition.codes))
    .sort((a, b) => b.startTime - a.startTime);
  
  if (matchingObs.length === 0) {
    return false;
  }
  
  const latestValue = matchingObs[0]!.value;
  return evaluateNumericCondition(latestValue, condition.operator, condition.value);
}

// Active condition evaluation
function evaluateActiveCondition(
  condition: ConditionDefinition,
  person: Person,
  time: number
): boolean {
  return person.record.conditions.some(cond => 
    codesMatch(cond.codes, condition.codes) &&
    cond.clinicalStatus === 'active' &&
    cond.startTime <= time &&
    (!cond.endTime || cond.endTime > time)
  );
}

// Active medication evaluation
function evaluateActiveMedication(
  condition: ConditionDefinition,
  person: Person,
  time: number
): boolean {
  return person.record.medications.some(med =>
    codesMatch(med.codes, condition.codes) &&
    med.startTime <= time &&
    (!med.endTime || med.endTime > time)
  );
}

// Boolean logic conditions
function evaluateAndCondition(
  condition: ConditionDefinition,
  person: Person,
  time: number
): boolean {
  return condition.conditions.every((subCondition: ConditionDefinition) =>
    evaluateCondition(subCondition, person, time)
  );
}

function evaluateOrCondition(
  condition: ConditionDefinition,
  person: Person,
  time: number
): boolean {
  return condition.conditions.some((subCondition: ConditionDefinition) =>
    evaluateCondition(subCondition, person, time)
  );
}

function evaluateNotCondition(
  condition: ConditionDefinition,
  person: Person,
  time: number
): boolean {
  return !evaluateCondition(condition.condition, person, time);
}

// Helper functions
function evaluateNumericCondition(
  value: any,
  operator: string,
  target: any
): boolean {
  const numValue = Number(value);
  const numTarget = Number(target);
  
  if (isNaN(numValue) || isNaN(numTarget)) {
    return false;
  }
  
  switch (operator) {
    case '<':
      return numValue < numTarget;
    case '<=':
      return numValue <= numTarget;
    case '>':
      return numValue > numTarget;
    case '>=':
      return numValue >= numTarget;
    case '==':
      return numValue === numTarget;
    case '!=':
      return numValue !== numTarget;
    case 'is nil':
      return value === null || value === undefined;
    case 'is not nil':
      return value !== null && value !== undefined;
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

function convertToYears(quantity: number, unit: string): number {
  switch (unit) {
    case 'years':
      return quantity;
    case 'months':
      return quantity / 12;
    case 'weeks':
      return quantity / 52.25;
    case 'days':
      return quantity / 365.25;
    default:
      throw new Error(`Cannot convert ${unit} to years`);
  }
}

function codesMatch(codes1: CodeableConcept, codes2: any[]): boolean {
  if (!codes1 || !codes2) {
    return false;
  }
  
  return codes1.coding.some(coding1 =>
    codes2.some(coding2 =>
      coding1.system === coding2.system &&
      coding1.code === coding2.code
    )
  );
}