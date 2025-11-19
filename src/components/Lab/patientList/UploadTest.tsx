// screens/UploadTest.tsx
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
import { useSelector } from "react-redux";
import DocumentPicker from '@react-native-documents/picker';
import { launchImageLibrary, launchCamera, Asset } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

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

// Colors
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  error: "#ef4444",
  gradientStart: "#14b8a6",
  gradientEnd: "#0d9488",
  footerBg: "#ffffff",
  footerBorder: "#e2e8f0",
  active: "#14b8a6",
  inactive: "#64748b",
};

type FileType = {
  uri: string;
  name: string;
  type: string;
  size: number;
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

// File Upload Component
const FileUpload: React.FC<{
  files: FileType[];
  onFileChange: (file: FileType) => void;
  onFileRemove: (index: number) => void;
}> = ({ files, onFileChange, onFileRemove }) => {
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
        type: picked.mimeType || picked.type || "application/octet-stream",
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
        type: asset.type || "image/jpeg",
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
        type: asset.type || "image/jpeg",
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

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf' || fileType?.includes('pdf')) return '📄';
    if (fileType?.startsWith('image/')) return '🖼️';
    return '📎';
  };

  return (
    <View style={styles.fileUploadContainer}>
      <Text style={styles.sectionTitle}>Upload Patient Test Results</Text>

      {files.length === 0 ? (
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
          <Text style={styles.uploadedFilesTitle}>Uploaded Documents ({files.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.uploadedFilesList}>
              {files.map((file, index) => {
                const isImage = (file?.mimeType || file?.type || "").startsWith("image/");
                const isPdf = (file?.mimeType || "").includes("pdf") || (file?.name || "").endsWith(".pdf");

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
                      {file?.name || "Unknown File"}
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
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  
  const { state } = route.params as any;
  const { timeLineID, testID, walkinID, loincCode, testName, patientData } = state;
  console.log('Route params:', state);

  const [files, setFiles] = useState<FileType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [timelineData, setTimelineData] = useState<any>(null);

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

        let apiEndpoint = `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getPatientDetails`;

        const response = await AuthFetch(apiEndpoint, token);
        
        if (response?.data?.message === "success") {
          setPatientDetails(response?.data?.patientList?.[0] || null);
        } 
      } catch (error) {
        console.error('Error fetching patient details:', error);
      } finally {
        setLoadingPatient(false);
      }
    };

    fetchPatientDetails();
  }, [patientData, timeLineID, user]);

  // Fetch timeline data for regular patients - EXACT SAME AS WEB
  useEffect(() => {
    const fetchTimelineData = async () => {
      if (walkinID) return; // Skip for walk-in patients

      try {
        const token = await AsyncStorage.getItem("token");
        if (!user?.hospitalID || !token || !timeLineID) return;

        const response = await AuthFetch(
          `patientTimeLine/${user.hospitalID}/${timeLineID}`,
          token
        );

        if (response?.data?.message === "success") {
          setTimelineData(response.data.patientTimeLine);
        }
      } catch (error) {
        console.error('Error fetching timeline data:', error);
      }
    };

    fetchTimelineData();
  }, [user?.hospitalID, timeLineID, walkinID]);

  const handleFileChange = (file: FileType) => {
    const normalizedUri = Platform.OS === "ios" && file.uri?.startsWith("file://") ? file.uri.replace("file://", "") : file.uri;
    const fileObj = { ...file, uri: normalizedUri };
    setFiles(prev => [...prev, fileObj]);
  };

  const handleFileRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // EXACT SAME LOGIC AS WEB - File upload and status update
  const handleSubmit = async () => {
    if (files.length === 0) {
      Alert.alert("No Files", "Please select at least one file to upload");
      return;
    }

    try {
      setUploading(true);
      const token = await AsyncStorage.getItem("token");
      
      const formData = new FormData();
      
      // Append files to FormData - EXACT SAME AS WEB
      files.forEach((file, index) => {
        formData.append("files", {
          uri: file.uri,
          type: file.mimeType || file.type,
          name: file.name,
        } as any);
      });
      
      formData.append("category", user?.roleName || "");

      let response;
      
      console.log('Upload data:', {
        walkinID,
        loincCode,
        testID,
        timeLineID,
        hospitalID: user?.hospitalID,
        userID: user?.id,
        hasTimelineData: !!timelineData,
        patientID: timelineData?.patientID
      });

      // EXACT SAME PATIENT TYPE DETERMINATION AS WEB
      const isWalkinPatient = walkinID && loincCode && (!timeLineID || timeLineID === walkinID);
      
      console.log('Patient type determination:', {
        isWalkinPatient,
        walkinID,
        loincCode,
        timeLineID,
        testID
      });

      if (isWalkinPatient) {
        console.log('Processing as WALK-IN patient');
        
        // EXACT SAME API ENDPOINT AS WEB
        const hospitalID = String(user?.hospitalID || '');
        const userID = String(user?.id || '');
        const walkinIDStr = String(walkinID);
        const loincCodeStr = String(loincCode);
        
        response = await AuthPost(
          `attachment/${hospitalID}/${walkinIDStr}/${userID}/walkinAttachment?testID=${loincCodeStr}`,
          formData,
          token,
          true
        );
      } else {
        console.log('Processing as REGULAR patient');
        
        // EXACT SAME API ENDPOINT AS WEB
        const patientIDToUse = timelineData?.patientID || patientDetails?.patientID || patientDetails?.id;
        const hospitalID = String(user?.hospitalID || '');
        const userID = String(user?.id || '');
        const timeLineIDStr = String(timeLineID);
        const patientIDStr = String(patientIDToUse || '');
        const testIDStr = String(testID || '');
        
        response = await AuthPost(
          `attachment/${hospitalID}/${timeLineIDStr}/${patientIDStr}/${userID}?testID=${testIDStr}`,
          formData,
          token,
          true
        );
      }

      console.log('Upload response:', response);

      // EXACT SAME SUCCESS HANDLING AS WEB
      if (response?.data?.message === "success") {
        Alert.alert("Success", "Files uploaded successfully");
        
        // EXACT SAME STATUS UPDATE AS WEB
        await updateTestStatus();
        
        // Navigate to Reports screen - EXACT SAME AS WEB
        navigation.navigate("ReportsLab", { 
          state: { 
            timeLineID, 
            testID, 
            walkinID, 
            loincCode,
            patientData: patientDetails || patientData
          } 
        });
      } else {
        const errorMsg = response?.data?.message || response?.message || "Failed to upload files";
        Alert.alert("Upload Failed", errorMsg);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMsg = error?.response?.data?.message || error?.message || "Network error occurred";
      Alert.alert("Upload Error", errorMsg);
    } finally {
      setUploading(false);
    }
  };

  // EXACT SAME LOGIC AS WEB - Update test status to completed
  const updateTestStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      let response;
      
      // EXACT SAME API CALLS AS WEB
      if (walkinID && loincCode) {
        // Update walk-in test status - EXACT SAME AS WEB
        response = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "completed" },
          token
        );
      } else {
        // Update regular test status - EXACT SAME AS WEB
        response = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "completed" },
          token
        );
      }

      console.log("Status update response:", response);
      
      if (response?.data?.message === "success") {
        console.log("Test status updated to completed successfully");
      } else {
        console.warn("Test status update response:", response?.data);
      }
    } catch (error) {
      console.error('Error updating test status:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
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
          />
          
          {files.length > 0 && (
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.addMoreButton}
                onPress={() => {
                  showFilePickerOptions();
                }}
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
                      Submit {files.length} File{files.length > 1 ? 's' : ''}
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
    fontSize: 18,
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
    fontSize: 14,
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
    fontSize: 14,
    color: COLORS.sub,
    textAlign: "center",
    marginVertical: 16,
    lineHeight: 20,
  },
  uploadSubtext: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  uploadedFilesContainer: {
    marginTop: 16,
  },
  uploadedFilesTitle: {
    fontSize: 16,
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
    minWidth: 120,
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 64,
    justifyContent: "center",
  },
});

export default UploadTest;