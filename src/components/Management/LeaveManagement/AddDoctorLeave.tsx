// src/components/LeaveManagement/AddDoctorLeave.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootState } from '../../../store/store';
import { AuthFetch, AuthPost } from '../../../auth/auth';
import { showError, showSuccess } from '../../../store/toast.slice';

import { 
  FONT_SIZE, 
  SPACING, 
  BORDER_RADIUS,
  FOOTER_HEIGHT,
  moderateScale,
  verticalScale 
} from '../../../utils/responsive';

import { formatDateForInput } from '../../../utils/dateTime';
import Footer from '../../dashboard/footer';
import { UsersIcon, FileTextIcon, CalendarIcon, ArrowLeftIcon } from '../../../utils/SvgIcons';
import { COLORS } from '../../../utils/colour';
import { Role_NAME } from '../../../utils/role';

/* ================= TYPES ================= */
interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  role: number;
  name: string; // We'll combine firstName and lastName
}

/* ================= COMPONENT ================= */
const AddDoctorLeave: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();

  // State for form fields
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [leaveType, setLeaveType] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Data lists
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Leave types
  const leaveTypes = [
    'Casual Leave',
    'Sick Leave',
    'Earned Leave',
    'Maternity Leave',
    'Paternity Leave',
    'Compensatory Leave',
    'Study Leave',
    'Bereavement Leave',
    'Quarantine Leave',
    'Special Leave',
  ];

  // Check authentication on focus
  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
      return () => {};
    }, [])
  );

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setTokenError(true);
        dispatch(showError('Not authorized. Please login again.'));
        setTimeout(() => {
          navigation.navigate('Login' as never);
        }, 2000);
      }
    } catch (error) {
      dispatch(showError('Authentication check failed'));
    }
  };

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setTokenError(true);
        dispatch(showError('Not authorized. Please login again.'));
        return;
      }

      // API endpoint for doctors
      const res = await AuthFetch(
        `user/${user?.hospitalID}/list/${Role_NAME.doctor}`,
        token
      ) as any;
      console.log("Doctors API response:", res);
      
      if (res?.data?.message === 'success') {
        // Process doctors: combine firstName and lastName
        const processedDoctors = (res?.data?.users || []).map((doctor: any) => ({
          ...doctor,
          name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
        }));
        setDoctors(processedDoctors);
      } else {
        dispatch(showError('Failed to fetch doctors'));
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      dispatch(showError('Failed to fetch doctors. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, dispatch]);

  useEffect(() => {
    if (!tokenError) {
      fetchDoctors();
    }
  }, [fetchDoctors, tokenError]);

  // Validation
  const validateForm = () => {
    if (!selectedDoctor) {
      dispatch(showError('Please select a doctor'));
      return false;
    }
    if (!leaveType) {
      dispatch(showError('Please select leave type'));
      return false;
    }
    if (fromDate > toDate) {
      dispatch(showError('From date cannot be after to date'));
      return false;
    }
    return true;
  };

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')} ${
      date.toLocaleString('default', { month: 'short' })
    } ${date.getFullYear()}`;
  };

  // Handle date change
  const handleFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setFromDate(selectedDate);
      if (selectedDate > toDate) {
        setToDate(selectedDate);
      }
    }
  };

  const handleToDateChange = (event: any, selectedDate?: Date) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      setToDate(selectedDate);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const doctor = doctors?.find(d => d?.id === selectedDoctor);
    if (!doctor) {
      dispatch(showError('Invalid doctor selected'));
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        dispatch(showError('Not authorized. Please login again.'));
        setTokenError(true);
        return;
      }

      const data = {
        userID: doctor?.id,
        fromDate: formatDateForInput(fromDate),
        toDate: formatDateForInput(toDate),
        leaveType,
      };

      console.log("Submitting leave data:", data);
      
      // Use user/leaves endpoint (this should work for both doctors and nurses)
      const res = await AuthPost(
        `nurse/addleaves/${user?.hospitalID}`,
        data,
        token
      ) as any;
      
      console.log("Leave submission response:", res);
      
      if (res?.data?.message === 'success') {
        dispatch(showSuccess('Leave added successfully!'));
        // Navigate back to DoctorManagmentTabs screen
        navigation.navigate('Management' as never);
      } else {
        dispatch(showError(res?.data?.message || 'Failed to add leave'));
      }
    } catch (error) {
      console.error("Error submitting leave:", error);
      dispatch(showError('Failed to add leave request'));
    } finally {
      setSubmitting(false);
    }
  };

  // Get selected doctor name
  const getSelectedDoctorName = () => {
    if (!selectedDoctor) return "Select Doctor";
    const doctor = doctors.find(d => d.id === selectedDoctor);
    return doctor ? doctor.name : "Select Doctor";
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Token error state
  if (tokenError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Not authorized. Redirecting to login...</Text>
      </View>
    );
  }

  // Empty state
  if (doctors?.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <UsersIcon size={moderateScale(64)} color={COLORS.sub} />
          <Text style={styles.emptyText}>No doctors found</Text>
          <Text style={styles.emptySubText}>Please add doctors first</Text>
        </View>
      </View>
    );
  }

  const footerBottom = Platform.OS === 'ios' ? insets.bottom : SPACING.md;
  const scrollViewBottom = FOOTER_HEIGHT + footerBottom + SPACING.lg;

  return (
    <View style={styles.safeContainer}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >


        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollViewBottom }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitleText}>Create a new leave request for doctor</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Doctor Selection */}
            <View style={styles.inputGroup}>
              <View style={styles.iconLabel}>
                <UsersIcon size={moderateScale(16)} color={COLORS.sub} />
                <Text style={styles.label}>Select Doctor *</Text>
              </View>
              <View style={styles.Select}>
                <Text style={styles.SelectText} numberOfLines={1}>
                  {getSelectedDoctorName()}
                </Text>

                <Picker
                  selectedValue={selectedDoctor ?? 0}
                  onValueChange={(val) => val && setSelectedDoctor(val)}
                  style={styles.hiddenPicker}
                >
                  <Picker.Item label="Select Doctor" value={0} />
                  {doctors.map(doctor => (
                    <Picker.Item
                      key={doctor.id}
                      label={`${doctor.name} ${doctor.role === 4000 ? "(Head Doctor)" : "(Doctor)"}`}
                      value={doctor.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Leave Type */}
            <View style={styles.inputGroup}>
              <View style={styles.iconLabel}>
                <FileTextIcon size={moderateScale(16)} color={COLORS.sub} />
                <Text style={styles.label}>Leave Type *</Text>
              </View>
              <View style={styles.Select}>
                <Text style={styles.SelectText}>
                  {leaveType || "Select Leave Type"}
                </Text>

                <Picker
                  selectedValue={leaveType || 0}
                  onValueChange={(val) => setLeaveType(val)}
                  style={styles.hiddenPicker}
                >
                  <Picker.Item label="Select Leave Type" value={0} />
                  {leaveTypes.map((type, index) => (
                    <Picker.Item key={index} label={type} value={type} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.inputGroup}>
              <View style={styles.iconLabel}>
                <CalendarIcon size={moderateScale(16)} color={COLORS.sub} />
                <Text style={styles.label}>Date Range *</Text>
              </View>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { borderColor: showFromDatePicker ? '#14b8a6' : COLORS.border }
                  ]}
                  onPress={() => setShowFromDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>
                    From: {formatDisplayDate(fromDate)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { borderColor: showToDatePicker ? '#14b8a6' : COLORS.border }
                  ]}
                  onPress={() => setShowToDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>
                    To: {formatDisplayDate(toDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Pickers */}
            {showFromDatePicker && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleFromDateChange}
                minimumDate={new Date()}
              />
            )}

            {showToDatePicker && (
              <DateTimePicker
                value={toDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleToDateChange}
                minimumDate={fromDate}
              />
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button, 
                styles.submitButton,
                submitting && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Add Leave</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[
        styles.footerContainer,
        {
          bottom: footerBottom,
          height: FOOTER_HEIGHT,
        }
      ]}>
        <Footer active={""} brandColor={'#14b8a6'} />
      </View>
    </View>
  );
};

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Custom Header
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerPlaceholder: {
    width: moderateScale(40),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: verticalScale(SPACING.md),
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: moderateScale(SPACING.lg),
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.error,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(SPACING.lg),
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: verticalScale(SPACING.md),
    marginBottom: verticalScale(SPACING.xs),
  },
  emptySubText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: moderateScale(SPACING.md),
    paddingTop: verticalScale(SPACING.md),
  },
  header: {
    marginBottom: verticalScale(SPACING.lg),
  },
  headerTitleText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: moderateScale(SPACING.md),
    marginBottom: verticalScale(SPACING.lg),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: verticalScale(SPACING.md),
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(SPACING.xs),
    marginBottom: verticalScale(SPACING.xs),
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  Select: {
    height: verticalScale(52),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.field,
    justifyContent: 'center',
    paddingHorizontal: moderateScale(SPACING.sm),
    overflow: 'hidden',
  },
  SelectText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '500',
    lineHeight: FONT_SIZE.sm * 1.4,
  },
  hiddenPicker: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: moderateScale(SPACING.sm),
  },
  dateButton: {
    flex: 1,
    height: verticalScale(52),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    paddingHorizontal: moderateScale(SPACING.sm),
    backgroundColor: COLORS.field,
  },
  dateButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: moderateScale(SPACING.md),
    marginBottom: verticalScale(SPACING.xl),
  },
  button: {
    flex: 1,
    height: verticalScale(52),
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.error + '15',
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.error,
  },
  submitButton: {
    backgroundColor: '#14b8a6',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#FFF',
  },
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: verticalScale(SPACING.xs),
  },
});

export default AddDoctorLeave;