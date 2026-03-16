// DashboardTriage.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Animated,
  Pressable,
  Easing,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { patientStatus, zoneType } from "../../utils/role";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import LineChartActualScheduled from "../dashboard/lineGraph";
import WeeklyBarChart from "../dashboard/barGraph";
import PatientsList from "../dashboard/patientsList";
import Footer from "../dashboard/footer";
import { showError } from "../../store/toast.slice";
import PieChart from "../dashboard/pieChart";

// responsive utilities (same as OPD)
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT,
} from "../../utils/responsive";

// SVG icons (same set as OPD sidebar)
import {
  LayoutDashboardIcon,
  ListIcon,
  UserPlusIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  PanelRightOpenIcon,
  MenuIcon,
  XIcon,
  ActivityIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  CommissionIcon,
} from "../../utils/SvgIcons";

// import Sidebar types
import type { SidebarItem } from "../Sidebar/sidebarIpd";
import { DollarSign } from "lucide-react-native";

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

/* -------------------------- Header (same as OPD) -------------------------- */
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
            right: SPACING.xs,
          }}
        >
          <MenuIcon size={ICON_SIZE.lg} color="#ffffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* -------------------------- Sidebar helpers (same as OPD) -------------------------- */
const SidebarButton: React.FC<{
  item: SidebarItem;
  isActive?: boolean;
  onPress: () => void;
}> = ({ item, isActive = false, onPress }) => {
  const IconCmp = item.icon;
  const color =
    item.variant === "danger"
      ? "#b91c1c"
      : item.variant === "muted"
      ? "#475569"
      : isActive
      ? "#14b8a6"
      : "#0b1220";

  return (
    <TouchableOpacity
      style={[styles.sidebarButton, isActive && styles.sidebarButtonActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.buttonContent}>
        <IconCmp size={20} color={color} />
        <Text style={[styles.buttonText, { color }]}>{item.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const Avatar: React.FC<{ name?: string; uri?: string; size?: number }> = ({
  name = "",
  uri,
  size = 46,
}) => {
  const initial = (name || "").trim().charAt(0).toUpperCase() || "U";
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
};

/* -------------------------- Sidebar component (grouped like screenshot) -------------------------- */
const Sidebar: React.FC<{
  open: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string;
  onProfile: () => void;
  items: SidebarItem[];
  bottomItems: SidebarItem[];
}> = ({ open, onClose, userName, userImage, onProfile, items, bottomItems }) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const slide = useRef(new Animated.Value(-Math.min(320, SCREEN_WIDTH * 0.82))).current;
  const width = Math.min(320, SCREEN_WIDTH * 0.82);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

  // Group items into sections (keys same as OPD)
  const overviewItems = items?.filter((item) => item.key === "dash") ?? [];
  const patientManagementItems =
    items?.filter((item) => ["plist", "addp", "app"].includes(item.key)) ?? [];
  const operationsItems = items?.filter((item) => ["commission","expense","mgmt","revenue"].includes(item.key))  ?? [];
  const supportItems = items?.filter((item) => item.key === "help") ?? [];

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.sidebarOverlay} onPress={onClose} />
      <Animated.View
        style={[styles.sidebarContainer, { width, transform: [{ translateX: slide }] }]}
      >
        {/* Sidebar header with avatar */}
        <View style={styles.sidebarHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color="#0b1220" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.userProfileSection} onPress={onProfile}>
            <Avatar name={userName} uri={userImage} size={50} />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName || "User"}
              </Text>
              <Text style={styles.userMetaId}>Meta Health ID: {user?.id || "N/A"}</Text>
              <Text style={styles.profile}>View Profile</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation sections */}
        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          {/* Overview */}
          {overviewItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              {overviewItems.map((item) => (
                <SidebarButton
                  key={item.key}
                  item={item}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
            </View>
          )}

          {/* Patient Management */}
          {patientManagementItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patient Management</Text>
              {patientManagementItems.map((item) => (
                <SidebarButton
                  key={item.key}
                  item={item}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
            </View>
          )}

          {/* Operations */}
          {operationsItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operations</Text>
              {operationsItems.map((item) => (
                <SidebarButton
                  key={item.key}
                  item={item}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
            </View>
          )}

          {/* Support */}
          {supportItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support</Text>
              {supportItems.map((item) => (
                <SidebarButton
                  key={item.key}
                  item={item}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom actions (Go to Modules / Logout) */}
        <View style={styles.bottomActions}>
          {bottomItems?.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.bottomButton,
                item.variant === "danger" ? styles.logoutButton : styles.modulesButton,
              ]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <item.icon
                size={20}
                color={item.variant === "danger" ? "#b91c1c" : "#14b8a6"}
              />
              <Text
                style={[
                  styles.bottomButtonText,
                  { color: item.variant === "danger" ? "#b91c1c" : "#14b8a6" },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

/* -------------------------- KPI Card (visual same as OPD) -------------------------- */
const KpiCard: React.FC<{
  title: string;
  value: number | string | null | undefined;
  icon: React.ReactNode;
  bg: string;
}> = ({ title, value, icon, bg }) => {
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

/* -------------------------- Main Screen (logic same as your triage) -------------------------- */
const DashboardTriage: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage || user?.imageURL;

  const FOOTER_FIXED = 70;

  // Sidebar & logout
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // KPIs & data (same as original)
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
  const [selectedZoneDataFilter, setSelectedZoneDataFilter] =
    useState<"Day" | "Week" | "Month">("Day");
  const [zoneData, setZoneData] = useState<{ x: string; y: number; color: string }[]>([]);
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

        if (res?.status === "success" && "data" in res && Array.isArray(res?.data?.counts)) {
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
        const success = res?.status === "success" && "data" in res;
        if (!success) {
          setZoneData([]);
          dispatch(showError("Failed to fetch zone data"));
          return;
        }

        const rows: Array<{ zone: number; patient_count: number }> = Array.isArray(
          res?.data?.count
        )
          ? res.data.count
          : Array.isArray((res as any)?.count)
          ? (res as any).count
          : [];

        if (!rows.length) {
          setZoneData([]);
          return;
        }

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
        dispatch(showError(err?.message || String(err) || "Error fetching zone data"));
      } finally {
        setZoneLoading(false);
      }
    },
    [user?.hospitalID, user?.token, dispatch]
  );

  /* -------------------------- LATEST PATIENTS -------------------------- */
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
    ])
  );

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
      await AsyncStorage.multiRemove(["token", "userID"]);
    } catch (e: any) {
      dispatch(showError(e?.message || String(e) || "Logout storage cleanup error"));
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  // items for sidebar – keys used for grouping into Overview / Patient Management / Operations / Support
  const sidebarItems: SidebarItem[] = [
    { key: "dash", label: "Dashboard", icon: LayoutDashboardIcon, onPress: () => go("TriageDashboard") },
    { key: "plist", label: "Patients List", icon: ListIcon, onPress: () => go("PatientList") },
    { key: "addp", label: "Add Patient", icon: UserPlusIcon, onPress: () => go("AddPatient") },
        { 
          key: "expense", 
          label: "Expenditure", 
          icon: ActivityIcon,
          onPress: () => go("ExpenseManagement") 
        },
    { key: 'commission',label: 'Commission & Fee',icon: CommissionIcon,onPress: () => navigation.navigate('CommissionAndFee')},
    { key: "revenue", label: "Revenue", icon: DollarSign, onPress: () => go("RevenueTabNavigator") }, // Added Revenue tab
    { key: "mgmt", label: "Management", icon: SettingsIcon, onPress: () => go("Management") },
    { key: "help", label: "Help", icon: HelpCircleIcon, onPress: () => go("HelpScreen") },
  ];

  const bottomItems: SidebarItem[] = [
    { key: "modules", label: "Go to Modules", icon: PanelRightOpenIcon, onPress: () => go("Home") },
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
          {
            paddingBottom:
              FOOTER_FIXED + (insets.bottom > 0 ? insets.bottom + SPACING.md : SPACING.md),
            minHeight: SCREEN_HEIGHT - (isSmallDevice ? 120 : 160),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI cards */}
        <View style={styles.statsGrid}>
        {/* Today's Patients */}
        <TouchableOpacity
          style={{ width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2 }}
          onPress={() => navigation.navigate('OPDTriagePatientList' as never, {
            listType: 'today',
            title: "Today's Triage Patients",
            zoneType: 'triage',
            emergencyTime: 'today'
          })}
          activeOpacity={0.85}
        >
          <KpiCard
            title="Today's Patients"
            value={todayCount}
            icon={<UsersIcon size={ICON_SIZE.md} color="#2563EB" />}
            bg="#ffffffff"
          />
        </TouchableOpacity>

        {/* Appointments */}
        <TouchableOpacity
          style={{ width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2 }}
          onPress={() => navigation.navigate('OPDTriagePatientList' as never, {
            listType: 'appointment',
            title: "Triage Appointments",
            zoneType: 'triage',
            emergencyTime: 'appointment'
          })}
          activeOpacity={0.85}
        >
          <KpiCard
            title="Appointments"
            value={appointmentsToday}
            icon={<CalendarIcon size={ICON_SIZE.md} color="#10B981" />}
            bg="#ffffffff"
          />
        </TouchableOpacity>

        {/* This Month */}
        <TouchableOpacity
          style={{ width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2 }}
          onPress={() => navigation.navigate('OPDTriagePatientList' as never, {
            listType: 'month',
            title: "This Month's Triage Patients",
            zoneType: 'triage',
            emergencyTime: 'month'
          })}
          activeOpacity={0.85}
        >
          <KpiCard
            title="This Month"
            value={thisMonthCount}
            icon={<ClockIcon size={ICON_SIZE.md} color="#F59E0B" />}
            bg="#ffffffff"
          />
        </TouchableOpacity>

        {/* This Year */}
        <TouchableOpacity
          style={{ width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2 }}
          onPress={() => navigation.navigate('OPDTriagePatientList' as never, {
            listType: 'year',
            title: "This Year's Triage Patients",
            zoneType: 'triage',
            emergencyTime: 'year'
          })}
          activeOpacity={0.85}
        >
          <KpiCard
            title="This Year"
            value={thisYearCount}
            icon={<ActivityIcon size={ICON_SIZE.md} color="#7C3AED" />}
            bg="#ffffffff"
          />
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

        {/* Zone Pie Chart */}
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
            <PieChart data={zoneData} />
          ) : (
            <Text style={styles.emptyPieText}>No patients in selected period.</Text>
          )}
        </View>

        {/* Latest patients table */}
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

export default DashboardTriage;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* Header (from OPD) */
  header: {
    height:
      Platform.OS === "ios"
        ? isExtraSmallDevice
          ? 90
          : isSmallDevice
          ? 100
          : 110
        : isExtraSmallDevice
        ? 70
        : isSmallDevice
        ? 80
        : 90,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#14b8a6",
    paddingTop:
      Platform.OS === "ios"
        ? isExtraSmallDevice
          ? 30
          : 40
        : isExtraSmallDevice
        ? 15
        : 20,
    justifyContent: "center",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "700",
    color: "#fdfdfdff",
    flex: 1,
    textAlign: "center",
    marginRight: SPACING.md,
  },
  menuBtn: {
    width: ICON_SIZE.lg + SPACING.xs,
    height: ICON_SIZE.lg + SPACING.xs,
    borderRadius: SPACING.xs,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 0,
  },

  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  containerContent: {
    padding: SPACING.sm,
    gap: SPACING.sm,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    justifyContent: "space-between",
  },
  card: {
    width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2,
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
    marginBottom: 4,
  },
  cardValue: {
    color: "#0b1220",
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },

  controlPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
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
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: FONT_SIZE.sm,
  },

  chartsRow: {
    gap: SPACING.sm,
  },

  /* Zone pie card (kept from triage, adjusted to responsive spacing) */
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
    flexDirection: W < 375 ? "column" : "row",
    justifyContent: "space-between",
    alignItems: W < 375 ? "flex-start" : "center",
    marginBottom: SPACING.sm,
    gap: W < 375 ? SPACING.xs : 0,
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
  pieLoadingWrap: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPieText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: FONT_SIZE.xs,
    paddingVertical: 12,
  },

  /* Patients list card (if dark theme used inside) */
  tableCard: { backgroundColor: "#0F1C3F", borderRadius: 16, padding: 12 },
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

  /* Confirm dialog modal */
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
    color: "#0b1220",
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
    alignItems: "center",
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

  /* Sidebar styles (same as OPD to match screenshot) */
  sidebarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sidebarContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
  },
  sidebarHeader: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: -10,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    zIndex: 10,
  },
  userProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 50,
    flex: 1,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0b1220",
    marginBottom: 2,
  },
  userMetaId: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: 12,
    color: "#14b8a6",
    fontWeight: "600",
  },
  profile: {
   fontSize: 12,
    color: "#007AFF", // iOS blue link color
    fontStyle: "italic",
    textDecorationLine: "underline",
    marginTop: 4,
  },
  
  sidebarContent: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sidebarButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarButtonActive: {
    backgroundColor: "#f0fdfa",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  bottomActions: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 8,
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modulesButton: {
    backgroundColor: "#f0fdfa",
  },
  logoutButton: {
    backgroundColor: "#fef2f2",
  },
  bottomButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  avatar: {
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    color: "#0b1220",
    fontSize: 16,
  },
});
