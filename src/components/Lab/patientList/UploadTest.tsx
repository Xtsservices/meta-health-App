import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
  FlatList,
  Modal,
  PermissionsAndroid,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { pick, types } from "@react-native-documents/picker";
import { launchImageLibrary, launchCamera, Asset } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNFS from "react-native-fs";
import LinearGradient from "react-native-linear-gradient";

// Icons
import {
  CloudUploadIcon,
  PlusIcon,
  DeleteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../../utils/SvgIcons";
import PatientProfileCard from "./PatientProfileCard";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import Footer from "../../dashboard/footer";

// Utils
import { 
  SPACING, 
  FONT_SIZE, 
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
  isTablet 
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { showError, showSuccess } from "../../../store/toast.slice";
import { X } from "lucide-react-native";

const FOOTER_H = FOOTER_HEIGHT;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type FileType = {
  uri: string;
  name: string;
  type: string;
  size?: number;
  mimeType?: string;
};

type PatientDetails = {
  id: number;
  patientID?: string;
  pID?: string;
  pName?: string;
  patientName?: string;
  phoneNumber?: string;
  phone?: string;
  ptype?: number;
  departmentName?: string;
  department_name?: string;
  dept?: string;
  doctorName?: string;
  doctor_firstName?: string;
  doctor_lastName?: string;
  alertTimestamp?: string;
  addedOn?: string;
  createdAt?: string;
  timestamp?: string;
  prescriptionURL?: string;
  fileName?: string;
  timeLineID?: number;
  isFromAlert?: boolean;
  photo?: string;
  age?: number;
  ward_name?: string;
  status?: string;
  patientStartStatus?: number;
  testsList?: any[];
  completedTime?: string;
  _completedTime?: string;
  updatedOn?: string;
  latestTestTime?: string;
  lastModified?: string;
  gender?: number;
  dob?: string;
  city?: string;
  state?: string;
  imageURL?: string;
  attachments?: any[];
  dischargeDate?: string;
  followUp?: string;
  follow_up?: string;
  followup?: string;
  FollowUp?: string;
};

// File Upload Component (keeps UI, uses callbacks from parent)
const FileUpload: React.FC<{
  files: FileType[];
  onFileChange: (file: FileType) => void;
  onFileRemove: (index: number) => void;
  onPickDocument: (multi?: boolean) => void;
  onPickImageFromLibrary: () => void;
  onTakePhoto: () => void;
}> = ({ files, onFileChange, onFileRemove, onPickDocument, onPickImageFromLibrary, onTakePhoto }) => {
  const flatListRef = useRef<FlatList>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [selectedImage, setSelectedImage] = useState<FileType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Check if we need to show arrows
  useEffect(() => {
    if (files.length > 0 && contentWidth > 0) {
      const containerWidth = SCREEN_WIDTH - 32; // Account for padding
      const needsScrolling = contentWidth > containerWidth;
      
      if (needsScrolling) {
        setShowLeftArrow(scrollOffset > 0);
        setShowRightArrow(scrollOffset < contentWidth - containerWidth);
      } else {
        setShowLeftArrow(false);
        setShowRightArrow(false);
      }
    } else {
      setShowLeftArrow(false);
      setShowRightArrow(false);
    }
  }, [files, contentWidth, scrollOffset]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const layoutWidth = event.nativeEvent.layoutMeasurement.width;
    const contentWidth = event.nativeEvent.contentSize.width;
    
    setScrollOffset(contentOffsetX);
    setShowLeftArrow(contentOffsetX > 0);
    setShowRightArrow(contentOffsetX + layoutWidth < contentWidth - 1);
  };

  const handleContentSizeChange = (width: number) => {
    setContentWidth(width);
  };

  const scrollLeft = () => {
    if (flatListRef.current) {
      const newOffset = Math.max(0, scrollOffset - 200);
      flatListRef.current.scrollToOffset({
        offset: newOffset,
        animated: true,
      });
      setScrollOffset(newOffset);
    }
  };

  const scrollRight = () => {
    if (flatListRef.current && contentWidth > 0) {
      const containerWidth = SCREEN_WIDTH - 32;
      const maxOffset = Math.max(0, contentWidth - containerWidth);
      const newOffset = Math.min(maxOffset, scrollOffset + 200);
      flatListRef.current.scrollToOffset({
        offset: newOffset,
        animated: true,
      });
      setScrollOffset(newOffset);
    }
  };

  const handleViewFile = (file: FileType) => {
    const isImage = (file?.mimeType ?? file?.type ?? "")?.startsWith("image/");
    
    if (isImage) {
      // Open image in modal
      setSelectedImage(file);
      setModalVisible(true);
    } else {
      // For non-image files, show an alert with option to open with another app
      Alert.alert(
        "View File",
        "This file type cannot be previewed here. You can open it with another app.",
        [
          { 
            text: "OK", 
            style: "default",
            onPress: () => {
              // Optional: Add functionality to open with another app
              // For example, using Linking.openURL
            }
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const showFilePickerOptions = () => {
    Alert.alert(
      "Select File Type",
      "Choose how you want to upload the file",
      [
        { text: "Take Photo", onPress: onTakePhoto },
        { text: "Choose from Gallery", onPress: onPickImageFromLibrary },
        { text: "Choose Document", onPress: () => onPickDocument(false) },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const renderFileItem = ({ item: file, index }: { item: FileType; index: number }) => {
    const isImage = (file?.mimeType ?? file?.type ?? "")?.startsWith("image/");
    const isPdf = (file?.mimeType ?? "")?.includes("pdf") || (file?.name ?? "")?.endsWith(".pdf");
    const fileName = file?.name ?? "Unknown File";
    const displayName = fileName.length > 20 ? fileName.substring(0, 17) + "..." : fileName;

    return (
      <View style={styles.uploadedFile}>
        <TouchableOpacity 
          onPress={() => handleViewFile(file)} 
          activeOpacity={0.7}
          style={styles.fileThumbnailContainer}
        >
          {isImage ? (
            <Image 
              source={{ uri: file.uri }} 
              style={styles.fileThumbnail} 
            />
          ) : isPdf ? (
            <View style={styles.pdfThumbnail}>
              <Text style={styles.pdfIcon}>📄</Text>
              <Text style={styles.fileTypeText}>PDF</Text>
            </View>
          ) : (
            <View style={styles.pdfThumbnail}>
              <Text style={styles.pdfIcon}>📎</Text>
              <Text style={styles.fileTypeText}>DOC</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.fileName} numberOfLines={2}>
          {displayName}
        </Text>

        <View style={styles.fileActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => handleViewFile(file)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              style={styles.gradientSmallButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => onFileRemove(index)}
            activeOpacity={0.7}
          >
            <DeleteIcon size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.fileUploadContainer}>
      <Text style={styles.sectionTitle}>Upload Patient Test Results</Text>

      {files?.length === 0 ? (
        <TouchableOpacity style={styles.uploadArea} onPress={showFilePickerOptions} activeOpacity={0.8}>
          <CloudUploadIcon size={48} color={COLORS.brand} />
          <Text style={styles.uploadText}>
            Tap to select files from your device
            {"\n"}
            <Text style={styles.uploadSubtext}>
              Accepted formats: PDF, PNG, JPG. Each file must be under 20 MB.
            </Text>
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={showFilePickerOptions}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <PlusIcon size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Files</Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      ) : (
        <View style={styles.uploadedFilesContainer}>
          <Text style={styles.uploadedFilesTitle}>Uploaded Documents ({files?.length})</Text>
          
          <View style={styles.horizontalScrollContainer}>
            {showLeftArrow && (
              <TouchableOpacity 
                style={styles.scrollArrowLeft} 
                onPress={scrollLeft} 
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeftIcon size={24} color={COLORS.brand} />
              </TouchableOpacity>
            )}
            
            <FlatList
              ref={flatListRef}
              horizontal
              data={files}
              renderItem={renderFileItem}
              keyExtractor={(item, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.uploadedFilesList}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={handleContentSizeChange}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={10}
              onMomentumScrollEnd={(event) => {
                setScrollOffset(event.nativeEvent.contentOffset.x);
              }}
            />
            
            {showRightArrow && (
              <TouchableOpacity 
                style={styles.scrollArrowRight} 
                onPress={scrollRight} 
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronRightIcon size={24} color={COLORS.brand} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Image Preview Modal - FIXED */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedImage?.name || "Image Preview"}
              </Text>
                      <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                        <X size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
            
            <View style={styles.imageContainer}>
              {selectedImage && (
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.fullSizeImage}
                  resizeMode="contain"
                />
              )}
            </View>
        </View>
        </View>
      </Modal>
    </View>
  );
};
const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "We need access to your camera to take photos.",
        buttonPositive: "OK",
        buttonNegative: "Cancel",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    return false;
  }
};

const UploadTest: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  
  const { state } = route.params as any;
  const { timeLineID, testID, walkinID, loincCode, testName, patientData } = state;

  const [files, setFiles] = useState<FileType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [timelineData, setTimelineData] = useState<any>(null);

  // Check authentication
  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        navigation.navigate("Login");
        return false;
      }
      return true;
    } catch (error) {
      dispatch(showError("Authentication check failed"));
      return false;
    }
  };

  // Fetch patient details if not passed in navigation
  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (patientData) {
        setPatientDetails(patientData);
        return;
      }

      try {
        setLoadingPatient(true);
        const token = await AsyncStorage.getItem("token");
        
        if (!user?.hospitalID || !token || !timeLineID) {
          return;
        }

        let apiEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getPatientDetails`;

        const response = await AuthFetch(apiEndpoint, token) as any;
        
        if (response?.data?.message === "success") {
          setPatientDetails(response?.data?.patientList?.[0] ?? null);
        } 
      } catch (error) {
        dispatch(showError("Failed to fetch patient details"));
      } finally {
        setLoadingPatient(false);
      }
    };

    fetchPatientDetails();
  }, [patientData, timeLineID, user, dispatch]);

  // Fetch timeline data for regular patients
  useEffect(() => {
    const fetchTimelineData = async () => {
      if (walkinID) return; // Skip for walk-in patients

      try {
        const token = await AsyncStorage.getItem("token");
        if (!user?.hospitalID || !token || !timeLineID) return;

        const response = await AuthFetch(
          `patientTimeLine/${user?.hospitalID}/${timeLineID}`,
          token
        )as any;

        if (response?.data?.message === "success") {
          setTimelineData(response.data.patientTimeLine);
        }
      } catch (error) {
        // Silent fail - timeline data is optional
      }
    };

    fetchTimelineData();
  }, [user?.hospitalID, timeLineID, walkinID]);

const normalizeUriForUpload = async (uri: string, name: string) => {
  try {
    if (Platform.OS === "android" && uri.startsWith("content://")) {
      const dest = `${RNFS.DocumentDirectoryPath}/${Date.now()}_${name}`;
      await RNFS.copyFile(uri, dest);
      return `file://${dest}`;
    }
    // For iOS, ensure it starts with file://
    if (Platform.OS === "ios" && !uri.startsWith("file://")) {
      return `file://${uri}`;
    }
    return uri;
  } catch (err) {
    return uri; // Return original URI as fallback
  }
};
const handleFileChange = async (file: FileType) => {
  setFiles(prev => [
    ...prev,
    { ...file, mimeType: file.mimeType ?? file.type }
  ]);
};

  const handleFileRemove = (index: number) => {
    setFiles(prev => prev?.filter((_, i) => i !== index));
  };

  // Camera
const takePhoto = async () => {
  try {
    // Request camera permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        "Permission required",
        "Please allow camera access in Settings to take a photo."
      );
      return;
    }

    // Use the callback approach instead of async/await with launchCamera
    launchCamera(
      {
        mediaType: "photo",
        quality: 0.8,
        cameraType: "back",
        saveToPhotos: false, 
      },
      async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert("Error", response.errorMessage ?? "Failed to take photo");
        return;
      }

      const asset = response.assets?.[0];
      if (!asset?.uri) return;

    // ✅ WAIT for file to be normalized
    const normalizedUri = await normalizeUriForUpload(
      asset.uri,
      asset.fileName ?? `camera_${Date.now()}.jpg`
    );

        handleFileChange({
        uri: normalizedUri,
        name: asset.fileName ?? `camera_${Date.now()}.jpg`,
        type: asset.type ?? "image/jpeg",
        mimeType: asset.type ?? "image/jpeg",
        size: asset.fileSize ?? 0,
      });
      }
    );
    } catch (error) {
      Alert.alert("Error", "Failed to access camera");
    }
  };

  // Gallery
  const pickImageFromLibrary = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 5, // allow selecting multiple images
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert("Error", result.errorMessage ?? "Failed to pick image");
        return;
      }

      const newAssets = result.assets ?? [];
      for (const asset of newAssets) {
        if (!asset || !asset.uri) continue;
        await handleFileChange({
          uri: asset.uri,
          name: asset.fileName ?? `photo_${Date.now()}.jpg`,
          type: asset.type ?? "image/jpeg",
          mimeType: asset.type ?? "image/jpeg",
          size: asset.fileSize ?? 0,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // Document picker using @react-native-documents/picker -> pick()
  const pickDocuments = async (allowMulti = true) => {
    try {
      const results = await pick({
        allowMultiSelection: allowMulti,
        type: [types.pdf, types.images, types.plainText, types.allFiles],
      });

      const mapped = await Promise.all(
        results.map(async file => {
          let uri = file.uri;
          // For Android convert content:// → file:// using RNFS if needed
          if (Platform.OS === "android" && uri.startsWith("content://")) {
            const dest = `${RNFS.DocumentDirectoryPath}/${file.name}`;
            await RNFS.copyFile(uri, dest).catch(() => null);
            uri = `file://${dest}`;
          }
          return {
            uri,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            mimeType: file.type,
          } as FileType;
        })
      );

      // append all
      setFiles(prev => [...prev, ...mapped]);
    } catch (error: any) {
      // silence cancellation
      if (!error?.message?.toLowerCase()?.includes("cancel")) {
        Alert.alert("Error", "Failed to pick document(s)");
      }
    }
  };

  // Show add more options (connected properly now)
  const showAddMoreFilePickerOptions = () => {
    Alert.alert(
      "Select File Type",
      "Choose how you want to upload the file",
      [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: pickImageFromLibrary },
        { text: "Choose Document", onPress: () => pickDocuments(true) },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };
const waitForFileReady = async (uri: string) => {
  try {
    const path = uri.replace("file://", "");
    let attempts = 0;

    while (attempts < 5) {
      const stat = await RNFS.stat(path);

      if (stat.size > 0) {
        return true;
      }

      // wait 200ms and retry
      await new Promise(res => setTimeout(res, 200));
      attempts++;
    }

    return false;
  } catch {
    return false;
  }
};


  // File upload and status update
  const handleSubmit = async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      if (files.length === 0) {
        dispatch(showError("Please select at least one file to upload"));
        return;
      }

      // ✅ WAIT FOR FILE SYSTEM TO FLUSH
      for (const file of files) {
        const ready = await waitForFileReady(file.uri);
        if (!ready) {
          dispatch(showError("Preparing image, please try again…"));
          return;
        }
      }

      setUploading(true);
      const token = await AsyncStorage.getItem("token");
      
    const formData = new FormData();

    // CORRECTED: Append files with proper structure for React Native
    files.forEach((file, index) => {
      // Create file object with proper format for React Native
      const fileObject = {
        uri: file.uri,
        type: file.mimeType || file.type || 'application/octet-stream',
        name: file.name || `file_${index}.${file.type?.split('/')[1] || 'jpg'}`,
      };

      // For FormData in React Native, we need to append as plain object
      // The key name might need to match your backend expectation
      formData.append('files', fileObject as any);
    });

    // Add additional fields
    formData.append('category', user?.roleName || '');
    formData.append('hospitalID', String(user?.hospitalID || ''));
    formData.append('userID', String(user?.id || ''));
    formData.append('timestamp', new Date().toISOString());

    let response;
    const isWalkinPatient = walkinID && loincCode && (!timeLineID || timeLineID === walkinID);
    
    if (isWalkinPatient) {
      // Walk-in patient upload
      
      // CORRECTED: Added all required parameters
      const endpoint = `attachment/${user?.hospitalID}/${walkinID}/${user?.id}/walkinAttachment?testID=${loincCode}`;
      
      response = await AuthPost(
        endpoint,
        formData,
        token,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60 second timeout for large files
        }
      ) as any;
    } else {
      // Regular patient upload
      
      // CORRECTED: Get patient ID properly
      const patientID = patientDetails?.patientID || 
                        patientDetails?.id || 
                        patientDetails?.pID || 
                        timelineData?.patientID;
      
      if (!patientID) {
        throw new Error("Patient ID not found");
      }

      const endpoint = `attachment/${user?.hospitalID}/${timeLineID}/${patientID}/${user?.id}?testID=${testID}`;
      
      response = await AuthPost(
        endpoint,
        formData,
        token,
      ) as any;
    }

    // Check response
      if (response?.data?.message === "success") {
        dispatch(showSuccess("Files uploaded successfully"));
        
        // Update test status
        await updateTestStatus();
        
      // Format attachments for navigation
      const uploadedAttachments = response?.data?.attachements || response?.data?.attachments || [];
      
      // Prepare navigation state
      const navigationState: any = {
        timeLineID: timeLineID || walkinID,
        testID: testID || loincCode,
        patientData: patientDetails ?? patientData,
        tab: "normal",
        uploadedAttachments: uploadedAttachments.map((att: any) => ({
          id: att.id || att.attachmentID,
          fileName: att.fileName,
          fileURL: att.fileURL || att.fileUrl,
          mimeType: att.mimeType || att.contentType,
          addedOn: att.addedOn || new Date().toISOString(),
          userID: att.userID,
          testID: testID || loincCode,
          loincCode: att.loincCode,
          timeLineID: timeLineID || walkinID,
          patientID: patientDetails?.patientID || patientDetails?.id,
        }))
      };
      
      if (isWalkinPatient) {
        navigationState.walkinID = walkinID;
        navigationState.loincCode = loincCode;
        navigationState.testID = loincCode;
      }
      
      navigation.navigate("ReportsLab", { 
        state: navigationState
      });
    } else {
      // Get specific error message
      const errorMsg = response?.data?.message || 
                       response?.data?.error || 
                       response?.message || 
                       "Failed to upload files";
      
      dispatch(showError(`Upload failed: ${errorMsg}`));
    }
  } catch (error: any) {
    
    let errorMsg = "Network error occurred";
    if (error.message) {
      errorMsg = error.message;
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMsg = error.response.data.error;
    }
    
    dispatch(showError(errorMsg));
  } finally {
    setUploading(false);
  }
};

  // Update test status to completed
  const updateTestStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      let response;
      
      const isWalkinPatient = walkinID && loincCode && (!timeLineID || timeLineID === walkinID);
      
      if (isWalkinPatient) {
        // Update walk-in test status
        response = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "completed" },
          token
        ) as any;
      } else {
        // Update regular test status
        response = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "completed" },
          token
        ) as any;
      }
      if (response?.data?.message === "success") {
        // Success - status updated
      }
    } catch (error) {
      // Silent fail - status update is secondary
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 80 + FOOTER_H,
          flexGrow: 1 
        }}
      >
        {/* Patient Profile Card */}
        {loadingPatient ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.brand} />
            <Text style={styles.loadingText}>Loading patient details...</Text>
          </View>
        ) : patientDetails ? (
          <View style={styles.section}>
            <PatientProfileCard
              patientDetails={patientDetails}
              tab="normal"
            />
          </View>
        ) : null}
        
        {/* Upload Section */}
        <View style={styles.section}>
          <FileUpload 
            files={files} 
            onFileChange={handleFileChange}
            onFileRemove={handleFileRemove}
            onPickDocument={pickDocuments}
            onPickImageFromLibrary={pickImageFromLibrary}
            onTakePhoto={takePhoto}
          />
          
          {files?.length > 0 && (
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.addMoreButton}
                onPress={showAddMoreFilePickerOptions}
                activeOpacity={0.7}
              >
                <PlusIcon size={16} color={COLORS.brand} />
                <Text style={styles.addMoreButtonText}>Add More Files</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleSubmit}
                disabled={uploading}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      Submit {files?.length} File{files?.length > 1 ? 's' : ''}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: isTablet ? FONT_SIZE.xl : FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  fileUploadContainer: {
    marginBottom: 16,
  },
  uploadArea: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  uploadText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    textAlign: "center",
    marginVertical: 16,
    lineHeight: 20,
  },
  uploadSubtext: {
    fontSize: FONT_SIZE.sm,
    color: "#9ca3af",
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: "#fff",
  },
  uploadedFilesContainer: {
    marginTop: 16,
  },
  uploadedFilesTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  horizontalScrollContainer: {
    position: 'relative',
  },
  uploadedFilesList: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 12,
  },
  uploadedFile: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    width: responsiveWidth(30),
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fileThumbnailContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 4,
  },
  pdfThumbnail: {
    width: 64,
    height: 64,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pdfIcon: {
    fontSize: 28,
  },
  fileTypeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: 4,
    fontWeight: '500',
  },
  fileName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    marginTop: 8,
    textAlign: "center",
    width: '100%',
    lineHeight: 16,
  },
  fileActions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 4,
  },
  viewButton: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradientSmallButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  viewButtonText: {
    color: "#fff",
    fontSize: FONT_SIZE.xs,
    fontWeight: "500",
  },
  deleteButton: {
    padding: 4,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.brand,
    gap: 8,
    backgroundColor: COLORS.card,
  },
  addMoreButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.brand,
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
  scrollArrowLeft: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArrowRight: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles - FIXED
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#334155',
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },
  modalTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.6,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
});

export default UploadTest;