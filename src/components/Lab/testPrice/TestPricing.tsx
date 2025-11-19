// TestPricing.tsx
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
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../../auth/auth";

const { width: W, height: H } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallScreen = W < 375;

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

// Delete Confirmation Modal
const DeleteConfirmationModal: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ visible, onCancel, onConfirm }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.deleteModal}>
          <Text style={styles.deleteWarning}>⚠️</Text>
          <Text style={styles.deleteTitle}>Delete Test</Text>
          <Text style={styles.deleteMessage}>
            Are you sure you want to delete this data? This action cannot be undone
          </Text>
          <View style={styles.deleteActions}>
            <TouchableOpacity style={styles.cancelDeleteButton} onPress={onCancel}>
              <Text style={styles.cancelDeleteText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmDeleteButton} onPress={onConfirm}>
              <Text style={styles.confirmDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Test Row Component
const TestRow: React.FC<{
  test: TestData;
  onEdit: (test: TestData) => void;
  onDelete: (id: number) => void;
}> = ({ test, onEdit, onDelete }) => {
  const totalPrice = test.testPrice + (test.testPrice * test.gst) / 100;

  return (
    <View style={styles.tableRow}>
      <View style={[styles.tableCell, styles.idCell]}>
        <Text style={styles.cellText}>{test.labTestID}</Text>
      </View>
      <View style={[styles.tableCell, styles.nameCell]}>
        <Text style={styles.cellText} numberOfLines={2}>{test.testName}</Text>
      </View>
      <View style={[styles.tableCell, styles.hsnCell]}>
        <Text style={styles.cellText}>{test.hsn}</Text>
      </View>
      <View style={[styles.tableCell, styles.gstCell]}>
        <Text style={styles.cellText}>{test.gst}%</Text>
      </View>
      <View style={[styles.tableCell, styles.priceCell]}>
        <Text style={styles.cellText}>₹{test.testPrice.toFixed(2)}</Text>
      </View>
      <View style={[styles.tableCell, styles.totalCell]}>
        <Text style={[styles.cellText, styles.totalPriceText]}>
          ₹{totalPrice.toFixed(2)}
        </Text>
      </View>
      <View style={[styles.tableCell, styles.actionCell]}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => onEdit(test)}
        >
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => test.labTestID && onDelete(test.labTestID)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Component
const TestPricing: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: any) => state.currentUser);
  
  const [data, setData] = useState<TestData[]>([]);
  const [filteredData, setFilteredData] = useState<TestData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const departmentType = user?.roleName === 'radiology' ? 'Radiology' : 'Pathology';

  useEffect(() => {
    fetchTestPricing();
  }, [user?.hospitalID]);

  useEffect(() => {
    const filtered = data.filter((item) => {
      const query = searchQuery.toLowerCase();
      return (
        item.testName.toLowerCase().includes(query) ||
        item.labTestID?.toString().includes(query) ||
        item.hsn.toLowerCase().includes(query)
      );
    });
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const fetchTestPricing = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) return;

      const response = await AuthFetch(
        `test/getlabTestPricing/${user.hospitalID}/${departmentType}`,
        token
      );

      if (response?.data?.testPricingList?.data?.length > 0) {
        setData(response?.data?.testPricingList.data);
        setFilteredData(response?.data?.testPricingList.data);
      } else {
        setData([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error("Error fetching test pricing:", error);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token || !deleteId) return;

      const response = await AuthFetch(
        `test/deleteLabTestPricing/${user.hospitalID}/${deleteId}`,
        token
      );

      if (response?.data?.status === 200) {
        Alert.alert("Success", "Test deleted successfully");
        fetchTestPricing();
      } else {
        Alert.alert("Error", response.message || "Failed to delete test");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to delete test");
    } finally {
      setLoading(false);
      setDeleteModalVisible(false);
      setDeleteId(null);
    }
  };

  const handleEdit = (test: TestData) => {
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

  if (loading && data.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading Test Pricing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Search and Add Section */}
      <View style={styles.actionsContainer}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by test name, ID, HSN code..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
        
        <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Test Price</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      {filteredData.length > 0 ? (
        <ScrollView horizontal style={styles.tableContainer}>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, styles.idCell]}>
                <Text style={styles.headerText}>Test ID</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.nameCell]}>
                <Text style={styles.headerText}>Test Name</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.hsnCell]}>
                <Text style={styles.headerText}>HSN Code</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.gstCell]}>
                <Text style={styles.headerText}>GST (%)</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.priceCell]}>
                <Text style={styles.headerText}>Base Price (₹)</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.totalCell]}>
                <Text style={styles.headerText}>Total Price (₹)</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.actionCell]}>
                <Text style={styles.headerText}>Actions</Text>
              </View>
            </View>

            {/* Table Body */}
            <FlatList
              data={filteredData}
              renderItem={({ item }) => (
                <TestRow 
                  test={item} 
                  onEdit={handleEdit}
                  onDelete={confirmDelete}
                />
              )}
              keyExtractor={(item, index) => `${item.labTestID}-${index}`}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Tests Not Found! Please Add Tests</Text>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteTest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#14b8a6",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  searchIcon: {
    fontSize: 16,
    color: "#6b7280",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14b8a6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tableContainer: {
    flex: 1,
  },
  table: {
    minWidth: isSmallScreen ? 800 : 900,
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#14b8a6",
    paddingVertical: 16,
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  headerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 12,
  },
  tableCell: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  cellText: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
  },
  // Cell widths
  idCell: { width: 80 },
  nameCell: { width: 200 },
  hsnCell: { width: 100 },
  gstCell: { width: 80 },
  priceCell: { width: 120 },
  totalCell: { width: 120 },
  actionCell: { width: 100 },
  totalPriceText: {
    fontWeight: "600",
    color: "#059669",
  },
  editButton: {
    padding: 6,
    marginRight: 8,
  },
  editIcon: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 6,
  },
  deleteIcon: {
    fontSize: 16,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  deleteWarning: {
    fontSize: 48,
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelDeleteText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
});

export default TestPricing;