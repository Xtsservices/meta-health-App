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
} from "../../../utils/SvgIcons";
import { AuthFetch } from "../../../auth/auth";
import PharmacyExpensesCard from "./PharmacyExpensesCard";
import OrderExpenseDialog from "./OrderExpenseDialog";
import Footer from "../../dashboard/footer";
import { formatDate } from "../../../utils/dateTime";

const FOOTER_H = FOOTER_HEIGHT;
const PAGE_SIZE = 10; // pagination: 10 per page

interface ExpenseData {
  id: number;
  agencyName?: string;
  email?: string;
  contactNo?: string | number;
  agentCode?: number | string;
  manufacturer?: string;
  addedOn?: string;
  medicinesList?: any[];
}

const PharmacyExpenses: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  const hasBottomInsets = insets.bottom > 0;

  const smallDevice = isSmallDevice || isExtraSmallDevice;

  const [openOrderExpense, setOpenOrderExpense] = useState<boolean>(false);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">("start");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // pagination
  const [page, setPage] = useState<number>(1);

  // Fetch expense data
  const fetchExpenseData = useCallback(async () => {
    if (!user?.hospitalID) return;

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `medicineInventoryExpense/${user.hospitalID}/getInventoryExpenseData`,
        token
      );

      if (response?.data?.status === 200 && response?.data?.data) {
        // Sort data by date - most recent first
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
      // eslint-disable-next-line no-console
      console.warn("Fetch expense data failed:", error);
      setExpenseData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData, openOrderExpense]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, startDate, endDate, expenseData.length]);

  // Filter data based on search and date range
  const filteredData = useMemo(() => {
    return expenseData.filter((expense) => {
      // Search filter
      if (searchQuery && searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchesAgencyName = expense.agencyName?.toLowerCase().includes(query);
        const matchesContactNo = expense.contactNo?.toString().toLowerCase().includes(query);
        const matchesEmail = expense.email?.toLowerCase().includes(query);
        const matchesManufacturer = expense.manufacturer?.toLowerCase().includes(query);
        const matchesCode = (expense.agentCode ?? "").toString().toLowerCase().includes(query);

        if (
          !matchesAgencyName &&
          !matchesContactNo &&
          !matchesEmail &&
          !matchesManufacturer &&
          !matchesCode
        ) {
          return false;
        }
      }

      // Date range filter (if both provided)
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

          return (
            normalizedExpenseDate >= normalizedStartDate &&
            normalizedExpenseDate <= normalizedEndDate
          );
        } catch (error) {
          return false;
        }
      }

      return true;
    });
  }, [expenseData, searchQuery, startDate, endDate]);

  // pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), totalPages);

  const pagedData = useMemo(() => {
    const start = (clampedPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, clampedPage]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      if (datePickerMode === "start") {
        setStartDate(selectedDate);
        if (Platform.OS === "android") {
          // For android, show end date picker next (if user is picking range)
          setTimeout(() => {
            setDatePickerMode("end");
            setShowDatePicker(true);
          }, 200);
        } else {
          setDatePickerMode("end");
        }
      } else {
        setEndDate(selectedDate);
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

  const onPrevPage = () => setPage((p) => Math.max(1, p - 1));
  const onNextPage = () => setPage((p) => Math.min(totalPages, p + 1));
  const jumpToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.safeArea}>
        <StatusBar
          barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"}
          backgroundColor={COLORS.brand}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Supplier Order Management</Text>
              <Text style={styles.subtitle}>Manage supplier orders and procurement — card view.</Text>
            </View>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => setOpenOrderExpense(true)}
              accessibilityLabel="Create new order"
            >
              <PlusIcon size={18} color={COLORS.buttonText} />
              <Text style={styles.headerActionText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.containerContent,
            {
              paddingBottom:
                FOOTER_H + (hasBottomInsets ? insets.bottom : SPACING.lg) + SPACING.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Controls */}
          <View style={styles.controlsWrap}>
            {/* Search */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <SearchIcon size={18} color={COLORS.sub} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search supplier, contact, manufacturer, code"
                  placeholderTextColor={COLORS.sub}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  accessibilityLabel="Search orders"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    style={styles.clearSearchBtn}
                    accessibilityLabel="Clear search"
                  >
                    <XIcon size={14} color={COLORS.sub} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.filterButton, (startDate || endDate) ? styles.filterButtonActive : null]}
                onPress={() => openDatePicker("start")}
                accessibilityLabel="Open date range picker"
              >
                <CalendarIcon size={16} color={startDate || endDate ? COLORS.brand : COLORS.sub} />
              </TouchableOpacity>
            </View>

            {/* Actions Row */}
            <View style={styles.actionsRow}>
              <View style={styles.dateInfoWrap}>
                <Text style={styles.smallLabel}>Date</Text>
                <TouchableOpacity
                  style={[styles.dateRangeBtn, startDate || endDate ? styles.dateRangeBtnActive : null]}
                  onPress={() => openDatePicker("start")}
                >
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
                      accessibilityLabel="Clear date range"
                    >
                      <XIcon size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.resultsSummary}>
                <Text style={styles.resultsText}>
                  Showing <Text style={styles.resultsBadge}>{pagedData.length}</Text> of{" "}
                  <Text style={styles.resultsBadge}>{totalItems}</Text> results
                </Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentSection}>
            {isLoading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.brand} />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : pagedData.length === 0 ? (
              <View style={styles.emptyState}>
                <SearchIcon size={72} color={COLORS.border} />
                <Text style={styles.emptyTitle}>No Orders Found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery || (startDate || endDate)
                    ? "Try adjusting your search or date range."
                    : "There are no supplier orders yet. Create a new order to get started."}
                </Text>

                {expenseData.length > 0 ? (
                  <TouchableOpacity
                    style={styles.clearFiltersBtn}
                    onPress={clearAllFilters}
                    accessibilityLabel="Clear filters"
                  >
                    <Text style={styles.clearFiltersText}>Clear Filters</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.createPrimaryBtn}
                    onPress={() => setOpenOrderExpense(true)}
                    accessibilityLabel="Create your first order"
                  >
                    <Text style={styles.createPrimaryText}>Create your first order</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              // Card list for current page
              <FlatList
                data={pagedData}
                keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
                renderItem={({ item }) => <PharmacyExpensesCard data={[item]} />}
                contentContainerStyle={{ paddingBottom: SPACING.lg }}
                ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Pagination controls */}
          {totalItems > 0 && (
            <View style={styles.paginationWrap}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={onPrevPage}
                disabled={page <= 1}
                accessibilityLabel="Previous page"
              >
                <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Prev</Text>
              </TouchableOpacity>

              {/* show up to 5 page buttons centered */}
              <View style={styles.pageNumbers}>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                  // center logic: show pages around current page
                  const centerStart = Math.max(1, Math.min(totalPages - 4, page - 2));
                  const pageNumber = centerStart + idx;
                  if (pageNumber > totalPages) return null;
                  const active = pageNumber === page;
                  return (
                    <TouchableOpacity
                      key={pageNumber}
                      style={[styles.pageNumberBtn, active && styles.pageNumberBtnActive]}
                      onPress={() => jumpToPage(pageNumber)}
                      accessibilityLabel={`Go to page ${pageNumber}`}
                    >
                      <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{pageNumber}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={onNextPage}
                disabled={page >= totalPages}
                accessibilityLabel="Next page"
              >
                <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>Next</Text>
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                <Text style={styles.pageInfoText}>
                  Page <Text style={styles.resultsBadge}>{clampedPage}</Text> of{" "}
                  <Text style={styles.resultsBadge}>{totalPages}</Text>
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footerWrap,
            {
              bottom: hasBottomInsets ? insets.bottom : 0,
              height: FOOTER_H,
            },
          ]}
        >
          <Footer active={"orderplacement"} brandColor={COLORS.brand} />
        </View>

        {/* nav shield */}
        {hasBottomInsets && (
          <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showDatePicker}
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>
                    {datePickerMode === "start" ? "Select start date" : "Select end date"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.closeButton}
                    accessibilityLabel="Close date picker"
                  >
                    <XIcon size={20} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <DateTimePicker
                  value={datePickerMode === "start" ? startDate || new Date() : endDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  onChange={handleDateChange}
                  textColor={COLORS.text}
                  style={styles.dateTimePicker}
                />

                <View style={styles.datePickerActions}>
                  <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.datePickerConfirm,
                      !(startDate && endDate) && styles.datePickerConfirmDisabled,
                    ]}
                    onPress={() => setShowDatePicker(false)}
                    disabled={!(startDate && endDate)}
                    accessibilityLabel="Apply date range"
                  >
                    <Text style={styles.datePickerConfirmText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Order Expense Dialog */}
        <OrderExpenseDialog open={openOrderExpense} setOpen={setOpenOrderExpense} onOrderPlaced={fetchExpenseData} />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default PharmacyExpenses;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xl + 2,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    lineHeight: 20,
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  headerActionText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    marginLeft: SPACING.sm,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  containerContent: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },

  controlsWrap: {
    gap: SPACING.md,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.field,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    padding: 0,
  },
  clearSearchBtn: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },

  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.field,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },

  dateInfoWrap: {
    flex: 1,
  },
  smallLabel: {
    fontSize: FONT_SIZE.xxs,
    color: COLORS.sub,
    marginBottom: SPACING.xs / 2,
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
  },
  dateRangeTextActive: {
    color: COLORS.brand,
    fontWeight: "600",
  },
  dateClearInner: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },

  resultsSummary: {
    marginLeft: SPACING.md,
  },
  resultsText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  resultsBadge: {
    color: COLORS.brand,
    fontWeight: "700",
  },

  contentSection: {
    flex: 1,
    marginTop: SPACING.sm,
  },

  loadingOverlay: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  clearFiltersBtn: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
  },
  clearFiltersText: {
    color: COLORS.brand,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
  },

  createPrimaryBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
  },
  createPrimaryText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
  },

  // Pagination
  paginationWrap: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  pageBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  pageBtnTextDisabled: {
    color: COLORS.sub,
  },
  pageNumbers: {
    flexDirection: "row",
    gap: SPACING.xs,
    alignItems: "center",
  },
  pageNumberBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    minWidth: 36,
    alignItems: "center",
  },
  pageNumberBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  pageNumberText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  pageNumberTextActive: {
    color: COLORS.buttonText,
  },
  pageInfo: {
    marginLeft: SPACING.sm,
  },
  pageInfoText: {
    color: COLORS.sub,
    fontSize: FONT_SIZE.sm,
  },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    zIndex: 10,
    elevation: 6,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    zIndex: 9,
  },

  // Date Picker & modal styles
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
  closeButton: {
    padding: SPACING.xs,
  },
  dateTimePicker: {
    height: 220,
  },
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
  datePickerConfirmDisabled: {
    backgroundColor: COLORS.border,
  },
  datePickerConfirmText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.buttonText,
    fontWeight: "700",
  },
});
