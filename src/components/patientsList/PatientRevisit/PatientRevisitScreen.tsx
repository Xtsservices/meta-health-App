import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Icons
import { 
  BuildingIcon, 
  UserIcon, 
  StethoscopeIcon, 
  ArrowLeftIcon 
} from "../../../utils/SvgIcons";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import { Role_NAME } from "../../../utils/role";
import Footer from "../../dashboard/footer";
import { COLORS } from "../../../utils/colour";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Types
type RouteParams = {
  patientId: number;
  patientData: any;
};

type WardType = {
  id: number;
  name: string;
  description?: string;
  capacity?: number;
  availableBeds?: number; 
  totalBeds?: number; 
};

type StaffType = {
  id: number;
  firstName: string;
  lastName: string;
  departmentID: number;
};

// Patient Status Constants
const patientStatus = {
  inpatient: 2,
  outpatient: 1,
  emergency: 3,
};

const PatientRevisitScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();

  const user = useSelector((s: RootState) => s.currentUser);
  const { patientId, patientData } = route.params;



  const [wardList, setWardList] = useState<WardType[]>([]);
  const [doctorList, setDoctorList] = useState<StaffType[]>([]);
  const [wardID, setWardID] = useState<number>(0);
  const [departmentID, setDepartmentID] = useState<number>(0);
  const [userID, setUserID] = useState<number>(0);
  const [patientType, setPatientType] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch wards and doctors
  const getAllList = async () => {
    if (!user?.hospitalID) {
      Alert.alert("Error", "Hospital ID not found");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Error", "Authentication token not found");
      return;
    }

    try {
      setLoading(true);
      
      // Fetch doctors
      const doctorResponse = await AuthFetch(
        `user/${user.hospitalID}/list/${Role_NAME.doctor}.doctor`,
        token
      );
      
      // Fetch wards
      const wardResponse = await AuthFetch(`ward/${user.hospitalID}`, token);
      
      // Handle ward response - ensure we always set an array
      let wards: WardType[] = [];
      if (wardResponse?.status === "success" && "data" in wardResponse && 
          wardResponse?.data?.wards && Array.isArray(wardResponse?.data?.wards)) {
        wards = wardResponse?.data?.wards;
      }
      setWardList(wards);

      // Handle doctor response - ensure we always set an array
      let doctors: StaffType[] = [];
      // ✅ Add type guard check
      if (doctorResponse?.status === "success" && "data" in doctorResponse && 
          doctorResponse?.data?.users && Array.isArray(doctorResponse?.data?.users)) {
        doctors = doctorResponse?.data?.users;
      }
      setDoctorList(doctors);

      setDataLoaded(true);

    } catch (error) {
      Alert.alert("Error", "Failed to load data. Please try again.");
      // Set empty arrays to prevent mapping errors
      setWardList([]);
      setDoctorList([]);
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllList();
  }, [user?.hospitalID]);

  const handleSubmit = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!patientType) {
      Alert.alert("Error", "Please select patient type");
      return;
    }

    if (!userID) {
      Alert.alert("Error", "Please select a doctor");
      return;
    }

    if (patientType === patientStatus.inpatient && !wardID) {
      Alert.alert("Error", "Please select a ward for inpatient");
      return;
    }

    if (!user?.hospitalID) {
      Alert.alert("Error", "Hospital ID not found");
      return;
    }

    setSubmitting(true);
    try {
      const response = await AuthPost(
        `patient/${user.hospitalID}/patients/revisit/${patientId}`,
        {
          ptype: patientType,
          userID: userID,
          departmentID: departmentID,
          wardID: patientType === patientStatus.inpatient ? wardID : undefined,
        },
        token
      );

      if (("data" in response && response?.data?.message === "success") || 
          response?.status === "success") {
        Alert.alert("Success", "Patient successfully added for revisit");
        
        setTimeout(() => {
        if (user?.role === 2002 || user?.role === 2003) {
          navigation.navigate("nursePatientList" as never);
        } else {
          navigation.navigate("PatientList" as never);
        }
        }, 2000);
      } else {
        let errorMessage = "Failed to add patient revisit";
        
        if ("message" in response && response.message) {
          errorMessage = response.message;
        } else if ("data" in response && response.data?.message) {
          errorMessage = response.data.message;
        }
        
        Alert.alert("Error", errorMessage);
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while processing revisit");
    } finally {
      setSubmitting(false);
    }
  };

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const RadioButton = ({ 
    label, 
    value, 
    selected, 
    onSelect,
    icon: Icon 
  }: {
    label: string;
    value: number;
    selected: boolean;
    onSelect: (value: number) => void;
    icon: React.ComponentType<any>;
  }) => (
    <TouchableOpacity
      style={[
        styles.radioButton,
        {
          backgroundColor: COLORS.card,
          borderColor: selected ? COLORS.radioSelected : COLORS.radioUnselected,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={() => onSelect(value)}
    >
      <View style={styles.radioContent}>
        <Icon 
          size={screenWidth * 0.05} 
          color={selected ? COLORS.radioSelected : COLORS.sub} 
        />
        <Text style={[
          styles.radioLabel,
          { color: selected ? COLORS.radioSelected : COLORS.text }
        ]}>
          {label}
        </Text>
      </View>
      <View style={[
        styles.radioCircle,
        {
          borderColor: selected ? COLORS.radioSelected : COLORS.radioUnselected,
          backgroundColor: selected ? COLORS.radioSelected : "transparent",
        },
      ]}>
        {selected && <View style={styles.radioInnerCircle} />}
      </View>
    </TouchableOpacity>
  );

  const dynamicStyles = {
    container: {
      paddingBottom: insets.bottom > 0 ? 70 + insets.bottom : 70,
    },
    scrollContent: {
      paddingBottom: screenHeight * 0.16,
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.button} />
          <Text style={[styles.loadingText, { color: COLORS.text }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Patient Info */}
          {patientData && (
            <View style={[styles.patientInfo, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
              <Text style={[styles.patientName, { color: COLORS.text }]}>
                {patientData?.pName || 'Unknown Patient'}
              </Text>
              <Text style={[styles.patientId, { color: COLORS.sub }]}>
                ID: {patientData?.pID || 'N/A'}
              </Text>
            </View>
          )}

          {/* Patient Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
              Type of Transfer
            </Text>
            <Text style={[styles.sectionSubtitle, { color: COLORS.sub }]}>
              On clicking submit, the patient will be removed from discharged patient list and will be added to active patient list
            </Text>
            
            <View style={styles.radioGroup}>
              <RadioButton
                label="Inpatient"
                value={patientStatus.inpatient}
                selected={patientType === patientStatus.inpatient}
                onSelect={setPatientType}
                icon={BuildingIcon}
              />
              
              <RadioButton
                label="Outpatient"
                value={patientStatus.outpatient}
                selected={patientType === patientStatus.outpatient}
                onSelect={setPatientType}
                icon={UserIcon}
              />
              
              <RadioButton
                label="Emergency"
                value={patientStatus.emergency}
                selected={patientType === patientStatus.emergency}
                onSelect={setPatientType}
                icon={StethoscopeIcon}
              />
            </View>
          </View>

          {/* Doctor Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: COLORS.text }]}>
              Doctor *
            </Text>
            <View style={[styles.pickerContainer, { borderColor: COLORS.border, backgroundColor: isDark ? '#000000ff' : COLORS.inputBg}]}>
              <Picker
                selectedValue={userID}
                onValueChange={(value) => {
                  setUserID(value);
                  const selectedDoctor = doctorList?.find(doc => doc?.id === value);
                  if (selectedDoctor) {
                    setDepartmentID(selectedDoctor?.departmentID || 0);
                  }
                }}
                style={[styles.picker, { 
                  color: isDark ? '#000000ff' : COLORS.text,
                  backgroundColor: isDark ? '#ffffffff' : COLORS.inputBg // Match container bg
                }]}
                dropdownIconColor={isDark ? '#FFFFFF' : COLORS.text}
              >
                <Picker.Item 
                  label="Select Doctor" 
                  value={0} 
                  color={isDark ? '#FFFFFF' : COLORS.placeholder}
                />
                {doctorList && doctorList.length > 0 ? (
                  doctorList?.map((doc) => (
                    <Picker.Item 
                      key={doc?.id}
                      label={`${doc?.firstName || ''} ${doc?.lastName || ''}`.trim() || 'Unknown Doctor'}
                      value={doc?.id}
                      color={isDark ? '#FFFFFF' : COLORS.text}
                    />
                  ))
                ) : (
                  <Picker.Item 
                    label="No doctors available" 
                    value={0} 
                    color={isDark ? '#FFFFFF' : COLORS.placeholder}
                  />
                )}
              </Picker>
            </View>
          </View>

          {/* Ward Selection (only for inpatient) */}
          {patientType === patientStatus.inpatient && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: COLORS.text }]}>
                Ward *
              </Text>
              <View style={[styles.pickerContainer, { 
                borderColor: COLORS.border, 
                backgroundColor: isDark ? '#1F2937' : COLORS.inputBg
              }]}>
                <Picker
                  selectedValue={wardID}
                  onValueChange={(value) => {
                    // Check if selected ward is full
                    const selectedWard = wardList.find(w => w.id === value);
                    if (selectedWard && selectedWard.availableBeds === 0) {
                      Alert.alert("Ward Full", "Selected ward has no available beds. Please choose another ward.");
                      return;
                    }
                    setWardID(value);
                  }}
                  style={[styles.picker, { 
                    color: isDark ? '#000000ff' : COLORS.text,
                    backgroundColor: isDark ? '#ffffffff' : COLORS.inputBg
                  }]}
                  dropdownIconColor={isDark ? '#FFFFFF' : COLORS.text}
                >
                  <Picker.Item 
                    label="Select Ward" 
                    value={0} 
                    color={isDark ? '#FFFFFF' : COLORS.placeholder}
                  />
                  {wardList && wardList.length > 0 ? (
                    wardList.map((ward) => {
                    // Check if ward has available beds
                    const isFull = ward.availableBeds === 0;
                    const label = `${capitalizeFirstLetter(ward.name)}${isFull ? " (Full)" : ""}`;
                    
                    return (
                      <Picker.Item 
                        key={ward.id}
                        label={label}
                        value={ward.id}
                        color={isFull 
                          ? (isDark ? '#666666' : '#999999') // Grey out when full
                          : (isDark ? '#FFFFFF' : COLORS.text)
                        }
                        enabled={!isFull} // Disable selection when full
                      />
                    );
                  })
                  ) : (
                    <Picker.Item 
                      label="No wards available" 
                      value={0} 
                      color={isDark ? '#FFFFFF' : COLORS.placeholder}
                    />
                  )}
                </Picker>
              </View>
            </View>
          )}

          {/* Submit Buttons - Moved inside ScrollView above footer */}
          <View style={[styles.actions, { backgroundColor: 'transparent', borderTopColor: 'transparent' }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: COLORS.cancelButton }]}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button, 
                styles.submitButton, 
                { 
                  backgroundColor: COLORS.button,
                  opacity: (!patientType || !userID || (patientType === patientStatus.inpatient && !wardID)) ? 0.5 : 1
                }
              ]}
              onPress={handleSubmit}
              disabled={submitting || !patientType || !userID || (patientType === patientStatus.inpatient && !wardID)}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor={COLORS.brand} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.015,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: screenWidth * 0.01,
  },
  headerTitle: {
    fontSize: screenWidth * 0.045,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: screenWidth * 0.08,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: screenWidth * 0.05,
  },
  patientInfo: {
    padding: screenWidth * 0.04,
    borderRadius: screenWidth * 0.03,
    borderWidth: 1,
    marginBottom: screenHeight * 0.03,
    alignItems: "center",
  },
  patientName: {
    fontSize: screenWidth * 0.045,
    fontWeight: "700",
    marginBottom: screenHeight * 0.005,
  },
  patientId: {
    fontSize: screenWidth * 0.035,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: screenHeight * 0.015,
    fontSize: screenWidth * 0.04,
  },
  section: {
    marginBottom: screenHeight * 0.03,
  },
  sectionTitle: {
    fontSize: screenWidth * 0.045,
    fontWeight: "700",
    marginBottom: screenHeight * 0.01,
  },
  sectionSubtitle: {
    fontSize: screenWidth * 0.035,
    marginBottom: screenHeight * 0.02,
    lineHeight: screenHeight * 0.025,
  },
  radioGroup: {
    gap: screenHeight * 0.015,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: screenWidth * 0.04,
    borderRadius: screenWidth * 0.03,
    borderWidth: 1,
  },
  radioContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: screenWidth * 0.03,
    flex: 1,
  },
  radioLabel: {
    fontSize: screenWidth * 0.04,
    fontWeight: "600",
  },
  radioCircle: {
    width: screenWidth * 0.05,
    height: screenWidth * 0.05,
    borderRadius: screenWidth * 0.025,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInnerCircle: {
    width: screenWidth * 0.02,
    height: screenWidth * 0.02,
    borderRadius: screenWidth * 0.01,
    backgroundColor: "white",
  },
  label: {
    fontSize: screenWidth * 0.04,
    fontWeight: "600",
    marginBottom: screenHeight * 0.01,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: screenWidth * 0.02,
    overflow: "hidden",
  },
  picker: {
    height: screenHeight * 0.08,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: screenWidth * 0.05,
    borderTopWidth: 0,
    gap: screenWidth * 0.03,
    marginTop: screenHeight * 0.02,
  },
  button: {
    flex: 1,
    paddingVertical: screenHeight * 0.018,
    borderRadius: screenWidth * 0.02,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {},
  submitButton: {},
  cancelButtonText: {
    color: "Black",
    fontSize: screenWidth * 0.04,
    fontWeight: "600",
  },
  submitButtonText: {
    color: "white",
    fontSize: screenWidth * 0.04,
    fontWeight: "600",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 70,
    justifyContent: "center",
  },
});

export default PatientRevisitScreen;