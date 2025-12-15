// src/screens/TriageTraumaScreen.tsx

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";

import {
  useTriageForm,
  TraumaFormType,
  TraumaErrorsType,
  TriageLastKnownSequence,
} from "./context/triageFormContext";
import { zoneType } from "../../utils/role";
import { showError } from "../../store/toast.slice";
import Footer from "../dashboard/footer";

/* -------------------------------------------------------------------------- */
/*                         Helpers: validation & zone                         */
/* -------------------------------------------------------------------------- */

const toNullString = (v: string) =>
  typeof v === "string" && v.trim() === "" ? "null" : v;

// Full trauma validation (stricter than web – also validates fallHeight)
const validateTraumaForm = (data: TraumaFormType): TraumaErrorsType => {
  const errors: TraumaErrorsType = {
    traumaType: "",
    fractureRegion: "",
    fallHeight: "",
  };

  if (!data.traumaType) {
    errors.traumaType = "This field is required.";
  }

  if (data.fracture && !data.fractureRegion) {
    errors.fractureRegion = "This field is required.";
  }

  if (
    data.traumaType === "fall" &&
    (!data.fallHeight || data.fallHeight === "null")
  ) {
    errors.fallHeight = "This field is required.";
  }

  return errors;
};

// Basic check that all trauma keys exist and are non-undefined
function validateTraumaData(data: TraumaFormType): boolean {
  const keys: (keyof TraumaFormType)[] = [
    "traumaType",
    "fracture",
    "fractureRegion",
    "amputation",
    "neckSwelling",
    "minorHeadInjury",
    "abrasion",
    "suspectedAbuse",
    "fallHeight",
    "chestInjuryType",
    "stabInjurySeverity",
    "stabInjuryLocation",
    "stabHeadScalp",
    "stabHeadFace",
    "stabHeadNeck",
    "stabChestHeart",
    "stabChestLungs",
    "stabChestMajorBloodVessels",
    "stabAbdomenStomach",
    "stabAbdomenLiver",
    "stabAbdomenKidneys",
    "stabAbdomenSpleen",
    "stabAbdomenIntestines",
    "stabExtremityArm",
    "stabExtremityLeg",
    "stabExtremityMuscles",
    "stabExtremityTendons",
    "stabExtremityNerves",
    "stabExtremityBloodVessels",
  ];

  return keys.every(
    (key) =>
      key in data && typeof data[key] !== "undefined" && data[key] !== null
  );
}

// Local approximation of evalTraumaZone
function getTraumaZone(data: TraumaFormType): number {
  // High-risk trauma types
  if (
    data.traumaType === "gun shot" ||
    data.traumaType === "major vascular injury" ||
    data.traumaType === "multiple injuries" ||
    data.traumaType === "significant assault"
  ) {
    return zoneType.red;
  }

  // Chest injuries
  if (
    data.chestInjuryType === "lung puncture" ||
    data.chestInjuryType === "internal bleeding" ||
    data.chestInjuryType === "pneumothorax"
  ) {
    return zoneType.red;
  }

  // Stab with organ/major vessel involvement
  if (
    data.traumaType === "stab" &&
    (data.stabInjurySeverity === "organ injury" ||
      data.stabInjurySeverity === "major blood vessel injury")
  ) {
    return zoneType.red;
  }

  // Falls from significant height / stairs
  if (
    data.traumaType === "fall" &&
    (data.fallHeight === "fall more than 3 times height" ||
      data.fallHeight === "fall more than 5 stairs")
  ) {
    return zoneType.yellow;
  }

  // Pelvic / multiple fractures
  if (
    data.fracture &&
    (data.fractureRegion === "pelvic" || data.fractureRegion === "multiple")
  ) {
    return zoneType.yellow;
  }

  // Everything else default green
  return zoneType.green;
}

/* -------------------------------------------------------------------------- */
/*                        Helpers: simple UI components                       */
/* -------------------------------------------------------------------------- */

type TraumaBoolKey = Extract<
  keyof TraumaFormType,
  | "fracture"
  | "amputation"
  | "neckSwelling"
  | "minorHeadInjury"
  | "abrasion"
  | "suspectedAbuse"
  | "stabHeadScalp"
  | "stabHeadFace"
  | "stabHeadNeck"
  | "stabChestHeart"
  | "stabChestLungs"
  | "stabChestMajorBloodVessels"
  | "stabAbdomenStomach"
  | "stabAbdomenLiver"
  | "stabAbdomenKidneys"
  | "stabAbdomenSpleen"
  | "stabAbdomenIntestines"
  | "stabExtremityArm"
  | "stabExtremityLeg"
  | "stabExtremityMuscles"
  | "stabExtremityTendons"
  | "stabExtremityNerves"
  | "stabExtremityBloodVessels"
>;

/* -------------------------------------------------------------------------- */
/*                               Screen Component                             */
/* -------------------------------------------------------------------------- */

const TriageTraumaScreen: React.FC = () => {
  const { formData, setFormData } = useTriageForm();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [trauma, setTrauma] = useState<TraumaFormType>(formData.trauma);
  const [errors, setErrors] = useState<TraumaErrorsType>(
    formData.errors.trauma
  );

  const headerTitle = "Trauma Form";
  const headerSubTitle = "Capture trauma details for zone decision.";

  const anyError = useMemo(
    () =>
      !!errors.traumaType || !!errors.fractureRegion || !!errors.fallHeight,
    [errors]
  );

  const updateSelectField = (name: keyof TraumaFormType, value: string) => {
    const normalized = toNullString(value) as string;
    setTrauma((prev) => ({ ...prev, [name]: normalized as any }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const toggleBoolField = (name: TraumaBoolKey) => {
    setTrauma((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNext = () => {
    const newErrors = validateTraumaForm(trauma);

    if (
      newErrors.traumaType ||
      newErrors.fractureRegion ||
      newErrors.fallHeight
    ) {
      setErrors(newErrors);
      setFormData((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          trauma: newErrors,
        },
      }));
      dispatch(showError("Please correct highlighted fields"));
      return;
    }

    if (!validateTraumaData(trauma)) {
      dispatch(showError("Invalid trauma data format"));
      return;
    }

    const zone = getTraumaZone(trauma);

    setFormData((prev) => ({
      ...prev,
      lastKnownSequence: TriageLastKnownSequence.TRAUMA,
      trauma,
      zone,
    }));

    navigation.navigate("TriageZoneForm" as never);
  };

  const renderError = (msg?: string | null) =>
    !!msg ? <Text style={styles.errorText}>{msg}</Text> : null;

  // Small checkbox-looking toggle WITH tick
  const BoolToggle: React.FC<{ label: string; field: TraumaBoolKey }> = ({
    label,
    field,
  }) => {
    const isOn = trauma[field];
    return (
      <TouchableOpacity
        style={[styles.boolItem, isOn && styles.boolItemActive]}
        onPress={() => toggleBoolField(field)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkboxBox, isOn && styles.checkboxBoxActive]}>
          {isOn && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={[styles.boolLabel, isOn && styles.boolLabelActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenWrap}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        extraScrollHeight={Platform.OS === "ios" ? 80 : 120}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{headerTitle}</Text>
        <Text style={styles.subtitle}>{headerSubTitle}</Text>

        {/* Top selects in grid */}
        <View style={styles.gridRow}>
          {/* Trauma Type */}
          <View style={styles.gridItem}>
            <Text style={styles.label}>Trauma Type</Text>
            <View style={[styles.pickerWrap, styles.inputBg]}>
              <Picker
                style={styles.picker}
                dropdownIconColor="#0f172a"
                selectedValue={trauma.traumaType}
                onValueChange={(v) =>
                  updateSelectField("traumaType", String(v))
                }
              >
                <Picker.Item
                  label="Select Trauma Type"
                  value=""
                  color="#9ca3af"
                />
                <Picker.Item label="Gun-Shot" value="gun shot" />
                <Picker.Item label="Fall" value="fall" />
                <Picker.Item label="Chest" value="chest" />
                <Picker.Item label="Stab Wound" value="stab" />
                <Picker.Item
                  label="Sexual Assault"
                  value="sexual assault"
                />
                <Picker.Item label="Vehicle" value="vehicle" />
                <Picker.Item
                  label="Major Vascular Injury"
                  value="major vascular injury"
                />
                <Picker.Item
                  label="Multiple Injuries"
                  value="multiple injuries"
                />
                <Picker.Item
                  label="Significant Assault"
                  value="significant assault"
                />
              </Picker>
            </View>
            {renderError(errors.traumaType)}
          </View>

          {/* Stab severity */}
          {trauma.traumaType === "stab" && (
            <View style={styles.gridItem}>
              <Text style={styles.label}>Stab Injury Severity</Text>
              <View style={[styles.pickerWrap, styles.inputBg]}>
                <Picker
                  style={styles.picker}
                  dropdownIconColor="#0f172a"
                  selectedValue={trauma.stabInjurySeverity}
                  onValueChange={(v) =>
                    updateSelectField("stabInjurySeverity", String(v))
                  }
                >
                  <Picker.Item
                    label="Select Severity"
                    value=""
                    color="#9ca3af"
                  />
                  <Picker.Item
                    label="Superficial Wound"
                    value="superficial wound"
                  />
                  <Picker.Item label="Deep Wound" value="deep wound" />
                  <Picker.Item
                    label="Penetrating Wound"
                    value="penetrating wound"
                  />
                  <Picker.Item
                    label="Organ Injury"
                    value="organ injury"
                  />
                  <Picker.Item
                    label="Major Blood Vessel Injury"
                    value="major blood vessel injury"
                  />
                </Picker>
              </View>
            </View>
          )}

          {/* Stab location */}
          {trauma.traumaType === "stab" && (
            <View style={styles.gridItem}>
              <Text style={styles.label}>Stab Injury Location</Text>
              <View style={[styles.pickerWrap, styles.inputBg]}>
                <Picker
                  style={styles.picker}
                  dropdownIconColor="#0f172a"
                  selectedValue={trauma.stabInjuryLocation}
                  onValueChange={(v) =>
                    updateSelectField("stabInjuryLocation", String(v))
                  }
                >
                  <Picker.Item
                    label="Select Location"
                    value=""
                    color="#9ca3af"
                  />
                  <Picker.Item label="Head" value="head" />
                  <Picker.Item label="Chest" value="chest" />
                  <Picker.Item label="Abdomen" value="abdomen" />
                  <Picker.Item label="Groin" value="groin" />
                  <Picker.Item label="Extremity" value="extremity" />
                </Picker>
              </View>
            </View>
          )}

          {/* Chest injury type */}
          {trauma.traumaType === "chest" && (
            <View style={styles.gridItem}>
              <Text style={styles.label}>Chest Injury Type</Text>
              <View style={[styles.pickerWrap, styles.inputBg]}>
                <Picker
                  style={styles.picker}
                  dropdownIconColor="#0f172a"
                  selectedValue={trauma.chestInjuryType}
                  onValueChange={(v) =>
                    updateSelectField("chestInjuryType", String(v))
                  }
                >
                  <Picker.Item
                    label="Select Chest Injury"
                    value=""
                    color="#9ca3af"
                  />
                  <Picker.Item
                    label="Surgical Emphysema"
                    value="surgical emphysema"
                  />
                  <Picker.Item
                    label="Rib Fracture"
                    value="rib fracture"
                  />
                  <Picker.Item
                    label="Seat Belt Fracture"
                    value="seat belt fracture"
                  />
                  <Picker.Item
                    label="Lung Puncture"
                    value="lung puncture"
                  />
                  <Picker.Item
                    label="Internal Bleeding"
                    value="internal bleeding"
                  />
                  <Picker.Item
                    label="Pneumothorax"
                    value="pneumothorax"
                  />
                </Picker>
              </View>
            </View>
          )}

          {/* Fall height */}
          {trauma.traumaType === "fall" && (
            <View style={styles.gridItem}>
              <Text style={styles.label}>Fall Height</Text>
              <View style={[styles.pickerWrap, styles.inputBg]}>
                <Picker
                  style={styles.picker}
                  dropdownIconColor="#0f172a"
                  selectedValue={trauma.fallHeight}
                  onValueChange={(v) =>
                    updateSelectField("fallHeight", String(v))
                  }
                >
                  <Picker.Item
                    label="Select Fall Height"
                    value=""
                    color="#9ca3af"
                  />
                  <Picker.Item
                    label="> 3 times height of person"
                    value="fall more than 3 times height"
                  />
                  <Picker.Item
                    label="> 5 stairs"
                    value="fall more than 5 stairs"
                  />
                  <Picker.Item
                    label="< 3 times height of person"
                    value="fall less than 3 times height"
                  />
                  <Picker.Item
                    label="< 5 stairs"
                    value="fall less than 5 stairs"
                  />
                </Picker>
              </View>
              {renderError(errors.fallHeight)}
            </View>
          )}
        </View>

        {/* Stab location-specific groups */}
        {trauma.traumaType === "stab" &&
          trauma.stabInjuryLocation === "head" && (
            <View style={styles.inlineGrid}>
              <BoolToggle label="Face" field="stabHeadFace" />
              <BoolToggle label="Neck" field="stabHeadNeck" />
              <BoolToggle label="Scalp" field="stabHeadScalp" />
            </View>
          )}

        {trauma.traumaType === "stab" &&
          trauma.stabInjuryLocation === "chest" && (
            <View style={styles.inlineGrid}>
              <BoolToggle label="Heart" field="stabChestHeart" />
              <BoolToggle label="Lungs" field="stabChestLungs" />
              <BoolToggle
                label="Major Blood Vessels"
                field="stabChestMajorBloodVessels"
              />
            </View>
          )}

        {trauma.traumaType === "stab" &&
          trauma.stabInjuryLocation === "abdomen" && (
            <View style={styles.inlineGrid}>
              <BoolToggle
                label="Intestines"
                field="stabAbdomenIntestines"
              />
              <BoolToggle label="Kidneys" field="stabAbdomenKidneys" />
              <BoolToggle label="Liver" field="stabAbdomenLiver" />
              <BoolToggle label="Spleen" field="stabAbdomenSpleen" />
              <BoolToggle label="Stomach" field="stabAbdomenStomach" />
            </View>
          )}

        {trauma.traumaType === "stab" &&
          trauma.stabInjuryLocation === "extremity" && (
            <View style={styles.inlineGrid}>
              <BoolToggle label="Arm" field="stabExtremityArm" />
              <BoolToggle label="Leg" field="stabExtremityLeg" />
              <BoolToggle label="Muscles" field="stabExtremityMuscles" />
              <BoolToggle label="Nerves" field="stabExtremityNerves" />
              <BoolToggle label="Tendons" field="stabExtremityTendons" />
              <BoolToggle
                label="Blood Vessels"
                field="stabExtremityBloodVessels"
              />
            </View>
          )}

        {/* Fracture & region */}
        <View style={styles.gridRow}>
          <View style={styles.gridItemHalf}>
            <BoolToggle label="Fracture" field="fracture" />
          </View>

          {trauma.fracture && (
            <View style={styles.gridItemHalf}>
              <Text style={styles.label}>Fracture Region</Text>
              <View style={[styles.pickerWrap, styles.inputBg]}>
                <Picker
                  style={styles.picker}
                  dropdownIconColor="#0f172a"
                  selectedValue={trauma.fractureRegion}
                  onValueChange={(v) =>
                    updateSelectField("fractureRegion", String(v))
                  }
                >
                  <Picker.Item
                    label="Select Region"
                    value=""
                    color="#9ca3af"
                  />
                  <Picker.Item label="Pelvic Fracture" value="pelvic" />
                  <Picker.Item
                    label="Multiple Fractures"
                    value="multiple"
                  />
                  <Picker.Item
                    label="Open Fractures of Hand & Feet"
                    value="open hand and feet"
                  />
                  <Picker.Item
                    label="Open Fractures excluding Hand & Feet"
                    value="open fractures excluding hand and feet"
                  />
                  <Picker.Item
                    label="Closed Fractures of Hand & Feet"
                    value="closed hand and feet"
                  />
                  <Picker.Item
                    label="Isolated Long Bone Fracture"
                    value="isolated long bone fracture"
                  />
                  <Picker.Item
                    label="Isolated Small Bones of Hand and Feet"
                    value="isolated small bones of hand and feet"
                  />
                </Picker>
              </View>
              {renderError(errors.fractureRegion)}
              <Text style={styles.helperText}>
                For two or more long bone fractures use "Multiple Fractures".
              </Text>
            </View>
          )}
        </View>

        {/* Other boolean flags */}
        <View style={styles.inlineGrid}>
          <BoolToggle label="Amputation" field="amputation" />
          <BoolToggle label="Neck Swelling" field="neckSwelling" />
          <BoolToggle
            label="Minor Head Injury"
            field="minorHeadInjury"
          />
          <BoolToggle
            label="Abrasions/Laceration/Contusion/Bruises"
            field="abrasion"
          />
          <BoolToggle
            label="Suspected Abuse"
            field="suspectedAbuse"
          />
        </View>

        {/* Back / Next Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.secondaryBtn]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn]}
            onPress={handleNext}
          >
            <Text style={styles.primaryText}>Next</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Fixed footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"dashboard"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}
    </View>
  );
};

export default TriageTraumaScreen;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const INPUT_HEIGHT = 52; // taller so text is not cut

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  gridItem: {
    width: "48%",
    marginBottom: 12,
  },
  gridItemHalf: {
    width: "100%",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 6,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
    height: INPUT_HEIGHT,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  inputBg: {
    backgroundColor: "#f8fafc",
  },
  picker: {
    height: INPUT_HEIGHT,
    fontSize: 10,
    color: "#0f172a",
  },
  inlineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  boolItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 8,
    backgroundColor: "#ffffff",
    minHeight: INPUT_HEIGHT, // same height feel as inputs
  },
  boolItemActive: {
    borderColor: "#14b8a6",
    backgroundColor: "#ecfdf5",
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    marginRight: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxActive: {
    borderColor: "#14b8a6",
    backgroundColor: "#14b8a6",
  },
  checkboxTick: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
  boolLabel: {
    fontSize: 13,
    color: "#0f172a",
    flexShrink: 1,
    lineHeight: 16,
  },
  boolLabelActive: {
    color: "#065f46",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 4,
  },
  helperText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 108,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#14b8a6",
    marginLeft: 8,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginRight: 8,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  navShield: {
    backgroundColor: "#ffffff",
    width: "100%",
  },
});
