// IPDPatientListScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Add these imports after your existing imports
import { Alert } from "react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";
// Import responsive utilities
import {
  SPACING,
  FONT_SIZE,
  isSmallDevice,
  responsiveFontSize,
  moderateScale,
  moderateVerticalScale,
  getSafeAreaInsets,
} from "../../utils/responsive";

// Import date utilities
import { formatDate, formatDateTime } from "../../utils/dateTime";

// Import custom icons
import {
  ArrowLeftIcon,
  SearchIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  DownloadIcon,
  BedIcon,
  UserMinusIcon,
  UserCheckIcon,
  PhoneIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  StethoscopeIcon,
  PillIcon,
} from "../../utils/SvgIcons";

import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { showError, showSuccess } from "../../store/toast.slice";

type RouteParams = {
  IPDPatientListScreen: {
    listType: 'total' | 'inpatients' | 'discharged';
    title: string;
  };
};

interface Patient {
  patientID: string;
  pName: string;
  age: string;
  gender: string;
  phoneNumber: string;
  patientTimeLineID: string;
  patientStartStatus: number;
  patientEndStatus: number | null;
  startTime: string;
  endTime: string | null;
  doctorName?: string;
  department?: string;
  ward?: string;
  bedNumber?: string;
  admissionDate?: string;
  dischargeDate?: string;
  imageURL?: string;
  diagnosis?: string;
  medications?: string[];
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

const IPDPatientListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'IPDPatientListScreen'>>();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const safeAreaInsets = getSafeAreaInsets();

  const { listType, title } = route.params;
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 20,
  });
  const [error, setError] = useState<string | null>(null);

  const getGenderString = (gender: number): string => {
    return gender === 1 ? "Male" : gender === 2 ? "Female" : "N/A";
  };

  const getPatientStatus = (startStatus: number, endStatus: number | null): string => {
    if (endStatus === 21) return "Discharged";
    if (endStatus === 2 || endStatus === null) {
      if (startStatus === 2) return "Inpatient";
      if (startStatus === 3) return "Emergency";
    }
    return "Active";
  };

  const getStatusColor = (startStatus: number, endStatus: number | null) => {
    if (endStatus === 21) return { bg: "#FEF3C7", text: "#92400E", icon: UserMinusIcon };
    if (endStatus === 2 || endStatus === null) {
      if (startStatus === 2) return { bg: "#DBEAFE", text: "#1E40AF", icon: BedIcon };
      if (startStatus === 3) return { bg: "#FEE2E2", text: "#991B1B", icon: UserIcon };
    }
    return { bg: "#D1FAE5", text: "#065F46", icon: UserCheckIcon };
  };

  const fetchPatients = async (page: number = 1, isRefresh: boolean = false) => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' as never }],
          });
        }, 2000);
        return;
      }

      if (!user?.hospitalID) {
        setError("Missing authentication credentials");
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);

      const url = `patient/${user.hospitalID}/patients/calendarCards/list?type=${listType}&page=${page}&limit=${pagination.limit}`;
      
      const response = await AuthFetch(url, token) as any;
      
      if (response?.message === "success" || response?.status === "success") {
        const patientsData = Array.isArray(response?.data) ? response.data : 
                           Array.isArray(response?.data?.data) ? response?.data?.data : [];
        
        const transformedPatients: Patient[] = patientsData?.map?.(
          (item: any, index: number) => ({
            patientID: item?.patientID?.toString() ?? `IPD-${index}`,
            pName: item?.pName || item?.name || "Unknown",
            age: item?.age?.toString() ?? "N/A",
            gender: getGenderString(item?.gender ?? 0),
            phoneNumber: item?.phoneNumber || "N/A",
            patientTimeLineID: item?.patientTimeLineID?.toString() ?? "",
            patientStartStatus: item?.patientStartStatus ?? 0,
            patientEndStatus: item?.patientEndStatus ?? null,
            startTime: item?.startTime || item?.admissionDate || "",
            endTime: item?.endTime || item?.dischargeDate || null,
            doctorName: item?.doctorName || item?.treatingDoctor || "N/A",
            department: item?.department || item?.ward || "General",
            ward: item?.ward || item?.wardName || "N/A",
            bedNumber: item?.bedNumber || item?.bed || "N/A",
            admissionDate: item?.startTime || item?.admissionDate || "",
            dischargeDate: item?.endTime || item?.dischargeDate || null,
            imageURL: item?.imageURL || item?.profileImage,
            diagnosis: item?.diagnosis || item?.primaryDiagnosis || "Not specified",
            medications: item?.medications || item?.prescribedMeds || [],
          })
        ) || [];

        setPatients(transformedPatients);

        const totalRecords = response?.data?.totalRecords || response?.total || transformedPatients?.length || 0;
        const currentPageNum = response?.data?.currentPage || response?.page || page;
        const totalPages = response?.data?.totalPages || Math.ceil(totalRecords / pagination.limit);

        setPagination({
          currentPage: currentPageNum,
          totalPages: totalPages,
          totalRecords: totalRecords,
          limit: response?.limit || pagination.limit,
        });

        if (transformedPatients?.length === 0) {
          setError(`No ${listType} patients found`);
        }
      } else {
        const errorMessage = response?.message || "Invalid response format from server";
        setError(errorMessage);
        setPatients([]);
        setPagination(prev => ({ ...prev, totalRecords: 0, totalPages: 1 }));
        dispatch(showError(errorMessage));
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch IPD patients";
      setError(errorMsg);
      setPatients([]);
      setPagination(prev => ({ ...prev, totalRecords: 0, totalPages: 1 }));
      dispatch(showError(errorMsg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients(1);
  }, [listType]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
      fetchPatients(newPage);
    }
  };

  const getSerialNumber = (index: number) => {
    return (pagination.currentPage - 1) * pagination.limit + index + 1;
  };

  const onRefresh = () => {
    fetchPatients(1, true);
  };

const exportToCSV = async () => {
  if (patients?.length === 0) {
    dispatch(showError("No data to export"));
    return;
  }

  try {
    setLoading(true);
    
    // Create CSV headers based on list type
    let headers;
    
    if (listType === 'discharged') {
      headers = [
        "Sr.No",
        "Patient ID",
        "Patient Name",
        "Age",
        "Gender",
        "Phone Number",
        "Status",
        "Ward",
        "Bed Number",
        "Doctor",
        "Department",
        "Admission Date",
        "Discharge Date",
        "Diagnosis"
      ];
    } else {
      headers = [
        "Sr.No",
        "Patient ID",
        "Patient Name",
        "Age",
        "Gender",
        "Phone Number",
        "Status",
        "Ward",
        "Bed Number",
        "Doctor",
        "Department",
        "Admission Date",
        "Diagnosis"
      ];
    }

    // Create CSV rows
    const rows = patients.map((patient, index) => {
      const serialNumber = (pagination.currentPage - 1) * pagination.limit + index + 1;
      const status = getPatientStatus(patient?.patientStartStatus, patient?.patientEndStatus);
      
      if (listType === 'discharged') {
        return [
          serialNumber,
          patient.patientID || "N/A",
          patient.pName || "Unknown",
          patient.age || "N/A",
          patient.gender || "N/A",
          patient.phoneNumber || "N/A",
          status,
          patient.ward || "N/A",
          patient.bedNumber || "N/A",
          patient.doctorName || "N/A",
          patient.department || "N/A",
          patient.startTime ? formatDateTime(patient.startTime, "Asia/Kolkata") : "N/A",
          patient.endTime ? formatDateTime(patient.endTime, "Asia/Kolkata") : "N/A",
          patient.diagnosis || "Not specified"
        ];
      } else {
        return [
          serialNumber,
          patient.patientID || "N/A",
          patient.pName || "Unknown",
          patient.age || "N/A",
          patient.gender || "N/A",
          patient.phoneNumber || "N/A",
          status,
          patient.ward || "N/A",
          patient.bedNumber || "N/A",
          patient.doctorName || "N/A",
          patient.department || "N/A",
          patient.startTime ? formatDateTime(patient.startTime, "Asia/Kolkata") : "N/A",
          patient.diagnosis || "Not specified"
        ];
      }
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Create filename based on list type
    let fileName = "";
    switch (listType) {
      case 'total':
        fileName = `total_ipd_patients_${Date.now()}.csv`;
        break;
      case 'inpatients':
        fileName = `active_inpatients_${Date.now()}.csv`;
        break;
      case 'discharged':
        fileName = `discharged_patients_${Date.now()}.csv`;
        break;
      default:
        fileName = `ipd_patients_${Date.now()}.csv`;
    }
    
    // Clean filename
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    
    // Determine file path based on platform
    let filePath;
    if (Platform.OS === "android") {
      // For Android, use Download directory
      filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
    } else {
      // For iOS, use Document directory
      filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    }

    // Write file
    await RNFS.writeFile(filePath, csvContent, "utf8");

    // Share the file
    const shareOptions = {
      title: `Export ${title}`,
      message: `Here is the export of ${title}`,
      url: Platform.OS === "android" ? `file://${filePath}` : filePath,
      type: "text/csv",
      filename: fileName,
      failOnCancel: false,
    };

    await Share.open(shareOptions);
    
    dispatch(showSuccess(`${title} exported successfully to ${fileName}`));
    
  } catch (err: any) {
    console.error("Export error:", err);
    const errorMsg = err?.message || "Failed to export CSV file";
    dispatch(showError(errorMsg));
    Alert.alert("Export Failed", errorMsg);
  } finally {
    setLoading(false);
  }
};

  const handleBack = () => {
    navigation.goBack();
  };
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? Math.max(40, insets.top) : 20 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <ArrowLeftIcon size={24} color="#0b1220" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          <Text style={styles.subtitle}>
            Total {pagination.totalRecords} patients
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.actionButton, (loading || patients.length === 0) && styles.actionButtonDisabled]}
          onPress={exportToCSV}
          disabled={loading || patients.length === 0}
        >
          <DownloadIcon size={20} color={loading || patients.length === 0 ? "#94a3b8" : "#0b1220"} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <SearchIcon size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search patients..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderPatientItem = ({ item, index }: { item: Patient; index: number }) => {
    const statusInfo = getStatusColor(item?.patientStartStatus, item?.patientEndStatus);
    const StatusIcon = statusInfo.icon;
    
    return (
      <TouchableOpacity 
        style={styles.patientCard}
        onPress={() => {
          // Navigate to patient details
        }}
        activeOpacity={0.9}
      >
        <View style={styles.serialNumberContainer}>
          <Text style={styles.serialNumber}>{getSerialNumber(index)}</Text>
        </View>

        <View style={styles.patientInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.patientName} numberOfLines={1}>
              {item?.pName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <StatusIcon size={12} color={statusInfo.text} />
              <Text style={[styles.statusText, { color: statusInfo.text }]}>
                {getPatientStatus(item?.patientStartStatus, item?.patientEndStatus)}
              </Text>
            </View>
          </View>

          <View style={styles.idRow}>
            <Text style={styles.patientId}>ID: {item?.patientID}</Text>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Age:</Text>
              <Text style={styles.detailValue}>{item?.age}</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Gender:</Text>
              <Text style={styles.detailValue}>{item?.gender}</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{item?.phoneNumber || "--"}</Text>
            </View>
          </View>

          <View style={styles.hospitalRow}>
            <View style={styles.hospitalInfo}>
              <MapPinIcon size={14} color="#64748b" />
              <Text style={styles.hospitalText}>
                {item?.ward || item?.department || "General"}
              </Text>
            </View>
            
            {item?.bedNumber && (
              <>
                <Text style={styles.dotSeparator}>•</Text>
                <View style={styles.hospitalInfo}>
                  <BedIcon size={14} color="#64748b" />
                  <Text style={styles.hospitalText}>Bed {item?.bedNumber}</Text>
                </View>
              </>
            )}
            
            {item?.doctorName && (
              <>
                <Text style={styles.dotSeparator}>•</Text>
                <View style={styles.hospitalInfo}>
                  <StethoscopeIcon size={14} color="#64748b" />
                  <Text style={styles.hospitalText} numberOfLines={1}>{item?.doctorName}</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <ClockIcon size={14} color="#64748b" />
              <Text style={styles.timelineLabel}>Admission:</Text>
              <Text style={styles.timelineValue}>
                {formatDateTime(item?.startTime, "Asia/Kolkata")}
              </Text>
            </View>
            
            {listType === 'discharged' && item?.endTime && (
              <View style={styles.timelineItem}>
                <ClockIcon size={14} color="#64748b" />
                <Text style={styles.timelineLabel}>Discharge:</Text>
                <Text style={styles.timelineValue}>
                  {formatDateTime(item?.endTime, "Asia/Kolkata")}
                </Text>
              </View>
            )}
          </View>

          {item?.diagnosis && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Diagnosis:</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{item?.diagnosis}</Text>
            </View>
          )}

          {item?.medications && item?.medications?.length > 0 && (
            <View style={styles.medicationRow}>
              <PillIcon size={14} color="#64748b" />
              <Text style={styles.medicationText} numberOfLines={1}>
                {item?.medications?.slice?.(0, 3)?.join?.(", ")}
                {item?.medications?.length > 3 ? ` +${item?.medications?.length - 3} more` : ""}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (pagination.totalRecords === 0) return null;

    return (
      <View style={styles.paginationContainer}>
        <Text style={styles.paginationInfoText}>
          Showing {Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.totalRecords)} to{" "}
          {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)} of{" "}
          {pagination.totalRecords} entries
        </Text>
        
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.paginationButton, pagination.currentPage === 1 && styles.paginationButtonDisabled]}
            onPress={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
          >
            <ChevronLeftIcon size={20} color={pagination.currentPage === 1 ? "#cbd5e1" : "#0b1220"} />
          </TouchableOpacity>
          
          <View style={styles.pageNumbers}>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (pagination.totalPages > 5) {
                if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
              }
              
              return (
                <TouchableOpacity
                  key={pageNum}
                  style={[
                    styles.pageNumberButton,
                    pagination.currentPage === pageNum && styles.activePageNumber
                  ]}
                  onPress={() => handlePageChange(pageNum)}
                >
                  <Text style={[
                    styles.pageNumberText,
                    pagination.currentPage === pageNum && styles.activePageNumberText
                  ]}>
                    {pageNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <TouchableOpacity
            style={[styles.paginationButton, pagination.currentPage === pagination.totalPages && styles.paginationButtonDisabled]}
            onPress={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
          >
            <ChevronRightIcon size={20} color={pagination.currentPage === pagination.totalPages ? "#cbd5e1" : "#0b1220"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Unable to Load Data</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchPatients(1)}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <UsersIcon size={60} color="#cbd5e1" />
      <Text style={styles.emptyStateTitle}>No patients found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 
          "No patients match your search. Try different keywords." : 
          `No ${listType} patients available.`
        }
      </Text>
    </View>
  );

  const filteredPatients = patients?.filter?.(patient => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      patient?.pName?.toLowerCase()?.includes(query) ||
      patient?.patientID?.toLowerCase()?.includes(query) ||
      patient?.phoneNumber?.includes(query) ||
      patient?.doctorName?.toLowerCase()?.includes(query) ||
      patient?.department?.toLowerCase()?.includes(query) ||
      patient?.ward?.toLowerCase()?.includes(query)
    );
  }) || [];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading IPD patients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      
      <View style={styles.container}>
        {error && !loading ? (
          renderError()
        ) : filteredPatients.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredPatients}
            renderItem={renderPatientItem}
            keyExtractor={(item, index) => `${item?.patientID}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={renderPagination}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#14b8a6']}
                tintColor="#14b8a6"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: moderateScale(SPACING.md),
    paddingBottom: moderateScale(SPACING.sm),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(2),
    shadowOffset: { width: 0, height: moderateScale(2) },
    elevation: 2,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateVerticalScale(SPACING.md),
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(8),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: moderateScale(SPACING.sm),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  headerTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: "800",
    color: "#0b1220",
    textAlign: "center",
  },
  subtitle: {
    fontSize: responsiveFontSize(12),
    color: "#64748b",
    textAlign: "center",
    marginTop: moderateScale(2),
  },
  actionButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(8),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  actionButtonDisabled: {
    backgroundColor: "#f8fafc",
    opacity: 0.5,
  },
  searchContainer: {
    marginTop: moderateVerticalScale(SPACING.xs),
  },
  searchWrap: {
    height: moderateScale(48),
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(SPACING.sm),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: "#334155",
    includeFontPadding: false,
    paddingVertical: 0,
  },
  clearSearchText: {
    fontSize: moderateScale(16),
    color: "#94a3b8",
    fontWeight: "300",
    padding: moderateScale(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingBottom: moderateVerticalScale(80),
  },
  loadingText: {
    marginTop: moderateVerticalScale(SPACING.md),
    fontSize: FONT_SIZE.md,
    color: "#64748b",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: moderateScale(SPACING.xl),
    backgroundColor: "#f8fafc",
    paddingBottom: moderateVerticalScale(80),
  },
  errorTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: "#334155",
    marginTop: moderateVerticalScale(SPACING.md),
    marginBottom: moderateVerticalScale(SPACING.xs),
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    textAlign: "center",
    lineHeight: moderateScale(20),
    maxWidth: "80%",
    marginBottom: moderateVerticalScale(SPACING.md),
  },
  retryButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: moderateScale(SPACING.lg),
    paddingVertical: moderateScale(SPACING.sm),
    borderRadius: moderateScale(8),
    marginTop: moderateVerticalScale(SPACING.md),
  },
  retryButtonText: {
    color: "#fff",
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: moderateScale(SPACING.xl),
    backgroundColor: "#f8fafc",
    paddingBottom: moderateVerticalScale(80),
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: "#334155",
    marginTop: moderateVerticalScale(SPACING.md),
    marginBottom: moderateVerticalScale(SPACING.xs),
  },
  emptyStateText: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    textAlign: "center",
    lineHeight: moderateScale(20),
    maxWidth: "80%",
  },
  listContent: {
    padding: moderateScale(SPACING.md),
    paddingBottom: moderateVerticalScale(SPACING.xl + 80),
  },
  patientCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(SPACING.sm),
    marginBottom: moderateVerticalScale(SPACING.sm),
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    shadowOffset: { width: 0, height: moderateScale(2) },
    elevation: 2,
  },
  serialNumberContainer: {
    width: moderateScale(40),
    alignItems: "center",
    justifyContent: "center",
    marginRight: moderateScale(SPACING.sm),
  },
  serialNumber: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: "#64748b",
  },
  patientInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: moderateScale(4),
  },
  patientName: {
    fontSize: isSmallDevice ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: "700",
    color: "#0b1220",
    flex: 1,
    marginRight: moderateScale(SPACING.xs),
  },
  idRow: {
    marginBottom: moderateScale(6),
  },
  patientId: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
    alignSelf: 'flex-start',
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(8),
    flexWrap: "wrap",
    gap: moderateScale(4),
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(2),
  },
  detailLabel: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: FONT_SIZE.sm,
    color: "#334155",
    fontWeight: "500",
  },
  dotSeparator: {
    fontSize: FONT_SIZE.sm,
    color: "#cbd5e1",
    marginHorizontal: moderateScale(4),
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: moderateScale(8),
    marginBottom: moderateScale(8),
    backgroundColor: "#f8fafc",
    padding: moderateScale(8),
    borderRadius: moderateScale(8),
  },
  hospitalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
  },
  hospitalText: {
    fontSize: FONT_SIZE.xs,
    color: "#334155",
    fontWeight: "500",
  },
  timeline: {
    marginBottom: moderateScale(8),
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    marginBottom: moderateScale(4),
  },
  timelineLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: moderateScale(2),
  },
  timelineValue: {
    fontSize: FONT_SIZE.xs,
    color: "#334155",
    fontWeight: "500",
  },
  infoRow: {
    marginBottom: moderateScale(6),
  },
  infoLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: moderateScale(2),
  },
  infoValue: {
    fontSize: FONT_SIZE.sm,
    color: "#334155",
    fontWeight: "500",
    lineHeight: moderateScale(18),
  },
  medicationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: "#F0FDF4",
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
    alignSelf: 'flex-start',
  },
  medicationText: {
    fontSize: FONT_SIZE.xs,
    color: "#065F46",
    fontWeight: "500",
  },
  paginationContainer: {
    paddingTop: moderateVerticalScale(SPACING.lg),
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    marginTop: moderateVerticalScale(SPACING.sm),
  },
  paginationInfoText: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    textAlign: "center",
    marginBottom: moderateVerticalScale(SPACING.md),
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(SPACING.xs),
  },
  paginationButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(6),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  paginationButtonDisabled: {
    backgroundColor: "#f8fafc",
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: "row",
    gap: moderateScale(SPACING.xs),
  },
  pageNumberButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(6),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  activePageNumber: {
    backgroundColor: "#14b8a6",
  },
  pageNumberText: {
    fontSize: FONT_SIZE.sm,
    color: "#334155",
    fontWeight: "500",
  },
  activePageNumberText: {
    color: "#fff",
  },
});

export default IPDPatientListScreen;