// screens/AllTransactionsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  RefreshControl,
  SafeAreaView,
  TextInput,
  useColorScheme,
  Dimensions,
  FlatList,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Filter,
  XCircle,
  CheckCircle,
  ChevronLeft,
  Download,
  Calendar,
  Clock,
  X,
  AlertCircle,
  Search,
  ChevronRight,
  User,
  ArrowUpDown,
  Tag,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { showError } from "../../store/toast.slice";
import { formatDate } from "../../utils/dateTime";
import { COLORS } from "../../utils/colour";
import { debounce } from "../../utils/debounce";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import { Alert } from "react-native";

import {
  moderateScale,
  moderateVerticalScale,
  isTablet,
} from "../../utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_SIZE = 10;

/* ---------------- CONSTANTS ---------------- */
const FILTER_TYPES = {
  TODAY: "today",
  THIS_WEEK: "this_week",
  THIS_MONTH: "this_month",
  THIS_YEAR: "this_year",
};

const REVENUE_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
};

const REVENUE_SOURCE = {
  APPOINTMENT: "appointment",
  CONSULTATION: "consultation",
  PROCEDURE: "procedure",
  MEDICATION: "medication",
  OTHER: "other",
};

/* ---------------- TYPES ---------------- */
interface Transaction {
  id?: number;
  patientID?: number;
  consultationFee?: number;
  commissionPercentage?: string;
  doctorRevenue?: string;
  hospitalRevenue?: string;
  status?: string;
  source?: string;
  revenueType?: string;
  date?: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  departmentName?: string;
  createdAt?: string;
}

/* ---------------- STATUS PILL COMPONENT ---------------- */
const StatusPill = ({ status }: { status?: string }) => {
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.sub;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return <CheckCircle size={10} color="#fff" />;
      case 'pending': return <Clock size={10} color="#fff" />;
      case 'cancelled': return <XCircle size={10} color="#fff" />;
      default: return <Clock size={10} color="#fff" />;
    }
  };

  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: getStatusColor(status) },
      ]}
    >
      {getStatusIcon(status)}
      <Text style={styles.statusText}>
        {status?.toUpperCase() || "UNKNOWN"}
      </Text>
    </View>
  );
};

/* ---------------- FILTER OPTION COMPONENT ---------------- */
const FilterOption = ({ 
  label, 
  value, 
  isActive, 
  onPress,
  icon: Icon,
  iconColor
}: { 
  label: string; 
  value: string; 
  isActive: boolean; 
  onPress: (value: string) => void;
  icon?: React.ComponentType<any>;
  iconColor?: string;
}) => (
  <TouchableOpacity
    style={[
      styles.filterOption,
      isActive && styles.filterOptionActive,
    ]}
    onPress={() => onPress(value)}
    activeOpacity={0.7}
  >
    {Icon && <Icon size={14} color={isActive ? '#fff' : iconColor || COLORS.sub} style={styles.filterOptionIcon} />}
    <Text style={[
      styles.filterOptionText,
      isActive && styles.filterOptionTextActive,
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* ---------------- FILTER MODAL COMPONENT ---------------- */
const FilterModal = ({ 
  visible, 
  onClose, 
  filters,
  onApplyFilters,
  onResetFilters 
}: { 
  visible: boolean;
  onClose: () => void;
  filters: any;
  onApplyFilters: (filters: any) => void;
  onResetFilters: () => void;
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  
  // Update local filters when modal opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    console.log("Applying filters:", localFilters);
    onApplyFilters(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      filterType: FILTER_TYPES.THIS_MONTH,
      status: "",
      source: "",
      sortBy: "date",
      sortOrder: "DESC",
    };
    setLocalFilters(resetFilters);
    onResetFilters();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.filterModalOverlay}>
        <View style={[styles.filterModalContent, { backgroundColor: COLORS.card }]}>
          <View style={styles.filterModalHeader}>
            <Text style={[styles.filterModalTitle, { color: COLORS.text }]}>
              🔍 Advanced Filters
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.filterScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Time Period */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Time Period
              </Text>
              <View style={styles.filterOptions}>
                <FilterOption
                  label="Today"
                  value={FILTER_TYPES.TODAY}
                  isActive={localFilters.filterType === FILTER_TYPES.TODAY}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, filterType: value }))}
                  icon={Calendar}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="This Week"
                  value={FILTER_TYPES.THIS_WEEK}
                  isActive={localFilters.filterType === FILTER_TYPES.THIS_WEEK}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, filterType: value }))}
                  icon={Calendar}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="This Month"
                  value={FILTER_TYPES.THIS_MONTH}
                  isActive={localFilters.filterType === FILTER_TYPES.THIS_MONTH}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, filterType: value }))}
                  icon={Calendar}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="This Year"
                  value={FILTER_TYPES.THIS_YEAR}
                  isActive={localFilters.filterType === FILTER_TYPES.THIS_YEAR}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, filterType: value }))}
                  icon={Calendar}
                  iconColor={COLORS.brand}
                />
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Status
              </Text>
              <View style={styles.filterOptions}>
                <FilterOption
                  label="All Status"
                  value=""
                  isActive={localFilters.status === ""}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, status: value }))}
                  icon={CheckCircle}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="Pending"
                  value={REVENUE_STATUS.PENDING}
                  isActive={localFilters.status === REVENUE_STATUS.PENDING}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, status: value }))}
                  icon={Clock}
                  iconColor={COLORS.warning}
                />
                <FilterOption
                  label="Paid"
                  value={REVENUE_STATUS.PAID}
                  isActive={localFilters.status === REVENUE_STATUS.PAID}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, status: value }))}
                  icon={CheckCircle}
                  iconColor={COLORS.success}
                />
                <FilterOption
                  label="Cancelled"
                  value={REVENUE_STATUS.CANCELLED}
                  isActive={localFilters.status === REVENUE_STATUS.CANCELLED}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, status: value }))}
                  icon={XCircle}
                  iconColor={COLORS.danger}
                />
              </View>
            </View>

            {/* Source Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Source
              </Text>
              <View style={styles.filterOptions}>
                <FilterOption
                  label="All Sources"
                  value=""
                  isActive={localFilters.source === ""}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="Appointment"
                  value={REVENUE_SOURCE.APPOINTMENT}
                  isActive={localFilters.source === REVENUE_SOURCE.APPOINTMENT}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="Consultation"
                  value={REVENUE_SOURCE.CONSULTATION}
                  isActive={localFilters.source === REVENUE_SOURCE.CONSULTATION}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="Procedure"
                  value={REVENUE_SOURCE.PROCEDURE}
                  isActive={localFilters.source === REVENUE_SOURCE.PROCEDURE}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="Medication"
                  value={REVENUE_SOURCE.MEDICATION}
                  isActive={localFilters.source === REVENUE_SOURCE.MEDICATION}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="Other"
                  value={REVENUE_SOURCE.OTHER}
                  isActive={localFilters.source === REVENUE_SOURCE.OTHER}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Sort By
              </Text>
              <View style={styles.sortContainer}>
                <Text style={[styles.sortLabel, { color: COLORS.text }]}>Field:</Text>
                <View style={styles.sortOptions}>
                  {["date", "consultationFee", "doctorRevenue", "hospitalRevenue", "createdAt"].map((field) => (
                    <FilterOption
                      key={field}
                      label={field.replace(/([A-Z])/g, ' $1').toUpperCase()}
                      value={field}
                      isActive={localFilters.sortBy === field}
                      onPress={(value) => setLocalFilters(prev => ({ ...prev, sortBy: value as any }))}
                      icon={ArrowUpDown}
                      iconColor={COLORS.brand}
                    />
                  ))}
                </View>
              </View>
              
              <View style={[styles.sortContainer, { marginTop: 12 }]}>
                <Text style={[styles.sortLabel, { color: COLORS.text }]}>Order:</Text>
                <View style={styles.sortOptions}>
                  <FilterOption
                    label="DESCENDING"
                    value="DESC"
                    isActive={localFilters.sortOrder === "DESC"}
                    onPress={(value) => setLocalFilters(prev => ({ ...prev, sortOrder: value as any }))}
                    icon={ArrowUpDown}
                    iconColor={COLORS.brand}
                  />
                  <FilterOption
                    label="ASCENDING"
                    value="ASC"
                    isActive={localFilters.sortOrder === "ASC"}
                    onPress={(value) => setLocalFilters(prev => ({ ...prev, sortOrder: value as any }))}
                    icon={ArrowUpDown}
                    iconColor={COLORS.brand}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterModalButtons}>
            <TouchableOpacity
              style={[styles.filterModalButton, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={[styles.resetButtonText, { color: COLORS.danger }]}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterModalButton, { backgroundColor: COLORS.brand }]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ======================= ALL TRANSACTIONS SCREEN ======================= */
const AllTransactionsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [authError, setAuthError] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  
  // All filters state
  const [filters, setFilters] = useState({
    filterType: FILTER_TYPES.THIS_MONTH,
    status: "",
    source: "",
    sortBy: "date" as "date" | "consultationFee" | "doctorRevenue" | "hospitalRevenue" | "createdAt",
    sortOrder: "DESC" as "ASC" | "DESC",
  });

  const flatRef = useRef<FlatList<Transaction>>(null);

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const formatCurrency = (amount?: number) => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getFilterLabel = (type: string) => {
    const labels: Record<string, string> = {
      [FILTER_TYPES.TODAY]: "Today",
      [FILTER_TYPES.THIS_WEEK]: "This Week",
      [FILTER_TYPES.THIS_MONTH]: "This Month",
      [FILTER_TYPES.THIS_YEAR]: "This Year",
    };
    return labels[type] || type.replace("_", " ").toUpperCase();
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case REVENUE_STATUS.PENDING: return "Pending";
      case REVENUE_STATUS.PAID: return "Paid";
      case REVENUE_STATUS.CANCELLED: return "Cancelled";
      default: return "All";
    }
  };

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case REVENUE_SOURCE.APPOINTMENT: return "Appointment";
      case REVENUE_SOURCE.CONSULTATION: return "Consultation";
      case REVENUE_SOURCE.PROCEDURE: return "Procedure";
      case REVENUE_SOURCE.MEDICATION: return "Medication";
      case REVENUE_SOURCE.OTHER: return "Other";
      default: return "All";
    }
  };

  /* ---------------- LOAD TRANSACTIONS ---------------- */
  const loadTransactions = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) {
        dispatch(showError("Please login to continue"));
        setAuthError(true);
        return;
      }

      // Build URL with all filters
      let url = `revenue/doctor/${user.id}/history?hospitalID=${user.hospitalID}`;
      
      // Add filterType
      if (filters.filterType) {
        url += `&filterType=${filters.filterType}`;
      }
      
      // Add status filter
      if (filters.status) {
        url += `&status=${filters.status}`;
      }
      
      // Add source filter
      if (filters.source) {
        url += `&source=${filters.source}`;
      }
      
      // Add search filter
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      
      // Add sorting
      url += `&sortBy=${filters.sortBy}&sortOrder=${filters.sortOrder}`;
      
      // Add pagination
      url += `&page=${page}&limit=${PAGE_SIZE}`;

      // Add doctorProfileID if available
      if (user?.doctorProfileID) {
        url += `&doctorProfileID=${user.doctorProfileID}`;
      }

      console.log("Loading transactions with URL:", url);
      const response = await AuthFetch(url, token) as any;

      if (response?.data?.success || response?.success) {
        const data = response.data?.data || response.data || {};
        const transactionsData = data.transactions || [];
        const pagination = data.pagination || {};
        
        if (page === 1) {
          setTransactions(transactionsData);
        } else {
          setTransactions(prev => [...prev, ...transactionsData]);
        }
        setCurrentPage(page);
        setHasMore(pagination.hasNextPage || false);
        setTotalRecords(pagination.totalRecords || 0);
        console.log("Loaded transactions:", transactionsData.length, "with filters:", filters);
      } else {
        setTransactions([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      dispatch(showError("Failed to load transactions"));
      setTransactions([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced fetch function for search
  const debouncedSearchRef = useRef(
    debounce(() => {
      console.log("Debounced search triggered");
      loadTransactions(1);
    }, 500)
  );

  useEffect(() => {
    // Load data when filters change
    console.log("Filters changed, loading data:", filters);
    loadTransactions(1);
  }, [filters.filterType, filters.status, filters.source, filters.sortBy, filters.sortOrder]);

  useEffect(() => {
    // Debounced search
    debouncedSearchRef.current();
  }, [search]);

  useEffect(() => {
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!authError) {
        console.log("Screen focused, loading data");
        loadTransactions(1);
      }
    }, [authError])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions(1);
  };

  const loadMore = () => {
    if (hasMore && !loading && !refreshing) {
      loadTransactions(currentPage + 1);
    }
  };

  /* ---------------- FILTER HANDLERS ---------------- */
  const handleSearchChange = (text: string) => {
    setSearch(text);
  };

  const handleApplyFilters = (newFilters: any) => {
    console.log("Applying new filters:", newFilters);
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    console.log("Resetting all filters");
    setFilters({
      filterType: FILTER_TYPES.THIS_MONTH,
      status: "",
      source: "",
      sortBy: "date",
      sortOrder: "DESC",
    });
    setSearch("");
    setShowFilterModal(false);
  };

  const handleExport = async () => {
    if (!transactions.length) {
      Alert.alert("No data", "There is no transaction data to export");
      return;
    }

    try {
      const headers = [
        "Transaction ID",
        "Patient Name",
        "Phone",
        "Department",
        "Date",
        "Consultation Fee",
        "Commission %",
        "Doctor Revenue",
        "Hospital Revenue",
        "Status",
        "Source",
      ];

      const rows = transactions.map((t) => [
        t.id ?? "",
        t.patientName ?? "",
        t.patientPhone ?? "",
        t.departmentName ?? "",
        formatDate(t.date) ?? "",
        t.consultationFee ?? 0,
        t.commissionPercentage ?? 0,
        t.doctorRevenue ?? 0,
        t.hospitalRevenue ?? 0,
        t.status ?? "",
        t.source ?? "",
      ]);

      const csvContent =
        [headers, ...rows]
          .map(row =>
            row.map(cell =>
              `"${String(cell).replace(/"/g, '""')}"`
            ).join(",")
          )
          .join("\n");

      const fileName = `doctor_transactions_${Date.now()}.csv`;
      const filePath =
        Platform.OS === "android"
          ? `${RNFS.DownloadDirectoryPath}/${fileName}`
          : `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csvContent, "utf8");

      await Share.open({
        url: Platform.OS === "android" ? `file://${filePath}` : filePath,
        type: "text/csv",
        filename: fileName,
        failOnCancel: false,
      });

    } catch (err) {
      console.error("Export error:", err);
      Alert.alert("Export failed", "Could not export transactions");
    }
  };

  const hasActiveFilters = search !== "" || 
    filters.filterType !== FILTER_TYPES.THIS_MONTH || 
    filters.status !== "" || 
    filters.source !== "" ||
    filters.sortBy !== "date" ||
    filters.sortOrder !== "DESC";

  /* ---------------- COMPUTED VALUES ---------------- */
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      loadTransactions(page);
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  /* ---------------- RENDER FUNCTIONS ---------------- */
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            All Transactions
          </Text>
          <Text style={styles.headerSubtitle}>
            {totalRecords} transactions found
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleExport}
          >
            <Download size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
        <Search size={18} color={COLORS.sub} />
        <TextInput
          placeholder="Search by patient name, ID, or department"
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={handleSearchChange}
          style={[styles.searchInput, { color: COLORS.text }]}
        />
        {search !== "" && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <X size={16} color={COLORS.sub} />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Filters Bar - Made Responsive */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickFiltersContainer}
        contentContainerStyle={styles.quickFiltersContent}
      >
        <TouchableOpacity
          style={[styles.quickFilterButton, { 
            backgroundColor: COLORS.card,
            minHeight: moderateScale(34),
            paddingHorizontal: moderateScale(12),
            paddingVertical: moderateScale(6),
          }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={moderateScale(14)} color={COLORS.brand} />
          <Text style={[styles.quickFilterText, { 
            color: COLORS.text,
            fontSize: moderateScale(12),
          }]}>
            Filters
          </Text>
        </TouchableOpacity>

        {/* Time Period Quick Filter */}
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            { 
              backgroundColor: filters.filterType !== FILTER_TYPES.THIS_MONTH ? COLORS.brandLight : COLORS.card,
              minHeight: moderateScale(34),
              paddingHorizontal: moderateScale(12),
              paddingVertical: moderateScale(6),
            }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Calendar size={moderateScale(14)} color={filters.filterType !== FILTER_TYPES.THIS_MONTH ? COLORS.brand : COLORS.sub} />
          <Text style={[
            styles.quickFilterText,
            { 
              color: filters.filterType !== FILTER_TYPES.THIS_MONTH ? COLORS.brand : COLORS.text,
              fontSize: moderateScale(12),
            }
          ]}>
            {getFilterLabel(filters.filterType)}
          </Text>
        </TouchableOpacity>

        {/* Status Quick Filter */}
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            { 
              backgroundColor: filters.status ? COLORS.brandLight : COLORS.card,
              minHeight: moderateScale(34),
              paddingHorizontal: moderateScale(12),
              paddingVertical: moderateScale(6),
            }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <CheckCircle size={moderateScale(14)} color={filters.status ? COLORS.brand : COLORS.sub} />
          <Text style={[
            styles.quickFilterText,
            { 
              color: filters.status ? COLORS.brand : COLORS.text,
              fontSize: moderateScale(12),
            }
          ]}>
            {getStatusLabel(filters.status)}
          </Text>
        </TouchableOpacity>

        {/* Source Quick Filter */}
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            { 
              backgroundColor: filters.source ? COLORS.brandLight : COLORS.card,
              minHeight: moderateScale(34),
              paddingHorizontal: moderateScale(12),
              paddingVertical: moderateScale(6),
            }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Tag size={moderateScale(14)} color={filters.source ? COLORS.brand : COLORS.sub} />
          <Text style={[
            styles.quickFilterText,
            { 
              color: filters.source ? COLORS.brand : COLORS.text,
              fontSize: moderateScale(12),
            }
          ]}>
            {getSourceLabel(filters.source)}
          </Text>
        </TouchableOpacity>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <TouchableOpacity onPress={handleResetFilters} style={[styles.clearAllButton, {
            paddingHorizontal: moderateScale(12),
            paddingVertical: moderateScale(6),
            minHeight: moderateScale(34),
          }]}>
            <Text style={[styles.clearAllText, {
              fontSize: moderateScale(12),
            }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <AlertCircle size={48} color={COLORS.sub} />
      <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No Transactions Found</Text>
      <Text style={[styles.emptySub, { color: COLORS.sub }]}>
        {hasActiveFilters
          ? "Try adjusting filters or search terms."
          : "No transactions available for the selected period."}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity style={[styles.clearEmptyButton, { backgroundColor: COLORS.brand }]} onPress={handleResetFilters}>
          <Text style={styles.clearEmptyButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    console.log("66666666",item)
    const paddedId = String(item?.id ?? "").padStart(4, "0");
    const patientName = item?.patientName || "Unknown Patient";
    const patientPhone = item?.patientPhone || "No contact info";
    const doctorRevenue = parseFloat(item?.doctorRevenue || "0");
    const consultationFee = item?.consultationFee || 0;
    const commission = parseFloat(item?.commissionPercentage || "0").toFixed(1);
    const department = item?.departmentName || "No department";
    const transactionDate = formatDate(item?.date);
    const sourceLabel = getSourceLabel(item?.source);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.card,
          { backgroundColor: COLORS.card, borderColor: COLORS.border },
        ]}
      >
        <View style={styles.cardRow}>
          <View style={styles.avatar}>
            <User size={20} color={COLORS.brand} />
          </View>

          <View style={styles.meta}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: COLORS.text }]} numberOfLines={1}>
                {patientName}
              </Text>
              <StatusPill status={item?.status} />
            </View>

            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              Phone: {patientPhone}
            </Text>

            <View style={styles.infoRow}>
              <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
                ID: {paddedId}
              </Text>
              <Text style={[styles.dot, { color: COLORS.sub }]}>•</Text>
              <Text style={[styles.sub, { color: COLORS.sub }]}>
                {transactionDate}
              </Text>
              <Text style={[styles.dot, { color: COLORS.sub }]}>•</Text>
              <Text style={[styles.sub, { color: COLORS.sub }]}>
                {sourceLabel}
              </Text>
            </View>

            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              Department: {department}
            </Text>

            <View style={styles.amountRow}>
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>Consultation Fee</Text>
                <Text style={[styles.amountValue, { color: COLORS.text }]}>
                  {formatCurrency(consultationFee)}
                </Text>
              </View>
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>Doctor Revenue</Text>
                <Text style={[styles.amountValue, { color: COLORS.success }]}>
                  {formatCurrency(doctorRevenue)}
                </Text>
              </View>
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>Commission</Text>
                <Text style={[styles.amountValue, { color: COLORS.warning }]}>
                  {commission}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={[styles.pagination, { borderTopColor: COLORS.border }]}>
        <Text style={[styles.resultsText, { color: COLORS.text }]}>
          Results: {totalRecords} transactions
        </Text>

        <View style={styles.pageControls}>
          <Text style={[styles.pageInfo, { color: COLORS.text }]}>
            Page {currentPage} of {totalPages}
          </Text>

          <View style={styles.pageButtons}>
            <TouchableOpacity
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={[styles.pageBtn, { backgroundColor: COLORS.card }, currentPage === 1 && styles.pageBtnDisabled]}
            >
              <ChevronLeft size={18} color={currentPage === 1 ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={[styles.pageBtn, { backgroundColor: COLORS.card }, currentPage === totalPages && styles.pageBtnDisabled]}
            >
              <ChevronRight size={18} color={currentPage === totalPages ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  /* ---------------- MAIN RENDER ---------------- */
  if (authError) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <View style={styles.loader}>
          <AlertCircle size={48} color={COLORS.danger} />
          <Text style={styles.loaderText}>Please login to continue</Text>
          <Text style={styles.subText}>Redirecting to login...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {renderHeader()}

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={[styles.loadingText, { color: COLORS.sub }]}>
            Loading transactions…
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={transactions}
          keyExtractor={(item) => `${item.id}-${item.date}`}
          renderItem={renderTransactionItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.brand]}
              tintColor={COLORS.brand}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderPagination}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />
    </SafeAreaView>
  );
};

export default AllTransactionsScreen;

/* ======================= STYLES ======================= */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
    padding: 20,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.sub,
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchWrap: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    includeFontPadding: false,
  },
  quickFiltersContainer: {
    marginTop: 8,
  },
  quickFiltersContent: {
    gap: 8,
    paddingRight: 20,
  },
  quickFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickFilterText: {
    fontWeight: "600",
  },
  clearAllButton: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  clearAllText: {
    color: COLORS.danger,
    fontWeight: "600",
  },
  // Filter Modal Styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterScroll: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.text,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterOptionActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterOptionIcon: {
    marginRight: 6,
  },
  filterOptionText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
  },
  sortOptions: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterModalButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  filterModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: COLORS.brandLight,
  },
  meta: {
    flex: 1,
    minHeight: 60,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  sub: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    marginTop: 2,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  dot: { fontSize: 12 },
  amountRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  amountSection: {
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 10,
    color: COLORS.sub,
    fontWeight: "600",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  clearEmptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearEmptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pageControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: "600"
  },
  pageButtons: {
    flexDirection: "row",
    gap: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageBtnDisabled: {
    opacity: 0.4
  },
});