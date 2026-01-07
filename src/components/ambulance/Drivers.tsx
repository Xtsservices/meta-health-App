import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { AuthFetch } from '../../auth/auth';
import { showError } from '../../store/toast.slice';
import AmbulanceFooter from './AmbulanceFooter';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

const EmptyListMessage: React.FC<{ category: 'driver' | 'staff' }> = ({
  category,
}) => (
  <Text style={styles.empty}>
    {category === 'staff' ? 'No staff found' : 'No drivers found'}
  </Text>
);

const Drivers: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [category, _setCategory] = useState<'driver' | 'staff'>('driver');
  const [_ambulances, _setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [_showAssignModal, _setShowAssignModal] = useState(false);
  const [_assignLoading, _setAssignLoading] = useState(false);

  // Date filter state
  const [showDatePicker, setShowDatePicker] = useState<'filter' | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD filter, default null
  const [_showAmbulanceDropdown, _setShowAmbulanceDropdown] = useState(false);
  const [_showDriverDropdown, _setShowDriverDropdown] = useState(false);
  const [_showShiftDropdown, _setShowShiftDropdown] = useState(false);

  // fetchDrivers accepts an optional filterDate (YYYY-MM-DD). If provided, it's appended as ?date=...
  const fetchDrivers = useCallback(
    async (filterDate?: string | null, cat: 'driver' | 'staff' = 'driver') => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          dispatch(showError('Authentication required'));
          return;
        }
        // Build endpoint with optional date query param (use only the provided filterDate)
        const base =
          cat === 'staff' ? 'ambulance/getStaff' : 'ambulance/getDrivers';
        const endpoint = `${base}${filterDate ? `?date=${filterDate}` : ''}`;
        // Fetch drivers or staff (optionally filtered by date)
        const res: any = await AuthFetch(endpoint, token);
        console.log('fetchDrivers response', res);
        // normalize response: both endpoints return data in res.data.list or res.data.drivers/staff
        let list: any[] | null = null;
        if (res?.data?.drivers) list = res.data.drivers;
        else if (res?.drivers) list = res.drivers;
        else if (res?.data?.staff) list = res.data.staff;
        else if (res?.staff) list = res.staff;
        else if (res?.data?.list) list = res.data.list;

        // If we got a valid list, set it. If null, treat as empty but do not show a toast (could be legitimately empty)
        if (Array.isArray(list)) {
          setDrivers(list);
        } else {
          // No usable list returned; set empty array without showing an error toast
          setDrivers([]);
        }
      } catch (err: any) {
        console.error('fetchDrivers error', err);
        dispatch(showError('Failed to fetch drivers'));
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  const fetchAmbulances = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res: any = await AuthFetch('ambulance/getAllAmbulances', token);
      if (res?.data?.ambulances) {
        _setAmbulances(res.data.ambulances);
      }
    } catch (err: any) {
      console.error('fetchAmbulances error', err);
    }
  }, []);

  // Refresh drivers list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDrivers(selectedDate ?? null, category);
      fetchAmbulances();
    }, [fetchDrivers, fetchAmbulances, selectedDate, category]),
  );

  // Assignment logic removed (not used in this view)

  // handle header filter date only
  const handleDateChange = (event: any, pickedDate?: Date) => {
    setShowDatePicker(null);
    if (pickedDate) {
      const formattedDate = pickedDate.toISOString().split('T')[0];
      setSelectedDate(formattedDate);
      fetchDrivers(formattedDate, category);
    }
  };

  const renderDriver = ({ item }: { item: any }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <Text style={styles.driverName}>
          {[item.firstName, item.lastName].filter(Boolean).join(' ')}
        </Text>
        <View
          style={[
            styles.statusBadge,
            item.status === 'active'
              ? styles.statusActive
              : styles.statusInactive,
          ]}
        >
          <Text style={styles.statusText}>{item.status || 'N/A'}</Text>
        </View>
      </View>
      <Text style={styles.driverMeta}>📱 {item.phoneNo}</Text>
      <Text style={styles.driverMeta}>✉️ {item.email}</Text>
      <Text style={styles.driverMeta}>🆔 Aadhar: {item.aadharNumber}</Text>
      {category === 'driver' && (
        <Text style={styles.driverMeta}>🚗 DL: {item.drivingLicenceNumber}</Text>
      )}
      {item.ambulance_name && (
        <Text style={styles.ambulanceTag}>🚑 {item.ambulance_name}</Text>
      )}
      {/* Shift / assignment info */}
      {(() => {
        const shift =
          item.shift ||
          (item.fromDate
            ? {
                fromDate: item.fromDate,
                toDate: item.toDate,
                fromTime: item.fromTime,
                toTime: item.toTime,
                shiftType: item.shiftType,
                status: item.assignmentStatus,
              }
            : null);

        if (!shift) return null;

        const formatDate = (iso?: string) => (iso ? iso.split('T')[0] : '');
        const formatTime = (t?: string) => {
          if (!t) return '';
          // support formats like HH:MM:SS
          return t.split(':').slice(0, 2).join(':');
        };

        return (
          <View style={styles.shiftContainer}>
            <Text style={styles.shiftLabel}>
              {shift.shiftType ? shift.shiftType.toUpperCase() : 'SHIFT'}
            </Text>
            <Text style={styles.shiftText}>
              Status: {shift.status || 'N/A'}
            </Text>
            <Text style={styles.shiftText}>
              Dates: {formatDate(shift.fromDate)} → {formatDate(shift.toDate)}
            </Text>
            <Text style={styles.shiftText}>
              Times: {formatTime(shift.fromTime)} → {formatTime(shift.toTime)}
            </Text>
          </View>
        );
      })()}
      <View style={styles.imageIconRow}>
        {item.images?.licenceFrontImageURL ? (
          <TouchableOpacity
            style={styles.imageIcon}
            onPress={() => {
              setPreviewImageUrl(item.images.licenceFrontImageURL);
              setPreviewTitle('Licence - Front');
              setShowImageModal(true);
            }}
          >
            <Text style={styles.imageIconText}>📄 DL Front</Text>
          </TouchableOpacity>
        ) : null}

        {item.images?.licenceBackImageURL ? (
          <TouchableOpacity
            style={styles.imageIcon}
            onPress={() => {
              setPreviewImageUrl(item.images.licenceBackImageURL);
              setPreviewTitle('Licence - Back');
              setShowImageModal(true);
            }}
          >
            <Text style={styles.imageIconText}>📄 DL Back</Text>
          </TouchableOpacity>
        ) : null}

        {item.images?.aadharImageURL ? (
          <TouchableOpacity
            style={styles.imageIcon}
            onPress={() => {
              setPreviewImageUrl(item.images.aadharImageURL);
              setPreviewTitle('Aadhar');
              setShowImageModal(true);
            }}
          >
            <Text style={styles.imageIconText}>📄 Aadhar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const [showImageModal, setShowImageModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Drivers</Text>
          <Text style={styles.headerSubtitle}>Ambulance Drivers</Text>
        </View>

        <View style={styles.headerButtonsRow}>
          {selectedDate ? (
            <TouchableOpacity
              style={styles.dateChip}
              onPress={() => {
                // clear filter
                setSelectedDate(null);
                fetchDrivers(null, category);
              }}
            >
              <Text style={styles.dateChipText}>{selectedDate}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowDatePicker('filter')}
          >
            <Text style={styles.calendarButtonText}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category toggle moved below header and above list */}

      <View style={styles.typeSelectorRow}>
        <TouchableOpacity
          onPress={() => {
            if (category !== 'driver') {
              _setCategory('driver');
              fetchDrivers(selectedDate ?? null, 'driver');
            }
          }}
          style={[
            styles.typeButton,
            category === 'driver' && styles.typeButtonActive,
          ]}
        >
          <Text
            style={[
              styles.typeButtonText,
              category === 'driver' && styles.typeButtonTextActive,
            ]}
          >
            Driver
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (category !== 'staff') {
              _setCategory('staff');
              fetchDrivers(selectedDate ?? null, 'staff');
            }
          }}
          style={[
            styles.typeButton,
            category === 'staff' && styles.typeButtonActive,
          ]}
        >
          <Text
            style={[
              styles.typeButtonText,
              category === 'staff' && styles.typeButtonTextActive,
            ]}
          >
            Supporting Staff
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingText}>
              Loading {category === 'staff' ? 'staff' : 'drivers'}...
            </Text>
          </View>
        ) : (
          <FlatList
            data={drivers}
            keyExtractor={d => String(d.id)}
            renderItem={renderDriver}
            ListEmptyComponent={<EmptyListMessage category={category} />}
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
          onChange={(event, date) => handleDateChange(event, date)}
        />
      )}

      {/* Image Preview Modal */}
      {showImageModal && previewImageUrl && (
        <Modal
          visible={showImageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalInner}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <Text style={styles.modalTitle}>
                  {previewTitle || 'Image Preview'}
                </Text>
                <Text style={styles.modalInfoText}>
                  Tap outside or close to dismiss
                </Text>
                <View style={styles.modalImageContainer}>
                  <Image
                    source={{ uri: previewImageUrl }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCloseButton]}
                  onPress={() => setShowImageModal(false)}
                >
                  <Text style={styles.submitButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Time picker removed (assignment form not in this view) */}

      <AmbulanceFooter active="drivers" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: isSmallDevice ? 20 : 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
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
    minWidth: 64,
    alignItems: 'center',
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
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    justifyContent: 'flex-end',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  headerCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  categoryButtonActive: {
    backgroundColor: '#fff',
  },
  categoryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#14b8a6',
  },
  calendarButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  calendarButtonText: {
    fontSize: 18,
  },
  dateChip: {
    backgroundColor: '#e6fffa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7f9f0',
  },
  dateChipText: {
    color: '#065f46',
    fontWeight: '600',
  },
  imageIconRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    alignItems: 'center',
  },
  imageIcon: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  imageIconText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  modalInner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalScroll: {
    alignItems: 'center',
  },
  modalInfoText: {
    marginBottom: 12,
    color: '#6b7280',
  },
  modalImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    marginTop: 20,
  },
  shiftContainer: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6eef6',
  },
  shiftLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  shiftText: {
    fontSize: 13,
    color: '#374151',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginTop: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
});

export default Drivers;
