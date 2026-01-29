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
  FlatList,
  Dimensions,
  Alert,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Filter,
  XCircle,
  CheckCircle,
  ChevronLeft,
  Download,
  Calendar,
  X,
  AlertCircle,
  Search,
  ChevronRight,
  Building,
  User,
  CreditCard,
  FileText,
  Clock,
  ArrowUpDown,
  Tag,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { showError, showSuccess } from "../../store/toast.slice";
import { formatDate, formatDateTime } from "../../utils/dateTime";
import { COLORS } from "../../utils/colour";
import { debounce } from "../../utils/debounce";
import RNFS from "react-native-fs";
import Share from "react-native-share";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_SIZE = 20;

/* ---------------- CONSTANTS ---------------- */
const FILTER_TYPES = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  THIS_WEEK: "this_week",
  LAST_WEEK: "last_week",
  THIS_MONTH: "this_month",
  LAST_MONTH: "last_month",
  THIS_YEAR: "this_year",
  ALL: "all",
};

const REVENUE_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
};

const REVENUE_SOURCE = {
  CONSULTATION: "consultation",
  SURGERY: "surgery",
  MEDICINE: "medicine",
};

/* ---------------- TYPES ---------------- */
interface Transaction {
  id: number;
  hospital: {
    id: number;
    name: string;
    city: string;
  };
  patient: {
    id: number;
    name: string;
    mobile: string;
  };
  consultationFee: number;
  commissionPercentage: number;
  doctorRevenue: number;
  hospitalRevenue: number;
  status: string;
  source: string;
  revenueType: string;
  date: string;
  createdAt: string;
}

interface RouteParams {
  filterType?: string;
  groupBy?: string;
}

interface Filters {
  filterType: string;
  status: string;
  source: string;
  sortBy: "date" | "consultationFee" | "doctorRevenue" | "hospitalRevenue" | "hospitalName";
  sortOrder: "ASC" | "DESC";
  startDate: Date | null;
  endDate: Date | null;
  hospitalIDs: string;
}

/* ---------------- STATUS PILL COMPONENT ---------------- */
const StatusPill = ({ status }: { status?: string }) => {
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.sub;
    }
  };

  const getStatusBgColor = () => {
    switch (status?.toLowerCase()) {
      case 'paid': return COLORS.successLight;
      case 'pending': return COLORS.warningLight;
      case 'cancelled': return COLORS.errorLight;
      default: return COLORS.border;
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
    <View style={[
      styles.statusPill,
      { backgroundColor: getStatusBgColor() }
    ]}>
      {getStatusIcon(status)}
      <Text style={[
        styles.statusText,
        { color: getStatusColor() }
      ]}>
        {status?.toUpperCase() || "UNKNOWN"}
      </Text>
    </View>
  );
};

/* ---------------- SOURCE BADGE COMPONENT ---------------- */
const SourceBadge = ({ source }: { source?: string }) => {
  const getSourceColor = () => {
    switch (source?.toLowerCase()) {
      case 'consultation': return COLORS.brand;
      case 'surgery': return COLORS.success;
      case 'medicine': return COLORS.warning;
      default: return COLORS.sub;
    }
  };

  const getSourceBgColor = () => {
    switch (source?.toLowerCase()) {
      case 'consultation': return COLORS.infoLight;
      case 'surgery': return COLORS.successLight;
      case 'medicine': return COLORS.warningLight;
      default: return COLORS.border;
    }
  };

  return (
    <View style={[
      styles.sourceBadge,
      { backgroundColor: getSourceBgColor() }
    ]}>
      <Text style={[
        styles.sourceText,
        { color: getSourceColor() }
      ]}>
        {source?.toUpperCase() || "OTHER"}
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
      { backgroundColor: COLORS.card, borderColor: COLORS.border },
      isActive && styles.filterOptionActive,
    ]}
    onPress={() => onPress(value)}
    activeOpacity={0.7}
  >
    {Icon && <Icon size={14} color={isActive ? '#fff' : iconColor || COLORS.sub} style={styles.filterOptionIcon} />}
    <Text style={[
      styles.filterOptionText,
      { color: isActive ? '#fff' : COLORS.text },
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
  filters: Filters;
  onApplyFilters: (filters: Filters) => void;
  onResetFilters: () => void;
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Update local filters when modal opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      filterType: FILTER_TYPES.THIS_MONTH,
      status: "",
      source: "",
      sortBy: "date" as const,
      sortOrder: "DESC" as const,
      startDate: null,
      endDate: null,
      hospitalIDs: "",
    };
    setLocalFilters(resetFilters);
    onResetFilters();
  };

  const getFilterLabel = (type: string) => {
    const labels: Record<string, string> = {
      [FILTER_TYPES.TODAY]: "Today",
      [FILTER_TYPES.YESTERDAY]: "Yesterday",
      [FILTER_TYPES.THIS_WEEK]: "This Week",
      [FILTER_TYPES.LAST_WEEK]: "Last Week",
      [FILTER_TYPES.THIS_MONTH]: "This Month",
      [FILTER_TYPES.LAST_MONTH]: "Last Month",
      [FILTER_TYPES.THIS_YEAR]: "This Year",
      [FILTER_TYPES.ALL]: "All Time",
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
      case REVENUE_SOURCE.CONSULTATION: return "Consultation";
      case REVENUE_SOURCE.SURGERY: return "Surgery";
      case REVENUE_SOURCE.MEDICINE: return "Medicine";
      default: return "All";
    }
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-GB");
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setLocalFilters(prev => ({ ...prev, startDate: selectedDate }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setLocalFilters(prev => ({ ...prev, endDate: selectedDate }));
    }
  };

  const clearDateFilters = () => {
    setLocalFilters(prev => ({ ...prev, startDate: null, endDate: null }));
  };

  const hasDateFilters = localFilters.startDate || localFilters.endDate;

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
            contentContainerStyle={styles.filterScrollContent}
          >
            {/* Time Period */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Time Period
              </Text>
              <View style={styles.filterOptions}>
                {[
                  FILTER_TYPES.TODAY,
                  FILTER_TYPES.YESTERDAY,
                  FILTER_TYPES.THIS_WEEK,
                  FILTER_TYPES.LAST_WEEK,
                  FILTER_TYPES.THIS_MONTH,
                  FILTER_TYPES.LAST_MONTH,
                  FILTER_TYPES.THIS_YEAR,
                  FILTER_TYPES.ALL
                ].map((period) => (
                  <FilterOption
                    key={period}
                    label={getFilterLabel(period)}
                    value={period}
                    isActive={localFilters.filterType === period}
                    onPress={(value) => setLocalFilters(prev => ({ ...prev, filterType: value }))}
                    icon={Calendar}
                    iconColor={COLORS.brand}
                  />
                ))}
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
                  label="Consultation"
                  value={REVENUE_SOURCE.CONSULTATION}
                  isActive={localFilters.source === REVENUE_SOURCE.CONSULTATION}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="Surgery"
                  value={REVENUE_SOURCE.SURGERY}
                  isActive={localFilters.source === REVENUE_SOURCE.SURGERY}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="Medicine"
                  value={REVENUE_SOURCE.MEDICINE}
                  isActive={localFilters.source === REVENUE_SOURCE.MEDICINE}
                  onPress={(value) => setLocalFilters(prev => ({ ...prev, source: value }))}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
              </View>
            </View>

            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Date Range
              </Text>
              <View style={styles.dateInputsContainer}>
                <View style={styles.dateInputGroup}>
                  <Text style={[styles.dateLabel, { color: COLORS.text }]}>From Date</Text>
                  <TouchableOpacity
                    style={[styles.dateInputWrapper, { borderColor: COLORS.border }]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Calendar size={16} color={COLORS.sub} style={styles.dateIcon} />
                    <Text style={[styles.dateInputText, { color: localFilters.startDate ? COLORS.text : COLORS.placeholder }]}>
                      {localFilters.startDate ? formatDisplayDate(localFilters.startDate) : "Select start date"}
                    </Text>
                    {localFilters.startDate && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setLocalFilters(prev => ({ ...prev, startDate: null }));
                        }}
                        style={styles.clearDateButton}
                      >
                        <X size={14} color={COLORS.sub} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.dateInputGroup}>
                  <Text style={[styles.dateLabel, { color: COLORS.text }]}>To Date</Text>
                  <TouchableOpacity
                    style={[styles.dateInputWrapper, { borderColor: COLORS.border }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Calendar size={16} color={COLORS.sub} style={styles.dateIcon} />
                    <Text style={[styles.dateInputText, { color: localFilters.endDate ? COLORS.text : COLORS.placeholder }]}>
                      {localFilters.endDate ? formatDisplayDate(localFilters.endDate) : "Select end date"}
                    </Text>
                    {localFilters.endDate && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setLocalFilters(prev => ({ ...prev, endDate: null }));
                        }}
                        style={styles.clearDateButton}
                      >
                        <X size={14} color={COLORS.sub} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {hasDateFilters && (
                <TouchableOpacity 
                  style={[styles.clearDateRangeButton, { backgroundColor: COLORS.dangerLight }]}
                  onPress={clearDateFilters}
                >
                  <Text style={[styles.clearDateRangeText, { color: COLORS.danger }]}>Clear Date Range</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Hospital IDs Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Hospital IDs (comma separated)
              </Text>
              <View style={[styles.hospitalInputContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                <TextInput
                  placeholder="e.g., 1,2,3"
                  placeholderTextColor={COLORS.placeholder}
                  value={localFilters.hospitalIDs}
                  onChangeText={(text) => setLocalFilters(prev => ({ ...prev, hospitalIDs: text }))}
                  style={[styles.hospitalInput, { color: COLORS.text }]}
                  keyboardType="numbers-and-punctuation"
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
                  {[
                    { field: "date", label: "Date" },
                    { field: "consultationFee", label: "Fee" },
                    { field: "doctorRevenue", label: "Doctor Revenue" },
                    { field: "hospitalRevenue", label: "Hospital Revenue" },
                    { field: "hospitalName", label: "Hospital Name" },
                  ].map(({ field, label }) => (
                    <FilterOption
                      key={field}
                      label={label}
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

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={localFilters.startDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleStartDateChange}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={localFilters.endDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleEndDateChange}
          minimumDate={localFilters.startDate || undefined}
        />
      )}
    </Modal>
  );
};

/* ======================= CENTRAL TRANSACTIONS SCREEN ======================= */
const CentralTransactionsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const params = route.params as RouteParams;
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
  
  // All filters state combined
  const [filters, setFilters] = useState<Filters>({
    filterType: params?.filterType || FILTER_TYPES.THIS_MONTH,
    status: "",
    source: "",
    sortBy: "date",
    sortOrder: "DESC",
    startDate: null,
    endDate: null,
    hospitalIDs: "",
  });

  const flatRef = useRef<FlatList<Transaction>>(null);

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const formatCurrency = (amount?: number) => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDateForExport = (d?: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("en-GB");
    } catch {
      return d;
    }
  };

  const getFilterLabel = (type: string) => {
    const labels: Record<string, string> = {
      [FILTER_TYPES.TODAY]: "Today",
      [FILTER_TYPES.YESTERDAY]: "Yesterday",
      [FILTER_TYPES.THIS_WEEK]: "This Week",
      [FILTER_TYPES.LAST_WEEK]: "Last Week",
      [FILTER_TYPES.THIS_MONTH]: "This Month",
      [FILTER_TYPES.LAST_MONTH]: "Last Month",
      [FILTER_TYPES.THIS_YEAR]: "This Year",
      [FILTER_TYPES.ALL]: "All Time",
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
      case REVENUE_SOURCE.CONSULTATION: return "Consultation";
      case REVENUE_SOURCE.SURGERY: return "Surgery";
      case REVENUE_SOURCE.MEDICINE: return "Medicine";
      default: return "All";
    }
  };

  /* ---------------- TOKEN VALIDATION ---------------- */
  const validateToken = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setAuthError(true);
        dispatch(showError("Please login to access transactions"));
        setTimeout(() => navigation.navigate("Login" as never), 2000);
        return false;
      }
      return true;
    } catch {
      setAuthError(true);
      dispatch(showError("Authentication error"));
      return false;
    }
  };

  /* ---------------- LOAD TRANSACTIONS ---------------- */
  const loadTransactions = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id) {
        dispatch(showError("Please login to continue"));
        setAuthError(true);
        return;
      }

      // Build URL with all filters
      let url = `revenue/central/history/${user.id}?page=${page}&limit=${PAGE_SIZE}`;
      
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
      
      // Add date range filter
      if (filters.startDate && filters.endDate) {
        const formatDateForAPI = (date: Date) => {
          return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        };
        url += `&startDate=${formatDateForAPI(filters.startDate)}&endDate=${formatDateForAPI(filters.endDate)}`;
      }
      
      // Add search filter
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      
      // Add sorting
      url += `&sortBy=${filters.sortBy}&sortOrder=${filters.sortOrder}`;
      
      // Add hospital IDs filter
      if (filters.hospitalIDs.trim()) {
        url += `&hospitalIDs=${filters.hospitalIDs.trim()}`;
      }

      console.log("Loading transactions with URL:", url);
      const response = await AuthFetch(url, token) as any;
      
      if (response?.data?.success || response?.success) {
        const data = response?.data?.data || response?.data || {};
        const transactionsData = data.transactions || [];
        const pagination = data.pagination || {};
        
        if (page === 1) {
          setTransactions(transactionsData);
        } else {
          setTransactions(prev => [...prev, ...transactionsData]);
        }
        setCurrentPage(page);
        setHasMore(pagination?.hasNextPage || false);
        setTotalRecords(pagination?.totalRecords || 0);
      } else {
        setTransactions([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Load transactions error:", error);
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
  }, [
    filters.filterType, 
    filters.status, 
    filters.source, 
    filters.sortBy, 
    filters.sortOrder,
    filters.startDate,
    filters.endDate,
    filters.hospitalIDs
  ]);

  useEffect(() => {
    // Debounced search
    debouncedSearchRef.current();
  }, [search]);

  useEffect(() => {
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, []);

  const triggerFetch = () => {
    setFetchTrigger(prev => prev + 1);
  };

  useFocusEffect(
    useCallback(() => {
      if (!authError) {
        setLoading(true);
        loadTransactions(1).finally(() => setLoading(false));
      }
    }, [authError])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions(1);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadTransactions(currentPage + 1);
    }
  };

  /* ---------------- FILTER HANDLERS ---------------- */
  const handleSearchChange = (text: string) => {
    setSearch(text);
  };

  const handleApplyFilters = (newFilters: Filters) => {
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
      startDate: null,
      endDate: null,
      hospitalIDs: "",
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
        "Hospital Name",
        "Hospital City",
        "Patient Name",
        "Patient Phone",
        "Date",
        "Consultation Fee",
        "Commission %",
        "Doctor Revenue",
        "Hospital Revenue",
        "Status",
        "Source",
        "Created At",
      ];

      const rows = transactions.map((t) => [
        t.id ?? "",
        t.hospital?.name ?? "",
        t.hospital?.city ?? "",
        t.patient?.name ?? "",
        t.patient?.mobile ?? "",
        formatDateForExport(t.date),
        t.consultationFee ?? 0,
        t.commissionPercentage ?? 0,
        t.doctorRevenue ?? 0,
        t.hospitalRevenue ?? 0,
        t.status ?? "",
        t.source ?? "",
        formatDateForExport(t.createdAt),
      ]);

      const csvContent =
        [headers, ...rows]
          .map(row =>
            row.map(cell =>
              `"${String(cell).replace(/"/g, '""')}"`
            ).join(",")
          )
          .join("\n");

      const fileName = `central_transactions_${Date.now()}.csv`;
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
    filters.sortOrder !== "DESC" ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.hospitalIDs !== "";

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-GB");
  };

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
            Central Transactions
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
          placeholder="Search by patient, hospital, or ID"
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

      {/* Quick Filters Bar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickFiltersContainer}
        contentContainerStyle={styles.quickFiltersContent}
      >
        <TouchableOpacity
          style={[styles.quickFilterButton, { backgroundColor: COLORS.card }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={14} color={COLORS.brand} />
          <Text style={[styles.quickFilterText, { color: COLORS.text }]}>
            Filters
          </Text>
        </TouchableOpacity>

        {/* Time Period Quick Filter */}
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            { backgroundColor: filters.filterType !== FILTER_TYPES.THIS_MONTH ? COLORS.brandLight : COLORS.card }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Calendar size={14} color={filters.filterType !== FILTER_TYPES.THIS_MONTH ? COLORS.brand : COLORS.sub} />
          <Text style={[
            styles.quickFilterText,
            { color: filters.filterType !== FILTER_TYPES.THIS_MONTH ? COLORS.brand : COLORS.text }
          ]}>
            {getFilterLabel(filters.filterType)}
          </Text>
        </TouchableOpacity>

        {/* Status Quick Filter */}
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            { backgroundColor: filters.status ? COLORS.brandLight : COLORS.card }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <CheckCircle size={14} color={filters.status ? COLORS.brand : COLORS.sub} />
          <Text style={[
            styles.quickFilterText,
            { color: filters.status ? COLORS.brand : COLORS.text }
          ]}>
            {getStatusLabel(filters.status)}
          </Text>
        </TouchableOpacity>

        {/* Source Quick Filter */}
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            { backgroundColor: filters.source ? COLORS.brandLight : COLORS.card }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Tag size={14} color={filters.source ? COLORS.brand : COLORS.sub} />
          <Text style={[
            styles.quickFilterText,
            { color: filters.source ? COLORS.brand : COLORS.text }
          ]}>
            {getSourceLabel(filters.source)}
          </Text>
        </TouchableOpacity>

        {/* Date Range Quick Filter */}
        {(filters.startDate || filters.endDate) && (
          <TouchableOpacity
            style={[styles.quickFilterButton, { backgroundColor: COLORS.brandLight }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Calendar size={14} color={COLORS.brand} />
            <Text style={[styles.quickFilterText, { color: COLORS.brand }]}>
              {filters.startDate && filters.endDate 
                ? `${formatDisplayDate(filters.startDate)}-${formatDisplayDate(filters.endDate)}`
                : 'Date Range'
              }
            </Text>
          </TouchableOpacity>
        )}

        {/* Hospital IDs Quick Filter */}
        {filters.hospitalIDs !== "" && (
          <TouchableOpacity
            style={[styles.quickFilterButton, { backgroundColor: COLORS.brandLight }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Building size={14} color={COLORS.brand} />
            <Text style={[styles.quickFilterText, { color: COLORS.brand }]}>
              Hospitals Filter
            </Text>
          </TouchableOpacity>
        )}

        {/* Clear All Button */}
        {hasActiveFilters && (
          <TouchableOpacity onPress={handleResetFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <FileText size={48} color={COLORS.sub} />
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
    const paddedId = String(item?.id ?? "").padStart(4, "0");
    const hospitalName = item?.hospital?.name || "Unknown Hospital";
    const hospitalCity = item?.hospital?.city || "";
    const patientName = item?.patient?.name || "Unknown Patient";
    const patientPhone = item?.patient?.mobile || "No contact";
    const transactionDate = formatDate(item?.date);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.card,
          { backgroundColor: COLORS.card, borderColor: COLORS.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.transactionIdContainer}>
            <Text style={[styles.transactionId, { color: COLORS.text }]}>
              TXN-{paddedId}
            </Text>
          </View>
          <View style={styles.headerBadges}>
            <StatusPill status={item?.status} />
            <SourceBadge source={item?.source} />
          </View>
        </View>

        <View style={styles.cardContent}>
          {/* Hospital Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Building size={14} color={COLORS.sub} />
              <Text style={[styles.infoLabel, { color: COLORS.text }]}>Hospital:</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]} numberOfLines={1}>
                {hospitalName}
              </Text>
            </View>
            {hospitalCity && (
              <Text style={[styles.infoSub, { color: COLORS.sub }]} numberOfLines={1}>
                {hospitalCity}
              </Text>
            )}
          </View>

          {/* Patient Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <User size={14} color={COLORS.sub} />
              <Text style={[styles.infoLabel, { color: COLORS.text }]}>Patient:</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]} numberOfLines={1}>
                {patientName}
              </Text>
            </View>
            <Text style={[styles.infoSub, { color: COLORS.sub }]} numberOfLines={1}>
              Phone: {patientPhone}
            </Text>
          </View>

          {/* Date */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Calendar size={14} color={COLORS.sub} />
              <Text style={[styles.infoLabel, { color: COLORS.text }]}>Date:</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]}>
                {transactionDate}
              </Text>
            </View>
          </View>

          {/* Financial Info */}
          <View style={styles.financialSection}>
            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={[styles.financialLabel, { color: COLORS.sub }]}>Consultation Fee</Text>
                <Text style={[styles.financialValue, { color: COLORS.text }]}>
                  {formatCurrency(item?.consultationFee)}
                </Text>
              </View>
              <View style={styles.financialItem}>
                <Text style={[styles.financialLabel, { color: COLORS.sub }]}>Commission</Text>
                <Text style={[styles.financialValue, { color: COLORS.text }]}>
                  {item?.commissionPercentage?.toFixed(1)}%
                </Text>
              </View>
            </View>
            
            <View style={styles.revenueRow}>
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: COLORS.sub }]}>Doctor Revenue</Text>
                <Text style={[styles.revenueValue, { color: COLORS.success }]}>
                  {formatCurrency(item?.doctorRevenue)}
                </Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: COLORS.sub }]}>Hospital Revenue</Text>
                <Text style={[styles.revenueValue, { color: COLORS.brand }]}>
                  {formatCurrency(item?.hospitalRevenue)}
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
          keyExtractor={(item) => String(item.id)}
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

export default CentralTransactionsScreen;

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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickFilterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  clearAllButton: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  clearAllText: {
    fontSize: 12,
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
  filterScrollContent: {
    paddingBottom: 20,
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
    borderWidth: 1,
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
    fontWeight: '500',
  },
  // Date Filter Styles
  dateInputsContainer: {
    gap: 12,
  },
  dateInputGroup: {
    gap: 6,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateInputText: {
    flex: 1,
    fontSize: 14,
    includeFontPadding: false,
  },
  clearDateButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearDateRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  clearDateRangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Hospital Input Styles
  hospitalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  hospitalInput: {
    flex: 1,
    fontSize: 14,
    includeFontPadding: false,
  },
  // Sort Options Styles
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
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  transactionIdContainer: {
    flex: 1,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerBadges: {
    flexDirection: "row",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardContent: {
    gap: 10,
  },
  infoSection: {
    gap: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  infoSub: {
    fontSize: 12,
    marginLeft: 20,
  },
  financialSection: {
    gap: 8,
    marginTop: 4,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  financialItem: {
    alignItems: "center",
    flex: 1,
  },
  financialLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  financialValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  revenueItem: {
    alignItems: "center",
    flex: 1,
  },
  revenueLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  revenueValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
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