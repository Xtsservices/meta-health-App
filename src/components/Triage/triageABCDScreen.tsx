import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useColorScheme,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";

import { zoneType } from "../../utils/role";
import { useTriageForm } from "./context/triageFormContext";
import { showError } from "../../store/toast.slice";
import Footer from "../dashboard/footer";

// ✅ responsive utils
import {
  SPACING,
  FONT_SIZE,
  FOOTER_HEIGHT,
  responsiveHeight,
} from "../../utils/responsive";

/* -------------------------------------------------------------------------- */
/*                        Local validation & zone helpers                     */
/* -------------------------------------------------------------------------- */
function validateABCDData(data: any) {
  const keys = [
    "radialPulse",
    "noisyBreathing",
    "activeSeizures",
    "cSpineInjury",
    "stridor",
    "angioedema",
    "activeBleeding",
    "incompleteSentences",
    "capillaryRefill",
    "alteredSensorium",
  ];
  return keys.every(
    (k) =>
      k in data &&
      data[k] !== undefined &&
      data[k] !== null &&
      data[k] !== ""
  );
}

function getZoneByABCD({ vitals, abcd }: any): number {
  if (abcd.activeBleeding === "yes" && abcd.activeBleedingType === "major")
    return zoneType.red;
  if (abcd.alteredSensorium === "yes" || abcd.activeSeizures === "yes")
    return zoneType.red;
  if (abcd.stridor === "yes" || abcd.angioedema === "yes")
    return zoneType.yellow;
  if (vitals.oxygen < 90) return zoneType.yellow;
  return zoneType.green;
}

/* -------------------------------------------------------------------------- */
/*                               Screen Component                             */
/* -------------------------------------------------------------------------- */
const TriageABCDScreen: React.FC = () => {
  const { formData, setFormData } = useTriageForm();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const styles = useMemo(() => createStyles(isDarkMode), [isDarkMode]);

  const [abcd, setAbcd] = useState(formData.abcd);
  const [errors, setErrors] = useState<any>({});

  const yesNo = ["yes", "no"];
  const radialPulseOpts = ["present", "absent"];
  const capRefillOpts = ["<2s", ">2s"];

  const updateField = (key: string, val: string) => {
    setAbcd((p: any) => ({ ...p, [key]: val }));
    setErrors((p: any) => ({ ...p, [key]: "" }));
  };

  const validateField = (key: string, val: string) => {
    if (!val) return "This field is required";
    return "";
  };

  const handleNext = () => {
    const newErrors: any = {};

    Object.keys(abcd).forEach((k) => {
      // skip optional field when not needed
      if (k === "activeBleedingType" && abcd.activeBleeding !== "yes") return;
      const err = validateField(k, (abcd as any)[k]);
      if (err) newErrors[k] = err;
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      dispatch(showError("Please fill all required fields"));
      return;
    }

    if (!validateABCDData(abcd)) {
      dispatch(showError("Invalid ABCD Data"));
      return;
    }

    const zone = getZoneByABCD({ vitals: formData.vitals, abcd });
    setFormData((p) => ({ ...p, abcd, zone }));

    if (zone === zoneType.red) navigation.navigate("TriageZoneForm" as never);
    else navigation.navigate("TriageGCSForm" as never);
  };

  const renderChipRow = (
    label: string,
    key: keyof typeof abcd,
    options: string[]
  ) => (
    <View style={styles.fieldHalf}>
      <Text style={styles.label}>{label}<Text> *</Text></Text>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              abcd[key] === opt && styles.chipSelected,
            ]}
            onPress={() =>
              updateField(key as string, abcd[key] === opt ? "" : opt)
            }
          >
            <Text
              style={[
                styles.chipText,
                abcd[key] === opt && styles.chipTextSelected,
              ]}
            >
              {opt.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!errors[key] && <Text style={styles.error}>{errors[key]}</Text>}
    </View>
  );

  return (
    <View style={styles.screenWrap}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // enough space so Back/Next scroll above footer
            paddingBottom: FOOTER_HEIGHT * 2 + SPACING.xxl + insets.bottom,
          },
        ]}
        extraScrollHeight={Platform.OS === "ios" ? SPACING.lg : SPACING.xl}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>ABCD Assessment</Text>
        <Text style={styles.subtitle}>Record the patient’s ABCD details</Text>

        {/* two-column grid */}
        <View style={styles.rowWrap}>
          {renderChipRow("Radial Pulse", "radialPulse", radialPulseOpts)}
          {renderChipRow("Altered Sensorium", "alteredSensorium", yesNo)}
        </View>

        <View style={styles.rowWrap}>
          {renderChipRow("Active Bleeding", "activeBleeding", yesNo)}
          {abcd.activeBleeding === "yes" && (
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Active Bleeding Type<Text style={styles.requiredMark}> *</Text></Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={abcd.activeBleedingType}
                  onValueChange={(v) => updateField("activeBleedingType", v)}
                  style={styles.pickerText}
                  dropdownIconColor={"#0f172a"}
                  
                >
                  <Picker.Item
                    label="Select Type"
                    value=""
                    
                  />
                  <Picker.Item
                    label="Major"
                    value="major"
                    
                  />
                  <Picker.Item
                    label="Minor"
                    value="minor"
                  />
                </Picker>
              </View>
              {!!errors.activeBleedingType && (
                <Text style={styles.error}>{errors.activeBleedingType}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.rowWrap}>
          {renderChipRow("Stridor", "stridor", yesNo)}
          {renderChipRow("Angioedema", "angioedema", yesNo)}
        </View>

        <View style={styles.rowWrap}>
          {renderChipRow("C Spine Injury", "cSpineInjury", yesNo)}
          {renderChipRow("Active Seizures", "activeSeizures", yesNo)}
        </View>

        <View style={styles.rowWrap}>
          {renderChipRow(
            "Talking in incomplete sentences",
            "incompleteSentences",
            yesNo
          )}
          {renderChipRow("Noisy Breathing", "noisyBreathing", yesNo)}
        </View>

        <View style={styles.rowWrap}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>Capillary Refill<Text style={styles.requiredMark}> *</Text></Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={abcd.capillaryRefill}
                onValueChange={(v) => updateField("capillaryRefill", v)}
                style={styles.pickerText}
                dropdownIconColor={ "#0f172a"}
              >
                <Picker.Item
                  label="Select Refill"
                  value=""
                  
                />
                {capRefillOpts.map((opt) => (
                  <Picker.Item
                    key={opt}
                    label={
                      opt === "<2s" ? "less than 2s" : "more than 2s"
                    }
                    value={opt}
                    
                  />
                ))}
              </Picker>
            </View>
            {!!errors.capillaryRefill && (
              <Text style={styles.error}>{errors.capillaryRefill}</Text>
            )}
          </View>
        </View>

        {/* Back / Next buttons inside scrollable content */}
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.secondaryBtn]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerBtn, styles.primaryBtn]}
            onPress={handleNext}
          >
            <Text style={styles.primaryText}>Next</Text>
          </TouchableOpacity>
        </View>
         <View style={{ height: FOOTER_HEIGHT + insets.bottom + SPACING.lg }} />
      </KeyboardAwareScrollView>

      {/* Fixed footer at bottom using dynamic FOOTER_HEIGHT */}
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

export default TriageABCDScreen;

/* -------------------------------------------------------------------------- */
/*                                Styles (bottom)                             */
/* -------------------------------------------------------------------------- */
function createStyles(isDark: boolean) {
  return StyleSheet.create({
    screenWrap: {
      flex: 1,
      backgroundColor:  "#ffffff",
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.lg,
      flexGrow: 1,
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontWeight: "700",
      color: "#0f172a",
    },
    subtitle: {
      fontSize: FONT_SIZE.sm,
      color:  "#64748b",
      marginBottom: SPACING.lg,
    },
    rowWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    fieldHalf: {
      width: "48%",
      marginBottom: SPACING.md,
    },
    label: {
      fontSize: FONT_SIZE.sm,
      color:  "#0f172a",
      marginBottom: SPACING.xs * 0.6,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    chip: {
      paddingVertical: SPACING.xs * 0.6,
      paddingHorizontal: SPACING.sm,
      borderRadius: SPACING.md,
      borderWidth: 1,
      borderColor:  "#cbd5e1",
      backgroundColor:  "#f8fafc",
      marginRight: SPACING.xs,
      marginBottom: SPACING.xs,
    },
    chipSelected: {
      backgroundColor: "#14b8a6",
      borderColor: "#14b8a6",
    },
    chipText: {
      fontSize: FONT_SIZE.sm,
      color:  "#0f172a",
    },
    chipTextSelected: {
      color: "#ffffff",
      fontWeight: "600",
    },
    pickerWrap: {
      borderWidth: 1,
      borderColor:  "#cbd5e1",
      borderRadius: SPACING.sm,
      overflow: "hidden",
      backgroundColor: "#f8fafc",
    },
    pickerText: {
      color: "#0f172a",
      fontSize: FONT_SIZE.sm,
    },
    error: {
      fontSize: FONT_SIZE.xs,
      color: "#dc2626",
      marginTop: SPACING.xs * 0.4,
    },
    footerButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: SPACING.lg,
    },
    footerBtn: {
      flex: 1,
      height: responsiveHeight(6),
      borderRadius: SPACING.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtn: {
      backgroundColor: "#14b8a6",
      marginLeft: SPACING.xs,
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor:  "#cbd5e1",
      marginRight: SPACING.xs,
      backgroundColor:  "#ffffff",
    },
    primaryText: {
      color: "#ffffff",
      fontSize: FONT_SIZE.md,
      fontWeight: "600",
    },
    secondaryText: {
      color:  "#0f172a",
      fontSize: FONT_SIZE.md,
      fontWeight: "600",
    },
    footerWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      height: FOOTER_HEIGHT,
    },
    navShield: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#ffffff",
    },
    requiredMark: {
   color: "#dc2626",
 },
  });
}
