import React, { useState, useEffect } from "react";
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

const FOOTER_H = FOOTER_HEIGHT;

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

  return (
    <View style={styles.fileUploadContainer}>
      <Text style={styles.sectionTitle}>Upload Patient Test Results</Text>

      {files?.length === 0 ? (
        <TouchableOpacity style={styles.uploadArea} onPress={showFilePickerOptions}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.uploadedFilesList}>
              {files?.map((file, index) => {
                const isImage = (file?.mimeType ?? file?.type ?? "")?.startsWith("image/");
                const isPdf = (file?.mimeType ?? "")?.includes("pdf") || (file?.name ?? "")?.endsWith(".pdf");

                return (
                  <View key={index} style={styles.uploadedFile}>
                    {isImage ? (
                      <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
                    ) : isPdf ? (
                      <View style={styles.pdfThumbnail}>
                        <Text style={styles.pdfIcon}>📄</Text>
                      </View>
                    ) : (
                      <View style={styles.pdfThumbnail}>
                        <Text style={styles.pdfIcon}>📎</Text>
                      </View>
                    )}

                    <Text style={styles.fileName} numberOfLines={1}>
                      {file?.name ?? "Unknown File"}
                    </Text>

                    <View style={styles.fileActions}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => {
                          Alert.alert("View File", "File viewing functionality would open here");
                        }}
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
                      >
                        <DeleteIcon size={16} color={COLORS.error} />
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

        const response = await AuthFetch(apiEndpoint, token);
        
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
        );

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
    const normalizedUri = Platform.OS === "ios" && file.uri?.startsWith("file://")
      ? file.uri.replace("file://", "")
      : file.uri;
    // If content:// on Android, normalize to file://
    const finalUri = await normalizeUriForUpload(file.uri, file.name);
    const fileObj = { ...file, uri: finalUri, mimeType: file.mimeType ?? file.type };
    setFiles(prev => [...prev, fileObj]);
  };

  const handleFileRemove = (index: number) => {
    setFiles(prev => prev?.filter((_, i) => i !== index));
  };

  // Camera
  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: "photo",
        quality: 0.8,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert("Error", result.errorMessage ?? "Failed to open camera");
        return;
      }

      const asset: Asset | undefined = result.assets && result.assets[0];
      if (!asset || !asset.uri) return;

      await handleFileChange({
        uri: asset.uri,
        name: asset.fileName ?? `camera_${Date.now()}.jpg`,
        type: asset.type ?? "image/jpeg",
        mimeType: asset.type ?? "image/jpeg",
        size: asset.fileSize ?? 0,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
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

  // File upload and status update
  const handleSubmit = async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      if (files?.length === 0) {
        dispatch(showError("Please select at least one file to upload"));
        return;
      }

      setUploading(true);
      const token = await AsyncStorage.getItem("token");
      
const formData = new FormData();

// Append files to FormData with proper structure
for (const file of files) {
  formData.append("files", {
    uri: file.uri,
    type: file.mimeType ?? file.type ?? 'application/octet-stream',
    name: file.name,
  } as any);
}

formData.append("category", user?.roleName ?? "");

      let response;
      
      // PATIENT TYPE DETERMINATION
      const isWalkinPatient = walkinID && loincCode && (!timeLineID || timeLineID === walkinID);
      
      if (isWalkinPatient) {
        const hospitalID = String(user?.hospitalID ?? '');
        const userID = String(user?.id ?? '');
        const walkinIDStr = String(walkinID);
        const loincCodeStr = String(loincCode);
        
        response = await AuthPost(
          `attachment/${hospitalID}/${walkinIDStr}/${userID}/walkinAttachment?testID=${loincCodeStr}`,
          formData,
          token,
          true
        );
      } else {
        const patientIDToUse = timelineData?.patientID ?? patientDetails?.patientID ?? patientDetails?.id;
        const hospitalID = String(user?.hospitalID ?? '');
        const userID = String(user?.id ?? '');
        const timeLineIDStr = String(timeLineID);
        const patientIDStr = String(patientIDToUse ?? '');
        const testIDStr = String(testID ?? '');
        
        response = await AuthPost(
          `attachment/${hospitalID}/${timeLineIDStr}/${patientIDStr}/${userID}?testID=${testIDStr}`,
          formData,
          token,
          true
        );
      }

      if (response?.data?.message === "success") {
        dispatch(showSuccess("Files uploaded successfully"));
        
        // Update test status
        await updateTestStatus();
        
        // Navigate to Reports screen
        // @ts-ignore
        navigation.navigate("ReportsLab", { 
          state: { 
            timeLineID, 
            testID, 
            walkinID, 
            loincCode,
            patientData: patientDetails ?? patientData
          } 
        });
      } else {
        const errorMsg = response?.data?.message ?? response?.message ?? "Failed to upload files";
        dispatch(showError(errorMsg));
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message ?? error?.message ?? "Network error occurred";
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
      
      if (!patientData.loinc_num_ && !patientData.test) {
        // Update walk-in test status
        response = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "completed" },
          token
        );
      } else {
        // Update regular test status
        response = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "completed" },
          token
        );
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
              >
                <PlusIcon size={16} color={COLORS.brand} />
                <Text style={styles.addMoreButtonText}>Add More Files</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleSubmit}
                disabled={uploading}
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
  uploadedFilesList: {
    flexDirection: "row",
    gap: 12,
  },
  uploadedFile: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    minWidth: responsiveWidth(30),
    backgroundColor: COLORS.card,
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
  },
  pdfIcon: {
    fontSize: 32,
  },
  fileName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    marginTop: 8,
    textAlign: "center",
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
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
});

export default UploadTest;