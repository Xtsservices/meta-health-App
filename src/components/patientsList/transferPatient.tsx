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
  LayoutChangeEvent,
  Modal,
  Pressable,
  Dimensions,
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
type Timeline = { id: number; patientID: number , wardID?: number; };
type Hospital = { id: number; name: string; city?: string; state?: string };

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
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  hospitalID: 0,
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
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [form, setForm] = useState({ ...initialForm });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // dropdown modal toggles
  const [openWard, setOpenWard] = useState(false);
  const [openDoctor, setOpenDoctor] = useState(false);
  const [openHospital, setOpenHospital] = useState(false);

  // --- Keyboard & Smooth Scroll management ---
  const scrollRef = useRef<ScrollView | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewContentHeight = useRef<number>(0);
  const scrollViewHeight = useRef<number>(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
      setTimeout(() => {
        scrollToActiveField();
      }, 100);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const activeFieldRef = useRef<string | null>(null);

  const handleFocus = useCallback(
    (fieldName: string) => () => {
      activeFieldRef.current = fieldName;

      if (!isKeyboardVisible) {
        return;
      }
      setTimeout(() => {
        scrollToActiveField();
      }, 100);
    },
    [isKeyboardVisible]
  );

  const scrollToActiveField = useCallback(() => {
    if (!scrollRef.current || !activeFieldRef.current) return;

    // Get the active field based on its name
    const fieldName = activeFieldRef.current;

    // Calculate scroll position based on field type/position
    let scrollY = 0;

    // Determine scroll position based on which field is active
    switch (fieldName) {
      case "oxygen":
      case "temp":
      case "pulse":
      case "bpH":
      case "bpL":
        scrollY = 250;
        break;
      case "reason":
        scrollY = 200;
        break;
      case "relativeName":
        scrollY = 400;
        break;
      case "hospitalName":
        scrollY = 150;
        break;
      default:
        scrollY = 100;
    }

    scrollRef.current.scrollTo({
      y: scrollY,
      animated: true,
    });
  }, []);

  const handleBlur = useCallback(() => {
    activeFieldRef.current = null;
  }, []);

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
    if (wr?.status === "success" && "data" in wr) {
      const wardsData = wr.data?.wards || [];
      const filterWardData = timeline?.wardID
        ? wardsData.filter((ward: { id: number }) => ward.id !== (timeline as any).wardID)
        : wardsData;
      setWards(filterWardData);
    } else setWards([]);
  }, [hospitalID, ensureToken, timeline?.wardID]);

  const fetchDoctors = useCallback(async () => {
    if (!hospitalID) return;
    const token = await ensureToken();
    const dr = await authFetch(
      `user/${hospitalID}/list/${Role_NAME.doctor}`,
      token
    );
    if (dr?.status === "success" && "data" in dr) {
    const doctorsData = dr.data?.users || [];
    // Filter out current user if they're a doctor
    const filteredDoctors = doctorsData.filter(
      (doctor: { id: number }) => doctor.id !== user?.id
    );
    setDoctors(filteredDoctors);
  } else {
    setDoctors([]);
  }
}, [hospitalID, ensureToken, user?.id]);

  const fetchVitals = useCallback(async () => {
    if (!hospitalID || !patientID) return;
    const token = await ensureToken();
    const vr = await authFetch(`vitals/${hospitalID}/${patientID}`, token);
    if (vr?.status === "success" && "data" in vr) {
      const vList: Vitals[] = vr.data?.vitals || [];
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

  const fetchHospitals = useCallback(async () => {
    const token = await ensureToken();
    const res = await authFetch(`hospital/getHospitalsList`, token) as any;
    if (res?.status === "success" && "data" in res) {
      const hospitalsData = res.data?.hospitals || [];
      setHospitals(hospitalsData);
    } else if (res?.message === "success" && res.hospitals) {
      setHospitals(res.hospitals);
    } else {
      setHospitals([]);
    }
  }, [ensureToken]);

  // load data on screen mount
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchWards(), fetchDoctors(), fetchVitals(), fetchHospitals()]).finally(() =>
      setLoading(false)
    );
  }, [fetchWards, fetchDoctors, fetchVitals, fetchHospitals]);

  // form helpers
  const setField = (name: keyof typeof initialForm, value: any) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((e) => ({ ...e, [name]: "" }));
  };

  const validate = useCallback(() => {
    const e: Record<string, string> = {};

    // Check transfer type
    if (!form.transferType && form.transferType !== 0) {
      e.transferType = "Transfer Type is required";
    }

    if (form.transferType === transferType.internal) {
      // Internal transfer validations
      if (!form.wardID) e.wardID = "Ward is required.";
      if (!form.userID) e.userID = "Doctor is required.";
      if (form.departmentID === 0 && form.transferType === transferType.internal) {
        e.departmentID = "Please select doctor name";
      }

      // Check required fields for internal transfer
      if (!form.reason) e.reason = "Reason is required";
    } else if (form.transferType === transferType.external) {
      // External transfer validations
      if (!form.hospitalName) e.hospitalName = "Hospital Name is required";
      if (!form.reason) e.reason = "Reason is required";
      if (!form.relativeName) e.relativeName = "Relative Name is required";
    }

    // Common validations for vitals
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

    // Validate BP fields
    if ((form.bpH && !form.bpL) || (!form.bpH && form.bpL)) {
      e.bp = "Both BP High and BP Low must be provided";
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
        bp: form.bpH && form.bpL ? `${form.bpH}/${form.bpL}` : null,
        temp: form.temp ? Number(form.temp) : null,
        oxygen: form.oxygen ? Number(form.oxygen) : null,
        pulse: form.pulse ? Number(form.pulse) : null,
        hospitalName: form.hospitalName || null,
        reason: form.reason || null,
        relativeName: form.relativeName || "",
        departmentID: form.departmentID || 0,
        userID:form.transferType === transferType.internal ? form.userID : (user as any).id,
        status: null,
      };

      const res = await authPatch(
        `patient/${hospitalID}/patients/${patientID}/transfer`,
        req,
        token
      );

if (("data" in res && res?.status === "success") || ("message" in res && res?.message === "success")) {
  dispatch(showSuccess("Patient successfully transferred"));
  if (user?.role === 2002 || user?.role === 2003) {
    navigation.navigate("NursePatientList" as never);
  } else {
  navigation.navigate("PatientList" as never);
  }
} else {
  // Safely extract error message
  let errorMessage = "Failed to transfer patient";
  
  if ("message" in res && res.message) {
    errorMessage = res.message;
  } else if ("data" in res && res.data?.message) {
    errorMessage = res.data.message;
  }
  
  dispatch(showError(errorMessage));
}
    } catch (err) {
      dispatch(showError("Failed to transfer patient"));
    } finally {
      setSubmitting(false);
    }
  }, [hospitalID, patientID, form, ensureToken, validate, dispatch, navigation, user?.id]);

  const debouncedSubmit = useCallback(
    debounce(handleSubmit, DEBOUNCE_DELAY),
    [handleSubmit]
  );

  const onPickDoctor = (id: number) => {
    const d = doctors.find((x) => x.id === id);
    setField("userID", id);
    setField("departmentID", d?.departmentID || 0);
  };

  const onPickHospital = (id: number) => {
    const hospital = hospitals.find((h) => h.id === id);
    if (hospital) {
      setField("hospitalID", id);
      setField("hospitalName", hospital.name);
    }
  };

  const showExtendedForm = user?.patientStatus !== 1;
  const calculateBottomPadding = () => {
    let padding = 16 + APP_FOOTER_H + insets.bottom;

    // If keyboard is open, we need more padding to ensure content is visible
    if (isKeyboardVisible && keyboardHeight > 0) {
      padding += keyboardHeight;
    }

    return padding;
  };
  const handleScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
    scrollViewHeight.current = e.nativeEvent.layout.height;
  }, []);

  const handleContentSizeChange = useCallback((width: number, height: number) => {
    scrollViewContentHeight.current = height;
  }, []);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : (
         <>
          <ScrollView
            ref={scrollRef}
              onLayout={handleScrollViewLayout}
              onContentSizeChange={handleContentSizeChange}
              contentContainerStyle={{
                padding: 12,
                paddingBottom: calculateBottomPadding(),
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              {/* Transfer Type Section - Only show when in IPD (patientStatus !== 1) */}
              {showExtendedForm && (
                <View>
                  <Field label="Type of Transfer *" error={errors.transferType}>
                    <View style={styles.radioGroup}>
                      <View style={styles.radioOption}>
                        <Pressable
                          onPress={() => setField("transferType", transferType.internal)}
                          style={styles.radioButton}
                        >
                          <View style={styles.radioCircle}>
                            {form.transferType === transferType.internal && (
                              <View style={styles.radioInnerCircle} />
                            )}
                          </View>
                          <Text style={styles.radioLabel}>Internal</Text>
                        </Pressable>
                      </View>
                      <View style={styles.radioOption}>
                        <Pressable
                          onPress={() => setField("transferType", transferType.external)}
                          style={styles.radioButton}
                        >
                          <View style={styles.radioCircle}>
                            {form.transferType === transferType.external && (
                              <View style={styles.radioInnerCircle} />
                            )}
                          </View>
                          <Text style={styles.radioLabel}>External</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Field>
                </View>
              )}

              {/* Conditional Fields based on Transfer Type */}
              {showExtendedForm && form.transferType === transferType.internal ? (
                // Internal Transfer Fields
                <>
            {/* Ward */}
            <View>
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
            <View>
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
                </>
              ) : showExtendedForm && form.transferType === transferType.external ? (
                // External Transfer Fields
                <>
                  <View>
                    <Field label="Hospital Name *" error={errors.hospitalName}>
                      <Pressable
                        onPress={() => setOpenHospital(true)}
                        style={[
                          styles.input,
                          {
                            borderColor: errors.hospitalName
                              ? COLORS.danger
                              : COLORS.border,
                          },
                        ]}
                      >
                        <Text style={styles.inputText}>
                          {form.hospitalName || "Select Hospital"}
                        </Text>
                      </Pressable>
                    </Field>
                  </View>
                </>
              ) : (
                // Default/Internal Transfer Fields (when not in extended form)
                <>
                  {/* Ward */}
                  <View>
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
                  <View>
                    <Field
                      label="Doctor Name *"
                      error={errors.userID || errors.departmentID}
                    >
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
                </>
              )}

            {/* Reason */}
            <View>
              <Field label="Reason *" error={errors.reason}>
                <TextInput
                  value={form.reason}
                  onFocus={handleFocus("reason")}
                  onBlur={handleBlur}
                  onChangeText={(t) => setField("reason", t)}
                  placeholder="Enter reason"
                  placeholderTextColor={COLORS.sub}
                  multiline
                  numberOfLines={3}
                    style={[
                      styles.input,
                      {
                        height: 96,
                        borderColor: errors.reason ? COLORS.danger : COLORS.border,
                      },
                    ]}
                    returnKeyType="next"
                />
              </Field>
            </View>

            {/* Vitals */}
            <Text style={styles.sectionTitle}>Vitals</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Oxygen (%)" error={errors.oxygen}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.oxygen || "")}
                    onFocus={handleFocus("oxygen")}
                    onBlur={handleBlur}
                    onChangeText={(t) => setField("oxygen", t)}
                    placeholder="e.g. 96"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.oxygen ? COLORS.danger : COLORS.border },
                    ]}
                      returnKeyType="next"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Temperature (°C)" error={errors.temp}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.temp || "")}
                    onFocus={handleFocus("temp")}
                    onBlur={handleBlur}
                    onChangeText={(t) => setField("temp", t)}
                    placeholder="e.g. 37"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.temp ? COLORS.danger : COLORS.border },
                    ]}
                      returnKeyType="next"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Pulse (bpm)" error={errors.pulse}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.pulse || "")}
                    onFocus={handleFocus("pulse")}
                      onBlur={handleBlur}
                    onChangeText={(t) => setField("pulse", t)}
                    placeholder="e.g. 78"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.pulse ? COLORS.danger : COLORS.border },
                    ]}
                    returnKeyType="next"
                  />
                </Field>
              </View>
            </View>


            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Blood Pressure High (mmHg)" error={errors.bpH || errors.bp}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.bpH || "")}
                    onFocus={handleFocus("bpH")}
                    onBlur={handleBlur}
                    onChangeText={(t) => setField("bpH", t)}
                    placeholder="e.g. 120"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.bpH ? COLORS.danger : COLORS.border },
                    ]}
                      returnKeyType="next"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Blood Pressure Low (mmHg)" error={errors.bpL || errors.bp}>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.bpL || "")}
                    onFocus={handleFocus("bpL")}
                    onBlur={handleBlur}
                    onChangeText={(t) => setField("bpL", t)}
                    placeholder="e.g. 80"
                    placeholderTextColor={COLORS.sub}
                    style={[
                      styles.input,
                      { borderColor: errors.bpL ? COLORS.danger : COLORS.border },
                    ]}
                      returnKeyType="next"
                  />
                </Field>
              </View>
            </View>

              {/* Relative Name */}
              <View>
                <Field label="Relative Name" error={errors.relativeName}>
                <TextInput
                  value={form.relativeName}
                  onFocus={handleFocus("relativeName")}
                  onBlur={handleBlur}
                  onChangeText={(t) => setField("relativeName", t)}
                  placeholder="Relative name"
                  placeholderTextColor={COLORS.sub}
                  style={[
                      styles.input,
                      {
                        borderColor: errors.relativeName
                          ? COLORS.danger
                          : COLORS.border,
                      },
                    ]}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      handleBlur();
                      Keyboard.dismiss();
                    }}
                />
              </Field>
            </View>
      <View style={[styles.footer, { marginTop: 12 }]}>
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
    </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>

      {/* Bottom app footer (global navigat*/}
      {!isKeyboardVisible && (
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      )}

      {insets.bottom > 0 && !isKeyboardVisible && (
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

      {/* Hospital Picker Modal */}
      <PickerSheet
        visible={openHospital}
        title="Select Hospital"
        onClose={() => setOpenHospital(false)}
        items={hospitals.map((h) => ({
          key: String(h.id),
          label: `${h.name}${h.city ? `, ${h.city}` : ""}${h.state ? `, ${h.state}` : ""}`,
          value: h.id,
        }))}
        onPick={(id) => onPickHospital(id)}
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

  label: { color: COLORS.sub, fontWeight: "700", marginBottom: 6, fontSize: 12 },
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

  // Radio button styles
  radioGroup: {
    flexDirection: "row",
    gap: 20,
    marginTop: 4,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brand,
  },
  radioLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  footer: {
    // not absolute anymore, just a row at end of form
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
    zIndex: 10,
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
    zIndex: 20,
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
    // position: "absolute",
    left: 0,
    right: 0,
    height: APP_FOOTER_H,
    justifyContent: "center",
    zIndex: 5,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});
