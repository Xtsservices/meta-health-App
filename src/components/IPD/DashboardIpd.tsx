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

import { patientStatus } from "../../utils/role";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import LineChartActualScheduled from "../dashboard/lineGraph";
import PieChart from "../dashboard/pieChart";
import PatientsList from "../dashboard/patientsList";
import Footer from "../dashboard/footer";

// Import custom SVG icons
import {
  UsersIcon,
  CalendarIcon,
  ActivityIcon,
  PlusIcon,
  MenuIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  UserPlusIcon,
  FileMinusIcon,
  GridIcon,
  UserMinusIcon,
} from "../../utils/SvgIcons";

// Import date utils
import { getCurrentDateFormatted } from "../../utils/dateTime";

// Import Sidebar component
import Sidebar, { SidebarItem } from "../Sidebar/sidebarIpd";

// ---- Types ----
type XY = { x: number | string; y: number };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;
const isSmallDevice = SCREEN_HEIGHT < 700;
const isExtraSmallDevice = SCREEN_WIDTH < 375;

// Responsive calculations
const RESPONSIVE = {
  spacing: {
    xs: isExtraSmallDevice ? 8 : 12,
    sm: isExtraSmallDevice ? 12 : 16,
    md: isExtraSmallDevice ? 16 : 20,
    lg: isExtraSmallDevice ? 20 : 24,
  },
  fontSize: {
    xs: isExtraSmallDevice ? 10 : 12,
    sm: isExtraSmallDevice ? 12 : 14,
    md: isExtraSmallDevice ? 14 : 16,
    lg: isExtraSmallDevice ? 16 : 18,
    xl: isExtraSmallDevice ? 18 : 20,
    xxl: isExtraSmallDevice ? 20 : 24,
  },
  icon: {
    sm: isExtraSmallDevice ? 16 : 20,
    md: isExtraSmallDevice ? 20 : 25,
    lg: isExtraSmallDevice ? 24 : 30,
  }
};

const FOOTER_HEIGHT = 70;

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
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <TouchableOpacity 
          onPress={onMenu} 
          style={styles.menuBtn} 
          accessibilityLabel="Open menu"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MenuIcon size={RESPONSIVE.icon.lg} color="#ffffffff" />
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
    ? (SCREEN_WIDTH - RESPONSIVE.spacing.md * 2 - RESPONSIVE.spacing.xs * 3) / 4 
    : (SCREEN_WIDTH - RESPONSIVE.spacing.md * 2 - RESPONSIVE.spacing.xs) / 2;

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

/* -------------------------- Main Screen -------------------------- */
const DashboardIpd: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage;

  // Sidebar & logout
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // KPIs & data
  const [totalPatients, setTotalPatients] = useState<number | null>(null);
  const [inPatientCount, setInPatientCount] = useState<number | null>(null);
  const [dischargedCount, setDischargedCount] = useState<number | null>(null);
  const [thisYearCount, setThisYearCount] = useState<number | null>(null);
  const [thisMonthCount, setThisMonthCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1));
  const [lineActual, setLineActual] = useState<XY[]>([]);
  const [lineScheduled, setLineScheduled] = useState<XY[]>([]);
  const [selectedWardDataFilter, setSelectedWardDataFilter] = useState<string>("Day");

  // Fetch inpatient statistics
  const getInpatientStats = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const currentDate = getCurrentDateFormatted();
      
      // Fetch patient count data for inpatient dashboard
      const patientCountData = await AuthFetch(
        `patient/${user.hospitalID}/patients/calendarCards?date=${currentDate}`,
        token
      );

      if (patientCountData?.status === "success") {
        setDischargedCount(patientCountData.data?.Discharged_Patients ?? 0);
        setInPatientCount(patientCountData.data?.Total_InPatients ?? 0);
        setTotalPatients(patientCountData.data?.Total_Patients ?? 0);
      }

      // Fetch yearly and monthly counts
      const selectedYear = now.getFullYear();
      const selectedMonth = now.getMonth() + 1;

      const thisYearResponse = await AuthFetch(
        `patient/${user.hospitalID}/patients/count/visit/${selectedYear}/-1?ptype=${patientStatus.inpatient}`,
        token
      );

      if (thisYearResponse?.status === "success") {
        setThisYearCount(thisYearResponse.data?.count ?? 0);
      }

      const thisMonthResponse = await AuthFetch(
        `patient/${user.hospitalID}/patients/count/visit/${selectedYear}/${selectedMonth}?ptype=${patientStatus.inpatient}`,
        token
      );

      if (thisMonthResponse?.status === "success") {
        setThisMonthCount(thisMonthResponse.data?.count ?? 0);
      }

    } catch (e) {
      console.error("Inpatient stats fetch error");
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.token]);

  // Fetch patient visit trends for inpatient
  const getPatientsVisit = useCallback(
    async (y: string, m: string) => {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const filterType = m === "0" ? "year" : "month";
      const monthParam = m === "0" ? "" : `&filterMonth=${m}`;
      const url = `patient/${user.hospitalID}/patients/count/fullYearFilterLineChart/${patientStatus.inpatient}?filter=${filterType}&filterYear=${y}${monthParam}`;
      const response = await AuthFetch(url, token);

      if (response?.status === "success") {
        const counts: any[] = Array.isArray(response?.data?.counts)
          ? response?.data?.counts
          : [];
        if (m === "0") {
          const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
    [user?.hospitalID, user?.token]
  );

  useEffect(() => {
    if (user?.hospitalID) {
      getInpatientStats();
      getPatientsVisit(filterYear, filterMonth);
    }
  }, [user?.hospitalID, getInpatientStats, getPatientsVisit, filterYear, filterMonth]);

  const onAddPatient = () => navigation.navigate("AddPatient" as never);

  /* ----------- Sidebar actions ----------- */
  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  const onLogoutPress = () => setConfirmVisible(true);
  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userID"]);
    } catch (e) {
      console.warn("Logout storage cleanup error");
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  const handleWardFilterChange = (value: string) => {
    setSelectedWardDataFilter(value);
  };

  // Sidebar items for IPD
  const sidebarItems: SidebarItem[] = [
    { 
      key: "dash", 
      label: "Dashboard", 
      icon: LayoutDashboardIcon, 
      onPress: () => go("DashboardIpd") 
    },
    { 
      key: "plist", 
      label: "Patients List", 
      icon: UsersIcon, 
      onPress: () => go("PatientList") 
    },
    { 
      key: "addp", 
      label: "Add Patient", 
      icon: UserPlusIcon, 
      onPress: () => go("AddPatient") 
    },
    { 
      key: "discharge", 
      label: "Discharged Patients", 
      icon: FileMinusIcon, 
      onPress: () => go("DischargedPatients") 
    },
    { 
      key: "mgmt", 
      label: "Management", 
      icon: SettingsIcon, 
      onPress: () => go("Management") 
    },
    { 
      key: "help", 
      label: "Help", 
      icon: HelpCircleIcon, 
      onPress: () => go("HelpScreen") 
    },
  ];

  const bottomItems: SidebarItem[] = [
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

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
        <HeaderBar title="Inpatient Services" onMenu={() => setMenuOpen(true)} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </View>
    );
  }

  /* ----------- Render ----------- */
  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
      <HeaderBar title="Inpatient Services" onMenu={() => setMenuOpen(true)} />

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
        {/* KPI cards - Inpatient specific */}
        <View style={styles.statsGrid}>
          <KpiCard 
            title="Total Patients" 
            value={totalPatients} 
            icon={<UsersIcon size={RESPONSIVE.icon.md} color="#2563EB" />} 
            bg="#ffffffff" 
          />
          <KpiCard 
            title="Current Inpatients" 
            value={inPatientCount} 
            icon={<ActivityIcon size={RESPONSIVE.icon.md} color="#10B981" />} 
            bg="#ffffffff" 
          />
          <KpiCard 
            title="Discharged Patients" 
            value={dischargedCount} 
            icon={<UserMinusIcon size={RESPONSIVE.icon.md} color="#F59E0B" />} 
            bg="#ffffffff" 
          />
          <KpiCard 
            title="This Month" 
            value={thisMonthCount} 
            icon={<CalendarIcon size={RESPONSIVE.icon.md} color="#7C3AED" />} 
            bg="#ffffffff" 
          />
        </View>

        {/* Primary action */}
        <View style={styles.controlPanel}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddPatient} activeOpacity={0.85}>
            <PlusIcon size={RESPONSIVE.icon.sm} color="#fff" />
            <Text style={styles.primaryBtnText}>Admit New Patient</Text>
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
                    selectedWardDataFilter === "Day" && styles.filterButtonActive
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
                    selectedWardDataFilter === "Week" && styles.filterButtonActive
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
                    selectedWardDataFilter === "Month" && styles.filterButtonActive
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

        {/* Latest inpatient records */}
        <PatientsList navigation={navigation} patientType={patientStatus.inpatient} />
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
          navigation.navigate("Profile" as never);
        }}
        items={sidebarItems}
        bottomItems={bottomItems}
        onAlertPress={() => {
          // Navigate to Alerts screen when alerts item is clicked
          navigation.navigate("AlertsScreen" as never);
        }}
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

export default DashboardIpd;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  header: {
    height: isExtraSmallDevice ? 80 : 100,
    paddingHorizontal: RESPONSIVE.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#14b8a6",
    paddingTop: Platform.OS === 'ios' ? (isExtraSmallDevice ? 30 : 40) : (isExtraSmallDevice ? 15 : 20),
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
  },
  headerTitle: { 
    fontSize: RESPONSIVE.fontSize.xxl,
    fontWeight: "700", 
    color: "#fdfdfdff",
    flex: 1,
    textAlign: 'center',
    marginRight: RESPONSIVE.spacing.md, // This creates space for the menu button
  },
  menuBtn: {
    width: isExtraSmallDevice ? 34 : 38,
    height: isExtraSmallDevice ? 34 : 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    position: 'absolute',
    right: 0,
  },
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  containerContent: { 
    padding: RESPONSIVE.spacing.sm, 
    gap: RESPONSIVE.spacing.sm 
  },
  statsGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: RESPONSIVE.spacing.xs, 
    justifyContent: "space-between" 
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: RESPONSIVE.spacing.sm,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  iconWrap: {
    width: isExtraSmallDevice ? 36 : 40,
    height: isExtraSmallDevice ? 36 : 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    marginLeft: RESPONSIVE.spacing.xs,
  },
  cardTitle: { 
    color: "#0f172a", 
    fontSize: RESPONSIVE.fontSize.xs, 
    opacity: 0.75, 
    marginBottom: 4 
  },
  cardValue: { 
    color: "#0b1220", 
    fontSize: RESPONSIVE.fontSize.lg, 
    fontWeight: "700" 
  },
  controlPanel: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "flex-end" 
  },
  primaryBtn: {
    backgroundColor: "#1C7C6B",
    height: isExtraSmallDevice ? 40 : 44,
    borderRadius: 12,
    paddingHorizontal: RESPONSIVE.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: isExtraSmallDevice ? 140 : 160,
    justifyContent: 'center',
  },
  primaryBtnText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: RESPONSIVE.fontSize.sm 
  },
  chartsRow: { 
    gap: RESPONSIVE.spacing.sm 
  },
  pieChartContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: RESPONSIVE.spacing.sm,
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
    marginBottom: RESPONSIVE.spacing.sm,
    gap: SCREEN_WIDTH < 375 ? RESPONSIVE.spacing.xs : 0,
  },
  pieChartTitle: {
    fontSize: RESPONSIVE.fontSize.md,
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
    paddingHorizontal: RESPONSIVE.spacing.xs,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: "#14b8a6",
  },
  filterButtonText: {
    fontSize: RESPONSIVE.fontSize.xs,
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
    fontSize: RESPONSIVE.fontSize.md,
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
    fontSize: RESPONSIVE.fontSize.lg, 
    fontWeight: "800", 
    color: "#0b1220" 
  },
  modalMsg: { 
    fontSize: RESPONSIVE.fontSize.sm, 
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
    backgroundColor: "#ecfeff",
  },
  modalBtnDanger: {
    backgroundColor: "#ef4444",
  },
  modalBtnText: {
    fontWeight: "700",
    fontSize: RESPONSIVE.fontSize.sm,
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