import React, { createContext, useState, useContext } from "react";
import { zoneType } from "../../../utils/role";


/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type VitalsFormType = {
  oxygen: number;
  pulse: number;
  temperature: number;
  bpH: number;
  bpL: number;
  respiratoryRate: number;
  time: string | null;
};

export type ABCDFormType = {
  radialPulse: string;
  noisyBreathing: string;
  activeSeizures: string;
  cSpineInjury: string;
  stridor: string;
  angioedema: string;
  activeBleeding: string;
  incompleteSentences: string;
  capillaryRefill: string;
  alteredSensorium: string;
  activeBleedingType: string;
};

export type GCSFormType = {
  eyeMovement: string;
  verbalResponse: string;
  motorResponse: string;
  painScale: number | "";
};

export type TraumaFormType = {
  traumaType: string;
  fracture: boolean;
  fractureRegion: string;
  amputation: boolean;
  neckSwelling: boolean;
  minorHeadInjury: boolean;
  abrasion: boolean;
  suspectedAbuse: boolean;
  fallHeight: string;

  chestInjuryType: string;
  stabInjurySeverity: string;
  stabInjuryLocation: string;

  stabHeadScalp: boolean;
  stabHeadFace: boolean;
  stabHeadNeck: boolean;
  stabChestHeart: boolean;
  stabChestLungs: boolean;
  stabChestMajorBloodVessels: boolean;
  stabAbdomenStomach: boolean;
  stabAbdomenLiver: boolean;
  stabAbdomenKidneys: boolean;
  stabAbdomenSpleen: boolean;
  stabAbdomenIntestines: boolean;
  stabExtremityArm: boolean;
  stabExtremityLeg: boolean;
  stabExtremityMuscles: boolean;
  stabExtremityTendons: boolean;
  stabExtremityNerves: boolean;
  stabExtremityBloodVessels: boolean;
};

export type NonTraumaFormType = {
  pregnancy: boolean;
  pregnancyIssue: string;
  trimester: string;
  breathlessness: boolean;
  edema: boolean;
  internalBleeding: boolean;
  internalBleedingCause: string;
  poisoning: boolean;
  poisoningCause: string;
  burn: boolean;
  burnPercentage: string;
  hanging: boolean;
  drowning: boolean;
  electrocution: boolean;
  heatStroke: boolean;
  fever: boolean;
  feverSymptoms: string;
  drugOverdose: boolean;
  stoolPass: boolean;
  urinePass: boolean;
  swellingWound: boolean;
  dizziness: boolean;
  headache: boolean;
  coughCold: boolean;
  skinRash: boolean;
  medicoLegalExamination: boolean;
};

export type VitalsErrorsType = {
  oxygen: string;
  pulse: string;
  temperature: string;
  respiratoryRate: string;
  bpH: string;
  bpL: string;
};

export type GCSErrorsType = {
  eyeMovement: string;
  verbalResponse: string;
  motorResponse: string;
  painScale: string;
};

export type ABCDErrorsType = {
  radialPulse: string | null;
  noisyBreathing: string | null;
  activeSeizures: string | null;
  cSpineInjury: string | null;
  stridor: string | null;
  angioedema: string | null;
  activeBleeding: string | null;
  incompleteSentences: string | null;
  capillaryRefill: string | null;
  alteredSensorium: string | null;
  activeBleedingType: string | null;
};

export type TraumaErrorsType = {
  traumaType: string;
  fractureRegion: string;
  fallHeight: string;
};

export type NonTraumaErrorsType = {
  poisoningCause: string;
  burnPercentage: string;
  feverSymptoms: string;
  pregnancyIssue: string;
  trimester: string;
  internalBleedingCause: string;
};

export type TriageFormState = {
  zone: number | null;
  ward: string;
  wardID: number | undefined;
  lastKnownSequence: string;
  criticalCondition: string;

  vitals: VitalsFormType;
  abcd: ABCDFormType;
  gcs: GCSFormType;
  trauma: TraumaFormType;
  nonTrauma: NonTraumaFormType;

  errors: {
    vitals: VitalsErrorsType;
    abcd: ABCDErrorsType;
    gcs: GCSErrorsType;
    trauma: TraumaErrorsType;
    nonTrauma: NonTraumaErrorsType;
  };
};

/* -------------------------------------------------------------------------- */
/*                              Constants / Enums                             */
/* -------------------------------------------------------------------------- */

export const TriageLastKnownSequence = {
  CRITICAL_CONDITION: "CRITICAL_CONDITION",
  VITALS: "VITALS",
  ABCD: "ABCD",
  GCS: "GCS",
  TRAUMA: "TRAUMA",
  NON_TRAUMA: "NON_TRAUMA",
} as const;

export const LastKnownSequenceStage: Record<string, number> = {
  [TriageLastKnownSequence.CRITICAL_CONDITION]: 0,
  [TriageLastKnownSequence.VITALS]: 1,
  [TriageLastKnownSequence.ABCD]: 2,
  [TriageLastKnownSequence.GCS]: 3,
  [TriageLastKnownSequence.TRAUMA]: 4,
  [TriageLastKnownSequence.NON_TRAUMA]: 4,
};

export const CriticalCondition = {
  CHEST_PAIN: "chest pain",
  STROKE: "stroke",
  UNCONCIOUS: "unconscious",
} as const;

/* -------------------------------------------------------------------------- */
/*                              Initial Form State                            */
/* -------------------------------------------------------------------------- */

const initialFormState: TriageFormState = {
  zone: null,
  ward: "",
  wardID: 0,
  lastKnownSequence: "",
  criticalCondition: "",
  vitals: {
    oxygen: 0,
    pulse: 0,
    temperature: 0,
    bpH: 0,
    bpL: 0,
    respiratoryRate: 0,
    time: null,
  },
  abcd: {
    radialPulse: "",
    noisyBreathing: "",
    activeSeizures: "",
    cSpineInjury: "",
    angioedema: "",
    stridor: "",
    activeBleeding: "",
    incompleteSentences: "",
    capillaryRefill: "",
    alteredSensorium: "",
    activeBleedingType: "",
  },
  gcs: {
    eyeMovement: "",
    verbalResponse: "",
    motorResponse: "",
    painScale: "",
  },
  trauma: {
    traumaType: "",
    fallHeight: "null",
    fracture: false,
    fractureRegion: "null",
    amputation: false,
    neckSwelling: false,
    minorHeadInjury: false,
    abrasion: false,
    suspectedAbuse: false,
    chestInjuryType: "null",
    stabInjurySeverity: "null",
    stabInjuryLocation: "null",
    stabHeadScalp: false,
    stabHeadFace: false,
    stabHeadNeck: false,
    stabChestHeart: false,
    stabChestLungs: false,
    stabChestMajorBloodVessels: false,
    stabAbdomenStomach: false,
    stabAbdomenLiver: false,
    stabAbdomenKidneys: false,
    stabAbdomenSpleen: false,
    stabAbdomenIntestines: false,
    stabExtremityArm: false,
    stabExtremityLeg: false,
    stabExtremityMuscles: false,
    stabExtremityTendons: false,
    stabExtremityNerves: false,
    stabExtremityBloodVessels: false,
  },
  nonTrauma: {
    pregnancy: false,
    pregnancyIssue: "null",
    trimester: "null",
    breathlessness: false,
    edema: false,
    internalBleeding: false,
    internalBleedingCause: "null",
    poisoning: false,
    poisoningCause: "null",
    burn: false,
    burnPercentage: "null",
    hanging: false,
    drowning: false,
    electrocution: false,
    heatStroke: false,
    fever: false,
    feverSymptoms: "null",
    drugOverdose: false,
    stoolPass: false,
    urinePass: false,
    swellingWound: false,
    dizziness: false,
    headache: false,
    coughCold: false,
    skinRash: false,
    medicoLegalExamination: false,
  },
  errors: {
    vitals: {
      oxygen: "",
      pulse: "",
      temperature: "",
      respiratoryRate: "",
      bpH: "",
      bpL: "",
    },
    abcd: {
      radialPulse: "",
      noisyBreathing: "",
      activeSeizures: "",
      cSpineInjury: "",
      angioedema: "",
      stridor: "",
      activeBleeding: "",
      incompleteSentences: "",
      capillaryRefill: "",
      alteredSensorium: "",
      activeBleedingType: "",
    },
    gcs: {
      eyeMovement: "",
      verbalResponse: "",
      motorResponse: "",
      painScale: "",
    },
    trauma: {
      traumaType: "",
      fractureRegion: "",
      fallHeight: "",
    },
    nonTrauma: {
      poisoningCause: "",
      burnPercentage: "",
      feverSymptoms: "",
      pregnancyIssue: "",
      trimester: "",
      internalBleedingCause: "",
    },
  },
};

/* -------------------------------------------------------------------------- */
/*                          validate vitals (same logic)                      */
/* -------------------------------------------------------------------------- */

export const validateVitalsForm = ({
  vitals: data,
  isSubmission = false,
}: {
  vitals: VitalsFormType;
  isSubmission?: boolean;
}) => {
  const errors: VitalsErrorsType = {
    oxygen: "",
    pulse: "",
    temperature: "",
    respiratoryRate: "",
    bpH: "",
    bpL: "",
  };

  if (data.oxygen || isSubmission) {
    if (data.oxygen < 50) errors.oxygen = "Oxygen value should be >= 50";
    else if (data.oxygen > 100) errors.oxygen = "Oxygen value should be <= 100";
  }

  if (data.bpH || isSubmission) {
    if (data.bpL && data.bpH < data.bpL)
      errors.bpH = "High bp should be greater than low bp";
    else if (data.bpH > 400) errors.bpH = "High bp should be <= 400";
    else if (data.bpH < 50) errors.bpH = "High bp should be >= 50";
  }

  if (data.bpL || isSubmission) {
    if (data.bpH && data.bpH < data.bpL)
      errors.bpL = "Low bp should be less than high bp";
    else if (data.bpL > 300) errors.bpL = "Low bp should be <= 300";
    else if (data.bpL < 30) errors.bpL = "Low bp should be >= 30";
  }

  if (data.pulse || isSubmission) {
    if (data.pulse < 30) errors.pulse = "Pulse value should be >= 30";
    else if (data.pulse > 300) errors.pulse = "Pulse value should be <= 300";
  }

  if (data.temperature || isSubmission) {
    if (data.temperature < 20)
      errors.temperature = "Temperature value should be >= 20";
    else if (data.temperature > 45)
      errors.temperature = "Temperature value should be <= 45";
  }

  if (data.respiratoryRate || isSubmission) {
    if (data.respiratoryRate < 1)
      errors.respiratoryRate = "Respiratory Rate value should be >= 1";
    else if (data.respiratoryRate > 50)
      errors.respiratoryRate = "Respiratory Rate value should be <= 50";
  }

  const hasErrors = Object.values(errors).some(Boolean);
  return { errors, hasErrors };
};

/* -------------------------------------------------------------------------- */
/*                     GetTriageFormDataObject (same as web)                  */
/* -------------------------------------------------------------------------- */

const boolFields = [
  "noisyBreathing",
  "alteredSensorium",
  "activeBleeding",
  "stridor",
  "angioedema",
  "cSpineInjury",
  "activeSeizures",
  "incompleteSentences",
] as const;

const convertToBool = (val: string): boolean => val === "yes";

export const GetTriageFormDataObject = (data: TriageFormState) => {
  let processedData: any = {};

  switch (data.lastKnownSequence) {
    case TriageLastKnownSequence.CRITICAL_CONDITION:
      processedData = {
        criticalCondition: data.criticalCondition,
      };
      break;
    case TriageLastKnownSequence.VITALS:
      processedData = { ...data.vitals };
      break;
    case TriageLastKnownSequence.ABCD:
      processedData = { ...data.abcd, ...data.vitals };
      break;
    case TriageLastKnownSequence.GCS:
      processedData = { ...data.abcd, ...data.gcs, ...data.vitals };
      break;
    case TriageLastKnownSequence.TRAUMA:
      processedData = {
        ...data.abcd,
        ...data.gcs,
        ...data.vitals,
        ...data.trauma,
      };
      break;
    case TriageLastKnownSequence.NON_TRAUMA:
      processedData = {
        ...data.abcd,
        ...data.gcs,
        ...data.vitals,
        ...data.nonTrauma,
      };
      break;
  }

  if (data.ward) {
    processedData.ward = data.ward;
  }

  if (data.abcd.radialPulse === "absent") {
    processedData.radialPulse = false;
  } else if (data.abcd.radialPulse === "present") {
    processedData.radialPulse = true;
  }

  boolFields.forEach((field) => {
    if (field in data.abcd) {
      processedData[field] = convertToBool(
        data.abcd[field as keyof ABCDFormType]
      );
    }
  });

  processedData.zone = data.zone || zoneType.green;
  return processedData;
};

/* -------------------------------------------------------------------------- */
/*                            Context + Provider                              */
/* -------------------------------------------------------------------------- */

const TriageFormContext = createContext<{
  formData: TriageFormState;
  setFormData: React.Dispatch<React.SetStateAction<TriageFormState>>;
}>({
  formData: initialFormState,
  setFormData: () => undefined,
});

export const TriageFormProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [formData, setFormData] = useState<TriageFormState>(initialFormState);

  return (
    <TriageFormContext.Provider value={{ formData, setFormData }}>
      {children}
    </TriageFormContext.Provider>
  );
};

export const useTriageForm = () => useContext(TriageFormContext);

export default TriageFormContext;
