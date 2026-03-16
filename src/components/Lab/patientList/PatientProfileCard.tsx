import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  ScrollView,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
// Replace the current import with this
import ReactNativeBlobUtil from 'react-native-blob-util';
import { PermissionsAndroid } from "react-native";


// Icons
import {
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  DoctorIcon,
  LocationIcon,
  WardIcon,
  DownloadIcon,
  GenderIcon,
} from "../../../utils/SvgIcons";
import { formatDate } from "../../../utils/dateTime";
import { RootState } from "../../../store/store";
import { COLORS } from "../../../utils/colour";
import { AuthFetch } from "../../../auth/auth";
import { showError } from "../../../store/toast.slice";

/* -------------------------------------------------------------------------- */
/* HELPER FUNCTIONS */
/* -------------------------------------------------------------------------- */

// Helper function to safely get and validate values
const getSafeValue = (value: any, defaultValue: string = "—"): string => {
  if (value === undefined || value === null || value === "-" || value === "") {
    return defaultValue;
  }
  return String(value);
};

// Helper function to get patient name
const getPatientName = (patient: any): string => {
  const name = getSafeValue(
    patient?.pName ?? patient?.patientName ?? patient?.name,
    "Unknown Patient"
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Helper function to get UHID
const getUHID = (patient: any): string => {
  return getSafeValue(patient?.patientID ?? patient?.pID ?? patient?.id);
};

// Helper function to get formatted gender
const getGenderText = (gender: number): string => {
  if (gender === 1) return "Male";
  if (gender === 2) return "Female";
  return "Not specified";
};

// Helper function to get doctor name
const getDoctorName = (patient: any): string => {
  const firstName = getSafeValue(patient?.doctor_firstName);
  const lastName = getSafeValue(patient?.doctor_lastName);
  
  if (firstName === "—" && lastName === "—") {
    return getSafeValue(patient?.doctorName);
  }
  
  if (firstName !== "—" && lastName !== "—") {
    return `${firstName} ${lastName}`;
  }
  
  return firstName !== "—" ? firstName : lastName;
};

// Helper function to get formatted date
const getFormattedDate = (dateString: any, label: string = "Date"): { label: string, value: string } => {
  const formatted = formatDate(dateString);
  return {
    label,
    value: formatted !== "Invalid Date" ? formatted : "—"
  };
};

const requestStoragePermission = async () => {
  if (Platform.OS !== "android") return true;
  
  try {
    const apiLevel = Platform.Version;
    
    if (apiLevel >= 33) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      ]);
      
      return (
        granted[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === 
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === 
          PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: "Storage Permission",
          message: "App needs access to storage to download reports",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error("Permission error:", err);
    return false;
  }
};
// Gradient Button Component
const GradientButton: React.FC<{
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
}> = ({ onPress, children, style }) => (
  <TouchableOpacity onPress={onPress} style={[styles.gradientButton, style]}>
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradientButtonInner}
    >
      {children}
    </LinearGradient>
  </TouchableOpacity>
);

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type Attachment = {
  id: number;
  fileName: string;
  fileURL: string;
  mimeType: string;
  addedOn: string;
  test?: string;
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
  attachments?: Attachment[];
  dischargeDate?: string;
  followUp?: string;
  follow_up?: string;
  followup?: string;
  FollowUp?: string;
  startTime?: string;
};

type PatientProfileCardProps = {
  patientDetails: PatientDetails;
  completedDetails?: PatientDetails[];
  tab?: string;
};

/* -------------------------------------------------------------------------- */
/* COMPONENT */
/* -------------------------------------------------------------------------- */

const PatientProfileCard: React.FC<PatientProfileCardProps> = ({
  patientDetails,
  completedDetails,
  tab,
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const dispatch = useDispatch();
  const [showReports, setShowReports] = useState(false);
  const [completePatient, setCompletePatient] = useState<PatientDetails | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Get all reports from completed details
  const allReports: Attachment[] = useMemo(() => {
    if (!Array.isArray(completedDetails)) return [];
    return completedDetails.flatMap(p => p?.attachments ?? []);
  }, [completedDetails]);

  /* ---------------------------------------------------------------------- */
  /* FETCH COMPLETE PATIENT DATA */
  /* ---------------------------------------------------------------------- */

  useFocusEffect(
    useCallback(() => {
      const loadPatientMeta = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          const hospitalID = user?.hospitalID;
          const pid = getUHID(patientDetails);

          if (!token || !hospitalID || pid === "—") return;

          const res = await AuthFetch(
            `patient/${hospitalID}/patients/single/${pid}`,
            token
          );
          
          if (res?.status === "success" && "data" in res) {
            const data = res?.data?.patient;
            setCompletePatient(data);
          }
        } catch (e) {
          dispatch(showError("Error fetching single patient details"));
        }
      };

      loadPatientMeta();
    }, [user?.hospitalID, patientDetails?.patientID, patientDetails?.pID])
  );

  // Get all patient data (prefer completePatient if available)
  const patientData = completePatient || patientDetails;

  if (!patientDetails) {
    return (
      <View style={styles.profileCard}>
        <Text style={styles.errorText}>No patient data available</Text>
      </View>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* PATIENT INFO CALCULATION */
  /* ---------------------------------------------------------------------- */

  const patientName = getPatientName(patientData);
  const uhid = getUHID(patientData);
  const isWalkInPatient = !patientDetails?.patientID && patientDetails?.pID;
  const isDischarged = !!patientData?.dischargeDate;

  // Determine date label and value
  let dateInfo;
  if (patientData?.dischargeDate) {
    dateInfo = getFormattedDate(patientData.dischargeDate, "Date of Discharge");
  } else if (!isWalkInPatient && patientDetails?.patientID) {
    // Regular patient with patientID
    const admissionDate = completePatient?.startTime || 
                         patientData?.addedOn || 
                         patientData?.createdAt;
    dateInfo = getFormattedDate(admissionDate, "Date of Admission");
  } else {
    // Walk-in patient OR patient without patientID
    const walkinDate = completePatient?.startTime || 
                       patientData?.addedOn || 
                       patientData?.createdAt;
    dateInfo = getFormattedDate(walkinDate, "Date");
  }

  const doctorName = getDoctorName(patientData);
  const genderText = getGenderText(patientData?.gender);
  
  const followUpText = getSafeValue(
    patientData?.followUp ?? 
    patientData?.follow_up ?? 
    patientData?.followup ?? 
    patientData?.FollowUp,
    ""
  );

  const phoneNumber = getSafeValue(patientData?.phoneNumber ?? patientData?.phone);

  const city = getSafeValue(patientData?.city, "");
  const state = getSafeValue(patientData?.state, "");
  const locationText = city !== "—" || state !== "—" ? 
    `${city !== "—" ? city : ""} ${state !== "—" ? state : ""}`.trim() : "";

  const wardName = getSafeValue(patientData?.ward_name);

  /* ---------------------------------------------------------------------- */
  /* DOWNLOAD HANDLERS */
  /* ---------------------------------------------------------------------- */

const handleDownload = async () => {
  if (isDownloading) return;
  
  try {
    const reportsToDownload = allReports.filter(r =>
      selectedReports.includes(r.id)
    );

    if (reportsToDownload.length === 0) {
      Alert.alert("Select Report", "Please select at least one report");
      return;
    }

    // Request permissions first
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Storage permission is required to download files");
      return;
    }

    setIsDownloading(true);

    // Download sequentially to avoid conflicts
    for (const report of reportsToDownload) {
      const url = report.fileURL;
      const filename = report.fileName || `report_${Date.now()}_${report.id}`;
      
      try {
        
        // Define download directory paths
        const { dirs } = ReactNativeBlobUtil.fs;
        let downloadDir;
        
        if (Platform.OS === 'ios') {
          downloadDir = dirs.DocumentDir;
        } else {
          // For Android, use Download directory
          downloadDir = dirs.DownloadDir;
        }
        
        // Clean filename and create path
        const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${downloadDir}/${cleanFilename}`;
  
        
        // Configure download options
        const configOptions = Platform.select({
          ios: {
            fileCache: true,
            path: filePath,
            notification: true,
            appendExt: getFileExtension(cleanFilename),
          },
          android: {
            fileCache: false,
            addAndroidDownloads: {
              useDownloadManager: true,
              notification: true,
              path: filePath,
              description: `Downloading ${cleanFilename}`,
              mime: report.mimeType,
              mediaScannable: true,
              title: cleanFilename,
            },
          },
        });

        // Perform the download
        const res = await ReactNativeBlobUtil.config(configOptions)
          .fetch('GET', url, {
            // Add any required headers here
          })
          .progress((received, total) => {
            console.log(`Download progress: ${received}/${total}`);
          });

        
        // For Android, scan the file so it appears in gallery/downloads
        if (Platform.OS === 'android') {
          try {
            ReactNativeBlobUtil.MediaCollection.scanFile([{ 
              path: res.path(), 
              mime: report.mimeType,
              name: cleanFilename
            }]);
          } catch (scanError) {
            console.log("Media scan error (non-critical):", scanError);
          }
        }
        
      } catch (err) {
        
        // Show specific error message
        let errorMsg = `Failed to download ${report.fileName}`;
        if (err.message && err.message.includes('permission')) {
          errorMsg = "Storage permission denied. Please grant permission in settings.";
        } else if (err.message && err.message.includes('ENOENT')) {
          errorMsg = "Cannot access download directory. Check storage permissions.";
        }
        
        Alert.alert("Download Error", errorMsg);
        
        // Continue with other downloads
        continue;
      }
    }

    Alert.alert("Success", "Report(s) download completed!");
    setShowDownloadModal(false);
    setSelectedReports([]);
  } catch (err) {
    Alert.alert("Download failed", err.message || "Unable to download report");
  } finally {
    setIsDownloading(false);
  }
};

// Helper function to get file extension
const getFileExtension = (filename) => {
  const match = filename.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  return match ? match[1] : '';
};

  const handleReportDownload = (fileURL: string) => {
    Linking.openURL(fileURL).catch(err => 
      console.error('Failed to open URL:', err)
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") return "📄";
    if (mimeType?.startsWith('image/')) return "🖼️";
    if (mimeType?.startsWith('audio/')) return "🎵";
    if (mimeType?.startsWith('video/')) return "🎬";
    return "📎";
  };

  /* ---------------------------------------------------------------------- */
  /* RENDER FUNCTIONS */
  /* ---------------------------------------------------------------------- */

  const renderDetailItem = (icon: React.ReactNode, label: string, value: string) => {
    if (value === "—" || value === "") return null;
    
    return (
      <View style={styles.detailItem}>
        <View style={styles.detailIcon}>
          {icon}
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
        </View>
      </View>
    );
  };

  /* ---------------------------------------------------------------------- */
  /* RENDER */
  /* ---------------------------------------------------------------------- */

  return (
    <View style={styles.profileCard}>
      {/* HEADER SECTION */}
      <View style={styles.headerSection}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {patientData?.imageURL ? (
              <Image 
                source={{ uri: patientData.imageURL }} 
                style={styles.avatarImage}
              />
            ) : (
              <UserIcon size={32} color={COLORS.sub} />
            )}
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.uhid}>UHID: {uhid}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {isDischarged && (
            <View style={[styles.pill, styles.dischargedPill]}>
              <Text style={styles.pillText}>Discharged</Text>
            </View>
          )}
          
          {/* DOWNLOAD BUTTON - Only show for completed tab with reports */}
          {tab === "completed" && allReports.length > 0 && (
            <TouchableOpacity
              style={[styles.downloadBtn, isDownloading && styles.downloadBtnDisabled]}
              onPress={() => setShowDownloadModal(true)}
              disabled={isDownloading}
            >
              <DownloadIcon size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* DETAILS GRID */}
      <View style={styles.detailsGrid}>
        {/* Gender */}
        {genderText !== "Not specified" && renderDetailItem(
          <GenderIcon size={16} color={COLORS.sub} />,
          "Gender",
          genderText
        )}

        {/* Date */}
        {renderDetailItem(
          <CalendarIcon size={16} color={COLORS.sub} />,
          dateInfo.label,
          dateInfo.value
        )}

        {/* Doctor */}
        {doctorName !== "—" && renderDetailItem(
          <DoctorIcon size={16} color={COLORS.sub} />,
          "Treating Doctor",
          doctorName
        )}

        {/* Follow Up */}
        {followUpText !== "" && renderDetailItem(
          <CalendarIcon size={16} color={COLORS.sub} />,
          "Follow Up",
          followUpText
        )}

        {/* Phone */}
        {phoneNumber !== "—" && renderDetailItem(
          <PhoneIcon size={16} color={COLORS.sub} />,
          "Phone",
          phoneNumber
        )}

        {/* Location */}
        {locationText !== "" && renderDetailItem(
          <LocationIcon size={16} color={COLORS.sub} />,
          "Location",
          locationText
        )}

        {/* Ward */}
        {wardName !== "—" && renderDetailItem(
          <WardIcon size={16} color={COLORS.sub} />,
          "Ward",
          wardName
        )}
      </View>

      {/* DOWNLOAD MODAL */}
      <Modal 
        visible={showDownloadModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => !isDownloading && setShowDownloadModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Reports</Text>

            <ScrollView style={styles.modalScroll}>
{allReports.map(report => {
  const checked = selectedReports.includes(report.id);
  return (
    <TouchableOpacity
      key={report.id}
      style={styles.checkboxRow}
      onPress={() => {
        if (isDownloading) return;
        setSelectedReports(prev =>
          checked
            ? prev.filter(id => id !== report.id)
            : [...prev, report.id]
        );
      }}
      disabled={isDownloading}
    >
      <View style={[styles.checkboxContainer, checked && styles.checkboxContainerChecked]}>
        {checked && <Text style={styles.checkIcon}>✓</Text>}
      </View>
      <Text style={styles.checkboxText}>
        {report.test || report.fileName}
      </Text>
    </TouchableOpacity>
  );
})}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setShowDownloadModal(false)}
                disabled={isDownloading}
              >
                <Text style={[styles.cancelText, isDownloading && styles.disabledText]}>
                  CANCEL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.downloadAction, isDownloading && styles.downloadActionDisabled]}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                <Text style={styles.downloadText}>
                  {isDownloading ? "DOWNLOADING..." : "DOWNLOAD"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* STYLES */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.sub,
    textAlign: "center",
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  titleSection: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  uhid: {
    fontSize: 14,
    color: COLORS.sub,
    marginBottom: 8,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dischargedPill: {
    backgroundColor: "#fecaca",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  downloadBtn: {
    backgroundColor: COLORS.brand,
    padding: 10,
    borderRadius: 20,
  },
  downloadBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  gradientButton: {
    borderRadius: 8,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  reportsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    width: 24,
    alignItems: "center",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.sub,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  reportsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  reportsScrollContent: {
    paddingRight: 16,
  },
  reportsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  reportCard: {
    width: 140,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportTestName: {
    fontSize: 12,
    color: COLORS.sub,
    marginBottom: 8,
    textAlign: "center",
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  reportIconText: {
    fontSize: 20,
  },
  reportFileName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
    textAlign: "center",
  },
  reportDate: {
    fontSize: 10,
    color: COLORS.sub,
    marginBottom: 8,
    textAlign: "center",
  },
  viewReportButton: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    width: "100%",
  },
  viewReportButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  noReportsText: {
    fontSize: 14,
    color: COLORS.sub,
    textAlign: "center",
    padding: 20,
  },

  /* MODAL STYLES */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: COLORS.text,
  },
  modalScroll: {
    maxHeight: 300,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
checkboxContainer: {
  width: 24,
  height: 24,
  borderRadius: 12, // Circular checkbox
  borderWidth: 2,
  borderColor: COLORS.border,
  alignItems: 'center',
  justifyContent: 'center',
},
checkboxContainerChecked: {
  backgroundColor: COLORS.brand,
  borderColor: COLORS.brand,
},
checkIcon: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
  checkboxChecked: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  checkboxText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.sub,
    fontWeight: "600",
  },
  disabledText: {
    color: '#ccc',
  },
  downloadAction: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  downloadActionDisabled: {
    backgroundColor: '#ccc',
  },
  downloadText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default PatientProfileCard;
