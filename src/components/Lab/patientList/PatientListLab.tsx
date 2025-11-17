// PatientListLab.tsx
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
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";
import { showError } from '../../../store/toast.slice';

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
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const PAGE_SIZE = 10;
const FOOTER_H = 70;

// --- Colors (static, used everywhere) ---
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  placeholder: "#94a3b8",
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
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "active":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status?: string) => {
    return status?.charAt(0)?.toUpperCase() + status?.slice(1) || "Active";
  };

  const getPatientTypeText = (ptype?: number) => {
    switch (ptype) {
      case 1: return "OPD";
      case 2: return "IPD";
      case 3: return "Emergency";
      case 21: return "Discharged";
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
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(patient?.status) }]}>
              <Text style={styles.statusText}>
                {getStatusText(patient?.status)}
              </Text>
            </View>
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

  // Fetch patient list using the correct API structure
  const getPatientList = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) return;

      let endpoint = '';
      let response;

      if (patientType === 3) {
        endpoint = `test/getWalkinTaxinvoicePatientsData/${user?.hospitalID}/${user?.roleName}`;
        response = await AuthFetch(endpoint, token);
        
        if (response?.status === "success" && response?.data?.status === 200) {
          setPatientData(response?.data?.data || []);
        } else {
          dispatch(showError('Failed to fetch walk-in patients'));
          setPatientData([]);
        }
      } else {
        // Regular patients
        endpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/getAllPatient`;
        response = await AuthFetch(endpoint, token);
        
        if (response?.data?.message === "success") {
          let patients = response?.data?.patientList || [];
          
          // Apply additional filtering for IPD/OPD if needed
          if (patientType === 1) { // IPD
            patients = patients?.filter((each: any) => each?.patientStartStatus !== 1);
          } else if (patientType === 2) { // OPD
            patients = patients?.filter((each: any) => each?.patientStartStatus === 1);
          }
          
          setPatientData(patients);
        } else {
          dispatch(showError('Failed to fetch patients'));
          setPatientData([]);
        }

        // For "All" type, also fetch walk-in patients
        if (patientType === 0) {
          const walkinResponse = await AuthFetch(
            `test/getWalkinTaxinvoicePatientsData/${user?.hospitalID}/${user?.roleName}`,
            token
          );
          if (walkinResponse?.status === "success" && walkinResponse?.data?.status === 200) {
            const allPatients = [...patientData, ...(walkinResponse?.data?.data || [])];
            setPatientData(allPatients);
          }
        }
      }
    } catch (error: any) {
      dispatch(showError(error?.message || 'Error fetching patients'));
      setPatientData([]);
    }
  }, [user, patientType, dispatch]);

  // Fetch completed reports using the correct API structure
  const getReportsCompletedData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) return;

      let endpoint = '';
      let response;

      if (patientType === 3 || patientType === 0) {
        // Walk-in completed patients
        endpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/getAllWalkinReportsCompletedPatients`;
        response = await AuthFetch(endpoint, token);
        
        if (response?.status === "success" && response?.data?.message === "success") {
          const walkinPatients = (response?.data?.patientList || [])?.map((p: any) => ({
            ...p,
            _completedTime: p?.completedTime || p?.addedOn
          }));
          setCompletedPatientData(walkinPatients);
        }
      }

      if (patientType !== 3) {
        // Regular completed patients
        endpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/getAllReportsCompletedPatients`;
        response = await AuthFetch(endpoint, token);
        
        if (response?.status === "success" && response?.data?.message === "success") {
          let completedPatients = response?.data?.patientList || [];

          // Filter by patient type
          if (patientType === 1) {
            completedPatients = completedPatients?.filter((each: any) => each?.patientStartStatus !== 1);
          } else if (patientType === 2) {
            completedPatients = completedPatients?.filter((each: any) => each?.patientStartStatus === 1);
          }

          const processedPatients = completedPatients?.map((p: any) => ({
            ...p,
            _completedTime: p?.completedTime || p?.addedOn
          }));

          if (patientType === 0) {
            // Merge with walk-in completed patients
            setCompletedPatientData(prev => [...prev, ...processedPatients]);
          } else {
            setCompletedPatientData(processedPatients);
          }
        }
      }
    } catch (error: any) {
      dispatch(showError(error?.message || 'Error fetching completed reports'));
      setCompletedPatientData([]);
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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([getPatientList(), getReportsCompletedData()]);
      } catch (error) {
        dispatch(showError('Error loading patient data'));
      } finally {
        setLoading(false);
      }
    };

    if (user?.hospitalID) {
      loadData();
    }
  }, [getPatientList, getReportsCompletedData, user, dispatch]);

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

  // ---- header with search + filter ----
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
            <Text style={styles.paginationButtonText}>
              ‹
            </Text>
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
            <Text style={styles.paginationButtonText}>
              ›
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // bottom padding so last card + pagination stay above footer & system nav
  const bottomPad = FOOTER_H + insets.bottom + 24;

  if (loading) {
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
        {/* Header */}
        <View style={styles.mainHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeftIcon size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.mainHeaderTitle}>Patient Database</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tabIndex === 0 && styles.tabActive]}
            onPress={() => setTabIndex(0)}
          >
            <Text style={[styles.tabText, tabIndex === 0 && styles.tabTextActive]}>
              Confirmed Patient Care Alerts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tabIndex === 1 && styles.tabActive]}
            onPress={() => setTabIndex(1)}
          >
            <Text style={[styles.tabText, tabIndex === 1 && styles.tabTextActive]}>
              Reports Completed
            </Text>
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
        />
      </KeyboardAvoidingView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        patientType={patientType}
        onPatientTypeChange={handlePatientTypeChange}
      />
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

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#14b8a6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  tabTextActive: {
    color: "#14b8a6",
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
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

  // Pagination
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

  // Modal styles
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
});

export default PatientListLab;