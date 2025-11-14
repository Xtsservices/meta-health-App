import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trash2, Plus } from "lucide-react-native";
import { authDelete, AuthFetch } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";


type RootState = any;
const selectUser = (s: RootState) => s.currentUser;
const selectCurrentPatient = (s: RootState) => s.currentPatient;

type SymptomRow = {
  id: number;
  conceptID?: number | string | null;
  symptom: string;
  duration?: string;
  durationParameter?: string;
  addedOn?: string | null;
  userID?: number | null;
};

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  field: "#f8fafc",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  button: "#14b8a6",
  buttonText: "#ffffff",
  danger: "#ef4444",
  pill: "#eef2f7",
};

const cap = (s: string) => (s ? s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase() : "");

export default function SymptomsScreen() {
  const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
    const currentpatient = useSelector((s: RootState) => s.currentPatient);
    const timeline = currentpatient?.patientTimeLineID; // may be object or id depending on your store
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<SymptomRow[]>([]);

  const load = useCallback(async () => {
    if (!timeline) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(`symptom/${currentpatient.id}`, token);
      if (res?.status === "success") {
        const rows: SymptomRow[] = (res?.data?.symptoms || []).map((s: any) => ({
          id: Number(s?.id),
          conceptID: s?.conceptID ?? s?.concept_id ?? null,
          symptom: String(s?.symptom || s?.term || ""),
          duration: s?.duration || "",
          durationParameter: s?.durationParameter || "",
          addedOn: s?.addedOn || s?.createdAt || null,
          userID: s?.userID ?? null,
        }));
        rows.sort((a, b) => new Date(b.addedOn || 0).getTime() - new Date(a.addedOn || 0).getTime());
        setList(rows);
      } else {
        setList([]);
      }
    } finally {
      setLoading(false);
    }
  }, [timeline?.patientID, user?.token]);

  // Reload every time the screen gets focus (this covers returning from AddSymptoms)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDelete = async (row: SymptomRow) => {
    if (!timeline?.id || !row?.id) return;
    Alert.alert("Delete Symptom", "Are you sure you want to delete this symptom?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = user?.token ?? (await AsyncStorage.getItem("token"));
            // const res = await authDelete(`symptom/${timeline.id}/${row.id}`, token);
            // if (res?.message === "success") {
            //   setList((prev) => prev.filter((x) => x.id !== row.id));
            // }
          } catch {
            Alert.alert("Error", "Failed to delete symptom.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: SymptomRow }) => (
    <View style={[styles.row, { borderColor: COLORS.border }]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.title, { color: COLORS.text }]}>{cap(item.symptom)}</Text>
        <Text style={[styles.sub, { color: COLORS.sub }]}>
          {item.conceptID ? `SNOMED: ${item.conceptID}` : "SNOMED: N/A"}
        </Text>
        <Text style={[styles.sub, { color: COLORS.sub }]}>
          {item.duration ? `${item.duration} ${cap(item.durationParameter || "")}` : "—"}
        </Text>
        <Text style={[styles.sub, { color: COLORS.sub }]}>{formatDateTime(item.addedOn)}</Text>
      </View>
      <Pressable onPress={() => onDelete(item)} style={styles.deleteBtn} hitSlop={8}>
        <Trash2 size={18} color={COLORS.danger} />
      </Pressable>
    </View>
  );

  const empty = !loading && list.length === 0;

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : empty ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: COLORS.sub }]}>No symptoms recorded yet</Text>
          <Pressable
            style={[styles.cta, { backgroundColor: COLORS.button }]}
            onPress={() => navigation.navigate("AddSymptoms" as never)}
          >
            <Plus size={18} color={COLORS.buttonText} />
            <Text style={[styles.ctaText, { color: COLORS.buttonText }]}>Add Symptom</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={list}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
          <Pressable
            style={[styles.fab, { backgroundColor: COLORS.button }]}
            onPress={() => navigation.navigate("AddSymptoms" as never)}
          >
            <Plus size={20} color={COLORS.buttonText} />
          </Pressable>
        </>
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  emptyText: { fontSize: 14, fontWeight: "600" },

  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowLeft: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "800" },
  sub: { fontSize: 12, fontWeight: "600" },

  deleteBtn: { paddingHorizontal: 6, paddingVertical: 4, alignSelf: "center" },

  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  cta: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaText: { fontWeight: "800", fontSize: 14 },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 70,
    justifyContent: "center",
    // Footer itself should render full width
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});
