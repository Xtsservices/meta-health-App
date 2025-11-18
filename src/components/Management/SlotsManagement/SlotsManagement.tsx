import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { 
  formatDate, 
  formatTime, 
  convertTo12Hour,
  formatDateForInput,
  getCurrentDateFormatted,
  isValidTime,
  isValidDate
} from "../../../utils/dateTime";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon, UsersIcon } from "../../../utils/SvgIcons";
import CalendarModal from "./CalendarModal";
import SlotModal from "./SlotModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Types
interface Slot {
  id: number;
  date: string;
  fromTime: string;
  toTime: string;
  availableSlots: number;
  persons: number;
  bookedIds: number[];
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

// Selector function for current user
const selectCurrentUser = (state: RootState) => state.currentUser;

const SlotsManagement: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const user = useSelector(selectCurrentUser);
  const token = user?.token || "";

  // Fetch slots data - GET API
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

      if (response?.status === "error") {
        throw new Error(response?.message);
      }

      setSlots(response?.data?.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch slots data");
    } finally {
      setLoading(false);
    }
  };

  // Create new slots - POST API
  const createSlots = async (slotData: any) => {
    setCreating(true);
    setError(null);

    try {
      const hospitalID = user?.hospitalID;
      const doctorID = user?.id;

      if (!hospitalID || !doctorID) {
        throw new Error("Hospital ID or Doctor ID not found");
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
      setError(err?.message || "Failed to create slots");
      Alert.alert("Error", err?.message || "Failed to create slots");
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
    return (slots || [])?.filter?.(slot => slot.date === selectedDateStr);
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

  const handleDateSelect = (selectedDate: Date) => {
    setCurrentDate(selectedDate);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // Get slots for the currently selected date
  const slotsForSelectedDate = getSlotsForSelectedDate();

  const renderSlotCard = ({ item }: { item: Slot }) => (
    <View style={styles.slotCard}>
      <View style={styles.slotHeader}>
        <View style={styles.slotTime}>
          <ClockIcon size={16} color="#14b8a6" />
          <Text style={styles.slotTimeText}>
            {convertTo12Hour(item.fromTime?.substring?.(0, 5) ?? '00:00')} - {convertTo12Hour(item.toTime?.substring?.(0, 5) ?? '00:00')}
          </Text>
        </View>
        <View style={[
          styles.statusIndicator,
          item.availableSlots > item.persons ? styles.available : styles.full
        ]}>
          <Text style={styles.statusText}>
            {item.availableSlots > item.persons ? "Available" : "Full"}
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
          style={styles.primaryButton}
          onPress={() => setShowSlotModal(true)}
          disabled={creating}
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
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <ChevronRightIcon size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading and Error States */}
      {loading && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.stateText}>Loading slots...</Text>
        </View>
      )}

      {error && (
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
          {slotsForSelectedDate?.length === 0 ? (
            <View style={styles.centerState}>
              <ClockIcon size={40} color="#cbd5e1" />
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
                  <Text style={styles.slotCountText}>{slotsForSelectedDate?.length} slots</Text>
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
      />

      <SlotModal
        visible={showSlotModal}
        onClose={() => setShowSlotModal(false)}
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
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
    gap: 12,
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
    gap: 8,
    padding: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    minWidth: 180,
    justifyContent: "center",
  },
  currentDateText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#0f172a",
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
    gap: 12,
    paddingBottom: 20,
  },
  slotCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 12,
    padding: 16,
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
    gap: 8,
  },
  slotTimeText: {
    fontWeight: "600",
    color: "#0f172a",
    fontSize: 14,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  available: {
    backgroundColor: "#d1fae5",
  },
  full: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  slotDetails: {
    marginTop: 4,
  },
  slotInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
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
});

export default SlotsManagement;