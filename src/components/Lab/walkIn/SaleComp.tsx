// SaleComp.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Linking,
  FlatList,
  Pressable,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthPost, AuthFetch } from "../../../auth/auth";
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
  FOOTER_HEIGHT,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import {
  saleFormValidationRules,
  validateForm,
} from "../../../utils/validation";
import Footer from "../../dashboard/footer";

import { launchImageLibrary } from "react-native-image-picker";
import { pick, types } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
import { showError } from "../../../store/toast.slice";

const FOOTER_H = FOOTER_HEIGHT;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Types
interface TestType {
  loinc_num_: string;
  name: string;
  department: string;
  testPrice: number;
  gst: number;
  testNotes?: string;
}

interface MedicineType {
  id: number | null;
  name: string;
  category: string;
  hsn: string;
  quantity: number | null;
  costPrice: number | null;
  sellingPrice: number | null;
  manufacturer: string;
  location: string;
  expiryDate: string;
  addedOn?: string;
  gst?: number | string;
  isActive?: number;
}

interface FormDataType {
  name: string;
  city: string;
  mobileNumber: string;
  patientID: string;
  quantity: number;
}

interface FormErrors {
  name?: string;
  city?: string;
  mobileNumber?: string;
}

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

type FileItem = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

const FileUpload: React.FC<{
  files: FileItem[];
  fileURLs: string[];
  onFileChange: (file: FileItem) => void;
  onFileRemove: (index: number) => void;
  type: "medicine" | "test";
}> = ({ files, fileURLs, onFileChange, onFileRemove, type }) => {
  const dispatch = useDispatch();

  const openGallery = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 1,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if ((res as any).didCancel) return;
      if ((res as any).errorCode) {
        dispatch(showError((res as any).errorMessage || "Failed to pick image"));
        return;
      }

      const asset = (res as any).assets?.[0];
      if (!asset?.uri) return;

      const file: FileItem = {
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.type || "image/jpeg",
        size: asset.fileSize ?? 0,
      };

      // enforce 20MB limit
      if (file.size && file.size > 20 * 1024 * 1024) {
        dispatch(showError("File exceeds 20 MB limit"));
        return;
      }

      onFileChange(file);
    } catch (error) {
      dispatch(showError("Failed to pick image"));
    }
  };

  const pickDocuments = async () => {
    try {
      const results = await pick({
        allowMultiSelection: false,
        type: [types.allFiles],
      });

      // map and, on android, copy content:// URIs to accessible file path
      const mapped = await Promise.all(
        results.map(async (file) => {
          let uri = file.uri;
          // Android content uri handling
          if (Platform.OS === "android" && uri.startsWith("content://")) {
            const dest = `${RNFS.DocumentDirectoryPath}/${file.name}`;
            try {
              await RNFS.copyFile(uri, dest);
              uri = "file://" + dest;
            } catch (e) {
              // fallback: leave as-is
            }
          }

          const mappedFile: FileItem = {
            uri,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
          };

          // enforce 20MB if size provided
          if (mappedFile.size && mappedFile.size > 20 * 1024 * 1024) {
            // skip large files
            dispatch(showError(`${file.name} exceeds 20 MB limit`));
            return null;
          }
          return mappedFile;
        })
      );

      const filtered = mapped.filter(Boolean) as FileItem[];
      if (filtered.length > 0) {
        filtered.forEach((f) => onFileChange(f));
      }
    } catch (error: any) {
      // If user cancelled — many libs throw; ignore
      if (!error?.message?.toLowerCase()?.includes("cancel")) {
        console.log("Document picking error:", error);
        dispatch(showError("Failed to pick document"));
      }
    }
  };

  const showFilePickerOptions = () => {
    Alert.alert(
      "Select File Type",
      "Choose how you want to upload the file",
      [
        { text: "Choose from Gallery", onPress: openGallery },
        { text: "Choose Document", onPress: pickDocuments },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const handleViewFile = async (uri: string) => {
    try {
      await Linking.openURL(uri);
    } catch (e) {
      dispatch(showError("Cannot open file - No app available to view this file"));
    }
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { marginBottom: SPACING.sm }]}>{type === "medicine" ? "Upload Patient Prescription" : "Upload Patient Test Prescription"}</Text>

      {fileURLs?.length === 0 ? (
        <TouchableOpacity style={styles.uploadArea} onPress={showFilePickerOptions} activeOpacity={0.7}>
          <Text style={styles.uploadText}>Tap to select files from your device</Text>
          <Text style={styles.uploadSubtext}>PDF, PNG, JPG — max 20 MB</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={styles.uploadedFilesTitle}>Uploaded</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.uploadedFilesList}>
              {fileURLs?.map((url, index) => {
                const file = files?.[index];
                const isImage = (file?.type || "").startsWith("image/");

                return (
                  <View key={index} style={styles.uploadedFile}>
                    {isImage ? (
                      <Image source={{ uri: url }} style={styles.fileThumbnail} />
                    ) : (
                      <View style={styles.pdfThumbnail}>
                        <Text style={{ color: COLORS.sub }}>PDF</Text>
                      </View>
                    )}

                    <Text style={styles.fileName} numberOfLines={1}>
                      {file?.name || "Unknown File"}
                    </Text>

                    <View style={styles.fileActions}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => onFileRemove(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: COLORS.buttonText }}>Delete</Text>
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

const SaleComp: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

  // Get type from route params or user role
  const routeParams = route.params as { type?: "medicine" | "test"; department?: string } || {};
  const type = routeParams.type || (user?.roleName === 'pharmacy' ? 'medicine' : 'test');
  const department = routeParams.department || "Pathology";
  const [medicineList, setMedicineList] = useState<MedicineType[]>([]);
  const [testList, setTestList] = useState<TestType[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineType | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestType | null>(null);
  const [selectedMedicines, setSelectedMedicines] = useState<MedicineType[]>([]);
  const [selectedTests, setSelectedTests] = useState<TestType[]>([]);
  const [noteInput, setNoteInput] = useState<string>("");
  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    city: "",
    mobileNumber: "",
    patientID: generateID(),
    quantity: 0,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [discountReasonID, setDiscountReasonID] = useState<string>("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileURLs, setFileURLs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Please login to continue"));
        // @ts-ignore
        navigation.navigate("Login");
        return false;
      }
      return true;
    } catch (error) {
      dispatch(showError("Authentication check failed"));
      return false;
    }
  }, [navigation, dispatch]);

  useEffect(() => {
    const onShow = (e: any) => setKeyboardHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setKeyboardHeight(0);

    const subShow = Keyboard.addListener("keyboardDidShow", onShow);
    const subHide = Keyboard.addListener("keyboardDidHide", onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const initialize = async () => {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;

        if (!active) return;
        setFormData({
          name: "",
          city: "",
          mobileNumber: "",
          patientID: generateID(),
          quantity: 0,
        });
        setSelectedMedicines([]);
        setSelectedTests([]);
        setFiles([]);
        setFileURLs([]);
        setSearchQuery("");
        setDiscount(0);
        setDiscountReason("");
        setDiscountReasonID("");
        setFormErrors({});
        setSelectedMedicine(null);
        setSelectedTest(null);
        setSuggestions([]);
        setMedicineList([]);
        setTestList([]);
      };

      initialize();

      return () => {
        active = false;
      };
    }, [checkAuth])
  );

  // Fetch medicine data
  const fetchMedicineData = useCallback(async () => {
    if (!user?.hospitalID) return;

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `pharmacy/${user.hospitalID}/getMedicineInventory`,
        token
      );

      if (response?.data?.status === 200) {
        const data = response?.data?.medicines;
        const filteredMedicineStock = data
          .map((medicine: any) => ({
            ...medicine,
            quantity: Number(medicine.totalQuantity),
            hsn: medicine.hsn || "N/A",
            manufacturer: medicine.manufacturer || "Unknown",
            location: medicine.location || "Unknown",
            isActive: medicine.isActive !== undefined ? medicine.isActive : 1,
          }))
          .filter((medicine: MedicineType) => {
            const currentDate = new Date();
            const expiryDate = new Date(medicine.expiryDate);
            return (
              medicine.quantity !== null &&
              medicine.quantity > 0 &&
              expiryDate > currentDate &&
              medicine.isActive === 1
            );
          });
        setMedicineList(filteredMedicineStock);
      }
    } catch (error) {
      dispatch(showError("Failed to load medicine data"));
    } finally {
      setIsLoading(false);
    }
  }, [user, dispatch]);

  // Fetch test data with debouncing
  useEffect(() => {
    let cancelled = false;
 
    const handleSearch = async () => {
      if (!user?.hospitalID || !searchQuery || searchQuery.trim().length < 1) {
        if (!cancelled) setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!user?.hospitalID) {
          setSuggestions([]);
          return;
        }

        const response = await AuthPost(
          `test/getlabTestsdata/${user?.hospitalID}/${department}`,
          { text: searchQuery },
          token
        );

        if (response?.data?.message === "success") {
          const testData = response?.data?.data ?? [];
          const uniqueTests: TestType[] = Array.from(
            new Map(
              (testData as any[]).map((el: any) => [
                el?.LOINC_Code ?? String(Math.random()),
                {
                  loinc_num_: el?.LOINC_Code ?? String(Math.random()),
                  name: el?.LOINC_Name ?? "Unknown Test",
                  department: el?.Department ?? department,
                  testPrice: Number(el?.testPrice ?? 0),
                  gst: Number(el?.gst ?? 0),
                } as TestType,
              ])
            ).values()
          );
          if (!cancelled) {
            setTestList(uniqueTests);
            setSuggestions(uniqueTests);
          }
        } else {
          if (!cancelled) setSuggestions([]);
        }
      } catch (error) {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const id = setTimeout(handleSearch, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [searchQuery, user?.hospitalID, department]);

  useEffect(() => {
    if (type === "medicine") {
      fetchMedicineData();
    }
  }, [type, fetchMedicineData]);

  const handleFileChange = (file: FileItem) => {
    setFiles((prev) => [...prev, file]);
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

  const validateFormData = (): boolean => {
    const { isValid, errors } = validateForm(formData, saleFormValidationRules);

    if (!isValid) {
      setFormErrors(errors);
      Object.values(errors)?.forEach((error) => {
        if (error) dispatch(showError(error));
      });
      return false;
    }

    if (files?.length === 0) {
      dispatch(showError("Please upload the prescription"));
      return false;
    }

    // STRICT validation - don't allow empty arrays
    if (type === "medicine" && (!selectedMedicines || selectedMedicines.length === 0)) {
      dispatch(showError("Please add at least one medicine before proceeding"));
      return false;
    }

    if (type === "test" && (!selectedTests || selectedTests.length === 0)) {
      dispatch(showError("Please add at least one test before proceeding"));
      return false;
    }

    // Additional check: ensure selected items have valid data
    if (type === "test") {
      const validTests = selectedTests.filter(test => 
        test && test.loinc_num_ && test.name
      );
      if (validTests.length === 0) {
        dispatch(showError("Please add valid tests before proceeding"));
        return false;
      }
    }

    setFormErrors({});
    return true;
  };

  // Helper to normalize search sources
  const findMatchForQuery = (q: string) => {
    const lower = q.trim().toLowerCase();
    if (!lower) return null;

    if (type === "medicine") {
      const combined = [...medicineList];
      let match =
        combined.find((m) => (m.name || "").toLowerCase() === lower) ||
        combined.find((m) => (m.name || "").toLowerCase().includes(lower));
      return match || null;
    } else {
    const combined = [...testList, ...suggestions];
    let match =
      combined.find((t) => (t.name || "").toLowerCase() === lower) ||
      combined.find((t) => (t.loinc_num_ || "").toLowerCase() === lower) ||
      combined.find((t) => (t.name || "").toLowerCase().includes(lower));

    return match || null;
    }
  };

  const handleAddItem = useCallback(() => {
    const addItemToList = (itemToAdd: any) => {
      if (type === "medicine") {
        if (!selectedMedicines.some((m) => m.id === itemToAdd.id)) {
          const toAdd = { ...itemToAdd, quantity: 1 };
          setSelectedMedicines((prev) => [...prev, toAdd]);
          setSelectedMedicine(null);
          setSearchQuery("");
          setSuggestions([]);
          
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 120);
        } else {
          dispatch(showError("Medicine already added"));
        }
      } else {
        if (!selectedTests.some((t) => t.loinc_num_ === itemToAdd.loinc_num_)) {
        const toAdd = { ...itemToAdd, testNotes: noteInput ?? "" };
        setSelectedTests((prev) => [...prev, toAdd]);
        // clear input states
        setSelectedTest(null);
        setSearchQuery("");
        setNoteInput("");
        setSuggestions([]);
        // scroll to bottom to show newly added test
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 120);
      } else {
        dispatch(showError("Test already added"));
        }
      }
    };

    if (type === "medicine" && selectedMedicine) {
      addItemToList(selectedMedicine);
      return;
    }

    if (type === "test" && selectedTest) {
      addItemToList(selectedTest);
      return;
    }

    const q = (searchQuery || "").trim();
    if (q.length > 0) {
      const match = findMatchForQuery(q);

      if (match) {
        addItemToList(match);
        return;
      }
    }

    dispatch(showError(`Please select a valid ${type} from the list.`));
  }, [type, selectedMedicine, selectedTest, searchQuery, medicineList, testList, suggestions, noteInput, selectedMedicines, selectedTests, dispatch]);

  const handleRemoveItem = (index: number) => {
    if (type === "medicine") {
      setSelectedMedicines((prev) => prev.filter((_, i) => i !== index));
    } else {
    setSelectedTests((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const grossAmount = type === "medicine"
    ? selectedMedicines.reduce((acc, item) => acc + (item?.sellingPrice ?? 0) * (item?.quantity ?? 0), 0)
    : selectedTests.reduce((acc, item) => acc + (item.testPrice ?? 0), 0);

  const gstAmount = type === "medicine"
    ? (grossAmount * 18) / 100
    : selectedTests.reduce((acc, item) => acc + (item.testPrice ?? 0) * ((item.gst ?? 0) / 100), 0);
  const totalAmount = grossAmount + gstAmount;
  const discountedAmount = totalAmount - (totalAmount * discount) / 100;

  const handleProceedToPay = async () => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    // DEBUG: Check what's being passed
    console.log("DEBUG - Before navigation:", {
      type: type,
      selectedTests: selectedTests,
      selectedTestsLength: selectedTests.length,
      selectedTestsContent: JSON.stringify(selectedTests),
      selectedMedicines: selectedMedicines,
      selectedMedicinesLength: selectedMedicines.length
    });

    if (validateFormData()) {
      setIsSubmitting(true);
      try {
        // @ts-ignore
        await navigation.navigate("PaymentScreen", {
          amount: discountedAmount,
          selectedItems: type === "medicine" ? selectedMedicines : selectedTests,
          selectedTests: selectedTests,
          selectedMedicines: selectedMedicines,
          formData,
          files,
          discount,
          discountReason: discountReason || "",
          discountReasonID: discountReasonID || "",               
          type,
          department,
          user,
        });
      } catch (error) {
        dispatch(showError("Failed to proceed to payment"));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const focusInput = (fieldName: string) => {
    inputRefs.current[fieldName]?.focus();
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const placeholderColor = (COLORS as any).placeholder ?? COLORS.sub;

  const renderMedicineItem = ({ item, index }: { item: MedicineType; index: number }) => {
    const amount = ((item.sellingPrice ?? 0) * (item.quantity ?? 0)) * 1.18; // 18% GST for medicines
    return (
      <View key={`${item.id}-${index}`}>
        <View style={[styles.tableRow, index === selectedMedicines.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <View style={{ width: responsiveWidth(220), paddingHorizontal: SPACING.xs }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]} numberOfLines={2}>
              {item.name || "—"}
            </Text>
            <Text style={[styles.tableCellSub, { color: COLORS.sub }]}>HSN: {item.hsn || "N/A"}</Text>
          </View>

          <View style={{ width: responsiveWidth(120), paddingHorizontal: SPACING.xs }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]}>
              {new Date(item.expiryDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={{ width: responsiveWidth(80), paddingHorizontal: SPACING.xs, alignItems: "flex-end" }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]}>₹{(item.sellingPrice ?? 0).toFixed(2)}</Text>
          </View>

          <View style={{ width: responsiveWidth(100), paddingHorizontal: SPACING.xs, alignItems: "center" }}>
            <TextInput
              style={[styles.quantityInput, { color: COLORS.text }]}
              value={item.quantity?.toString() || "1"}
              keyboardType="numeric"
              onChangeText={(text) => {
                const newQuantity = Number(text) || 1;
                if (newQuantity >= 1 && newQuantity <= (item.quantity ?? 1)) {
                  setSelectedMedicines(prev =>
                    prev.map((med, idx) =>
                      idx === index ? { ...med, quantity: newQuantity } : med
                    )
                  );
                }
              }}
            />
          </View>

          <View style={{ width: responsiveWidth(80), paddingHorizontal: SPACING.xs, alignItems: "flex-end" }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]}>18%</Text>
          </View>

          <View style={{ width: responsiveWidth(120), paddingHorizontal: SPACING.xs, alignItems: "flex-end" }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]}>₹{amount.toFixed(2)}</Text>
          </View>

          <View style={{ width: responsiveWidth(90), paddingHorizontal: SPACING.xs, alignItems: "flex-end" }}>
            <TouchableOpacity onPress={() => handleRemoveItem(index)}>
              <Text style={{ color: COLORS.danger, fontSize: FONT_SIZE.xs }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
        {index !== selectedMedicines.length - 1 && <View style={{ height: 1, backgroundColor: COLORS.border }} />}
      </View>
    );
  };

  // Render test item for the list
  const renderTestItem = ({ item, index }: { item: TestType; index: number }) => {
    const amount = ((item.testPrice ?? 0) * (1 + (item.gst ?? 0) / 100));
    return (
      <View key={`${item.loinc_num_ || item.name}-${index}`}>
        <View style={[styles.tableRow, index === selectedTests.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <View style={{ width: responsiveWidth(220), paddingHorizontal: SPACING.xs }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]} numberOfLines={2}>
              {item.name || "—"}
            </Text>
            {item.testNotes ? <Text style={[styles.tableCellSub, { color: COLORS.sub }]} numberOfLines={1}>{item.testNotes}</Text> : null}
          </View>

          <View style={{ width: responsiveWidth(120), paddingHorizontal: SPACING.xs }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]} numberOfLines={1}>{item.loinc_num_ || "—"}</Text>
          </View>

          <View style={{ width: responsiveWidth(80), paddingHorizontal: SPACING.xs, alignItems: "flex-end" }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]}>{(item.gst ?? 0).toFixed(0)}%</Text>
          </View>

          <View style={{ width: responsiveWidth(100), paddingHorizontal: SPACING.xs, alignItems: "flex-end" }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]}>₹{(item.testPrice ?? 0).toFixed(2)}</Text>
          </View>

          <View style={{ width: responsiveWidth(120), paddingHorizontal: SPACING.xs, alignItems: "flex-end" }}>
            <Text style={[styles.tableCellText, { color: COLORS.text }]}>₹{amount.toFixed(2)}</Text>
          </View>

          <View style={{ width: responsiveWidth(90), paddingHorizontal: SPACING.xs, alignItems: "flex-end" }}>
            <TouchableOpacity onPress={() => handleRemoveItem(index)}>
              <Text style={{ color: COLORS.danger, fontSize: FONT_SIZE.xs }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
        {index !== selectedTests.length - 1 && <View style={{ height: 1, backgroundColor: COLORS.border }} />}
      </View>
    );
  };

  const renderMedicineSelection = () => {
    const filteredMedicines = searchQuery.trim() === '' 
      ? [] 
      : medicineList.filter(medicine =>
          medicine.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

    return (
      <>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Text style={[styles.label, { color: COLORS.sub }]}>Medicine</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder="Type to search medicines..."
                placeholderTextColor={placeholderColor}
                style={[
                  styles.input, 
                  { 
                    backgroundColor: COLORS.inputBg, 
                    borderColor: COLORS.border, 
                    color: COLORS.text,
                  }
                ]}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setSelectedMedicine(null);
                }}
              />
              
              {/* Suggestions dropdown */}
              {(isLoading || filteredMedicines.length > 0) && searchQuery && searchQuery.trim().length >= 1 && (
                <View style={[
                  styles.suggBox, 
                  { 
                    borderColor: COLORS.border, 
                    backgroundColor: COLORS.card 
                  }
                ]}>
                  {isLoading ? (
                    <View style={styles.suggRowCenter}>
                      <ActivityIndicator size="small" color={COLORS.brand} />
                    </View>
                  ) : (
                    <FlatList
                      data={filteredMedicines}
                      keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <Pressable 
                          style={[
                            styles.suggRow,
                            selectedMedicine?.id === item.id && { backgroundColor: COLORS.brand + '20' }
                          ]} 
                          onPress={() => {
                            setSelectedMedicine(item);
                            setSearchQuery(item.name);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.suggestionText, { color: COLORS.text }]}>{item.name}</Text>
                            <View style={styles.suggDetails}>
                              <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                                Qty: {item.quantity} | HSN: {item.hsn}
                              </Text>
                              <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                                Expiry: {new Date(item.expiryDate).toLocaleDateString()}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.suggestionPrice, { color: COLORS.text }]}>₹{item.sellingPrice}</Text>
                        </Pressable>
                      )}
                      ListEmptyComponent={
                        <View style={styles.suggRowCenter}>
                          <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                            No matching medicines found
                          </Text>
                        </View>
                      }
                      nestedScrollEnabled
                      style={{ maxHeight: 200 }}
                    />
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Add Button - 25% width */}
          <View style={styles.addButtonContainer}>
            <Text style={[styles.label, { color: COLORS.sub, opacity: 0 }]}>
              Add
            </Text>
            <Pressable
              onPress={handleAddItem}
              style={[
                styles.addButton, 
                { 
                  backgroundColor: COLORS.brand,
                  opacity: (!selectedMedicine && !searchQuery) ? 0.6 : 1
                }
              ]}
              disabled={!selectedMedicine && !searchQuery}
            >
              <Text style={[styles.addButtonText, { color: COLORS.buttonText }]}>
                Add
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Show selected medicine info */}
        {selectedMedicine && (
          <View style={[styles.selectedItemBox, { 
            backgroundColor: COLORS.brand + '10', 
            borderColor: COLORS.brand,
            marginTop: SPACING.sm
          }]}>
            <Text style={[styles.selectedItemText, { color: COLORS.text }]}>
              Selected: <Text style={{ fontWeight: '700' }}>{selectedMedicine.name}</Text>
            </Text>
            <Text style={[styles.selectedItemMeta, { color: COLORS.sub }]}>
              Price: ₹{selectedMedicine.sellingPrice} | Stock: {selectedMedicine.quantity}
            </Text>
          </View>
        )}

        {/* Show no results message */}
        {searchQuery.trim().length > 0 && 
         filteredMedicines.length === 0 && 
         !isLoading && (
          <View style={[styles.emptyStateSimple, { marginTop: SPACING.sm }]}>
            <Text style={{ color: COLORS.sub }}>No medicines found</Text>
            <Text style={{ color: COLORS.sub, marginTop: SPACING.xs }}>Try a different keyword</Text>
          </View>
        )}
      </>
    );
  };

  // Test selection UI - IMPROVED VERSION
  const renderTestSelection = () => (
    <>
      {/* Search Row - 75% input + 25% button */}
      <View style={styles.searchRow}>
        {/* Search Input - 75% width */}
        <View style={styles.searchInputContainer}>
          <Text style={[styles.label, { color: COLORS.sub }]}>Test</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              placeholder="Type to search tests..."
              placeholderTextColor={placeholderColor}
              style={[
                styles.input, 
                { 
                  backgroundColor: COLORS.inputBg, 
                  borderColor: COLORS.border, 
                  color: COLORS.text,
                }
              ]}
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t);
                setSelectedTest(null);
              }}
            />
            
            {/* Suggestions dropdown */}
            {(isLoading || suggestions.length > 0) && searchQuery && searchQuery.trim().length >= 1 && (
              <View style={[
                styles.suggBox, 
                { 
                  borderColor: COLORS.border, 
                  backgroundColor: COLORS.card 
                }
              ]}>
                {isLoading ? (
                  <View style={styles.suggRowCenter}>
                    <ActivityIndicator size="small" color={COLORS.brand} />
                  </View>
                ) : (
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.loinc_num_ || Math.random().toString()}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <Pressable 
                        style={[
                          styles.suggRow,
                          selectedTest?.loinc_num_ === item.loinc_num_ && { backgroundColor: COLORS.brand + '20' }
                        ]} 
                        onPress={() => {
                          setSelectedTest(item);
                          setSearchQuery(item.name);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.suggestionText, { color: COLORS.text }]}>{item.name}</Text>
                          <View style={styles.suggDetails}>
                            <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                              LOINC: {item.loinc_num_}
                            </Text>
                            <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                              Dept: {item.department}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.suggestionPrice, { color: COLORS.text }]}>₹{item.testPrice}</Text>
                      </Pressable>
                    )}
                    ListEmptyComponent={
                      <View style={styles.suggRowCenter}>
                        <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                          No matching tests found
                        </Text>
                      </View>
                    }
                    nestedScrollEnabled
                    style={{ maxHeight: 200 }}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {/* Add Button - 25% width */}
        <View style={styles.addButtonContainer}>
          <Text style={[styles.label, { color: COLORS.sub, opacity: 0 }]}>
            Add
          </Text>
          <Pressable
            onPress={handleAddItem}
            style={[
              styles.addButton, 
              { 
                backgroundColor: COLORS.brand,
                opacity: (!selectedTest && !searchQuery) ? 0.6 : 1
              }
            ]}
            disabled={!selectedTest && !searchQuery}
          >
            <Text style={[styles.addButtonText, { color: COLORS.buttonText }]}>
              Add
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Note Input */}
      <View style={styles.noteContainer}>
        <Text style={[styles.label, { color: COLORS.sub }]}>Note</Text>
        <TextInput
          placeholder="Notes (optional)"
          placeholderTextColor={placeholderColor}
          style={[
            styles.noteInput,
            {
              backgroundColor: COLORS.inputBg,
              borderColor: COLORS.border,
              color: COLORS.text,
            },
          ]}
          value={noteInput}
          onChangeText={setNoteInput}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Show selected test info */}
      {selectedTest && (
        <View style={[styles.selectedItemBox, { 
          backgroundColor: COLORS.brand + '10', 
          borderColor: COLORS.brand,
          marginTop: SPACING.sm
        }]}>
          <Text style={[styles.selectedItemText, { color: COLORS.text }]}>
            Selected: <Text style={{ fontWeight: '700' }}>{selectedTest.name}</Text>
          </Text>
          <Text style={[styles.selectedItemMeta, { color: COLORS.sub }]}>
            Price: ₹{selectedTest.testPrice} | LOINC: {selectedTest.loinc_num_}
          </Text>
        </View>
      )}

      {/* Show no results message */}
      {searchQuery.trim().length > 0 && 
       suggestions.length === 0 && 
       !isLoading && (
        <View style={[styles.emptyStateSimple, { marginTop: SPACING.sm }]}>
          <Text style={{ color: COLORS.sub }}>No tests found</Text>
          <Text style={{ color: COLORS.sub, marginTop: SPACING.xs }}>Try a different keyword</Text>
        </View>
      )}
    </>
  );

  const renderTableHeaders = () => (
    <View style={[styles.tableHeader]}>
      <Text style={[styles.headerText, { width: responsiveWidth(220) }]}>
        {type === "medicine" ? "Medicine Name" : "Test Name"}
      </Text>
      <Text style={[styles.headerText, { width: responsiveWidth(120) }]}>
        {type === "medicine" ? "Expiry Date" : "LOINC"}
      </Text>
      <Text style={[styles.headerText, { width: responsiveWidth(80), textAlign: "right" }]}>Price</Text>
      {type === "medicine" && (
        <Text style={[styles.headerText, { width: responsiveWidth(100), textAlign: "center" }]}>Quantity</Text>
      )}
      <Text style={[styles.headerText, { width: responsiveWidth(80), textAlign: "right" }]}>GST</Text>
      <Text style={[styles.headerText, { width: responsiveWidth(120), textAlign: "right" }]}>Amount</Text>
      <Text style={[styles.headerText, { width: responsiveWidth(90), textAlign: "right" }]}>Action</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? FOOTER_H + insets.bottom : FOOTER_H}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.brand} />

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom:
                FOOTER_H + insets.bottom + SPACING.xl + Math.min(keyboardHeight, FOOTER_H),
              minHeight: Math.max(
                SCREEN_HEIGHT - FOOTER_H - insets.top - insets.bottom,
                SCREEN_HEIGHT * 0.7
              ),
            }}
          >
            <View style={styles.content}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.text }]}>Patient Name *</Text>
                <TextInput
                  ref={(ref) => (inputRefs.current.name = ref)}
                  style={[
                    styles.input,
                    {
                      backgroundColor: COLORS.inputBg,
                      borderColor: formErrors.name ? COLORS.danger : COLORS.border,
                      color: COLORS.text,
                    },
                  ]}
                  placeholder="Enter patient name"
                  placeholderTextColor={placeholderColor}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, name: text }));
                    if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
                  }}
                />
                {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
              </View>

              <View style={styles.formRowSimple}>
                <View style={[styles.formHalf]}>
                  <Text style={[styles.label, { color: COLORS.text }]}>Mobile Number *</Text>
                  <TextInput
                    ref={(ref) => (inputRefs.current.mobileNumber = ref)}
                    style={[
                      styles.input,
                      {
                        backgroundColor: COLORS.inputBg,
                        borderColor: formErrors.mobileNumber ? COLORS.danger : COLORS.border,
                        color: COLORS.text,
                      },
                    ]}
                    placeholder="Enter mobile number"
                    placeholderTextColor={placeholderColor}
                    keyboardType="phone-pad"
                    value={formData.mobileNumber}
                    onChangeText={(text) => {
                      setFormData((prev) => ({ ...prev, mobileNumber: text }));
                      if (formErrors.mobileNumber) setFormErrors((p) => ({ ...p, mobileNumber: undefined }));
                    }}
                    maxLength={10}
                  />
                  {formErrors.mobileNumber && <Text style={styles.errorText}>{formErrors.mobileNumber}</Text>}
                </View>

                <View style={[styles.formHalf]}>
                  <Text style={[styles.label, { color: COLORS.text }]}>City *</Text>
                  <TextInput
                    ref={(ref) => (inputRefs.current.city = ref)}
                    style={[
                      styles.input,
                      {
                        backgroundColor: COLORS.inputBg,
                        borderColor: formErrors.city ? COLORS.danger : COLORS.border,
                        color: COLORS.text,
                      },
                    ]}
                    placeholder="Enter city"
                    placeholderTextColor={placeholderColor}
                    value={formData.city}
                    onChangeText={(text) => {
                      setFormData((prev) => ({ ...prev, city: text }));
                      if (formErrors.city) setFormErrors((p) => ({ ...p, city: undefined }));
                    }}
                  />
                  {formErrors.city && <Text style={styles.errorText}>{formErrors.city}</Text>}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.text }]}>Patient ID</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput, { backgroundColor: COLORS.inputBg, color: COLORS.sub }]}
                  value={formData.patientID}
                  editable={false}
                />
              </View>

              <FileUpload files={files} fileURLs={fileURLs} onFileChange={handleFileChange} onFileRemove={handleFileRemove} type={type} />

              <View style={styles.formGroup}>
                <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Select {type === "medicine" ? "Medicines" : "Tests"} </Text>
                {type === "medicine" ? renderMedicineSelection() : renderTestSelection()}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
                  {type === "medicine" ? "Medicines Prescribed" : "Tests Prescribed"}
                </Text>

                {((type === "medicine" && selectedMedicines.length === 0) || (type === "test" && selectedTests.length === 0)) ? (
                  <View style={styles.emptyStateSimple}>
                    <Text style={{ color: COLORS.sub, textAlign: "center" }}>No {type === "medicine" ? "medicines" : "tests"} selected</Text>
                    <Text style={{ color: COLORS.sub, marginTop: SPACING.xs, textAlign: "center" }}>
                      Use the {type === "medicine" ? "selector" : "search"} above to add {type === "medicine" ? "medicines" : "tests"}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ minWidth: Math.max(SCREEN_WIDTH - SPACING.lg * 2, 700) }}
                  >
                    <View style={[styles.tableContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border, minWidth: 700 }]}>
                      {renderTableHeaders()}
                      <View>
                        {type === "medicine" 
                          ? selectedMedicines.map((item, index) => renderMedicineItem({ item, index }))
                          : selectedTests.map((item, index) => renderTestItem({ item, index }))
                        }
                      </View>
                    </View>
                  </ScrollView>
                )}
              </View>

              {((type === "medicine" && selectedMedicines.length > 0) || (type === "test" && selectedTests.length > 0)) && (
                <View style={styles.formGroup}>
                  <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Payment Details</Text>

                  <View style={styles.rowSimple}>
                    <View style={styles.halfInfo}>
                      <Text style={[styles.metaLabel, { color: COLORS.sub }]}>Gross</Text>
                      <Text style={[styles.metaValue, { color: COLORS.text }]}>₹{grossAmount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.halfInfo}>
                      <Text style={[styles.metaLabel, { color: COLORS.sub }]}>GST</Text>
                      <Text style={[styles.metaValue, { color: COLORS.text }]}>₹{gstAmount.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={{ marginTop: SPACING.md }}>
                    <Text style={[styles.label, { color: COLORS.text }]}>Discount %</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: COLORS.inputBg, borderColor: COLORS.border, color: COLORS.text }]}
                      placeholder="0"
                      placeholderTextColor={placeholderColor}
                      keyboardType="numeric"
                      value={discount === 0 ? "" : discount.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        if (value >= 0 && value <= 100) setDiscount(value);
                      }}
                    />
                  </View>

                  <View style={[styles.divider, { marginTop: SPACING.md }]} />

                  <View style={[styles.rowSimple, { marginTop: SPACING.md }]}>
                    <View style={styles.halfInfo}>
                      <Text style={[styles.metaLabel, { color: COLORS.sub }]}>Total Amount</Text>
                      <Text style={[styles.totalAmountValue, { color: COLORS.brand }]}>₹{discountedAmount.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={[styles.secondaryButton]} onPress={() => navigation.goBack()} disabled={isSubmitting}>
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.primaryButton, isSubmitting && styles.disabledButton]} onPress={handleProceedToPay} disabled={isSubmitting}>
                      {isSubmitting ? <ActivityIndicator size="small" color={COLORS.buttonText} /> : <Text style={styles.primaryButtonText}>Proceed to Pay</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.footerWrap, { bottom: insets.bottom, zIndex: 50, elevation: 10 }]}>
            <Footer active={"walkin"} brandColor={COLORS.brand} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.xs,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    minHeight: isTablet ? 50 : 44,
    textAlignVertical: 'center',
  },
  disabledInput: {
    opacity: 0.9,
  },
  formRowSimple: {
    flexDirection: isSmallDevice ? "column" : "row",
    gap: SPACING.md,
  },
  formHalf: {
    flex: 1,
  },
  uploadArea: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    borderColor: COLORS.border,
  },
  uploadText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    textAlign: "center",
  },
  uploadSubtext: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  uploadedFilesTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  uploadedFilesList: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  uploadedFile: {
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: SPACING.md,
    alignItems: "center",
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  fileThumbnail: {
    width: responsiveWidth(64),
    height: responsiveHeight(64),
    borderRadius: 8,
  },
  pdfThumbnail: {
    width: responsiveWidth(64),
    height: responsiveHeight(64),
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.lightGrey,
  },
  fileName: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.sm,
    maxWidth: responsiveWidth(100),
    textAlign: "center",
  },
  fileActions: {
    flexDirection: "row",
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  deleteButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
  },
  searchRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  searchInputContainer: {
    flex: 0.75,
  },
  addButtonContainer: {
    flex: 0.25,
    justifyContent: "flex-end",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: isTablet ? 50 : 44,
  },
  addButtonText: {
    fontWeight: "700",
    fontSize: FONT_SIZE.sm,
  },
  // Note container
  noteContainer: {
    marginTop: SPACING.sm,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    textAlignVertical: "top",
    minHeight: 80,
  },
  suggBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderRadius: SPACING.sm,
    maxHeight: 200,
    overflow: "hidden",
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  suggRow: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  suggDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  suggRowCenter: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  suggestionPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: COLORS.brand,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.buttonText,
    fontWeight: "700",
    fontSize: FONT_SIZE.md,
  },
  disabledButton: {
    backgroundColor: COLORS.sub,
    opacity: 0.6,
  },
  emptyStateSimple: {
    padding: SPACING.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: SPACING.xs,
    textAlign: 'center',
    fontSize: FONT_SIZE.sm,
    minWidth: 50,
  },
  rowSimple: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInfo: {
    flex: 1,
  },
  metaLabel: {
    fontSize: FONT_SIZE.xs,
  },
  metaValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  totalAmountValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  secondaryButton: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    flex: 1,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: "600",
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
  errorText: {
    color: COLORS.danger,
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    padding: SPACING.sm,
  },
  loadingText: {
    marginLeft: SPACING.sm,
    color: COLORS.sub,
    fontSize: FONT_SIZE.sm,
  },
  selectedItemBox: {
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedItemText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  selectedItemMeta: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs / 2,
  },

  /* Table styles */
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  headerText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.sub,
  },
  tableRow: {
    flexDirection: "row",
    padding: SPACING.sm,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tableCellText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  tableCellSub: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs / 2,
  },
});

export default SaleComp;