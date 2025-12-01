import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  
  LayoutDashboard,
  List as ListIcon,
  UserPlus2,
  HelpCircle,
  PanelRightOpen,
} from "lucide-react-native";

import { patientStatus, zoneType } from "../../utils/role";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import LineChartActualScheduled from "../dashboard/lineGraph";
import WeeklyBarChart from "../dashboard/barGraph";
import PatientsList from "../dashboard/patientsList";
import Sidebar, { SidebarItem } from "../Sidebar/sidebarOpd";
import Footer from "../dashboard/footer";
import { showError } from "../../store/toast.slice";
import PieChart from "../dashboard/pieChart"; // ⭐ same component as IPD
import { ActivityIcon, CalendarIcon, ClockIcon, HelpCircleIcon, LayoutDashboardIcon, LogOutIcon, MenuIcon, SettingsIcon, UsersIcon } from "../../utils/SvgIcons";

// ---- Types ----
type XY = { x: number | string; y: number };
type PatientRow = {
  id: string | number;
  name: string;
  age?: number | string;
  gender?: string;
  date?: string;
  department?: string;
};

const { width: W } = Dimensions.get("window");
const isTablet = W >= 768;

const ZONE_META: Record<number, { label: string; color: string }> = {
  1: { label: "Red", color: "#ed4f4f" },
  2: { label: "Yellow", color: "#ffdf76" },
  3: { label: "Green", color: "#56f869" },
};

/* -------------------------- Confirm dialog -------------------------- */
const ConfirmDialog: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}> = ({ visible, title, message, onCancel, onConfirm, confirmText = "Logout" }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMsg}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onCancel} style={[styles.modalBtn, styles.modalBtnGhost]}>
              <Text style={[styles.modalBtnText, { color: "#1C7C6B" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.modalBtn, styles.modalBtnDanger]}>
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------------- Header -------------------------- */
const HeaderBar: React.FC<{ title: string; onMenu: () => void }> = ({ title, onMenu }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn} accessibilityLabel="Open menu">
        <MenuIcon size={30} color="#ffffffff" />
      </TouchableOpacity>
    </View>
  );
};

/* -------------------------- Main Screen -------------------------- */
const DashboardTriage: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage;

  const dispatch = useDispatch();
  const FOOTER_HEIGHT = 70;

  // Sidebar & logout
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // KPIs & data
  const [thisYearCount, setThisYearCount] = useState<number | null>(null);
  const [thisMonthCount, setThisMonthCount] = useState<number | null>(null);
  const [appointmentsToday, setAppointmentsToday] = useState<number | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);

  const now = new Date();
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1));
  const [lineActual, setLineActual] = useState<XY[]>([]);
  const [lineScheduled, setLineScheduled] = useState<XY[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [latestRows, setLatestRows] = useState<PatientRow[]>([]);
  const [latestLoading, setLatestLoading] = useState<boolean>(false);

  // 🔴🟡🟢 Zone pie chart state
  const [selectedZoneDataFilter, setSelectedZoneDataFilter] = useState<"Day" | "Week" | "Month">(
    "Day"
  );
  const [zoneData, setZoneData] = useState<
    { x: string; y: number; color: string }[]
  >([]);
  const [zoneLoading, setZoneLoading] = useState(false);

  /* -------------------------- TOTAL COUNTS (EMERGENCY + ZONE) -------------------------- */
  const getTotalCount = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) {
        Alert.alert("Error", "Failed to load data, please login again.");
        return;
      }

      const zoneString = `${zoneType.red},${zoneType.yellow},${zoneType.green}`;

      const res = await AuthFetch(
        `patient/${user?.hospitalID}/patients/count/visit/combined?ptype=${patientStatus.emergency}&zone=${zoneString}`,
        token
      );

      if (res?.status === "success" && "data" in res) {
        const c = res?.data?.count?.[0] ?? {};
        setAppointmentsToday(c?.appointment_count_today ?? 0);
        setTodayCount(c?.patient_count_today ?? 0);
        setThisMonthCount(c?.patient_count_month ?? 0);
        setThisYearCount(c?.patient_count_year ?? 0);
      } else {
        dispatch(showError("Failed to fetch total count data"));
      }
    } catch (e: any) {
      dispatch(showError(e?.message || String(e) || "getTotalCount error"));
    }
  }, [user?.hospitalID, user?.token, dispatch]);

  /* -------------------------- WEEKLY DATA (EMERGENCY + ZONE) -------------------------- */
  const getWeekly = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const _now = new Date();
      const y = _now.getFullYear();
      const m = _now.getMonth() + 1;

      const zoneString = `${zoneType.red},${zoneType.yellow},${zoneType.green}`;

      const url = `patient/${user.hospitalID}/patients/count/weeklyFilter/${patientStatus.emergency}?filter=month&filterYear=${y}&filterMonth=${m}&zone=${zoneString}`;

      const res = await AuthFetch(url, token);

      if (res?.status === "success" && "data" in res) {
        const rows: any[] = Array.isArray(res?.data?.counts) ? res.data?.counts : [];
        const arr = rows.map((it: any) => ({
          day: it?.week ? `W${it.week}` : it?.label ?? "",
          count: Number(it?.count ?? it?.value ?? 0),
        }));
        setWeeklyData(arr);
      } else {
        dispatch(showError("Failed to fetch weekly data"));
      }
    } catch (err: any) {
      dispatch(showError(err?.message || String(err) || "Error fetching weekly data"));
    }
  }, [user?.hospitalID, user?.token, dispatch]);

  /* -------------------------- LINE CHART (EMERGENCY + ZONE) -------------------------- */
  const getPatientsVisit = useCallback(
    async (y: string, m: string) => {
      try {
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        if (!user?.hospitalID || !token) return;

        const zoneString = `${zoneType.red},${zoneType.yellow},${zoneType.green}`;

        let url = `patient/${user.hospitalID}/patients/count/fullYearFilterLineChart/${patientStatus.emergency}?filter=year&filterYear=${y}&zone=${zoneString}`;

        if (m !== "0") {
          url = `patient/${user.hospitalID}/patients/count/fullYearFilterLineChart/${patientStatus.emergency}?filter=month&filterYear=${y}&filterMonth=${m}&zone=${zoneString}`;
        }

        const res = await AuthFetch(url, token);

        if (res?.status === "success" && "data" in res && Array.isArray(res?.data?.counts) ) {
          const actual: XY[] = res?.data?.counts?.map((c: any) => ({
            x: c.filter_value,
            y: Number(c.actual_visits) || 0,
          }));
          const scheduled: XY[] = res.data?.counts.map((c: any) => ({
            x: c.filter_value,
            y: Number(c.scheduled_count) || 0,
          }));
          setLineActual(actual);
          setLineScheduled(scheduled);
        } else {
          setLineActual([]);
          setLineScheduled([]);
          dispatch(showError("Failed to fetch line chart data"));
        }
      } catch (err: any) {
        setLineActual([]);
        setLineScheduled([]);
        dispatch(showError(err?.message || String(err) || "Error fetching line chart data"));
      }
    },
    [user?.hospitalID, user?.token, dispatch]
  );

  /* -------------------------- ZONE PIE DATA (Day / Week / Month) -------------------------- */
  const getZoneData = useCallback(
    async (filter: "Day" | "Week" | "Month") => {
      try {
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        if (!user?.hospitalID || !token) return;

        setZoneLoading(true);

        const res = await AuthFetch(
          `patient/${user.hospitalID}/patients/count/zone/${filter}`,
          token
        );
        // Web version had: response.message === "success" & response.count
        // Mobile wrapper usually normalizes to: status + data.count
        const success = res?.status === "success" && ("data" in res) 
        if (!success) {
          setZoneData([]);
          dispatch(showError("Failed to fetch zone data"));
          return;
        }

        const rows: Array<{ zone: number; patient_count: number }> =
          Array.isArray(res?.data?.count)
            ? res.data.count
            : Array.isArray((res as any)?.count)
            ? (res as any).count
            : [];

        if (!rows.length) {
          setZoneData([]);
          return;
        }

        // ensure all zones exist
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
        rows.forEach(({ zone, patient_count }) => {
          if (counts[zone as 1 | 2 | 3] !== undefined) {
            counts[zone as 1 | 2 | 3] += Number(patient_count) || 0;
          }
        });

        const nextData = [1, 2, 3].map((z) => ({
          x: ZONE_META[z].label,
          y: counts[z],
          color: ZONE_META[z].color,
        }));
        setZoneData(nextData);
      } catch (err: any) {
        setZoneData([]);
        dispatch(
          showError(
            err?.message || String(err) || "Error fetching zone data"
          )
        );
      } finally {
        setZoneLoading(false);
      }
    },
    [user?.hospitalID, user?.token, dispatch]
  );

  /* -------------------------- LATEST PATIENTS (unchanged endpoint) -------------------------- */
  const getLatestPatients = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      setLatestLoading(true);
      const res = await AuthFetch(
        `patient/${user?.hospitalID}/patients/recent/3?userID=${user?.id}&role=${user?.role}&category=triage`,
        token
      );
      if (res?.status === "success" && "data" in res && Array.isArray(res?.data?.patients)) {
        const rows: PatientRow[] = res?.data?.patients?.map((p: any, i: number) => ({
          id: p?.id ?? i,
          name: p?.name ?? "Unknown",
          age: p?.age ?? "--",
          gender: p?.gender ?? "",
          date: p?.visitDate ?? p?.createdAt ?? "",
          department: p?.department ?? "",
        }));
        setLatestRows(rows);
      } else {
        setLatestRows([]);
      }
    } finally {
      setLatestLoading(false);
    }
  }, [user?.hospitalID, user?.token]);

  /* -------------------------- EFFECT: INITIAL LOAD + FILTER CHANGE -------------------------- */
  useFocusEffect(
    useCallback(() => {
    if (user?.hospitalID) {
      getTotalCount();
      getWeekly();
      getLatestPatients();
      getPatientsVisit(filterYear, filterMonth);
    }
  }, [
    user?.hospitalID,
    getTotalCount,
    getWeekly,
    getLatestPatients,
    getPatientsVisit,
    filterYear,
    filterMonth,
  ]));

  // fetch zone pie data whenever filter changes
  useEffect(() => {
    if (user?.hospitalID) {
      getZoneData(selectedZoneDataFilter);
    }
  }, [user?.hospitalID, selectedZoneDataFilter, getZoneData]);

  const onAddPatient = () => navigation.navigate("AddPatient" as never);

  const handleZoneFilterChange = (value: "Day" | "Week" | "Month") => {
    setSelectedZoneDataFilter(value);
  };

  /* ----------- Sidebar actions ----------- */
  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  const onLogoutPress = () => setConfirmVisible(true);
  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userID"]); // clear session
    } catch (e: any) {
      dispatch(showError(e?.message || String(e) || "Logout storage cleanup error"));
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  const sidebarItems: SidebarItem[] = [
    { key: "dash", label: "Dashboard", icon: LayoutDashboardIcon, onPress: () => go("TriageDashboard") },
    { key: "plist", label: "Patients List", icon: ListIcon, onPress: () => go("PatientList") },
    { key: "addp", label: "Add Patient", icon: UserPlus2, onPress: () => go("AddPatient") },
    { key: "mgmt", label: "Management", icon: SettingsIcon, onPress: () => go("Management") },
    { key: "help", label: "Help", icon: HelpCircleIcon, onPress: () => go("HelpScreen") },
  ];
  const bottomItems: SidebarItem[] = [
    { key: "modules", label: "Go to Modules", icon: PanelRightOpen, onPress: () => go("Home") },
    { key: "logout", label: "Logout", icon: LogOutIcon, onPress: onLogoutPress, variant: "danger" },
  ];

  /* ----------- Render ----------- */
  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
      <HeaderBar title="Patient Triage" onMenu={() => setMenuOpen(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.containerContent,
          { paddingBottom: FOOTER_HEIGHT + insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI cards */}
        <View style={styles.statsGrid}>
          <KpiCard
            title="Today's Patients"
            value={todayCount}
            icon={<UsersIcon size={22} color="#2563EB" />}
            bg="#ffffffff"
          />
          <KpiCard
            title="Appointments"
            value={appointmentsToday}
            icon={<CalendarIcon size={22} color="#10B981" />}
            bg="#ffffffff"
          />
          <KpiCard
            title="This Month"
            value={thisMonthCount}
            icon={<ClockIcon size={22} color="#F59E0B" />}
            bg="#ffffffff"
          />
          <KpiCard
            title="This Year"
            value={thisYearCount}
            icon={<ActivityIcon size={22} color="#7C3AED" />}
            bg="#ffffffff"
          />
        </View>

        {/* Charts */}
        <View style={styles.chartsRow}>
          <LineChartActualScheduled
            actualData={lineActual}
            scheduledData={lineScheduled}
            year={filterYear}
            month={filterMonth}
            onYearChange={setFilterYear}
            onMonthChange={setFilterMonth}
          />

          <WeeklyBarChart data={weeklyData} />
        </View>

        {/* 🔴🟡🟢 Zone Pie Chart - BEFORE PatientsList */}
        <View style={styles.pieChartContainer}>
          <View style={styles.pieChartHeader}>
            <Text style={styles.pieChartTitle}>Patients by Zone</Text>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedZoneDataFilter === "Day" && styles.filterButtonActive,
                ]}
                onPress={() => handleZoneFilterChange("Day")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedZoneDataFilter === "Day" && styles.filterButtonTextActive,
                  ]}
                >
                  Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedZoneDataFilter === "Week" && styles.filterButtonActive,
                ]}
                onPress={() => handleZoneFilterChange("Week")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedZoneDataFilter === "Week" && styles.filterButtonTextActive,
                  ]}
                >
                  Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedZoneDataFilter === "Month" && styles.filterButtonActive,
                ]}
                onPress={() => handleZoneFilterChange("Month")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedZoneDataFilter === "Month" && styles.filterButtonTextActive,
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {zoneLoading ? (
            <View style={styles.pieLoadingWrap}>
              <ActivityIndicator size="small" color="#14b8a6" />
            </View>
          ) : zoneData.length > 0 ? (
            // assuming your PieChart can consume `data` shaped as { x, y, color }
            <PieChart data={zoneData} />
          ) : (
            <Text style={styles.emptyPieText}>No patients in selected period.</Text>
          )}
        </View>

        {/* Latest table */}
        <PatientsList navigation={navigation} patientType={patientStatus.emergency} />
      </ScrollView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"dashboard"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

      {/* Slide-in Sidebar */}
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        userName={userName}
        userImage={userImg}
        onProfile={() => {
          setMenuOpen(false);
          navigation.navigate("DoctorProfile" as never);
        }}
        items={sidebarItems}
        bottomItems={bottomItems}
      />

      {/* Logout confirm */}
      <ConfirmDialog
        visible={confirmVisible}
        title="Confirm Logout"
        message="Are you sure you want to logout? This will clear your saved session."
        onCancel={() => setConfirmVisible(false)}
        onConfirm={confirmLogout}
        confirmText="Logout"
      />
    </View>
  );
};

/* -------------------------- KPI Card -------------------------- */
const KpiCard: React.FC<{
  title: string;
  value: number | string | null | undefined;
  icon: React.ReactNode;
  bg: string;
}> = ({ title, value, icon, bg }) => {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, width: (W - 16 * 2 - 12) / 2 },
        isTablet && { width: (W - 16 * 2 - 12 * 3) / 4 },
      ]}
    >
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value ?? "—"}</Text>
      </View>
      <View style={styles.iconWrap}>{icon}</View>
    </View>
  );
};

export default DashboardTriage;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },

  /* Header */
  header: {
    height: 100,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#14b8a6",
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#fdfdfdff" },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },

  container: { flex: 1, backgroundColor: "#fff" },
  containerContent: { padding: 16, paddingBottom: 32, gap: 16 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  cardTitle: { color: "#0f172a", fontSize: 13, opacity: 0.75, marginBottom: 4 },
  cardValue: { color: "#0b1220", fontSize: 22, fontWeight: "700" },

  controlPanel: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  primaryBtn: {
    backgroundColor: "#1C7C6B",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  chartsRow: { gap: 12 },

  /* Zone pie card */
  pieChartContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pieChartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pieChartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 2,
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: "#14b8a6",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  pieLoadingWrap: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPieText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    paddingVertical: 12,
  },

  /* Patients list card (if your PatientsList uses dark theme) */
  tableCard: { backgroundColor: "#0F1C3F", borderRadius: 16, padding: 12 },
  sectionTitle: { color: "#E8ECF5", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  patientRow: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  patientName: { color: "#E8ECF5", fontSize: 14, fontWeight: "600" },
  patientSub: { color: "#9FB2D9", fontSize: 12, marginTop: 2 },
  patientDept: { color: "#C8D3EA", fontSize: 12, fontWeight: "600", textAlign: "right" },
  patientDate: { color: "#7B90BE", fontSize: 11, marginTop: 2, textAlign: "right" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#1E2B4F" },
  noDataText: { color: "#9FB2D9", fontSize: 12, paddingVertical: 12, textAlign: "center" },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#0b1220" },
  modalMsg: { fontSize: 14, color: "#334155", marginTop: 8 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnGhost: {
    backgroundColor: "#ecfeff",
  },
  modalBtnDanger: {
    backgroundColor: "#ef4444",
  },
  modalBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    zIndex: 10,
    elevation: 6,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff", // same as footer/bg
    zIndex: 9, // just under the footer
  },
});
