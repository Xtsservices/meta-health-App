// Dashboard_Outpatient.tsx
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
  Animated,
  Pressable,
  Easing,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  Users,
  Calendar,
  Clock,
  Activity as ActivityIcon,
  Plus,
  DollarSign,
} from "lucide-react-native";

import { patientStatus } from "../../utils/role";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import LineChartActualScheduled from "../dashboard/lineGraph";
import WeeklyBarChart from "../dashboard/barGraph";
import PatientsList from "../dashboard/patientsList";
import Footer from "../dashboard/footer";
import { showError } from "../../store/toast.slice";

// Import custom SVG icons
import {
  LayoutDashboardIcon,
  ListIcon,
  UserPlusIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  PanelRightOpenIcon,
  BellIcon,
  MenuIcon,
  XIcon,
  CommissionIcon,
} from "../../utils/SvgIcons";

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

// Import Sidebar component and types
import type { SidebarItem } from "../Sidebar/sidebarIpd";

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
      <View style={styles.modalContainer}>
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

/* -------------------------- Sidebar Components -------------------------- */
const SidebarButton: React.FC<{
  item: SidebarItem;
  isActive?: boolean;
  onPress: () => void;
}> = ({ item, isActive = false, onPress }) => {
  const Icon = item.icon;
  const color = item.variant === "danger" ? "#b91c1c" : 
                item.variant === "muted" ? "#475569" : 
                isActive ? "#14b8a6" : "#0b1220";

  return (
    <TouchableOpacity
      style={[
        styles.sidebarButton,
        isActive && styles.sidebarButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.buttonContent}>
        <Icon size={20} color={color} />
        <Text style={[styles.buttonText, { color }]}>{item.label}</Text>
        {item.isAlert && (item.alertCount ?? 0) > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>{item.alertCount}</Text>
          </View>
        )}
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

/* -------------------------- Sidebar Component -------------------------- */
const Sidebar: React.FC<{
  open: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string;
  onProfile: () => void;
  items: SidebarItem[];
  bottomItems: SidebarItem[];
  onAlertPress?: () => void;
}> = ({
  open,
  onClose,
  userName,
  userImage,
  onProfile,
  items,
  bottomItems,
  onAlertPress,
}) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const slide = useRef(new Animated.Value(-Math.min(320, SCREEN_WIDTH * 0.82))).current;
  const [alertCount, setAlertCount] = useState(0);
  const width = Math.min(320, SCREEN_WIDTH * 0.82);



  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

  // Group items by section
  const overviewItems = items?.filter(item => 
    item.key === "dash"
  ) ?? [];
  
  const patientManagementItems = items?.filter(item => 
    ["plist", "addp", "app"].includes(item.key)
  ) ?? [];
  
  const operationsItems = items?.filter(item => 
    item.key === "mgmt" || item.key === "revenue" || item.key === "commission" || item.key === "expense"
  ) ?? [];
  
  const supportItems = items?.filter(item => 
    item.key === "help"
  ) ?? [];

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <Animated.View style={[styles.sidebarContainer, { width, transform: [{ translateX: slide }] }]}>
        
        {/* Header */}
        <View style={styles.sidebarHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color="#0b1220" />
          </TouchableOpacity>

          {/* User Profile Section */}
          <TouchableOpacity style={styles.userProfileSection} onPress={onProfile}>
            <Avatar name={userName} uri={userImage} size={50} />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName || "User"}
              </Text>
              <Text style={styles.userMetaId}>
                Meta Health ID: {user?.id || "N/A"}
              </Text>
              <Text style={styles.userDepartment}>Outpatient Care</Text>
                  {/* Add View Profile link here */}
                  <Text style={styles.viewProfileText}>
                    View Profile
                  </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation Sections */}
        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          
          {/* Overview Section */}
          {overviewItems?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              {overviewItems?.map((item) => (
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

          {/* Patient Management Section */}
          {(patientManagementItems?.length > 0 || alertCount > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patient Management</Text>
              {patientManagementItems?.map((item) => (
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

          {/* Operations Section */}
          {operationsItems?.length > 0 && (
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

          {/* Support Section */}
          {supportItems?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support</Text>
              {supportItems?.map((item) => (
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

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {bottomItems?.map((item) => (
            <TouchableOpacity 
              key={item.key}
              style={[
                styles.bottomButton,
                item.variant === "danger" ? styles.logoutButton : styles.modulesButton
              ]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <item.icon size={20} color={item.variant === "danger" ? "#b91c1c" : "#14b8a6"} />
              <Text style={[
                styles.bottomButtonText,
                { color: item.variant === "danger" ? "#b91c1c" : "#14b8a6" }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

/* -------------------------- KPI Card -------------------------- */
const KpiCard: React.FC<{
  title: string;
  value: number | string | null | undefined;
  icon: React.ReactNode;
  bg: string;
  onPress?: () => void;
}> = ({ title, value, icon, bg, onPress }) => {
  const CardContent = (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value ?? "—"}</Text>
      </View>
      <View style={styles.iconWrap}>{icon}</View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.85}
        style={{ flex: 1 }}
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

/* -------------------------- Main Screen -------------------------- */
const Dashboard_Outpatient: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage || user?.imageURL;

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
  const [loading, setLoading] = useState(true);

  const fetchOnce = useRef(true);

  const getTotalCount = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const res = await AuthFetch(
        `patient/${user.hospitalID}/patients/count/visit/combined?ptype=${patientStatus.outpatient}`,
        token
      );
      if (res?.status === "success" && "data" in res && res?.data?.message === "success") {
        const c = res?.data?.count?.[0] ?? {};
        setAppointmentsToday(c?.appointment_count_today ?? 0);
        setTodayCount(c?.patient_count_today ?? 0);
        setThisMonthCount(c?.patient_count_month ?? 0);
        setThisYearCount(c?.patient_count_year ?? 0);
      }
    } catch (e) {
      const msg =
        (typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string")
          ? (e as any).message
          : (typeof e === "string"
              ? e
              : "getTotalCount error");

      dispatch(showError(msg));
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

    if (res?.status === "success" && "data" in res) {
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
      if (response?.status === "success" && "data" in response) {
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

  useFocusEffect(
    useCallback(() => {
      if (user?.hospitalID && fetchOnce.current) {
        fetchOnce.current = false;
        setLoading(true);
        Promise.all([
          getTotalCount(),
          getWeekly(),
          getLatestPatients(),
          getPatientsVisit(filterYear, filterMonth)
        ]).finally(() => setLoading(false));
      }
      return () => {
        fetchOnce.current = true;
      };
    }, [user?.hospitalID, getTotalCount, getWeekly, getLatestPatients, getPatientsVisit, filterYear, filterMonth])
  );

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
    } catch (e: any) {
      dispatch(
        showError(
          e?.message || String(e) || "Logout storage cleanup error"
        )
      );
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  const sidebarItems: SidebarItem[] = [
    { key: "dash", label: "Dashboard", icon: LayoutDashboardIcon, onPress: () => go("DashboardOPD") },
    { key: "app", label: "Appointments List", icon: ListIcon, onPress: () => go("AppointmentsList") },
    { key: "plist", label: "Patients List", icon: ListIcon, onPress: () => go("PatientList") },
    { key: "addp", label: "Add Patient", icon: UserPlusIcon, onPress: () => go("AddPatient") },
      { 
      key: "expense", 
      label: "Expenditure", 
      icon: ActivityIcon, // You can create a custom ExpenseIcon if needed
      onPress: () => go("ExpenseManagement") 
    },
    { key: "revenue", label: "Revenue", icon: DollarSign, onPress: () => go("RevenueScreen") }, // Added Revenue tab
    { key: "mgmt", label: "Management", icon: SettingsIcon, onPress: () => go("Management") },
    { key: 'commission',label: 'Commission & Fee',icon: CommissionIcon,onPress: () => navigation.navigate('CommissionAndFee')},
    { key: "help", label: "Help", icon: HelpCircleIcon, onPress: () => go("HelpScreen") },
  ];

  const bottomItems: SidebarItem[] = [
    { key: "modules", label: "Go to Modules", icon: PanelRightOpenIcon, onPress: () => go("Home") },
    { key: "logout", label: "Logout", icon: LogOutIcon, onPress: onLogoutPress, variant: "danger" },
  ];

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
        <HeaderBar title="Outpatient Care" onMenu={() => setMenuOpen(true)} />
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
      <HeaderBar title="Outpatient Care" onMenu={() => setMenuOpen(true)} />

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
      <View style={{ width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2 }}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('PatientListScreen' as never, { 
            listType: 'today',
            title: "Today's Patients"
          })}
          activeOpacity={0.85}
        >
          <KpiCard title="Today's Patients" value={todayCount} icon={<Users size={ICON_SIZE.md} color="#2563EB" />} bg="#ffffffff" />
        </TouchableOpacity>
      </View>
      
      <View style={{ width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2 }}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('PatientListScreen' as never, { 
            listType: 'appointments',
            title: "Today's Appointments"
          })}
          activeOpacity={0.85}
        >
          <KpiCard title="Appointments" value={appointmentsToday} icon={<Calendar size={ICON_SIZE.md} color="#10B981" />} bg="#ffffffff" />
        </TouchableOpacity>
      </View>
      
      <View style={{ width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2 }}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('PatientListScreen' as never, { 
            listType: 'month',
            title: "This Month's Patients"
          })}
          activeOpacity={0.85}
        >
          <KpiCard title="This Month" value={thisMonthCount} icon={<Clock size={ICON_SIZE.md} color="#F59E0B" />} bg="#ffffffff" />
        </TouchableOpacity>
      </View>
      
      <View style={{ width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs) / 2 }}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('PatientListScreen' as never, { 
            listType: 'year',
            title: "This Year's Patients"
          })}
          activeOpacity={0.85}
        >
          <KpiCard title="This Year" value={thisYearCount} icon={<ActivityIcon size={ICON_SIZE.md} color="#7C3AED" />} bg="#ffffffff" />
        </TouchableOpacity>
      </View>
        </View>

        {/* Primary action */}
        <View style={styles.controlPanel}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddPatient} activeOpacity={0.85}>
            <Plus size={ICON_SIZE.sm} color="#fff" />
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

        {/* Latest table */}
        <PatientsList navigation={navigation} patientType={patientStatus.outpatient} />
         
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

export default Dashboard_Outpatient;

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
    marginBottom: 4 
  },
  cardValue: { 
    color: "#0b1220", 
    fontSize: FONT_SIZE.lg, 
    fontWeight: "700" 
  },
      viewProfileText: {
    fontSize: 12,
    color: "#007AFF",
    fontStyle: "italic",
    textDecorationLine: "underline",
    marginTop: 4,
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
// In the styles object, update these styles:
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: SPACING.md,
    padding: SPACING.lg,
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
    marginBottom: SPACING.sm,
  },
  modalMsg: { 
    fontSize: FONT_SIZE.sm, 
    color: "#334155", 
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
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
  /* Sidebar Styles */
  sidebarContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
    flex: 1
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
  alertBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  alertText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
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