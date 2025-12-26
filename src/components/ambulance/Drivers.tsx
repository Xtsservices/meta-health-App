import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { AuthFetch, AuthPost } from '../../auth/auth';
import { showError, showSuccess } from '../../store/toast.slice';
import AmbulanceFooter from './AmbulanceFooter';
import DateTimePicker from '@react-native-community/datetimepicker';

const ListEmpty = () => <Text style={styles.empty}>No drivers found</Text>;

const Drivers: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  
  // Assignment form state
  const [selectedAmbulance, setSelectedAmbulance] = useState<number | null>(null);
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
  const [showAmbulanceDropdown, setShowAmbulanceDropdown] = useState(false);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showShiftDropdown, setShowShiftDropdown] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Authentication required'));
        return;
      }

      // Fetch all drivers without ambulanceId filter
      const res: any = await AuthFetch('ambulance/getDrivers', token);
      if (res?.data?.drivers) {
        setDrivers(res.data.drivers);
      } else if (res?.drivers) {
        setDrivers(res.drivers);
      } else {
        dispatch(showError(res?.message || 'Failed to fetch drivers'));
      }
    } catch (err) {
      // console.error('fetchDrivers error', err);
      dispatch(showError('Failed to fetch drivers'));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const fetchAmbulances = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res: any = await AuthFetch('ambulance/getAllAmbulances', token);
      if (res?.data?.ambulances) {
        setAmbulances(res.data.ambulances);
      }
    } catch (err) {
      // console.error('fetchAmbulances error', err);
    }
  }, []);

  // Refresh drivers list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
      fetchAmbulances();
    }, [fetchDrivers, fetchAmbulances])
  );

  const resetAssignmentForm = () => {
    setSelectedAmbulance(null);
    setSelectedDriver(null);
    setFromDate('');
    setToDate('');
    setFromTime('');
    setToTime('');
    setShiftType('day');
    setRemarks('');
    setForceReassign(false);
  };



  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    resetAssignmentForm();
  };

  const handleAssignDriver = async () => {
    // Validation
    if (!selectedAmbulance) {
      dispatch(showError('Please select an ambulance'));
      return;
    }
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
        ambulanceID: selectedAmbulance,
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

      if (response?.status === 'success' || response?.message?.includes('success')) {
        dispatch(showSuccess('Driver assigned successfully'));
        handleCloseAssignModal();
        fetchDrivers(); // Refresh the list
      } else {
        dispatch(showError(response?.message || 'Failed to assign driver'));
      }
    } catch (err: any) {
      // console.error('handleAssignDriver error', err);
      dispatch(showError(err?.response?.data?.message || 'Failed to assign driver'));
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

  const renderDriver = ({ item }: { item: any }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <Text style={styles.driverName}>
          {[item.firstName, item.lastName].filter(Boolean).join(' ')}
        </Text>
        <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusText}>{item.status || 'N/A'}</Text>
        </View>
      </View>
      <Text style={styles.driverMeta}>📱 {item.phoneNo}</Text>
      <Text style={styles.driverMeta}>✉️ {item.email}</Text>
      <Text style={styles.driverMeta}>🆔 Aadhar: {item.aadharNumber}</Text>
      <Text style={styles.driverMeta}>🚗 DL: {item.drivingLicenceNumber}</Text>
      {item.ambulance_name && (
        <Text style={styles.ambulanceTag}>🚑 {item.ambulance_name}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Drivers Management</Text>
            <Text style={styles.subtitle}>View and manage all ambulance drivers</Text>
          </View>
          
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingText}>Loading drivers...</Text>
          </View>
        ) : (
          <FlatList 
            data={drivers} 
            keyExtractor={(d) => String(d.id)} 
            renderItem={renderDriver} 
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('AddDriver')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>


      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
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

      <AmbulanceFooter active="drivers" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  headerContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: { 
    color: '#6b7280', 
    marginTop: 4,
    fontSize: 14,
  },
  assignButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  content: { 
    flex: 1,
    paddingBottom: 80,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  driverCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverName: { 
    fontWeight: '700',
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  driverMeta: { 
    color: '#6b7280', 
    fontSize: 13,
    marginTop: 4,
  },
  ambulanceTag: {
    marginTop: 8,
    fontSize: 13,
    color: '#14b8a6',
    fontWeight: '600',
  },
  empty: { 
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  fab: { 
    position: 'absolute',
    right: 20,
    bottom: 90,
    backgroundColor: '#14b8a6', 
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: { 
    color: '#fff', 
    fontSize: 32,
    fontWeight: '300',
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
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
    marginTop: 4,
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
    marginTop: 16,
    marginBottom: 8,
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
    marginTop: 24,
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

export default Drivers;
