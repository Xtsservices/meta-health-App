// src/screens/doctors/DoctorSlotsScreen.tsx

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronLeft, CalendarRange, Clock } from "lucide-react-native";
import { RootState } from "../../../store/store";
import { FONT_SIZE, FOOTER_HEIGHT, ICON_SIZE, SPACING } from "../../../utils/responsive";
import { AuthFetch } from "../../../auth/auth";
import { COLORS } from "../../../utils/colour";
import { convertTo12Hour, formatDate } from "../../../utils/dateTime";



const { width: SCREEN_WIDTH } = Dimensions.get("window");

type SimpleSlot = {
  date: string;
  fromTime: string;
  toTime: string;
  availableSlots?: number;
  [key: string]: any;
};

const DoctorSlotsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);

  const doctorId: number | null = route.params?.doctorId ?? null;
  const doctorName: string | undefined = route.params?.doctorName;

  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<SimpleSlot[]>([]);

  const bottomPad = (FOOTER_HEIGHT || 70) + insets.bottom + 16;

  useEffect(() => {
    const fetchSlots = async () => {
      if (!doctorId || !user?.hospitalID) return;

      setLoading(true);
      try {
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        if (!token) {
          setSlots([]);
          setLoading(false);
          return;
        }
        const url = `doctor/${user?.hospitalID}/${doctorId}/getDoctorAppointmentsSlotsFromCurrentDate`;
        const resp = await AuthFetch(url, token);
        const data = resp?.data?.data || [];
        const flattened: SimpleSlot[] = [];

        data.forEach((s: any) => {
          if (Array.isArray(s.slots)) {
            s.slots.forEach((slot: any) => flattened.push(slot));
          } else if (s.fromTime && s.toTime) {
            flattened.push(s);
          }
        });

        // sort by date + fromTime for nicer UI
        flattened.sort((a, b) => {
          const da = new Date(a.date).getTime();
          const db = new Date(b.date).getTime();
          if (da !== db) return da - db;
          return String(a.fromTime).localeCompare(String(b.fromTime));
        });

        setSlots(flattened);
      } catch (err) {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [doctorId, user?.hospitalID]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, SimpleSlot[]>();
    slots.forEach((s) => {
      const key = s.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    return Array.from(map.entries()).map(([date, list]) => ({
      date,
      slots: list,
    }));
  }, [slots]);

  const renderHeader = () => (
    <View style={styles.header}>

      <View style={styles.headerTextWrap}>
        <Text style={[styles.title, { color: COLORS.text }]}>
          Available Slots
        </Text>
        {doctorName ? (
          <Text style={[styles.subtitle, { color: COLORS.sub }]}>
            Dr. {doctorName}
          </Text>
        ) : (
          <Text style={[styles.subtitle, { color: COLORS.sub }]}>
            Select an appointment time
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <CalendarRange size={32} color={COLORS.sub} />
      <Text style={[styles.emptyTitle, { color: COLORS.text }]}>
        No available slots
      </Text>
      <Text style={[styles.emptySub, { color: COLORS.sub }]}>
        This doctor currently has no open slots from today onwards.
      </Text>
    </View>
  );

  const renderSlotItem = (slot: SimpleSlot, index: number) => {
    const from = convertTo12Hour(String(slot.fromTime));
    const to = convertTo12Hour(String(slot.toTime));
    const availableLabel =
      slot.availableSlots === undefined || slot.availableSlots === null
        ? "-"
        : String(slot.availableSlots);

    return (
      <View
        key={`${slot.date}-${slot.fromTime}-${slot.toTime}-${index}`}
        style={[
          styles.slotCard,
          { backgroundColor: COLORS.card, borderColor: COLORS.border },
        ]}
      >
        <View style={styles.slotTimeRow}>
          <Clock size={ICON_SIZE.sm} color={COLORS.brand} />
          <Text style={[styles.slotTimeText, { color: COLORS.text }]}>
            {from} – {to}
          </Text>
        </View>
        <View style={styles.slotBottomRow}>
          <Text style={[styles.availableLabel, { color: COLORS.sub }]}>
            Available
          </Text>
          <View
            style={[
              styles.availableBadge,
              { backgroundColor: COLORS.brandSoft },
            ]}
          >
            <Text
              style={[styles.availableValue, { color: COLORS.brandDark }]}
            >
              {availableLabel}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDateSection = ({
    item,
  }: {
    item: { date: string; slots: SimpleSlot[] };
  }) => {
    const dateLabel = formatDate(item.date);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionDate, { color: COLORS.text }]}>
            {dateLabel}
          </Text>
          <Text style={[styles.sectionCount, { color: COLORS.sub }]}>
            {item.slots.length} slot
            {item.slots.length === 1 ? "" : "s"}
          </Text>
        </View>
        <View style={styles.sectionSlotsWrap}>
          {item.slots.map((s, idx) => renderSlotItem(s, idx))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: COLORS.bg,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={[styles.loadingText, { color: COLORS.sub }]}>
            Loading slots…
          </Text>
        </View>
      ) : groupedByDate.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={groupedByDate}
          keyExtractor={(it) => it.date}
          renderItem={renderDateSection}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        />
      )}
    </SafeAreaView>
  );
};

export default DoctorSlotsScreen;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  backBtn: {
    padding: 6,
    marginRight: SPACING.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: SPACING.sm,
  },
  emptySub: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: SPACING.xs,
  },
  sectionDate: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  sectionCount: {
    fontSize: FONT_SIZE.xs,
  },
  sectionSlotsWrap: {
    borderRadius: 12,
  },
  slotCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  slotTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  slotTimeText: {
    marginLeft: 8,
    fontSize: SCREEN_WIDTH < 360 ? 13 : 14,
    fontWeight: "600",
  },
  slotBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  availableLabel: {
    fontSize: FONT_SIZE.xs,
  },
  availableBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  availableValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
  },
});
