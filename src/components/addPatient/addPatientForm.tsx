import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  PermissionsAndroid,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { AuthFetch, UploadFiles } from "../../auth/auth";
import Footer from "../dashboard/footer";
import { RootState } from "../../store/store";
import { city, state } from "../../utils/stateCity";
import { Category, genderList, getUniqueId } from "../../utils/addPatientFormHelper";
import { Role_NAME, patientStatus } from "../../utils/role";
import {
  validateAgeAndUnit as validateAgeAndUnitUtil,
  ageFromDOB,
  AgeUnit,
} from "../../utils/age";
import {
  patientOPDbasicDetailType,
  staffType,
  wardType,
} from "../../utils/types";
import { showError, showSuccess } from "../../store/toast.slice";
import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
import { COLORS } from "../../utils/colour";

type Department = { id: number; name: string };

const { height } = Dimensions.get("window");

const initialFormState: patientOPDbasicDetailType = {
  hospitalID: { valid: true, value: null, showError: false, message: "" },
  pID: { valid: true, value: "", showError: false, message: "" },
  pUHID: { valid: false, value: null, showError: false, message: "Please enter the UHID number" },
  ptype: { valid: true, value: 1, showError: false, message: "" },
  dob: { valid: true, value: "", showError: false, message: "" },
  gender: { valid: false, value: -1, showError: false, message: "" },
  age: { value: "", valid: false, showError: false, message: "" },
  weight: { valid: false, value: null, showError: false, message: "" },
  height: { valid: false, value: null, showError: false, message: "" },
  pName: { valid: false, value: "", showError: false, message: "" },
  phoneNumber: { valid: false, value: null, showError: false, message: "" },
  email: { valid: true, value: "", showError: false, message: "" },
  address: { valid: false, value: "", showError: false, message: "" },
  city: { valid: false, value: "", showError: false, message: "" },
  state: { valid: false, value: "", showError: false, message: "" },
  pinCode: { valid: false, value: "", showError: false, message: "" },
  referredBy: { valid: true, value: "", showError: false, message: "" },
  departmentID: { valid: false, value: undefined, showError: false, message: "" },
  department: { valid: false, value: "", showError: false, message: "" },
  userID: { valid: false, value: null, showError: false, message: "" },
  wardID: { valid: true, value: null, showError: false, message: "" },
  insurance: { valid: true, value: 0, showError: false, message: "" },
  insuranceNumber: { valid: true, value: "", showError: false, message: "" },
  insuranceCompany: { valid: true, value: "", showError: false, message: "" },
  discount: { valid: true, value: "", showError: false, message: "" },
  reason: { valid: true, value: "", showError: false, message: "" },
  id: { valid: true, value: "", showError: false, message: "" },
};

const AddPatientForm: React.FC = () => {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const category: Category = (route.params?.category ?? "adult") as Category;
  const patientStatusFromRoute = route.params?.patientStatus ?? patientStatus.opd;

  const dispatch = useDispatch()
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const [formData, setFormData] = useState<patientOPDbasicDetailType>(initialFormState);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [cityList, setCityList] = useState<string[]>([]);
  const [doctorList, setDoctorList] = useState<staffType[]>([]);
  const [departmentList, setDepartmentList] = useState<Department[]>([]);
  const [wardList, setWardList] = useState<wardType[]>([]); // NEW: Ward list state
  const [filteredDoctors, setFilteredDoctors] = useState<staffType[]>([]);
  const [selectedDepartmentID, setSelectedDepartmentID] = useState<number | null>(null);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("years");
  const [title, setTitle] = useState("");
  const [titleList, setTitleList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePickerModal, setImagePickerModal] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const FOOTER_HEIGHT = 70;



  // ---------- Title list by category ----------
  useEffect(() => {
    if (category === "1") {
      setTitleList(["B/O"]);
      setTitle("B/O");
      setAgeUnit("days");
    } else if (category === "2") {
      setTitleList(["Mr.", "Ms."]);
      setTitle("Mr.");
    } else {
      setTitleList(["Mr.", "Mrs.", "Ms."]);
      setTitle("Mr.");
      setAgeUnit("years");
    }
  }, [category]);

  // ---------- Prefill hospitalID / pID / ptype ----------
  useEffect(() => {
    const value = getUniqueId();
    setFormData(prev => ({
      ...prev,
      hospitalID: { value: user?.hospitalID ?? null, valid: !!user?.hospitalID, showError: !user?.hospitalID, message: "" },
      pID: { valid: true, showError: false, value, message: "" },
      ptype: { valid: true, showError: false, value: patientStatusFromRoute, message: "" },
    }));
  }, [user?.hospitalID, patientStatusFromRoute]);

  // ---------- Fetch departments, doctors, and wards ----------
  const fetchData = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const [deptRes, docRes, wardRes] = await Promise.all([
        AuthFetch(`department/${user?.hospitalID}`, token),
        AuthFetch(`user/${user?.hospitalID}/list/${Role_NAME.doctor}`, token),
        AuthFetch(`ward/${user?.hospitalID}`, token), // NEW: Fetch wards
      ]);
      if (deptRes?.status === "success") setDepartmentList(deptRes?.data?.departments || []);
      if (docRes?.status === "success") setDoctorList(docRes?.data?.users || []);
      if (wardRes?.status === "success") setWardList(wardRes?.data?.wards || []); // NEW: Set ward list
    } catch {
      Alert.alert("Error", "Failed to load data");
    }
  }, [user?.hospitalID, user?.token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------- HOD prefill ----------
  useEffect(() => {
    if (user?.role === 4000 && user?.departmentID && departmentList?.length > 0) {
      const dept = departmentList.find((d) => d.id === user.departmentID);
      if (dept) {
        const hodEntry: staffType = {
          id: user?.id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          departmentID: user.departmentID,
        };
        const filtered = [hodEntry, ...doctorList.filter((d) => d.departmentID === user.departmentID)];
        setFilteredDoctors(filtered);
        setSelectedDepartmentID(user.departmentID);
        setFormData((prev) => ({
          ...prev,
          department: { value: String(user.departmentID), valid: true, showError: false, message: "" },
          departmentID: { value: user.departmentID, valid: true, showError: false, message: "" },
          userID: { value: user.id, valid: true, showError: false, message: "" },
        }));
      }
    }
  }, [user, departmentList, doctorList]);

  // ---------- Filter doctors by department ----------
  useEffect(() => {
    if (selectedDepartmentID && user?.role !== 4000) {
      setFilteredDoctors(doctorList.filter((d) => d.departmentID === selectedDepartmentID));
    } else if (user?.role !== 4000) {
      setFilteredDoctors(doctorList);
    }
  }, [selectedDepartmentID, doctorList, user?.role]);

  // ---------- Update city list ----------
  useEffect(() => {
    const idx = state.indexOf(formData.state.value || "");
    setCityList(idx >= 0 ? city[idx] : []);
  }, [formData.state.value]);

  // ---------- DOB -> Age ----------
  useEffect(() => {
    if (!selectedDate) return;
    const dobStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    setFormData((prev) => ({ ...prev, dob: { ...prev.dob, value: dobStr, valid: true } }));

    const a = ageFromDOB(dobStr);
    let effectiveUnit: AgeUnit = a.unit;
    if (category === "1") effectiveUnit = "days";
    else if (category === "3") effectiveUnit = "years";

    setAgeUnit(effectiveUnit);
    const rule = validateAgeAndUnitUtil(
      category === "1" ? "neonate" : category === "2" ? "child" : "adult",
      a.n,
      effectiveUnit
    );
    setFormData((prev) => ({
      ...prev,
      age: {
        value: `${a.n} ${effectiveUnit}`,
        valid: rule.ok,
        showError: !rule.ok,
        message: rule.ok ? "" : (rule.msg || ""),
      },
    }));
  }, [selectedDate, category]);

  // ---------- Camera Permission ----------
  const requestCameraPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "App needs access to your camera to take photos.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        dispatch(showError(err?.message || err?.status))
        return false;
      }
    }
    return true;
  };

  // ---------- Image Picker ----------
  const pickImage = async (type: "camera" | "gallery") => {
    const hasPermission = type === "camera" ? await requestCameraPermission() : true;
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Camera access is required to take photos.");
      setImagePickerModal(false);
      return;
    }

    const options: any = {
      mediaType: "photo",
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8,
    };

    const launcher = type === "camera" ? launchCamera : launchImageLibrary;

    launcher(options, (response: any) => {
      if (response.didCancel) {
        dispatch(showError("User cancelled image picker"))
      } else if (response.errorCode) {
        Alert.alert("Error", response.errorMessage || "Failed to pick image");
      } else if (response.assets?.[0]?.uri) {
        setProfileImage(response.assets[0].uri);
      }
      setImagePickerModal(false);
    });
  };

  const validateForm = () => {
    let valid = true;
    const updated = { ...formData };

    if (!formData.pUHID.value || String(formData.pUHID.value).replace(/-/g, "").length !== 14) {
      updated.pUHID = { ...updated.pUHID, valid: false, showError: true };
      valid = false;
    }

    if (!formData.departmentID.value) {
      updated.departmentID = { ...updated.departmentID, valid: false, showError: true };
      valid = false;
    }

    // Doctor is ALWAYS required for ALL patient statuses
    if (!formData.userID.value) {
      updated.userID = { ...updated.userID, valid: false, showError: true };
      valid = false;
    }

    // Ward is required ONLY for inpatient (status 2)
    if (user?.patientStatus == 2 && !formData.wardID.value) {
      updated.wardID = { ...updated.wardID, valid: false, showError: true };
      valid = false;
    }

    (Object.keys(formData) as (keyof patientOPDbasicDetailType)[]).forEach((key) => {
      const field = formData[key];
      if (!field.valid && field.value !== null && field.value !== "") {
        updated[key] = { ...field, showError: true };
        valid = false;
      }
    });

    setFormData(updated);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const data = new FormData();
    const numHospitalID = Number(user?.hospitalID ?? 0);
    const numCategory = Number(route.params?.category ?? 1);
    const numAddedBy = Number(user?.id ?? 0);
    const numPtype = Number(patientStatusFromRoute);
    const numPUHID = Number(String(formData.pUHID.value || "").replace(/\D/g, ""));
    const numGender = Number(formData.gender.value);
    const numWeight = Number(formData.weight.value);
    const numHeight = Number(formData.height.value);
    const numInsurance = Number(formData.insurance.value);

    data.append("hospitalID", numHospitalID as any);
    data.append("category", numCategory as any);
    data.append("addedBy", numAddedBy as any);
    data.append("ptype", numPtype as any);
    data.append("pUHID", numPUHID as any);
    data.append("gender", numGender as any);
    data.append("weight", numWeight as any);
    data.append("height", numHeight as any);
    data.append("insurance", numInsurance as any);
    data.append("age", formData.age.value);

    if (formData.departmentID.value) {
      data.append("departmentID", Number(formData.departmentID.value) as any);
    }

    // Include ward ONLY for inpatient (status 2)
    if (user?.patientStatus == 2 && formData.wardID.value) {
      data.append("wardID", Number(formData.wardID.value) as any);
    }

    // Add doctor for all statuses
    if (formData.userID.value) {
      data.append("userID", Number(formData.userID.value) as any);
    } else if (user?.id) {
      data.append("userID", Number(user.id) as any);
    }


    if (profileImage) {
      data.append("photo", {
        uri: profileImage,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
    } else {
      data.append("photo", "" as any);
    }

    (Object.keys(formData) as (keyof patientOPDbasicDetailType)[]).forEach((k) => {
      if (
        k === "hospitalID" || k === "pUHID" || k === "ptype" || k === "gender" ||
        k === "weight" || k === "height" || k === "insurance" || k === "department" ||
        k === "departmentID" || k === "userID" || k === "age" || k === "wardID"
      ) return;

      const field = formData[k];
      if (field.valid && field.value !== null && field.value !== "") {
        data.append(String(k), String(field.value));
      }
    });

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await UploadFiles(`patient/${user?.hospitalID}/patients`, data, token);
      if (res?.status === "success") {
        dispatch(showSuccess("Patient registered successfully"))
        if (user?.patientStatus == 2) { 
          navigation.navigate("DashboardIpd");
        } else {
          navigation.navigate("AddPatient");
        }
      } else {
        dispatch(showError(res?.message || res?.status || res?.data?.message || "Patient registration failed"))
      }
    } catch (err: any) {
      dispatch(showError(err?.message || "Patient registration failed"))
    } finally {
      setLoading(false);
    }
  };
  // ---------- Custom Picker with Selected Label ----------
  const CustomPicker = ({
    selectedValue,
    onValueChange,
    items,
    placeholder,
    enabled = true,
  }: {
    selectedValue: any;
    onValueChange: (item: any) => void;
    items: { label: string; value: any }[];
    placeholder: string;
    enabled?: boolean;
  }) => {
    const selectedLabel = items.find(i => i.value === selectedValue)?.label || placeholder;

    return (
      <View style={[styles.pickerContainer, { borderColor: COLORS.border, opacity: enabled ? 1 : 0.6 }]}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={styles.picker}
          dropdownIconColor={COLORS.brand}
          enabled={enabled}
        >
          {items.map(item => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
        <View style={styles.pickerOverlay}>
          <Text style={[styles.pickerSelectedText, { color: selectedValue ? COLORS.text : COLORS.placeholder }]}>
            {selectedLabel}
          </Text>
        </View>
      </View>
    );
  };

  // ---------- Input Renderer ----------
  const renderInput = (
    label: string,
    name: keyof patientOPDbasicDetailType,
    opts: { multiline?: boolean; keyboardType?: any; maxLength?: number; placeholder?: string } = {}
  ) => {
    const field = formData[name];
    const placeholder = opts.placeholder || `Enter ${label.toLowerCase()}`;

    return (
      <View style={styles.inputBlock}>
        <Text style={[styles.label, { color: COLORS.sub }]}>
          {label} {["pName", "phoneNumber", "address", "state", "city", "pinCode", "pUHID"].includes(name as any) && <Text style={{ color: COLORS.danger }}>*</Text>}
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: COLORS.border, color: COLORS.text },
            field.showError && { borderColor: COLORS.danger },
            opts.multiline && styles.inputMultiline,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={String(field.value || "")}
          onChangeText={(text) => {
            let formatted = text;
            let valid = true;
            let message = "";

            if (name === "pUHID") {
              const digits = text.replace(/\D/g, "").slice(0, 14);
              const g1 = digits.slice(0, 4);
              const g2 = digits.slice(4, 7);
              const g3 = digits.slice(7, 10);
              const g4 = digits.slice(10, 14);
              formatted = [g1, g2, g3, g4].filter(Boolean).join("-");
              valid = digits.length === 14;
              message = valid ? "" : "UHID must be 14 digits";
            } else if (name === "phoneNumber" || name === "pinCode") {
              formatted = text.replace(/\D/g, "").slice(0, name === "pinCode" ? 6 : 10);
              valid = formatted.length === (name === "pinCode" ? 6 : 10);
            } else if (name === "pName") {
              valid = /^[A-Za-z\s]{0,50}$/.test(text);
            }

            setFormData((prev) => ({
              ...prev,
              [name]: { ...prev[name], value: formatted, valid, showError: !valid && formatted !== "", message },
            }));
          }}
          keyboardType={opts.keyboardType || "default"}
          multiline={opts.multiline}
          maxLength={opts.maxLength}
        />
        {field.showError && <Text style={[styles.errorText, { color: COLORS.danger }]}>{field.message || "Required"}</Text>}
      </View>
    );
  };

  const allowedUnits: AgeUnit[] = useMemo(() => {
    if (category === "1") return ["days"];
    if (category === "3") return ["years"];
    return ["days", "months", "years"];
  }, [category]);

  const debouncedSubmit = useCallback(
    debounce(handleSubmit, DEBOUNCE_DELAY),
    [handleSubmit]
  );

  // NEW: Function to capitalize first letter (like in reference code)
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: FOOTER_HEIGHT + insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: COLORS.text }]}>
            {category === "1" ? "Neonate" : category === "2" ? "Child" : "Adult"} Registration
            {user?.patientStatus == 2 && " (Inpatient)"} {/* CHANGE: Use user?.patientStatus here */}
          </Text>

          {/* Photo Card */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Patient Photo</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={() => setImagePickerModal(true)} activeOpacity={0.8}>
                <View style={[styles.photoWrap, { borderColor: COLORS.brand }]}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.placeholderIcon}>
                      <Text style={{ fontSize: 32, color: COLORS.sub }}>+</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: COLORS.sub }}>Tap to upload (optional)</Text>
                <Text style={{ fontSize: 11, color: COLORS.sub, marginTop: 2 }}>JPEG/PNG • Max 5MB</Text>
              </View>
            </View>
          </View>

          {/* Identity Card */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Identity</Text>
            <View style={styles.row}>
              <View style={{ flex: 0.4 }}>
                <Text style={[styles.label, { color: COLORS.sub }]}>Title *</Text>
                <CustomPicker
                  selectedValue={title}
                  onValueChange={setTitle}
                  items={titleList.map(t => ({ label: t, value: t }))}
                  placeholder="Select Title"
                />
              </View>
              <View style={{ flex: 0.6, marginLeft: 8 }}>
                {renderInput("Patient Name", "pName", { placeholder: "Enter full name" })}
              </View>
            </View>
            {renderInput("Patient ID (Auto)", "pID", { placeholder: "Auto-generated" })}
            {renderInput("UHID", "pUHID", { keyboardType: "numeric", maxLength: 18, placeholder: "XXXX-XXX-XXX-XXXX" })}
          </View>

          {/* Demographics */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Basic Details</Text>

            <View style={styles.inputBlock}>
              <Text style={[styles.label, { color: COLORS.sub }]}>Date of Birth *</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.dateButton, { borderColor: COLORS.border }]}>
                <Text style={{ color: selectedDate ? COLORS.text : COLORS.placeholder, fontSize: 15 }}>
                  {selectedDate ? selectedDate.toLocaleDateString() : "Select DOB"}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === "android" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(e, date) => {
                    setShowDatePicker(false);
                    if (date) setSelectedDate(date);
                  }}
                />
              )}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 0.6 }}>
                {renderInput("Age", "age", { keyboardType: "numeric", placeholder: "Enter age" })}
              </View>
              <View style={{ flex: 0.4, marginLeft: 8 }}>
                <Text style={[styles.label, { color: COLORS.sub }]}>Unit</Text>
                <CustomPicker
                  selectedValue={ageUnit}
                  onValueChange={(u: AgeUnit) => {
                    if (!allowedUnits.includes(u)) return;
                    setAgeUnit(u);
                    const raw = String(formData.age.value || "").split(" ")[0];
                    const n = Number(raw);
                    if (Number.isFinite(n)) {
                      const rule = validateAgeAndUnitUtil(
                        category === "1" ? "neonate" : category === "2" ? "child" : "adult",
                        n,
                        u
                      );
                      setFormData(prev => ({
                        ...prev,
                        age: { value: `${n} ${u}`, valid: rule.ok, showError: !rule.ok, message: rule.msg || "" }
                      }));
                    }
                  }}
                  items={allowedUnits.map(u => ({ label: u[0].toUpperCase() + u.slice(1), value: u }))}
                  placeholder="Unit"
                />
              </View>
            </View>

            <View style={styles.inputBlock}>
              <Text style={[styles.label, { color: COLORS.sub }]}>Gender *</Text>
              <View style={styles.genderRow}>
                {genderList.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[
                      styles.genderChip,
                      { borderColor: COLORS.border },
                      formData.gender.value === g.key && { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        gender: { value: g.key, valid: true, showError: false, message: "" },
                      }))
                    }
                  >
                    <Text
                      style={[
                        { color: formData.gender.value === g.key ? "#fff" : COLORS.text, fontWeight: "600" },
                      ]}
                    >
                      {g.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>{renderInput("Weight (kg)", "weight", { keyboardType: "numeric", placeholder: "e.g. 65" })}</View>
              <View style={styles.col}>{renderInput("Height (cm)", "height", { keyboardType: "numeric", placeholder: "e.g. 170" })}</View>
            </View>
          </View>

          {/* Contact */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Contact</Text>
            {renderInput("Mobile Number", "phoneNumber", { keyboardType: "phone-pad", placeholder: "10-digit mobile" })}
            {renderInput("Email ID", "email", { keyboardType: "email-address", placeholder: "example@domain.com" })}
          </View>

          {/* Address */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Address</Text>
            {renderInput("Complete Address", "address", { multiline: true, placeholder: "House no., street, area" })}

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: COLORS.sub }]}>State *</Text>
                <CustomPicker
                  selectedValue={formData.state.value}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      state: { value: val, valid: true, showError: false, message: "" },
                      city: { ...prev.city, value: "", valid: false },
                    }))
                  }
                  items={state.map(s => ({ label: s, value: s }))}
                  placeholder="Select State"
                />
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { color: COLORS.sub }]}>City *</Text>
                <CustomPicker
                  selectedValue={formData.city.value}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      city: { value: val, valid: true, showError: false, message: "" },
                    }))
                  }
                  items={cityList.map(c => ({ label: c, value: c }))}
                  placeholder="Select City"
                  enabled={cityList.length > 0}
                />
              </View>
            </View>

            {renderInput("PIN Code", "pinCode", { keyboardType: "numeric", placeholder: "6-digit PIN" })}
          </View>

          {/* Department, Ward & Doctor - Show for ALL patient statuses */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>
              {user?.patientStatus == 2 ? "Ward, Department & Doctor" : "Department & Doctor"}
            </Text>

            <View style={styles.row}>
              {/* Department - ALWAYS SHOW */}
              <View style={user?.patientStatus == 2 ? styles.col : { flex: 1 }}>
                <Text style={[styles.label, { color: COLORS.sub }]}>Department *</Text>
                <CustomPicker
                  selectedValue={selectedDepartmentID}
                  onValueChange={(id) => {
                    setSelectedDepartmentID(id);
                    setFormData((prev) => ({
                      ...prev,
                      department: { value: String(id ?? ""), valid: true, showError: false, message: "" },
                      departmentID: { value: id, valid: true, showError: false, message: "" },
                    }));
                  }}
                  items={departmentList.map(d => ({ label: d.name, value: d.id }))}
                  placeholder="Select Department"
                  enabled={user?.role !== 4000}
                />
                {formData.departmentID.showError && (
                  <Text style={[styles.errorText, { color: COLORS.danger }]}>
                    Please select a department
                  </Text>
                )}
              </View>

              {/* Ward - SHOW ONLY for inpatient (status 2) */}
              {user?.patientStatus == 2 && (
                <View style={styles.col}>
                  <Text style={[styles.label, { color: COLORS.sub }]}>
                    Ward <Text style={{ color: COLORS.danger }}>*</Text>
                  </Text>
                  <CustomPicker
                    selectedValue={formData.wardID.value}
                    onValueChange={(id) => {
                      setFormData((prev) => ({
                        ...prev,
                        wardID: { value: id, valid: true, showError: false, message: "" },
                      }));
                    }}
                    items={wardList?.map(ward => ({
                      label: capitalizeFirstLetter(ward.name),
                      value: ward.id
                    }))}
                    placeholder="Select Ward"
                  />
                  {formData.wardID.showError && (
                    <Text style={[styles.errorText, { color: COLORS.danger }]}>
                      Please select a ward
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Doctor Selection */}
            <View style={styles.inputBlock}>
              <Text style={[styles.label, { color: COLORS.sub }]}>Doctor *</Text>
              <CustomPicker
                selectedValue={formData.userID.value}
                onValueChange={(id) => {
                  const doc = filteredDoctors.find((d) => d.id === id);
                  setFormData((prev) => ({
                    ...prev,
                    userID: { value: id, valid: true, showError: false, message: "" },
                    departmentID: { value: doc?.departmentID || selectedDepartmentID || undefined, valid: true, showError: false, message: "" },
                    department: { value: String(doc?.departmentID || selectedDepartmentID || ""), valid: true, showError: false, message: "" },
                  }));
                }}
                items={filteredDoctors?.map(d => ({ label: `${d.firstName} ${d.lastName || ""}`, value: d.id }))}
                placeholder="Select Doctor"
                enabled={user?.role !== 4000}
              />
              {formData.userID.showError && (
                <Text style={[styles.errorText, { color: COLORS.danger }]}>
                  Please select a doctor
                </Text>
              )}
            </View>

            {renderInput("Referred By", "referredBy", { placeholder: "Doctor or hospital name" })}
          </View>

          {/* Insurance */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Insurance</Text>
            <View style={styles.inputBlock}>
              <Text style={[styles.label, { color: COLORS.sub }]}>Insurance *</Text>
              <CustomPicker
                selectedValue={formData.insurance.value}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    insurance: { value: val as 0 | 1, valid: true, showError: false, message: "" },
                  }))
                }
                items={[{ label: "No", value: 0 }, { label: "Yes", value: 1 }]}
                placeholder="Select"
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity style={[styles.submitButton, { backgroundColor: COLORS.brand }]} onPress={debouncedSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Patient</Text>}
          </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
          <Footer active={"addPatient"} brandColor={COLORS.brand} />
        </View>
        {insets.bottom > 0 && <View style={[styles.navShield, { height: insets.bottom }]} />}

        {/* Image Picker Modal */}
        <Modal visible={imagePickerModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: COLORS.card }]}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>Choose Photo</Text>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.brand }]} onPress={() => pickImage("camera")}>
                <Text style={styles.modalButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.brand }]} onPress={() => pickImage("gallery")}>
                <Text style={styles.modalButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#6b7280" }]} onPress={() => setImagePickerModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, textAlign: "center" },

  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },

  row: { flexDirection: "row", marginHorizontal: -4 },
  col: { flex: 1, paddingHorizontal: 4 },
  inputBlock: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },

  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "transparent",
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },
  errorText: { fontSize: 12, marginTop: 4 },

  pickerContainer: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
    height: 50,
    justifyContent: "center",
    position: "relative",
  },
  picker: {
    height: 50,
    width: "100%",
    opacity: 0,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  pickerSelectedText: {
    fontSize: 15,
  },

  genderRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },

  dateButton: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  photoRow: { flexDirection: "row", alignItems: "center" },
  photoWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  profileImage: { width: 84, height: 84, borderRadius: 42 },
  placeholderIcon: { justifyContent: "center", alignItems: "center" },

  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 16, padding: 24, width: "88%", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalButton: { padding: 14, borderRadius: 12, width: "100%", alignItems: "center", marginVertical: 6 },
  modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    zIndex: 10,
    elevation: 8,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9,
    backgroundColor: "transparent",
  },
});

export default AddPatientForm;