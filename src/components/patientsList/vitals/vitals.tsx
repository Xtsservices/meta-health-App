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
import Footer from "../../dashboard/footer";

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

const FOOTER_H = 70;

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
  const currentPatinet = useSelector((s: RootState) => s.currentPatient);
  const timeline = currentPatinet?.patientTimeLineID;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<VitalRow[]>([]);

  const bottomPad = FOOTER_H + Math.max(insets.bottom, 16) + 16;

  const fetchVitals = useCallback(async () => {
    const timeLinePatientID =
      (typeof timeline === "object" ? timeline?.patientID : currentPatinet?.currentPatient?.id) ?? currentPatinet?.id;

    if (!timeLinePatientID) return;

    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const apiUrl =
        currentPatinet?.currentPatient?.role === "homecarepatient"
          ? `alerts/getIndividualHomeCarePatientsVitails/${currentPatinet?.currentPatient?.id}`
          : `vitals/${user?.hospitalID}/${timeLinePatientID}`;

      const res = await AuthFetch(apiUrl, token);
      let list: any[] = [];
      if (res?.status === "success" || res?.message === "success") {
        if (currentPatinet?.currentPatient?.role === "homecarepatient") {
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
          list = (res?.data?.vitals || []).map((vital: any, idx: number) => ({
            id: String(vital?.id ?? idx),
            temperature: vital?.temperature ?? "",
            pulse: vital?.pulse ?? "",
            bp: vital?.bp ?? "",
            respiratoryRate: vital?.respiratoryRate ?? "",
            oxygen: vital?.oxygen ?? "",
            hrv: vital?.hrv ?? "",
            recordedDate:
              vital?.addedOn ||
              vital?.temperatureTime ||
              vital?.pulseTime ||
              vital?.oxygenTime ||
              vital?.respiratoryRateTime ||
              vital?.hrvTime,
          }));
        }
      }

      // newest first
      list.reverse();
      const normalized: VitalRow[] = list.map((vital: any, i: number) => ({
        id: vital.id ?? String(i),
        temperature: vital.temperature ?? "",
        pulse: vital.pulse ?? "",
        bp: vital.bp ?? "",
        respiratoryRate: vital.respiratoryRate ?? "",
        oxygen: vital.oxygen ?? "",
        hrv: vital.hrv ?? "",
        recordedDate: vital?.recordedDate ? formatDateTime(vital?.recordedDate) : "-",
      }));
      setRows(normalized);
    } finally {
      setLoading(false);
    }
  }, [currentPatinet, timeline, user?.token, user?.hospitalID]);

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
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {loading && rows.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
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
              bottom: FOOTER_H + Math.max(insets.bottom, 12) + 12,
              backgroundColor: COLORS.brand,
              shadowColor: "#000",
            },
          ]}
        >
          <Plus size={22} color="#fff" />
        </Pressable>
      )}

      {/* Footer pinned above system nav */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
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
  safe: { 
    flex: 1,
  },
  loadingWrap: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  rowBetween: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  title: { 
    fontSize: 14, 
    fontWeight: "800" 
  },
  date: { 
    fontSize: 12, 
    fontWeight: "600" 
  },
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
  primaryBtnText: { 
    color: "#fff", 
    fontWeight: "800" 
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
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
});