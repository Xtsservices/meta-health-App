import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Icons
import {
  DownloadIcon,
} from "../../../utils/SvgIcons";
import PatientProfileCard from "./PatientProfileCard";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import Footer from "../../dashboard/footer";
import { showError, showSuccess } from "../../../store/toast.slice";

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
import { formatDate } from "../../../utils/dateTime";

const FOOTER_H = FOOTER_HEIGHT;

type Attachment = {
  id: number;
  fileName: string;
  fileURL: string;
  mimeType: string;
  addedOn: string;
  userID?: number;
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
  attachments?: any[];
  dischargeDate?: string;
  followUp?: string;
  follow_up?: string;
  followup?: string;
  FollowUp?: string;
};

const ReportsLab: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  
  const { state } = route.params as any;
  const { timeLineID, testID, walkinID, loincCode, patientData, tab } = state;

  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [completedPatientDetails, setCompletedPatientDetails] = useState<PatientDetails[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check authentication
  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        navigation.navigate("Login" as never);
        return false;
      }
      return true;
    } catch (error) {
      dispatch(showError("Authentication check failed"));
      return false;
    }
  };

  // Fetch completed patient details
  const fetchCompletedPatientDetails = async (token: string) => {
    try {
      let completedEndpoint;
      
      // DETERMINE PATIENT TYPE
      const isWalkinPatient = (timeLineID && patientData?.pID && !patientData?.patientID);      
      if (isWalkinPatient) {
        // Walk-in completed patient details
        completedEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${patientData?.id}/getWalkinReportsCompletedPatientDetails`;
      } 
      else {
        // Regular completed patient details
        completedEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getReportsCompletedPatientDetails`;
      }

      const completedResponse = await AuthFetch(completedEndpoint, token);
      
      if (completedResponse?.data?.message === "success") {
        setCompletedPatientDetails(completedResponse?.data?.patientList ?? []);
        
        // Extract attachments from completed patient details
        const allAttachments = (completedResponse?.data?.patientList ?? [])
          .flatMap((patient: PatientDetails) => patient?.attachments ?? []);
        
        // Sort by date
        const sortedAttachments = allAttachments?.sort(
          (a: Attachment, b: Attachment) => 
            new Date(b.addedOn).valueOf() - new Date(a.addedOn).valueOf()
        ) ?? [];
        
        setAttachments(sortedAttachments);
      } else {
        setCompletedPatientDetails([]);
        setAttachments([]);
      }
    } catch (error) {
      dispatch(showError('Error fetching completed patient details'));
      setCompletedPatientDetails([]);
      setAttachments([]);
    }
  };

  // Fetch patient details and reports
  useEffect(() => {
    const fetchData = async () => {
      try {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;

        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        
        if (!user?.hospitalID || !token) return;

        // Fetch patient details
        if (patientData) {
          setPatientDetails(patientData);
        } else if (timeLineID || walkinID) {
          let apiEndpoint;
          
          // DETERMINE PATIENT TYPE
          const isWalkinPatient = walkinID && (!timeLineID || timeLineID === walkinID);          
          if (isWalkinPatient) {
            // Walk-in patient details
            apiEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${walkinID}/getWalkinPatientDetails`;
          } else {
            // Regular patient details
            apiEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getPatientDetails`;
          }

          const response = await AuthFetch(apiEndpoint, token);
          
          if (response?.data?.message === "success") {
            setPatientDetails(response?.data?.patientList?.[0] ?? null);
          }
        }

        // For completed tab, fetch completed patient details and reports
        if (tab === "completed") {
          await fetchCompletedPatientDetails(token);
        } else {
          // For normal tab, fetch attachments directly
          let attachmentsResponse;
          
          // DETERMINE PATIENT TYPE FOR ATTACHMENTS
          const isWalkinPatient = walkinID && loincCode && (!timeLineID || timeLineID === walkinID);
          
          if (isWalkinPatient) {
            // For walk-in patients - use walkinID directly
            attachmentsResponse = await AuthFetch(
              `attachment/${user?.hospitalID}/all/${walkinID}`,
              token
            );
          } else {
            // For regular patients - use patientID
            const patientIDToUse = patientData?.patientID ?? patientDetails?.patientID;
            if (patientIDToUse) {
              attachmentsResponse = await AuthFetch(
                `attachment/${user?.hospitalID}/all/${patientIDToUse}`,
                token
              );
            }
          }

          if (attachmentsResponse?.data?.message === "success") {
            // Sort by date
            const sortedAttachments = attachmentsResponse.data.attachments?.sort(
              (a: Attachment, b: Attachment) => 
                new Date(b.addedOn).valueOf() - new Date(a.addedOn).valueOf()
            ) ?? [];
            setAttachments(sortedAttachments);
          } else {
            setAttachments([]);
          }
        }
      } catch (error) {
        dispatch(showError("Failed to fetch reports data"));
        setAttachments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, timeLineID, walkinID, patientData, loincCode, tab]);

  // Handle done button
  const handleDone = async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      
      let response;
      
      if (walkinID && loincCode) {
        // Walk-in test status update
        response = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "completed" },
          token
        );
      } else {
        // Regular test status update
        response = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "completed" },
          token
        );
      }

      if (response?.data?.message === "success") {
        dispatch(showSuccess("Test marked as completed"));
        // Navigate back to patient list - patient should move to completed tab
        navigation.navigate("PatientListLab");
      } else {
        dispatch(showError("Failed to mark test as completed"));
      }
    } catch (error: any) {
      dispatch(showError(error?.message ?? "Failed to complete test"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReport = (fileURL: string) => {
    Linking.openURL(fileURL).catch(err => 
      dispatch(showError("Failed to open file"))
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") return "📄";
    if (mimeType?.startsWith('image/')) return "🖼️";
    if (mimeType?.startsWith('audio/')) return "🎵";
    if (mimeType?.startsWith('video/')) return "🎬";
    return "📎";
  };

  // Extract all reports from completed patient details for the reports section
  const getAllReports = () => {
    if (tab === "completed") {
      return completedPatientDetails?.flatMap((patient) => patient?.attachments ?? []) ?? [];
    }
    return attachments;
  };

  const allReports = getAllReports();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {patientDetails && (
          <View style={styles.section}>
            <PatientProfileCard
              patientDetails={patientDetails}
              completedDetails={completedPatientDetails}
              tab={tab}
            />
          </View>
        )}

        {/* Reports Section */}
        <View style={styles.section}>
          <View style={styles.reportsHeader}>
            <Text style={styles.sectionTitle}>
              {user?.roleName?.charAt(0)?.toUpperCase() + user?.roleName?.slice(1)} Reports
            </Text>
          </View>

          {allReports?.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reportsScrollContent}
            >
              <View style={styles.reportsGrid}>
                {allReports?.map((attachment, index) => (
                  <View key={`${attachment.id}-${index}`} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <Text style={styles.reportTestName} numberOfLines={1}>
                        {attachment.test ?? "Test Report"}
                      </Text>
                    </View>
                    
                    <View style={styles.reportIcon}>
                      <Text style={styles.reportIconText}>
                        {getFileIcon(attachment.mimeType)}
                      </Text>
                    </View>
                    
                    <Text style={styles.reportFileName} numberOfLines={2}>
                      {attachment.fileName}
                    </Text>
                    
                    <Text style={styles.reportDate}>
                      Added on: {formatDate(attachment.addedOn)}
                    </Text>
                    
                    {attachment.userID && (
                      <Text style={styles.reportAddedBy}>
                        Added By: {attachment.userID}
                      </Text>
                    )}

                    <TouchableOpacity
                      style={styles.viewReportButton}
                      onPress={() => handleViewReport(attachment.fileURL)}
                    >
                      <DownloadIcon size={16} color="#fff" />
                      <Text style={styles.viewReportButtonText}>View Report</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.noReportsContainer}>
              <Text style={styles.noReportsText}>No reports available</Text>
              <Text style={styles.noReportsSubtext}>
                {walkinID ? "Walk-in patient" : "Regular patient"} - {walkinID ?? timeLineID}
              </Text>
            </View>
          )}

          {/* Done Button */}
          {/* Only show Done button for normal tab, not for completed tab */}
          {tab !== "completed" && (
            <View style={styles.doneButtonContainer}>
              <TouchableOpacity 
                onPress={handleDone}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={[styles.doneButton, submitting && styles.doneButtonDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.doneButtonText}>Done</Text>
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
  content: {
    flex: 1,
  },
  section: {
    margin: SPACING.md,
    marginTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  reportsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: isTablet ? FONT_SIZE.xl : FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  reportsScrollContent: {
    paddingRight: SPACING.md,
  },
  reportsGrid: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  reportCard: {
    width: responsiveWidth(40),
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reportHeader: {
    marginBottom: SPACING.sm,
  },
  reportTestName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "600",
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    alignSelf: "center",
  },
  reportIconText: {
    fontSize: 24,
  },
  reportFileName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  reportDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 4,
    textAlign: "center",
  },
  reportAddedBy: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  viewReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    gap: 6,
  },
  viewReportButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#fff",
  },
  noReportsContainer: {
    alignItems: "center",
    padding: SPACING.xl,
  },
  noReportsText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  noReportsSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
  },
  doneButtonContainer: {
    marginTop: SPACING.lg,
    alignItems: "center",
  },
  doneButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    minWidth: responsiveWidth(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.6,
  },
  doneButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: "#fff",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
});

export default ReportsLab;