// NursePatientListScreen.tsx
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
// Add these imports after your existing imports
import { Alert } from "react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";
// Import custom icons
import {
  ArrowLeftIcon,
  SearchIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  DownloadIcon,
  UserCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  FilterIcon,
} from "../../utils/SvgIcons";

import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { showError, showSuccess } from "../../store/toast.slice";

type RouteParams = {
  NursePatientsList: {
    type: 'active' | 'discharged' | 'followup' | 'medicineAlerts';
  };
};

interface Patient {
  patientID: string;
  pName: string;
  age: string;
  gender: number;
  ptype: number;
  addedOn: string;
  ward?: string;
  bed?: string;
  doctorName?: string;
  admissionDate?: string;
  dischargeDate?: string;
  followUpDate?: string;
  alertMessage?: string;
  alertTime?: string;
  priority?: "high" | "medium" | "low";
  phoneNumber?: string;
  patientStartStatus?: number;
  patientEndStatus?: number | null;
  zone?: number | null;
  medicineID?: number;
  medicineName?: string;
  dosageTime?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

const NursePatientListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'NursePatientsList'>>();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const safeAreaInsets = getSafeAreaInsets();

  const listType = route.params?.type || "active";
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 20,
  });

  const getTitle = (): string => {
    const titles: Record<string, string> = {
      active: "Active Patients",
      discharged: "Discharged Patients",
      followup: "Follow-up Patients",
      medicineAlerts: "Medicine Alerts",
    };
    return titles[listType] || "Patients List";
  };

  const getPatientType = (ptype: number): string => {
    const types: Record<number, string> = {
      1: "OPD",
      2: "IPD",
      3: "Emergency",
      21: "Discharged",
    };
    return types[ptype] || "--";
  };

  const getGender = (gender: number): string => {
    return gender === 1 ? "Male" : gender === 2 ? "Female" : "N/A";
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return { bg: "#FEE2E2", color: "#991B1B" };
      case "medium":
        return { bg: "#FEF3C7", color: "#92400E" };
      case "low":
        return { bg: "#D1FAE5", color: "#065F46" };
      default:
        return { bg: "#E5E7EB", color: "#374151" };
    }
  };

  const getIcon = () => {
    if (listType === 'active') return <UserCheckIcon size={20} color="#14b8a6" />;
    if (listType === 'discharged') return <CheckCircleIcon size={20} color="#10B981" />;
    if (listType === 'followup') return <CalendarIcon size={20} color="#EA580C" />;
    if (listType === 'medicineAlerts') return <AlertTriangleIcon size={20} color="#D97706" />;
    return <UsersIcon size={20} color="#14b8a6" />;
  };

  const mapApiResponseToPatient = (item: any, type: string): Patient => {
    switch (type) {
      case "medicineAlerts":
        return {
          patientID: item?.patientID?.toString() || "",
          pName: item?.pName || "",
          age: item?.age?.toString() || "",
          gender: item?.gender || 0,
          ptype: item?.ptype || 0,
          addedOn: item?.dosageTime || "",
          ward: item?.wardID?.toString() || "",
          phoneNumber: item?.phoneNumber || "",
          medicineID: item?.medicineID,
          medicineName: item?.medicineName || "",
          dosageTime: item?.dosageTime || "",
          alertTime: item?.dosageTime || "",
          alertMessage: item?.medicineName || "",
          patientStartStatus: item?.patientStartStatus,
          patientEndStatus: item?.patientEndStatus,
          zone: item?.zone,
        };

      case "discharged":
        return {
          patientID: item?.id?.toString() || "",
          pName: item?.pName || "",
          age: item?.age?.toString() || "",
          gender: item?.gender || 0,
          ptype: item?.ptype || 0,
          addedOn: item?.endTime || "",
          dischargeDate: item?.endTime || "",
          ward: item?.wardID?.toString() || "",
          phoneNumber: item?.phoneNumber || "",
          patientStartStatus: item?.patientStartStatus,
          patientEndStatus: item?.patientEndStatus,
          zone: item?.zone,
        };

      case "followup":
        return {
          patientID: item?.id?.toString() || "",
          pName: item?.pName || "",
          age: item?.age?.toString() || "",
          gender: item?.gender || 0,
          ptype: item?.ptype || 0,
          addedOn: item?.appointmentDate || "",
          followUpDate: item?.followUpDate || "",
          ward: item?.wardID?.toString() || "",
          phoneNumber: item?.phoneNumber || "",
          patientStartStatus: item?.patientStartStatus,
          patientEndStatus: item?.patientEndStatus,
          zone: item?.zone,
        };

      case "active":
      default:
        return {
          patientID: item?.id?.toString() || "",
          pName: item?.pName || "",
          age: item?.age?.toString() || "",
          gender: item?.gender || 0,
          ptype: item?.ptype || 0,
          addedOn: item?.startTime || "",
          ward: item?.wardID?.toString() || "",
          phoneNumber: item?.phoneNumber || "",
          patientStartStatus: item?.patientStartStatus,
          patientEndStatus: item?.patientEndStatus,
          zone: item?.zone,
        };
    }
  };

  const fetchPatients = async (page: number = 1, isRefresh: boolean = false) => {
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

    if (!user?.hospitalID || !user?.role) {
      dispatch(showError("Missing authentication credentials"));
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const url = `nurse/getnursedashboardlists/${user.hospitalID}/${user.role}?type=${listType}&page=${page}&limit=${pagination.limit}`;

      const response = await AuthFetch(url, token) as any;
      
      if (response?.data?.data?.list && Array.isArray(response.data.data.list)) {
        const patientData = response?.data?.data?.list?.map?.((item: any) => 
          mapApiResponseToPatient(item, listType)
        ) || [];

        const totalCount = response?.data?.data?.total || patientData?.length || 0;
        const totalPagesCount = response?.data?.data?.totalPages || Math.ceil(totalCount / pagination.limit);

        setPatients(patientData);
        setPagination({
          currentPage: page,
          totalPages: totalPagesCount,
          total: totalCount,
          limit: pagination.limit,
        });
      } else {
        const errorMsg = "No data available";
        dispatch(showError(errorMsg));
        setPatients([]);
        setPagination(prev => ({ ...prev, total: 0, totalPages: 1 }));
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch patient list";
      dispatch(showError(errorMsg));
      setPatients([]);
      setPagination(prev => ({ ...prev, total: 0, totalPages: 1 }));
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
    
    switch (listType) {
      case 'active':
        headers = [
          "Sr.No",
          "Patient ID",
          "Patient Name",
          "Age",
          "Gender",
          "Patient Type",
          "Ward",
          "Phone Number",
          "Admission Date",
          "Zone"
        ];
        break;
        
      case 'discharged':
        headers = [
          "Sr.No",
          "Patient ID",
          "Patient Name",
          "Age",
          "Gender",
          "Patient Type",
          "Ward",
          "Phone Number",
          "Discharge Date",
          "Zone"
        ];
        break;
        
      case 'followup':
        headers = [
          "Sr.No",
          "Patient ID",
          "Patient Name",
          "Age",
          "Gender",
          "Patient Type",
          "Ward",
          "Phone Number",
          "Follow-up Date",
          "Zone"
        ];
        break;
        
      case 'medicineAlerts':
        headers = [
          "Sr.No",
          "Patient ID",
          "Patient Name",
          "Age",
          "Gender",
          "Medicine Name",
          "Dosage Time",
          "Priority",
          "Ward",
          "Phone Number",
          "Zone"
        ];
        break;
        
      default:
        headers = [
          "Sr.No",
          "Patient ID",
          "Patient Name",
          "Age",
          "Gender",
          "Patient Type",
          "Date",
          "Phone Number"
        ];
    }

    // Create CSV rows
    const rows = patients.map((patient, index) => {
      const serialNumber = (pagination.currentPage - 1) * pagination.limit + index + 1;
      
      switch (listType) {
        case 'active':
          return [
            serialNumber,
            patient.patientID || "N/A",
            patient.pName || "Unknown",
            patient.age || "N/A",
            getGender(patient.gender),
            getPatientType(patient.ptype),
            patient.ward || "N/A",
            patient.phoneNumber || "N/A",
            patient.addedOn ? formatDateTime(patient.addedOn, "Asia/Kolkata") : "N/A",
            patient.zone || "N/A"
          ];
          
        case 'discharged':
          return [
            serialNumber,
            patient.patientID || "N/A",
            patient.pName || "Unknown",
            patient.age || "N/A",
            getGender(patient.gender),
            getPatientType(patient.ptype),
            patient.ward || "N/A",
            patient.phoneNumber || "N/A",
            patient.dischargeDate ? formatDateTime(patient.dischargeDate, "Asia/Kolkata") : "N/A",
            patient.zone || "N/A"
          ];
          
        case 'followup':
          return [
            serialNumber,
            patient.patientID || "N/A",
            patient.pName || "Unknown",
            patient.age || "N/A",
            getGender(patient.gender),
            getPatientType(patient.ptype),
            patient.ward || "N/A",
            patient.phoneNumber || "N/A",
            patient.followUpDate ? formatDateTime(patient.followUpDate, "Asia/Kolkata") : "N/A",
            patient.zone || "N/A"
          ];
          
        case 'medicineAlerts':
          return [
            serialNumber,
            patient.patientID || "N/A",
            patient.pName || "Unknown",
            patient.age || "N/A",
            getGender(patient.gender),
            patient.medicineName || "N/A",
            patient.dosageTime ? formatDateTime(patient.dosageTime, "Asia/Kolkata") : "N/A",
            patient.priority || "low",
            patient.ward || "N/A",
            patient.phoneNumber || "N/A",
            patient.zone || "N/A"
          ];
          
        default:
          return [
            serialNumber,
            patient.patientID || "N/A",
            patient.pName || "Unknown",
            patient.age || "N/A",
            getGender(patient.gender),
            getPatientType(patient.ptype),
            patient.addedOn ? formatDateTime(patient.addedOn, "Asia/Kolkata") : "N/A",
            patient.phoneNumber || "N/A"
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
      case 'active':
        fileName = `active_patients_${Date.now()}.csv`;
        break;
      case 'discharged':
        fileName = `discharged_patients_${Date.now()}.csv`;
        break;
      case 'followup':
        fileName = `followup_patients_${Date.now()}.csv`;
        break;
      case 'medicineAlerts':
        fileName = `medicine_alerts_${Date.now()}.csv`;
        break;
      default:
        fileName = `nurse_patients_${Date.now()}.csv`;
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
      title: `Export ${getTitle()}`,
      message: `Here is the export of ${getTitle()}`,
      url: Platform.OS === "android" ? `file://${filePath}` : filePath,
      type: "text/csv",
      filename: fileName,
      failOnCancel: false,
    };

    await Share.open(shareOptions);
    
    dispatch(showSuccess(`${getTitle()} exported successfully to ${fileName}`));
    
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
            {getIcon()}
            <Text style={styles.headerTitle}>{getTitle()}</Text>
          </View>
          <Text style={styles.subtitle}>
            Total {pagination.total} records
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

  const renderPatientTypeBadge = (ptype: number) => {
    const typeText = getPatientType(ptype);
    const isDischarged = ptype === 21;
    
    return (
      <View style={[
        styles.typeBadge,
        { backgroundColor: isDischarged ? "#D1FAE5" : "#E0F2FE" }
      ]}>
        <Text style={[
          styles.typeBadgeText,
          { color: isDischarged ? "#065F46" : "#0369A1" }
        ]}>
          {typeText}
        </Text>
      </View>
    );
  };

  const renderPriorityBadge = (priority?: string) => {
    const priorityStyle = getPriorityColor(priority);
    
    return (
      <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
        <Text style={[styles.priorityBadgeText, { color: priorityStyle.color }]}>
          {priority || "low"}
        </Text>
      </View>
    );
  };

  const renderPatientItem = ({ item, index }: { item: Patient; index: number }) => (
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
        <View style={styles.nameRow}>
          <Text style={styles.patientName} numberOfLines={1}>
            {item?.pName}
          </Text>
          <Text style={styles.patientId}>
            ID: {item?.patientID}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Age:</Text>
            <Text style={styles.detailValue}>{item?.age || "--"}</Text>
          </View>
          <Text style={styles.dotSeparator}>•</Text>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Gender:</Text>
            <Text style={styles.detailValue}>{getGender(item?.gender)}</Text>
          </View>
          <Text style={styles.dotSeparator}>•</Text>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Type:</Text>
            {renderPatientTypeBadge(item?.ptype)}
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <CalendarIcon size={14} color="#64748b" />
            <Text style={styles.timeText}>
              Added: {formatDateTime(item?.addedOn, "Asia/Kolkata")}
            </Text>
          </View>
        </View>

        {listType === "active" && item?.ward && (
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ward:</Text>
              <Text style={styles.detailValue}>{item?.ward || "--"}</Text>
            </View>
          </View>
        )}

        {listType === "discharged" && item?.dischargeDate && (
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Discharge Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(item?.dischargeDate, "Asia/Kolkata")}
              </Text>
            </View>
          </View>
        )}

        {listType === "followup" && item?.followUpDate && (
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Follow-up Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(item?.followUpDate, "Asia/Kolkata")}
              </Text>
            </View>
          </View>
        )}

        {listType === "medicineAlerts" && (
          <>
            {item?.medicineName && (
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Medicine:</Text>
                  <Text style={styles.detailValue}>{item?.medicineName}</Text>
                </View>
              </View>
            )}
            
            {item?.dosageTime && (
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Dosage Time:</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(item?.dosageTime, "Asia/Kolkata")}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Priority:</Text>
                {renderPriorityBadge(item?.priority)}
              </View>
            </View>
          </>
        )}

        {item?.phoneNumber && (
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{item?.phoneNumber}</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPagination = () => {
    if (pagination.total === 0) return null;

    return (
      <View style={styles.paginationContainer}>
        <Text style={styles.paginationInfoText}>
          Showing {Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.total)} to{" "}
          {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of{" "}
          {pagination.total} entries
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
      <Text style={styles.errorText}>Please try again</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchPatients(1)}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <UsersIcon size={60} color="#cbd5e1" />
      <Text style={styles.emptyStateTitle}>No records found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 
          "No patients match your search. Try different keywords." : 
          "No data available for this category."
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
      patient?.medicineName?.toLowerCase()?.includes(query) ||
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
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      
      <View style={styles.container}>
        {patients?.length === 0 ? (
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
    marginBottom: moderateScale(8),
  },
  patientName: {
    fontSize: isSmallDevice ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: "700",
    color: "#0b1220",
    flex: 1,
    marginRight: moderateScale(SPACING.xs),
  },
  patientId: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(6),
    flexWrap: "wrap",
    gap: moderateScale(4),
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
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
  timeText: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    marginLeft: moderateScale(2),
    fontWeight: "500",
  },
  typeBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(12),
  },
  typeBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
  },
  priorityBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
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

export default NursePatientListScreen;