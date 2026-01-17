import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { RootState } from "../../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  SPACING,
  FONT_SIZE,
  FOOTER_HEIGHT,
  isSmallDevice,
  isExtraSmallDevice,
  responsiveWidth,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

// Import SVG Icons
import {
  SearchIcon,
  CalendarIcon,
  PlusIcon,
  XIcon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  PackageIcon,
  ShoppingBagIcon,
  UsersIcon,
  IndianRupeeIcon,
} from "../../../utils/SvgIcons";
import { AuthFetch } from "../../../auth/auth";
import PharmacyExpensesCard from "./PharmacyExpensesCard";
import OrderExpenseDialog from "./OrderExpenseDialog";
import Footer from "../../dashboard/footer";
import { formatDate } from "../../../utils/dateTime";

const FOOTER_H = FOOTER_HEIGHT;
const PAGE_SIZE = 10;

interface ExpenseData {
  id: number;
  agencyName?: string;
  email?: string;
  contactNo?: string | number;
  agentCode?: number | string;
  manufacturer?: string;
  addedOn?: string;
  medicinesList?: any[];
  totalValue?: number;
}

const PharmacyExpenses: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();

  const [openOrderExpense, setOpenOrderExpense] = useState<boolean>(false);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">("start");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch expense data
  const fetchExpenseData = useCallback(async (isRefresh = false) => {
    if (!user?.hospitalID) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `medicineInventoryExpense/${user.hospitalID}/getInventoryExpenseData`,
        token
      ) as any;

      if (response?.data?.status === 200 && response?.data?.data) {
        const sortedData = [...response?.data?.data].sort((a: ExpenseData, b: ExpenseData) => {
          if (!a?.addedOn && !b?.addedOn) return 0;
          if (!a?.addedOn) return 1;
          if (!b?.addedOn) return -1;

          const dateA = new Date(a.addedOn!);
          const dateB = new Date(b.addedOn!);

          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;

          return dateB.getTime() - dateA.getTime();
        });

        setExpenseData(sortedData);
      } else {
        setExpenseData([]);
      }
    } catch (error) {
      console.warn("Fetch expense data failed:", error);
      setExpenseData([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData, openOrderExpense]);

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchExpenseData(true);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, expenseData.length]);

  // Filter data based on search and date range
  const filteredData = useMemo(() => {
    return expenseData.filter((expense) => {
      if (searchQuery && searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchesAgencyName = expense.agencyName?.toLowerCase().includes(query);
        const matchesContactNo = expense.contactNo?.toString().toLowerCase().includes(query);
        const matchesEmail = expense.email?.toLowerCase().includes(query);
        const matchesManufacturer = expense.manufacturer?.toLowerCase().includes(query);
        const matchesCode = (expense.agentCode ?? "").toString().toLowerCase().includes(query);

        if (!matchesAgencyName && !matchesContactNo && !matchesEmail && !matchesManufacturer && !matchesCode) {
          return false;
        }
      }

      if (startDate && endDate) {
        if (!expense.addedOn) return false;
        try {
          const expenseDate = new Date(expense.addedOn);
          if (isNaN(expenseDate.getTime())) return false;

          const normalizedExpenseDate = new Date(
            expenseDate.getFullYear(),
            expenseDate.getMonth(),
            expenseDate.getDate()
          );
          const normalizedStartDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          const normalizedEndDate = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate()
          );

          return normalizedExpenseDate >= normalizedStartDate && normalizedExpenseDate <= normalizedEndDate;
        } catch (error) {
          return false;
        }
      }

      return true;
    });
  }, [expenseData, searchQuery, startDate, endDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrders = expenseData.length;
    const totalValue = expenseData.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = expenseData.filter(item => {
      if (!item.addedOn) return false;
      return new Date(item.addedOn).toISOString().split("T")[0] === today;
    }).length;

    return {
      totalOrders,
      todayOrders,
      totalValue: totalValue >= 100000 ? `${(totalValue / 100000).toFixed(1)}L` : `₹${totalValue.toLocaleString()}`,
      filteredCount: filteredData.length,
    };
  }, [expenseData, filteredData]);

  // pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(totalItems, startIndex + PAGE_SIZE);
  const paginatedData = filteredData.slice(startIndex, endIndex);
  const getMaximumDate = () => {
    return new Date();
  };
  const getMinimumDateForEnd = () => {
    return startDate || undefined;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      // Normalize the selected date to remove time
      const normalizedDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );

      if (datePickerMode === "start") {
        if (endDate && normalizedDate > endDate) {
          setEndDate(null);
        }
        setStartDate(normalizedDate);
        
        if (Platform.OS === "android") {
          setTimeout(() => {
            setDatePickerMode("end");
            setShowDatePicker(true);
          }, 200);
        } else {
          setDatePickerMode("end");
        }
      } else {
        // For end date, ensure it's not before start date
        if (startDate && normalizedDate < startDate) {
          // Optionally show an alert or just don't set it
          return;
        }
        setEndDate(normalizedDate);
      }
    }
  };

  const handleClearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const getDateRangeText = () => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return `From ${formatDate(startDate)}`;
    } else if (endDate) {
      return `Until ${formatDate(endDate)}`;
    }
    return "Select date range";
  };

  const openDatePicker = (mode: "start" | "end") => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStartDate(null);
    setEndDate(null);
  };

  const navigateToAddItem = () => {
    navigation.navigate("OrderExpenseDialog");
  };

  // Handle card press to navigate to detail screen
  const handleCardPress = (item: ExpenseData) => {
    navigation.navigate("OrderDetailScreen", { 
      orderData: item,
      source: "supplier" 
    });
  };

  const renderStatCard = (title: string, value: string | number, IconComponent: React.ElementType, color: string) => {
    return (
      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>{title}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
          <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
            <IconComponent size={24} color={color} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.brand} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Supplier Order Management</Text>
            <Text style={styles.headerSubtitle}>Manage supplier orders and procurement</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={navigateToAddItem}>
            <PlusIcon size={15} color={COLORS.buttonText} />
            <Text style={styles.addButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: FOOTER_H + (insets.bottom || 0) + SPACING.lg },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInner}>
              <View style={styles.searchLeft}>
                <View style={styles.searchIcon}>
  <SearchIcon size={20} color={COLORS.sub} />
</View>

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search supplier, contact, manufacturer"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={COLORS.sub}
                />
              </View>
            </View>
          </View>
          {/* Orders Section */}
          <View style={styles.ordersSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Recent Orders</Text>
                <Text style={styles.sectionSubtitle}>Recently added supplier orders</Text>
              </View>
              <View style={styles.sectionControls}>
                <View style={styles.itemsCount}>
                  <Text style={styles.countText}>{totalItems} items</Text>
                </View>
              </View>
            </View>

            {/* Date Filter */}
            <View style={styles.dateFilterContainer}>
              <View style={styles.dateInfoWrap}>
                <Text style={styles.smallLabel}>Date Range</Text>
                <TouchableOpacity
                  style={[styles.dateRangeBtn, startDate || endDate ? styles.dateRangeBtnActive : null]}
                  onPress={() => openDatePicker("start")}
                >
                  <CalendarIcon size={16} color={startDate || endDate ? COLORS.brand : COLORS.sub} />
                  <Text numberOfLines={1} style={[styles.dateRangeText, startDate || endDate ? styles.dateRangeTextActive : null]}>
                    {getDateRangeText()}
                  </Text>
                  {(startDate || endDate) && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleClearDates();
                      }}
                      style={styles.dateClearInner}
                    >
                      <XIcon size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.brand} />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : paginatedData.length > 0 ? (
              <>
                <View style={styles.ordersList}>
                  {paginatedData.map((item, index) => (
                    <View key={item?.id?.toString() || index.toString()}>
                      <PharmacyExpensesCard 
                        data={[item]} 
                        onCardPress={handleCardPress}
                      />
                    </View>
                  ))}
                </View>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <Text style={styles.paginationInfo}>
                      Showing {startIndex + 1} to {endIndex} of {totalItems} items
                    </Text>
                    <View style={styles.paginationControls}>
                      <TouchableOpacity 
                        disabled={currentPage === 1} 
                        onPress={() => setCurrentPage(1)} 
                        style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                      >
                        <ChevronsLeftIcon size={16} color={currentPage === 1 ? COLORS.sub : COLORS.text} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        disabled={currentPage === 1} 
                        onPress={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                        style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                      >
                        <ChevronLeftIcon size={16} color={currentPage === 1 ? COLORS.sub : COLORS.text} />
                      </TouchableOpacity>

                      <Text style={styles.pageNumber}>{currentPage} / {totalPages}</Text>

                      <TouchableOpacity 
                        disabled={currentPage === totalPages} 
                        onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                        style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                      >
                        <ChevronRightIcon size={16} color={currentPage === totalPages ? COLORS.sub : COLORS.text} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        disabled={currentPage === totalPages} 
                        onPress={() => setCurrentPage(totalPages)} 
                        style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                      >
                        <ChevronsRightIcon size={16} color={currentPage === totalPages ? COLORS.sub : COLORS.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <PackageIcon size={48} color={COLORS.sub} />
                <Text style={styles.emptyStateTitle}>No Orders Found</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery || (startDate || endDate)
                    ? "Try adjusting your search or date range."
                    : "There are no supplier orders yet. Create a new order to get started."}
                </Text>

                {expenseData.length > 0 ? (
                  <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearAllFilters}>
                    <Text style={styles.clearFiltersText}>Clear Filters</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.emptyStateButton} onPress={navigateToAddItem}>
                    <PlusIcon size={18} color={COLORS.buttonText} />
                    <Text style={styles.emptyStateButtonText}>Create your first order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footerWrap, { bottom: insets.bottom || 0 }]}>
          <Footer active={"orderplacement"} brandColor={COLORS.brand} />
        </View>

        {/* Bottom Safe Area Shield */}
        {insets.bottom > 0 && (
          <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>
                    {datePickerMode === "start" ? "Select start date" : "Select end date"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.closeButton}>
                    <XIcon size={20} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={datePickerMode === "start" ? startDate || new Date() : endDate || startDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  onChange={handleDateChange}
                  maximumDate={getMaximumDate()}
                  minimumDate={datePickerMode === "end" ? getMinimumDateForEnd() : undefined}
                  style={styles.dateTimePicker}
                />
                {datePickerMode === "end" && startDate && (
                  <Text>
                    End date must be on or after {formatDate(startDate)}
                  </Text>
                )}
                <View style={styles.datePickerActions}>
                  <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerConfirmText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: { flex: 1 },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  addButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  content: { flex: 1, backgroundColor: "transparent" },
  contentContainer: { padding: SPACING.sm, gap: SPACING.md },
  searchContainer: { marginHorizontal: SPACING.sm },
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  // Stats Section
  statsSection: { marginHorizontal: SPACING.sm },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    minWidth: responsiveWidth(43),
    borderRadius: 12,
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  statContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statInfo: { flex: 1 },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Orders Section
  ordersSection: { marginHorizontal: SPACING.sm },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
  },
  sectionTitleContainer: { flex: 1 },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  sectionControls: { alignItems: 'flex-end' },
  itemsCount: {
    backgroundColor: COLORS.brand + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.brand + '30',
  },
  countText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand,
    fontWeight: "600",
  },
  
  // Date Filter
  dateFilterContainer: { marginBottom: SPACING.lg },
  dateInfoWrap: { flex: 1 },
  smallLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  dateRangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.field,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateRangeBtnActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  dateRangeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  dateRangeTextActive: {
    color: COLORS.brand,
    fontWeight: "600",
  },
  dateClearInner: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  
  // Orders List
  ordersList: { gap: SPACING.sm },
  
  // Loading States
  loadingContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  clearFiltersBtn: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: COLORS.brand,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  emptyStateButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  
  // Pagination
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paginationInfo: {
    color: COLORS.sub,
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.field,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: {
    backgroundColor: COLORS.field,
    opacity: 0.5,
  },
  pageNumber: {
    fontWeight: "700",
    fontSize: FONT_SIZE.sm,
    marginHorizontal: SPACING.sm,
    color: COLORS.text,
    minWidth: 40,
    textAlign: 'center',
  },
  
  // Footer
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    zIndex:9,
  },

  // Date Picker Modal
  datePickerModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.lg,
    maxHeight: "55%",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  datePickerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text,
  },
  closeButton: { padding: SPACING.xs },
  dateTimePicker: { height: 220 },
  datePickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  datePickerCancel: {
    flex: 1,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
  },
  datePickerCancelText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "600",
  },
  datePickerConfirm: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.brand,
    borderRadius: 10,
    alignItems: "center",
  },
  datePickerConfirmText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.buttonText,
    fontWeight: "700",
  },
});

export default PharmacyExpenses;