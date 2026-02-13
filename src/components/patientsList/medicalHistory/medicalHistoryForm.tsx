1.// src/screens/MedicalHistoryFormScreen.tsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { RootState } from "../../../store/store";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import type { medicalHistoryFormType } from "../../../utils/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { heriditaryList, infectionList } from "../../../utils/list";
import { formatDate } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { debounce } from "../../../utils/debounce";
import { ageFromDOB, ageFromDOBList } from "../../../utils/age";
import { showError } from "../../../store/toast.slice";

// 🔹 Mental problem master list (same as web)
const mentalProblemList = [
  "Anxiety Disorders",
  "Mood Disorders",
  "Schizophrenia Spectrum and Other Psychotic Disorders",
  "Obsessive-Compulsive and Related Disorders",
  "Trauma- and Stressor-Related Disorders",
  "Dissociative Disorders",
  "Somatic Symptom and Related Disorders",
  "Feeding and Eating Disorders",
  "Sleep-Wake Disorders",
  "Substance-Related and Addictive Disorders",
  "Personality Disorders",
  "Neurodevelopmental Disorders",
  "Neurocognitive Disorders",
  "Impulse Control Disorders",
];

// 🔹 Extra master/suggestion lists for mobile
const chestConditionList = [
    "Asthma",
    "Chronic Obstructive Pulmonary Disease (COPD)",
    "Pneumonia",
    "Bronchitis",
    "Tuberculosis",
    "Pulmonary Embolism",
    "Pleural Effusion",
    "Pneumothorax",
    "Lung Cancer",
    "Chest Pain",
    "Cough",
    "Shortness of breath",
    "Wheezing",
    "Hemoptysis",
    "Chest Wall Pain",
];

const neurologicalDisorderList = [
    "Migraine",
    "Diabetic neuropathy",
    "Guillain-Barré syndrome",
    "Tension headache",
    "Cluster headache",
    "Epilepsy",
    "Febrile seizures",
    "Parkinson's disease",
    "Huntington's disease",
    "Dystonia",
    "Tremor",
    "Dementia",
    "Alzheimer's disease",
    "Delirium",
    "Learning disabilities",
    "Depression",
    "Bipolar disorder",
    "Anxiety disorders",
    "Insomnia",
    "Sleep apnea",
    "Narcolepsy",
    "Multiple Sclerosis",
    "Brain Tumors",
    "Stroke",
    "Meningitis",
    "Encephalitis",
    "Muscular dystrophy",
    "Myasthenia gravis",
    "Neuralgia",
    "Fibromyalgia",
    "Autism Spectrum Disorder (ASD)",
    "Attention Deficit Hyperactivity Disorder (ADHD)",
    "Amyotrophic Lateral Sclerosis (ALS)",
    "Chronic pain",
    "Back pain",
];

// Common type for name + date items
type NamedDateItem = { name: string; date: Date | null };

// 🔹 Med item with complete details
type MedItem = {
  name: string;
  dosage: string;
  dosageUnit: string;
  frequency: string;
  duration: string;
  durationUnit: string;
  startDate: Date | null;
};

// 🔹 Helpers to parse stored strings back into structured state
const parseDateString = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes("GMT") || trimmed.includes("Standard Time")) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 1) Try native Date first
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) return direct;

  // 2) Try DD-MM-YYYY or DD/MM/YYYY
  let m = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const date = new Date(year, month, day);
    return date;
  }

  // 3) Try "DD MMM YYYY" or "D MMM YYYY"  👉 "04 Dec 2025"
  m = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const monthName = m[2].toLowerCase();
    const year = Number(m[3]);

    const monthMap: { [key: string]: number } = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };

    const month = monthMap[monthName];
    if (month !== undefined) {
      const date = new Date(year, month, day);
      return date;
    }
  }

  return null;
};

const displayDurationUnit = (duration: string, unit: string): string => {
  const d = duration.trim();

  if (d !== "1") return unit; // plural is fine

  switch (unit.toLowerCase()) {
    case "days":
      return "day";
    case "weeks":
      return "week";
    case "months":
      return "month";
    case "years":
      return "year";
    default:
      return unit;
  }
};

const splitToNamedDateItems = (raw?: string | null): NamedDateItem[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [namePart, datePart] = chunk.split(":");
      return {
        name: (namePart || "").trim(),
        date: parseDateString(datePart),
      };
    });
};

// 🔹 Parse meds/selfMeds full data
const parseMedList = (raw?: string | null): { istrue: boolean; items: MedItem[] } => {
  if (!raw) return { istrue: false, items: [] };

  const chunks = raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const items: MedItem[] = chunks.map((chunk) => {
    // Format: "sindhu 400 (Dosage: 5 mg | Frequency: 10 | Duration: 15 days) (26 Jan 2026)"
    const parenMatch = chunk.match(/^(.+?)\s*\(Dosage:\s*([^)]+)\)\s*(?:\(([^)]+)\))?$/);
    
    if (parenMatch) {
      const [, name, details, dateStr] = parenMatch;
      
      // Parse details: "5 mg | Frequency: 10 | Duration: 15 days"
      const dosageMatch = details.match(/(\d+(?:\.\d+)?)\s*(mg|ml|g)/i);
      const frequencyMatch = details.match(/Frequency:\s*(\d+)/i);
      const durationMatch = details.match(/Duration:\s*(\d+(?:\.\d+)?)\s*(days|weeks|months|years)/i);
      
      return {
        name: name.trim(),
        dosage: dosageMatch ? dosageMatch[1] : "",
        dosageUnit: dosageMatch ? dosageMatch[2].toLowerCase() : "mg",
        frequency: frequencyMatch ? frequencyMatch[1] : "",
        duration: durationMatch ? durationMatch[1] : "",
        durationUnit: durationMatch ? durationMatch[2].toLowerCase() : "days",
        startDate: parseDateString(dateStr),
      };
    }
    
    // Old pipe-separated format: name|dosage|dosageUnit|frequency|duration|durationUnit|date
    const parts = chunk.split("|");

    // Old format – only name
    if (parts.length === 1) {
      return {
        name: parts[0],
        dosage: "",
        dosageUnit: "mg",
        frequency: "",
        duration: "",
        durationUnit: "days",
        startDate: null,
      };
    }

    const [
      name = "",
      dosage = "",
      dosageUnit = "mg",
      frequency = "",
      duration = "",
      durationUnit = "days",
      startDateStr = "",
    ] = parts;

    return {
      name: name.trim(),
      dosage: dosage.trim(),
      dosageUnit: dosageUnit.trim() || "mg",
      frequency: frequency.trim(),
      duration: duration.trim(),
      durationUnit: durationUnit.trim() || "days",
      startDate: parseDateString(startDateStr),
    };
  });

  return { istrue: items.length > 0, items };
};

const parseDiseaseField = (raw?: string | null) => {
  const result: {
    diseaseArray: string[];
    checked: Set<string>;
    dates: { [key: string]: Date | null };
    surgeryText: string;
  } = {
    diseaseArray: [],
    checked: new Set<string>(),
    dates: {},
    surgeryText: "",
  };

  if (!raw) return result;

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  result.diseaseArray = parts;

  parts.forEach((item) => {
    if (item.startsWith("Diabetes")) {
      result.checked.add("Diabetes");
      const [, dateStr] = item.split(":");
      result.dates["Diabetes"] = parseDateString(dateStr);
    } else if (item.startsWith("Been Through any Surgery")) {
      result.checked.add("Been Through any Surgery");
      const afterColon = item.split(":")[1] || "";
      const [textPart, dateStr] = afterColon.split("|");
      result.surgeryText = (textPart || "").trim();
      result.dates["Surgery"] = parseDateString(dateStr);
    } else if (
      item.startsWith("Hyper Lipidaemia / Dyslipidaemia") ||
      item.startsWith("Hyper Lipidaemia")
    ) {
      result.checked.add("Hyper Lipidaemia");
      const [, dateStr] = item.split(":");
      result.dates["Hyper Lipidaemia"] = parseDateString(dateStr);
    }
  });

  return result;
};

const parsePregnantField = (raw?: string | null) => {
  if (!raw || raw === "No") {
    return {
      isPregnant: false,
      numberOfPregnancies: "",
      liveBirths: "",
      date: null as Date | null,
    };
  }

  let numberOfPregnancies = "";
  let liveBirths = "";
  let date: Date | null = null;

  const pregMatch = raw.match(/Number of Pregnancies:\s*(\d+)/i);
  if (pregMatch) numberOfPregnancies = pregMatch[1];
  const liveMatch = raw.match(/Live Births:\s*(\d+)/i);
  if (liveMatch) liveBirths = liveMatch[1];
  const dateMatch = raw.match(/Date:\s*(.+)$/i);
  if (dateMatch) {
    const dateStr = dateMatch[1].trim();
    date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      date = null;
    }
  }

  return { isPregnant: true, numberOfPregnancies, liveBirths, date };
};

const parseLumpsField = (raw?: string | null) => {
  if (!raw || raw === "No" || raw.trim() === "") {
    return {
      istrue: false,
      details: {
        location: "",
        size: "",
        consistency: "",
        date: null as Date | null,
      },
    };
  }

  const details: {
    location: string;
    size: string;
    consistency: string;
    date: Date | null;
  } = {
    location: "",
    size: "",
    consistency: "",
    date: null,
  };

  const locationMatch = raw.match(/Location:\s*([^,]+)/i);
  const sizeMatch = raw.match(/Size:\s*([^,]+)/i);
  const consistencyMatch = raw.match(/Consistency:\s*([^,]+)/i);
  const dateMatch = raw.match(/Date:\s*([^,]+)/i);

  if (locationMatch) details.location = locationMatch[1].trim();
  if (sizeMatch) details.size = sizeMatch[1].trim();
  if (consistencyMatch) details.consistency = consistencyMatch[1].trim();
  if (dateMatch) {
    const dateStr = dateMatch[1].trim();
    details.date = parseDateString(dateStr);
  }
  return { istrue: true, details };
};

const parseCancerField = (raw?: string | null) => {
  if (!raw || raw === "No" || raw.trim() === "") {
    return {
      istrue: false,
      details: {
        type: "",
        stage: "",
        date: null as Date | null,
      },
    };
  }

  const details: { type: string; stage: string; date: Date | null } = {
    type: "",
    stage: "",
    date: null,
  };

  const typeMatch = raw.match(/Type:\s*([^,]+)/i);
  const stageMatch = raw.match(/Stage:\s*([^,]+)/i);
  const dateMatch = raw.match(/Date:\s*([^,]+)/i);

  if (typeMatch) details.type = typeMatch[1].trim();
  if (stageMatch) details.stage = stageMatch[1].trim();
  if (dateMatch) {
    const dateStr = dateMatch[1].trim();
    details.date = parseDateString(dateStr);
  }
  return { istrue: true, details };
};

const parseHereditaryField = (
  familyDiseaseRaw?: string | null,
  hereditaryDiseaseRaw?: string | null
) => {
  if (familyDiseaseRaw && familyDiseaseRaw.trim()) {
    const items = familyDiseaseRaw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const colonIndex = chunk.indexOf(":");
        if (colonIndex === -1) {
          return { disease: chunk, name: "" };
        }
      return {
        disease: chunk.substring(0, colonIndex).trim(),
        name: chunk.substring(colonIndex + 1).trim(),
      };
    });
    return {
      istrue: items.length > 0,
      items,
    };
  }

  if (!hereditaryDiseaseRaw || hereditaryDiseaseRaw.trim() === "") {
    return { istrue: false, items: [] as { disease: string; name: string }[] };
  }

  const trimmed = hereditaryDiseaseRaw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return {
        istrue: parsed.length > 0,
        items: parsed.map((item) => ({
          disease: item.disease || item.relation || "",
          name: item.name || "",
        })),
      };
    }
  } catch (e) {
    // ignore JSON errors
  }
  const diseaseNames = trimmed
    .split(",")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk && !chunk.startsWith("Date:"));

  const items = diseaseNames.map((disease) => ({
    disease,
    name: "",
  }));
  return {
    istrue: items.length > 0,
    items,
  };
};

// Small helper components
const ChipButton: React.FC<{
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}> = ({ label, selected, onPress, disabled }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={disabled ? undefined : onPress}
    style={[
      styles.chip,
      selected && styles.chipSelected,
      disabled && styles.chipDisabled,
    ]}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const CheckboxRow: React.FC<{
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}> = ({ label, checked, onToggle, disabled }) => (
  <TouchableOpacity
    style={styles.checkboxRow}
    activeOpacity={0.8}
    onPress={disabled ? undefined : onToggle}
  >
    <View
      style={[
        styles.checkboxBox,
        checked && styles.checkboxBoxChecked,
        disabled && styles.checkboxBoxDisabled,
      ]}
    >
      {checked && <Text style={styles.checkboxTick}>✓</Text>}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

const DateField: React.FC<{
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  maximumDate?: Date;
  disabled?: boolean;
}> = ({ label, value, onChange, maximumDate, disabled }) => {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.input,
          styles.dateInput,
          disabled && styles.inputDisabled,
        ]}
        activeOpacity={0.8}
        onPress={() => !disabled && setShow(true)}
      >
        <Text
          style={[
            styles.inputText,
            !value && { color: "#9ca3af", fontStyle: "italic" },
          ]}
        >
          {value ? formatDate(value) : "Select date"}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === "android" ? "spinner" : "default"}
          maximumDate={maximumDate ?? new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) {
              onChange(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
};

type Props = {
  route: any;
  navigation: any;
};

const MedicalHistoryFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { section, medicalHistoryData, onDataUpdate } = route.params;
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const dispatch = useDispatch();

  // Basic Section State
  const [giveBy, setGiveBy] = useState(medicalHistoryData?.givenName || "");
  const [phoneNumber, setPhoneNumber] = useState<string>(
    medicalHistoryData?.givenPhone || ""
  );
  const [relation, setRelation] = useState(
    medicalHistoryData?.givenRelation || ""
  );
  const [bloodGrp, setBloodGrp] = useState(medicalHistoryData?.bloodGroup || "");
  const [bloodPressure, setBloodPressure] = useState<boolean | null>(
    medicalHistoryData?.bloodPressure === "Yes" ? true : false
  );
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const isValidIndianMobile = (phone: string) => {
    if (phone.length !== 10) return false;
    if (!/^[6-9]/.test(phone[0])) return false;
    return /^[6-9]\d{9}$/.test(phone);
  };

  // Surgical Section State
  const parsedDisease = parseDiseaseField(medicalHistoryData?.disease);

  const [disease, setDisease] = useState<string[]>(parsedDisease.diseaseArray);
  const [surgeryText, setSurgeryText] = useState(parsedDisease.surgeryText);
  const [checkedDiseases, setCheckedDiseases] = useState<Set<string>>(
    parsedDisease.checked
  );
  const [dates, setDates] = useState<{ [key: string]: Date | null }>(
    parsedDisease.dates
  );

  // Lipid Section State (with parsed Hyper Lipidaemia)
  const [hyperLipidaemia, setHyperLipidaemia] = useState<boolean | null>(
    parsedDisease.checked.has("Hyper Lipidaemia") ? true : false
  );
  const [hyperLipidaemiaDate, setHyperLipidaemiaDate] = useState<Date | null>(
    parsedDisease.dates["Hyper Lipidaemia"] || null
  );

  // Allergies Section State (with date per item)
  const [foodAllergy, setFoodAllergy] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>(() => ({
    istrue:
      !!(medicalHistoryData?.foodAllergy &&
        medicalHistoryData.foodAllergy.trim().length > 0),
    items: splitToNamedDateItems(medicalHistoryData?.foodAllergy),
  }));

  const [medicineAllergy, setMedicineAllergy] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>(() => ({
    istrue:
      !!(medicalHistoryData?.medicineAllergy &&
        medicalHistoryData.medicineAllergy.trim().length > 0),
    items: splitToNamedDateItems(medicalHistoryData?.medicineAllergy),
  }));

  const [anaesthesia, setAnaesthesia] = useState<boolean | null>(
    medicalHistoryData?.anaesthesia === "Yes" ? true : false
  );

  // 🔹 Pending allergy selection (name + date → then Add)
  const [newFoodAllergy, setNewFoodAllergy] = useState("");
  const [newFoodAllergyDate, setNewFoodAllergyDate] = useState<Date | null>(
    null
  );
  const [selectedFoodAllergyOption, setSelectedFoodAllergyOption] =
    useState("");

  const [newMedicineAllergy, setNewMedicineAllergy] = useState("");
  const [newMedicineAllergyDate, setNewMedicineAllergyDate] =
    useState<Date | null>(null);
  const [selectedMedicineAllergyOption, setSelectedMedicineAllergyOption] =
    useState("");

  // Prescribed Medicines State (detailed, with dropdown for name)
  const [prescribedMeds, setPrescribedMeds] = useState<{
    istrue: boolean;
    items: MedItem[];
  }>(() => parseMedList(medicalHistoryData?.meds));

  const [newPrescribedMed, setNewPrescribedMed] = useState<MedItem>({
    name: "",
    dosage: "",
    dosageUnit: "mg",
    frequency: "",
    duration: "",
    durationUnit: "days",
    startDate: null,
  });

  // Self Meds State
  const [selfMeds, setSelfMeds] = useState<{
    istrue: boolean;
    items: MedItem[];
  }>(() => parseMedList(medicalHistoryData?.selfMeds));

  const [newSelfMed, setNewSelfMed] = useState<MedItem>({
    name: "",
    dosage: "",
    dosageUnit: "mg",
    frequency: "",
    duration: "",
    durationUnit: "days",
    startDate: null,
  });

  // Health Conditions State (now with dates per item)
  const [chestCondition, setChestCondition] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>(() => {
    const raw = medicalHistoryData?.chestCondition;
    if (!raw || raw === "No Chest Pain") {
      return { istrue: false, items: [] };
    }
    return {
      istrue: true,
      items: splitToNamedDateItems(raw),
    };
  });

  const [neurologicalDisorder, setNeurologicalDisorder] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>(() => {
    const raw = medicalHistoryData?.neurologicalDisorder;
    if (!raw || raw === "No") {
      return { istrue: false, items: [] };
    }
    if (raw === "Yes") {
      return {
        istrue: true,
        items: [{ name: "Neurological Disorder", date: null }],
      };
    }
    return {
      istrue: true,
      items: splitToNamedDateItems(raw),
    };
  });

  const [heartProblems, setHeartProblems] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>(() => ({
    istrue:
      !!(medicalHistoryData?.heartProblems &&
        medicalHistoryData.heartProblems.trim().length > 0),
    items: splitToNamedDateItems(medicalHistoryData?.heartProblems),
  }));

  const [mentalHealth, setMentalHealth] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>(() => ({
    istrue:
      !!(medicalHistoryData?.mentalHealth &&
        medicalHistoryData.mentalHealth.trim().length > 0),
    items: splitToNamedDateItems(medicalHistoryData?.mentalHealth),
  }));

  // 🔹 Pending selections for health conditions
  const [newChestCondition, setNewChestCondition] = useState("");
  const [newChestConditionDate, setNewChestConditionDate] =
    useState<Date | null>(null);
  const [selectedChestConditionOption, setSelectedChestConditionOption] =
    useState("");
  const [chestModalVisible, setChestModalVisible] = useState(false);
  const [newNeurologicalCondition, setNewNeurologicalCondition] = useState("");
  const [newNeurologicalDate, setNewNeurologicalDate] =
    useState<Date | null>(null);
  const [selectedNeurologicalOption, setSelectedNeurologicalOption] =
    useState("");
  const [neurologicalModalVisible, setNeurologicalModalVisible] = useState(false);

  const [newHeartProblem, setNewHeartProblem] = useState("");
  const [newHeartProblemDate, setNewHeartProblemDate] =
    useState<Date | null>(null);
  const [selectedHeartProblemOption, setSelectedHeartProblemOption] =
    useState("");
  const [heartProblemModalVisible, setHeartProblemModalVisible] = useState(false);

  const [newMentalHealth, setNewMentalHealth] = useState("");
  const [newMentalHealthDate, setNewMentalHealthDate] =
    useState<Date | null>(null);
  const [selectedMentalHealthOption, setSelectedMentalHealthOption] =
    useState("");
  const [mentalHealthModalVisible, setMentalHealthModalVisible] = useState(false);

  // Infectious Diseases State
  const [infections, setInfections] = useState<{
    istrue: boolean;
    items: { name: string; date: Date | null }[];
  }>(() => ({
    istrue:
      !!(medicalHistoryData?.infections &&
        medicalHistoryData.infections.trim().length > 0),
    items: splitToNamedDateItems(medicalHistoryData?.infections),
  }));

  // Addiction State
  const [addiction, setAddiction] = useState<{
    istrue: boolean;
    items: { name: string; date: Date | null }[];
  }>(() => ({
    istrue:
      !!(medicalHistoryData?.drugs &&
        medicalHistoryData.drugs.trim().length > 0),
    items: splitToNamedDateItems(medicalHistoryData?.drugs),
  }));

  // Family History State
  const parsedPregnancy = parsePregnantField(medicalHistoryData?.pregnant);

  const [pregnant, setPregnant] = useState<boolean>(
    parsedPregnancy.isPregnant
  );
  const [pregnancyDetails, setPregnancyDetails] = useState<{
    numberOfPregnancies: string;
    liveBirths: string;
    date: Date | null;
  }>({
    numberOfPregnancies: parsedPregnancy.numberOfPregnancies,
    liveBirths: parsedPregnancy.liveBirths,
    date: parsedPregnancy.date,
  });

  const [hereditaryDisease, setHereditaryDisease] = useState<{
    istrue: boolean;
    items: { disease: string; name: string }[];
  }>(() => parseHereditaryField(
      medicalHistoryData?.familyDisease,
      medicalHistoryData?.hereditaryDisease
    )
  );

  // Physical Examination State
  const [lumps, setLumps] = useState<{ istrue: boolean; details: any }>(
    parseLumpsField(medicalHistoryData?.lumps)
  );
  const [lumpsLocationModalVisible, setLumpsLocationModalVisible] = useState(false);
  const [lumpsSizeModalVisible, setLumpsSizeModalVisible] = useState(false);
  const [lumpsConsistencyModalVisible, setLumpsConsistencyModalVisible] = useState(false);

  // Cancer History State
  const [cancer, setCancer] = useState<{ istrue: boolean; details: any }>(
    parseCancerField(medicalHistoryData?.cancer)
  );
  const [cancerTypeModalVisible, setCancerTypeModalVisible] = useState(false);

  // API Data
  const [BloodList, setBloodList] = useState<string[]>([]);
  const [heartProblemList, setHeartProblemList] = useState<string[]>([]);
  const [foodAlergyList, setFoodAlergyList] = useState<string[]>([]);
  const [relationList, setRelationList] = useState<string[]>([]);
  const [medicineList, setMedicineList] = useState<string[]>([]);
  const [formDisabled, setFormDisabled] = useState(false);
  const [prescribedMedicineSuggestions, setPrescribedMedicineSuggestions] = useState<string[]>([]);
  const [selfMedicineSuggestions, setSelfMedicineSuggestions] = useState<string[]>([]);
  const [loadingPrescribedSuggestions, setLoadingPrescribedSuggestions] = useState(false);
  const [loadingSelfSuggestions, setLoadingSelfSuggestions] = useState(false);

  const sectionOrder = [
    "basic",
    "surgical",
    "lipid",
    "allergies",
    "prescribed",
    "selfmeds",
    "health",
    "infectious",
    "addiction",
    "family",
    "physical",
    "cancer",
  ];

  // 🔹 VALIDATION FUNCTIONS FOR EACH SECTION
  const validateSection = () => {
    const errors: {[key: string]: string} = {};

    switch (section) {
      case "basic":
        if (!giveBy.trim()) {
          errors.giveBy = "History given by is required";
        }
        if (!phoneNumber.trim()) {
          errors.phoneNumber = "Mobile number is required";
        } else if (!isValidIndianMobile(phoneNumber)) {
          errors.phoneNumber = "Please enter a valid 10-digit Indian mobile number";
        }
        if (!relation.trim()) {
          errors.relation = "Relationship is required";
        }
        if (!bloodGrp.trim()) {
          errors.bloodGrp = "Blood group is required";
        }
        break;

      case "surgical":
        if (checkedDiseases.has("Diabetes") && !dates["Diabetes"]) {
          errors.diabetesDate = "Diabetes diagnosis date is required";
        }
        if (checkedDiseases.has("Been Through any Surgery")) {
          if (!surgeryText.trim()) {
            errors.surgeryText = "Surgery details are required";
          }
          if (!dates["Surgery"]) {
            errors.surgeryDate = "Surgery date is required";
          }
        }
        break;

      case "lipid":
        if (hyperLipidaemia === true && !hyperLipidaemiaDate) {
          errors.hyperLipidaemiaDate = "Hyper Lipidaemia diagnosis date is required";
        }
        break;

      case "allergies":
        if (foodAllergy.istrue && foodAllergy.items.length === 0) {
          errors.foodAllergy = "Please add at least one food allergy or select 'No'";
        }
        if (medicineAllergy.istrue && medicineAllergy.items.length === 0) {
          errors.medicineAllergy = "Please add at least one medicine allergy or select 'No'";
        }
        break;

      case "prescribed":
        if (prescribedMeds.istrue && prescribedMeds.items.length === 0) {
          errors.prescribedMeds = "Please add at least one prescribed medicine or select 'No'";
        }
        break;

      case "selfmeds":
        if (selfMeds.istrue && selfMeds.items.length === 0) {
          errors.selfMeds = "Please add at least one self-prescribed medicine or select 'No'";
        }
        break;

      case "health":
        if (chestCondition.istrue && chestCondition.items.length === 0) {
          errors.chestCondition = "Please add at least one chest condition or select 'No'";
        }
        if (neurologicalDisorder.istrue && neurologicalDisorder.items.length === 0) {
          errors.neurologicalDisorder = "Please add at least one neurological disorder or select 'No'";
        }
        if (heartProblems.istrue && heartProblems.items.length === 0) {
          errors.heartProblems = "Please add at least one heart problem or select 'No'";
        }
        if (mentalHealth.istrue && mentalHealth.items.length === 0) {
          errors.mentalHealth = "Please add at least one mental health problem or select 'No'";
        }
        break;

      case "infectious":
        if (infections.istrue && infections.items.length === 0) {
          errors.infections = "Please select at least one infectious disease or select 'No'";
        }
        break;

      case "addiction":
        if (addiction.istrue && addiction.items.length === 0) {
          errors.addiction = "Please select at least one addiction or select 'No'";
        }
        break;

      case "family":
        if (pregnant && (!pregnancyDetails.date || !pregnancyDetails.numberOfPregnancies.trim() || !pregnancyDetails.liveBirths.trim())) {
          errors.pregnancy = "Please fill all pregnancy details";
        }
        if (hereditaryDisease.istrue && hereditaryDisease.items.length === 0) {
          errors.hereditaryDisease = "Please add at least one hereditary disease or select 'No'";
        }
        break;

      case "physical":
        if (lumps.istrue) {
          if (!lumps.details.location.trim()) {
            errors.lumpsLocation = "Lump location is required";
          }
          if (!lumps.details.size.trim()) {
            errors.lumpsSize = "Lump size is required";
          }
          if (!lumps.details.consistency.trim()) {
            errors.lumpsConsistency = "Lump consistency is required";
          }
          if (!lumps.details.date) {
            errors.lumpsDate = "Examination date is required";
          }
        }
        break;

      case "cancer":
        if (cancer.istrue) {
          if (!cancer.details.type.trim()) {
            errors.cancerType = "Cancer type is required";
          }
          if (!cancer.details.stage.trim()) {
            errors.cancerStage = "Cancer stage is required";
          }
          if (!cancer.details.date) {
            errors.cancerDate = "Diagnosis date is required";
          }
        }
        break;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 🔹 Force pregnancy to "No" for neonates
  useEffect(() => {
    if (currentPatient?.category === 1) {
      setPregnant(false);
      setPregnancyDetails({
        numberOfPregnancies: "",
        liveBirths: "",
        date: null,
      });
    }
  }, [currentPatient?.category]);

  // 🔹 Disable form if basic mandatory fields not filled
  useEffect(() => {
    const isValidMobile = isValidIndianMobile(phoneNumber);
    setFormDisabled(!(giveBy && isValidMobile && relation));
  }, [giveBy, phoneNumber, relation]);

  const ageInfo = currentPatient?.dob
    ? ageFromDOBList(currentPatient.dob)
    : null;
  const getAgeInDays = (ageInfo: string | null) => {
    if (!ageInfo) return null;

    if (ageInfo.includes("day")) {
      return parseInt(ageInfo);
    }

    if (ageInfo.includes("month")) {
      return parseInt(ageInfo) * 30;
    }

    if (ageInfo.includes("year")) {
      return parseInt(ageInfo) * 365;
    }

    return null;
  };
  const ageInDays = getAgeInDays(ageInfo);

  // Fetch master data
  const getAllData = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!token) return;

    try {
      const foodRes = await AuthFetch(`data/foodAllergies`, token);
      const heartRes = await AuthFetch(`data/heartProblems`, token);
      const bloodRes = await AuthFetch(`data/bloodGroups`, token);
      const medRes =
        user?.hospitalID != null
          ? await AuthFetch(
              `medicine/${user.hospitalID}/getMedicines`,
              token
            )
          : null;

      if (foodRes?.status === "success" && "data" in foodRes) {
        setFoodAlergyList(foodRes?.data?.foodAllergies || []);
      }
      if (heartRes?.status === "success" && "data" in heartRes) {
        setHeartProblemList(heartRes?.data?.boneProblems || []);
      }
      if (bloodRes?.status === "success" && "data" in bloodRes) {
        setBloodList(bloodRes?.data?.bloodGroups || []);
      }
      if (medRes?.status === "success" && "data" in medRes) {
        setMedicineList(medRes?.data?.medicines || []);
      }
    } catch {
      // ignore
    }
  }, [user?.token, user?.hospitalID]);

  const getRelationList = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!token) return;

    try {
      const res = await AuthFetch("data/relations", token);
      if (res?.status === "success" && "data" in res) {
        setRelationList(res?.data?.relations || []);
      }
    } catch {
      // ignore
    }
  }, [user?.token]);

  useEffect(() => {
    getAllData();
    getRelationList();
  }, [getAllData, getRelationList]);

  const fetchMedicineSuggestions = async (text: string, isPrescribed: boolean) => {
    try {
      if (text.length < 3) {
        if (isPrescribed) {
          setPrescribedMedicineSuggestions([]);
        } else {
          setSelfMedicineSuggestions([]);
        }
        return;
      }

      const token = user?.token || (await AsyncStorage.getItem("token"));
      
      const response = await AuthPost(
        `medicine/${user?.hospitalID}/getMedicines`,
        { text },
        token
      );

      if ("data" in response && response?.data?.message === 'success') {
        const names =
          response?.data?.medicines
            ?.map((m: any) => m.Medicine_Name)
            .filter(Boolean) || [];
        
        if (isPrescribed) {
          setPrescribedMedicineSuggestions(names);
        } else {
          setSelfMedicineSuggestions(names);
        }
      } else {
        if (isPrescribed) {
          setPrescribedMedicineSuggestions([]);
        } else {
          setSelfMedicineSuggestions([]);
        }
      }
    } catch (error) {
      if (isPrescribed) {
        setPrescribedMedicineSuggestions([]);
      } else {
        setSelfMedicineSuggestions([]);
      }
    } finally {
      if (isPrescribed) {
        setLoadingPrescribedSuggestions(false);
      } else {
        setLoadingSelfSuggestions(false);
      }
    }
  };

  // Debounced search functions
  const debouncedSearchPrescribed = useCallback(
    debounce((text: string) => {
      fetchMedicineSuggestions(text, true);
    }, 300),
    [user]
  );

  const debouncedSearchSelf = useCallback(
    debounce((text: string) => {
      fetchMedicineSuggestions(text, false);
    }, 300),
    [user]
  );

  // Handle medicine name change with real-time search
  const handlePrescribedMedNameChange = (text: string) => {
    setNewPrescribedMed((prev) => ({ ...prev, name: text }));
    
    if (text.length >= 3) {
      setLoadingPrescribedSuggestions(true);
      debouncedSearchPrescribed(text);
    } else {
      setPrescribedMedicineSuggestions([]);
    }
  };

  const handleSelfMedNameChange = (text: string) => {
    setNewSelfMed((prev) => ({ ...prev, name: text }));
    
    if (text.length >= 3) {
      setLoadingSelfSuggestions(true);
      debouncedSearchSelf(text);
    } else {
      setSelfMedicineSuggestions([]);
    }
  };

  // Handle medicine selection from suggestions
  const handlePrescribedMedicineSelect = (medicineName: string) => {
    setNewPrescribedMed((prev) => ({ ...prev, name: medicineName }));
    setPrescribedMedicineSuggestions([]);
  };

  const handleSelfMedicineSelect = (medicineName: string) => {
    setNewSelfMed((prev) => ({ ...prev, name: medicineName }));
    setSelfMedicineSuggestions([]);
  };

  // ---------- Suggestions (used for pickers) ----------
  const filteredFoodAllergyOptions = useMemo(
    () =>
      newFoodAllergy.trim()
        ? foodAlergyList.filter((el) =>
            el.toLowerCase().includes(newFoodAllergy.trim().toLowerCase())
          )
        : foodAlergyList,
    [newFoodAllergy, foodAlergyList]
  );

  const filteredMedicineAllergyOptions = useMemo(
    () =>
      newMedicineAllergy.trim()
        ? medicineList.filter((el) =>
            el.toLowerCase().includes(newMedicineAllergy.trim().toLowerCase())
          )
        : medicineList,
    [newMedicineAllergy, medicineList]
  );

  const filteredHeartProblemOptions = useMemo(
    () =>
      newHeartProblem.trim()
        ? heartProblemList.filter((el) =>
            el.toLowerCase().includes(newHeartProblem.trim().toLowerCase())
          )
        : heartProblemList,
    [newHeartProblem, heartProblemList]
  );

  const filteredMentalHealthOptions = useMemo(
    () =>
      newMentalHealth.trim()
        ? mentalProblemList.filter((el) =>
            el.toLowerCase().includes(newMentalHealth.trim().toLowerCase())
          )
        : mentalProblemList,
    [newMentalHealth]
  );

  const filteredPrescribedMedicineOptions = useMemo(
    () => {
      const searchTerm = newPrescribedMed.name.trim().toLowerCase();
      if (!searchTerm) return medicineList;
      
      const allOptions = [...medicineList, ...prescribedMedicineSuggestions];
      const uniqueOptions = Array.from(new Set(allOptions));
      
      return uniqueOptions.filter((el) =>
        el.toLowerCase().includes(searchTerm)
      );
    },
    [newPrescribedMed.name, medicineList, prescribedMedicineSuggestions]
  );

  const filteredSelfMedicineOptions = useMemo(
    () => {
      const searchTerm = newSelfMed.name.trim().toLowerCase();
      if (!searchTerm) return medicineList;
      
      const allOptions = [...medicineList, ...selfMedicineSuggestions];
      const uniqueOptions = Array.from(new Set(allOptions));
      
      return uniqueOptions.filter((el) =>
        el.toLowerCase().includes(searchTerm)
      );
    },
    [newSelfMed.name, medicineList, selfMedicineSuggestions]
  );

  const filteredChestConditionOptions = useMemo(
    () =>
      newChestCondition.trim()
        ? chestConditionList.filter((el) =>
            el.toLowerCase().includes(newChestCondition.trim().toLowerCase())
          )
        : chestConditionList,
    [newChestCondition]
  );

  const filteredNeurologicalOptions = useMemo(
    () =>
      newNeurologicalCondition.trim()
        ? neurologicalDisorderList.filter((el) =>
            el
              .toLowerCase()
              .includes(newNeurologicalCondition.trim().toLowerCase())
          )
        : neurologicalDisorderList,
    [newNeurologicalCondition]
  );

  // 🔹 Build final data ONLY when needed (no auto-save)
  const buildUpdatedData = useCallback((): medicalHistoryFormType => {
    const medsString = prescribedMeds.items
      .map((item) => {
        const formattedDate = item.startDate ? formatDate(item.startDate) : "";
        const datePart = formattedDate ? ` (${formattedDate})` : "";

        const parts = [
          item.dosage ? `Dosage: ${item.dosage} ${item.dosageUnit}` : "",
          item.frequency ? `Frequency: ${item.frequency}` : "",
          item.duration ? `Duration: ${item.duration} ${displayDurationUnit(item.duration, item.durationUnit)}` : "",
        ].filter(Boolean);

        const details = parts.length > 0 ? ` (${parts.join(" | ")})` : "";

        return `${item.name}${details}${datePart}`;
      })
      .join(", ");

    const selfMedsString = selfMeds.items
      .map((item) => {
        const formattedDate = item.startDate ? formatDate(item.startDate) : "";
        const datePart = formattedDate ? ` (${formattedDate})` : "";
        return `${item.name} (Dosage: ${item.dosage} ${item.dosageUnit} | Frequency: ${item.frequency} | Duration: ${item.duration} ${displayDurationUnit(item.duration, item.durationUnit)})${datePart}`;
      })
      .join(", ");

    return {
      ...medicalHistoryData,
      givenName: giveBy,
      givenPhone: phoneNumber,
      givenRelation: relation,
      bloodGroup: bloodGrp,
      bloodPressure: bloodPressure ? "Yes" : "No",
      disease: disease.filter((i) => i.trim() !== "").join(","),
      foodAllergy: foodAllergy.items
        .map((item) =>
          item.date ? `${item.name}:${formatDate(item.date)}` : item.name
        )
        .join(","),
      medicineAllergy: medicineAllergy.items
        .map((item) =>
          item.date ? `${item.name}:${formatDate(item.date)}` : item.name
        )
        .join(","),
      anaesthesia: anaesthesia ? "Yes" : "No",
      meds: medsString,
      selfMeds: selfMedsString,
      chestCondition: chestCondition.items
        .map((item) =>
          item.date ? `${item.name}:${formatDate(item.date)}` : item.name
        )
        .join(","),
      neurologicalDisorder: neurologicalDisorder.items
        .map((item) =>
          item.date ? `${item.name}:${formatDate(item.date)}` : item.name
        )
        .join(","),
      heartProblems: heartProblems.items
        .map((item) =>
          item.date ? `${item.name}:${formatDate(item.date)}` : item.name
        )
        .join(","),
      mentalHealth: mentalHealth.items
        .map((item) =>
          item.date ? `${item.name}:${formatDate(item.date)}` : item.name
        )
        .join(","),
      infections: infections.items
        .map((item) =>
          item.date ? `${item.name}:${formatDate(item.date)}` : item.name
        )
        .join(", "),
      drugs: addiction.items
        .map((item) =>
          item.date ? `${item.name}:${formatDate(item.date)}` : item.name
        )
        .join(", "),
      pregnant: pregnant
        ? `Number of Pregnancies: ${
            pregnancyDetails.numberOfPregnancies
          }, Live Births: ${
            pregnancyDetails.liveBirths
          }, Date: ${
            pregnancyDetails.date ? formatDate(pregnancyDetails.date) : ""
          }`
        : "No",
      familyDisease: hereditaryDisease.items
        ?.map((item) => `${item.disease}: ${item.name}`.trim())
        ?.filter((item) => item.endsWith(":") === false)
        .join(", "),
      hereditaryDisease: hereditaryDisease.items
        .map((item) => item.disease)
        .concat(
          hereditaryDisease.items.length > 0
            ? `Date: ${formatDate(new Date())}`
            : ""
        )
        .join(", "),
      lumps: lumps.istrue
        ? `Location: ${lumps.details.location}, Size: ${
            lumps.details.size
          }, Consistency: ${
            lumps.details.consistency
          }, Date: ${
            lumps.details.date ? formatDate(lumps.details.date) : ""
          }`
        : "",
      cancer: cancer.istrue
        ? `Type: ${cancer.details.type}, Stage: ${
            cancer.details.stage
          }, Date: ${
            cancer.details.date ? formatDate(cancer.details.date) : ""
          }`
        : "",
    };
  }, [
    medicalHistoryData,
    giveBy,
    phoneNumber,
    relation,
    bloodGrp,
    bloodPressure,
    disease,
    foodAllergy,
    medicineAllergy,
    anaesthesia,
    prescribedMeds,
    selfMeds,
    chestCondition,
    neurologicalDisorder,
    heartProblems,
    mentalHealth,
    infections,
    addiction,
    pregnant,
    pregnancyDetails,
    hereditaryDisease,
    lumps,
    cancer,
  ]);

  const handleSave = () => {
    if (!validateSection()) {
      const firstError = Object.values(formErrors)[0];
      dispatch(showError(firstError));
      return;
    }
    
    const updatedData = buildUpdatedData();
    onDataUpdate(updatedData);
    navigation.goBack();
  };

  const handleClose = () => {
    // Save current form data before closing
    const updatedData = buildUpdatedData();
    onDataUpdate(updatedData);
    navigation.goBack();
  };

  const handleNext = () => {
    if (!validateSection()) {
      const firstError = Object.values(formErrors)[0];
      dispatch(showError(firstError));
      return;
    }
    
    const updatedData = buildUpdatedData();
    onDataUpdate(updatedData);
    
    const idx = sectionOrder.indexOf(section);
    if (idx < sectionOrder.length - 1) {
      navigation.navigate("MedicalHistoryForm", {
        section: sectionOrder[idx + 1],
        medicalHistoryData: updatedData,
        onDataUpdate,
      });
    }
  };

  const handlePrev = () => {
    const updatedData = buildUpdatedData();
    onDataUpdate(updatedData);
    
    const idx = sectionOrder.indexOf(section);
    if (idx > 0) {
      navigation.navigate("MedicalHistoryForm", {
        section: sectionOrder[idx - 1],
        medicalHistoryData: updatedData,
        onDataUpdate,
      });
    }
  };

  const getSectionTitle = () => {
    const sectionsMap: { [key: string]: string } = {
      basic: "Basic Details",
      surgical: "Surgical History",
      lipid: "Lipid Profile",
      allergies: "Allergies",
      prescribed: "Prescribed Medicines",
      selfmeds: "Self Prescribed Medicines",
      health: "Health Conditions",
      infectious: "Infectious Diseases",
      addiction: "Addiction History",
      family: "Family Medical History",
      physical: "Physical Examination",
      cancer: "Cancer History",
    };
    return sectionsMap[section] || "Medical History";
  };

  // ============ SECTION RENDERERS ============

  const renderBasicSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>History Given By *</Text>
        <TextInput
          style={styles.input}
          value={giveBy}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^A-Za-z\s]/g, "");
            setGiveBy(cleaned);
          }}
          maxLength={50}
          placeholder="Enter name"
          placeholderTextColor="#9ca3af"
        />
        {formErrors.giveBy && <Text style={styles.errorText}>{formErrors.giveBy}</Text>}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput
          style={[
            styles.input,
            phoneNumber && !isValidIndianMobile(phoneNumber) && styles.inputError
          ]}
          placeholder="Enter mobile number"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          value={phoneNumber}
          maxLength={10}
          onChangeText={(text) => {
            const onlyDigits = text.replace(/\D/g, "");
            if (onlyDigits.length > 10) return;
            if (onlyDigits.length === 1 && !/^[6-9]/.test(onlyDigits)) return;
            setPhoneNumber(onlyDigits);
          }}
        />
        {formErrors.phoneNumber && <Text style={styles.errorText}>{formErrors.phoneNumber}</Text>}
        {phoneNumber && !isValidIndianMobile(phoneNumber) && !formErrors.phoneNumber && (
          <Text style={styles.errorText}>
            Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9
          </Text>
        )}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Relationship With Patient *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={relation}
            onValueChange={setRelation}
            style={styles.picker}
            dropdownIconColor="#6b7280"
          >
            <Picker.Item label="Select relation" value="" />
            {relationList.map((r) => (
              <Picker.Item key={r} label={r} value={r} />
            ))}
          </Picker>
        </View>
        {formErrors.relation && <Text style={styles.errorText}>{formErrors.relation}</Text>}
      </View>

      <Text style={styles.subTitle}>Past Medical History</Text>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Blood Group *</Text>
        <View style={styles.chipRowWrap}>
          {BloodList.map((bg) => (
            <ChipButton
              key={bg}
              label={bg}
              selected={bloodGrp === bg}
              onPress={() => setBloodGrp(bg)}
            />
          ))}
        </View>
        {formErrors.bloodGrp && <Text style={styles.errorText}>{formErrors.bloodGrp}</Text>}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Blood Pressure</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={bloodPressure === true}
            disabled={formDisabled}
            onPress={() => setBloodPressure(true)}
          />
          <ChipButton
            label="No"
            selected={bloodPressure === false}
            disabled={formDisabled}
            onPress={() => setBloodPressure(false)}
          />
        </View>
      </View>
    </View>
  );

  const renderSurgicalSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <CheckboxRow
          label="Diabetes"
          checked={checkedDiseases.has("Diabetes")}
          disabled={formDisabled}
          onToggle={() => {
            const name = "Diabetes";
            if (checkedDiseases.has(name)) {
              const n = new Set(checkedDiseases);
              n.delete(name);
              setCheckedDiseases(n);
              setDisease((prev) => prev.filter((d) => !d.startsWith(name)));
            } else {
              const n = new Set(checkedDiseases);
              n.add(name);
              setCheckedDiseases(n);
            }
          }}
        />
        {checkedDiseases.has("Diabetes") && (
          <DateField
            label="Diagnosed Date"
            value={dates["Diabetes"] || null}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={(date) => {
              setDates((prev) => ({ ...prev, Diabetes: date }));
              if (date) {
                setDisease((prev) => [
                  ...prev.filter((d) => !d.startsWith("Diabetes")),
                  `Diabetes:${formatDate(date)}`,
                ]);
              }
            }}
          />
        )}
        {formErrors.diabetesDate && <Text style={styles.errorText}>{formErrors.diabetesDate}</Text>}
      </View>

      <View style={styles.fieldBlock}>
        <CheckboxRow
          label="Been Through any Surgery"
          checked={checkedDiseases.has("Been Through any Surgery")}
          disabled={formDisabled}
          onToggle={() => {
            const name = "Been Through any Surgery";
            if (checkedDiseases.has(name)) {
              const n = new Set(checkedDiseases);
              n.delete(name);
              setCheckedDiseases(n);
              setDisease((prev) => prev.filter((d) => !d.startsWith(name)));
              setSurgeryText("");
            } else {
              const n = new Set(checkedDiseases);
              n.add(name);
              setCheckedDiseases(n);
            }
          }}
        />
        {checkedDiseases.has("Been Through any Surgery") && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Surgery Details *</Text>
              <TextInput
                style={styles.input}
                value={surgeryText}
                onChangeText={setSurgeryText}
                placeholder="Enter surgery details"
                placeholderTextColor="#9ca3af"
              />
              {formErrors.surgeryText && <Text style={styles.errorText}>{formErrors.surgeryText}</Text>}
            </View>
            <DateField
              label="Surgery Date *"
              value={dates["Surgery"] || null}
              maximumDate={new Date()}
              disabled={formDisabled}
              onChange={(date) => {
                setDates((prev) => ({ ...prev, Surgery: date }));
                if (date && surgeryText) {
                  setDisease((prev) => [
                    ...prev.filter(
                      (d) => !d.startsWith("Been Through any Surgery")
                    ),
                    `Been Through any Surgery:${surgeryText}|${formatDate(
                      date
                    )}`,
                  ]);
                }
              }}
            />
            {formErrors.surgeryDate && <Text style={styles.errorText}>{formErrors.surgeryDate}</Text>}
          </>
        )}
      </View>
    </View>
  );

  const renderLipidSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <CheckboxRow
          label="Hyper Lipidaemia / Dyslipidaemia"
          checked={hyperLipidaemia === true}
          disabled={formDisabled}
          onToggle={() =>
            setHyperLipidaemia((prev) => {
              const next = prev === true ? false : true;
              if (!next) {
                setDisease((prevArr) =>
                  prevArr.filter(
                    (d) =>
                      !d.startsWith("Hyper Lipidaemia") &&
                      !d.startsWith("Hyper Lipidaemia / Dyslipidaemia")
                  )
                );
                setHyperLipidaemiaDate(null);
              }
              return next;
            })
          }
        />
        {hyperLipidaemia && (
          <DateField
            label="Diagnosed Date *"
            value={hyperLipidaemiaDate}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={(date) => {
              setHyperLipidaemiaDate(date);
              if (date) {
                setDisease((prevArr) => [
                  ...prevArr.filter(
                    (d) =>
                      !d.startsWith("Hyper Lipidaemia") &&
                      !d.startsWith("Hyper Lipidaemia / Dyslipidaemia")
                  ),
                  `Hyper Lipidaemia / Dyslipidaemia:${formatDate(date)}`,
                ]);
              }
            }}
          />
        )}
        {formErrors.hyperLipidaemiaDate && <Text style={styles.errorText}>{formErrors.hyperLipidaemiaDate}</Text>}
      </View>
    </View>
  );

  const renderAllergiesSection = () => (
    <View style={styles.section}>
      {/* Food Allergy */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Food Allergy? *</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={foodAllergy.istrue}
            disabled={formDisabled}
            onPress={() =>
              setFoodAllergy((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!foodAllergy.istrue}
            disabled={formDisabled}
            onPress={() =>
              setFoodAllergy((prev) => ({
                ...prev,
                istrue: false,
                items: [],
              }))
            }
          />
        </View>
        {foodAllergy.istrue && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Food Allergy</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newFoodAllergy}
                  onValueChange={(value) => {
                    setNewFoodAllergy(value);
                  }}
                  style={styles.picker}
                  dropdownIconColor="#6b7280"
                >
                  <Picker.Item label="Select allergy" value="" />
                  {foodAlergyList.map((item) => (
                    <Picker.Item key={item} label={item} value={item} />
                  ))}
                </Picker>
              </View>
            </View>

            <DateField
              label="Allergy Noted On"
              value={newFoodAllergyDate}
              maximumDate={new Date()}
              disabled={formDisabled}
              onChange={setNewFoodAllergyDate}
            />

            <TouchableOpacity
              style={[
                styles.addButtonLarge,
                (formDisabled ||
                  !newFoodAllergy.trim() ||
                  !newFoodAllergyDate) &&
                  styles.navButtonDisabled,
              ]}
              disabled={
                formDisabled || !newFoodAllergy.trim() || !newFoodAllergyDate
              }
              onPress={() => {
                const v = newFoodAllergy.trim();
                if (!v || !newFoodAllergyDate) return;

                if (
                  !foodAllergy.items.some(
                    (item) => item.name.toLowerCase() === v.toLowerCase()
                  )
                ) {
                  setFoodAllergy((prev) => ({
                    ...prev,
                    items: [...prev.items, { name: v, date: newFoodAllergyDate }],
                  }));
                }
                setNewFoodAllergy("");
                setNewFoodAllergyDate(null);
                setSelectedFoodAllergyOption("");
              }}
            >
              <Text style={styles.addButtonText}>Add Food Allergy</Text>
            </TouchableOpacity>

            {foodAllergy.items.map((item, index) => (
              <View key={index} style={styles.selectedItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedItemText}>{item.name}</Text>
                  <DateField
                    label="Allergy Noted On"
                    value={item.date}
                    maximumDate={new Date()}
                    disabled={formDisabled}
                    onChange={(date) => {
                      setFoodAllergy((prev) => ({
                        ...prev,
                        items: prev.items.map((it, i) =>
                          i === index ? { ...it, date } : it
                        ),
                      }));
                    }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setFoodAllergy((prev) => ({
                      ...prev,
                      items: prev.items.filter((_, i) => i !== index),
                    }));
                  }}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
        {formErrors.foodAllergy && <Text style={styles.errorText}>{formErrors.foodAllergy}</Text>}
      </View>

      {/* Medicine Allergy */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Medicine Allergy? *</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={medicineAllergy.istrue}
            disabled={formDisabled}
            onPress={() =>
              setMedicineAllergy((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!medicineAllergy.istrue}
            disabled={formDisabled}
            onPress={() =>
              setMedicineAllergy((prev) => ({
                ...prev,
                istrue: false,
                items: [],
              }))
            }
          />
        </View>
        {medicineAllergy.istrue && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Medicine Allergy</Text>
              <TextInput
                style={styles.input}
                value={newMedicineAllergy}
                onChangeText={(text) => {
                  setNewMedicineAllergy(text);
                  setSelectedMedicineAllergyOption("");
                }}
                placeholder="Enter medicine"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {!formDisabled &&
              filteredMedicineAllergyOptions.length > 0 && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Pick from list</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedMedicineAllergyOption}
                      onValueChange={(value) => {
                        setSelectedMedicineAllergyOption(value);
                        if (value) {
                          setNewMedicineAllergy(value);
                        }
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select medicine" value="" />
                      {filteredMedicineAllergyOptions.map((item) => (
                        <Picker.Item key={item} label={item} value={item} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

            <DateField
              label="Allergy Noted On"
              value={newMedicineAllergyDate}
              maximumDate={new Date()}
              disabled={formDisabled}
              onChange={setNewMedicineAllergyDate}
            />

            <TouchableOpacity
              style={[
                styles.addButtonLarge,
                (formDisabled ||
                  !newMedicineAllergy.trim() ||
                  !newMedicineAllergyDate) &&
                  styles.navButtonDisabled,
              ]}
              disabled={
                formDisabled ||
                !newMedicineAllergy.trim() ||
                !newMedicineAllergyDate
              }
              onPress={() => {
                const v = newMedicineAllergy.trim();
                if (!v || !newMedicineAllergyDate) return;

                if (
                  !medicineAllergy.items.some(
                    (item) => item.name.toLowerCase() === v.toLowerCase()
                  )
                ) {
                  setMedicineAllergy((prev) => ({
                    ...prev,
                    items: [
                      ...prev.items,
                      { name: v, date: newMedicineAllergyDate },
                    ],
                  }));
                }
                setNewMedicineAllergy("");
                setNewMedicineAllergyDate(null);
                setSelectedMedicineAllergyOption("");
              }}
            >
              <Text style={styles.addButtonText}>Add Medicine Allergy</Text>
            </TouchableOpacity>

            {medicineAllergy.items.map((item, index) => (
              <View key={index} style={styles.selectedItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedItemText}>{item.name}</Text>
                  <DateField
                    label="Allergy Noted On"
                    value={item.date}
                    maximumDate={new Date()}
                    disabled={formDisabled}
                    onChange={(date) => {
                      setMedicineAllergy((prev) => ({
                        ...prev,
                        items: prev.items.map((it, i) =>
                          i === index ? { ...it, date } : it
                        ),
                      }));
                    }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setMedicineAllergy((prev) => ({
                      ...prev,
                      items: prev.items.filter((_, i) => i !== index),
                    }));
                  }}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
        {formErrors.medicineAllergy && <Text style={styles.errorText}>{formErrors.medicineAllergy}</Text>}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Known Anaesthesia Allergy?</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={anaesthesia === true}
            disabled={formDisabled}
            onPress={() => setAnaesthesia(true)}
          />
          <ChipButton
            label="No"
            selected={anaesthesia === false}
            disabled={formDisabled}
            onPress={() => setAnaesthesia(false)}
          />
        </View>
      </View>
    </View>
  );

  const renderPrescribedSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Taking Any Prescribed Medicines? *</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={prescribedMeds.istrue}
            disabled={formDisabled}
            onPress={() =>
              setPrescribedMeds((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!prescribedMeds.istrue}
            disabled={formDisabled}
            onPress={() =>
              setPrescribedMeds((prev) => ({
                ...prev,
                istrue: false,
                items: [],
              }))
            }
          />
        </View>
        {formErrors.prescribedMeds && <Text style={styles.errorText}>{formErrors.prescribedMeds}</Text>}
      </View>

      {prescribedMeds.istrue && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Medicine Name *</Text>
            <TextInput
              style={styles.input}
              value={newPrescribedMed.name}
              onChangeText={handlePrescribedMedNameChange}
              placeholder="Type at least 3 letters to search"
              placeholderTextColor="#9ca3af"
            />
            {loadingPrescribedSuggestions && (
              <Text style={styles.hintText}>Searching...</Text>
            )}
            {newPrescribedMed.name.length > 0 && newPrescribedMed.name.length < 3 && (
              <Text style={styles.hintText}>Type 3 or more letters to see suggestions</Text>
            )}
          </View>

          {/* Medicine suggestions dropdown */}
          {!formDisabled && prescribedMedicineSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={prescribedMedicineSuggestions}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handlePrescribedMedicineSelect(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.suggestionsList}
                nestedScrollEnabled={true}
              />
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Dosage *</Text>
              <TextInput
                style={styles.input}
                value={newPrescribedMed.dosage}
                onChangeText={(text) =>
                  setNewPrescribedMed((prev) => ({ ...prev, dosage: text }))
                }
                placeholder="Dosage"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newPrescribedMed.dosageUnit}
                  onValueChange={(value) =>
                    setNewPrescribedMed((prev) => ({
                      ...prev,
                      dosageUnit: value,
                    }))
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="mg" value="mg" />
                  <Picker.Item label="ml" value="ml" />
                  <Picker.Item label="g" value="g" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Frequency (per day) *</Text>
              <TextInput
                style={styles.input}
                value={newPrescribedMed.frequency}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, "");
                  if (!digits) {
                    setNewPrescribedMed((prev) => ({
                      ...prev,
                      frequency: "",
                    }));
                    return;
                  }
                  let num = parseInt(digits, 10);
                  if (num > 50) {
                    num = 50;
                  }
                  const cleanedValue = num === 0 ? "0" : String(num);
                  setNewPrescribedMed((prev) => ({
                    ...prev,
                    frequency: cleanedValue,
                  }));
                }}
                placeholder="Frequency"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Duration *</Text>
              <TextInput
                style={styles.input}
                value={newPrescribedMed.duration}
                onChangeText={(text) =>
                  setNewPrescribedMed((prev) => ({ ...prev, duration: text }))
                }
                placeholder="Duration"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Duration Unit</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newPrescribedMed.durationUnit}
                onValueChange={(value) =>
                  setNewPrescribedMed((prev) => ({
                    ...prev,
                    durationUnit: value,
                  }))
                }
                style={styles.picker}
              >
                <Picker.Item label="Days" value="days" />
                <Picker.Item label="Weeks" value="weeks" />
                <Picker.Item label="Months" value="months" />
                <Picker.Item label="Years" value="years" />
              </Picker>
            </View>
          </View>

          <DateField
            label="Start Date"
            value={newPrescribedMed.startDate}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={(date) =>
              setNewPrescribedMed((prev) => ({ ...prev, startDate: date }))
            }
          />

          <TouchableOpacity
            style={[
              styles.addButtonLarge,
              (formDisabled ||
                !newPrescribedMed.name.trim() ||
                !newPrescribedMed.duration.trim()) &&
                styles.navButtonDisabled,
            ]}
            disabled={
              formDisabled ||
              !newPrescribedMed.name.trim() ||
              !newPrescribedMed.duration.trim()
            }
            onPress={() => {
              const name = newPrescribedMed.name.trim();
              const dosage = newPrescribedMed.dosage.trim();
              const duration = newPrescribedMed.duration.trim();

              if (!name || !duration) {
                dispatch(showError("Medicine name and duration are mandatory."));
                return;
              }

              const isDuplicate = prescribedMeds.items.some(item => 
                item.name.toLowerCase() === name.toLowerCase() && 
                item.dosage === dosage
              );

              if (isDuplicate) {
                dispatch(
                  showError(
                    `Medicine "${name}" with dosage "${dosage}${newPrescribedMed.dosageUnit}" already exists.`
                  )
                );
                return;
              }

              setPrescribedMeds((prev) => ({
                ...prev,
                items: [...prev.items, { ...newPrescribedMed }],
              }));
              setNewPrescribedMed({
                name: "",
                dosage: "",
                dosageUnit: "mg",
                frequency: "",
                duration: "",
                durationUnit: "days",
                startDate: null,
              });
              setPrescribedMedicineSuggestions([]);
            }}
          >
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </TouchableOpacity>

          {prescribedMeds.items.map((item, index) => (
            <View key={index} style={styles.medicationItem}>
              <Text style={styles.medicationText}>
                {item.name} (Dosage: {item.dosage}
                {item.dosageUnit} | Frequency: {item.frequency} | Duration: {item.duration}
                {displayDurationUnit(item.duration, item.durationUnit)}){item.startDate && `(${formatDate(item.startDate)})`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPrescribedMeds((prev) => ({
                    ...prev,
                    items: prev.items.filter((_, i) => i !== index),
                  }));
                }}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderSelfMedsSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Taking Any Self Prescribed Medicines? *</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={selfMeds.istrue}
            disabled={formDisabled}
            onPress={() =>
              setSelfMeds((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!selfMeds.istrue}
            disabled={formDisabled}
            onPress={() =>
              setSelfMeds((prev) => ({ ...prev, istrue: false, items: [] }))
            }
          />
        </View>
        {formErrors.selfMeds && <Text style={styles.errorText}>{formErrors.selfMeds}</Text>}
      </View>

      {selfMeds.istrue && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Medicine Name *</Text>
            <TextInput
              style={styles.input}
              value={newSelfMed.name}
              onChangeText={handleSelfMedNameChange}
              placeholder="Type at least 3 letters to search"
              placeholderTextColor="#9ca3af"
            />
            {loadingSelfSuggestions && (
              <Text style={styles.hintText}>Searching...</Text>
            )}
            {newSelfMed.name.length > 0 && newSelfMed.name.length < 3 && (
              <Text style={styles.hintText}>Type 3 or more letters to see suggestions</Text>
            )}
          </View>

          {/* Self medicine suggestions dropdown */}
          {!formDisabled && selfMedicineSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={selfMedicineSuggestions}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSelfMedicineSelect(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.suggestionsList}
                nestedScrollEnabled={true}
              />
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Dosage * </Text>
              <TextInput
                style={styles.input}
                value={newSelfMed.dosage}
                onChangeText={(text) =>
                  setNewSelfMed((prev) => ({ ...prev, dosage: text }))
                }
                placeholder="Dosage"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newSelfMed.dosageUnit}
                  onValueChange={(value) =>
                    setNewSelfMed((prev) => ({
                      ...prev,
                      dosageUnit: value,
                    }))
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="mg" value="mg" />
                  <Picker.Item label="ml" value="ml" />
                  <Picker.Item label="g" value="g" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Frequency (per day) *</Text>
              <TextInput
                style={styles.input}
                value={newSelfMed.frequency}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, "");
                  if (!digits) {
                    setNewSelfMed((prev) => ({
                      ...prev,
                      frequency: "",
                    }));
                    return;
                  }
                  const num = Math.min(Number(digits), 50);
                  setNewSelfMed((prev) => ({
                    ...prev,
                    frequency: String(num),
                  }));
                }}
                placeholder="Frequency"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Duration *</Text>
              <TextInput
                style={styles.input}
                value={newSelfMed.duration}
                onChangeText={(text) =>
                  setNewSelfMed((prev) => ({ ...prev, duration: text }))
                }
                placeholder="Duration"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Duration Unit</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newSelfMed.durationUnit}
                onValueChange={(value) =>
                  setNewSelfMed((prev) => ({
                    ...prev,
                    durationUnit: value,
                  }))
                }
                style={styles.picker}
              >
                <Picker.Item label="Days" value="days" />
                <Picker.Item label="Weeks" value="weeks" />
                <Picker.Item label="Months" value="months" />
                <Picker.Item label="Years" value="years" />
              </Picker>
            </View>
          </View>

          <DateField
            label="Start Date"
            value={newSelfMed.startDate}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={(date) =>
              setNewSelfMed((prev) => ({ ...prev, startDate: date }))
            }
          />

          <TouchableOpacity
            style={[
              styles.addButtonLarge,
              (formDisabled ||
                !newSelfMed.name.trim() ||
                !newSelfMed.duration.trim()) &&
                styles.navButtonDisabled,
            ]}
            disabled={
              formDisabled ||
              !newSelfMed.name.trim() ||
              !newSelfMed.duration.trim()
            }
            onPress={() => {
              const name = newSelfMed.name.trim();
              const dosage = newSelfMed.dosage.trim();
              const duration = newSelfMed.duration.trim();

              if (!name || !duration) {
                dispatch(showError("Medicine name and duration are mandatory."));
                return;
              }

              const isDuplicate = selfMeds.items.some(item => 
                item.name.toLowerCase() === name.toLowerCase() && 
                item.dosage === dosage
              );

              if (isDuplicate) {
                dispatch(
                  showError(
                    `Medicine "${name}" with dosage "${dosage}${newSelfMed.dosageUnit}" already exists.`
                  )
                );
                return;
              }

              setSelfMeds((prev) => ({
                ...prev,
                items: [...prev.items, { ...newSelfMed }],
              }));
              setNewSelfMed({
                name: "",
                dosage: "",
                dosageUnit: "mg",
                frequency: "",
                duration: "",
                durationUnit: "days",
                startDate: null,
              });
              setSelfMedicineSuggestions([]);
            }}
          >
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </TouchableOpacity>

          {selfMeds.items.map((item, index) => (
            <View key={index} style={styles.medicationItem}>
              <Text style={styles.medicationText}>
                {item.name} - {item.dosage}
                {item.dosageUnit}, {item.frequency}/day, {item.duration}{" "}
                {displayDurationUnit(item.duration, item.durationUnit)}
                {item.startDate && `, Started: ${formatDate(item.startDate)}`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelfMeds((prev) => ({
                    ...prev,
                    items: prev.items.filter((_, i) => i !== index),
                  }));
                }}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderHealthSection = () => (
    <View style={styles.section}>
      {/* Chest Condition */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Chest Condition? *</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={chestCondition.istrue}
            disabled={formDisabled}
            onPress={() =>
              setChestCondition((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!chestCondition.istrue}
            disabled={formDisabled}
            onPress={() =>
              setChestCondition((prev) => ({
                ...prev,
                istrue: false,
                items: [],
              }))
            }
          />
        </View>
        {formErrors.chestCondition && <Text style={styles.errorText}>{formErrors.chestCondition}</Text>}
      </View>

      {chestCondition.istrue && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Chest Condition</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setChestModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {newChestCondition || "Select condition"}
              </Text>
            </TouchableOpacity>
          </View>

          <DateField
            label="Condition Since"
            value={newChestConditionDate}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={setNewChestConditionDate}
          />

          <TouchableOpacity
            style={[
              styles.addButtonLarge,
              (formDisabled ||
                !newChestCondition.trim() ||
                !newChestConditionDate) &&
                styles.navButtonDisabled,
            ]}
            disabled={
              formDisabled ||
              !newChestCondition.trim() ||
              !newChestConditionDate
            }
            onPress={() => {
              const v = newChestCondition.trim();
              if (!v || !newChestConditionDate) return;

              if (
                !chestCondition.items.some(
                  (c) => c.name.toLowerCase() === v.toLowerCase()
                )
              ) {
                setChestCondition((prev) => ({
                  ...prev,
                  items: [
                    ...prev.items,
                    { name: v, date: newChestConditionDate },
                  ],
                }));
              }
              setNewChestCondition("");
              setNewChestConditionDate(null);
              setSelectedChestConditionOption("");
            }}
          >
            <Text style={styles.addButtonText}>Add Condition</Text>
          </TouchableOpacity>

          {chestCondition.items.map((condition, index) => (
            <View key={index} style={styles.selectedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedItemText}>
                  {condition.name}
                </Text>
                <DateField
                  label="Condition Since"
                  value={condition.date}
                  maximumDate={new Date()}
                  disabled={formDisabled}
                  onChange={(date) => {
                    setChestCondition((prev) => ({
                      ...prev,
                      items: prev.items.map((it, i) =>
                        i === index ? { ...it, date } : it
                      ),
                    }));
                  }}
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  setChestCondition((prev) => ({
                    ...prev,
                    items: prev.items.filter((_, i) => i !== index),
                  }));
                }}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Modal visible={chestModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setChestModalVisible(false)}>
              <X size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select condition</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView>
            {chestConditionList.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.modalItem}
                onPress={() => {
                  setNewChestCondition(item);
                  setChestModalVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Neurological */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>
          Epilepsy or other Neurological Disorder? *
        </Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={neurologicalDisorder.istrue}
            disabled={formDisabled}
            onPress={() =>
              setNeurologicalDisorder((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!neurologicalDisorder.istrue}
            disabled={formDisabled}
            onPress={() =>
              setNeurologicalDisorder((prev) => ({
                ...prev,
                istrue: false,
                items: [],
              }))
            }
          />
        </View>
        {formErrors.neurologicalDisorder && <Text style={styles.errorText}>{formErrors.neurologicalDisorder}</Text>}
      </View>

      {neurologicalDisorder.istrue && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Neurological Disorder</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setNeurologicalModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {newNeurologicalCondition || "Select disorder"}
              </Text>
            </TouchableOpacity>
          </View>

          <DateField
            label="Condition Since"
            value={newNeurologicalDate}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={setNewNeurologicalDate}
          />

          <TouchableOpacity
            style={[
              styles.addButtonLarge,
              (formDisabled ||
                !newNeurologicalCondition.trim() ||
                !newNeurologicalDate) &&
                styles.navButtonDisabled,
            ]}
            disabled={
              formDisabled ||
              !newNeurologicalCondition.trim() ||
              !newNeurologicalDate
            }
            onPress={() => {
              const v = newNeurologicalCondition.trim();
              if (!v || !newNeurologicalDate) return;

              if (
                !neurologicalDisorder.items.some(
                  (c) => c.name.toLowerCase() === v.toLowerCase()
                )
              ) {
                setNeurologicalDisorder((prev) => ({
                  ...prev,
                  items: [
                    ...prev.items,
                    { name: v, date: newNeurologicalDate },
                  ],
                }));
              }
              setNewNeurologicalCondition("");
              setNewNeurologicalDate(null);
              setSelectedNeurologicalOption("");
            }}
          >
            <Text style={styles.addButtonText}>Add Disorder</Text>
          </TouchableOpacity>

          {neurologicalDisorder.items.map((condition, index) => (
            <View key={index} style={styles.selectedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedItemText}>
                  {condition.name}
                </Text>
                <DateField
                  label="Condition Since"
                  value={condition.date}
                  maximumDate={new Date()}
                  disabled={formDisabled}
                  onChange={(date) => {
                    setNeurologicalDisorder((prev) => ({
                      ...prev,
                      items: prev.items.map((it, i) =>
                        i === index ? { ...it, date } : it
                      ),
                    }));
                  }}
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  setNeurologicalDisorder((prev) => ({
                    ...prev,
                    items: prev.items.filter((_, i) => i !== index),
                  }));
                }}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Modal visible={neurologicalModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setNeurologicalModalVisible(false)}>
              <X size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select neurological disorder</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView>
            {neurologicalDisorderList.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.modalItem}
                onPress={() => {
                  setNewNeurologicalCondition(item);
                  setNeurologicalModalVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Heart Problems from API list */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Heart Problems? *</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={heartProblems.istrue}
            disabled={formDisabled}
            onPress={() =>
              setHeartProblems((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!heartProblems.istrue}
            disabled={formDisabled}
            onPress={() =>
              setHeartProblems((prev) => ({
                ...prev,
                istrue: false,
                items: [],
              }))
            }
          />
        </View>
        {formErrors.heartProblems && <Text style={styles.errorText}>{formErrors.heartProblems}</Text>}
      </View>

      {heartProblems.istrue && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Heart Problem</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setHeartProblemModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {newHeartProblem || "Select problem"}
              </Text>
            </TouchableOpacity>
          </View>

          <DateField
            label="Problem Since"
            value={newHeartProblemDate}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={setNewHeartProblemDate}
          />

          <TouchableOpacity
            style={[
              styles.addButtonLarge,
              (formDisabled ||
                !newHeartProblem.trim() ||
                !newHeartProblemDate) &&
                styles.navButtonDisabled,
            ]}
            disabled={
              formDisabled ||
              !newHeartProblem.trim() ||
              !newHeartProblemDate
            }
            onPress={() => {
              const v = newHeartProblem.trim();
              if (!v || !newHeartProblemDate) return;

              if (
                !heartProblems.items.some(
                  (c) => c.name.toLowerCase() === v.toLowerCase()
                )
              ) {
                setHeartProblems((prev) => ({
                  ...prev,
                  items: [
                    ...prev.items,
                    { name: v, date: newHeartProblemDate },
                  ],
                }));
              }
              setNewHeartProblem("");
              setNewHeartProblemDate(null);
              setSelectedHeartProblemOption("");
            }}
          >
            <Text style={styles.addButtonText}>Add Heart Problem</Text>
          </TouchableOpacity>

          {heartProblems.items.map((condition, index) => (
            <View key={index} style={styles.selectedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedItemText}>
                  {condition.name}
                </Text>
                <DateField
                  label="Problem Since"
                  value={condition.date}
                  maximumDate={new Date()}
                  disabled={formDisabled}
                  onChange={(date) => {
                    setHeartProblems((prev) => ({
                      ...prev,
                      items: prev.items.map((it, i) =>
                        i === index ? { ...it, date } : it
                      ),
                    }));
                  }}
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  setHeartProblems((prev) => ({
                    ...prev,
                    items: prev.items.filter((_, i) => i !== index),
                  }));
                }}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Modal visible={heartProblemModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setHeartProblemModalVisible(false)}>
              <X size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select heart problem</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView>
            {heartProblemList.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.modalItem}
                onPress={() => {
                  setNewHeartProblem(item);
                  setHeartProblemModalVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Mental Health from master list */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Mental Health Problems? *</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={mentalHealth.istrue}
            disabled={formDisabled}
            onPress={() =>
              setMentalHealth((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!mentalHealth.istrue}
            disabled={formDisabled}
            onPress={() =>
              setMentalHealth((prev) => ({
                ...prev,
                istrue: false,
                items: [],
              }))
            }
          />
        </View>
        {formErrors.mentalHealth && <Text style={styles.errorText}>{formErrors.mentalHealth}</Text>}
      </View>

      {mentalHealth.istrue && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Mental Health Problem</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setMentalHealthModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {newMentalHealth || "Select problem"}
              </Text>
            </TouchableOpacity>
          </View>

          <DateField
            label="Problem Since"
            value={newMentalHealthDate}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={setNewMentalHealthDate}
          />

          <TouchableOpacity
            style={[
              styles.addButtonLarge,
              (formDisabled ||
                !newMentalHealth.trim() ||
                !newMentalHealthDate) &&
                styles.navButtonDisabled,
            ]}
            disabled={
              formDisabled ||
              !newMentalHealth.trim() ||
              !newMentalHealthDate
            }
            onPress={() => {
              const v = newMentalHealth.trim();
              if (!v || !newMentalHealthDate) return;

              if (
                !mentalHealth.items.some(
                  (c) => c.name.toLowerCase() === v.toLowerCase()
                )
              ) {
                setMentalHealth((prev) => ({
                  ...prev,
                  items: [
                    ...prev.items,
                    { name: v, date: newMentalHealthDate },
                  ],
                }));
              }
              setNewMentalHealth("");
              setNewMentalHealthDate(null);
              setSelectedMentalHealthOption("");
            }}
          >
            <Text style={styles.addButtonText}>Add Mental Problem</Text>
          </TouchableOpacity>

          {mentalHealth.items.map((condition, index) => (
            <View key={index} style={styles.selectedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedItemText}>
                  {condition.name}
                </Text>
                <DateField
                  label="Problem Since"
                  value={condition.date}
                  maximumDate={new Date()}
                  disabled={formDisabled}
                  onChange={(date) => {
                    setMentalHealth((prev) => ({
                      ...prev,
                      items: prev.items.map((it, i) =>
                        i === index ? { ...it, date } : it
                      ),
                    }));
                  }}
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  setMentalHealth((prev) => ({
                    ...prev,
                    items: prev.items.filter((_, i) => i !== index),
                  }));
                }}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Modal visible={mentalHealthModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMentalHealthModalVisible(false)}>
              <X size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select mental health problem</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView>
            {mentalProblemList.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.modalItem}
                onPress={() => {
                  setNewMentalHealth(item);
                  setMentalHealthModalVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );

  const renderInfectiousSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>
          Do You Have/Had Hepatitis B, Hepatitis C or HIV? *
        </Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={infections.istrue}
            disabled={formDisabled}
            onPress={() =>
              setInfections((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!infections.istrue}
            disabled={formDisabled}
            onPress={() =>
              setInfections((prev) => ({ ...prev, istrue: false, items: [] }))
            }
          />
        </View>
        {formErrors.infections && <Text style={styles.errorText}>{formErrors.infections}</Text>}
      </View>

      {infections.istrue && (
        <>
          {infectionList.map((infection) => (
            <View key={infection} style={styles.fieldBlock}>
              <CheckboxRow
                label={infection}
                checked={infections.items.some(
                  (item) => item.name === infection
                )}
                disabled={formDisabled}
                onToggle={() => {
                  const exists = infections.items.some(
                    (item) => item.name === infection
                  );
                  if (exists) {
                    setInfections((prev) => ({
                      ...prev,
                      items: prev.items.filter(
                        (item) => item.name !== infection
                      ),
                    }));
                  } else {
                    setInfections((prev) => ({
                      ...prev,
                      items: [...prev.items, { name: infection, date: null }],
                    }));
                  }
                }}
              />
              {infections.items.some((item) => item.name === infection) && (
                <DateField
                  label={`${infection} Date`}
                  value={
                    infections.items.find((item) => item.name === infection)
                      ?.date || null
                  }
                  maximumDate={new Date()}
                  disabled={formDisabled}
                  onChange={(date) => {
                    setInfections((prev) => ({
                      ...prev,
                      items: prev.items.map((item) =>
                        item.name === infection ? { ...item, date } : item
                      ),
                    }));
                  }}
                />
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderAddictionSection = () => (
    <View style={styles.section}>
      {ageInDays !== null && ageInDays <= 28 ? (
        <Text style={styles.notApplicable}>Not applicable for neonates.</Text>
      ) : (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>
              Drug, Tobacco or Alcohol addiction? *
            </Text>
            <View style={styles.row}>
              <ChipButton
                label="Yes"
                selected={addiction.istrue}
                disabled={formDisabled}
                onPress={() =>
                  setAddiction((prev) => ({ ...prev, istrue: true }))
                }
              />
              <ChipButton
                label="No"
                selected={!addiction.istrue}
                disabled={formDisabled}
                onPress={() =>
                  setAddiction((prev) => ({
                    ...prev,
                    istrue: false,
                    items: [],
                  }))
                }
              />
            </View>
            {formErrors.addiction && <Text style={styles.errorText}>{formErrors.addiction}</Text>}
          </View>

          {addiction.istrue && (
            <>
              {["Alcohol", "Tobbaco", "Drugs"].map((item) => (
                <View key={item} style={styles.fieldBlock}>
                  <CheckboxRow
                    label={item}
                    checked={addiction.items.some(
                      (add) => add.name === item
                    )}
                    disabled={formDisabled}
                    onToggle={() => {
                      const exists = addiction.items.some(
                        (add) => add.name === item
                      );
                      if (exists) {
                        setAddiction((prev) => ({
                          ...prev,
                          items: prev.items.filter(
                            (add) => add.name !== item
                          ),
                        }));
                      } else {
                        setAddiction((prev) => ({
                          ...prev,
                          items: [...prev.items, { name: item, date: null }],
                        }));
                      }
                    }}
                  />
                  {addiction.items.some((add) => add.name === item) && (
                    <DateField
                      label={`${item} Start Date`}
                      value={
                        addiction.items.find((add) => add.name === item)
                          ?.date || null
                      }
                      maximumDate={new Date()}
                      disabled={formDisabled}
                      onChange={(date) => {
                        setAddiction((prev) => ({
                          ...prev,
                          items: prev.items.map((add) =>
                            add.name === item ? { ...add, date } : add
                          ),
                        }));
                      }}
                    />
                  )}
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );

  const renderFamilySection = () => (
    <View style={styles.section}>
      {/* Hide pregnancy completely for neonates (category 1) */}
      {currentPatient?.gender === 2 && currentPatient?.category !== 1 && (
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Pregnant / Been Pregnant?</Text>
          <View style={styles.row}>
            <ChipButton
              label="Yes"
              selected={pregnant}
              disabled={formDisabled}
              onPress={() => setPregnant(true)}
            />
            <ChipButton
              label="No"
              selected={!pregnant}
              disabled={formDisabled}
              onPress={() => setPregnant(false)}
            />
          </View>
          {pregnant && (
            <>
              <DateField
                label="Pregnancy Date *"
                value={pregnancyDetails.date}
                maximumDate={new Date()}
                disabled={formDisabled}
                onChange={(date) =>
                  setPregnancyDetails((prev) => ({ ...prev, date }))
                }
              />
              <View style={styles.row}>
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.label}>Number of Pregnancies *</Text>
                  <TextInput
                    style={styles.input}
                    value={pregnancyDetails.numberOfPregnancies}
                    onChangeText={(text) =>
                      setPregnancyDetails((prev) => ({
                        ...prev,
                        numberOfPregnancies: text,
                      }))
                    }
                    placeholder="Number"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.label}>Live Births *</Text>
                  <TextInput
                    style={styles.input}
                    value={pregnancyDetails.liveBirths}
                    onChangeText={(text) =>
                      setPregnancyDetails((prev) => ({
                        ...prev,
                        liveBirths: text,
                      }))
                    }
                    placeholder="Live births"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {formErrors.pregnancy && <Text style={styles.errorText}>{formErrors.pregnancy}</Text>}
            </>
          )}
        </View>
      )}

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>
          Any Known Disease Mother/Father is Suffering / Suffered? *
        </Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={hereditaryDisease.istrue}
            disabled={formDisabled}
            onPress={() =>
              setHereditaryDisease((prev) => ({ ...prev, istrue: true }))
            }
          />
          <ChipButton
            label="No"
            selected={!hereditaryDisease.istrue}
            disabled={formDisabled}
            onPress={() =>
              setHereditaryDisease((prev) => ({
                ...prev,
                istrue: false,
                items: [],
              }))
            }
          />
        </View>
        {formErrors.hereditaryDisease && <Text style={styles.errorText}>{formErrors.hereditaryDisease}</Text>}
      </View>

      {hereditaryDisease.istrue && (
        <>
          {heriditaryList.map((diseaseItem) => (
            <View key={diseaseItem} style={styles.fieldBlock}>
              <CheckboxRow
                label={diseaseItem}
                checked={hereditaryDisease.items.some(
                  (item) => item.disease === diseaseItem
                )}
                disabled={formDisabled}
                onToggle={() => {
                  const exists = hereditaryDisease.items.some(
                    (item) => item.disease === diseaseItem
                  );
                  if (exists) {
                    setHereditaryDisease((prev) => ({
                      ...prev,
                      items: prev.items.filter(
                        (item) => item.disease !== diseaseItem
                      ),
                    }));
                  } else {
                    setHereditaryDisease((prev) => ({
                      ...prev,
                      items: [
                        ...prev.items,
                        { disease: diseaseItem, name: "" },
                      ],
                    }));
                  }
                }}
              />
              {hereditaryDisease.items.some(
                (item) => item.disease === diseaseItem
              ) && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Disease Name</Text>
                  <TextInput
                    style={styles.input}
                    value={
                      hereditaryDisease.items.find(
                        (item) => item.disease === diseaseItem
                      )?.name || ""
                    }
                    onChangeText={(text) => {
                      setHereditaryDisease((prev) => ({
                        ...prev,
                        items: prev.items.map((item) =>
                          item.disease === diseaseItem
                            ? { ...item, name: text }
                            : item
                        ),
                      }));
                    }}
                    placeholder={`Enter ${diseaseItem} disease`}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderPhysicalSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>
          Any Lumps Found in Physical Examination?
        </Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={lumps.istrue}
            disabled={formDisabled}
            onPress={() => setLumps((prev) => ({ ...prev, istrue: true }))}
          />
          <ChipButton
            label="No"
            selected={!lumps.istrue}
            disabled={formDisabled}
            onPress={() =>
              setLumps({
                istrue: false,
                details: {
                  location: "",
                  size: "",
                  consistency: "",
                  date: null,
                },
              })
            }
          />
        </View>
      </View>

      {lumps.istrue && (
        <>
          <DateField
            label="Examination Date *"
            value={lumps.details.date}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={(date) =>
              setLumps((prev) => ({
                ...prev,
                details: { ...prev.details, date },
              }))
            }
          />
          {formErrors.lumpsDate && <Text style={styles.errorText}>{formErrors.lumpsDate}</Text>}

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Location *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setLumpsLocationModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {lumps.details.location || "Select Location"}
              </Text>
            </TouchableOpacity>
            {formErrors.lumpsLocation && <Text style={styles.errorText}>{formErrors.lumpsLocation}</Text>}
          </View>

          <Modal visible={lumpsLocationModalVisible} animationType="slide">
            <View style={{ flex: 1, backgroundColor: "#fff" }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setLumpsLocationModalVisible(false)}>
                  <X size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Location</Text>
                <View style={styles.headerPlaceholder} />
              </View>

              <ScrollView>
                {[
                  "Thyroid",
                  "Lymph nodes - neck",
                  "Lymph nodes - jaw",
                  "Lymph nodes - ear",
                  "Salivary glands",
                  "Breast",
                  "Lung",
                  "Liver",
                  "Spleen",
                  "Kidneys",
                  "Ovaries",
                  "Lymph nodes - abdominal",
                  "Lymph nodes - axillary",
                  "Arms",
                  "Legs",
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.modalItem}
                    onPress={() => {
                      setLumps((prev) => ({
                        ...prev,
                        details: { ...prev.details, location: item },
                      }));
                      setLumpsLocationModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Size *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setLumpsSizeModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {lumps.details.size || "Select Size"}
              </Text>
            </TouchableOpacity>
            {formErrors.lumpsSize && <Text style={styles.errorText}>{formErrors.lumpsSize}</Text>}
          </View>

          <Modal visible={lumpsSizeModalVisible} animationType="slide">
            <View style={{ flex: 1, backgroundColor: "#fff" }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setLumpsSizeModalVisible(false)}>
                  <X size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Size</Text>
                <View style={styles.headerPlaceholder} />
              </View>

              <ScrollView>
                {["Small", "Medium", "Large"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.modalItem}
                    onPress={() => {
                      setLumps((prev) => ({
                        ...prev,
                        details: { ...prev.details, size: item },
                      }));
                      setLumpsSizeModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Consistency *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setLumpsConsistencyModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {lumps.details.consistency || "Select Consistency"}
              </Text>
            </TouchableOpacity>
            {formErrors.lumpsConsistency && <Text style={styles.errorText}>{formErrors.lumpsConsistency}</Text>}
          </View>

          <Modal visible={lumpsConsistencyModalVisible} animationType="slide">
            <View style={{ flex: 1, backgroundColor: "#fff" }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setLumpsConsistencyModalVisible(false)}>
                  <X size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Consistency</Text>
                <View style={styles.headerPlaceholder} />
              </View>

              <ScrollView>
                {["Soft", "Firm", "Hard"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.modalItem}
                    onPress={() => {
                      setLumps((prev) => ({
                        ...prev,
                        details: { ...prev.details, consistency: item },
                      }));
                      setLumpsConsistencyModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>
        </>
      )}
    </View>
  );

  const renderCancerSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Been Through Cancer?</Text>
        <View style={styles.row}>
          <ChipButton
            label="Yes"
            selected={cancer.istrue}
            disabled={formDisabled}
            onPress={() => setCancer((prev) => ({ ...prev, istrue: true }))}
          />
          <ChipButton
            label="No"
            selected={!cancer.istrue}
            disabled={formDisabled}
            onPress={() =>
              setCancer({
                istrue: false,
                details: { type: "", stage: "", date: null },
              })
            }
          />
        </View>
      </View>

      {cancer.istrue && (
        <>
          <DateField
            label="Diagnosis Date *"
            value={cancer.details.date}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={(date) =>
              setCancer((prev) => ({
                ...prev,
                details: { ...prev.details, date },
              }))
            }
          />
          {formErrors.cancerDate && <Text style={styles.errorText}>{formErrors.cancerDate}</Text>}

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Type of Cancer *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setCancerTypeModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {cancer.details.type || "Select Type"}
              </Text>
            </TouchableOpacity>
            {formErrors.cancerType && <Text style={styles.errorText}>{formErrors.cancerType}</Text>}
          </View>

          <Modal visible={cancerTypeModalVisible} animationType="slide">
            <View style={{ flex: 1, backgroundColor: "#fff" }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setCancerTypeModalVisible(false)}>
                  <X size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Type</Text>
                <View style={styles.headerPlaceholder} />
              </View>

              <ScrollView>
                {[
                  "Breast Cancer",
                  "Lung Cancer",
                  "Prostate Cancer",
                  "Colorectal Cancer",
                  "Leukemia",
                  "Lymphoma",
                  "Other",
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.modalItem}
                    onPress={() => {
                      setCancer((prev) => ({
                        ...prev,
                        details: { ...prev.details, type: item },
                      }));
                      setCancerTypeModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Stage of Cancer *</Text>
            <TextInput
              style={styles.input}
              value={cancer.details.stage}
              onChangeText={(text) =>
                setCancer((prev) => ({
                  ...prev,
                  details: { ...prev.details, stage: text },
                }))
              }
              placeholder="Enter cancer stage"
              placeholderTextColor="#9ca3af"
            />
            {formErrors.cancerStage && <Text style={styles.errorText}>{formErrors.cancerStage}</Text>}
          </View>
        </>
      )}
    </View>
  );

  const renderSection = () => {
    switch (section) {
      case "basic":
        return renderBasicSection();
      case "surgical":
        return renderSurgicalSection();
      case "lipid":
        return renderLipidSection();
      case "allergies":
        return renderAllergiesSection();
      case "prescribed":
        return renderPrescribedSection();
      case "selfmeds":
        return renderSelfMedsSection();
      case "health":
        return renderHealthSection();
      case "infectious":
        return renderInfectiousSection();
      case "addiction":
        return renderAddictionSection();
      case "family":
        return renderFamilySection();
      case "physical":
        return renderPhysicalSection();
      case "cancer":
        return renderCancerSection();
      default:
        return renderBasicSection();
    }
  };

  const isLastSection = sectionOrder[sectionOrder.length - 1] === section;

  return (
    <View style={styles.screen}>
      {/* Header with Close button and Title */}
      <View style={styles.modalHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>{getSectionTitle()}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 160 + insets.bottom,
            flexGrow: 1,
          }}
        >
          {renderSection()}

          {/* Prev / Next / Save navigation */}
          <View style={styles.navContainer}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {/* PREV */}
              <TouchableOpacity
                style={[styles.navButton]}
                onPress={handlePrev}
              >
                <Text style={styles.navButtonText}>Prev</Text>
              </TouchableOpacity>

              {/* NEXT / SAVE */}
              {isLastSection ? (
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    styles.saveButton,
                    formDisabled && styles.navButtonDisabled,
                  ]}
                  disabled={formDisabled}
                  onPress={handleSave}
                >
                  <Text style={styles.navButtonText}>Close</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    formDisabled && styles.navButtonDisabled,
                  ]}
                  disabled={formDisabled}
                  onPress={handleNext}
                >
                  <Text style={styles.navButtonText}>Next</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer fixed above navigation bar */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  // Modal-style header
  modalHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
    flex: 1,
  },
  headerPlaceholder: {
    width: 40,
  },
  navContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 16,
  },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginTop: 16,
    borderRadius: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  saveButton: {
    backgroundColor: "#14b8a6",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  section: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  inputDisabled: {
    backgroundColor: "#f3f4f6",
  },
  inputText: {
    fontSize: 16,
    color: "#111827",
  },
  dateInput: {
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  chipSelected: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#ffffff",
  },
  chipRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  checkboxBoxChecked: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },
  checkboxBoxDisabled: {
    opacity: 0.5,
  },
  checkboxTick: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    minHeight: 48,
    justifyContent: "center",
  },
  picker: {
    color: "#111827",
    width: "100%",
  },
  modalItemText: {
    fontSize: 16,
    color: "#111827",
    flexWrap: "wrap",
    lineHeight: 22,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#14b8a6",
    marginTop: 8,
    marginBottom: 12,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#14b8a6",
    marginLeft: 8,
  },
  addButtonLarge: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    marginTop: 8,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  selectedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedItemText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  medicationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginBottom: 8,
  },
  medicationText: {
    fontSize: 12,
    color: "#374151",
    flex: 1,
  },
  removeText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  notApplicable: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 16,
    fontStyle: "italic",
    padding: 20,
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#14b8a6",
    flex: 1,
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  footerWrap: {
    left: 0,
    right: 0,
    height: 70,
    justifyContent: "center",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  suggestionsContainer: {
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 150,
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  suggestionsList: {
    maxHeight: 120,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  suggestionText: {
    fontSize: 14,
    color: "#374151",
  },
  hintText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  suggestionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
});

export default MedicalHistoryFormScreen;