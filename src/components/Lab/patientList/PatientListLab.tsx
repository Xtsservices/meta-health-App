// screens/PatientListLab.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  TextInput,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";
import { showError, showSuccess } from '../../../store/toast.slice';
import LinearGradient from 'react-native-linear-gradient';

// Icons
import {
  ArrowLeftIcon,
  FilterIcon,
  SearchIcon,
  UserIcon,
  PhoneIcon,
  DepartmentIcon,
  WardIcon,
  StatusIcon,
  EyeIcon,
  CalendarIcon,
} from "../../../utils/SvgIcons";
import Footer from "../../dashboard/footer";

// Types
type PatientCardData = {
  id: number;
  patientID?: string;
  pID?: string;
  pName?: string;
  patientName?: string;
  phoneNumber?: string;
  phone?: string;
  ptype?: number;
  departmentName?: string;
  department_name?: string;
  dept?: string;
  doctorName?: string;
  doctor_firstName?: string;
  doctor_lastName?: string;
  alertTimestamp?: string;
  addedOn?: string;
  createdAt?: string;
  timestamp?: string;
  prescriptionURL?: string;
  fileName?: string;
  timeLineID?: number;
  isFromAlert?: boolean;
  photo?: string;
  age?: number;
  ward_name?: string;
  status?: string;
  patientStartStatus?: number;
  testsList?: any[];
  completedTime?: string;
  _completedTime?: string;
  updatedOn?: string;
  latestTestTime?: string;
  lastModified?: string;
  sortDate?: number;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const PAGE_SIZE = 10;
const FOOTER_H = 70;

// Colors
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  placeholder: "#94a3b8",
  gradientStart: "#14b8a6",
  gradientEnd: "#0d9488",
  gradientWarningStart: "#f59e0b",
  gradientWarningEnd: "#ea580c",
  gradientSuccessStart: "#10b981",
  gradientSuccessEnd: "#059669",
  gradientProcessingStart: "#3b82f6",
  gradientProcessingEnd: "#1d4ed8",
};

// Gradient Status Badge Component
const GradientStatusBadge: React.FC<{
  status: string;
  text: string;
}> = ({ status, text }) => {
  const getGradientColors = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return [COLORS.gradientSuccessStart, COLORS.gradientSuccessEnd];
      case "pending":
        return [COLORS.gradientWarningStart, COLORS.gradientWarningEnd];
      case "active":
      case "processing":
        return [COLORS.gradientProcessingStart, COLORS.gradientProcessingEnd];
      default:
        return [COLORS.sub, COLORS.sub];
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors(status)}
      style={styles.gradientStatusBadge}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text style={styles.gradientStatusText}>{text}</Text>
    </LinearGradient>
  );
};

// Filter Modal Component
const FilterModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  patientType: number;
  onPatientTypeChange: (type: number) => void;
}> = ({ visible, onClose, patientType, onPatientTypeChange }) => {
  const options = [
    { value: 0, label: "All Patients" },
    { value: 1, label: "Inpatient Services" },
    { value: 2, label: "Outpatient Care" },
    { value: 3, label: "Walk-In" },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter Patients</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterOptions}>
            {options?.map((option) => (
              <TouchableOpacity
                key={option?.value}
                style={[
                  styles.filterOption,
                  patientType === option?.value && styles.filterOptionSelected,
                ]}
                onPress={() => {
                  onPatientTypeChange(option?.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    patientType === option?.value && styles.filterOptionTextSelected,
                  ]}
                >
                  {option?.label}
                </Text>
                {patientType === option?.value && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Patient Row Component
const PatientRow: React.FC<{
  patient: PatientCardData;
  onViewDetails: (patient: PatientCardData) => void;
  tabIndex: number;
}> = ({ patient, onViewDetails, tabIndex }) => {
  const getStatusText = (status?: string) => {
    return status?.charAt(0)?.toUpperCase() + status?.slice(1) || "Active";
  };

  const getPatientTypeText = (ptype?: number) => {
    switch (ptype) {
      case 1: return "IPD";
      case 2: return "OPD";
      case 3: return "Walk-In";
      default: return "Unknown";
    }
  };

  const paddedId = String(patient?.id ?? "").padStart(4, "0");
  const name = patient?.pName?.charAt(0)?.toUpperCase() + patient?.pName?.slice(1) || 
               patient?.patientName?.charAt(0)?.toUpperCase() + patient?.patientName?.slice(1) || 
               "Unknown Patient";
  const phone = patient?.phoneNumber || patient?.phone || "—";
  const department = patient?.department_name || patient?.departmentName || patient?.dept || "—";
  const ward = patient?.ward_name || "—";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.card,
        { backgroundColor: COLORS.card, borderColor: COLORS.border },
      ]}
      onPress={() => onViewDetails(patient)}
    >
      <View style={styles.cardRow}>
        <View
          style={[
            styles.avatar,
            { borderColor: COLORS.border, backgroundColor: COLORS.bg },
          ]}
        >
          {patient?.photo ? (
            <Image
              source={{ uri: patient?.photo }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 40,
              }}
            />
          ) : (
            <UserIcon size={28} color={COLORS.sub} />
          )}
        </View>

        <View style={styles.meta}>
          <Text
            style={[styles.name, { color: COLORS.text }]}
            numberOfLines={1}
          >
            {name}
          </Text>

          <View style={styles.infoRow}>
            <Text
              style={[styles.sub, { color: COLORS.sub }]}
              numberOfLines={1}
            >
              ID: {paddedId}
            </Text>
            <Text style={[styles.dot, { color: COLORS.sub }]}>•</Text>
            <Text style={[styles.badge, { color: COLORS.brand }]}>
              {getPatientTypeText(patient?.ptype)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <PhoneIcon size={14} color={COLORS.sub} />
            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              {phone}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <DepartmentIcon size={14} color={COLORS.sub} />
            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              {department}
            </Text>
          </View>

          {ward !== "—" && (
            <View style={styles.detailRow}>
              <WardIcon size={14} color={COLORS.sub} />
              <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
                {ward}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <StatusIcon size={14} color={COLORS.sub} />
            <GradientStatusBadge
              status={patient?.status || "active"}
              text={getStatusText(patient?.status)}
            />
          </View>

          {tabIndex === 1 && patient?._completedTime && (
            <View style={styles.detailRow}>
              <CalendarIcon size={14} color={COLORS.sub} />
              <Text style={[styles.sub, { color: COLORS.sub }]}>
                Completed: {formatDateTime(patient?._completedTime)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.viewBtn, { borderColor: COLORS.border }]}
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails(patient);
          }}
        >
          <EyeIcon size={18} color={COLORS.text} />
          <Text style={[styles.viewBtnText, { color: COLORS.text }]}>
            View
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// Main Component
const PatientListLab: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const departmentType = user?.roleName === 'radiology' ? 'radiology' : 'pathology';

  const [patientData, setPatientData] = useState<PatientCardData[]>([]);
  const [completedPatientData, setCompletedPatientData] = useState<PatientCardData[]>([]);
  const [filteredData, setFilteredData] = useState<PatientCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [patientType, setPatientType] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = filteredData?.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  
  const pagedData = filteredData?.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Fetch patient list - EXACT SAME LOGIC AS WEB
  const getPatientList = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) return;

      let patientList: PatientCardData[] = [];

      if (patientType === 3) {
        // Walk-in patients - EXACT SAME AS WEB
        const response = await AuthFetch(
          `test/getWalkinTaxinvoicePatientsData/${user.hospitalID}/${user.roleName}`,
          token
        );
        
        if (response?.data?.status === 200) {
          patientList = response?.data?.data || [];
        } else {
          dispatch(showError('Failed to fetch walk-in patients'));
        }
      } else {
        // Regular patients - EXACT SAME AS WEB
        const response = await AuthFetch(
          `test/${user.roleName}/${user.hospitalID}/${user.id}/getAllPatient`,
          token
        );
        
        if (response?.data?.message === "success") {
          patientList = response?.data?.patientList || [];
          
          // Filter by patient type - EXACT SAME AS WEB
          if (patientType === 1) { // IPD
            patientList = patientList.filter((each: any) => each.patientStartStatus !== 1);
          } else if (patientType === 2) { // OPD
            patientList = patientList.filter((each: any) => each.patientStartStatus === 1);
          }

          // For "All" type, fetch and merge walk-in patients - EXACT SAME AS WEB
          if (patientType === 0) {
            const walkinResponse = await AuthFetch(
              `test/getWalkinTaxinvoicePatientsData/${user.hospitalID}/${user.roleName}`,
              token
            );
            if (walkinResponse?.data?.status === 200) {
              patientList = [...patientList, ...(walkinResponse?.data?.data || [])];
            }
          }
        } else {
          dispatch(showError('Failed to fetch patients'));
        }
      }

      // Add sortDate and sort by latest first - EXACT SAME AS WEB
      const processedList = patientList.map((p: any) => ({
        ...p,
        sortDate: new Date(p.updatedOn || p.addedOn || p.latestTestTime).getTime()
      }));

      processedList.sort((a: any, b: any) => b.sortDate - a.sortDate);
      setPatientData(processedList);

    } catch (error: any) {
      dispatch(showError(error?.message || 'Error fetching patients'));
      setPatientData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, patientType, dispatch]);

  // Fetch completed reports - EXACT SAME LOGIC AS WEB
  const getReportsCompletedData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) return;

      let patientList: PatientCardData[] = [];

      // Fetch Walk-in Patients if needed - EXACT SAME AS WEB
      if (patientType === 3 || patientType === 0) {
        const walkinResponse = await AuthFetch(
          `test/${user.roleName}/${user.hospitalID}/${user.id}/getAllWalkinReportsCompletedPatients`,
          token
        );
        
        if (walkinResponse?.data?.message === "success") {
          const walkinPatients = (walkinResponse?.data?.patientList || []).map((p: any) => {
            const latestTest = p.testsList?.reduce((latest: any, test: any) => {
              if (test.completedTime && (!latest || new Date(test.completedTime) > new Date(latest))) {
                return test.completedTime;
              }
              return latest;
            }, null);
            
            return {
              ...p,
              _completedTime: latestTest || p.addedOn
            };
          });
          patientList = walkinPatients;
        }
      }

      // Fetch IPD & OPD Patients if needed - EXACT SAME AS WEB
      if (patientType !== 3) {
        const response = await AuthFetch(
          `test/${user.roleName}/${user.hospitalID}/${user.id}/getAllReportsCompletedPatients`,
          token
        );

        if (response?.data?.message === "success") {
          let filteredList = response?.data?.patientList || [];

          // Filter by patient type - EXACT SAME AS WEB
          if (patientType === 1) {
            filteredList = filteredList.filter((each: any) => each.patientStartStatus !== 1);
          } else if (patientType === 2) {
            filteredList = filteredList.filter((each: any) => each.patientStartStatus === 1);
          }

          const processedPatients = filteredList.map((p: any) => ({
            ...p,
            _completedTime: p.completedTime || p.addedOn
          }));

          patientList = patientType === 0 ? [...patientList, ...processedPatients] : processedPatients;
        }
      }

      // Sort by _completedTime descending (latest first) - EXACT SAME AS WEB
      patientList.sort((a: any, b: any) => 
        new Date(b._completedTime).getTime() - new Date(a._completedTime).getTime()
      );

      setCompletedPatientData(patientList);
    } catch (error: any) {
      dispatch(showError(error?.message || 'Error fetching completed reports'));
      setCompletedPatientData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, patientType, dispatch]);

  // Filter data based on search query
  useEffect(() => {
    const data = tabIndex === 0 ? patientData : completedPatientData;
    if (!searchQuery?.trim()) {
      setFilteredData(data);
    } else {
      const filtered = data?.filter(patient =>
        patient?.pName?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        patient?.patientName?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        patient?.patientID?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        patient?.pID?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        patient?.phoneNumber?.includes(searchQuery) ||
        patient?.phone?.includes(searchQuery)
      );
      setFilteredData(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, patientData, completedPatientData, tabIndex]);

  // Load data when dependencies change
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (tabIndex === 0) {
        await getPatientList(isRefresh);
      } else {
        await getReportsCompletedData(isRefresh);
      }
    } catch (error) {
      dispatch(showError('Error loading patient data'));
    }
  }, [getPatientList, getReportsCompletedData, tabIndex, dispatch]);

  useEffect(() => {
    if (user?.hospitalID) {
      loadData();
    }
  }, [user, loadData]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const handleViewDetails = (patient: PatientCardData) => {
    const idToPass = patient?.prescriptionURL || patient?.fileName
      ? patient?.id
      : patient?.timeLineID;

    const newState: {
      timeLineID: number | undefined;
      prescriptionURL?: string;
      tab?: string;
      patientData?: PatientCardData;
    } = {
      timeLineID: idToPass,
      tab: tabIndex === 0 ? "normal" : "completed",
      patientData: patient,
    };

    if (patient?.prescriptionURL || patient?.fileName) {
      newState.prescriptionURL = patient?.prescriptionURL || patient?.fileName;
    }

    const route = departmentType === 'radiology' 
      ? "PatientDetailsRadio" 
      : "PatientDetailsLab";
    
    navigation.navigate(route, { state: newState });
  };

  const handlePatientTypeChange = (type: number) => {
    setPatientType(type);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const onRefresh = () => {
    loadData(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.controlsColumn}>
        {/* Search */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: COLORS.card, borderColor: COLORS.border },
          ]}
        >
          <SearchIcon size={18} color={COLORS.sub} />
          <TextInput
            placeholder="Search by name or mobile"
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: COLORS.text }]}
          />
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: COLORS.card, borderColor: COLORS.border },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <FilterIcon size={18} color={COLORS.brand} />
          <Text style={[styles.filterButtonText, { color: COLORS.text }]}>
            Filter
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyTitle, { color: COLORS.text }]}>
        No Patients Found
      </Text>
      <Text style={[styles.emptySub, { color: COLORS.sub }]}>
        Try adjusting filters or search terms.
      </Text>
    </View>
  );

  const renderPagination = () => {
    if (filteredData?.length <= PAGE_SIZE || totalPages <= 1) return null;

    return (
      <View style={styles.paginationWrapper}>
        <View style={styles.paginationBar}>
          <TouchableOpacity
            onPress={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            style={[
              styles.pageBtn,
              currentPage === 1 && styles.pageBtnDisabled,
            ]}
          >
            <Text style={styles.paginationButtonText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </Text>

          <TouchableOpacity
            onPress={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={[
              styles.pageBtn,
              currentPage === totalPages && styles.pageBtnDisabled,
            ]}
          >
            <Text style={styles.paginationButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const bottomPad = FOOTER_H + insets.bottom + 24;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={[styles.loadingText, { color: COLORS.sub }]}>
            Loading patients…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: COLORS.bg, paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      
        {/* Tabs with Gradient - EXACT SAME AS WEB */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tabIndex === 0 && styles.tabActive]}
            onPress={() => {
              setTabIndex(0);
              setCurrentPage(1);
            }}
          >
            {tabIndex === 0 ? (
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.tabGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>
                  Confirmed Patient Care Alerts
                </Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.tabText, { color: COLORS.sub }]}>
                Confirmed Patient Care Alerts
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, tabIndex === 1 && styles.tabActive]}
            onPress={() => {
              setTabIndex(1);
              setCurrentPage(1);
            }}
          >
            {tabIndex === 1 ? (
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.tabGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>
                  Reports Completed
                </Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.tabText, { color: COLORS.sub }]}>
                Reports Completed
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {renderHeader()}

        <FlatList
          data={pagedData}
          keyExtractor={(item, index) => `${item?.id}-${index}`}
          renderItem={({ item }) => (
            <PatientRow
              patient={item}
              onViewDetails={handleViewDetails}
              tabIndex={tabIndex}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderPagination}
          scrollIndicatorInsets={{ bottom: bottomPad }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.brand]}
              tintColor={COLORS.brand}
            />
          }
        />
      </KeyboardAvoidingView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        patientType={patientType}
        onPatientTypeChange={handlePatientTypeChange}
      />
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  mainHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#14b8a6",
  },
  backButton: {
    padding: 8,
  },
  mainHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerRight: {
    width: 40,
  },
  // Enhanced Tab Styles with Gradient
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabActive: {
    // Gradient handled by LinearGradient component
  },
  tabGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  tabTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  controlsColumn: {
    gap: 10,
  },
  searchWrap: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  filterButton: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  dot: {
    fontSize: 12,
  },
  badge: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  // Gradient Status Badge Styles
  gradientStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradientStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 14, marginTop: 6 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 15 },
  paginationWrapper: {
    paddingVertical: 12,
  },
  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ecfeff",
  },
  pageBtnDisabled: {
    backgroundColor: "#f1f5f9",
  },
  pageInfo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  paginationButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#14b8a6",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: Dimensions.get("window").height * 0.6,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#64748b",
  },
  filterOptions: {
    padding: 20,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: "#f0fdfa",
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  filterOptionTextSelected: {
    color: "#14b8a6",
    fontWeight: "600",
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#14b8a6",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
});

export default PatientListLab;