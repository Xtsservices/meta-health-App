import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthPost } from "../../../auth/auth";
import Footer from "../../dashboard/footer";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type RootState = any;
const selectUser = (s: RootState) => s.currentUser;
const selectCurrentPatient = (s: RootState) => s.currentPatient;

interface FormValues {
  general: string;
  head: string;
  ent: string;
  neuroPsych: string;
  neckSpine: string;
  respiratory: string;
  cardiac: string;
  abdominal: string;
  pelvis: string;
  guRectal: string;
  musculoskeletal: string;
  skin: string;
}

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  field: "#f8fafc",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  button: "#14b8a6",
  buttonText: "#ffffff",
  danger: "#ef4444",
  pill: "#eef2f7",
  success: "#22c55e",
  placeholder: "#94a3b8",
};

const INITIAL_STATE: FormValues = {
  general: "",
  head: "",
  ent: "",
  neuroPsych: "",
  neckSpine: "",
  respiratory: "",
  cardiac: "",
  abdominal: "",
  pelvis: "",
  guRectal: "",
  musculoskeletal: "",
  skin: "",
};

export default function AddPhysicalExaminationScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const currentPatient = useSelector(selectCurrentPatient);
  const timeline = currentPatient?.patientTimeLineID;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormValues>(INITIAL_STATE);

  const handleInputChange = (field: keyof FormValues, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];

    const hasData = Object.values(formData).some(value => 
      value?.trim() !== ""
    );

    if (!hasData) {
      errors.push("At least one field must be filled");
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      Alert.alert("Validation Error", errors.join("\n"));
      return;
    }

    if (!timeline) {
      Alert.alert("Error", "No timeline found for patient");
      return;
    }

    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const response = await AuthPost(
        `ot/${user?.hospitalID}/${timeline}/redzone/physicalExamination`,
        {
          physicalExaminationData: formData,
        },
        token
      );

      if (response?.data?.status === 201 || response?.message === "success") {
        Alert.alert("Success", "Physical examination record added successfully", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert("Error", "Failed to add physical examination record");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add physical examination record");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitEnabled = Object.values(formData).some(value => 
    value?.trim() !== ""
  );

  const renderTextField = (field: keyof FormValues, label: string, placeholder: string) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: COLORS.text }]}>{label}</Text>
      <TextInput
        style={[styles.textInput, { 
          borderColor: COLORS.border, 
          color: COLORS.text,
          backgroundColor: COLORS.card 
        }]}
        value={formData[field]}
        onChangeText={(text) => handleInputChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.placeholder}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );

  const footerHeight = 70;
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: footerHeight + bottomInset + 24 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: COLORS.sub }]}>
          Fill in the relevant examination findings
        </Text>

        <View style={styles.form}>
          <View style={styles.fieldsRow}>
            {renderTextField("general", "General", "General appearance, vital signs, etc...")}
            {renderTextField("head", "Head", "Head examination findings...")}
          </View>

          <View style={styles.fieldsRow}>
            {renderTextField("ent", "ENT", "Ear, Nose, Throat findings...")}
            {renderTextField("neuroPsych", "Neuro/Psych", "Neurological/Psychiatric findings...")}
          </View>

          <View style={styles.fieldsRow}>
            {renderTextField("neckSpine", "Neck/Spine", "Neck and spine examination...")}
            {renderTextField("respiratory", "Respiratory", "Respiratory system findings...")}
          </View>

          <View style={styles.fieldsRow}>
            {renderTextField("cardiac", "Cardiac", "Cardiovascular examination...")}
            {renderTextField("abdominal", "Abdominal", "Abdominal examination...")}
          </View>

          <View style={styles.fieldsRow}>
            {renderTextField("pelvis", "Pelvis", "Pelvic examination...")}
            {renderTextField("guRectal", "GU/Rectal", "Genitourinary/Rectal findings...")}
          </View>

          <View style={styles.fieldsRow}>
            {renderTextField("musculoskeletal", "Musculoskeletal", "Musculoskeletal survey...")}
            {renderTextField("skin", "Skin", "Skin examination...")}
          </View>
        </View>

        <Pressable
          style={[
            styles.submitButton, 
            { 
              backgroundColor: isSubmitEnabled ? COLORS.button : COLORS.sub,
              opacity: isSubmitEnabled ? 1 : 0.6
            }
          ]}
          onPress={handleSubmit}
          disabled={loading || !isSubmitEnabled}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.buttonText} />
          ) : (
            <Text style={[styles.submitButtonText, { color: COLORS.buttonText }]}>
              Save Physical Examination
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1,
  },
  scrollView: { 
    flex: 1,
  },
  scrollContent: { 
    padding: SCREEN_WIDTH * 0.04,
    minHeight: SCREEN_HEIGHT,
  },
  
  title: {
    fontSize: SCREEN_WIDTH < 375 ? 22 : 24,
    fontWeight: "800",
    marginBottom: SCREEN_HEIGHT * 0.01,
    textAlign: "center",
  },

  subtitle: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    fontWeight: "500",
    marginBottom: SCREEN_HEIGHT * 0.03,
    textAlign: "center",
  },

  form: {
    gap: SCREEN_HEIGHT * 0.02,
  },

  fieldsRow: {
    flexDirection: SCREEN_WIDTH < 375 ? "column" : "row",
    gap: SCREEN_WIDTH * 0.03,
  },

  field: {
    flex: 1,
    gap: SCREEN_HEIGHT * 0.005,
    marginBottom: SCREEN_WIDTH < 375 ? SCREEN_HEIGHT * 0.015 : 0,
  },

  fieldLabel: {
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    fontWeight: "600",
  },

  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    paddingVertical: SCREEN_HEIGHT * 0.012,
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    fontWeight: "500",
    minHeight: SCREEN_HEIGHT * 0.1,
    textAlignVertical: "top",
  },

  submitButton: {
    paddingVertical: SCREEN_HEIGHT * 0.02,
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SCREEN_HEIGHT * 0.03,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },

  submitButtonText: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: "700",
  },

  footerWrap: {
    left: 0,
    right: 0,
    height: 70,
    justifyContent: "center",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});