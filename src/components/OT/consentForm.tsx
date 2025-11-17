// import React, { useEffect, useState, useCallback } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Image,
//   Pressable,
//   Modal,
//   TouchableOpacity,
//   Linking,
//   Alert,
// } from "react-native";
// import { useSelector } from "react-redux";

// import { launchCamera, launchImageLibrary } from "react-native-image-picker";
// import { pick, types } from "@react-native-documents/picker";
// import { X, Trash2, PlusCircle } from "lucide-react-native";
// import { RootState } from "../../store/store";
// import { useReportStore } from "../../store/zustandstore";
// import { AuthDelete, AuthFetch, AuthPost, UploadFiles } from "../../auth/auth";

// const pdfIcon = require("../../../assets/pdf.png"); // adjust
// const imgIcon = require("../../../assets/image.png"); // adjust

// const BRAND = "#14b8a6";
// const BORDER = "#e2e8f0";
// const COLORS = {
//   bg: "#f8fafc",
//   card: "#ffffff",
//   text: "#0f172a",
//   sub: "#475569",
//   brand: BRAND,
// };

// const ReportsTabMobile: React.FC = () => {
//   const user = useSelector((s: RootState) => s.currentUser);
//   const timeline = useSelector((s: RootState) => s.currentPatient);

//   const { reports, setReports } = useReportStore();

//   // ⭐ local files before saving
//   const [localFiles, setLocalFiles] = useState<any[]>([]);

//   const [deleteModal, setDeleteModal] = useState(false);
//   const [fileToDelete, setFileToDelete] = useState<any>(null);

//   /* ================================================================
//      FETCH ALL REPORTS (AFTER SAVING)
//   ==================================================================*/
//   const getAllReports = useCallback(async () => {
//     try {
//       const res = await AuthFetch(
//         `attachment/${user?.hospitalID}/all/${timeline?.patientID}/consentform`,
//         user?.token
//       );

//       if (res?.status === "success") setReports(res?.data?.attachments);
//     } catch {
//       console.log("FAILED TO LOAD REPORTS");
//     }
//   }, [user, timeline]);

//   useEffect(() => {
//     if (!timeline?.patientID || !user?.token) return;
//     getAllReports();
//   }, [timeline, user]);

//   /* ================================================================
//      PICKERS (CAMERA / GALLERY / PDF)
//   ==================================================================*/
//   const pickCamera = async () => {
//     try {
//       const res: any = await launchCamera({
//         mediaType: "photo",
//         quality: 0.7,
//       });
//       if (!res.assets?.length) return;

//       addLocalFile(res.assets[0]);
//     } catch {}
//   };

//   const pickGallery = async () => {
//     try {
//       const res: any = await launchImageLibrary({
//         mediaType: "photo",
//         selectionLimit: 1,
//       });
//       if (!res.assets?.length) return;

//       addLocalFile(res.assets[0]);
//     } catch {}
//   };

//   const pickPdf = async () => {
//     try {
//       const doc: any = await pick({ type: [types.pdf] });
//       addLocalFile({
//         uri: doc[0].uri,
//         fileName: doc[0].name,
//         type: "application/pdf",
//       });
//     } catch {}
//   };

//   /* ================================================================
//      ADD TO LOCAL LIST
//   ==================================================================*/
//   const addLocalFile = (file: any) => {
//     setLocalFiles((prev) => [...prev, file]);
//   };

//   /* ================================================================
//      DELETE LOCAL FILE (BEFORE SAVING)
//   ==================================================================*/
//   const deleteLocalFile = () => {
//     setLocalFiles((prev) => prev.filter((f) => f !== fileToDelete));
//     setDeleteModal(false);
//   };

//   /* ================================================================
//      SAVE TO SERVER
//   ==================================================================*/
//   const uploadToServer = async () => {
//     if (!localFiles.length) return;

//     for (const file of localFiles) {
//       try {
//         const fd = new FormData();
//         fd.append("consentform", {
//           uri: file.uri,
//           name: file.fileName || `file_${Date.now()}.jpg`,
//           type: file.type || "image/jpeg",
//         } as any);

//         const res = await UploadFiles(
//           `attachment/${user?.hospitalID}/${timeline?.patientID}/consentform`,
//           fd,
//           user?.token,
         
//         );

//         if (res?.status === "success") {
//           console.log("Uploaded:", file.fileName);
//         }
//       } catch (e) {
//         console.log("Upload failed:", e);
//       }
//     }

//     setLocalFiles([]);
//     getAllReports(); // reload from backend
//   };

//   /* ================================================================
//      DELETE REPORT FROM SERVER
//   ==================================================================*/
//   const deleteReport = async () => {
//     try {
//       await AuthDelete(
//         `attachment/${user.hospitalID}/${fileToDelete.id}/consentform`,
//         user.token
//       );

//       setReports(reports.filter((r) => r.id !== fileToDelete.id));
//       setDeleteModal(false);
//     } catch (e) {
//       console.log("Delete failed", e);
//     }
//   };

//   /* ================================================================
//      RENDER FILE CARD
//   ==================================================================*/
//   const renderCard = (item: any, isLocal = false) => {
//     const isPdf =
//       item.type === "application/pdf" || item.mimeType === "application/pdf";

//     return (
//       <View style={styles.card}>
//         <View style={styles.cardRow}>
//           <Image
//             source={isPdf ? pdfIcon : imgIcon}
//             style={{ width: 55, height: 55 }}
//             resizeMode="contain"
//           />

//           {/* TITLE */}
//           <Text style={styles.fileName}>
//             {item.fileName
//               ? item.fileName.slice(0, 20)
//               : "File"}
//           </Text>

//           {/* DELETE BUTTON */}
//           <Pressable
//             onPress={() => {
//               setFileToDelete(item);
//               setDeleteModal(true);
//             }}
//           >
//             <Trash2 size={20} color="#b91c1c" />
//           </Pressable>
//         </View>

//         {/* VIEW BUTTON */}
//         <Pressable
//           style={styles.viewBtn}
//           onPress={() => {
//             if (isLocal) {
//               Alert.alert("Info", "Preview available after upload");
//               return;
//             }
//             Linking.openURL(item.fileURL);
//           }}
//         >
//           <Text style={styles.viewText}>View</Text>
//         </Pressable>
//       </View>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       <ScrollView showsVerticalScrollIndicator={false}>
//         {/* ---------------- UPLOAD BUTTONS ---------------- */}
//         <View style={styles.uploadRow}>
//           <Pressable style={styles.pickBtn} onPress={pickCamera}>
//             <PlusCircle size={18} color={BRAND} />
//             <Text style={styles.pickText}>Camera</Text>
//           </Pressable>

//           <Pressable style={styles.pickBtn} onPress={pickGallery}>
//             <PlusCircle size={18} color={BRAND} />
//             <Text style={styles.pickText}>Gallery</Text>
//           </Pressable>

//           <Pressable style={styles.pickBtn} onPress={pickPdf}>
//             <PlusCircle size={18} color={BRAND} />
//             <Text style={styles.pickText}>PDF</Text>
//           </Pressable>
//         </View>

//         {/* ---------------- LOCAL UNSAVED FILES ---------------- */}
//         {localFiles.length > 0 && (
//           <>
//             <Text style={styles.sectionTitle}>Unsaved Uploads</Text>
//             {localFiles.map((item, i) => (
//               <View key={i}>{renderCard(item, true)}</View>
//             ))}

//             <Pressable style={styles.saveBtn} onPress={uploadToServer}>
//               <Text style={styles.saveText}>Save All</Text>
//             </Pressable>
//           </>
//         )}

//         {/* ---------------- SAVED FILES ---------------- */}
//         <Text style={styles.sectionTitle}>Uploaded Reports</Text>

//         {reports.map((item, i) => (
//           <View key={i}>{renderCard(item, false)}</View>
//         ))}
//       </ScrollView>

//       {/* ---------------- DELETE MODAL ---------------- */}
//       <Modal
//         visible={deleteModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setDeleteModal(false)}
//       >
//         <View style={styles.modalBackdrop}>
//           <View style={styles.modalCard}>
//             <Text style={styles.modalTitle}>Delete File?</Text>
//             <Text style={styles.modalSub}>
//               Are you sure you want to delete this file permanently?
//             </Text>

//             <View style={styles.modalRow}>
//               <Pressable
//                 onPress={() => setDeleteModal(false)}
//                 style={[styles.modalBtn, { backgroundColor: BORDER }]}
//               >
//                 <Text style={styles.modalCancel}>No</Text>
//               </Pressable>

//               <Pressable
//                 onPress={() => {
//                   if (fileToDelete?.id) deleteReport();
//                   else deleteLocalFile();
//                 }}
//                 style={[styles.modalBtn, { backgroundColor: "#dc2626" }]}
//               >
//                 <Text style={{ color: "#fff", fontWeight: "700" }}>Yes</Text>
//               </Pressable>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// };

// export default ReportsTabMobile;

// /* ================================================================
//    STYLE
// ================================================================ */
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.bg,
//     padding: 12,
//   },

//   uploadRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginVertical: 8,
//   },
//   pickBtn: {
//     padding: 10,
//     borderWidth: 1,
//     borderColor: BRAND,
//     borderRadius: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     flex: 1,
//     marginHorizontal: 4,
//   },
//   pickText: {
//     color: BRAND,
//     fontWeight: "700",
//   },

//   sectionTitle: {
//     marginTop: 14,
//     marginBottom: 6,
//     fontSize: 15,
//     fontWeight: "800",
//     color: COLORS.text,
//   },

//   card: {
//     backgroundColor: COLORS.card,
//     padding: 12,
//     borderRadius: 12,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: BORDER,
//   },
//   cardRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//   },
//   fileName: {
//     flex: 1,
//     color: COLORS.text,
//     fontSize: 13,
//     fontWeight: "700",
//   },

//   viewBtn: {
//     marginTop: 8,
//     backgroundColor: BRAND,
//     paddingVertical: 8,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   viewText: {
//     color: "#fff",
//     fontWeight: "800",
//   },

//   saveBtn: {
//     marginTop: 10,
//     backgroundColor: BRAND,
//     padding: 12,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   saveText: {
//     fontSize: 14,
//     color: "#fff",
//     fontWeight: "800",
//   },

//   modalBackdrop: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.4)",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   modalCard: {
//     width: "85%",
//     backgroundColor: "#fff",
//     padding: 16,
//     borderRadius: 12,
//   },
//   modalTitle: {
//     fontSize: 16,
//     fontWeight: "800",
//     color: COLORS.text,
//   },
//   modalSub: {
//     marginTop: 8,
//     color: COLORS.sub,
//     marginBottom: 14,
//   },
//   modalRow: {
//     flexDirection: "row",
//     justifyContent: "flex-end",
//     gap: 12,
//   },
//   modalBtn: {
//     paddingVertical: 10,
//     paddingHorizontal: 18,
//     borderRadius: 10,
//   },
//   modalCancel: {
//     color: COLORS.text,
//     fontWeight: "700",
//   },
// });
