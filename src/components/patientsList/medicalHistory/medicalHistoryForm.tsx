// src/screens/MedicalHistoryFormScreen.tsx

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
} from "react-native";
import { useSelector } from "react-redux";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import type { medicalHistoryFormType } from "../../../utils/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { heriditaryList, infectionList } from "../../../utils/list";
import { formatDate } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  "Chest Pain",
  "Shortness of Breath",
  "Asthma",
  "COPD",
  "Breathing Difficulty",
  "Palpitations",
];

const neurologicalDisorderList = [
  "Epilepsy",
  "Stroke",
  "Migraine",
  "Multiple Sclerosis",
  "Parkinson's Disease",
  "Peripheral Neuropathy",
  "Seizure Disorder",
];

// Common type for name + date items
type NamedDateItem = { name: string; date: Date | null };

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
          onChange={(_, selectedDate) => {
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

  const [formData, setFormData] = useState<medicalHistoryFormType>(
    medicalHistoryData
  );

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

  // Surgical Section State
  const [disease, setDisease] = useState<string[]>(
    medicalHistoryData?.disease
      ? medicalHistoryData.disease.split(",").map((v) => v.trim())
      : []
  );
  const [surgeryText, setSurgeryText] = useState("");
  const [checkedDiseases, setCheckedDiseases] = useState<Set<string>>(
    new Set(
      medicalHistoryData?.disease
        ? medicalHistoryData.disease.split(",").map((v) => v.trim())
        : []
    )
  );
  const [dates, setDates] = useState<{ [key: string]: Date | null }>({});

  // Lipid Section State
  const [hyperLipidaemia, setHyperLipidaemia] = useState<boolean | null>(
    medicalHistoryData?.disease?.includes(
      "Hyper Lipidaemia / Dyslipidaemia"
    ) || medicalHistoryData?.disease?.includes("Hyper Lipidaemia")
      ? true
      : false
  );
  const [hyperLipidaemiaDate, setHyperLipidaemiaDate] = useState<Date | null>(
    null
  );

  // Allergies Section State (with date per item)
  const [foodAllergy, setFoodAllergy] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>({
    istrue: !!medicalHistoryData?.foodAllergy,
    items: medicalHistoryData?.foodAllergy
      ? medicalHistoryData.foodAllergy.split(",").map((raw: string) => {
          const [name] = raw.split(":");
          return { name: name.trim(), date: null };
        })
      : [],
  });

  const [medicineAllergy, setMedicineAllergy] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>({
    istrue: !!medicalHistoryData?.medicineAllergy,
    items: medicalHistoryData?.medicineAllergy
      ? medicalHistoryData.medicineAllergy.split(",").map((raw: string) => {
          const [name] = raw.split(":");
          return { name: name.trim(), date: null };
        })
      : [],
  });

  const [anaesthesia, setAnaesthesia] = useState<boolean | null>(
    medicalHistoryData?.anaesthesia === "Yes" ? true : false
  );
  const [newFoodAllergy, setNewFoodAllergy] = useState("");
  const [newMedicineAllergy, setNewMedicineAllergy] = useState("");

  // Prescribed Medicines State (detailed, with dropdown for name)
  const [prescribedMeds, setPrescribedMeds] = useState<{
    istrue: boolean;
    items: any[];
  }>({
    istrue: !!medicalHistoryData?.meds,
    items: [],
  });
  const [newPrescribedMed, setNewPrescribedMed] = useState({
    name: "",
    dosage: "",
    dosageUnit: "mg",
    frequency: "",
    duration: "",
    durationUnit: "days",
    startDate: null as Date | null,
  });

  // Self Meds State
  const [selfMeds, setSelfMeds] = useState<{
    istrue: boolean;
    items: any[];
  }>({
    istrue: !!medicalHistoryData?.selfMeds,
    items: [],
  });
  const [newSelfMed, setNewSelfMed] = useState({
    name: "",
    dosage: "",
    dosageUnit: "mg",
    frequency: "",
    duration: "",
    durationUnit: "days",
    startDate: null as Date | null,
  });

  // Health Conditions State (now with dates per item)
  const [chestCondition, setChestCondition] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>(() => ({
    istrue:
      !!medicalHistoryData?.chestCondition &&
      medicalHistoryData.chestCondition !== "No Chest Pain",
    items:
      medicalHistoryData?.chestCondition &&
      medicalHistoryData.chestCondition !== "No Chest Pain"
        ? medicalHistoryData.chestCondition.split(",").map((raw: string) => {
            const [name] = raw.split(":");
            return { name: name.trim(), date: null };
          })
        : [],
  }));

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
      items: raw.split(",").map((chunk: string) => {
        const [name] = chunk.split(":");
        return { name: name.trim(), date: null };
      }),
    };
  });

  const [heartProblems, setHeartProblems] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>({
    istrue: !!medicalHistoryData?.heartProblems,
    items: medicalHistoryData?.heartProblems
      ? medicalHistoryData.heartProblems.split(",").map((raw: string) => {
          const [name] = raw.split(":");
          return { name: name.trim(), date: null };
        })
      : [],
  });

  const [mentalHealth, setMentalHealth] = useState<{
    istrue: boolean;
    items: NamedDateItem[];
  }>({
    istrue: !!medicalHistoryData?.mentalHealth,
    items: medicalHistoryData?.mentalHealth
      ? medicalHistoryData.mentalHealth.split(",").map((raw: string) => {
          const [name] = raw.split(":");
          return { name: name.trim(), date: null };
        })
      : [],
  });

  const [newChestCondition, setNewChestCondition] = useState("");
  const [newNeurologicalCondition, setNewNeurologicalCondition] = useState("");
  const [newHeartProblem, setNewHeartProblem] = useState("");
  const [newMentalHealth, setNewMentalHealth] = useState("");

  // Infectious Diseases State
  const [infections, setInfections] = useState<{
    istrue: boolean;
    items: { name: string; date: Date | null }[];
  }>({
    istrue: !!medicalHistoryData?.infections,
    items: medicalHistoryData?.infections
      ? medicalHistoryData.infections.split(",").map((raw: string) => {
          const [name] = raw.split(":");
          return { name: name.trim(), date: null };
        })
      : [],
  });

  // Addiction State
  const [addiction, setAddiction] = useState<{
    istrue: boolean;
    items: { name: string; date: Date | null }[];
  }>({
    istrue: !!medicalHistoryData?.drugs,
    items: medicalHistoryData?.drugs
      ? medicalHistoryData.drugs.split(",").map((raw: string) => {
          const [name] = raw.split(":");
          return { name: name.trim(), date: null };
        })
      : [],
  });

  // Family History State
  const [pregnant, setPregnant] = useState<boolean>(
    !!medicalHistoryData?.pregnant && medicalHistoryData.pregnant !== "No"
  );
  const [pregnancyDetails, setPregnancyDetails] = useState<{
    numberOfPregnancies: string;
    liveBirths: string;
    date: Date | null;
  }>({
    numberOfPregnancies: "",
    liveBirths: "",
    date: null,
  });

  // 🔹 If patient is neonate (category 1), force pregnancy to "No"
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

  const [hereditaryDisease, setHereditaryDisease] = useState<{
    istrue: boolean;
    items: { disease: string; name: string }[];
  }>({
    istrue: !!medicalHistoryData?.hereditaryDisease,
    items: medicalHistoryData?.hereditaryDisease
      ? medicalHistoryData.hereditaryDisease
          .split(",")
          .map((name: string) => ({ disease: name.trim(), name: "" }))
      : [],
  });

  // Physical Examination State
  const [lumps, setLumps] = useState<{ istrue: boolean; details: any }>({
    istrue:
      medicalHistoryData?.lumps !== "" && medicalHistoryData?.lumps !== "No",
    details: {
      location: "",
      size: "",
      consistency: "",
      date: null as Date | null,
    },
  });

  // Cancer History State
  const [cancer, setCancer] = useState<{ istrue: boolean; details: any }>({
    istrue:
      medicalHistoryData?.cancer !== "" && medicalHistoryData?.cancer !== "No",
    details: {
      type: "",
      stage: "",
      date: null as Date | null,
    },
  });

  // API Data
  const [BloodList, setBloodList] = useState<string[]>([]);
  const [heartProblemList, setHeartProblemList] = useState<string[]>([]);
  const [foodAlergyList, setFoodAlergyList] = useState<string[]>([]);
  const [relationList, setRelationList] = useState<string[]>([]);
  const [medicineList, setMedicineList] = useState<string[]>([]);
  const [formDisabled, setFormDisabled] = useState(false);

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

  // Disable form if basic mandatory fields not filled
  useEffect(() => {
    setFormDisabled(!(giveBy && phoneNumber && relation));
  }, [giveBy, phoneNumber, relation]);

  // Fetch master data (food allergy list, heart problems, blood groups, medicines)
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

      if (foodRes?.status === "success") {
        setFoodAlergyList(foodRes?.data?.foodAllergies || []);
      }
      if (heartRes?.status === "success") {
        setHeartProblemList(heartRes?.data?.boneProblems || []);
      }
      if (bloodRes?.status === "success") {
        setBloodList(bloodRes?.data?.bloodGroups || []);
      }
      if (medRes?.status === "success") {
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
      if (res?.status === "success") {
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

  // ---------- Suggestions (like Autocomplete in web) ----------

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
    () =>
      newPrescribedMed.name.trim()
        ? medicineList.filter((el) =>
            el
              .toLowerCase()
              .includes(newPrescribedMed.name.trim().toLowerCase())
          )
        : medicineList,
    [newPrescribedMed.name, medicineList]
  );

  const filteredSelfMedicineOptions = useMemo(
    () =>
      newSelfMed.name.trim()
        ? medicineList.filter((el) =>
            el.toLowerCase().includes(newSelfMed.name.trim().toLowerCase())
          )
        : medicineList,
    [newSelfMed.name, medicineList]
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

  // Update form data and notify parent
  useEffect(() => {
    const updatedData: medicalHistoryFormType = {
      ...formData,
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
      meds: prescribedMeds.items
        .map(
          (item) =>
            `${item.name} (${item.dosage}${item.dosageUnit}, ${item.frequency}/day, ${item.duration}${item.durationUnit})`
        )
        .join(", "),
      selfMeds: selfMeds.items
        .map(
          (item) =>
            `${item.name} (${item.dosage}${item.dosageUnit}, ${item.frequency}/day, ${item.duration}${item.durationUnit})`
        )
        .join(", "),
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
      hereditaryDisease: hereditaryDisease.items
        .map((item) => `${item.disease}:${item.name}`)
        .join(", "),
      lumps: lumps.istrue
        ? `Location: ${lumps.details.location}, Size: ${
            lumps.details.size
          }, Consistency: ${
            lumps.details.consistency
          }, Date: ${lumps.details.date ? formatDate(lumps.details.date) : ""}`
        : "",
      cancer: cancer.istrue
        ? `Type: ${cancer.details.type}, Stage: ${
            cancer.details.stage
          }, Date: ${
            cancer.details.date ? formatDate(cancer.details.date) : ""
          }`
        : "",
    };

    setFormData(updatedData);
    onDataUpdate(updatedData);
  }, [
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
    navigation.goBack();
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
          onChangeText={setGiveBy}
          maxLength={50}
          placeholder="Enter name"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter mobile number"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          value={phoneNumber}
          maxLength={10}
          onChangeText={(text) => {
            const onlyDigits = text.replace(/\D/g, "");
            if (onlyDigits.length <= 10) {
              setPhoneNumber(onlyDigits);
            }
          }}
        />
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
              disabled={formDisabled}
              onPress={() => setBloodGrp(bg)}
            />
          ))}
        </View>
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
              <Text style={styles.label}>Surgery Details</Text>
              <TextInput
                style={styles.input}
                value={surgeryText}
                onChangeText={setSurgeryText}
                placeholder="Enter surgery details"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <DateField
              label="Surgery Date"
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
            setHyperLipidaemia((prev) => (prev === true ? false : true))
          }
        />
        {hyperLipidaemia && (
          <DateField
            label="Diagnosed Date"
            value={hyperLipidaemiaDate}
            maximumDate={new Date()}
            disabled={formDisabled}
            onChange={setHyperLipidaemiaDate}
          />
        )}
      </View>
    </View>
  );

  const renderAllergiesSection = () => (
    <View style={styles.section}>
      {/* Food Allergy */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Food Allergy?</Text>
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
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newFoodAllergy}
                  onChangeText={setNewFoodAllergy}
                  placeholder="Search or enter food allergy"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    const v = newFoodAllergy.trim();
                    if (
                      v &&
                      !foodAllergy.items.some((item) => item.name === v)
                    ) {
                      setFoodAllergy((prev) => ({
                        ...prev,
                        items: [...prev.items, { name: v, date: null }],
                      }));
                    }
                    setNewFoodAllergy("");
                  }}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Suggestions from master list */}
            {!formDisabled &&
              filteredFoodAllergyOptions.length > 0 &&
              newFoodAllergy.trim().length > 0 && (
                <View style={styles.suggestionsWrap}>
                  {filteredFoodAllergyOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionPill}
                      onPress={() => {
                        if (
                          !foodAllergy.items.some(
                            (al) =>
                              al.name.toLowerCase() === item.toLowerCase()
                          )
                        ) {
                          setFoodAllergy((prev) => ({
                            ...prev,
                            items: [...prev.items, { name: item, date: null }],
                          }));
                        }
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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
      </View>

      {/* Medicine Allergy */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Medicine Allergy?</Text>
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
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newMedicineAllergy}
                  onChangeText={setNewMedicineAllergy}
                  placeholder="Search or enter medicine"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    const v = newMedicineAllergy.trim();
                    if (
                      v &&
                      !medicineAllergy.items.some((item) => item.name === v)
                    ) {
                      setMedicineAllergy((prev) => ({
                        ...prev,
                        items: [...prev.items, { name: v, date: null }],
                      }));
                    }
                    setNewMedicineAllergy("");
                  }}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* suggestions from medicineList */}
            {!formDisabled &&
              filteredMedicineAllergyOptions.length > 0 &&
              newMedicineAllergy.trim().length > 0 && (
                <View style={styles.suggestionsWrap}>
                  {filteredMedicineAllergyOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionPill}
                      onPress={() => {
                        if (
                          !medicineAllergy.items.some(
                            (al) =>
                              al.name.toLowerCase() === item.toLowerCase()
                          )
                        ) {
                          setMedicineAllergy((prev) => ({
                            ...prev,
                            items: [
                              ...prev.items,
                              { name: item, date: null },
                            ],
                          }));
                        }
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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
        <Text style={styles.label}>Taking Any Prescribed Medicines?</Text>
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
      </View>

      {prescribedMeds.istrue && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Medicine Name</Text>
            <TextInput
              style={styles.input}
              value={newPrescribedMed.name}
              onChangeText={(text) =>
                setNewPrescribedMed((prev) => ({ ...prev, name: text }))
              }
              placeholder="Search or enter medicine name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* 🔹 Always show dropdown suggestions when data available */}
          {!formDisabled &&
            filteredPrescribedMedicineOptions.length > 0 && (
              <View style={styles.suggestionsWrap}>
                {filteredPrescribedMedicineOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.suggestionPill}
                    onPress={() =>
                      setNewPrescribedMed((prev) => ({ ...prev, name: item }))
                    }
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          <View style={styles.row}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Dosage</Text>
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
              <Text style={styles.label}>Frequency (per day)</Text>
              <TextInput
                style={styles.input}
                value={newPrescribedMed.frequency}
                onChangeText={(text) =>
                  setNewPrescribedMed((prev) => ({
                    ...prev,
                    frequency: text,
                  }))
                }
                placeholder="Frequency"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Duration</Text>
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
            style={styles.addButtonLarge}
            onPress={() => {
              if (newPrescribedMed.name.trim()) {
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
              }
            }}
          >
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </TouchableOpacity>

          {prescribedMeds.items.map((item, index) => (
            <View key={index} style={styles.medicationItem}>
              <Text style={styles.medicationText}>
                {item.name} - {item.dosage}
                {item.dosageUnit}, {item.frequency}/day, {item.duration}{" "}
                {item.durationUnit}
                {item.startDate && `, Started: ${formatDate(item.startDate)}`}
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
        <Text style={styles.label}>Taking Any Self Prescribed Medicines?</Text>
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
      </View>

      {selfMeds.istrue && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Medicine Name</Text>
            <TextInput
              style={styles.input}
              value={newSelfMed.name}
              onChangeText={(text) =>
                setNewSelfMed((prev) => ({ ...prev, name: text }))
              }
              placeholder="Search or enter medicine name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* 🔹 Always show dropdown suggestions when data available */}
          {!formDisabled &&
            filteredSelfMedicineOptions.length > 0 && (
              <View style={styles.suggestionsWrap}>
                {filteredSelfMedicineOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.suggestionPill}
                    onPress={() =>
                      setNewSelfMed((prev) => ({ ...prev, name: item }))
                    }
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          <View style={styles.row}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Dosage</Text>
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
              <Text style={styles.label}>Frequency (per day)</Text>
              <TextInput
                style={styles.input}
                value={newSelfMed.frequency}
                onChangeText={(text) =>
                  setNewSelfMed((prev) => ({ ...prev, frequency: text }))
                }
                placeholder="Frequency"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Duration</Text>
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
            style={styles.addButtonLarge}
            onPress={() => {
              if (newSelfMed.name.trim()) {
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
              }
            }}
          >
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </TouchableOpacity>

          {selfMeds.items.map((item, index) => (
            <View key={index} style={styles.medicationItem}>
              <Text style={styles.medicationText}>
                {item.name} - {item.dosage}
                {item.dosageUnit}, {item.frequency}/day, {item.duration}{" "}
                {item.durationUnit}
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
        <Text style={styles.label}>Any Chest Condition?</Text>
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
        {chestCondition.istrue && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Chest Condition</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newChestCondition}
                  onChangeText={setNewChestCondition}
                  placeholder="Enter or select condition"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    const v = newChestCondition.trim();
                    if (
                      v &&
                      !chestCondition.items.some(
                        (item) =>
                          item.name.toLowerCase() === v.toLowerCase()
                      )
                    ) {
                      setChestCondition((prev) => ({
                        ...prev,
                        items: [...prev.items, { name: v, date: null }],
                      }));
                    }
                    setNewChestCondition("");
                  }}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dropdown-style suggestions */}
            {!formDisabled &&
              filteredChestConditionOptions.length > 0 &&
              newChestCondition.trim().length > 0 && (
                <View style={styles.suggestionsWrap}>
                  {filteredChestConditionOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionPill}
                      onPress={() => {
                        if (
                          !chestCondition.items.some(
                            (c) =>
                              c.name.toLowerCase() === item.toLowerCase()
                          )
                        ) {
                          setChestCondition((prev) => ({
                            ...prev,
                            items: [
                              ...prev.items,
                              { name: item, date: null },
                            ],
                          }));
                        }
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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
      </View>

      {/* Neurological */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>
          Epilepsy or other Neurological Disorder?
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
        {neurologicalDisorder.istrue && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Neurological Disorder</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newNeurologicalCondition}
                  onChangeText={setNewNeurologicalCondition}
                  placeholder="Enter or select disorder"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    const v = newNeurologicalCondition.trim();
                    if (
                      v &&
                      !neurologicalDisorder.items.some(
                        (item) =>
                          item.name.toLowerCase() === v.toLowerCase()
                      )
                    ) {
                      setNeurologicalDisorder((prev) => ({
                        ...prev,
                        items: [...prev.items, { name: v, date: null }],
                      }));
                    }
                    setNewNeurologicalCondition("");
                  }}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!formDisabled &&
              filteredNeurologicalOptions.length > 0 &&
              newNeurologicalCondition.trim().length > 0 && (
                <View style={styles.suggestionsWrap}>
                  {filteredNeurologicalOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionPill}
                      onPress={() => {
                        if (
                          !neurologicalDisorder.items.some(
                            (c) =>
                              c.name.toLowerCase() === item.toLowerCase()
                          )
                        ) {
                          setNeurologicalDisorder((prev) => ({
                            ...prev,
                            items: [
                              ...prev.items,
                              { name: item, date: null },
                            ],
                          }));
                        }
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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
      </View>

      {/* Heart Problems from API list */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Heart Problems?</Text>
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
        {heartProblems.istrue && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Heart Problem</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newHeartProblem}
                  onChangeText={setNewHeartProblem}
                  placeholder="Search or enter heart problem"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    const v = newHeartProblem.trim();
                    if (
                      v &&
                      !heartProblems.items.some(
                        (item) =>
                          item.name.toLowerCase() === v.toLowerCase()
                      )
                    ) {
                      setHeartProblems((prev) => ({
                        ...prev,
                        items: [...prev.items, { name: v, date: null }],
                      }));
                    }
                    setNewHeartProblem("");
                  }}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!formDisabled &&
              filteredHeartProblemOptions.length > 0 &&
              newHeartProblem.trim().length > 0 && (
                <View style={styles.suggestionsWrap}>
                  {filteredHeartProblemOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionPill}
                      onPress={() => {
                        if (
                          !heartProblems.items.some(
                            (c) =>
                              c.name.toLowerCase() === item.toLowerCase()
                          )
                        ) {
                          setHeartProblems((prev) => ({
                            ...prev,
                            items: [
                              ...prev.items,
                              { name: item, date: null },
                            ],
                          }));
                        }
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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
      </View>

      {/* Mental Health from master list */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Any Mental Health Problems?</Text>
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
        {mentalHealth.istrue && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Mental Health Problem</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newMentalHealth}
                  onChangeText={setNewMentalHealth}
                  placeholder="Search or enter mental health problem"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    const v = newMentalHealth.trim();
                    if (
                      v &&
                      !mentalHealth.items.some(
                        (item) =>
                          item.name.toLowerCase() === v.toLowerCase()
                      )
                    ) {
                      setMentalHealth((prev) => ({
                        ...prev,
                        items: [...prev.items, { name: v, date: null }],
                      }));
                    }
                    setNewMentalHealth("");
                  }}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!formDisabled &&
              filteredMentalHealthOptions.length > 0 &&
              newMentalHealth.trim().length > 0 && (
                <View style={styles.suggestionsWrap}>
                  {filteredMentalHealthOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionPill}
                      onPress={() => {
                        if (
                          !mentalHealth.items.some(
                            (c) =>
                              c.name.toLowerCase() === item.toLowerCase()
                          )
                        ) {
                          setMentalHealth((prev) => ({
                            ...prev,
                            items: [
                              ...prev.items,
                              { name: item, date: null },
                            ],
                          }));
                        }
                      }}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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
      </View>
    </View>
  );

  const renderInfectiousSection = () => (
    <View style={styles.section}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>
          Do You Have/Had Hepatitis B, Hepatitis C or HIV?
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
      </View>

      {infections.istrue && (
        <>
          {infectionList.map((infection) => (
            <View key={infection} style={styles.fieldBlock}>
              <CheckboxRow
                label={infection}
                checked={infections.items.some((item) => item.name === infection)}
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
      {currentPatient?.category === 1 ? (
        <Text style={styles.notApplicable}>Not applicable for neonates.</Text>
      ) : (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>
              Drug, Tobacco or Alcohol addiction?
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
          </View>

          {addiction.istrue && (
            <>
              {["Alcohol", "Tobacco", "Drugs"].map((item) => (
                <View key={item} style={styles.fieldBlock}>
                  <CheckboxRow
                    label={item}
                    checked={addiction.items.some((add) => add.name === item)}
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
      {/* 🔹 Hide pregnancy completely for neonates (category 1) */}
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
                label="Pregnancy Date"
                value={pregnancyDetails.date}
                maximumDate={new Date()}
                disabled={formDisabled}
                onChange={(date) =>
                  setPregnancyDetails((prev) => ({ ...prev, date }))
                }
              />
              <View style={styles.row}>
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.label}>Number of Pregnancies</Text>
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
                  <Text style={styles.label}>Live Births</Text>
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
            </>
          )}
        </View>
      )}

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>
          Any Known Disease Mother/Father is Suffering / Suffered?
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
      </View>

      {hereditaryDisease.istrue && (
        <>
          {heriditaryList.map((disease) => (
            <View key={disease} style={styles.fieldBlock}>
              <CheckboxRow
                label={disease}
                checked={hereditaryDisease.items.some(
                  (item) => item.disease === disease
                )}
                disabled={formDisabled}
                onToggle={() => {
                  const exists = hereditaryDisease.items.some(
                    (item) => item.disease === disease
                  );
                  if (exists) {
                    setHereditaryDisease((prev) => ({
                      ...prev,
                      items: prev.items.filter(
                        (item) => item.disease !== disease
                      ),
                    }));
                  } else {
                    setHereditaryDisease((prev) => ({
                      ...prev,
                      items: [...prev.items, { disease, name: "" }],
                    }));
                  }
                }}
              />
              {hereditaryDisease.items.some(
                (item) => item.disease === disease
              ) && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Disease Name</Text>
                  <TextInput
                    style={styles.input}
                    value={
                      hereditaryDisease.items.find(
                        (item) => item.disease === disease
                      )?.name || ""
                    }
                    onChangeText={(text) => {
                      setHereditaryDisease((prev) => ({
                        ...prev,
                        items: prev.items.map((item) =>
                          item.disease === disease
                            ? { ...item, name: text }
                            : item
                        ),
                      }));
                    }}
                    placeholder={`Enter ${disease} details`}
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
            label="Examination Date"
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

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={lumps.details.location}
                onValueChange={(value) =>
                  setLumps((prev) => ({
                    ...prev,
                    details: { ...prev.details, location: value },
                  }))
                }
                style={styles.picker}
              >
                <Picker.Item label="Select Location" value="" />
                <Picker.Item label="Thyroid" value="Thyroid" />
                <Picker.Item
                  label="Lymph nodes - neck"
                  value="Lymph nodes - neck"
                />
                <Picker.Item
                  label="Lymph nodes - jaw"
                  value="Lymph nodes - jaw"
                />
                <Picker.Item
                  label="Lymph nodes - ear"
                  value="Lymph nodes - ear"
                />
                <Picker.Item label="Salivary glands" value="Salivary glands" />
                <Picker.Item label="Breast" value="Breast" />
                <Picker.Item label="Lung" value="Lung" />
                <Picker.Item label="Liver" value="Liver" />
                <Picker.Item label="Spleen" value="Spleen" />
                <Picker.Item label="Kidneys" value="Kidneys" />
                <Picker.Item label="Ovaries" value="Ovaries" />
                <Picker.Item
                  label="Lymph nodes - abdominal"
                  value="Lymph nodes - abdominal"
                />
                <Picker.Item
                  label="Lymph nodes - axillary"
                  value="Lymph nodes - axillary"
                />
                <Picker.Item label="Arms" value="Arms" />
                <Picker.Item label="Legs" value="Legs" />
              </Picker>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Size</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={lumps.details.size}
                onValueChange={(value) =>
                  setLumps((prev) => ({
                    ...prev,
                    details: { ...prev.details, size: value },
                  }))
                }
                style={styles.picker}
              >
                <Picker.Item label="Select Size" value="" />
                <Picker.Item label="Small" value="Small" />
                <Picker.Item label="Medium" value="Medium" />
                <Picker.Item label="Large" value="Large" />
              </Picker>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Consistency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={lumps.details.consistency}
                onValueChange={(value) =>
                  setLumps((prev) => ({
                    ...prev,
                    details: { ...prev.details, consistency: value },
                  }))
                }
                style={styles.picker}
              >
                <Picker.Item label="Select Consistency" value="" />
                <Picker.Item label="Soft" value="Soft" />
                <Picker.Item label="Firm" value="Firm" />
                <Picker.Item label="Hard" value="Hard" />
              </Picker>
            </View>
          </View>
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
            label="Diagnosis Date"
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

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Type of Cancer</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={cancer.details.type}
                onValueChange={(value) =>
                  setCancer((prev) => ({
                    ...prev,
                    details: { ...prev.details, type: value },
                  }))
                }
                style={styles.picker}
              >
                <Picker.Item label="Select Type" value="" />
                <Picker.Item label="Breast Cancer" value="Breast Cancer" />
                <Picker.Item label="Lung Cancer" value="Lung Cancer" />
                <Picker.Item
                  label="Prostate Cancer"
                  value="Prostate Cancer"
                />
                <Picker.Item
                  label="Colorectal Cancer"
                  value="Colorectal Cancer"
                />
                <Picker.Item label="Leukemia" value="Leukemia" />
                <Picker.Item label="Lymphoma" value="Lymphoma" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Stage of Cancer</Text>
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

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 120,
            flexGrow: 1,
          }}
        >
          {renderSection()}

          {/* Prev / Next navigation (same order as web flow) */}
          <View style={styles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {/* PREV */}
              <TouchableOpacity
                style={[styles.navButton]}
                onPress={() => {
                  const idx = sectionOrder.indexOf(section);
                  if (idx > 0) {
                    navigation.navigate("MedicalHistoryForm", {
                      section: sectionOrder[idx - 1],
                      medicalHistoryData: formData,
                      onDataUpdate,
                    });
                  }
                }}
              >
                <Text style={styles.navButtonText}>Prev</Text>
              </TouchableOpacity>

              {/* NEXT – disabled until basic details are filled */}
              <TouchableOpacity
                style={[
                  styles.navButton,
                  formDisabled && styles.navButtonDisabled,
                ]}
                disabled={formDisabled}
                onPress={() => {
                  if (formDisabled) return;
                  const idx = sectionOrder.indexOf(section);
                  if (idx < sectionOrder.length - 1) {
                    navigation.navigate("MedicalHistoryForm", {
                      section: sectionOrder[idx + 1],
                      medicalHistoryData: formData,
                      onDataUpdate,
                    });
                  }
                }}
              >
                <Text style={styles.navButtonText}>Next</Text>
              </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
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
  },
  picker: {
    height: 50,
    color: "#111827",
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#14b8a6",
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  footerWrap: {
    position: "absolute",
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
  suggestionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  suggestionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  suggestionText: {
    fontSize: 12,
    color: "#374151",
  },
});

export default MedicalHistoryFormScreen;
