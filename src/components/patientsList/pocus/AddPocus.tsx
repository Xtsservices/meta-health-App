import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
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
import { showError, showSuccess } from "../../../store/toast.slice";

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
  const dispatch = useDispatch();
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

  // per-field error messages
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});

  const toggleDropdown = (dropdown: keyof typeof dropdowns) => {
    setDropdowns((prev) => ({
      ...prev,
      [dropdown]: !prev[dropdown],
    }));
  };

  const handleCheckboxChange = (field: keyof typeof showFields) => {
    setShowFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));

    // Clear values when turning OFF
    if (showFields[field]) {
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
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    setDropdowns((prev) => ({
      ...prev,
      [field]: false,
    }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleInputChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const e: Partial<Record<keyof FormValues, string>> = {};

    if (showFields.pleuralEffusion) {
      if (!formValues.leftPleuralEffusion)
        e.leftPleuralEffusion = "Left Pleural Effusion is required";
      if (!formValues.rightPleuralEffusion)
        e.rightPleuralEffusion = "Right Pleural Effusion is required";
    }

    if (showFields.pneumothorax) {
      if (!formValues.leftPneumothorax)
        e.leftPneumothorax = "Left Pneumothorax is required";
      if (!formValues.rightPneumothorax)
        e.rightPneumothorax = "Right Pneumothorax is required";
    }

    if (showFields.heart && !formValues.heart) {
      e.heart = "Heart assessment is required";
    }

    if (showFields.abdomen && !formValues.abdomen) {
      e.abdomen = "Abdomen assessment is required";
    }

    // Always required tests
    if (!formValues.ivc) e.ivc = "IVC is required";
    if (!formValues.abg) e.abg = "ABG is required";
    if (!formValues.cxr) e.cxr = "CXR is required";
    if (!formValues.ecg) e.ecg = "ECG is required";

    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    const isValid = validateForm();

    if (!isValid) {
      dispatch(showError("Please fill all required fields."));
      return;
    }

    if (!timeline) {
      dispatch(showError("No timeline found for patient"));
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

         if (("data" in response && response?.data?.message === "success") || 
        response?.status === "success") {
        dispatch(showSuccess("POCUS record added successfully"));
        navigation.goBack();
      } else {
        dispatch(showError("Failed to add POCUS record"));
      }
    } catch (error) {
      dispatch(showError("Failed to add POCUS record"));
    } finally {
      setLoading(false);
    }
  };

  const renderDropdown = (
    field: keyof FormValues,
    options: string[],
    label: string,
    isOpen: boolean
  ) => {
    const hasError = !!fieldErrors[field];
    return (
      <View style={styles.dropdownContainer}>
        <Pressable
          style={[
            styles.dropdownButton,
            { borderColor: hasError ? COLORS.danger : COLORS.border },
          ]}
          onPress={() => toggleDropdown(field as keyof typeof dropdowns)}
        >
          <Text
            style={[
              styles.dropdownButtonText,
              { color: formValues[field] ? COLORS.text : COLORS.sub },
            ]}
            numberOfLines={1}
          >
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
                    index < options.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.border,
                    },
                  ]}
                  onPress={() => handleSelectOption(field, option)}
                >
                  <Text
                    style={[styles.dropdownItemText, { color: COLORS.text }]}
                    numberOfLines={1}
                  >
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
        {!!fieldErrors[field] && (
          <Text style={styles.errorText}>{fieldErrors[field]}</Text>
        )}
      </View>
    );
  };

  const bottomPad =
    FOOTER_H +
    Math.max(insets.bottom, RESPONSIVE.spacing.sm) +
    RESPONSIVE.spacing.xs;

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? RESPONSIVE.spacing.lg : 20
        }
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header (compact) */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              Add POCUS
            </Text>
          </View>

          {/* Pleural Effusion Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Lung – Pleural Effusion</Text>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => handleCheckboxChange("pleuralEffusion")}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: COLORS.border,
                    backgroundColor: showFields.pleuralEffusion
                      ? "#ecfdf5"
                      : COLORS.card,
                  },
                ]}
              >
                {showFields.pleuralEffusion && (
                  <Check size={RESPONSIVE.icon.sm} color={COLORS.brand} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                Pleural Effusion
              </Text>
            </Pressable>

            {showFields.pleuralEffusion && (
              <View style={styles.fieldsRow}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                    Left Pleural Effusion
                    <Text style={styles.mandatory}> *</Text>
                  </Text>
                  {renderDropdown(
                    "leftPleuralEffusion",
                    pleuralEffusionOptions,
                    "Left Pleural Effusion",
                    dropdowns.leftPleuralEffusion
                  )}
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                    Right Pleural Effusion
                    <Text style={styles.mandatory}> *</Text>
                  </Text>
                  {renderDropdown(
                    "rightPleuralEffusion",
                    pleuralEffusionOptions,
                    "Right Pleural Effusion",
                    dropdowns.rightPleuralEffusion
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Pneumothorax Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Lung – Pneumothorax</Text>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => handleCheckboxChange("pneumothorax")}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: COLORS.border,
                    backgroundColor: showFields.pneumothorax
                      ? "#ecfdf5"
                      : COLORS.card,
                  },
                ]}
              >
                {showFields.pneumothorax && (
                  <Check size={RESPONSIVE.icon.sm} color={COLORS.brand} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                Pneumothorax
              </Text>
            </Pressable>

            {showFields.pneumothorax && (
              <View style={styles.fieldsRow}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                    Left Pneumothorax
                    <Text style={styles.mandatory}> *</Text>
                  </Text>
                  {renderDropdown(
                    "leftPneumothorax",
                    pneumothoraxOptions,
                    "Left Pneumothorax",
                    dropdowns.leftPneumothorax
                  )}
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                    Right Pneumothorax
                    <Text style={styles.mandatory}> *</Text>
                  </Text>
                  {renderDropdown(
                    "rightPneumothorax",
                    pneumothoraxOptions,
                    "Right Pneumothorax",
                    dropdowns.rightPneumothorax
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Heart Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Cardiac</Text>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => handleCheckboxChange("heart")}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: COLORS.border,
                    backgroundColor: showFields.heart
                      ? "#ecfdf5"
                      : COLORS.card,
                  },
                ]}
              >
                {showFields.heart && (
                  <Check size={RESPONSIVE.icon.sm} color={COLORS.brand} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                Heart
              </Text>
            </Pressable>

            {showFields.heart && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                  Heart Assessment
                  <Text style={styles.mandatory}> *</Text>
                </Text>
                {renderDropdown(
                  "heart",
                  heartOptions,
                  "Heart Assessment",
                  dropdowns.heart
                )}
              </View>
            )}
          </View>

          {/* Abdomen Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Abdomen</Text>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => handleCheckboxChange("abdomen")}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: COLORS.border,
                    backgroundColor: showFields.abdomen
                      ? "#ecfdf5"
                      : COLORS.card,
                  },
                ]}
              >
                {showFields.abdomen && (
                  <Check size={RESPONSIVE.icon.sm} color={COLORS.brand} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                Abdomen
              </Text>
            </Pressable>

            {showFields.abdomen && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                  Abdomen Assessment
                  <Text style={styles.mandatory}> *</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    {
                      borderColor: fieldErrors.abdomen
                        ? COLORS.danger
                        : COLORS.border,
                      color: COLORS.text,
                    },
                  ]}
                  value={formValues.abdomen}
                  onChangeText={(text) => handleInputChange("abdomen", text)}
                  placeholder="Enter abdomen assessment..."
                  placeholderTextColor={COLORS.sub}
                  multiline
                  numberOfLines={3}
                />
                {!!fieldErrors.abdomen && (
                  <Text style={styles.errorText}>{fieldErrors.abdomen}</Text>
                )}
              </View>
            )}
          </View>

          {/* Tests Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tests</Text>
            <View style={styles.fieldsRow}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                  IVC
                  <Text style={styles.mandatory}> *</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: fieldErrors.ivc
                        ? COLORS.danger
                        : COLORS.border,
                      color: COLORS.text,
                    },
                  ]}
                  value={formValues.ivc}
                  onChangeText={(text) => handleInputChange("ivc", text)}
                  placeholder="Enter IVC..."
                  placeholderTextColor={COLORS.sub}
                />
                {!!fieldErrors.ivc && (
                  <Text style={styles.errorText}>{fieldErrors.ivc}</Text>
                )}
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                  ABG
                  <Text style={styles.mandatory}> *</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: fieldErrors.abg
                        ? COLORS.danger
                        : COLORS.border,
                      color: COLORS.text,
                    },
                  ]}
                  value={formValues.abg}
                  onChangeText={(text) => handleInputChange("abg", text)}
                  placeholder="Enter ABG..."
                  placeholderTextColor={COLORS.sub}
                />
                {!!fieldErrors.abg && (
                  <Text style={styles.errorText}>{fieldErrors.abg}</Text>
                )}
              </View>
            </View>
            <View style={styles.fieldsRow}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                  CXR
                  <Text style={styles.mandatory}> *</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: fieldErrors.cxr
                        ? COLORS.danger
                        : COLORS.border,
                      color: COLORS.text,
                    },
                  ]}
                  value={formValues.cxr}
                  onChangeText={(text) => handleInputChange("cxr", text)}
                  placeholder="Enter CXR..."
                  placeholderTextColor={COLORS.sub}
                />
                {!!fieldErrors.cxr && (
                  <Text style={styles.errorText}>{fieldErrors.cxr}</Text>
                )}
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: COLORS.text }]}>
                  ECG
                  <Text style={styles.mandatory}> *</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: fieldErrors.ecg
                        ? COLORS.danger
                        : COLORS.border,
                      color: COLORS.text,
                    },
                  ]}
                  value={formValues.ecg}
                  onChangeText={(text) => handleInputChange("ecg", text)}
                  placeholder="Enter ECG..."
                  placeholderTextColor={COLORS.sub}
                />
                {!!fieldErrors.ecg && (
                  <Text style={styles.errorText}>{fieldErrors.ecg}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Submit Button - compact like reference */}
          <View style={styles.stickyFooter}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.footerBtnCancel}
              disabled={loading}
            >
              <Text style={[styles.footerBtnText, { color: COLORS.text }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.footerBtnSave,
                { backgroundColor: COLORS.button },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.buttonText} />
              ) : (
                <Text
                  style={[
                    styles.footerBtnText,
                    { color: COLORS.buttonText },
                  ]}
                >
                  Save POCUS Record
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: RESPONSIVE.spacing.sm,
    paddingTop: RESPONSIVE.spacing.xs,
  },

  header: {
    paddingHorizontal: RESPONSIVE.spacing.sm,
    paddingVertical: RESPONSIVE.spacing.xs,
    marginBottom: RESPONSIVE.spacing.xs,
  },
  title: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "800",
  },

  sectionCard: {
    marginBottom: RESPONSIVE.spacing.sm,
    paddingVertical: RESPONSIVE.spacing.sm,
    paddingHorizontal: RESPONSIVE.spacing.sm,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionTitle: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "700",
    marginBottom: RESPONSIVE.spacing.xs,
    color: COLORS.sub,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: RESPONSIVE.spacing.xs,
    marginBottom: RESPONSIVE.spacing.xs,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "600",
  },

  mandatory: {
    color: '#000000',
    fontWeight: "700",
  },

  fieldsRow: {
    flexDirection: RESPONSIVE.isTablet ? "row" : "column",
    gap: RESPONSIVE.spacing.sm,
  },
  field: {
    flex: 1,
    gap: RESPONSIVE.spacing.xs,
  },
  fieldLabel: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontWeight: "600",
  },

  errorText: {
    marginTop: 2,
    fontSize: RESPONSIVE.fontSize.xs,
    color: COLORS.danger,
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
    borderRadius: 6,
    paddingHorizontal: RESPONSIVE.spacing.sm,
    paddingVertical: RESPONSIVE.spacing.xs,
    backgroundColor: COLORS.card,
    minHeight: 36,
  },
  dropdownButtonText: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "500",
    flex: 1,
    marginRight: RESPONSIVE.spacing.xs,
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    zIndex: 1000,
    marginTop: RESPONSIVE.spacing.xs,
    maxHeight: 160,
  },
  dropdownScroll: {
    maxHeight: 160,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: RESPONSIVE.spacing.sm,
    paddingVertical: RESPONSIVE.spacing.xs,
    minHeight: 34,
  },
  dropdownItemText: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "500",
    flex: 1,
    marginRight: RESPONSIVE.spacing.xs,
  },

  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: RESPONSIVE.spacing.sm,
    paddingVertical: RESPONSIVE.spacing.xs,
    backgroundColor: COLORS.card,
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "500",
    minHeight: 36,
  },
  textArea: {
    textAlignVertical: "top",
    minHeight: 70,
  },

  // Footer buttons (compact)
  stickyFooter: {
    flexDirection: "row",
    paddingHorizontal: RESPONSIVE.spacing.sm,
    paddingVertical: RESPONSIVE.spacing.sm,
    backgroundColor: COLORS.bg,
    gap: RESPONSIVE.spacing.sm,
    marginTop: RESPONSIVE.spacing.xs,
  },
  footerBtnCancel: {
    flex: 1,
    paddingVertical: RESPONSIVE.spacing.sm,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnSave: {
    flex: 2,
    paddingVertical: RESPONSIVE.spacing.sm,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnText: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "800",
  },

  footerWrap: {
    // position: "absolute",
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
