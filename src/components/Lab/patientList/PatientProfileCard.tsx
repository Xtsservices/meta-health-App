import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import LinearGradient from 'react-native-linear-gradient';
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
import { formatDate, formatDateTime } from "../../../utils/dateTime";
import { RootState } from "../../../store/store";
import { COLORS } from "../../../utils/colour";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { showError } from "../../../store/toast.slice";

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

type Attachment = {
  id: number;
  fileName: string;
  fileURL: string;
  mimeType: string;
  addedOn: string;
  test?: string;
};

type PatientProfileCardProps = {
  patientDetails: PatientDetails;
  completedDetails?: PatientDetails[];
  tab?: string;
};

const PatientProfileCard: React.FC<PatientProfileCardProps> = ({
  patientDetails,
  completedDetails,
  tab,
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [showReports, setShowReports] = useState(false);
const dispatch = useDispatch()
  if (!patientDetails) {
    return (
      <View style={styles.profileCard}>
        <Text style={styles.errorText}>No patient data available</Text>
      </View>
    );
  }
const [completePatient, setCompletePaient] = useState()

  useFocusEffect(
    useCallback(() => {
    const loadPatientMeta = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const hospitalID = user?.hospitalID;
        const pid = patientDetails?.patientID ?? patientDetails?.pID;

        if (!token || !hospitalID || !pid) return;

        const res = await AuthFetch(
          `patient/${hospitalID}/patients/single/${pid}`,
          token
        );
if (res?.status === "success" && "data" in res){
const data = res?.data?.patient
setCompletePaient(data)
}
        // Try to safely extract patient object from response
        
      } catch (e) {
        dispatch(showError("Error fetching single patient details", e))
      }
    };

    loadPatientMeta();
  }, [user?.hospitalID, patientDetails?.patientID, patientDetails?.pID]))

  // Patient Information
  const name = patientDetails?.pName ?? patientDetails?.patientName ?? "Unknown Patient";
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
  const uhid = patientDetails?.patientID ?? patientDetails?.pID ?? "—";
  const isWalkIn = !patientDetails?.patientID;
  const isDischarged = !!patientDetails?.dischargeDate;

  // Patient Details
  const genderText = patientDetails?.gender === 1 ? "Male" : 
                    patientDetails?.gender === 2 ? "Female" : "Not specified";

  const dateLabel = patientDetails?.dischargeDate ? "Date of Discharge" :
                   patientDetails?.patientID ? "Date of Admission" : "Date";
  const dateValue = formatDate(completePatient?.startTime)

  const doctorName = completePatient?.doctorName 

  const followUpText = patientDetails?.followUp ?? 
                      patientDetails?.follow_up ?? 
                      patientDetails?.followup ?? 
                      patientDetails?.FollowUp ?? "";

  // Extract all reports
  const allReports: Attachment[] = Array.isArray(completedDetails) ?
    completedDetails.flatMap((patient) => patient?.attachments ?? []) : [];

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

  return (
    <View style={styles.profileCard}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {patientDetails?.imageURL ? (
              <Image 
                source={{ uri: patientDetails.imageURL }} 
                style={styles.avatarImage}
              />
            ) : (
              <UserIcon size={32} color={COLORS.sub} />
            )}
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.patientName}>{formattedName}</Text>
            <Text style={styles.uhid}>UHID: {uhid}</Text>
            
          </View>
        </View>

        <View style={styles.headerActions}>
          {isDischarged && (
            <View style={[styles.pill, styles.dischargedPill]}>
              <Text style={styles.pillText}>Discharged</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Details Grid */}
      <View style={styles.detailsGrid}>
    
        <View style={styles.detailItem}>
          <View style={styles.detailIcon}>
            <CalendarIcon size={16} color={COLORS.sub} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>{dateLabel}</Text>
            <Text style={styles.detailValue}>{dateValue}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIcon}>
            <DoctorIcon size={16} color={COLORS.sub} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Treating Doctor</Text>
            <Text style={styles.detailValue}>{doctorName}</Text>
          </View>
        </View>

        {followUpText && (
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <CalendarIcon size={16} color={COLORS.sub} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Follow Up</Text>
              <Text style={styles.detailValue}>{followUpText}</Text>
            </View>
          </View>
        )}

        {patientDetails?.phoneNumber && (
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <PhoneIcon size={16} color={COLORS.sub} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{patientDetails.phoneNumber}</Text>
            </View>
          </View>
        )}

        {(patientDetails?.city || patientDetails?.state) && (
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <LocationIcon size={16} color={COLORS.sub} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {`${patientDetails?.city ?? ""} ${patientDetails?.state ?? ""}`.trim()}
              </Text>
            </View>
          </View>
        )}

        {patientDetails?.ward_name && (
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <WardIcon size={16} color={COLORS.sub} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Ward</Text>
              <Text style={styles.detailValue}>{patientDetails.ward_name}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Reports Section */}
      {showReports && tab === "completed" && (
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>
            {user?.roleName?.charAt(0)?.toUpperCase() + user?.roleName?.slice(1)} Test Reports
          </Text>
          
          {allReports.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reportsScrollContent}
            >
              <View style={styles.reportsGrid}>
                {allReports.map((attachment, index) => (
                  <View key={`${attachment.id}-${index}`} style={styles.reportCard}>
                    <Text style={styles.reportTestName} numberOfLines={1}>
                      {attachment.test ?? "Test Report"}
                    </Text>
                    <View style={styles.reportIcon}>
                      <Text style={styles.reportIconText}>
                        {getFileIcon(attachment.mimeType)}
                      </Text>
                    </View>
                    <Text style={styles.reportFileName} numberOfLines={1}>
                      {attachment.fileName}
                    </Text>
                    <Text style={styles.reportDate}>
                      {formatDate(attachment.addedOn)}
                    </Text>
                    <TouchableOpacity
                      style={styles.viewReportButton}
                      onPress={() => handleReportDownload(attachment.fileURL)}
                    >
                      <Text style={styles.viewReportButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.noReportsText}>No reports available</Text>
          )}
        </View>
      )}
    </View>
  );
};

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
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  walkInPill: {
    backgroundColor: "#fef3c7",
  },
  dischargedPill: {
    backgroundColor: "#fecaca",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
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
});

export default PatientProfileCard;