// SaleComp.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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
  Modal,
  PermissionsAndroid,
  Image,
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

import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import { pick, types } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
import { showError, showSuccess } from "../../../store/toast.slice";
import { getCityValidationMessage, getNameValidationMessage, getPhoneValidationMessage } from "../../../utils/addPatientFormHelper";
import { Camera, Image as ImageIcon, File, X, Eye, Plus, Minus } from "lucide-react-native";

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
  const [showPickerModal, setShowPickerModal] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs access to your camera to take photos.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      dispatch(showError("Camera permission error"));
      return false;
    }
  };

  const openCamera = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        dispatch(showError("Camera permission denied"));
        return;
      }

      const res = await launchCamera({
        mediaType: "photo",
        quality: 0.8,
      });

      if (!res.didCancel && res.assets?.length) {
        const file = res.assets[0];
        const fileItem: FileItem = {
          uri: file.uri!,
          name: file.fileName || `photo_${Date.now()}.jpg`,
          type: file.type || "image/jpeg",
          size: file.fileSize,
        };

        // enforce 20MB limit
        if (fileItem.size && fileItem.size > 20 * 1024 * 1024) {
          dispatch(showError("File exceeds 20 MB limit"));
          return;
        }

        onFileChange(fileItem);
        setShowPickerModal(false);
      }
    } catch (err) {
      dispatch(showError("Camera error"));
    }
  };

  const openGallery = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 1,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (res.didCancel) return;
      if (res.errorCode) {
        dispatch(showError(res.errorMessage || "Failed to pick image"));
        return;
      }

      const asset = res.assets?.[0];
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
      setShowPickerModal(false);
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
        setShowPickerModal(false);
      }
    } catch (error: any) {
      // If user cancelled — many libs throw; ignore
      if (!error?.message?.toLowerCase()?.includes("cancel")) {
        dispatch(showError("Failed to pick document"));
      }
    }
  };

  const handleViewFile = async (uri: string, fileType: string) => {
    try {
      // Check if it's an image or PDF
      const isImage = fileType.startsWith('image/');
      const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');
      
      // For images, we can try to open directly
      if (isImage) {
        const supported = await Linking.canOpenURL(uri);
        if (supported) {
          await Linking.openURL(uri);
        } else {
          // For local file:// URIs, we might need a different approach
          if (uri.startsWith('file://')) {
            dispatch(showError("Cannot open image. Please check if you have a gallery app installed."));
          } else {
            dispatch(showError("Cannot open file - No app available to view this file"));
          }
        }
      } 
      // For PDFs and other documents
      else if (isPDF || uri.toLowerCase().endsWith('.pdf')) {
        // Try to open with a PDF viewer
        const supported = await Linking.canOpenURL(uri);
        if (supported) {
          await Linking.openURL(uri);
        } else {
          // For Android, try to use Google Drive or Chrome
          if (Platform.OS === 'android') {
            // Try to open with Chrome
            const chromeUri = uri.replace('file://', 'content://');
            try {
              await Linking.openURL(`intent://view?url=${encodeURIComponent(chromeUri)}#Intent;package=com.android.chrome;scheme=https;end`);
            } catch (e) {
              dispatch(showError("Install Chrome or a PDF viewer to open this file"));
            }
          } else {
            dispatch(showError("Install a PDF viewer to open this file"));
          }
        }
      }
      // For other file types
      else {
        const supported = await Linking.canOpenURL(uri);
        if (supported) {
          await Linking.openURL(uri);
        } else {
          dispatch(showError("No app available to open this file type"));
        }
      }
    } catch (e: any) {
      dispatch(showError("Failed to open file. Try downloading it first."));
    }
  };

  const PickerModal = () => (
    <Modal
      visible={showPickerModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowPickerModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select File Type</Text>
                <TouchableOpacity
                  onPress={() => setShowPickerModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                Choose how you want to upload the prescription
              </Text>
              
              <View style={styles.modalOptions}>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={openCamera}
                >
                  <View style={[styles.optionIcon, { backgroundColor: COLORS.brand + '20' }]}>
                    <Camera size={28} color={COLORS.brand} />
                  </View>
                  <Text style={styles.optionText}>Camera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={openGallery}
                >
                  <View style={[styles.optionIcon, { backgroundColor: COLORS.brand + '20' }]}>
                    <ImageIcon size={28} color={COLORS.brand} />
                  </View>
                  <Text style={styles.optionText}>Gallery</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={pickDocuments}
                >
                  <View style={[styles.optionIcon, { backgroundColor: COLORS.brand + '20' }]}>
                    <File size={28} color={COLORS.brand} />
                  </View>
                  <Text style={styles.optionText}>Files</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPickerModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { marginBottom: SPACING.sm }]}>{type === "medicine" ? "Upload Patient Prescription" : "Upload Patient Test Prescription"} *</Text>

      {fileURLs?.length === 0 ? (
        <TouchableOpacity 
          style={styles.uploadArea} 
          onPress={() => setShowPickerModal(true)} 
          activeOpacity={0.7}
        >
          <Text style={styles.uploadText}>Tap to select files from your device</Text>
          <Text style={styles.uploadSubtext}>PDF, PNG, JPG — max 20 MB</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={styles.uploadedFilesTitle}>Uploaded Files ({fileURLs.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.uploadedFilesList}>
              {fileURLs?.map((url, index) => {
                const file = files?.[index];
                const isImage = (file?.type || "").startsWith("image/");

                return (
                  <View key={index} style={styles.uploadedFile}>
                    <View style={styles.filePreviewContainer}>
                      {isImage ? (
                        <Image 
                          source={{ uri: url }} 
                          style={styles.fileThumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.pdfThumbnail}>
                          <File size={32} color={COLORS.brand} />
                          <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs, marginTop: 4 }}>PDF</Text>
                        </View>
                      )}
                    
                    </View>

                    <Text style={styles.fileName} numberOfLines={1}>
                      {file?.name || "Unknown File"}
                    </Text>

                    <View style={styles.fileActions}>
                      {/* {!isImage && (
                        <TouchableOpacity
                          style={styles.viewButton}
                          onPress={() => handleViewFile(url, file?.type || '')}
                          activeOpacity={0.7}
                        >
                          <Eye size={16} color={COLORS.brand} />
                          <Text style={{ color: COLORS.brand, fontSize: FONT_SIZE.xs, marginLeft: 4 }}>View</Text>
                        </TouchableOpacity>
                      )} */}
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => onFileRemove(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: COLORS.buttonText, fontSize: FONT_SIZE.xs }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
      
      <PickerModal />
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
  const department = user?.roleName || "Pathology";
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
      ) as any;

      console.log("med",response)

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
        ) as any;

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
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
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
          const toAdd = { 
            ...itemToAdd, 
            testNotes: noteInput ?? "",
            status: "pending",
            selectedQuantity: 1 // Start with quantity 1
          };
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
          // Match web structure exactly
          const toAdd = { 
            ...itemToAdd, 
            testNotes: noteInput ?? "",
            status: "pending"  // ← ADD THIS
          };
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

  const getGSTPercent = (gst?: number | string) => {
    const parsed = Number(gst);
    return isNaN(parsed) ? 0 : parsed;
  };
  const handleRemoveItem = (index: number) => {
    if (type === "medicine") {
      setSelectedMedicines((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSelectedTests((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleQuantityChange = (index: number, increment: boolean) => {
    setSelectedMedicines((prev) => {
      const updated = [...prev];
      const currentItem = updated[index];
      const currentQuantity = currentItem?.selectedQuantity || 1;
      const maxQuantity = currentItem.quantity || 1;
      
      let newQuantity;
      if (increment) {
        newQuantity = Math.min(currentQuantity + 1, maxQuantity);
      } else {
        newQuantity = Math.max(currentQuantity - 1, 1);
      }
      
      updated[index] = {
        ...currentItem,
        selectedQuantity: newQuantity
      };
      return updated;
    });
  };

  const grossAmount = type === "medicine"
    ? selectedMedicines.reduce((acc, item) => acc + (item?.sellingPrice ?? 0) * (item?.selectedQuantity || 1), 0)
    : selectedTests.reduce((acc, item) => acc + (item.testPrice ?? 0), 0);

  const gstAmount =
    type === "medicine"
      ? selectedMedicines.reduce((acc, item) => {
        const gstPercent = getGSTPercent(item.gst);
        const price = (item.sellingPrice ?? 0) * (item.selectedQuantity || 1);
        return acc + (price * gstPercent) / 100;
      }, 0)
      : selectedTests.reduce((acc, item) => {
        const gstPercent = getGSTPercent(item.gst);
        return acc + (item.testPrice ?? 0) * (gstPercent / 100);
      }, 0);
  const totalAmount = grossAmount + gstAmount;
  const discountedAmount = totalAmount - (totalAmount * discount) / 100;

  const handleProceedToPay = async () => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

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
          department: department,
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

  // Updated renderSelectedTests to match medicine card style
  const renderSelectedTests = () => (
    <View style={{ gap: SPACING.sm }}>
      {selectedTests.map((test, index) => (
        <View
          key={`${test.loinc_num_}-${index}`}
          style={[
            styles.selectedItemCard,
            {
              backgroundColor: COLORS.brand + "10",
              borderColor: COLORS.brand,
            },
          ]}
        >
          <View style={styles.selectedItemHeader}>
            <Text style={[styles.selectedItemName, { color: COLORS.text }]}>
              {test.name}
            </Text>
            <Text style={[styles.selectedItemPrice, { color: COLORS.brand }]}>
              ₹{test.testPrice}
            </Text>
          </View>

          <View style={styles.selectedItemDetails}>
            <Text style={[styles.selectedItemMeta, { color: COLORS.sub }]}>
              LOINC: {test.loinc_num_}
            </Text>
            <Text style={[styles.selectedItemMeta, { color: COLORS.sub }]}>
              Dept: {test.department}
            </Text>
          </View>

          {test.testNotes ? (
            <Text style={[styles.selectedItemNote, { color: COLORS.sub }]}>
              Note: {test.testNotes}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={() => handleRemoveItem(index)}
            style={styles.removeBtn}
          >
            <Text style={{ color: COLORS.danger, fontSize: FONT_SIZE.xs, }}>
              Remove
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  // Updated renderMedicineItem to use card style with quantity controls
  const renderMedicineItem = ({ item, index }: { item: MedicineType & { selectedQuantity?: number }; index: number }) => {
    const gstPercent = getGSTPercent(item.gst);
    const baseAmount =
      (item.sellingPrice ?? 0) * (item.selectedQuantity || 1);
    const amount = baseAmount + (baseAmount * gstPercent) / 100;

    const maxQuantity = item.quantity || 1;
    const currentQuantity = item.selectedQuantity || 1;

    return (
      <View
        key={`${item.id}-${index}`}
        style={[
          styles.selectedItemCard,
          {
            backgroundColor: COLORS.brand + "10",
            borderColor: COLORS.brand,
          },
        ]}
      >
        <View style={styles.selectedItemHeader}>
          <Text style={[styles.selectedItemName, { color: COLORS.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.selectedItemPrice, { color: COLORS.brand }]}>
            ₹{(item.sellingPrice ?? 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.selectedItemDetails}>
          <Text style={[styles.selectedItemMeta, { color: COLORS.sub }]}>
            HSN: {item.hsn || "N/A"}
          </Text>
          <Text style={[styles.selectedItemMeta, { color: COLORS.sub }]}>
            Expiry: {new Date(item.expiryDate).toLocaleDateString()}
          </Text>
        </View>

        <Text style={[styles.selectedItemMeta, { color: COLORS.sub, marginTop: 4 }]}>
          Available Stock: {maxQuantity}
        </Text>

        {/* Quantity Controls */}
        <View style={styles.quantityControls}>
          <Text style={[styles.quantityLabel, { color: COLORS.text }]}>
            Quantity:
          </Text>
          <View style={styles.quantityButtons}>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                currentQuantity <= 1 && styles.quantityButtonDisabled
              ]}
              onPress={() => handleQuantityChange(index, false)}
              disabled={currentQuantity <= 1}
            >
              <Minus size={16} color={currentQuantity <= 1 ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>
            
            <Text style={[styles.quantityValue, { color: COLORS.text }]}>
              {currentQuantity}
            </Text>
            
            <TouchableOpacity
              style={[
                styles.quantityButton,
                currentQuantity >= maxQuantity && styles.quantityButtonDisabled
              ]}
              onPress={() => handleQuantityChange(index, true)}
              disabled={currentQuantity >= maxQuantity}
            >
              <Plus size={16} color={currentQuantity >= maxQuantity ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>
            Total (incl. {gstPercent}% GST):
          </Text>
          <Text style={[styles.amountValue, { color: COLORS.text }]}>
            ₹{amount.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleRemoveItem(index)}
          style={styles.removeBtn}
        >
          <Text style={{ color: COLORS.danger, fontSize: FONT_SIZE.xs }}>
            Remove
          </Text>
        </TouchableOpacity>
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
                  // Clear suggestions if search query is empty
                  if (!text.trim()) {
                    setSuggestions([]);
                  }
                }}
              />
              
              {/* Suggestions dropdown */}
              {searchQuery.trim().length >= 1 && (
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
                      keyExtractor={(item) => item.id?.toString()}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <Pressable
                          style={[
                            styles.suggRow,
                            selectedMedicine?.id === item.id && {
                            backgroundColor: COLORS.brand + "20",
                          },
                          ]}
                          onPress={() => {
                            setSelectedMedicine(item);
                            setSearchQuery(item.name);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.suggestionText, { color: COLORS.text }]}>
                              {item.name}
                              </Text>
                              <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                              Qty: {item.quantity} | Exp:{" "}
                              {new Date(item.expiryDate).toLocaleDateString()}
                              </Text>
                            </View>
                         <Text style={{ fontWeight: "700", color: COLORS.text }}>
                  ₹{item.sellingPrice}
                </Text>
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
          <Text style={[styles.label, { color: COLORS.sub }]}>Test *</Text>
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
                // Clear suggestions if search query is empty
                if (!t.trim()) {
                  setSuggestions([]);
                }
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
                          // Clear suggestions when item is selected
                          setSuggestions([]);
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

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={FOOTER_H + insets.bottom}
    >
      <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.brand} />

          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
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
                    const cleanedText = text.replace(/[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s'.-]/g, '');
                    setFormData((prev) => ({ ...prev, name: cleanedText }));
                    const error = getNameValidationMessage(cleanedText);
                    if (error) {
                      setFormErrors((p) => ({ ...p, name: error }));
                    } else {
                      setFormErrors((p) => ({ ...p, name: undefined }));
                    }
                  }}
                  onBlur={() => {
                    const error = getNameValidationMessage(formData.name.trim());
                    if (error && formData.name) {
                      setFormErrors((p) => ({ ...p, name: error }));
                    }
                  }}
                  maxLength={100}
                  autoCapitalize="words"
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
                      // Remove non-numeric characters
                      const cleanedText = text.replace(/[^0-9]/g, '');
                      setFormData((prev) => ({ ...prev, mobileNumber: cleanedText }));
                      
                      // Validate on change
                      const error = getPhoneValidationMessage(cleanedText);
                      if (error) {
                        setFormErrors((p) => ({ ...p, mobileNumber: error }));
                      } else {
                        setFormErrors((p) => ({ ...p, mobileNumber: undefined }));
                      }
                    }}
                    onBlur={() => {
                      // Final validation on blur
                      const error = getPhoneValidationMessage(formData.mobileNumber);
                      if (error) {
                        setFormErrors((p) => ({ ...p, mobileNumber: error }));
                      }
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
                      // Remove any non-alphabet characters (only allow letters, spaces, and hyphens)
                      const cleanedText = text.replace(/[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '');
                      
                      // Prevent consecutive spaces
                      const finalText = cleanedText.replace(/\s+/g, ' ');
                      
                      setFormData((prev) => ({ ...prev, city: finalText }));
                      
                      // Validate on change
                      const error = getCityValidationMessage(finalText);
                      if (error) {
                        setFormErrors((p) => ({ ...p, city: error }));
                      } else {
                        setFormErrors((p) => ({ ...p, city: undefined }));
                      }
                    }}
                    onBlur={() => {
                      // Final validation on blur
                      const error = getCityValidationMessage(formData.city);
                      if (error) {
                        setFormErrors((p) => ({ ...p, city: error }));
                      }
                    }}
                    maxLength={50}
                    autoCapitalize="words"
                    autoCorrect={false}
                    spellCheck={false}
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

                {type === "medicine" ? (
                  <View style={{ marginTop: SPACING.sm, gap: SPACING.sm }}>
                    {selectedMedicines.map((item, index) =>
                      renderMedicineItem({ item, index })
                    )}
                  </View>
                ) : (
                  // ✅ TESTS → CARD LIST ONLY (NO TABLE, NO HORIZONTAL SCROLL)
                  <View style={{ marginTop: SPACING.sm }}>
                    {renderSelectedTests()}
                  </View>
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
      </Pressable>
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
    minWidth: 120,
    maxWidth: 160,
  },
  filePreviewContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  fileThumbnail: {
    width: responsiveWidth(35),
    height: responsiveWidth(40),
    borderRadius: 8,
    backgroundColor: COLORS.lightGrey,
  },
  viewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfThumbnail: {
    width: responsiveWidth(80),
    height: responsiveWidth(80),
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.lightGrey,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileName: {
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.sm,
    maxWidth: responsiveWidth(100),
    textAlign: "center",
    fontWeight: '500',
  },
  fileActions: {
    flexDirection: "row",
    gap: SPACING.xs,
    width: '100%',
    justifyContent: 'space-between',
  },
  viewButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    backgroundColor: COLORS.brand + '10',
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  deleteButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    bottom: "100%",
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderRadius: SPACING.sm,
    maxHeight: 200,
    overflow: "hidden",
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
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
  selectedItemCard: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  selectedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  selectedItemName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    flex: 1,
    marginRight: SPACING.sm,
  },
  selectedItemPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  selectedItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  selectedItemMeta: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  selectedItemNote: {
    marginTop: 6,
    fontSize: FONT_SIZE.xs,
    fontStyle: "italic",
    color: COLORS.sub,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  quantityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brand + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  quantityValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '40',
  },
  amountLabel: {
    fontSize: FONT_SIZE.xs,
  },
  amountValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  removeBtn: {
    marginTop: SPACING.sm,
    alignSelf: "flex-end",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    backgroundColor: COLORS.danger + '20',
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
    color: COLORS.text,
  },
  selectedItemMeta: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs / 2,
    color: COLORS.sub,
  },
  /* Modal styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  modalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  modalOption: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  optionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalCancelButton: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default SaleComp;