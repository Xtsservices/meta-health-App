// src/screens/ReportUploadScreen.tsx

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { pick, types } from '@react-native-documents/picker';
import RNFS from "react-native-fs";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../store/store";
import { UploadFiles } from "../../../auth/auth";
import { showError, showSuccess } from "../../../store/toast.slice";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
import { useReportStore } from "../../../store/zustandstore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeleteIcon } from "../../../utils/SvgIcons";
import { COLORS } from "../../../utils/colour";
import { ArrowLeft, Upload, Camera, Image, File } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FileItem = {
  uri: string;
  name: string;
  type: string;
  size?: number;
  id: string; // Unique identifier for each file
};

type Props = {
  navigation: any;
  route: any;
};

const { width: WINDOW_WIDTH } = Dimensions.get("window");

// Reserve extra space for footer + comfortable gap so system nav or gesture areas don't overlap content.
// Footer in your app (Footer.tsx) has height 64; reserve a bit more to be safe on different devices.
const FOOTER_RESERVE = 88;

const ReportUploadScreen: React.FC<Props> = ({ navigation, route }) => {
  const { category } = route.params;
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const dispatch = useDispatch();
  const { setNewReport } = useReportStore();

  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom ?? 0;
  // final bottom padding applied to content container so content is never hidden behind footer/system nav
  const bottomPadding = bottomInset + FOOTER_RESERVE;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Track already selected file names to prevent duplicates
  const selectedFileNames = useRef<Set<string>>(new Set());

  // Generate unique ID for file
  const generateFileId = (name: string, size?: number): string => {
    return `${name}_${size || 0}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Check if file is already selected
  const isFileAlreadySelected = (fileName: string, fileSize?: number): boolean => {
    // Check by name and size for better accuracy
    return Array.from(files).some(file => 
      file.name === fileName && file.size === fileSize
    );
  };

  // Add file with duplicate check
  const addFile = (file: Omit<FileItem, 'id'>): boolean => {
    if (isFileAlreadySelected(file.name, file.size)) {
      dispatch(showError(`File "${file.name}" is already selected`));
      return false;
    }
    
    const newFile: FileItem = {
      ...file,
      id: generateFileId(file.name, file.size)
    };
    
    setFiles(prev => [...prev, newFile]);
    return true;
  };

  // Add multiple files with duplicate check
  const addMultipleFiles = (newFiles: Omit<FileItem, 'id'>[]): void => {
    const uniqueFiles: FileItem[] = [];
    const duplicates: string[] = [];
    
    newFiles.forEach(file => {
      if (isFileAlreadySelected(file.name, file.size)) {
        duplicates.push(file.name);
      } else {
        uniqueFiles.push({
          ...file,
          id: generateFileId(file.name, file.size)
        });
      }
    });
    
    if (uniqueFiles.length > 0) {
      setFiles(prev => [...prev, ...uniqueFiles]);
    }
    
    if (duplicates.length > 0) {
      const duplicateMsg = duplicates.length === 1 
        ? `"${duplicates[0]}" is already selected`
        : `${duplicates.length} files were already selected`;
      dispatch(showError(duplicateMsg));
    }
  };

  // --------------------------
  // PICK FROM CAMERA
  // --------------------------
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
        const fileName = file.fileName || `photo_${Date.now()}.jpg`;
        
        addFile({
          uri: file.uri!,
          name: fileName,
          type: file.type || "image/jpeg",
          size: file.fileSize,
        });
    }
  } catch (err) {
    dispatch(showError("Camera error"));
  }
};


  // --------------------------
  // PICK FROM GALLERY
  // --------------------------
  const openGallery = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: "mixed",
        selectionLimit: 5,
      });

      if (!res.didCancel && res.assets?.length) {
        const newFiles = res.assets.map((file) => ({
          uri: file.uri!,
          name: file.fileName || `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: file.type || "application/octet-stream",
          size: file.fileSize,
        }));
        
        addMultipleFiles(newFiles);
      }
    } catch (err) {
      dispatch(showError("Gallery error"));
    }
  };

  // --------------------------
  // FILE PICKER (PDF, DOC, ZIP)
  // --------------------------
  const pickDocuments = async () => {
    try {
      const results = await pick({
        allowMultiSelection: true,
        type: [types.allFiles],
      });

      const mapped: Omit<FileItem, 'id'>[] = await Promise.all(
        results.map(async (file): Promise<Omit<FileItem, 'id'>> => {
          let uri = file.uri;

          // For Android convert content:// → file:// using RNFS if needed
          if (Platform.OS === "android" && uri.startsWith("content://")) {
            const dest = `${RNFS.DocumentDirectoryPath}/${file.name}`;
            await RNFS.copyFile(uri, dest).catch(() => null);
            uri = "file://" + dest;
          }

          return {
            uri,
            name: file.name ?? `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: file.type || "application/octet-stream",
            size: file.size as number | undefined,
          };
        })
      );

      addMultipleFiles(mapped);
    } catch (error) {
      if (error instanceof Error && !error.message.includes("cancelled")) {
        dispatch(showError(error.message || "Document picking error"));
      } else if (!String(error).includes("cancelled")) {
        dispatch(showError(String(error) || "Document picking error"));
      }
    }
  };

  // --------------------------
  // SUBMIT UPLOAD
  // --------------------------
  const handleSubmit = async () => {
    if (!files?.length) {
      dispatch(showError("Please select files"));
      return;
    }

    // Check for duplicate files before upload
    const uniqueFiles = new Map();
    const duplicates: string[] = [];
    
    files.forEach(file => {
      const key = `${file.name}_${file.size}`;
      if (uniqueFiles.has(key)) {
        duplicates.push(file.name);
      } else {
        uniqueFiles.set(key, file);
      }
    });
    
    if (duplicates.length > 0) {
      const msg = duplicates.length === 1 
        ? `Cannot upload duplicate file: "${duplicates[0]}"`
        : `Cannot upload ${duplicates.length} duplicate files`;
      dispatch(showError(msg));
      return;
    }

    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const form = new FormData();
for (const file of files) {
  const exists = await RNFS.exists(file.uri.replace("file://", ""));
  
  if (!exists) {
    dispatch(showError(`File not ready: ${file.name}`));
    setLoading(false);
    return;
  }

  form.append("files", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);
}

form.append("category", String(category));

const token = user?.token ?? (await AsyncStorage.getItem("token"));      

// ✅ Build URL separately
const url = `attachment/${user?.hospitalID}/${currentPatient?.patientTimeLineID}/${currentPatient?.id}/${user?.id}`;

// ✅ Log URL
console.log("Upload URL:", url);

// ✅ Log Payload (FormData)
console.log("Upload Payload:");
for (let pair of form._parts) {
  console.log(pair[0], pair[1]);
}

// ✅ Call API
const res = await UploadFiles(url, form, token);

// ✅ Log Full Response
console.log("Upload Response:", JSON.stringify(res, null, 2));

          
      if (res?.status === "success" && "data" in res) {
        dispatch(showSuccess("Report successfully uploaded"));

        setNewReport(
          res?.data?.attachments?.map((el: any) => ({
            ...el,
            addedOn: String(new Date().toISOString()),
          })) || []
        );

        navigation.goBack();
      } else {
        dispatch(showError("message" in res ? res.message : "Upload failed"));
      }
    } catch (err: any) {
      dispatch(showError(err?.message || "Upload error"));
    } finally {
      setLoading(false);
    }
  };

  const debouncedSubmit = useCallback(
    debounce(handleSubmit, DEBOUNCE_DELAY),
    [files]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const clearAllFiles = () => {
    if (files.length === 0) return;
    
    Alert.alert(
      "Clear All Files",
      `Are you sure you want to remove all ${files.length} selected files?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => setFiles([])
        }
      ]
    );
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return <Image size={20} color={COLORS.text} />;
    if (fileType.includes('pdf')) return <File size={20} color={COLORS.text} />;
    if (fileType.includes('video')) return <Video size={20} color={COLORS.text} />;
    return <File size={20} color={COLORS.text} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Body */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          // important: dynamic bottom padding so content doesn't get hidden behind footer or system nav
          { paddingBottom: bottomPadding }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* FILE SELECT OPTIONS */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.optionBtn} onPress={openCamera}>
            <Camera size={24} color="#fff" />
            <Text style={styles.optionText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionBtn} onPress={openGallery}>
            <Image size={24} color="#fff" />
            <Text style={styles.optionText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionBtn} onPress={pickDocuments}>
            <File size={24} color="#fff" />
            <Text style={styles.optionText}>Files</Text>
          </TouchableOpacity>
        </View>

        {/* SELECTED FILES */}
        {files.length === 0 ? (
          <View style={styles.emptyState}>
            <Upload size={48} color={COLORS.sub} />
            <Text style={styles.emptyStateText}>No files selected</Text>
            <Text style={styles.emptyStateSubText}>
              Use the buttons above to select files to upload
            </Text>
          </View>
        ) : (
          <View style={styles.fileList}>
            {files.map((file, i) => (
              <View key={file.id} style={styles.fileCard}>
                <View style={styles.fileInfo}>
                  <View style={styles.fileIcon}>
                    {getFileIcon(file.type)}
                  </View>
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileSize}>
                      {file.size ? `(${Math.round(file.size / 1024)} KB)` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => removeFile(file.id)}
                  style={styles.deleteButton}
                >
                  <DeleteIcon size={16} color={COLORS.error}/>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 8) }]}>
        <TouchableOpacity
          style={[styles.cancelBtn, loading && { opacity: 0.5 }]}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          disabled={loading || files.length === 0}
          style={[
            styles.submitBtn, 
            (loading || files.length === 0) && { opacity: 0.5 }
          ]}
          onPress={debouncedSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Upload size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>
                Upload ({files.length})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Add Video import if needed
import { Video } from "lucide-react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg || "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || "#e5e7eb",
  },
  backButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  clearText: {
    color: COLORS.danger || "#ef4444",
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text || "#0f172a",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    // don't hardcode bottom padding here — we add it dynamically in contentContainerStyle
  },
  fileCountContainer: {
    backgroundColor: COLORS.card2 || "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileCountText: {
    color: COLORS.text || "#111827",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  optionBtn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: COLORS.brand || "#14b8a6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    color: "#fff",
    marginTop: 8,
    fontWeight: "600",
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    color: COLORS.text || "#111827",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubText: {
    color: COLORS.sub || "#6b7280",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  fileList: {
    marginTop: 8,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card2 || "#f3f4f6",
    marginBottom: 10,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: COLORS.text || "#111827",
    fontSize: 14,
    fontWeight: "500",
  },
  fileSize: {
    color: COLORS.sub || "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  footer: {
    padding: 16,
    flexDirection: "row",
    backgroundColor: COLORS.card || "#ffffff",
    borderTopWidth: 1,
    borderTopColor: COLORS.border || "#e5e7eb",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.danger || "#ef4444",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: COLORS.brand || "#14b8a6",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default ReportUploadScreen;
