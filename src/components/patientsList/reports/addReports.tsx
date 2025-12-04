// src/screens/ReportUploadScreen.tsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { pick, types } from '@react-native-documents/picker';
import RNFS from "react-native-fs";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../store/store";
import { AuthPost, UploadFiles } from "../../../auth/auth";
import { showError, showSuccess } from "../../../store/toast.slice";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
// import { ArrowLeft, Upload, Trash2 } from "lucide-react-native";
import { useReportStore } from "../../../store/zustandstore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeleteIcon } from "../../../utils/SvgIcons";
import { COLORS } from "../../../utils/colour";

type FileItem = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

type Props = {
  navigation: any;
  route: any;
};

const ReportUploadScreen: React.FC<Props> = ({ navigation, route }) => {
  const { category } = route.params;
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const dispatch = useDispatch();
  const { setNewReport } = useReportStore();

  const [visible, setVisible] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

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

      setFiles((prev) => [
        ...prev,
        {
          uri: file.uri!,
          name: file.fileName || `photo_${Date.now()}.jpg`,
          type: file.type || "image/jpeg",
          size: file.fileSize,
        },
      ]);
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
          name: file.fileName || `file_${Date.now()}`,
          type: file.type || "application/octet-stream",
          size: file.fileSize,
        }));
        setFiles((prev) => [...prev, ...newFiles]);
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

    const mapped: FileItem[] = await Promise.all(
      results.map(async (file): Promise<FileItem> => {
        let uri = file.uri;

        // For Android convert content:// → file:// using RNFS if needed
        if (Platform.OS === "android" && uri.startsWith("content://")) {
          const dest = `${RNFS.DocumentDirectoryPath}/${file.name}`;
          await RNFS.copyFile(uri, dest).catch(() => null);
          uri = "file://" + dest;
        }

        return {
          uri,
          name: file.name ?? `file_${Date.now()}`,
          type: file.type || "application/octet-stream",
          size: file.size as number | undefined,  // 👈 cast to match FileItem
        };
      })
    );

    setFiles((prev) => [...prev, ...mapped]);
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

    try {
      setLoading(true);
      const form = new FormData();

      files.forEach((file) => {
        form.append("files", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      });

      form.append("category", String(category));
const token = user?.token ?? (await AsyncStorage.getItem("token"))
      const res = await UploadFiles(
        `attachment/${user?.hospitalID}/${currentPatient?.patientTimeLineID}/${currentPatient?.id}/${user?.id}`,
        form,
        token
      );
      if (res?.status === "success" && "data" in res) {
        dispatch(showSuccess("Report successfully uploaded"));

        setNewReport(
          res?.data?.attachements.map((el: any) => ({
            ...el,
            addedOn: String(new Date().toISOString()),
          }))
        );

        navigation.goBack();
      } else {
        dispatch(showError("message" in res ? res.message : "Upload failed"));
      }
    } catch (err) {
      dispatch(showError("Upload error"));
    } finally {
      setLoading(false);
    }
  };

  const debouncedSubmit = useCallback(
    debounce(handleSubmit, DEBOUNCE_DELAY),
    [files]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };
 const handleCancel = () => {
    navigation.navigate("Reports"); // Navigate to Reports screen
  };
  return (
    <Modal animationType="slide" transparent={false} visible={visible}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          
        </TouchableOpacity>
        <Text style={styles.title}>Upload Report</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* BODY */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* FILE SELECT OPTIONS */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.optionBtn} onPress={openCamera}>
         
            <Text style={styles.optionText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionBtn} onPress={openGallery}>
           
            <Text style={styles.optionText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionBtn} onPress={pickDocuments}>
            
            <Text style={styles.optionText}>Files</Text>
          </TouchableOpacity>
        </View>

        {/* SELECTED FILES */}
        {files.map((file, i) => (
          <View key={i} style={styles.fileCard}>
            <Text style={styles.fileName}>{file.name}</Text>

            <TouchableOpacity onPress={() => removeFile(i)}>
              <DeleteIcon size={16} color={COLORS.error}/>
               {/* <Text style={styles.fileName}>Delete</Text> */}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* FOOTER */}
       <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelBtn, loading && { opacity: 0.5 }]}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          disabled={loading}
          style={[styles.submitBtn, loading && { opacity: 0.5 }]}
          onPress={debouncedSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  optionBtn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#14b8a6",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  optionText: {
    color: "#fff",
    marginTop: 6,
    fontWeight: "600",
  },

  fileCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  fileName: {
    color: "#111827",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },

 footer: {
    padding: 16,
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },

  cancelText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  submitBtn: {
    flex: 1,
    backgroundColor: "#14b8a6",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default ReportUploadScreen;
