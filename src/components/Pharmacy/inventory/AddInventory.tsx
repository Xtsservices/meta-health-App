import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from 'react-native-linear-gradient';

// Import SVG Icons
import {
  SearchIcon,
  PlusIcon,
  ShoppingBagIcon,
  PackageIcon,
  UsersIcon,
  IndianRupeeIcon,
  ChevronRightIcon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "../../../utils/SvgIcons";

// Import responsive utils and colors
import {
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  isTablet,
  isSmallDevice,
  responsiveWidth,
  responsiveHeight,
  FOOTER_HEIGHT,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { AuthFetch } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import Footer from "../../dashboard/footer";
import { formatDate } from "../../../utils/dateTime";

// Types
interface ExpenseData {
  id: number;
  firstName?: string;
  lastName?: string;
  agencyName?: string;
  contactNo?: string;
  agentCode?: number | null;
  manufacturer?: string;
  addedOn?: string;
  medicinesList?: any[];
}

interface DashboardStats {
  itemsAddedToday: number;
  categories: number;
  activeSuppliers: number;
  totalValue: string;
}

const ITEMS_PER_PAGE = 10;

// Safe color getter with fallbacks
const getColors = (primary: string, secondary?: string) => {
  const primaryColor = primary || '#14b8a6';
  const secondaryColor = secondary || primaryColor;
  
  return [primaryColor, secondaryColor].filter(color => 
    color && typeof color === 'string' && color.length > 0
  );
};

const AddInventory: React.FC = ({ navigation }: any) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();

  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [filteredData, setFilteredData] = useState<ExpenseData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  // Fetch inventory data
  const fetchInventoryData = async () => {
    if (!user?.hospitalID) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `medicineInventoryLogs/${user.hospitalID}/getInventoryLogs`,
        token
      ) as any;

      let data: any[] = [];
      if (response?.status === 200) {
        data = Array.isArray(response.data) ? response.data : [];
      } else if (response?.data?.status === 200) {
        data = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (Array.isArray(response)) {
        data = response;
      } else if (Array.isArray(response?.data)) {
        data = response.data;
      }

      setExpenseData(data);
      setFilteredData(data);
    } catch (error) {
      setExpenseData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInventoryData();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchInventoryData();
  };

  // Calculate stats - with null checks
  const calculateStats = (): DashboardStats => {
    const data = Array.isArray(expenseData) ? expenseData : [];

    const today = new Date().toISOString().split("T")[0];
    const itemsToday = data.filter((item) => {
      if (!item?.addedOn) return false;
      try {
        return formatDate(item.addedOn) === today;
      } catch {
        return false;
      }
    }).length;

    const categories = new Set<string>();
    data.forEach((item) => {
      if (item?.medicinesList && Array.isArray(item.medicinesList)) {
        item.medicinesList.forEach((med: any) => {
          if (med?.category) categories.add(String(med.category));
        });
      }
    });

    const suppliers = new Set<string>();
    data.forEach((item) => {
      if (item?.agencyName) suppliers.add(String(item.agencyName));
    });

    let totalValue = 0;
    data.forEach((item) => {
      if (item?.medicinesList && Array.isArray(item.medicinesList)) {
        item.medicinesList.forEach((med: any) => {
          const quantity = Number(med.quantity) || 0;
          const sellingPrice = Number(med.sellingPrice) || 0;
          totalValue += quantity * sellingPrice;
        });
      }
    });

    return {
      itemsAddedToday: itemsToday,
      categories: categories.size,
      activeSuppliers: suppliers.size,
      totalValue:
        totalValue >= 100000
          ? `${(totalValue / 100000).toFixed(1)}L`
          : `₹${totalValue.toLocaleString()}`,
    };
  };

  const stats = calculateStats();

  // Filter data based on search query - with null checks
  const filterData = () => {
    const data = Array.isArray(expenseData) ? expenseData : [];

    if (!searchQuery.trim()) {
      setFilteredData(data);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = data.filter((expense) => {
      if (!expense) return false;

      return (
        (expense.agencyName?.toLowerCase().includes(query) || false) ||
        (expense.contactNo?.toLowerCase().includes(query) || false) ||
        (String(expense.agentCode || "").toLowerCase().includes(query) || false) ||
        (expense.manufacturer?.toLowerCase().includes(query) || false) ||
        (expense.medicinesList?.some((med: any) =>
          med?.name?.toLowerCase().includes(query)
        ) || false)
      );
    });

    setFilteredData(filtered);
  };

  useEffect(() => {
    filterData();
  }, [searchQuery, expenseData]);

  // Pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(totalItems, startIndex + itemsPerPage);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const navigateToAddItem = () => {
    navigation.navigate("AddInventoryItem");
  };

  const navigateToInventoryDetail = (item: ExpenseData) => {
    navigation.navigate("InventoryDetail", { inventoryData: item });
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    IconComponent: React.ElementType,
    color: string
  ) => {
    return (
      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>{title}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
          <View style={[styles.statIcon, { backgroundColor: `${color || '#14b8a6'}15` }]}>
            <IconComponent size={24} color={color || '#14b8a6'} />
          </View>
        </View>
      </View>
    );
  };

  const renderInventoryItem = ({
    item,
    index,
  }: {
    item: ExpenseData;
    index: number;
  }) => {
  const isLast = index === paginatedData.length - 1;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => navigateToInventoryDetail(item)}
      style={styles.timelineCard}
    >
      {/* Timeline Column */}
      <View style={styles.timelineCol}>
        <View style={styles.circleOuter}>
          <View style={styles.circleInner} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item?.agentCode || "Unknown Agency"}
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>Inventory</Text>
          </View>
        </View>

        {/* Details */}
        <Text style={styles.detailText}>
          Manufacturer:{" "}
          <Text style={styles.detailStrong}>
            {item?.manufacturer || "—"}
          </Text>
        </Text>

        <Text style={styles.detailText}>
          Added By:{" "}
          <Text style={styles.detailStrong}>
            {`${item?.firstName || ""} ${item?.lastName || ""}`.trim() ||
              "Unknown"}
          </Text>
        </Text>

        <Text style={styles.detailText}>
          Agent Code:{" "}
          <Text style={styles.detailStrong}>
            {item?.agentCode || 0}
          </Text>
        </Text>
        
        <Text style={styles.detailText}>
          Contact:{" "}
          <Text style={styles.detailStrong}>
            {item?.contactNo || "N/A"}
          </Text>
        </Text>

        <Text style={styles.detailText}>
          Added On:{" "}
          <Text style={styles.detailStrong}>
            {item?.addedOn ? formatDate(item.addedOn) : "—"}
          </Text>
        </Text>

        {/* Click Here Arrow */}
        <View style={styles.clickRow}>
          <View style={styles.clickContainer}>
            <Text style={styles.clickText}>Click to view details</Text>
            <ChevronRightIcon size={14} color={COLORS.brand || '#14b8a6'} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
  // compute bottom padding for scroll content so the footer doesn't cover it
  const contentBottomPadding = FOOTER_HEIGHT + (insets.bottom || 0) + SPACING.lg;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.brand || '#14b8a6'} />

      {/* Main Content */}
      <View style={styles.mainContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Inventory Management</Text>
            <Text style={styles.headerSubtitle}>Manage your medicine inventory</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={navigateToAddItem}>
            <LinearGradient
              colors={getColors(COLORS.brand, COLORS.brandDark)}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <PlusIcon size={20} color={COLORS.buttonText || '#ffffff'} />
              <Text style={styles.addButtonText}>Add New</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: contentBottomPadding }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInner}>
              <View style={styles.searchLeft}>
                <SearchIcon size={20} color={COLORS.sub || '#6b7280'} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items, categories, suppliers..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={COLORS.sub || '#6b7280'}
                />
              </View>
              {/* <TouchableOpacity style={styles.filterButton}>
                <FilterIcon size={18} color={COLORS.brand || '#14b8a6'} />
              </TouchableOpacity> */}
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Inventory Overview</Text>
            <View style={styles.statsGrid}>
              {renderStatCard("Items Added Today", stats.itemsAddedToday, ShoppingBagIcon, COLORS.success)}
              {renderStatCard("Categories", stats.categories, PackageIcon, COLORS.info)}
              {renderStatCard("Active Suppliers", stats.activeSuppliers, UsersIcon, COLORS.warning)}
              {renderStatCard("Total Value", stats.totalValue, IndianRupeeIcon, COLORS.brand)}
            </View>
          </View>

          {/* Recently Added Section */}
          <View style={styles.inventorySection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Recent Inventory</Text>
                <Text style={styles.sectionSubtitle}>Recently added inventory items</Text>
              </View>
              <View style={styles.sectionControls}>
                <View style={styles.itemsCount}>
                  <Text style={styles.countText}>
                    {totalItems} items
                  </Text>
                </View>
                <View style={styles.perPageRow}>
                  {[5, 10, 20].map((size) => (
                    <TouchableOpacity 
                      key={size}
                      onPress={() => {
                        setItemsPerPage(size);
                        setCurrentPage(1);
                      }} 
                      style={[
                        styles.perPageBtn, 
                        itemsPerPage === size && styles.perPageActive
                      ]}
                    >
                      <Text style={itemsPerPage === size ? styles.perPageActiveText : styles.perPageText}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.brand || '#14b8a6'} />
                <Text style={styles.loadingText}>Loading inventory...</Text>
              </View>
            ) : paginatedData.length > 0 ? (
              <>
                <View style={styles.inventoryList}>
                  {paginatedData.map((item, index) => (
                    <View key={item?.id?.toString() || index.toString()}>
                      {renderInventoryItem({ item, index })}
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
                <PackageIcon size={48} color={COLORS.sub || '#6b7280'} />
                <Text style={styles.emptyStateTitle}>No Inventory Items</Text>
                <Text style={styles.emptyStateText}>
                  Get started by adding your first inventory item
                </Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={navigateToAddItem}>
                  <LinearGradient
                    colors={getColors(COLORS.brand, COLORS.brandDark)}
                    style={styles.emptyStateGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <PlusIcon size={18} color={COLORS.buttonText || '#ffffff'} />
                    <Text style={styles.emptyStateButtonText}>Add First Item</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <View style={[styles.footerWrap, { bottom: insets.bottom || 0 }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

      {/* Bottom Safe Area Shield */}
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.bg || '#f8fafc'
  },
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.bg || '#f8fafc',
    marginBottom: FOOTER_HEIGHT,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg || '#f8fafc',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.card || '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#e5e7eb',
  },
  headerContent: {
    flex: 1,
  },
  clickRow: {
  marginTop: 10,
  alignItems: 'flex-end',
},
clickContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  backgroundColor: COLORS.brand + '15',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 6,
},
clickText: {
  fontSize: 11,
  color: COLORS.brand || '#14b8a6',
  fontWeight: '500',
  fontStyle:'italic'
},
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.text || '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub || '#6b7280',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.brand || '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  addButtonText: {
    color: COLORS.buttonText || '#ffffff',
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
  },
  searchContainer: {
    marginHorizontal: SPACING.sm,
    marginVertical: SPACING.md,
  },
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card || '#ffffff',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border || '#e5e7eb',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text || '#1f2937',
  },
  filterButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  
  // Stats Section
  statsSection: {
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.lg,
  },
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
    backgroundColor: COLORS.card || '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border || '#e5e7eb',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: SPACING.sm,
  },
  statContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub || '#6b7280',
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.text || '#1f2937',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Inventory Section
  inventorySection: {
    marginHorizontal: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
  },
  sectionTitleContainer: {
    flex: 1,
  },
timelineCard: {
  flexDirection: "row",
  backgroundColor: "#ffffff",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  marginBottom: 18,
  paddingVertical: 18,
  paddingHorizontal: 16,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 4,
},

timelineCol: {
  width: 44,
  alignItems: "center",
},

circleOuter: {
  width: 30,
  height: 30,
  borderRadius: 15,
  borderWidth: 2,
  borderColor: "#5ec8b5",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#ffffff",
  zIndex: 2,
},

circleInner: {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: "#5ec8b5",
},

timelineLine: {
  width: 2,
  flex: 1,
  backgroundColor: "#e5e7eb",
  marginTop: 6,
},

cardContent: {
  flex: 1,
  paddingLeft: 6,
},

cardHeaderRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
},

cardTitle: {
  fontSize: FONT_SIZE.lg,
  fontWeight: "700",
  color: "#111827",
},

typeBadge: {
  backgroundColor: "#e6f6f2",
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 10,
},

typeBadgeText: {
  fontSize: FONT_SIZE.xs,
  fontWeight: "700",
  color: "#2fa48f",
},

detailText: {
  fontSize: FONT_SIZE.sm,
  color: "#6b7280",
  marginTop: 6,
  lineHeight: 20,
},

detailStrong: {
  color: "#111827",
  fontWeight: "600",
},
statusRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

statusBadgeText: {
  fontSize: FONT_SIZE.xs,
  fontWeight: "700",
  color: "#9ca3af",
},

  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text || '#1f2937',
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub || '#6b7280',
  },
  sectionControls: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
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
    color: COLORS.brand || '#14b8a6',
    fontWeight: "600",
  },
  perPageRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: COLORS.field || '#f3f4f6',
    padding: 2,
    borderRadius: 8,
  },
  perPageBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  perPageActive: {
    backgroundColor: COLORS.brand || '#14b8a6',
  },
  perPageText: {
    color: COLORS.sub || '#6b7280',
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
  },
  perPageActiveText: {
    color: COLORS.buttonText || '#ffffff',
    fontWeight: "700",
    fontSize: FONT_SIZE.xs,
  },
  
  // Inventory Cards
  inventoryList: {
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  agencyInfo: {
    flex: 1,
  },

  cardDetails: {
    gap: 6,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub || '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text || '#1f2937',
    fontWeight: "500",
  },

  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.brand + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Loading States
  loadingContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub || '#6b7280',
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text || '#1f2937',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub || '#6b7280',
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  
  emptyStateButton: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: COLORS.brand || '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  emptyStateButtonText: {
    color: COLORS.buttonText || '#ffffff',
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
    borderTopColor: COLORS.border || '#e5e7eb',
  },
  paginationInfo: {
    color: COLORS.sub || '#6b7280',
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
    backgroundColor: COLORS.field || '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: {
    backgroundColor: COLORS.field || '#f3f4f6',
    opacity: 0.5,
  },
  pageNumber: {
    fontWeight: "700",
    fontSize: FONT_SIZE.sm,
    marginHorizontal: SPACING.sm,
    color: COLORS.text || '#1f2937',
    minWidth: 40,
    textAlign: 'center',
  },
  
  // Footer
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    justifyContent: "center",
    backgroundColor: COLORS.card || '#ffffff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border || '#e5e7eb',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 6,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card || '#ffffff',
    zIndex: 9,
  },
  inventoryCard: {
  flexDirection: "row",
  backgroundColor: COLORS.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  marginBottom: SPACING.md,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 6,
  overflow: "hidden",
},

leftAccent: {
  width: 5,
  backgroundColor: COLORS.brand,
},

cardBody: {
  flex: 1,
  padding: SPACING.lg,
},

cardTopRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: SPACING.sm,
},

agencyName: {
  fontSize: FONT_SIZE.md,
  fontWeight: "700",
  color: COLORS.text,
},

manufacturer: {
  fontSize: FONT_SIZE.sm,
  color: COLORS.sub,
  marginTop: 2,
},

statusBadge: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: COLORS.success + "15",
  paddingHorizontal: SPACING.sm,
  paddingVertical: 4,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: COLORS.success + "30",
},

statusDot: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: COLORS.success,
  marginRight: 6,
},

statusText: {
  fontSize: FONT_SIZE.xs,
  color: COLORS.success,
  fontWeight: "600",
},

divider: {
  height: 1,
  backgroundColor: COLORS.border,
  opacity: 0.4,
  marginVertical: SPACING.md,
},

metaRow: {
  flexDirection: "row",
  justifyContent: "space-between",
},

metaItem: {
  alignItems: "center",
  flex: 1,
},

metaLabel: {
  fontSize: FONT_SIZE.xs,
  color: COLORS.sub,
  marginBottom: 4,
},

metaValue: {
  fontSize: FONT_SIZE.sm,
  fontWeight: "600",
  color: COLORS.text,
},

cardFooter: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 14,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: "#f1f5f9",
},

statusLabel: {
  fontSize: FONT_SIZE.xs,
  letterSpacing: 1,
  fontWeight: "700",
  color: "#9ca3af",
},

statusPill: {
  backgroundColor: "#f0fdf9",
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 6,
  borderWidth: 1,
  borderColor: "#99f6e4",
},

statusPillText: {
  fontSize: FONT_SIZE.xs,
  fontWeight: "700",
  color: "#0f766e",
},

dateText: {
  fontSize: FONT_SIZE.xs,
  color: COLORS.sub,
},

cta: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: COLORS.brand + "15",
  paddingHorizontal: SPACING.md,
  paddingVertical: 6,
  borderRadius: 999,
},

ctaText: {
  fontSize: FONT_SIZE.sm,
  fontWeight: "600",
  color: COLORS.brand,
},

});

export default AddInventory;