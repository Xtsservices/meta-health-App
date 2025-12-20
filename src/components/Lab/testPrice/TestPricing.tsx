import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Utils
import { 
  SPACING, 
  FONT_SIZE, 
  ICON_SIZE,
  responsiveWidth,
  responsiveHeight,
  isTablet,
  isSmallDevice, 
  FOOTER_HEIGHT
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import Footer from "../../dashboard/footer";

// Icons
import { 
  PlusIcon, 
  Trash2Icon, 
  Edit2Icon,
  MoreVerticalIcon,
  XIcon,
  SearchIcon
} from "../../../utils/SvgIcons";
import { showError, showSuccess } from "../../../store/toast.slice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FOOTER_H = FOOTER_HEIGHT;

// Types
interface TestData {
  id?: number;
  labTestID?: number;
  hospitalID?: number;
  testName: string;
  lonicCode: string;
  hsn: string;
  gst: number;
  testPrice: number;
  addedOn?: string;
  updatedOn?: string;
  testType?: string;
}

const DeleteConfirmationModal: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ visible, onCancel, onConfirm }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.deleteModal}>
          <View style={styles.deleteWarningIcon}>
            <Text style={styles.deleteWarning}>⚠️</Text>
          </View>
          <Text style={styles.deleteTitle}>Delete Test</Text>
          <Text style={styles.deleteMessage}>
            Are you sure you want to delete this test? This action cannot be undone.
          </Text>
          <View style={styles.deleteActions}>
            <TouchableOpacity 
              style={styles.cancelDeleteButton} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelDeleteText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmDeleteButton} 
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ActionDropdown: React.FC<{
  visible: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ visible, onEdit, onDelete, onClose }) => {
  if (!visible) return null;

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity 
        style={styles.dropdownItem}
        onPress={() => {
          onEdit();
          onClose();
        }}
        activeOpacity={0.7}
      >
        <Edit2Icon size={ICON_SIZE.sm} color={COLORS.text} />
        <Text style={styles.dropdownEditText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.dropdownItem}
        onPress={() => {
          onDelete();
          onClose();
        }}
        activeOpacity={0.7}
      >
        <Trash2Icon size={ICON_SIZE.sm} color={COLORS.danger} />
        <Text style={styles.dropdownDeleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
};

const TestCard: React.FC<{
  test: TestData;
  onEdit: (test: TestData) => void;
  onDelete: (id: number) => void;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
}> = ({ test, onEdit, onDelete, isDropdownOpen, onToggleDropdown }) => {
  const totalPrice = test.testPrice + (test.testPrice * test.gst) / 100;

  return (
    <View style={styles.testCard}>
      <View style={styles.cardHeader}>
        <View style={styles.testInfo}>
          <Text style={styles.testName} numberOfLines={2}>{test.testName}</Text>
          <Text style={styles.testId}>ID: {test.labTestID}</Text>
        </View>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onToggleDropdown}
          activeOpacity={0.7}
        >
          <MoreVerticalIcon size={ICON_SIZE.sm} color={COLORS.sub} />
        </TouchableOpacity>
      </View>

      <ActionDropdown
        visible={isDropdownOpen}
        onEdit={() => onEdit(test)}
        onDelete={() => test.labTestID && onDelete(test.labTestID)}
        onClose={onToggleDropdown}
      />

      <View style={styles.testDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>LOINC Code</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{test.lonicCode}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>HSN Code</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{test.hsn}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>GST Rate</Text>
            <Text style={styles.detailValue}>{test.gst}%</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Base Price</Text>
            <Text style={styles.detailValue}>₹{test.testPrice.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.totalPriceContainer}>
          <Text style={styles.totalLabel}>Total Price (incl. GST)</Text>
          <Text style={styles.totalPrice}>₹{totalPrice.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

const TestPricing: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);
  const insets = useSafeAreaInsets();
  
  const [data, setData] = useState<TestData[]>([]);
  const [filteredData, setFilteredData] = useState<TestData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const departmentType = user?.roleName === 'radiology' ? 'Radiology' : 'Pathology';

  const fetchTestPricing = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        dispatch(showError("Authentication failed. Please login again."));
        return;
      }

      const response = await AuthFetch(
        `test/getlabTestPricing/${user.hospitalID}/${departmentType}`,
        token
      ) as any;

      if (response?.data?.testPricingList?.data?.length > 0) {
        setData(response.data.testPricingList.data);
        setFilteredData(response.data.testPricingList.data);
      } else {
        setData([]);
        setFilteredData([]);
        dispatch(showError("No test pricing data found"));
      }
    } catch (error) {
      dispatch(showError("Failed to load test pricing data"));
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTestPricing();
  }, [user?.hospitalID]);

  useFocusEffect(
    React.useCallback(() => {
      fetchTestPricing(true);
    }, [])
  );

  useEffect(() => {
    const filtered = data.filter((item) => {
      const query = searchQuery.toLowerCase();
      return (
        item.testName.toLowerCase().includes(query) ||
        item.labTestID?.toString().includes(query) ||
        item.hsn.toLowerCase().includes(query) ||
        item.lonicCode.toLowerCase().includes(query)
      );
    });
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const handleDeleteTest = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token || !deleteId) return;

      const response = await AuthFetch(
        `test/deleteLabTestPricing/${user.hospitalID}/${deleteId}`,
        token
      ) as any;

      if (response?.data?.status === 200) {
        dispatch(showSuccess("Test deleted successfully"));
        fetchTestPricing();
      } else {
        dispatch(showError(response.message || "Failed to delete test"));
      }
    } catch (error) {
      dispatch(showError("Failed to delete test"));
    } finally {
      setDeleteModalVisible(false);
      setDeleteId(null);
      setOpenDropdownId(null);
    }
  };

  const handleEdit = (test: TestData) => {
    setOpenDropdownId(null);
    navigation.navigate("AddTestPricing", { 
      editData: test,
      department: departmentType 
    });
  };

  const handleAddNew = () => {
    navigation.navigate("AddTestPricing", { 
      editData: null,
      department: departmentType 
    });
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setDeleteModalVisible(true);
  };

  const toggleDropdown = (id: number) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const onRefresh = () => {
    fetchTestPricing(true);
  };

  if (loading && data.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.brand} />
        <Text style={styles.loadingText}>Loading Test Pricing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.brand} />
      
      {/* <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Test Pricing</Text>
          <Text style={styles.headerSubtitle}>
            Manage {departmentType.toLowerCase()} test pricing
          </Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>{filteredData.length} Tests</Text>
        </View>
      </View> */}

      <View style={styles.actionsContainer}>
        <View style={styles.searchContainer}>
          <SearchIcon size={ICON_SIZE.sm} color={COLORS.sub} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tests..."
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <XIcon size={ICON_SIZE.sm} color={COLORS.sub} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleAddNew}
          activeOpacity={0.8}
        >
          <PlusIcon size={ICON_SIZE.sm} color={COLORS.buttonText} />
          <Text style={styles.addButtonText}>Add Test</Text>
        </TouchableOpacity>
      </View>

      {filteredData.length > 0 ? (
        <FlatList
          data={filteredData}
          renderItem={({ item }) => (
            <TestCard 
              test={item} 
              onEdit={handleEdit}
              onDelete={confirmDelete}
              isDropdownOpen={openDropdownId === item.labTestID}
              onToggleDropdown={() => item.labTestID && toggleDropdown(item.labTestID)}
            />
          )}
          keyExtractor={(item, index) => `${item.labTestID}-${index}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.brand]}
              tintColor={COLORS.brand}
            />
          }
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>💰</Text>
          <Text style={styles.noDataText}>
            {searchQuery ? 'No matching tests found' : 'No tests configured yet'}
          </Text>
          <Text style={styles.noDataSubtext}>
            {searchQuery 
              ? 'Try adjusting your search terms' 
              : 'Get started by adding your first test pricing'
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={styles.addFirstButton} 
              onPress={handleAddNew}
              activeOpacity={0.8}
            >
              <Text style={styles.addFirstButtonText}>Add Your First Test</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteTest}
      />

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"settings"} brandColor={COLORS.brand} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  header: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? SPACING.xl : SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerContent: {
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.buttonText,
    marginBottom: SPACING.xs / 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.buttonText,
    opacity: 0.9,
  },
  headerStats: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 4,
    marginTop: SPACING.xs,
  },
  statsText: {
    fontSize: FONT_SIZE.xs - 1,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    marginLeft: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  clearSearchButton: {
    padding: SPACING.xs / 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    gap: SPACING.xs,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 40,
  },
  addButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  testCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  testInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  testName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
    lineHeight: 20,
  },
  testId: {
    fontSize: FONT_SIZE.xs - 1,
    color: COLORS.sub,
    fontWeight: "500",
  },
  actionButton: {
    padding: SPACING.xs / 2,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingVertical: SPACING.xs / 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 1000,
    minWidth: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  dropdownEditText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: '500',
  },
  dropdownDeleteText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    fontWeight: '500',
  },
  testDetails: {
    marginTop: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FONT_SIZE.xs - 1,
    color: COLORS.sub,
    fontWeight: '500',
    marginBottom: 1,
  },
  detailValue: {
    fontSize: FONT_SIZE.sm - 1,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  totalLabel: {
    fontSize: FONT_SIZE.sm - 1,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.success,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
    opacity: 0.5,
  },
  noDataText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  noDataSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  addFirstButton: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addFirstButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  deleteModal: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteWarningIcon: {
    marginBottom: SPACING.md,
  },
  deleteWarning: {
    fontSize: 40,
  },
  deleteTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  deleteMessage: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  deleteActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    width: "100%",
  },
  cancelDeleteButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelDeleteText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default TestPricing;