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
  const [staff, setStaff] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStaffAssignModal, setShowStaffAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [staffAssignLoading, setStaffAssignLoading] = useState(false);
  
  // Driver Assignment form state
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [shiftType, setShiftType] = useState('day');
  const [remarks, setRemarks] = useState('');
  const [forceReassign, setForceReassign] = useState(false);

  // Staff Assignment form state
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [staffFromDate, setStaffFromDate] = useState('');
  const [staffToDate, setStaffToDate] = useState('');
  const [staffFromTime, setStaffFromTime] = useState('');
  const [staffToTime, setStaffToTime] = useState('');
  const [staffShiftType, setStaffShiftType] = useState('day');
  const [staffRemarks, setStaffRemarks] = useState('');
  const [staffForceReassign, setStaffForceReassign] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | 'staffFrom' | 'staffTo' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<'from' | 'to' | 'staffFrom' | 'staffTo' | null>(null);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [showShiftDropdown, setShowShiftDropdown] = useState(false);
  const [showStaffShiftDropdown, setShowStaffShiftDropdown] = useState(false);

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

  const fetchStaff = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res: any = await AuthFetch('ambulance/getStaff', token);
      console.log('fetchStaff response', res);
      if (res?.data?.staff) {
        setStaff(res.data.staff);
      } else if (res?.staff) {
        setStaff(res.staff);
      }
    } catch (err) {
      console.error('fetchStaff error', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
      fetchStaff();
    }, [fetchDrivers, fetchStaff])
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

  const resetStaffAssignmentForm = () => {
    setSelectedStaff(null);
    setStaffFromDate('');
    setStaffToDate('');
    setStaffFromTime('');
    setStaffToTime('');
    setStaffShiftType('day');
    setStaffRemarks('');
    setStaffForceReassign(false);
  };

  const handleOpenAssignModal = () => {
    resetAssignmentForm();
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    resetAssignmentForm();
  };

  const handleOpenStaffAssignModal = () => {
    resetStaffAssignmentForm();
    setShowStaffAssignModal(true);
  };

  const handleCloseStaffAssignModal = () => {
    setShowStaffAssignModal(false);
    resetStaffAssignmentForm();
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



    try {
      setAssignLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Authentication required'));
        return;
      }
      let newFromTime = fromTime || '00:01';
      let newToTime = toTime || '23:59';

    
      const payload = {
        ambulanceID: ambulance?.id,
        driverID: selectedDriver,
        fromDate,
        toDate,
        fromTime: newFromTime,
        toTime: newToTime,
        shiftType,
        remarks: remarks || undefined,
        forceReassign,
      };

      console.log("assignDriverpayload",payload)
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

  const handleAssignStaff = async () => {
    // Validation
    if (!selectedStaff) {
      dispatch(showError('Please select a staff member'));
      return;
    }
    if (!staffFromDate) {
      dispatch(showError('Please select from date'));
      return;
    }
    if (!staffToDate) {
      dispatch(showError('Please select to date'));
      return;
    }

    try {
      setStaffAssignLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Authentication required'));
        return;
      }
      let newFromTime = staffFromTime || '00:01';
      let newToTime = staffToTime || '23:59';

      const payload = {
        ambulanceID: ambulance?.id,
        staffID: selectedStaff,
        fromDate: staffFromDate,
        toDate: staffToDate,
        fromTime: newFromTime,
        toTime: newToTime,
        shiftType: staffShiftType,
        remarks: staffRemarks || undefined,
        forceReassign: staffForceReassign,
      };

      console.log('assignStaffPayload', payload);
      const response: any = await AuthPost('ambulance/assignStaff', payload, token);
      console.log("assignStaffPayload response", response);
      if (response?.status === 'success') {
        dispatch(showSuccess('Staff assigned successfully'));
        handleCloseStaffAssignModal();
        // Navigate back to dashboard after successful assignment
        navigation.navigate('AmbulanceAdminDashboard');
      } else {
        const errorMessage = response?.message || 'Failed to assign staff';
        dispatch(showError(errorMessage));
        Alert.alert('Assignment Failed', errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to assign staff';
      dispatch(showError(errorMessage));
      Alert.alert('Error', errorMessage);
    } finally {
      setStaffAssignLoading(false);
    }
  };

  const handleDateChange = (type: 'from' | 'to' | 'staffFrom' | 'staffTo', event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      if (type === 'from') {
        setFromDate(formattedDate);
      } else if (type === 'to') {
        setToDate(formattedDate);
      } else if (type === 'staffFrom') {
        setStaffFromDate(formattedDate);
      } else if (type === 'staffTo') {
        setStaffToDate(formattedDate);
      }
    }
  };

  const handleTimeChange = (type: 'from' | 'to' | 'staffFrom' | 'staffTo', event: any, selectedTime?: Date) => {
    setShowTimePicker(null);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;
      if (type === 'from') {
        setFromTime(formattedTime);
      } else if (type === 'to') {
        setToTime(formattedTime);
      } else if (type === 'staffFrom') {
        setStaffFromTime(formattedTime);
      } else if (type === 'staffTo') {
        setStaffToTime(formattedTime);
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

        {/* Active Staff Card */}
        <View style={styles.staffCard}>
          <View style={styles.driverCardHeader}>
            <Text style={styles.staffCardTitle}>Active Staff</Text>
            <TouchableOpacity 
              style={styles.assignButtonInCard}
              onPress={handleOpenStaffAssignModal}
            >
              <Text style={styles.assignButtonText}>Assign Staff</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.driverInfo}>
            <View style={styles.driverDetailRow}>
              <Text style={styles.driverLabel}>Staff Name:</Text>
              <Text style={styles.driverValue}>
                {ambulance?.activeStaffName || 'N/A'}
              </Text>
            </View>
            <View style={styles.driverDetailRow}>
              <Text style={styles.driverLabel}>Staff Mobile:</Text>
              <Text style={styles.driverValue}>
                {ambulance?.activeStaffMobile || 'N/A'}
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

              {/* Force Reassign  */}
             
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setForceReassign(!forceReassign)}
                >
                  <View style={[styles.checkbox, forceReassign && styles.checkboxChecked]}>
                    {forceReassign && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Force Reassign</Text>
                </TouchableOpacity>
            

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

      {/* Staff Assignment Modal */}
      <Modal
        visible={showStaffAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseStaffAssignModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Assign Staff to {ambulance?.ambulanceName}</Text>

              {/* Staff Dropdown */}
              <Text style={styles.label}>Staff *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowStaffDropdown(!showStaffDropdown)}
              >
                <Text style={[styles.dropdownText, !selectedStaff && styles.placeholderText]}>
                  {selectedStaff
                    ? `${staff.find((s) => s.staffID === selectedStaff)?.firstName || ''} ${staff.find((s) => s.staffID === selectedStaff)?.lastName || ''}`.trim() || 'Select Staff'
                    : 'Select Staff'}
                </Text>
                <Text style={styles.dropdownArrow}>{showStaffDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showStaffDropdown && (
                <View style={styles.dropdownList}>
                  {staff
                    .filter((staffMember) => {
                      // Filter out the currently active staff by checking name and mobile match
                      const staffFullName = `${staffMember.firstName} ${staffMember.lastName}`.trim();
                      const staffMobile = staffMember.phoneNo;
                      const activeStaffName = ambulance?.activeStaffName;
                      const activeStaffMobile = ambulance?.activeStaffMobile;
                      
                      // If no active staff, show all staff
                      if (!activeStaffName || !activeStaffMobile) return true;
                      
                      // Exclude staff if both name and mobile match the active staff
                      return !(staffFullName === activeStaffName && staffMobile === activeStaffMobile);
                    })
                    .map((staffMember) => (
                      <TouchableOpacity
                        key={staffMember.staffID}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedStaff(staffMember.staffID);
                          setShowStaffDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {staffMember.firstName} {staffMember.lastName} - {staffMember.phoneNo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* Date Inputs */}
              <Text style={styles.label}>From Date *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker('staffFrom')}>
                <Text style={[styles.inputText, !staffFromDate && styles.placeholderText]}>
                  {staffFromDate || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>To Date *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker('staffTo')}>
                <Text style={[styles.inputText, !staffToDate && styles.placeholderText]}>
                  {staffToDate || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>

              {/* Time Inputs */}
              <Text style={styles.label}>From Time *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker('staffFrom')}>
                <Text style={[styles.inputText, !staffFromTime && styles.placeholderText]}>
                  {staffFromTime || 'HH:MM'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>To Time *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker('staffTo')}>
                <Text style={[styles.inputText, !staffToTime && styles.placeholderText]}>
                  {staffToTime || 'HH:MM'}
                </Text>
              </TouchableOpacity>

              {/* Shift Type Dropdown */}
              <Text style={styles.label}>Shift Type *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowStaffShiftDropdown(!showStaffShiftDropdown)}
              >
                <Text style={styles.dropdownText}>{staffShiftType}</Text>
                <Text style={styles.dropdownArrow}>{showStaffShiftDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showStaffShiftDropdown && (
                <View style={styles.dropdownList}>
                  {['day', 'night', 'general'].map((shift) => (
                    <TouchableOpacity
                      key={shift}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setStaffShiftType(shift);
                        setShowStaffShiftDropdown(false);
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
                value={staffRemarks}
                onChangeText={setStaffRemarks}
                multiline
                numberOfLines={3}
              />

              {/* Force Reassign */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setStaffForceReassign(!staffForceReassign)}
              >
                <View style={[styles.checkbox, staffForceReassign && styles.checkboxChecked]}>
                  {staffForceReassign && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Force Reassign</Text>
              </TouchableOpacity>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCloseStaffAssignModal}
                  disabled={staffAssignLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, staffAssignLoading && styles.submitButtonDisabled]}
                  onPress={handleAssignStaff}
                  disabled={staffAssignLoading}
                >
                  {staffAssignLoading ? (
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
  staffCard: {
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
    borderLeftColor: '#f59e0b',
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
  staffCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
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
