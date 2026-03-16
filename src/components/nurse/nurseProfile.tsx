import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
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
  Modal,
  FlatList,
  Dimensions,
  PermissionsAndroid,
  Alert,
  ActionSheetIOS,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";

import { currentUser, RootState } from "../../store/store";
import { AuthFetch, AuthPatch, AuthPost } from "../../auth/auth";
import { state as STATE_LIST, city as CITY_LIST } from "../../utils/stateCity";
import { COLORS } from "../../utils/colour";
import {
  SPACING,
  FONT_SIZE,
  isTablet,
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
  moderateScale,
  verticalScale,
  horizontalScale,
  widthPercentageToDP,
  heightPercentageToDP,
} from "../../utils/responsive";
import { Role_list } from "../../utils/role";
import { showError, showSuccess } from "../../store/toast.slice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
import {
  formatDate,
  formatDateTime,
  formatDateForInput,
  parseDateFromInput,
} from "../../utils/dateTime";

// Icons from lucide-react-native
import {
  Building2,
  Calendar,
  IdCard,
  History,
  User as UserIcon,
  Eye,
  EyeOff,
  Camera,
  Upload,
  IndianRupee,
  RefreshCw,
  X,
  Check,
  AlertCircle,
} from "lucide-react-native";

/* ---------------- TYPES ---------------- */

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

interface ConsultationFee {
  id: number;
  fee: number;
  startDate: string;
  endDate: string | null;
  status: string;
  createdBy: number;
  updatedBy: number | null;
}

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
  phoneNo: FieldState<string>;
  gender: FieldState<number>;
  dob: FieldState<string>;
  city: FieldState<string>;
  state: FieldState<string>;
  pinCode: FieldState<string>;
  address: FieldState<string>;
};

type PasswordFormState = {
  oldPassword: FieldState<string>;
  password: FieldState<string>;
  confirmPassword: FieldState<string>;
};

type RNImageFile = {
  uri: string;
  name: string;
  type: string;
};

/* ---------------- HELPERS ---------------- */

const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

const formatRole = (role: number | null) => {
  try {
    if (role !== null && Role_list[role as keyof typeof Role_list]) {
      const r = Role_list[role as keyof typeof Role_list];
      return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
    }
    return "User";
  } catch {
    return "User";
  }
};

const checkLength = (number: number, size: number): boolean => {
  const numberStr = String(number);
  return numberStr.length === size;
};

const validatePhoneNumber = (phone: string): boolean => {
  const phoneStr = phone?.trim();
  if (!phoneStr || phoneStr.length !== 10) return false;
  return /^[6-9]/.test(phoneStr[0]);
};

const validatePinCode = (pincode: string): boolean => {
  const pincodeStr = pincode?.trim();
  if (!pincodeStr || pincodeStr.length !== 6) return false;
  return /^[1-9][0-9]{5}$/.test(pincodeStr);
};

/* ---------------- CLEAR PROFILE IMAGE DIALOG ---------------- */

interface ClearProfileDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ClearProfileDialog: React.FC<ClearProfileDialogProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogContainer}>
          <Text style={styles.dialogTitle}>Remove Profile Image?</Text>
          <Text style={styles.dialogMessage}>
            Are you sure you want to remove your profile image?
          </Text>
          <View style={styles.dialogButtons}>
            <TouchableOpacity
              style={[styles.dialogButton, styles.dialogButtonCancel]}
              onPress={onClose}
            >
              <Text style={styles.dialogButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, styles.dialogButtonConfirm]}
              onPress={onConfirm}
            >
              <Text style={styles.dialogButtonTextConfirm}>Yes, Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ---------------- CONSULTATION FEE COMPONENT ---------------- */

interface ConsultationFeeSectionProps {
  user: any;
  token: string;
  isEditing: boolean;
  onEditToggle: () => void;
}

const ConsultationFeeSection: React.FC<ConsultationFeeSectionProps> = ({
  user,
  token,
  isEditing,
  onEditToggle,
}) => {
  const [consultationFee, setConsultationFee] = useState<number | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const [activeFeeData, setActiveFeeData] = useState<ConsultationFee | null>(null);
  const [feeHistory, setFeeHistory] = useState<ConsultationFee[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const dispatch = useDispatch();

  const fetchConsultationFee = async () => {
    if (!user?.id || !token) return;

    try {
      setLoading(true);
      
      let response;
      const queryParams = user?.doctorProfile?.id 
        ? `?doctorProfileID=${user.doctorProfile.id}` 
        : '';
      
      const endpoint = user?.hospitalID
        ? `user/consultationFee/active/${user.id}/${user.hospitalID}${queryParams}`
        : `user/consultationFee/active/${user.id}/0${queryParams}`;

      response = await AuthFetch(endpoint, token) as any;

      if (response?.status === "success" && response?.data?.data) {
        setActiveFeeData(response.data.data);
        setConsultationFee(response.data.data.fee || null);
        setFeeInput(response.data.data.fee?.toString() || "");
      } else {
        setActiveFeeData(null);
        setConsultationFee(null);
        setFeeInput("");
      }
    } catch {
      dispatch(showError("Failed to fetch consultation fee"));
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeHistory = async () => {
    if (!user?.id || !token) return;

    try {
      setHistoryLoading(true);
      
      let response;
      const queryParams = user?.doctorProfile?.id 
        ? `?doctorProfileID=${user.doctorProfile.id}` 
        : '';
      
      const endpoint = user?.hospitalID
        ? `user/consultationFee/history/${user.id}/${user.hospitalID}${queryParams}`
        : `user/consultationFee/history/${user.id}/0${queryParams}`;

      response = await AuthFetch(endpoint, token) as any;

      if (response?.status === "success" && response?.data?.data) {
        setFeeHistory(response.data.data || []);
      } else {
        setFeeHistory([]);
      }
    } catch {
      dispatch(showError("Failed to fetch fee history"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveFee = async () => {
    if (!user?.id || !token) return;

    const feeValue = parseFloat(feeInput);
    if (isNaN(feeValue) || feeValue < 0) {
      dispatch(showError("Please enter a valid consultation fee"));
      return;
    }

    try {
      setLoading(true);

      const payload = user?.hospitalID
        ? {
            doctorID: user.id,
            hospitalID: user.hospitalID,
            fee: feeValue,
          }
        : {
            doctorID: user.id,
            doctorProfileID: user.doctorProfile?.id,
            fee: feeValue,
          };

      const response = await AuthPost("user/consultationFee/save", payload, token);

      if (response?.status === "success") {
        setConsultationFee(feeValue);
        onEditToggle();
        dispatch(showSuccess("Consultation fee updated successfully"));
        fetchConsultationFee();
        if (showHistory) {
          fetchFeeHistory();
        }
      } else {
        dispatch(showError(response?.message || "Failed to update consultation fee"));
      }
    } catch {
      dispatch(showError("Failed to save consultation fee"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && token) {
      fetchConsultationFee();
    }
  }, [user?.id, user?.hospitalID, user?.doctorProfile?.id, token]);

  return (
    <View style={styles.consultationFeeContainer}>
      <View style={styles.consultationFeeHeader}>
        <View style={styles.feeTitleRow}>
          <IndianRupee size={moderateScale(20)} color={COLORS.button} />
          <Text style={styles.consultationFeeTitle}>Consultation Fee</Text>
        </View>
        <View style={styles.feeActionButtons}>
          <TouchableOpacity
            style={styles.viewHistoryButton}
            onPress={() => {
              if (!showHistory) {
                fetchFeeHistory();
              }
              setShowHistory(!showHistory);
            }}
          >
            <Text style={styles.viewHistoryButtonText}>
              {showHistory ? "Hide History" : "View History"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editFeeButton}
            onPress={() => {
              if (isEditing) {
                setFeeInput(consultationFee?.toString() || "");
              }
              onEditToggle();
            }}
          >
            <Text style={styles.editFeeButtonText}>
              {isEditing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.button} />
        </View>
      ) : (
        <>
          {/* Current Fee Card */}
          <View style={[
            styles.currentFeeCard,
            consultationFee === null && styles.feeNotSetCard
          ]}>
            <Text style={styles.feeAmount}>
              ₹{consultationFee !== null ? consultationFee.toLocaleString() : '0'}
              <Text style={styles.feeUnit}>
                {consultationFee === null ? ' (Not Set)' : ' per consultation'}
              </Text>
            </Text>
            {activeFeeData && (
              <View style={styles.feeDetails}>
                <View style={styles.feeDetailRow}>
                  <Text style={styles.feeDetailLabel}>Status:</Text>
                  <View style={[
                    styles.statusBadge,
                    activeFeeData.status === 'active' ? styles.statusActive : styles.statusInactive
                  ]}>
                    <Text style={styles.statusText}>{activeFeeData.status}</Text>
                  </View>
                </View>
                <View style={styles.feeDetailRow}>
                  <Text style={styles.feeDetailLabel}>Effective From:</Text>
                  <Text style={styles.feeDetailValue}>
                    {formatDate(activeFeeData.startDate)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Fee History */}
          {showHistory && (
            <View style={styles.feeHistorySection}>
              <Text style={styles.feeHistoryTitle}>📋 Fee History</Text>
              {historyLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.button} />
                </View>
              ) : feeHistory?.length > 0 ? (
                <FlatList
                  data={feeHistory}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  renderItem={({ item }) => (
                    <View style={styles.feeHistoryItem}>
                      <View style={styles.feeHistoryHeader}>
                        <Text style={styles.feeHistoryAmount}>
                          ₹{item.fee?.toLocaleString()}
                        </Text>
                        <View style={[
                          styles.historyStatusBadge,
                          item.status === 'active' ? styles.statusActive : styles.statusInactive
                        ]}>
                          <Text style={styles.historyStatusText}>{item.status}</Text>
                        </View>
                      </View>
                      <View style={styles.feeHistoryDetails}>
                        <Text style={styles.feeHistoryDetail}>
                          Start: {formatDate(item.startDate)}
                        </Text>
                        <Text style={styles.feeHistoryDetail}>
                          End: {item.endDate ? formatDate(item.endDate) : '—'}
                        </Text>
                      </View>
                    </View>
                  )}
                  style={styles.feeHistoryList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.noHistoryContainer}>
                  <Text style={styles.noHistoryText}>No fee history available</Text>
                </View>
              )}
            </View>
          )}

          {/* Fee Input */}
          <View style={styles.feeInputSection}>
            <TextInput
              style={[styles.feeInput, !isEditing && styles.feeInputDisabled]}
              value={feeInput}
              onChangeText={setFeeInput}
              placeholder="Enter new consultation fee"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="numeric"
              editable={isEditing}
            />
          </View>

          {/* Fee Actions */}
          {isEditing && (
            <View style={styles.feeActions}>
              <TouchableOpacity
                style={[styles.feeActionButton, styles.feeResetButton]}
                onPress={() => setFeeInput(consultationFee?.toString() || "")}
                disabled={loading}
              >
                <Text style={styles.feeResetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feeActionButton, styles.feeSaveButton]}
                onPress={handleSaveFee}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.feeSaveButtonText}>Update Fee</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */

const DoctorProfile: React.FC = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const user = useSelector((state: RootState) => state.currentUser);

  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [isEditingProfileInfo, setIsEditingProfileInfo] = useState(false);
  const [isEditingHospitalLogo, setIsEditingHospitalLogo] = useState(false);
  const [isEditingConsultationFee, setIsEditingConsultationFee] = useState(false);

  const [profileImageFile, setProfileImageFile] = useState<RNImageFile | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [hospitalImageFile, setHospitalImageFile] = useState<RNImageFile | null>(null);
  const [hospitalImagePreview, setHospitalImagePreview] = useState<string | null>(null);
  
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  
  const [clearProfileDialog, setClearProfileDialog] = useState(false);
  const [clearHospitalDialog, setClearHospitalDialog] = useState(false);
  
  const [cityList, setCityList] = useState<string[]>([]);
  const [hospitalName, setHospitalName] = useState<string>(
    user?.role === 10007 ? "N/A" : user?.hospitalName || "Central Medical Hospital"
  );
  const [hospitalImageURL, setHospitalImageURL] = useState<string | null>(null);
  
  const [editLogs, setEditLogs] = useState<EditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ProfileFormState>({
    firstName: { valid: true, showError: false, value: user?.firstName || "", message: "" },
    lastName: { valid: true, showError: false, value: user?.lastName || "", message: "" },
    phoneNo: { valid: true, showError: false, value: user?.phoneNo || "", message: "" },
    gender: { valid: true, showError: false, value: user?.gender || -1, message: "" },
    dob: { valid: true, showError: false, value: user?.dob || "", message: "" },
    city: { valid: true, showError: false, value: user?.city || "", message: "" },
    state: { valid: true, showError: false, value: user?.state || "", message: "" },
    pinCode: { valid: true, showError: false, value: String(user?.pinCode || ""), message: "" },
    address: { valid: true, showError: false, value: user?.address || "", message: "" },
  });

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    oldPassword: { valid: true, showError: false, value: "", message: "" },
    password: { valid: true, showError: false, value: "", message: "" },
    confirmPassword: { valid: true, showError: false, value: "", message: "" },
  });

  // Check if user has token
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token && !user?.token) {
        dispatch(showError("Not authorized. Please login again."));
        // You can add navigation to login here
      }
    };
    checkAuth();
  }, [user?.token, dispatch]);

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    const stateIndex = STATE_LIST.indexOf(formData.state.value);
    setCityList(CITY_LIST[stateIndex] || []);
  }, [formData.state.value]);

  useEffect(() => {
    const fetchHospitalDetails = async () => {
      if (!user?.hospitalID || !user?.token || user?.role === 10007) return;

      try {
        const response = await AuthFetch(`hospital/${user.hospitalID}`, user.token) as any;

        if (response?.status === "success" && response?.data?.hospital?.name) {
          const fetchedImageURL = response.data.hospital.logoURL || null;
          setHospitalName(response.data.hospital.name);
          setHospitalImageURL(fetchedImageURL);
          
          const updatedUser = {
            ...user,
            hospitalName: response.data.hospital.name,
            hospitalImageURL: fetchedImageURL,
          };
          dispatch(currentUser(updatedUser));
          
          await AsyncStorage.setItem("user", JSON.stringify({
            ...updatedUser,
            isLoggedIn: true,
            token: user.token,
          }));
        } else {
          dispatch(showError("Failed to fetch hospital details"));
        }
      } catch {
        dispatch(showError("Error fetching hospital details"));
      }
    };

    fetchHospitalDetails();
  }, [user?.hospitalID, user?.token, user?.role, dispatch]);

  /* ---------------- IMAGE HANDLING ---------------- */

  const handlePickImage = async (type: 'profile' | 'hospital') => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        async (i) => {
          if (i === 1) await openCamera(type);
          if (i === 2) openGallery(type);
        }
      );
    } else {
      Alert.alert("Select Image", "", [
        { text: "Camera", onPress: () => openCamera(type) },
        { text: "Gallery", onPress: () => openGallery(type) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const openCamera = async (type: 'profile' | 'hospital') => {
    const ok = await requestCameraPermission();
    if (!ok) return;

    launchCamera({ mediaType: "photo", quality: 0.8 }, (res) => handleImageResponse(res, type));
  };

  const openGallery = (type: 'profile' | 'hospital') => {
    launchImageLibrary({ mediaType: "photo", quality: 0.8 }, (res) => handleImageResponse(res, type));
  };

  const handleImageResponse = (res: any, type: 'profile' | 'hospital') => {
    if (res.didCancel || !res.assets?.[0]?.uri) return;

    const asset = res.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName || `${type}.jpg`,
      type: asset.type || "image/jpeg",
    };

    if (type === 'profile') {
      setProfileImageFile(file);
      setProfileImagePreview(asset.uri);
    } else {
      setHospitalImageFile(file);
      setHospitalImagePreview(asset.uri);
    }
  };

  const handleClearProfileImage = async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!token || !user?.id) {
      dispatch(showError("Not authorized. Please login again."));
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("photo", "");
      fd.append("image", "");

      const res = await AuthPatch(`user/${user.hospitalID}/${user.id}`, fd, token) as any;

      if (res?.status === "success") {
        const updatedUser = { ...user, imageURL: null, photo: null };
        dispatch(currentUser(updatedUser));
        dispatch(showSuccess("Profile image removed"));
        setProfileImagePreview(null);
        setProfileImageFile(null);
        
        await AsyncStorage.setItem("user", JSON.stringify({
          ...updatedUser,
          isLoggedIn: true,
          token,
        }));
      } else {
        dispatch(showError(res?.message || "Failed to remove image"));
      }
    } catch {
      dispatch(showError("Error removing image"));
    } finally {
      setSubmitting(false);
      setClearProfileDialog(false);
    }
  };

  const handleClearHospitalLogo = async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!token || !user?.hospitalID) {
      dispatch(showError("Not authorized. Please login again."));
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("logo", "");

      const res = await AuthPatch(`hospital/${user.hospitalID}`, fd, token) as any;

      if (res?.status === "success") {
        setHospitalImageURL(null);
        setHospitalImagePreview(null);
        setHospitalImageFile(null);
        dispatch(showSuccess("Hospital logo removed"));
      } else {
        dispatch(showError(res?.message || "Failed to remove logo"));
      }
    } catch {
      dispatch(showError("Error removing logo"));
    } finally {
      setSubmitting(false);
      setClearHospitalDialog(false);
    }
  };

  /* ---------------- FORM HANDLERS ---------------- */

  const handleFormChange = (field: keyof ProfileFormState, value: string) => {
    let validatedValue = value;
    
    if (field === "firstName" || field === "lastName") {
      if (!/^[A-Za-z\s]*$/.test(value)) return;
    }
    
    if (field === "phoneNo" || field === "pinCode") {
      validatedValue = value.replace(/\D/g, "");
    }

    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value: validatedValue,
        valid: !!validatedValue,
        showError: !validatedValue,
        message: !validatedValue ? "This field is required" : "",
      },
    }));
  };

  const handleGenderChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      gender: {
        ...prev.gender,
        value,
        valid: value !== -1,
        showError: value === -1,
        message: value === -1 ? "This field is required" : "",
      },
    }));
  };

  const handleStateChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      state: {
        ...prev.state,
        value,
        valid: !!value,
        showError: !value,
        message: !value ? "This field is required" : "",
      },
      city: {
        ...prev.city,
        value: "",
        valid: false,
        showError: false,
        message: "",
      },
    }));
  };

  const handlePasswordChange = (field: keyof PasswordFormState, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        valid: !!value,
        showError: !value,
        message: !value ? "This field is required" : "",
      },
    }));
  };

  /* ---------------- SUBMIT HANDLERS ---------------- */

  const handleProfileSubmit = async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!token || !user?.id) {
      dispatch(showError("Not authorized. Please login again."));
      return;
    }

    // Validate all fields
    const requiredFields: Array<keyof ProfileFormState> = [
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
    const newFormData = { ...formData };

    requiredFields.forEach(field => {
      const fieldData = newFormData[field];
      let isValid = !!fieldData.value;
      let message = "";

      if (field === "phoneNo") {
        isValid = validatePhoneNumber(fieldData.value);
        message = isValid ? "" : "Enter a valid 10-digit mobile number starting with 6-9";
      } else if (field === "pinCode") {
        isValid = validatePinCode(fieldData.value);
        message = isValid ? "" : "Enter a valid 6-digit pincode";
      } else if (field === "gender") {
        isValid = fieldData.value !== -1;
        message = isValid ? "" : "Gender is required";
      } else {
        message = isValid ? "" : "This field is required";
      }

      newFormData[field] = {
        ...fieldData,
        valid: isValid,
        showError: !isValid,
        message,
      };

      if (!isValid) hasError = true;
    });

    setFormData(newFormData);
    if (hasError) {
      dispatch(showError("Please fill all required fields correctly"));
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();

      Object.entries(newFormData).forEach(([key, value]) => {
        if (key !== "valid" && key !== "showError" && key !== "message") {
          fd.append(key, String((value as FieldState).value));
        }
      });

      if (profileImageFile) {
        fd.append("photo", profileImageFile as any);
      }

      const res = await AuthPatch(`user/${user.hospitalID}/${user.id}`, fd, token) as any;

      if (res?.status === "success") {
        const updatedUser = { 
          ...user, 
          ...res.data?.data, 
          token,
          hospitalName: user.role === 10007 ? "N/A" : hospitalName,
        };
        dispatch(currentUser(updatedUser));
        dispatch(showSuccess("Profile updated successfully"));
        setIsEditingProfileInfo(false);
        
        await AsyncStorage.setItem("user", JSON.stringify({
          ...updatedUser,
          isLoggedIn: true,
          token,
        }));
      } else {
        dispatch(showError(res?.message || "Update failed"));
      }
    } catch {
      dispatch(showError("Error updating profile"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHospitalLogoUpdate = async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!token || !user?.hospitalID || !hospitalImageFile) {
      dispatch(showError("Please select an image and ensure you're authorized"));
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("logo", hospitalImageFile as any);

      const res = await AuthPatch(`hospital/${user.hospitalID}`, fd, token) as any;

      if (res?.status === "success") {
        const newImageURL = res.data?.hospital?.logoURL || null;
        setHospitalImageURL(newImageURL);
        setHospitalImagePreview(null);
        setHospitalImageFile(null);
        setIsEditingHospitalLogo(false);
        
        const updatedUser = { 
          ...user, 
          hospitalImageURL: newImageURL 
        };
        dispatch(currentUser(updatedUser));
        dispatch(showSuccess("Hospital logo updated"));
        
        await AsyncStorage.setItem("user", JSON.stringify({
          ...updatedUser,
          isLoggedIn: true,
          token,
        }));
      } else {
        dispatch(showError(res?.message || "Failed to update logo"));
      }
    } catch {
      dispatch(showError("Error updating logo"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!token) {
      dispatch(showError("Not authorized. Please login again."));
      return;
    }

    if (!passwordForm.oldPassword.value) {
      dispatch(showError("Current password required"));
      return;
    }

    if (passwordForm.password.value !== passwordForm.confirmPassword.value) {
      dispatch(showError("Passwords do not match"));
      return;
    }

    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(passwordForm.password.value)) {
      dispatch(showError(
        "Password must be at least 8 characters, include uppercase, lowercase, number, and special character"
      ));
      return;
    }

    try {
      setSubmitting(true);
      const res = await AuthPost(
        "user/change-password",
        {
          oldPassword: passwordForm.oldPassword.value,
          newPassword: passwordForm.password.value,
        },
        token
      ) as any;

      if (res?.status === "success") {
        dispatch(showSuccess("Password updated successfully"));
        setPasswordForm({
          oldPassword: { valid: true, showError: false, value: "", message: "" },
          password: { valid: true, showError: false, value: "", message: "" },
          confirmPassword: { valid: true, showError: false, value: "", message: "" },
        });
      } else {
        dispatch(showError(res?.message || "Password update failed"));
      }
    } catch {
      dispatch(showError("Error updating password"));
    } finally {
      setSubmitting(false);
    }
  };

  const debouncedPasswordSubmit = useCallback(
    debounce(handlePasswordSubmit, DEBOUNCE_DELAY),
    [passwordForm]
  );

  /* ---------------- ACTIVITY LOGS ---------------- */

  const fetchEditLogs = async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!token || !user?.hospitalID || !user?.id) {
      dispatch(showError("Not authorized. Please login again."));
      return;
    }

    setLogsLoading(true);
    
    try {
      const res = await AuthFetch(`user/${user.hospitalID}/${user.id}/getEditLogs`, token) as any;
      
      if (res?.status === "success") {
        setEditLogs(res.data?.data?.logs || []);
      } else {
        dispatch(showError(res?.message || "Failed to load logs"));
      }
    } catch {
      dispatch(showError("Error fetching edit logs"));
    } finally {
      setLogsLoading(false);
    }
  };

  const getChangedFields = (newData: any): string[] => {
    return Object.keys(newData || {});
  };

  const getFieldDisplayValue = (field: string, value: any): string => {
    if (typeof value === "object" && value !== null) {
      if (value.new !== undefined) {
        return `${value.old} → ${value.new}`;
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  /* ---------------- RENDER FUNCTIONS ---------------- */

  const renderPersonalTab = () => (
    <View style={styles.tabContent}>
      {/* Profile Info Card */}
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
            onPress={() => setIsEditingProfileInfo(!isEditingProfileInfo)}
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
            onPress={() => isEditingProfileInfo && handlePickImage('profile')}
            style={[
              styles.imageTouch,
              !isEditingProfileInfo && styles.imageTouchDisabled
            ]}
            disabled={!isEditingProfileInfo}
          >
            <View style={styles.imageContainerWrapper}>
              <View style={styles.circleBorder}>
                {profileImagePreview || user?.imageURL ? (
                  <Image
                    source={{ uri: profileImagePreview || user?.imageURL }}
                    style={styles.simpleCircleImage}
                  />
                ) : (
                  <View style={styles.simpleCirclePlaceholder}>
                    <UserIcon size={40} color={COLORS.sub} />
                  </View>
                )}
                
                {isEditingProfileInfo && (
                  <View style={[
                    styles.cameraOverlay,
                    !isEditingProfileInfo && styles.cameraOverlayDisabled
                  ]}>
                    <Camera size={16} color="#fff" />
                  </View>
                )}
              </View>
            </View>
            
            <Text style={[
              styles.imageHint,
              !isEditingProfileInfo && styles.imageHintDisabled
            ]}>
              {isEditingProfileInfo ? 
                `Tap to ${profileImagePreview || user?.imageURL ? "change" : "add"} image` : 
                "Enable edit to change image"
              }
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
              formData.firstName.showError && { borderColor: "#dc2626" },
            ]}
            placeholder="Enter first name"
            placeholderTextColor={COLORS.sub}
            value={formData.firstName.value}
            editable={isEditingProfileInfo}
            onChangeText={(text) => handleFormChange("firstName", text)}
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
              formData.lastName.showError && { borderColor: "#dc2626" },
            ]}
            placeholder="Enter last name"
            placeholderTextColor={COLORS.sub}
            value={formData.lastName.value}
            editable={isEditingProfileInfo}
            onChangeText={(text) => handleFormChange("lastName", text)}
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
              formData.phoneNo.showError && { borderColor: "#dc2626" },
            ]}
            placeholder="Enter phone number"
            placeholderTextColor={COLORS.sub}
            keyboardType="number-pad"
            maxLength={10}
            value={formData.phoneNo.value}
            editable={isEditingProfileInfo}
            onChangeText={(text) => handleFormChange("phoneNo", text)}
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
                onValueChange={(value) => handleGenderChange(Number(value))}
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
              onPress={() => isEditingProfileInfo && setShowDobPicker(true)}
            >
              <TextInput
                style={[
                  styles.input,
                  styles.inputReadOnly,
                  !isEditingProfileInfo && styles.inputDisabled,
                ]}
                value={formData.dob.value ? formatDate(formData.dob.value) : ""}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={COLORS.sub}
                editable={false}
              />
            </TouchableOpacity>
            {showDobPicker && (
              <DateTimePicker
                mode="date"
                display={Platform.OS === "android" ? "spinner" : "default"}
                value={formData.dob.value ? parseDateFromInput(formData.dob.value) || new Date() : new Date()}
                onChange={(event, date) => {
                  setShowDobPicker(false);
                  if (date) {
                    handleFormChange("dob", formatDateForInput(date));
                  }
                }}
                maximumDate={new Date()}
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
              selectedValue={formData.state.value}
              onValueChange={handleStateChange}
              style={styles.picker}
              dropdownIconColor={COLORS.sub}
            >
              <Picker.Item label="Select state" value="" />
              {STATE_LIST.map((state) => (
                <Picker.Item key={state} label={state} value={state} />
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
              enabled={isEditingProfileInfo && cityList.length > 0}
              selectedValue={formData.city.value}
              onValueChange={(value) => handleFormChange("city", value)}
              style={styles.picker}
              dropdownIconColor={COLORS.sub}
            >
              <Picker.Item label={cityList.length > 0 ? "Select city" : "Select state first"} value="" />
              {cityList?.map((city) => (
                <Picker.Item key={city} label={city} value={city} />
              ))}
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
              formData.pinCode.showError && { borderColor: "#dc2626" },
            ]}
            placeholder="Enter pincode"
            placeholderTextColor={COLORS.sub}
            keyboardType="number-pad"
            maxLength={6}
            value={formData.pinCode.value}
            editable={isEditingProfileInfo}
            onChangeText={(text) => handleFormChange("pinCode", text)}
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
              formData.address.showError && { borderColor: "#dc2626" },
            ]}
            multiline
            placeholder="Enter full address"
            placeholderTextColor={COLORS.sub}
            value={formData.address.value}
            editable={isEditingProfileInfo}
            onChangeText={(text) => handleFormChange("address", text)}
          />
          {formData.address.showError && (
            <Text style={styles.errorText}>
              {formData.address.message}
            </Text>
          )}
        </View>

        {/* Buttons */}
        {isEditingProfileInfo && (
          <View style={[styles.actionsRow, styles.bottomActionsMargin]}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionSecondary,
              ]}
              onPress={() => {
                setFormData({
                  firstName: { valid: true, showError: false, value: user?.firstName || "", message: "" },
                  lastName: { valid: true, showError: false, value: user?.lastName || "", message: "" },
                  phoneNo: { valid: true, showError: false, value: user?.phoneNo || "", message: "" },
                  gender: { valid: true, showError: false, value: user?.gender || -1, message: "" },
                  dob: { valid: true, showError: false, value: user?.dob || "", message: "" },
                  city: { valid: true, showError: false, value: user?.city || "", message: "" },
                  state: { valid: true, showError: false, value: user?.state || "", message: "" },
                  pinCode: { valid: true, showError: false, value: String(user?.pinCode || ""), message: "" },
                  address: { valid: true, showError: false, value: user?.address || "", message: "" },
                });
                setProfileImageFile(null);
                setProfileImagePreview(null);
              }}
              disabled={submitting}
            >
              <Text style={styles.actionSecondaryText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionPrimary,
              ]}
              onPress={handleProfileSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionPrimaryText}>
                  Update Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Hospital Logo Section (Only for Admin - role 9999) */}
      {user?.role === 9999 && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Hospital Logo</Text>
          </View>

          <View style={styles.imageRow}>
            <TouchableOpacity
              onPress={() => handlePickImage('hospital')}
              activeOpacity={0.8}
              style={styles.imageTouch}
            >
              {hospitalImagePreview || hospitalImageURL ? (
                <Image
                  source={{ uri: hospitalImagePreview || hospitalImageURL }}
                  style={styles.largeImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Building2 size={40} color={COLORS.sub} />
                </View>
              )}
              <Text style={styles.imageHint}>
                Tap to {hospitalImagePreview || hospitalImageURL ? "change" : "add"} logo
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
                (!hospitalImageFile || submitting) && styles.buttonDisabled,
              ]}
              disabled={!hospitalImageFile || submitting}
              onPress={handleHospitalLogoUpdate}
            >
              {submitting ? (
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

      {/* Consultation Fee Section (Only for Doctors - role 4001) */}
      {user?.role === 4001 && (
        <ConsultationFeeSection
          user={user}
          token={user?.token || ""}
          isEditing={isEditingConsultationFee}
          onEditToggle={() => setIsEditingConsultationFee(!isEditingConsultationFee)}
        />
      )}
    </View>
  );

  const renderSecurityTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <IdCard size={moderateScale(20)} color={COLORS.button} />
          <Text style={styles.cardTitle}>Password & Security</Text>
        </View>

        {/* Current Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Password *</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter current password"
              placeholderTextColor={COLORS.sub}
              secureTextEntry={!showOldPassword}
              value={passwordForm.oldPassword.value}
              onChangeText={(value) => handlePasswordChange("oldPassword", value)}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowOldPassword(!showOldPassword)}
            >
              {showOldPassword ? (
                <Eye size={18} color={COLORS.sub} />
              ) : (
                <EyeOff size={18} color={COLORS.sub} />
              )}
            </TouchableOpacity>
          </View>
          {passwordForm.oldPassword.showError && (
            <Text style={styles.errorText}>
              {passwordForm.oldPassword.message}
            </Text>
          )}
        </View>

        {/* New Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>New Password *</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter new password"
              placeholderTextColor={COLORS.sub}
              secureTextEntry={!showPassword}
              value={passwordForm.password.value}
              onChangeText={(value) => handlePasswordChange("password", value)}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
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

        {/* Confirm Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm password"
              placeholderTextColor={COLORS.sub}
              secureTextEntry={!showConfirmPassword}
              value={passwordForm.confirmPassword.value}
              onChangeText={(value) => handlePasswordChange("confirmPassword", value)}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <Eye size={18} color={COLORS.sub} />
              ) : (
                <EyeOff size={18} color={COLORS.sub} />
              )}
            </TouchableOpacity>
          </View>
          {passwordForm.confirmPassword.showError && (
            <Text style={styles.errorText}>
              {passwordForm.confirmPassword.message}
            </Text>
          )}
        </View>

        <View style={[styles.actionsRow, styles.bottomActionsMargin]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionPrimary]}
            onPress={debouncedPasswordSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionPrimaryText}>
                Update Password
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderActivityTab = () => (
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

        {logsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={COLORS.button} />
          </View>
        ) : editLogs?.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              No edit history available
            </Text>
          </View>
        ) : (
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
                const displayValue = getFieldDisplayValue(field, change);

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
          ))
        )}
      </View>
    </View>
  );

  const initials = `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase();
  const showSecurityTab = useMemo(
    () => user?.role && user?.role !== 10007,
    [user]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.bg }]}>
      <View style={styles.container}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                SPACING.xxl * 3 + (insets.bottom || SPACING.lg) + 100,
            },
          ]}
          enableOnAndroid
          extraScrollHeight={SPACING.xl}
          keyboardOpeningTime={0}
          showsVerticalScrollIndicator={false}
        >
          {/* Header / summary card */}
          <View style={styles.headerCard}>
            <View style={styles.avatarWrapper}>
              {profileImagePreview || user?.imageURL ? (
                <Image
                  source={{ uri: profileImagePreview || user?.imageURL }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials || ""}</Text>
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

              <View style={styles.infoRow}>
                <Calendar size={16} color={COLORS.sub} />
                <Text style={styles.infoText}>
                  {`Joined: ${formatDate(user?.addedOn)}`}
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
          {activeTab === "personal" && renderPersonalTab()}
          {activeTab === "security" && renderSecurityTab()}
          {activeTab === "activity" && renderActivityTab()}
        </KeyboardAwareScrollView>

        {/* Dialogs */}
        <ClearProfileDialog
          visible={clearProfileDialog}
          onClose={() => setClearProfileDialog(false)}
          onConfirm={handleClearProfileImage}
        />
        
        <ClearProfileDialog
          visible={clearHospitalDialog}
          onClose={() => setClearHospitalDialog(false)}
          onConfirm={handleClearHospitalLogo}
        />
      </View>
    </SafeAreaView>
  );
};

export default DoctorProfile;

/* ---------------- STYLES ---------------- */

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

  imageContainer: {
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraOverlayDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: 0.5,
  },
  cameraOverlayPlaceholder: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  imageTouchDisabled: {
    opacity: 0.75,
  },
  imagePlaceholderDisabled: {
    opacity: 0.6,
  },
  imageHintDisabled: {
    opacity: 0.6,
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
  simpleCircleImage: {
    width: responsiveWidth(36),
    height: responsiveWidth(36),
    maxWidth: 144,
    maxHeight: 144,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  simpleImageContainer: {
    position: 'relative',
  },
  simpleCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  simpleCirclePlaceholder: {
    width: responsiveWidth(36),
    height: responsiveWidth(36),
    maxWidth: 144,
    maxHeight: 144,
    borderRadius: 999,
    backgroundColor: COLORS.inputBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
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
  bottomActionsMargin: {
    marginBottom: SPACING.xxl * 2,
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
  imageContainerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBorder: {
    height: responsiveWidth(42),
    maxWidth: 168,
    maxHeight: 168,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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

  // Consultation Fee Styles
  consultationFeeContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  consultationFeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  feeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  consultationFeeTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  feeActionButtons: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  viewHistoryButton: {
    borderWidth: 1,
    borderColor: "#14b8a6",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  viewHistoryButtonText: {
    color: "#14b8a6",
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  editFeeButton: {
    backgroundColor: COLORS.button,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  editFeeButtonText: {
    color: "#fff",
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  currentFeeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#10b981",
    marginBottom: SPACING.md,
  },
  feeNotSetCard: {
    borderColor: "#9ca3af",
  },
  feeAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: "#166534",
    marginBottom: SPACING.sm,
  },
  feeUnit: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "400",
    color: "#6b7280",
  },
  feeDetails: {
    gap: SPACING.xs,
  },
  feeDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  feeDetailLabel: {
    fontSize: FONT_SIZE.sm,
    color: "#6b7280",
  },
  feeDetailValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: "#d1fae5",
  },
  statusInactive: {
    backgroundColor: "#fef3c7",
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  feeHistorySection: {
    marginBottom: SPACING.md,
  },
  feeHistoryTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  feeHistoryList: {
    maxHeight: 200,
  },
  feeHistoryItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  feeHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  feeHistoryAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: "#166534",
  },
  historyStatusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  feeHistoryDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  feeHistoryDetail: {
    fontSize: FONT_SIZE.xs,
    color: "#6b7280",
  },
  noHistoryContainer: {
    padding: SPACING.md,
    alignItems: "center",
  },
  noHistoryText: {
    fontSize: FONT_SIZE.sm,
    color: "#9ca3af",
  },
  feeInputSection: {
    marginBottom: SPACING.md,
  },
  feeInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  feeInputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
  },
  feeActions: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  feeActionButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 10,
    alignItems: "center",
  },
  feeResetButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  feeResetButtonText: {
    color: "#374151",
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  feeSaveButton: {
    backgroundColor: COLORS.button,
  },
  feeSaveButtonText: {
    color: "#fff",
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  // Dialog Styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  dialogContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: SPACING.md,
    width: "90%",
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  dialogMessage: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  dialogButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  dialogButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 10,
    alignItems: "center",
  },
  dialogButtonCancel: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  dialogButtonConfirm: {
    backgroundColor: "#ef4444",
  },
  dialogButtonTextCancel: {
    color: "#374151",
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  dialogButtonTextConfirm: {
    color: "#fff",
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: "center",
  },
});