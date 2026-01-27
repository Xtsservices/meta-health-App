import React, { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { showError, showSuccess } from "../../store/toast.slice";
import { formatDate, formatDateTime } from "../../utils/dateTime";
import { COLORS } from "../../utils/colour";
import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import { Alert } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_SIZE = 20;

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

  return (
    <View style={[
      styles.statusPill,
      { backgroundColor: getStatusBgColor() }
    ]}>
      <View style={[
        styles.statusDot,
        { backgroundColor: getStatusColor() }
      ]} />
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
  const [filterType, setFilterType] = useState<string>(params?.filterType || "this_month");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<string>("DESC");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [authError, setAuthError] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  
  // Date range filter state
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [dateFilterApplied, setDateFilterApplied] = useState(false);
  const [hospitalIDs, setHospitalIDs] = useState<string>("");

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
      "today": "Today",
      "yesterday": "Yesterday",
      "this_week": "This Week",
      "last_week": "Last Week",
      "this_month": "This Month",
      "last_month": "Last Month",
      "this_year": "This Year",
      "all": "All Time",
    };
    return labels[type] || type.replace("_", " ").toUpperCase();
  };

  const getSortLabel = (sort: string) => {
    const labels: Record<string, string> = {
      "date": "Date",
      "consultationFee": "Fee Amount",
      "doctorRevenue": "Doctor Revenue",
      "hospitalRevenue": "Hospital Revenue",
      "hospitalName": "Hospital Name",
    };
    return labels[sort] || sort;
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
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id) {
        dispatch(showError("Please login to continue"));
        return;
      }

      // Build URL with filters
      let url = `revenue/central/history/${user.id}?page=${page}&limit=${PAGE_SIZE}`;
      
      // Add status filter
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }
      
      // Add source filter
      if (sourceFilter !== "all") {
        url += `&source=${sourceFilter}`;
      }
      
      // Add time period filter
      if (filterType && filterType !== "all") {
        url += `&filterType=${filterType}`;
      }
      
      // Add date range filter
      if (dateFilterApplied && startDate && endDate) {
        const formatDateForAPI = (date: Date) => {
          return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        };
        url += `&startDate=${formatDateForAPI(startDate)}&endDate=${formatDateForAPI(endDate)}`;
      }
      
      // Add search filter
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      
      // Add sort parameters
      if (sortBy && sortOrder) {
        url += `&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      }
      
      // Add hospital IDs filter
      if (hospitalIDs.trim()) {
        url += `&hospitalIDs=${hospitalIDs.trim()}`;
      }

      const response = await AuthFetch(url, token) as any;

      if (response?.data?.success || response?.success) {
        const data = response?.data?.data || response?.data || {};
        if (page === 1) {
          setTransactions(data.transactions || []);
        } else {
          setTransactions(prev => [...prev, ...(data.transactions || [])]);
        }
        setCurrentPage(page);
        setHasMore(data.pagination?.hasNextPage || false);
        setTotalRecords(data.pagination?.totalRecords || 0);
      }
    } catch (error) {
      console.error("Load transactions error:", error);
      dispatch(showError("Failed to load transactions"));
    }
  };

  // Debounced fetch function
  const debouncedFetchRef = useRef(
    debounce(() => {
      loadTransactions(1);
    }, DEBOUNCE_DELAY)
  );

  useEffect(() => {
    debouncedFetchRef.current();
  }, [fetchTrigger, filterType, statusFilter, sourceFilter, sortBy, sortOrder, dateFilterApplied, hospitalIDs]);

  useEffect(() => {
    return () => {
      debouncedFetchRef.current.cancel();
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
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadTransactions(currentPage + 1);
    }
  };

  /* ---------------- FILTER HANDLERS ---------------- */
  const handleSearchChange = (text: string) => {
    setSearch(text);
    triggerFetch();
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    triggerFetch();
  };

  const handleSourceFilterChange = (value: string) => {
    setSourceFilter(value);
    triggerFetch();
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(field);
      setSortOrder("DESC");
    }
    triggerFetch();
  };

  const handleTimeFilterChange = (value: string) => {
    setFilterType(value);
    triggerFetch();
  };

  const handleHospitalIDsChange = (text: string) => {
    setHospitalIDs(text);
  };

  const applyHospitalIDsFilter = () => {
    triggerFetch();
  };

  // Date range filter functions
  const handleApplyDateFilter = () => {
    if (startDate && endDate) {
      if (startDate > endDate) {
        dispatch(showError("Start date cannot be after end date"));
        return;
      }
      setDateFilterApplied(true);
      triggerFetch();
      setShowDateFilter(false);
    } else {
      dispatch(showError("Please select both start and end dates"));
    }
  };

  const handleClearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setDateFilterApplied(false);
    triggerFetch();
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-GB"); // DD/MM/YYYY format
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

  const clearAllFilters = () => {
    setSearch("");
    setFilterType("this_month");
    setStatusFilter("all");
    setSourceFilter("all");
    setSortBy("date");
    setSortOrder("DESC");
    setStartDate(null);
    setEndDate(null);
    setDateFilterApplied(false);
    setHospitalIDs("");
    triggerFetch();
  };

  const hasActiveFilters = search !== "" || 
    filterType !== "this_month" || 
    statusFilter !== "all" || 
    sourceFilter !== "all" ||
    sortBy !== "date" ||
    dateFilterApplied ||
    hospitalIDs !== "";

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

      {/* Filter Toggle Button */}
      <TouchableOpacity
        style={[styles.filterToggle, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Filter size={16} color={COLORS.brand} />
        <Text style={[styles.filterToggleText, { color: COLORS.text }]}>
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Text>
        {hasActiveFilters && (
          <View style={styles.filterCountBadge}>
            <Text style={styles.filterCountText}>
              {[
                filterType !== "this_month" ? 1 : 0,
                statusFilter !== "all" ? 1 : 0,
                sourceFilter !== "all" ? 1 : 0,
                dateFilterApplied ? 1 : 0,
                hospitalIDs !== "" ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterBadgesContainer}
          contentContainerStyle={styles.filterBadgesContent}
        >
          {filterType !== "this_month" && (
            <View style={styles.filterBadge}>
              <Calendar size={12} color={COLORS.brand} />
              <Text style={styles.filterBadgeText} numberOfLines={1}>
                {getFilterLabel(filterType)}
              </Text>
            </View>
          )}
          
          {statusFilter !== "all" && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText} numberOfLines={1}>
                Status: {statusFilter.toUpperCase()}
              </Text>
            </View>
          )}
          
          {sourceFilter !== "all" && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText} numberOfLines={1}>
                Source: {sourceFilter.toUpperCase()}
              </Text>
            </View>
          )}
          
          {dateFilterApplied && (
            <View style={styles.filterBadge}>
              <Calendar size={12} color={COLORS.brand} />
              <Text style={styles.filterBadgeText} numberOfLines={1}>
                Date Range
              </Text>
            </View>
          )}
          
          {hospitalIDs !== "" && (
            <View style={styles.filterBadge}>
              <Building size={12} color={COLORS.brand} />
              <Text style={styles.filterBadgeText} numberOfLines={1}>
                Hospitals: {hospitalIDs}
              </Text>
            </View>
          )}
          
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={[styles.filtersContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {/* Time Period Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>Time Period</Text>
            <View style={styles.filterOptions}>
              {["today", "this_week", "this_month", "this_year", "all"].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.filterOption,
                    { backgroundColor: COLORS.card, borderColor: COLORS.border },
                    filterType === period && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }
                  ]}
                  onPress={() => handleTimeFilterChange(period)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: COLORS.text },
                    filterType === period && { color: "#fff" }
                  ]}>
                    {getFilterLabel(period)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>Status</Text>
            <View style={styles.filterOptions}>
              {["all", "pending", "paid", "cancelled"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    { backgroundColor: COLORS.card, borderColor: COLORS.border },
                    statusFilter === status && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }
                  ]}
                  onPress={() => handleStatusFilterChange(status)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: COLORS.text },
                    statusFilter === status && { color: "#fff" }
                  ]}>
                    {status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Source Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>Source</Text>
            <View style={styles.filterOptions}>
              {["all", "consultation", "surgery", "medicine"].map((source) => (
                <TouchableOpacity
                  key={source}
                  style={[
                    styles.filterOption,
                    { backgroundColor: COLORS.card, borderColor: COLORS.border },
                    sourceFilter === source && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }
                  ]}
                  onPress={() => handleSourceFilterChange(source)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: COLORS.text },
                    sourceFilter === source && { color: "#fff" }
                  ]}>
                    {source.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>Sort By</Text>
            <View style={styles.sortOptions}>
              {[
                { field: "date", label: "Date" },
                { field: "consultationFee", label: "Fee" },
                { field: "doctorRevenue", label: "Doctor Revenue" },
                { field: "hospitalRevenue", label: "Hospital Revenue" },
                { field: "hospitalName", label: "Hospital Name" },
              ].map(({ field, label }) => (
                <TouchableOpacity
                  key={field}
                  style={[
                    styles.sortOption,
                    { backgroundColor: COLORS.card, borderColor: COLORS.border },
                    sortBy === field && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }
                  ]}
                  onPress={() => handleSortChange(field)}
                >
                  <Text style={[
                    styles.sortOptionText,
                    { color: COLORS.text },
                    sortBy === field && { color: "#fff" }
                  ]}>
                    {label}
                  </Text>
                  {sortBy === field && (
                    <Text style={[
                      styles.sortOrderIndicator,
                      { color: "#fff" }
                    ]}>
                      {sortOrder === "ASC" ? "↑" : "↓"}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hospital IDs Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>Hospital IDs (comma separated)</Text>
            <View style={[styles.hospitalInputContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
              <TextInput
                placeholder="e.g., 1,2,3"
                placeholderTextColor={COLORS.placeholder}
                value={hospitalIDs}
                onChangeText={handleHospitalIDsChange}
                style={[styles.hospitalInput, { color: COLORS.text }]}
                keyboardType="numbers-and-punctuation"
              />
              <TouchableOpacity
                style={[styles.applyHospitalButton, { backgroundColor: COLORS.brand }]}
                onPress={applyHospitalIDsFilter}
              >
                <Text style={styles.applyHospitalText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Range Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>Date Range</Text>
            <TouchableOpacity
              style={[styles.dateFilterButton, { 
                backgroundColor: dateFilterApplied ? COLORS.brand : COLORS.card,
                borderColor: dateFilterApplied ? COLORS.brand : COLORS.border 
              }]}
              onPress={() => setShowDateFilter(true)}
            >
              <Calendar size={16} color={dateFilterApplied ? "#fff" : COLORS.sub} />
              <Text style={[styles.dateFilterButtonText, { 
                color: dateFilterApplied ? "#fff" : COLORS.text 
              }]}>
                {dateFilterApplied ? 'Date Filter Applied' : 'Select Date Range'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Clear All Button */}
          <TouchableOpacity
            style={[styles.clearAllFiltersButton, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
            onPress={clearAllFilters}
          >
            <Text style={[styles.clearAllFiltersText, { color: COLORS.danger }]}>Clear All Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderDateFilterModal = () => (
    <Modal
      visible={showDateFilter}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDateFilter(false)}
    >
      <TouchableOpacity
        style={styles.dateModalOverlay}
        activeOpacity={1}
        onPress={() => setShowDateFilter(false)}
      >
        <TouchableOpacity
          style={[styles.dateModalContent, { backgroundColor: COLORS.card }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.dateModalHeader}>
            <Text style={[styles.dateModalTitle, { color: COLORS.text }]}>
              📅 Filter by Date
            </Text>
            <TouchableOpacity onPress={() => setShowDateFilter(false)}>
              <X size={20} color={COLORS.sub} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateInputsContainer}>
            {/* Start Date Input */}
            <View style={styles.dateInputGroup}>
              <Text style={[styles.dateLabel, { color: COLORS.text }]}>From Date</Text>
              <TouchableOpacity
                style={[styles.dateInputWrapper, { borderColor: COLORS.border }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Calendar size={16} color={COLORS.sub} style={styles.dateIcon} />
                <Text style={[styles.dateInputText, { color: startDate ? COLORS.text : COLORS.placeholder }]}>
                  {startDate ? formatDisplayDate(startDate) : "Select start date"}
                </Text>
                {startDate && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setStartDate(null);
                    }}
                    style={styles.clearDateButton}
                  >
                    <X size={14} color={COLORS.sub} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* End Date Input */}
            <View style={styles.dateInputGroup}>
              <Text style={[styles.dateLabel, { color: COLORS.text }]}>To Date</Text>
              <TouchableOpacity
                style={[styles.dateInputWrapper, { borderColor: COLORS.border }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Calendar size={16} color={COLORS.sub} style={styles.dateIcon} />
                <Text style={[styles.dateInputText, { color: endDate ? COLORS.text : COLORS.placeholder }]}>
                  {endDate ? formatDisplayDate(endDate) : "Select end date"}
                </Text>
                {endDate && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setEndDate(null);
                    }}
                    style={styles.clearDateButton}
                  >
                    <X size={14} color={COLORS.sub} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Range Summary */}
          {(startDate || endDate) && (
            <View style={[styles.dateRangeSummary, { backgroundColor: COLORS.bg }]}>
              <Text style={[styles.dateRangeText, { color: COLORS.text }]}>
                📌 Selected Range: {startDate ? formatDisplayDate(startDate) : "Start"} 
                {" → "} 
                {endDate ? formatDisplayDate(endDate) : "End"}
              </Text>
              <TouchableOpacity onPress={handleClearDateFilter} style={styles.clearRangeButton}>
                <Text style={[styles.clearRangeText, { color: COLORS.danger }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.dateFormatHint, { color: COLORS.sub }]}>
            Select dates to filter transactions by transaction date
          </Text>

          <View style={styles.dateModalButtons}>
            <TouchableOpacity
              style={[styles.dateModalButton, styles.cancelButton, { borderColor: COLORS.border }]}
              onPress={() => setShowDateFilter(false)}
            >
              <Text style={[styles.cancelButtonText, { color: COLORS.danger }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateModalButton, { 
                backgroundColor: (startDate && endDate) ? COLORS.brand : COLORS.sub,
                opacity: (startDate && endDate) ? 1 : 0.5 
              }]}
              onPress={handleApplyDateFilter}
              disabled={!startDate || !endDate}
            >
              <Text style={styles.applyButtonText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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
        <TouchableOpacity style={[styles.clearEmptyButton, { backgroundColor: COLORS.brand }]} onPress={clearAllFilters}>
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
      {renderFilters()}

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

      {renderDateFilterModal()}
      
      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleStartDateChange}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleEndDateChange}
          minimumDate={startDate || undefined}
        />
      )}
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
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: "flex-start",
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterCountBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  filterCountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  filterBadgesContainer: {
    marginTop: 4,
  },
  filterBadgesContent: {
    gap: 8,
    paddingRight: 20,
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.brand,
  },
  filterBadgeText: {
    fontSize: 12,
    color: COLORS.brand,
    fontWeight: "600",
    flexShrink: 1,
  },
  clearAllButton: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  clearAllText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: "600",
  },
  filtersContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    maxHeight: 400,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  filterSection: {
    gap: 8,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sortOrderIndicator: {
    fontSize: 10,
    fontWeight: "700",
  },
  hospitalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  hospitalInput: {
    flex: 1,
    fontSize: 15,
    includeFontPadding: false,
  },
  applyHospitalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyHospitalText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  dateFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 48,
  },
  dateFilterButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  clearAllFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    marginTop: 8,
  },
  clearAllFiltersText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Date Filter Modal Styles
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalContent: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateInputsContainer: {
    gap: 16,
    marginBottom: 12,
  },
  dateInputGroup: {
    gap: 6,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateInputText: {
    flex: 1,
    fontSize: 15,
    includeFontPadding: false,
  },
  clearDateButton: {
    padding: 4,
    marginLeft: 8,
  },
  dateRangeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  clearRangeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearRangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateFormatHint: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  dateModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dateModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  cancelButtonText: {
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
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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