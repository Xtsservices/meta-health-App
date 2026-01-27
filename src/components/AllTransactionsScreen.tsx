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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
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
  Eye,
  User,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AuthFetch } from "../auth/auth";
import { RootState } from "../store/store";
import { showError, showSuccess } from "../store/toast.slice";
import { formatDate } from "../utils/dateTime";
import { COLORS } from "../utils/colour";
import { debounce, DEBOUNCE_DELAY } from "../utils/debounce";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import { Alert } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_SIZE = 10;

/* ---------------- TYPES ---------------- */
interface Transaction {
  id?: number;
  patientID?: number;
  consultationFee?: number;
  commissionPercentage?: string;
  doctorRevenue?: string;
  hospitalRevenue?: string;
  status?: string;
  date?: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  departmentName?: string;
}

interface RouteParams {
  filterType?: string;
  statusFilter?: string;
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

};

/* ======================= ALL TRANSACTIONS SCREEN ======================= */
const AllTransactionsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const user = useSelector((s: RootState) => s.currentUser);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("this_month");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
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
      if (!token || !user?.id || !user?.hospitalID) {
        dispatch(showError("Please login to continue"));
        return;
      }

      // Build URL with filters
      let url = `revenue/doctor/${user.id}/history?hospitalID=${user.hospitalID}`;
      
      // Add status filter
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
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
      
      // Add pagination
      url += `&page=${page}&limit=${PAGE_SIZE}`;

      const response = await AuthFetch(url, token) as any;

      if (response?.data?.success) {
        const data = response.data.data || {};
        if (page === 1) {
          setTransactions(data.transactions || []);
        } else {
          setTransactions(prev => [...prev, ...(data.transactions || [])]);
        }
        setCurrentPage(page);
        setHasMore(data.pagination?.hasNextPage || false);
        setTotalRecords(data.pagination?.totalRecords || 0);
      } else if (response?.success) {
        const data = response.data || {};
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
  }, [fetchTrigger, filterType, statusFilter, dateFilterApplied]);

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

  const handleTimeFilterChange = (value: string) => {
    setFilterType(value);
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
      "Patient Name",
      "Phone",
      "Department",
      "Date",
      "Consultation Fee",
      "Commission %",
      "Doctor Revenue",
      "Hospital Revenue",
      "Status",
    ];

    const rows = transactions.map((t) => [
      t.id ?? "",
      t.patientName ?? "",
      t.patientPhone ?? "",
      t.departmentName ?? "",
      formatDateForExport(t.date),
      t.consultationFee ?? 0,
      t.commissionPercentage ?? 0,
      t.doctorRevenue ?? 0,
      t.hospitalRevenue ?? 0,
      t.status ?? "",
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
    Alert.alert("Export failed", "Could not export transactions");
  }
  };

  const clearAllFilters = () => {
    setSearch("");
    setFilterType("this_month");
    setStatusFilter("pending");
    setStartDate(null);
    setEndDate(null);
    setDateFilterApplied(false);
    triggerFetch();
  };

  const hasActiveFilters = search !== "" || 
    filterType !== "this_month" || 
    statusFilter !== "pending" || 
    dateFilterApplied;

  /* ---------------- COMPUTED VALUES ---------------- */
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  
  const filteredAndSearched = useMemo(() => {
    // API already handles filtering, so just return transactions
    return transactions;
  }, [transactions]);

  const pagedData = useMemo(() => {
    // API handles pagination, so just return all transactions for current page
    return filteredAndSearched;
  }, [filteredAndSearched]);

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
          
          {statusFilter !== "pending" && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText} numberOfLines={1}>
                Status: {statusFilter === "all" ? "All" : statusFilter.toUpperCase()}
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
          
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );

  const renderFilters = () => (
    <View style={[styles.filtersContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
      <View style={styles.filtersHeader}>
        <Text style={[styles.filtersTitle, { color: COLORS.text }]}>Filters</Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearButton}>
            <Text style={[styles.clearButtonText, { color: COLORS.danger }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.filtersContent}
      >
       

        {/* Time Period Filter */}
        <View style={[styles.filterWrap, { borderColor: COLORS.border }]}>
          <Text style={[styles.filterLabel, { color: COLORS.text }]}>Time Period</Text>
          <View style={[styles.pickerWrap, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Picker
              selectedValue={filterType}
              onValueChange={handleTimeFilterChange}
              style={[styles.picker, { color: COLORS.text }]}
              dropdownIconColor={COLORS.brand}
            >
              <Picker.Item label="Today" value="today" />
              <Picker.Item label="This Week" value="this_week" />
              <Picker.Item label="This Month" value="this_month" />
              <Picker.Item label="This Year" value="this_year" />
              <Picker.Item label="All Time" value="all" />
            </Picker>
          </View>
        </View>

        {/* Date Range Filter Button */}
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
            {dateFilterApplied ? 'Date Filter' : 'Date Range'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

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
      <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No Transactions Found</Text>
      <Text style={[styles.emptySub, { color: COLORS.sub }]}>
        {search || statusFilter !== "pending" || filterType !== "this_month" || dateFilterApplied
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
    const patientName = item?.patientName || "Unknown Patient";
    const patientPhone = item?.patientPhone || "No contact info";
    const doctorRevenue = parseFloat(item?.doctorRevenue || "0");
    const consultationFee = item?.consultationFee || 0;
    const commission = parseFloat(item?.commissionPercentage || "0").toFixed(1);
    const department = item?.departmentName || "No department";
    const transactionDate = formatDate(item?.date);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.card,
          { backgroundColor: COLORS.card, borderColor: COLORS.border },
        ]}
      >
        <View style={styles.cardRow}>

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
            </View>

            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              Department: {department}
            </Text>

<View style={styles.amountRow}>
  <View style={styles.amountSection}>
    <Text style={styles.amountLabel}>Your Revenue</Text>
    <Text style={[styles.amountValue, { color: COLORS.success }]}>
      {formatCurrency(doctorRevenue)}
    </Text>
  </View>
  <View style={styles.feeSection}>
    <Text style={styles.feeLabel}>Fee: {formatCurrency(consultationFee)}</Text>
    <Text style={[styles.sub, { color: COLORS.sub, fontSize: 10, marginTop: 2 }]}>
      Commission: {commission}%
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
          data={pagedData}
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
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 150,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  pickerWrap: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  picker: {
    flex: 1,
    height: 52,
    marginLeft: 2,
    marginRight: -16,
    marginTop: Platform.OS === "android" ? -4 : 0,
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  amountSection: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    color: COLORS.sub,
    fontWeight: "600",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  feeSection: {
    alignItems: "flex-end",
  },
  feeLabel: {
    fontSize: 11,
    color: COLORS.sub,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    marginLeft: 8,
  },
  viewBtnText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "700"
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700"
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