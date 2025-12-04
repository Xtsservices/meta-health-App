import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import {SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { launchImageLibrary } from "react-native-image-picker";
import { Building2, Calendar, IdCard, History, User as UserIcon, Eye, EyeOff } from "lucide-react-native";

import { currentUser, RootState } from "../../store/store";

import { AuthFetch, AuthPatch, AuthPost } from "../../auth/auth"; // if you use these, otherwise remove
import { state as STATE_LIST, city as CITY_LIST } from "../../utils/stateCity";
import { COLORS } from "../../utils/colour";
import {
  SPACING,
  FONT_SIZE,
  isTablet,
  responsiveWidth,
} from "../../utils/responsive";
// import { capitalizeFirstLetter } from "../../utility/global";

import Footer from "../dashboard/footer";
import { Role_list } from "../../utils/role";
import { showError, showSuccess } from "../../store/toast.slice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
import { formatDate, formatDateTime } from "../../utils/dateTime";

interface EditLog {
  id: number;
  hospitalID: number;
  userID: number;
  editedBy: number;
  editedByName: string;
  oldData: any;
  newData: any;
  editedAt: string;
}

// helpers
const checkLength = (number: number, size: number): boolean =>
  String(number).length === size;

type TabType = "personal" | "security" | "activity";

type FieldState<T = any> = {
  valid: boolean;
  showError: boolean;
  value: T;
  message: string;
};

type ProfileFormState = {
  firstName: FieldState<string>;
  lastName: FieldState<string>;
  phoneNo: FieldState<string | null>;
  gender: FieldState<number>;
  dob: FieldState<string>;
  city: FieldState<string>;
  state: FieldState<string>;
 pinCode: FieldState<string>;
  address: FieldState<string>;
};

type PasswordFormState = {
  password: FieldState<string>;
  confirmPassword: FieldState<string>;
};

type RNImageFile = {
  uri: string;
  name: string;
  type: string;
};

const doctorProfile: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.currentUser);
  
  const [activeTab, setActiveTab] = useState<TabType>("personal");

  // profile image
  const [profileImageFile, setProfileImageFile] = useState<RNImageFile | null>(
    null
  );
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );

  // hospital image
  const [hospitalImageFile, setHospitalImageFile] =
    useState<RNImageFile | null>(null);
  const [hospitalImagePreview, setHospitalImagePreview] = useState<
    string | null
  >(null);
  const [hospitalImageURL, setHospitalImageURL] = useState<string | null>(null);

  const [hospitalLogoLoading, setHospitalLogoLoading] = useState(false);

  const [hospitalName, setHospitalName] = useState(
    user?.role === 10007 ? "N/A" : user?.hospitalName || "Central Medical Hospital"
  );
  // personal form
  const [formData, setFormData] = useState<ProfileFormState>({
    firstName: { valid: true, showError: false, value: user?.firstName || "", message: "" },
    lastName: { valid: true, showError: false, value: user?.lastName || "", message: "" },
    phoneNo: { valid: true, showError: false, value: user?.phoneNo || null, message: "" },
    gender: { valid: true, showError: false, value: user?.gender || -1, message: "" },
    dob: {
      valid: true,
      showError: false,
      value: user?.dob ,
      message: "",
    },
    city: { valid: true, showError: false, value: user?.city || "", message: "" },
    state: { valid: true, showError: false, value: user?.state || "", message: "" },
     pinCode: {
    valid: true,
    showError: false,
    value: user?.pinCode ? String(user.pinCode) : "",
    message: "",
  },
    address: { valid: true, showError: false, value: user?.address || "", message: "" },
  });
  const [cityList, setCityList] = useState<string[]>([]);
  const [isEditingProfileInfo, setIsEditingProfileInfo] = useState(false);

  // password form
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    password: { valid: false, showError: false, value: "", message: "" },
    confirmPassword: { valid: false, showError: false, value: "", message: "" },
  });
 const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // date picker for DOB
  const [showDobPicker, setShowDobPicker] = useState(false);

  // activity logs
  const [editLogs, setEditLogs] = useState<EditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const showSecurityTab = useMemo(
    () => user?.role && user?.role !== 10007,
    
    [user]
  );


  const initials = `${user?.firstName?.charAt(0) || ""}${
    user?.lastName?.charAt(0) || ""
  }`.toUpperCase();

  const currentProfileImage = profileImagePreview || user?.imageURL || null;
  const currentHospitalImage =
    hospitalImagePreview || hospitalImageURL || user?.hospitalImageURL || null;

  // ---------------- EFFECTS ----------------

  useEffect(() => {
    // state -> city list
    const index = STATE_LIST.indexOf(formData.state.value);
    setCityList(CITY_LIST[index] || []);
  }, [formData.state.value]);

  useEffect(() => {
    // fetch hospital details
    const fetchHospitalDetails = async () => {
      if (!user?.hospitalID) {
        dispatch(
          showError(
            "Cannot fetch hospital details: Missing hospital ID or token"
          )
        );
        return;
      }
const token = user?.token ?? (await AsyncStorage.getItem("token"));
      try {
        const response = await AuthFetch(
          `hospital/${user?.hospitalID}`,
        token
        );
        if (response.status === "success" && "data" in response && response?.data?.hospital?.name) {
          const fetchedImageURL = response.data.hospital.logoURL || null;

          setHospitalName(response.data.hospital.name);
          setHospitalImageURL(fetchedImageURL);

          const updatedUserData = {
            ...user,
            hospitalName: response.data.hospital.name,
            hospitalImageURL: fetchedImageURL,
          };

          dispatch(currentUser(updatedUserData));

          const payload = {
            ...updatedUserData,
            isLoggedIn: true,
            token: user?.token,
          };
          dispatch(currentUser(payload));


        } else {
          dispatch(
            showError("Failed to fetch hospital details: Invalid response")
          );
        }
      } catch (error: any) {
        dispatch(
          showError(
            error.message || "An error occurred while fetching hospital details"
          )
        );
      }
    };

    if (user?.role !== 10007) {
      fetchHospitalDetails();
    }
  }, [user?.hospitalID, user?.token, user?.role]);

  useEffect(() => {
    if (activeTab === "activity" && editLogs.length === 0) {
      fetchEditLogs();
    }
  }, [activeTab]);

  // ---------------- HANDLERS ----------------

  const handlePickImage = (type: "profile" | "hospital") => {
    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.8,
      },
      (response) => {
        if (response.didCancel || !response.assets || !response.assets[0]) {
          return;
        }
        const asset = response.assets[0];
        if (!asset.uri) return;

        const file: RNImageFile = {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: asset.fileName || `${type}.jpg`,
        };

        if (type === "profile") {
          setProfileImageFile(file);
          setProfileImagePreview(asset.uri);
        } else {
          setHospitalImageFile(file);
          setHospitalImagePreview(asset.uri);
        }
      }
    );
  };

  const handleFormFieldChange = (name: keyof ProfileFormState, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        showError: false,
        message: "",
      },
    }));
  };

  const handleDobChange = (_e: any, date?: Date) => {
    if (Platform.OS === "android") setShowDobPicker(false);
    if (!date) return;

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    handleFormFieldChange("dob", `${yyyy}-${mm}-${dd}`);
  };

  const resetProfileForm = () => {
    setFormData({
      firstName: { valid: true, showError: false, value: user?.firstName || "", message: "" },
      lastName: { valid: true, showError: false, value: user?.lastName || "", message: "" },
      phoneNo: { valid: true, showError: false, value: user?.phoneNo || null, message: "" },
      gender: { valid: true, showError: false, value: user?.gender || -1, message: "" },
      dob: {
        valid: true,
        showError: false,
        value: user?.dob ? user?.dob.split("T")[0] : "",
        message: "",
      },
      city: { valid: true, showError: false, value: user?.city || "", message: "" },
      state: { valid: true, showError: false, value: user?.state || "", message: "" },
       pinCode: {
      valid: true,
      showError: false,
      value: user?.pinCode ? String(user.pinCode) : "",
      message: "",
    },
      address: { valid: true, showError: false, value: user?.address || "", message: "" },
    });
    setProfileImageFile(null);
    setProfileImagePreview(null);
  };

const validateProfileForm = (): boolean => {
  const requiredFields: (keyof ProfileFormState)[] = [
    "firstName",
    "lastName",
    "phoneNo",
    "gender",
    "dob",
    "city",
    "state",
    "pinCode",
    "address",
  ];

  let hasError = false;

  // Clone existing form data
  const updated: ProfileFormState = { ...formData };

  requiredFields.forEach((fieldKey) => {
    // Treat all fields as FieldState<any> for validation
    const fieldData = updated[fieldKey] as FieldState<any>;

    let isValid = !!fieldData.value;
    let msg = isValid ? "" : "This field is required";

    if (fieldKey === "phoneNo") {
      const valueStr = String(fieldData.value ?? "");
      isValid = valueStr !== "" && checkLength(Number(valueStr), 10);
      msg = isValid ? "" : "Mobile number must be 10 digits";
    } else if (fieldKey === "pinCode") {
      const valueStr = String(fieldData.value ?? "");
      isValid = valueStr !== "" && checkLength(Number(valueStr), 6);
      msg = isValid ? "" : "Pincode must be 6 digits";
    }

    // Safe write with an index using a cast
    (updated as any)[fieldKey] = {
      ...fieldData,
      valid: isValid,
      showError: !isValid,
      message: msg,
    };

    if (!isValid) hasError = true;
  });

  setFormData(updated);

  if (hasError) {
    dispatch(showError("Please fill all required fields correctly"));
    return false;
  }

  return true;
};



  const handleProfileSubmit = useCallback(async () => {
    if (!validateProfileForm()) return;

    if (!user?.id || (!user?.hospitalID && user?.role !== 10007)) {
      dispatch(
        showError("Missing user/token/hospital information to update profile")
      );
      return;
    }

    const body = new FormData();
    const plainObj: Record<string, any> = {
      firstName: formData.firstName.value,
      lastName: formData.lastName.value,
      phoneNo: formData.phoneNo.value,
      gender: formData.gender.value,
      dob: formData.dob.value,
      city: formData.city.value,
      state: formData.state.value,
      pinCode: formData.pinCode.value,
      address: formData.address.value,
    };

    Object.entries(plainObj).forEach(([k, v]) => {
      if (v !== null && v !== undefined) {
        body.append(k, String(v));
      }
    });

    if (profileImageFile) {
      body.append("photo", {
        uri: profileImageFile.uri,
        name: profileImageFile.name,
        type: profileImageFile.type,
      } as any);
    }
    body.append("image", "any text");
 const token = user?.token ?? (await AsyncStorage.getItem("token"));
    try {
      const data = await AuthPatch(
        `user/${user?.hospitalID}/${user?.id}`,
        body,
        token
      );
      if (data.status === "success" && "data" in data) {
        const updated = data.data?.data || {};
  const mergedUser: any = { ...user };

  // Merge only changed fields
  Object.entries(updated).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== user?.[key] // only if different
    ) {
      mergedUser[key] = value;
    }
  });

  // Always ensure critical fields are preserved
  mergedUser.token = token;
  mergedUser.photo = updated.photo || user?.photo;
  mergedUser.imageURL = updated.imageURL || user?.imageURL;
  mergedUser.hospitalImageURL = user?.hospitalImageURL;
  mergedUser.hospitalName = user?.role === 10007 ? "N/A" : hospitalName;


  dispatch(currentUser(mergedUser));


        setIsEditingProfileInfo(false);
        setProfileImagePreview(null);
        dispatch(showSuccess("Profile successfully updated"));
      } else {
        dispatch(showError( data && "message" in data && data.message || "Failed to update profile"));
      }
    } catch (err: any) {
      dispatch(
        showError(
          err.message || "An error occurred while updating the profile"
        )
      );
    }
  }, [formData, profileImageFile, user, hospitalName]);

  const handleHospitalLogoUpdate = useCallback(async () => {
    if (!hospitalImageFile) {
      dispatch(showError("Please select a hospital logo to update"));
      return;
    }
    if (!user?.hospitalID || !user?.token) {
      dispatch(
        showError("Cannot update hospital logo: Missing hospital ID or token")
      );
      return;
    }

    const fd = new FormData();
    fd.append("logo", {
      uri: hospitalImageFile.uri,
      name: hospitalImageFile.name,
      type: hospitalImageFile.type,
    } as any);

    setHospitalLogoLoading(true);
     const token = user?.token ?? (await AsyncStorage.getItem("token"));
    try {
      const hospitalData = await AuthPatch(
        `hospital/${user?.hospitalID}`,
        fd,
        token
      );
      setHospitalLogoLoading(false);

      if (hospitalData.status === "success" && "data" in hospitalData) {
        const newURL = hospitalData?.data.hospital.logoURL || null;
        setHospitalImageURL(newURL);
        setHospitalImagePreview(null);
        setHospitalImageFile(null);

        const updatedUserData = {
          ...user,
          hospitalImageURL: newURL,
          isLoggedIn: true,
          token: token,
        };
        dispatch(currentUser(updatedUserData));

        dispatch(showSuccess("Hospital logo updated successfully"));
      } else {
        dispatch(
          showError(hospitalData && "message" in hospitalData &&hospitalData.message || "Failed to update hospital logo")
        );
      }
    } catch (err: any) {
      setHospitalLogoLoading(false);
      dispatch(
        showError(
          err.message || "An error occurred while updating the hospital logo"
        )
      );
    }
  }, [hospitalImageFile, user]);

  const handlePasswordFieldChange = (
    name: keyof PasswordFormState,
    value: string
  ) => {
    setPasswordForm((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        showError: false,
        message: "",
      },
    }));
  };

  const handlePasswordSubmit = async () => {

    if (passwordForm.password.value !== passwordForm.confirmPassword.value) {
      setPasswordForm((prev) => ({
        ...prev,
        confirmPassword: {
          ...prev.confirmPassword,
          valid: false,
          showError: true,
          message: "Passwords do not match",
        },
      }));
      dispatch(showError("Passwords do not match"));
      return;
    }

    const strongPasswordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!strongPasswordRegex.test(passwordForm.password.value)) {
      setPasswordForm((prev) => ({
        ...prev,
        password: {
          ...prev.password,
          valid: false,
          showError: true,
          message:
            "Password must be at least 8 characters, include uppercase, lowercase, number, and special character",
        },
      }));
      dispatch(
        showError(
          "Password must be at least 8 characters, include uppercase, lowercase, number, and special character"
        )
      );
      return;
    }

    if (!user?.id ) {
      dispatch(showError("Cannot change password: Missing user or token"));
      return;
    }
 const token = user?.token ?? (await AsyncStorage.getItem("token"));
    try {
      const response = await AuthPatch(
        `user/${user?.hospitalID}/changePassword/admin`,
        { password: passwordForm.password.value, id: user?.id },
        token
      );

      if (response.status === "success") {
        dispatch(showSuccess("Password changed successfully"));
        setPasswordForm({
          password: { valid: false, value: "", showError: false, message: "" },
          confirmPassword: {
            valid: false,
            value: "",
            showError: false,
            message: "",
          },
        });
      } else {
        dispatch(showError(response && "message" in response && response.message || "Failed to change password"));
      }
    } catch (err: any) {
      dispatch(
        showError(
          err.message || "An error occurred while changing the password"
        )
      );
    }
  };

  const debouncedPasswordSubmit = useCallback(
    debounce(handlePasswordSubmit, DEBOUNCE_DELAY),
    [passwordForm, user]
  );

  const fetchEditLogs = async () => {
    if (!user?.hospitalID || !user?.id ) {
      dispatch(showError("Missing required information to fetch logs"));
      return;
    }
     const token = user?.token ?? (await AsyncStorage.getItem("token"));
    try {
      setLogsLoading(true);
      const response = await AuthFetch(
        `user/${user?.hospitalID}/${user?.id}/getEditLogs`,
        token
      );
      if (response.status === "success" && "data" in response && response?.data?.logs) {
        setEditLogs(response.data.logs);
      } else {
        dispatch(showError("Failed to fetch edit logs"));
      }
    } catch (err: any) {
      dispatch(
        showError(
          err.message || "An error occurred while fetching edit logs"
        )
      );
    } finally {
      setLogsLoading(false);
    }
  };

  const getChangedFields = (newData: any): string[] =>
    Object.keys(newData || {});

  const getFieldDisplayValue = (_field: string, value: any): string => {
    if (typeof value === "object" && value !== null) {
      if (value.new !== undefined) {
        return `${value.old} → ${value.new}`;
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  const formatRole = (role: number | null) => {
    try {
      if (role !== null && Role_list[role as keyof typeof Role_list]) {
        return Role_list[role as keyof typeof Role_list];
      }
      return "User";
    } catch {
      return "User";
    }
  };

  const formatJoinDate = (addedOn: string | null | undefined) => {
    try {
      if (!addedOn || addedOn.trim() === "") return "Date not available";
      const date = new Date(addedOn);
      const day = date.getDate().toString().padStart(2, "0");
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return "Date not available";
    }
  };

  // ---------------- RENDER ----------------
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: COLORS.bg }]}
    >
      <View style={styles.container}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                SPACING.xxl * 2 + (insets.bottom || SPACING.lg) + 80,
            },
          ]}
          enableOnAndroid
          extraScrollHeight={SPACING.lg}
          keyboardOpeningTime={0}
          showsVerticalScrollIndicator={false}
        >
          {/* Header / summary card */}
          <View style={styles.headerCard}>
            <View style={styles.avatarWrapper}>
              {currentProfileImage ? (
                <Image
                  source={{ uri: currentProfileImage }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials || "U"}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>
                {formatRole(user?.role)} Profile
              </Text>
              <Text style={styles.headerSubtitle}>
                Manage your account information and settings
              </Text>

              <View style={styles.infoRow}>
                <UserIcon size={16} color={COLORS.sub} />
                <Text style={styles.infoText}>
                  {user?.firstName} {user?.lastName}
                </Text>
              </View>

              {user?.role !== 10007 && (
                <View style={styles.infoRow}>
                  <Building2 size={16} color={COLORS.sub} />
                  <Text style={styles.infoText}>
                    {`Hospital: ${hospitalName}`}
                  </Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <IdCard size={16} color={COLORS.sub} />
                <Text style={styles.infoText}>
                  {`Meta Health ID: ${user?.id || "N/A"}`}
                </Text>
              </View>

            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "personal" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("personal")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "personal" && styles.tabTextActive,
                ]}
              >
                Personal Info
              </Text>
            </TouchableOpacity>

            {showSecurityTab && (   
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "security" && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab("security")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "security" && styles.tabTextActive,
                  ]}
                >
                  Security
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "activity" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("activity")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "activity" && styles.tabTextActive,
                ]}
              >
                Activity Log
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB CONTENT */}
          {/* PERSONAL TAB */}
          {activeTab === "personal" && (
            <View style={styles.tabContent}>
              {/* Profile image + basic info */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Profile Info</Text>
                  <TouchableOpacity
                    style={[
                      styles.chipButton,
                      isEditingProfileInfo
                        ? styles.chipCancel
                        : styles.chipPrimary,
                    ]}
                    onPress={() =>
                      setIsEditingProfileInfo((prev) => !prev)
                    }
                  >
                    <Text
                      style={[
                        styles.chipButtonText,
                        isEditingProfileInfo && { color: COLORS.text },
                      ]}
                    >
                      {isEditingProfileInfo ? "Cancel" : "Edit"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.imageRow}>
                  <TouchableOpacity
                    onPress={() =>
                      isEditingProfileInfo && handlePickImage("profile")
                    }
                    activeOpacity={0.8}
                    style={styles.imageTouch}
                  >
                    {currentProfileImage ? (
                      <Image
                        source={{ uri: currentProfileImage }}
                        style={styles.largeImage}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <UserIcon size={40} color={COLORS.sub} />
                      </View>
                    )}
                    <Text style={styles.imageHint}>
                      Tap to {currentProfileImage ? "change" : "add"} image
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Form fields */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      !isEditingProfileInfo && styles.inputDisabled,
                    ]}
                    placeholder="Enter first name"
                    placeholderTextColor={COLORS.sub}
                    value={formData.firstName.value}
                    editable={isEditingProfileInfo}
                    onChangeText={(text) => {
                      if (!/^[A-Za-z\s]*$/.test(text)) return;
                      handleFormFieldChange("firstName", text);
                    }}
                  />
                  {formData.firstName.showError && (
                    <Text style={styles.errorText}>
                      {formData.firstName.message}
                    </Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      !isEditingProfileInfo && styles.inputDisabled,
                    ]}
                    placeholder="Enter last name"
                    placeholderTextColor={COLORS.sub}
                    value={formData.lastName.value}
                    editable={isEditingProfileInfo}
                    onChangeText={(text) => {
                      if (!/^[A-Za-z\s]*$/.test(text)) return;
                      handleFormFieldChange("lastName", text);
                    }}
                  />
                  {formData.lastName.showError && (
                    <Text style={styles.errorText}>
                      {formData.lastName.message}
                    </Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      !isEditingProfileInfo && styles.inputDisabled,
                    ]}
                    placeholder="Enter phone number"
                    placeholderTextColor={COLORS.sub}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={formData.phoneNo.value || ""}
                    editable={isEditingProfileInfo}
                    onChangeText={(text) =>
                      handleFormFieldChange(
                        "phoneNo",
                        text.replace(/\D/g, "")
                      )
                    }
                  />
                  {formData.phoneNo.showError && (
                    <Text style={styles.errorText}>
                      {formData.phoneNo.message}
                    </Text>
                  )}
                </View>

                {/* Gender & DOB row */}
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={styles.label}>Gender *</Text>
                    <View
                      style={[
                        styles.pickerContainer,
                        !isEditingProfileInfo && styles.inputDisabled,
                      ]}
                    >
                      <Picker
                        enabled={isEditingProfileInfo}
                        selectedValue={String(formData.gender.value)}
                        onValueChange={(value) =>
                          handleFormFieldChange("gender", Number(value))
                        }
                        style={styles.picker}
                        dropdownIconColor={COLORS.sub}
                      >
                        <Picker.Item label="Select" value="-1" />
                        <Picker.Item label="Male" value="1" />
                        <Picker.Item label="Female" value="2" />
                      </Picker>
                    </View>
                    {formData.gender.showError && (
                      <Text style={styles.errorText}>
                        {formData.gender.message}
                      </Text>
                    )}
                  </View>

                  <View style={styles.rowItem}>
                    <Text style={styles.label}>DOB *</Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        isEditingProfileInfo && setShowDobPicker(true)
                      }
                    >
                      <TextInput
                        style={[
                          styles.input,
                          styles.inputReadOnly,
                          !isEditingProfileInfo && styles.inputDisabled,
                        ]}
                        value={formatDate(formData.dob.value)}
                        placeholder="DD-MM-YYYY"
                        placeholderTextColor={COLORS.sub}
                        editable={false}
                      />
                    </TouchableOpacity>
                    {showDobPicker && (
                      <DateTimePicker
                        mode="date"
                        display={
                          Platform.OS === "android" ? "spinner" : "default"
                        }
                        value={
                          formData.dob.value
                            ? new Date(formData.dob.value)
                            : new Date()
                        }
                        onChange={handleDobChange}
                      />
                    )}
                    {formData.dob.showError && (
                      <Text style={styles.errorText}>
                        {formData.dob.message}
                      </Text>
                    )}
                  </View>
                </View>

                {/* State */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>State *</Text>
                  <View
                    style={[
                      styles.pickerContainer,
                      !isEditingProfileInfo && styles.inputDisabled,
                    ]}
                  >
                    <Picker
                      enabled={isEditingProfileInfo}
                      selectedValue={formData.state.value || ""}
                      onValueChange={(value) => {
                        handleFormFieldChange("state", value);
                        handleFormFieldChange("city", "");
                      }}
                      style={styles.picker}
                      dropdownIconColor={COLORS.sub}
                    >
                      <Picker.Item label="Select state" value="" />
                      {STATE_LIST.map((s) => (
                        <Picker.Item key={s} label={s} value={s} />
                      ))}
                    </Picker>
                  </View>
                  {formData.state.showError && (
                    <Text style={styles.errorText}>
                      {formData.state.message}
                    </Text>
                  )}
                </View>

                {/* City */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>City *</Text>
                  <View
                    style={[
                      styles.pickerContainer,
                      !isEditingProfileInfo && styles.inputDisabled,
                    ]}
                  >
                    <Picker
                      enabled={isEditingProfileInfo}
                      selectedValue={formData.city.value || ""}
                      onValueChange={(value) =>
                        handleFormFieldChange("city", value)
                      }
                      style={styles.picker}
                      dropdownIconColor={COLORS.sub}
                    >
                      <Picker.Item label="Select city" value="" />
                      {(cityList?.length ? cityList : ["No Option"]).map(
                        (c) => (
                          <Picker.Item key={c} label={c} value={c} />
                        )
                      )}
                    </Picker>
                  </View>
                  {formData.city.showError && (
                    <Text style={styles.errorText}>
                      {formData.city.message}
                    </Text>
                  )}
                </View>

                {/* Pincode */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Pincode *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      !isEditingProfileInfo && styles.inputDisabled,
                    ]}
                    placeholder="Enter pincode"
                    placeholderTextColor={COLORS.sub}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={formData.pinCode.value}
                    editable={isEditingProfileInfo}
                    onChangeText={(text) =>
                      handleFormFieldChange(
                        "pinCode",
                        text.replace(/\D/g, "")
                      )
                    }
                  />
                  {formData.pinCode.showError && (
                    <Text style={styles.errorText}>
                      {formData.pinCode.message}
                    </Text>
                  )}
                </View>

                {/* Email (read-only) */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={user?.email || ""}
                    editable={false}
                  />
                </View>

                {/* Address */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Home Address *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      !isEditingProfileInfo && styles.inputDisabled,
                    ]}
                    multiline
                    placeholder="Enter full address"
                    placeholderTextColor={COLORS.sub}
                    value={formData.address.value}
                    editable={isEditingProfileInfo}
                    onChangeText={(text) =>
                      handleFormFieldChange("address", text)
                    }
                  />
                  {formData.address.showError && (
                    <Text style={styles.errorText}>
                      {formData.address.message}
                    </Text>
                  )}
                </View>

                {/* Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.actionSecondary,
                      !isEditingProfileInfo && styles.buttonDisabled,
                    ]}
                    disabled={!isEditingProfileInfo}
                    onPress={resetProfileForm}
                  >
                    <Text style={styles.actionSecondaryText}>Reset</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.actionPrimary,
                      !isEditingProfileInfo && styles.buttonDisabled,
                    ]}
                    disabled={!isEditingProfileInfo}
                    onPress={handleProfileSubmit}
                  >
                    <Text style={styles.actionPrimaryText}>
                      Update Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Hospital Logo Section – only for super admin */}
              {user?.role === 9999 && (
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Hospital Logo</Text>
                  </View>

                  <View style={styles.imageRow}>
                    <TouchableOpacity
                      onPress={() => handlePickImage("hospital")}
                      activeOpacity={0.8}
                      style={styles.imageTouch}
                    >
                      {currentHospitalImage ? (
                        <Image
                          source={{ uri: currentHospitalImage }}
                          style={styles.largeImage}
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Building2 size={40} color={COLORS.sub} />
                        </View>
                      )}
                      <Text style={styles.imageHint}>
                        Tap to {currentHospitalImage ? "change" : "add"} logo
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionSecondary]}
                      onPress={() => {
                        setHospitalImageFile(null);
                        setHospitalImagePreview(null);
                      }}
                    >
                      <Text style={styles.actionSecondaryText}>Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.actionPrimary,
                        (!hospitalImageFile || hospitalLogoLoading) &&
                          styles.buttonDisabled,
                      ]}
                      disabled={!hospitalImageFile || hospitalLogoLoading}
                      onPress={handleHospitalLogoUpdate}
                    >
                      {hospitalLogoLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.actionPrimaryText}>
                          Update Logo
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* SECURITY TAB */}
             
          {showSecurityTab &&  activeTab === "security" && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Password & Security</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>New Password *</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter new password"
                      placeholderTextColor={COLORS.sub}
                      secureTextEntry={!showPassword}
                      value={passwordForm.password.value}
                      onChangeText={(text) =>
                        handlePasswordFieldChange("password", text)
                      }
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                         <Eye size={18} color={COLORS.sub} />
                      ) : (
                       
                        <EyeOff size={18} color={COLORS.sub} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {passwordForm.password.showError && (
                    <Text style={styles.errorText}>
                      {passwordForm.password.message}
                    </Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Confirm password"
                      placeholderTextColor={COLORS.sub}
                      secureTextEntry={!showPassword}
                      value={passwordForm.confirmPassword.value}
                      onChangeText={(text) =>
                        handlePasswordFieldChange(
                          "confirmPassword",
                          text
                        )
                      }
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={COLORS.sub} />
                      ) : (
                        <Eye size={18} color={COLORS.sub} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {passwordForm.confirmPassword.showError && (
                    <Text style={styles.errorText}>
                      {passwordForm.confirmPassword.message}
                    </Text>
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionPrimary]}
                    onPress={debouncedPasswordSubmit}
                  >
                    <Text style={styles.actionPrimaryText}>
                      Update Password
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === "activity" && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    <History size={18} color={COLORS.text} /> Edit History
                  </Text>
                  <TouchableOpacity
                    style={styles.chipButton}
                    onPress={fetchEditLogs}
                    disabled={logsLoading}
                  >
                    <Text style={styles.chipButtonText}>
                      {logsLoading ? "Loading..." : "Refresh"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {logsLoading && (
                  <View style={styles.center}>
                    <ActivityIndicator size="small" color={COLORS.button} />
                  </View>
                )}

                {!logsLoading && editLogs.length === 0 && (
                  <View style={styles.center}>
                    <Text style={styles.emptyText}>
                      No edit history available
                    </Text>
                  </View>
                )}

                {!logsLoading &&
                  editLogs.length > 0 &&
                  editLogs.map((log) => (
                    <View key={log.id} style={styles.logCard}>
                      <Text style={styles.logDate}>
                        {formatDateTime(log.editedAt)}
                      </Text>
                      <Text style={styles.logBy}>
                        Edited by{" "}
                        <Text style={styles.logByName}>
                          {log.editedByName}
                        </Text>{" "}
                        (ID: {log.editedBy})
                      </Text>

                      {getChangedFields(log.newData).map((field) => {
                        const change = log.newData[field];
                        const displayValue =
                          getFieldDisplayValue(field, change);

                        if (field === "photo") {
                          return (
                            <View key={field} style={styles.logFieldBlock}>
                              <Text style={styles.logFieldLabel}>
                                {field}
                              </Text>
                              <View style={styles.logImagesRow}>
                                {change.oldURL && (
                                  <View style={styles.logImagePair}>
                                    <Text style={styles.logImageCaption}>
                                      Old
                                    </Text>
                                    <Image
                                      source={{ uri: change.oldURL }}
                                      style={styles.logImage}
                                    />
                                  </View>
                                )}
                                {change.newURL && (
                                  <View style={styles.logImagePair}>
                                    <Text style={styles.logImageCaption}>
                                      New
                                    </Text>
                                    <Image
                                      source={{ uri: change.newURL }}
                                      style={styles.logImage}
                                    />
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        }

                        return (
                          <View
                            key={field}
                            style={styles.logFieldBlock}
                          >
                            <Text style={styles.logFieldLabel}>
                              {field}
                            </Text>
                            <Text style={styles.logFieldValue}>
                              {displayValue}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
              </View>
            </View>
          )}
        </KeyboardAwareScrollView>

        {/* Bottom footer navigation */}
        <View
          style={[
            styles.footerWrap,
            { paddingBottom: insets.bottom || SPACING.md },
          ]}
        >
          <Footer active={"dashboard"} brandColor={COLORS.button} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default doctorProfile;

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.md,
    paddingTop: SPACING.lg,
  },

  headerCard: {
    flexDirection: "row",
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarWrapper: {
    marginRight: SPACING.md,
  },
  avatar: {
    width: responsiveWidth(18),
    height: responsiveWidth(18),
    minWidth: 64,
    minHeight: 64,
    borderRadius: 999,
  },
  avatarPlaceholder: {
    width: responsiveWidth(18),
    height: responsiveWidth(18),
    minWidth: 64,
    minHeight: 64,
    borderRadius: 999,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    gap: 6,
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },

  tabsRow: {
    flexDirection: "row",
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 999,
    backgroundColor: COLORS.inputBg,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderRadius: 999,
  },
  tabButtonActive: {
    backgroundColor: COLORS.button,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  tabContent: {
    marginTop: SPACING.sm,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
  },

  chipButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.button,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  chipPrimary: {
    backgroundColor: COLORS.button,
  },
  chipCancel: {
    backgroundColor: "transparent",
  },
  chipButtonText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.fieldText || "#fff",
    fontWeight: "600",
  },

  imageRow: {
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  imageTouch: {
    alignItems: "center",
  },
  largeImage: {
    width: responsiveWidth(40),
    height: responsiveWidth(40),
    maxWidth: 160,
    maxHeight: 160,
    borderRadius: 999,
  },
  imagePlaceholder: {
    width: responsiveWidth(40),
    height: responsiveWidth(40),
    maxWidth: 160,
    maxHeight: 160,
    borderRadius: 999,
    backgroundColor: COLORS.inputBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageHint: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },

  formGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    backgroundColor: COLORS.inputBg,
    fontSize: FONT_SIZE.md,
    minHeight: 44,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputReadOnly: {
    color: COLORS.sub,
  },
  textArea: {
    textAlignVertical: "top",
    minHeight: 90,
  },

  errorText: {
    marginTop: 4,
    fontSize: FONT_SIZE.xs,
    color: "#dc2626",
  },

  row: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  rowItem: {
    flex: 1,
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.inputBg,
  },
  picker: {
    height: 55,
    color: COLORS.text,
  },

  actionsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
  },
  actionPrimary: {
    backgroundColor: COLORS.button,
  },
  actionPrimaryText: {
    color: "#fff",
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  actionSecondary: {
    backgroundColor: COLORS.cancelButton || COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionSecondaryText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    marginLeft: SPACING.xs,
    padding: SPACING.xs,
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },

  logCard: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 2,
  },
  logBy: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 6,
  },
  logByName: {
    color: COLORS.text,
    fontWeight: "600",
  },
  logFieldBlock: {
    marginBottom: SPACING.xs,
  },
  logFieldLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 2,
  },
  logFieldValue: {
    fontSize: FONT_SIZE.xs,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    color: COLORS.text,
  },
  logImagesRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  logImagePair: {
    alignItems: "center",
  },
  logImageCaption: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 2,
  },
  logImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },

  footerWrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
});
