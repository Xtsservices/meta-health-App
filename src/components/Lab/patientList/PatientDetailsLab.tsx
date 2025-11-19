// screens/PatientDetailsLab.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Components
import TestCard from "./TestCard";
import PatientProfileCard from "./PatientProfileCard";
import { ArrowLeftIcon } from "../../../utils/SvgIcons";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import Footer from "../../dashboard/footer";

// Colors
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  gradientStart: "#14b8a6",
  gradientEnd: "#0d9488",
  gradientWarningStart: "#f59e0b",
  gradientWarningEnd: "#ea580c",
  gradientSuccessStart: "#10b981",
  gradientSuccessEnd: "#059669",
  gradientProcessingStart: "#3b82f6",
  gradientProcessingEnd: "#1d4ed8",
};

const FOOTER_H = 64;

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

const PatientDetailsLab: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  
  const { state } = route.params as any;
  const patient = state?.patientData;
  const timeLineID = state?.timeLineID;
  const prescriptionURL = state?.prescriptionURL;
  const tab = state?.tab || "normal";

  const [patientDetails, setPatientDetails] = useState<PatientDetails[]>([]);
  const [completedPatientData, setCompletedPatientData] = useState<PatientDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatientData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      
      const token = await AsyncStorage.getItem("token");
      
      if (!user?.hospitalID || !token || !timeLineID) {
        console.error("Missing hospitalID, token, or timeLineID");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch main patient details - EXACT SAME AS WEB
      let apiEndpoint = prescriptionURL
        ? `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getWalkinPatientDetails`
        : `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getPatientDetails`;

      const response = await AuthFetch(apiEndpoint, token);
      
      // Handle response structure - EXACT SAME AS WEB
      if (response?.data?.message === "success") {
        setPatientDetails(response?.data?.patientList || []);
      } else {
        console.error("Failed to fetch patient details:", response);
        setPatientDetails([]);
      }

      // Fetch completed patient data for reports tab - EXACT SAME AS WEB
      if (tab === "completed") {
        let completedEndpoint = prescriptionURL
          ? `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getWalkinReportsCompletedPatientDetails`
          : `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getReportsCompletedPatientDetails`;

        const completedResponse = await AuthFetch(completedEndpoint, token);
        
        if (completedResponse?.data?.message === "success") {
          setCompletedPatientData(completedResponse?.data?.patientList || []);
        } else {
          setCompletedPatientData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (timeLineID && user?.hospitalID) {
      fetchPatientData();
    } else {
      setLoading(false);
    }
  }, [timeLineID, user, prescriptionURL, tab]);

  useFocusEffect(
    React.useCallback(() => {
      if (timeLineID && user?.hospitalID) {
        fetchPatientData(true);
      }
    }, [timeLineID, user, prescriptionURL, tab])
  );

  const onRefresh = () => {
    fetchPatientData(true);
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading patient details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPatient = patientDetails[0] || completedPatientData[0] || patient;

  if (!currentPatient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No patient data found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
      >
        {/* Patient Profile Card */}
        <PatientProfileCard
          patientDetails={currentPatient}
          completedDetails={completedPatientData}
          tab={tab}
        />

        {/* Tests Section - EXACT SAME LOGIC AS WEB */}
        {tab === "normal" && (
          <View style={styles.testsSection}>
            <Text style={styles.sectionTitle}>Tests</Text>
            {patientDetails.length > 0 ? (
              patientDetails.map((patient, patientIndex) => {
                // Handle both testsList array and single test object - EXACT SAME AS WEB
                const tests = Array.isArray(patient.testsList) 
                  ? patient.testsList 
                  : patient.testsList ? [patient.testsList] : [patient];
                
                return tests.map((test, testIndex) => (
                  <TestCard
                    key={`${test.id || patient.id}-${patientIndex}-${testIndex}`}
                    testID={patient.id}
                    testName={test.name || test.test || patient.test || "Unknown Test"}
                    timeLineID={patient.timeLineID || patient.id}
                    status={patient.status || test.status || "pending"}
                    date={patient.addedOn || patient.latestTestTime || ""}
                    prescriptionURL={prescriptionURL}
                    test={test.name || test.test}
                    loincCode={test.loinc_num_ || test.loincCode}
                    walkinID={patient.id}
                    patientData={currentPatient}
                    onStatusChange={() => fetchPatientData(true)} // Refresh when status changes
                  />
                ));
              })
            ) : (
              <View style={styles.noTestsContainer}>
                <Text style={styles.noTestsText}>No tests available</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 20,
  },
  backButton: {
    padding: 12,
    backgroundColor: COLORS.brand,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
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
  testsSection: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  noTestsContainer: {
    alignItems: "center",
    padding: 40,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
  noTestsText: {
    fontSize: 16,
    color: COLORS.sub,
    textAlign: "center",
  },
});

export default PatientDetailsLab;