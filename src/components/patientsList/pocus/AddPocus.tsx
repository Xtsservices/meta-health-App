import React, { useState, useCallback } from "react";
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
import { ChevronDown, Check } from "lucide-react-native";
import { AuthPost } from "../../../auth/auth";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  rightPleuralEffusion: string;
  leftPleuralEffusion: string;
  rightPneumothorax: string;
  leftPneumothorax: string;
  heart: string;
  abdomen: string;
  ivc: string;
  abg: string;
  ecg: string;
  cxr: string;
}

const pleuralEffusionOptions = [
  "normal",
  "indeterminate",
  "free fluid in morrison's pouch",
  "free fluid in perihepatic space",
  "free air",
];

const pneumothoraxOptions = [
  "normal",
  "indeterminate",
  "free fluid in morrison's pouch",
  "free fluid in perihepatic space",
  "free air",
];

const heartOptions = [
  "normal",
  "ejection fraction",
  "abnormal wall motion",
];

const FOOTER_H = 70;

export default function AddPocusScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const currentPatient = useSelector(selectCurrentPatient);
  const timeline = currentPatient?.patientTimeLineID;

  const [loading, setLoading] = useState(false);
  const [showFields, setShowFields] = useState({
    pleuralEffusion: false,
    pneumothorax: false,
    heart: false,
    abdomen: false,
  });

  const [formValues, setFormValues] = useState<FormValues>({
    rightPleuralEffusion: "",
    leftPleuralEffusion: "",
    leftPneumothorax: "",
    rightPneumothorax: "",
    heart: "",
    abdomen: "",
    ivc: "",
    abg: "",
    ecg: "",
    cxr: "",
  });

  const [dropdowns, setDropdowns] = useState({
    leftPleuralEffusion: false,
    rightPleuralEffusion: false,
    leftPneumothorax: false,
    rightPneumothorax: false,
    heart: false,
  });

  const toggleDropdown = (dropdown: keyof typeof dropdowns) => {
    setDropdowns(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

  const handleCheckboxChange = (field: keyof typeof showFields) => {
    setShowFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));

    if (!showFields[field]) {
      const updatedValues = { ...formValues };
      if (field === "pleuralEffusion") {
        updatedValues.rightPleuralEffusion = "";
        updatedValues.leftPleuralEffusion = "";
      }
      if (field === "pneumothorax") {
        updatedValues.rightPneumothorax = "";
        updatedValues.leftPneumothorax = "";
      }
      if (field === "heart") {
        updatedValues.heart = "";
      }
      if (field === "abdomen") {
        updatedValues.abdomen = "";
      }
      setFormValues(updatedValues);
    }
  };

  const handleSelectOption = (field: keyof FormValues, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    setDropdowns(prev => ({
      ...prev,
      [field]: false
    }));
  };

  const handleInputChange = (field: keyof FormValues, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (showFields.pleuralEffusion) {
      if (!formValues.leftPleuralEffusion) errors.push("Left Pleural Effusion is required");
      if (!formValues.rightPleuralEffusion) errors.push("Right Pleural Effusion is required");
    }

    if (showFields.pneumothorax) {
      if (!formValues.leftPneumothorax) errors.push("Left Pneumothorax is required");
      if (!formValues.rightPneumothorax) errors.push("Right Pneumothorax is required");
    }

    if (showFields.heart && !formValues.heart) {
      errors.push("Heart assessment is required");
    }

    if (showFields.abdomen && !formValues.abdomen) {
      errors.push("Abdomen assessment is required");
    }

    if (!formValues.ivc) errors.push("IVC is required");
    if (!formValues.abg) errors.push("ABG is required");
    if (!formValues.cxr) errors.push("CXR is required");
    if (!formValues.ecg) errors.push("ECG is required");

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
        `pocus/${user.hospitalID}/${timeline}`,
        {
          userID: user.id,
          ...formValues,
        },
        token
      );

      if (response?.data?.message === "success") {
        Alert.alert("Success", "POCUS record added successfully", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert("Error", "Failed to add POCUS record");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add POCUS record");
    } finally {
      setLoading(false);
    }
  };

  const renderDropdown = (
    field: keyof FormValues,
    options: string[],
    label: string,
    isOpen: boolean
  ) => (
    <View style={styles.dropdownContainer}>
      <Pressable
        style={[styles.dropdownButton, { borderColor: COLORS.border }]}
        onPress={() => toggleDropdown(field)}
      >
        <Text style={[styles.dropdownButtonText, { color: formValues[field] ? COLORS.text : COLORS.sub }]}>
          {formValues[field] || `Select ${label}`}
        </Text>
        <ChevronDown size={RESPONSIVE.icon.sm} color={COLORS.sub} />
      </Pressable>

      {isOpen && (
        <View style={[styles.dropdownMenu, { borderColor: COLORS.border }]}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {options?.map((option, index) => (
              <Pressable
                key={option}
                style={[
                  styles.dropdownItem,
                  index < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }
                ]}
                onPress={() => handleSelectOption(field, option)}
              >
                <Text style={[styles.dropdownItemText, { color: COLORS.text }]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
                {formValues[field] === option && (
                  <Check size={RESPONSIVE.icon.sm} color={COLORS.success} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pleural Effusion Section */}
          <View style={styles.section}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => handleCheckboxChange("pleuralEffusion")}
            >
              <View style={[styles.checkbox, { borderColor: COLORS.border }]}>
                {showFields.pleuralEffusion && (
                  <View style={[styles.checkboxInner, { backgroundColor: COLORS.brand }]} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                Pleural Effusion
              </Text>
            </Pressable>

            {showFields.pleuralEffusion && (
              <View style={styles.fieldsRow}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: COLORS.text }]}>Left Pleural Effusion</Text>
                  {renderDropdown("leftPleuralEffusion", pleuralEffusionOptions, "Left Pleural Effusion", dropdowns.leftPleuralEffusion)}
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: COLORS.text }]}>Right Pleural Effusion</Text>
                  {renderDropdown("rightPleuralEffusion", pleuralEffusionOptions, "Right Pleural Effusion", dropdowns.rightPleuralEffusion)}
                </View>
              </View>
            )}
          </View>

          {/* Pneumothorax Section */}
          <View style={styles.section}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => handleCheckboxChange("pneumothorax")}
            >
              <View style={[styles.checkbox, { borderColor: COLORS.border }]}>
                {showFields.pneumothorax && (
                  <View style={[styles.checkboxInner, { backgroundColor: COLORS.brand }]} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                Pneumothorax
              </Text>
            </Pressable>

            {showFields.pneumothorax && (
              <View style={styles.fieldsRow}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: COLORS.text }]}>Left Pneumothorax</Text>
                  {renderDropdown("leftPneumothorax", pneumothoraxOptions, "Left Pneumothorax", dropdowns.leftPneumothorax)}
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: COLORS.text }]}>Right Pneumothorax</Text>
                  {renderDropdown("rightPneumothorax", pneumothoraxOptions, "Right Pneumothorax", dropdowns.rightPneumothorax)}
                </View>
              </View>
            )}
          </View>

          {/* Heart Section */}
          <View style={styles.section}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => handleCheckboxChange("heart")}
            >
              <View style={[styles.checkbox, { borderColor: COLORS.border }]}>
                {showFields.heart && (
                  <View style={[styles.checkboxInner, { backgroundColor: COLORS.brand }]} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                Heart
              </Text>
            </Pressable>

            {showFields.heart && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>Heart Assessment</Text>
                {renderDropdown("heart", heartOptions, "Heart Assessment", dropdowns.heart)}
              </View>
            )}
          </View>

          {/* Abdomen Section */}
          <View style={styles.section}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => handleCheckboxChange("abdomen")}
            >
              <View style={[styles.checkbox, { borderColor: COLORS.border }]}>
                {showFields.abdomen && (
                  <View style={[styles.checkboxInner, { backgroundColor: COLORS.brand }]} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                Abdomen
              </Text>
            </Pressable>

            {showFields.abdomen && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>Abdomen Assessment</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { borderColor: COLORS.border, color: COLORS.text }]}
                  value={formValues.abdomen}
                  onChangeText={(text) => handleInputChange("abdomen", text)}
                  placeholder="Enter abdomen assessment..."
                  placeholderTextColor={COLORS.sub}
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}
          </View>

          {/* Tests Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Tests</Text>
            <View style={styles.fieldsRow}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>IVC</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: COLORS.border, color: COLORS.text }]}
                  value={formValues.ivc}
                  onChangeText={(text) => handleInputChange("ivc", text)}
                  placeholder="Enter IVC value..."
                  placeholderTextColor={COLORS.sub}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>ABG</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: COLORS.border, color: COLORS.text }]}
                  value={formValues.abg}
                  onChangeText={(text) => handleInputChange("abg", text)}
                  placeholder="Enter ABG value..."
                  placeholderTextColor={COLORS.sub}
                />
              </View>
            </View>
            <View style={styles.fieldsRow}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>CXR</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: COLORS.border, color: COLORS.text }]}
                  value={formValues.cxr}
                  onChangeText={(text) => handleInputChange("cxr", text)}
                  placeholder="Enter CXR value..."
                  placeholderTextColor={COLORS.sub}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>ECG</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: COLORS.border, color: COLORS.text }]}
                  value={formValues.ecg}
                  onChangeText={(text) => handleInputChange("ecg", text)}
                  placeholder="Enter ECG value..."
                  placeholderTextColor={COLORS.sub}
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, { backgroundColor: COLORS.button }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.buttonText} />
            ) : (
              <Text style={[styles.submitButtonText, { color: COLORS.buttonText }]}>
                Save POCUS Record
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
  safe: { flex: 1 },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { 
    padding: RESPONSIVE.spacing.lg,
  },
  section: {
    marginBottom: RESPONSIVE.spacing.xl,
    gap: RESPONSIVE.spacing.md,
  },
  sectionTitle: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontWeight: "700",
    marginBottom: RESPONSIVE.spacing.sm,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: RESPONSIVE.spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "600",
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
  dropdownContainer: {
    position: "relative",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: RESPONSIVE.spacing.md,
    paddingVertical: RESPONSIVE.spacing.sm,
    backgroundColor: COLORS.card,
    minHeight: RESPONSIVE.isSmallDevice ? 44 : 48,
  },
  dropdownButtonText: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "500",
    flex: 1,
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    zIndex: 1000,
    marginTop: RESPONSIVE.spacing.xs,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: RESPONSIVE.spacing.md,
    paddingVertical: RESPONSIVE.spacing.sm,
    minHeight: 44,
  },
  dropdownItemText: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "500",
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: RESPONSIVE.spacing.md,
    paddingVertical: RESPONSIVE.spacing.sm,
    backgroundColor: COLORS.card,
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "500",
    minHeight: RESPONSIVE.isSmallDevice ? 44 : 48,
  },
  textArea: {
    textAlignVertical: "top",
    minHeight: 100,
  },
  submitButton: {
    paddingVertical: RESPONSIVE.spacing.lg,
    paddingHorizontal: RESPONSIVE.spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: RESPONSIVE.spacing.sm,
    marginBottom: RESPONSIVE.spacing.xl,
    minHeight: 50,
  },
  submitButtonText: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "700",
  },
  footerWrap: {
    position: "absolute",
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