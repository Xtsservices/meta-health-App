import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Linking,
  Alert,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { pick, types } from "@react-native-documents/picker";
import { X, Trash2, PlusCircle, FileText } from "lucide-react-native";
import { RootState } from "../../store/store";
import { useReportStore } from "../../store/zustandstore";
import { AuthDelete, AuthFetch, UploadFiles } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showError, showSuccess } from "../../store/toast.slice";
import { COLORS } from "../../utils/colour";

const BRAND = "#14b8a6";
const BORDER = "#e2e8f0";

const ReportsTabMobile: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
const dispatch = useDispatch();
  const { reports, setReports } = useReportStore();

  // ⭐ local files before saving
  const [localFiles, setLocalFiles] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any>(null);
  const [previewModal, setPreviewModal] = useState(false);
  const [fileToPreview, setFileToPreview] = useState<any>(null);

  // 🔹 NEW: control showing uploader vs just reports
  const [showUploader, setShowUploader] = useState(false);

  /* ================================================================
     FETCH ALL REPORTS (AFTER SAVING)
  ==================================================================*/
  const getAllReports = useCallback(async () => {
    try {
         const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(
        `attachment/${user?.hospitalID}/all/${currentPatient?.id}/consentform`,
        token
      );
      if (res?.status === "success" && "data" in res) setReports(res?.data?.attachments);
    } catch (error: any) {
  dispatch(
    showError(
      error?.message ||
      String(error?.status || "") ||
      "Failed to load reports"
    )
  );
}
  }, [user?.hospitalID, user?.token, currentPatient?.patientID, setReports]);

  useEffect(() => {
    if (!currentPatient?.id ) return;
    getAllReports();
  }, [currentPatient?.id,  getAllReports]);

  /* ================================================================
     PICKERS (CAMERA / GALLERY / PDF)
  ==================================================================*/
  const addLocalFile = (file: any) => {
    setLocalFiles((prev) => [...prev, file]);
  };

  const pickCamera = async () => {
    try {
      const res: any = await launchCamera({
        mediaType: "photo",
        quality: 0.7,
      });
      if (!res.assets?.length) return;
      addLocalFile(res.assets[0]);
    } catch {}
  };

  const pickGallery = async () => {
    try {
      const res: any = await launchImageLibrary({
        mediaType: "photo",
        selectionLimit: 1,
      });
      if (!res.assets?.length) return;
      addLocalFile(res.assets[0]);
    } catch {}
  };

  const pickPdf = async () => {
    try {
      const doc: any = await pick({ type: [types.pdf] });
      addLocalFile({
        uri: doc[0].uri,
        fileName: doc[0].name,
        type: "application/pdf",
      });
    } catch { }
  };
const previewLocalFile = (file: any) => {
    setFileToPreview(file);
    setPreviewModal(true);
  };

  /* ================================================================
     DELETE LOCAL FILE (BEFORE SAVING)
  ==================================================================*/
  const deleteLocalFile = () => {
    setLocalFiles((prev) => prev.filter((f) => f !== fileToDelete));
    setDeleteModal(false);
  };

  /* ================================================================
     SAVE TO SERVER
  ==================================================================*/
 const uploadToServer = async () => {
  if (!localFiles.length) return;

  try {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    // if (!token || !user?.hospitalID || !currentPatient?.patientTimeLineID || !currentPatient?.patientID || !user?.id) {
    //   Alert.alert("Error", "Missing required data to upload consent form");
    //   return;
    // }

    const form = new FormData();

    // match web: append each file under key "files"
    localFiles.forEach((file, index) => {
      form.append("files", {
        uri: file.uri,
        name: file.fileName || `file_${Date.now()}_${index}.jpg`,
        type: file.type || "image/jpeg",
      } as any);
    });

    // match web: category
    form.append("category", "consentform");

    const res: any = await UploadFiles(
      `attachment/${user?.hospitalID}/${currentPatient?.patientTimeLineID}/${currentPatient?.id}/${user?.id}/consentform`,
      form,
      token
    );
    if (res?.status === "success") {
      // same behaviour as web
      dispatch(showSuccess( "Consentform successfully uploaded"))
      setLocalFiles([]);
      await getAllReports();
      setShowUploader(false); // optional: close uploader after save
    } else {
         dispatch(showError( res?.message || "Failed to upload consent form"))
    }
  } catch (error: any) {
  const message =
    (error?.message as string) ||
    String(error?.status || "") ||
    "Failed to upload consent form";

  dispatch(showError(message));
}

};


  /* ================================================================
     DELETE REPORT FROM SERVER
  ==================================================================*/
  const deleteReport = async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      await AuthDelete(
        `attachment/${user?.hospitalID}/${fileToDelete.id}/consentform`,
        token
      );

      setReports(reports.filter((r) => r.id !== fileToDelete.id));
      setDeleteModal(false);
    } catch (e) {
      console.log("Delete failed", e);
    }
  };

  /* ================================================================
     RENDER FILE CARD
  ==================================================================*/
  const renderCard = (item: any, isLocal = false) => {
    const isPdf =
      item.type === "application/pdf" || item.mimeType === "application/pdf";
    const isImage = item.type?.includes('image') || item.mimeType?.includes('image');

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.fileInfo}>
            {isPdf ? (
              <FileText size={20} color="#dc2626" />
            ) : (
              <View style={[styles.fileIcon, { backgroundColor: '#dbeafe' }]}>
                <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: 'bold' }}>IMG</Text>
              </View>
            )}
          <Text style={styles.fileName}>
            {item.fileName ? item.fileName.slice(0, 20) : "File"}
          </Text>
          </View>

          <Pressable
            onPress={() => {
              setFileToDelete(item);
              setDeleteModal(true);
            }}
          >
            <Trash2 size={20} color="#b91c1c" />
          </Pressable>
        </View>

        <Pressable
          style={styles.viewBtn}
          onPress={() => {
            if (isLocal) {
              previewLocalFile(item);
            } else {
            if (item.fileURL) {
              Linking.openURL(item.fileURL);
            } else {
              Alert.alert("Info", "No file URL available");
              }
            }
          }}
        >
          <Text style={styles.viewText}>View</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ---------- HEADER ROW: Uploaded Reports + Add button ---------- */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Uploaded Reports</Text>

          <Pressable
            style={styles.addBtn}
            onPress={() => setShowUploader((prev) => !prev)}
          >
            <PlusCircle size={18} color="#ffffff" />
            <Text style={styles.addText}>
              {showUploader ? "Close" : "Add"}
            </Text>
          </Pressable>
        </View>

        {/* ---------- Uploader section: only when Add is clicked ---------- */}
        {showUploader && (
          <>
            {/* Upload options */}
            <View style={styles.uploadRow}>
              <Pressable style={styles.pickBtn} onPress={pickCamera}>
                <PlusCircle size={18} color={BRAND} />
                <Text style={styles.pickText}>Camera</Text>
              </Pressable>

              <Pressable style={styles.pickBtn} onPress={pickGallery}>
                <PlusCircle size={18} color={BRAND} />
                <Text style={styles.pickText}>Gallery</Text>
              </Pressable>

              <Pressable style={styles.pickBtn} onPress={pickPdf}>
                <PlusCircle size={18} color={BRAND} />
                <Text style={styles.pickText}>Document</Text>
              </Pressable>
            </View>

            {/* Local unsaved files */}
            {localFiles.length > 0 && (
              <>
                <Text style={styles.subSectionTitle}>Unsaved Uploads</Text>
                {localFiles.map((item, i) => (
                  <View key={i}>{renderCard(item, true)}</View>
                ))}

                <Pressable style={styles.saveBtn} onPress={uploadToServer}>
                  <Text style={styles.saveText}>Save All</Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {/* ---------- Saved files list (always visible) ---------- */}
        {reports.length === 0 ? (
          <Text style={styles.emptyText}>No reports uploaded yet</Text>
        ) : (
          reports.map((item, i) => <View key={i}>{renderCard(item, false)}</View>)
        )}
      </ScrollView>

      {/* ---------- PREVIEW MODAL FOR LOCAL FILES ---------- */}
      <Modal
        visible={previewModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPreviewModal(false);
          setFileToPreview(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.previewModalCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {fileToPreview?.fileName || 'Preview'}
              </Text>
              <Pressable
                onPress={() => {
                  setPreviewModal(false);
                  setFileToPreview(null);
                }}
                style={styles.closeBtn}
              >
                <X size={24} color="#374151" />
              </Pressable>
            </View>

            <View style={styles.previewContent}>
              {fileToPreview?.type === "application/pdf" ? (
                <View style={styles.pdfPreview}>
                  <FileText size={64} color="#9ca3af" />
                  <Text style={styles.pdfText}>PDF Document</Text>
                  <Text style={styles.pdfSubText}>
                    This PDF will be uploaded to the server.
                    You can view it after uploading.
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: fileToPreview?.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- DELETE MODAL ---------- */}
      <Modal
        visible={deleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete File?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to delete this file permanently?
            </Text>

            <View style={styles.modalRow}>
              <Pressable
                onPress={() => setDeleteModal(false)}
                style={[styles.modalBtn, { backgroundColor: BORDER }]}
              >
                <Text style={styles.modalCancel}>No</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (fileToDelete?.id) deleteReport();
                  else deleteLocalFile();
                }}
                style={[styles.modalBtn, { backgroundColor: "#dc2626" }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Yes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ReportsTabMobile;

/* ================================================================
   STYLE
================================================================ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 12,
  },

  /* header row */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  subSectionTitle: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: BRAND,
    gap: 4,
  },
  addText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  uploadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  pickBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#ffffff",
  },
  pickText: {
    color: BRAND,
    fontWeight: "700",
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  viewBtn: {
    marginTop: 8,
    backgroundColor: BRAND,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  viewText: {
    color: "#fff",
    fontWeight: "800",
  },

  saveBtn: {
    marginTop: 10,
    backgroundColor: BRAND,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "800",
  },

  emptyText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.sub,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalSub: {
    marginTop: 8,
    color: COLORS.sub,
    marginBottom: 14,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalCancel: {
    color: COLORS.text,
    fontWeight: "700",
  },

  previewModalCard: {
    width: "90%",
    height: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#f8fafc',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    padding: 4,
  },
  previewContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  pdfPreview: {
    alignItems: 'center',
    padding: 20,
  },
  pdfText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  pdfSubText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.sub,
    textAlign: 'center',
    lineHeight: 20,
  },
});
