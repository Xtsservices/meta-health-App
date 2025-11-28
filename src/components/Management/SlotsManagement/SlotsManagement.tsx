import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  ScrollView
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { AuthFetch, AuthPost, AuthDelete } from "../../../auth/auth";
import { 
  formatDate, 
  formatTime, 
  convertTo12Hour,
  formatDateForInput,
  getCurrentDateFormatted,
  isValidTime,
  isValidDate
} from "../../../utils/dateTime";
import { 
  PlusIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon, 
  ClockIcon, 
  UsersIcon, 
  DeleteIcon,
  LeaveIcon 
} from "../../../utils/SvgIcons";
import CalendarModal from "./CalendarModal";
import SlotModal from "./SlotModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  responsiveWidth,
  responsiveHeight,
} from "../../../utils/responsive";

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
  const token = user?.token || "";

  // Fetch slots and leaves data - GET API
  const fetchSlots = async () => {
    setLoading(true);
    setError(null);

    try {
      const hospitalID = user?.hospitalID;
      const doctorID = user?.id;
      const token = await AsyncStorage.getItem('token');
      
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
      const token = await AsyncStorage.getItem('token');
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
          `Doctor is on leave (${leaveInfo.leaveType}) from ${formatDate(leaveInfo.fromDate)} to ${formatDate(leaveInfo.toDate)}. Cannot create schedule on ${formatDate(slotData.date)}.`
        );
      }

      const scheduleData: ScheduleData[] = [{
        date: slotData.date,
        shiftFromTime: `${slotData.shiftFromTime}:00`,
        shiftToTime: `${slotData.shiftToTime}:00`,
        dayToggles: {},
        addedBy: doctorID,
        doctorID: doctorID,
        slots: generateTimeSlotsWithDate(slotData)
      }];

      const url = `doctor/${hospitalID}/doctorAppointmentSchedule`;

      const response = await AuthPost(url, { data: scheduleData }, token);

      if (response?.status === "error") {
        throw new Error(response?.message);
      }

      await fetchSlots();
      setShowSlotModal(false);
      Alert.alert("Success", "Slots created successfully");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to create slots";
      setCreateError(errorMessage);
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const generateTimeSlotsWithDate = (slotData: any) => {
    const slots = [];
    const start = parseInt(slotData.shiftFromTime?.split(':')?.[0] ?? '0');
    const end = parseInt(slotData.shiftToTime?.split(':')?.[0] ?? '0');
    
    for (let i = start; i < end; i++) {
      slots.push({
        date: slotData.date,
        fromTime: `${i.toString().padStart(2, '0')}:00:00`,
        toTime: `${(i + 1).toString().padStart(2, '0')}:00:00`,
        availableSlots: parseInt(slotData.availableSlots ?? '0'),
        persons: 0,
        bookedIds: []
      });
    }
    return slots;
  };

  // Delete single slot
  const deleteSlot = async (slot: Slot) => {
    Alert.alert(
      "Delete Slot",
      "Are you sure you want to delete this slot?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(slot.id);
            setError(null);

            try {
              const token = await AsyncStorage.getItem('token');
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

              setRefreshTrigger(prev => prev + 1);
              Alert.alert("Success", "Slot deleted successfully");
              
            } catch (err: any) {
              setError(err?.message || "Failed to delete slot");
              Alert.alert("Error", err?.message || "Failed to delete slot");
            } finally {
              setDeleting(null);
            }
          }
        }
      ]
    );
  };

  // Delete all slots for selected date
  const deleteAllSlotsForDate = async () => {
    const selectedDateStr = formatDateToYYYYMMDD(currentDate);
    const slotsForDate = getSlotsForSelectedDate();
    
    if (slotsForDate.length === 0) {
      Alert.alert("Info", "No slots to delete for selected date");
      return;
    }

    Alert.alert(
      "Delete All Slots",
      `Are you sure you want to delete all ${slotsForDate.length} slots for ${formatDate(selectedDateStr)}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setDeleteAllLoading(true);
            setError(null);

            try {
              const token = await AsyncStorage.getItem('token');
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

              setRefreshTrigger(prev => prev + 1);
              Alert.alert("Success", "All slots deleted successfully");
              
            } catch (err: any) {
              setError(err?.message || "Failed to delete slots");
              Alert.alert("Error", err?.message || "Failed to delete slots");
            } finally {
              setDeleteAllLoading(false);
            }
          }
        }
      ]
    );
  };

  // Format date to YYYY-MM-DD for comparison
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter slots for the selected date
  const getSlotsForSelectedDate = () => {
    const selectedDateStr = formatDateToYYYYMMDD(currentDate);
    
    // Add proper array checking
    if (!Array.isArray(slots)) {
      console.warn('Slots is not an array:', slots);
      return [];
    }
    
    return slots.filter(slot => slot?.date === selectedDateStr);
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
  }, [refreshTrigger]);

  useEffect(() => {
    fetchSlots();
  }, []);

  // Get slots for the currently selected date
  const slotsForSelectedDate = getSlotsForSelectedDate();
  const leaveInfo = isDateOnLeave(currentDate);

  const renderSlotCard = ({ item }: { item: Slot }) => (
    <View style={styles.slotCard}>
      {/* Status Indicator - Top Right Corner */}
      <View style={[
        styles.statusIndicator,
        item.availableSlots > item.persons ? styles.available : styles.full
      ]}>
        <Text style={styles.statusText}>
          {item.availableSlots > item.persons ? "Available" : "Full"}
        </Text>
      </View>

      <View style={styles.slotHeader}>
        <View style={styles.slotTime}>
          <ClockIcon size={ICON_SIZE.sm} color="#14b8a6" />
          <Text style={styles.slotTimeText}>
            {convertTo12Hour(item.fromTime?.substring?.(0, 5) ?? '00:00')} - {convertTo12Hour(item.toTime?.substring?.(0, 5) ?? '00:00')}
          </Text>
        </View>
      </View>

      <View style={styles.slotDetails}>
        <View style={styles.slotInfoRow}>
          <View style={styles.infoItem}>
            <UsersIcon size={ICON_SIZE.sm - 2} color="#666" />
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
            Shift: {convertTo12Hour(item.shiftFromTime?.substring?.(0, 5) ?? '00:00')} - {convertTo12Hour(item.shiftToTime?.substring?.(0, 5) ?? '00:00')}
          </Text>
        </View>
      </View>

      {/* Delete Button - Bottom Right Corner */}
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
              <DeleteIcon size={ICON_SIZE.sm} color="#ef4444" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Slots Management</Text>
          <Text style={styles.subtitle}>Manage doctor appointment slots</Text>
        </View>
        <TouchableOpacity 
          style={[styles.primaryButton, leaveInfo && styles.disabledButton]}
          onPress={() => setShowSlotModal(true)}
          disabled={creating || !!leaveInfo}
        >
          <PlusIcon size={ICON_SIZE.sm} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {creating ? "Creating..." : "Add Slots"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <View style={styles.dateControls}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
            <ChevronLeftIcon size={ICON_SIZE.sm} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.currentDate}
            onPress={() => setShowCalendar(true)}
          >
            <CalendarIcon size={ICON_SIZE.sm} color="#14b8a6" />
            <Text style={styles.currentDateText}>
              {formatDate(formatDateToYYYYMMDD(currentDate))}
            </Text>
            {leaveInfo && (
              <LeaveIcon size={ICON_SIZE.sm} color="#ef4444" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <ChevronRightIcon size={ICON_SIZE.sm} color="#475569" />
          </TouchableOpacity>
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
                <>
                  <DeleteIcon size={ICON_SIZE.sm} color="#fff" />
                  
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Leave Alert */}
      {leaveInfo && (
        <View style={styles.leaveAlert}>
          <View style={styles.leaveHeader}>
            <LeaveIcon size={ICON_SIZE.md} color="#f59e0b" />
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
              <LeaveIcon size={ICON_SIZE.xxl} color="#f59e0b" />
              <Text style={styles.leaveStateTitle}>Doctor on Leave</Text>
              <Text style={styles.leaveStateText}>
                {leaveInfo.leaveType} from {formatDate(leaveInfo.fromDate)} to {formatDate(leaveInfo.toDate)}
              </Text>
              <Text style={styles.leaveStateSubtext}>
                No slots can be created or managed during this period.
              </Text>
            </View>
          ) : slotsForSelectedDate.length === 0 ? (
            <View style={styles.centerState}>
              <ClockIcon size={ICON_SIZE.xxl} color="#cbd5e1" />
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
                <PlusIcon size={ICON_SIZE.sm} color="#fff" />
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
        leaves={leaves}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: SPACING.md,
  },
  header: {
    flexDirection: isSmallDevice ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isSmallDevice ? "flex-start" : "center",
    marginBottom: SPACING.lg,
    gap: isSmallDevice ? SPACING.md : 0,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    fontWeight: "500",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14b8a6",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: responsiveWidth(30),
  },
  disabledButton: {
    backgroundColor: "#cbd5e1",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
  },
  dateNavigation: {
    flexDirection: isSmallDevice ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isSmallDevice ? "stretch" : "center",
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: isSmallDevice ? SPACING.md : 0,
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: isSmallDevice ? "space-between" : "flex-start",
    gap: SPACING.sm,
  },
  navButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 40,
  },
  currentDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    minWidth: responsiveWidth(40),
    justifyContent: "center",
    flex: 1,
  },
  currentDateText: {
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
    color: "#0f172a",
    textAlign: "center",
  },
  dateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    justifyContent: isSmallDevice ? "space-between" : "flex-end",
  },
  todayButton: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
  },
  todayButtonText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: FONT_SIZE.xs,
  },
  deleteAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    gap: SPACING.xs,
  },
  deleteAllButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: FONT_SIZE.xs,
  },
  leaveAlert: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  leaveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  leaveTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#92400e",
  },
  leaveText: {
    fontSize: FONT_SIZE.xs,
    color: "#92400e",
    marginBottom: 2,
  },
  leaveSubtext: {
    fontSize: FONT_SIZE.xs - 1,
    color: "#92400e",
    opacity: 0.8,
  },
  errorAlert: {
    backgroundColor: "#fee2e2",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  errorAlertText: {
    fontSize: FONT_SIZE.xs,
    color: "#dc2626",
    flex: 1,
  },
  closeErrorButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  closeErrorText: {
    fontSize: FONT_SIZE.md,
    color: "#dc2626",
    fontWeight: "bold",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  stateText: {
    marginTop: SPACING.md,
    color: "#64748b",
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
  },
  errorTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: "#14b8a6",
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  errorText: {
    color: "#64748b",
    textAlign: "center",
    marginBottom: SPACING.md,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: FONT_SIZE.xs,
  },
  slotsContent: {
    flex: 1,
  },
  noSlotsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  noSlotsText: {
    color: "#64748b",
    textAlign: "center",
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
    maxWidth: responsiveWidth(80),
  },
  leaveStateTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  leaveStateText: {
    fontSize: FONT_SIZE.sm,
    color: "#64748b",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  leaveStateSubtext: {
    fontSize: FONT_SIZE.xs,
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
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dateTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: "#0f172a",
  },
  slotCount: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  slotCountText: {
    color: "#fff",
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  slotsList: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  slotCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 12,
    padding: SPACING.lg,
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
    marginBottom: SPACING.md,
  },
  slotTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  slotTimeText: {
    fontWeight: "600",
    color: "#0f172a",
    fontSize: FONT_SIZE.md,
  },
  slotActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: 6,
    backgroundColor: "#fef2f2",
  },
  deleteButtonText: {
    color: "#ef4444",
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  slotDetails: {
    marginTop: SPACING.xs,
  },
  slotInfoRow: {
    flexDirection: isSmallDevice ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isSmallDevice ? "flex-start" : "center",
    marginBottom: SPACING.sm,
    gap: isSmallDevice ? SPACING.xs : 0,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: FONT_SIZE.xs,
    fontWeight: "500",
  },
  infoValue: {
    color: "#475569",
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  availableText: {
    color: "#059669",
    fontWeight: "700",
  },
  shiftInfo: {
    marginTop: SPACING.xs,
  },
  shiftLabel: {
    color: "#64748b",
    fontSize: FONT_SIZE.xs - 1,
    fontStyle: "italic",
  },
  statusIndicator: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  available: {
    backgroundColor: "#d1fae5",
  },
  full: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: FONT_SIZE.xs - 1,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default SlotsManagement;