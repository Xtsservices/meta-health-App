import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  Clock,
  X,
  Check,
} from "lucide-react-native";
import { RootState } from "../../store/store";
import { AuthFetch, AuthPost } from "../../auth/auth";
import { Role_NAME } from "../../utils/role";
import { showError, showSuccess } from "../../store/toast.slice";
import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
import Footer from "../dashboard/footer";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../../utils/colour";



dayjs.extend(utc);



const FOOTER_H = 64;
const SLOT_START = 6 * 60; // 06:00
const SLOT_END = 22 * 60; // 22:00;

type Interval = [number, number];

interface Errors {
  roomNumber?: string;
  attendees?: string;
  fromTime?: string;
  toTime?: string;
}

export interface OTAttendee {
  id: number;
  departmentID: number;
  firstName: string;
  lastName: string;
  photo: string | null;
  imageURL?: string;
}

interface EventItem {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  extendedProps: {
    patientId: string;
    patientName: string;
    attendees: OTAttendee[] | string;
    surgeryType: string;
    roomNumber: string;
  };
}

interface FormData {
  roomNumber: string;
  attendees: OTAttendee[];
  fromTime: string; // HH:MM
  toTime: string; // HH:MM
}

/* ---------- Helpers ---------- */
const initialFormData: FormData = {
  roomNumber: "",
  attendees: [],
  fromTime: "",
  toTime: "",
};

const buildMonthGrid = (anchor: dayjs.Dayjs) => {
  const startOfMonth = anchor.startOf("month");
  const gridStart = startOfMonth.startOf("week"); // Sunday
  return Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day"));
};

const asLocalWallClock = (iso: string | Date) => {
  if (iso instanceof Date) return iso;
  if (/Z$/i.test(iso)) {
    const u = dayjs.utc(iso);
    return new Date(
      u.year(),
      u.month(),
      u.date(),
      u.hour(),
      u.minute(),
      u.second(),
      u.millisecond()
    );
  }
  return new Date(iso);
};

const sameDay = (a: Date | string, d: dayjs.Dayjs) => dayjs(a).isSame(d, "day");

const toMinutes = (hhmm: string) => {
  if (!hhmm) return 0;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  return h * 60 + m;
};

const toHHMM = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(h)}:${pad(m)}`;
};

const clampToDay = (
  start: Date | string,
  end: Date | string,
  d: dayjs.Dayjs
): Interval | null => {
  const s = dayjs(start);
  const e = dayjs(end);
  if (!s.isSame(d, "day") && !e.isSame(d, "day")) {
    if (d.isAfter(s, "day") && d.isBefore(e, "day")) return [0, 24 * 60];
    return null;
  }
  const dayStart = d.startOf("day");
  const from = Math.max(0, s.diff(dayStart, "minute"));
  const to = Math.min(24 * 60, e.diff(dayStart, "minute"));
  if (to <= 0 || from >= 24 * 60) return null;
  return [Math.max(from, 0), Math.max(to, 0)];
};

const overlaps = (a: Interval, b: Interval) => a[0] < b[1] && b[0] < a[1];

const getRoomFromEvent = (ev: EventItem): string | undefined => {
  if (ev.extendedProps?.roomNumber) return ev.extendedProps.roomNumber;
  const m = /Room Number:\s*([A-Za-z0-9-_]+)/i.exec(ev.title);
  return m?.[1];
};

const formatTitleMain = (title: string) => {
  const lines = String(title).split("\n");
  return lines[0] || title;
};

const isPastDate = (d: dayjs.Dayjs) =>
  d.isBefore(dayjs().startOf("day"), "day");

/* ---------- Time Picker Field (HH:MM wheel style) ---------- */
function TimePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (hhmm: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState<number>(() => {
    const hh = Number((value || "00:00").split(":")[0] || 0);
    return Math.min(23, Math.max(0, isNaN(hh) ? 0 : hh));
  });
  const [m, setM] = useState<number>(() => {
    const mm = Number((value || "00:00").split(":")[1] || 0);
    return Math.min(59, Math.max(0, isNaN(mm) ? 0 : mm));
  });

  useEffect(() => {
    if (!value) return;
    const [hhS, mmS] = value.split(":");
    const nh = Math.min(23, Math.max(0, Number(hhS) || 0));
    const nm = Math.min(59, Math.max(0, Number(mmS) || 0));
    setH(nh);
    setM(nm);
  }, [value]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const format = (n: number) => (n < 10 ? `0${n}` : String(n));

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { marginBottom: 6 }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.input,
          { borderColor: COLORS.border, backgroundColor: COLORS.field },
        ]}
      >
        <Text
          style={{
            color: value ? COLORS.text : COLORS.sub,
            fontSize: 15,
          }}
        >
          {value ? value : "HH:MM"}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.timeModal, { backgroundColor: "#fff" }]}>
            <Text
              style={{
                fontWeight: "800",
                fontSize: 14,
                color: COLORS.text,
                marginBottom: 8,
              }}
            >
              Select time
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                paddingVertical: 6,
              }}
            >
              {/* Hours */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.sub,
                    marginBottom: 6,
                    fontWeight: "700",
                  }}
                >
                  Hours
                </Text>
                <FlatList
                  data={hours}
                  keyExtractor={(i) => `h-${i}`}
                  style={styles.wheel}
                  initialScrollIndex={h}
                  getItemLayout={(_, idx) => ({
                    length: 36,
                    offset: 36 * idx,
                    index: idx,
                  })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item }) => {
                    const selected = item === h;
                    return (
                      <TouchableOpacity
                        onPress={() => setH(item)}
                        style={[
                          styles.wheelItem,
                          selected && {
                            backgroundColor: COLORS.brand,
                            borderColor: COLORS.brand,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? "#fff" : COLORS.text,
                            fontWeight: "800",
                          }}
                        >
                          {format(item)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {/* Minutes */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.sub,
                    marginBottom: 6,
                    fontWeight: "700",
                  }}
                >
                  Minutes
                </Text>
                <FlatList
                  data={minutes}
                  keyExtractor={(i) => `m-${i}`}
                  style={styles.wheel}
                  initialScrollIndex={m}
                  getItemLayout={(_, idx) => ({
                    length: 36,
                    offset: 36 * idx,
                    index: idx,
                  })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item }) => {
                    const selected = item === m;
                    return (
                      <TouchableOpacity
                        onPress={() => setM(item)}
                        style={[
                          styles.wheelItem,
                          selected && {
                            backgroundColor: COLORS.brand,
                            borderColor: COLORS.brand,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? "#fff" : COLORS.text,
                            fontWeight: "800",
                          }}
                        >
                          {format(item)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => setOpen(false)}
                style={[
                  styles.sheetBtn,
                  { backgroundColor: COLORS.chip },
                ]}
              >
                <Text style={{ color: COLORS.text, fontWeight: "800" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const hhmm = `${format(h)}:${format(m)}`;
                  onChange(hhmm);
                  setOpen(false);
                }}
                style={[
                  styles.sheetBtn,
                  { backgroundColor: COLORS.brand },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Set</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   Main Screen
   ========================================================= */
const OTScheduleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);

  const [loading, setLoading] = useState(true);
  const [attendeesList, setAttendeesList] = useState<OTAttendee[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);

  const [anchorMonth, setAnchorMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const fetchGuard = useRef(false);

  const timeLineID =
    typeof cp?.patientTimeLineID === "object"
      ? cp?.patientTimeLineID?.id
      : cp?.patientTimeLineID;
  const patientID =  cp?.id;
  const disabledSchedule = !timeLineID || !patientID;

  // ---------- Fetch attendees ----------
  const fetchAttendees = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;
      const res = await AuthFetch(
        `user/${user.hospitalID}/list/${Role_NAME.doctor}`,
        token
      );
      if ( res?.status === "success" && "data" in res) {
        setAttendeesList(res?.data?.users || res.data || []);
      }
    } catch {
      dispatch(showError("Failed to load attendees"));
    }
  }, [user?.hospitalID, dispatch]);

  // ---------- Fetch events ----------
  

  // ---------- Initial hydrate ----------
  useFocusEffect(
   useCallback(() => {
    let mounted = true;
    (async () => {
      await Promise.all([fetchAttendees()]);
      if (mounted) setIsHydrating(false);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchAttendees]))

  /* ---------- Calendar derived ---------- */
  const monthCells = useMemo(() => buildMonthGrid(anchorMonth), [anchorMonth]);

  const eventsForMonthByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    monthCells.forEach((d) => {
      map.set(d.format("YYYY-MM-DD"), []);
    });
    events.forEach((ev) => {
      const key = dayjs(ev.start).format("YYYY-MM-DD");
      if (map.has(key)) map.get(key)!.push(ev);
    });
    return map;
  }, [monthCells, events]);

  /* ---------- Busy intervals for selectedDate + room ---------- */
  const selectedRoom = formData.roomNumber.trim();
  const busyIntervalsForSelectedDate: Interval[] = useMemo(() => {
    if (!selectedDate) return [];
    const dayEvents = events.filter((ev) => sameDay(ev.start, selectedDate));
    const filtered = selectedRoom
      ? dayEvents.filter((ev) => getRoomFromEvent(ev) === selectedRoom)
      : dayEvents;

    const intervals: Interval[] = [];
    filtered.forEach((ev) => {
      const ints = clampToDay(ev.start, ev.end, selectedDate);
      if (ints) intervals.push(ints);
    });
    intervals.sort((a, b) => a[0] - b[0]);
    const merged: Interval[] = [];
    for (const int of intervals) {
      if (!merged.length || merged[merged.length - 1][1] < int[0]) {
        merged.push([...int] as Interval);
      } else {
        merged[merged.length - 1][1] = Math.max(
          merged[merged.length - 1][1],
          int[1]
        );
      }
    }
    return merged
      .map(
        ([s, e]) =>
          [Math.max(s, SLOT_START), Math.min(e, SLOT_END)] as Interval
      )
      .filter(([s, e]) => e > s);
  }, [events, selectedDate, selectedRoom]);

  /* ---------- Validation & submit ---------- */
  const validateForm = () => {
    let valid = true;
    const errors: Errors = {};

    if (!formData.roomNumber) {
      errors.roomNumber = "Room Number is required";
      valid = false;
    }
    if (!selectedDate) {
      errors.fromTime = "Select a date";
      valid = false;
    }
    if (!formData.fromTime) {
      errors.fromTime = "From Time is required";
      valid = false;
    }
    if (!formData.toTime) {
      errors.toTime = "To Time is required";
      valid = false;
    }
    if (!formData.attendees.length) {
      errors.attendees = "At least one attendee is required";
      valid = false;
    }

    if (selectedDate && formData.fromTime && formData.toTime) {
      const s = toMinutes(formData.fromTime);
      const e = toMinutes(formData.toTime);
      if (e <= s) {
        errors.toTime = "End time must be after start time";
        valid = false;
      } else {
        const candidate: Interval = [s, e];
        if (busyIntervalsForSelectedDate.some((int) => overlaps(candidate, int))) {
          errors.fromTime =
            "Selected time overlaps with an existing surgery for this room";
          valid = false;
        }
      }
    }

    setFormErrors(errors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!selectedDate) return;
    if (!timeLineID || !patientID) {
      dispatch(showError("Open from a patient context to schedule"));
      return;
    }
    if (!validateForm()) return;

    const selectedDateStr = selectedDate.format("YYYY-MM-DD");
    const startTime = `${selectedDateStr}T${formData.fromTime}`;
    const endTime = `${selectedDateStr}T${formData.toTime}`;
    const attendeesString = formData.attendees
      .map((a) => `${a.firstName} ${a.lastName}`)
      .join(", ");

    try {
      setSaving(true);
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const url = `schedule/${user?.hospitalID}/${user?.id}/${timeLineID}/${patientID}/addSchedule`
      const res = await AuthPost(
        url,
        {
          startTime,
          endTime,
          roomId: formData.roomNumber,
          attendees: attendeesString,
          baseURL: 'http://65.2.126.190:3000/api/v1/',
        },
        token
      );
      if ( res?.status === "success" && "data" in res) {
        dispatch(showSuccess("Scheduled successfully"));
        // push newly added event for current view without refetch
        const newEvent: EventItem = {
          id: String(Date.now()),
          title:
            `PatientName: ${res?.data?.[0]?.pName ?? ""}\n` +
            `PatientId: ${res.data?.[0]?.pID ?? ""}\n` +
            `Attendees: ${attendeesString}\n` +
            `Room Number: ${formData.roomNumber}\n` +
            `Surgery Type: ${res.data?.[0]?.surgeryType ?? ""}`,
          start: asLocalWallClock(startTime),
          end: asLocalWallClock(endTime),
          extendedProps: {
            patientId: String(res.data?.[0]?.pID ?? ""),
            patientName: res.data?.[0]?.pName ?? "",
            attendees: formData.attendees,
            surgeryType: res.data?.[0]?.surgeryType ?? "",
            roomNumber: formData.roomNumber,
          },
        };
        setEvents((prev) => [...prev, newEvent]);
        setScheduleModalOpen(false);
        setFormData(initialFormData);
        setFormErrors({});
      } 
    // else if (res?.status === 403) {
    //     dispatch(showError("Already scheduled"));
    //   }
     else {
        dispatch(showError("message" in res && res?.message || "Scheduling failed"));
      }
    } catch {
      dispatch(showError("Scheduling failed"));
    } finally {
      setSaving(false);
    }
  };

  const debouncedSubmit = useMemo(
    () =>
      debounce(() => handleSubmit(), DEBOUNCE_DELAY, {
        leading: false,
        trailing: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSubmit]
  );
  useEffect(() => () => debouncedSubmit.cancel(), [debouncedSubmit]);

  /* ---------- Calendar cell click ---------- */
  const onDayPress = (d: dayjs.Dayjs, fullyBlocked: boolean) => {
    if (isPastDate(d) || fullyBlocked || disabledSchedule) return;
    setSelectedDate(d);
    setFormData((p) => ({
      ...p,
      fromTime: "",
      toTime: "",
    }));
    setFormErrors({});
    setScheduleModalOpen(true);
  };

  /* ---------- Upcoming list (from today onward) ---------- */
  const futureEvents = useMemo(() => {
    const startToday = dayjs().startOf("day");
    return events
      .filter(
        (ev) =>
          dayjs(ev.start).isSame(startToday, "day") ||
          dayjs(ev.start).isAfter(startToday)
      )
      .sort(
        (a, b) =>
          dayjs(a.start).valueOf() - dayjs(b.start).valueOf()
      );
  }, [events]);

  const bottomPad = FOOTER_H + Math.max(16, insets.bottom);

  if (loading && isHydrating) {
    return (
      <View
        style={[
          styles.screen,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={{ marginTop: 8, color: COLORS.sub, fontWeight: "600" }}>
          Loading schedule…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.safe,
          { paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Schedule your surgery</Text>
            <Text style={styles.headerSub}>
              Tap on a date to add a surgery
            </Text>
          </View>
          <View style={styles.monthSelector}>
            <Pressable
              onPress={() => setAnchorMonth((m) => m.subtract(1, "month"))}
              style={styles.iconBtn}
            >
              <ChevronLeft size={18} color={COLORS.text} />
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CalendarDays size={18} color={COLORS.brand} />
              <Text style={styles.monthText}>
                {anchorMonth.format("MMM YYYY")}
              </Text>
            </View>
            <Pressable
              onPress={() => setAnchorMonth((m) => m.add(1, "month"))}
              style={styles.iconBtn}
            >
              <ChevronRight size={18} color={COLORS.text} />
            </Pressable>
          </View>
        </View>

        {/* Calendar */}
        <View style={[styles.card, { marginTop: 4 }]}>
          {/* Week days header */}
          <View style={styles.weekHeaderRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <View key={d} style={styles.weekHeaderCell}>
                <Text style={styles.weekHeaderText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Days grid 6x7 */}
          <View style={styles.daysGrid}>
            {monthCells.map((d) => {
              const key = d.format("YYYY-MM-DD");
              const inMonth = d.isSame(anchorMonth, "month");
              const todays = dayjs().isSame(d, "day");
              const dayEvents = eventsForMonthByDay.get(key) || [];

              const allBusyIntervals: Interval[] = dayEvents
                .map((ev) => clampToDay(ev.start, ev.end, d))
                .filter(Boolean) as Interval[];
              allBusyIntervals.sort((a, b) => a[0] - b[0]);
              const merged: Interval[] = [];
              for (const int of allBusyIntervals) {
                if (!merged.length || merged[merged.length - 1][1] < int[0])
                  merged.push([...int] as Interval);
                else
                  merged[merged.length - 1][1] = Math.max(
                    merged[merged.length - 1][1],
                    int[1]
                  );
              }
              const constrained = merged
                .map(
                  ([s, e]) =>
                    [Math.max(s, SLOT_START), Math.min(e, SLOT_END)] as Interval
                )
                .filter(([s, e]) => e > s);

              const isFullyBlocked =
                constrained.length === 1 &&
                constrained[0][0] <= SLOT_START &&
                constrained[0][1] >= SLOT_END;

              const disabled =
                isPastDate(d) || isFullyBlocked || disabledSchedule;

              const dayLabelEvents = dayEvents.slice(0, 2);

              return (
                <Pressable
                  key={key}
                  onPress={() => onDayPress(d, isFullyBlocked)}
                  disabled={disabled}
                  style={[
                    styles.dayCell,
                    {
                      opacity: isPastDate(d) ? 0.5 : 1,
                      borderColor: isFullyBlocked
                        ? "rgba(248,113,113,0.5)"
                        : "rgba(148,163,184,0.45)",
                      backgroundColor: isFullyBlocked
                        ? "rgba(248,113,113,0.08)"
                        : inMonth
                        ? "#f8fafc"
                        : "#e5e7eb",
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 2,
                    }}
                  >
                    <View
                      style={[
                        styles.dateBadge,
                        todays && {
                          backgroundColor: "rgba(45,212,191,0.15)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateText,
                          todays && { color: COLORS.brandDark },
                        ]}
                      >
                        {d.date()}
                      </Text>
                    </View>
                    {todays && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: COLORS.brand,
                        }}
                      />
                    )}
                  </View>

                  {dayLabelEvents.length > 0 && (
                    <View style={{ gap: 2 }}>
                      {dayLabelEvents.map((ev, idx) => {
                        const main = formatTitleMain(ev.title);
                        const patient = main.replace("PatientName: ", "");
                        return (
                          <Text
                            key={ev.id + idx}
                            numberOfLines={1}
                            style={styles.eventLabel}
                          >
                            {dayjs(ev.start).format("HH:mm")} • {patient}
                          </Text>
                        );
                      })}
                    </View>
                  )}

                  {isFullyBlocked && (
                    <Text style={styles.fullBlockedText}>Full</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {disabledSchedule && (
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                color: COLORS.sub,
                fontWeight: "500",
              }}
            >
              Open this screen from a patient context to schedule a surgery.
            </Text>
          )}
        </View>

       
       
      </ScrollView>

      {/* Footer pinned above navigation */}
      <View
        style={[
          styles.footerWrap,
          { bottom: insets.bottom },
        ]}
      >
        <Footer active={"dashboard"} brandColor={COLORS.brand} />
      </View>
      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}

      {/* Schedule modal (date -> fields) */}
      <Modal
        visible={scheduleModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.sheet,
              { maxHeight: "90%", backgroundColor: "#fff" },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Add Surgery</Text>
                {selectedDate && (
                  <Text style={styles.sheetSub}>
                    {selectedDate.format("ddd, DD MMM YYYY")}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => setScheduleModalOpen(false)}
                style={styles.iconCircle}
              >
                <X size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {/* Room selection */}
              <View style={styles.block}>
                <Text style={[styles.label, { marginBottom: 6 }]}>
                  Room Number *
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {["101", "102", "103"].map((room) => {
                    const active = formData.roomNumber === room;
                    return (
                      <Pressable
                        key={room}
                        onPress={() => {
                          setFormData((p) => ({
                            ...p,
                            roomNumber: room,
                          }));
                        }}
                        style={[
                          styles.chip,
                          active && {
                            backgroundColor: COLORS.brand,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && { color: "#fff" },
                          ]}
                        >
                          Room {room}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {formErrors.roomNumber && (
                  <Text style={styles.errorText}>
                    {formErrors.roomNumber}
                  </Text>
                )}
              </View>

              {/* Attendees */}
              <View style={styles.block}>
                <View
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Users size={16} color={COLORS.text} />
                  <Text
                    style={[
                      styles.label,
                      { marginLeft: 6 },
                    ]}
                  >
                    Attendees *
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.sub,
                    marginTop: 2,
                  }}
                >
                  Tap to select / unselect doctors
                </Text>

                <View
                  style={{
                    marginTop: 6,
                    maxHeight: 180,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    paddingVertical: 4,
                  }}
                >
                  <ScrollView>
                    {attendeesList?.map((a) => {
                      const selected = formData.attendees.some(
                        (s) => s.id === a.id
                      );
                      return (
                        <Pressable
                          key={a.id}
                          onPress={() => {
                            setFormErrors((e) => ({
                              ...e,
                              attendees: undefined,
                            }));
                            setFormData((p) => {
                              const exists = p.attendees.some(
                                (s) => s.id === a.id
                              );
                              return {
                                ...p,
                                attendees: exists
                                  ? p.attendees.filter(
                                      (s) => s.id !== a.id
                                    )
                                  : [...p.attendees, a],
                              };
                            });
                          }}
                          style={[
                            styles.attendeeRow,
                            selected && {
                              backgroundColor: "#ecfeff",
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.attendeeName}>
                              {a.firstName} {a.lastName}
                            </Text>
                          </View>
                          {selected && (
                            <Check
                              size={18}
                              color={COLORS.brandDark}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                    {attendeesList.length === 0 && (
                      <Text
                        style={{
                          padding: 8,
                          fontSize: 12,
                          color: COLORS.sub,
                        }}
                      >
                        No attendees found.
                      </Text>
                    )}
                  </ScrollView>
                </View>
                {formErrors.attendees && (
                  <Text style={styles.errorText}>
                    {formErrors.attendees}
                  </Text>
                )}
              </View>

              {/* From / To time with wheel picker */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <View style={{ flex: 1 }}>
                  <TimePickerField
                    label="From Time *"
                    value={formData.fromTime}
                    onChange={(v) => {
                      setFormErrors((e) => ({
                        ...e,
                        fromTime: undefined,
                      }));
                      setFormData((p) => ({
                        ...p,
                        fromTime: v,
                      }));
                    }}
                  />
                  {formErrors.fromTime && (
                    <Text style={styles.errorText}>
                      {formErrors.fromTime}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <TimePickerField
                    label="To Time *"
                    value={formData.toTime}
                    onChange={(v) => {
                      setFormErrors((e) => ({
                        ...e,
                        toTime: undefined,
                      }));
                      setFormData((p) => ({
                        ...p,
                        toTime: v,
                      }));
                    }}
                  />
                  {formErrors.toTime && (
                    <Text style={styles.errorText}>
                      {formErrors.toTime}
                    </Text>
                  )}
                </View>
              </View>

              {/* Busy slots info */}
              {selectedDate && (
                <View style={[styles.block, { marginTop: 8 }]}>
                  <Text
                    style={[
                      styles.label,
                      { marginBottom: 4 },
                    ]}
                  >
                    Busy slots{" "}
                    {selectedRoom
                      ? `(Room ${selectedRoom})`
                      : "(All rooms)"}
                  </Text>
                  {busyIntervalsForSelectedDate.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#16a34a",
                        fontWeight: "700",
                      }}
                    >
                      No conflicts — all slots are free.
                    </Text>
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {busyIntervalsForSelectedDate.map(
                        ([s, e], i) => (
                          <View
                            key={i}
                            style={styles.busyChip}
                          >
                            <Text style={styles.busyChipText}>
                              {toHHMM(s)} – {toHHMM(e)}
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Modal actions */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 8,
              }}
            >
              <Pressable
                onPress={() => setScheduleModalOpen(false)}
                style={[
                  styles.sheetBtn,
                  { backgroundColor: COLORS.chip },
                ]}
              >
                <Text
                  style={{ color: COLORS.text, fontWeight: "800" }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => debouncedSubmit()}
                disabled={saving}
                style={[
                  styles.sheetBtn,
                  {
                    backgroundColor: COLORS.brand,
                    opacity: saving ? 0.6 : 1,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "800",
                    }}
                  >
                    Add Surgery
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OTScheduleScreen;

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 12, android: 8 }),
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 2,
  },

  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },
  monthText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 10,
  },

  weekHeaderRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
  },
  weekHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.sub,
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    padding: 4,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 64,
  },
  dateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  eventLabel: {
    fontSize: 10,
    color: "#0f172a",
    fontWeight: "600",
  },
  fullBlockedText: {
    marginTop: 4,
    fontSize: 10,
    color: "#b91c1c",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  upcomingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f9fafb",
    padding: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  upcomingDate: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  upcomingTime: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.sub,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.sub,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  upcomingPatient: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  upcomingSurgery: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  upcomingAttendees: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 2,
  },
  roomPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roomText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#0369a1",
  },

  // Generic form styles (used by TimePicker + modal)
  block: {
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    backgroundColor: "#f9fafb",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sheetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
  },

  // Time modal (shared)
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  timeModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 14,
  },
  wheel: {
    height: 180,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  wheelItem: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },

  // Footer & nav shield
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },

  // Bottom sheet
  sheet: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 18,
    padding: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  sheetSub: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 2,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  attendeeName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },

  busyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(248,113,113,0.08)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.4)",
  },
  busyChipText: {
    fontSize: 11,
    color: "#b91c1c",
    fontWeight: "700",
  },

  errorText: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.error,
    fontWeight: "700",
  },
});
