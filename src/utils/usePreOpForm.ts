import { create } from "zustand";

interface Medication {
  name: string;
  days: number;
  dosage: number;
  time: string;
  notify: boolean;
}

interface Test {
  test: string;
  ICD_Code: string;
  testNotes: String;
}

interface PreOpState {
  arrangeBlood: boolean;
  riskConsent: boolean;
  notes: string;
  selectedType: string;
  medications: { [key: string]: Medication[] };
  tests: Test[];
  setArrangeBlood: (bool: boolean) => void;
  setRiskConsent: (bool: boolean) => void;
  setNotes: (notes: string) => void;
  setSelectedType: (type: string) => void;
  setMedications: (type: string, meds: Medication[]) => void;
  addTest: (newTest: Test) => void;
  setTests: (newTests: Test[]) => void;
  resetAll: () => void;
}

const initialNotes = "";
const initialSelectedType = "capsules";
const initialMedications = {
  capsules: [],
  syrups: [],
  tablets: [],
  injections: [],
  ivLine: [],
  tubing: [],
  topical: [],
  drop: [],
  spray: []
};

const initialTests: Test[] = [];

const usePreOpStore = create<PreOpState>((set) => ({
  notes: initialNotes,
  selectedType: initialSelectedType,
  medications: initialMedications,
  tests: initialTests,
  arrangeBlood: false,
  riskConsent: false,
  setArrangeBlood: (bool) =>
    set(() => ({
      arrangeBlood: bool
    })),
  setRiskConsent: (bool) =>
    set(() => ({
      riskConsent: bool
    })),
  setNotes: (notes) => set({ notes }),
  setSelectedType: (type) => set({ selectedType: type }),
  setMedications: (type, meds) =>
    set((state) => ({
      medications: { ...state.medications, [type]: meds }
    })),
  addTest: (newTest) => set((state) => ({ tests: [...state.tests, newTest] })),

  setTests: (newTests) =>
    set(() => ({
      tests: newTests
    })),
  resetAll: () =>
    set({
      notes: initialNotes,
      selectedType: initialSelectedType,
      medications: initialMedications,
      tests: initialTests
    })
}));

export default usePreOpStore;
