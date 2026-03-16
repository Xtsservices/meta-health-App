import { create } from "zustand";

interface MainFormFields {
  mainFormFields: {
    mouthOpening: string | null;
    neckRotation: string | null;
    tmDistance: string | null;
    mp1: boolean;
    mp2: boolean;
    mp3: boolean;
    mp4: boolean;
    morbidObesity: boolean;
    difficultAirway: boolean;
    teethPoorRepair: boolean;
    micrognathia: boolean;
    edentulous: boolean;
    beard: boolean;
    shortMuscularNeck: boolean;
    prominentIncisors: boolean;
  };
  setMainFormFields: (
    updates: Partial<MainFormFields["mainFormFields"]>
  ) => void;
}

interface ExaminationFindingNotesState {
  examinationFindingNotes: {
    examinationFindingNotes: string;
    smokingTobacco: string;
    cardioVascularExamination: string;
    abdominalExamination: string;
    alcohol: string;
    neuroMuscularExamination: string;
    spineExamination: string;
  };
  setExaminationFindingNotes: (
    updates: Partial<ExaminationFindingNotesState["examinationFindingNotes"]>
  ) => void;
}

interface GeneralPhysicalExaminationState {
  generalphysicalExamination: {
    jvp: boolean;
    pallor: boolean;
    cyanosis: boolean;
    icterus: boolean;
    pupils: boolean;
    edema: boolean;
    syncopatAttack: boolean;
    paipitation: boolean;
    other: boolean;
  };
  setGeneralPhysicalExamination: (
    updates: Partial<
      GeneralPhysicalExaminationState["generalphysicalExamination"]
    >
  ) => void;
}

interface MallampatiGradeState {
  mallampatiGrade: {
    class: number;
  };
  setMallampatiGrade: (
    updates: Partial<MallampatiGradeState["mallampatiGrade"]>
  ) => void;
}

interface RespiratoryState {
  respiratory: {
    dryCough: boolean;
    productiveCough: boolean;
    asthma: boolean;
    recentURILRTI: boolean;
    tb: boolean;
    pneumonia: boolean;
    copd: boolean;
    osa: boolean;
    recurrentTonsils: boolean;
    breathlessness: boolean;
    dyspnea: boolean;
  };
  setRespiratory: (updates: Partial<RespiratoryState["respiratory"]>) => void;
}

interface HepatoState {
  hepato: {
    vomiting: boolean;
    gerd: boolean;
    diarrhoea: boolean;
    galbladderDS: boolean;
    jaundice: boolean;
    cirrhosis: boolean;
  };
  setHepato: (updates: Partial<HepatoState["hepato"]>) => void;
}

interface CardioVascularState {
  cardioVascular: {
    hypertension: boolean;
    cafDOE: boolean;
    ischemicHeartDisease: boolean;
    rheumaticFever: boolean;
    orthpneaPND: boolean;
    murmurs: boolean;
    cad: boolean;
    exerciseTolerance: boolean;
    cardicEnlargement: boolean;
    angina: boolean;
    mi: boolean;
    mtdLessThan4: boolean;
    mtdGreaterThan4: boolean;
  };
  setCardioVascular: (
    updates: Partial<CardioVascularState["cardioVascular"]>
  ) => void;
}

interface NeuroState {
  neuroMuscular: {
    rhArthritis: boolean;
    gout: boolean;
    backache: boolean;
    headAche: boolean;
    seizures: boolean;
    scoliosisKyphosis: boolean;
    paresthesia: boolean;
    locUnconscious: boolean;
    muscleWeakness: boolean;
    cvaTia: boolean;
    headInjury: boolean;
    paralysis: boolean;
    psychDisorder: boolean;
  };
  setNeuroMuscular: (updates: Partial<NeuroState["neuroMuscular"]>) => void;
}

interface RenalState {
  renal: {
    uti: boolean;
    haemateria: boolean;
    renalInsufficiency: boolean;
    aorenocorticalInsuff: boolean;
    thyroidDisorder: boolean;
    pituitaryDisorder: boolean;
    diabeticsMalitus: boolean;
  };
  setRenal: (updates: Partial<RenalState["renal"]>) => void;
}

interface Others {
  others: {
    hematDisorder: boolean;
    pregnant: boolean;
    radiotherapy: boolean;
    chemotherapy: boolean;
    immuneSuppressed: boolean;
    steroidUse: boolean;
    cervicalSpineMovement: boolean;
    intraopUrineOutput: boolean;
    bloodLossToBeRecorded: boolean;
  };
  setOthers: (updates: Partial<Others["others"]>) => void;
}

const initialMainFormFields = {
  mouthOpening: null,
  neckRotation: null,
  tmDistance: null,
  mp1: false,
  mp2: false,
  mp3: false,
  mp4: false,
  morbidObesity: false,
  difficultAirway: false,
  teethPoorRepair: false,
  micrognathia: false,
  edentulous: false,
  beard: false,
  shortMuscularNeck: false,
  prominentIncisors: false
};

const initialExaminationFindingNotes = {
  examinationFindingNotes: "",
  smokingTobacco: "",
  cardioVascularExamination: "",
  abdominalExamination: "",
  alcohol: "",
  neuroMuscularExamination: "",
  spineExamination: ""
};

const initialGeneralPhysicalExamination = {
  jvp: false,
  pallor: false,
  cyanosis: false,
  icterus: false,
  pupils: false,
  edema: false,
  syncopatAttack: false,
  paipitation: false,
  other: false
};

const initialMallampatiGrade = {
  class: 0
};

const initialRespiratory = {
  dryCough: false,
  productiveCough: false,
  asthma: false,
  recentURILRTI: false,
  tb: false,
  pneumonia: false,
  copd: false,
  osa: false,
  recurrentTonsils: false,
  breathlessness: false,
  dyspnea: false
};

const initialHepato = {
  vomiting: false,
  gerd: false,
  diarrhoea: false,
  galbladderDS: false,
  jaundice: false,
  cirrhosis: false
};

const initialCardioVascular = {
  hypertension: false,
  cafDOE: false,
  ischemicHeartDisease: false,
  rheumaticFever: false,
  orthpneaPND: false,
  murmurs: false,
  cad: false,
  exerciseTolerance: false,
  cardicEnlargement: false,
  angina: false,
  mi: false,
  mtdLessThan4: false,
  mtdGreaterThan4: false
};

const initialNeuroMuscular = {
  rhArthritis: false,
  gout: false,
  backache: false,
  headAche: false,
  seizures: false,
  scoliosisKyphosis: false,
  paresthesia: false,
  locUnconscious: false,
  muscleWeakness: false,
  cvaTia: false,
  headInjury: false,
  paralysis: false,
  psychDisorder: false
};

const initialRenal = {
  uti: false,
  haemateria: false,
  renalInsufficiency: false,
  aorenocorticalInsuff: false,
  thyroidDisorder: false,
  pituitaryDisorder: false,
  diabeticsMalitus: false
};

const initialOthers = {
  hematDisorder: false,
  pregnant: false,
  radiotherapy: false,
  chemotherapy: false,
  immuneSuppressed: false,
  steroidUse: false,
  cervicalSpineMovement: false,
  intraopUrineOutput: false,
  bloodLossToBeRecorded: false
};

const usePhysicalExaminationForm = create<
  MainFormFields &
    ExaminationFindingNotesState &
    GeneralPhysicalExaminationState &
    MallampatiGradeState &
    RespiratoryState &
    HepatoState &
    CardioVascularState &
    NeuroState &
    RenalState &
    Others & { resetAll: () => void }
>((set) => ({
  mainFormFields: initialMainFormFields,
  setMainFormFields: (updates) =>
    set((state) => ({
      mainFormFields: { ...state.mainFormFields, ...updates }
    })),
  examinationFindingNotes: initialExaminationFindingNotes,
  setExaminationFindingNotes: (updates) =>
    set((state) => ({
      examinationFindingNotes: { ...state.examinationFindingNotes, ...updates }
    })),
  generalphysicalExamination: initialGeneralPhysicalExamination,
  setGeneralPhysicalExamination: (updates) =>
    set((state) => ({
      generalphysicalExamination: {
        ...state.generalphysicalExamination,
        ...updates
      }
    })),
  mallampatiGrade: initialMallampatiGrade,
  setMallampatiGrade: (updates) =>
    set((state) => ({
      mallampatiGrade: { ...state.mallampatiGrade, ...updates }
    })),
  respiratory: initialRespiratory,
  setRespiratory: (updates) =>
    set((state) => ({
      respiratory: { ...state.respiratory, ...updates }
    })),
  hepato: initialHepato,
  setHepato: (updates) =>
    set((state) => ({
      hepato: { ...state.hepato, ...updates }
    })),
  cardioVascular: initialCardioVascular,
  setCardioVascular: (updates) =>
    set((state) => ({
      cardioVascular: { ...state.cardioVascular, ...updates }
    })),
  neuroMuscular: initialNeuroMuscular,
  setNeuroMuscular: (updates) =>
    set((state) => ({
      neuroMuscular: { ...state.neuroMuscular, ...updates }
    })),
  renal: initialRenal,
  setRenal: (updates) =>
    set((state) => ({
      renal: { ...state.renal, ...updates }
    })),
  others: initialOthers,
  setOthers: (updates) =>
    set((state) => ({
      others: { ...state.others, ...updates }
    })),
  resetAll: () =>
    set(() => ({
      mainFormFields: initialMainFormFields,
      examinationFindingNotes: initialExaminationFindingNotes,
      generalphysicalExamination: initialGeneralPhysicalExamination,
      mallampatiGrade: initialMallampatiGrade,
      respiratory: initialRespiratory,
      hepato: initialHepato,
      cardioVascular: initialCardioVascular,
      neuroMuscular: initialNeuroMuscular,
      renal: initialRenal,
      others: initialOthers
    }))
}));

export default usePhysicalExaminationForm;
