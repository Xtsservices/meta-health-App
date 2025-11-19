// SaleComp.tsx - UPDATED VERSION
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  FlatList,
  Image,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../../auth/auth";

// Document picker (non-expo)
import DocumentPicker from "@react-native-documents/picker";

// Image / Camera picker (non-expo)
import { launchImageLibrary, launchCamera, Asset } from "react-native-image-picker";

const { width: W } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallScreen = W < 375;

// Types
interface TestType {
  loinc_num_: string;
  name: string;
  department: string;
  testPrice: number;
  gst: number;
  testNotes?: string;
}

interface FormDataType {
  name: string;
  city: string;
  mobileNumber: string;
  patientID: string;
  quantity: number;
}

type PaymentMethod = "cards" | "online" | "cash";

// Generate unique patient ID
const generateID = () => {
  const now = new Date();
  return (
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0") +
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0") +
    now.getSeconds().toString().padStart(2, "0")
  );
};

// ————— File Upload Component (non-expo) —————
const FileUpload: React.FC<{
  files: any[];
  fileURLs: string[];
  onFileChange: (file: any) => void;
  onFileRemove: (index: number) => void;
}> = ({ files, fileURLs, onFileChange, onFileRemove }) => {
  // Document picker (single)
  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.pick({
        presentationStyle: "fullScreen",
        type: ["image/*", "application/pdf"],
        allowMultiSelection: false,
      });

      const picked = Array.isArray(res) ? res[0] : res;
      if (!picked) return;

      onFileChange({
        uri: picked.uri,
        name: picked.name || (picked.uri ? picked.uri.split("/").pop() : "document"),
        mimeType: picked.mimeType || picked.type || "application/octet-stream",
        size: picked.size ?? 0,
      });
    } catch (err: any) {
      if (err?.code === "DOCUMENT_PICKER_CANCELED") return;
      Alert.alert("Error", "Failed to pick document");
      console.error("DocumentPicker error:", err);
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        console.error("ImagePicker error", result.errorMessage);
        Alert.alert("Error", result.errorMessage || "Failed to pick image");
        return;
      }

      const asset: Asset | undefined = result.assets && result.assets[0];
      if (!asset || !asset.uri) return;

      onFileChange({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        mimeType: asset.type || "image/jpeg",
        size: asset.fileSize ?? 0,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
      console.error(error);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: "photo",
        quality: 0.8,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        console.error("Camera error", result.errorMessage);
        Alert.alert("Error", result.errorMessage || "Failed to open camera");
        return;
      }

      const asset: Asset | undefined = result.assets && result.assets[0];
      if (!asset || !asset.uri) return;

      onFileChange({
        uri: asset.uri,
        name: asset.fileName || `camera_${Date.now()}.jpg`,
        mimeType: asset.type || "image/jpeg",
        size: asset.fileSize ?? 0,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
      console.error(error);
    }
  };

  const showFilePickerOptions = () => {
    Alert.alert(
      "Select File Type",
      "Choose how you want to upload the file",
      [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: pickImageFromLibrary },
        { text: "Choose Document", onPress: pickDocument },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.fileUploadContainer}>
      <Text style={styles.sectionTitle}>Upload Patient Test Prescription</Text>

      {fileURLs.length === 0 ? (
        <TouchableOpacity style={styles.uploadArea} onPress={showFilePickerOptions}>
          <Text style={styles.uploadIcon}>📁</Text>
          <Text style={styles.uploadText}>
            Tap to select files from your device
            {"\n"}
            <Text style={styles.uploadSubtext}>
              Accepted formats: PDF, PNG, JPG. Each file must be under 20 MB.
            </Text>
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.uploadedFilesContainer}>
          <Text style={styles.uploadedFilesTitle}>Uploaded Documents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.uploadedFilesList}>
              {fileURLs.map((url, index) => {
                const file = files[index];
                const isImage = (file?.mimeType || file?.type || "").startsWith("image/");
                const isPdf = (file?.mimeType || "").includes("pdf") || (file?.name || "").endsWith(".pdf");

                return (
                  <View key={index} style={styles.uploadedFile}>
                    {isImage ? (
                      <Image source={{ uri: url }} style={styles.fileThumbnail} />
                    ) : isPdf ? (
                      <View style={styles.pdfThumbnail}>
                        <Text style={styles.pdfIcon}>📄</Text>
                      </View>
                    ) : (
                      <View style={styles.pdfThumbnail}>
                        <Text style={styles.pdfIcon}>📄</Text>
                      </View>
                    )}

                    <Text style={styles.fileName} numberOfLines={1}>
                      {file?.name || "Unknown File"}
                    </Text>

                    <View style={styles.fileActions}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => {
                          Alert.alert("View File", "File viewing functionality would open here");
                        }}
                      >
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.deleteButton} onPress={() => onFileRemove(index)}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ————— Main Sale Component —————
const SaleComp: React.FC<{
  department: "Radiology" | "Pathology";
}> = ({ department = "Pathology" }) => {
  const navigation = useNavigation();
  const user = useSelector((state: any) => state.currentUser);

  console.log("SaleComp props - Department:", department);

  // State
  const [testList, setTestList] = useState<TestType[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestType | null>(null);
  const [selectedTests, setSelectedTests] = useState<TestType[]>([]);
  const [noteInput, setNoteInput] = useState<string>("");
  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    city: "",
    mobileNumber: "",
    patientID: generateID(),
    quantity: 0,
  });
  const [isPayment, setIsPayment] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [discountReasonID, setDiscountReasonID] = useState<string>("");
  const [files, setFiles] = useState<any[]>([]);
  const [fileURLs, setFileURLs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<TestType[]>([]);

  // Single useEffect for search functionality
  useEffect(() => {
    console.log("Search useEffect - Query:", searchQuery, "Department:", department);
    
    const handleSearch = async () => {
      if (searchQuery.length >= 1) {
        console.log("Searching for tests:", searchQuery);
        
        try {
          const token = await AsyncStorage.getItem("token");
          if (!user?.hospitalID) return;

          const response = await AuthPost(
            `test/getlabTestsdata/${user.hospitalID}/${department}`, 
            { text: searchQuery }, 
            token
          );
          console.log("Test API Response:", response);
          
          if (response?.data?.message === "success") {
            const testData = response?.data?.data;
            const uniqueTests: TestType[] = Array.from(
              new Map(
                testData.map((el: any) => [
                  el.LOINC_Code,
                  {
                    loinc_num_: el.LOINC_Code,
                    name: el.LOINC_Name,
                    department: el.Department,
                    testPrice: el.testPrice,
                    gst: el.gst,
                  } as TestType,
                ])
              ).values()
            );
            setTestList(uniqueTests);
            setSuggestions(uniqueTests);
            console.log("Test suggestions found:", uniqueTests.length);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error("Error fetching test data:", error);
          setSuggestions([]);
        }
      } else {
        console.log("Clearing suggestions");
        setSuggestions([]);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user?.hospitalID, department]);

  // Debug useEffect (optional - remove in production)
  useEffect(() => {
    console.log("=== STATE UPDATE ===");
    console.log("Department:", department);
    console.log("Search Query:", searchQuery);
    console.log("Suggestions:", suggestions.length);
    console.log("Test List:", testList.length);
    console.log("Selected Test:", selectedTest?.name);
    console.log("Selected Tests:", selectedTests.length);
    console.log("====================");
  }, [searchQuery, suggestions, testList, selectedTest, selectedTests, department]);

  // File handling
  const handleFileChange = (file: any) => {
    const normalizedUri = Platform.OS === "ios" && file.uri?.startsWith("file://") ? file.uri.replace("file://", "") : file.uri;
    const fileObj = { ...file, uri: normalizedUri };
    setFiles((prev) => [...prev, fileObj]);
    setFileURLs((prev) => [...prev, file.uri]);
  };

  const handleFileRemove = (index: number) => {
    const updatedFiles = [...files];
    const updatedURLs = [...fileURLs];

    updatedFiles.splice(index, 1);
    updatedURLs.splice(index, 1);

    setFiles(updatedFiles);
    setFileURLs(updatedURLs);
  };

  // Validation & submit
  const validateForm = (): boolean => {
    const { name, city, mobileNumber } = formData;

    if (!name.trim()) {
      Alert.alert("Error", "Please enter patient name");
      return false;
    }

    if (!city.trim()) {
      Alert.alert("Error", "Please enter city");
      return false;
    }

    if (!mobileNumber.trim() || mobileNumber.length < 10) {
      Alert.alert("Error", "Please enter a valid mobile number");
      return false;
    }

    if (files.length === 0) {
      Alert.alert("Error", "Please upload the test prescription");
      return false;
    }

    if (selectedTests.length === 0) {
      Alert.alert("Error", "Please add at least one test");
      return false;
    }

    return true;
  };

  const handleProceedToPay = () => {
    if (validateForm()) {
      navigation.navigate("PaymentScreen", {
        amount: discountedAmount,
        selectedTests,
        formData,
        files,
        discount,
        discountReason,
        discountReasonID,
        department,
        user
      });
    }
  };

  // Handle add test
  const handleAddTest = () => {
    if (selectedTest) {
      if (!selectedTests.some((test) => test.loinc_num_ === selectedTest.loinc_num_)) {
        const testToAdd: TestType = {
          ...selectedTest,
          testNotes: noteInput,
        };
        setSelectedTests((prev) => [testToAdd, ...prev]);
        setSelectedTest(null);
        setSearchQuery("");
        setNoteInput("");
        setSuggestions([]);
      } else {
        Alert.alert("Error", "Test already added");
      }
    } else {
      Alert.alert("Error", "Please select a test first");
    }
  };

  const handleRemoveTest = (index: number) => {
    setSelectedTests((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate amounts
  const grossAmount = selectedTests.reduce((acc, test) => acc + (test.testPrice ?? 0), 0);
  const gstAmount = selectedTests.reduce((acc, test) => acc + (test.testPrice ?? 0) * ((test.gst ?? 0) / 100), 0);
  const totalAmount = grossAmount + gstAmount;
  const discountedAmount = totalAmount - (totalAmount * discount) / 100;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Patient Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enter Patient Details</Text>

        <View style={styles.formRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.textInput} placeholder="Enter patient name" value={formData.name} onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Patient ID</Text>
            <TextInput style={[styles.textInput, styles.disabledInput]} value={formData.patientID} editable={false} />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput style={styles.textInput} placeholder="Enter mobile number" keyboardType="phone-pad" value={formData.mobileNumber} onChangeText={(text) => setFormData((prev) => ({ ...prev, mobileNumber: text }))} maxLength={10} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>City *</Text>
            <TextInput style={styles.textInput} placeholder="Enter city" value={formData.city} onChangeText={(text) => setFormData((prev) => ({ ...prev, city: text }))} />
          </View>
        </View>
      </View>

      {/* File Upload */}
      <FileUpload files={files} fileURLs={fileURLs} onFileChange={handleFileChange} onFileRemove={handleFileRemove} />

      {/* Search & Add Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Tests</Text>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search tests..." 
              value={searchQuery} 
              onChangeText={(text) => {
                console.log("Search text changed:", text);
                setSearchQuery(text);
              }}
            />

            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item, index) => `${item.loinc_num_}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => {
                        console.log("Test selected:", item.name);
                        setSelectedTest(item);
                        setSearchQuery(item.name);
                        setSuggestions([]);
                      }}
                    >
                      <Text style={styles.suggestionText}>{item.name}</Text>
                      <Text style={styles.suggestionPrice}>₹{item.testPrice}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.suggestionsList}
                />
              </View>
            )}
          </View>

          <View style={styles.noteInputContainer}>
            <Text style={styles.label}>Test Notes</Text>
            <TextInput 
              style={styles.noteInput} 
              placeholder="Enter test note" 
              multiline 
              numberOfLines={3} 
              value={noteInput} 
              onChangeText={setNoteInput} 
            />
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddTest}>
            <Text style={styles.addButtonText}>+ Add Test</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Tests Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tests Prescribed</Text>

        {selectedTests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tests selected</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Test Name</Text>
                <Text style={styles.tableHeaderCell}>Loinc Code</Text>
                <Text style={styles.tableHeaderCell}>Notes</Text>
                <Text style={styles.tableHeaderCell}>GST</Text>
                <Text style={styles.tableHeaderCell}>Amount</Text>
                <Text style={styles.tableHeaderCell}>Action</Text>
              </View>

              {selectedTests.map((test, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{test.name}</Text>
                  <Text style={styles.tableCell}>{test.loinc_num_}</Text>
                  <Text style={styles.tableCell}>{test.testNotes && test.testNotes.trim() !== "" ? test.testNotes : "-"}</Text>
                  <Text style={styles.tableCell}>{test.gst}%</Text>
                  <Text style={styles.tableCell}>₹{test.testPrice}</Text>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveTest(index)}>
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Payment */}
      {selectedTests.length > 0 && (
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <View style={styles.discountContainer}>
            <View style={styles.discountInput}>
              <Text style={styles.label}>Discount %</Text>
              <TextInput style={styles.textInput} placeholder="0" keyboardType="numeric" value={discount === 0 ? "" : discount.toString()} onChangeText={(text) => {
                const value = parseInt(text) || 0;
                if (value >= 0 && value <= 100) setDiscount(value);
              }} />
            </View>

            <View style={styles.discountInput}>
              <Text style={styles.label}>Reason</Text>
              <TextInput style={styles.textInput} placeholder="Enter reason" value={discountReason} onChangeText={setDiscountReason} />
            </View>

            <View style={styles.discountInput}>
              <Text style={styles.label}>ID</Text>
              <TextInput style={styles.textInput} placeholder="Enter ID" value={discountReasonID} onChangeText={setDiscountReasonID} />
            </View>
          </View>

          <View style={styles.amountBreakdown}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Gross Amount:</Text>
              <Text style={styles.amountValue}>₹{grossAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>GST Amount:</Text>
              <Text style={styles.amountValue}>₹{gstAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Discount:</Text>
              <Text style={styles.amountValue}>-₹{(totalAmount * discount / 100).toFixed(2)}</Text>
            </View>
            <View style={[styles.amountRow, styles.totalAmountRow]}>
              <Text style={styles.totalAmountLabel}>Total Amount:</Text>
              <Text style={styles.totalAmountValue}>₹{discountedAmount.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.paymentActions}>
            <TouchableOpacity style={styles.cancelActionButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelActionText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.payButton} onPress={handleProceedToPay}>
              <Text style={styles.payButtonText}>
                Total: ₹{discountedAmount.toFixed(2)}
                {"\n"}
                <Text style={styles.payButtonSubtext}>Proceed to Pay</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 16 },
  formRow: { flexDirection: isSmallScreen ? "column" : "row", gap: 12, marginBottom: 12 },
  inputContainer: { flex: 1, marginBottom: isSmallScreen ? 12 : 0 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  textInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: "#fff" },
  disabledInput: { backgroundColor: "#f3f4f6", color: "#6b7280" },
  fileUploadContainer: { padding: 16 },
  uploadArea: { borderWidth: 2, borderColor: "#9ca3af", borderStyle: "dashed", borderRadius: 8, padding: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  uploadIcon: { fontSize: 48, marginBottom: 16 },
  uploadText: { textAlign: "center", color: "#6b7280", marginBottom: 16, fontSize: 14 },
  uploadSubtext: { fontSize: 12, color: "#9ca3af" },
  uploadedFilesContainer: { marginTop: 16 },
  uploadedFilesTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },
  uploadedFilesList: { flexDirection: "row", gap: 12 },
  uploadedFile: { alignItems: "center", padding: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, minWidth: 120, backgroundColor: "#fff" },
  fileThumbnail: { width: 64, height: 64, borderRadius: 4 },
  pdfThumbnail: { width: 64, height: 64, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", borderRadius: 4 },
  pdfIcon: { fontSize: 32 },
  fileName: { fontSize: 12, color: "#374151", marginTop: 8, textAlign: "center" },
  fileActions: { flexDirection: "row", marginTop: 8, gap: 4 },
  viewButton: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#3b82f6", borderRadius: 4 },
  viewButtonText: { color: "#fff", fontSize: 12, fontWeight: "500" },
  deleteButton: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#ef4444", borderRadius: 4 },
  deleteButtonText: { color: "#fff", fontSize: 12, fontWeight: "500" },
  searchContainer: { flexDirection: isSmallScreen ? "column" : "row", gap: 12, alignItems: "flex-start" },
  searchInputContainer: { flex: 1, position: "relative", width: isSmallScreen ? "100%" : "auto" },
  searchInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: "#fff" },
  suggestionsContainer: { position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, zIndex: 1000, maxHeight: 200, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  suggestionsList: { maxHeight: 200 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  suggestionText: { fontSize: 14, color: "#374151", flex: 1 },
  suggestionPrice: { fontSize: 14, color: "#059669", fontWeight: "600" },
  noteInputContainer: { width: isSmallScreen ? "100%" : 120 },
  noteInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: "#fff", height: 80, textAlignVertical: "top" },
  addButton: { backgroundColor: "#14b8a6", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignItems: "center", justifyContent: "center", minWidth: 80, alignSelf: isSmallScreen ? "stretch" : "auto" },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  emptyState: { padding: 40, alignItems: "center", justifyContent: "center" },
  emptyStateText: { fontSize: 16, color: "#9ca3af", textAlign: "center" },
  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, overflow: "hidden", minWidth: isSmallScreen ? 600 : 800 },
  tableHeader: { flexDirection: "row", backgroundColor: "#14b8a6", paddingVertical: 12, paddingHorizontal: 8 },
  tableHeaderCell: { flex: 1, fontSize: 14, fontWeight: "600", color: "#fff", textAlign: "center", minWidth: 100 },
  tableRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", alignItems: "center", minHeight: 60 },
  tableCell: { flex: 1, fontSize: 14, color: "#374151", textAlign: "center", minWidth: 100 },
  quantityInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 4, padding: 4, textAlign: "center", fontSize: 14, minWidth: 60 },
  paymentSection: { padding: 16, backgroundColor: "#f8fafc" },
  discountContainer: { flexDirection: isSmallScreen ? "column" : "row", gap: 12, marginBottom: 16 },
  discountInput: { flex: 1, marginBottom: isSmallScreen ? 12 : 0 },
  amountBreakdown: { backgroundColor: "#fff", padding: 16, borderRadius: 8, marginBottom: 16 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  amountLabel: { fontSize: 14, color: "#6b7280" },
  amountValue: { fontSize: 14, color: "#374151", fontWeight: "500" },
  totalAmountRow: { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8, marginTop: 8 },
  totalAmountLabel: { fontSize: 16, fontWeight: "600", color: "#1f2937" },
  totalAmountValue: { fontSize: 18, fontWeight: "700", color: "#059669" },
  paymentActions: { flexDirection: isSmallScreen ? "column" : "row", justifyContent: "space-between", alignItems: "center", gap: isSmallScreen ? 12 : 0 },
  cancelActionButton: { paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, alignSelf: isSmallScreen ? "stretch" : "auto", alignItems: "center" },
  cancelActionText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  payButton: { backgroundColor: "#14b8a6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignItems: "center", alignSelf: isSmallScreen ? "stretch" : "auto" },
  payButtonText: { color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" },
  payButtonSubtext: { fontSize: 14, fontWeight: "400" },
});

export default SaleComp;