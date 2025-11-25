import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExternalLink } from "lucide-react-native";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import Footer from "../../dashboard/footer";
import { COLORS } from "../../../utils/colour";



type Prescription = {
  id: number;
  medicine?: string;
  medicineDuration?: string | number;
  meddosage?: number;
  dosageUnit?: string;
  medicineFrequency?: string | number;
  medicineTime?: string;           // "Morning,Afternoon"
  test?: string;                   // "CBC|Fasting#LFT|8am ..."
  advice?: string;
  followUp?: 0 | 1 | number | string;
  followUpDate?: string;
  addedOn?: string;
  status?: number | string;        // 1 active / 0 inactive
  medicineNotes?: string;
  medicineStartDate?: string;
  medicineType?: number | string;
};



const FOOTER_H = 64;

const parseTests = (t?: string) =>
  (t || "")
    .split("#")
    .map((s) => s.trim())
    .filter(Boolean);

const parseTimes = (t?: string) =>
  (t || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const statusLabel = (s: any) => {
  if (s === 1 || s === "1" || String(s).toLowerCase() === "active") return "Active";
  if (s === 0 || s === "0" || String(s).toLowerCase() === "inactive") return "Inactive";
  return String(s ?? "-");
};

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  const yy = d.getFullYear();
  return `${dd} ${mm} ${yy}`;
};

export default function PrescriptionScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);
  const timeline = cp?.patientTimeLineID || {};

  const [list, setList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // read-only details modal (simple & fast)
  const [detail, setDetail] = useState<Prescription | null>(null);

  const patientID = cp?.currentPatient?.id ?? cp?.id;
  const timelineID = typeof timeline === "object" ? timeline?.id : timeline;

  const fetchPrescriptions = useCallback(async () => {
    if (!user?.hospitalID || !timelineID || !patientID) return;
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    const url = `prescription/${user.hospitalID}/${timelineID}/${patientID}`;
    const res = await AuthFetch(url, token);
    if (res?.status === "success" && "data" in res) {
      setList(res?.data?.prescriptions ?? []);
    } else {
      setList([]);
    }
  }, [user?.hospitalID, user?.token, timelineID, patientID]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPrescriptions().finally(() => setLoading(false));
    }, [fetchPrescriptions])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrescriptions().finally(() => setRefreshing(false));
  }, [fetchPrescriptions]);

  const bottomPad = FOOTER_H + Math.max(16, insets.bottom);
  const fabBottom = FOOTER_H + Math.max(insets.bottom, 12) + 12;

  const renderItem = ({ item, index }: { item: Prescription; index: number }) => {
    const tests = parseTests(item.test);
    const times = parseTimes(item.medicineTime);
    const sLabel = statusLabel(item.status);
    const dosage =
      (item.meddosage ?? item.meddosage === 0 ? String(item.meddosage) : "") +
      (item.dosageUnit ? ` ${item.dosageUnit}` : "");

    return (
      <Pressable
        onPress={() => setDetail(item)}
        style={[styles.cardRow, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}
      >
        <View style={styles.rowLeftIndex}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>

        <View style={styles.rowMiddle}>
          <Text style={styles.title} numberOfLines={2}>
            {item.medicine || "(Tests Only)"}
          </Text>
          <View style={styles.metaWrap}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{sLabel}</Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.meta}>{formatDate(item.addedOn)}</Text>
            {dosage ? (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.meta}>{dosage}</Text>
              </>
            ) : null}
          </View>

          {tests?.length ? (
            <View style={styles.chipsWrap}>
              {tests.map((t, i) => (
                <View key={`${t}-${i}`} style={styles.chip}>
                  <Text style={styles.chipText}>{t.split("|")[0]}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {times?.length ? (
            <Text style={styles.times} numberOfLines={1}>
              {times.join(", ")}
            </Text>
          ) : null}
        </View>

        <View style={styles.rowRight}>
          <ExternalLink size={18} color={COLORS.text} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: COLORS.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prescriptions</Text>
      </View>

      {/* Body */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : list.length === 0 ? (
          <View style={[styles.emptyWrap, { paddingBottom: bottomPad }]}>
            <Text style={styles.emptyText}>No prescriptions yet</Text>
            <Pressable
              onPress={() => navigation.navigate("AddMedicineTest" as never, {} as never)}
              style={[styles.bigAddBtn, { backgroundColor: COLORS.brand }]}
            >
              <Text style={styles.bigAddText}>Add Prescription</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ padding: 12, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator
            scrollIndicatorInsets={{ bottom: bottomPad }}
            scrollEventThrottle={16}
            decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
            initialNumToRender={12}
            windowSize={11}
            removeClippedSubviews={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
            }
          />
        )}
      </View>

      {/* FAB when we have any prescriptions */}
      {list.length > 0 && (
      cp.ptype != 21 && (
        <Pressable
          onPress={() => navigation.navigate("AddMedicineTest" as never, {} as never)}
          style={[
            styles.fab,
            {
              right: 16,
              bottom: fabBottom,
              backgroundColor: COLORS.brand,
            },
          ]}
        >
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      )
      )}

      {/* Footer pinned above system nav */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />}

      {/* Details modal (read-only) */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: COLORS.card }]}>
            <Text style={styles.modalTitle}>Prescription Details</Text>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.label}>ID</Text>
              <Text style={styles.value}>{detail?.id ?? "-"}</Text>

              <Text style={styles.label}>Medicine</Text>
              <Text style={styles.value}>{detail?.medicine || "-"}</Text>

              <Text style={styles.label}>Dosage</Text>
              <Text style={styles.value}>
                {(detail?.meddosage ?? detail?.meddosage === 0 ? String(detail?.meddosage) : "") +
                  (detail?.dosageUnit ? ` ${detail?.dosageUnit}` : "") || "-"}
              </Text>

              <Text style={styles.label}>Duration (days)</Text>
              <Text style={styles.value}>{detail?.medicineDuration ?? "-"}</Text>

              <Text style={styles.label}>Prescribed Date</Text>
              <Text style={styles.value}>{formatDate(detail?.addedOn)}</Text>

              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{statusLabel(detail?.status)}</Text>

              <Text style={styles.label}>Frequency / Time</Text>
              <Text style={styles.value}>
                {parseTimes(detail?.medicineTime).length
                  ? parseTimes(detail?.medicineTime).join(", ")
                  : String(detail?.medicineFrequency ?? "-")}
              </Text>

              <Text style={styles.label}>Test(s)</Text>
              {parseTests(detail?.test).length ? (
                <View style={styles.chipsWrap}>
                  {parseTests(detail?.test).map((t, i) => (
                    <View key={`${t}-${i}`} style={styles.chip}>
                      <Text style={styles.chipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.value}>-</Text>
              )}

              <Text style={styles.label}>Instructions</Text>
              <Text style={styles.value}>{detail?.advice || "-"}</Text>

              <Text style={styles.label}>Notes</Text>
              <Text style={styles.value}>{detail?.medicineNotes || "-"}</Text>

              <Text style={styles.label}>Follow Up</Text>
              <Text style={styles.value}>
                {String(detail?.followUp ?? 0) === "1" ? formatDate(detail?.followUpDate) : "No"}
              </Text>
            </ScrollView>

            <Pressable onPress={() => setDetail(null)} style={[styles.modalCloseBtn, { backgroundColor: COLORS.brand }]}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  emptyText: { color: COLORS.sub, fontWeight: "700" },
  bigAddBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  bigAddText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 90,
    gap: 12,
  },
  rowLeftIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  indexText: { color: COLORS.pillText, fontWeight: "900" },
  rowMiddle: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "900", color: COLORS.text, flexWrap: "wrap", lineHeight: 20 },
  metaWrap: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6 },
  pill: { backgroundColor: COLORS.pillBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { color: COLORS.pillText, fontWeight: "800", fontSize: 11 },
  dot: { color: COLORS.sub, fontWeight: "900" },
  meta: { color: COLORS.sub, fontWeight: "700", fontSize: 12 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: { backgroundColor: "#f1f5f9", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: COLORS.text, fontWeight: "800", fontSize: 11 },

  times: { color: COLORS.sub, fontWeight: "700", marginTop: 6 },

  rowRight: { paddingTop: 2 },

  // FAB
  fab: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontWeight: "900", fontSize: 24, marginTop: -2 },

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

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { color: COLORS.text, fontWeight: "900", fontSize: 16, marginBottom: 10 },
  label: { color: COLORS.sub, fontWeight: "800", marginTop: 8 },
  value: { color: COLORS.text, fontWeight: "800", marginTop: 4 },
  modalCloseBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalCloseText: { color: "#fff", fontWeight: "900" },
});
