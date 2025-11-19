import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
import Footer from "../../dashboard/footer";
import { Role_NAME } from "../../../utils/role";
import { COLORS } from "../../../utils/colour";

type RootState = any;

type Staff = {
  id: number;
  firstName?: string;
  lastName?: string;
  department?: string | null;
};



const FOOTER_H = 70;

const CATEGORY_OPTS = [
  { label: "Primary", value: "primary" as const },
  { label: "Secondary", value: "secondary" as const },
];

const fullName = (s: Staff) =>
  [s.firstName?.trim(), s.lastName?.trim()].filter(Boolean).join(" ") || `#${s.id}`;

export default function AddDoctorScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);

  const hospitalID = user?.hospitalID;
  const timelineId = cp?.timeline?.id ?? cp?.patientTimeLineID ?? cp?.timeline;

  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Staff[]>([]);

  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [category, setCategory] = useState<"primary" | "secondary" | null>(null);
  const [purpose, setPurpose] = useState("");

  // dropdown locals
  const [openDocList, setOpenDocList] = useState(false);
  const [openCatList, setOpenCatList] = useState(false);

  const bottomPad = FOOTER_H + Math.max(insets.bottom, 12) + 12;

  const loadDoctors = async () => {
    if (!hospitalID) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(`user/${hospitalID}/list/${Role_NAME.doctor}`, token);
      if (res?.status === "success" || res?.message === "success") {
        setDoctors(res?.data?.users || []);
      } else {
        setDoctors([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(
    () => !!doctorId && !!category && !!timelineId,
    [doctorId, category, timelineId]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    const body = {
      patientTimeLineId: timelineId,
      doctorId: doctorId,
      category: category,
      purpose,
      scope: "doctor",
    };

    const res = await AuthPost(`doctor/${hospitalID}`, body, token);
    if (res?.status === "success" ) {
      // go back to list; DoctorsScreen will refetch on focus
      navigation.goBack();
    }
  };

  const debouncedSubmit = useMemo(
    () => debounce(handleSubmit, DEBOUNCE_DELAY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSubmit]
  );

  useEffect(() => () => debouncedSubmit.cancel(), [debouncedSubmit]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator
        >
          <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}>
            <Text style={styles.title}>Add Doctor</Text>

            {loading ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator size="large" color={COLORS.brand} />
              </View>
            ) : (
              <>
                {/* Doctor Picker */}
                <Text style={[styles.label, { color: COLORS.label }]}>Doctor</Text>
                <Pressable
                  onPress={() => setOpenDocList((v) => !v)}
                  style={[styles.select, { borderColor: COLORS.border, backgroundColor: COLORS.field }]}
                >
                  <Text style={{ color: doctorId ? COLORS.text : COLORS.sub, fontWeight: "800" }}>
                    {doctorId ? fullName(doctors.find((d) => d.id === doctorId)!) : "Select doctor"}
                  </Text>
                </Pressable>
                {openDocList && (
                  <View style={[styles.dropdown, { borderColor: COLORS.border }]}>
                    <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
                      {doctors.map((d) => (
                        <Pressable
                          key={d.id}
                          onPress={() => {
                            setDoctorId(d.id);
                            setOpenDocList(false);
                          }}
                          style={styles.option}
                        >
                          <Text style={{ fontWeight: "800", color: COLORS.text }}>{fullName(d)}</Text>
                          {!!d.department && (
                            <Text style={{ color: COLORS.sub, fontSize: 11 }}>{d.department}</Text>
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Category Picker */}
                <Text style={[styles.label, { color: COLORS.label, marginTop: 12 }]}>Category</Text>
                <Pressable
                  onPress={() => setOpenCatList((v) => !v)}
                  style={[styles.select, { borderColor: COLORS.border, backgroundColor: COLORS.field }]}
                >
                  <Text style={{ color: category ? COLORS.text : COLORS.sub, fontWeight: "800" }}>
                    {category
                      ? CATEGORY_OPTS.find((c) => c.value === category)?.label
                      : "Select category"}
                  </Text>
                </Pressable>
                {openCatList && (
                  <View style={[styles.dropdown, { borderColor: COLORS.border }]}>
                    {CATEGORY_OPTS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          setCategory(opt.value);
                          setOpenCatList(false);
                        }}
                        style={styles.option}
                      >
                        <Text style={{ fontWeight: "800", color: COLORS.text }}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Purpose */}
                <Text style={[styles.label, { color: COLORS.label, marginTop: 12 }]}>Reason</Text>
                <TextInput
                  placeholder="Type the purpose..."
                  placeholderTextColor={COLORS.sub}
                  value={purpose}
                  onChangeText={setPurpose}
                  multiline
                  numberOfLines={4}
                  style={[
                    styles.input,
                    {
                      borderColor: COLORS.border,
                      backgroundColor: COLORS.field,
                      height: 96,
                      textAlignVertical: "top",
                    },
                  ]}
                />

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                  <Pressable
                    onPress={() => navigation.goBack()}
                    style={[styles.button, { backgroundColor: COLORS.chip }]}
                  >
                    <Text style={{ color: COLORS.text, fontWeight: "800" }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => debouncedSubmit()}
                    disabled={!canSubmit}
                    style={[
                      styles.button,
                      { backgroundColor: COLORS.brand, opacity: canSubmit ? 1 : 0.6 },
                    ]}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800" }}>Submit</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Footer pinned above system nav */}
        <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
          <Footer active={"patients"} brandColor="#14b8a6" />
        </View>
        {insets.bottom > 0 && (
          <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  card: { borderWidth: 1.5, borderRadius: 16, padding: 14 },
  title: { fontSize: 16, fontWeight: "900", marginBottom: 8, color: COLORS.label },
  label: { fontSize: 12, fontWeight: "800" },

  select: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  dropdown: {
    marginTop: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 2,
  },

  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 6,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
  },

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
