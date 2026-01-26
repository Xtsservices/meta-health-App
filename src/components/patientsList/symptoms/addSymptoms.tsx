// src/screens/.../AddSymptomsScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  FlatList,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus, X } from "lucide-react-native";
import { AuthPost } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
import { showError, showSuccess } from "../../../store/toast.slice";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../utils/colour";

type Unit = "days" | "weeks" | "months" | "year";
type UnitDisplay = "day" | "week" | "month" | "year" | "days" | "weeks" | "months";

const UNITS: Unit[] = ["days", "weeks", "months", "year"];

type NewSym = {
  name: string;
  duration: string;
  durationParameter: Unit;
  conceptID?: string;
  notes?: string;
};
type Symptom = { id: number; concept_id: string; type_id: string; term: string };

export default function AddSymptomsScreen() {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);
  const timeline = cp?.patientTimeLineID; // may be object or id depending on your store
  const dispatch = useDispatch();
  const [symptom, setSymptom] = useState("");
  const [duration, setDuration] = useState("");
  const [unit, setUnit] = useState<Unit>("days");
  const [notes, setNotes] = useState("");
  const [bag, setBag] = useState<NewSym[]>([]);
  const [saving, setSaving] = useState(false);
  // remember picked suggestion
  const [picked, setPicked] = useState<Symptom | null>(null);
  const insets = useSafeAreaInsets();

  // type-ahead state
  const [suggestions, setSuggestions] = useState<Symptom[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);

  // --- helpers: de-dupe + prefix filter like web ---
  const removeDuplicatesAndFilter = useMemo(
    () => (symptoms: Symptom[], prefix: string): Symptom[] => {
      const map = new Map<string, Symptom>();
      symptoms.forEach((s) => map.set(s.term.toLowerCase(), s));
      const uniq = Array.from(map.values());
      return uniq.filter((s) =>
        s.term.toLowerCase().startsWith(prefix.toLowerCase())
      );
    },
    []
  );

  // stable fetch
  const fetchSymptomsList = useCallback(
    async (val: string) => {
      if (!val || val.length < 1) {
        setSuggestions([]);
        return;
      }
      setLoadingSugg(true);
      try {
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        const res = await AuthPost("data/symptoms", { text: val }, token);
        if (
          res?.status === "success" &&
          "data" in res &&
          Array.isArray(res?.data?.symptoms)
        ) {
          setSuggestions(removeDuplicatesAndFilter(res.data?.symptoms, val));
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSugg(false);
      }
    },
    [removeDuplicatesAndFilter, user?.token]
  );
const getDisplayUnit = (unit: Unit, duration: string): UnitDisplay => {
  const dur = parseInt(duration, 10);
  if (dur === 1) {
    switch (unit) {
      case "days": return "day";
      case "weeks": return "week";
      case "months": return "month";
      case "year": return "year";
      default: return unit;
    }
  }
  return unit;
};
  const latestFetchRef = useRef(fetchSymptomsList);
  useFocusEffect(
    useCallback(() => {
      latestFetchRef.current = fetchSymptomsList;
    }, [fetchSymptomsList])
  );

  const debouncedFetchRef = useRef(
    debounce((q: string) => latestFetchRef.current(q), DEBOUNCE_DELAY)
  );

  // clean up debounce on unmount
  useEffect(() => {
    return () => debouncedFetchRef.current.cancel();
  }, []);

  const debouncedFetch = React.useMemo(
    () => debounce((q: string) => fetchSymptomsList(q), DEBOUNCE_DELAY),
    [fetchSymptomsList]
  );
  useEffect(() => () => debouncedFetch.cancel(), [debouncedFetch]);

  const selectSuggestion = (s: Symptom) => {
    setSymptom(s.term);
    setPicked(s);
    setSuggestions([]);
  };

  // --- NEW: duplicate prevention logic added here ---
  const addToList = () => {
    const typed = symptom.trim();
    if (!typed || !duration.trim()) {
      dispatch(showError("Please enter symptom and duration."));
      return;
    }
    if (unit === "year" && parseInt(duration, 10) > 5) {
      dispatch(showError("Year should be less than or equal to 5."));
      return;
    }

    // Require selecting from dropdown to get concept_id (or match by term)
    const match =
      (picked && picked.term === symptom ? picked : suggestions.find((s) => s.term === symptom)) as
        | Symptom
        | undefined;

    if (!match) {
      dispatch(showError("Please pick a symptom from the suggestions list."));
      return;
    }

    // Prevent duplicates by name (case-insensitive)
    const nameExists = bag.some(
      (b) => b.name?.toLowerCase() === typed.toLowerCase()
    );
    if (nameExists) {
      dispatch(showError("This symptom is already added."));
      return;
    }

    // Prevent duplicates by SNOMED concept ID if present
    if (match.concept_id) {
      const conceptExists = bag.some((b) => b.conceptID === match.concept_id);
      if (conceptExists) {
        dispatch(showError("This symptom (same concept) is already added."));
        return;
      }
    }

    // Add to bag
    setBag((prev) => [
      ...prev,
      {
        name: typed,
        duration: duration.trim(),
        durationParameter: unit,
        notes,
        conceptID: match.concept_id,
      },
    ]);

    // reset inputs
    setSymptom("");
    setDuration("");
    setUnit("days");
    setNotes("");
    setSuggestions([]);
    setPicked(null);
  };

  const removeFromList = (idx: number) =>
    setBag((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!bag.length) {
      dispatch(showError("Add at least one symptom to the list."));
      return;
    }

    // resolve timeline id + patient id from store shape
    const timeLineID = typeof timeline === "object" ? timeline?.id : timeline;
    const patientID = (cp as any)?.currentPatient?.id ?? (cp as any)?.id;

    if (!timeLineID || !patientID) {
      dispatch(showError("Missing patient timeline."));
      return;
    }

    setSaving(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const body = {
        timeLineID,
        userID: user?.id,
        symptoms: bag.map((s) => ({
          symptom: s.name,
          duration: s.duration,
          durationParameter: s.durationParameter,
          conceptID: s.conceptID,
        })),
        patientID,
      };
      const res = await AuthPost("symptom", body, token);
      if (res?.status === "success") {
        dispatch(showSuccess("Symptoms added successfully"));
        navigation.goBack();
      } else {
        dispatch(
          showError("message" in res && res.message ? res.message : "Failed to submit symptoms.")
        );
      }
    } catch (e) {
      const errorMessage =
        typeof e === "object" && e !== null && "message" in e
          ? (e as { message?: string }).message
          : undefined;
      dispatch(showError(errorMessage || "Failed to submit symptoms."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}>
          <Text style={[styles.title, { color: COLORS.text }]}>Add Patient Symptoms</Text>

          {/* Symptom (type-ahead) */}
          <Text style={[styles.label, { color: COLORS.sub }]}>Symptom *</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              placeholder="e.g., Fever, Cough"
              placeholderTextColor={COLORS.sub}
              style={[styles.input, { borderColor: COLORS.border, color: COLORS.text, backgroundColor: COLORS.field }]}
              value={symptom}
              onChangeText={(t) => {
                if (/^[A-Za-z\s]*$/.test(t)) {
                  setSymptom(t);
                  setPicked(null);
                  const q = t.trim();
                  if (q.length >= 1) {
                    debouncedFetchRef.current(q);
                  } else {
                    debouncedFetchRef.current.cancel();
                    setSuggestions([]);
                  }
                }
              }}
            />

            {/* Suggestions dropdown */}
            {(loadingSugg || suggestions.length > 0) && symptom.length > 0 && (
              <View style={[styles.suggBox, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}>
                {loadingSugg ? (
                  <View style={styles.suggRowCenter}>
                    <ActivityIndicator size="small" color={COLORS.brand} />
                  </View>
                ) : (
                  <FlatList
                    data={suggestions}
                    keyExtractor={(it) => String(it.id)}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <Pressable style={styles.suggRow} onPress={() => selectSuggestion(item)}>
                        <Text style={{ color: COLORS.text, fontWeight: "600" }}>{item.term}</Text>
                        <Text style={{ color: COLORS.sub, fontSize: 11 }}>SNOMED: {item.concept_id}</Text>
                      </Pressable>
                    )}
                    ListEmptyComponent={
                      <View style={styles.suggRowCenter}>
                        <Text style={{ color: COLORS.sub, fontSize: 12 }}>No matches</Text>
                      </View>
                    }
                  />
                )}
              </View>
            )}
          </View>

          {/* Duration */}
          <Text style={[styles.label, { color: COLORS.sub }]}>Duration *</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              placeholder="e.g., 3"
              placeholderTextColor={COLORS.sub}
              keyboardType="number-pad"
              value={duration}
              onChangeText={(t) => {
                if (/^\d*$/.test(t) && t.length <= 2) setDuration(t);
              }}
              style={[
                styles.input,
                { flex: 1, borderColor: COLORS.border, color: COLORS.text, backgroundColor: COLORS.field },
              ]}
            />
          </View>

          {/* Units */}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
            {UNITS.map((u) => {
              const selected = unit === u;
              const displayUnit = getDisplayUnit(u, duration);
              return (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  style={[
                    styles.pill,
                    {
                      borderColor: COLORS.border,
                      backgroundColor: selected ? COLORS.button : COLORS.pill,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? COLORS.buttonText : COLORS.text, fontWeight: "700", fontSize: 12 }}>
                    {displayUnit}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Add to list */}
          <Pressable
            onPress={addToList}
            style={[styles.rowBtn, { borderColor: COLORS.border, backgroundColor: COLORS.pill }]}
          >
            <Plus size={16} color={COLORS.text} />
            <Text style={{ color: COLORS.text, fontWeight: "700" }}>Add to List</Text>
          </Pressable>

          {/* Bag chips */}
          {bag.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {bag.map((it, idx) => (
                <View
                  key={`${it.name}-${idx}`}
                  style={[styles.chip, { borderColor: COLORS.border, backgroundColor: COLORS.pill }]}
                >
                  <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 12 }}>
                    {it.name}: {it.duration} {it.durationParameter}
                  </Text>
                  <Pressable onPress={() => removeFromList(idx)} hitSlop={6} style={{ marginLeft: 15 }}>
                    <X size={20} color={COLORS.sub} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Submit */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable onPress={() => navigation.goBack()} style={[styles.sheetBtn, { backgroundColor: COLORS.pill }]}>
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={saving || bag.length === 0}
              onPress={submit}
              style={[styles.sheetBtn, { backgroundColor: COLORS.button, opacity: saving || bag.length === 0 ? 0.6 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.buttonText} />
              ) : (
                <Text style={{ color: COLORS.buttonText, fontWeight: "700" }}>Submit ({bag.length})</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flexGrow: 1, padding: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "800" },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  rowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "90%",
  },
  sheetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
  },
  suggBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 58,
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 220,
    overflow: "hidden",
    zIndex: 10,
  },
  suggRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 2,
  },
  suggRowCenter: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 70,
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
