# Synthea Repository Artifacts

This document catalogs the various artifacts in the Synthea repository that are essential for understanding and reimplementing the system in TypeScript.

## 1. Configuration Files

### Core Configuration
- **synthea.properties**: Central configuration file controlling all aspects of the system
  - Export settings (formats, directories, file naming)
  - Population generation parameters
  - Module enable/disable flags
  - Time stepping configuration
  - Geographic and demographic defaults

### Supporting Configurations
- **telemedicine_config.json**: Telemedicine encounter routing and probability configurations
- **log4j.xml / log4j2.xml**: Logging configuration (would need TypeScript logging equivalent)

## 2. Demographics and Geography Data

### Population Data (CSV)
- **geography/demographics.csv**: County-level population demographics including:
  - Age distributions by gender
  - Race and ethnicity percentages
  - Income levels
  - Education statistics
  
- **geography/zipcodes.csv**: ZIP code database with:
  - City/state mappings
  - Geographic coordinates (latitude/longitude)
  - Population counts

- **geography/sdoh.csv**: Social determinants of health by county
  - Poverty rates
  - Unemployment
  - Education levels
  - Food insecurity metrics

### Additional Geographic Data
- **geography/timezones.csv**: Time zone mappings for locations
- **geography/fipscodes.csv**: Federal Information Processing Standards codes
- **geography/veteran_demographics.csv**: Veteran population distributions
- **geography/foreign_birthplace.json**: Foreign birthplace distributions by language

## 3. Clinical Reference Data

### Growth and Development
- **cdc_growth_charts.json**: CDC pediatric growth chart data
- **birthweights.csv**: Birth weight distribution statistics
- **nhanes_two_year_olds_bmi.csv**: BMI reference data for toddlers
- **growth_data_error_rates.json**: Measurement error rates for growth data

### Medical References
- **immunization_schedule.json**: Complete vaccination schedules by age
- **gbd_disability_weights.csv**: Global Burden of Disease disability weights
- **bmi_correlations.json**: BMI correlation factors
- **htn_drugs.csv**: Hypertension medication reference data

### Biometrics Configuration
- **biometrics.yml**: Comprehensive biometric parameters including:
  - Vital sign ranges (blood pressure, heart rate, temperature)
  - Laboratory value ranges (lipids, metabolic panels, blood counts)
  - Weight gain/loss patterns
  - Twin birth rates
  - Sexual orientation distributions

## 4. Provider Infrastructure

### Healthcare Facilities (providers/ directory)
- **hospitals.csv**: Hospital data with bed counts, services, coordinates
- **primary_care_facilities.csv**: Primary care office locations
- **urgent_care_facilities.csv**: Urgent care center data
- **nursing.csv**: Nursing home facilities
- **dialysis.csv**: Dialysis center locations
- **hospice.csv**: Hospice care facilities
- **home_health_agencies.csv**: Home health providers
- **va_facilities.csv**: Veterans Affairs medical centers
- **ihs_facilities.csv**: Indian Health Service facilities

## 5. Cost Data

### Medical Costs (costs/ directory)
- **medications.csv**: Drug pricing with NDC codes and AWP
- **procedures.csv**: Procedure costs by CPT code
- **encounters.csv**: Base encounter costs by type
- **immunizations.csv**: Vaccine costs
- **devices.csv**: Medical device pricing
- **supplies.csv**: Medical supply costs
- **labs_adjustments.csv**: Laboratory test cost adjustments
- **[category]_adjustments.csv**: Cost adjustment factors for various services

## 6. Insurance and Payer Data

### Payer Information (payers/ directory)
- **insurance_companies.csv**: Insurance company listings
- **insurance_plans.csv**: Plan details with premiums and coverage
- **insurance_eligibilities.csv**: Eligibility criteria
- **carriers.csv**: Insurance carrier information
- **eligibility_input_files/**: Medicaid and Medicare eligibility tables

## 7. Module Support Data

### Lookup Tables (modules/lookup_tables/)
Over 60 CSV files providing probability distributions and clinical parameters:
- Medication distribution tables (by drug class)
- COVID-19 outcome probabilities
- HIV progression and mortality tables
- Surgical procedure details
- Disease-specific probability distributions
- UTI recurrence rates
- Diabetic retinopathy progression

### Keep Modules (keep_modules/)
JSON files defining patient filtering criteria:
- keep_diabetes.json
- keep_medicare_beneficiaries.json
- keep_hospice.json
- must_have_cabg.json

## 8. Export Templates

### CCDA Templates (templates/ccda/)
FreeMarker templates for C-CDA generation:
- Document structure templates
- Section templates (allergies, medications, problems, etc.)
- Both "current" and "no current" variants
- Narrative block generation

### Module Templates (templates/modules/)
- prevalence.json: Template for prevalence-based conditions
- incidence_1.json / incidence_2.json: Incidence-based templates
- onset_distribution.json: Age-based onset patterns

## 9. Export Mappings

### Blue Button 2.0 Mappings (export/)
- beneficiary_bb2_ccw.csv
- carrier_bb2_ccw.csv
- [claim_type]_bb2_ccw.csv
- bfd_field_values.tsv

### Code Mappings
- us_core_mapping.csv: US Core profile mappings

## 10. Scripts and Tools

### Execution Scripts
- **run_synthea**: Shell script for Unix/Linux execution
- **run_synthea.bat**: Windows batch file
- **generate_samples.sh**: Sample data generation script
- **run_flexporter**: Flexporter execution script

### Build Configuration
- **build.gradle**: Gradle build configuration
- **settings.gradle**: Gradle settings
- **gradle/**: Gradle wrapper files

## 11. Test Data

### Test Resources (test/resources/)
- Sample patients and modules
- Test configuration files
- Validation test cases
- Mock data for unit tests

## 12. Physiology Simulation

### Simulation Configurations (config/simulations/)
- Cardiovascular models (McSharry2003.yml, Smith2004_CVS.yml)
- ECG simulation parameters
- Differential equation solver configurations

### Physiology Generators (physiology/generators/)
- circulation_hemodynamics.yml: Cardiovascular system parameters

## 13. Name Generation
- **names.yml**: Name lists for patient generation (first names, last names by ethnicity)

## 14. Language and Culture
- **language_lookup.json**: Language preference mappings
- **race_ethnicity_codes.json**: Standard code mappings for race/ethnicity

## Key Insights for TypeScript Implementation

### Data Management
1. Need robust CSV, JSON, and YAML parsing capabilities
2. Efficient loading and caching of reference data
3. Consider lazy loading for large datasets

### Template System
1. Replace FreeMarker with TypeScript template engine (e.g., Handlebars, EJS)
2. Maintain template structure for easy migration

### Configuration
1. Implement properties file parser or use environment variables
2. Support runtime configuration overrides
3. Validate configuration on startup

### File Organization
1. Maintain similar directory structure for familiarity
2. Consider TypeScript-specific organization (src/, dist/, etc.)
3. Keep data files in same relative locations

### Build System
1. Replace Gradle with npm scripts or modern build tools
2. Support similar command-line interface
3. Implement cross-platform execution scripts

This comprehensive artifact collection forms the foundation for generating realistic synthetic health data and would need to be carefully migrated to support a TypeScript implementation.