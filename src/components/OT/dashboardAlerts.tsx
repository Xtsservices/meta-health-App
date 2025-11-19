// OTPatientTable.tsx
import React, { useRef, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { formatDate, formatTime } from "../../utils/dateTime";
import { showError } from "../../store/toast.slice";
import useOTConfig, { OTPatientStages } from "../../utils/otConfig";
import { EyeIcon } from "../../utils/SvgIcons";
import Footer from "../dashboard/footer";

type Props = {
  type?: "dashboard" | "surgeries";
};

type OTAlert = {
  id: number;
  pName: string;
  patientID: number;
  patientTimeLineID?: number;
  patientType?: string;
  surgeryType?: string;
  status?: string;
  addedOn?: string;
  approvedTime?: string | null;
  scheduleTime?: string | null;
};

const PER_PAGE = 10;

const OTPatientTable: React.FC<Props> = (props) => {
  const route = useRoute<any>();
  const type = props.type ?? route.params?.type ?? "dashboard";

  const [patients, setPatients] = useState<OTAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const fetchOnce = useRef(true);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);
  const { setPatientStage } = useOTConfig();

  // ================= Fetch Alerts =================
  const fetchOTAlerts = async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));

      if (!user?.hospitalID || !token || !user?.roleName) {
        setPatients([]);
        setLoading(false);
        return;
      }

      if (user.roleName !== "surgeon" && user.roleName !== "anesthetist") {
        setPatients([]);
        setLoading(false);
        return;
      }

      const isAnesthetist = user.roleName === "anesthetist";
      const status = isAnesthetist ? "pending" : "approved";

      const response = await AuthFetch(
        `ot/${user.hospitalID}/${status}/getAlerts`,
        token
      );

      if (response?.status === "success") {
        const list: OTAlert[] = response.data?.data ?? [];
        setPatients(list.reverse());
      } else {
        setPatients([]);
      }
    } catch (err: any) {
      dispatch(
        showError(err?.message || "Error fetching OT patients")
      );
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
    if (fetchOnce.current) {
      fetchOnce.current = false;
      fetchOTAlerts();
    }
  }, [user]))

  // ========== Pagination ==========
  const totalPages = useMemo(() => {
    if (type !== "surgeries") return 1;
    return Math.max(1, Math.ceil(patients.length / PER_PAGE));
  }, [patients, type]);

  const displayPatients = useMemo(() => {
    if (type === "dashboard") return patients.slice(0, 5);
    const start = (page - 1) * PER_PAGE;
    return patients.slice(start, start + PER_PAGE);
  }, [patients, type, page]);

  // ================= View Patient =================
  const handleView = (patient: OTAlert) => {
    try {
      if (patient?.status) {
        const key = patient.status.toUpperCase() as keyof typeof OTPatientStages;
        if (OTPatientStages[key]) {
          setPatientStage(OTPatientStages[key]);
        }
      }
      navigation.navigate("PatientProfile", { id: patient.patientID });
    } catch (err: any) {
      dispatch(showError("Error navigating to patient"));
    }
  };

  // ================= View All =================
  const handleViewAll = () => {
    navigation.navigate("DashboardAlerts", { type: "surgeries" });
  };

  // ================= Card UI =================
  const renderCard = ({ item }: { item: OTAlert }) => {
    const baseTime = item.scheduleTime || item.approvedTime || item.addedOn;
    const dateStr = baseTime ? formatDate(baseTime) : "-";
    const timeStr = baseTime ? formatTime(baseTime) : "-";

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {item.pName} {item.patientType ? `(${item.patientType})` : ""}
            </Text>

            {item.surgeryType && (
              <Text style={styles.surgeryText}>
                Surgery: <Text style={styles.surgeryValue}>{item.surgeryType}</Text>
              </Text>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{dateStr}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Time</Text>
                <Text style={styles.metaValue}>{timeStr}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => handleView(item)}
          >
            <EyeIcon />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ================= Pagination Component =================
  const Pagination = () => {
    if (type !== "surgeries" || patients.length <= PER_PAGE) return null;

    return (
      <View style={styles.paginationBar}>
        <TouchableOpacity
          disabled={page === 1}
          onPress={() => setPage((p) => p - 1)}
          style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
        >
          <Text
            style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}
          >
            Prev
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageLabel}>
          Page {page} of {totalPages}
        </Text>

        <TouchableOpacity
          disabled={page === totalPages}
          onPress={() => setPage((p) => p + 1)}
          style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
        >
          <Text
            style={[
              styles.pageBtnText,
              page === totalPages && styles.pageBtnTextDisabled,
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ================= Loading =================
  if (loading) {
    return (
      <View >
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

    const headerTitle =
    type === "dashboard" ? "Latest OT Patients" : "OT Surgeries";

  return (
    <View style={styles.screen}>
      {/* ---------- HEADER ---------- */}
       {type === "dashboard" && (
      <View style={styles.fixedHeader}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>

       
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAll}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        
      </View>)}

      {/* ---------- LIST BOX ---------- */}
      <View style={styles.container}>
        <FlatList
          data={displayPatients}
          renderItem={renderCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: type === "surgeries" ? 120 : 30,
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No OT patients found</Text>
          }
          ListFooterComponent={<Pagination />}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* ---------- FOOTER (for surgeries) ---------- */}
      {type === "surgeries" && (
        <>
          <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
            <Footer active={"dashboard"} brandColor="#14b8a6" />
          </View>

          <View
            pointerEvents="none"
            style={[styles.navShield, { height: insets.bottom }]}
          />
        </>
      )}
    </View>
  );

};

export default OTPatientTable;

// ============ STYLES ============
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },

 fixedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",   // keeps title left, button right
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  backBtn: {
    marginRight: 12,
  },
  backText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  container: {
    // borderRadius: 12,
    // borderWidth: 1,
    // borderColor: "#E2E8F0",
    // margin: 12,
    // backgroundColor: "#FFFFFF",
    // elevation: 2,
  },

  viewAllButton: {
    alignSelf: "flex-end",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#14b8a6",
    borderRadius: 6,
  },
  viewAllText: { color: "#fff", fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  patientInfo: { flex: 1 },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  surgeryText: { fontSize: 13, color: "#475569" },
  surgeryValue: { fontWeight: "700" },

  row: { flexDirection: "row", marginTop: 4 },
  metaLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 13, fontWeight: "600" },

  viewButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    textAlign: "center",
    paddingVertical: 50,
    color: "#9ca3af",
  },

  // Pagination
  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#14b8a6",
  },
  pageBtnDisabled: {
    borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6",
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#14b8a6",
  },
  pageBtnTextDisabled: {
    color: "#94a3b8",
  },
  pageLabel: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Footer
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingBottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    zIndex: 10,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
  },
});
