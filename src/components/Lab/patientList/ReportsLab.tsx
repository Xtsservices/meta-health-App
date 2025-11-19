// screens/ReportsLab.tsx
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
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Icons
import {
  DeleteIcon,
  DownloadIcon,
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
};

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
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  
  const { state } = route.params as any;
  const { timeLineID, testID, walkinID, loincCode, patientData } = state;

  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch patient details and reports
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        
        if (!user?.hospitalID || !token) return;

        // Fetch patient details
        if (patientData) {
          setPatientDetails(patientData);
        } else if (timeLineID || walkinID) {
          let apiEndpoint;
          
          // DETERMINE PATIENT TYPE - EXACT SAME LOGIC AS UPLOADTEST
          const isWalkinPatient = walkinID && loincCode && (!timeLineID || timeLineID === walkinID);
          
          if (isWalkinPatient) {
            // Walk-in patient details
            apiEndpoint = `test/${user.roleName}/${user.hospitalID}/${user.id}/${walkinID}/getWalkinPatientDetails`;
          } else {
            // Regular patient details
            apiEndpoint = `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getPatientDetails`;
          }

          const response = await AuthFetch(apiEndpoint, token);
          console.log("Patient details response:", response);
          
          if (response?.data?.message === "success") {
            setPatientDetails(response?.data?.patientList?.[0] || null);
          }
        }

        // Fetch attachments - EXACT SAME LOGIC AS WEB
        let attachmentsResponse;
        
        // DETERMINE PATIENT TYPE FOR ATTACHMENTS - EXACT SAME AS UPLOADTEST
        const isWalkinPatient = walkinID && loincCode && (!timeLineID || timeLineID === walkinID);
        
        if (isWalkinPatient) {
          console.log('Fetching attachments for WALK-IN patient:', walkinID);
          // For walk-in patients - use walkinID directly
          attachmentsResponse = await AuthFetch(
            `attachment/${user.hospitalID}/all/${walkinID}`,
            token
          );
        } else {
          console.log('Fetching attachments for REGULAR patient:', patientData?.patientID);
          // For regular patients - use patientID
          const patientIDToUse = patientData?.patientID || patientDetails?.patientID;
          if (patientIDToUse) {
            attachmentsResponse = await AuthFetch(
              `attachment/${user.hospitalID}/all/${patientIDToUse}`,
              token
            );
          }
        }
        
        console.log("Attachments response:", attachmentsResponse);

        if (attachmentsResponse?.data?.message === "success") {
          // Sort by date - EXACT SAME AS WEB
          const sortedAttachments = attachmentsResponse.data.attachments.sort(
            (a: Attachment, b: Attachment) => 
              new Date(b.addedOn).valueOf() - new Date(a.addedOn).valueOf()
          );
          setAttachments(sortedAttachments);
        } else {
          console.log("No attachments found or error:", attachmentsResponse?.data);
          setAttachments([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setAttachments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, timeLineID, walkinID, patientData, loincCode]);

  // EXACT SAME LOGIC AS WEB - Handle done button
  const handleDone = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      
      let response;
      
      // EXACT SAME API CALLS AS WEB
      if (walkinID && loincCode) {
        console.log('Marking WALK-IN test as completed:', { walkinID, loincCode });
        response = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "completed" },
          token
        );
      } else {
        console.log('Marking REGULAR test as completed:', { testID });
        response = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "completed" },
          token
        );
      }

      console.log("Done response:", response);

      // EXACT SAME SUCCESS HANDLING AS WEB
      if (response?.data?.message === "success") {
        Alert.alert("Success", "Test marked as completed", [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to patient list - patient should move to completed tab
              navigation.navigate("PatientListLab");
            }
          }
        ]);
      } else {
        Alert.alert("Error", "Failed to mark test as completed");
      }
    } catch (error: any) {
      console.error('Error completing test:', error);
      Alert.alert("Error", error?.message || "Failed to complete test");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReport = (fileURL: string) => {
    Linking.openURL(fileURL).catch(err => 
      Alert.alert("Error", "Failed to open file")
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.startsWith('image/')) return "🖼️";
    if (mimeType.startsWith('audio/')) return "🎵";
    if (mimeType.startsWith('video/')) return "🎬";
    return "📎";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

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
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Patient Profile Card */}
        {patientDetails && (
          <View style={styles.section}>
            <PatientProfileCard
              patientDetails={patientDetails}
              tab="completed"
            />
          </View>
        )}

        {/* Reports Section - EXACT SAME STRUCTURE AS WEB */}
        <View style={styles.section}>
          <View style={styles.reportsHeader}>
            <Text style={styles.sectionTitle}>
              {user?.roleName?.charAt(0)?.toUpperCase() + user?.roleName?.slice(1)} Reports
            </Text>
          </View>

          {attachments.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.reportsGrid}>
                {attachments.map((attachment, index) => (
                  <View key={`${attachment.id}-${index}`} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <Text style={styles.reportTestName} numberOfLines={1}>
                        {attachment.test || "Test Report"}
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
                {walkinID ? "Walk-in patient" : "Regular patient"} - {walkinID || timeLineID}
              </Text>
            </View>
          )}

          {/* Done Button - EXACT SAME AS WEB */}
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
    margin: 16,
    marginTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.sub,
  },
  reportsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  reportsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
  },
  reportCard: {
    width: 160,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reportHeader: {
    marginBottom: 8,
  },
  reportTestName: {
    fontSize: 12,
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
    marginBottom: 12,
    alignSelf: "center",
  },
  reportIconText: {
    fontSize: 24,
  },
  reportFileName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  reportDate: {
    fontSize: 10,
    color: COLORS.sub,
    marginBottom: 4,
    textAlign: "center",
  },
  reportAddedBy: {
    fontSize: 10,
    color: COLORS.sub,
    marginBottom: 12,
    textAlign: "center",
  },
  viewReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  viewReportButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  noReportsContainer: {
    alignItems: "center",
    padding: 40,
  },
  noReportsText: {
    fontSize: 16,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: 8,
  },
  noReportsSubtext: {
    fontSize: 12,
    color: COLORS.sub,
    textAlign: "center",
  },
  doneButtonContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  doneButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.6,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 64,
    justifyContent: "center",
  },
});

export default ReportsLab;