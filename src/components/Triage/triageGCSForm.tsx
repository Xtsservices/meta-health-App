import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";

import { useTriageForm } from "./context/triageFormContext";
import { zoneType } from "../../utils/role";
import { showError } from "../../store/toast.slice";
import Footer from "../dashboard/footer";

/* -------------------------------------------------------------------------- */
/*                        Local validation & zone helpers                     */
/* -------------------------------------------------------------------------- */

type GcsLocalType = {
  eyeMovement: string;
  verbalResponse: string;
  motorResponse: string;
  painScale: string; // keep as string locally for TextInput
};

const validateField = (name: keyof GcsLocalType, value: string): string => {
  switch (name) {
    case "painScale":
      if (!value) return "Please enter a valid number.";
      if (isNaN(Number(value))) return "Please enter a valid number.";
      const n = Number(value);
      if (n < 1 || n > 10) return "Pain scale should be between 1 and 10.";
      return "";
    case "eyeMovement":
    case "verbalResponse":
    case "motorResponse":
      if (!value) return "This field is required.";
      return "";
    default:
      return "";
  }
};

function validateGCSData(data: GcsLocalType): boolean {
  const keys: (keyof GcsLocalType)[] = [
    "eyeMovement",
    "verbalResponse",
    "motorResponse",
  ];
  return keys.every(
    (k) => data[k] !== undefined && data[k] !== null && data[k] !== ""
  );
}

// Map text -> numeric GCS score
function getGcsScore(data: GcsLocalType): number {
  const eyeMap: Record<string, number> = {
    spontaneous: 4,
    "to sound": 3,
    "to pressure": 2,
    none: 1,
  };
  const verbalMap: Record<string, number> = {
    oriented: 5,
    confused: 4,
    words: 3,
    sounds: 2,
    none: 1,
  };
  const motorMap: Record<string, number> = {
    "obey commands": 6,
    localising: 5,
    "normal flexion": 4,
    "abnormal flexion": 3,
    extension: 2,
    none: 1,
  };

  const eye = eyeMap[data.eyeMovement] ?? 0;
  const verbal = verbalMap[data.verbalResponse] ?? 0;
  const motor = motorMap[data.motorResponse] ?? 0;

  return eye + verbal + motor; // classic GCS sum
}

// Decide zone based on GCS score (you can tweak thresholds to match backend)
function getGcsZone(data: GcsLocalType): number {
  const score = getGcsScore(data);

  if (score <= 8) return zoneType.red; // severe
  if (score <= 12) return zoneType.yellow; // moderate
  return zoneType.green; // mild
}

/* -------------------------------------------------------------------------- */
/*                           Small GCS Score Badge UI                         */
/* -------------------------------------------------------------------------- */

const GcsScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  let color = "#22c55e";
  if (score <= 8) color = "#ef4444";
  else if (score <= 12) color = "#f59e0b";

  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <Text style={styles.scoreLabel}>GCS Score</Text>
      <Text style={[styles.scoreValue, { color }]}>{score || "-"}</Text>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Screen Component                             */
/* -------------------------------------------------------------------------- */

const TriageGcsScreen: React.FC = () => {
  const { formData, setFormData } = useTriageForm();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const initialGcs: GcsLocalType = {
    eyeMovement: formData.gcs.eyeMovement || "",
    verbalResponse: formData.gcs.verbalResponse || "",
    motorResponse: formData.gcs.motorResponse || "",
    painScale:
      formData.gcs.painScale !== "" ? String(formData.gcs.painScale) : "",
  };

  const [gcs, setGcs] = useState<GcsLocalType>(initialGcs);
  const [errors, setErrors] = useState<
    Partial<Record<keyof GcsLocalType, string>>
  >({});

  const score = useMemo(() => getGcsScore(gcs), [gcs]);

  const updateField = (name: keyof GcsLocalType, value: string) => {
    // only digits for painScale
    const cleaned = name === "painScale" ? value.replace(/[^0-9]/g, "") : value;

    setGcs((prev) => ({ ...prev, [name]: cleaned }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleNext = () => {
    const newErrors: Partial<Record<keyof GcsLocalType, string>> = {};

    (["eyeMovement", "verbalResponse", "motorResponse", "painScale"] as (
      | keyof GcsLocalType
    )[]).forEach((key) => {
      const val = gcs[key] ?? "";
      const err = validateField(key, val);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      dispatch(showError("Please correct highlighted errors"));
      return;
    }

    if (!validateGCSData(gcs)) {
      dispatch(showError("Invalid GCS data"));
      return;
    }

    const zone = getGcsZone(gcs);

    setFormData((prev) => ({
      ...prev,
      gcs: {
        eyeMovement: gcs.eyeMovement,
        verbalResponse: gcs.verbalResponse,
        motorResponse: gcs.motorResponse,
        painScale: gcs.painScale ? Number(gcs.painScale) : "",
      },
      zone,
    }));

    if (zone === zoneType.red) {
      navigation.navigate("TriageZoneForm" as never);
    } else {
      navigation.navigate("TriageType" as never);
    }
  };

  return (
    <View style={styles.screenWrap}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        extraScrollHeight={Platform.OS === "ios" ? 80 : 120}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>GCS Assessment</Text>
        <Text style={styles.subtitle}>
          Capture eye, verbal and motor response with pain scale.
        </Text>

        <GcsScoreBadge score={score} />

        {/* Row 1: Eye Movement + Verbal Response */}
        <View style={styles.rowWrap}>
          <View style={styles.fieldHalf}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Eye Movement</Text>
              <Text style={styles.mandatory}>*</Text>
            </View>
            <View style={[styles.pickerWrap, styles.inputBg]}>
              <Picker
                selectedValue={gcs.eyeMovement}
                onValueChange={(v) => updateField("eyeMovement", String(v))}
                style={styles.pickerText}
                dropdownIconColor="#0f172a"
              >
                <Picker.Item
                  label="Select Eye Movement"
                  value=""
                  color="#0000000"
                />
                <Picker.Item
                  label="Spontaneous"
                  value="spontaneous"
                  color="#0000000"
                />
                <Picker.Item
                  label="To Sound"
                  value="to sound"
                  color="#0000000"
                />
                <Picker.Item
                  label="To Pressure"
                  value="to pressure"
                  color="#0000000"
                />
                <Picker.Item label="None" value="none" color="#0000000" />
              </Picker>
            </View>
            {!!errors.eyeMovement && (
              <Text style={styles.error}>{errors.eyeMovement}</Text>
            )}
          </View>

          <View style={styles.fieldHalf}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Verbal Response</Text>
              <Text style={styles.mandatory}>*</Text>
            </View>
            <View style={[styles.pickerWrap, styles.inputBg]}>
              <Picker
                selectedValue={gcs.verbalResponse}
                onValueChange={(v) => updateField("verbalResponse", String(v))}
                style={styles.pickerText}
                dropdownIconColor="#0f172a"
              >
                <Picker.Item
                  label="Select Verbal Response"
                  value=""
                  color="#0000000"
                />
                <Picker.Item
                  label="Oriented"
                  value="oriented"
                  color="#0000000"
                />
                <Picker.Item
                  label="Confused"
                  value="confused"
                  color="#0000000"
                />
                <Picker.Item label="Words" value="words" color="#0000000" />
                <Picker.Item label="Sounds" value="sounds" color="#0000000" />
                <Picker.Item label="None" value="none" color="#0000000" />
              </Picker>
            </View>
            {!!errors.verbalResponse && (
              <Text style={styles.error}>{errors.verbalResponse}</Text>
            )}
          </View>
        </View>

        {/* Row 2: Motor Response + Pain Scale */}
        <View style={styles.rowWrap}>
          <View style={styles.fieldHalf}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Motor Response</Text>
              <Text style={styles.mandatory}>*</Text>
            </View>
            <View style={[styles.pickerWrap, styles.inputBg]}>
              <Picker
                selectedValue={gcs.motorResponse}
                onValueChange={(v) => updateField("motorResponse", String(v))}
                style={styles.pickerText}
                dropdownIconColor="#0f172a"
              >
                <Picker.Item
                  label="Select Motor Response"
                  value=""
                  color="#0000000"
                />
                <Picker.Item
                  label="Obey commands"
                  value="obey commands"
                  color="#0000000"
                />
                <Picker.Item
                  label="Localising"
                  value="localising"
                  color="#0000000"
                />
                <Picker.Item
                  label="Normal Flexion"
                  value="normal flexion"
                  color="#0000000"
                />
                <Picker.Item
                  label="Abnormal Flexion"
                  value="abnormal flexion"
                  color="#0000000"
                />
                <Picker.Item
                  label="Extension"
                  value="extension"
                  color="#0000000"
                />
                <Picker.Item label="None" value="none" color="#0000000" />
              </Picker>
            </View>
            {!!errors.motorResponse && (
              <Text style={styles.error}>{errors.motorResponse}</Text>
            )}
          </View>

          <View style={styles.fieldHalf}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Pain Scale (1–10)</Text>
              <Text style={styles.mandatory}>*</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.inputBg]}
              value={gcs.painScale}
              onChangeText={(v) => updateField("painScale", v)}
              keyboardType="numeric"
              placeholder="e.g. 5"
              placeholderTextColor="#9ca3af"
              maxLength={2}
            />
            {!!errors.painScale && (
              <Text style={styles.error}>{errors.painScale}</Text>
            )}
          </View>
        </View>

        {/* Back / Next Buttons (above footer) */}
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

      {/* Fixed footer at bottom */}
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

export default TriageGcsScreen;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: "#ffffff",
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
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  fieldHalf: {
    width: "48%",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: "#0f172a",
  },
  mandatory: {
    marginLeft: 3,
    fontSize: 13,
    color: "#000000",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
    height: 46,
    justifyContent: "center",
  },
  pickerText: {
    fontSize: 14,
    color: "#0f172a",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#0f172a",
    height: 46,
  },
  inputBg: {
    backgroundColor: "#f8fafc",
  },
  error: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
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
  scoreBadge: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginBottom: 20,
    backgroundColor: "#f8fafc",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "700",
  },
});
