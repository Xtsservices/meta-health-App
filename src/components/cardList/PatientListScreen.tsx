// OPDTriagePatientListScreen.tsx
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
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isSmallDevice,
  SPACING,
  FONT_SIZE,
  responsiveFontSize,
  moderateScale,
  moderateVerticalScale,
  getSafeAreaInsets,
  wp,
  hp,
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
  UserIcon,
  AlertTriangleIcon,
  ClockIcon,
  StethoscopeIcon,
  PhoneIcon,
  MapPinIcon,
} from "../../utils/SvgIcons";

import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { patientStatus } from "../../utils/role";
import { showError, showSuccess } from "../../store/toast.slice";

type RouteParams = {
  OPDTriagePatientList: {
    listType: 'today' | 'month' | 'year' | 'appointment';
    title: string;
    zoneType?: 'emergencyred' | 'emergencyyellow' | 'emergencygreen' | 'triage';
    emergencyTime?: 'today' | 'appointment' | 'month' | 'year';
  };
};

interface Patient {
  id: string;
  name: string;
  age: string;
  gender: string;
  visit_date: string;
  doctor: string;
  patient_id: string;
  phone: string;
  pName?: string;
  patientID?: string;
  doctorName?: string;
  phoneNumber?: string;
  zone?: number;
  startTime?: string;
  department?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

const OPDTriagePatientListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'OPDTriagePatientList'>>();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const safeAreaInsets = getSafeAreaInsets();

  const { 
    listType = 'today', 
    title, 
    zoneType, 
    emergencyTime = 'today' 
  } = route.params;
  
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

  const isTriage = zoneType === 'triage';
  const isEmergency = !isTriage && zoneType;

  const getGenderString = (gender: number): string => {
    return gender === 1 ? "Male" : gender === 2 ? "Female" : "N/A";
  };

  const getApiType = (): string => {
    if (isTriage || isEmergency) {
      switch (emergencyTime) {
        case 'today': return 'today';
        case 'appointment': return 'appointments';
        case 'month': return 'month';
        case 'year': return 'year';
        default: return 'today';
      }
    }
    
    switch (listType) {
      case 'today': return 'today';
      case 'appointment': return 'appointments';
      case 'month': return 'month';
      case 'year': return 'year';
      default: return 'today';
    }
  };

  const getEmergencyZone = (): number | string | null => {
    if (isTriage) {
      return "1,2,3";
    }
    
    if (zoneType) {
      switch (zoneType) {
        case 'emergencyred':
          return 1;
        case 'emergencyyellow':
          return 2;
        case 'emergencygreen':
          return 3;
        default:
          return null;
      }
    }
    return null;
  };

  const getZoneColor = (zone?: number) => {
    switch (zone) {
      case 1:
        return { bg: "#FEE2E2", text: "#991B1B", label: "Red Zone" };
      case 2:
        return { bg: "#FEF3C7", text: "#92400E", label: "Yellow Zone" };
      case 3:
        return { bg: "#D1FAE5", text: "#065F46", label: "Green Zone" };
      default:
        return { bg: "#E5E7EB", text: "#374151", label: "No Zone" };
    }
  };

  const fetchPatients = async (page: number = 1, isRefresh: boolean = false) => {
    try {
      const token = await AsyncStorage.getItem("token");
      
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

      let url = "";
      const apiType = getApiType();
      const zoneValue = getEmergencyZone();

      if (isTriage) {
        url = `patient/${user.hospitalID}/patients/list/visit?ptype=${patientStatus.emergency}&type=${apiType}&zone=${zoneValue}&page=${page}&limit=${pagination.limit}`;
      } else if (isEmergency) {
        url = `patient/${user.hospitalID}/patients/list/visit?ptype=${patientStatus.emergency}&type=${apiType}&zone=${zoneValue}&page=${page}&limit=${pagination.limit}`;
      } else {
        url = `patient/${user.hospitalID}/patients/list/visit?ptype=${patientStatus.outpatient}&type=${apiType}&page=${page}&limit=${pagination.limit}`;
      }

      const response = await AuthFetch(url, token) as any;
      
      if (response?.message === "success" || response?.status === "success") {
        const patientsData = Array.isArray(response?.data) ? response.data : 
                           Array.isArray(response?.data?.data) ? response?.data?.data : [];
        
        const transformedPatients: Patient[] = patientsData?.map?.(
          (item: any, index: number) => ({
            id: item?.patientID?.toString() ?? `patient-${index}`,
            name: item?.pName || item?.name || "Unknown",
            age: item?.age?.toString() ?? "N/A",
            gender: getGenderString(item?.gender ?? 0),
            visit_date: item?.visitDate || item?.startTime || "",
            doctor: item?.doctorName || "N/A",
            patient_id: item?.patientID?.toString() ?? "N/A",
            phone: item?.phoneNumber || "N/A",
            pName: item?.pName || item?.name || "Unknown",
            patientID: item?.patientID?.toString(),
            doctorName: item?.doctorName || "N/A",
            phoneNumber: item?.phoneNumber || "N/A",
            zone: item?.zone || (isEmergency ? getEmergencyZone() as number : undefined),
            startTime: item?.startTime || item?.visitDate || "",
            department: item?.department || (isEmergency ? "Emergency" : "OPD"),
          })
        ) || [];

        setPatients(transformedPatients);

        const responseData = response?.data || response;
        const totalRecords = responseData?.total || responseData?.totalRecords || 0;
        const currentPageNum = responseData?.page || responseData?.currentPage || page;
        const responseLimit = responseData?.limit || pagination.limit;
        const totalPages = responseData?.totalPages || Math.ceil(totalRecords / responseLimit) || 1;

        setPagination({
          currentPage: currentPageNum,
          totalPages: totalPages,
          totalRecords: totalRecords,
          limit: responseLimit,
        });

        setError(null);
        
      } else {
        const errorMessage = response?.message || "Invalid response format from server";
        setError(errorMessage);
        setPatients([]);
        setPagination(prev => ({ ...prev, totalRecords: 0, totalPages: 1 }));
        dispatch(showError(errorMessage));
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch patients";
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
  }, [listType, zoneType, emergencyTime]);

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
  if (patients.length === 0) {
    dispatch(showError("No data to export"));
    return;
  }

  try {
    setLoading(true);
    
    // Create CSV headers
    const headers = [
      "Sr.No",
      "Patient ID",
      "Patient Name",
      "Age",
      "Gender",
      "Phone",
      "Doctor",
      "Department",
      "Zone",
      "Visit Date",
      "Visit Time",
      "Status"
    ];

    // Create CSV rows
    const rows = patients.map((patient, index) => {
      // Determine zone label
      let zoneLabel = "N/A";
      if (patient.zone) {
        switch(patient.zone) {
          case 1: zoneLabel = "Red Zone"; break;
          case 2: zoneLabel = "Yellow Zone"; break;
          case 3: zoneLabel = "Green Zone"; break;
          default: zoneLabel = `Zone ${patient.zone}`;
        }
      }

      // Determine status
      let status = "";
      if (isTriage) {
        status = "Triage";
      } else if (isEmergency) {
        status = "Emergency";
      } else {
        status = "OPD";
      }

      return [
        index + 1,
        patient.patient_id || "N/A",
        patient.name || "Unknown",
        patient.age || "N/A",
        patient.gender || "N/A",
        patient.phone || "N/A",
        patient.doctor || "N/A",
        patient.department || (isEmergency ? "Emergency" : "OPD"),
        zoneLabel,
        formatDate(patient.visit_date, "Asia/Kolkata"),
        patient.startTime ? formatDateTime(patient.startTime, "Asia/Kolkata") : "N/A",
        status
      ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Create filename based on list type
    const fileName = `${title.replace(/\s+/g, '_').toLowerCase()}_patients_${Date.now()}.csv`;
    
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
      title: "Export Patients",
      message: `Here is the export of ${title}`,
      url: Platform.OS === "android" ? `file://${filePath}` : filePath,
      type: "text/csv",
      filename: fileName,
      failOnCancel: false,
    };

    await Share.open(shareOptions);
    
    dispatch(showSuccess(`Patients exported successfully to ${fileName}`));
    
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

  const renderZoneBadge = (zone?: number) => {
    if (!zone) return null;
    
    const zoneInfo = getZoneColor(zone);
    
    return (
      <View style={[styles.zoneBadge, { backgroundColor: zoneInfo.bg }]}>
        <Text style={[styles.zoneBadgeText, { color: zoneInfo.text }]}>
          {zoneInfo.label}
        </Text>
      </View>
    );
  };

  const renderPatientItem = ({ item, index }: { item: Patient; index: number }) => {
    const zoneInfo = getZoneColor(item?.zone);
    
    return (
      <TouchableOpacity 
        style={styles.patientCard}
        onPress={() => {
          // Navigate to patient details if needed
        }}
        activeOpacity={0.9}
      >
        <View style={styles.serialNumberContainer}>
          <Text style={styles.serialNumber}>{getSerialNumber(index)}</Text>
        </View>

        <View style={styles.patientInfo}>
          <View style={styles.headerRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.patientName} numberOfLines={1}>
                {item?.name}
              </Text>
              {!isTriage && !isEmergency && (
                <View style={styles.patientIdContainer}>
                  <Text style={styles.patientId}>
                    ID: {item?.patient_id}
                  </Text>
                </View>
              )}
            </View>
            
            {isTriage || isEmergency ? (
              renderZoneBadge(item?.zone)
            ) : null}
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age:</Text>
              <Text style={styles.detailValue}>{item?.age}</Text>
            </View>
            
            <View style={styles.separatorDot}>•</View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gender:</Text>
              <Text style={styles.detailValue}>{item?.gender}</Text>
            </View>
          
          </View>

          <View style={styles.doctorRow}>
            <StethoscopeIcon size={14} color="#64748b" />
            <Text style={styles.doctorText} numberOfLines={1}>
              Dr. {item?.doctor}
            </Text>
          </View>

          {(isTriage || isEmergency) && (
            <View style={styles.departmentRow}>
              <MapPinIcon size={14} color="#64748b" />
              <Text style={styles.departmentText}>
                {item?.department || "Emergency"}
                {item?.zone && ` • Zone ${item?.zone}`}
              </Text>
            </View>
          )}

          <View style={styles.timeline}>
            <View style={styles.timelineRow}>
              <CalendarIcon size={14} color="#64748b" />
              <Text style={styles.timelineLabel}>Visit:</Text>
              <Text style={styles.timelineValue}>
                {formatDate(item?.visit_date, "Asia/Kolkata")}
              </Text>
            </View>
            
            {item?.startTime && (
              <View style={styles.timelineRow}>
                <ClockIcon size={14} color="#64748b" />
                <Text style={styles.timelineLabel}>Time:</Text>
                <Text style={styles.timelineValue}>
                  {formatDateTime(item?.startTime, "Asia/Kolkata")}
                </Text>
              </View>
            )}
          </View>

          {item?.phoneNumber && item?.phoneNumber !== "N/A" && (
            <View style={styles.contactRow}>
              <PhoneIcon size={14} color="#64748b" />
              <Text style={styles.contactText}>{item?.phoneNumber}</Text>
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
          "No patients available in this category."
        }
      </Text>
    </View>
  );

  const filteredPatients = patients?.filter?.(patient => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      patient?.name?.toLowerCase()?.includes(query) ||
      patient?.patient_id?.toLowerCase()?.includes(query) ||
      patient?.phone?.toLowerCase()?.includes(query) ||
      patient?.doctor?.toLowerCase()?.includes(query)
    );
  }) || [];


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {/* {renderHeader()} */}
      
      <View style={styles.container}>
        {error && !loading ? (
          renderError()
        ) : filteredPatients.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredPatients}
            renderItem={renderPatientItem}
            keyExtractor={(item, index) => `${item?.id}-${index}`}
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
  // Updated header row in patient card
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: moderateScale(6),
  },
  nameContainer: {
    flex: 1,
    marginRight: moderateScale(SPACING.xs),
  },
  patientName: {
    fontSize: isSmallDevice ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: "700",
    color: "#0b1220",
    marginBottom: moderateScale(2),
  },
  patientIdContainer: {
    alignSelf: "flex-start",
  },
  patientId: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
  },
  zoneBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(6),
    minWidth: moderateScale(90),
    alignItems: "center",
    justifyContent: "center",
  },
  zoneBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  // Updated details grid for proper alignment
  detailsGrid: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(8),
    flexWrap: "wrap",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    fontWeight: "500",
    marginRight: moderateScale(2),
    minWidth: moderateScale(35), // Fixed width for labels
  },
  detailValue: {
    fontSize: FONT_SIZE.sm,
    color: "#334155",
    fontWeight: "500",
    flexShrink: 1,
  },
  separatorDot: {
    fontSize: FONT_SIZE.sm,
    color: "#cbd5e1",
    marginHorizontal: moderateScale(6),
  },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(6),
    backgroundColor: "#F0F9FF",
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
  },
  doctorText: {
    fontSize: FONT_SIZE.sm,
    color: "#0369A1",
    fontWeight: "500",
    marginLeft: moderateScale(4),
    flex: 1,
  },
  departmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(6),
    backgroundColor: "#F8FAFC",
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
  },
  departmentText: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: moderateScale(4),
    flex: 1,
  },
  timeline: {
    marginBottom: moderateScale(8),
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(4),
  },
  timelineLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: moderateScale(4),
    marginRight: moderateScale(6),
    width: moderateScale(35), // Fixed width for timeline labels
  },
  timelineValue: {
    fontSize: FONT_SIZE.xs,
    color: "#334155",
    fontWeight: "500",
    flex: 1,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
  },
  contactText: {
    fontSize: FONT_SIZE.xs,
    color: "#334155",
    fontWeight: "500",
    marginLeft: moderateScale(4),
    flex: 1,
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

export default OPDTriagePatientListScreen;