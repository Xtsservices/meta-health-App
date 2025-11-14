import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus } from "lucide-react-native";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";

// ---- colors / sizing ----
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  pill: "#eef2f7",
  brand: "#14b8a6",
  chipTemp: "#fef3c7",       // amber-100
  chipHR: "#e0f2fe",         // sky-100
  chipBP: "#fee2e2",         // rose-100
  chipRR: "#dcfce7",         // green-100
  chipSpO2: "#ede9fe",       // violet-100
  chipHRV: "#faf5ff",        // purple-50
};
const { width } = Dimensions.get("window");

// ---- types ----
type VitalRow = {
  id: string; // local key
  temperature?: number | string;
  pulse?: number | string;
  bp?: string | null;
  respiratoryRate?: number | string;
  oxygen?: number | string;
  hrv?: number | string;
  recordedDate?: string;
};



export default function VitalsTabScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);
  const timeline = cp?.patientTimeLineID;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<VitalRow[]>([]);

  const fetchVitals = useCallback(async () => {
    const timeLinePatientID =
      (typeof timeline === "object" ? timeline?.patientID : cp?.currentPatient?.id) ?? cp?.id;

    if (!timeLinePatientID) return;

    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const apiUrl =
        cp?.currentPatient?.role === "homecarepatient"
          ? `alerts/getIndividualHomeCarePatientsVitails/${cp?.currentPatient?.id}`
          : `vitals/${user?.hospitalID}/${timeLinePatientID}`;

      const res = await AuthFetch(apiUrl, token);
      let list: any[] = [];
      if (res?.status === "success" || res?.message === "success") {
        if (cp?.currentPatient?.role === "homecarepatient") {
          list = (res?.data.vitals || []).map((item: any, idx: number) => ({
            id: `hc-${idx}`,
            oxygen: Number(item.spo2) || "",
            pulse: Number(item.heartRate) || "",
            hrv: Number(item.heartRateVariability) || "",
            temperature: Number(item.temperature) || "",
            respiratoryRate: Number(item.respiratoryRate) || "",
            bp: null,
            recordedDate: item.addedOn || item.givenTime,
          }));
        } else {
          list = (res?.data?.vitals || []).map((v: any, idx: number) => ({
            id: String(v?.id ?? idx),
            temperature: v?.temperature ?? "",
            pulse: v?.pulse ?? "",
            bp: v?.bp ?? "",
            respiratoryRate: v?.respiratoryRate ?? "",
            oxygen: v?.oxygen ?? "",
            hrv: v?.hrv ?? "",
            recordedDate:
              v?.addedOn ||
              v?.temperatureTime ||
              v?.pulseTime ||
              v?.oxygenTime ||
              v?.respiratoryRateTime ||
              v?.hrvTime,
          }));
        }
      }

      // newest first
      list.reverse();
      const normalized: VitalRow[] = list.map((v: any, i: number) => ({
        id: v.id ?? String(i),
        temperature: v.temperature ?? "",
        pulse: v.pulse ?? "",
        bp: v.bp ?? "",
        respiratoryRate: v.respiratoryRate ?? "",
        oxygen: v.oxygen ?? "",
        hrv: v.hrv ?? "",
        recordedDate: v.recordedDate ? formatDateTime(v.recordedDate) : "-",
      }));
      setRows(normalized);
    } finally {
      setLoading(false);
    }
  }, [cp, timeline, user?.token, user?.hospitalID]);

  // refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchVitals();
    }, [fetchVitals])
  );

  const renderItem = ({ item, index }: { item: VitalRow; index: number }) => {
    return (
      <View
        style={[
          styles.card,
          { borderColor: COLORS.border, backgroundColor: COLORS.card },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: COLORS.text }]}>Record #{rows.length - index}</Text>
          <Text style={[styles.date, { color: COLORS.sub }]}>{item.recordedDate}</Text>
        </View>

        <View style={styles.chipsWrap}>
          <Chip label={`Temp: ${item.temperature || "-"}`} bg={COLORS.chipTemp} />
          <Chip label={`HR: ${item.pulse || "-"}`} bg={COLORS.chipHR} />
          <Chip label={`BP: ${item.bp || "-"}`} bg={COLORS.chipBP} />
          <Chip label={`RR: ${item.respiratoryRate || "-"}`} bg={COLORS.chipRR} />
          <Chip label={`SpO₂: ${item.oxygen || "-"}`} bg={COLORS.chipSpO2} />
          <Chip label={`HRV: ${item.hrv || "-"}`} bg={COLORS.chipHRV} />
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <Text style={{ color: COLORS.sub, marginBottom: 12 }}>No vital records found.</Text>
      <Pressable
        onPress={() => navigation.navigate("AddVitals" as never)}
        style={[styles.primaryBtn, { backgroundColor: COLORS.brand }]}
      >
        <Plus size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Record Vitals</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.safe, { paddingBottom: insets.bottom, backgroundColor: COLORS.bg }]}>
      {loading && rows.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={8}
          windowSize={10}
          maxToRenderPerBatch={8}
        />
      )}

      {/* FAB */}
      {rows.length > 0 && (
        <Pressable
          onPress={() => navigation.navigate("AddVitals" as never)}
          style={[
            styles.fab,
            {
              bottom: Math.max(16, insets.bottom + 12),
              backgroundColor: COLORS.brand,
              shadowColor: "#000",
            },
          ]}
        >
          <Plus size={22} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

function Chip({ label, bg }: { label: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: COLORS.border }]}>
      <Text style={{ color: COLORS.text, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 14, fontWeight: "800" },
  date: { fontSize: 12, fontWeight: "600" },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emptyWrap: {
    width: width - 32,
    alignSelf: "center",
    marginTop: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
});
