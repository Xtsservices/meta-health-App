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
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

import { patientStatus } from "../../utils/role";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import LineChartActualScheduled from "../dashboard/lineGraph";
import PieChart from "../dashboard/pieChart";
import PatientsList from "../dashboard/patientsList";
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
type RouteParams = { 
  id: string; 
  staffRole?: string; 
  reception?: boolean;
  fromDischargeList?: boolean;
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
    ? (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs * 2) / 3 
    : SCREEN_WIDTH - SPACING.md * 2;

  return (
  <View style={[styles.card, { backgroundColor: bg }]}>
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
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const id = route.params?.id;

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

  const fetchOnce = useRef(true);

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

  useFocusEffect(
    useCallback(() => {
      if (user?.hospitalID && fetchOnce.current) {
        fetchOnce.current = false;
        getInpatientStats();
        getPatientsVisit(filterYear, filterMonth);
      }
      return () => {
        fetchOnce.current = true;
      };
    }, [user?.hospitalID, getInpatientStats, getPatientsVisit, filterYear, filterMonth])
  );

  // FIXED: Pass patientStatus as inpatient (2) when navigating to AddPatient
  const onAddPatient = () => navigation.navigate("AddPatient", { 
    patientStatus: patientStatus.inpatient 
  });

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
      onPress: () => go("DischargedPatientsIPD") 
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
            paddingBottom: FOOTER_HEIGHT + (insets.bottom > 0 ? insets.bottom + SPACING.md : SPACING.md),
            minHeight: SCREEN_HEIGHT - (isSmallDevice ? 120 : 160)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
{/* KPI cards - Two on top, one below */}
<View style={styles.statsContainer}>
  {/* Top row - Two cards side by side */}
  <View style={styles.topRow}>
    <KpiCard 
      title="Total Patients" 
      value={totalPatients} 
      icon={<UsersIcon size={ICON_SIZE.md} color="#2563EB" />} 
      bg="#ffffffff" 
    />
    <KpiCard 
      title="Current Inpatients" 
      value={inPatientCount} 
      icon={<ActivityIcon size={ICON_SIZE.md} color="#10B981" />} 
      bg="#ffffffff" 
    />
  </View>
  
  {/* Bottom row - Single centered card */}
  <View style={styles.bottomRow}>
    <KpiCard 
      title="Discharged Patients" 
      value={dischargedCount} 
      icon={<UserMinusIcon size={ICON_SIZE.md} color="#F59E0B" />} 
      bg="#ffffffff" 
    />
  </View>
</View>

        {/* Primary action */}
        <View style={styles.controlPanel}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddPatient} activeOpacity={0.85}>
            <PlusIcon size={ICON_SIZE.sm} color="#fff" />
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
          navigation.navigate("DoctorProfile" as never, { id } as never);
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
    height: Platform.OS === 'ios' 
      ? (isExtraSmallDevice ? 90 : isSmallDevice ? 100 : 110)
      : (isExtraSmallDevice ? 70 : isSmallDevice ? 80 : 90),
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#14b8a6",
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
    backgroundColor: "#fff" 
  },
  containerContent: { 
    padding: SPACING.sm, 
    gap: SPACING.sm 
  },
  statsGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: SPACING.xs, 
    justifyContent: "space-between" 
  },
statsContainer: {
  gap: SPACING.sm,
},
topRow: {
  flexDirection: "row",
  gap: SPACING.sm,
  justifyContent: "space-between",
  alignItems: "stretch",
},
bottomRow: {
  alignItems: "center", // Center the single card
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
  color: "#0f172a", 
  fontSize: FONT_SIZE.xs, 
  opacity: 0.75, 
  marginBottom: 4 
},
cardValue: { 
  color: "#0b1220", 
  fontSize: FONT_SIZE.lg, 
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
    backgroundColor: "#fff",
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
    color: "#0f172a",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: SPACING.xs,
    padding: 4,
  },
  filterButton: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: "#14b8a6",
  },
  filterButtonText: {
    fontSize: FONT_SIZE.xs,
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
    paddingBottom: SCREEN_HEIGHT * 0.1,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: "#14b8a6",
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
    backgroundColor: "#fff",
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
    color: "#0b1220" 
  },
  modalMsg: { 
    fontSize: FONT_SIZE.sm, 
    color: "#334155", 
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
    backgroundColor: "#ecfeff",
  },
  modalBtnDanger: {
    backgroundColor: "#ef4444",
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