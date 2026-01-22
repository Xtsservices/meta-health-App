import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
  ICON_SIZE,
  FOOTER_HEIGHT,
  isTablet,
  scale,
  moderateScale,
  verticalScale 
} from '../../../utils/responsive';

import { formatDateForInput, parseDateFromInput } from '../../../utils/dateTime';
import Footer from '../../dashboard/footer';
import { COLORS } from '../../../utils/colour';

/* ================= TYPES ================= */
interface Nurse {
  id: number;
  name: string;
  role: number;
}

interface Ward {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

/* ================= COMPONENT ================= */
const AddShiftScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();

  // State for form fields
  const [selectedNurse, setSelectedNurse] = useState<number | null>(null);
  const [serviceType, setServiceType] = useState<'1' | '2' | ''>('');
  const [selectedWard, setSelectedWard] = useState<number | null>(null);
  const [shiftType, setShiftType] = useState<string>('');
  const [customFromTime, setCustomFromTime] = useState({ hour: '', minute: '', ampm: 'AM' });
  const [customToTime, setCustomToTime] = useState({ hour: '', minute: '', ampm: 'PM' });
  
  // Date states
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Data lists
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState(false);

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

  // Fetch initial data
  useEffect(() => {
    if (!tokenError) {
      fetchInitialData();
    }
  }, [tokenError]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setTokenError(true);
        dispatch(showError('Not authorized. Please login again.'));
        return;
      }

      // Fetch nurses
      const nurseRes = await AuthFetch(`nurse/getallnurse/${user?.hospitalID}`, token) as any;
      if (nurseRes?.data?.message === 'success') {
        setNurses(nurseRes?.data?.data || []);
      }

      // Fetch wards
      const wardRes = await AuthFetch(`ward/${user?.hospitalID}`, token) as any;
      if (wardRes?.data?.message === 'success') {
        setWards(wardRes?.data?.wards || []);
      }

      // Fetch department
      if (user?.departmentID) {
        const deptRes = await AuthFetch(`department/singledpt/${user.departmentID}`, token) as any;
        if (deptRes?.data?.message === 'success') {
          setDepartment(deptRes?.data?.department?.[0] || null);
        }
      }
    } catch (error) {
      dispatch(showError('Failed to fetch data. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Format time helpers
  const formatTime = (hour: string, minute: string, ampm: string) => {
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')} ${ampm}`;
  };

  const getShiftTimings = () => {
    if (shiftType === 'Custom') {
      const fromTime = formatTime(customFromTime.hour, customFromTime.minute, customFromTime.ampm);
      const toTime = formatTime(customToTime.hour, customToTime.minute, customToTime.ampm);
      return `${fromTime} - ${toTime}`;
    }
    return shiftType;
  };

  // Validation
  const validateForm = () => {
    if (!selectedNurse) {
      dispatch(showError('Please select a nurse'));
      return false;
    }
    if (!serviceType) {
      dispatch(showError('Please select service type'));
      return false;
    }
    if (serviceType === '1' && !selectedWard) {
      dispatch(showError('Please select a ward for IPD service'));
      return false;
    }
    if (!shiftType) {
      dispatch(showError('Please select a shift'));
      return false;
    }
    if (fromDate > toDate) {
      dispatch(showError('From date cannot be after to date'));
      return false;
    }
    if (shiftType === 'Custom') {
      if (!customFromTime.hour || !customFromTime.minute || !customToTime.hour || !customToTime.minute) {
        dispatch(showError('Please enter custom time'));
        return false;
      }
    }
    return true;
  };

  // Submit form
const handleSubmit = async () => {
  if (!validateForm()) return;

  setSubmitting(true);
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      dispatch(showError('Not authorized. Please login again.'));
      setTokenError(true);
      return;
    }

    // FIX: Send NULL instead of 0 for wardID when serviceType is OPD
    const data = {
      userID: selectedNurse,
      departmentID: user?.departmentID,
      wardID: serviceType === '1' ? selectedWard : null, // Send null for OPD
      fromDate: formatDateForInput(fromDate),
      toDate: formatDateForInput(toDate),
      shiftTimings: getShiftTimings(),
      scope: parseInt(serviceType),
    };


    const res = await AuthPost(`nurse/shiftschedule/${user?.hospitalID}`, data, token) as any;
    
    if (res?.data?.message === 'success') {
      dispatch(showSuccess(res?.data?.data?.message || 'Shift schedule added successfully!'));
      navigation.navigate('NurseManagement' as never);
    } else {
      // Check for specific error messages
      const errorMsg = res?.data?.message || res?.message || 'Failed to add shift';
      dispatch(showError(errorMsg));
    }
  } catch (error) {
    dispatch(showError('Failed to add shift schedule'));
  } finally {
    setSubmitting(false);
  }
};

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')}/${
      (date.getMonth() + 1).toString().padStart(2, '0')
    }/${date.getFullYear()}`;
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
          <Text style={styles.emptyText}>No nurses found</Text>
          <Text style={styles.emptySubText}>Please add nurses first</Text>
        </View>
      </View>
    );
  }

  const screenHeight = Dimensions.get('window').height;
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
          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Nurse Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Nurse *</Text>
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

            {/* Service Type */}
<View style={styles.Select}>
  <Text style={styles.SelectText}>
    {serviceType === "1"
      ? "IPD"
      : serviceType === "2"
      ? "OPD"
      : "Select Service"}
  </Text>

  <Picker
    selectedValue={serviceType || 0}
    onValueChange={(val) => {
      setServiceType(val);
      if (val !== "1") setSelectedWard(null);
    }}
    style={styles.hiddenPicker}
  >
    <Picker.Item label="Select Service" value={0} />
    <Picker.Item label="IPD" value="1" />
    <Picker.Item label="OPD" value="2" />
  </Picker>
</View>


            {/* Department (Read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={department?.name || 'Loading...'}
                editable={false}
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            {/* Ward Selection (Conditional) */}
            {serviceType === '1' && (
<View style={styles.Select}>
  <Text style={styles.SelectText}>
    {selectedWard
      ? wards.find(w => w.id === selectedWard)?.name
      : "Select Ward"}
  </Text>

  <Picker
    selectedValue={selectedWard ?? 0}
    onValueChange={(val) => val && setSelectedWard(val)}
    style={styles.hiddenPicker}
  >
    <Picker.Item label="Select Ward" value={0} />
    {wards.map(w => (
      <Picker.Item key={w.id} label={w.name} value={w.id} />
    ))}
  </Picker>
</View>

            )}

            {/* Date Range */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date Range *</Text>
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

            {/* Shift Type */}
<View style={styles.Select}>
  <Text style={styles.SelectText}>
    {shiftType || "Select Shift"}
  </Text>

  <Picker
    selectedValue={shiftType || 0}
    onValueChange={(val) => setShiftType(val)}
    style={styles.hiddenPicker}
  >
    <Picker.Item label="Select Shift" value={0} />
    <Picker.Item label="Shift 1 (07:00 AM - 03:00 PM)" value="07:00 AM - 03:00 PM" />
    <Picker.Item label="Shift 2 (07:00 PM - 11:00 PM)" value="07:00 PM - 11:00 PM" />
    <Picker.Item label="Shift 3 (11:00 PM - 03:00 AM)" value="11:00 PM - 03:00 AM" />
    <Picker.Item label="Custom Timing" value="Custom" />
  </Picker>
</View>


            {/* Custom Time Inputs (Conditional) */}
            {shiftType === 'Custom' && (
              <View style={styles.customTimeSection}>
                <Text style={styles.customTimeLabel}>Custom Timing *</Text>
                
                {/* From Time */}
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>From Time:</Text>
                  <View style={styles.timeInputs}>
                    <TextInput
                      style={[
                        styles.timeInput,
                        { borderColor: customFromTime.hour ? COLORS.brand : COLORS.border }
                      ]}
                      placeholder="HH"
                      placeholderTextColor={COLORS.placeholder}
                      value={customFromTime.hour}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, '');
                        if (num === '' || (parseInt(num) >= 0 && parseInt(num) <= 12)) {
                          setCustomFromTime({...customFromTime, hour: num});
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={[
                        styles.timeInput,
                        { borderColor: customFromTime.minute ? COLORS.brand : COLORS.border }
                      ]}
                      placeholder="MM"
                      placeholderTextColor={COLORS.placeholder}
                      value={customFromTime.minute}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, '');
                        if (num === '' || (parseInt(num) >= 0 && parseInt(num) <= 59)) {
                          setCustomFromTime({...customFromTime, minute: num});
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <View style={styles.ampmContainer}>
                      <Picker
                        selectedValue={customFromTime.ampm}
                        onValueChange={(value) => setCustomFromTime({...customFromTime, ampm: value})}
                        style={styles.ampmPicker}
                        dropdownIconColor={COLORS.text}
                      >
                        <Picker.Item label="AM" value="AM" />
                        <Picker.Item label="PM" value="PM" />
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* To Time */}
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>To Time:</Text>
                  <View style={styles.timeInputs}>
                    <TextInput
                      style={[
                        styles.timeInput,
                        { borderColor: customToTime.hour ? COLORS.brand : COLORS.border }
                      ]}
                      placeholder="HH"
                      placeholderTextColor={COLORS.placeholder}
                      value={customToTime.hour}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, '');
                        if (num === '' || (parseInt(num) >= 0 && parseInt(num) <= 12)) {
                          setCustomToTime({...customToTime, hour: num});
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={[
                        styles.timeInput,
                        { borderColor: customToTime.minute ? COLORS.brand : COLORS.border }
                      ]}
                      placeholder="MM"
                      placeholderTextColor={COLORS.placeholder}
                      value={customToTime.minute}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, '');
                        if (num === '' || (parseInt(num) >= 0 && parseInt(num) <= 59)) {
                          setCustomToTime({...customToTime, minute: num});
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <View style={styles.ampmContainer}>
                      <Picker
                        selectedValue={customToTime.ampm}
                        onValueChange={(value) => setCustomToTime({...customToTime, ampm: value})}
                        style={styles.ampmPicker}
                        dropdownIconColor={COLORS.text}
                      >
                        <Picker.Item label="AM" value="AM" />
                        <Picker.Item label="PM" value="PM" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>
            )}

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
                <Text style={styles.submitButtonText}>Add Shift</Text>
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
        <Footer active={"shifts"} brandColor={COLORS.brand} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: moderateScale(SPACING.md),
    paddingTop: verticalScale(SPACING.md),
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
    marginBottom: verticalScale(SPACING.sm),
  },
  emptySubText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
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
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(SPACING.xs),
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
  input: {
    height: verticalScale(50),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: moderateScale(SPACING.sm),
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    backgroundColor: COLORS.field,
  },
  readOnlyInput: {
    backgroundColor: COLORS.background,
    color: COLORS.sub,
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
  customTimeSection: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: moderateScale(SPACING.md),
    marginTop: verticalScale(SPACING.sm),
  },
  customTimeLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(SPACING.md),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(SPACING.md),
  },
  timeLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    width: moderateScale(80),
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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

  timeInput: {
    width: moderateScale(50),
    height: verticalScale(40),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    textAlign: 'center',
    backgroundColor: COLORS.field,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  timeSeparator: {
    marginHorizontal: moderateScale(SPACING.xs),
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  ampmContainer: {
    marginLeft: moderateScale(SPACING.sm),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.field,
    overflow: 'hidden',
  },
  ampmPicker: {
    width: moderateScale(80),
    height: verticalScale(40),
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
  submitButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#FFF',
  },
  footerContainer: {
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: verticalScale(SPACING.xs),
  },
});

export default AddShiftScreen;