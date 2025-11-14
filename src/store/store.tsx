// src/store/store.ts
import { createStore } from 'redux';
import toastReducer from './toast.slice';

/** ---- State types ---- */
type ID = string | number | null;

export interface User {
  id?: ID;
  name?: string;
  patientStatus?: number;
  [k: string]: any;
}

export interface Doctor {
  id?: ID;
  name?: string;
  [k: string]: any;
}

interface AppStateOnly {
  currentUserID: ID;
  currentUser: User | null;
  currentDoctor: Doctor | null;
  currentPatient: any | null;
}

// Root state = your original keys + toast slice
export interface RootState extends AppStateOnly {
  updatePatientStatus: any;
  toast: ReturnType<typeof toastReducer>;
}

/** ---- Initial state ---- */
const initialData: AppStateOnly = {
  currentUserID: null,
  currentUser: null,
  currentDoctor: null,
   currentPatient: null,
};

/** ---- Action types ---- */
type Action =
  | { type: 'currentUser'; payload: User | null }
  | { type: 'currentUserID'; payload: ID }
  | { type: 'currentDoctor'; payload: Doctor | null }
  | { type: 'updatePatientStatus'; payload: number }
  | { type: 'currentPatient'; payload: any | null }

  | { type: 'resetAll' };

/** ---- Action creators ---- */
export const currentUser = (userData: User | null): Action => ({
  type: 'currentUser',
  payload: userData,
});
export const currentUserID = (id: ID): Action => ({
  type: 'currentUserID',
  payload: id,
});
export const currentDoctor = (doctor: Doctor | null): Action => ({
  type: 'currentDoctor',
  payload: doctor,
});
export const updatePatientStatus = (status: number): Action => ({
  type: 'updatePatientStatus',
  payload: status,
});

export const currentPatient = (patient: any | null): Action => ({ 
  type: 'currentPatient',
  payload: patient,
});
export const resetAll = (): Action => ({ type: 'resetAll' });

/** ---- Your app reducer (WITH updatePatientStatus case) ---- */
function appReducer(state: AppStateOnly = initialData, action: Action): AppStateOnly {
  switch (action.type) {
    case 'currentUser':
      return { ...state, currentUser: action.payload ?? null };
    
    case 'currentUserID':
      return { ...state, currentUserID: action.payload ?? null };
    
    case 'currentDoctor':
      return { ...state, currentDoctor: action.payload ?? null };
    
    case 'updatePatientStatus':
      return {
        ...state,
        currentUser: state.currentUser
          ? { ...state.currentUser, patientStatus: action.payload }
          : null,
      };
     case 'currentPatient': // NEW
      return { ...state, currentPatient: action.payload ?? null };
    case 'resetAll':
      return initialData;
    
    default:
      return state;
  }
}

/**
 * ---- Root reducer (adds toast without breaking your keys) ----
 */
function rootReducer(state: RootState | undefined, action: any): RootState {
  const appSliceState = {
    currentUserID: state?.currentUserID ?? initialData.currentUserID,
    currentUser: state?.currentUser ?? initialData.currentUser,
    currentDoctor: state?.currentDoctor ?? initialData.currentDoctor,
  currentPatient: state?.currentPatient ?? initialData.currentPatient, // NEW
  };

  const nextApp = appReducer(appSliceState, action);
  const nextToast = toastReducer(state?.toast, action);

  return { ...nextApp, toast: nextToast };
}

/** ---- Store ---- */
const store = createStore(rootReducer);

/** ---- Helpful types ---- */
export type AppDispatch = typeof store.dispatch;

export default store;