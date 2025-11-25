// src/screens/appointments/AppointmentsListMobile.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import { convertTo12Hour, formatDate, formatDateTime } from "../../../utils/dateTime";
import { COLORS } from "../../../utils/colour";
import { AuthFetch, AuthPost, AuthPut } from "../../../auth/auth";
import { showError, showSuccess } from "../../../store/toast.slice";
import { Role_NAME } from "../../../utils/role";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONT_SIZE, responsiveHeight, responsiveWidth, SPACING } from "../../../utils/responsive";




type StatusType = "scheduled" | "completed" | "canceled";

type Props = {
  status: StatusType;
  title?: string;
};

type CurrentUserType = {
  token?: string;
  hospitalID?: number;
  id?: number;
};

type DoctorType = {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  doctorName?: string;
  userName?: string;
};

type AppointmentType = {
  id: number;
  doctorID?: number;
  departmentID?: number;
  doctorName?: string;
  services?: string;
  service?: string;
  pName?: string;
  PatientName?: string;
  patientID?: number;
  age?: number | string;
  gender?: string | number;
  mobileNumber?: string | number;
  email?: string;
  appointmentDate?: string;
  AppointmentDate?: string;
  timeSlot?: string;
  Time?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  canceledAt?: string | null;
};

type SlotResp = {
  id: number;
  fromTime: string;
  toTime: string;
  availableSlots: number;
  persons?: number;
  bookedIds?: unknown[];
};

const ROWS_PER_PAGE = 10;

const AppointmentsListMobile: React.FC<Props> = ({ status, title }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser) as CurrentUserType;

  // Filters
  const [filterDoctor, setFilterDoctor] = useState<number | "">("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Data
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);
  const [doctors, setDoctors] = useState<DoctorType[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name?: string }[]>(
    []
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Reschedule modal (only used for scheduled)
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [rescheduleRow, setRescheduleRow] = useState<AppointmentType | null>(
    null
  );
  const [rescheduledDate, setRescheduledDate] = useState<string>("");
  const [rescheduleDateObj, setRescheduleDateObj] = useState<Date | undefined>(
    undefined
  );
  const [availableSlots, setAvailableSlots] = useState<SlotResp[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [rescheduledTime, setRescheduledTime] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [noSlotsMessage, setNoSlotsMessage] = useState<string | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = useMemo(
    () => Math.ceil(appointments.length / ROWS_PER_PAGE) || 1,
    [appointments.length]
  );

  const paginatedAppointments = useMemo(
    () =>
      appointments.slice(
        (page - 1) * ROWS_PER_PAGE,
        page * ROWS_PER_PAGE
      ),
    [appointments, page]
  );

  const buildTitle = () =>
    title ??
    `${status.charAt(0).toUpperCase() + status.slice(1)} Appointments`;

  const buildDoctorDisplayName = (d?: DoctorType) => {
    if (!d) return "";
    const first =
      d.firstName ?? d.fullName ?? d.name ?? d.userName ?? d.doctorName ?? "";
    const last = d.lastName ? ` ${d.lastName}` : "";
    return (first + last).trim() || String(d.id);
  };

  const buildStatusDateLabel = (row: AppointmentType): string => {
    if (status === "completed" && row.completedAt) {
      return formatDateTime(row.completedAt);
    }
    if (status === "canceled" && row.canceledAt) {
      return formatDateTime(row.canceledAt);
    }
    const dateStr = row.appointmentDate || row.AppointmentDate || "";
    const timeStr = row.timeSlot || row.Time || "";
    const datePart = dateStr ? `${formatDate(dateStr)},` : "-";
    const timePart = timeStr ? convertTo12Hour(timeStr) : "";
    return `${datePart}${timePart ? ` ${timePart}` : ""}`;
  };

  // ------------------- API Calls -------------------

  const fetchDoctors = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem('token'));
    if (!token || !user?.hospitalID) return;
    try {
      const res = await AuthFetch(
        `user/${user?.hospitalID}/list/${Role_NAME?.doctor}`,
        token
      );

      if (res?.status === "success") {
        setDoctors(res.data?.users || []);
      }
    } catch (err) {
      dispatch(showError("Failed to load doctors"));
    }
  }, [user?.token, user?.hospitalID, dispatch]);

  const fetchDepartments = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem('token'));
    if (!token || !user?.hospitalID) return;
    try {
      const res = await AuthFetch(
        `department/${user.hospitalID}`,
        token
      );
      if (res?.status === "success") {
        setDepartments(res.data?.departments || []);
      }
    } catch (err) {
      dispatch(showError("Failed to load departments"));
    }
  }, [ user?.hospitalID, dispatch]);

  const fetchAppointments = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem('token'));
    if (!token || !user?.hospitalID) return;
    setLoading(true);
    setLocalError(null);

    try {
      const base =
        filterDoctor === "" || filterDoctor === null
          ? `appointment/${user.hospitalID}/getDoctorAppointmentsList?status=${status}`
          : `appointment/${user.hospitalID}/${filterDoctor}/getDoctorAppointmentsList?status=${status}`;

      const url = filterDate ? `${base}&date=${filterDate}` : base;
      const res = await AuthFetch(url, token);

      if (res?.status && res.data?.data) {
        setAppointments(res.data?.data || []);
      } else if (res?.status === "success" && res?.data?.appointments) {
        setAppointments(res.data?.appointments || []);
      } else if (Array.isArray(res)) {
        setAppointments(res as AppointmentType[]);
      } else {
        setAppointments([]);
      }
    } catch (err: any) {
      setLocalError(
        err?.message || "Failed to fetch appointments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.token, user?.hospitalID, filterDoctor, filterDate, status]);

  // initial fetches
  const didFetchDoctors = useRef(true);
  const didFetchDepartments = useRef(true);

  useEffect(() => {
    if (didFetchDoctors.current) {
      fetchDoctors();
      didFetchDoctors.current = false;
    }
  }, [fetchDoctors, user?.token]);

  useEffect(() => {
    if (didFetchDepartments.current && user?.token) {
      fetchDepartments();
      didFetchDepartments.current = false;
    }
  }, [fetchDepartments, user?.token]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ------------------- Actions (Scheduled only) -------------------

  const updateLocalStatus = (id: number, newStatus: string) => {
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const handleComplete = async (id: number) => {
    const token = user?.token ?? (await AsyncStorage.getItem('token'));
    if (status !== "scheduled" || !token) return;
    try {
      const res = await AuthPut(
        `patient/completeAppointment/${id}`,
        {},
        token
      );
      const isError = res?.status === "error";
      if (res.status === "success") {
        updateLocalStatus(id, "completed");
        await fetchAppointments();
        dispatch(showSuccess(res?.message || "Appointment marked completed"));
      } else {
        dispatch(showError(res?.message || "Failed to complete appointment"));
      }
    } catch (err: any) {
      dispatch(
        showError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to complete appointment"
        )
      );
    }
  };

  const handleCancel = async (id: number) => {
    const token = user?.token ?? (await AsyncStorage.getItem('token'));
    if (status !== "scheduled" || !token) return;
    try {
      const res = await AuthPut(
        `patient/cancelAppointment/${id}`,
        {},
        token
      );
      const isError = res?.status === "error";
      if (!isError) {
        updateLocalStatus(id, "canceled");
        await fetchAppointments();
        dispatch(showSuccess(res?.message || "Appointment canceled"));
      } else {
        dispatch(showError(res?.message || "Failed to cancel appointment"));
      }
    } catch (err: any) {
      dispatch(
        showError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to cancel appointment"
        )
      );
    }
  };

  const fetchSlotsForReschedule = async (dateStr: string) => {
    const token = user?.token ?? (await AsyncStorage.getItem('token'));
    if (status !== "scheduled") return;
    if (!token || !user?.hospitalID || !rescheduleRow) return;
    const doctorId = rescheduleRow.doctorID;
    if (!doctorId) return;

    setSlotLoading(true);
    setNoSlotsMessage(null);

    try {
      const res = await AuthFetch(
        `doctor/${user.hospitalID}/${doctorId}/${dateStr}/getDoctorAppointmentsSlotsByDate`,
        token
      );
      if (res?.status === "success") {
        const slots: SlotResp[] = (res.data.data || []).map((s: SlotResp) => ({
          id: s.id,
          fromTime: s.fromTime,
          toTime: s.toTime,
          availableSlots: s.availableSlots,
          persons: s.persons,
          bookedIds: s.bookedIds,
        }));
        const hasAvailable = slots.some(
          s => (s.availableSlots ?? 0) > 0
        );
        if (!hasAvailable) {
          setAvailableSlots([]);
          setNoSlotsMessage("No available slots for the selected date.");
        } else {
          setAvailableSlots(slots);
          setNoSlotsMessage(null);
        }
      } else {
        setAvailableSlots([]);
        setNoSlotsMessage("No available slots for the selected date.");
      }
    } catch {
      setAvailableSlots([]);
      setNoSlotsMessage("Failed to load slots. Try another date.");
    } finally {
      setSlotLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    const token = user?.token ?? (await AsyncStorage.getItem('token'));
    if (status !== "scheduled" || !rescheduleRow || !token) return;
    try {
      const body = {
        appointmentID: rescheduleRow.id,
        rescheduledDate,
        rescheduledTime,
        reason: rescheduleReason,
        patientID: rescheduleRow.patientID ?? null,
      };
      const res = await AuthPost(
        `appointment/${user.hospitalID}/rescheduleAppointment`,
        body,
        token
      );
      const isError = res?.status === "error";
      if (!isError) {
        dispatch(
          showSuccess(res?.message || "Appointment rescheduled successfully")
        );
        setRescheduleModalVisible(false);
        setRescheduleRow(null);
        setRescheduledDate("");
        setRescheduledTime("");
        setSelectedSlotId(null);
        setRescheduleReason("");
        setAvailableSlots([]);
        await fetchAppointments();
      } else {
        dispatch(
          showError(res?.message || "Requested slot is not available")
        );
      }
    } catch (err: any) {
      dispatch(
        showError(
          err?.response?.data?.message ||
            err?.message ||
            "Requested slot is not available"
        )
      );
    }
  };

  // ------------------- UI handlers -------------------

  const onFilterDatePick = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setFilterDate(`${yyyy}-${mm}-${dd}`);
      setPage(1);
    }
  };

  const onRescheduleDatePick = (event: any, date?: Date) => {
    if (Platform.OS === "android") setRescheduleDateObj(undefined);
    if (!date) return;

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    setRescheduledDate(dateStr);
    setSelectedSlotId(null);
    setRescheduledTime("");
    setAvailableSlots([]);
    fetchSlotsForReschedule(dateStr);
  };

  const openRescheduleModal = (row: AppointmentType) => {
    if (status !== "scheduled") return;
    setRescheduleRow(row);
    setRescheduleModalVisible(true);
    setRescheduledDate("");
    setRescheduledTime("");
    setSelectedSlotId(null);
    setRescheduleReason("");
    setAvailableSlots([]);
    setNoSlotsMessage(null);
    setRescheduleDateObj(new Date());
  };

  const closeRescheduleModal = () => {
    setRescheduleModalVisible(false);
    setRescheduleRow(null);
    setRescheduledDate("");
    setRescheduledTime("");
    setSelectedSlotId(null);
    setRescheduleReason("");
    setAvailableSlots([]);
    setNoSlotsMessage(null);
  };

  function formatGender(gender: string | number | undefined) {
    throw new Error("Function not implemented.");
  }

  // ------------------- Render -------------------

  return (
    <View style={styles.container}>
      {/* FILTERS */}
      <View style={styles.filterCard}>
        <Text style={styles.titleText}>{buildTitle()}</Text>

        {/* Doctor Filter */}
        <View style={styles.filterRow}>
          <View style={styles.filterCol}>
            <Text style={styles.label}>Doctor</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={filterDoctor}
                onValueChange={val => {
                  const newVal = val === "" ? "" : Number(val);
                  setFilterDoctor(newVal as any);
                  setPage(1);
                }}
                style={styles.picker}
              >
                <Picker.Item label="All Doctors" value="" />
                {doctors.map(d => (
                  <Picker.Item
                    key={d.id}
                    label={buildDoctorDisplayName(d)}
                    value={d.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Date Filter */}
          <View style={styles.filterCol}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {filterDate || "All dates"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Row: Refresh + Count */}
        <View style={styles.filterBottomRow}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              setFilterDoctor("");
              setFilterDate("");
              setPage(1);
            }}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>

          <Text style={styles.countText}>
            {`${buildTitle()} : ${appointments.length}`}
          </Text>
        </View>
      </View>

      {/* Date picker modal for filter */}
      {showDatePicker && (
        <DateTimePicker
          value={filterDate ? new Date(filterDate) : new Date()}
           mode="date"
                           display={Platform.OS === "android" ? "spinner" : "default"}
                            maximumDate={new Date()}
                           minimumDate={new Date(1900, 0, 1)}
          onChange={onFilterDatePick}
        />
      )}

      {/* LIST */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      )}

      {!loading && !!localError && (
        <Text style={styles.errorText}>{localError}</Text>
      )}

      {!loading && !localError && appointments.length === 0 && (
        <Text style={styles.emptyText}>
          No {status} appointments for selected filters.
        </Text>
      )}

      {!loading && !localError && appointments.length > 0 && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 16 + 60 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {paginatedAppointments.map(row => (
            <TouchableOpacity
              key={row.id}
              activeOpacity={0.9}
              style={styles.card}
              onPress={() =>
                setExpandedId(prev => (prev === row.id ? null : row.id))
              }
            >
              {/* Header Row */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>
                    {row.pName || row.PatientName || "Unknown"}
                  </Text>
                  <Text style={styles.doctorName}>
                    {row.doctorName || "-"}
                  </Text>
                </View>

                <View style={styles.headerRight}>
                  <Text style={styles.statusDateText}>
                    {buildStatusDateLabel(row)}
                  </Text>
                  <TouchableOpacity
                    style={styles.expandChip}
                    onPress={() =>
                      setExpandedId(prev => (prev === row.id ? null : row.id))
                    }
                  >
                    <Text style={styles.expandChipText}>
                      {expandedId === row.id ? "Hide" : "Details"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Actions only for SCHEDULED */}
              {status === "scheduled" && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.completeBtn]}
                    onPress={() => handleComplete(row.id)}
                  >
                    <Text style={styles.actionBtnText}>Completed</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rescheduleBtn]}
                    onPress={() => openRescheduleModal(row)}
                  >
                    <Text style={styles.actionBtnText}>Reschedule</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={() => handleCancel(row.id)}
                  >
                    <Text style={styles.actionBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Expanded details */}
              {expandedId === row.id && (
                <View style={styles.detailsBlock}>
                  {[
                    ["Appointment ID", row.id],
                    ["Patient ID", row.patientID ?? "-"],
                    ["Service", row.services || row.service || "-"],
                    [
                      "Created At",
                      row.createdAt ? formatDateTime(row.createdAt) : "-",
                    ],
                    [
                      "Department",
                      departments.find(d => d.id === row.departmentID)?.name ??
                        row.departmentID ??
                        "-",
                    ],
                    ["Age", row.age ?? "-"],
                    ["Gender", formatGender(row.gender)],
                    ["Mobile", row.mobileNumber ?? "-"],
                    ["Email", row.email ?? "-"],
                    ...(status === "completed"
                      ? [
                          [
                            "Completed At",
                            row.completedAt
                              ? formatDateTime(row.completedAt)
                              : "-",
                          ] as [string, string],
                        ]
                      : []),
                    ...(status === "canceled"
                      ? [
                          [
                            "Canceled At",
                            row.canceledAt
                              ? formatDateTime(row.canceledAt)
                              : "-",
                          ] as [string, string],
                        ]
                      : []),
                    ["Status", row.status ?? status],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{label}</Text>
                      <Text style={styles.detailColon}>:</Text>
                      <Text style={styles.detailValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  page === 1 && styles.pageBtnDisabled,
                ]}
                disabled={page === 1}
                onPress={() => setPage(p => Math.max(1, p - 1))}
              >
                <Text style={styles.pageBtnText}>Prev</Text>
              </TouchableOpacity>

              <Text style={styles.pageInfo}>
                Page {page} of {totalPages}
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  page === totalPages && styles.pageBtnDisabled,
                ]}
                disabled={page === totalPages}
                onPress={() =>
                  setPage(p => Math.min(totalPages, p + 1))
                }
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* RESCHEDULE MODAL (only for scheduled) */}
      {status === "scheduled" && (
        <Modal
          visible={rescheduleModalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeRescheduleModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>

              {/* Date picker */}
              <Text style={styles.modalLabel}>Rescheduled Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() =>
                  setRescheduleDateObj(
                    rescheduledDate ? new Date(rescheduledDate) : new Date()
                  )
                }
              >
                <Text style={styles.dateButtonText}>
                  {rescheduledDate || "Select date"}
                </Text>
              </TouchableOpacity>

              {rescheduleDateObj && (
                <DateTimePicker
                  value={rescheduleDateObj}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onRescheduleDatePick}
                />
              )}

              {/* Slots */}
              {slotLoading && (
                <View style={{ marginVertical: 8 }}>
                  <ActivityIndicator color={COLORS.brand} />
                </View>
              )}

              {rescheduledDate && !slotLoading && (
                <>
                  <Text style={[styles.modalLabel, { marginTop: 12 }]}>
                    Select Time Slot
                  </Text>

                  {availableSlots.length > 0 ? (
                    <ScrollView
                      style={{ maxHeight: 160 }}
                      contentContainerStyle={{ paddingVertical: 4 }}
                    >
                      {availableSlots
                        .slice()
                        .sort((a, b) =>
                          a.fromTime.localeCompare(b.fromTime)
                        )
                        .map(slot => {
                          const personsCount =
                            slot.persons ??
                            (slot.bookedIds ? slot.bookedIds.length : 0);
                          const remaining = Math.max(
                            0,
                            (slot.availableSlots ?? 0) - personsCount
                          );
                          const isSelected = selectedSlotId === slot.id;

                          return (
                            <TouchableOpacity
                              key={slot.id}
                              style={[
                                styles.slotChip,
                                isSelected && styles.slotChipSelected,
                                remaining === 0 && styles.slotChipDisabled,
                              ]}
                              onPress={() => {
                                if (remaining <= 0) return;
                                setSelectedSlotId(slot.id);
                                setRescheduledTime(slot.fromTime);
                              }}
                            >
                              <Text
                                style={[
                                  styles.slotChipText,
                                  isSelected && {
                                    color: "#fff",
                                  },
                                ]}
                              >
                                {convertTo12Hour(slot.fromTime)} -{" "}
                                {convertTo12Hour(slot.toTime)}
                              </Text>
                              <Text
                                style={[
                                  styles.slotChipSub,
                                  isSelected && { color: "#e6fff7" },
                                ]}
                              >
                                {remaining} slots
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  ) : (
                    !!noSlotsMessage && (
                      <Text style={styles.noSlotsText}>{noSlotsMessage}</Text>
                    )
                  )}
                </>
              )}

              {/* Reason */}
              <Text style={[styles.modalLabel, { marginTop: 12 }]}>
                Reason
              </Text>
              <TextInput
                style={styles.reasonInput}
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                multiline
                placeholder="Enter reschedule reason"
                placeholderTextColor={COLORS.placeholder}
              />

              {/* Modal Actions */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={closeRescheduleModal}
                >
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.modalSubmitBtn,
                    (!selectedSlotId || !rescheduledDate) &&
                      styles.modalSubmitDisabled,
                  ]}
                  disabled={!selectedSlotId || !rescheduledDate}
                  onPress={handleRescheduleSubmit}
                >
                  <Text style={styles.modalSubmitText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
};

export default AppointmentsListMobile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg ?? "#f3f4f6",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
  },

  filterCard: {
    margin: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: SPACING.xs,
    elevation: 2,
  },
  titleText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: "#111827",
    marginBottom: SPACING.xs,
  },
  filterRow: {
    flexDirection: "row",
    marginTop: SPACING.xs * 0.5,
  },
  filterCol: {
    flex: 1,
    marginRight: SPACING.xs * 0.75,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: SPACING.xs * 0.5,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: SPACING.sm,
    overflow: "hidden",
    height: responsiveHeight(5.5),
    justifyContent: "center",
  },
  picker: {
    height: responsiveHeight(6),
    width: "100%",
    color: "black",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: SPACING.sm,
    height: responsiveHeight(5.5),
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
  },
  dateButtonText: {
    fontSize: FONT_SIZE.md,
    color: "#111827",
  },
  filterBottomRow: {
    marginTop: SPACING.xs * 1.25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  refreshButton: {
    paddingVertical: SPACING.xs * 0.75,
    paddingHorizontal: SPACING.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#e0f2fe",
  },
  refreshText: {
    color: "#0369a1",
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
  },
  countText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    color: "#111827",
  },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
    color: "#b91c1c",
    fontSize: FONT_SIZE.sm,
  },
  emptyText: {
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
    color: "#6b7280",
    fontSize: FONT_SIZE.sm,
  },

  card: {
    borderRadius: SPACING.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: SPACING.sm,
    marginBottom: SPACING.xs * 1.25,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: SPACING.xs,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  patientName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: "#111827",
  },
  doctorName: {
    marginTop: SPACING.xs * 0.4,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#059669",
  },
  headerRight: {
    alignItems: "flex-end",
    marginLeft: SPACING.xs,
  },
  statusDateText: {
    fontSize: FONT_SIZE.xs * 0.9,
    color: "#6b7280",
    marginBottom: SPACING.xs * 0.5,
    textAlign: "right",
  },
  expandChip: {
    borderRadius: 999,
    paddingVertical: SPACING.xs * 0.5,
    paddingHorizontal: SPACING.sm,
    backgroundColor: "#eff6ff",
  },
  expandChipText: {
    fontSize: FONT_SIZE.xs * 0.9,
    fontWeight: "600",
    color: "#1d4ed8",
  },

  actionsRow: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: SPACING.xs * 0.3,
    borderRadius: 999,
    paddingVertical: SPACING.xs * 0.75,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: "#ffffff",
  },
  completeBtn: {
    backgroundColor: "#059669",
  },
  rescheduleBtn: {
    backgroundColor: "#0ea5e9",
  },
  cancelBtn: {
    backgroundColor: "#dc2626",
  },

  detailsBlock: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: SPACING.xs * 0.5,
    alignItems: "center",
  },
  detailLabel: {
    width: responsiveWidth(30),
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: "#111827",
  },
  detailColon: {
    width: responsiveWidth(3),
    textAlign: "center",
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: "#111827",
  },
  detailValue: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: "#4b5563",
  },

  paginationRow: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm * 0.8,
  },
  pageBtn: {
    borderRadius: 999,
    paddingVertical: SPACING.xs * 0.75,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#e0f2fe",
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#0369a1",
  },
  pageInfo: {
    fontSize: FONT_SIZE.sm,
    color: "#111827",
    fontWeight: "500",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  modalCard: {
    borderRadius: SPACING.md,
    backgroundColor: "#ffffff",
    padding: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: "#111827",
    marginBottom: SPACING.xs,
  },
  modalLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#4b5563",
    marginTop: SPACING.xs * 0.75,
    marginBottom: SPACING.xs * 0.5,
  },
  slotChip: {
    paddingVertical: SPACING.xs * 0.75,
    paddingHorizontal: SPACING.sm,
    backgroundColor: "#f9fafb",
    borderRadius: SPACING.sm,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: SPACING.xs * 0.75,
  },
  slotChipSelected: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  slotChipDisabled: {
    opacity: 0.4,
  },
  slotChipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: "#111827",
  },
  slotChipSub: {
    fontSize: FONT_SIZE.xs * 0.9,
    color: "#16a34a",
    marginTop: SPACING.xs * 0.4,
  },
  noSlotsText: {
    fontSize: FONT_SIZE.xs,
    color: "#b91c1c",
    marginTop: SPACING.xs * 0.5,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: SPACING.sm,
    padding: SPACING.sm,
    minHeight: responsiveHeight(10),
    fontSize: FONT_SIZE.sm,
    textAlignVertical: "top",
    color: "#111827",
  },
  modalActionsRow: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.xs,
  },
  modalBtn: {
    borderRadius: 999,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  modalCancelBtn: {
    backgroundColor: "#f3f4f6",
  },
  modalSubmitBtn: {
    backgroundColor: "#059669",
  },
  modalSubmitDisabled: {
    backgroundColor: "#9ca3af",
  },
  modalCancelText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#111827",
  },
  modalSubmitText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: "#ffffff",
  },
});

