// src/screens/appointments/BookAppointment.tsx

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { departmentType, doctorAppointmentDetailType, staffType } from "../../../utils/types";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { showError, showSuccess } from "../../../store/toast.slice";
import { Role_NAME } from "../../../utils/role";
import { COLORS } from "../../../utils/colour";
import { FONT_SIZE, SPACING } from "../../../utils/responsive";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";

// import { RootState } from "../../store/store";
// import { AuthFetch, AuthPost } from "../../auth/auth";
// import { Role_NAME } from "../../utils/role";
// import {
//   departmentType,
//   staffType,
//   doctorAppointmentDetailType,
// } from "../../utils/types";
// import { selectCurrAppointmentData } from "../../store/appointment/currentAppointment.selector";
// import { selectCurrentUser } from "../../store/user/user.selector";
// import { showError, showSuccess } from "../../store/toast.slice";
// import { COLORS } from "../../utils/colour";
// import { SPACING, FONT_SIZE } from "../../utils/responsive";

interface SlotInfo {
  id: number;
  fromTime: string;
  toTime: string;
  availableSlots: number;
  persons?: number;
  bookedIds?: unknown[];
}

const genderList = [
  { value: "Male", key: 1 },
  { value: "Female", key: 2 },
  { value: "Others", key: 3 },
];

const convertTo12HourFormat = (time: string) => {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr || "0", 10);
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${suffix}`;
};

const BookAppointment: React.FC = () => {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);
//   const rescheduleAppointmentData = useSelector(selectCurrAppointmentData);

  const [gender, setGender] = useState<number>(0);
  const [rescheduleActive, setRescheduleActive] = useState(false);

  const [departments, setDepartments] = useState<departmentType[]>([]);
  const [doctorList, setDoctorList] = useState<staffType[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<staffType[]>([]);

  const [selectedDoctorID, setSelectedDoctorID] = useState<number | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [noSlotsPopup, setNoSlotsPopup] = useState(false);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [appointmentFormData, setAppointmentFormData] =
    useState<doctorAppointmentDetailType>({
      department: { valid: false, value: -1, showError: false, message: "" },
      doctorName: { valid: true, value: -1, showError: false, message: "" },
      services: { valid: false, value: "", showError: false, message: "" },
      gender: { valid: false, value: -1, showError: false, message: "" },
      pName: { valid: false, value: "", showError: false, message: "" },
      age: { valid: false, value: "", showError: false, message: "" },
      date: { valid: false, value: "", showError: false, message: "" },
      timeSlot: { valid: false, value: null, showError: false, message: "" },
      mobileNumber: { valid: false, value: "", showError: false, message: "" },
      email: { valid: false, value: "", showError: false, message: "" },
      departmentID: {
        valid: false,
        value: null,
        showError: false,
        message: "",
      },
    });

  const didInitRef = useRef(true);

  // Fetch departments and doctors once
  useEffect(() => {
    const getAllDepartment = async () => {
      try {
         const token = user?.token ?? (await AsyncStorage.getItem('token'));
        const response = await AuthFetch(
          `department/${user?.hospitalID}`,
          token
        );
        if (response?.status === "success") {
          setDepartments(response?.data?.departments || response.data?.departments || []);
        }
      } catch (err) {
        dispatch(showError("Failed to load departments"));
      }
    };

    const getDocList = async () => {
      try {
         const token = user?.token ?? (await AsyncStorage.getItem('token'));
        const doctorResponse = await AuthFetch(
          `user/${user?.hospitalID}/list/${Role_NAME.doctor}`,
          token
        );
        if (doctorResponse?.status === "success") {
          const docs = doctorResponse?.users || doctorResponse.data?.users || [];
          setDoctorList(docs);
          setFilteredDoctors(docs);
        }
      } catch (err) {
        dispatch(showError("Failed to load doctors"));
      }
    };

    if (didInitRef.current  && user?.hospitalID) {
      didInitRef.current = false;
      getAllDepartment();
      getDocList();
    }
  }, [user, user?.hospitalID, dispatch]);

  // Handle select changes (department / doctor / services)
  const updateField = (name: keyof doctorAppointmentDetailType, value: any) => {
    setAppointmentFormData((prev: any) => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        valid: true,
        showError: false,
        message: "",
      },
    }));
  };

  const handleDepartmentChange = (value: number) => {
    const departmentID = Number(value);
    const filtered = doctorList.filter((doc) => doc.departmentID === departmentID);
    setFilteredDoctors(filtered);
    updateField("department", departmentID);
    setAppointmentFormData((prev: any) => ({
      ...prev,
      departmentID: {
        ...prev.departmentID,
        value: departmentID,
        valid: true,
        showError: false,
      },
    }));
  };

  const handleDoctorChange = (value: number) => {
    const doctorID = Number(value);
    setSelectedDoctorID(doctorID);
    setAvailableSlots([]);
    setSelectedDate(null);
    updateField("doctorName", doctorID);
  };

  const handleServiceChange = (value: string) => {
    updateField("services", value);
  };

  // Gender chips
  const handleClickGender = (label: string) => {
    let genderValue: number;
    if (label === "Male") genderValue = 1;
    else if (label === "Female") genderValue = 2;
    else genderValue = 3;

    setGender(genderValue);
    setAppointmentFormData((prevFormData: any) => ({
      ...prevFormData,
      gender: {
        value: genderValue,
        name: "gender",
        message: "",
        valid: true,
        showError: false,
      },
    }));
  };

  // Inputs
  const handleTextChange = (name: keyof doctorAppointmentDetailType, value: string) => {
    let isvalid = true;
    const showError = false;
    let message = "This field is required";
    let finalValue: string | number = value;

    const nameregex = /^[A-Za-z\s]*$/;

    if (name === "pName") {
      if (nameregex.test(value) && value.length < 50) {
        finalValue = value;
      } else {
        return;
      }
    } else if (name === "mobileNumber") {
      finalValue = value.replace(/\D/g, "").slice(0, 10);
    }

    setAppointmentFormData((prev: any) => ({
      ...prev,
      [name]: {
        ...prev[name],
        valid: isvalid,
        showError,
        value: finalValue,
        message,
      },
    }));
  };

  const resetAppointmentForm = () => {
    setSelectedDate(null);
    setAvailableSlots([]);

    setAppointmentFormData({
      department: { valid: false, value: -1, showError: false, message: "" },
      doctorName: { valid: true, value: -1, showError: false, message: "" },
      services: { valid: false, value: "", showError: false, message: "" },
      gender: { valid: false, value: -1, showError: false, message: "" },
      pName: { valid: false, value: "", showError: false, message: "" },
      age: { valid: false, value: "", showError: false, message: "" },
      date: { valid: false, value: "", showError: false, message: "" },
      timeSlot: { valid: false, value: null, showError: false, message: "" },
      mobileNumber: { valid: false, value: "", showError: false, message: "" },
      email: { valid: false, value: "", showError: false, message: "" },
      departmentID: {
        valid: false,
        value: null,
        showError: false,
        message: "",
      },
    });
  };

  const fetchSlots = useCallback(
    async (date: Date) => {
        const token = user?.token ?? (await AsyncStorage.getItem('token'));
      if (!selectedDoctorID || !user?.hospitalID || !token) return;

      const formattedDate = dayjs(date).format("YYYY-MM-DD");
      setLoadingSlots(true);
      try {
        const response = await AuthFetch(
          `doctor/${user?.hospitalID}/${selectedDoctorID}/${formattedDate}/getDoctorAppointmentsSlotsByDate`,
          token
        );
        if (response?.status === "success") {
          const slots: SlotInfo[] =
            response?.data?.data?.map((slot: any) => ({
              id: slot.id,
              fromTime: slot.fromTime,
              toTime: slot.toTime,
              availableSlots: slot.availableSlots,
              persons: slot.persons ?? slot.personsCount ?? undefined,
              bookedIds: slot.bookedIds ?? undefined,
            })) || [];

          const hasAvailableSlot = slots.some(
            (s: SlotInfo) => s.availableSlots > 0
          );

          if (!hasAvailableSlot) {
            setAvailableSlots([]);
            setNoSlotsPopup(true);
          } else {
            setAvailableSlots(slots);
            setNoSlotsPopup(false);
          }
        } else {
          setAvailableSlots([]);
          setNoSlotsPopup(true);
        }
      } catch (err) {
        setAvailableSlots([]);
        setNoSlotsPopup(true);
      } finally {
        setLoadingSlots(false);
      }
    },
    [selectedDoctorID, user?.hospitalID, user?.token]
  );

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setAppointmentFormData((prev: any) => ({
        ...prev,
        date: {
          ...prev.date,
          value: dayjs(date).format("YYYY-MM-DD"),
          valid: true,
          showError: false,
        },
      }));
      fetchSlots(date);
    }
  };

  const handleSlotSelect = (slot: SlotInfo) => {
    const personsCount = slot.persons ?? (slot.bookedIds ? slot.bookedIds.length : 0);
    const remaining = Math.max(0, (slot.availableSlots ?? 0) - personsCount);
    if (remaining <= 0) return;

    setAppointmentFormData((prev: any) => ({
      ...prev,
      timeSlot: {
        ...prev.timeSlot,
        value: slot,
        valid: true,
        showError: false,
        message: "",
      },
    }));
  };

  const handleSubmitAppointment = async () => {
    if (!user) {
      dispatch(showError("User not found"));
      return;
    }
    if (!selectedDate) {
      dispatch(showError("Please select appointment date"));
      return;
    }

    const reqBody: Record<string, unknown> = {
      departmentID: appointmentFormData.department.value,
      doctorID: appointmentFormData.doctorName.value,
      service: appointmentFormData.services.value,
      timeSlot:
        (appointmentFormData.timeSlot.value &&
          (appointmentFormData.timeSlot.value as any).fromTime) ||
        (appointmentFormData.timeSlot.value as any as string) ||
        "",
      patientName: appointmentFormData.pName.value,
      age: Number(appointmentFormData.age.value),
      gender: appointmentFormData.gender.value,
      mobileNumber: appointmentFormData.mobileNumber.value,
      email: appointmentFormData.email.value,
      appointmentDate: dayjs(selectedDate).format("YYYY-MM-DD"),
      bookedBy: user.id,
    };

    const selectedDoctor = filteredDoctors.find(
      (doc) => doc.id === appointmentFormData.doctorName.value
    );
    if (selectedDoctor) {
      const first = selectedDoctor.firstName || "";
      const last = selectedDoctor.lastName || "";
      const full = `${first} ${last}`.trim();
      (reqBody as any).doctorName = full;
    }
 const token = user?.token ?? (await AsyncStorage.getItem('token'));
    try {
      setSubmitting(true);
      const res = await AuthPost(
        `appointment/${user?.hospitalID}/createAppointment`,
        reqBody,
        token
      );
      setSubmitting(false);
if (res?.status === "success"){
    dispatch(showSuccess("Appointment booked successfully"));
}
      else {
        dispatch(showError(res?.data?.message || "Unable to book appointment"));
        return;
      }
      resetAppointmentForm();
    } catch (err) {
      setSubmitting(false);
      dispatch(
        showError("Something went wrong while booking appointment")
      );
    }
  };

  const selectedTimeSlot = appointmentFormData.timeSlot.value;


const debouncedSubmit = useMemo(
    () => debounce(handleSubmitAppointment, DEBOUNCE_DELAY),
    [handleSubmitAppointment]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrap}>
        <Text style={styles.title}>Select Appointment Schedule</Text>
        <Text style={styles.subtitle}>
          Book or reschedule patient appointments in a few taps.
        </Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Patient Name / Age */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Patient Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter patient name"
              placeholderTextColor={COLORS.placeholder}
              value={String(appointmentFormData.pName.value || "")}
              onChangeText={(text) => handleTextChange("pName", text)}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter age"
              placeholderTextColor={COLORS.placeholder}
              value={String(appointmentFormData.age.value || "")}
              keyboardType="numeric"
              onChangeText={(text) => handleTextChange("age", text)}
            />
          </View>
        </View>

        {/* Mobile / Email */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="phone-pad"
              maxLength={10}
              value={String(appointmentFormData.mobileNumber.value || "")}
              onChangeText={(text) => handleTextChange("mobileNumber", text)}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Email ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="example@domain.com"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="email-address"
              value={String(appointmentFormData.email.value || "")}
              onChangeText={(text) => handleTextChange("email", text)}
            />
          </View>
        </View>

        {/* Gender chips */}
        <View style={styles.block}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.chipRow}>
            {genderList.map((el) => {
              const isSelected = appointmentFormData.gender.value === el.key;
              return (
                <TouchableOpacity
                  key={el.key}
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    isSelected && styles.chipActive,
                  ]}
                  onPress={() => handleClickGender(el.value)}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      isSelected && styles.chipLabelActive,
                    ]}
                  >
                    {el.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Services */}
        <View style={styles.block}>
          <Text style={styles.label}>Service *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={appointmentFormData.services.value || ""}
              onValueChange={handleServiceChange}
              style={styles.picker}
            >
              <Picker.Item label="Select Service" value="" />
              <Picker.Item label="Consultation" value="Consultation" />
              <Picker.Item label="Routine Checkup" value="Routine Checkup" />
              <Picker.Item label="Emergency" value="Emergency" />
              <Picker.Item label="Follow-Up" value="Follow-Up" />
            </Picker>
          </View>
        </View>

        {/* Department & Doctor */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Department *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={
                  appointmentFormData.department.value === -1
                    ? 0
                    : appointmentFormData.department.value
                }
                onValueChange={(val) => {
                  if (!val) return;
                  handleDepartmentChange(Number(val));
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select Department" value={0} />
                {departments.map((dept) => (
                  <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>Doctor *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={
                  appointmentFormData.doctorName.value === -1
                    ? 0
                    : appointmentFormData.doctorName.value
                }
                onValueChange={(val) => {
                  if (!val) return;
                  handleDoctorChange(Number(val));
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select Doctor" value={0} />
                {filteredDoctors.length > 0 ? (
                  filteredDoctors.map((doctor) => (
                    <Picker.Item
                      key={doctor.id}
                      label={`${doctor.firstName} ${doctor.lastName || ""}`}
                      value={doctor.id}
                    />
                  ))
                ) : (
                  <Picker.Item
                    label="No doctors available"
                    value={0}
                  />
                )}
              </Picker>
            </View>
          </View>
        </View>

        {/* Date Picker */}
        {selectedDoctorID && (
          <View style={styles.block}>
            <Text style={styles.label}>Select Date *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              activeOpacity={0.8}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {selectedDate
                  ? dayjs(selectedDate).format("DD MMM YYYY")
                  : "Tap to select appointment date"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </View>
        )}

        {/* Slots */}
        <View style={styles.block}>
          <Text style={styles.label}>Select Time Slot</Text>
          {loadingSlots && (
            <View style={styles.centerRow}>
              <ActivityIndicator color={COLORS.brand} />
              <Text style={styles.loadingText}>Loading slots...</Text>
            </View>
          )}

          {!loadingSlots && availableSlots.length === 0 && selectedDoctorID && selectedDate && (
            <Text style={styles.helperText}>
              No available slots for selected date.
            </Text>
          )}

          <View style={styles.slotGrid}>
            {availableSlots
              .slice()
              .sort((a, b) => a.fromTime.localeCompare(b.fromTime))
              .map((slot) => {
                const isSelected =
                  typeof selectedTimeSlot === "object" &&
                  selectedTimeSlot !== null &&
                  "id" in (selectedTimeSlot as any) &&
                  (selectedTimeSlot as any).id === slot.id;

                const personsCount =
                  slot.persons ?? (slot.bookedIds ? slot.bookedIds.length : 0);
                const remaining = Math.max(
                  0,
                  (slot.availableSlots ?? 0) - personsCount
                );

                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.slotChip,
                      isSelected && styles.slotChipActive,
                      remaining <= 0 && styles.slotChipDisabled,
                    ]}
                    activeOpacity={remaining > 0 ? 0.8 : 1}
                    onPress={() => handleSlotSelect(slot)}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        isSelected && styles.slotTextActive,
                      ]}
                    >
                      {convertTo12HourFormat(slot.fromTime)} -{" "}
                      {convertTo12HourFormat(slot.toTime)}
                    </Text>
                    <Text
                      style={[
                        styles.slotSub,
                        isSelected && styles.slotSubActive,
                      ]}
                    >
                      {remaining} Slots Available
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            rescheduleActive && { backgroundColor: "#0ea5e9" },
          ]}
          activeOpacity={0.85}
          onPress={debouncedSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {rescheduleActive ? "Reschedule" : "Submit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* No slots Modal */}
      <Modal
        visible={noSlotsPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setNoSlotsPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Slots Unavailable</Text>
            <Text style={styles.modalBody}>
              We are sorry, the doctor is not available at this time.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setNoSlotsPopup(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BookAppointment;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
  },
  headerWrap: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  row: {
    flexDirection: "row",
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  col: {
    flex: 1,
    paddingHorizontal: SPACING.xs,
  },

  block: {
    marginBottom: SPACING.md,
  },

  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.sub,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: "#f9fafb",
  },

  pickerContainer: {
    borderWidth: 1.5,
    borderRadius: 12,
    borderColor: COLORS.border,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
  },
  picker: {
    height: 50,
    width: "100%",
    color: "black"
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  chipLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  chipLabelActive: {
    color: "#ffffff",
  },

  dateButton: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    borderColor: COLORS.brand,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#ecfeff",
  },
  dateText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },

  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  loadingText: {
    marginLeft: 8,
    color: COLORS.sub,
    fontSize: FONT_SIZE.sm,
  },
  helperText: {
    marginTop: 4,
    color: COLORS.sub,
    fontSize: FONT_SIZE.sm,
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -SPACING.xs,
    marginTop: SPACING.xs,
  },
  slotChip: {
    width: "48%",
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.xs,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: "#cbd5f5",
    backgroundColor: "#eef2ff",
  },
  slotChipActive: {
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
  },
  slotChipDisabled: {
    opacity: 0.4,
  },
  slotText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
  },
  slotTextActive: {
    color: "#ffffff",
  },
  slotSub: {
    fontSize: FONT_SIZE.xs,
    color: "#16a34a",
    textAlign: "center",
    marginTop: 2,
  },
  slotSubActive: {
    color: "#dcfce7",
  },

  submitButton: {
    marginTop: SPACING.md,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: COLORS.brand,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: "#ffffff",
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "82%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  modalButton: {
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  modalButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
