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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthPost } from "../../../auth/auth";
import Footer from "../../dashboard/footer";
import { 
  SPACING, 
  FONT_SIZE, 
  ICON_SIZE, 
  SCREEN_WIDTH, 
  SCREEN_HEIGHT,
  isTablet,
  isSmallDevice,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

const RESPONSIVE = {
  spacing: SPACING,
  fontSize: FONT_SIZE,
  icon: ICON_SIZE,
  screen: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  isTablet,
  isSmallDevice,
};

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

const FOOTER_H = 70;

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

  const bottomPad = FOOTER_H + Math.max(insets.bottom, RESPONSIVE.spacing.md) + RESPONSIVE.spacing.md;

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? RESPONSIVE.spacing.xl : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPad }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              Physical Examination
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.sub }]}>
              Fill in the relevant examination findings
            </Text>
          </View>

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
      </KeyboardAvoidingView>

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
  container: {
    flex: 1,
  },
  scrollView: { 
    flex: 1,
  },
  scrollContent: { 
    padding: RESPONSIVE.spacing.lg,
  },
  header: {
    marginBottom: RESPONSIVE.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontWeight: "800",
    marginBottom: RESPONSIVE.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "500",
    textAlign: "center",
  },
  form: {
    gap: RESPONSIVE.spacing.lg,
  },
  fieldsRow: {
    flexDirection: RESPONSIVE.isTablet ? "row" : "column",
    gap: RESPONSIVE.spacing.md,
  },
  field: {
    flex: 1,
    gap: RESPONSIVE.spacing.sm,
  },
  fieldLabel: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: RESPONSIVE.spacing.md,
    paddingVertical: RESPONSIVE.spacing.sm,
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "500",
    minHeight: RESPONSIVE.isSmallDevice ? 80 : 100,
    textAlignVertical: "top",
  },
  submitButton: {
    paddingVertical: RESPONSIVE.spacing.lg,
    paddingHorizontal: RESPONSIVE.spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: RESPONSIVE.spacing.xl,
    marginBottom: RESPONSIVE.spacing.xl,
    minHeight: 50,
  },
  submitButtonText: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "700",
  },
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_H,
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