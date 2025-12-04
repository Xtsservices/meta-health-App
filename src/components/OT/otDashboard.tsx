import React, { useState, useCallback, useRef } from "react";
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
} from "lucide-react-native";

import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import Sidebar, { SidebarItem } from "../Sidebar/sidebarOpd";
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

const { width: W } = Dimensions.get("window");
const isTablet = W >= 768;

// OT User Types
enum OTUserTypes {
  ANESTHETIST = "anesthetist",
  SURGEON = "surgeon",
}

// Shared year/month helpers
const NOW = new Date();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_YEAR = NOW.getFullYear();
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
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn} accessibilityLabel="Open menu">
        <MenuIcon size={30} color="#ffffffff" />
      </TouchableOpacity>
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
  const FOOTER_HEIGHT = 70;

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
    { key: "slist", label: "Surgeries List", icon: ListIcon, onPress: () => go("DashboardAlerts", { type: "surgeries" }) },
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
          { paddingBottom: FOOTER_HEIGHT + insets.bottom + 16 },
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
      mode="dropdown"
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
      mode="dropdown"
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
                    <View style={styles.kpiItem}>
                      <Text style={styles.kpiValue}>
                        {surgeonCounts?.totalSurgeries || 0}
                      </Text>
                      <Text style={styles.kpiLabel}>Total Surgeries</Text>
                    </View>
                    <View style={styles.kpiItem}>
                      <Text style={styles.kpiValue}>
                        {surgeonCounts?.todayScheduledSurgeries || 0}
                      </Text>
                      <Text style={styles.kpiLabel}>Today Scheduled</Text>
                    </View>
                    <View style={styles.kpiItem}>
                      <Text style={styles.kpiValue}>
                        {surgeonCounts?.todayAddedSurgeries || 0}
                      </Text>
                      <Text style={styles.kpiLabel}>Today Added</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.kpiGrid}>
                    <View style={styles.kpiItem}>
                      <Text style={styles.kpiValue}>{approvedCount}</Text>
                      <Text style={styles.kpiLabel}>Approved</Text>
                    </View>
                    <View style={styles.kpiItem}>
                      <Text style={styles.kpiValue}>{rejectedCount}</Text>
                      <Text style={styles.kpiLabel}>Rejected</Text>
                    </View>
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
                      mode="dropdown"
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
                      mode="dropdown"
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
                    >
                    
                    </View>
                    <View
                      style={[
                        styles.barSegment,
                        styles.barElective,
                        { width: `${electivePercentage}%` },
                      ]}
                    >
                     
                    </View>
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
  },

  container: { flex: 1, backgroundColor: "#ffffff" },
  containerContent: { padding: 16, paddingBottom: 32, gap: 16 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },

  /* Stats Grid */
  statsGrid: {
    flex:1,
    flexDirection: "column",
    flexWrap: "wrap",
  },
  card: {
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    width:"100%",
    marginBottom:15
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },

  cardFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 8,
    marginTop: 8,
  },
filterBox: {
  flex: 1,
  minWidth: 80,
  height: 40, // Increased from 40
  borderRadius: 12, // Changed from 8
  borderWidth: 1.5, // Changed from 1
  borderColor: "#CBD5E1",
  flexDirection: "row",
  alignItems: "center",
  overflow: "hidden",
  backgroundColor: "#ffffff",
  justifyContent: "center",
  paddingHorizontal: 8, // Increased from 4
},

filterPicker: {
  flex: 1, // Changed from width: "100%"
  height: 98, // Match parent height
  fontSize: 14,
  color: "#0f172a",
  marginLeft: 4, // Added slight margin
  ...Platform.select({
    android: {
      marginTop: 0, // Changed from -8
      marginVertical: -8, // Added to center text on Android
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
    gap: 8,
    marginTop: 10,
  },
  kpiItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },

  /* Volume Bar */
  volumeContainer: {
    marginTop: 12,
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
    fontSize: 12,
    fontWeight: "700",
  },
  emptyBarLabel: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  barFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  barFooterText: {
    fontSize: 12,
    color: "#64748b",
  },
  barFooterValue: {
    fontWeight: "700",
    color: "#0f172a",
  },

  /* Split Row */
  splitRow: {
    flexDirection: isTablet ? "row" : "column",
    gap: 16,
  },
  splitItem: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    minHeight: 300,
  },

  /* Section Headers */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  viewAllText: {
    color: "#14b8a6",
    fontWeight: "600",
    fontSize: 14,
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

  /* Pie Chart Placeholder */
  pieChartPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
  },
  pieChartText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  pieChartSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },

  /* Calendar Section */
  calendarSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  calendarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 40,
    marginTop: 12,
  },
  calendarText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  calendarSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
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
