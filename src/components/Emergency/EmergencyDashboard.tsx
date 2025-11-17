// components/Emergency/Dashboard.tsx
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
import { useNavigation, useRoute } from "@react-navigation/native";

import { patientStatus, zoneType } from "../../utils/role";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import LineChartActualScheduled from "../dashboard/lineGraph";
import PieChart from "../dashboard/pieChart";
import PatientTable from "../dashboard/patientsList";
import Footer from "../dashboard/footer";

import { useDispatch } from "react-redux";

// Import custom SVG icons
import {
  UsersIcon,
  TrendingUpIcon,
  PlusIcon,
  MenuIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  GridIcon,
  FileMinusIcon,
  UserPlusIcon,
} from "../../utils/SvgIcons";
import { showError } from "../../store/toast.slice";

// ---- Types ----
type XY = { x: number | string; y: number };
type DashboardType = "red" | "yellow" | "green";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;
const isSmallDevice = SCREEN_HEIGHT < 700;
const FOOTER_HEIGHT = 70;

// Dashboard configuration
const DASHBOARD_CONFIG = {
  red: {
    title: "Critical Care Dashboard",
    zone: zoneType.red,
    addPatientRoute: "AddPatient",
    primaryColor: "#14b8a6",
    sidebarComponent: "CriticalCareSidebar",
    sidebarItems: [
      { key: "dash", label: "Dashboard", icon: LayoutDashboardIcon, route: "DashboardEmergencyRed" },
      { key: "plist", label: "Active Patients", icon: UsersIcon, route: "PatientList" },
      { key: "discharge", label: "Discharged Patients", icon: FileMinusIcon, route: "DischargedPatients" },
      { key: "mgmt", label: "Management", icon: SettingsIcon, route: "Management" },
      { key: "help", label: "Help", icon: HelpCircleIcon, route: "HelpScreen" },
    ],
    buttonText: "Add Critical Patient",
  },
  yellow: {
    title: "Urgent Care Dashboard",
    zone: zoneType.yellow,
    addPatientRoute: "AddPatient",
    primaryColor: "#14b8a6",
    sidebarComponent: "UrgentCareSidebar",
    sidebarItems: [
      { key: "dash", label: "Dashboard", icon: LayoutDashboardIcon, route: "DashboardEmergencyYellow" },
      { key: "plist", label: "Active Patients", icon: UsersIcon, route: "PatientList" },
      { key: "discharge", label: "Discharged Patients", icon: UserPlusIcon, route: "DischargedPatients" },
      { key: "mgmt", label: "Management", icon: SettingsIcon, route: "Management" },
      { key: "help", label: "Help", icon: HelpCircleIcon, route: "HelpScreen" },
    ],
    buttonText: "Add Urgent Patient",
  },
  green: {
    title: "Stable Monitoring Dashboard",
    zone: zoneType.green,
    addPatientRoute: "AddPatient",
    primaryColor: "#14b8a6",
    sidebarComponent: "StableCareSidebar",
    sidebarItems: [
      { key: "dash", label: "Dashboard", icon: LayoutDashboardIcon, route: "DashboardEmergencyGreen" },
      { key: "plist", label: "Active Patients", icon: UsersIcon, route: "PatientList" },
      { key: "discharge", label: "Discharged Patients", icon: UserPlusIcon, route: "DischargedPatients" },
      { key: "mgmt", label: "Management", icon: SettingsIcon, route: "Management" },
      { key: "help", label: "Help", icon: HelpCircleIcon, route: "HelpScreen" },
    ],
    buttonText: "Add Stable Patient",
  },
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
              <Text style={[styles.modalBtnText, { color: "#14b8a6" }]}>Cancel</Text>
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
const HeaderBar: React.FC<{ title: string; onMenu: () => void; primaryColor: string }> = ({
  title,
  onMenu,
  primaryColor
}) => {
  return (
    <View style={[styles.header, { backgroundColor: primaryColor }]}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn} accessibilityLabel="Open menu">
        <MenuIcon size={30} color="#ffffffff" />
      </TouchableOpacity>
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
        {
          backgroundColor: bg,
          width: isTablet ? (SCREEN_WIDTH - 16 * 2 - 12 * 3) / 4 : (SCREEN_WIDTH - 16 * 2 - 12) / 2
        },
      ]}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value ?? "—"}</Text>
      </View>
      <View style={styles.iconWrap}>{icon}</View>
    </View>
  );
};

/* -------------------------- Main Dashboard Component -------------------------- */
const EmergencyDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  // Get dashboard type from route params or default to red
  const dashboardType: DashboardType = (route.params as any)?.type || "red";
  const config = DASHBOARD_CONFIG[dashboardType];

  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage;

  // Sidebar & logout
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // KPIs & data
  const [thisYearCount, setThisYearCount] = useState<number | null>(null);
  const [thisMonthCount, setThisMonthCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1));
  const [lineActual, setLineActual] = useState<XY[]>([]);
  const [lineScheduled, setLineScheduled] = useState<XY[]>([]);
  const [selectedWardDataFilter, setSelectedWardDataFilter] = useState<string>("Day");

  // Fetch emergency statistics
  const getEmergencyStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const res = await AuthFetch(
        `patient/${user.hospitalID}/patients/count/visit/combined?ptype=${patientStatus.emergency}&zone=${config.zone}`,
        token
      );

      if (res?.status === "success" && res?.data?.message === "success") {
        const c = res?.data?.count?.[0] ?? {};
        setThisMonthCount(c?.patient_count_month ?? 0);
        setThisYearCount(c?.patient_count_year ?? 0);
      }
    } catch (e: any) {
      dispatch(showError(e?.response?.data?.message || 'Failed to load emergency statistics'));
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.token, config.zone]);

  // Fetch patient visit trends for emergency
  const getPatientsVisit = useCallback(
    async (y: string, m: string) => {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const filterType = m === "0" ? "year" : "month";
      const monthParam = m === "0" ? "" : `&filterMonth=${m}`;
      const url = `patient/${user.hospitalID}/patients/count/fullYearFilterLineChart/${patientStatus.emergency}?filter=${filterType}&filterYear=${y}${monthParam}&zone=${config.zone}`;
      const response = await AuthFetch(url, token);

      if (response?.status === "success") {
        const counts: any[] = Array.isArray(response?.data?.counts)
          ? response?.data?.counts
          : [];
        if (m === "0") {
          const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          setLineActual(
            counts?.map((c: any) => ({
              x: names[Number(c?.filter_value) - 1] || c?.filter_value,
              y: Number(c?.actual_visits ?? 0),
            })) ?? []
          );
          setLineScheduled(
            counts?.map((c: any) => ({
              x: names[Number(c?.filter_value) - 1] || c?.filter_value,
              y: Number(c?.scheduled_count ?? 0),
            })) ?? []
          );
        } else {
          setLineActual(
            counts?.map((c: any) => ({ x: Number(c?.filter_value), y: Number(c?.actual_visits ?? 0) })) ?? []
          );
          setLineScheduled(
            counts?.map((c: any) => ({ x: Number(c?.filter_value), y: Number(c?.scheduled_count ?? 0) })) ?? []
          );
        }
      } else {
        setLineActual([]);
        setLineScheduled([]);
      }
    },
    [user?.hospitalID, user?.token, config.zone]
  );

  useEffect(() => {
    if (user?.hospitalID) {
      getEmergencyStats();
      getPatientsVisit(filterYear, filterMonth);
    }
  }, [user?.hospitalID, getEmergencyStats, getPatientsVisit, filterYear, filterMonth]);

  const onAddPatient = () => navigation.navigate(config.addPatientRoute as never);

  /* ----------- Sidebar actions ----------- */
  const go = (route: string, params?: any) => {
    setMenuOpen(false);
    navigation.navigate(route as never, params);
  };

  const onLogoutPress = () => setConfirmVisible(true);
  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userID"]);
    } catch (e) {
      dispatch(showError('Failed to clear session data'));
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  const handleWardFilterChange = (value: string) => {
    setSelectedWardDataFilter(value);
  };

  // Build sidebar items dynamically based on config
  const sidebarItems = config.sidebarItems?.map(item => ({
    ...item,
    onPress: () => {
      if (item.route === "PatientList") {
        setMenuOpen(false);
        navigation.navigate("PatientList" as never, {
          zone: config.zone,
          patientStatus: patientStatus.emergency
        });
      } else {
        setMenuOpen(false);
        navigation.navigate(item.route as never);
      }
    }
  })) ?? [];

  const bottomItems = [
    {
      key: "modules",
      label: "Go to Modules",
      icon: GridIcon,
      onPress: () => go("Home")
    },
    {
      key: "logout",
      label: "Logout",
      icon: LogOutIcon,
      onPress: onLogoutPress,
      variant: "danger"
    },
  ];

  // Dynamically import the correct sidebar component
  const SidebarComponent = React.useMemo(() => {
    try {
      switch (config.sidebarComponent) {
        case "CriticalCareSidebar":
          return require("../Sidebar/sidebarRed").default;
        case "UrgentCareSidebar":
          return require("../Sidebar/sidebarYellow").default;
        case "StableCareSidebar":
          return require("../Sidebar/sidebarGreen").default;
        default:
          return require("../Sidebar/sidebarRed").default;
      }
    } catch (error) {
      return require("../Sidebar/sidebarRed").default;
    }
  }, [config.sidebarComponent]);

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
        <HeaderBar title={config.title} onMenu={() => setMenuOpen(true)} primaryColor={config.primaryColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={config.primaryColor} />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </View>
    );
  }

  /* ----------- Render ----------- */
  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
      <HeaderBar title={config.title} onMenu={() => setMenuOpen(true)} primaryColor={config.primaryColor} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.containerContent,
          {
            paddingBottom: FOOTER_HEIGHT + (insets.bottom > 0 ? insets.bottom + 16 : 16),
            minHeight: SCREEN_HEIGHT - (isSmallDevice ? 120 : 160)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* KPI cards */}
        <View style={styles.statsGrid}>
          <KpiCard
            title="This Month"
            value={thisMonthCount}
            icon={<TrendingUpIcon size={25} color={config.primaryColor} />}
            bg="#ffffff"
          />
          <KpiCard
            title="This Year"
            value={thisYearCount}
            icon={<UsersIcon size={25} color={config.primaryColor} />}
            bg="#ffffff"
          />
        </View>

        {/* Primary action */}
        <View style={styles.controlPanel}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: config.primaryColor }]}
            onPress={onAddPatient}
            activeOpacity={0.85}
          >
            <PlusIcon size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{config.buttonText}</Text>
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

          {/* Pie Chart for Ward Distribution */}
          <View style={[styles.pieChartContainer]}>
            <View style={styles.pieChartHeader}>
              <Text style={styles.pieChartTitle}>Patients by Ward</Text>
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedWardDataFilter === "Day" && [styles.filterButtonActive, { backgroundColor: config.primaryColor }]
                  ]}
                  onPress={() => handleWardFilterChange("Day")}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedWardDataFilter === "Day" && styles.filterButtonTextActive
                  ]}>Day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedWardDataFilter === "Week" && [styles.filterButtonActive, { backgroundColor: config.primaryColor }]
                  ]}
                  onPress={() => handleWardFilterChange("Week")}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedWardDataFilter === "Week" && styles.filterButtonTextActive
                  ]}>Week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedWardDataFilter === "Month" && [styles.filterButtonActive, { backgroundColor: config.primaryColor }]
                  ]}
                  onPress={() => handleWardFilterChange("Month")}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedWardDataFilter === "Month" && styles.filterButtonTextActive
                  ]}>Month</Text>
                </TouchableOpacity>
              </View>
            </View>
            <PieChart selectedWardDataFilter={selectedWardDataFilter} />
          </View>
        </View>

        {/* Latest emergency records */}
        <PatientTable
          navigation={navigation}
          patientType={patientStatus.emergency}
          zone={config.zone}
        />
      </ScrollView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"dashboard"} brandColor={config.primaryColor} />
      </View>

      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

      {/* Slide-in Sidebar */}
      <SidebarComponent
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

export default EmergencyDashboard;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    height: 100,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  headerTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 20 : 24,
    fontWeight: "700",
    color: "#fdfdfdff",
    flex: 1,
    textAlign: 'center',
    marginRight: 40
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  containerContent: {
    padding: 16,
    gap: 16
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
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
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 80,
  },
  cardContent: {
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    marginLeft: 12,
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    opacity: 0.75,
    marginBottom: 4
  },
  cardValue: {
    color: "#0b1220",
    fontSize: SCREEN_WIDTH < 375 ? 18 : 22,
    fontWeight: "700"
  },
  controlPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end"
  },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 160,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14
  },
  chartsRow: {
    gap: 12
  },
  pieChartContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pieChartHeader: {
    flexDirection: SCREEN_WIDTH < 375 ? "column" : "row",
    justifyContent: "space-between",
    alignItems: SCREEN_WIDTH < 375 ? "flex-start" : "center",
    marginBottom: 16,
    gap: SCREEN_WIDTH < 375 ? 12 : 0,
  },
  pieChartTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonActive: {
    // backgroundColor is set dynamically
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#14b8a6",
  },
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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0b1220"
  },
  modalMsg: {
    fontSize: 14,
    color: "#334155",
    marginTop: 8,
    lineHeight: 20,
  },
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
    minWidth: 80,
    alignItems: 'center',
  },
  modalBtnGhost: {
    backgroundColor: "#fef2f2",
  },
  modalBtnDanger: {
    backgroundColor: "#14b8a6",
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
    backgroundColor: "#fff",
    zIndex: 9,
  },
});