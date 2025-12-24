import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { AuthFetch, AuthPost } from '../../auth/auth';
import { showError, showSuccess } from '../../store/toast.slice';
import DateTimePicker from '@react-native-community/datetimepicker';

const AmbulanceDetails: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const ambulance = route.params?.ambulance;
  const dispatch = useDispatch();


  const [drivers, setDrivers] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  
  // Assignment form state
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [shiftType, setShiftType] = useState('day');
  const [remarks, setRemarks] = useState('');
  const [forceReassign, setForceReassign] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<'from' | 'to' | null>(null);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showShiftDropdown, setShowShiftDropdown] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res: any = await AuthFetch('ambulance/getDrivers', token);
      if (res?.data?.drivers) {
        setDrivers(res.data.drivers);
      } else if (res?.drivers) {
        setDrivers(res.drivers);
      }
    } catch (err) {
      console.error('fetchDrivers error', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
    }, [fetchDrivers])
  );

  const resetAssignmentForm = () => {
    setSelectedDriver(null);
    setFromDate('');
    setToDate('');
    setFromTime('');
    setToTime('');
    setShiftType('day');
    setRemarks('');
    setForceReassign(false);
  };

  const handleOpenAssignModal = () => {
    resetAssignmentForm();
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    resetAssignmentForm();
  };

  const handleAssignDriver = async () => {
    // Validation
    if (!selectedDriver) {
      dispatch(showError('Please select a driver'));
      return;
    }
    if (!fromDate) {
      dispatch(showError('Please select from date'));
      return;
    }
    if (!toDate) {
      dispatch(showError('Please select to date'));
      return;
    }
    if (!fromTime) {
      dispatch(showError('Please select from time'));
      return;
    }
    if (!toTime) {
      dispatch(showError('Please select to time'));
      return;
    }

    try {
      setAssignLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Authentication required'));
        return;
      }

      const payload = {
        ambulanceID: ambulance?.id,
        driverID: selectedDriver,
        fromDate,
        toDate,
        fromTime,
        toTime,
        shiftType,
        remarks: remarks || undefined,
        forceReassign,
      };
      const response: any = await AuthPost('ambulance/assignDriver', payload, token);

      if (response?.status === 'success') {
        dispatch(showSuccess('Driver assigned successfully'));
        handleCloseAssignModal();
        // Navigate back to dashboard after successful assignment
        navigation.navigate('AmbulanceAdminDashboard');
      } else {
        const errorMessage = response?.message || 'Failed to assign driver';
        dispatch(showError(errorMessage));
        Alert.alert('Assignment Failed', errorMessage);
      }
    } catch (err: any) {
      // console.error('handleAssignDriver error', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to assign driver';
      dispatch(showError(errorMessage));
      Alert.alert('Error', errorMessage);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDateChange = (type: 'from' | 'to', event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      if (type === 'from') {
        setFromDate(formattedDate);
      } else {
        setToDate(formattedDate);
      }
    }
  };

  const handleTimeChange = (type: 'from' | 'to', event: any, selectedTime?: Date) => {
    setShowTimePicker(null);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;
      if (type === 'from') {
        setFromTime(formattedTime);
      } else {
        setToTime(formattedTime);
      }
    }
  };
  // Helper function to format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Helper function to display boolean values
  const displayBoolean = (value: any) => {
    return value === 1 || value === true ? 'Yes' : 'No';
  };

  // Helper function to display status with color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'approved':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'inactive':
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Active Driver Card */}
        <View style={styles.driverCard}>
          <View style={styles.driverCardHeader}>
            <Text style={styles.driverCardTitle}>Active Driver</Text>
            <TouchableOpacity 
              style={styles.assignButtonInCard}
              onPress={handleOpenAssignModal}
            >
              <Text style={styles.assignButtonText}>Assign Driver</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.driverInfo}>
            <View style={styles.driverDetailRow}>
              <Text style={styles.driverLabel}>Driver Name:</Text>
              <Text style={styles.driverValue}>
                {ambulance?.activeDriverName || 'N/A'}
              </Text>
            </View>
            <View style={styles.driverDetailRow}>
              <Text style={styles.driverLabel}>Driver Mobile:</Text>
              <Text style={styles.driverValue}>
                {ambulance?.activeDriverMobile || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ambulance Name:</Text>
            <Text style={styles.value}>{ambulance?.ambulanceName || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ambulance Number:</Text>
            <Text style={styles.value}>{ambulance?.ambulanceNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ambulance Type:</Text>
            <Text style={styles.value}>{ambulance?.ambulanceType || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Owner Type:</Text>
            <Text style={styles.value}>{ambulance?.ownerType || 'N/A'}</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Owner Name:</Text>
            <Text style={styles.value}>
              {ambulance?.firstName && ambulance?.lastName 
                ? `${ambulance.firstName} ${ambulance.lastName}` 
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Contact Email:</Text>
            <Text style={styles.value}>{ambulance?.contactEmail || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Contact Phone:</Text>
            <Text style={styles.value}>{ambulance?.contactPhone || 'N/A'}</Text>
          </View>
        </View>

        {/* Vehicle Documents */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle Documents</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>RC Number:</Text>
            <Text style={styles.value}>{ambulance?.rcNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Insurance Number:</Text>
            <Text style={styles.value}>{ambulance?.insuranceNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Insurance Valid Till:</Text>
            <Text style={styles.value}>{formatDate(ambulance?.insuranceValidTill)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Pollution Number:</Text>
            <Text style={styles.value}>{ambulance?.pollutionNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Pollution Valid Till:</Text>
            <Text style={styles.value}>{formatDate(ambulance?.pollutionValidTill)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Fitness Number:</Text>
            <Text style={styles.value}>{ambulance?.fitnessNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Fitness Valid Till:</Text>
            <Text style={styles.value}>{formatDate(ambulance?.fitnessValidTill)}</Text>
          </View>
        </View>

        {/* Equipment & Facilities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Equipment & Facilities</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ventilator:</Text>
            <Text style={styles.value}>{displayBoolean(ambulance?.ventilator)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Oxygen Cylinders:</Text>
            <Text style={styles.value}>{ambulance?.oxygenCylinders || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Cardiac Monitor:</Text>
            <Text style={styles.value}>{displayBoolean(ambulance?.cardiacMonitor)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Suction Machine:</Text>
            <Text style={styles.value}>{displayBoolean(ambulance?.suctionMachine)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Defibrillator:</Text>
            <Text style={styles.value}>{displayBoolean(ambulance?.defibrillator)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>GPS Enabled:</Text>
            <Text style={styles.value}>{displayBoolean(ambulance?.gpsEnabled)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Available 24x7:</Text>
            <Text style={styles.value}>{displayBoolean(ambulance?.available24x7)}</Text>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Additional Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Last Updated:</Text>
            <Text style={styles.value}>{formatDate(ambulance?.updatedOn)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ambulance ID:</Text>
            <Text style={styles.value}>{ambulance?.id || 'N/A'}</Text>
          </View>
          {ambulance?.hospitalID && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Hospital ID:</Text>
              <Text style={styles.value}>{ambulance.hospitalID}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseAssignModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Assign Driver to {ambulance?.ambulanceName}</Text>

              {/* Driver Dropdown */}
              <Text style={styles.label}>Driver *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowDriverDropdown(!showDriverDropdown)}
              >
                <Text style={[styles.dropdownText, !selectedDriver && styles.placeholderText]}>
                  {selectedDriver
                    ? `${drivers.find((d) => d.id === selectedDriver)?.firstName || ''} ${drivers.find((d) => d.id === selectedDriver)?.lastName || ''}`.trim() || 'Select Driver'
                    : 'Select Driver'}
                </Text>
                <Text style={styles.dropdownArrow}>{showDriverDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDriverDropdown && (
                <View style={styles.dropdownList}>
                  {drivers
                    .filter((driver) => {
                      // Filter out the currently active driver by checking name and mobile match
                      const driverFullName = `${driver.firstName} ${driver.lastName}`.trim();
                      const driverMobile = driver.phoneNo;
                      const activeDriverName = ambulance?.activeDriverName;
                      const activeDriverMobile = ambulance?.activeDriverMobile;
                      
                      // If no active driver, show all drivers
                      if (!activeDriverName || !activeDriverMobile) return true;
                      
                      // Exclude driver if both name and mobile match the active driver
                      return !(driverFullName === activeDriverName && driverMobile === activeDriverMobile);
                    })
                    .map((driver) => (
                      <TouchableOpacity
                        key={driver.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedDriver(driver.id);
                          setShowDriverDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {driver.firstName} {driver.lastName} - {driver.phoneNo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* Date Inputs */}
              <Text style={styles.label}>From Date *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker('from')}>
                <Text style={[styles.inputText, !fromDate && styles.placeholderText]}>
                  {fromDate || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>To Date *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker('to')}>
                <Text style={[styles.inputText, !toDate && styles.placeholderText]}>
                  {toDate || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>

              {/* Time Inputs */}
              <Text style={styles.label}>From Time *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker('from')}>
                <Text style={[styles.inputText, !fromTime && styles.placeholderText]}>
                  {fromTime || 'HH:MM'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>To Time *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker('to')}>
                <Text style={[styles.inputText, !toTime && styles.placeholderText]}>
                  {toTime || 'HH:MM'}
                </Text>
              </TouchableOpacity>

              {/* Shift Type Dropdown */}
              <Text style={styles.label}>Shift Type *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowShiftDropdown(!showShiftDropdown)}
              >
                <Text style={styles.dropdownText}>{shiftType}</Text>
                <Text style={styles.dropdownArrow}>{showShiftDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showShiftDropdown && (
                <View style={styles.dropdownList}>
                  {['day', 'night', 'general'].map((shift) => (
                    <TouchableOpacity
                      key={shift}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setShiftType(shift);
                        setShowShiftDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{shift}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Remarks */}
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Optional remarks"
                placeholderTextColor="#9ca3af"
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
              />

              {/* Force Reassign - Only show if driver is already assigned */}
              {ambulance?.currentAssignedId && (
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setForceReassign(!forceReassign)}
                >
                  <View style={[styles.checkbox, forceReassign && styles.checkboxChecked]}>
                    {forceReassign && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Force Reassign</Text>
                </TouchableOpacity>
              )}

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCloseAssignModal}
                  disabled={assignLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, assignLoading && styles.submitButtonDisabled]}
                  onPress={handleAssignDriver}
                  disabled={assignLoading}
                >
                  {assignLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Assign</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => handleDateChange(showDatePicker, event, date)}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="default"
          is24Hour={true}
          onChange={(event, time) => handleTimeChange(showTimePicker, event, time)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  content: { 
    padding: 16, 
    paddingBottom: 24 
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  driverCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14b8a6',
  },
  assignButtonInCard: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  driverInfo: {
    gap: 8,
  },
  driverDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  driverLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  driverValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6b7280',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
    maxHeight: 150,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1f2937',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 12,
  },
  inputText: {
    fontSize: 14,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#14b8a6',
  },
  submitButtonDisabled: {
    backgroundColor: '#a0a0a0',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AmbulanceDetails;
