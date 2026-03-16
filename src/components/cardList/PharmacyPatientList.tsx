// PharmacyPatientListScreen.tsx
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

// Import custom icons
import {
  ArrowLeftIcon,

  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  DownloadIcon,
  PackageIcon,
  PillIcon,
  AlertTriangleIcon,
  IndianRupeeIcon,
  FileTextIcon,
  SearchIcon,
} from "../../utils/SvgIcons";

import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { showError, showSuccess } from "../../store/toast.slice";
// Add these imports after your existing imports
import { Alert } from "react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";
type RouteParams = {
  PharmacyPatientListScreen: {
    listType: 'prescriptions_today' | 'pending_orders' | 'low_stock' | 'revenue_today';
    title: string;
  };
};

interface Medicine {
  id: number;
  medicineName: string;
  medicineType: string;
  sellingPrice: number;
  updatedQuantity: number;
  gst: string;
  hsn: string;
  status: string;
  Frequency?: string;
  daysCount?: string;
}

interface PaymentDetail {
  cash: number;
  timestamp: string;
}

interface PharmacyPatientRevenue {
  id: string;
  patientID: string;
  pName: string;
  age: string;
  gender: number;
  ptype: number;
  addedOn: string;
  medicinesList: Medicine[];
  doctorID: number;
  paymentDetails: PaymentDetail[];
  totalAmount: string;
  doctorName?: string;
  departmentName?: string;
}

interface LowStockMedicine {
  id?: string;
  name: string;
  category: string;
  totalQuantity: string;
  earliestExpiry: string;
  quantity?: number;
  isOutofStock?: boolean;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

type PharmacyPatient = PharmacyPatientRevenue | LowStockMedicine;

const PharmacyPatientListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'PharmacyPatientListScreen'>>();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const safeAreaInsets = getSafeAreaInsets();

  const { listType, title } = route.params;
  
  const [patients, setPatients] = useState<PharmacyPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10,
  });

  const getGender = (gender: number): string => {
    return gender === 1 ? "Male" : gender === 2 ? "Female" : "N/A";
  };

  const getPatientType = (ptype: number): string => {
    if (ptype === 1) return "OPD";
    if (ptype === 2) return "IPD";
    if (ptype === 3) return "Emergency";
    if (ptype === 21) return "Discharged";
    return "N/A";
  };

  const getMedicineStatusColor = (status: string): { bg: string; color: string } => {
    switch (status?.toLowerCase()) {
      case "completed":
        return { bg: "#D1FAE5", color: "#065F46" };
      case "pending":
        return { bg: "#FEF3C7", color: "#92400E" };
      case "rejected":
        return { bg: "#FEE2E2", color: "#991B1B" };
      default:
        return { bg: "#E5E7EB", color: "#374151" };
    }
  };

  const calculateTotalAmount = (medicines: Medicine[]): number => {
    return medicines?.reduce?.((total, med) => {
      const amount = med?.sellingPrice * med?.updatedQuantity;
      const gst = (amount * Number(med?.gst)) / 100;
      return total + amount + gst;
    }, 0) || 0;
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
        dispatch(showError("Missing hospital information"));
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let url = '';
      
      switch (listType) {
        case 'prescriptions_today':
          url = `medicineInventoryPatientsOrder/${user.hospitalID}/getPharmacyDashboardList?type=prescriptionsToda&page=${page}&limit=${pagination.limit}`;
          break;
        case 'pending_orders':
          url = `medicineInventoryPatientsOrder/${user.hospitalID}/getPharmacyDashboardList?type=acceptedPrescriptions&limit=${pagination.limit}`;
          break;
        case 'low_stock':
          url = `medicineInventoryPatientsOrder/${user.hospitalID}/getPharmacyDashboardList?type=lowStockItems&page=${page}&limit=${pagination.limit}`;
          break;
        case 'revenue_today':
          url = `medicineInventoryPatientsOrder/${user.hospitalID}/getPharmacyDashboardList&type=revenueToday&page=${page}&limit=${pagination.limit}`;
          break;
      }

      const response = await AuthFetch(url, token) as any;
      
      if (response?.status === 'success' && response?.data?.data) {
        let data = [];
        
        if (Array.isArray(response?.data?.data)) {
          data = response?.data?.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        
        setPatients(data);

        const totalRecords = response?.total || response?.totalRecords || data?.length || 0;
        const currentPageNum = response?.currentPage || response?.page || page;
        const totalPages = response?.totalPages || Math.ceil(totalRecords / pagination.limit);

        setPagination({
          currentPage: currentPageNum,
          totalPages: totalPages,
          totalRecords: totalRecords,
          limit: response?.limit || pagination.limit,
        });
      } else {
        const errorMsg = response?.message || "No data available";
        dispatch(showError(errorMsg));
        setPatients([]);
        setPagination(prev => ({ ...prev, totalRecords: 0, totalPages: 1 }));
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to load pharmacy data";
      dispatch(showError(errorMsg));
      setPatients([]);
      setPagination(prev => ({ ...prev, totalRecords: 0, totalPages: 1 }));
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

  const toggleRowExpand = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const isRevenueData = (item: PharmacyPatient): item is PharmacyPatientRevenue => {
    return (item as PharmacyPatientRevenue).medicinesList !== undefined;
  };

  const isLowStockData = (item: PharmacyPatient): item is LowStockMedicine => {
    return (item as LowStockMedicine).category !== undefined;
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
    let rows = [];
    
    if (listType === 'low_stock') {
      // Export for Low Stock
      headers = [
        "Sr.No",
        "Medicine Name",
        "Category",
        "Total Quantity",
        "Earliest Expiry Date",
        "Status"
      ];
      
      rows = patients.map((item, index) => {
        const lowStockItem = item as LowStockMedicine;
        return [
          index + 1,
          lowStockItem.name || "N/A",
          lowStockItem.category || "N/A",
          lowStockItem.totalQuantity || "0",
          lowStockItem.earliestExpiry ? formatDate(lowStockItem.earliestExpiry, "Asia/Kolkata") : "N/A",
          lowStockItem.isOutofStock ? "Out of Stock" : "Low Stock"
        ];
      });
      
    } else if (listType === 'revenue_today') {
      // Export for Revenue Today (expanded view)
      headers = [
        "Sr.No",
        "Patient ID",
        "Patient Name",
        "Age",
        "Gender",
        "Patient Type",
        "Total Medicines",
        "Total Amount (₹)",
        "Added Date",
        "Payment Status"
      ];
      
      rows = patients.map((item, index) => {
        const revenueItem = item as PharmacyPatientRevenue;
        const totalAmount = calculateTotalAmount(revenueItem.medicinesList);
        const hasPayment = revenueItem.paymentDetails && revenueItem.paymentDetails.length > 0;
        
        return [
          index + 1,
          revenueItem.patientID || "N/A",
          revenueItem.pName || "Unknown",
          revenueItem.age || "N/A",
          getGender(revenueItem.gender),
          getPatientType(revenueItem.ptype),
          revenueItem.medicinesList?.length || 0,
          totalAmount?.toFixed(2),
          revenueItem.addedOn ? formatDateTime(revenueItem.addedOn, "Asia/Kolkata") : "N/A",
          hasPayment ? "Paid" : "Pending"
        ];
      });
      
    } else {
      // Export for Prescriptions Today and Pending Orders
      headers = [
        "Sr.No",
        "Patient ID",
        "Patient Name",
        "Age",
        "Gender",
        "Patient Type",
        "Doctor Name",
        "Department",
        "Status",
        "Date"
      ];
      
      rows = patients.map((item, index) => {
        const revenueItem = item as PharmacyPatientRevenue;
        
        return [
          index + 1,
          revenueItem.patientID || "N/A",
          revenueItem.pName || "Unknown",
          revenueItem.age || "N/A",
          getGender(revenueItem.gender),
          getPatientType(revenueItem.ptype),
          revenueItem.doctorName || "N/A",
          revenueItem.departmentName || "N/A",
          listType === 'pending_orders' ? "Pending" : "Today",
          revenueItem.addedOn ? formatDateTime(revenueItem.addedOn, "Asia/Kolkata") : "N/A"
        ];
      });
    }

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Create filename based on list type
    let fileName = "";
    switch (listType) {
      case 'prescriptions_today':
        fileName = `today_prescriptions_${Date.now()}.csv`;
        break;
      case 'pending_orders':
        fileName = `pending_orders_${Date.now()}.csv`;
        break;
      case 'low_stock':
        fileName = `low_stock_medicines_${Date.now()}.csv`;
        break;
      case 'revenue_today':
        fileName = `today_revenue_${Date.now()}.csv`;
        break;
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

  const getIcon = () => {
    switch (listType) {
      case 'prescriptions_today':
      case 'pending_orders':
        return <FileTextIcon size={20} color="#14b8a6" />;
      case 'low_stock':
        return <PackageIcon size={20} color="#14b8a6" />;
      case 'revenue_today':
        return <IndianRupeeIcon size={20} color="#14b8a6" />;
      default:
        return <UsersIcon size={20} color="#14b8a6" />;
    }
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
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          <Text style={styles.subtitle}>
            Total {pagination.totalRecords} records
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
            placeholder="Search..."
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

  const renderLowStockItem = ({ item, index }: { item: LowStockMedicine; index: number }) => {
    return (
      <View style={styles.recordCard}>
        <View style={styles.cardHeader}>
          <View style={styles.serialContainer}>
            <Text style={styles.serialNumber}>{getSerialNumber(index)}</Text>
          </View>
          
          <View style={styles.cardHeaderContent}>
            <Text style={styles.recordTitle}>{item?.name}</Text>
            <Text style={styles.recordCategory}>{item?.category}</Text>
          </View>
        </View>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total Quantity</Text>
            <View style={styles.quantityBadge}>
              <PackageIcon size={14} color="#991B1B" />
              <Text style={styles.detailValueRed}>{item?.totalQuantity}</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Earliest Expiry</Text>
            <View style={styles.dateBadge}>
              <CalendarIcon size={14} color="#374151" />
              <Text style={styles.detailValue}>{formatDate(item?.earliestExpiry, "Asia/Kolkata")}</Text>
            </View>
          </View>
        </View>
        
        {item?.isOutofStock && (
          <View style={styles.outOfStockBadge}>
            <AlertTriangleIcon size={14} color="#991B1B" />
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>
    );
  };

  const renderRevenueItem = ({ item, index }: { item: PharmacyPatientRevenue; index: number }) => {
    const rowId = `revenue-${item?.id}`;
    const isExpanded = expandedRows.has(rowId);
    const totalAmount = calculateTotalAmount(item?.medicinesList);
    
    return (
      <TouchableOpacity 
        style={styles.recordCard}
        onPress={() => toggleRowExpand(rowId)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={styles.serialContainer}>
            <Text style={styles.serialNumber}>{getSerialNumber(index)}</Text>
          </View>
          
          <View style={styles.cardHeaderContent}>
            <View style={styles.nameRow}>
              <Text style={styles.patientName} numberOfLines={1}>{item?.pName}</Text>
              <Text style={styles.patientId}>{item?.patientID}</Text>
            </View>
            
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfo}>Age: {item?.age}</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.patientInfo}>{getGender(item?.gender)}</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.patientTypeBadge}>{getPatientType(item?.ptype)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Medicines</Text>
            <View style={styles.medicinesBadge}>
              <PillIcon size={14} color="#1E40AF" />
              <Text style={styles.detailValueBlue}>{item?.medicinesList?.length} items</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <View style={styles.amountBadge}>
              <IndianRupeeIcon size={14} color="#065F46" />
              <Text style={styles.detailValueGreen}>
                ₹{totalAmount?.toLocaleString?.('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.dateRow}>
          <CalendarIcon size={12} color="#64748b" />
          <Text style={styles.dateText}>
            Added: {formatDateTime(item?.addedOn, "Asia/Kolkata")}
          </Text>
        </View>
        
        {isExpanded && item?.medicinesList?.length > 0 && (
          <View style={styles.expandedSection}>
            <Text style={styles.expandedTitle}>Medicines Details</Text>
            {item?.medicinesList?.map?.((medicine, medIndex) => {
              const amount = medicine?.sellingPrice * medicine?.updatedQuantity;
              const gst = (amount * Number(medicine?.gst)) / 100;
              const total = amount + gst;
              const statusColor = getMedicineStatusColor(medicine?.status);
              
              return (
                <View key={medicine?.id} style={styles.medicineCard}>
                  <View style={styles.medicineHeader}>
                    <Text style={styles.medicineName}>{medicine?.medicineName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusText, { color: statusColor.color }]}>
                        {medicine?.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.medicineDetails}>
                    <View style={styles.medicineDetail}>
                      <Text style={styles.medicineLabel}>HSN:</Text>
                      <Text style={styles.medicineValue}>{medicine?.hsn}</Text>
                    </View>
                    
                    <View style={styles.medicineDetail}>
                      <Text style={styles.medicineLabel}>Qty:</Text>
                      <Text style={styles.medicineValue}>{medicine?.updatedQuantity}</Text>
                    </View>
                    
                    <View style={styles.medicineDetail}>
                      <Text style={styles.medicineLabel}>Price:</Text>
                      <Text style={styles.medicineValue}>₹{medicine?.sellingPrice?.toFixed(2)}</Text>
                    </View>
                    
                    <View style={styles.medicineDetail}>
                      <Text style={styles.medicineLabel}>GST:</Text>
                      <Text style={styles.medicineValue}>{medicine?.gst}%</Text>
                    </View>
                    
                    <View style={styles.medicineDetail}>
                      <Text style={styles.medicineLabel}>Total:</Text>
                      <Text style={styles.medicineTotal}>₹{total?.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            
            {item?.paymentDetails && item?.paymentDetails?.length > 0 && (
              <View style={styles.paymentSection}>
                <Text style={styles.expandedTitle}>Payment Details</Text>
                {item?.paymentDetails?.map?.((payment, payIndex) => (
                  <View key={payIndex} style={styles.paymentCard}>
                    <Text style={styles.paymentMethod}>Cash Payment</Text>
                    <Text style={styles.paymentAmount}>₹{payment?.cash?.toFixed(2)}</Text>
                    <Text style={styles.paymentDate}>{formatDateTime(payment?.timestamp, "Asia/Kolkata")}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }: { item: PharmacyPatient; index: number }) => {
    if (listType === 'low_stock' && isLowStockData(item)) {
      return renderLowStockItem({ item, index });
    } else if (isRevenueData(item)) {
      return renderRevenueItem({ item, index });
    }
    return null;
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
          "No records match your search." : 
          "No data available for this category."
        }
      </Text>
    </View>
  );

  const filteredPatients = patients?.filter?.((patient) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    if (isRevenueData(patient)) {
      return (
        patient?.pName?.toLowerCase()?.includes(query) ||
        patient?.patientID?.toLowerCase()?.includes(query) ||
        patient?.doctorName?.toLowerCase()?.includes(query) ||
        patient?.departmentName?.toLowerCase()?.includes(query)
      );
    }
    
    if (isLowStockData(patient)) {
      return (
        patient?.name?.toLowerCase()?.includes(query) ||
        patient?.category?.toLowerCase()?.includes(query)
      );
    }
    
    return false;
  }) || [];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        {/* {renderHeader()} */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading pharmacy data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {/* {renderHeader()} */}
      
      <View style={styles.container}>
        {patients?.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredPatients}
            renderItem={renderItem}
            keyExtractor={(item, index) => {
              if (isRevenueData(item)) return `revenue-${item?.id}-${index}`;
              if (isLowStockData(item)) return `low-stock-${item?.id || index}`;
              return `item-${index}`;
            }}
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
    marginTop: moderateVerticalScale(SPACING.sm),
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
  recordCard: {
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
  cardHeader: {
    flexDirection: "row",
    marginBottom: moderateVerticalScale(SPACING.sm),
  },
  serialContainer: {
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
  cardHeaderContent: {
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
  },
  patientId: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  patientInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: moderateScale(4),
  },
  patientInfo: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    fontWeight: "500",
  },
  dotSeparator: {
    fontSize: FONT_SIZE.sm,
    color: "#cbd5e1",
  },
  patientTypeBadge: {
    fontSize: FONT_SIZE.xs,
    color: "#065F46",
    fontWeight: "600",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  recordTitle: {
    fontSize: isSmallDevice ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: "700",
    color: "#0b1220",
    marginBottom: moderateScale(2),
  },
  recordCategory: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    fontWeight: "500",
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: moderateVerticalScale(SPACING.sm),
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    marginBottom: moderateScale(4),
    fontWeight: "500",
  },
  quantityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
    alignSelf: "flex-start",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
    alignSelf: "flex-start",
  },
  medicinesBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
    alignSelf: "flex-start",
  },
  amountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
    alignSelf: "flex-start",
  },
  detailValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#374151",
    marginLeft: moderateScale(4),
  },
  detailValueRed: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: "#991B1B",
    marginLeft: moderateScale(4),
  },
  detailValueBlue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: "#1E40AF",
    marginLeft: moderateScale(4),
  },
  detailValueGreen: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: "#065F46",
    marginLeft: moderateScale(4),
  },
  outOfStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
    alignSelf: "flex-start",
    marginTop: moderateVerticalScale(SPACING.xs),
  },
  outOfStockText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: "#991B1B",
    marginLeft: moderateScale(4),
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    marginTop: moderateVerticalScale(SPACING.xs),
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "500",
  },
  expandedSection: {
    marginTop: moderateVerticalScale(SPACING.md),
    paddingTop: moderateVerticalScale(SPACING.md),
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  expandedTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: "#0b1220",
    marginBottom: moderateVerticalScale(SPACING.sm),
  },
  medicineCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: moderateScale(8),
    padding: moderateScale(SPACING.sm),
    marginBottom: moderateVerticalScale(SPACING.xs),
  },
  medicineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: moderateScale(6),
  },
  medicineName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#0b1220",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  medicineDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(8),
  },
  medicineDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(2),
  },
  medicineLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    fontWeight: "500",
  },
  medicineValue: {
    fontSize: FONT_SIZE.xs,
    color: "#374151",
    fontWeight: "500",
  },
  medicineTotal: {
    fontSize: FONT_SIZE.sm,
    color: "#065F46",
    fontWeight: "700",
  },
  paymentSection: {
    marginTop: moderateVerticalScale(SPACING.md),
  },
  paymentCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: moderateScale(8),
    padding: moderateScale(SPACING.sm),
    marginBottom: moderateVerticalScale(SPACING.xs),
  },
  paymentMethod: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#0b1220",
    marginBottom: moderateScale(2),
  },
  paymentAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: moderateScale(2),
  },
  paymentDate: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
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

export default PharmacyPatientListScreen;