import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Alert,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { AuthFetch, AuthPost, AuthDelete } from "../../../auth/auth";
import {
  formatDate,
  convertTo12Hour,
} from "../../../utils/dateTime";
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  LeaveIcon,
} from "../../../utils/SvgIcons";
import CalendarModal from "./CalendarModal";
import SlotModal from "./SlotModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trash2 } from "lucide-react-native";
import { useDispatch } from "react-redux";
import { showSuccess, showError } from "../../../store/toast.slice";

const { width: screenWidth } = Dimensions.get("window");

// Types
interface Slot {
  id: number;
  scheduleID: number;
  date: string;
  fromTime: string;
  toTime: string;
  availableSlots: number;
  persons: number;
  bookedIds: number[];
  addedOn: string;
  updatedOn: string;
  dayToggles: Record<string, any>;
  shiftFromTime: string;
  shiftToTime: string;
}

interface Leave {
  id: number;
  leaveType: string;
  fromDate: string;
  toDate: string;
}

interface ScheduleData {
  date: string;
  shiftFromTime: string;
  shiftToTime: string;
  dayToggles: Record<string, any>;
  addedBy: string;
  doctorID: string;
  slots: Slot[];
}

interface ApiResponse {
  message: string;
  data: {
    slots: Slot[];
    leaves: Leave[];
  };
}

// Selector function for current user
const selectCurrentUser = (state: RootState) => state.currentUser;

const SlotsManagement: React.FC = () => {
  const dispatch = useDispatch();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);

  const user = useSelector(selectCurrentUser);

  // Fetch slots and leaves data - GET API
  const fetchSlots = async () => {
    setLoading(true);
    setError(null);

    try {
      const hospitalID = user?.hospitalID;
      const doctorID = user?.id;
      const token = await AsyncStorage.getItem("token");

      if (!hospitalID || !doctorID) {
        throw new Error("Hospital ID or Doctor ID not found");
      }

      const url = `doctor/${hospitalID}/${doctorID}/getDoctorAppointmentsSlotsFromCurrentDate`;

      const response = await AuthFetch(url, token);

      if (response?.data?.message !== "Success") {
        throw new Error(response?.data?.message || "Failed to fetch data");
      }

      // Set slots and leaves from API response
      setSlots(response?.data?.data?.slots || []);
      setLeaves(response?.data?.data?.leaves || []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch slots data");
      // Set empty arrays on error
      setSlots([]);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if selected date is on leave
  const isDateOnLeave = (date: Date): Leave | null => {
    const dateStr = formatDateToYYYYMMDD(date);

    for (const leave of leaves) {
      const fromDate = new Date(leave.fromDate);
      const toDate = new Date(leave.toDate);
      const checkDate = new Date(dateStr);

      // Check if the date falls within the leave range
      if (checkDate >= fromDate && checkDate <= toDate) {
        return leave;
      }
    }

    return null;
  };

  // Create new slots - POST API
  const createSlots = async (slotData: any) => {
    setCreating(true);
    setCreateError(null);
    setError(null);

    try {
      const token = await AsyncStorage.getItem("token");
      const hospitalID = user?.hospitalID;
      const doctorID = user?.id;

      if (!hospitalID || !doctorID) {
        throw new Error("Hospital ID or Doctor ID not found");
      }

      // Check if the selected date is on leave
      const selectedDate = new Date(slotData.date);
      const leaveInfo = isDateOnLeave(selectedDate);
      if (leaveInfo) {
        throw new Error(
          `Doctor is on leave (${leaveInfo.leaveType}) from ${formatDate(
            leaveInfo.fromDate
          )} to ${formatDate(leaveInfo.toDate)}. Cannot create schedule on ${formatDate(
            slotData.date
          )}.`
        );
      }

      const scheduleData: ScheduleData[] = [
        {
          date: slotData.date,
          shiftFromTime: `${slotData.shiftFromTime}:00`,
          shiftToTime: `${slotData.shiftToTime}:00`,
          dayToggles: {},
          addedBy: doctorID,
          doctorID: doctorID,
          slots: generateTimeSlotsWithDate(slotData),
        },
      ];

      const url = `doctor/${hospitalID}/doctorAppointmentSchedule`;

      const response = await AuthPost(url, { data: scheduleData }, token);

      if (response?.status === "error") {
        throw new Error(response?.message);
      }

      await fetchSlots();
      dispatch(showSuccess("Slots created successfully"));
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to create slots";
      setCreateError(errorMessage);
      setError(errorMessage);
      dispatch(showError(errorMessage));
    } finally {
      setCreating(false);
      setShowSlotModal(false);
    }
  };

  const generateTimeSlotsWithDate = (slotData: any) => {
    const slotsArr = [];
    const start = parseInt(slotData.shiftFromTime?.split(":")?.[0] ?? "0");
    const end = parseInt(slotData.shiftToTime?.split(":")?.[0] ?? "0");

    for (let i = start; i < end; i++) {
      slotsArr.push({
        date: slotData.date,
        fromTime: `${i.toString().padStart(2, "0")}:00:00`,
        toTime: `${(i + 1).toString().padStart(2, "0")}:00:00`,
        availableSlots: parseInt(slotData.availableSlots ?? "0"),
        persons: 0,
        bookedIds: [],
      });
    }
    return slotsArr;
  };

  // Delete single slot
  const deleteSlot = async (slot: Slot) => {
    Alert.alert("Delete Slot", "Are you sure you want to delete this slot?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(slot.id);
          setError(null);

          try {
            const token = await AsyncStorage.getItem("token");
            const hospitalID = user?.hospitalID;
            const doctorID = user?.id;

            if (!hospitalID || !doctorID) {
              throw new Error("Hospital ID or Doctor ID not found");
            }

            let url;
            if (slot.fromTime && slot.toTime) {
              url = `doctor/${hospitalID}/${doctorID}/${slot.date}/deleteDoctorAppointmentSlot?fromTime=${slot.fromTime}`;
            } else {
              url = `doctor/${hospitalID}/${doctorID}/${slot.date}/deleteDoctorAppointmentSlot`;
            }

            const response = await AuthDelete(url, token);

            if (response?.status === "error") {
              throw new Error(response?.message);
            }

            setRefreshTrigger((prev) => prev + 1);
            dispatch(showSuccess("Slot deleted successfully"));
          } catch (err: any) {
            setError(err?.message || "Failed to delete slot");
            dispatch(showError(err?.message || "Failed to delete slot"));
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  // Delete all slots for selected date
  const deleteAllSlotsForDate = async () => {
    const selectedDateStr = formatDateToYYYYMMDD(currentDate);
    const slotsForDate = getSlotsForSelectedDate();

    if (slotsForDate.length === 0) {
      dispatch(showError("No slots to delete for selected date"));
      return;
    }

    Alert.alert(
      "Delete All Slots",
      `Are you sure you want to delete all ${slotsForDate.length} slots for ${formatDate(
        selectedDateStr
      )}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setDeleteAllLoading(true);
            setError(null);

            try {
              const token = await AsyncStorage.getItem("token");
              const hospitalID = user?.hospitalID;
              const doctorID = user?.id;

              if (!hospitalID || !doctorID) {
                throw new Error("Hospital ID or Doctor ID not found");
              }

              const url = `doctor/${hospitalID}/${doctorID}/${selectedDateStr}/deleteDoctorAppointmentSlot`;

              const response = await AuthDelete(url, token);

              if (response?.status === "error") {
                throw new Error(response?.message);
              }

              setRefreshTrigger((prev) => prev + 1);
              dispatch(showSuccess("All slots deleted successfully"));
            } catch (err: any) {
              setError(err?.message || "Failed to delete slots");
              dispatch(showError(err?.message || "Failed to delete slots"));
            } finally {
              setDeleteAllLoading(false);
            }
          },
        },
      ]
    );
  };

  // Format date to YYYY-MM-DD for comparison
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Filter slots for the selected date
  const getSlotsForSelectedDate = () => {
    const selectedDateStr = formatDateToYYYYMMDD(currentDate);

    // Add proper array checking
    if (!Array.isArray(slots)) {
      return [];
    }

    return slots.filter((slot) => slot?.date === selectedDateStr);
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateSelect = (selectedDate: Date) => {
    setCurrentDate(selectedDate);
  };

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get slots for the currently selected date
  const slotsForSelectedDate = getSlotsForSelectedDate();
  const leaveInfo = isDateOnLeave(currentDate);

  const renderSlotCard = ({ item }: { item: Slot }) => (
    <View style={styles.slotCard}>
      <View style={styles.slotHeader}>
        <View style={styles.slotTime}>
          <ClockIcon size={16} color="#14b8a6" />
          <Text style={styles.slotTimeText}>
            {convertTo12Hour(item.fromTime?.substring?.(0, 5) ?? "00:00")} -{" "}
            {convertTo12Hour(item.toTime?.substring?.(0, 5) ?? "00:00")}
          </Text>
          
        </View>

        
      </View>

      <View style={styles.slotDetails}>
        <View style={styles.slotInfoRow}>
          <View style={styles.infoItem}>
            <UsersIcon size={14} color="#666" />
            <Text style={styles.infoLabel}>Total Slots:</Text>
            <Text style={styles.infoValue}>{item.availableSlots}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Booked:</Text>
            <Text style={styles.infoValue}>{item.persons}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Available:</Text>
            <Text style={[styles.infoValue, styles.availableText]}>
              {item.availableSlots - item.persons}
            </Text>
          </View>
        </View>
        

        {/* Shift Information */}
        <View style={styles.shiftInfo}>
          
          <Text style={styles.shiftLabel}>
            Shift:{" "}
            {convertTo12Hour(item.shiftFromTime?.substring?.(0, 5) ?? "00:00")}{" "}
            -{" "}
            {convertTo12Hour(item.shiftToTime?.substring?.(0, 5) ?? "00:00")}
          </Text>
          <View style={styles.slotActions}>
          <TouchableOpacity
            onPress={() => deleteSlot(item)}
            disabled={deleting === item.id}
            style={styles.deleteButton}
          >
            {deleting === item.id ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>

              <Text style={styles.deleteText}><Trash2 size={12} color="#ef4444" />  Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </View>
        
        
      </View>
      

      <View
        style={[
          styles.statusIndicator,
          item.availableSlots > item.persons ? styles.available : styles.full,
        ]}
      >
        <Text style={styles.statusText}>
          {item.availableSlots > item.persons ? "Available" : "Full"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Slots Management</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, leaveInfo && styles.disabledButton]}
          onPress={() => setShowSlotModal(true)}
          disabled={creating || !!leaveInfo}
        >
          <PlusIcon size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {creating ? "Creating..." : "Add Slots"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <View style={styles.dateControls}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
            <ChevronLeftIcon size={16} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.currentDate}
            onPress={() => setShowCalendar(true)}
          >
            <CalendarIcon size={16} color="#14b8a6" />
            <Text style={styles.currentDateText}>
              {formatDate(formatDateToYYYYMMDD(currentDate))}
            </Text>
            {leaveInfo && <LeaveIcon size={16} color="#ef4444" />}
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <ChevronRightIcon size={16} color="#475569" />
          </TouchableOpacity>
        </View>

        
      </View>
      <View style={styles.dateActions}>
          {slotsForSelectedDate.length > 0 && !leaveInfo && (
            <TouchableOpacity
              onPress={deleteAllSlotsForDate}
              disabled={deleteAllLoading}
              style={styles.deleteAllButton}
            >
              {deleteAllLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteAllText}>Delete All Slots</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

      {/* Leave Alert */}
      {leaveInfo && (
        <View style={styles.leaveAlert}>
          <View style={styles.leaveHeader}>
            <LeaveIcon size={20} color="#f59e0b" />
            <Text style={styles.leaveTitle}>
              Doctor is on leave ({leaveInfo.leaveType})
            </Text>
          </View>
          <Text style={styles.leaveText}>
            From {formatDate(leaveInfo.fromDate)} to {formatDate(leaveInfo.toDate)}
          </Text>
          <Text style={styles.leaveSubtext}>
            Cannot create or manage slots during this period.
          </Text>
        </View>
      )}

      {/* Create Error Alert */}
      {createError && (
        <View style={styles.errorAlert}>
          <Text style={styles.errorAlertText}>{createError}</Text>
          <TouchableOpacity
            onPress={() => setCreateError(null)}
            style={styles.closeErrorButton}
          >
            <Text style={styles.closeErrorText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading and Error States */}
      {loading && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.stateText}>Loading slots...</Text>
        </View>
      )}

      {error && !createError && (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Error Loading Slots</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchSlots} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Slots Content */}
      {!loading && !error && (
        <View style={styles.slotsContent}>
          {leaveInfo ? (
            <View style={styles.centerState}>
              <LeaveIcon size={64} color="#f59e0b" />
              <Text style={styles.leaveStateTitle}>Doctor on Leave</Text>
              <Text style={styles.leaveStateText}>
                {leaveInfo.leaveType} from {formatDate(leaveInfo.fromDate)} to{" "}
                {formatDate(leaveInfo.toDate)}
              </Text>
              <Text style={styles.leaveStateSubtext}>
                No slots can be created or managed during this period.
              </Text>
            </View>
          ) : slotsForSelectedDate.length === 0 ? (
            <View style={styles.centerState}>
              <ClockIcon size={64} color="#cbd5e1" />
              <Text style={styles.noSlotsTitle}>
                No slots available for {formatDate(formatDateToYYYYMMDD(currentDate))}
              </Text>
              <Text style={styles.noSlotsText}>
                Create new slots to start managing appointments for this date
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowSlotModal(true)}
              >
                <PlusIcon size={16} color="#fff" />
                <Text style={styles.primaryButtonText}>Add New Slots</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dateSection}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateTitle}>
                  {formatDate(formatDateToYYYYMMDD(currentDate))}
                </Text>
                <View style={styles.slotCount}>
                  <Text style={styles.slotCountText}>{slotsForSelectedDate.length} slots</Text>
                </View>
              </View>

              <FlatList
                data={slotsForSelectedDate}
                renderItem={renderSlotCard}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.slotsList}
              />
            </View>
          )}
        </View>
      )}

      {/* Modals */}
      <CalendarModal
        visible={showCalendar}
        selectedDate={currentDate}
        onDateSelect={handleDateSelect}
        onClose={() => setShowCalendar(false)}
        leaves={leaves}
      />

      <SlotModal
        visible={showSlotModal}
        onClose={() => {
          setShowSlotModal(false);
          setCreateError(null);
        }}
        onSave={createSlots}
        creating={creating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14b8a6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    // 'gap' is not reliable on all RN versions; use margin on children instead
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: "#cbd5e1",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  dateNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  navButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  currentDate: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    minWidth: 150,
    justifyContent: "center",
    marginHorizontal: 12,
  },
  currentDateText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#0f172a",
    marginLeft: 8,
  },
  dateActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    // keep red background so text is visible
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteAllText: {
    color: "#fff",
    fontStyle: "italic",
    fontWeight: "600",
    fontSize: 12,
  },
  leaveAlert: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  leaveHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  leaveTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginLeft: 8,
  },
  leaveText: {
    fontSize: 12,
    color: "#92400e",
    marginBottom: 2,
  },
  leaveSubtext: {
    fontSize: 11,
    color: "#92400e",
    opacity: 0.8,
  },
  errorAlert: {
    backgroundColor: "#fee2e2",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  errorAlertText: {
    fontSize: 12,
    color: "#dc2626",
    flex: 1,
  },
  closeErrorButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeErrorText: {
    fontSize: 16,
    color: "#dc2626",
    fontWeight: "bold",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  stateText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#14b8a6",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  slotsContent: {
    flex: 1,
  },
  noSlotsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  noSlotsText: {
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 300,
  },
  leaveStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  leaveStateText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 4,
  },
  leaveStateSubtext: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    opacity: 0.8,
  },
  dateSection: {
    flex: 1,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  slotCount: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  slotCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  slotsList: {
    paddingBottom: 20,
  },
  slotCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 12,
    padding: 16,
    // Add extra right padding so the status badge doesn't overlap interactive elements
    paddingRight: 56,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  slotTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  slotTimeText: {
    fontWeight: "600",
    color: "#0f172a",
    fontSize: 13,
    marginLeft: 8,
  },
  slotActions: {
    // keep actions compact and prevent overlap
    minWidth: 70,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  deleteButton: {
    paddingVertical: 4,
    borderRadius: 4,
    // no background so it appears as simple italic text
  },
  deleteText: {
    color: "#ef4444",
    fontStyle: "italic",
    fontWeight: "600",
    fontSize: 13,
  },
  slotDetails: {
    marginTop: 4,
  },
  slotInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
    marginRight: 6,
  },
  infoValue: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  availableText: {
    color: "#059669",
    fontWeight: "700",
  },
  shiftInfo: {
    marginTop: 4,
  },
  shiftLabel: {
    color: "#64748b",
    fontSize: 11,
    fontStyle: "italic",
  },
  statusIndicator: {
    position: "absolute",
    top: 12,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 2,
  },
  available: {
    backgroundColor: "#d1fae5",
  },
  full: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 8,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default SlotsManagement;