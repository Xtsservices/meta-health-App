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
  Alert,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Components
import TestCard from "./TestCard";
import PatientProfileCard from "./PatientProfileCard";
import { ArrowLeftIcon } from "../../../utils/SvgIcons";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import Footer from "../../dashboard/footer";

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
import { showError } from "../../../store/toast.slice";
import { all } from "axios";

const FOOTER_H = FOOTER_HEIGHT;

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
  const dispatch = useDispatch();
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

  const fetchPatientData = async (isRefresh = false) => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      
      const token = await AsyncStorage.getItem("token");
      
      if (!user?.hospitalID || !token || !timeLineID) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch main patient details
      let activeApiEndpoint = prescriptionURL
        ? `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getWalkinPatientDetails`
        : `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getPatientDetails`;

      let completedEndpoint = prescriptionURL
        ? `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getWalkinReportsCompletedPatientDetails`
        : `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getReportsCompletedPatientDetails`;

      // Fetch both endpoints in parallel
      const [activeResponse, completedResponse] = await Promise.all([
        AuthFetch(activeApiEndpoint, token) as any,
        AuthFetch(completedEndpoint, token) as any
      ]);

      // Handle response structure
      if (activeResponse?.data?.message === "success") {
        setPatientDetails(activeResponse?.data?.patientList ?? []);
      } else {
        setPatientDetails([]);
      }

      // Handle completed response
        if (completedResponse?.data?.message === "success") {
          setCompletedPatientData(completedResponse?.data?.patientList ?? []);
        } else {
          setCompletedPatientData([]);
        }
  
    } catch (error) {
      dispatch(showError("Failed to fetch patient data"));
      setPatientDetails([]);
      setCompletedPatientData([]);
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
  }, [timeLineID, user, prescriptionURL]);

  useFocusEffect(
    React.useCallback(() => {
      if (timeLineID && user?.hospitalID) {
        fetchPatientData(true);
      }
    }, [timeLineID, user, prescriptionURL])
  );

  const onRefresh = () => {
    fetchPatientData(true);
  };

  // Combine all tests from both active and completed
  const getAllTests = () => {
    const allTests = [];
    
    // Add tests from active patient details
    if (patientDetails?.length > 0) {
      patientDetails?.forEach((patient, patientIndex) => {
        const tests = Array.isArray(patient?.testsList) 
          ? patient?.testsList 
          : patient?.testsList ? [patient?.testsList] : [patient];
        
        tests?.forEach((test, testIndex) => {
          allTests.push({
            ...test,
            source: 'active',
            patientData: patient,
            status: patient?.status ?? test?.status ?? "pending",
            date: patient?.addedOn ?? patient?.latestTestTime ?? "",
            isActive: true
          });
        });
      });
    }
    
    // Add tests from completed patient data
    if (completedPatientData?.length > 0) {
      completedPatientData?.forEach((patient, patientIndex) => {
        const tests = Array.isArray(patient?.testsList) 
          ? patient?.testsList 
          : patient?.testsList ? [patient?.testsList] : [patient];
        
        tests?.forEach((test, testIndex) => {
          allTests.push({
            ...test,
            source: 'completed',
            patientData: patient,
            status: "completed",
            date: patient?.completedTime ?? patient?._completedTime ?? patient?.addedOn ?? "",
            isActive: false
          });
        });
      });
    }
    
    return allTests;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading patient details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPatient = patientDetails?.[0] ?? completedPatientData?.[0] ?? patient;
  const allTests = getAllTests();
  console.log("all",allTests)

  if (!currentPatient) {
    return (
      <SafeAreaView style={styles.container}>
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
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + SPACING.lg + FOOTER_H,
          flexGrow: 1 
        }}
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

        {/* Tests Section - Show ALL tests */}
          <View style={styles.testsSection}>
            <Text style={styles.sectionTitle}>Tests</Text>
            
            {allTests?.length > 0 ? (
              allTests?.map((testItem, index) => (
                  <TestCard
                    key={`${testItem?.id ?? testItem?.test}-${testItem?.source}-${index}`}
                    testID={testItem?.patientData?.id}
                    testName={testItem?.name ?? testItem?.test ?? testItem?.patientData?.test ?? "Unknown Test"}
                    timeLineID={testItem?.patientData?.timeLineID ?? testItem?.patientData?.id}
                    status={testItem?.status}
                    date={testItem?.date}
                    prescriptionURL={prescriptionURL}
                    test={testItem?.name ?? testItem?.test}
                    loincCode={testItem?.loinc_num_ ?? testItem?.loincCode}
                    walkinID={testItem?.patientData?.id}
                    patientData={currentPatient}
                    onStatusChange={() => fetchPatientData(true)}
                  />
                ))
            ) : (
              <View style={styles.noTestsContainer}>
                <Text style={styles.noTestsText}>No tests available</Text>
              </View>
            )}
        </View>
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
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  backButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    minWidth: responsiveWidth(30),
  },
  backButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.buttonText,
    fontWeight: "600",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  content: {
    flex: 1,
  },
  testsSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: isTablet ? FONT_SIZE.xl : FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  noTestsContainer: {
    alignItems: "center",
    padding: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  noTestsText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    textAlign: "center",
  },
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
});

export default PatientDetailsLab;