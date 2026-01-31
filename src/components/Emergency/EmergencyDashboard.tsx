// components/Emergency/Dashboard.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

import { patientStatus, zoneType } from "../../utils/role";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import LineChartActualScheduled from "../dashboard/lineGraph";
import PieChart from "../dashboard/pieChart";
import PatientTable from "../dashboard/patientsList";
import Footer from "../dashboard/footer";

// Import responsive utilities
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";

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
  CommissionIcon,
} from "../../utils/SvgIcons";
import { showError } from "../../store/toast.slice";
import { DollarSign } from "lucide-react-native";

// ---- Types ----
type XY = { x: number | string; y: number };
type DashboardType = "red" | "yellow" | "green";
type RouteParams = {
  type?: DashboardType;
};

// Dashboard configuration
const DASHBOARD_CONFIG = {
  red: {
    title: "Critical Care Dashboard",
    zone: zoneType.red,
    addPatientRoute: "AddPatient",
    primaryColor: COLORS.brand,
    sidebarComponent: "CriticalCareSidebar",
    buttonText: "Add Patient",
  },
  yellow: {
    title: "Urgent Care Dashboard",
    zone: zoneType.yellow,
    addPatientRoute: "AddPatient",
    primaryColor: COLORS.brand,
    sidebarComponent: "UrgentCareSidebar",
    buttonText: "Add Patient",
  },
  green: {
    title: "Stable Monitoring Dashboard",
    zone: zoneType.green,
    addPatientRoute: "AddPatient",
    primaryColor: COLORS.brand,
    sidebarComponent: "StableCareSidebar",
    buttonText: "Add Patient",
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
              <Text style={[styles.modalBtnText, { color: COLORS.brand }]}>Cancel</Text>
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
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <TouchableOpacity
          onPress={onMenu}
          style={styles.menuBtn}
          accessibilityLabel="Open menu"
          hitSlop={{
            top: SPACING.xs,
            bottom: SPACING.xs,
            left: SPACING.xs,
            right: SPACING.xs
          }}
        >
          <MenuIcon size={ICON_SIZE.lg} color="#ffffffff" />
        </TouchableOpacity>
      </View>
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
  const cardWidth = isTablet
    ? (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2
    : SCREEN_WIDTH - SPACING.md * 2;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          width: cardWidth,
          minHeight: isExtraSmallDevice ? 70 : 80,
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
  const dashboardType: DashboardType = (route.params as RouteParams)?.type || "red";
  const config = DASHBOARD_CONFIG[dashboardType];

  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage ||user?.imageURL;

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

  const fetchOnce = useRef(true);

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

  useFocusEffect(
    useCallback(() => {
      if (user?.hospitalID && fetchOnce.current) {
        fetchOnce.current = false;
        getEmergencyStats();
        getPatientsVisit(filterYear, filterMonth);
      }
      return () => {
        fetchOnce.current = true;
      };
    }, [user?.hospitalID, getEmergencyStats, getPatientsVisit, filterYear, filterMonth])
  );

  const onAddPatient = () => navigation.navigate(config.addPatientRoute as never, {
    patientStatus: patientStatus.emergency,
    zone: config.zone
  });

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
  const sidebarItems = [
    {
      key: "dash",
      label: "Dashboard",
      icon: LayoutDashboardIcon,
      onPress: () => go(`EmergencyDashboard`)
    },
    {
      key: "plist",
      label: "Active Patients",
      icon: UsersIcon,
      onPress: () => go("PatientList", {
        zone: config.zone,
        patientStatus: patientStatus.emergency
      })
    },
    {
      key: "discharge",
      label: "Discharged Patients",
      icon: FileMinusIcon,
      onPress: () => go("DischargedPatientsIPD")
    },
    { key: "revenue", label: "Revenue", icon: DollarSign, onPress: () => go("RevenueTabNavigator") }, // Added Revenue tab
    {
      key: "mgmt",
      label: "Management",
      icon: SettingsIcon,
      onPress: () => go("Management")
    },
    { key: 'commission',label: 'Commission & Fee',icon: CommissionIcon,onPress: () => navigation.navigate('CommissionAndFee')},
    {
      key: "help",
      label: "Help",
      icon: HelpCircleIcon,
      onPress: () => go("HelpScreen")
    },
  ];

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
            paddingBottom: FOOTER_HEIGHT + (insets.bottom > 0 ? insets.bottom + SPACING.md : SPACING.md),
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
            icon={<TrendingUpIcon size={ICON_SIZE.md} color={config.primaryColor} />}
            bg={COLORS.card}
          />
          <KpiCard
            title="This Year"
            value={thisYearCount}
            icon={<UsersIcon size={ICON_SIZE.md} color={config.primaryColor} />}
            bg={COLORS.card}
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

export default EmergencyDashboard;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg
  },
  header: {
    height: Platform.OS === 'ios'
      ? (isExtraSmallDevice ? 90 : isSmallDevice ? 100 : 110)
      : (isExtraSmallDevice ? 70 : isSmallDevice ? 80 : 90),
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'ios'
      ? (isExtraSmallDevice ? 30 : 40)
      : (isExtraSmallDevice ? 15 : 20),
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "700",
    color: "#fdfdfdff",
    flex: 1,
    textAlign: 'center',
    marginRight: SPACING.md,
  },
  menuBtn: {
    width: ICON_SIZE.lg + SPACING.xs,
    height: ICON_SIZE.lg + SPACING.xs,
    borderRadius: SPACING.xs,
    alignItems: "center",
    justifyContent: "center",
    position: 'absolute',
    right: 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg
  },
  containerContent: {
    padding: SPACING.sm,
    gap: SPACING.sm
  },
  statsGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.sm,
    borderRadius: SPACING.md,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: isExtraSmallDevice ? 70 : 80,
  },
  cardContent: {
    flex: 1,
  },
  iconWrap: {
    width: ICON_SIZE.lg + SPACING.xs,
    height: ICON_SIZE.lg + SPACING.xs,
    borderRadius: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    marginLeft: SPACING.xs,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xs,
    opacity: 0.75,
    marginBottom: 4
  },
  cardValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: "700"
  },
  controlPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end"
  },
  primaryBtn: {
    height: isExtraSmallDevice ? 40 : 44,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    minWidth: SCREEN_WIDTH * 0.4,
    maxWidth: SCREEN_WIDTH * 0.6,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: FONT_SIZE.sm
  },
  chartsRow: {
    gap: SPACING.sm
  },
  pieChartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
    padding: SPACING.sm,
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
    marginBottom: SPACING.sm,
    gap: SCREEN_WIDTH < 375 ? SPACING.xs : 0,
  },
  pieChartTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.pill,
    borderRadius: SPACING.xs,
    padding: 4,
  },
  filterButton: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonActive: {
    // backgroundColor is set dynamically
  },
  filterButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.sub,
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    paddingBottom: SCREEN_HEIGHT * 0.1,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.brand,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
    padding: SPACING.sm,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "800",
    color: COLORS.text
  },
  modalMsg: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.xs,
    minWidth: SCREEN_WIDTH * 0.2,
    alignItems: 'center',
  },
  modalBtnGhost: {
    backgroundColor: COLORS.brandLight,
  },
  modalBtnDanger: {
    backgroundColor: COLORS.danger,
  },
  modalBtnText: {
    fontWeight: "700",
    fontSize: FONT_SIZE.sm,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    zIndex: 10,
    elevation: 6,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    zIndex: 9,
  },
});