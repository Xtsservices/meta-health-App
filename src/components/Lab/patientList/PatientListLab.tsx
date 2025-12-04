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
  Alert,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";
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

// Utils
import { 
  SPACING, 
  FONT_SIZE, 
  ICON_SIZE, 
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
  isTablet,
  isSmallDevice 
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { showError } from "../../../store/toast.slice";

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
  departmentID?: string;
  ward?: string;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const PAGE_SIZE = isTablet ? 15 : 10;
const FOOTER_H = FOOTER_HEIGHT;

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
  departmentName: string;
}> = ({ patient, onViewDetails, tabIndex, departmentName }) => {
  const getStatusText = (status?: string) => {
    return status?.charAt(0)?.toUpperCase() + status?.slice(1) || "Active";
  };

  const getPatientTypeText = (ptype?: number) => {
    switch (ptype) {
      case 1: return "IPD";
      case 2: return "OPD";
      case 3: return "Walk-In";
      default: return "--";
    }
  };

  const paddedId = String(patient?.id ?? "").padStart(4, "0");
  const name = patient?.pName?.charAt(0)?.toUpperCase() + patient?.pName?.slice(1) ?? 
               patient?.patientName?.charAt(0)?.toUpperCase() + patient?.patientName?.slice(1) ?? 
               "-- ";
  const phone = patient?.phoneNumber ?? patient?.phone ?? "—";
  const ward = patient?.ward_name ?? "—";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => onViewDetails(patient)}
    >
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          {patient?.photo ? (
            <Image
              source={{ uri: patient?.photo }}
              style={styles.avatarImage}
            />
          ) : (
            <UserIcon size={ICON_SIZE.md} color={COLORS.sub} />
          )}
        </View>

        <View style={styles.meta}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {name}
          </Text>

          <View style={styles.infoRow}>
            <Text
              style={styles.sub}
              numberOfLines={1}
            >
              ID: {paddedId}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.badge}>
              {getPatientTypeText(patient?.ptype)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <PhoneIcon size={FONT_SIZE.xs} color={COLORS.sub} />
            <Text style={styles.sub} numberOfLines={1}>
              {phone}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <DepartmentIcon size={FONT_SIZE.xs} color={COLORS.sub} />
            <Text style={styles.sub} numberOfLines={1}>
              {departmentName}
            </Text>
          </View>

          {ward !== "—" && (
            <View style={styles.detailRow}>
              <WardIcon size={FONT_SIZE.xs} color={COLORS.sub} />
              <Text style={styles.sub} numberOfLines={1}>
                {ward}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <StatusIcon size={FONT_SIZE.xs} color={COLORS.sub} />
            <GradientStatusBadge
              status={patient?.status ?? "active"}
              text={getStatusText(patient?.status)}
            />
          </View>

          {tabIndex === 1 && patient?._completedTime && (
            <View style={styles.detailRow}>
              <CalendarIcon size={FONT_SIZE.xs} color={COLORS.sub} />
              <Text style={styles.sub}>
                Completed: {formatDateTime(patient?._completedTime)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewBtn}
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails(patient);
          }}
        >
          <EyeIcon size={ICON_SIZE.sm} color={COLORS.text} />
          <Text style={styles.viewBtnText}>
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
  const [departmentNames, setDepartmentNames] = useState<{ [key: string]: string }>({});

  // Check authentication
  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        navigation.navigate("Login" as never);
        return false;
      }
      return true;
    } catch (error) {
      dispatch(showError("Authentication check failed"));
      return false;
    }
  }, [navigation, dispatch]);

  const totalItems = filteredData?.length ?? 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  
  const pagedData = filteredData?.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  ) ?? [];

  // Fetch department names
  const fetchDepartmentNames = useCallback(async (patients: PatientCardData[]) => {
    if (!patients || patients?.length === 0) return {};

    const token = await AsyncStorage.getItem("token");
    if (!token) return {};

    const newDepartmentNames: { [key: string]: string } = {};

    // Process each patient to get department name
    for (const patient of patients) {
      const departmentID = patient?.departmentID;
      
      if (departmentID && !newDepartmentNames[departmentID]) {
        try {
          const departmentData = await AuthFetch(
            `department/singledpt/${departmentID}`,
            token
          );
          
          // Handle different response structures
          let departmentName = "--";
          
          if (departmentData?.department?.[0]?.name) {
            departmentName = departmentData.department[0].name;
          } else if (departmentData?.data?.department?.[0]?.name) {
            departmentName = departmentData.data.department[0].name;
          } else if (departmentData?.name) {
            departmentName = departmentData.name;
          } else if (departmentData?.data?.name) {
            departmentName = departmentData.data.name;
          }
          
          newDepartmentNames[departmentID] = departmentName;
        } catch (error) {
          // Use existing department name as fallback
          newDepartmentNames[departmentID] = patient?.dept ?? patient?.departmentName ?? "--";
        }
      } else if (!departmentID) {
        // Use existing department name if no departmentID
        const patientKey = patient?.id?.toString();
        newDepartmentNames[patientKey] = patient?.dept ?? patient?.departmentName ?? "--";
      }
    }

    return newDepartmentNames;
  }, []);

  // Helper function to get department name for a patient
  const getDepartmentName = (patient: PatientCardData) => {
    if (!patient) return "--";
    
    const departmentID = patient?.departmentID;
    
    if (departmentID && departmentNames[departmentID]) {
      return departmentNames[departmentID];
    }
    
    // Fallback to existing department fields
    return patient?.dept ?? 
           patient?.departmentName ?? 
           patient?.department_name ?? 
           "--";
  };

  // Fetch patient list
  const getPatientList = useCallback(async (isRefresh = false) => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) return;

      let patientList: PatientCardData[] = [];

      if (patientType === 3) {
        // Walk-in patients
        const response = await AuthFetch(
          `test/getWalkinTaxinvoicePatientsData/${user.hospitalID}/${user.roleName}`,
          token
        );
        
        if (response?.data?.status === 200) {
          patientList = response?.data?.data ?? [];
        } else {
          dispatch(showError('Failed to fetch walk-in patients'));
        }
      } else {
        // Regular patients
        const response = await AuthFetch(
          `test/${user.roleName}/${user.hospitalID}/${user.id}/getAllPatient`,
          token
        );
        if (response?.data?.message === "success") {
          patientList = response?.data?.patientList ?? [];
          
          // Filter by patient type
          if (patientType === 1) { // IPD
            patientList = patientList?.filter((each: any) => each.patientStartStatus !== 1);
          } else if (patientType === 2) { // OPD
            patientList = patientList?.filter((each: any) => each.patientStartStatus === 1);
          }

          // For "All" type, fetch and merge walk-in patients
          if (patientType === 0) {
            const walkinResponse = await AuthFetch(
              `test/getWalkinTaxinvoicePatientsData/${user.hospitalID}/${user.roleName}`,
              token
            );
            if (walkinResponse?.data?.status === 200) {
              patientList = [...patientList, ...(walkinResponse?.data?.data ?? [])];
            }
          }
        } else {
          dispatch(showError('Failed to fetch patients'));
        }
      }

      // Add sortDate and sort by latest first
      const processedList = patientList?.map((p: any) => ({
        ...p,
        sortDate: new Date(p.updatedOn ?? p.addedOn ?? p.latestTestTime).getTime()
      })) ?? [];

      processedList?.sort((a: any, b: any) => b.sortDate - a.sortDate);
      setPatientData(processedList);

      // Fetch department names for the patient list
      const newDepartmentNames = await fetchDepartmentNames(processedList);
      setDepartmentNames(prev => ({ ...prev, ...newDepartmentNames }));

    } catch (error: any) {
      dispatch(showError(error?.message ?? 'Error fetching patients'));
      setPatientData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, patientType, dispatch, fetchDepartmentNames, checkAuth]);

  // Fetch completed reports
  const getReportsCompletedData = useCallback(async (isRefresh = false) => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) return;

      let patientList: PatientCardData[] = [];

      // Fetch Walk-in Patients if needed
      if (patientType === 3 || patientType === 0) {
        const walkinResponse = await AuthFetch(
          `test/${user.roleName}/${user.hospitalID}/${user.id}/getAllWalkinReportsCompletedPatients`,
          token
        );
        
        if (walkinResponse?.data?.message === "success") {
          const walkinPatients = (walkinResponse?.data?.patientList ?? [])?.map((p: any) => {
            const latestTest = p.testsList?.reduce((latest: any, test: any) => {
              if (test.completedTime && (!latest || new Date(test.completedTime) > new Date(latest))) {
                return test.completedTime;
              }
              return latest;
            }, null);
            
            return {
              ...p,
              _completedTime: latestTest ?? p.addedOn
            };
          });
          patientList = walkinPatients;
        }
      }

      // Fetch IPD & OPD Patients if needed
      if (patientType !== 3) {
        const response = await AuthFetch(
          `test/${user.roleName}/${user.hospitalID}/${user.id}/getAllReportsCompletedPatients`,
          token
        );
        if ("data" in response && response?.data?.message === "success") {
          let filteredList = response?.data?.patientList ?? [];

          // Filter by patient type
          if (patientType === 1) {
            filteredList = filteredList?.filter((each: any) => each.patientStartStatus !== 1);
          } else if (patientType === 2) {
            filteredList = filteredList?.filter((each: any) => each.patientStartStatus === 1);
          }

          const processedPatients = filteredList?.map((p: any) => ({
            ...p,
            _completedTime: p.completedTime ?? p.addedOn
          }));

          patientList = patientType === 0 ? [...patientList, ...processedPatients] : processedPatients;
        }
      }

      // Sort by _completedTime descending (latest first)
      patientList?.sort((a: any, b: any) => 
        new Date(b._completedTime).getTime() - new Date(a._completedTime).getTime()
      );

      setCompletedPatientData(patientList);

      // Fetch department names for the completed patient list
      const newDepartmentNames = await fetchDepartmentNames(patientList);
      setDepartmentNames(prev => ({ ...prev, ...newDepartmentNames }));

    } catch (error: any) {
      dispatch(showError(error?.message ?? 'Error fetching completed reports'));
      setCompletedPatientData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, patientType, dispatch, fetchDepartmentNames, checkAuth]);

  // Filter data based on search query
  useEffect(() => {
    const data = tabIndex === 0 ? patientData : completedPatientData;
    if (!searchQuery?.trim()) {
      setFilteredData(data);
    } else {
      const filtered = data?.filter(patient =>
        patient?.pName?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        patient?.patientName?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        
        patient?.phoneNumber?.includes(searchQuery) ||
        patient?.phone?.includes(searchQuery)
      );
      setFilteredData(filtered ?? []);
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
      newState.prescriptionURL = patient?.prescriptionURL ?? patient?.fileName;
    }

    // Different navigation based on tab index
    if (tabIndex === 1) {
      // For "Reports Completed" tab, navigate to ReportsLab
      navigation.navigate("ReportsLab", { state: newState });
    } else {
      // For "Confirmed Patient Care Alerts" tab, use existing navigation
      const route = departmentType === 'radiology' 
        ? "PatientDetailsRadio" 
        : "PatientDetailsLab";
      
      navigation.navigate(route, { state: newState });
    }
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
        <View style={styles.searchWrap}>
          <SearchIcon size={ICON_SIZE.sm} color={COLORS.sub} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search with mobile or name"
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <FilterIcon size={ICON_SIZE.sm} color={COLORS.brand} />
          <Text style={styles.filterButtonText}>
            Filter
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>
        No Patients Found
      </Text>
      <Text style={styles.emptySub}>
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

  const bottomPad = FOOTER_H + insets.bottom + SPACING.lg;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={styles.loadingText}>
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
        { paddingBottom: Math.max(insets.bottom, SPACING.sm) },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      
        {/* Tabs with Gradient */}
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
              departmentName={getDepartmentName(item)}
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
  safe: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  mainHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.brand,
  },
  backButton: {
    padding: SPACING.xs,
  },
  mainHeaderTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.buttonText,
  },
  headerRight: {
    width: 40,
  },
  // Enhanced Tab Styles with Gradient
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 12,
    padding: 4,
    shadowColor: COLORS.shadow,
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
    paddingVertical: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: "600",
    textAlign: "center",
  },
  tabTextActive: {
    color: COLORS.buttonText,
    fontWeight: "700",
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  controlsColumn: {
    gap: SPACING.sm,
  },
  searchWrap: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  filterButton: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  filterButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
    flexGrow: 1,
  },
  card: {
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  sub: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
    color: COLORS.sub,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  dot: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  badge: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.brand,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  // Gradient Status Badge Styles
  gradientStatusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradientStatusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  viewBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  emptyTitle: { 
    fontSize: FONT_SIZE.lg, 
    fontWeight: "700",
    color: COLORS.text 
  },
  emptySub: { 
    fontSize: FONT_SIZE.md, 
    marginTop: 6,
    color: COLORS.sub 
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { 
    marginTop: SPACING.sm, 
    fontSize: FONT_SIZE.md,
    color: COLORS.sub 
  },
  paginationWrapper: {
    paddingVertical: SPACING.sm,
  },
  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pageBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.pillBg,
  },
  pageBtnDisabled: {
    backgroundColor: COLORS.pill,
  },
  pageInfo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.text,
  },
  paginationButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.brand,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: Dimensions.get("window").height * 0.6,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.sub,
  },
  filterOptions: {
    padding: SPACING.lg,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.brandLight,
  },
  filterOptionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  filterOptionTextSelected: {
    color: COLORS.brand,
    fontWeight: "600",
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
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