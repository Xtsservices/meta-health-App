// src/screens/EditMedicalHistoryScreen.tsx

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { RootState } from "../../../store/store";
import { AuthFetch, AuthPatch, AuthPut } from "../../../auth/auth";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
import { ArrowLeft } from "lucide-react-native";
import type { medicalHistoryFormType } from "../../../utils/types";
import { showError, showSuccess } from "../../../store/toast.slice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RouteParams = {
  patientId: string;
};

const sections = [
  { key: "basic", label: "Basic", icon: "User" },
  { key: "surgical", label: "Surgical", icon: "Activity" },
  { key: "lipid", label: "Lipid", icon: "Activity" },
  { key: "allergies", label: "Allergies", icon: "AlertTriangle" },
  { key: "prescribed", label: "Prescribed", icon: "Pill" },
  { key: "selfmeds", label: "Self Meds", icon: "Pill" },
  { key: "health", label: "Conditions", icon: "HeartPulse" },
  { key: "infectious", label: "Infections", icon: "AlertTriangle" },
  { key: "addiction", label: "Addiction", icon: "Activity" },
  { key: "family", label: "Family", icon: "Users" },
  { key: "physical", label: "Physical", icon: "Stethoscope" },
  { key: "cancer", label: "Cancer", icon: "Activity" },
];

const { width: WINDOW_WIDTH } = Dimensions.get("window");
// Reserve extra space for footer + comfortable gap so system nav or gesture areas don't overlap content.
// Keep consistent with other screens (safe reserve).
const FOOTER_RESERVE = 88;

const EditMedicalHistoryScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);
  const patient = useSelector((s: RootState) => s.currentPatient);
  const patientId = patient?.id;

  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom ?? 0;
  const topInset = insets.top ?? 0;
  const bottomPadding = bottomInset + FOOTER_RESERVE;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileError, setMobileError] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState<medicalHistoryFormType>({
    patientID: patientId,
    userID: user?.id,
    givenName: "",
    givenPhone: "",
    givenRelation: "",
    bloodGroup: "",
    bloodPressure: "",
    disease: "",
    foodAllergy: "",
    medicineAllergy: "",
    anaesthesia: "",
    meds: "",
    selfMeds: "",
    chestCondition: "",
    neurologicalDisorder: "",
    heartProblems: "",
    infections: "",
    mentalHealth: "",
    drugs: "",
    pregnant: "",
    hereditaryDisease: "",
    lumps: "",
    cancer: "",
    familyDisease: "",
  });

  const mobileErrorShown = useRef(false);

  const isValidIndianMobile = (phone: string) => {
    if (!phone) return false;
    if (phone.length !== 10) return false;
    if (!/^[6-9]/.test(phone[0])) return false;
    return /^[6-9]\d{9}$/.test(phone);
  };

  const getMedicalHistory = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    
    if (!token || !user?.hospitalID || !patientId) {
      setLoading(false);
      return;
    }

    try {
      const res = await AuthFetch(
        `history/${user?.hospitalID}/patient/${patientId}`,
        token
      );
      
      if (res?.status === "success" && "data" in res && res?.data?.medicalHistory) {
        setMedicalHistory(res.data?.medicalHistory);
      }
    } catch (e: any) {
      dispatch(showError("Failed to load medical history"));
    } finally {
      setLoading(false);
    }
  }, [user?.token, user?.hospitalID, patientId, dispatch]);

  useEffect(() => {
    getMedicalHistory();
  }, []);

  useEffect(() => {
    if (medicalHistory?.givenPhone) {
      setMobileError(!isValidIndianMobile(medicalHistory.givenPhone));
    } else {
      setMobileError(false);
    }
  }, [medicalHistory?.givenPhone]);

  // Show toast once when mobileError becomes true; reset flag when mobile becomes valid again
  useEffect(() => {
    if (mobileError && !mobileErrorShown.current) {
      dispatch(
        showError(
          "Invalid mobile number"
        )
      );
      mobileErrorShown.current = true;
    } else if (!mobileError) {
      // reset so if user later makes it invalid again we show toast again
      mobileErrorShown.current = false;
    }
  }, [mobileError, dispatch]);

  const canSave =
    !!medicalHistory?.givenName &&
    isValidIndianMobile(medicalHistory?.givenPhone) &&
    !!medicalHistory?.givenRelation &&
    !saving;

// Add this validation function to EditMedicalHistoryScreen.tsx
const validateForm = useCallback((): { isValid: boolean; error?: string } => {
  // Basic validation
  if (!medicalHistory?.givenName?.trim()) {
    return { isValid: false, error: "History given by is required" };
  }
  
  if (!medicalHistory?.givenPhone?.trim()) {
    return { isValid: false, error: "Mobile number is required" };
  }
  
  if (!isValidIndianMobile(medicalHistory.givenPhone)) {
    return { isValid: false, error: "Please enter a valid 10-digit Indian mobile number" };
  }
  
  if (!medicalHistory?.givenRelation?.trim()) {
    return { isValid: false, error: "Relationship is required" };
  }
  
  if (!medicalHistory?.bloodGroup?.trim()) {
    return { isValid: false, error: "Blood group is required" };
  }
  
  // Surgical history validation
  if (medicalHistory?.disease?.includes("Diabetes:") && !medicalHistory.disease.includes("Diabetes:")) {
    return { isValid: false, error: "Diabetes diagnosis date is required" };
  }
  
  if (medicalHistory?.disease?.includes("Been Through any Surgery")) {
    if (!medicalHistory.disease.includes("|")) {
      return { isValid: false, error: "Surgery details and date are required" };
    }
  }
  
  // Cancer section validation
  if (medicalHistory?.cancer && medicalHistory.cancer.trim() !== "" && medicalHistory.cancer !== "No") {
    // Check if cancer fields are properly filled
    if (!medicalHistory.cancer.includes("Type:")) {
      return { isValid: false, error: "Cancer type is required" };
    }
    
    if (!medicalHistory.cancer.includes("Stage:")) {
      return { isValid: false, error: "Cancer stage is required" };
    }
    
    if (!medicalHistory.cancer.includes("Date:")) {
      return { isValid: false, error: "Cancer diagnosis date is required" };
    }
    
    // Extract values to check if they're not empty
    const cancerTypeMatch = medicalHistory.cancer.match(/Type:\s*([^,]+)/i);
    const cancerStageMatch = medicalHistory.cancer.match(/Stage:\s*([^,]+)/i);
    const cancerDateMatch = medicalHistory.cancer.match(/Date:\s*([^,]+)/i);
    
    if (!cancerTypeMatch || !cancerTypeMatch[1]?.trim()) {
      return { isValid: false, error: "Cancer type is required" };
    }
    
    if (!cancerStageMatch || !cancerStageMatch[1]?.trim()) {
      return { isValid: false, error: "Cancer stage is required" };
    }
    
    if (!cancerDateMatch || !cancerDateMatch[1]?.trim()) {
      return { isValid: false, error: "Cancer diagnosis date is required" };
    }
  }
  
  // Similar validations for other sections would go here...
  
  return { isValid: true };
}, [medicalHistory]);

// Update the handleSubmit function:
  const handleSubmit = async () => {
    if (!user?.hospitalID || !user?.id) return;
  
  // Validate the entire form
  const validation = validateForm();
  if (!validation.isValid) {
    dispatch(showError(validation.error || "Please fill all required fields"));
    return;
  }
  
    if (!canSave) return;

    try {
      setSaving(true);
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthPatch(
        `history/${user.hospitalID}/patient/${patientId}/${user.id}`,
        medicalHistory,
        token
      );
      if (res?.status === "success") {
        dispatch(showSuccess("Medical history successfully updated"));
        navigation.navigate("MedicalHistory");
      } else {
        dispatch(showError( res && "message" in res && res?.message || "Failed to update history"));
      }
    } catch (e: any) {
      dispatch(showError("Failed to update history"));
    } finally {
      setSaving(false);
    }
  };

  const debouncedSubmit = useCallback(debounce(handleSubmit, DEBOUNCE_DELAY), [
    handleSubmit,
  ]);

  const handleSectionSelect = useCallback((sectionKey: string) => {
   navigation.navigate('MedicalHistoryForm', {
      section: sectionKey,
      medicalHistoryData: medicalHistory,
      onDataUpdate: (updatedData: medicalHistoryFormType) => {
      setMedicalHistory(prev => ({
        ...prev,
        ...updatedData
      }));
    }
  });
}, [navigation, medicalHistory]);

  const renderSectionIcons = () => (
    <View style={styles.iconsContainer}>
      <Text style={styles.sectionTitle}>Select Section</Text>
      <ScrollView contentContainerStyle={[styles.iconsGrid,
          { paddingBottom: bottomPadding ,paddingRight: 8},
        ]}
      >
        {sections.map((section) => (
          <TouchableOpacity
            key={section.key}
            style={styles.iconButton}
            onPress={() => handleSectionSelect(section.key)}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>
                {section.label.charAt(0)}
              </Text>
            </View>
            <Text style={styles.iconLabel} numberOfLines={2}>
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSaveButton = () => (
    <View style={[styles.saveContainer, { paddingBottom: Math.max(bottomInset, 8) }]}>
      <TouchableOpacity
        style={[
          styles.saveButton,
          (!canSave || saving) && styles.saveButtonDisabled,
        ]}
        onPress={debouncedSubmit}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? "Saving..." : "Save All Sections"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar
        barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"}
        backgroundColor="#0f172a"
      />

     
      

      {/* Body */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#14b8a6" />
          </View>
        ) : (
          <>
            {renderSectionIcons()}
            {renderSaveButton()}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  headerPlaceholder: {
    width: 40,
  },
  body: {
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconsContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },
  iconsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  iconButton: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 0,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#14b8a6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  iconText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 18,
  },
  iconLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
    textAlign: "center",
  },
  saveContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#14b8a6",
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
});

export default EditMedicalHistoryScreen;
