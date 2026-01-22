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
  Dimensions,
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
  isTablet,
  scale,
  moderateScale,
  verticalScale 
} from '../../../utils/responsive';

import { 
  formatDateForInput, 
  parseDateFromInput,
  formatDate 
} from '../../../utils/dateTime';
import Footer from '../../dashboard/footer';
import { UsersIcon, FileTextIcon, CalendarIcon } from '../../../utils/SvgIcons';
import { COLORS } from '../../../utils/colour';

/* ================= TYPES ================= */
interface Nurse {
  id: number;
  name: string;
  role: number;
}

/* ================= COMPONENT ================= */
const AddLeaveScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();

  // State for form fields
  const [selectedNurse, setSelectedNurse] = useState<number | null>(null);
  const [leaveType, setLeaveType] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Data lists
  const [nurses, setNurses] = useState<Nurse[]>([]);
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

  // Fetch nurses
  const fetchNurses = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setTokenError(true);
        dispatch(showError('Not authorized. Please login again.'));
        return;
      }

      const res = await AuthFetch(
        `nurse/getallnurse/${user?.hospitalID}`,
        token
      ) as any;
      
      if (res?.data?.message === 'success') {
        setNurses(res?.data?.data || []);
      } else {
        dispatch(showError('Failed to fetch nurses'));
      }
    } catch (error) {
      dispatch(showError('Failed to fetch nurses. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, dispatch]);

  useEffect(() => {
    if (!tokenError) {
      fetchNurses();
    }
  }, [fetchNurses, tokenError]);

  // Validation
  const validateForm = () => {
    if (!selectedNurse) {
      dispatch(showError('Please select a nurse'));
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
    return formatDate(date);
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

// In handleSubmit function:
const handleSubmit = async () => {
  if (!validateForm()) return;

  const nurse = nurses?.find(n => n?.id === selectedNurse);
  if (!nurse) {
    dispatch(showError('Invalid nurse selected'));
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
      userID: nurse?.id,
      fromDate: formatDateForInput(fromDate),
      toDate: formatDateForInput(toDate),
      leaveType,
    };

    const res = await AuthPost(
      `nurse/addleaves/${user?.hospitalID}`,
      data,
      token
    ) as any;
    
    if (res?.data?.message === 'success') {
      dispatch(showSuccess('Leave added successfully!'));
      // Navigate back to NurseManagement screen which will show LeaveManagement tab
      navigation.navigate('NurseManagement' as never);
    } else {
      dispatch(showError(res?.data?.message || 'Failed to add leave'));
    }
  } catch (error) {
    dispatch(showError('Failed to add leave request'));
  } finally {
    setSubmitting(false);
  }
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
  if (nurses?.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <UsersIcon size={scale(64)} color={COLORS.sub} />
          <Text style={styles.emptyText}>No nurses found</Text>
          <Text style={styles.emptySubText}>Please add nurses first</Text>
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
            <Text style={styles.headerTitle}>Create a new leave request for nurse</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Nurse Selection */}
            <View style={styles.inputGroup}>
              <View style={styles.iconLabel}>
                <UsersIcon size={scale(16)} color={COLORS.sub} />
                <Text style={styles.label}>Select Nurse *</Text>
              </View>
<View style={styles.Select}>
  <Text style={styles.SelectText} numberOfLines={1}>
    {selectedNurse
      ? nurses.find(n => n.id === selectedNurse)?.name
      : "Select Nurse"}
  </Text>

  <Picker
    selectedValue={selectedNurse ?? 0}
    onValueChange={(val) => val && setSelectedNurse(val)}
    style={styles.hiddenPicker}
  >
    <Picker.Item label="Select Nurse" value={0} />
    {nurses.map(nurse => (
      <Picker.Item
        key={nurse.id}
        label={`${nurse.name} ${nurse.role === 2002 ? "(Head Nurse)" : "(Nurse)"}`}
        value={nurse.id}
      />
    ))}
  </Picker>
</View>

            </View>

            {/* Leave Type */}
            <View style={styles.inputGroup}>
              <View style={styles.iconLabel}>
                <FileTextIcon size={scale(16)} color={COLORS.sub} />
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
                <CalendarIcon size={scale(16)} color={COLORS.sub} />
                <Text style={styles.label}>Date Range *</Text>
              </View>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { borderColor: showFromDatePicker ? COLORS.brand : COLORS.border }
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
                    { borderColor: showToDatePicker ? COLORS.brand : COLORS.border }
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
        <Footer active={"leaves"} brandColor={COLORS.brand} />
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
  headerTitle: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    fontWeight: '400',
    color: COLORS.text,
    marginBottom: verticalScale(SPACING.xs),
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
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
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.field,
    overflow: 'hidden',
  },
  picker: {
    height: verticalScale(50),
    color: COLORS.text,
  },
  pickerItem: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  placeholderItem: {
    color: COLORS.placeholder,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: moderateScale(SPACING.sm),
  },
  dateButton: {
    flex: 1,
    height: verticalScale(50),
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
    backgroundColor: COLORS.brand,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  Select: {
  height: verticalScale(52),
  borderWidth: 1.5,
  borderColor: COLORS.border,
  borderRadius: BORDER_RADIUS.md,
  backgroundColor: COLORS.field,
  justifyContent: "center",
  paddingHorizontal: moderateScale(SPACING.sm),
},

SelectText: {
  fontSize: FONT_SIZE.sm,
  color: COLORS.text,
  fontWeight: "500",
  lineHeight: FONT_SIZE.sm * 1.4,
},

hiddenPicker: {
  ...StyleSheet.absoluteFillObject,
  opacity: 0, // invisible but clickable
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

export default AddLeaveScreen;