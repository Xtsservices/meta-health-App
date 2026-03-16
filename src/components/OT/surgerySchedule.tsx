// src/screens/ot/ScheduleScreen.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalendarDays, Clock, MapPin, Users, Plus } from "lucide-react-native";

import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import Footer from "../dashboard/footer";
import { showError } from "../../store/toast.slice";

dayjs.extend(utc);

/* ---------- Types ---------- */
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

/* ---------- Props ---------- */
type Props = {
  type?: "dashboard" | "standalone";
};

/* ---------- Helpers ---------- */
const BRAND = "#14b8a6";

const asLocalDate = (val: string | Date) => {
  if (val instanceof Date) return val;
  if (/Z$/i.test(val)) {
    const d = dayjs.utc(val);
    return new Date(d.year(), d.month(), d.date(), d.hour(), d.minute(), d.second(), d.millisecond());
  }
  return new Date(val);
};

const getRoomFromEvent = (ev: EventItem): string | undefined => {
  if (ev.extendedProps?.roomNumber) return ev.extendedProps.roomNumber;
  const m = /Room Number:\s*([A-Za-z0-9-_]+)/i.exec(ev.title);
  return m?.[1];
};

const formatLines = (title: string) => {
  const lines = String(title).split("\n");
  return { main: lines[0] || title, sub: lines.slice(1).join(" • ") };
};

/* =========================================================
   ScheduleScreen (list as cards + FAB + footer)
   ========================================================= */
const ScheduleScreen: React.FC<Props> = ({ type = "standalone" }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const user = useSelector((s: RootState) => s.currentUser);
    const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
const isCurrentPatientInSchedule = useMemo(() => {
  if (!currentPatient?.pID) return false;

  return events.some(
    (ev) =>
      String(ev.extendedProps?.patientId) === String(currentPatient.pID)
  );
}, [events, currentPatient?.pID]);


  // Determine if we should show FAB and footer
  const showFabAndFooter =
 type === "standalone" && !isCurrentPatientInSchedule;
  const isDashboard = type === "dashboard";

  const fetchEvents = useCallback(async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);

      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !user?.id || !token) {
        setEvents([]);
        return;
      }

      const res = await AuthFetch(
        `schedule/${user.hospitalID}/${user.id}/viewSchedule`,
        token
      );

      if (res?.status === 'success' && "data" in res) {
        const arr: EventItem[] = (res?.data?.data || []).map((eventData: any) => ({
          id: String(eventData.pID),
          title:
            `PatientName: ${eventData.pName}\n` +
            `PatientId: ${eventData.pID}\n` +
            `Attendees: ${eventData.attendees}\n` +
            `Room Number: ${eventData.roomID}\n` +
            `Surgery Type: ${eventData.surgeryType}`,
          start: asLocalDate(eventData.startTime),
          end: asLocalDate(eventData.endTime),
          extendedProps: {
            patientId: String(eventData.pID),
            patientName: eventData.pName,
            attendees: eventData.attendees,
            surgeryType: eventData.surgeryType,
            roomNumber: eventData.roomNumber,
          },
        }));
        setEvents(arr);
      } else {
        setEvents([]);
      }
    } catch (err: any) {
      dispatch(
        showError(err?.message || "Failed to fetch scheduled surgeries")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.hospitalID, user?.id, dispatch]);

  useFocusEffect(
    useCallback(() => {
    fetchEvents(false);
  }, [fetchEvents]))

  const futureEvents = useMemo(() => {
    const todayStart = dayjs().startOf("day");
    return events
      .filter((ev) => {
        const s = dayjs(ev.start);
        return s.isSame(todayStart, "day") || s.isAfter(todayStart);
      })
      .sort(
        (a, b) =>
          dayjs(a.start).valueOf() - dayjs(b.start).valueOf()
      );
  }, [events]);

  const renderCard = ({ item }: { item: EventItem }) => {
    const start = dayjs(item.start);
    const end = dayjs(item.end);
    const dateLabel = start.format("DD MMM YYYY");
    const startTime = start.format("h:mm A");
    const endTime = end.format("h:mm A");
    const room = getRoomFromEvent(item) ?? "—";

    const { main } = formatLines(item.title);
    const patientName = main.replace("PatientName: ", "");

    const surgeryLine =
      /Surgery Type:\s*([^\n]+)/.exec(item.title)?.[1] ??
      item.extendedProps?.surgeryType ??
      "—";

    const attendeesStr =
      typeof item.extendedProps.attendees === "string"
        ? item.extendedProps.attendees
        : item.extendedProps.attendees
            ?.map((a: any) => `${a.firstName} ${a.lastName}`)
            .join(", ");

    return (
      <View style={styles.card}>
        {/* Top row: date + room */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.rowCenter}>
            <CalendarDays size={16} color="#0f172a" />
            <Text style={styles.dateText}>{dateLabel}</Text>
          </View>
          <View style={styles.roomPill}>
            <MapPin size={14} color="#0369a1" />
            <Text style={styles.roomText}>Room {room}</Text>
          </View>
        </View>

        {/* Times */}
        <View style={styles.timeRow}>
          <View style={styles.rowCenter}>
            <Clock size={16} color="#64748b" />
            <Text style={styles.timeText}>
              {startTime} – {endTime}
            </Text>
          </View>
        </View>

        {/* Patient + Surgery */}
        <View style={styles.bodyBlock}>
          <Text style={styles.patientLabel}>Patient</Text>
          <Text style={styles.patientName} numberOfLines={2}>
            {patientName}
          </Text>
        </View>

        <View style={styles.bodyBlock}>
          <Text style={styles.patientLabel}>Surgery</Text>
          <Text style={styles.surgeryText} numberOfLines={2}>
            {surgeryLine}
          </Text>
        </View>

        {/* Attendees */}
        <View style={styles.bodyBlock}>
          <View style={styles.rowCenter}>
            <Users size={16} color="#0f172a" />
            <Text style={styles.patientLabel}>Attendees</Text>
          </View>
          <Text style={styles.attendeesText} numberOfLines={3}>
            {attendeesStr || "—"}
          </Text>
        </View>
      </View>
    );
  };

  const keyExtractor = (item: EventItem, index: number) =>
    item.id + "_" + index;

  const handleAddPress = () => {
    // 👉 navigate to your create-schedule screen
    // change "ScheduleForm" to whatever route you use for adding surgery
    navigation.navigate("Schedule" as never);
  };


  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Loading scheduled surgeries…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scheduled Surgeries</Text>
        <Text style={styles.headerSub}>
          From today onwards
        </Text>
      </View>

      {/* Cards list */}
      <FlatList
        data={futureEvents}
        keyExtractor={keyExtractor}
        renderItem={renderCard}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: showFabAndFooter ? insets.bottom + 120 : insets.bottom + 20, // Adjust padding based on type
        }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => fetchEvents(true)}
      />

      {/* Footer (fixed at bottom) - only show for standalone */}
      {showFabAndFooter && (
        <View style={[styles.footerWrap, { paddingBottom: insets.bottom }]}>
          <Footer active={"dashboard"} brandColor={BRAND} />
        </View>
      )}

      {/* FAB button above footer - only show for standalone */}
      {showFabAndFooter && !isCurrentPatientInSchedule && (
        <Pressable
          style={[
            styles.fab,
            { bottom: insets.bottom + 72 },
          ]}
          onPress={handleAddPress}
        >
          <Plus size={26} color="#ffffff" />
          <Text style={styles.fabLabel}>Schedule</Text>
        </Pressable>
      )}
    </View>
  );
};

export default ScheduleScreen;

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },

  header: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },

  dateText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },

  roomPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roomText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#0369a1",
  },

  timeRow: {
    marginTop: 4,
    marginBottom: 10,
  },
  timeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },

  bodyBlock: {
    marginTop: 4,
  },
  patientLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#94a3b8",
    marginLeft: 2,
    marginBottom: 2,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  surgeryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  attendeesText: {
    marginTop: 2,
    fontSize: 12,
    color: "#475569",
  },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    zIndex: 10,
    elevation: 6,
  },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    zIndex: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 1,
  },
});