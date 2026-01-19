import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector } from "react-redux";
import {
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  isSmallDevice,
  responsiveWidth,
  responsiveHeight,
  isTablet,
  FOOTER_HEIGHT,
} from "../../../utils/responsive";
import LinearGradient from "react-native-linear-gradient";
import { COLORS } from "../../../utils/colour";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import Footer from "../../dashboard/footer";
import {
  Pill,
  Syringe,
  Droplet,
  Activity,
  Package,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RNFS from "react-native-fs";
import Share from "react-native-share";

interface StockData {
  id: number;
  hospitalID?: number;
  name: string;
  category: string;
  hsn?: string;
  quantity?: number;
  totalQuantity: number;
  costPrice?: number;
  sellingPrice?: number;
  manufacturer?: string;
  location?: string;
  expiryDate?: string;
  addedOn?: string;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  batchNumber?: string;
}

const category_items = [
  "Injection",
  "Capsules", 
  "Tablets",
  "Tropical",
  "IV Line",
  "Syrup",
  "Injections",
];

const stockFilterItems = [
  "All Status",
  "In Stock",
  "Low Stock", 
  "Out of Stock",
  "Expired"
];

const InStock: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [data, setData] = useState<StockData[]>([]);
  const [filteredData, setFilteredData] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("All Status");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Modals
  const [openModal, setOpenModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStockFilterModal, setShowStockFilterModal] = useState(false);
  const insets = useSafeAreaInsets();
  const [newStock, setNewStock] = useState<Partial<StockData>>({
    name: "",
    category: "",
    hsn: "",
    quantity: 0,
    totalQuantity: 0,
    expiryDate: "",
    location: "",
    costPrice: 0,
    sellingPrice: 0,
    manufacturer: "",
  });

  useEffect(() => {
    if (user?.hospitalID) fetchMedicineInventory();
  }, [user]);

  const fetchMedicineInventory = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setRefreshing(isRefresh);
    
    try {
      const token = await AsyncStorage.getItem("token");
      const resp = await AuthFetch(`pharmacy/${user?.hospitalID}/getMedicineInventory`, token) as any;
      
let medicines: any[] = [];
try {
  if (!resp) {
    medicines = [];
  } else if (Array.isArray(resp)) {
    medicines = resp;
  } else if (Array.isArray(resp?.data?.medicines)) {
    medicines = resp.data.medicines;
  } else if (Array.isArray(resp?.data)) {
    medicines = resp.data;
  } else if (Array.isArray(resp?.medicines?.data)) {
    medicines = resp.medicines.data;
  } else if (Array.isArray(resp?.medicines)) {
    medicines = resp.medicines;
  }
} catch (error) {
  medicines = [];
}

      const normalized = (medicines || []).map((m) => ({
        ...m,
        totalQuantity: Number(m.totalQuantity) || 0,
        costPrice: m.costPrice != null ? Number(m.costPrice) : undefined,
        sellingPrice: m.sellingPrice != null ? Number(m.sellingPrice) : undefined,
      }));

      setData(normalized);

    } catch (e) {
      setData([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Utilities for status
  const isExpired = (expiry?: string) => {
    if (!expiry) return false;
    try {
    const exp = new Date(expiry);
    const now = new Date();
    return exp.setHours(0, 0, 0, 0) < now.setHours(0, 0, 0, 0);
    } catch {
      return false;
    }
  };

  const getStockStatus = (item: StockData) => {
    if (isExpired(item.expiryDate)) return "Expired";
    if ((item.totalQuantity || 0) === 0) return "Out of Stock";
    if ((item.totalQuantity || 0) < (item.minStock || 50)) return "Low Stock";
    return "In Stock";
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return COLORS.green;
      case "Low Stock":
        return COLORS.warn;
      case "Out of Stock":
        return COLORS.red;
      case "Expired":
        return COLORS.primaryDark;
      default:
      return COLORS.sub;
  }
};
const getMedicineIcon = (category?: string) => {
  switch (category) {
    case "Tablets":
    case "Capsules":
      return Pill;

    case "Injection":
    case "Injections":
    case "IV Line":
      return Syringe;

    case "Syrup":
    case "Drops":
      return Droplet;

    default:
      return Package; // fallback
  }
};


  // Effect: filter & search
  useEffect(() => {
    let filtered = [...data];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const searchableFields = [
          item.name || "",
          item.category || "",
          item.hsn || "",
          item.manufacturer || "",
          item.batchNumber || "",
          item.location || "",
          item.supplier || "",
        ];
        
        return searchableFields.some(field => 
          field.toLowerCase().includes(q)
        );
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter((i) => i.category === selectedCategory);
    }

    if (selectedFilter === "In Stock") {
      filtered = filtered.filter((item) => getStockStatus(item) === "In Stock");
    } else if (selectedFilter === "Low Stock") {
      filtered = filtered.filter((item) => getStockStatus(item) === "Low Stock");
    } else if (selectedFilter === "Out of Stock") {
      filtered = filtered.filter((item) => getStockStatus(item) === "Out of Stock");
    } else if (selectedFilter === "Expired") {
      filtered = filtered.filter((item) => getStockStatus(item) === "Expired");
    }

    // Sort newest first using addedOn or id
    filtered.sort((a, b) => {
      const da = a.addedOn ? new Date(a.addedOn).getTime() : null;
      const db = b.addedOn ? new Date(b.addedOn).getTime() : null;
      if (da !== null && db !== null) return db - da;
      if (da !== null) return -1;
      if (db !== null) return 1;
      return (b.id || 0) - (a.id || 0);
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, searchQuery, selectedCategory, selectedFilter]);

  // Pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(totalItems, startIndex + itemsPerPage);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const stats = useMemo(() => {
    const total = data.length;

    const expired = data.filter(d =>
      isExpired(d.expiryDate)
    ).length;

    const outOfStock = data.filter(d =>
      Number(d.totalQuantity) === 0 && !isExpired(d.expiryDate)
    ).length;

    const lowStock = data.filter(d =>
      Number(d.totalQuantity) > 0 &&
      Number(d.totalQuantity) < (d.minStock || 50) &&
      !isExpired(d.expiryDate)
    ).length;

    const inStock = data.filter(d =>
      Number(d.totalQuantity) >= (d.minStock || 50) &&
      !isExpired(d.expiryDate)
    ).length;

    return { total, inStock, lowStock, outOfStock, expired };
  }, [data]);

  const uniqueCategories = useMemo(() => {
    const categories = data.map((d) => d.category).filter(Boolean);
    return Array.from(new Set(categories));
  }, [data]);

  const formatDate = (d?: string) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) {
      return d;
    }
  };

  const handleExport = async () => {
    if (!filteredData.length) {
      Alert.alert("No data", "There is no data to export");
      return;
    }

    try {
      // Create CSV content
      const headers = [
        "Med ID", 
        "Medicine Name", 
        "Category", 
        "HSN", 
        "Stock Quantity",
        "Cost Price", 
        "Selling Price", 
        "Expiry Date", 
        "Status",
        "Manufacturer",
        "Location",
        "Batch Number"
      ];
      
      const rows = filteredData.map((it) => [
        `MED${String(it.id).padStart(3, "0")}`,
        it.name ?? "",
        it.category ?? "",
        it.hsn ?? "",
        it.totalQuantity ?? 0,
        it.costPrice ?? "",
        it.sellingPrice ?? "",
        it.expiryDate ? formatDate(it.expiryDate) : "",
        getStockStatus(it),
        it.manufacturer ?? "",
        it.location ?? "",
      it.batchNumber ?? "",
    ]);

    const csvContent =
      [headers, ...rows]
        .map(row =>
          row.map(cell =>
            `"${String(cell).replace(/"/g, '""')}"`
          ).join(",")
        )
        .join("\n");

    const fileName = `inventory_stock_${Date.now()}.csv`; // ✅ CSV
    const filePath =
      Platform.OS === "android"
        ? `${RNFS.DownloadDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    await RNFS.writeFile(filePath, csvContent, "utf8");

    await Share.open({
      url: Platform.OS === "android" ? `file://${filePath}` : filePath,
      type: "text/csv", // ✅ correct MIME
      filename: fileName,
      failOnCancel: false,
    });

  } catch (err) {
      Alert.alert("Export failed", "Could not export CSV file. Please try again.");
    }
  };

  const handleAddStock = async () => {
    if (!newStock.name || !newStock.category || (newStock.totalQuantity === undefined)) {
      Alert.alert("Validation", "Please fill name, category and quantity");
      return;
    }

    const payload = {
      ...newStock,
      hospitalID: user?.hospitalID,
      addedOn: new Date().toISOString(),
    } as any;

    try {
      const token = await AsyncStorage.getItem("token");
      await AuthFetch(`pharmacy/${user?.hospitalID}/postMedicineInventory`, token, payload, "POST");
      await fetchMedicineInventory();
      setOpenModal(false);
      setNewStock({ name: "", category: "", totalQuantity: 0 });
      Alert.alert("Success", "Stock added successfully");
    } catch (e) {
      Alert.alert("Error", "Could not add stock");
    }
  };

  const renderProgressBar = (item: StockData) => {
    const max = item.maxStock || 500;
    const pct = Math.min(100, Math.round(((item.totalQuantity || 0) / max) * 100));
    const gradientColors = item.totalQuantity === 0
      ? [COLORS.gradientWarningStart, COLORS.gradientWarningEnd]
      : pct < 20
      ? [COLORS.gradientWarningStart, COLORS.gradientWarningEnd]
      : [COLORS.gradientStart, COLORS.gradientEnd];

    return (
      <View style={styles.progressWrap}>
        <View style={styles.progressBarBg} />
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={gradientColors}
          style={[styles.progressFill, { width: `${pct}%` }]}
        />
      </View>
    );
  };

  const renderItem = ({ item }: { item: StockData }) => {
    const status = getStockStatus(item);
    const statusColors = getStockStatusColor(status);
    const unitLabel = item.category === "Tablets" || item.category === "Capsules" ? "Tablets" : item.category === "Syrup" ? "Bottles" : "Units";
const statusColor = getStockStatusColor(status);
const IconComponent = getMedicineIcon(item.category);

    return (
      <View style={styles.row}>
        <View style={styles.leftCell}>
          <View style={styles.medicationCell}>
           <View style={styles.medicationIcon}>

              <View style={styles.medicationIcon}>
  <IconComponent
    size={18}
    color={COLORS.brand} // #14b8a6
    strokeWidth={2}
  />
</View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.medicationName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.medicationId}>ID: MED{String(item.id).padStart(3, "0")}</Text>
              <Text style={styles.manufacturer}>{item.manufacturer || "Generic"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.centerCell}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.stockValue}>{item.totalQuantity} {unitLabel}</Text>
          {renderProgressBar(item)}
        </View>

        <View style={styles.rightCell}>
          <Text style={styles.expiryDate}>Exp: {formatDate(item.expiryDate)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}> 
<Text style={[styles.statusText, { color: statusColor }]}>
  {status}
</Text>
          </View>
        </View>
      </View>
    );
  };

  const FilterModalComponent: React.FC<{
    visible: boolean;
    onClose: () => void;
    title: string;
    items: string[];
    selectedItem: string | null;
    onSelect: (item: string) => void;
  }> = ({ visible, onClose, title, items, selectedItem, onSelect }) => (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            {items.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterOption,
                  selectedItem === item && styles.filterOptionSelected,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedItem === item && styles.filterOptionTextSelected,
                  ]}
                >
                  {item}
                </Text>
                {selectedItem === item && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const onRefresh = () => {
    fetchMedicineInventory(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedFilter("All Status");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.brand]}
              tintColor={COLORS.brand}
            />
          }
        >
          {/* Summary Cards - MOVED TO TOP */}
          <View style={styles.summaryCards}>
            <LinearGradient
              colors={[COLORS.card, COLORS.card2]}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.cardTitle}>Total Items</Text>
              <Text style={styles.cardValue}>{stats.total.toLocaleString()}</Text>
            </LinearGradient>

            <LinearGradient
              colors={[COLORS.card, COLORS.card2]}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.cardTitle}>Low Stock</Text>
              <Text style={[styles.cardValue, { color: COLORS.warn }]}>{stats.lowStock}</Text>
            </LinearGradient>

            <LinearGradient
              colors={[COLORS.card, COLORS.card2]}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.cardTitle}>Out of Stock</Text>
              <Text style={[styles.cardValue, { color: COLORS.red }]}>{stats.outOfStock}</Text>
            </LinearGradient>

            <LinearGradient
              colors={[COLORS.card, COLORS.card2]}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.cardTitle}>Expired Items</Text>
              <Text style={[styles.cardValue, { color: COLORS.primaryDark }]}>{stats.expired}</Text>
            </LinearGradient>
          </View>

          {/* Search and Filter Section - MOVED BELOW STATS CARDS */}
          <View style={styles.headerSection}>
            <View style={styles.searchContainer}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search medications, batches, categories..."
                style={styles.searchInput}
                placeholderTextColor={COLORS.placeholder}
                returnKeyType="search"
              />
            </View>

            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={styles.filterBtn} 
                onPress={() => setShowStockFilterModal(true)}
              >
                <LinearGradient
                  colors={selectedFilter === "All Status" ? [COLORS.card, COLORS.card] : [COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.filterBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[
                    styles.filterBtnText,
                    selectedFilter !== "All Status" && styles.filterBtnTextActive
                  ]}>
                    {selectedFilter}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.filterBtn} 
                onPress={() => setShowCategoryModal(true)}
              >
                <LinearGradient
                  colors={selectedCategory ? [COLORS.gradientStart, COLORS.gradientEnd] : [COLORS.card, COLORS.card]}
                  style={styles.filterBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[
                    styles.filterBtnText,
                    selectedCategory && styles.filterBtnTextActive
                  ]}>
                    {selectedCategory || "Category"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {(searchQuery || selectedCategory || selectedFilter !== "All Status") && (
                <TouchableOpacity 
                  style={styles.clearFilterBtn}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearFilterText}>Clear</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                <LinearGradient
                  colors={[COLORS.gradientSuccessStart, COLORS.gradientSuccessEnd]}
                  style={styles.exportBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.exportText}>Export Excel</Text>
                </LinearGradient>
              </TouchableOpacity>

            </View>
          </View>

          {/* Header for table */}
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Inventory Stock Levels</Text>
            <View style={styles.headerRight}>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCount}>{totalItems} items</Text>
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
                    <Text style={
                      itemsPerPage === size ? styles.perPageActiveText : styles.perPageText
                    }>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.brand} />
              <Text style={styles.loadingText}>Loading inventory...</Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              {paginatedData.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No items found</Text>
                  {searchQuery || selectedCategory || selectedFilter !== "All Status" ? (
                    <Text style={styles.emptySub}>Try adjusting your search or filters</Text>
                  ) : (
                    <Text style={styles.emptySub}>Add your first medication to get started</Text>
                  )}
                </View>
              ) : (
                <FlatList
                  data={paginatedData}
                  renderItem={renderItem}
                  keyExtractor={(it) => String(it.id)}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  scrollEnabled={false}
                />
              )}

              {/* Pagination controls */}
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
                      <Text style={styles.pageBtnText}>{'<<'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      disabled={currentPage === 1} 
                      onPress={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                      style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    >
                      <Text style={styles.pageBtnText}>{'<'}</Text>
                    </TouchableOpacity>

                    <Text style={styles.pageNumber}>{currentPage} / {totalPages}</Text>

                    <TouchableOpacity 
                      disabled={currentPage === totalPages} 
                      onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                      style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    >
                      <Text style={styles.pageBtnText}>{'>'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      disabled={currentPage === totalPages} 
                      onPress={() => setCurrentPage(totalPages)} 
                      style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    >
                      <Text style={styles.pageBtnText}>{'>>'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Category Filter Modal */}
        <FilterModalComponent
          visible={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          title="Select Category"
          items={category_items}
          selectedItem={selectedCategory}
          onSelect={(item) => setSelectedCategory(item === selectedCategory ? null : item)}
        />

        {/* Stock Filter Modal */}
        <FilterModalComponent
          visible={showStockFilterModal}
          onClose={() => setShowStockFilterModal(false)}
          title="Stock Status"
          items={stockFilterItems}
          selectedItem={selectedFilter}
          onSelect={setSelectedFilter}
        />

        {/* Add Stock Modal */}
        <Modal visible={openModal} animationType="slide" transparent>
          <View style={styles.addModalBackdrop}>
            <View style={styles.addModalCard}>
              <Text style={styles.addModalTitle}>Add New Stock</Text>
              
              <TextInput 
                placeholder="Medicine Name" 
                placeholderTextColor={COLORS.placeholder}
                value={newStock.name} 
                onChangeText={(t) => setNewStock(s => ({ ...s, name: t }))} 
                style={styles.input} 
              />
              
              <TouchableOpacity 
                style={styles.picker} 
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={{ color: newStock.category ? COLORS.text : COLORS.placeholder }}>
                  {newStock.category || "Select Category"}
                </Text>
              </TouchableOpacity>
              
              <TextInput 
                placeholder="Quantity" 
                placeholderTextColor={COLORS.placeholder}
                keyboardType="numeric" 
                value={String(newStock.totalQuantity ?? "")} 
                onChangeText={(t) => setNewStock(s => ({ ...s, totalQuantity: Number(t) || 0 }))} 
                style={styles.input} 
              />
              
              <TextInput 
                placeholder="Expiry Date (YYYY-MM-DD)" 
                placeholderTextColor={COLORS.placeholder}
                value={newStock.expiryDate} 
                onChangeText={(t) => setNewStock(s => ({ ...s, expiryDate: t }))} 
                style={styles.input} 
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalBtn} 
                  onPress={() => { 
                    setOpenModal(false); 
                    setNewStock({ name: "", category: "", totalQuantity: 0 }); 
                  }}
                >
                  <Text style={styles.modalBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnPrimary]} 
                  onPress={handleAddStock}
                >
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    style={styles.modalBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.modalBtnText, { color: COLORS.buttonText }]}>Add Stock</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"inventory"} brandColor={COLORS.brand} />
      </View>
    </SafeAreaView>
  );
};

export default InStock;

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  scrollContent: { 
    padding: SPACING.md,
    paddingBottom: FOOTER_HEIGHT + SPACING.lg 
  },
  
  // Header Section - Now positioned after stats
  headerSection: {
    flexDirection: "column",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  searchContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
  },
  searchInput: {
    padding: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  filterRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: SPACING.sm,
    flexWrap: 'wrap'
  },
  
  // Filter Buttons with Gradients
  filterBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: responsiveWidth(20),
  },
  filterBtnGradient: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    borderRadius: 12,
  },
  filterBtnText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: COLORS.buttonText,
    fontWeight: '700',
  },
  
  // Clear Filter Button
  clearFilterBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.error + "20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  clearFilterText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  
  // Action Buttons
  exportBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: responsiveWidth(22),
  },
  exportBtnGradient: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    borderRadius: 12,
  },
  exportText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  
  addBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: responsiveWidth(22),
  },
  addBtnGradient: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    borderRadius: 12,
  },
  addBtnText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },

  // Summary Cards - Now at the top
  summaryCards: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    gap: SPACING.sm, 
    marginVertical: SPACING.sm,
    flexWrap: 'wrap'
  },
  summaryCard: {
    flex: 1,
    minWidth: responsiveWidth(40),
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: { 
    color: COLORS.sub, 
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    marginBottom: SPACING.xs
  },
  cardValue: { 
    fontSize: FONT_SIZE.xl, 
    fontWeight: "700", 
    color: COLORS.text 
  },

  // Table Header
  tableHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  tableTitle: { 
    fontSize: FONT_SIZE.lg, 
    fontWeight: "700", 
    color: COLORS.text 
  },
  headerRight: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: SPACING.sm 
  },
  itemCountBadge: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemCount: { 
    color: COLORS.chipText,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600'
  },
  perPageRow: { 
    flexDirection: "row", 
    gap: 4 
  },
  perPageBtn: { 
    padding: 6,
    paddingHorizontal: 8,
    borderRadius: 8, 
    backgroundColor: COLORS.field 
  },
  perPageActive: { 
    backgroundColor: COLORS.brand 
  },
  perPageText: { 
    color: COLORS.sub,
    fontSize: FONT_SIZE.xs,
  },
  perPageActiveText: { 
    color: COLORS.buttonText, 
    fontWeight: "700",
    fontSize: FONT_SIZE.xs,
  },

  // Table Styles
  tableCard: { 
    backgroundColor: COLORS.card, 
    borderRadius: 16, 
    padding: SPACING.md, 
    marginTop: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Loading
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.sub,
    fontSize: FONT_SIZE.md,
  },

  // Empty State
  emptyState: { 
    alignItems: "center", 
    padding: SPACING.lg 
  },
  emptyTitle: { 
    fontSize: FONT_SIZE.lg, 
    color: COLORS.sub, 
    fontWeight: "600" 
  },
  emptySub: { 
    color: COLORS.sub, 
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
  },

  // Row Styles
  row: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: SPACING.sm 
  },
  leftCell: { 
    flex: 1.5 
  },
  centerCell: { 
    flex: 1, 
    paddingHorizontal: SPACING.sm 
  },
  rightCell: { 
    width: responsiveWidth(22), 
    alignItems: "flex-end" 
  },

  // Medication Cell
  medicationCell: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: SPACING.sm 
  },
medicationIcon: {
  width: ICON_SIZE.lg,
  height: ICON_SIZE.lg,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: COLORS.brand + "15", // light tint
},

  medicationIconText: { 
    fontSize: 16 
  },
  medicationName: { 
    fontWeight: "700", 
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
  },
  medicationId: { 
    color: COLORS.sub, 
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  manufacturer: {
    color: COLORS.sub,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Center Cell Content
  categoryBadge: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: COLORS.chipText,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  centerText: { 
    color: COLORS.sub, 
    fontSize: FONT_SIZE.xs 
  },
  stockValue: { 
    fontWeight: "700", 
    color: COLORS.text, 
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
  },

  // Progress Bar
  progressWrap: { 
    marginTop: SPACING.xs, 
    height: 8, 
    width: "100%", 
    borderRadius: 4, 
    overflow: "hidden", 
    backgroundColor: COLORS.field 
  },
  progressBarBg: { 
    position: "absolute", 
    left: 0, 
    top: 0, 
    bottom: 0, 
    right: 0, 
    backgroundColor: COLORS.field 
  },
  progressFill: { 
    height: 8, 
    borderRadius: 4 
  },

  // Right Cell Content
  expiryDate: { 
    fontSize: FONT_SIZE.xs, 
    color: COLORS.sub,
    marginBottom: SPACING.xs,
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12, 
  },
  statusText: { 
    fontWeight: "700", 
    fontSize: FONT_SIZE.xs 
  },

  separator: { 
    height: 1, 
    backgroundColor: COLORS.border, 
    marginVertical: SPACING.sm 
  },

  // Pagination
  paginationContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paginationInfo: { 
    color: COLORS.sub,
    fontSize: FONT_SIZE.xs,
  },
  paginationControls: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: SPACING.xs 
  },
  pageBtn: {
    padding: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.field,
  },
  pageBtnDisabled: {
    backgroundColor: COLORS.pill,
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  pageNumber: { 
    fontWeight: "700",
    fontSize: FONT_SIZE.sm,
    marginHorizontal: SPACING.sm,
    color: COLORS.text,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: Dimensions.get("window").height * 0.6,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.sub,
  },
  filterOptions: {
    padding: SPACING.lg,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.brandLight,
  },
  filterOptionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  filterOptionTextSelected: {
    color: COLORS.brand,
    fontWeight: "600",
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },

  // Add Modal
  addModalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
  },
  addModalCard: {
    width: responsiveWidth(90),
    maxWidth: 400,
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addModalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    marginBottom: SPACING.md,
    color: COLORS.text,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.inputBg,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  picker: {
    padding: SPACING.sm,
    backgroundColor: COLORS.field,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
  },
  modalBtnPrimary: {
    borderWidth: 0,
    overflow: 'hidden',
  },
  modalBtnGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    fontWeight: "700",
    color: COLORS.text,
    textAlign: 'center',
  },

  // Footer
  footerWrap: {
    bottom: 0,
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});