import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import { showError, showSuccess } from "../../../store/toast.slice";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
import { Switch } from "react-native";
import Footer from "../../dashboard/footer";

const { width, height } = Dimensions.get("window");

// Responsive sizing functions
const wp = (percentage: number) => (percentage * width) / 100;
const hp = (percentage: number) => (percentage * height) / 100;
const fs = (size: number) => Math.min(size, wp(size / 4));

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  field: "#ffffff",
  brand: "#14b8a6",
  brandDark: "#0ea5a3",
  red: "#ef4444",
  label: "#0f172a",
  chip: "#eef2f7",
  focus: "#3b82f6",
};

const fieldBg = {
  temp: "#fff7ed",
  hr: "#eff6ff",
  spo2: "#f5f3ff",
  rr: "#ecfdf5",
  bp: "#fef2f2",
  hrv: "#fdf4ff",
  time: "#f8fafc",
};

const FOOTER_H = hp(8.5);

type VitalsForm = {
  temperature?: string;
  temperatureTime?: string;

  pulse?: string;
  pulseTime?: string;

  oxygen?: string;
  oxygenTime?: string;

  respiratoryRate?: string;
  respiratoryRateTime?: string;

  bpH?: string;
  bpL?: string;
  bpTime?: string;

  hrv?: string;
  hrvTime?: string;
};

const VITAL_LIMITS: Partial<
  Record<
    keyof VitalsForm,
    { min: number; max: number }
  >
> = {
  temperature:     { min: 20, max: 45 },   // °C
  pulse:           { min: 30, max: 220 },  // bpm
  oxygen:          { min: 50, max: 100 },  // %
  respiratoryRate: { min: 1,  max: 60 },   // breaths/min
  bpH:             { min: 30, max: 250 },  // systolic
  bpL:             { min: 30, max: 150 },  // diastolic
  hrv:             { min: 20, max: 300 },  // ms
};



/** ---------- Time Picker (HH:MM) ---------- */
function TimePickerField({
  label,
  value,
  onChange,
  bg,
}: {
  label: string;
  value?: string;
  onChange: (hhmm: string) => void;
  bg?: string;
}) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState<number>(() => {
    const hh = Number((value || "00:00").split(":")[0] || 0);
    return Math.min(23, Math.max(0, isNaN(hh) ? 0 : hh));
  });
  const [m, setM] = useState<number>(() => {
    const mm = Number((value || "00:00").split(":")[1] || 0);
    return Math.min(59, Math.max(0, isNaN(mm) ? 0 : mm));
  });

  useEffect(() => {
    if (!value) return;
    const [hhS, mmS] = value.split(":");
    const nh = Math.min(23, Math.max(0, Number(hhS) || 0));
    const nm = Math.min(59, Math.max(0, Number(mmS) || 0));
    setH(nh);
    setM(nm);
  }, [value]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const format = (n: number) => (n < 10 ? `0${n}` : String(n));

  return (
    <View style={[styles.block, { backgroundColor: bg || "#fff" }]}>
      <Text style={[styles.label, { marginBottom: hp(0.8) }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.input, { borderColor: COLORS.border, backgroundColor: COLORS.field }]}
      >
        <Text style={{ color: value ? COLORS.text : COLORS.sub, fontSize: fs(15) }}>
          {value ? value : "HH:MM"}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.timeModal, { backgroundColor: "#fff" }]}>
            <Text style={{ fontWeight: "800", fontSize: fs(14), color: COLORS.text, marginBottom: hp(1) }}>
              Select time
            </Text>

            <View style={{ flexDirection: "row", gap: wp(3), paddingVertical: hp(0.8) }}>
              {/* Hours */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.sub, marginBottom: hp(0.8), fontWeight: "700" }}>Hours</Text>
                <FlatList
                  data={hours}
                  keyExtractor={(i) => `h-${i}`}
                  style={styles.wheel}
                  initialScrollIndex={h}
                  getItemLayout={(_, idx) => ({ length: hp(4.5), offset: hp(4.5) * idx, index: idx })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item }) => {
                    const selected = item === h;
                    return (
                      <TouchableOpacity
                        onPress={() => setH(item)}
                        style={[
                          styles.wheelItem,
                          selected && { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
                        ]}
                      >
                        <Text style={{ color: selected ? "#fff" : COLORS.text, fontWeight: "800", fontSize: fs(14) }}>
                          {format(item)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {/* Minutes */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.sub, marginBottom: hp(0.8), fontWeight: "700" }}>Minutes</Text>
                <FlatList
                  data={minutes}
                  keyExtractor={(i) => `m-${i}`}
                  style={styles.wheel}
                  initialScrollIndex={m}
                  getItemLayout={(_, idx) => ({ length: hp(4.5), offset: hp(4.5) * idx, index: idx })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item }) => {
                    const selected = item === m;
                    return (
                      <TouchableOpacity
                        onPress={() => setM(item)}
                        style={[
                          styles.wheelItem,
                          selected && { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
                        ]}
                      >
                        <Text style={{ color: selected ? "#fff" : COLORS.text, fontWeight: "800", fontSize: fs(14) }}>
                          {format(item)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: wp(2.5), marginTop: hp(1) }}>
              <Pressable
                onPress={() => setOpen(false)}
                style={[styles.sheetBtn, { backgroundColor: COLORS.chip }]}
              >
                <Text style={{ color: COLORS.text, fontWeight: "800", fontSize: fs(14) }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const hhmm = `${format(h)}:${format(m)}`;
                  onChange(hhmm);
                  setOpen(false);
                }}
                style={[styles.sheetBtn, { backgroundColor: COLORS.brand }]}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: fs(14) }}>Set</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** ---------- Add Vitals Screen ---------- */
export default function AddVitalsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);
  const timeline = cp?.patientTimeLineID;

  const [form, setForm] = useState<VitalsForm>({});
  const [applyAll, setApplyAll] = useState(false);
  const [givenTime, setGivenTime] = useState(""); // HH:MM
  const [saving, setSaving] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const timeLineID = typeof timeline === "object" ? timeline?.id : timeline;
  const patientID = cp?.currentPatient?.id ?? cp?.id;
  const wardID = typeof timeline === "object" ? timeline?.wardID : undefined;

  const hasAnyVital = useMemo(
    () =>
      !!(
        form.temperature ||
        form.pulse ||
        form.oxygen ||
        form.respiratoryRate ||
        form.bpH ||
        form.bpL ||
        form.hrv
      ),
    [form]
  );

  useEffect(() => {
    if (applyAll && givenTime) {
      setForm((prev) => ({
        ...prev,
        bpTime: givenTime,
        temperatureTime: givenTime,
        pulseTime: givenTime,
        oxygenTime: givenTime,
        respiratoryRateTime: givenTime,
        hrvTime: givenTime,
      }));
    }
  }, [applyAll, givenTime]);

const onChange = (name: keyof VitalsForm, value: string) => {
  // Temperature → allow decimals (including "36." while typing)
  if (name === "temperature") {
    if (value !== "" && !/^(\d*\.?\d*)$/.test(value)) return;
  }
  // All other numeric fields → integers only
  else if (["oxygen", "pulse", "hrv", "respiratoryRate", "bpH", "bpL"].includes(name)) {
    if (value !== "" && !/^\d*$/.test(value)) return;
  }

  // ❌ No min or max checks here
  // Just store the value so typing is never blocked

  setForm((p) => ({ ...p, [name]: value }));
};


  const createTimeISO = (hhmm: string) => {
    if (!hhmm) return "";
    const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
    const now = new Date();
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
    const tzOffset = dt.getTimezoneOffset() * 60000;
    return new Date(dt.getTime() - tzOffset).toISOString();
  };

  const [wardName, setWardName] = useState<string>("");
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!wardID || !user?.hospitalID) return;
      try {
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        const res = await AuthFetch(`ward/${user.hospitalID}`, token);
        if ((res?.status === "success") && mounted) {
          const found = (res?.wards || []).find((w: any) => w?.id == wardID);
          setWardName(found?.name || "");
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [wardID, user?.hospitalID]);

  const validateRange = (field: keyof VitalsForm): boolean => {
  const limits = VITAL_LIMITS[field];
  const raw = form[field];

  // Empty / no limits → skip
  if (!limits || raw === undefined || raw === "") return true;

  const num = Number(raw);
  if (isNaN(num)) return true;

  if (num < limits.min) {
    // MIN messages
    switch (field) {
      case "temperature":
        dispatch(showError(`Temperature must be ≥ ${limits.min}°C`));
        break;
      case "pulse":
        dispatch(showError(`Heart rate must be ≥ ${limits.min} bpm`));
        break;
      case "oxygen":
        dispatch(showError(`Oxygen saturation must be ≥ ${limits.min}%`));
        break;
      case "respiratoryRate":
        dispatch(showError(`Respiratory rate must be ≥ ${limits.min}`));
        break;
      case "bpL":
        dispatch(showError(`Low BP must be ≥ ${limits.min}`));
        break;
      case "bpH":
        dispatch(showError(`High BP must be ≥ ${limits.min}`));
        break;
      case "hrv":
        dispatch(showError(`HRV must be ≥ ${limits.min}`));
        break;
      default:
        dispatch(showError(`Value must be ≥ ${limits.min}`));
    }
    return false;
  }

  if (num > limits.max) {
    // MAX messages
    switch (field) {
      case "temperature":
        dispatch(showError(`Temperature must be ≤ ${limits.max}°C`));
        break;
      case "pulse":
        dispatch(showError(`Heart rate must be ≤ ${limits.max} bpm`));
        break;
      case "oxygen":
        dispatch(showError(`Oxygen saturation must be ≤ ${limits.max}%`));
        break;
      case "respiratoryRate":
        dispatch(showError(`Respiratory rate must be ≤ ${limits.max}`));
        break;
      case "bpL":
        dispatch(showError(`Low BP must be ≤ ${limits.max}`));
        break;
      case "bpH":
        dispatch(showError(`High BP must be ≤ ${limits.max}`));
        break;
      case "hrv":
        dispatch(showError(`HRV must be ≤ ${limits.max}`));
        break;
      default:
        dispatch(showError(`Value must be ≤ ${limits.max}`));
    }
    return false;
  }

  return true; // within range
};


  const submit = async () => {
    if (!hasAnyVital) return dispatch(showError("Please enter at least one vital measurement"));
    if (applyAll && !givenTime) return dispatch(showError("Please provide a time when applying to all"));
    if (!timeLineID || !patientID) return Alert.alert("Error", "Missing patient timeline.");

    if (form.bpH && form.bpL && Number(form.bpL) > Number(form.bpH)) {
      return dispatch(showError("BP Low cannot be greater than BP High"));
    }
const fieldsToCheck: (keyof VitalsForm)[] = [
    "temperature",
    "pulse",
    "oxygen",
    "respiratoryRate",
    "bpH",
    "bpL",
    "hrv",
  ];

  for (const f of fieldsToCheck) {
    if (!validateRange(f)) {
      return; // stop submit on first error
    }
  }
    setSaving(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const body = {
        userID: user?.id,
        patientID,
        timeLineID,
        oxygen: Number(form.oxygen || 0),
        hrv: Number(form.hrv || 0),
        respiratoryRate: Number(form.respiratoryRate || 0),
        pulse: Number(form.pulse || 0),
        temperature: Number(form.temperature || 0),
        bp: form.bpH ? `${form.bpH}/${form.bpL || ""}` : "",
        bpTime: form.bpTime ? createTimeISO(form.bpTime) : "",
        oxygenTime: form.oxygenTime ? createTimeISO(form.oxygenTime) : "",
        hrvTime: form.hrvTime ? createTimeISO(form.hrvTime) : "",
        respiratoryRateTime: form.respiratoryRateTime ? createTimeISO(form.respiratoryRateTime) : "",
        temperatureTime: form.temperatureTime ? createTimeISO(form.temperatureTime) : "",
        pulseTime: form.pulseTime ? createTimeISO(form.pulseTime) : "",
        ward: wardName,
      };

      const res = await AuthPost(`vitals/${user?.hospitalID}/${patientID}`, body, token);
      if (res?.status === "success") {
        dispatch(showSuccess("Vitals successfully added"));
        navigation.goBack();
      } else {
        dispatch(showError(res?.message || "Failed to add vitals"));
      }
    } catch {
      dispatch(showError("Failed to add vitals"));
    } finally {
      setSaving(false);
    }
  };

  const debouncedSubmit = React.useMemo(
    () => debounce(() => submit(), DEBOUNCE_DELAY, { leading: false, trailing: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submit]
  );
  useEffect(() => () => debouncedSubmit.cancel(), [debouncedSubmit]);

  const handleFocus = (inputName: string) => {
    setFocusedInput(inputName);
  };

  const handleBlur = () => {
    setFocusedInput(null);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingBottom: FOOTER_H + insets.bottom + hp(4) }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}>

            {/* Apply to all */}
            <View style={[styles.rowBetween, styles.block]}>
              <Text style={[styles.label, { color: COLORS.label }]}>Apply time to all</Text>
              <Switch
                value={applyAll}
                onValueChange={setApplyAll}
                thumbColor={applyAll ? COLORS.brand : "#fff"}
                trackColor={{ false: "#cbd5e1", true: "#99f6e4" }}
              />
            </View>

            {/* Time for all (dropdown) */}
            {applyAll && (
              <TimePickerField
                label="Time (applies to all) *"
                value={givenTime}
                onChange={(t) => {
                  setGivenTime(t);
                  setForm((p) => ({
                    ...p,
                    bpTime: t,
                    temperatureTime: t,
                    pulseTime: t,
                    oxygenTime: t,
                    respiratoryRateTime: t,
                    hrvTime: t,
                  }));
                }}
                bg={fieldBg.time}
              />
            )}

            {/* Temperature */}
           <FieldTwo
  left={{
    title: "Temperature (°C)",
    value: form.temperature ?? "",
    onChange: (v) => onChange("temperature", v),
    placeholder: "e.g., 36.6",
    bg: fieldBg.temp,
    keyboardType: "decimal-pad",
    onFocus: () => handleFocus("temperature"),
    onBlur: handleBlur,
    isFocused: focusedInput === "temperature",
  }}
  right={
    !applyAll
      ? {
          title: "Time",
          value: form.temperatureTime ?? "",
          onChange: (v) => onChange("temperatureTime", v),
          asTime: true,
        }
      : undefined
  }
/>

            {/* Heart Rate */}
            <FieldTwo
              left={{
                title: "Heart Rate (bpm)",
                value: form.pulse ?? "",
                onChange: (v) => onChange("pulse", v),
                placeholder: "e.g., 78",
                bg: fieldBg.hr,
                keyboardType: "numeric",
                onFocus: () => handleFocus("pulse"),
                onBlur: handleBlur,
                isFocused: focusedInput === "pulse",
              }}
              right={
                !applyAll
                  ? {
                      title: "Time",
                      value: form.pulseTime ?? "",
                      onChange: (v) => onChange("pulseTime", v),
                      asTime: true,
                    }
                  : undefined
              }
            />

            {/* Oxygen */}
            <FieldTwo
              left={{
                title: "O₂ Saturation (%)",
                value: form.oxygen ?? "",
                onChange: (v) => onChange("oxygen", v),
                placeholder: "e.g., 98",
                bg: fieldBg.spo2,
                keyboardType: "numeric",
                onFocus: () => handleFocus("oxygen"),
                onBlur: handleBlur,
                isFocused: focusedInput === "oxygen",
              }}
              right={
                !applyAll
                  ? {
                      title: "Time",
                      value: form.oxygenTime ?? "",
                      onChange: (v) => onChange("oxygenTime", v),
                      asTime: true,
                    }
                  : undefined
              }
            />

            {/* Respiratory Rate */}
            <FieldTwo
              left={{
                title: "Respiratory Rate (breaths/min)",
                value: form.respiratoryRate ?? "",
                onChange: (v) => onChange("respiratoryRate", v),
                placeholder: "e.g., 16",
                bg: fieldBg.rr,
                keyboardType: "numeric",
                onFocus: () => handleFocus("respiratoryRate"),
                onBlur: handleBlur,
                isFocused: focusedInput === "respiratoryRate",
              }}
              right={
                !applyAll
                  ? {
                      title: "Time",
                      value: form.respiratoryRateTime ?? "",
                      onChange: (v) => onChange("respiratoryRateTime", v),
                      asTime: true,
                    }
                  : undefined
              }
            />

            {/* Blood Pressure */}
            <View style={[styles.block, { backgroundColor: fieldBg.bp }]}>
              <Text style={[styles.label, { color: COLORS.label, marginBottom: hp(0.8) }]}>
                Blood Pressure (mm Hg)
              </Text>
              <View style={{ flexDirection: "row", gap: wp(2) }}>
                <TextInput
                  placeholder="High"
                  placeholderTextColor={COLORS.sub}
                  keyboardType="numeric"
                  value={form.bpH ?? ""}
                  onChangeText={(t) => onChange("bpH", t)}
                  style={[
                    styles.input, 
                    { 
                      flex: 1, 
                      borderColor: focusedInput === "bpH" ? COLORS.focus : COLORS.border, 
                      backgroundColor: COLORS.field 
                    }
                  ]}
                  onFocus={() => handleFocus("bpH")}
                  onBlur={handleBlur}
                />
                <TextInput
                  placeholder="Low"
                  placeholderTextColor={COLORS.sub}
                  keyboardType="numeric"
                  value={form.bpL ?? ""}
                  onChangeText={(t) => onChange("bpL", t)}
                  style={[
                    styles.input, 
                    { 
                      flex: 1, 
                      borderColor: focusedInput === "bpL" ? COLORS.focus : COLORS.border, 
                      backgroundColor: COLORS.field 
                    }
                  ]}
                  onFocus={() => handleFocus("bpL")}
                  onBlur={handleBlur}
                />
              </View>
              {form.bpH && form.bpL && Number(form.bpL) > Number(form.bpH) && (
                <Text style={{ color: COLORS.red, marginTop: hp(0.8), fontWeight: "700", fontSize: fs(12) }}>
                  Low cannot be greater than High
                </Text>
              )}
              {!applyAll && (
                <TimePickerField
                  label="Time"
                  value={form.bpTime}
                  onChange={(t) => onChange("bpTime", t)}
                  bg={fieldBg.time}
                />
              )}
            </View>

            {/* HRV */}
            <FieldTwo
              left={{
                title: "Heart Rate Variability (ms)",
                value: form.hrv ?? "",
                onChange: (v) => onChange("hrv", v),
                placeholder: "e.g., 45",
                bg: fieldBg.hrv,
                keyboardType: "numeric",
                onFocus: () => handleFocus("hrv"),
                onBlur: handleBlur,
                isFocused: focusedInput === "hrv",
              }}
              right={
                !applyAll
                  ? {
                      title: "Time",
                      value: form.hrvTime ?? "",
                      onChange: (v) => onChange("hrvTime", v),
                      asTime: true,
                    }
                  : undefined
              }
            />

            {/* Action Buttons - Inside the form at the end (like AddPatientForm) */}
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={[styles.sheetBtn, { backgroundColor: COLORS.chip }]}
              >
                <Text style={{ color: COLORS.text, fontWeight: "800", fontSize: fs(15) }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => debouncedSubmit()}
                disabled={saving || !hasAnyVital}
                style={[
                  styles.sheetBtn,
                  { 
                    backgroundColor: hasAnyVital ? COLORS.brand : COLORS.sub,
                    opacity: (saving || !hasAnyVital) ? 0.6 : 1 
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: fs(15) }}>Record Vitals</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Footer - Same as AddPatientForm */}
        <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
          <Footer active={"patients"} brandColor="#14b8a6" />
        </View>
        {insets.bottom > 0 && (
          <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** ---------- Reusable compound field with optional Time dropdown ---------- */
function FieldTwo({
  left,
  right,
}: {
  left: {
    title: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "numeric";
    bg?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    isFocused?: boolean;
  };
  right?:
    | {
        title: string;
        value: string;
        onChange: (v: string) => void;
        asTime?: boolean;
      }
    | undefined;
}) {
  return (
    <View style={{ flexDirection: "row", gap: wp(2) }}>
      <View style={[styles.block, { flex: 1, backgroundColor: left.bg || "#fff" }]}>
        <Text style={[styles.label, { marginBottom: hp(0.8) }]}>{left.title}</Text>
        <TextInput
          value={left.value}
          onChangeText={left.onChange}
          placeholder={left.placeholder}
          placeholderTextColor={COLORS.sub}
          keyboardType={left.keyboardType || "default"}
          style={[
            styles.input, 
            { 
              borderColor: left.isFocused ? COLORS.focus : COLORS.border, 
              backgroundColor: COLORS.field 
            }
          ]}
          onFocus={left.onFocus}
          onBlur={left.onBlur}
        />
      </View>

      {right && (
        <View style={[styles.block, { flex: 1, backgroundColor: fieldBg.time }]}>
          {right.asTime ? (
            <TimePickerField label={right.title} value={right.value} onChange={right.onChange} bg={fieldBg.time} />
          ) : (
            <>
              <Text style={[styles.label, { marginBottom: hp(0.8) }]}>{right.title}</Text>
              <TextInput
                value={right.value}
                onChangeText={right.onChange}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.sub}
                keyboardType="numeric"
                style={[styles.input, { borderColor: COLORS.border, backgroundColor: COLORS.field }]}
                maxLength={5}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  screen: { 
    flex: 1,
  },
  scrollContent: { 
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  card: {
    borderWidth: 1,
    borderRadius: wp(4),
    padding: wp(4),
    marginBottom: hp(2),
  },
  header: { 
    fontSize: fs(18), 
    fontWeight: "800", 
    marginBottom: hp(2),
    textAlign: "center",
  },
  label: { 
    fontSize: fs(13), 
    fontWeight: "700", 
    color: COLORS.text,
    marginBottom: hp(0.8),
  },
  input: {
    borderWidth: 2,
    borderRadius: wp(3),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.5),
    fontSize: fs(16),
    fontWeight: "500",
    color: COLORS.text,
  },
  block: {
    borderRadius: wp(3),
    padding: wp(3),
    marginTop: hp(1.5),
  },
  rowBetween: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  sheetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: wp(3),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(2),
  },

  // Action Buttons Container - Inside the form like AddPatientForm
  actionButtons: {
    flexDirection: "row", 
    gap: wp(3),
    marginTop: hp(3),
    paddingHorizontal: wp(1),
  },

  // Time modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: wp(4),
  },
  timeModal: {
    width: "100%",
    maxWidth: wp(90),
    borderRadius: wp(4),
    padding: wp(4),
  },
  wheel: {
    height: hp(22),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(3),
  },
  wheelItem: {
    height: hp(4.5),
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },

  // Footer & nav-shield - Same as AddPatientForm
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