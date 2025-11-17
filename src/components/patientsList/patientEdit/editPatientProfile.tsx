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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { launchImageLibrary } from "react-native-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";

import Footer from "../../dashboard/footer";
import { RootState } from "../../../store/store";
import { AuthFetch, AuthPatch } from "../../../auth/auth";
import { showError, showSuccess } from "../../../store/toast.slice";

import { state as STATE_LIST, city as CITY_LIST } from "../../../utils/stateCity";
import { AgeUnit } from "../../../utils/age";

const FOOTER_H = 64;
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  border: "#e2e8f0",
  brand: "#14b8a6",
  brandDark: "#0f766e",
  danger: "#ef4444",
  placeholder: "#94a3b8",
};

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

      const p = res?.patient || res?.data?.patient || res?.data || res;

      if (!p) {
        dispatch(showError("Failed to load patient"));
        setLoading(false);
        return;
      }

      setPName(p.pName || "");
      setPID(p.pID || "");
      setPUHID(p.pUHID ? String(p.pUHID) : "");
      if (p.dob) {
        const d = new Date(p.dob);
        setDob(p.dob.split("T")[0] || "");
        setDobDate(d);

        // derive age here as well
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

      setGender(p.gender || 0);

      setWeight(p.weight ? String(p.weight) : "");
      setHeight(p.height ? String(p.height) : "");

      setPhoneNumber(p.phoneNumber ? String(p.phoneNumber) : "");
      setEmail(p.email || "");
      setAddress(p.address || "");
      setStateName(p.state || "");
      setCityName(p.city || "");
      setPinCode(p.pinCode || "");
      setReferredBy(p.referredBy || "");

      setInsurance(p.insurance ?? 0);
      setInsuranceNumber(p.insuranceNumber || "");
      setInsuranceCompany(p.insuranceCompany || "");
      setPhotoUri(p.imageURL || null);

      // CITY LIST BY STATE
      const i = STATE_LIST.indexOf(p.state || "");
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

  // --------- Image Picker (ONLY upload from gallery) ----------
  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
    });

    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (asset?.uri) {
      setPhotoUri(asset.uri);
      setPhotoFile({
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || "photo.jpg",
      });
    }
  };

  // --------- DOB change handler ----------
  const handleDobChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDobPicker(false);
    }
    if (!date) return;

    setDobDate(date);
    const iso = date.toISOString().split("T")[0];
    setDob(iso);

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

  // --------- Save Handler ----------
  const validateForm = () => {
    if (!pName.trim()) {
      dispatch(showError("Name required"));
      return false;
    }
    if (!weight) {
      dispatch(showError("Weight required"));
      return false;
    }
    if (!height) {
      dispatch(showError("Height required"));
      return false;
    }
    if (!phoneNumber || phoneNumber.length !== 10) {
      dispatch(showError("Valid mobile required"));
      return false;
    }
    if (!stateName) {
      dispatch(showError("State required"));
      return false;
    }
    if (!cityName) {
      dispatch(showError("City required"));
      return false;
    }
    if (!address.trim()) {
      dispatch(showError("Address required"));
      return false;
    }
    if (!pinCode || pinCode.length !== 6) {
      dispatch(showError("Valid pincode required"));
      return false;
    }
    if (insurance === 1) {
      if (!insuranceNumber.trim()) {
        setInsuranceNumError("Required");
        return false;
      }
      if (!insuranceCompany.trim()) {
        setInsuranceCompError("Required");
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
      data.append("weight", weight);
      data.append("height", height);
      data.append("phoneNumber", phoneNumber);
      data.append("email", email);
      data.append("address", address);
      data.append("state", stateName);
      data.append("city", cityName);
      data.append("pinCode", pinCode);
      data.append("referredBy", referredBy);
      data.append("insurance", String(insurance));
      if (insurance === 1) {
        data.append("insuranceNumber", insuranceNumber);
        data.append("insuranceCompany", insuranceCompany);
      }
      if (photoFile) data.append("photo", photoFile);

      const token = user?.token ?? (await AsyncStorage.getItem("token"));

      const res = await AuthPatch(
        `patient/${user?.hospitalID}/patients/single/${id}`,
        data,
        token
      );
      if (res?.status === "success") {
        dispatch(showSuccess("Updated successfully"));
        navigation.goBack();
      } else {
        dispatch(showError(res?.message || "Update failed"));
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
    opts: any = {}
  ) => (
    <View style={styles.inputBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setter}
        editable={!readonly}
        style={[
          styles.input,
          readonly && { backgroundColor: "#f1f5f9", color: COLORS.sub },
        ]}
        placeholder={opts.placeholder}
        keyboardType={opts.keyboardType}
      />
    </View>
  );

  const CustomPicker = ({
    label,
    selected,
    setSelected,
    items,
    disabled,
  }: {
    label: string;
    selected: any;
    setSelected: (val: any) => void;
    items: { label: string; value: any }[];
    disabled?: boolean;
  }) => (
    <View style={styles.inputBlock}>
      <Text style={styles.label}>{label}</Text>
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
          <Text style={styles.title}>Edit Patient Profile</Text>

          {/* PHOTO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patient Photo</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={pickImage}>
                <View style={styles.photoWrap}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.photo} />
                  ) : (
                    <Text style={{ fontSize: 32, color: COLORS.sub }}>+</Text>
                  )}
                </View>
              </TouchableOpacity>
              <View>
                <Text style={styles.photoHint}>Tap to upload</Text>
                <Text style={[styles.photoHint, { fontSize: 11 }]}>
                  JPG/PNG • Max 5MB
                </Text>
              </View>
            </View>
          </View>

          {/* IDENTITY */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identity</Text>

            {renderInput("Patient Name", pName, setPName)}

            {renderInput("Patient ID", pID, setPID, true)}

            {renderInput("UHID", pUHID, setPUHID, true)}
          </View>

          {/* BASIC DETAILS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Details</Text>

            {/* DOB EDITABLE WITH PICKER */}
            <View style={styles.inputBlock}>
              <Text style={styles.label}>Date of Birth</Text>
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
                  {dob || "Select DOB"}
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

            {/* AGE (editable) */}
            <View style={styles.row}>
              <View style={styles.col}>
                {renderInput("Age", ageNumber, setAgeNumber, false, {
                  keyboardType: "numeric",
                })}
              </View>
              <View style={styles.col}>
                <CustomPicker
                  label="Unit"
                  selected={ageUnit}
                  setSelected={setAgeUnit}
                  items={[
                    { label: "Days", value: "days" },
                    { label: "Months", value: "months" },
                    { label: "Years", value: "years" },
                  ]}
                />
              </View>
            </View>

            {/* GENDER READ ONLY */}
            <View style={styles.inputBlock}>
              <Text style={styles.label}>Gender</Text>
              <TextInput
                value={
                  gender === 1 ? "Male" : gender === 2 ? "Female" : "Others"
                }
                editable={false}
                style={[styles.input, { backgroundColor: "#f1f5f9" }]}
              />
            </View>

            <View style={styles.row}>
              <View className="col">
                {renderInput("Weight (kg)", weight, setWeight, false, {
                  keyboardType: "numeric",
                })}
              </View>
              <View style={styles.col}>
                {renderInput("Height (cm)", height, setHeight, false, {
                  keyboardType: "numeric",
                })}
              </View>
            </View>
          </View>

          {/* CONTACT */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            {renderInput("Mobile Number", phoneNumber, setPhoneNumber, false, {
              keyboardType: "phone-pad",
            })}
            {renderInput("Email", email, setEmail)}
          </View>

          {/* ADDRESS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Address</Text>

            {renderInput("Complete Address", address, setAddress)}

            <View style={styles.row}>
              <View style={styles.col}>
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
                />
              </View>
              <View style={styles.col}>
                <CustomPicker
                  label="City"
                  selected={cityName}
                  setSelected={setCityName}
                  items={cityList.map((c) => ({ label: c, value: c }))}
                  disabled={cityList.length === 0}
                />
              </View>
            </View>

            {renderInput("PIN Code", pinCode, setPinCode, false, {
              keyboardType: "numeric",
            })}
            {renderInput("Referred By", referredBy, setReferredBy)}
          </View>

          {/* INSURANCE */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Insurance</Text>

            <CustomPicker
              label="Insurance"
              selected={insurance}
              setSelected={setInsurance}
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
                  setInsuranceNumber
                )}
                {renderInput(
                  "Insurance Company",
                  insuranceCompany,
                  setInsuranceCompany
                )}
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
});

export default EditPatientMobile;
