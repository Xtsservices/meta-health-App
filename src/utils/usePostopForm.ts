import { create } from "zustand";

interface Test {
  test: string;
  ICD_Code: string;
  testNotes: String;
}

interface Medication {
  name: string;
  days: number;
  dosage: number;
  time: string;
  notify: boolean;
}

interface PostOPFormState {
  tests: Test[];
  selectedType: string;
  medications: { [key: string]: Medication[] };
  notes: string;
  setTests: (tests: Test[]) => void;
  addTest: (newTest: Test) => void;
  setSelectedType: (type: string) => void;
  setPostMedications: (type: string, meds: Medication[]) => void;
  setNotes: (notes: string) => void;
  resetAll: () => void;
  setMedications?: (type: string, meds: Medication[]) => void;
}

const initialTests: Test[] = [];
const initialSelectedType = "capsules";
const initialMedications = {
  capsules: [],
  syrups: [],
  tablets: [],
  injections: [],
  ivLine: [],
  Tubing: [],
  Topical: [],
  Drops: [],
  Spray: []
};
const initialNotes = "";

const usePostOPStore = create<PostOPFormState>((set) => ({
  tests: initialTests,
  selectedType: initialSelectedType,
  medications: initialMedications,
  notes: initialNotes,

  addTest: (newTest) => set((state) => ({ tests: [...state.tests, newTest] })),
  setTests: (newTests) =>
    set(() => ({
      tests: newTests
    })),
  setSelectedType: (type) => set({ selectedType: type }),
  setPostMedications: (type, meds) =>
    set((state) => ({
      medications: { ...state.medications, [type]: meds }
    })),
  setNotes: (notes) => set({ notes }),
  resetAll: () =>
    set({
      tests: initialTests,
      selectedType: initialSelectedType,
      medications: initialMedications,
      notes: initialNotes
    })
}));

export default usePostOPStore;
