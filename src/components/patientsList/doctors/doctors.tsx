import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus } from "lucide-react-native";
import { AuthFetch } from "../../../auth/auth";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDateTime } from "../../../utils/dateTime";
import { COLORS } from "../../../utils/colour";

type RootState = any;

type PatientDoctor = {
  id: number;
  firstName?: string;
  lastName?: string;
  department?: string | null;
  assignedDate?: string | null;
  active: boolean;
  purpose?: string | null;
  category: "primary" | "secondary";
};



const FOOTER_H = 70;

const cap = (s?: string | null) =>
  s ? s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase() : "";

const fullName = (f?: string, l?: string) =>
  [f?.trim(), l?.trim()].filter(Boolean).join(" ") || "—";

export default function DoctorsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);

  const timelineId =
    cp?.timeline?.id ?? cp?.patientTimeLineID ?? cp?.timeline ?? null;

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<PatientDoctor[]>([]);

  const bottomPad = FOOTER_H + Math.max(insets.bottom, 12) + 12;
  const fabBottom = FOOTER_H + Math.max(insets.bottom, 12) + 16;

  const load = useCallback(async () => {
    if (!timelineId) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(
        `doctor/${user?.hospitalID}/${timelineId}/all`,
        token
      );
      if (res?.status === "success") {
        // your API shape showed data.data
        setList(res?.data?.data ?? res?.data ?? []);
      } else {
        setList([]);
      }
    } finally {
      setLoading(false);
    }
  }, [timelineId, user?.hospitalID, user?.token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sorted = useMemo(() => {
    const arr = [...(list || [])];
    arr.sort(
      (a, b) =>
        new Date(b?.assignedDate || 0).getTime() -
        new Date(a?.assignedDate || 0).getTime()
    );
    return arr;
  }, [list]);

  const renderItem = ({ item, index }: { item: PatientDoctor; index: number }) => (
    <View style={[styles.row, { borderColor: COLORS.border }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[styles.sno, { color: COLORS.sub }]}>{index + 1}</Text>
        <View
          style={[
            styles.catTag,
            { backgroundColor: COLORS.chip, borderColor: COLORS.border },
          ]}
        >
          <Text style={{ fontSize: 11, fontWeight: "800", color: COLORS.chipText }}>
            {cap(item.category)}
          </Text>
        </View>
      </View>

      <Text style={[styles.name, { color: COLORS.text }]}>
        {fullName(item.firstName, item.lastName)}
      </Text>

      <View style={styles.infoLine}>
        <Text style={[styles.key, { color: COLORS.sub }]}>Department: </Text>
        <Text style={[styles.val, { color: COLORS.text }]}>
          {item.department || "—"}
        </Text>
      </View>

      <View style={styles.infoLine}>
        <Text style={[styles.key, { color: COLORS.sub }]}>Active: </Text>
        <Text style={[styles.val, { color: item.active ? COLORS.green : COLORS.red }]}>
          {item.active ? "Active" : "Inactive"}
        </Text>
      </View>

      <View style={styles.infoLine}>
        <Text style={[styles.key, { color: COLORS.sub }]}>Assigned: </Text>
        <Text style={[styles.val, { color: COLORS.text }]}>
          {item.assignedDate
            ? formatDateTime(item.assignedDate).toLocaleString()
            : "—"}
        </Text>
      </View>

      {item.purpose ? (
        <View style={[styles.pill, { backgroundColor: COLORS.chip, borderColor: COLORS.border }]}>
          <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 12 }}>
            {item.purpose}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <>
          <FlatList
            data={sorted}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator
            scrollIndicatorInsets={{ bottom: bottomPad }}
            decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
            initialNumToRender={12}
            windowSize={11}
            removeClippedSubviews={false}
            ListEmptyComponent={
              <View style={[styles.center, { paddingTop: 40 }]}>
                <Text style={{ color: COLORS.sub, fontWeight: "600" }}>
                  No Doctor Added
                </Text>
              </View>
            }
          />

          {/* FAB → navigate to AddDoctorScreen */}
          {user?.roleName !== "reception" && cp.ptype != 21 && (
          <Pressable
            onPress={() => navigation.navigate("AddDoctors" as never)}
            style={[
              styles.fab,
              { backgroundColor: COLORS.brand, bottom: fabBottom },
            ]}
          >
            <Plus size={20} color={COLORS.buttonText} />
          </Pressable>
          )}
        </>
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  row: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    backgroundColor: COLORS.card,
  },
  sno: { fontSize: 12, fontWeight: "800" },
  name: { fontSize: 16, fontWeight: "900", marginTop: 4 },
  infoLine: { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center" },
  key: { fontSize: 12, fontWeight: "800" },
  val: { fontSize: 13, fontWeight: "800" },

  pill: {
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  catTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  fab: {
    position: "absolute",
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
