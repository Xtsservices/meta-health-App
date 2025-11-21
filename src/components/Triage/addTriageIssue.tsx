// src/screens/triage/TriageVitalsScreen.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useNavigation } from "@react-navigation/native";
import { HeartPulse, Brain, Bed } from "lucide-react-native";

import { zoneType } from "../../utils/role";
import {
  TriageLastKnownSequence,
  useTriageForm,
  validateVitalsForm,
} from "./context/triageFormContext";
import TriageDialog from "./triageDialog";
import { showError } from "../../store/toast.slice";
import { useDispatch } from "react-redux";


type Nav = ReturnType<typeof useNavigation>;

type LocalVitals = {
  oxygen: string;
  pulse: string;
  temperature: string;
  bpH: string;
  bpL: string;
  respiratoryRate: string;
};

type VitalsData = {
  oxygen: number;
  pulse: number;
  temperature: number;
  bpH: number;
  bpL: number;
  respiratoryRate: number;
  time: string;
};

type ConditionKey = "chest pain" | "stroke" | "unconscious";

const CONDITION_META: Record<
  ConditionKey,
  { label: string; Icon: React.ComponentType<any>; bg: string }
> = {
  "chest pain": { label: "Chest Pain", Icon: HeartPulse, bg: "#fee2e2" },
  stroke: { label: "Stroke", Icon: Brain, bg: "#e0e7ff" },
  unconscious: { label: "Unconscious", Icon: Bed, bg: "#fef3c7" },
};

// --- Utils: validate data & get zone (local logic, no WebSocket) ---
const validateVitalData = (data: VitalsData): boolean => {
  const keys: (keyof VitalsData)[] = [
    "oxygen",
    "pulse",
    "temperature",
    "bpH",
    "bpL",
    "respiratoryRate",
    "time",
  ];
  return keys.every(
    (key) =>
      key in data &&
      typeof data[key] !== "undefined" &&
      data[key] !== null
  );
};

const getVitalZone = (data: VitalsData): number => {
  if (
    data.oxygen < 90 &&
    (data.respiratoryRate < 10 || data.respiratoryRate > 22)
  ) {
    return zoneType.red;
  }
  if (
    (data.pulse < 50 || data.pulse >= 120) &&
    (data.bpH < 90 || data.bpH > 220)
  ) {
    return zoneType.red;
  }
  if (data.temperature < 37.78 && (data.pulse < 50 || data.pulse >= 120)) {
    return zoneType.red;
  }
  if (data.oxygen < 90) {
    return zoneType.yellow;
  }
  return zoneType.green;
};

const TriageVitalsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { formData, setFormData } = useTriageForm();
const dispatch = useDispatch()
  // 3 tabs + dialog
  const [triageDialogVisible, setTriageDialogVisible] = useState(false);
  const [selectedCondition, setSelectedCondition] =
    useState<ConditionKey | null>(null);

  const [localVitals, setLocalVitals] = useState<LocalVitals>({
    oxygen: formData.vitals.oxygen ? String(formData.vitals.oxygen) : "",
    pulse: formData.vitals.pulse ? String(formData.vitals.pulse) : "",
    temperature: formData.vitals.temperature
      ? String(formData.vitals.temperature)
      : "",
    bpH: formData.vitals.bpH ? String(formData.vitals.bpH) : "",
    bpL: formData.vitals.bpL ? String(formData.vitals.bpL) : "",
    respiratoryRate: formData.vitals.respiratoryRate
      ? String(formData.vitals.respiratoryRate)
      : "",
  });

  useEffect(() => {
    // mark that we are on vitals step
    setFormData((prev) => ({
      ...prev,
      lastKnownSequence: TriageLastKnownSequence.VITALS,
    }));
  }, [setFormData]);

  const handleChange = (name: keyof LocalVitals, value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    setLocalVitals((prev) => ({ ...prev, [name]: sanitized }));
  };

  // --- Critical condition tabs ---
  const openConditionDialog = (cond: ConditionKey) => {
    setSelectedCondition(cond);
    setTriageDialogVisible(true);
  };

  const handleCriticalConditionSubmit = (wardId: string) => {
    if (!selectedCondition) return;

    setFormData((prev) => ({
      ...prev,
      criticalCondition: selectedCondition,
      ward: wardId,
      zone: zoneType.red,
      lastKnownSequence: TriageLastKnownSequence.CRITICAL_CONDITION,
    }));

    setTriageDialogVisible(false);
    // direct RED → zone form
    // navigation.navigate("TriageZoneForm" as never);
  };

  const handleNext = () => {
    const nextVitals: VitalsData = {
      oxygen: localVitals.oxygen ? Number(localVitals.oxygen) : 0,
      pulse: localVitals.pulse ? Number(localVitals.pulse) : 0,
      temperature: localVitals.temperature
        ? Number(localVitals.temperature)
        : 0,
      bpH: localVitals.bpH ? Number(localVitals.bpH) : 0,
      bpL: localVitals.bpL ? Number(localVitals.bpL) : 0,
      respiratoryRate: localVitals.respiratoryRate
        ? Number(localVitals.respiratoryRate)
        : 0,
      time: String(Date.now()),
    };

const { errors, hasErrors } = validateVitalsForm({
  vitals: nextVitals,
  isSubmission: true,
});

if (hasErrors) {
  // 1) Get the first non-empty error message
  const firstError = Object.values(errors).find((msg) => !!msg) as string | undefined;

  if (firstError) {
    dispatch(showError(firstError));
  }

  // 2) Also store all field errors in your form state if needed
  setFormData((prev) => ({
    ...prev,
    errors: {
      ...prev.errors,
      vitals: errors, // keep all field-level errors here
    },
  }));

  return; // stop submit
}

    // update context with new vitals + errors + lastKnownSequence
    setFormData((prev) => ({
      ...prev,
      vitals: nextVitals,
      lastKnownSequence: TriageLastKnownSequence.VITALS,
      errors: {
        ...prev.errors,
        vitals: errors,
      },
    }));

    if (hasErrors) {
      return;
    }

    // Local zone calculation
    if (!validateVitalData(nextVitals)) {
      // If somehow invalid, just go green & forward
      setFormData((prev) => ({ ...prev, zone: zoneType.green }));
      navigation.navigate("TriageAbcd" as never);
      return;
    }

    const zone = getVitalZone(nextVitals);
    setFormData((prev) => ({ ...prev, zone }));
    if (zone === zoneType.red) {
      navigation.navigate("TriageZoneForm" as never);
    } else {
      navigation.navigate("TriageABCD" as never);
    }
  };

  const goBack = () => navigation.goBack();

  return (
    <>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        enableOnAndroid
        extraScrollHeight={Platform.OS === "ios" ? 80 : 120}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== Critical Condition Tabs ===== */}
        <Text style={styles.sectionTitle}>Critical Condition</Text>
        <Text style={styles.sectionSubtitle}>
          Select a condition to assign an appropriate ward.
        </Text>

        <View style={styles.tabRow}>
          {(Object.keys(CONDITION_META) as ConditionKey[]).map((key) => {
            const meta = CONDITION_META[key];
            const Icon = meta.Icon;
            const isActive = key === selectedCondition;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tab,
                  isActive && styles.tabActive,
                  { backgroundColor: meta.bg },
                ]}
                onPress={() => openConditionDialog(key)}
                activeOpacity={0.9}
              >
                <Icon size={20} color="#0f172a" />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===== Vitals Section ===== */}
        <Text style={styles.title}>Vitals</Text>
        <Text style={styles.subtitle}>Enter current patient vitals.</Text>

        {/* Row 1: Oxygen, BP High */}
        <View style={styles.row}>
          <View style={styles.fieldWrapHalf}>
            <Text style={styles.label}>Oxygen (%)</Text>
            <TextInput
              style={styles.input}
              value={localVitals.oxygen}
              onChangeText={(v) => handleChange("oxygen", v)}
              keyboardType="numeric"
              placeholder="e.g. 96"
              placeholderTextColor="#94a3b8"
            />
            {!!formData.errors.vitals.oxygen && (
              <Text style={styles.errorText}>
                {formData.errors.vitals.oxygen}
              </Text>
            )}
          </View>

          <View style={styles.fieldWrapHalf}>
            <Text style={styles.label}>BP High (mmHg)</Text>
            <TextInput
              style={styles.input}
              value={localVitals.bpH}
              onChangeText={(v) => handleChange("bpH", v)}
              keyboardType="numeric"
              placeholder="e.g. 120"
              placeholderTextColor="#94a3b8"
            />
            {!!formData.errors.vitals.bpH && (
              <Text style={styles.errorText}>
                {formData.errors.vitals.bpH}
              </Text>
            )}
          </View>
        </View>

        {/* Row 2: BP Low, Pulse */}
        <View style={styles.row}>
          <View style={styles.fieldWrapHalf}>
            <Text style={styles.label}>BP Low (mmHg)</Text>
            <TextInput
              style={styles.input}
              value={localVitals.bpL}
              onChangeText={(v) => handleChange("bpL", v)}
              keyboardType="numeric"
              placeholder="e.g. 80"
              placeholderTextColor="#94a3b8"
            />
            {!!formData.errors.vitals.bpL && (
              <Text style={styles.errorText}>
                {formData.errors.vitals.bpL}
              </Text>
            )}
          </View>

          <View style={styles.fieldWrapHalf}>
            <Text style={styles.label}>Pulse (bpm)</Text>
            <TextInput
              style={styles.input}
              value={localVitals.pulse}
              onChangeText={(v) => handleChange("pulse", v)}
              keyboardType="numeric"
              placeholder="e.g. 78"
              placeholderTextColor="#94a3b8"
            />
            {!!formData.errors.vitals.pulse && (
              <Text style={styles.errorText}>
                {formData.errors.vitals.pulse}
              </Text>
            )}
          </View>
        </View>

        {/* Row 3: Temperature, Respiratory Rate */}
        <View style={styles.row}>
          <View style={styles.fieldWrapHalf}>
            <Text style={styles.label}>Temperature (°C)</Text>
            <TextInput
              style={styles.input}
              value={localVitals.temperature}
              onChangeText={(v) => handleChange("temperature", v)}
              keyboardType="numeric"
              placeholder="e.g. 37.5"
              placeholderTextColor="#94a3b8"
            />
            {!!formData.errors.vitals.temperature && (
              <Text style={styles.errorText}>
                {formData.errors.vitals.temperature}
              </Text>
            )}
          </View>

          <View style={styles.fieldWrapHalf}>
            <Text style={styles.label}>Respiratory Rate (/min)</Text>
            <TextInput
              style={styles.input}
              value={localVitals.respiratoryRate}
              onChangeText={(v) => handleChange("respiratoryRate", v)}
              keyboardType="numeric"
              placeholder="e.g. 18"
              placeholderTextColor="#94a3b8"
            />
            {!!formData.errors.vitals.respiratoryRate && (
              <Text style={styles.errorText}>
                {formData.errors.vitals.respiratoryRate}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom buttons */}
        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={goBack}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryText}>Next</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Critical condition dialog */}
      <TriageDialog
        visible={triageDialogVisible}
        condition={selectedCondition}
        onClose={() => setTriageDialogVisible(false)}
        onSubmit={handleCriticalConditionSubmit}
      />
    </>
  );
};

export default TriageVitalsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabActive: {
    borderWidth: 1.2,
    borderColor: "#0f172a",
  },
  tabLabel: {
    flexShrink: 1,
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#0b1120",
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  fieldWrapHalf: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 4,
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
  errorText: {
    marginTop: 4,
    fontSize: 11,
    color: "#dc2626",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  secondaryBtn: {
    flex: 1,
    marginRight: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    marginLeft: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
});
