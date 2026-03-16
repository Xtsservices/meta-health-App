// ApprovedRejectedList.tsx
import React, { useState, useEffect, useCallback } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
// Add these imports after your existing imports
import { Alert } from "react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";

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
  AlertTriangleIcon,
} from "../../utils/SvgIcons";
import { showError, showSuccess } from "../../store/toast.slice";


type RouteParams = {
  status: "approved" | "rejected";
  year?: string;
  month?: string;
};

interface Surgery {
  id: number;
  patientTimeLineID: number;
  status: string;
  approvedTime: string | null;
  rejectedTime: string | null;
  scheduleTime: string | null;
  completedTime: string | null;
  surgeryType: string;
  patientType: string;
  rejectReason: string;
  pName: string;
  pUHID: number | string;
  gender: number;
  age: string;
  zone: number;
  patientStartStatus: number;
  departmentID: number;
  doctorID: number;
  doctorName: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

const ApprovedRejectedList: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const safeAreaInsets = getSafeAreaInsets();

  const { status = "approved", year, month } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 20,
  });

  const getTitle = () => {
    return status === "approved" ? "Approved Surgeries" : "Rejected Surgeries";
  };

  const getGenderString = (gender: number): string => {
    return gender === 1 ? "Male" : gender === 2 ? "Female" : "N/A";
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const fetchData = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
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
      dispatch(showError("Missing hospital information"));
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const url = `ot/${user.hospitalID}/approvedRejected/list?status=${status}&year=${year}&month=${month}&page=${page}&limit=${pagination.limit}`;

      const response: any = await AuthFetch(url, token);

      if (response?.status === "success") {
        const surgeriesData = Array.isArray(response?.data) ? response.data : 
                             Array.isArray(response?.data?.data) ? response?.data?.data : [];
        
        const transformedSurgeries: Surgery[] = surgeriesData?.map?.((item: any) => ({
          id: item?.id || 0,
          patientTimeLineID: item?.patientTimeLineID || 0,
          status: item?.status || "",
          approvedTime: item?.approvedTime || null,
          rejectedTime: item?.rejectedTime || null,
          scheduleTime: item?.scheduleTime || null,
          completedTime: item?.completedTime || null,
          surgeryType: item?.surgeryType || "N/A",
          patientType: item?.patientType || "N/A",
          rejectReason: item?.rejectReason || "",
          pName: item?.pName || "Unknown",
          pUHID: item?.pUHID || "N/A",
          gender: item?.gender || 0,
          age: item?.age?.toString() || "N/A",
          zone: item?.zone || 0,
          patientStartStatus: item?.patientStartStatus || 0,
          departmentID: item?.departmentID || 0,
          doctorID: item?.doctorID || 0,
          doctorName: item?.doctorName || "N/A",
        })) || [];

        setSurgeries(transformedSurgeries);

        const totalRecords = response?.totalRecords || response?.total || 
                           response?.data?.total || transformedSurgeries?.length || 0;
        const currentPageNum = response?.currentPage || response?.page || 
                              response?.data?.page || page;
        const totalPages = response?.totalPages || response?.data?.totalPages || 
                          Math.ceil(totalRecords / pagination.limit);

        setPagination({
          currentPage: currentPageNum,
          totalPages: totalPages,
          totalRecords: totalRecords,
          limit: response?.limit || response?.data?.limit || pagination.limit,
        });
      } else {
        const errorMsg = response?.message || "Failed to load surgeries";
        dispatch(showError(errorMsg));
        setSurgeries([]);
        setPagination(prev => ({ ...prev, totalRecords: 0, totalPages: 1 }));
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to load surgeries";
      dispatch(showError(errorMsg));
      setSurgeries([]);
      setPagination(prev => ({ ...prev, totalRecords: 0, totalPages: 1 }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token, user?.hospitalID, status, year, month, pagination.limit]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
      fetchData(newPage);
    }
  };

  const getSerialNumber = (index: number) => {
    return (pagination.currentPage - 1) * pagination.limit + index + 1;
  };

  const onRefresh = () => {
    fetchData(1, true);
  };

const exportToCSV = async () => {
  if (surgeries?.length === 0) {
    dispatch(showError("No data to export"));
    return;
  }

  try {
    setLoading(true);
    
    // Get month name if available
    const monthName = month ? [
      "", "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ][parseInt(month)] : null;
    
    // Create CSV headers
    const headers = [
      "Sr.No",
      "UHID",
      "Patient Name",
      "Age",
      "Gender",
      "Surgery Type",
      "Patient Type",
      "Doctor",
      "Status",
      "Date & Time",
      "Reject Reason",
      "Zone",
      "Department"
    ];

    // Create CSV rows
    const rows = surgeries.map((surgery, index) => {
      const serialNumber = (pagination.currentPage - 1) * pagination.limit + index + 1;
      
      return [
        serialNumber,
        surgery.pUHID || "N/A",
        surgery.pName || "Unknown",
        surgery.age || "N/A",
        getGenderString(surgery.gender),
        surgery.surgeryType || "N/A",
        surgery.patientType || "N/A",
        surgery.doctorName || "N/A",
        status === "approved" ? "Approved" : "Rejected",
        status === "approved" 
          ? (surgery.approvedTime ? formatDateTime(surgery.approvedTime, "Asia/Kolkata") : "N/A")
          : (surgery.rejectedTime ? formatDateTime(surgery.rejectedTime, "Asia/Kolkata") : "N/A"),
        surgery.rejectReason || "N/A",
        surgery.zone || "N/A",
        surgery.departmentID || "N/A"
      ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Create filename based on status and date filters
    let fileName = "";
    if (status === "approved") {
      if (monthName && year) {
        fileName = `approved_surgeries_${monthName}_${year}_${Date.now()}.csv`;
      } else if (year) {
        fileName = `approved_surgeries_${year}_${Date.now()}.csv`;
      } else {
        fileName = `approved_surgeries_${Date.now()}.csv`;
      }
    } else {
      if (monthName && year) {
        fileName = `rejected_surgeries_${monthName}_${year}_${Date.now()}.csv`;
      } else if (year) {
        fileName = `rejected_surgeries_${year}_${Date.now()}.csv`;
      } else {
        fileName = `rejected_surgeries_${Date.now()}.csv`;
      }
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
      message: `Here is the export of ${getTitle()}${monthName && year ? ` for ${monthName} ${year}` : year ? ` for ${year}` : ''}`,
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

  const filteredSurgeries = surgeries?.filter?.(surgery => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      surgery?.pName?.toLowerCase()?.includes(query) ||
      surgery?.pUHID?.toString()?.toLowerCase()?.includes(query) ||
      surgery?.surgeryType?.toLowerCase()?.includes(query) ||
      surgery?.doctorName?.toLowerCase()?.includes(query) ||
      surgery?.patientType?.toLowerCase()?.includes(query)
    );
  }) || [];

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
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <Text style={styles.subtitle}>
            Total {pagination.totalRecords} surgeries
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.actionButton, (loading || surgeries.length === 0) && styles.actionButtonDisabled]}
          onPress={exportToCSV}
          disabled={loading || surgeries.length === 0}
        >
          <DownloadIcon size={20} color={loading || surgeries.length === 0 ? "#94a3b8" : "#0b1220"} />
        </TouchableOpacity>
      </View>

      {(year || month) && (
        <View style={styles.filterInfo}>
          <CalendarIcon size={16} color="#64748b" />
          <Text style={styles.filterText}>
            {month && `${
              ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
                parseInt(month)
              ]
            } `}
            {year}
          </Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <SearchIcon size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search by name, UHID, surgery type, or doctor"
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

  const renderSurgeryItem = ({ item, index }: { item: Surgery; index: number }) => {
    const statusColor = getStatusColor(status);
    
    return (
      <TouchableOpacity 
        style={styles.surgeryCard}
        activeOpacity={0.9}
      >
        <View style={styles.serialNumberContainer}>
          <Text style={styles.serialNumber}>{getSerialNumber(index)}</Text>
        </View>

        <View style={styles.surgeryInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.patientName} numberOfLines={1}>
              {item?.pName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {status === "approved" ? "Approved" : "Rejected"}
              </Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>UHID:</Text>
              <Text style={styles.detailValue}>{item?.pUHID}</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Age:</Text>
              <Text style={styles.detailValue}>{item?.age}</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Gender:</Text>
              <Text style={styles.detailValue}>{getGenderString(item?.gender)}</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Surgery Type:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{item?.surgeryType}</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Patient Type:</Text>
              <Text style={styles.detailValue}>{item?.patientType}</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Doctor:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{item?.doctorName}</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                {status === "approved" ? "Approved Date:" : "Rejected Date:"}
              </Text>
              <Text style={styles.detailValue}>
                {formatDateTime(status === "approved" ? item?.approvedTime : item?.rejectedTime, "Asia/Kolkata")}
              </Text>
            </View>
          </View>

          {status === "rejected" && item?.rejectReason && (
            <View style={styles.rejectReasonContainer}>
              <Text style={styles.rejectReasonLabel}>Reject Reason:</Text>
              <Text style={styles.rejectReasonText}>{item?.rejectReason}</Text>
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
      <AlertTriangleIcon size={40} color="#EF4444" />
      <Text style={styles.errorTitle}>Unable to Load Data</Text>
      <Text style={styles.errorText}>Please try again</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(1)}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <UsersIcon size={60} color="#cbd5e1" />
      <Text style={styles.emptyStateTitle}>
        No surgeries found
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 
          "No surgeries match your search. Try different keywords." : 
          `No ${status} surgeries available${year || month ? ' for the selected period' : ''}.`
        }
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading surgeries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      
      <View style={styles.container}>
        {surgeries?.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredSurgeries}
            renderItem={renderSurgeryItem}
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
    marginLeft: moderateScale(SPACING.sm),
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
  filterInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    marginBottom: moderateVerticalScale(SPACING.md),
    padding: moderateScale(SPACING.sm),
    backgroundColor: "#f8fafc",
    borderRadius: moderateScale(8),
  },
  filterText: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    fontWeight: "600",
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
  surgeryCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(SPACING.md),
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
    marginRight: moderateScale(SPACING.md),
  },
  serialNumber: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: "#64748b",
  },
  surgeryInfo: {
    flex: 1,
    minHeight: moderateScale(50),
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: moderateScale(8),
  },
  patientName: {
    fontSize: isSmallDevice ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: "700",
    color: "#0b1220",
    flex: 1,
    marginRight: moderateScale(8),
  },
  statusBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    textTransform: "capitalize",
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
  rejectReasonContainer: {
    marginTop: moderateScale(6),
    padding: moderateScale(8),
    backgroundColor: "#fef2f2",
    borderRadius: moderateScale(6),
    borderLeftWidth: moderateScale(3),
    borderLeftColor: "#ef4444",
  },
  rejectReasonLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#dc2626",
    fontWeight: "600",
    marginBottom: moderateScale(2),
  },
  rejectReasonText: {
    fontSize: FONT_SIZE.sm,
    color: "#334155",
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

export default ApprovedRejectedList;