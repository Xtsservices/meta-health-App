// store/toast.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ToastKind = 'success' | 'error' | 'info';
export type ToastPosition = 'top' | 'bottom';

type ToastState = {
  id: number;
  kind: ToastKind | null;
  message: string | null;       // maps to text1
  subtitle?: string | null;     // maps to text2
  visibilityTime: number;
  position: ToastPosition;
  topOffset?: number;           // only used when position === 'top'
};

const initialState: ToastState = {
  id: 0,
  kind: null,
  message: null,
  subtitle: null,
  visibilityTime: 2500,
  position: 'top',
  topOffset: undefined,
};

type ShowPayload = {
  kind: ToastKind;
  message: string;
  subtitle?: string | null;
  visibilityTime?: number;
  position?: ToastPosition;
  topOffset?: number;
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (state, { payload }: PayloadAction<ShowPayload>) => {
      state.id += 1; // trigger ToastHost useEffect
      state.kind = payload.kind;
      state.message = payload.message;
      state.subtitle = payload.subtitle ?? null;
      state.visibilityTime = payload.visibilityTime ?? 2500;
      state.position = payload.position ?? 'top';
      state.topOffset = payload.topOffset;
    },
    clearToast: (state) => {
      state.kind = null;
      state.message = null;
      state.subtitle = null;
    },
  },
});

export const { showToast, clearToast } = toastSlice.actions;

// convenience helpers
export const showSuccess = (message: string, visibilityTime?: number, subtitle?: string) =>
  showToast({ kind: 'success', message, subtitle, visibilityTime });

export const showError = (message: string, visibilityTime?: number, subtitle?: string) =>
  showToast({ kind: 'error', message, subtitle, visibilityTime });

export const showInfo = (message: string, visibilityTime?: number, subtitle?: string) =>
  showToast({ kind: 'info', message, subtitle, visibilityTime });

export default toastSlice.reducer;
