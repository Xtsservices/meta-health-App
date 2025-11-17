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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import DocumentPicker from '@react-native-documents/picker';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Icons
import {
  ArrowLeftIcon,
  CloudUploadIcon,
  PlusIcon,
  DeleteIcon,
} from "../../../utils/SvgIcons";
import PatientProfileCard from "./PatientProfileCard";
import { AuthFetch } from "../../../auth/auth";
import { RootState } from "../../../store/store";

// Colors
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  error: "#ef4444",
};

type FileType = {
  uri: string;
  name: string;
  type: string;
  size: number;
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

const UploadTest: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  
  const { state } = route.params as any;
  const { timeLineID, testID, walkinID, loincCode, testName, patientData } = state;

  const [files, setFiles] = useState<FileType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

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
        
        if (response?.status === "success" && response?.data?.message === "success") {
          setPatientDetails(response.data.patientList?.[0] || null);
        } else if (response?.message === "success") {
          setPatientDetails(response.patientList?.[0] || null);
        }
      } catch (error) {
        console.error('Error fetching patient details:', error);
      } finally {
        setLoadingPatient(false);
      }
    };

    fetchPatientDetails();
  }, [patientData, timeLineID, user]);

  const pickDocument = async () => {
    try {
      // Simple try-catch without using isCancel
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf],
        allowMultiSelection: true,
      });

      console.log('Document picker result:', result);

      if (result && result.length > 0) {
        const newFiles = result.map(file => ({
          uri: file.uri,
          name: file.name || 'unknown',
          type: file.type || 'application/octet-stream',
          size: file.size || 0,
        }));
        
        setFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.log('Document picker cancelled or failed:', error);
      // Don't show alert for cancellation, only for actual errors
      if (error && typeof error === 'object' && !('code' in error && error.code === 'DOCUMENT_PICKER_CANCELED')) {
        Alert.alert("Error", "Failed to pick document");
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      Alert.alert("No Files", "Please select at least one file to upload");
      return;
    }

    try {
      setUploading(true);
      const token = await AsyncStorage.getItem("token");
      
      const formData = new FormData();
      
      // Append files
      files.forEach((file, index) => {
        formData.append("files", {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);
      });
      
      formData.append("category", user?.roleName || "");

      let response;
      if (walkinID && loincCode) {
        // Walk-in attachment upload
        response = await AuthFetch(
          `attachment/${user?.hospitalID}/${walkinID}/${user?.id}/walkinAttachment?testID=${loincCode}`,
          token,
        );
      } else {
        // Regular attachment upload
        response = await AuthFetch(
          `attachment/${user?.hospitalID}/${timeLineID}/${user?.id}?testID=${testID}`,
          token,
        );
      }

      if (response?.data?.message === "success") {
        Alert.alert("Success", "Files uploaded successfully");
        
        // Update test status to completed
        await updateTestStatus();
        
        // Navigate back
        navigation.goBack();
      } else {
        Alert.alert("Error", response?.message || "Failed to upload files");
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert("Error", "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const updateTestStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      let response;
      if (walkinID && loincCode) {
        response = await AuthFetch(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          token,
        );
      } else {
        response = await AuthFetch(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          token,
        );
      }

      console.log("Status update response:", response);
    } catch (error) {
      console.error('Error updating test status:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    return '📎';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Test Results</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
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
          <Text style={styles.sectionTitle}>Upload Patient Test Results</Text>
          
          {files.length === 0 ? (
            <TouchableOpacity 
              style={styles.uploadArea}
              onPress={pickDocument}
            >
              <CloudUploadIcon size={48} color={COLORS.brand} />
              <Text style={styles.uploadText}>
                Drag and drop files here, or browse to select files from your device.
                Accepted formats: PDF, PNG, JPG. Each file must be under 20 MB.
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={pickDocument}
              >
                <PlusIcon size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Files</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.uploadedTitle}>Uploaded Documents ({files.length})</Text>
              <View style={styles.filesGrid}>
                {files.map((file, index) => (
                  <View key={index} style={styles.fileCard}>
                    <Text style={styles.fileIcon}>
                      {getFileIcon(file.type)}
                    </Text>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileSize}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => removeFile(index)}
                    >
                      <DeleteIcon size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.addMoreButton}
                  onPress={pickDocument}
                >
                  <PlusIcon size={16} color={COLORS.brand} />
                  <Text style={styles.addMoreButtonText}>Add More Files</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={uploading}
                >
                  <Text style={styles.submitButtonText}>
                    {uploading ? "Uploading..." : `Submit ${files.length} File${files.length > 1 ? 's' : ''}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: COLORS.brand,
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brand,
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
  uploadedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  filesGrid: {
    gap: 12,
  },
  fileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: COLORS.sub,
  },
  deleteButton: {
    padding: 8,
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
    backgroundColor: COLORS.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.sub,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
});

export default UploadTest;