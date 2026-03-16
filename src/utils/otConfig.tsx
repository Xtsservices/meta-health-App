import { create } from "zustand";

interface OTConfigState {
  patientStage: number; // Patient Stage for Elective/Emergency
  screenType: string; // Emergency or Elective Screen
  userType: string; // Anesthetist or Surgeon
  patientFileReadOnly: boolean;
  physicalExaminationReadOnly: boolean;
  preOpReadOnly: boolean;
  setUserType: (userType: string) => void;
  setPatientStage: (stage: number) => void;
  setScreenType: (type: string) => void;
  setInitialTabsReadOnly: () => void;
  unsetInitialTabsReadOnly: () => void;
  isInitialTabsNextButtonVisible: () => boolean;
  isInitialTabsAPICallAllowed: () => boolean;
}

export const OTUserTypes = {
  ANESTHETIST: "ANESTHETIST",
  SURGEON: "SURGEON"
};

export const OTScreenType = {
  ELECTIVE: "ELECTIVE",
  EMERGENCY: "EMERGENCY"
};

export const OTPatientStages = {
  PENDING: 1,
  APPROVED: 2,
  SCHEDULED: 3,
  OPERATED: 4
};

const useOTConfig = create<OTConfigState>((set, get) => ({
  patientStage: OTPatientStages.PENDING,
  screenType: "", // Initial default value
  userType: "", // Initial default value
  patientFileReadOnly: false,
  physicalExaminationReadOnly: false,
  preOpReadOnly: false,
  setPatientStage: (stage) => set({ patientStage: stage }),
  setScreenType: (type) => set({ screenType: type }),
  setUserType: (type) => set({ userType: type }),
  setInitialTabsReadOnly: () =>
    set({
      patientFileReadOnly: true,
      physicalExaminationReadOnly: true,
      preOpReadOnly: true
    }),
  unsetInitialTabsReadOnly: () =>
    set({
      patientFileReadOnly: false,
      physicalExaminationReadOnly: false,
      preOpReadOnly: false
    }),
  isInitialTabsNextButtonVisible: () => {
    const { patientStage, userType } = get();
    return (
      (patientStage === OTPatientStages.PENDING &&
        userType === OTUserTypes.ANESTHETIST) ||
      (patientStage === OTPatientStages.APPROVED &&
        userType === OTUserTypes.SURGEON)
    );
  },
  isInitialTabsAPICallAllowed: () => {
    const { patientStage, userType } = get();
    return (
      patientStage === OTPatientStages.PENDING &&
      userType === OTUserTypes.ANESTHETIST
    );
  }
}));

export default useOTConfig;
