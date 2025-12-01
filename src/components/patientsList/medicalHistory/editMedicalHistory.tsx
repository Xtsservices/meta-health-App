// src/screens/EditMedicalHistoryScreen.tsx

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
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

const EditMedicalHistoryScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);
  const patient = useSelector((s: RootState) => s.currentPatient);
  const patientId = patient?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      
      if (res?.status === "success" && res?.data?.medicalHistory) {
        setMedicalHistory(res.data?.medicalHistory);
      }
    } catch (e: any) {
      dispatch(showError("Failed to load medical history"));
    } finally {
      setLoading(false);
    }
  }, [user?.token, user?.hospitalID, patientId, dispatch]);

  useFocusEffect(
    useCallback(() => {
    getMedicalHistory();
  }, [getMedicalHistory]))

  const canSave =
    !!medicalHistory?.givenName &&
    !!medicalHistory?.givenPhone &&
    !!medicalHistory?.givenRelation &&
    !saving;

  const handleSubmit = async () => {
    if (!user?.hospitalID || !user?.id) return;
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
        dispatch(showError(res?.message || "Failed to update history"));
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

  const handleSectionSelect = (sectionKey: string) => {
   navigation.navigate('MedicalHistoryForm', {
      section: sectionKey,
      medicalHistoryData: medicalHistory,
      onDataUpdate: setMedicalHistory
    });
  };

  const renderSectionIcons = () => (
    <View style={styles.iconsContainer}>
      <Text style={styles.sectionTitle}>Select Section</Text>
      <ScrollView contentContainerStyle={styles.iconsGrid}>
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
    <View style={styles.saveContainer}>
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
    <View style={styles.screen}>
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
    </View>
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
    padding: 16,
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
});

export default EditMedicalHistoryScreen;