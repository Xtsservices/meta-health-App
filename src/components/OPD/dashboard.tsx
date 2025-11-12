// Dashboard_Outpatient.tsx
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
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  Users,
  Calendar,
  Clock,
  Activity as ActivityIcon,
  Plus,
  Menu as MenuIcon,
  LayoutDashboard,
  List as ListIcon,
  UserPlus2,
  Settings,
  HelpCircle,
  LogOut,
  PanelRightOpen,
} from "lucide-react-native";

import { patientStatus } from "../../utils/role";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import LineChartActualScheduled from "../dashboard/lineGraph";
import WeeklyBarChart from "../dashboard/barGraph";
import PatientsList from "../dashboard/patientsList";
import Sidebar, { SidebarItem } from "./sidebar";
import Footer from "../dashboard/footer";


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
const Dashboard_Outpatient: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  console.log(user, "complete user data")
const insets = useSafeAreaInsets();
  const userName =
    `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage;

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
const FOOTER_HEIGHT = 70;

  const getTotalCount = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const res = await AuthFetch(
        `patient/${user.hospitalID}/patients/count/visit/combined?ptype=${patientStatus.outpatient}`,
        token
      );
      if (res?.status === "success" && res?.data?.message === "success") {
        const c = res?.data?.count?.[0] ?? {};
        setAppointmentsToday(c?.appointment_count_today ?? 0);
        setTodayCount(c?.patient_count_today ?? 0);
        setThisMonthCount(c?.patient_count_month ?? 0);
        setThisYearCount(c?.patient_count_year ?? 0);
      }
    } catch (e) {
      console.error("getTotalCount error", e);
    }
  }, [user?.hospitalID, user?.token]);

  const getWeekly = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!user?.hospitalID || !token) return;

    const _now = new Date();
    const y = _now.getFullYear();
    const m = _now.getMonth() + 1;
    const url = `patient/${user.hospitalID}/patients/count/weeklyFilter/1?filter=month&filterYear=${y}&filterMonth=${m}`;
    const res = await AuthFetch(url, token);

    if (res?.status === "success") {
      const arr = (res?.data?.counts || []).map((it: any) => ({
        day: it?.day ?? it?.label ?? "",
        count: Number(it?.count ?? it?.value ?? 0),
      }));
      setWeeklyData(arr);
    }
  }, [user?.hospitalID, user?.token]);

  const getPatientsVisit = useCallback(
    async (y: string, m: string) => {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const filterType = m === "0" ? "year" : "month";
      const monthParam = m === "0" ? "" : `&filterMonth=${m}`;
      const url = `patient/${user.hospitalID}/patients/count/fullYearFilterLineChart/1?filter=${filterType}&filterYear=${y}${monthParam}`;
      const response = await AuthFetch(url, token);

      if (response?.status === "success") {
        const counts: any[] = Array.isArray(response?.data?.counts)
          ? response?.data?.counts
          : [];
        if (m === "0") {
          const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          setLineActual(
            counts.map((c: any) => ({
              x: names[Number(c.filter_value) - 1] || c.filter_value,
              y: Number(c.actual_visits ?? 0),
            }))
          );
          setLineScheduled(
            counts.map((c: any) => ({
              x: names[Number(c.filter_value) - 1] || c.filter_value,
              y: Number(c.scheduled_count ?? 0),
            }))
          );
        } else {
          setLineActual(
            counts.map((c: any) => ({ x: Number(c.filter_value), y: Number(c.actual_visits ?? 0) }))
          );
          setLineScheduled(
            counts.map((c: any) => ({ x: Number(c.filter_value), y: Number(c.scheduled_count ?? 0) }))
          );
        }
      } else {
        setLineActual([]);
        setLineScheduled([]);
      }
    },
    [user?.hospitalID, user?.token]
  );

  const getLatestPatients = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      setLatestLoading(true);
      const res = await AuthFetch(
        `patient/${user.hospitalID}/patients/latest?limit=10&ptype=${patientStatus.outpatient}`,
        token
      );

      if (res?.status === "success" && Array.isArray(res?.data?.patients)) {
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

  useEffect(() => {
    if (user?.hospitalID) {
      getTotalCount();
      getWeekly();
      getLatestPatients();
      getPatientsVisit(filterYear, filterMonth);
    }
  }, [user?.hospitalID, getTotalCount, getWeekly, getLatestPatients, getPatientsVisit, filterYear, filterMonth]);

  const onAddPatient = () => navigation.navigate("AddPatient" as never);

  /* ----------- Sidebar actions ----------- */
  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  const onLogoutPress = () => setConfirmVisible(true);
  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userID"]); // clear session
    } catch (e) {
      console.warn("Logout storage cleanup error:", e);
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  const sidebarItems: SidebarItem[] = [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard, onPress: () => go("DashboardOPD") },
    { key: "plist", label: "Patients List", icon: ListIcon, onPress: () => go("PatientList") },
    { key: "addp", label: "Add Patient", icon: UserPlus2, onPress: () => go("AddPatient") },
    { key: "mgmt", label: "Management", icon: Settings, onPress: () => go("Management") },
    { key: "help", label: "Help", icon: HelpCircle, onPress: () => go("Help") },
  ];
  const bottomItems: SidebarItem[] = [
    { key: "modules", label: "Go to Modules", icon: PanelRightOpen, onPress: () => go("Home") },
    { key: "logout", label: "Logout", icon: LogOut, onPress: onLogoutPress, variant: "danger" },
  ];

  /* ----------- Render ----------- */
  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
      <HeaderBar title="Outpatient Care" onMenu={() => setMenuOpen(true)} />

      <ScrollView
        style={styles.container}
       contentContainerStyle={[styles.containerContent, { paddingBottom: FOOTER_HEIGHT + insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI cards */}
        <View style={styles.statsGrid}>
          <KpiCard title="Today's Patients" value={todayCount} icon={<Users size={22} color="#2563EB" />} bg="#E8F0FE" />
          <KpiCard title="Appointments" value={appointmentsToday} icon={<Calendar size={22} color="#10B981" />} bg="#E7F8F1" />
          <KpiCard title="This Month" value={thisMonthCount} icon={<Clock size={22} color="#F59E0B" />} bg="#FFF4E5" />
          <KpiCard title="This Year" value={thisYearCount} icon={<ActivityIcon size={22} color="#7C3AED" />} bg="#F3E8FF" />
        </View>

        {/* Primary action */}
        <View style={styles.controlPanel}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddPatient} activeOpacity={0.85}>
            <Plus size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>New Appointments</Text>
          </TouchableOpacity>
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

        {/* Latest table (your existing component) */}
        <PatientsList navigation={undefined} />
         
      </ScrollView>

    <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
  <Footer  active={"dashboard"}  brandColor="#14b8a6" />
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
          navigation.navigate("Profile" as never);
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

export default Dashboard_Outpatient;

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
    // padding:95,
    
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#fdfdfdff" },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    color:"white"
  },

  container: { flex: 1, backgroundColor: "#fff" },
  containerContent: { padding: 16, paddingBottom: 32, gap: 16 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
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

  /* Patients list card (keep if your PatientsList uses dark theme) */
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
  zIndex: 9,               // just under the footer
},

});
