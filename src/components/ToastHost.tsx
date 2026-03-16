// src/components/ToastHost.tsx
import React, { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../store/store';        
import { clearToast } from '../store/toast.slice';


const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10b981', borderRadius: 10 }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{ fontSize: 15, fontWeight: '600' }}
      text2Style={{ fontSize: 13 }}
      text1NumberOfLines={0}  // Added: enables wrapping
      text2NumberOfLines={0}  // Added: enables wrapping
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#ef4444', borderRadius: 10 }}
      text1Style={{ fontSize: 15, fontWeight: '700' }}
      text2Style={{ fontSize: 13 }}
      text1NumberOfLines={0}  // Added: enables wrapping
      text2NumberOfLines={0}  // Added: enables wrapping
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#3b82f6', borderRadius: 10 }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{ fontSize: 15, fontWeight: '600' }}
      text2Style={{ fontSize: 13 }}
      text1NumberOfLines={0}  // Added: enables wrapping
      text2NumberOfLines={0}  // Added: enables wrapping
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#f59e0b', borderRadius: 10 }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{ fontSize: 15, fontWeight: '700', }}
      text2Style={{ fontSize: 13 }}
      text1NumberOfLines={0}
      text2NumberOfLines={0}
    />
  ),
};


const ToastHost: React.FC = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  // Support both the basic slice and the “optional fields” version
  const { id, kind, message, visibilityTime, position, topOffset, subtitle } = useSelector(
    (s: RootState) =>
      // @ts-ignore – handle either shape
      s.toast || { id: 0, kind: null, message: null, visibilityTime: 2500, position: 'top' }
  );

  const computedTopOffset = useMemo(
    () => (topOffset ?? Math.max(Platform.OS === 'ios' ? 8 : 4, insets.top + (Platform.OS === 'ios' ? 8 : 4))),
    [insets.top, topOffset]
  );

  useEffect(() => {
    if (!kind || !message) return;

    Toast.show({
      type: kind,
      text1: message,
      // subtitle is optional in the extended slice
      // @ts-ignore
      text2: subtitle ?? undefined,
      position: (position as any) || 'top',
      topOffset: computedTopOffset,  // show at the top, below status bar/notch
      visibilityTime: visibilityTime ?? 2500,
      autoHide: true,
      onHide: () => dispatch(clearToast()),
    });
  }, [id, kind, message, subtitle, position, computedTopOffset, visibilityTime, dispatch]);

  return <Toast config={toastConfig} />;
};

export default ToastHost;
