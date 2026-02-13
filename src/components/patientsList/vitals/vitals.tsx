// src/screens/.../VitalsTabScreen.tsx
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
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus } from "lucide-react-native";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import { formatDateTime, formatTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { COLORS } from "../../../utils/colour";

const { width } = Dimensions.get("window");

const FOOTER_H = 70;

// ---- types ----
type VitalRow = {
  id: string;
  temperature?: number | string;
  pulse?: number | string;
  bp?: string | null;
  respiratoryRate?: number | string;
  oxygen?: number | string;
  hrv?: number | string;
  recordedDate?: string;
  temperatureTime?: string;
  pulseTime?: string;
  bpTime?: string;
  respiratoryRateTime?: string;
  oxygenTime?: string;
  hrvTime?: string;
  hasCommonTime?: boolean;
};
type RouteParams = { ot: boolean };

export default function VitalsTabScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatinet = useSelector((s: RootState) => s.currentPatient);
  const timeline = currentPatinet?.patientTimeLineID;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<VitalRow[]>([]);
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const isOt = route.params?.ot;
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
      console.log("111",res)
      let list: any[] = [];
      if (res?.status === "success" && "data" in res) {
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
            hasCommonTime: true,
          }));
        } else {
          list = (res?.data?.vitals || []).map((vital: any, idx: number) => {
            const timestamps = [
              vital?.temperatureTime,
              vital?.pulseTime,
              vital?.bpTime,
              vital?.oxygenTime,
              vital?.respiratoryRateTime,
              vital?.hrvTime,
              vital?.addedOn,
              vital?.givenTime
            ].filter(Boolean);
            
            const latestTimestamp = timestamps.length > 0 
              ? timestamps.reduce((latest, current) => {
                  return new Date(current) > new Date(latest) ? current : latest;
                })
              : vital?.addedOn;
            
            const uniqueTimes = new Set([
              vital?.temperatureTime,
              vital?.pulseTime,
              vital?.bpTime,
              vital?.oxygenTime,
              vital?.respiratoryRateTime,
              vital?.hrvTime
            ].filter(Boolean));
            
            const hasCommonTime = uniqueTimes.size <= 1;
            
            return {
            id: String(vital?.id ?? idx),
            temperature: vital?.temperature ?? "",
            pulse: vital?.pulse ?? "",
            bp: vital?.bp ?? "",
            respiratoryRate: vital?.respiratoryRate ?? "",
            oxygen: vital?.oxygen ?? "",
            hrv: vital?.hrv ?? "",
            recordedDate: latestTimestamp || vital?.addedOn,
            temperatureTime: vital?.temperatureTime,
            pulseTime: vital?.pulseTime,
            bpTime: vital?.bpTime,
            respiratoryRateTime: vital?.respiratoryRateTime,
            oxygenTime: vital?.oxygenTime,
            hrvTime: vital?.hrvTime,
            hasCommonTime,
          };
        });
      }
      }

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
        temperatureTime: vital?.temperatureTime ? formatTime(vital?.temperatureTime) : undefined,
        pulseTime: vital?.pulseTime ? formatTime(vital?.pulseTime) : undefined,
        bpTime: vital?.bpTime ? formatTime(vital?.bpTime) : undefined,
        respiratoryRateTime: vital?.respiratoryRateTime ? formatTime(vital?.respiratoryRateTime) : undefined,
        oxygenTime: vital?.oxygenTime ? formatTime(vital?.oxygenTime) : undefined,
        hrvTime: vital?.hrvTime ? formatTime(vital?.hrvTime) : undefined,
        hasCommonTime: vital?.hasCommonTime ?? false,
      }));
      setRows(normalized);
    } finally {
      setLoading(false);
    }
  }, [currentPatinet, timeline, user?.token, user?.hospitalID]);

  useFocusEffect(
    useCallback(() => {
      fetchVitals();
    }, [fetchVitals])
  );

  const renderItem = ({ item, index }: { item: VitalRow; index: number }) => {
    const hasValue = (v: any) =>
      v !== undefined && v !== null && v !== "" && v !== 0 && v !== "0";

    const chips: { label: string; bg: string; time?: string }[] = [];
    if (hasValue(item.temperature)) chips.push({ label: `Temp: ${item.temperature}`, bg: COLORS.chipTemp, time: item.temperatureTime });
    if (hasValue(item.pulse)) chips.push({ label: `HR: ${item.pulse}`, bg: COLORS.chipHR, time: item.pulseTime });
    if (hasValue(item.bp)) chips.push({ label: `BP: ${item.bp}`, bg: COLORS.chipBP, time: item.bpTime });
    if (hasValue(item.respiratoryRate)) chips.push({ label: `RR: ${item.respiratoryRate}`, bg: COLORS.chipRR, time: item.respiratoryRateTime });
    if (hasValue(item.oxygen)) chips.push({ label: `SpO₂: ${item.oxygen}`, bg: COLORS.chipSpO2, time: item.oxygenTime });
    if (hasValue(item.hrv)) chips.push({ label: `HRV: ${item.hrv}`, bg: COLORS.chipHRV, time: item.hrvTime });
const commonTime =
  item.hasCommonTime
    ? item.temperatureTime ||
      item.pulseTime ||
      item.bpTime ||
      item.respiratoryRateTime ||
      item.oxygenTime ||
      item.hrvTime
    : undefined;

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
        {item.hasCommonTime && commonTime && (
          <Text style={[styles.commonTime, { color: COLORS.sub }]}>
            Time: {commonTime}
          </Text>
        )}
        {chips.length > 0 && (
          <View style={styles.chipsWrap}>
            {chips.map((c, i) => (
              <Chip key={`${item.id}-chip-${i}`} label={c.label} bg={c.bg} time={item.hasCommonTime ? undefined : c.time} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <Text style={{ color: COLORS.sub, marginBottom: 12 }}>No vital records found.</Text>
      {currentPatinet.ptype != 21 && !isOt && user?.roleName !== "reception" && (
        <Pressable
          onPress={() => navigation.navigate("AddVitals" as never)}
          style={[styles.primaryBtn, { backgroundColor: COLORS.brand }]}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Record Vitals</Text>
        </Pressable>
      )}
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

      {!isOt && rows.length > 0 && user?.roleName !== "reception" && (
        currentPatinet.ptype != 21 && (
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
        )
      )}

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </View>
  );
}

function Chip({ label, bg, time }: { label: string; bg: string; time?: string }) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <View style={[styles.chip, { backgroundColor: bg, borderColor: COLORS.border }]}>
        <Text style={{ color: COLORS.text, fontWeight: "700" }}>{label}</Text>
      </View>
      {time && (
        <Text style={[styles.chipTime, { color: COLORS.sub }]}>{time}</Text>
      )}
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
    marginRight: 8,
    marginBottom: 8,
  },
  chipTime: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    marginLeft: 2,
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
  commonTime: {
  fontSize: 11,
  fontWeight: "600",
  marginTop: 6,
}
});