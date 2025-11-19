import { create } from "zustand";

interface AnesthesiaRecordFormState {
  airwayManagement: string;
  airwaySize: string;
  laryngoscopy: string;
  vascularAccess: string;
}

interface BreathingFormState {
  breathingSystem: string;
  filter: string;
  ventilation: string;
  vt: string;
  rr: string;
  vm: string;
  pressure: string;
}

interface MonitorsState {
  spo2: boolean;
  nbp: boolean;
  temp: boolean;
  etco2: boolean;
  ventAlarm: boolean;
  ibp: boolean;
  fio2: boolean;
  anesAgent: boolean;
  nerveStim: boolean;
  paw: boolean;
  paCathCVP: boolean;
  oesophPrecordSteth: boolean;
  ecg: boolean;
  hourlyUrine: boolean;
}

interface FormState {
  anesthesiaRecordForm: AnesthesiaRecordFormState;
  setAnesthesiaRecordForm: (
    updates: Partial<AnesthesiaRecordFormState>
  ) => void;

  breathingForm: BreathingFormState;
  setBreathingForm: (updates: Partial<BreathingFormState>) => void;

  monitors: MonitorsState;
  setMonitors: (updates: Partial<MonitorsState>) => void;

  resetAll: () => void;
}

const initialAnesthesiaRecordForm: AnesthesiaRecordFormState = {
  airwayManagement: "",
  airwaySize: "",
  laryngoscopy: "",
  vascularAccess: ""
};

const initialBreathingForm: BreathingFormState = {
  breathingSystem: "",
  filter: "",
  ventilation: "",
  vt: "",
  rr: "",
  vm: "",
  pressure: ""
};

const initialMonitors: MonitorsState = {
  spo2: false,
  nbp: false,
  temp: false,
  etco2: false,
  ventAlarm: false,
  ibp: false,
  fio2: false,
  anesAgent: false,
  nerveStim: false,
  paw: false,
  paCathCVP: false,
  oesophPrecordSteth: false,
  ecg: false,
  hourlyUrine: false
};

const useAnesthesiaForm = create<FormState>((set) => ({
  anesthesiaRecordForm: { ...initialAnesthesiaRecordForm },
  setAnesthesiaRecordForm: (updates) =>
    set((state) => ({
      anesthesiaRecordForm: { ...state.anesthesiaRecordForm, ...updates }
    })),

  breathingForm: { ...initialBreathingForm },
  setBreathingForm: (updates) =>
    set((state) => ({
      breathingForm: { ...state.breathingForm, ...updates }
    })),

  monitors: { ...initialMonitors },
  setMonitors: (updates) =>
    set((state) => ({
      monitors: { ...state.monitors, ...updates }
    })),

  resetAll: () =>
    set(() => ({
      anesthesiaRecordForm: { ...initialAnesthesiaRecordForm },
      breathingForm: { ...initialBreathingForm },
      monitors: { ...initialMonitors }
    }))
}));

export default useAnesthesiaForm;
