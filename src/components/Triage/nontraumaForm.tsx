// src/screens/TriageNonTraumaScreen.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";


import { useTriageForm } from "./context/triageFormContext";
import {
  TriageLastKnownSequence,
  type NonTraumaFormType,
  type NonTraumaErrorsType,
} from "./context/triageFormContext";
import { zoneType } from "../../utils/role";
import Footer from "../dashboard/footer";

type Nav = ReturnType<typeof useNavigation>;

/* -------------------------------------------------------------------------- */
/*                           Validation + Zone Helpers                        */
/* -------------------------------------------------------------------------- */

const validateForm = (data: NonTraumaFormType): NonTraumaErrorsType => {
  const errors: NonTraumaErrorsType = {
    poisoningCause: "",
    burnPercentage: "",
    feverSymptoms: "",
    pregnancyIssue: "",
    trimester: "",
    internalBleedingCause: "",
  };

  if (data.poisoning && data.poisoningCause === "")
    errors.poisoningCause = "This field is required.";

  if (data.burn && !data.burnPercentage)
    errors.burnPercentage = "This field is required.";

  if (data.pregnancy && !data.trimester)
    errors.trimester = "This field is required.";

  if (data.internalBleeding && !data.internalBleedingCause)
    errors.internalBleedingCause = "This field is required.";

  if (data.burn && isNaN(parseFloat(data.burnPercentage)))
    errors.burnPercentage = "Burn percentage should be numeric.";
  else if (
    data.burn &&
    (parseFloat(data.burnPercentage) > 100 ||
      parseFloat(data.burnPercentage) < 0)
  )
    errors.burnPercentage = "Burn percent must be between 0 and 100";

  if (data.fever && !data.feverSymptoms)
    errors.feverSymptoms = "This field is required.";

  return errors;
};

// Same keys as validateNonTraumaData in your server snippet
const validateNonTraumaDataShape = (data: NonTraumaFormType): boolean => {
  const keys: (keyof NonTraumaFormType)[] = [
    "pregnancy",
    "breathlessness",
    "edema",
    "internalBleeding",
    "poisoning",
    "burn",
    "hanging",
    "drowning",
    "electrocution",
    "heatStroke",
    "fever",
    "drugOverdose",
    "stoolPass",
    "urinePass",
    "swellingWound",
    "dizziness",
    "headache",
    "coughCold",
    "skinRash",
    "medicoLegalExamination",
  ];
  return keys.every(
    (k) => k in data && typeof (data as any)[k] !== "undefined"
  );
};

// Approximation of evalNonTraumaZone – adjust rules to match your backend
const getNonTraumaZone = (data: NonTraumaFormType): number => {
  // Strong red flags
  if (
    data.hanging ||
    data.drowning ||
    data.electrocution ||
    data.internalBleeding ||
    data.burn ||
    data.drugOverdose
  ) {
    return zoneType.red;
  }

  // Medium severity
  if (
    data.breathlessness ||
    data.heatStroke ||
    data.poisoning ||
    data.fever
  ) {
    return zoneType.yellow;
  }

  // Everything else
  return zoneType.green;
};

/* -------------------------------------------------------------------------- */
/*                               Screen Component                             */
/* -------------------------------------------------------------------------- */

const TriageNonTraumaScreen: React.FC = () => {
  const { formData, setFormData } = useTriageForm();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [nonTrauma, setNonTrauma] = useState<NonTraumaFormType>(
    formData.nonTrauma
  );
  const [errors, setErrors] = useState<NonTraumaErrorsType>({
    poisoningCause: "",
    burnPercentage: "",
    feverSymptoms: "",
    pregnancyIssue: "",
    trimester: "",
    internalBleedingCause: "",
  });

  useEffect(() => {
    setFormData((p) => ({
      ...p,
      lastKnownSequence: TriageLastKnownSequence.NON_TRAUMA,
    }));
  }, [setFormData]);

  const updateField = <K extends keyof NonTraumaFormType>(
    key: K,
    value: NonTraumaFormType[K]
  ) => {
    let updated: NonTraumaFormType = {
      ...nonTrauma,
      [key]: value,
    };

    // Preserve web logic: reset pregnancy-related when not pregnant
    if (!updated.pregnancy) {
      updated.trimester = "null";
      updated.pregnancyIssue = "null";
    }

    // For consistency with your initial context, set "null" for empty select-like fields
    if (!updated.internalBleeding) {
      updated.internalBleedingCause = "null";
    }
    if (!updated.poisoning) {
      updated.poisoningCause = "null";
    }
    if (!updated.burn) {
      updated.burnPercentage = "null";
    }
    if (!updated.fever) {
      updated.feverSymptoms = "null";
    }

    const nextErrors = validateForm(updated);
    setNonTrauma(updated);
    setErrors(nextErrors);
  };

  const handleToggle = (key: keyof NonTraumaFormType) => {
    const current = nonTrauma[key];
    if (typeof current === "boolean") {
      updateField(key, !current as any);
    }
  };

  const handleSubmit = () => {
    const validationErrors = validateForm(nonTrauma);
    setErrors(validationErrors);

    const hasErrors = Object.values(validationErrors).some((e) => !!e);
    if (hasErrors) return;

    if (!validateNonTraumaDataShape(nonTrauma)) {
      return;
    }

    const zone = getNonTraumaZone(nonTrauma);
    setFormData((p) => ({
      ...p,
      nonTrauma,
      zone,
      lastKnownSequence: TriageLastKnownSequence.NON_TRAUMA,
    }));

    // Same as web: always go to zone-form
    navigation.navigate("TriageZoneForm" as never);
  };

  const goBack = () => navigation.goBack();

  const renderToggle = (label: string, key: keyof NonTraumaFormType) => {
    const isOn = !!nonTrauma[key];
    return (
      <TouchableOpacity
        key={String(key)}
        style={[styles.chip, isOn && styles.chipSelected]}
        onPress={() => handleToggle(key)}
      >
        <Text
          style={[styles.chipText, isOn && styles.chipTextSelected]}
          numberOfLines={2}
        >
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
        enableOnAndroid
        extraScrollHeight={Platform.OS === "ios" ? 80 : 120}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Non-Trauma Form</Text>
        <Text style={styles.subtitle}>
          Capture non-trauma details to decide the appropriate zone.
        </Text>

        {/* Pregnancy block */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Pregnancy</Text>
            <TouchableOpacity
              style={[
                styles.togglePill,
                nonTrauma.pregnancy && styles.togglePillOn,
              ]}
              onPress={() => handleToggle("pregnancy")}
            >
              <Text
                style={[
                  styles.toggleText,
                  nonTrauma.pregnancy && styles.toggleTextOn,
                ]}
              >
                {nonTrauma.pregnancy ? "YES" : "NO"}
              </Text>
            </TouchableOpacity>
          </View>

          {nonTrauma.pregnancy && (
            <>
              {/* Trimester */}
              <View style={styles.field}>
                <Text style={styles.label}>Trimester</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={
                      nonTrauma.trimester === "null" ? "" : nonTrauma.trimester
                    }
                    onValueChange={(val) =>
                      updateField(
                        "trimester",
                        (val === "" ? "null" : (val as string)) as any
                      )
                    }
                  >
                    <Picker.Item
                      label="Select Trimester"
                      value=""
                      color="#9ca3af"
                    />
                    <Picker.Item label="First" value="first" />
                    <Picker.Item label="Second" value="second" />
                    <Picker.Item label="Third" value="third" />
                  </Picker>
                </View>
                {!!errors.trimester && (
                  <Text style={styles.error}>{errors.trimester}</Text>
                )}
              </View>

              {/* Pregnancy Issue */}
              {nonTrauma.trimester !== "null" && (
                <View style={styles.field}>
                  <Text style={styles.label}>Pregnancy Issue</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={
                        nonTrauma.pregnancyIssue === "null"
                          ? ""
                          : nonTrauma.pregnancyIssue
                      }
                      onValueChange={(val) =>
                        updateField(
                          "pregnancyIssue",
                          (val === "" ? "null" : (val as string)) as any
                        )
                      }
                    >
                      <Picker.Item
                        label="Select Issue"
                        value=""
                        color="#9ca3af"
                      />
                      <Picker.Item
                        label="Abdominal Pain"
                        value="abdominal pain"
                      />
                      <Picker.Item
                        label="Vaginal Bleeding"
                        value="vaginal bleeding"
                      />
                      <Picker.Item label="Both" value="both" />
                    </Picker>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* If pregnancy flow completed, hide rest (same as web) */}
        {!(
          nonTrauma.pregnancy &&
          nonTrauma.trimester !== "null" &&
          nonTrauma.pregnancyIssue !== "null"
        ) && (
          <>
            {/* Main symptom chips */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Symptoms / Conditions</Text>
              <View style={styles.chipGrid}>
                {renderToggle("Breathlessness", "breathlessness")}
                {renderToggle("Edema", "edema")}
                {renderToggle("Internal Bleeding", "internalBleeding")}
                {renderToggle("Poisoning", "poisoning")}
                {renderToggle("Burn", "burn")}
                {renderToggle("Hanging", "hanging")}
                {renderToggle("Drowning", "drowning")}
                {renderToggle("Electrocution", "electrocution")}
                {renderToggle("Heat Stroke", "heatStroke")}
                {renderToggle("Fever", "fever")}
                {renderToggle("Drug Overdose", "drugOverdose")}
                {renderToggle("Stool Pass", "stoolPass")}
                {renderToggle("Urine Pass", "urinePass")}
                {renderToggle("Swelling / Wound", "swellingWound")}
                {renderToggle("Cough / Cold", "coughCold")}
                {renderToggle("Dizziness", "dizziness")}
                {renderToggle("Headache", "headache")}
                {renderToggle("Skin Rash", "skinRash")}
                {renderToggle(
                  "Medico-Legal Examination",
                  "medicoLegalExamination"
                )}
              </View>
            </View>

            {/* Dependent fields */}
            {nonTrauma.internalBleeding && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Bleeding Cause</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={
                      nonTrauma.internalBleedingCause === "null"
                        ? ""
                        : nonTrauma.internalBleedingCause
                    }
                    onValueChange={(val) =>
                      updateField(
                        "internalBleedingCause",
                        (val === "" ? "null" : (val as string)) as any
                      )
                    }
                  >
                    <Picker.Item
                      label="Select Cause"
                      value=""
                      color="#9ca3af"
                    />
                    <Picker.Item label="Nose & ENT" value="noseEnt" />
                    <Picker.Item label="Active" value="active" />
                    <Picker.Item label="P/R" value="pr" />
                  </Picker>
                </View>
                {!!errors.internalBleedingCause && (
                  <Text style={styles.error}>
                    {errors.internalBleedingCause}
                  </Text>
                )}
              </View>
            )}

            {nonTrauma.poisoning && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Poisoning Cause</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={
                      nonTrauma.poisoningCause === "null"
                        ? ""
                        : nonTrauma.poisoningCause
                    }
                    onValueChange={(val) =>
                      updateField(
                        "poisoningCause",
                        (val === "" ? "null" : (val as string)) as any
                      )
                    }
                  >
                    <Picker.Item
                      label="Select Cause"
                      value=""
                      color="#9ca3af"
                    />
                    <Picker.Item label="Snake" value="snake" />
                    <Picker.Item label="Scorpion" value="scorpion" />
                    <Picker.Item label="Others" value="others" />
                  </Picker>
                </View>
                {!!errors.poisoningCause && (
                  <Text style={styles.error}>{errors.poisoningCause}</Text>
                )}
              </View>
            )}

            {nonTrauma.burn && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Burn Percentage</Text>
                <TextInput
                  style={styles.input}
                  value={
                    nonTrauma.burnPercentage === "null"
                      ? ""
                      : nonTrauma.burnPercentage
                  }
                  onChangeText={(val) =>
                    updateField(
                      "burnPercentage",
                      val.trim() === "" ? "null" : val
                    )
                  }
                  keyboardType="numeric"
                  placeholder="Enter % (0 - 100)"
                  placeholderTextColor="#9ca3af"
                />
                {!!errors.burnPercentage && (
                  <Text style={styles.error}>{errors.burnPercentage}</Text>
                )}
              </View>
            )}

            {nonTrauma.fever && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Fever Symptoms</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={
                      nonTrauma.feverSymptoms === "null"
                        ? ""
                        : nonTrauma.feverSymptoms
                    }
                    onValueChange={(val) =>
                      updateField(
                        "feverSymptoms",
                        (val === "" ? "null" : (val as string)) as any
                      )
                    }
                  >
                    <Picker.Item
                      label="Select Symptom"
                      value=""
                      color="#9ca3af"
                    />
                    <Picker.Item label="Headache" value="headache" />
                    <Picker.Item label="Chest Pain" value="chest pain" />
                    <Picker.Item label="Jaundice" value="jaundice" />
                    <Picker.Item label="Chemotherapy" value="chemotherapy" />
                    <Picker.Item label="HIV" value="hiv" />
                    <Picker.Item label="Diabetic" value="diabetic" />
                    <Picker.Item label="None" value="none" />
                  </Picker>
                </View>
                {!!errors.feverSymptoms && (
                  <Text style={styles.error}>{errors.feverSymptoms}</Text>
                )}
              </View>
            )}
          </>
        )}

        {/* Back / Submit buttons (above footer) */}
        <View style={[styles.actionRow, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={goBack}
          >
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Fixed footer, shield for nav bar */}
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

export default TriageNonTraumaScreen;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 4,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    marginHorizontal: 4,
    marginVertical: 4,
    maxWidth: "48%",
  },
  chipSelected: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },
  chipText: {
    fontSize: 12,
    color: "#0f172a",
  },
  chipTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  togglePillOn: {
    borderColor: "#14b8a6",
    backgroundColor: "#ccfbf1",
  },
  toggleText: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "500",
  },
  toggleTextOn: {
    color: "#0f172a",
  },
  error: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  actionBtn: {
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
    backgroundColor: "#ffffff",
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
