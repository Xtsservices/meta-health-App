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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import { showError, showSuccess } from "../../../store/toast.slice";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
import { Switch } from "react-native";
import Footer from "../../dashboard/footer";

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  field: "#f8fafc",
  brand: "#14b8a6",
  brandDark: "#0ea5a3",
  red: "#ef4444",
  label: "#0f172a",
  chip: "#eef2f7",
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

const FOOTER_H = 64;

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
    // sync if parent changes
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
      <Text style={[styles.label, { marginBottom: 6 }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.input, { borderColor: COLORS.border, backgroundColor: COLORS.field }]}
      >
        <Text style={{ color: value ? COLORS.text : COLORS.sub, fontSize: 15 }}>
          {value ? value : "HH:MM"}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.timeModal, { backgroundColor: "#fff" }]}>
            <Text style={{ fontWeight: "800", fontSize: 14, color: COLORS.text, marginBottom: 8 }}>
              Select time
            </Text>

            <View style={{ flexDirection: "row", gap: 12, paddingVertical: 6 }}>
              {/* Hours */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.sub, marginBottom: 6, fontWeight: "700" }}>Hours</Text>
                <FlatList
                  data={hours}
                  keyExtractor={(i) => `h-${i}`}
                  style={styles.wheel}
                  initialScrollIndex={h}
                  getItemLayout={(_, idx) => ({ length: 36, offset: 36 * idx, index: idx })}
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
                        <Text style={{ color: selected ? "#fff" : COLORS.text, fontWeight: "800" }}>
                          {format(item)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {/* Minutes */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.sub, marginBottom: 6, fontWeight: "700" }}>Minutes</Text>
                <FlatList
                  data={minutes}
                  keyExtractor={(i) => `m-${i}`}
                  style={styles.wheel}
                  initialScrollIndex={m}
                  getItemLayout={(_, idx) => ({ length: 36, offset: 36 * idx, index: idx })}
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
                        <Text style={{ color: selected ? "#fff" : COLORS.text, fontWeight: "800" }}>
                          {format(item)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => setOpen(false)}
                style={[styles.sheetBtn, { backgroundColor: COLORS.chip }]}
              >
                <Text style={{ color: COLORS.text, fontWeight: "800" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const hhmm = `${format(h)}:${format(m)}`;
                  onChange(hhmm);
                  setOpen(false);
                }}
                style={[styles.sheetBtn, { backgroundColor: COLORS.brand }]}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Set</Text>
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
    if (["oxygen", "temperature", "pulse", "hrv", "respiratoryRate"].includes(name)) {
      if (value && !/^\d+(\.\d+)?$/.test(value)) return;
    }
    if (name === "oxygen" && Number(value) > 100) return;
    if (name === "temperature" && Number(value) > 45) return;
    if (name === "pulse" && Number(value) > 200) return;
    if (name === "hrv" && Number(value) > 200) return;
    if (name === "bpH" && Number(value) > 200) return;
    if (name === "bpL" && Number(value) > 200) return;

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
        if ((res?.status === "success" || res?.message === "success") && mounted) {
          const found = (res?.wards || []).find((w: any) => w?.id == wardID);
          setWardName(found?.name || "");
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [wardID, user?.hospitalID]);

  const submit = async () => {
    if (!hasAnyVital) return dispatch(showError("Please enter at least one vital measurement"));
    if (applyAll && !givenTime) return dispatch(showError("Please provide a time when applying to all"));
    if (!timeLineID || !patientID) return Alert.alert("Error", "Missing patient timeline.");

    if (form.bpH && form.bpL && Number(form.bpL) > Number(form.bpH)) {
      return dispatch(showError("BP Low cannot be greater than BP High"));
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
      if (res?.status === "success" || res?.message === "success") {
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

  // bottom padding: respect footer + gesture/nav area
  const bottomPad = FOOTER_H + Math.max(16, insets.bottom);

  return (
    <View style={[styles.screen, { backgroundColor: COLORS.bg }]}>
      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        keyboardOpeningTime={0}
        extraScrollHeight={Platform.select({ ios: 24, android: 80 })}
        extraHeight={Platform.select({ ios: 0, android: 100 })}
        contentContainerStyle={[styles.safe, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}>
          <Text style={[styles.header, { color: COLORS.text }]}>Record Vital Signs</Text>

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
                // also push to form immediately
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
              keyboardType: "numeric",
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
            <Text style={[styles.label, { color: COLORS.label, marginBottom: 6 }]}>
              Blood Pressure (mm Hg)
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                placeholder="High"
                placeholderTextColor={COLORS.sub}
                keyboardType="numeric"
                value={form.bpH ?? ""}
                onChangeText={(t) => onChange("bpH", t)}
                style={[styles.input, { flex: 1, borderColor: COLORS.border, backgroundColor: COLORS.field }]}
              />
              <TextInput
                placeholder="Low"
                placeholderTextColor={COLORS.sub}
                keyboardType="numeric"
                value={form.bpL ?? ""}
                onChangeText={(t) => onChange("bpL", t)}
                style={[styles.input, { flex: 1, borderColor: COLORS.border, backgroundColor: COLORS.field }]}
              />
            </View>
            {form.bpH && form.bpL && Number(form.bpL) > Number(form.bpH) && (
              <Text style={{ color: COLORS.red, marginTop: 6, fontWeight: "700" }}>
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

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.sheetBtn, { backgroundColor: COLORS.chip }]}
            >
              <Text style={{ color: COLORS.text, fontWeight: "800" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => debouncedSubmit()}
              disabled={saving}
              style={[
                styles.sheetBtn,
                { backgroundColor: COLORS.brand, opacity: saving ? 0.6 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "800" }}>Record Vitals</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Footer pinned above nav buttons */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </View>
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
  };
  right?:
    | {
        title: string;
        value: string;
        onChange: (v: string) => void;
        asTime?: boolean; // if true use TimePickerField
      }
    | undefined;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={[styles.block, { flex: 1, backgroundColor: left.bg || "#fff" }]}>
        <Text style={[styles.label, { marginBottom: 6 }]}>{left.title}</Text>
        <TextInput
          value={left.value}
          onChangeText={left.onChange}
          placeholder={left.placeholder}
          placeholderTextColor={COLORS.sub}
          keyboardType={left.keyboardType || "default"}
          style={[styles.input, { borderColor: COLORS.border, backgroundColor: COLORS.field }]}
        />
      </View>

      {right && (
        <View style={[styles.block, { flex: 1, backgroundColor: fieldBg.time }]}>
          {right.asTime ? (
            <TimePickerField label={right.title} value={right.value} onChange={right.onChange} bg={fieldBg.time} />
          ) : (
            <>
              <Text style={[styles.label, { marginBottom: 6 }]}>{right.title}</Text>
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
  screen: { flex: 1 },
  safe: { padding: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  header: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  label: { fontSize: 12, fontWeight: "800", color: COLORS.text },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  block: {
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
  },

  // Time modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  timeModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 14,
  },
  wheel: {
    height: 180,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  wheelItem: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },

  // Footer & nav-shield
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
    // Footer itself should render full width
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});
