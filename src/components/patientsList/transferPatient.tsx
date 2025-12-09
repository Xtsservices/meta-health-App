// src/screens/patient/TransferPatientSheet.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  LayoutChangeEvent,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";

import { RootState } from "../../store/store";
import { AuthFetch as authFetch, AuthPatch as authPatch } from "../../auth/auth";
import { Role_NAME, transferType } from "../../utils/role";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { showError, showSuccess } from "../../store/toast.slice";
import Footer from "../dashboard/footer";
import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
import { COLORS } from "../../utils/colour";

// ---------- Types ----------
type Ward = { id: number; name: string; availableBeds: number | null };
type Staff = { id: number; firstName?: string; lastName?: string; departmentID?: number };
type Vitals = { oxygen?: number; pulse?: number; temperature?: number; bp?: string };
type Timeline = { id: number; patientID: number };

type TransferRouteParams = {
  hospitalID?: number;
  patientID?: number;
  timeline?: Timeline;
};

// ---------- Helpers ----------
const capitalize = (s?: string) =>
  (s || "")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");



const ACTION_FOOTER_H = 68;      // Submit/Cancel bar height
const APP_FOOTER_H = 70;         // Bottom <Footer> height

const initialForm = {
  transferType: transferType.internal,
  wardID: 0,
  userID: 0,
  departmentID: 0,
  reason: "",
  oxygen: "",
  temp: "",
  pulse: "",
  bpH: "",
  bpL: "",
  hospitalName: "",
  relativeName: "",
};

export default function TransferPatientSheet() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const params: TransferRouteParams = route.params || {};

  // store
  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);

  const storeTimeline = cp?.patientTimeLineID as unknown as Timeline | undefined;

  const hospitalID = params.hospitalID ?? user?.hospitalID;
  const patientID = params.patientID ?? (cp?.currentPatient?.id ?? cp?.id);
  const timeline = params.timeline ?? storeTimeline;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [wards, setWards] = useState<Ward[]>([]);
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [form, setForm] = useState({ ...initialForm });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // dropdown modal toggles
  const [openWard, setOpenWard] = useState(false);
  const [openDoctor, setOpenDoctor] = useState(false);

  // --- Keyboard & Smooth Scroll management ---
  const [kbHeight, setKbHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const fieldYRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKbHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKbHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const registerY =
    (key: string) =>
    (e: LayoutChangeEvent): void => {
      const y = e.nativeEvent.layout.y;
      fieldYRef.current[key] = y;
    };

  const scrollInto = (key: string) => {
    const y = fieldYRef.current[key] ?? 0;
    const target = Math.max(0, y - 80); // keep offset from top, so input is clear above keyboard
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: target, animated: true });
    });
  };

  const onFocusScroll =
    (key: string) =>
    (_e: NativeSyntheticEvent<TextInputFocusEventData>) =>
      scrollInto(key);

  // token cache
  const tokenRef = useRef<string | null>(null);
  const ensureToken = useCallback(async () => {
    if (user?.token) {
      tokenRef.current = user.token;
      return user.token;
    }
    const t = await AsyncStorage.getItem("token");
    tokenRef.current = t;
    return t;
  }, [user?.token]);

  // API
  const fetchWards = useCallback(async () => {
    if (!hospitalID) return;
    const token = await ensureToken();
    const wr = await authFetch(`ward/${hospitalID}`, token);
    if (wr?.status === "success") setWards(wr.data?.wards || wr.wards || []);
    else setWards([]);
  }, [hospitalID, ensureToken]);

  const fetchDoctors = useCallback(async () => {
    if (!hospitalID) return;
    const token = await ensureToken();
    const dr = await authFetch(
      `user/${hospitalID}/list/${Role_NAME.doctor}`,
      token
    );
    if (dr?.status === "success") setDoctors(dr.data?.users || dr.users || []);
    else setDoctors([]);
  }, [hospitalID, ensureToken]);

  const fetchVitals = useCallback(async () => {
    if (!hospitalID || !patientID) return;
    const token = await ensureToken();
    const vr = await authFetch(`vitals/${hospitalID}/${patientID}`, token);
    if (vr?.status === "success") {
      const vList: Vitals[] = vr.data?.vitals || vr.vitals || [];
      let latest = { oxygen: "", pulse: "", temp: "", bpH: "", bpL: "" } as any;
      [...vList].reverse().forEach((v) => {
        if (!latest.oxygen && v.oxygen != null) latest.oxygen = String(v.oxygen);
        if (!latest.pulse && v.pulse != null) latest.pulse = String(v.pulse);
        if (!latest.temp && v.temperature != null)
          latest.temp = String(v.temperature);
        if (!latest.bpH && v.bp) {
          const [H, L] = String(v.bp).split("/");
          latest.bpH = H || "";
          latest.bpL = L || "";
        }
      });
      setForm((prev) => ({ ...prev, ...latest }));
    }
  }, [hospitalID, patientID, ensureToken]);

  // load data on screen mount
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchWards(), fetchDoctors(), fetchVitals()]).finally(() =>
      setLoading(false)
    );
  }, [fetchWards, fetchDoctors, fetchVitals]);

  // form helpers
  const setField = (name: keyof typeof initialForm, value: any) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((e) => ({ ...e, [name]: "" }));
  };

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.wardID) e.wardID = "Ward is required.";
    if (!form.userID) e.userID = "Doctor is required.";
    if (form.transferType === transferType.internal && !form.departmentID) {
      e.departmentID = "Department is required (auto from selected doctor).";
    }
    if (form.oxygen && (Number(form.oxygen) < 50 || Number(form.oxygen) > 100)) {
      e.oxygen = "Oxygen must be between 50 and 100.";
    }
    if (form.temp && (Number(form.temp) < 20 || Number(form.temp) > 45)) {
      e.temp = "Temperature must be between 20°C and 45°C.";
    }
    if (form.pulse && (Number(form.pulse) < 30 || Number(form.pulse) > 300)) {
      e.pulse = "Pulse must be between 30 and 300 bpm.";
    }
    if (form.bpH && form.bpL && Number(form.bpL) > Number(form.bpH)) {
      e.bpL = "Low BP cannot be greater than High BP.";
      e.bpH = "High BP must be ≥ Low BP.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleCancel = () => {
    navigation.goBack();
  };

  // ---- PATCH API with debounce ----
  const handleSubmit = useCallback(async () => {
    if (!hospitalID || !patientID) {
      dispatch(showError("Missing hospital or patient context."));
      return;
    }
    if (!validate()) return;

    const token = await ensureToken();
    setSubmitting(true);

    try {
      const req = {
        wardID: form.wardID,
        transferType: form.transferType,
        bp: form.bpH ? `${form.bpH}/${form.bpL || ""}` : null,
        temp: form.temp ? Number(form.temp) : null,
        oxygen: form.oxygen ? Number(form.oxygen) : null,
        pulse: form.pulse ? Number(form.pulse) : null,
        hospitalName: form.hospitalName || null,
        reason: form.reason || null,
        relativeName: form.relativeName || "",
        departmentID: form.departmentID || 0,
        userID: form.userID || 0,
        status: null,
      };

      const res = await authPatch(
        `patient/${hospitalID}/patients/${patientID}/transfer`,
        req,
        token
      );

      if (res?.status === "success" || res?.message === "success") {
        dispatch(showSuccess("Patient successfully transferred"));
        navigation.navigate("PatientList" as never);
      } else {
        dispatch(showError(res?.message || "Failed to transfer patient"));
      }
    } catch (err) {
      dispatch(showError("Failed to transfer patient"));
    } finally {
      setSubmitting(false);
    }
  }, [hospitalID, patientID, form, ensureToken, validate, dispatch, navigation]);

  const debouncedSubmit = useCallback(
    debounce(handleSubmit, DEBOUNCE_DELAY),
    [handleSubmit]
  );

  const onPickDoctor = (id: number) => {
    const d = doctors.find((x) => x.id === id);
    setField("userID", id);
    setField("departmentID", d?.departmentID || 0);
  };

  // footer offset = above keyboard OR above app footer + nav area
  const keyboardOpen = kbHeight > 0;
  const footerOffset = APP_FOOTER_H + insets.bottom;

  const bottomPad = ACTION_FOOTER_H + 16 + (insets.bottom + APP_FOOTER_H);
  const indicatorBottom = ACTION_FOOTER_H + (insets.bottom + APP_FOOTER_H);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : (
         <>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 12, paddingBottom: ACTION_FOOTER_H + 16 + APP_FOOTER_H + insets.bottom + (keyboardOpen ? kbHeight : 0)
              }}
            scrollIndicatorInsets={{ 
              bottom: keyboardOpen ? kbHeight + ACTION_FOOTER_H : ACTION_FOOTER_H + APP_FOOTER_H + insets.bottom
          }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator
          >
            {/* Ward */}
            <View onLayout={registerY("ward")}>
              <Field label="Ward *" error={errors.wardID}>
                <Pressable
                  onPress={() => setOpenWard(true)}
                  style={[
                    styles.input,
                    { borderColor: errors.wardID ? COLORS.danger : COLORS.border },
                  ]}
                >
                  <Text style={styles.inputText}>
                    {form.wardID
                      ? capitalize(wards.find((w) => w.id === form.wardID)?.name)
                      : "Select Ward"}
                  </Text>
                </Pressable>
              </Field>
            </View>

            {/* Doctor */}
            <View onLayout={registerY("doctor")}>
              <Field label="Doctor Name *" error={errors.userID || errors.departmentID}>
                <Pressable
                  onPress={() => setOpenDoctor(true)}
                  style={[
                    styles.input,
                    {
                      borderColor:
                        errors.userID || errors.departmentID
                          ? COLORS.danger
                          : COLORS.border,
                    },
                  ]}
                >
                  <Text style={styles.inputText}>
                    {form.userID
                      ? (() => {
                          const d = doctors.find((x) => x.id === form.userID);
                          if (!d) return "Select Doctor";
                          return `${capitalize(d.firstName)}${
                            d.lastName ? " " + capitalize(d.lastName) : ""
                          }`;
                        })()
                      : "Select Doctor"}
                  </Text>
                </Pressable>
              </Field>
            </View>

            {/* Reason */}
            <View onLayout={registerY("reason")}>
              <Field label="Reason">
                <TextInput
                  value={form.reason}
                  onFocus={onFocusScroll("reason")}
                  onChangeText={(t) => setField("reason", t)}
                  placeholder="Enter reason"
                  placeholderTextColor={COLORS.sub}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, { height: 96 }]}
                />
              </Field>
            </View>

            {/* Vitals */}
            <Text style={styles.sectionTitle}>Vitals</Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }} onLayout={registerY("oxygen")}>
                <Field label="Oxygen (%)" error={errors.oxygen}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.oxygen || "")}
                    onFocus={onFocusScroll("oxygen")}
                    onChangeText={(t) => setField("oxygen", t)}
                    placeholder="e.g. 96"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.oxygen ? COLORS.danger : COLORS.border },
                    ]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }} onLayout={registerY("temp")}>
                <Field label="Temperature (°C)" error={errors.temp}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.temp || "")}
                    onFocus={onFocusScroll("temp")}
                    onChangeText={(t) => setField("temp", t)}
                    placeholder="e.g. 37"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.temp ? COLORS.danger : COLORS.border },
                    ]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }} onLayout={registerY("pulse")}>
                <Field label="Pulse (bpm)" error={errors.pulse}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.pulse || "")}
                    onFocus={onFocusScroll("pulse")}
                    onChangeText={(t) => setField("pulse", t)}
                    placeholder="e.g. 78"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.pulse ? COLORS.danger : COLORS.border },
                    ]}
                  />
                </Field>
              </View>
            </View>


            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }} onLayout={registerY("bpH")}>
                <Field label="Blood Pressure High (mmHg)" error={errors.bpH}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.bpH || "")}
                    onFocus={onFocusScroll("bpH")}
                    onChangeText={(t) => setField("bpH", t)}
                    placeholder="e.g. 120"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.bpH ? COLORS.danger : COLORS.border },
                    ]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }} onLayout={registerY("bpL")}>
                <Field label="Blood Pressure Low (mmHg)" error={errors.bpL}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.bpL || "")}
                    onFocus={onFocusScroll("bpL")}
                    onChangeText={(t) => setField("bpL", t)}
                    placeholder="e.g. 80"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.bpL ? COLORS.danger : COLORS.border },
                    ]}
                  />
                </Field>
              </View>
            </View>

            {/* Hospital / Relative */}
            {/* <View onLayout={registerY("hospitalName")}>
              <Field label="Hospital Name (if external)">
                <TextInput
                  value={form.hospitalName}
                  onFocus={onFocusScroll("hospitalName")}
                  onChangeText={(t) => setField("hospitalName", t)}
                  placeholder="Hospital name (optional)"
                  placeholderTextColor={COLORS.sub}
                  style={styles.input}
                />
              </Field>
            </View> */}

            <View onLayout={registerY("relativeName")}>
              <Field label="Relative Name">
                <TextInput
                  value={form.relativeName}
                  onFocus={onFocusScroll("relativeName")}
                  onChangeText={(t) => setField("relativeName", t)}
                  placeholder="Relative name (optional)"
                  placeholderTextColor={COLORS.sub}
                  style={styles.input}
                />
              </Field>
            </View>
          </ScrollView>



      {/* Fixed action footer – ALWAYS above app footer / keyboard */}
      <View style={[styles.footer, { bottom: footerOffset }]}>
        <Pressable
          onPress={handleCancel}
          style={[styles.btn, { backgroundColor: COLORS.pill, flex: 1 }]}
          disabled={submitting}
        >
          <Text style={[styles.btnText, { color: COLORS.text }]}>Cancel</Text>
        </Pressable>
        <Pressable
          disabled={submitting}
          onPress={debouncedSubmit}
          style={[
            styles.btn,
            {
              backgroundColor: COLORS.brand,
              flex: 1,
              opacity: submitting ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.btnText, { color: "#fff" }]}>
            {submitting ? "Submitting..." : "Submit"}
          </Text>
        </Pressable>
      </View>
          </>
        )}
      </KeyboardAvoidingView>

      {/* Bottom app footer (global navigation) */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}

      {/* Ward Picker Modal */}
      <PickerSheet
        visible={openWard}
        title="Select Ward"
        onClose={() => setOpenWard(false)}
        items={wards
          .filter((w) => w.availableBeds !== null)
          .map((w) => ({
            key: String(w.id),
            label: `${capitalize(w.name)}${
              w.availableBeds === 0 ? " (Full)" : ""
            }`,
            disabled: w.availableBeds === 0 || w.availableBeds === null,
            value: w.id,
          }))}
        onPick={(v) => setField("wardID", v)}
      />

      {/* Doctor Picker Modal */}
      <PickerSheet
        visible={openDoctor}
        title="Select Doctor"
        onClose={() => setOpenDoctor(false)}
        items={doctors.map((d) => ({
          key: String(d.id),
          label: `${capitalize(d.firstName)}${
            d.lastName ? " " + capitalize(d.lastName) : ""
          }`,
          value: d.id,
        }))}
        onPick={(id) => onPickDoctor(id)}
      />
    </View>
  );
}

// ---------- Small UI atoms ----------
const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({
  label,
  error,
  children,
}) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {!!error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const PickerSheet: React.FC<{
  visible: boolean;
  title: string;
  onClose: () => void;
  items: { key: string; label: string; value: any; disabled?: boolean }[];
  onPick: (value: any) => void;
}> = ({ visible, title, onClose, items, onPick }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.pickerSheet}>
        <View style={[styles.pickerHead, { borderBottomColor: COLORS.border }]}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ color: COLORS.sub, fontWeight: "800" }}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          style={{ maxHeight: 320 }}
          contentContainerStyle={{ paddingVertical: 6 }}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((it) => (
            <Pressable
              key={it.key}
              disabled={!!it.disabled}
              onPress={() => {
                onPick(it.value);
                onClose();
              }}
              style={[styles.pickerItem, { opacity: it.disabled ? 0.5 : 1 }]}
            >
              <Text style={styles.pickerText}>{it.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  overlay: { flex: 1, backgroundColor: COLORS.overlay },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  label: { color: COLORS.sub, fontWeight: "700", marginBottom: 6 ,fontSize: 12},
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  inputText: { color: COLORS.text, fontWeight: "800" },
  errorText: { marginTop: 6, color: COLORS.danger, fontSize: 12, fontWeight: "700" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ACTION_FOOTER_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  btn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontWeight: "900" },

  // picker
  pickerSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  pickerHead: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerTitle: { color: COLORS.text, fontWeight: "900" },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 12 },
  pickerText: { color: COLORS.text, fontWeight: "800" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 6,
    marginBottom: 8,
  },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: APP_FOOTER_H,
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
