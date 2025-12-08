// src/screens/patient/PatientEditMobile.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  StyleSheet,
  PermissionsAndroid,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";

import Footer from "../../dashboard/footer";
import { currentPatient, RootState } from "../../../store/store";
import { AuthFetch, UpdateFiles } from "../../../auth/auth";
import { showError, showSuccess } from "../../../store/toast.slice";

import { state as STATE_LIST, city as CITY_LIST } from "../../../utils/stateCity";
import { AgeUnit, dobFromAge } from "../../../utils/age";
import { COLORS } from "../../../utils/colour";
import { formatDate } from "../../../utils/dateTime";

const FOOTER_H = 64;

const EditPatientMobile = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const user = useSelector((s: RootState) => s.currentUser);
  const { id } = route.params;

  // ---------------- STATE ----------------
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<any | null>(null);
  const [imagePickerModal, setImagePickerModal] = useState(false);

  const [pName, setPName] = useState("");
  const [pID, setPID] = useState("");
  const [pUHID, setPUHID] = useState("");
  const [dob, setDob] = useState("");
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);

  const [gender, setGender] = useState<1 | 2 | 3 | 0>(0);

  const [ageNumber, setAgeNumber] = useState("");
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("years");

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  const [stateName, setStateName] = useState("");
  const [cityName, setCityName] = useState("");
  const [cityList, setCityList] = useState<string[]>([]);

  const [address, setAddress] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [referredBy, setReferredBy] = useState("");

  const [insurance, setInsurance] = useState<0 | 1>(0);
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState("");

  const [insuranceNumError, setInsuranceNumError] = useState("");
  const [insuranceCompError, setInsuranceCompError] = useState("");

  // ---------------- FETCH DATA ----------------
  const fetchPatient = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));

      const res = await AuthFetch(
        `patient/${user?.hospitalID}/patients/single/${id}`,
        token
      );

      const patient =
        (res && "patient" in res && res?.patient) ||
        (res && "data" in res && res?.data?.patient) ||
        (res && "data" in res && res?.data) ||
        res;

      if (!patient) {
        dispatch(showError("Failed to load patient"));
        setLoading(false);
        return;
      }

      setPName(patient.pName || "");
      setPID(patient.pID || "");
      setPUHID(patient.pUHID ? String(patient.pUHID) : "");

      if (patient.dob) {
        const d = new Date(patient.dob);
        const iso = patient.dob.split("T")[0] || "";
        setDob(iso);
        setDobDate(d);

        // derive age from DOB
        const today = new Date();
        const diff = Math.floor(
          (today.getTime() - d.getTime()) / (1000 * 3600 * 24)
        );
        let val = diff;
        let unit: AgeUnit = "days";

        if (diff >= 365) {
          val = Math.floor(diff / 365);
          unit = "years";
        } else if (diff >= 30) {
          val = Math.floor(diff / 30);
          unit = "months";
        }

        setAgeNumber(String(val));
        setAgeUnit(unit);
      }

      setGender(patient.gender || 0);

      setWeight(patient.weight ? String(patient.weight) : "");
      setHeight(patient.height ? String(patient.height) : "");

      setPhoneNumber(patient.phoneNumber ? String(patient.phoneNumber) : "");
      setEmail(patient.email || "");
      setAddress(patient.address || "");
      setStateName(patient.state || "");
      setCityName(patient.city || "");
      setPinCode(patient.pinCode || "");
      setReferredBy(patient.referredBy || "");

      setInsurance(patient.insurance ?? 0);
      setInsuranceNumber(patient.insuranceNumber || "");
      setInsuranceCompany(patient.insuranceCompany || "");
      setPhotoUri(patient.imageURL || null);

      // CITY LIST BY STATE
      const i = STATE_LIST.indexOf(patient.state || "");
      setCityList(i >= 0 ? CITY_LIST[i] : []);
    } catch (err) {
      dispatch(showError("Error loading patient"));
    } finally {
      setLoading(false);
    }
  }, [dispatch, id, user?.hospitalID, user?.token]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

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
      } catch (err: any) {
        dispatch(
          showError(err?.message || err?.status || "Camera permission error")
        );
        return false;
      }
    }
    return true;
  };

  // --------- Image Picker (Camera + Gallery with modal) ----------
  const pickImage = async (type: "camera" | "gallery") => {
    const hasPermission =
      type === "camera" ? await requestCameraPermission() : true;

    if (!hasPermission) {
      Alert.alert(
        "Permission Denied",
        "Camera access is required to take photos."
      );
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
      if (response?.didCancel) {
        setImagePickerModal(false);
        return;
      }

      if (response?.errorCode) {
        dispatch(
          showError(response.errorMessage || "Failed to pick image")
        );
        setImagePickerModal(false);
        return;
      }

      const asset = response.assets?.[0];
      if (asset?.uri) {
        setPhotoUri(asset.uri);
        setPhotoFile({
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: asset.fileName || "photo.jpg",
        });
      }

      setImagePickerModal(false);
    });
  };

  // --------- Recompute DOB from Age + Unit ----------
  const recomputeDobFromAge = (rawAge: string, unit: AgeUnit) => {
    const n = Number(rawAge);
    if (!Number.isFinite(n) || n <= 0) {
      setDob("");
      setDobDate(null);
      return;
    }

    const dobStr = dobFromAge(n, unit); // uses same helper as Add Patient
    const [y, m, d] = dobStr.split("-").map(Number);
    const dobObj = new Date(y, (m || 1) - 1, d || 1);

    setDob(dobStr);
    setDobDate(dobObj);
  };

  // --------- DOB change handler ----------
  const handleDobChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDobPicker(false);
    }
    if (!date) return;

    const iso = date.toISOString().split("T")[0];
    setDob(iso);
    setDobDate(date);

    const today = new Date();
    const diff = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 3600 * 24)
    );
    let val = diff;
    let unit: AgeUnit = "days";

    if (diff >= 365) {
      val = Math.floor(diff / 365);
      unit = "years";
    } else if (diff >= 30) {
      val = Math.floor(diff / 30);
      unit = "months";
    }

    setAgeNumber(String(val));
    setAgeUnit(unit);
  };

  // --------- Save Handler / Validation ----------
  const validateForm = () => {
    if (!pName.trim()) {
      dispatch(showError("Patient Name is required"));
      return false;
    }

    if (!dob) {
      dispatch(showError("Date of Birth is required"));
      return false;
    }

    if (!ageNumber.trim()) {
      dispatch(showError("Age is required"));
      return false;
    }

    if (!weight.trim()) {
      dispatch(showError("Weight is required"));
      return false;
    }

    if (!height.trim()) {
      dispatch(showError("Height is required"));
      return false;
    }

    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (!phoneDigits) {
      dispatch(showError("Mobile Number is required"));
      return false;
    }
    if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) {
      dispatch(showError("Enter a valid 10-digit mobile number"));
      return false;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      dispatch(showError("Email is required"));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      dispatch(showError("Enter a valid email address"));
      return false;
    }

    if (!address.trim()) {
      dispatch(showError("Address is required"));
      return false;
    }

    if (!stateName) {
      dispatch(showError("State is required"));
      return false;
    }

    if (!cityName) {
      dispatch(showError("City is required"));
      return false;
    }

    const pinDigits = pinCode.replace(/\D/g, "");
    if (!pinDigits) {
      dispatch(showError("PIN Code is required"));
      return false;
    }
    if (pinDigits.length !== 6) {
      dispatch(showError("PIN Code must be 6 digits"));
      return false;
    }

    if (insurance === 1) {
      if (!insuranceNumber.trim()) {
        setInsuranceNumError("Required");
        dispatch(showError("Insurance Number is required"));
        return false;
      }
      if (!insuranceCompany.trim()) {
        setInsuranceCompError("Required");
        dispatch(showError("Insurance Company is required"));
        return false;
      }
    }

    return true;
  };

  const onSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const data = new FormData();

      data.append("pName", pName);
      if (dob) {
        data.append("dob", dob);
      }
      if (ageNumber) {
        data.append("age", ageNumber);
        // data.append("ageUnit", ageUnit);
      }
      data.append("weight", weight);
      data.append("height", height);
      data.append("phoneNumber", phoneNumber.replace(/\D/g, ""));
      data.append("email", email.trim());
      data.append("address", address);
      data.append("state", stateName);
      data.append("city", cityName);
      data.append("pinCode", pinCode.replace(/\D/g, ""));
      data.append("referredBy", referredBy);
      data.append("insurance", String(insurance));

      if (insurance === 1) {
        data.append("insuranceNumber", insuranceNumber);
        data.append("insuranceCompany", insuranceCompany);
      }

      if (photoFile) data.append("photo", photoFile);

      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await UpdateFiles(
        `patient/${user?.hospitalID}/patients/single/${id}`,
        data,
        token
      );
      console.log("111res", res);
      if (res?.status === "success") {
        dispatch(showSuccess("Updated successfully"));
        dispatch(
          currentPatient(
            res && "data" in res && (res as any).data?.patient
          )
        );
        navigation.goBack();
      } else {
        dispatch(showError("message" in res ? res.message : "Update failed"));
      }
    } catch (e) {
      dispatch(showError("Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    setter: (t: string) => void,
    readonly = false,
    opts: {
      placeholder?: string;
      keyboardType?: any;
      required?: boolean;
      onChangeText?: (t: string) => void;
     maxLength?: number; 

    } = {}
  ) => (
    <View style={styles.inputBlock}>
      <Text style={styles.label}>
        {label}
        {opts.required && <Text style={{ color: COLORS.sub }}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={opts.onChangeText ?? setter}
        editable={!readonly}
        style={[
          styles.input,
          readonly && { backgroundColor: "#f1f5f9", color: COLORS.sub },
        ]}
        placeholder={opts.placeholder}
        keyboardType={opts.keyboardType}
        maxLength={opts.maxLength}
      />
    </View>
  );

  const CustomPicker = ({
    label,
    selected,
    setSelected,
    items,
    disabled,
    required,
  }: {
    label: string;
    selected: any;
    setSelected: (val: any) => void;
    items: { label: string; value: any }[];
    disabled?: boolean;
    required?: boolean;
  }) => (
    <View style={styles.inputBlock}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={{ color: COLORS.sub }}> *</Text>}
      </Text>
      <View style={[styles.pickerWrap, disabled && { opacity: 0.4 }]}>
        <Picker
          selectedValue={selected}
          onValueChange={setSelected}
          enabled={!disabled}
          style={{ color: COLORS.text }}
        >
          {items.map((i) => (
            <Picker.Item key={i.value} label={i.label} value={i.value} />
          ))}
        </Picker>
      </View>
    </View>
  );

  // ------------------------ UI START -----------------------
  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingBottom: FOOTER_H + insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
          style={{ padding: 16 }}
        >
          {/* PHOTO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patient Photo</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={() => setImagePickerModal(true)}>
                <View style={styles.photoWrap}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.photo} />
                  ) : (
                    <Text style={{ fontSize: 32, color: COLORS.sub }}>+</Text>
                  )}
                </View>
              </TouchableOpacity>
              <View>
                <Text style={styles.photoHint}>Tap to upload (optional)</Text>
                <Text style={[styles.photoHint, { fontSize: 11 }]}>
                  JPG/PNG • Max 5MB
                </Text>
              </View>
            </View>
          </View>

          {/* IDENTITY */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identity</Text>

            {renderInput("Patient Name", pName, setPName, false, {
              required: true,
            })}

            {renderInput("Patient ID", pID, setPID, true)}

            {renderInput("UHID", pUHID, setPUHID, true)}
          </View>

          {/* BASIC DETAILS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Details</Text>

            {/* DOB EDITABLE WITH PICKER */}
            <View style={styles.inputBlock}>
              <Text style={styles.label}>
                Date of Birth
                <Text style={{ color: COLORS.sub }}> *</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDobPicker(true)}
              >
                <Text
                  style={{
                    color: dob ? COLORS.text : COLORS.placeholder,
                    fontSize: 15,
                  }}
                >
                  {dob ? formatDate(dob) : "Select DOB"}
                </Text>
              </TouchableOpacity>
              {showDobPicker && (
                <DateTimePicker
                  value={dobDate || new Date()}
                  mode="date"
                  display={Platform.OS === "android" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={handleDobChange}
                />
              )}
            </View>

            {/* AGE (editable, recalculates DOB) */}
            <View style={styles.row}>
              <View style={styles.col}>
                {renderInput("Age", ageNumber, setAgeNumber, false, {
                  keyboardType: "numeric",
                  required: true,
                  onChangeText: (txt: string) => {
                    const digits = txt.replace(/\D/g, "");
                    setAgeNumber(digits);
                    if (digits) {
                      recomputeDobFromAge(digits, ageUnit);
                    } else {
                      setDob("");
                      setDobDate(null);
                    }
                  },
                })}
              </View>
              <View style={styles.col}>
                <CustomPicker
                  label="Unit"
                  selected={ageUnit}
                  setSelected={(val: AgeUnit) => {
                    setAgeUnit(val);
                    if (ageNumber) {
                      recomputeDobFromAge(ageNumber, val);
                    }
                  }}
                  items={[
                    { label: "Days", value: "days" },
                    { label: "Months", value: "months" },
                    { label: "Years", value: "years" },
                  ]}
                  required
                />
              </View>
            </View>

            {/* GENDER READ ONLY (still mandatory but non-editable) */}
            <View style={styles.inputBlock}>
              <Text style={styles.label}>
                Gender
                <Text style={{ color: COLORS.sub }}> *</Text>
              </Text>
              <TextInput
                value={
                  gender === 1 ? "Male" : gender === 2 ? "Female" : "Others"
                }
                editable={false}
                style={[styles.input, { backgroundColor: "#f1f5f9" }]}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                {renderInput("Weight (kg)", weight, setWeight, false, {
                  keyboardType: "numeric",
                  required: true,
                  maxLength: 3,
                })}
              </View>
              <View style={styles.col}>
                {renderInput("Height (cm)", height, setHeight, false, {
                  keyboardType: "numeric",
                  required: true,
                 maxLength: 4,
                })}
              </View>
            </View>
          </View>

          {/* CONTACT */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            {renderInput("Mobile Number", phoneNumber, setPhoneNumber, false, {
              keyboardType: "phone-pad",
              required: true,
            })}
            {renderInput("Email", email, setEmail, false, {
              required: true,
            })}
          </View>

          {/* ADDRESS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Address</Text>

            {renderInput("Complete Address", address, setAddress, false, {
              required: true,
            })}

            <View>
              <View style={styles.row}>
                <View  style={styles.col}>
                  <CustomPicker
                    label="State"
                    selected={stateName}
                    setSelected={(val: string) => {
                      setStateName(val);
                      const i = STATE_LIST.indexOf(val);
                      setCityList(i >= 0 ? CITY_LIST[i] : []);
                      setCityName("");
                    }}
                    items={STATE_LIST.map((s) => ({ label: s, value: s }))}
                    required
                  />
                </View>
                <View style={styles.col}>
                  <CustomPicker
                    label="City"
                    selected={cityName}
                    setSelected={setCityName}
                    items={cityList.map((c) => ({ label: c, value: c }))}
                    disabled={cityList.length === 0}
                    required
                  />
                </View>
              </View>
            </View>

            {renderInput("PIN Code", pinCode, setPinCode, false, {
              keyboardType: "numeric",
              required: true,
              maxLength: 6,
            })}
            {renderInput("Referred By", referredBy, setReferredBy)}
          </View>

          {/* INSURANCE */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Insurance</Text>

            <CustomPicker
              label="Insurance"
              selected={insurance}
              setSelected={(val: 0 | 1) => {
                setInsurance(val);
                if (val === 0) {
                  setInsuranceNumber("");
                  setInsuranceCompany("");
                  setInsuranceNumError("");
                  setInsuranceCompError("");
                }
              }}
              items={[
                { label: "No", value: 0 },
                { label: "Yes", value: 1 },
              ]}
            />

            {insurance === 1 && (
              <>
                {renderInput(
                  "Insurance Number",
                  insuranceNumber,
                  setInsuranceNumber,
                  false,
                  { required: true }
                )}
                {insuranceNumError ? (
                  <Text style={styles.errorText}>{insuranceNumError}</Text>
                ) : null}
                {renderInput(
                  "Insurance Company",
                  insuranceCompany,
                  setInsuranceCompany,
                  false,
                  { required: true }
                )}
                {insuranceCompError ? (
                  <Text style={styles.errorText}>{insuranceCompError}</Text>
                ) : null}
              </>
            )}
          </View>

          {/* SAVE BUTTON */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: COLORS.brand }]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.footer, { bottom: insets.bottom }]}>
          <Footer active="patients" brandColor={COLORS.brand} />
        </View>

        {/* Image Picker Modal */}
        <Modal visible={imagePickerModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: COLORS.card }]}>
              <Text style={styles.modalTitle}>Choose Photo</Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: COLORS.brand }]}
                onPress={() => pickImage("camera")}
              >
                <Text style={styles.modalButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: COLORS.brand }]}
                onPress={() => pickImage("gallery")}
              >
                <Text style={styles.modalButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#6b7280" }]}
                onPress={() => setImagePickerModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ---------------------- STYLES -----------------------
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 16,
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },

  photoRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  photoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    borderColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  photo: { width: 84, height: 84, borderRadius: 42 },
  photoHint: { fontSize: 12, color: COLORS.sub },

  inputBlock: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.sub,
    marginBottom: 6,
  },

  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: "#fff",
    color: COLORS.text,
  },

  dateButton: {
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },

  pickerWrap: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
  },

  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  footer: { position: "absolute", left: 0, right: 0 },

  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: -4,
    marginBottom: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: "88%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: COLORS.text,
  },
  modalButton: {
    padding: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginVertical: 6,
  },
  modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

export default EditPatientMobile;
