import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// SVG Icons
import {
  SearchIcon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  UsersIcon,
  UserIcon,
  XIcon,
  BellIcon,
} from '../../../utils/SvgIcons';

// Types
import { RootState } from '../../../store/store';
import { AuthFetch } from '../../../auth/auth';
import { PatientType, wardType } from '../../../utils/types';
import { showError, showSuccess } from '../../../store/toast.slice';

// Utils
import { calculateAgeFromDOB, formatDate, formatDateTime } from '../../../utils/dateTime';

// Responsive utilities
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
  moderateScale,
} from '../../../utils/responsive';
import Footer from '../../dashboard/footer';

const PAGE_SIZE = 10;
const FOOTER_H = moderateScale(70);

/* -------------------------- Confirm Dialog -------------------------- */
const ConfirmDialog: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}> = ({ visible, title, message, onCancel, onConfirm, confirmText = "Logout" }) => {
  const { width: screenWidth } = Dimensions.get('window');
  
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={[
          styles.modalCard,
          { width: screenWidth * 0.85, maxWidth: moderateScale(380) }
        ]}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMsg}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity 
              onPress={onCancel} 
              style={[styles.modalBtn, styles.modalBtnGhost]}
            >
              <Text style={[styles.modalBtnText, { color: "#1C7C6B" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onConfirm} 
              style={[styles.modalBtn, styles.modalBtnDanger]}
            >
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const NursePatientsList: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector((state: RootState) => state.currentUser);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  
  // State
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [wardList, setWardList] = useState<wardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState<string>("");
  
  // Filters
  const [wardFilter, setWardFilter] = useState<number>(0);
  const [patientTypeFilter, setPatientTypeFilter] = useState<number>(0);
  const [search, setSearch] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  
  // Refs
  const flatRef = useRef<FlatList>(null);

  // Fetch patients data
  const fetchPatients = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Not authorized. Please login again.'));
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
        return;
      }

      if (!user?.hospitalID || !user?.role) {
        dispatch(showError('Hospital information not found'));
        return;
      }
      
      setLoading(true);
      setApiMessage("");
      
      const response: any = await AuthFetch(
        `nurse/getnursepatients/${user?.hospitalID}/${user?.role}`,
        token
      );
      
      if (response?.status === 'error') {
        setApiMessage(response?.message || 'No schedule assigned');
        setPatients([]);
      } else if (response?.data?.message === 'success' && response?.data?.data) {
        const data = response?.data?.data;
        setPatients(data);
        setApiMessage("");
      } else if (response?.message === 'No schedule assigned') {
        setApiMessage('No schedule assigned');
        setPatients([]);
      } else {
        setApiMessage('No patient data available');
        setPatients([]);
      }
    } catch (err: any) {
      dispatch(showError(err?.response?.data?.message || 'Failed to fetch patient data'));
      setApiMessage('Failed to fetch patient data');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.role, dispatch, navigation]);
  
  // Fetch ward data
  const fetchWards = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!user?.hospitalID || !token) return;
      
      const response: any = await AuthFetch(
        `ward/${user?.hospitalID}`,
        token
      );
      
      if (response?.status === 'success' && response?.data?.wards) {
        setWardList(response?.data?.wards ?? []);
      }
    } catch (error: any) {
      dispatch(showError(error?.response?.data?.message || 'Failed to fetch ward data'));
    }
  }, [user?.hospitalID, dispatch]);
  
  // Fetch follow-up patients
  const fetchFollowUpPatients = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!user?.hospitalID || !token) return;
      
      setLoading(true);
      setApiMessage("");
      
      const response: any = await AuthFetch(
        `followup/${user?.hospitalID}/headnurse/followups`,
        token
      );
      
      if (response?.data?.message === 'success' && response?.data?.followUps) {
        const followUpPatients = response?.data?.followUps?.map?.((followUp: any) => ({
          ...followUp,
          id: followUp?.followUpID,
          patientID: followUp?.patientID
        })) ?? [];
        
        setPatients(followUpPatients);
        setApiMessage("");
      } else {
        setApiMessage('No follow-up patients found');
        setPatients([]);
      }
    } catch (error: any) {
      dispatch(showError(error?.response?.data?.message || 'Failed to fetch follow-up patients'));
      setApiMessage('Failed to fetch follow-up patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, dispatch]);
  
  // Filter patients
  const filteredAndSearched = useMemo(() => {
    let filtered = [...patients];
    
    // Apply patient type filter
    if (patientTypeFilter !== 0) {
      filtered = filtered?.filter?.((patient) => {
        switch (patientTypeFilter) {
          case 1: // OPD
            return patient?.ptype === 1;
          case 2: // IPD
            return patient?.ptype === 2;
          case 3: // Emergency
            return patient?.ptype === 3;
          case 4: // Discharged
            return patient?.ptype === 21;
          case 5: // Follow-up
            return patient?.followUp === 1;
          case 6: // Patients with Device
            return patient?.deviceID != null;
          default:
            return true;
        }
      }) ?? [];
    }
    
    // Apply ward filter
    if (wardFilter !== 0) {
      filtered = filtered?.filter?.((patient) => patient?.wardID === wardFilter) ?? [];
    }
    
    // Apply search filter
    if (search?.trim()) {
      const searchLower = search?.toLowerCase();
      filtered = filtered?.filter?.((patient) =>
        patient?.pName?.toLowerCase?.()?.includes?.(searchLower) ||
        patient?.phoneNumber?.toString?.()?.includes?.(searchLower) ||
        patient?.id?.toString?.()?.includes?.(search)
      ) ?? [];
    }
    
    return filtered?.sort?.(
      (a, b) => new Date(b?.addedOn ?? 0).valueOf() - new Date(a?.addedOn ?? 0).valueOf()
    ) ?? [];
  }, [patients, patientTypeFilter, wardFilter, search]);
  
  // Initial data fetch
  useFocusEffect(
    useCallback(() => {
      if (patientTypeFilter === 5) {
        fetchFollowUpPatients();
      } else {
        fetchPatients();
      }
      
      if (user?.role === 2002) {
        fetchWards();
      }
    }, [user?.hospitalID, user?.role, patientTypeFilter, fetchPatients, fetchFollowUpPatients, fetchWards])
  );
  
  // Calculate paginated data
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSearched?.slice?.(start, start + PAGE_SIZE) ?? [];
  }, [filteredAndSearched, currentPage]);
  
  const totalPages = Math.ceil(filteredAndSearched?.length / PAGE_SIZE) || 1;
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [patientTypeFilter, wardFilter, search]);
  
  // Go to page function
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      flatRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    }
  }, [totalPages]);
  
  // Filter options based on role
  const getFilterOptions = useCallback(() => {
    if (user?.role === 2003) { // Nurse
      return [
        { label: 'All Patients', value: 0 },
        { label: 'OPD', value: 1 },
        { label: 'IPD', value: 2 },
      ];
    } else { // Head Nurse
      return [
        { label: 'All Patients', value: 0 },
        { label: 'OPD', value: 1 },
        { label: 'IPD', value: 2 },
        { label: 'Emergency', value: 3 },
        { label: 'Discharged', value: 4 },
        { label: 'Follow Up', value: 5 },
        { label: 'Patients with Device', value: 6 },
      ];
    }
  }, [user?.role]);
  
  // Get patient type label
  const getPatientTypeLabel = useCallback((ptype?: number) => {
    switch (ptype) {
      case 1: return 'OPD';
      case 2: return 'IPD';
      case 3: return 'Emergency';
      case 21: return 'Discharged';
      default: return 'Unknown';
    }
  }, []);
  
  // Get status color
  const getStatusColor = useCallback((status?: string) => {
    switch (status?.toLowerCase?.()) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'discharged': return '#6B7280';
      default: return '#6B7280';
    }
  }, []);
  
  // Calculate age from DOB
  const calculateAge = useCallback((patient: PatientType): string => {
    return calculateAgeFromDOB(patient?.dob, patient?.age);
  }, []);

  // Handle view patient
  const handleViewPatient = useCallback((patient: PatientType) => {
    navigation.navigate('PatientProfile' as never, { 
      id: patient?.id,
      staffRole: user?.role === 2003 ? "nurse" : "headnurse",
      patientName: patient?.pName,
      fromDischargeList: patientTypeFilter === 4,
      isFromPreviousPatients: false,
      wardName: user?.role === 2002 ? wardList?.find?.(w => w?.id === patient?.wardID)?.name : undefined,
    });
  }, [user?.role, patientTypeFilter, wardList, navigation]);
  
  // Handle notification
  const handleNotification = useCallback((patient: PatientType) => {
    navigation.navigate('PatientNotifications' as never, {
      patientId: patient?.id,
      patientName: patient?.pName
    });
  }, [navigation]);
  
  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setPatientTypeFilter(0);
    setWardFilter(0);
    setSearch("");
    setShowFilterModal(false);
  }, []);
  
  // Handle logout
  const handleLogout = useCallback(async () => {
    setConfirmVisible(false);
    try {
      await AsyncStorage.multiRemove(['token', 'userID']);
    } catch (e) {
      // Silent error handling
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    }
  }, [navigation]);

  const hasActiveFilters = patientTypeFilter !== 0 || wardFilter !== 0 || search !== "";
  
  // Render header (search + filters)
  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <SearchIcon size={ICON_SIZE.sm} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, mobile, ID"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search !== "" && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <XIcon size={ICON_SIZE.xs} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {/* Ward Filter (Head Nurse Only) */}
        {user?.role === 2002 && (
          <View style={[
            styles.wardFilterContainer, 
            { borderColor: wardFilter !== 0 ? '#14b8a6' : '#E5E7EB' }
          ]}>
            <View style={styles.wardFilterIcon}>
              <FilterIcon 
                size={ICON_SIZE.xs} 
                color={wardFilter !== 0 ? '#14b8a6' : '#6B7280'} 
              />
            </View>
            <View style={styles.wardPickerWrapper}>
              <Picker
                selectedValue={wardFilter}
                onValueChange={setWardFilter}
                style={styles.wardPicker}
                dropdownIconColor="#14b8a6"
              >
                <Picker.Item label="All Wards" value={0} />
                {wardList?.map?.((ward) => (
                  <Picker.Item
                    key={ward?.id}
                    label={ward?.name}
                    value={ward?.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}
        
        {/* Filter Button */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            { borderColor: patientTypeFilter !== 0 ? '#14b8a6' : '#E5E7EB' }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <FilterIcon 
            size={ICON_SIZE.sm} 
            color={patientTypeFilter !== 0 ? '#14b8a6' : '#6B7280'} 
          />
          <Text style={[
            styles.filterButtonText, 
            { color: patientTypeFilter !== 0 ? '#14b8a6' : '#374151' }
          ]}>
            Filter
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Render patient card
  const renderPatientCard = ({ item: patient }: { item: PatientType }) => {
    const paddedId = String(patient?.id ?? "").padStart(4, "0");
    const name = patient?.pName || "—";
    const phone = (patient?.phoneNumber ?? patient?.mobile ?? patient?.contact ?? "—").toString();
    const age = calculateAge(patient);
    const hasNotification = patient?.notificationCount && patient?.notificationCount > 0;
    const wardName = user?.role === 2002 
      ? wardList?.find?.(w => w?.id === patient?.wardID)?.name || "—" 
      : "—";
    
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.card}
        onPress={() => handleViewPatient(patient)}
      >
        <View style={styles.cardRow}>
          {/* Patient Avatar */}
          <View style={styles.avatar}>
            {patient?.imageURL ? (
              <Image
                source={{ uri: patient?.imageURL }}
                style={styles.patientImage}
              />
            ) : (
              <UserIcon size={ICON_SIZE.md} color="#6B7280" />
            )}
          </View>
          
          {/* Patient Info */}
          <View style={styles.meta}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              
              {/* Right Icons */}
              <View style={styles.rightIconsContainer}>
                {/* Notifications */}
                {hasNotification && (
                  <TouchableOpacity
                    style={styles.bellButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleNotification(patient);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.bellWrapper}>
                      <BellIcon size={ICON_SIZE.md} color="#EF4444" />
                      {patient?.notificationCount && patient?.notificationCount > 1 && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationCount}>
                            {patient?.notificationCount > 9 ? '9+' : patient?.notificationCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Ward Info */}
            {user?.role === 2002 && patient?.wardID && (
              <Text style={styles.sub} numberOfLines={1}>
                Ward: {wardName}
              </Text>
            )}
            
            {/* ID and Age */}
            <View style={styles.infoRow}>
              <Text style={styles.sub} numberOfLines={1}>
                ID: {paddedId}
              </Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.sub}>
                Age: {age}
              </Text>
              {patient?.deviceID && user?.role === 2002 && (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.deviceBadge}>Device</Text>
                </>
              )}
            </View>
            
            {/* Phone */}
            <Text style={styles.sub} numberOfLines={1}>
              Phone: {phone}
            </Text>
            
            {/* Patient Type and Status */}
            <View style={styles.infoRow}>
              <Text style={[
                styles.patientType,
                { color: patient?.ptype === 2 ? '#1D4ED8' : '#059669' }
              ]}>
                {getPatientTypeLabel(patient?.ptype)}
              </Text>
              <Text style={styles.dot}>•</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(patient?.status) + '15' }
              ]}>
                <Text style={styles.statusText}>
                  {patient?.status || 'Active'}
                </Text>
              </View>
            </View>
          </View>
          
          {/* View Button */}
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => handleViewPatient(patient)}
          >
            <EyeIcon size={ICON_SIZE.sm} color="#374151" />
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptySub}>
        {search || patientTypeFilter !== 0 || wardFilter !== 0
          ? "Try adjusting filters or search terms."
          : "No patients available."}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearEmptyButton} onPress={clearAllFilters}>
          <Text style={styles.clearEmptyButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <View style={styles.pagination}>
        <Text style={styles.resultsText}>
          Results: {filteredAndSearched?.length} patients
        </Text>
        
        <View style={styles.pageControls}>
          <Text style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </Text>
          
          <View style={styles.pageButtons}>
            <TouchableOpacity
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            >
              <ChevronLeftIcon 
                size={ICON_SIZE.sm} 
                color={currentPage === 1 ? '#9CA3AF' : '#374151'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            >
              <ChevronRightIcon 
                size={ICON_SIZE.sm} 
                color={currentPage === totalPages ? '#9CA3AF' : '#374151'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Patients</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <XIcon size={ICON_SIZE.md} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Patient Type</Text>
              {getFilterOptions()?.map?.((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    patientTypeFilter === option.value && styles.filterOptionSelected
                  ]}
                  onPress={() => {
                    setPatientTypeFilter(option.value);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    patientTypeFilter === option.value && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {patientTypeFilter === option.value && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Ward Filter for Head Nurse */}
            {user?.role === 2002 && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Ward</Text>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    wardFilter === 0 && styles.filterOptionSelected
                  ]}
                  onPress={() => {
                    setWardFilter(0);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    wardFilter === 0 && styles.filterOptionTextSelected
                  ]}>
                    All Wards
                  </Text>
                  {wardFilter === 0 && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
                {wardList?.map?.((ward) => (
                  <TouchableOpacity
                    key={ward?.id}
                    style={[
                      styles.filterOption,
                      wardFilter === ward?.id && styles.filterOptionSelected
                    ]}
                    onPress={() => {
                      setWardFilter(ward?.id);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      wardFilter === ward?.id && styles.filterOptionTextSelected
                    ]}>
                      {ward?.name}
                    </Text>
                    {wardFilter === ward?.id && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setPatientTypeFilter(0);
                setWardFilter(0);
                setShowFilterModal(false);
              }}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
  
  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#14b8a6" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#14b8a6" />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {renderHeader()}
        
        <FlatList
          ref={flatRef}
          data={pagedData}
          keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
          renderItem={renderPatientCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { 
              paddingBottom: FOOTER_H + (insets.bottom > 0 ? insets.bottom + SPACING.md : SPACING.md),
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderPagination}
        />
      </KeyboardAvoidingView>
      
      <View style={[
        styles.footerWrap, 
        { 
          bottom: insets.bottom,
          height: FOOTER_H 
        }
      ]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}

      {renderFilterModal()}
      
      {/* Logout Confirm Dialog */}
      <ConfirmDialog
        visible={confirmVisible}
        title="Confirm Logout"
        message="Are you sure you want to logout? This will clear your saved session."
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleLogout}
        confirmText="Logout"
      />
    </SafeAreaView>
  );
};

export default NursePatientsList;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerSection: {
    paddingHorizontal: moderateScale(16),
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(12),
    gap: moderateScale(12),
  },
  searchWrap: {
    height: moderateScale(48),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#111827',
    includeFontPadding: false,
    padding: 0,
    margin: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: moderateScale(12),
    alignItems: 'center',
  },
  wardFilterContainer: {
    flex: 1,
    height: moderateScale(48),
    borderWidth: 1.5,
    borderRadius: moderateScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  wardFilterIcon: {
    paddingHorizontal: moderateScale(12),
  },
  wardPickerWrapper: {
    flex: 1,
  },
  wardPicker: {
    flex: 1,
    height: moderateScale(48),
    marginLeft: moderateScale(4),
    marginRight: -moderateScale(16),
    marginTop: Platform.OS === "android" ? -4 : 0,
    color: '#111827',
    fontSize: moderateScale(14),
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    borderWidth: 1.5,
    height: moderateScale(48),
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: moderateScale(16),
    paddingTop: moderateScale(8),
  },
  card: {
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
    backgroundColor: '#F9FAFB',
  },
  patientImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(24),
  },
  meta: {
    flex: 1,
    minHeight: moderateScale(60),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moderateScale(4),
  },
  name: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: moderateScale(8),
  },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  bellButton: {
    padding: moderateScale(4),
  },
  bellWrapper: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -moderateScale(4),
    right: -moderateScale(4),
    backgroundColor: '#EF4444',
    borderRadius: moderateScale(10),
    minWidth: moderateScale(20),
    height: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationCount: {
    color: '#fff',
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  sub: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: moderateScale(2),
    lineHeight: moderateScale(16),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(8),
    gap: moderateScale(4),
    flexWrap: 'wrap',
  },
  dot: {
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  deviceBadge: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  patientType: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(6),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginLeft: moderateScale(8),
  },
  viewBtnText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#374151',
  },
  footerWrap: {
    left: 0,
    right: 0,
    justifyContent: "center",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  emptyWrap: {
    paddingVertical: moderateScale(80),
    alignItems: 'center',
    paddingHorizontal: moderateScale(16),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginTop: moderateScale(8),
    textAlign: 'center',
    marginBottom: moderateScale(16),
  },
  clearEmptyButton: {
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: '#14b8a6',
  },
  clearEmptyButtonText: {
    color: '#fff',
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: moderateScale(16),
    fontSize: moderateScale(16),
    color: '#14b8a6',
    fontWeight: '600',
  },
  pagination: {
    flexDirection: SCREEN_WIDTH < 375 ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: SCREEN_WIDTH < 375 ? 'stretch' : 'center',
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(12),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: SCREEN_WIDTH < 375 ? moderateScale(12) : 0,
  },
  resultsText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#111827',
    textAlign: SCREEN_WIDTH < 375 ? 'center' : 'left',
  },
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    justifyContent: SCREEN_WIDTH < 375 ? 'center' : 'flex-start',
  },
  pageInfo: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#111827',
  },
  pageButtons: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  pageBtn: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(24),
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10),
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalTitle: { 
    fontSize: moderateScale(18), 
    fontWeight: '800', 
    color: '#0b1220',
    marginBottom: moderateScale(8),
  },
  modalMsg: { 
    fontSize: moderateScale(14), 
    color: '#334155', 
    marginBottom: moderateScale(16),
    lineHeight: moderateScale(20),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: moderateScale(12),
  },
  modalBtn: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    minWidth: moderateScale(80),
    alignItems: 'center',
  },
  modalBtnGhost: {
    backgroundColor: '#f1f5f9',
  },
  modalBtnDanger: {
    backgroundColor: '#ef4444',
  },
  modalBtnText: {
    fontWeight: '700',
    fontSize: moderateScale(14),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: moderateScale(12),
    borderTopRightRadius: moderateScale(12),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalBody: {
    padding: moderateScale(24),
  },
  filterGroup: {
    marginBottom: moderateScale(24),
  },
  filterGroupTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
    marginBottom: moderateScale(12),
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(8),
    marginBottom: moderateScale(8),
    backgroundColor: '#F9FAFB',
  },
  filterOptionSelected: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  filterOptionText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  filterOptionTextSelected: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  selectedIndicator: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#14b8a6',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: moderateScale(24),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: moderateScale(12),
  },
  clearButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#EF4444',
  },
  applyButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: '#14b8a6',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#fff',
  },
});