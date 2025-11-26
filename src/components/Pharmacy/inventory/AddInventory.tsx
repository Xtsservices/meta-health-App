// components/Pharmacy/AddInventory.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";

// Import responsive utils and colors
import { 
  SPACING, 
  FONT_SIZE,
  isTablet,
  isSmallDevice,
  responsiveWidth,
  responsiveHeight 
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";

// Import SVG Icons
import {
  SearchIcon,
  PlusIcon,
  ShoppingBagIcon,
  PackageIcon,
  UsersIcon,
  IndianRupeeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FilterIcon,
  DownloadIcon,
  TrendingUpIcon,
} from "../../utils/SvgIcons";

// Import components
import AddInventoryDialog from "./AddInventoryDialog";
import AddInventoryCard from "./AddInventoryCard";

// Types
interface ExpenseData {
  id: number;
  firstName: string;
  lastName: string;
  agencyName: string;
  contactNo: string;
  agentCode: number | null;
  manufacturer: string;
  addedOn: string;
  medicinesList: any[];
}

interface DashboardStats {
  itemsAddedToday: number;
  categories: number;
  activeSuppliers: number;
  totalValue: string;
}

const AddInventory: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);
  
  const [openOrderExpense, setOpenOrderExpense] = useState<boolean>(false);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [renderData, setRenderData] = useState(false);
  const [editMEdId, setEditMEdId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const initialSelectedMedicineData = {
    name: "",
    category: "",
    hsn: "",
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    lowStockValue: 0,
    email: "",
    expiryDate: "",
    agencyName: "",
    contactNo: "",
    agentCode: null,
    manufacturer: "",
    addedOn: "",
    gst: null,
    agencyID: null,
  };

  const [editMedicineData, setEditMedicineData] = useState(initialSelectedMedicineData);

  // Fetch inventory logs
  const fetchInventoryLogs = useCallback(async () => {
    if (!user?.hospitalID) return;

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `medicineInventoryLogs/${user.hospitalID}/getInventoryLogs`,
        token
      );

      if (response?.status === 200) {
        setExpenseData(response.data || []);
      } else {
        setExpenseData([]);
        Alert.alert("Error", "Failed to fetch inventory data");
      }
    } catch (error) {
      setExpenseData([]);
      Alert.alert("Error", "Failed to fetch inventory data");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInventoryLogs();
  }, [fetchInventoryLogs, openOrderExpense, renderData]);

  // Filter data based on search query
  const filteredData = expenseData.filter(item => 
    item.agencyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.contactNo?.includes(searchQuery) ||
    item.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Calculate stats from actual data
  const calculateStats = (): DashboardStats => {
    const today = new Date().toISOString().split("T")[0];
    const itemsToday = expenseData.filter(
      (item) => new Date(item.addedOn).toISOString().split("T")[0] === today
    ).length;

    // Get unique categories
    const categories = new Set();
    expenseData.forEach((item) => {
      item.medicinesList?.forEach((med: any) => {
        if (med.category) categories.add(med.category);
      });
    });

    // Get unique suppliers
    const suppliers = new Set();
    expenseData.forEach((item) => {
      if (item.agencyName) suppliers.add(item.agencyName);
    });

    // Calculate total value
    let totalValue = 0;
    expenseData.forEach((item) => {
      item.medicinesList?.forEach((med: any) => {
        totalValue += (med.quantity || 0) * (med.sellingPrice || 0);
      });
    });

    const valueInLakhs = totalValue / 100000;
    
    return {
      itemsAddedToday: itemsToday,
      categories: categories.size,
      activeSuppliers: suppliers.size,
      totalValue: valueInLakhs >= 1 ? `${valueInLakhs.toFixed(1)}L` : `₹${Math.round(totalValue).toLocaleString()}`,
    };
  };

  const stats = calculateStats();

  const StatCard: React.FC<{
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
  }> = ({ label, value, icon: Icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <View style={styles.statText}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <Icon size={24} color={color} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Inventory</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search and Actions Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <SearchIcon size={20} color={COLORS.sub} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items, categories, suppliers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.sub}
            />
          </View>

          <View style={styles.actionButtons}>
            {/* <TouchableOpacity style={styles.filterButton}>
              <FilterIcon size={18} color={COLORS.brand} />
              <Text style={styles.filterButtonText}>Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportButton}>
              <DownloadIcon size={18} color={COLORS.brand} />
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity> */}

            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setOpenOrderExpense(true)}
            >
              <PlusIcon size={18} color={COLORS.buttonText} />
              <Text style={styles.addButtonText}>Add New Item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Items Added Today"
            value={stats.itemsAddedToday}
            icon={ShoppingBagIcon}
            color="#10B981"
          />
          <StatCard
            label="Categories"
            value={stats.categories}
            icon={PackageIcon}
            color="#3B82F6"
          />
          <StatCard
            label="Active Suppliers"
            value={stats.activeSuppliers}
            icon={UsersIcon}
            color="#8B5CF6"
          />
          <StatCard
            label="Total Inventory Value"
            value={stats.totalValue}
            icon={IndianRupeeIcon}
            color="#F59E0B"
          />
        </View>

        {/* Recently Added Items Section */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recently Added Items</Text>
              <Text style={styles.sectionSubtitle}>
                New inventory items added to the system
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.itemsBadge}>
                <Text style={styles.itemsBadgeText}>{totalItems} items</Text>
              </View>
              <View style={styles.perPageContainer}>
                <Text style={styles.perPageLabel}>Show:</Text>
                <TouchableOpacity 
                  style={styles.perPageButton}
                  onPress={() => {
                    const options = [5, 10, 20, 50];
                    const currentIndex = options.indexOf(itemsPerPage);
                    const nextIndex = (currentIndex + 1) % options.length;
                    handleItemsPerPageChange(options[nextIndex]);
                  }}
                >
                  <Text style={styles.perPageText}>{itemsPerPage} per page</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.brand} style={styles.loader} />
          ) : (
            <>
              <AddInventoryCard
                data={paginatedData}
                setEditMEdId={setEditMEdId}
                setRenderData={setRenderData}
                setOpenDialog={setOpenOrderExpense}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <Text style={styles.paginationInfo}>
                    Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} items
                  </Text>

                  <View style={styles.paginationControls}>
                    {/* First Page */}
                    <TouchableOpacity
                      onPress={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && styles.paginationButtonDisabled
                      ]}
                    >
                      <ChevronsLeftIcon size={18} color={currentPage === 1 ? COLORS.sub : COLORS.brand} />
                    </TouchableOpacity>

                    {/* Previous Page */}
                    <TouchableOpacity
                      onPress={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && styles.paginationButtonDisabled
                      ]}
                    >
                      <ChevronLeftIcon size={18} color={currentPage === 1 ? COLORS.sub : COLORS.brand} />
                    </TouchableOpacity>

                    {/* Page Numbers */}
                    <View style={styles.pageNumbers}>
                      {getPageNumbers().map((page, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => typeof page === 'number' && handlePageChange(page)}
                          disabled={page === "..."}
                          style={[
                            styles.pageNumber,
                            page === currentPage && styles.activePage,
                            page === "..." && styles.ellipsis
                          ]}
                        >
                          <Text style={[
                            styles.pageNumberText,
                            page === currentPage && styles.activePageText,
                            page === "..." && styles.ellipsisText
                          ]}>
                            {page}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Next Page */}
                    <TouchableOpacity
                      onPress={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={[
                        styles.paginationButton,
                        currentPage === totalPages && styles.paginationButtonDisabled
                      ]}
                    >
                      <ChevronRightIcon size={18} color={currentPage === totalPages ? COLORS.sub : COLORS.brand} />
                    </TouchableOpacity>

                    {/* Last Page */}
                    <TouchableOpacity
                      onPress={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      style={[
                        styles.paginationButton,
                        currentPage === totalPages && styles.paginationButtonDisabled
                      ]}
                    >
                      <ChevronsRightIcon size={18} color={currentPage === totalPages ? COLORS.sub : COLORS.brand} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Add Inventory Dialog */}
      <AddInventoryDialog
        visible={openOrderExpense}
        onClose={() => {
          setOpenOrderExpense(false);
          setEditMEdId(null);
          setEditMedicineData(initialSelectedMedicineData);
        }}
        editMedicineData={editMedicineData}
        editMEdId={editMEdId}
        onSave={() => {
          setOpenOrderExpense(false);
          setRenderData(prev => !prev);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    padding: SPACING.md,
    backgroundColor: COLORS.brand,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.buttonText,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  searchSection: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.field,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "flex-end",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  filterButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand,
    fontWeight: "500",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  exportButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand,
    fontWeight: "500",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.brand,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  addButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.buttonText,
    fontWeight: "600",
  },
  statsGrid: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statText: {
    flex: 1,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  recentSection: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
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
  headerRight: {
    alignItems: "flex-end",
    gap: SPACING.sm,
  },
  itemsBadge: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  itemsBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand,
    fontWeight: "600",
  },
  perPageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  perPageLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  perPageButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.field,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  perPageText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: "500",
  },
  loader: {
    marginVertical: SPACING.xl,
  },
  paginationContainer: {
    marginTop: SPACING.lg,
    alignItems: "center",
    gap: SPACING.md,
  },
  paginationInfo: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  paginationButton: {
    padding: SPACING.sm,
    borderRadius: 6,
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  pageNumber: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    minWidth: 40,
    alignItems: "center",
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activePage: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  ellipsis: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  pageNumberText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  activePageText: {
    color: COLORS.buttonText,
  },
  ellipsisText: {
    color: COLORS.sub,
  },
});

export default AddInventory;