import React, { useState, useCallback, useRef, useEffect } from "react";
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
  Image,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
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
  AlertTriangle,
  Stethoscope,
  X,
  Bell,
  DollarSign,
} from "lucide-react-native";

import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import Footer from "../dashboard/footer";
import { showError } from "../../store/toast.slice";
import PatientsList from "../dashboard/patientsList";
import { Picker } from "@react-native-picker/picker";
import { formatDate } from "../../utils/dateTime";
import SurgeryChart from "./surgeryChart";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "../../utils/yearMonth";
import useOTConfig, { OTScreenType } from "../../utils/otConfig";
import DashboardAlerts from "./dashboardAlerts";
import SurgerySchedule from "./surgerySchedule";

// ---- Types ----
type OTAlertCardProps = {
  id: string | number;
  patientName: string;
  surgeryType: string;
  scheduledDate: string;
  status: string;
};

type SurgeonCounts = {
  totalSurgeries: number;
  todayScheduledSurgeries: number;
  todayAddedSurgeries: number;
};

export type SidebarItem = {
  key: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  variant?: "default" | "danger" | "muted";
  isAlert?: boolean;
  alertCount?: number;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;
const isSmallDevice = SCREEN_WIDTH < 375;
const isExtraSmallDevice = SCREEN_WIDTH < 350;

// Responsive utilities
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
};

const ICON_SIZE = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 30,
  xl: 36,
};

const FOOTER_HEIGHT = 70;

// OT User Types
enum OTUserTypes {
  ANESTHETIST = "anesthetist",
  SURGEON = "surgeon",
}

// Shared year/month helpers
const NOW = new Date();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_YEAR = NOW.getFullYear();

/* -------------------------- Sidebar Component -------------------------- */
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

/* -------------------------- Avatar Component -------------------------- */
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

/* -------------------------- Main Sidebar Component -------------------------- */
const Sidebar: React.FC<{
  open: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string;
  onProfile: () => void;
  items: SidebarItem[];
  bottomItems: SidebarItem[];
  width?: number;
  onAlertPress?: () => void;
}> = ({
  open,
  onClose,
  userName,
  userImage,
  onProfile,
  items,
  bottomItems,
  width = Math.min(320, SCREEN_WIDTH * 0.82),
  onAlertPress,
}) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const slide = useRef(new Animated.Value(-width)).current;
  const [alertCount, setAlertCount] = React.useState(0);


  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

  // Group items by section for better organization
  const overviewItems = items?.filter(item => 
    item.key === "dash"
  ) ?? [];
  
  const operationsItems = items?.filter(item => 
    ["slist", "emer", "ele", "mgmt"].includes(item.key)
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
            <X size={24} color="#0b1220" />
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
              <Text style={styles.userDepartment}>Operation Theatre</Text>
              
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

          {/* Operations Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operations</Text>

            {operationsItems?.map((item) => (
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

/* -------------------------- Confirm Dialog -------------------------- */
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
      <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn} accessibilityLabel="Open menu"
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

/* -------------------------- Alert Card -------------------------- */
const AlertCard: React.FC<OTAlertCardProps> = ({
  patientName,
  surgeryType,
  scheduledDate,
  status,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "#F59E0B";
      case "approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  return (
    <View style={styles.alertCard}>
      <View style={styles.alertCardHeader}>
        <Text style={styles.patientName}>{patientName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      <Text style={styles.surgeryType}>{surgeryType}</Text>
      <View style={styles.alertCardFooter}>
        <Clock size={14} color="#6B7280" />
        <Text style={styles.scheduleDate}>{formatDate(scheduledDate)}</Text>
      </View>
    </View>
  );
};

/* -------------------------- Alert Card Container -------------------------- */
const AlertCardContainer: React.FC<{ data: OTAlertCardProps[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <View style={styles.noAlertsContainer}>
        <AlertTriangle size={32} color="#9CA3AF" />
        <Text style={styles.noAlertsText}>No surgery alerts found</Text>
      </View>
    );
  }

  return (
    <View style={styles.alertsContainer}>
      {data.map((alert, index) => (
        <View key={alert.id}>
          <AlertCard {...alert} />
          {index < data.length - 1 && <View style={styles.alertSeparator} />}
        </View>
      ))}
    </View>
  );
};

/* -------------------------- Main OT Dashboard -------------------------- */
const OTDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
const { setScreenType } = useOTConfig();
  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage;
  const userType = user?.roleName; // expecting "anesthetist" / "surgeon"
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [alertsData, setAlertsData] = useState<OTAlertCardProps[]>([]);
  const [totalAlertsCount, setTotalAlertsCount] = useState(0);
  const [electiveCount, setElectiveCount] = useState(0);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [surgeonCounts, setSurgeonCounts] = useState<SurgeonCounts | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const alertsReqSeqRef = useRef(0);

  const isAnesthetist = userType === OTUserTypes.ANESTHETIST;
  const isSurgeon = userType === OTUserTypes.SURGEON;

  // Filters for top-left card (Surgeries Overview / Approved vs Rejected)
  const [filterYearSummary, setFilterYearSummary] = useState<string>(
    String(CURRENT_YEAR)
  );
  const [filterMonthSummary, setFilterMonthSummary] = useState<string>(
    String(CURRENT_MONTH)
  );

  // Filters for Emergency vs Elective card
  const [filterYearType, setFilterYearType] = useState<string>(
    String(CURRENT_YEAR)
  );
  const [filterMonthType, setFilterMonthType] = useState<string>(
    String(CURRENT_MONTH)
  );

    const [filterYearSurgeryType, setfilterYearSurgeryType] = useState<string>(
    String(CURRENT_YEAR)
  );
  const [filterMonthSurgeryType, setfilterMonthSurgeryType] = useState<string>(
    String(CURRENT_MONTH)
  );

  const [SurgeryChartDemoData, setSurgeryChartDemoData] = useState([]);

  useFocusEffect(
    useCallback(() => {
  if ( !user?.hospitalID) {
    setSurgeryChartDemoData([]);
    return;
  }

  // Clear existing data immediately so we don't show stale anesthetist data for surgeons
  setSurgeryChartDemoData([]);

  let cancelled = false;

  (async () => {
    try {
       const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const endpoint =
        userType === OTUserTypes.SURGEON
          ? `ot/${user.hospitalID}/surgeonSurgeryTypes?year=${filterYearSurgeryType}&month=${filterMonthSurgeryType}`
          : `ot/${user.hospitalID}/surgeryTypes?year=${filterYearSurgeryType}&month=${filterMonthSurgeryType}`;

      const res: any = await AuthFetch(endpoint, token);
      
      if (!cancelled && res?.status === "success" && Array.isArray(res?.data?.data)) {
        const transformed = res?.data?.data?.map(
          (item: { SurgeryType: string; PatientCount: number }) => ({
            x: item.SurgeryType,
            y: item.PatientCount,
          })
        );
        setSurgeryChartDemoData(res?.data?.data);
      }
    } catch (err) {
      if (!cancelled) {
        setSurgeryChartDemoData([]); // keep UI consistent on error
      }
    }
  })();

  return () => {
    cancelled = true; // prevent late setState from previous role/user
  };
  
}, [
  userType,
  user?.id,
  user?.hospitalID,
  filterYearSurgeryType,
  filterMonthSurgeryType,  
]));


  // ---------- Fetch: Alerts ----------
  const fetchAlertsData = useCallback(async () => {
    if (!user?.hospitalID) return;

    const seq = ++alertsReqSeqRef.current;
    setAlertsData([]);
    setTotalAlertsCount(0);

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const status = isAnesthetist ? "pending" : "approved";

      const res = await AuthFetch(
        `ot/${user?.hospitalID}/${status}/getAlerts`,
        token
      );
      if (alertsReqSeqRef.current !== seq) return;

      if (res?.status === "success" && "data" in res ) {
        const rawList = Array.isArray(res.data) ? res.data : [];
        setTotalAlertsCount(rawList.length);
        const latestFive = [...rawList].reverse().slice(0, 5);
        setAlertsData(latestFive);
      }
    } catch {
      if (alertsReqSeqRef.current === seq) {
        dispatch(showError("Failed to fetch alerts data"));
      }
    }
  }, [user?.hospitalID, isAnesthetist, dispatch]);

  // ---------- Fetch: Emergency vs Elective ----------
  const fetchPatientTypeCounts = useCallback(async () => {
    if (!user?.hospitalID) return;

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const year = Number(filterYearType) || CURRENT_YEAR;
      const month = Number(filterMonthType) || CURRENT_MONTH;

      const res = await AuthFetch(
        `ot/${user?.hospitalID}/getOTPatientTypeCount?year=${year}&month=${month}`,
        token
      );

      if (res?.status === "success" && "data" in res) {
        // assuming { data: { elective, emergency } }
        const d = res.data?.data || res.data || {};
        setElectiveCount(Number(d.elective || 0));
        setEmergencyCount(Number(d.emergency || 0));
      }
    } catch {
      dispatch(showError("Failed to fetch patient type counts"));
    }
  }, [user?.hospitalID,  dispatch, filterYearType, filterMonthType]);

  // ---------- Fetch: Surgeon Dashboard Counts ----------
  const fetchSurgeonCounts = useCallback(async () => {
    if (!user?.hospitalID || !user?.id || !isSurgeon) return;

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      // backend currently without filter in your code; keeping as-is
      const res = await AuthFetch(
        `ot/${user?.hospitalID}/${user?.id}/getSurgeonDashboardCounts`,
        token
      );

      if (res?.status === "success" && "data" in res && res?.data) {
        const d = res?.data?.data || res.data;
        setSurgeonCounts({
          totalSurgeries: Number(d.totalSurgeries || 0),
          todayScheduledSurgeries: Number(d.todayScheduledSurgeries || 0),
          todayAddedSurgeries: Number(d.todayAddedSurgeries || 0),
        });
      } else {
        setSurgeonCounts({
          totalSurgeries: 0,
          todayScheduledSurgeries: 0,
          todayAddedSurgeries: 0,
        });
      }
    } catch {
      setSurgeonCounts({
        totalSurgeries: 0,
        todayScheduledSurgeries: 0,
        todayAddedSurgeries: 0,
      });
      dispatch(showError("Failed to fetch surgeon counts"));
    }
  }, [user?.hospitalID, user?.id, dispatch, isSurgeon]);

  // ---------- Fetch: Approved vs Rejected (Anesthetist) ----------
  const fetchApprovedRejectedCounts = useCallback(async () => {
    if (!user?.hospitalID || !isAnesthetist) return;

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const year = Number(filterYearSummary) || CURRENT_YEAR;
      const month = Number(filterMonthSummary) || CURRENT_MONTH;

      const res = await AuthFetch(
        `ot/${user?.hospitalID}/approvedRejected?year=${year}&month=${month}`,
        token
      );
      if (res?.status === "success" && "data" in res) {
        const row =
          res.data?.data?.[0] || res.data?.[0] || res.data || {};
        const a = Number(row.ApprovedCount || row.approved || 0);
        const r = Number(row.RejectedCount || row.rejected || 0);
        setApprovedCount(a);
        setRejectedCount(r);
      }
    } catch {
      dispatch(showError("Failed to fetch approval counts"));
    }
  }, [
    user?.hospitalID,
    isAnesthetist,
    dispatch,
    filterYearSummary,
    filterMonthSummary,
  ]);

  // ---------- Load data on mount + when filters change ----------
 
 
  useFocusEffect(
    useCallback(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAlertsData(),
        fetchPatientTypeCounts(),
        isSurgeon && fetchSurgeonCounts(),
        isAnesthetist && fetchApprovedRejectedCounts(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [
    fetchAlertsData,
    fetchPatientTypeCounts,
    fetchSurgeonCounts,
    fetchApprovedRejectedCounts,
    isSurgeon,
    isAnesthetist,
  ])
);

  /* ----------- Sidebar actions ----------- */
  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  const onLogoutPress = () => setConfirmVisible(true);
  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userID"]);
    } catch {
      dispatch(showError("Logout storage cleanup error"));
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  const sidebarItems: SidebarItem[] = [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard, onPress: () => go("OtDashboard") },
    { key: "slist", label: "Surgery Alerts", icon: ListIcon, onPress: () => go("DashboardAlerts", { type: "surgeries" }) },
    { key: "emer", label: "Emergency", icon: UserPlus2,onPress: () => {
      setScreenType(OTScreenType.EMERGENCY); 
      go("PatientList");
    }, },
    { key: "ele", label: "Elective ", icon: UserPlus2,  onPress: () => {
      setScreenType(OTScreenType.ELECTIVE); 
      go("PatientList");
    },},
    { key: "mgmt", label: "Management", icon: Settings, onPress: () => go("Management") },
    { key: "help", label: "Help", icon: HelpCircle, onPress: () => go("HelpScreen") },
  ];

  const bottomItems: SidebarItem[] = [
   
    { key: "logout", label: "Logout", icon: LogOut, onPress: onLogoutPress, variant: "danger" },
  ];

  // Calculate percentage for emergency vs elective
  const totalPatients = emergencyCount + electiveCount;
  const emergencyPercentage =
    totalPatients > 0 ? (emergencyCount / totalPatients) * 100 : 0;
  const electivePercentage =
    totalPatients > 0 ? (electiveCount / totalPatients) * 100 : 0;

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
      <HeaderBar title="Operation Theatre" onMenu={() => setMenuOpen(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.containerContent,
          { paddingBottom: FOOTER_HEIGHT + (insets.bottom > 0 ? insets.bottom + SPACING.md : SPACING.md),minHeight: SCREEN_HEIGHT - (isSmallDevice ? 120 : 160) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingText}>Loading OT Dashboard...</Text>
          </View>
        ) : (
          <>
            {/* KPI Cards Row */}
            <View style={styles.statsGrid}>
              {/* LEFT CARD */}
              <View style={[styles.card, { backgroundColor: "#E8F0FE" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    {isSurgeon ? "Surgeries Overview" : "Approved vs Rejected"}
                  </Text>
                </View>

                {/* Filters BELOW heading */}
                <View style={styles.cardFilterRow}>
  <View style={styles.filterBox}>
    <Picker
      selectedValue={filterYearSummary}
      mode="dialog"
      style={styles.filterPicker}
      dropdownIconColor="#0f172a"
      onValueChange={(val) => setFilterYearSummary(String(val))}
    >
      {YEAR_OPTIONS.map((y) => (
        <Picker.Item key={y} label={y} value={y} />
      ))}
    </Picker>
  </View>

  <View style={styles.filterBox}>
    <Picker
      selectedValue={filterMonthSummary}
      mode="dialog"
      style={styles.filterPicker}
      dropdownIconColor="#0f172a"
      onValueChange={(val) => setFilterMonthSummary(String(val))}
    >
      {MONTH_OPTIONS.map((m) => (
        <Picker.Item key={m.value} label={m.label} value={m.value} />
      ))}
    </Picker>
  </View>
</View>

                {isSurgeon ? (
                  <View style={styles.kpiGrid}>
                    {/* Total Surgeries */}
                    <TouchableOpacity 
                      style={styles.kpiItem}
                      onPress={() => navigation.navigate("OtPatientList", { 
                        view: "surgeon",
                        type: "totalSurgeries",
                        title: "Total Surgeries",
                        year: filterYearSummary,
                        month: filterMonthSummary
                      })}
                      activeOpacity={0.7}
                      accessibilityLabel={`Total Surgeries: ${surgeonCounts?.totalSurgeries || 0}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.kpiValue}>
                        {surgeonCounts?.totalSurgeries || 0}
                      </Text>
                      <Text style={styles.kpiLabel}>Total Surgeries</Text>
                    </TouchableOpacity>
                    
                    {/* Today Scheduled Surgeries */}
                    <TouchableOpacity 
                      style={styles.kpiItem}
                      onPress={() => navigation.navigate("OtPatientList", { 
                        view: "surgeon",
                        type: "todayScheduledSurgeries",
                        title: "Today Scheduled Surgeries"
                      })}
                      activeOpacity={0.7}
                      accessibilityLabel={`Today Scheduled Surgeries: ${surgeonCounts?.todayScheduledSurgeries || 0}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.kpiValue}>
                        {surgeonCounts?.todayScheduledSurgeries || 0}
                      </Text>
                      <Text style={styles.kpiLabel}>Today Scheduled</Text>
                    </TouchableOpacity>
                    
                    {/* Today Added Surgeries */}
                    <TouchableOpacity 
                      style={styles.kpiItem}
                      onPress={() => navigation.navigate("OtPatientList", { 
                        view: "surgeon",
                        type: "todayAddedSurgeries",
                        title: "Today Added Surgeries"
                      })}
                      activeOpacity={0.7}
                      accessibilityLabel={`Today Added Surgeries: ${surgeonCounts?.todayAddedSurgeries || 0}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.kpiValue}>
                        {surgeonCounts?.todayAddedSurgeries || 0}
                      </Text>
                      <Text style={styles.kpiLabel}>Today Added</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.kpiGrid}>
                    {/* Approved (Anesthetist) */}
                    <TouchableOpacity 
                      style={styles.kpiItem}
                      onPress={() => navigation.navigate("ApprovedRejectedList", { 
                        status: "approved",
                        year: filterYearSummary,
                        month: filterMonthSummary
                      })}
                      activeOpacity={0.7}
                      accessibilityLabel={`Approved Surgeries: ${approvedCount}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.kpiValue}>{approvedCount}</Text>
                      <Text style={styles.kpiLabel}>Approved</Text>
                    </TouchableOpacity>
                    
                    {/* Rejected (Anesthetist) */}
                    <TouchableOpacity 
                      style={styles.kpiItem}
                      onPress={() => navigation.navigate("ApprovedRejectedList", { 
                        status: "rejected",
                        year: filterYearSummary,
                        month: filterMonthSummary
                      })}
                      activeOpacity={0.7}
                      accessibilityLabel={`Rejected Surgeries: ${rejectedCount}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.kpiValue}>{rejectedCount}</Text>
                      <Text style={styles.kpiLabel}>Rejected</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* RIGHT CARD - Emergency vs Elective */}
              <View style={[styles.card, { backgroundColor: "#E7F8F1" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Emergency vs Elective</Text>
                </View>

                {/* Filters BELOW heading */}
                <View style={styles.cardFilterRow}>
                  <View style={styles.filterBox}>
                    <Picker
                      selectedValue={filterYearType}
                      mode="dialog"
                      style={styles.filterPicker}
                      dropdownIconColor="#0f172a"
                      onValueChange={(val) => setFilterYearType(String(val))}
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <Picker.Item key={y} label={y} value={y} />
                      ))}
                    </Picker>
                  </View>

                  <View style={styles.filterBox}>
                    <Picker
                      selectedValue={filterMonthType}
                      mode="dialog"
                      style={styles.filterPicker}
                      dropdownIconColor="#0f172a"
                      onValueChange={(val) => setFilterMonthType(String(val))}
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <Picker.Item key={m.value} label={m.label} value={m.value} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.volumeContainer}>
                  <View style={styles.volumeBar}>
                    <View
                      style={[
                        styles.barSegment,
                        styles.barEmergency,
                        { width: `${emergencyPercentage}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.barSegment,
                        styles.barElective,
                        { width: `${electivePercentage}%` },
                      ]}
                    />
                    {totalPatients === 0 && (
                      <Text style={styles.emptyBarLabel}>No data available</Text>
                    )}
                  </View>

                  <View style={styles.barFooter}>
                    <Text style={styles.barFooterText}>
                      Emergency:{" "}
                      <Text style={styles.barFooterValue}>{emergencyCount}</Text>
                    </Text>
                   
                    <Text style={styles.barFooterText}>
                      Total: <Text style={styles.barFooterValue}>{totalPatients}</Text>
                    </Text>
                     <Text style={styles.barFooterText}>
                      Elective:{" "}
                      <Text style={styles.barFooterValue}>{electiveCount}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* OT Patients List (if needed) */}
            <DashboardAlerts type='dashboard' />
            <SurgeryChart
             data={SurgeryChartDemoData}
             year={filterYearSurgeryType}
             month={filterMonthSurgeryType}
             onYearChange={setfilterYearSurgeryType}
             onMonthChange={setfilterMonthSurgeryType}
            />
            {!isAnesthetist && 
                  <SurgerySchedule type="dashboard" />}
          </>
        )}
      </ScrollView>

      {/* Footer */}
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

      {/* Logout Confirm */}
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

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },

  /* Header */
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
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: "700", color: "#fdfdfdff",
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

  container: { flex: 1, backgroundColor: "#ffffff" },
  containerContent: { padding: SPACING.sm, gap: SPACING.sm  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZE.md,
    color: "#14b8a6",
    fontWeight: "600",
  },

  /* Stats Grid */
  statsGrid: {
    flex: 1,
    flexDirection: "column",
    flexWrap: "wrap",
  },
  card: {
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    padding: SPACING.sm,
    borderRadius: SPACING.md,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    width: "100%",
    marginBottom: SPACING.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: "#0f172a",
  },

  cardFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: SPACING.xs,
    marginTop: SPACING.xs,
  },
filterBox: {
  flex: 1,
  minWidth: 80,
  height: 40,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: "#CBD5E1",
  flexDirection: "row",
  alignItems: "center",
  overflow: "hidden",
  backgroundColor: "#ffffff",
  justifyContent: "center",
  paddingHorizontal: 8,
},
filterPicker: {
  flex: 1,
  height: 98,
  fontSize: FONT_SIZE.sm,
  color: "#0f172a",
  marginLeft: 4,
  ...Platform.select({
    android: {
      marginTop: 0,
      marginVertical: -8,
    },
    ios: {
      marginTop: 0,
    },
  }),
},

  /* KPI Grid */
  kpiGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  kpiItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
  },
  kpiValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 4,
  },
  kpiLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },

  /* Volume Bar */
  volumeContainer: {
    marginTop: SPACING.sm,
  },
  volumeBar: {
    height: 32,
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    position: "relative",
  },
  barSegment: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  barEmergency: {
    backgroundColor: "#a357f4",
  },
  barElective: {
    backgroundColor: "#3ce7b3",
  },
  barLabel: {
    color: "#ffffff",
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
  },
  emptyBarLabel: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: "#64748b",
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  barFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
    paddingHorizontal: 4,
  },
  barFooterText: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
  },
  barFooterValue: {
    fontWeight: "700",
    color: "#0f172a",
  },

  /* Sidebar Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
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
    flex: 1,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: "#0b1220",
    marginBottom: 2,
  },
  userMetaId: {
    fontSize: FONT_SIZE.xs,
    color: "#64748b",
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: FONT_SIZE.xs,
    color: "#14b8a6",
    fontWeight: "600",
  },
  viewProfileText: {
    fontSize: FONT_SIZE.xs,
    color: "#007AFF",
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
    fontSize: FONT_SIZE.xs,
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

  /* Alert Cards */
  alertsContainer: {
    flex: 1,
  },
  alertCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  alertCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  surgeryType: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  alertCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduleDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  alertSeparator: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },
  noAlertsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noAlertsText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "600",
  },

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
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#0b1220" 
  },
  modalMsg: { 
    fontSize: 14, 
    color: "#334155", 
    marginTop: 8 
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

  /* Footer */
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
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
    backgroundColor: "#ffffff",
    zIndex: 9,
  },
});

export default OTDashboard;