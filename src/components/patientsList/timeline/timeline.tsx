import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Footer from "../../dashboard/footer";
import { AuthFetch } from "../../../auth/auth";
import TimelineRow from "./timelineRow";
import { COLORS } from "../../../utils/colour";

type RootState = any;

export type TimelineType = {
  id: number;
  patientAddedOn: string;
  patientStartStatus: number | null;
  addedBy?: string;
  endTime?: string;
  startTime?: string;
  patientEndStatus?: number | null;
  isRevisit?: number;
  isFollowUp?: { followUp: number; followUpDate: string; patientStartStatus: number };
  diagnosis?: string | null;

  doctorDetails?: { doctorName?: string };

  transferDetails?: Array<{
    transferDate: string;
    transferType: number;
    transferToDepartment: number;
    transferFromDepartment: number;
    fromWard: string;
    toWard: string;
    fromDoc?: string;
    reason?: string;
  }>;

  externalTransferDetails?: Array<{
    transferDate: string;
    tohospitalName: string;
    fromhospitalName: string;
    fromDoc: string;
  }>;

  handshakeDetails?: Array<{
    scope?: string;
    fromDoc: string;
    toDoc: string;
    assignedDate: string;
  }>;

  operationTheatreDetails?: Array<{
    id: number;
    scope?: string | null;
    status?: string;
    addedOn: string;
    approvedBy: string;
    patientType: string;
    surgeryType: string;
    approvedTime?: string | null;
    rejectReason?: string;
    scheduleTime: string;
    completedTime?: string | null;
    rejectedTime?: string | null;
    key?: number;
  }>;

  symptomsDetails?: Array<{ symptomAddedOn: string }>;
};



const FOOTER_H = 70;

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);

  const [loading, setLoading] = useState(false);
  const [timelines, setTimelines] = useState<TimelineType[]>([]);

  const bottomPad = FOOTER_H + Math.max(insets.bottom, 12) + 12;

  const load = useCallback(async () => {
    if (!currentPatient?.id || !user?.hospitalID) return;
    setLoading(true);
    try {
      const asyncToken = await AsyncStorage.getItem("token");
      const token =
        user?.token && user.token !== "" && user.token !== "null"
          ? user.token
          : asyncToken;

      const res = await AuthFetch(
        `patientTimeLine/hospital/${user.hospitalID}/patient/${currentPatient.id}`,
        token
      );
      console.log("Timeline API response:", res);
      if (res?.status === "success" && "data" in res) {
        setTimelines(res?.data?.patientTimeLines ?? []);
      } else {
        setTimelines([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPatient?.id, user?.hospitalID]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Sort by start time ascending like your table did (earliest first)
  const data = useMemo(() => {
    const arr = [...(timelines || [])];
    arr.sort(
      (a, b) =>
        new Date(a?.startTime || a?.patientAddedOn || 0).getTime() -
        new Date(b?.startTime || b?.patientAddedOn || 0).getTime()
    );
    return arr;
  }, [timelines]);

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <View style={styles.headerWrap}>
        <Text style={[styles.headerText, { color: COLORS.text }]}>
          Previous History
        </Text>
        <Text style={[styles.subHeader, { color: COLORS.sub }]}>
          Patient timeline of transfers, surgeries, follow-ups and discharges
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item, index }) => (
            <TimelineRow timeline={item} index={index} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator
          scrollIndicatorInsets={{ bottom: bottomPad }}
          decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
          initialNumToRender={8}
          windowSize={11}
          removeClippedSubviews={false}
          ListEmptyComponent={
            <View style={[styles.center, { paddingTop: 40 }]}>
              <Text style={{ color: COLORS.sub, fontWeight: "600" }}>
                No timeline records found
              </Text>
            </View>
          }
        />
      )}

      {/* Footer pinned above system nav */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerText: { fontSize: 16, fontWeight: "900" },
  subHeader: { fontSize: 12, fontWeight: "700", marginTop: 2 },

  footerWrap: {
    // position: "absolute",
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
