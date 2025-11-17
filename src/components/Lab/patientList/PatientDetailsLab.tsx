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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Components
import TestCard from "./TestCard";
import PatientProfileCard from "./PatientProfileCard";
import { ArrowLeftIcon } from "../../../utils/SvgIcons";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";

// Colors
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
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

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        
        if (!user?.hospitalID || !token) {
          console.error("Missing hospitalID or token");
          return;
        }

        // Fetch main patient details
        let apiEndpoint = prescriptionURL
          ? `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getWalkinPatientDetails`
          : `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getPatientDetails`;

        const response = await AuthFetch(apiEndpoint, token);
        
        // Handle response structure
        if (response?.status === "success" && response?.data?.message === "success") {
          setPatientDetails(response.data.patientList || []);
        } else if (response?.message === "success") {
          setPatientDetails(response.patientList || []);
        } else {
          console.error("Failed to fetch patient details:", response);
          setPatientDetails([]);
        }

        // Fetch completed patient data for reports tab
        if (tab === "completed") {
          let completedEndpoint = prescriptionURL
            ? `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getWalkinReportsCompletedPatientDetails`
            : `test/${user.roleName}/${user.hospitalID}/${user.id}/${timeLineID}/getReportsCompletedPatientDetails`;

          const completedResponse = await AuthFetch(completedEndpoint, token);
          
          if (completedResponse?.status === "success" && completedResponse?.data?.message === "success") {
            setCompletedPatientData(completedResponse.data.patientList || []);
          } else if (completedResponse?.message === "success") {
            setCompletedPatientData(completedResponse.patientList || []);
          } else {
            setCompletedPatientData([]);
          }
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (timeLineID && user?.hospitalID) {
      fetchPatientData();
    } else {
      setLoading(false);
    }
  }, [timeLineID, user, prescriptionURL, tab]);

  if (loading) {
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

// In PatientDetailsLab.tsx - update the TestCard rendering
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
      <Text style={styles.headerTitle}>Patient Details</Text>
      <View style={styles.headerRight} />
    </View>

    <ScrollView 
      style={styles.content}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Patient Profile Card */}
      <PatientProfileCard
        patientDetails={currentPatient}
        completedDetails={completedPatientData}
        tab={tab}
      />

      {/* Tests Section */}
      {tab === "normal" && (
        <View style={styles.testsSection}>
          <Text style={styles.sectionTitle}>Tests</Text>
          {patientDetails.length > 0 ? (
            patientDetails.map((patient, patientIndex) => {
              // Handle both testsList array and single test object
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
                  patientData={currentPatient} // Add this line to pass patient data
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
  backButtonText: {
    fontSize: 16,
    color: COLORS.brand,
    fontWeight: "600",
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
  noTestsText: {
    fontSize: 16,
    color: COLORS.sub,
    textAlign: "center",
  },
});

export default PatientDetailsLab;