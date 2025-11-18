import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import { 
  formatDate, 
  formatTime, 
  convertTo12Hour,getDaysInMonth, monthNames, areDatesEqual 
} from "../../../utils/dateTime";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MoreVerticalIcon, 
  UserIcon, 
  MapPinIcon, 
  ClockIcon, 
  ScissorsIcon, 
  CalendarIcon, 
  XIcon 
} from "../../../utils/SvgIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ---- Types ----
type BookedAppointment = {
  services: string;
  appointmentID: number;
  pName: string;
  age: number;
  gender: string;
  mobileNumber: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
};

type Slot = {
  id: number;
  date: string;
  fromTime: string;
  toTime: string;
  availableSlots: number;
  persons: number;
  bookedIds: number[];
  status: string;
  bookedAppointments: BookedAppointment[];
};

type OTSchedule = {
  id: number;
  startTime: string;
  endTime: string;
  roomID: string;
  attendees: string[];
  patientTimeLineId: number;
  patientType: string;
  surgeryType: string;
  patientName: string;
};

type AppointmentSchedule = {
  shiftFromTime: string;
  shiftToTime: string;
  dayToggles: Record<string, any>;
  slots: Slot[];
};

type ApiResponse = {
  message: string;
  data: {
    doctorID: string;
    hospitalID: string;
    date: string;
    doctorName: string;
    appointmentSchedule: AppointmentSchedule;
    otSchedules: OTSchedule[];
  };
};

type AvailableSlot = {
  time: string;
  available: boolean;
  slotData?: Slot;
};

type Appointment = {
  time: string;
  patient: string;
  id: string;
  type: string;
  status: string;
  priority: string;
  doctor: string;
  room: string;
  duration: string;
  originalData?: BookedAppointment;
  slotData?: Slot;
};

type ScheduleItem = AvailableSlot | Appointment;

// ---- Type Guards ----
const isAvailableSlot = (item: ScheduleItem): item is AvailableSlot =>
  (item as AvailableSlot).available !== undefined;

const isAppointment = (item: ScheduleItem): item is Appointment =>
  (item as Appointment).patient !== undefined;

// ---- Calendar Modal ----
const CalendarModal: React.FC<{
  visible: boolean;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
}> = ({ visible, selectedDate, onDateSelect, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));



  const isToday = (date: Date) => {
    const today = new Date();
    return areDatesEqual(date, today); 
  };

  const days = getDaysInMonth(currentMonth);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calendarModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <ChevronLeftIcon size={20} color="#475569" />
            </TouchableOpacity>
            <Text style={styles.monthYear}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <ChevronRightIcon size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            <View style={styles.weekDays}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <Text key={day} style={styles.weekDay}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarDays}>
              {days?.map?.((date, index) => {
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const isSelected = areDatesEqual(date, selectedDate);
                const isTodayDate = isToday(date);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      !isCurrentMonth && styles.otherMonth,
                      isSelected && styles.selectedDay,
                      isTodayDate && styles.today
                    ]}
                    onPress={() => handleDateClick(date)}
                    disabled={!isCurrentMonth}
                  >
                    <Text style={[
                      styles.dayText,
                      !isCurrentMonth && styles.otherMonthText,
                      isSelected && styles.selectedDayText,
                      isTodayDate && styles.todayText
                    ]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ---- Appointment Details Modal ----
const AppointmentDetailsModal: React.FC<{
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}> = ({ visible, appointment, onClose }) => {
  if (!appointment) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.appointmentModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Appointment Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            View and manage appointment information
          </Text>

          <ScrollView style={styles.modalContent}>
            {/* Patient Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Patient Information</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Name:</Text> {appointment.patient}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Patient ID:</Text> {appointment.id}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Phone:</Text> {appointment.originalData?.mobileNumber || "N/A"}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Age:</Text> {appointment.originalData?.age || "N/A"}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Gender:</Text> {appointment.originalData?.gender === "2" ? "Female" : "Male"}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Reason:</Text> {appointment.type || "N/A"}</Text>
              </View>
            </View>

            {/* Appointment Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Appointment Details</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Time:</Text> {appointment.time}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Doctor:</Text> {appointment.doctor}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Room:</Text> {appointment.room}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Duration:</Text> {appointment.duration}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Status:</Text> {appointment.status}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ---- OT Schedule Modal ----
const OTScheduleModal: React.FC<{
  visible: boolean;
  otSchedule: OTSchedule | null;
  onClose: () => void;
}> = ({ visible, otSchedule, onClose }) => {
  if (!otSchedule) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.appointmentModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>OT Schedule Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Patient Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Patient Information</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Name:</Text> {otSchedule.patientName}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Patient Type:</Text> {otSchedule.patientType}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Surgery Type:</Text> {otSchedule.surgeryType}</Text>
              </View>
            </View>

            {/* OT Details */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Operation Theater Details</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Room:</Text> {otSchedule.roomID}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Start Time:</Text> {formatTime(otSchedule.startTime)}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>End Time:</Text> {formatTime(otSchedule.endTime)}</Text>
                <Text style={styles.infoText}><Text style={styles.infoLabel}>Duration:</Text> {Math.round((new Date(otSchedule.endTime).getTime() - new Date(otSchedule.startTime).getTime()) / (1000 * 60))} minutes</Text>
              </View>
            </View>

            {/* Attendees */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Attendees</Text>
              <View style={styles.infoBox}>
                {otSchedule.attendees?.map?.((attendee, index) => (
                  <Text key={index} style={styles.infoText}><Text style={styles.infoLabel}>•</Text> {attendee}</Text>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ---- OT Schedule Table Component ----
const OTScheduleTable: React.FC<{
  otSchedules: OTSchedule[];
  onOTClick: (otSchedule: OTSchedule) => void;
}> = ({ otSchedules, onOTClick }) => {
  if (otSchedules?.length === 0) {
    return (
      <View style={styles.otScheduleSection}>
        <Text style={styles.sectionTitle}>OT Schedule</Text>
        <View style={styles.noOtSchedules}>
          <ScissorsIcon size={48} color="#adb5bd" />
          <Text style={styles.noDataText}>No OT schedules for today</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.otScheduleSection}>
      <Text style={styles.sectionTitle}>OT Schedule</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.otTableContainer}>
          {otSchedules?.map?.((otSchedule) => (
            <TouchableOpacity
              key={otSchedule.id}
              style={styles.otTableRow}
              onPress={() => onOTClick(otSchedule)}
            >
              <View style={styles.otRowContent}>
                <View style={styles.patientInfo}>
                  <UserIcon size={16} color="#333" />
                  <Text style={styles.patientName}>{otSchedule.patientName}</Text>
                </View>
                <Text style={styles.otDetail}>{otSchedule.surgeryType}</Text>
                <View style={styles.roomBadge}>
                  <MapPinIcon size={14} color="#0066cc" />
                  <Text style={styles.roomText}>{otSchedule.roomID}</Text>
                </View>
                <View style={styles.timeSlot}>
                  <Text style={styles.date}>{formatDate(otSchedule.startTime)}</Text>
                  <View style={styles.time}>
                    <ClockIcon size={14} color="#666" />
                    <Text style={styles.timeText}>
                      {formatTime(otSchedule.startTime)} - {formatTime(otSchedule.endTime)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.duration}>
                  {Math.round((new Date(otSchedule.endTime).getTime() - new Date(otSchedule.startTime).getTime()) / (1000 * 60))} min
                </Text>
                <View style={[
                  styles.patientTypeBadge,
                  otSchedule.patientType === 'emergency' ? styles.emergencyBadge : styles.electiveBadge
                ]}>
                  <Text style={styles.patientTypeText}>{otSchedule.patientType}</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onOTClick(otSchedule);
                  }}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// ---- Main Component ----
const MySchedule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedOTSchedule, setSelectedOTSchedule] = useState<OTSchedule | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [scheduleData, setScheduleData] = useState<ApiResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const user = useSelector(selectCurrentUser);
  const token = user?.token || "";

  const fetchScheduleData = async (date: Date) => {
    setLoading(true);
    setError(null);

    try {

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      const token = await AsyncStorage.getItem('token');
      const hospitalID = user?.hospitalID;
      const doctorID = user?.id;

      if (!hospitalID || !doctorID) {
        throw new Error("User information not available");
      }

      const url = `doctor/${hospitalID}/${doctorID}/${formattedDate}/getDoctorScheduleByDate`;

      const response = await AuthFetch(url, token);

      if (response?.status === "error") {
        throw new Error(response?.message || "Failed to fetch schedule data");
      }

      setScheduleData(response?.data?.data || null);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch schedule data");
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (selectedDate: Date) => {
    setCurrentDate(selectedDate);
  };

  useEffect(() => {
    if (user?.hospitalID && user?.id) {
      fetchScheduleData(currentDate);
    }
  }, [currentDate, user?.hospitalID, user?.id]);

  // Transform API data to appointments
  const transformScheduleToAppointments = (): ScheduleItem[] => {
    if (!scheduleData) return [];

    const appointments: ScheduleItem[] = [];
    const { appointmentSchedule } = scheduleData;

    // Process appointment slots
    appointmentSchedule?.slots?.forEach?.((slot: Slot) => {
      const time24 = slot.fromTime?.substring?.(0, 5) || '00:00';
      const time = convertTo12Hour(time24);

      if (slot.bookedAppointments?.length > 0) {
        // Create appointments for booked slots
        slot.bookedAppointments?.forEach?.((bookedAppt: BookedAppointment) => {
          appointments.push({
            time: time,
            patient: bookedAppt.pName || "Unknown Patient",
            id: `P${bookedAppt.appointmentID}`,
            type: bookedAppt.services || "General Consultation",
            status: bookedAppt.status || "scheduled",
            priority: slot.persons > 2 ? "urgent" : "normal",
            doctor: scheduleData.doctorName || "Doctor",
            room: "Consultation Room",
            duration: "30m",
            originalData: bookedAppt,
            slotData: slot
          });
        });
      } else {
        // Create available slots
        appointments.push({
          time: time,
          available: true,
          slotData: slot
        });
      }
    });

    return appointments;
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

  const appointments = transformScheduleToAppointments();
  const otSchedules = scheduleData?.otSchedules || [];

  const renderAppointmentRow = ({ item, index }: { item: ScheduleItem; index: number }) => (
    <View style={styles.appointmentRow}>
      <View style={styles.timeSlot}>
        <Text style={styles.timeText}>
          {isAvailableSlot(item) ? item.time : isAppointment(item) ? item.time : ''}
        </Text>
      </View>

      <View style={styles.appointmentContent}>
        {isAvailableSlot(item) ? (
          <View style={styles.availableSlot}>
            <View style={styles.availableSlotContent}>
              <Text style={styles.availableSlotText}>Available slot</Text>
              {item.slotData && (
                <Text style={styles.slotInfo}>
                  ({item.slotData.availableSlots} slots available)
                </Text>
              )}
            </View>
          </View>
        ) : (
          isAppointment(item) && (
            <TouchableOpacity
              style={styles.appointmentCard}
              onPress={() => setSelectedAppointment(item)}
            >
              <View style={[
                styles.cardLeftBorder,
                styles[`border${item.status?.charAt?.(0)?.toUpperCase?.() + item.status?.slice?.(1)?.replace?.('-', '')}`]
              ]} />
              <View style={styles.cardHeader}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{item.patient}</Text>
                  <Text style={styles.patientId}>{item.id}</Text>
                </View>
                <View style={styles.statusBadges}>
                  <View style={[
                    styles.statusBadge,
                    styles[`status${item.status?.charAt?.(0)?.toUpperCase?.() + item.status?.slice?.(1)?.replace?.('-', '')}`]
                  ]}>
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                  </View>
                </View>
                <View style={styles.appointmentDetails}>
                  <View style={styles.detailItem}>
                    <UserIcon size={14} color="#666" />
                    <Text style={styles.detailText}>{item.doctor}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <ClockIcon size={14} color="#666" />
                    <Text style={styles.detailText}>{item.duration}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                  <MoreVerticalIcon size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {item.type && (
                <Text style={styles.appointmentType}>{item.type}</Text>
              )}
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
            <ChevronLeftIcon size={20} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.currentDateWithCalendar}
            onPress={() => setShowCalendar(true)}
          >
            <Text style={styles.currentDate}>{formatDate(currentDate)}</Text>
            <CalendarIcon size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <ChevronRightIcon size={20} color="#475569" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading and Error States */}
      {loading && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity onPress={() => fetchScheduleData(currentDate)} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {!loading && !error && scheduleData && (
        <ScrollView style={styles.content}>
          {/* OT Schedule Table */}
          <OTScheduleTable
            otSchedules={otSchedules}
            onOTClick={setSelectedOTSchedule}
          />

          <Text style={styles.scheduleTitle}>
            Daily Schedule - {scheduleData.doctorName || "Doctor"}
          </Text>

          <View style={styles.appointmentsList}>
            {appointments?.length > 0 ? (
              <FlatList
                data={appointments}
                renderItem={renderAppointmentRow}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.noAppointments}>
                <Text style={styles.noAppointmentsText}>
                  No appointments scheduled for {formatDate(currentDate)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modals */}
      <CalendarModal
        visible={showCalendar}
        selectedDate={currentDate}
        onDateSelect={handleDateSelect}
        onClose={() => setShowCalendar(false)}
      />

      <AppointmentDetailsModal
        visible={!!selectedAppointment}
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
      />

      <OTScheduleModal
        visible={!!selectedOTSchedule}
        otSchedule={selectedOTSchedule}
        onClose={() => setSelectedOTSchedule(null)}
      />
    </View>
  );
};

const selectCurrentUser = (state: RootState) => state.currentUser;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  currentDateWithCalendar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
  },
  currentDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
  },
  todayButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 6,
    borderRadius: 4,
  },
  todayButtonText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#1f2937",
  },
  content: {
    flex: 1,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
  },
  availableSlot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  availableSlotContent: {
    alignItems: 'flex-end',
  },
  availableSlotText: {
    color: "#9ca3af",
    fontSize: 12,
    textAlign: 'right',
  },
  slotInfo: {
    color: "#9ca3af",
    fontSize: 10,
    marginTop: 2,
    textAlign: 'right',
  },
  errorState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorText: {
    color: "#14b8a6",
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 10,
  },
  otScheduleSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  noOtSchedules: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "white",
    borderRadius: 6,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  noDataText: {
    color: "#666",
    fontSize: 12,
    marginTop: 8,
  },
  otTableContainer: {
    gap: 8,
    paddingHorizontal: 8,
  },
  otTableRow: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    minWidth: 280,
  },
  otRowContent: {
    gap: 8,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  patientName: {
    fontWeight: "500",
    color: "#333",
    fontSize: 14,
  },
  otDetail: {
    color: "#666",
    fontSize: 12,
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#e7f3ff",
    padding: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  roomText: {
    color: "#0066cc",
    fontSize: 10,
    fontWeight: "500",
  },
  timeSlot: {
    gap: 2,
  },
  date: {
    fontWeight: "500",
    color: "#333",
    fontSize: 12,
  },
  time: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  timeText: {
    color: "#666",
    fontSize: 10,
  },
  duration: {
    color: "#666",
    fontSize: 12,
  },
  patientTypeBadge: {
    padding: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  electiveBadge: {
    backgroundColor: "#fff3cd",
  },
  emergencyBadge: {
    backgroundColor: "#f8d7da",
  },
  patientTypeText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  viewDetailsButton: {
    backgroundColor: "#14b8a6",
    padding: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    color: "white",
    fontSize: 10,
    fontWeight: "500",
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  appointmentsList: {
    gap: 0,
    paddingHorizontal: 8,
  },
  appointmentRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 70,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  timeSlot: {
    minWidth: 50,
    paddingTop: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1f2937",
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentCard: {
    position: "relative",
    paddingLeft: 12,
  },
  cardLeftBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 1,
  },
  borderCompleted: {
    backgroundColor: "#6b7280",
  },
  borderInProgress: {
    backgroundColor: "#10b981",
  },
  borderArrived: {
    backgroundColor: "#f59e0b",
  },
  borderScheduled: {
    backgroundColor: "#3b82f6",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  patientInfo: {
    gap: 2,
    minWidth: 100,
    flex: 1,
  },
  patientName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },
  patientId: {
    fontSize: 11,
    color: "#6b7280",
  },
  statusBadges: {
    gap: 4,
  },
  statusBadge: {
    padding: 3,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: "#e5e7eb",
  },
  statusInProgress: {
    backgroundColor: "#d1fae5",
  },
  statusArrived: {
    backgroundColor: "#fef3c7",
  },
  statusScheduled: {
    backgroundColor: "#dbeafe",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "lowercase",
  },
  appointmentDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    color: "#6b7280",
    fontSize: 11,
  },
  moreButton: {
    padding: 2,
    borderRadius: 2,
  },
  appointmentType: {
    fontSize: 12,
    color: "#6b7280",
  },
  noAppointments: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "white",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    marginTop: 8,
  },
  noAppointmentsText: {
    color: "#666",
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calendarModal: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    maxWidth: 400,
  },
  appointmentModal: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
  },
  closeButton: {
    padding: 2,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  calendarGrid: {
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    padding: 12,
  },
  weekDays: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: 6,
  },
  calendarDays: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  otherMonth: {
    opacity: 0.5,
  },
  otherMonthText: {
    color: "#cbd5e1",
  },
  selectedDay: {
    backgroundColor: "#14b8a6",
    borderRadius: 16,
  },
  selectedDayText: {
    color: "#fff",
    fontWeight: "600",
  },
  today: {
    backgroundColor: "#f0fdfa",
    borderRadius: 16,
  },
  todayText: {
    color: "#14b8a6",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  infoBox: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#374151",
  },
  infoLabel: {
    fontWeight: "600",
    color: "#111827",
  },
});

export default MySchedule;