/*=====================================================================
  AddMedicineScreen.tsx
  Mobile-first version of the MUI web dialog - FULLY FIXED
=====================================================================*/
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { RootState } from "../../../store/store";
import { AuthPost, AuthFetch } from "../../../auth/auth";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
import { timeOfMedication } from "../../../utils/list";
import { medicineCategory, medicineCategoryType } from "../../../utils/medicines";
import { showError } from "../../../store/toast.slice";

/* ------------------------------------------------------------------ */
/* Types (mirrors the web version)                                    */
/* ------------------------------------------------------------------ */
type MedicineRow = {
  medicineName: string;
  medicineType: number;
  doseCount: number | null;
  doseUnit: string;
  Frequency: number;
  medicationTime: string;
  daysCount: number | null;
  medicineStartDate: string;
  test: string;
  advice: string;
  followUp: 0 | 1;
  followUpDate: string;
  medicineList: string[];
};

const emptyRow: MedicineRow = {
  medicineName: "",
  medicineType: 0,
  doseCount: null,
  doseUnit: "",
  Frequency: 1,
  medicationTime: "",
  daysCount: null,
  medicineStartDate: "",
  test: "",
  advice: "",
  followUp: 0,
  followUpDate: "",
  medicineList: [],
};

/* ------------------------------------------------------------------ */
/* Helper utilities                                                   */
/* ------------------------------------------------------------------ */
const formatYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const todayYMD = () => formatYMD(new Date());

const parseTimes = (s = "") =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

/* Unit mapping by medicine type */
const UNIT_BY_TYPE: Record<number, string> = {
  1: "mg", // Tablet
  2: "ml", // Syrup
  3: "ml", // Injection
  4: "ml", // IV Line
  5: "μg", // Inhaler
};

/* ------------------------------------------------------------------ */
/* MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */
export default function AddMedicineScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);
  const timeline = cp?.patientTimeLineID || {};
  const timeLineID = typeof timeline === "object" ? timeline?.id : timeline;
  const patientID = cp?.currentPatient?.id ?? cp?.id;

  const [rows, setRows] = useState<MedicineRow[]>([emptyRow]);
  const [copyMode, setCopyMode] = useState(false);
  const [existingPrescriptions, setExistingPrescriptions] = useState<any[]>([]);
  const [testOptions, setTestOptions] = useState<string[]>([]);
  const [searchTest, setSearchTest] = useState<Record<number, string>>({});
  const [testNote, setTestNote] = useState<Record<number, string>>({});
  const [medicineOptions, setMedicineOptions] = useState<Record<number, string[]>>({});
  const [selectedMedicine, setSelectedMedicine] = useState<Record<number, boolean>>({});
  const [selectedTest, setSelectedTest] = useState<Record<number, boolean>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState<Record<number, boolean>>({});
  const [showFollowUpPicker, setShowFollowUpPicker] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);

  /* --------------------------------------------------------------- */
  /* Load existing prescriptions                                     */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (!user?.token || !timeLineID) return;
    (async () => {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(
        `prescription/${user.hospitalID}/${timeLineID}/${patientID}`,
        token
      );
      if (res?.status === "success") setExistingPrescriptions(res.data?.prescriptions || []);
    })();
  }, [user, timeLineID, patientID]);

  /* --------------------------------------------------------------- */
  /* Medicine autocomplete                                           */
  /* --------------------------------------------------------------- */
  const fetchMedicines = useCallback(
    debounce(async (text: string, rowIdx: number) => {
      if (text.length < 1) return;
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthPost(
        `medicine/${user?.hospitalID}/getMedicines`,
        { text },
        token
      );
      if (res?.status === "success") {
        const names = res.data?.medicines.map((m: any) => m.Medicine_Name).filter(Boolean);
        setMedicineOptions((prev) => ({ ...prev, [rowIdx]: names }));
      }
    }, DEBOUNCE_DELAY),
    [user]
  );

  /* --------------------------------------------------------------- */
  /* Test autocomplete                                               */
  /* --------------------------------------------------------------- */
  const fetchTests = useCallback(
    debounce(async (text: string) => {
      if (text.length < 1) return;
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthPost(
        `data/lionicCode/${user?.hospitalID}`,
        { text },
        token
      );
      if (res?.status === "success") {
        const unique = Array.from(
          new Set(
            (res.data?.data as { LOINC_Name: string }[])
              .map((t) => t.LOINC_Name?.trim())
              .filter(Boolean)
          )
        );
        setTestOptions(unique);
      }
    }, DEBOUNCE_DELAY),
    [user]
  );

  /* --------------------------------------------------------------- */
  /* Row helpers                                                     */
  /* --------------------------------------------------------------- */
  const addRow = () => setRows((p) => [...p, { ...emptyRow }]);
  const deleteRow = (idx: number) =>
    setRows((p) => p.filter((_, i) => i !== idx));

  const updateRow = <K extends keyof MedicineRow>(
    idx: number,
    field: K,
    value: MedicineRow[K]
  ) => {
    setRows((p) => {
      const next = [...p];
      next[idx][field] = value;

      // Auto-select unit when medicine type changes
      if (field === "medicineType" && value) {
        const unit = UNIT_BY_TYPE[value as number];
        if (unit && !next[idx].doseUnit) {
          next[idx].doseUnit = unit;
        }
      }

      return next;
    });
  };

  /* --------------------------------------------------------------- */
  /* Time-of-Medication handling                                     */
  /* --------------------------------------------------------------- */
  const toggleTime = (rowIdx: number, slot: string) => {
    setRows((p) => {
      const row = { ...p[rowIdx] };
      let times = parseTimes(row.medicationTime);
      const prn = "As Per Need";

      if (slot === prn) {
        if (times.includes(prn)) {
          times = times.filter((t) => t !== prn);
        } else {
          times = [prn];
          row.Frequency = 1;
          row.daysCount = 0;
        }
      } else {
        times = times.filter((t) => t !== prn);
        const active = times.includes(slot);
        if (active) {
          times = times.filter((t) => t !== slot);
        } else {
          const max = row.Frequency || 1;
          if (times.length >= max) {
            dispatch(showError(`You may select up to ${max} time(s).`));
            return p;
          }
          times.push(slot);
        }
      }
      row.medicationTime = times.join(",");
      const next = [...p];
      next[rowIdx] = row;
      return next;
    });
  };

  const changeFrequency = (rowIdx: number, newFreq: number) => {
    setRows((p) => {
      const row = { ...p[rowIdx] };
      row.Frequency = newFreq;
      if (!row.medicationTime.includes("As Per Need")) {
        const times = parseTimes(row.medicationTime);
        if (times.length > newFreq) {
          row.medicationTime = times.slice(0, newFreq).join(",");
        }
      }
      const next = [...p];
      next[rowIdx] = row;
      return next;
    });
  };

  /* --------------------------------------------------------------- */
  /* Add test (name|note)                                            */
  /* --------------------------------------------------------------- */
  const addTest = (rowIdx: number) => {
    const term = (searchTest[rowIdx] || "").trim();
    const note = (testNote[rowIdx] || "").trim();

    if (!term) {
      dispatch(showError("Enter a test name."));
      return;
    }

    if (!selectedTest[rowIdx] && testOptions.length > 0) {
      dispatch(showError("Please select a test from the dropdown list."));
      return;
    }

    setRows((p) => {
      const row = { ...p[rowIdx] };
      const existing = (row.test || "")
        .split("#")
        .map((t) => t.trim())
        .filter(Boolean);
      const entry = note ? `${term}|${note}` : term;
      if (!existing.some((e) => e.split("|")[0].toLowerCase() === term.toLowerCase())) {
        existing.push(entry);
      }
      row.test = existing.join("#");
      const next = [...p];
      next[rowIdx] = row;
      return next;
    });

    setSearchTest((p) => ({ ...p, [rowIdx]: "" }));
    setTestNote((p) => ({ ...p, [rowIdx]: "" }));
    setSelectedTest((p) => ({ ...p, [rowIdx]: false }));
  };

  /* --------------------------------------------------------------- */
  /* Validation + Submit                                             */
  /* --------------------------------------------------------------- */
  const validateAndSubmit = async () => {
    setLoading(true);
    try {
      const hasMed = rows.some((r) => r.medicineName.trim());
      const hasTest = rows.some((r) => r.test.trim());
      if (!hasMed && !hasTest) {
        dispatch(showError("Add at least one medicine or test."));
        return;
      }

      // Validate medicine selected from dropdown
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.medicineName && !selectedMedicine[i]) {
          const opts = medicineOptions[i] || [];
          if (opts.length > 0 && !opts.includes(r.medicineName)) {
            dispatch(showError(`Please select "${r.medicineName}" from the medicine dropdown.`));
            return;
          }
        }
      }

      // Duplicate check
      const duplicate = rows.find((newRow) => {
        if (!newRow.medicineName) return false;
        return existingPrescriptions.some((old) => {
          if (old.status !== 1) return false;
          if (old.medicine !== newRow.medicineName) return false;
          if (Number(old.medicineType) !== newRow.medicineType) return false;

          const oldStart = new Date(old.medicineStartDate);
          const newStart = new Date(newRow.medicineStartDate || todayYMD());
          const oldEnd = new Date(oldStart);
          oldEnd.setDate(oldEnd.getDate() + parseInt(old.medicineDuration || "0") - 1);

          const overlap = newStart >= oldStart && newStart <= oldEnd;
          const timeOverlap = old.medicineTime
            .split(",")
            .some((ot) =>
              newRow.medicationTime
                .split(",")
                .some((nt) => ot.trim() === nt.trim())
            );
          return overlap && timeOverlap;
        });
      });

      if (duplicate) {
        dispatch(showError(`Prescription for **${duplicate.medicineName}** with same timing already exists.`));
        return;
      }

      // Row-level validation
      for (const r of rows) {
        if (r.medicineName) {
          if (!r.medicineType) {
            dispatch(showError("Select a medicine type."));
            return;
          }
          if (!r.doseCount) {
            dispatch(showError("Enter a dosage."));
            return;
          }
          if (!r.doseUnit) {
            dispatch(showError("Select a dosage unit."));
            return;
          }
          if (!r.daysCount) {
            dispatch(showError("Enter duration (days)."));
            return;
          }
          const selectedTimes = parseTimes(r.medicationTime).filter((t) => t !== "As Per Need");
          if (selectedTimes.length < r.Frequency && !r.medicationTime.includes("As Per Need")) {
            dispatch(showError(`Select ${r.Frequency} time(s) of medication.`));
            return;
          }
        }
      }

      // Build payload
      const payload = rows.map((r) => ({
        timeLineID,
        patientID,
        userID: user?.id,
        medicineType: String(r.medicineType),
        medicine: r.medicineName,
        medicineDuration: String(r.daysCount ?? 0),
        meddosage: r.doseCount ?? 0,
        medicineFrequency: String(r.Frequency),
        medicineTime: r.medicationTime,
        test: r.test,
        advice: r.advice,
        followUp: r.followUp,
        followUpDate: r.followUpDate,
        medicineStartDate: r.medicineStartDate || todayYMD(),
        dosageUnit: r.doseUnit,
      }));
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthPost(
        `prescription/${user?.hospitalID}?copy=${copyMode}`,
        { finalData: payload },
        token
      );
      if (res?.status === "success") {
        dispatch(showError(res?.data?.message || "Prescription saved successfully!"));
        navigation.goBack();
      } else {
        dispatch(showError(res?.message || "Failed to save prescription."));
      }
    } finally {
      setLoading(false);
    }
  };

  const debouncedSubmit = useMemo(
    () => debounce(validateAndSubmit, DEBOUNCE_DELAY),
    [rows, copyMode, existingPrescriptions, user, timeLineID, patientID]
  );

  /* --------------------------------------------------------------- */
  /* Copy existing prescription                                      */
  /* --------------------------------------------------------------- */
  const copyPrescription = () => {
    const active = existingPrescriptions.filter((p) => p.status === 1);
    const mapped: MedicineRow[] = active.map((p) => ({
      ...emptyRow,
      medicineName: p.medicine ?? "",
      medicineType: Number(p.medicineType) ?? 0,
      doseCount: Number(p.meddose) ?? null,
      doseUnit: p.dosageUnit ?? "",
      Frequency: Number(p.medicineFrequency) ?? 1,
      medicationTime: p.medicineTime ?? "",
      daysCount: Number(p.medicineDuration) ?? null,
      medicineStartDate: p.medicineStartDate ?? "",
      test: p.test ?? "",
      advice: p.advice ?? "",
      followUp: p.followUp ?? 0,
      followUpDate: p.followUpDate ?? "",
    }));
    setRows(mapped.length ? mapped : [emptyRow]);
    setCopyMode(true);
  };

  /* --------------------------------------------------------------- */
  /* UI – render a single row                                        */
  /* --------------------------------------------------------------- */
  const renderRow = (row: MedicineRow, idx: number) => {
    const isLast = idx === rows.length - 1;
    const medOptions = medicineOptions[idx] ?? [];

    return (
      <View key={idx} style={styles.card}>
        {/* Delete button */}
        {rows.length > 1 && (
          <Pressable onPress={() => deleteRow(idx)} style={styles.deleteBtn}>
            <Text style={styles.deleteX}>X</Text>
          </Pressable>
        )}

        {/* Medicine Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Medicine Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Amoxicillin"
            value={row.medicineName}
            onChangeText={(t) => {
              updateRow(idx, "medicineName", t);
              setSelectedMedicine((p) => ({ ...p, [idx]: false }));
              fetchMedicines(t, idx);
            }}
          />
          {medOptions.length > 0 && (
            <ScrollView style={styles.autoList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {medOptions.map((opt, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    updateRow(idx, "medicineName", opt);
                    setMedicineOptions((p) => ({ ...p, [idx]: [] }));
                    setSelectedMedicine((p) => ({ ...p, [idx]: true }));
                  }}
                  style={styles.autoItem}
                >
                  <Text style={styles.autoText}>{opt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Medicine Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Medicine Type</Text>
          <View style={styles.pickerWrap}>
            {Object.keys(medicineCategory).map((key) => {
              const val = medicineCategory[key as keyof medicineCategoryType];
              const label =
                key.toLowerCase() === "ivline" ? "IV Line" : key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
              return (
                <Pressable
                  key={val}
                  onPress={() => updateRow(idx, "medicineType", val)}
                  style={[styles.pill, row.medicineType === val && styles.pillActive]}
                >
                  <Text style={[styles.pillText, row.medicineType === val && styles.pillTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dosage & Unit */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Dosage</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="250"
              value={row.doseCount?.toString() ?? ""}
              onChangeText={(t) => {
                const n = t === "" ? null : Number(t);
                updateRow(idx, "doseCount", n);
              }}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.pickerWrap}>
              {["μg", "mg", "g", "ml", "l"].map((u) => (
                <Pressable
                  key={u}
                  onPress={() => updateRow(idx, "doseUnit", u)}
                  style={[styles.pill, row.doseUnit === u && styles.pillActive]}
                >
                  <Text style={[styles.pillText, row.doseUnit === u && styles.pillTextActive]}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Frequency & Duration */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Frequency</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="1"
              value={row.Frequency.toString()}
              editable={!row.medicationTime.includes("As Per Need")}
              onChangeText={(t) => {
                const n = parseInt(t, 10) || 0;
                if (n > 6) return;
                changeFrequency(idx, n);
              }}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Duration (days)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="7"
              editable={!row.medicationTime.includes("As Per Need")}
              value={row.daysCount?.toString() ?? ""}
              onChangeText={(t) => {
                const n = t === "" ? null : Number(t);
                updateRow(idx, "daysCount", n);
              }}
            />
          </View>
        </View>

        {/* Time of Medication */}
        <View style={styles.field}>
          <Text style={styles.label}>Time of Medication</Text>
          <View style={styles.timeWrap}>
            {timeOfMedication.map((slot) => {
              const active = parseTimes(row.medicationTime).includes(slot);
              return (
                <Pressable
                  key={slot}
                  onPress={() => toggleTime(idx, slot)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {slot}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Start Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Start Date</Text>
          <Pressable
            onPress={() => setShowStartDatePicker((p) => ({ ...p, [idx]: true }))}
            style={styles.input}
          >
            <Text style={{ color: row.medicineStartDate ? COLORS.text : COLORS.sub }}>
              {row.medicineStartDate || todayYMD()}
            </Text>
          </Pressable>
          {showStartDatePicker[idx] && (
            <DateTimePicker
              mode="date"
              value={row.medicineStartDate ? new Date(row.medicineStartDate) : new Date()}
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowStartDatePicker((p) => ({ ...p, [idx]: false }));
                if (d) updateRow(idx, "medicineStartDate", formatYMD(d));
              }}
            />
          )}
        </View>

        {/* Tests */}
        <View style={styles.field}>
          <Text style={styles.label}>Tests</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 3+ letters"
            value={searchTest[idx] ?? ""}
            onChangeText={(t) => {
              setSearchTest((p) => ({ ...p, [idx]: t }));
              setSelectedTest((p) => ({ ...p, [idx]: false }));
              fetchTests(t);
            }}
          />
          {testOptions.length > 0 && (
            <ScrollView style={styles.autoList} nestedScrollEnabled>
              {testOptions
                .filter(
                  (t) =>
                    !row.test
                      .split("#")
                      .some((e) => e.split("|")[0].toLowerCase() === t.toLowerCase())
                )
                .map((opt, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setSearchTest((p) => ({ ...p, [idx]: opt }));
                      setTestOptions([]);
                      setSelectedTest((p) => ({ ...p, [idx]: true }));
                    }}
                    style={styles.autoItem}
                  >
                    <Text style={styles.autoText}>{opt}</Text>
                  </Pressable>
                ))}
            </ScrollView>
          )}

          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Optional note"
            value={testNote[idx] ?? ""}
            onChangeText={(t) => setTestNote((p) => ({ ...p, [idx]: t }))}
          />

          <Pressable style={styles.addBtn} onPress={() => addTest(idx)}>
            <Text style={styles.addBtnText}>Add Test</Text>
          </Pressable>

          <View style={styles.chipWrap}>
            {row.test
              .split("#")
              .filter(Boolean)
              .map((t, i) => {
                const [name, note] = t.split("|");
                return (
                  <View key={i} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {name}{note ? ` (${note})` : ""}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setRows((p) => {
                          const r = { ...p[idx] };
                          const arr = r.test.split("#").filter(Boolean);
                          arr.splice(i, 1);
                          r.test = arr.join("#");
                          const next = [...p];
                          next[idx] = r;
                          return next;
                        });
                      }}
                    >
                      <Text style={styles.chipDelete}>X</Text>
                    </Pressable>
                  </View>
                );
              })}
          </View>
        </View>

        {/* Follow-up */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Follow-up required?</Text>
            <View style={styles.pickerWrap}>
              {[{ label: "Yes", value: 1 }, { label: "No", value: 0 }].map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => updateRow(idx, "followUp", o.value as 0 | 1)}
                  style={[styles.pill, row.followUp === o.value && styles.pillActive]}
                >
                  <Text style={[styles.pillText, row.followUp === o.value && styles.pillTextActive]}>
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {row.followUp === 1 && (
            <View style={styles.col}>
              <Text style={styles.label}>Follow-up Date</Text>
              <Pressable
                onPress={() => setShowFollowUpPicker((p) => ({ ...p, [idx]: true }))}
                style={styles.input}
              >
                <Text style={{ color: row.followUpDate ? COLORS.text : COLORS.sub }}>
                  {row.followUpDate || "Select date"}
                </Text>
              </Pressable>
              {showFollowUpPicker[idx] && (
                <DateTimePicker
                  mode="date"
                  value={row.followUpDate ? new Date(row.followUpDate) : new Date()}
                  minimumDate={new Date()}
                  onChange={(_, d) => {
                    setShowFollowUpPicker((p) => ({ ...p, [idx]: false }));
                    if (d) updateRow(idx, "followUpDate", formatYMD(d));
                  }}
                />
              )}
            </View>
          )}
        </View>

        {/* Add More */}
        {isLast && (
          <Pressable style={styles.addMoreBtn} onPress={addRow}>
            <Text style={styles.addMoreText}>+ Add Another Medicine</Text>
          </Pressable>
        )}
      </View>
    );
  };

  /* --------------------------------------------------------------- */
  /* Render                                                          */
  /* --------------------------------------------------------------- */
  const bottomPad = insets.bottom + 80;

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        extraScrollHeight={120}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Add Prescription</Text>
          <Pressable
            onPress={copyPrescription}
            disabled={!existingPrescriptions.some((p) => p.status === 1 && p.medicine)}
            style={[
              styles.copyBtn,
              !existingPrescriptions.some((p) => p.status === 1 && p.medicine) && styles.copyBtnDisabled,
            ]}
          >
            <Text style={styles.copyBtnText}>Copy Prescription</Text>
          </Pressable>
        </View>

        {rows.map(renderRow)}

        <View style={styles.stickyFooter}>
          <Pressable onPress={() => navigation.goBack()} style={styles.footerBtnCancel}>
            <Text style={styles.footerBtnText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={debouncedSubmit} disabled={loading} style={styles.footerBtnSave}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnText}>Save</Text>}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

/*=====================================================================
  Styles
=====================================================================*/
const COLORS = {
  bg: "#f8fafc",
  card: "#fff",
  primary: "#14b8a6",
  primaryDark: "#0e8375",
  border: "#e2e8f0",
  text: "#0f172a",
  sub: "#64748b",
  danger: "#ef4444",
  chip: "#f1f5f9",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  copyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  copyBtnDisabled: { opacity: 0.5 },
  copyBtnText: { color: "#fff", fontWeight: "700" },

  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  deleteX: { color: COLORS.danger, fontSize: 18, fontWeight: "bold" },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.sub, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    fontSize: 15,
    color: COLORS.text,
  },

  autoList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: "#fff",
  },
  autoItem: { padding: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  autoText: { fontSize: 15, color: COLORS.text },

  pickerWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  pillActive: { backgroundColor: "#d1fae5", borderColor: "#a7f3d0" },
  pillText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  pillTextActive: { color: "#059669" },

  row: { flexDirection: "row", gap: 12, marginBottom: 16 },
  col: { flex: 1 },

  timeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  addBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.chip,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  chipDelete: { marginLeft: 6, color: COLORS.danger, fontWeight: "bold" },

  addMoreBtn: {
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    alignItems: "center",
  },
  addMoreText: { color: COLORS.primary, fontWeight: "700" },

  stickyFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  footerBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  footerBtnSave: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  footerBtnText: { color: "#fff", fontWeight: "800" },
});