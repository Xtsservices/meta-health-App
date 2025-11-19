// AddTestPricing.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthPost } from "../../../auth/auth";

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

interface SelectedListType {
  id: number;
  loinc_num_: string;
  name: string;
  department: string;
}

const AddTestPricing: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector((state: any) => state.currentUser);
  
  const { editData, department } = route.params as { 
    editData: TestData | null; 
    department: string;
  };

  const [testList, setTestList] = useState<TestData[]>([]);
  const [fetchedTestList, setFetchedTestList] = useState<SelectedListType[]>([]);
  const [selectedTestData, setSelectedTestData] = useState<TestData>({
    id: 0,
    testName: "",
    lonicCode: "",
    hsn: "",
    gst: 0,
    testPrice: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (editData) {
      setSelectedTestData({
        testName: editData.testName,
        lonicCode: editData.lonicCode,
        hsn: editData.hsn,
        gst: editData.gst,
        testPrice: editData.testPrice,
        id: editData.labTestID,
      });
    }
  }, [editData]);

  const fetchTestsData = async (query: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.token || !token) return;

      const response = await AuthPost(
        `data/lionicCode`,
        { text: query },
        token
      );

      if (response?.data?.message === "success") {
        const testData = response?.data?.data;
        const filteredTests = testData.filter(
          (el: { Department: string }) => el.Department === department
        );

        const uniqueTests: SelectedListType[] = Array.from(
          new Set(
            filteredTests.map(
              (el: {
                id: number;
                LOINC_Code: string;
                LOINC_Name: string;
                Department: string;
              }) => ({
                id: el.id,
                loinc_num_: el.LOINC_Code,
                name: el.LOINC_Name,
                department: el.Department,
              })
            )
          )
        );

        setFetchedTestList(uniqueTests);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  const handleTestNameChange = (text: string) => {
    setSelectedTestData(prev => ({
      ...prev,
      testName: text,
    }));

    if (text.length >= 1) {
      setShowSuggestions(true);
      fetchTestsData(text);
    } else {
      setShowSuggestions(false);
      setFetchedTestList([]);
    }
  };

  const selectTest = (test: SelectedListType) => {
    setSelectedTestData(prev => ({
      ...prev,
      testName: test.name,
      lonicCode: test.loinc_num_,
      id: test.id,
    }));
    setShowSuggestions(false);
  };

  const addTestToList = () => {
    if (
      selectedTestData.testName &&
      selectedTestData.lonicCode &&
      selectedTestData.hsn &&
      selectedTestData.gst &&
      selectedTestData.testPrice &&
      selectedTestData.id
    ) {
      const isDuplicate = testList.some(
        (test) => test.id === selectedTestData.id
      );

      if (isDuplicate) {
        Alert.alert("Duplicate Test", "This test is already in the list!");
        return;
      }

      setTestList([...testList, { ...selectedTestData }]);
      setSelectedTestData({
        id: 0,
        testName: "",
        lonicCode: "",
        hsn: "",
        gst: 0,
        testPrice: 0,
      });
      setFetchedTestList([]);
    } else {
      Alert.alert("Missing Data", "Please fill all required fields");
    }
  };

  const handleRemoveTest = (index: number) => {
    setTestList(prevList => prevList.filter((_, i) => i !== index));
  };

  const handleUpdatePrice = async () => {
    if (
      selectedTestData.hsn &&
      selectedTestData.gst &&
      selectedTestData.testPrice &&
      selectedTestData.id
    ) {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!user?.hospitalID || !token) return;

        const response = await AuthPost(
          `test/updateLabTestPricing/${user.hospitalID}`,
          { testPricingData: selectedTestData },
          token
        );

        if (response?.data?.status === 200) {
          Alert.alert("Success", "Test price updated successfully");
          navigation.goBack();
        } else {
          Alert.alert("Error", response.message || "Failed to update test price");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to update test price");
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Missing Data", "Please fill all required fields");
    }
  };

  const handleSubmit = async () => {
    if (testList.length > 0 && user?.hospitalID) {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const response = await AuthPost(
          `test/addlabTestPricing/${user.hospitalID}`,
          { testPricingData: testList },
          token
        );

        if (response?.data?.status === 200) {
          Alert.alert("Success", "Test prices added successfully");
          navigation.goBack();
        } else {
          Alert.alert("Error", response.message || "Failed to add test prices");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to add test prices");
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Missing Data", "Please add at least one test");
    }
  };

  const calculateTotalPrice = () => {
    const basePrice = selectedTestData.testPrice || 0;
    const gst = selectedTestData.gst || 0;
    const gstAmount = (basePrice * gst) / 100;
    return basePrice + gstAmount;
  };

  const TestSuggestionItem: React.FC<{ test: SelectedListType }> = ({ test }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => selectTest(test)}
    >
      <Text style={styles.suggestionName}>{test.name}</Text>
      <Text style={styles.suggestionCode}>{test.loinc_num_}</Text>
    </TouchableOpacity>
  );

  const TestListItem: React.FC<{ test: TestData; index: number }> = ({ test, index }) => (
    <View style={styles.testListItem}>
      <View style={styles.testListInfo}>
        <Text style={styles.testListName}>{test.testName}</Text>
        <Text style={styles.testListDetails}>
          LOINC: {test.lonicCode} • HSN: {test.hsn} • GST: {test.gst}% • Price: ₹{test.testPrice}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveTest(index)}
      >
        <Text style={styles.removeIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {editData ? "Edit Test Price Configuration" : "Add Test Price Configuration"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {editData 
              ? `Update pricing and billing information for ${selectedTestData.testName}`
              : "Configure and manage test pricing and billing information"
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeIcon}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          {/* Test Name with Autocomplete */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Test Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.autocompleteContainer}>
              <TextInput
                style={[
                  styles.input,
                  editData && styles.disabledInput
                ]}
                placeholder="Select or enter test name"
                value={selectedTestData.testName}
                onChangeText={handleTestNameChange}
                editable={!editData}
              />
              {showSuggestions && fetchedTestList.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={fetchedTestList}
                    renderItem={({ item }) => <TestSuggestionItem test={item} />}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.suggestionsList}
                  />
                </View>
              )}
            </View>
          </View>

          {/* HSN Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              HSN Code <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter HSN code"
              value={selectedTestData.hsn}
              onChangeText={(text) => setSelectedTestData(prev => ({ ...prev, hsn: text }))}
            />
          </View>

          <View style={styles.row}>
            {/* Base Price */}
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                Base Price (₹) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter base price"
                keyboardType="numeric"
                value={selectedTestData.testPrice?.toString()}
                onChangeText={(text) => setSelectedTestData(prev => ({ 
                  ...prev, 
                  testPrice: Number(text) || 0 
                }))}
              />
            </View>

            {/* GST Rate */}
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                GST Rate (%) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter GST rate"
                keyboardType="numeric"
                value={selectedTestData.gst?.toString()}
                onChangeText={(text) => setSelectedTestData(prev => ({ 
                  ...prev, 
                  gst: Number(text) || 0 
                }))}
              />
            </View>
          </View>

          {/* Total Price Calculation */}
          {(selectedTestData.testPrice > 0 || selectedTestData.gst > 0) && (
            <View style={styles.totalCalculation}>
              <Text style={styles.calculationText}>
                Base Price: ₹{selectedTestData.testPrice} + GST ({selectedTestData.gst}%): ₹
                {((selectedTestData.testPrice * selectedTestData.gst) / 100).toFixed(2)}
              </Text>
              <Text style={styles.totalPrice}>
                Total: ₹{calculateTotalPrice().toFixed(2)}
              </Text>
            </View>
          )}

          {/* Add Button for new tests */}
          {!editData && (
            <TouchableOpacity style={styles.addToListButton} onPress={addTestToList}>
              <Text style={styles.addToListText}>Add to List</Text>
            </TouchableOpacity>
          )}

          {/* Test List */}
          {testList.length > 0 && (
            <View style={styles.testListContainer}>
              <Text style={styles.testListTitle}>Tests to be Added</Text>
              <FlatList
                data={testList}
                renderItem={({ item, index }) => (
                  <TestListItem test={item} index={index} />
                )}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        
        {editData ? (
          <TouchableOpacity 
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled
            ]}
            onPress={handleUpdatePrice}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Update Test Configuration</Text>
            )}
          </TouchableOpacity>
        ) : testList.length > 0 ? (
          <TouchableOpacity 
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={addTestToList}
          >
            <Text style={styles.submitText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 24,
    color: "#64748b",
    fontWeight: "300",
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#dc2626",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  disabledInput: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  autocompleteContainer: {
    position: "relative",
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  suggestionCode: {
    fontSize: 12,
    color: "#6b7280",
  },
  totalCalculation: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calculationText: {
    fontSize: 14,
    color: "#64748b",
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#059669",
  },
  addToListButton: {
    backgroundColor: "#14b8a6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  addToListText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  testListContainer: {
    marginTop: 20,
  },
  testListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  testListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 8,
  },
  testListInfo: {
    flex: 1,
  },
  testListName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  testListDetails: {
    fontSize: 12,
    color: "#6b7280",
  },
  removeButton: {
    padding: 8,
  },
  removeIcon: {
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fafafa",
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#14b8a6",
    borderRadius: 8,
    minWidth: 160,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export default AddTestPricing;