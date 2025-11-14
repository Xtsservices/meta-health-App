import { create } from "zustand";
import { Alerttype, attachmentType, medicalHistoryFormType, MedicineType, selectedTestListtype, symptompstype, vitalFunctionType, vitalsType } from "../utils/types";

export type searchStore = {
  searchText: string;
  setSearchText: (step: string) => void;
};
const useSeachStore = create<searchStore>((set) => ({
  searchText: "",
  setSearchText: (data: string) => set({ searchText: data })
}));

export type reportStore = {
  reports: attachmentType[];
  setReports: (report: attachmentType[]) => void;
  setNewReport: (report: attachmentType[]) => void;
  deleteReport: (id: number) => void;
};
const useReportStore = create<reportStore>((set) => ({
  reports: [],
  setReports: (data: attachmentType[]) =>
    set(() => {
      return { reports: [...data] };
    }),
  setNewReport: (data: attachmentType[]) =>
    set((state) => {
      return { reports: [...data, ...state.reports] };
    }),
  deleteReport: (id: number) =>
    set((state) => {
      return {
        reports: [...state.reports.filter((report) => report.id != id)]
      };
    })
}));

type vitalsStore = {
  vitals: vitalsType[];
  setVitals: (data: vitalsType[]) => void;
  setNewVitals: (data: vitalsType) => void;
};
const useVitalsStore = create<vitalsStore>((set) => ({
  vitals: [],
  setVitals: (data: vitalsType[]) =>
    set(() => {
      return { vitals: [...data] };
    }),
  setNewVitals: (data: vitalsType) =>
    set((state) => {
      return { vitals: [...state.vitals.reverse(), data] };
    })
}));
export interface Reminder {
  medicineID: number | undefined;
  medicationTime: string;
  id: number;
  medicineType: number;
  medicineName: string;
  userID: number | null;
  dosageTime: string;
  givenTime: string | null;
  doseStatus: number;
  firstName?: string;
  lastName?: string;
  note?: string;
  day?: string | null;
  doseCount: number;
  daysCount:number;
}
type medicineStore = {
  medicineReminder: Reminder[];
  setMedicineReminder: (data: Reminder[]) => void;
  setNewMedicineReminder: (data: Reminder[]) => void;
};
const useMedicineStore = create<medicineStore>((set) => ({
  medicineReminder: [],
  setMedicineReminder: (data: Reminder[]) =>
    set(() => {
      return { medicineReminder: [...data] };
    }),
  setNewMedicineReminder: (data: Reminder[]) =>
    set((state) => {
      return { medicineReminder: [...data, ...state.medicineReminder] };
    })
}));

type medicineListStore = {
  medicineList: MedicineType[];
  setMedicineList: (data: MedicineType[]) => void;
  setNewMedicineList: (data: MedicineType[]) => void;
};
const useMedicineListStore = create<medicineListStore>((set) => ({
  medicineList: [],
  setMedicineList: (data: MedicineType[]) =>
    set(() => {
      return { medicineList: [...data] };
    }),
  setNewMedicineList: (data: MedicineType[]) =>
    set((state) => {
      return { medicineList: [...data, ...state.medicineList] };
    })
}));

type PrintInPatient = {
  medicalHistory: medicalHistoryFormType | null;
  vitalAlert: Alerttype[];
  reminder: Reminder[];
  symptoms: symptompstype[];
  vitalFunction: vitalFunctionType | null;
  reports: attachmentType[];
  selectedTestList: selectedTestListtype[];
  setMedicineHistory: (data: medicalHistoryFormType) => void;
  setVitalAlert: (data: Alerttype[]) => void;
  setReminder: (data: Reminder[]) => void;
  setSymptoms: (data: symptompstype[]) => void;
  setSelectedTestList: (data: selectedTestListtype[]) => void;
  setVitalFunction: (data: vitalFunctionType) => void;
  setReports: (data: attachmentType[]) => void;
  resetData: () => void;
};
const usePrintInPatientStore = create<PrintInPatient>((set) => ({
  medicalHistory: null,
  vitalAlert: [],
  vitalFunction: null,
  reminder: [],
  symptoms: [],
  reports: [],
  selectedTestList: [],

  setMedicineHistory: (data: medicalHistoryFormType) =>
    set((state) => {
      return { ...state, medicalHistory: data };
    }),
  setVitalAlert: (data: Alerttype[]) =>
    set((state) => {
      return { ...state, vitalAlert: data };
    }),
  setSymptoms: (data: symptompstype[]) =>
    set((state) => {
      return { ...state, symptoms: data };
    }),
  setSelectedTestList: (data: selectedTestListtype[]) =>
    set((state) => {
      return { ...state, selectedTestList: data };
    }),
  setReminder: (data: Reminder[]) =>
    set((state) => {
      return { ...state, reminder: data };
    }),
  setVitalFunction: (data: vitalFunctionType) =>
    set((state) => {
      return { ...state, vitalFunction: data };
    }),
  setReports: (data: attachmentType[]) =>
    set((state) => {
      return { ...state, reports: data };
    }),
  resetData: () =>
    set(() => {
      return {
        medicalHistory: null,
        vitalAlert: [],
        vitalFunction: null,
        reminder: [],
        symptoms: [],
        reports: []
      };
    })
}));

type AlertNumberStore = {
  alertNumber: number;
  setAlertNumber: (data: number) => void;
};

const useAlertStore = create<AlertNumberStore>((set) => ({
  alertNumber: 0,
  setAlertNumber: (data: number) =>
    set((state) => {
      return { ...state, alertNumber: data };
    })
}));

export {
  useSeachStore,
  useReportStore,
  useVitalsStore,
  useMedicineStore,
  useMedicineListStore,
  usePrintInPatientStore,
  useAlertStore
};
