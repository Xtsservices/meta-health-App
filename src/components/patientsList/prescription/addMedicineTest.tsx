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
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
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
import { Picker } from "@react-native-picker/picker";
import { formatDate } from "../../../utils/dateTime";

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
  isMedInDb: boolean;
  showMedicineDropdown: boolean;
  showTestDropdown: boolean;
  isTestValidated: boolean; // Track if test was selected from dropdown
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
  isMedInDb: false,
  showMedicineDropdown: false,
  showTestDropdown: false,
  isTestValidated: false,
  ...overrides,
});

/* Unit mapping by medicine type */
const UNIT_BY_TYPE: Record<number, string> = {
  1: "mg", // Tablet
  2: "ml", // Syrup
  3: "mg", // Injection
  4: "ml", // IV Line
  5: "ml", // Inhaler
  6:"g",
  7:"ml",
  8:"ml",
  9:"ml",
  10:"ml",
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

  // Row-specific states
  const [searchTest, setSearchTest] = useState<Record<string, string>>({});
  const [testNote, setTestNote] = useState<Record<string, string>>({});
  const [medicineOptions, setMedicineOptions] = useState<
    Record<string, string[]>
  >({});
  const [testOptions, setTestOptions] = useState<
    Record<string, string[]>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState<Record<string, boolean>>({});
  const [showFollowUpPicker, setShowFollowUpPicker] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [focusedInputType, setFocusedInputType] = useState<'medicine' | 'test' | null>(null);

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
    setTestOptions({});
    setShowStartDatePicker({});
    setShowFollowUpPicker({});
    setFocusedRowId(null);
    setFocusedInputType(null);
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
  /* Medicine autocomplete (CALLS ON EVERY KEYSTROKE)                */
  /* --------------------------------------------------------------- */

  const fetchMedicines = useCallback(
    async (text: string, rowId: string) => {
      // Immediate call on every keystroke
      if (text.length < 1) {
        setMedicineOptions(prev => ({ ...prev, [rowId]: [] }));
        // keep row data untouched here; dropdown will hide via focused state/onBlur
        return;
      }
      try {
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
          setMedicineOptions(prev => ({ ...prev, [rowId]: names }));
        } else {
          setMedicineOptions(prev => ({ ...prev, [rowId]: [] }));
        }
      } catch (err) {
        setMedicineOptions(prev => ({ ...prev, [rowId]: [] }));
      }
    },
    [user]
  );

  /* --------------------------------------------------------------- */
  /* Test autocomplete (CALLS ON EVERY KEYSTROKE)                    */
  /* --------------------------------------------------------------- */

  const fetchTests = useCallback(
    async (text: string, rowId: string) => {
      // Immediate call on every keystroke
      if (!text || text.trim().length < 1) {
        setTestOptions(prev => ({ ...prev, [rowId]: [] }));
        return;
      }
      try {
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
          setTestOptions(prev => ({ ...prev, [rowId]: unique }));
        } else {
          setTestOptions(prev => ({ ...prev, [rowId]: [] }));
        }
      } catch (err) {
        setTestOptions(prev => ({ ...prev, [rowId]: [] }));
      }
    },
    [user]
  );

  /* --------------------------------------------------------------- */
  /* Row helpers                                                     */
  /* --------------------------------------------------------------- */

  const addRow = () => {
    const newRow = createEmptyRow();
    setRows((p) => [...p, newRow]);
  };

  const deleteRow = (rowId: string) => {
    setRows((p) => p.filter((r) => r.id !== rowId));
    // Clean up row-specific states
    setSearchTest(prev => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
    setTestNote(prev => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
    setMedicineOptions(prev => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
    setTestOptions(prev => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
    if (focusedRowId === rowId) {
      setFocusedRowId(null);
      setFocusedInputType(null);
    }
  };

  const updateRowField = <K extends keyof MedicineRow>(
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
          const type = Number(value);
          const unit = UNIT_BY_TYPE[type] ?? "";
          updated.doseUnit = unit;
        }

        return updated;
      });
      return next;
    });
  };

  const updateRow = (rowId: string, updates: Partial<MedicineRow>) => {
    setRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;
        return { ...row, ...updates };
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
            updateRow(rowId, { Frequency: 1, daysCount: 0 });
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

    // Check if the test was validated (selected from dropdown)
    const row = rows.find(r => r.id === rowId);
    if (!row?.isTestValidated) {
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

        return {
          ...row,
          test: existing.join("#"),
          showTestDropdown: false,
          isTestValidated: false
        };
      });
      return next;
    });

    // Reset test state for this row
    setSearchTest(prev => ({ ...prev, [rowId]: "" }));
    setTestNote(prev => ({ ...prev, [rowId]: "" }));
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
        if (row.medicineName && !row.isMedInDb) {
          dispatch(
            showError(
              `Please select medicine from the medicine dropdown.`
            )
          );
          return;
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

        // Clear form state AFTER success
        setRows([createEmptyRow()]);
        setCopyMode(false);
        setSearchTest({});
        setTestNote({});
        setMedicineOptions({});
        setTestOptions({});
        setShowStartDatePicker({});
        setShowFollowUpPicker({});
        setFocusedRowId(null);
        setFocusedInputType(null);

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
        doseCount: Number(p.meddosage) ?? null,
        doseUnit: p.dosageUnit ?? "",
        Frequency: Number(p.medicineFrequency) ?? 1,
        medicationTime: p.medicineTime ?? "",
        daysCount: Number(p.medicineDuration) ?? null,
        medicineStartDate: p.medicineStartDate ?? "",
        test: p.test ?? "",
        advice: p.advice ?? "",
        followUp: p.followUp ?? 0,
        followUpDate: p.followUpDate ?? "",
        isMedInDb: true,
        isTestValidated: true, // Assume copied tests are valid
        showMedicineDropdown: false,
        showTestDropdown: false,
      })
    );

    setRows(mapped.length ? mapped : [createEmptyRow()]);
    setCopyMode(true);
  };

  /* --------------------------------------------------------------- */
  /* UI Components                                                   */
  /* --------------------------------------------------------------- */

  const MedicineDropdown = ({ rowId, visible, options, onSelect }: {
    rowId: string;
    visible: boolean;
    options: string[];
    onSelect: (option: string) => void;
  }) => {
    if (!visible || options.length === 0) return null;

    return (
      <View style={styles.dropdownContainer}>
        <ScrollView
          style={styles.dropdownScroll}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {options.map((opt, i) => (
            <Pressable
              key={`${rowId}-med-${i}`}
              onPress={() => onSelect(opt)}
              style={styles.dropdownItem}
            >
              <Text style={styles.dropdownText}>{opt}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const TestDropdown = ({ rowId, visible, options, onSelect }: {
    rowId: string;
    visible: boolean;
    options: string[];
    onSelect: (option: string) => void;
  }) => {
    if (!visible || options.length === 0 || focusedInputType !== 'test') return null;

    return (
      <View style={styles.dropdownContainer}>
        <ScrollView
          style={styles.dropdownScroll}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {options.map((opt, i) => (
            <Pressable
              key={`${rowId}-test-${i}`}
              onPress={() => onSelect(opt)}
              style={styles.dropdownItem}
            >
              <Text style={styles.dropdownText}>{opt}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  /* --------------------------------------------------------------- */
  /* UI – render a single row                                        */
  /* --------------------------------------------------------------- */

  const renderRow = (row: MedicineRow, idx: number) => {
    const isLast = idx === rows.length - 1;
    const rowId = row.id;
    const medOptions = medicineOptions[rowId] || [];
    const testOpts = testOptions[rowId] || [];

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

        {/* Medicine Name with Dropdown */}
        <View style={styles.field}>
          <Text style={styles.label}>Medicine Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g., Amoxicillin"
              placeholderTextColor={COLORS.placeholderText}
              value={row.medicineName}
              onChangeText={(t) => {
                setFocusedRowId(rowId);
                setFocusedInputType('medicine');

                updateRow(rowId, {
                  medicineName: t,
                  isMedInDb: false,
                  showMedicineDropdown: true
                });
                fetchMedicines(t, rowId); // immediate
              }}
              onFocus={() => {
                setFocusedRowId(rowId);
                setFocusedInputType('medicine');
                // keep other rows untouched; dropdown visibility controlled by focusedInputType + row.show... + options
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (focusedInputType !== 'medicine') {
                    updateRowField(rowId, 'showMedicineDropdown', false);
                  }
                }, 200);
              }}
            />
            <MedicineDropdown
              rowId={rowId}
              visible={row.showMedicineDropdown}
              options={medOptions}
              onSelect={(opt) => {
                updateRow(rowId, {
                  medicineName: opt,
                  isMedInDb: true,
                  showMedicineDropdown: false
                });
                setMedicineOptions(prev => ({ ...prev, [rowId]: [] }));
                setFocusedInputType(null);
              }}
            />
          </View>
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
                  onPress={() => updateRowField(rowId, "medicineType", val)}
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
              keyboardType="decimal-pad"
              placeholder="250"
              placeholderTextColor={COLORS.placeholderText}
              value={row.doseCount?.toString() ?? ""}
              onChangeText={(t) => {
                const clean = t.replace(/[^0-9.]/g, "");
                const parts = clean.split(".");
                if (parts.length > 2) return;
                if (clean.length > 6) return;
                const n = clean === "" ? null : Number(clean);
                updateRowField(rowId, "doseCount", n);
              }}
              maxLength={4}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Unit</Text>

            {row.medicineType ? (
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: "#f1f5f9" },
                ]}
                value={row.doseUnit || UNIT_BY_TYPE[Number(row.medicineType)] || ""}
                editable={false}
                placeholder="Unit"
                placeholderTextColor={COLORS.placeholderText}
              />
            ) : (
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: "#fff",
                }}
              >
                <Picker
                  selectedValue={row.doseUnit || ""}
                  onValueChange={(val) => {
                    if (!val) return;
                    updateRowField(rowId, "doseUnit", val as any);
                  }}
                  dropdownIconColor={COLORS.text}
                >
                  <Picker.Item label="Select unit" value="" />
                  <Picker.Item label="μg" value="μg" />
                  <Picker.Item label="mg" value="mg" />
                  <Picker.Item label="g" value="g" />
                  <Picker.Item label="ml" value="ml" />
                  <Picker.Item label="l" value="l" />
                </Picker>
              </View>
            )}
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
                const clean = t.replace(/[^0-9]/g, "");
                const n = clean === "" ? null : Number(clean);
                updateRowField(rowId, "daysCount", n);
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
              {row.medicineStartDate
                ? formatDate(row.medicineStartDate)
                : formatDate(todayYMD())}
            </Text>
          </Pressable>
          {showStartDatePicker[rowId] && (
            <DateTimePicker
              value={
                row.medicineStartDate
                  ? new Date(row.medicineStartDate)
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "android" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowStartDatePicker((p) => ({
                  ...p,
                  [rowId]: false,
                }));
                if (d) {
                  updateRowField(rowId, "medicineStartDate", formatYMD(d));
                }
              }}
            />
          )}
        </View>

        {/* Tests */}
        <View style={styles.field}>
          <Text style={styles.label}>Tests</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter 3+ letters"
              placeholderTextColor={COLORS.placeholderText}
              value={searchTest[rowId] || ""}
              onChangeText={(t) => {
                setFocusedRowId(rowId);
                setFocusedInputType('test');
                setSearchTest(prev => ({ ...prev, [rowId]: t }));
                updateRow(rowId, {
                  isTestValidated: false,
                  showTestDropdown: true
                });
                fetchTests(t, rowId); // immediate
              }}
              onFocus={() => {
                setFocusedRowId(rowId);
                setFocusedInputType('test');
              }}
            />
            <TestDropdown
              rowId={rowId}
              visible={row.showTestDropdown}
              options={testOpts}
              onSelect={(opt) => {
                setSearchTest(prev => ({ ...prev, [rowId]: opt }));
                updateRow(rowId, {
                  isTestValidated: true,
                  showTestDropdown: false
                });
                setFocusedInputType(null);
              }}
            />
          </View>

          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Test note (optional)"
            placeholderTextColor={COLORS.placeholderText}
            value={testNote[rowId] || ""}
            onChangeText={(t) =>
              setTestNote(prev => ({ ...prev, [rowId]: t }))
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
                      updateRowField(rowId, "followUp", o.value)
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
                  {row.followUpDate ? formatDate(row.followUpDate) : "Select date"}
                </Text>
              </Pressable>
              {showFollowUpPicker[rowId] && (
                <DateTimePicker
                  value={
                    row.followUpDate
                      ? new Date(row.followUpDate)
                      : new Date()
                  }
                  mode="date"
                  display={Platform.OS === "android" ? "spinner" : "default"}
                  minimumDate={new Date()}
                  onChange={(_, d) => {
                    setShowFollowUpPicker((p) => ({
                      ...p,
                      [rowId]: false,
                    }));
                    if (d) {
                      updateRowField(rowId, "followUpDate", formatYMD(d));
                    }
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

  // OUTER tap handler: avoid remapping rows to prevent reflows that cause scroll-to-top.
  const handleOutsideTap = () => {
    Keyboard.dismiss();
    setFocusedRowId(null);
    setFocusedInputType(null);
    // Clear option caches for dropdowns (this hides dropdowns without changing rows)
    setRows(prev =>
    prev.map(r => ({
      ...r,
      showMedicineDropdown: false,
      showTestDropdown: false,
    }))
  );
  };

  return (
    <TouchableWithoutFeedback onPress={handleOutsideTap}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          extraScrollHeight={120}
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
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
    </TouchableWithoutFeedback>
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
  inputContainer: {
    position: 'relative',
  },
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

  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 150,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 2,
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownText: {
    fontSize: 15,
    color: COLORS.text,
  },

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
