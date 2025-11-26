import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
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
import {
  medicineCategory,
  medicineCategoryType,
} from "../../../utils/medicines";
import { showError, showSuccess } from "../../../store/toast.slice";
import { COLORS } from "../../../utils/colour";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type MedicineRow = {
  /** Local stable key (NOT sent to API) */
  id: string;
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

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
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

/** Generate a unique row with optional overrides */
const createEmptyRow = (
  overrides: Partial<Omit<MedicineRow, "id">> = {}
): MedicineRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
  ...overrides,
});

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

  const [rows, setRows] = useState<MedicineRow[]>(() => [createEmptyRow()]);
  const [copyMode, setCopyMode] = useState(false);
  const [existingPrescriptions, setExistingPrescriptions] = useState<any[]>(
    []
  );

  const [testOptions, setTestOptions] = useState<string[]>([]);

  /** All these are now keyed by rowId (NOT index) */
  const [searchTest, setSearchTest] = useState<Record<string, string>>({});
  const [testNote, setTestNote] = useState<Record<string, string>>({});
  const [medicineOptions, setMedicineOptions] = useState<
    Record<string, string[]>
  >({});
  const [selectedMedicine, setSelectedMedicine] = useState<
    Record<string, boolean>
  >({});
  const [selectedTest, setSelectedTest] = useState<Record<string, boolean>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState<
    Record<string, boolean>
  >({});
  const [showFollowUpPicker, setShowFollowUpPicker] = useState<
    Record<string, boolean>
  >({});

  const [loading, setLoading] = useState(false);

  /* --------------------------------------------------------------- */
  /* Reset form when patient / timeline changes                      */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (!patientID || !timeLineID) return;

    setRows([createEmptyRow()]);
    setCopyMode(false);
    setExistingPrescriptions([]);
    setSearchTest({});
    setTestNote({});
    setMedicineOptions({});
    setSelectedMedicine({});
    setSelectedTest({});
    setShowStartDatePicker({});
    setShowFollowUpPicker({});
    setTestOptions([]);
  }, [patientID, timeLineID]);

  /* --------------------------------------------------------------- */
  /* Load existing prescriptions for current patient+timeline        */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (!user?.token || !timeLineID || !patientID) return;

    (async () => {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(
        `prescription/${user.hospitalID}/${timeLineID}/${patientID}`,
        token
      );
      if (res?.status === "success" && "data" in res) {
        setExistingPrescriptions(res.data?.prescriptions || []);
      } else {
        setExistingPrescriptions([]);
      }
    })();
  }, [user, timeLineID, patientID]);

  /* --------------------------------------------------------------- */
  /* Medicine autocomplete                                           */
  /* --------------------------------------------------------------- */

  const fetchMedicines = useCallback(
    debounce(async (text: string, rowId: string) => {
      if (text.length < 1) return;
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthPost(
        `medicine/${user?.hospitalID}/getMedicines`,
        { text },
        token
      );
      if (res?.status === "success" && "data" in res) {
        const names =
          res.data?.medicines
            ?.map((m: any) => m.Medicine_Name)
            .filter(Boolean) ?? [];
        setMedicineOptions((prev) => ({ ...prev, [rowId]: names }));
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
      if (res?.status === "success" && "data" in res) {
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

  const addRow = () => setRows((p) => [...p, createEmptyRow()]);

  const deleteRow = (rowId: string) =>
    setRows((p) => p.filter((r) => r.id !== rowId));

  const updateRow = <K extends keyof MedicineRow>(
    rowId: string,
    field: K,
    value: MedicineRow[K]
  ) => {
    setRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated: MedicineRow = { ...row, [field]: value };

        // Auto-select unit when medicine type changes
        if (field === "medicineType" && value) {
          const mt = value as unknown as number;
          const unit = UNIT_BY_TYPE[mt];
          if (unit && !updated.doseUnit) {
            updated.doseUnit = unit;
          }
        }
        return updated;
      });
      return next;
    });
  };

  /* --------------------------------------------------------------- */
  /* Time-of-Medication handling                                     */
  /* --------------------------------------------------------------- */

  const toggleTime = (rowId: string, slot: string) => {
    setRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;

        const prn = "As Per Need";
        let times = parseTimes(row.medicationTime);

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
              return row;
            }
            times.push(slot);
          }
        }

        return {
          ...row,
          medicationTime: times.join(","),
        };
      });
      return next;
    });
  };

  const changeFrequency = (rowId: string, newFreq: number) => {
    setRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;

        const updated: MedicineRow = { ...row, Frequency: newFreq };
        if (!updated.medicationTime.includes("As Per Need")) {
          const times = parseTimes(updated.medicationTime);
          if (times.length > newFreq) {
            updated.medicationTime = times.slice(0, newFreq).join(",");
          }
        }
        return updated;
      });
      return next;
    });
  };

  /* --------------------------------------------------------------- */
  /* Add test (name|note)                                            */
  /* --------------------------------------------------------------- */

  const addTest = (rowId: string) => {
    const term = (searchTest[rowId] || "").trim();
    const note = (testNote[rowId] || "").trim();

    if (!term) {
      dispatch(showError("Enter a test name."));
      return;
    }

    if (!selectedTest[rowId] && testOptions.length > 0) {
      dispatch(showError("Please select a test from the dropdown list."));
      return;
    }

    setRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;

        const existing = (row.test || "")
          .split("#")
          .map((t) => t.trim())
          .filter(Boolean);

        const entry = note ? `${term}|${note}` : term;

        if (
          !existing.some(
            (e) => e.split("|")[0].toLowerCase() === term.toLowerCase()
          )
        ) {
          existing.push(entry);
        }

        return { ...row, test: existing.join("#") };
      });
      return next;
    });

    setSearchTest((p) => ({ ...p, [rowId]: "" }));
    setTestNote((p) => ({ ...p, [rowId]: "" }));
    setSelectedTest((p) => ({ ...p, [rowId]: false }));
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
      for (const row of rows) {
        if (row.medicineName && !selectedMedicine[row.id]) {
          const opts = medicineOptions[row.id] || [];
          if (opts.length > 0 && !opts.includes(row.medicineName)) {
            dispatch(
              showError(
                `Please select "${row.medicineName}" from the medicine dropdown.`
              )
            );
            return;
          }
        }
      }

      // Duplicate check with existing active prescriptions
      const duplicate = rows.find((newRow) => {
        if (!newRow.medicineName) return false;
        return existingPrescriptions.some((old) => {
          if (old.status !== 1) return false;
          if (old.medicine !== newRow.medicineName) return false;
          if (Number(old.medicineType) !== newRow.medicineType) return false;

          const oldStart = new Date(old.medicineStartDate);
          const newStart = new Date(
            newRow.medicineStartDate || todayYMD()
          );
          const oldEnd = new Date(oldStart);
          oldEnd.setDate(
            oldEnd.getDate() + parseInt(old.medicineDuration || "0") - 1
          );

          const overlap = newStart >= oldStart && newStart <= oldEnd;
          const timeOverlap = old.medicineTime
            .split(",")
            .some((ot: string) =>
              newRow.medicationTime
                .split(",")
                .some((nt) => ot.trim() === nt.trim())
            );
          return overlap && timeOverlap;
        });
      });

      if (duplicate) {
        dispatch(
          showError(
            `Prescription for **${duplicate.medicineName}** with same timing already exists.`
          )
        );
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
          if (!r.daysCount && !r.medicationTime.includes("As Per Need")) {
            dispatch(showError("Enter duration (days)."));
            return;
          }
          const selectedTimes = parseTimes(r.medicationTime).filter(
            (t) => t !== "As Per Need"
          );
          if (
            selectedTimes.length < r.Frequency &&
            !r.medicationTime.includes("As Per Need")
          ) {
            dispatch(
              showError(`Select ${r.Frequency} time(s) of medication.`)
            );
            return;
          }
        }
      }

      // Build payload (we DO NOT send local row.id)
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
        dispatch(
          showSuccess(
            (res && "data" in res ? res.data?.message : res?.message) ||
              "Prescription saved successfully!"
          )
        );

        // 🔹 Clear form state AFTER success
        setRows([createEmptyRow()]);
        setCopyMode(false);
        setSearchTest({});
        setTestNote({});
        setMedicineOptions({});
        setSelectedMedicine({});
        setSelectedTest({});
        setShowStartDatePicker({});
        setShowFollowUpPicker({});
        setTestOptions([]);

        navigation.goBack();
      } else {
        dispatch(
          showError(res && "message" in res ? res.message : "Failed to save prescription.")
        );
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
    const mapped: MedicineRow[] = active.map((p) =>
      createEmptyRow({
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
      })
    );

    setRows(mapped.length ? mapped : [createEmptyRow()]);
    setCopyMode(true);
  };

  /* --------------------------------------------------------------- */
  /* UI – render a single row                                        */
  /* --------------------------------------------------------------- */

  const renderRow = (row: MedicineRow, idx: number) => {
    const isLast = idx === rows.length - 1;
    const rowId = row.id;
    const medOptions = medicineOptions[rowId] ?? [];
    const testSearch = searchTest[rowId] ?? "";
    const noteVal = testNote[rowId] ?? "";

    return (
      <View key={rowId} style={styles.card}>
        {/* Delete button */}
        {rows.length > 1 && (
          <Pressable
            onPress={() => deleteRow(rowId)}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteX}>X</Text>
          </Pressable>
        )}

        {/* Medicine Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Medicine Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Amoxicillin"
            placeholderTextColor={COLORS.placeholderText}
            value={row.medicineName}
            onChangeText={(t) => {
              updateRow(rowId, "medicineName", t);
              setSelectedMedicine((p) => ({ ...p, [rowId]: false }));
              fetchMedicines(t, rowId);
            }}
          />
          {medOptions.length > 0 && (
            <ScrollView
              style={styles.autoList}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {medOptions.map((opt, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    updateRow(rowId, "medicineName", opt);
                    setMedicineOptions((p) => ({
                      ...p,
                      [rowId]: [],
                    }));
                    setSelectedMedicine((p) => ({
                      ...p,
                      [rowId]: true,
                    }));
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
              const val =
                medicineCategory[key as keyof medicineCategoryType];
              const label =
                key.toLowerCase() === "ivline"
                  ? "IV Line"
                  : key.charAt(0).toUpperCase() +
                    key.slice(1).toLowerCase();
              const active = row.medicineType === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => updateRow(rowId, "medicineType", val)}
                  style={[
                    styles.pill,
                    active && styles.pillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      active && styles.pillTextActive,
                    ]}
                  >
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
            placeholderTextColor={COLORS.placeholderText}
              value={row.doseCount?.toString() ?? ""}
              onChangeText={(t) => {
                const n = t === "" ? null : Number(t);
                updateRow(rowId, "doseCount", n);
              }}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.pickerWrap}>
              {["μg", "mg", "g", "ml", "l"].map((u) => {
                const active = row.doseUnit === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => updateRow(rowId, "doseUnit", u)}
                    style={[
                      styles.pill,
                      active && styles.pillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        active && styles.pillTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                );
              })}
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
            placeholderTextColor={COLORS.placeholderText}
              value={row.Frequency.toString()}
              editable={!row.medicationTime.includes("As Per Need")}
              onChangeText={(t) => {
                const n = parseInt(t, 10) || 0;
                if (n > 6) return;
                changeFrequency(rowId, n);
              }}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Duration (days)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="7"
            placeholderTextColor={COLORS.placeholderText}
              editable={!row.medicationTime.includes("As Per Need")}
              value={row.daysCount?.toString() ?? ""}
              onChangeText={(t) => {
                const n = t === "" ? null : Number(t);
                updateRow(rowId, "daysCount", n);
              }}
            />
          </View>
        </View>

        {/* Time of Medication */}
        <View style={styles.field}>
          <Text style={styles.label}>Time of Medication</Text>
          <View style={styles.timeWrap}>
            {timeOfMedication.map((slot) => {
              const active = parseTimes(row.medicationTime).includes(
                slot
              );
              return (
                <Pressable
                  key={slot}
                  onPress={() => toggleTime(rowId, slot)}
                  style={[
                    styles.pill,
                    active && styles.pillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      active && styles.pillTextActive,
                    ]}
                  >
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
            onPress={() =>
              setShowStartDatePicker((p) => ({
                ...p,
                [rowId]: true,
              }))
            }
            style={styles.input}
          >
            <Text
              style={{
                color: row.medicineStartDate ? COLORS.text : COLORS.sub,
              }}
            >
              {row.medicineStartDate || todayYMD()}
            </Text>
          </Pressable>
          {showStartDatePicker[rowId] && (
            <DateTimePicker
              mode="date"
              value={
                row.medicineStartDate
                  ? new Date(row.medicineStartDate)
                  : new Date()
              }
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowStartDatePicker((p) => ({
                  ...p,
                  [rowId]: false,
                }));
                if (d) updateRow(rowId, "medicineStartDate", formatYMD(d));
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
            placeholderTextColor={COLORS.placeholderText}
            value={testSearch}
            onChangeText={(t) => {
              setSearchTest((p) => ({ ...p, [rowId]: t }));
              setSelectedTest((p) => ({ ...p, [rowId]: false }));
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
                      .some(
                        (e) =>
                          e
                            .split("|")[0]
                            .toLowerCase() === t.toLowerCase()
                      )
                )
                .map((opt, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setSearchTest((p) => ({
                        ...p,
                        [rowId]: opt,
                      }));
                      setTestOptions([]);
                      setSelectedTest((p) => ({
                        ...p,
                        [rowId]: true,
                      }));
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
            placeholderTextColor={COLORS.placeholderText}
            value={noteVal}
            onChangeText={(t) =>
              setTestNote((p) => ({ ...p, [rowId]: t }))
            }
          />

          <Pressable
            style={styles.addBtn}
            onPress={() => addTest(rowId)}
          >
            <Text style={styles.addBtnText}>Add Test</Text>
          </Pressable>

          <View style={styles.chipWrap}>
            {row.test
              .split("#")
              .filter(Boolean)
              .map((t, i) => {
                const [name, note] = t.split("|");
                return (
                  <View key={`${rowId}-test-${i}`} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {name}
                      {note ? ` (${note})` : ""}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setRows((prev) => {
                          const next = prev.map((r) => {
                            if (r.id !== rowId) return r;
                            const arr = r.test
                              .split("#")
                              .filter(Boolean);
                            arr.splice(i, 1);
                            return { ...r, test: arr.join("#") };
                          });
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
              {[
                { label: "Yes", value: 1 as 0 | 1 },
                { label: "No", value: 0 as 0 | 1 },
              ].map((o) => {
                const active = row.followUp === o.value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() =>
                      updateRow(rowId, "followUp", o.value)
                    }
                    style={[
                      styles.pill,
                      active && styles.pillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        active && styles.pillTextActive,
                      ]}
                    >
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {row.followUp === 1 && (
            <View style={styles.col}>
              <Text style={styles.label}>Follow-up Date</Text>
              <Pressable
                onPress={() =>
                  setShowFollowUpPicker((p) => ({
                    ...p,
                    [rowId]: true,
                  }))
                }
                style={styles.input}
              >
                <Text
                  style={{
                    color: row.followUpDate ? COLORS.text : COLORS.sub,
                  }}
                >
                  {row.followUpDate || "Select date"}
                </Text>
              </Pressable>
              {showFollowUpPicker[rowId] && (
                <DateTimePicker
                  mode="date"
                  value={
                    row.followUpDate
                      ? new Date(row.followUpDate)
                      : new Date()
                  }
                  minimumDate={new Date()}
                  onChange={(_, d) => {
                    setShowFollowUpPicker((p) => ({
                      ...p,
                      [rowId]: false,
                    }));
                    if (d) updateRow(rowId, "followUpDate", formatYMD(d));
                  }}
                />
              )}
            </View>
          )}
        </View>

        {/* Add More */}
        {isLast && (
          <Pressable style={styles.addMoreBtn} onPress={addRow}>
            <Text style={styles.addMoreText}>
              + Add Another Medicine
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  /* --------------------------------------------------------------- */
  /* Render                                                          */
  /* --------------------------------------------------------------- */

  const bottomPad = insets.bottom + 80;

  const hasCopySource = existingPrescriptions.some(
    (p) => p.status === 1 && p.medicine
  );

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
            disabled={!hasCopySource}
            style={[
              styles.copyBtn,
              !hasCopySource && styles.copyBtnDisabled,
            ]}
          >
            <Text style={styles.copyBtnText}>Copy Prescription</Text>
          </Pressable>
        </View>

        {rows.map(renderRow)}

        <View style={styles.stickyFooter}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.footerBtnCancel}
          >
            <Text style={[styles.footerBtnText, { color: COLORS.text }]}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={debouncedSubmit}
            disabled={loading}
            style={styles.footerBtnSave}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.footerBtnText}>Save</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

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
    backgroundColor: COLORS.card,
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
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.sub,
    marginBottom: 6,
  },
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
  autoItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
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

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
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
