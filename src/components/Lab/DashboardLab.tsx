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
  FlatList,
  Animated,
  Easing,
  Image,
  Pressable,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Custom Icons
import {
  TestTube2Icon,
  ScanIcon,
  ClockIcon,
  FileTextIcon,
  AlertTriangleIcon,
  MenuIcon,
  LayoutDashboardIcon,
  UsersIcon,
  ShoppingBagIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  GridIcon,
  XIcon,
  BellIcon,
  ReceiptIcon,
  DollarSignIcon
} from "../../utils/SvgIcons";

import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import BarChartActualScheduled from "../dashboard/lineGraph";
import Footer from "../dashboard/footer";
import { formatDateTime } from "../../utils/dateTime";
import MyTasks from "../../pages/nurseDashboard/MyTasks";

// Utils
import { 
  SPACING, 
  FONT_SIZE,
  FOOTER_HEIGHT,
  isTablet,
  isSmallDevice,
  responsiveWidth,
  responsiveHeight 
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";

// Types
type XY = { x: number | string; y: number };
type PatientCardData = {
  id: number;
  patientID?: string;
  pID?: string;
  pName?: string;
  patientName?: string;
  phoneNumber?: string;
  phone?: string;
  ptype?: number;
  departmentName?: string;
  department_name?: string;
  dept?: string;
  doctorName?: string;
  doctor_firstName?: string;
  doctor_lastName?: string;
  alertTimestamp?: string;
  addedOn?: string;
  createdAt?: string;
  timestamp?: string;
  prescriptionURL?: string;
  fileName?: string;
  timeLineID?: number;
  isFromAlert?: boolean;
};

interface SidebarItem {
  key: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  variant?: "default" | "danger" | "muted";
  isAlert?: boolean;
  alertCount?: number;
}

const FOOTER_H = FOOTER_HEIGHT;
const brandColor = COLORS.brand;

// Confirm Dialog Component
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
              <Text style={[styles.modalBtnText, { color: COLORS.buttonText }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Header Component
const HeaderBar: React.FC<{ 
  title: string; 
  onMenu: () => void;
}> = ({ title, onMenu }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn}>
        <MenuIcon size={isSmallDevice ? 24 : 30} color={COLORS.buttonText} />
      </TouchableOpacity>
    </View>
  );
};

// KPI Card Component
const KpiCard: React.FC<{
  title: string;
  value: number | string | null | undefined;
  icon: React.ReactNode;
  bg: string;
}> = ({ title, value, icon, bg }) => {
  const cardWidth = isTablet 
    ? responsiveWidth(18) 
    : (responsiveWidth(100) - SPACING.lg * 2 - SPACING.sm) / 2;

  return (
    <View style={[styles.card, { backgroundColor: bg, width: cardWidth }]}>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value ?? "--"}</Text>
      </View>
      <View style={[styles.iconWrap, { backgroundColor: COLORS.brandLight }]}>
        {React.cloneElement(icon as React.ReactElement, { color: COLORS.brand })}
      </View>
    </View>
  );
};

// Sidebar Button Component
const SidebarButton: React.FC<{
  item: SidebarItem;
  isActive?: boolean;
  onPress: () => void;
}> = ({ item, isActive = false, onPress }) => {
  const Icon = item.icon;
  const color = item.variant === "danger" ? COLORS.danger : 
                item.variant === "muted" ? COLORS.sub : 
                isActive ? COLORS.brand : COLORS.text;

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
        {item.isAlert && item.alertCount !== undefined && item.alertCount > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>{item.alertCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Avatar Component
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

// Sidebar Component
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string;
  onProfile: () => void;
  items: SidebarItem[];
  bottomItems: SidebarItem[];
  width?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  userName,
  userImage,
  onProfile,
  items,
  bottomItems,
  width = Math.min(320, responsiveWidth(82)),
}) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const slide = useRef(new Animated.Value(-width)).current;
  const [alertCount, setAlertCount] = React.useState(0);

  const getAlertCount = async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const response = await AuthFetch(
        `alerts/hospital/${user.hospitalID}/unseenCount`,
        token
      );

      if (response?.status === "success" && response?.data?.message === "success") {
        setAlertCount(response.data.count || 0);
      } else if (response?.message === "success") {
        setAlertCount(response.count || 0);
      }
    } catch {
      setAlertCount(0);
    }
  };

  useEffect(() => {
    if (user?.hospitalID && user?.token) {
      getAlertCount();
    }
  }, [user?.hospitalID, user?.token]);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

  // Overview Section - Dashboard & Alerts
  const overviewItems = items?.filter(item => 
    item?.key === "dash" || item?.key === "alerts"
  );

  // Patient Management Section
  const patientManagementItems = items?.filter(item => 
    ["patients", "walkin", "billing", "tax"].includes(item?.key)
  );

  // Operations Section  
  const operationsItems = items?.filter(item => 
    ["management", "pricing"].includes(item?.key)
  );

  // Support Section
  const supportItems = items?.filter(item => 
    item?.key === "help"
  );

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <Animated.View style={[styles.sidebarContainer, { width, transform: [{ translateX: slide }] }]}>
        
        {/* Header */}
        <View style={styles.sidebarHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color={COLORS.text} />
          </TouchableOpacity>

          {/* User Profile Section */}
          <TouchableOpacity style={styles.userProfileSection} onPress={onProfile}>
            <Avatar name={userName} uri={userImage} size={50} />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                Dr. {userName || "User"}
              </Text>
              <Text style={styles.userMetaId}>
                Meta Health ID: {user?.id || "N/A"}
              </Text>
              <Text style={styles.userDepartment}>
                {user?.roleName === 'radiology' ? 'Radiology' : 'Laboratory'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation Sections */}
        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          
          {/* Overview Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            {overviewItems?.map((item) => (
              <SidebarButton
                key={item?.key}
                item={item}
                onPress={() => {
                  onClose();
                  item?.onPress?.();
                }}
              />
            ))}
          </View>

          {/* Patient Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Management</Text>
            {patientManagementItems?.map((item) => (
              <SidebarButton
                key={item?.key}
                item={item}
                onPress={() => {
                  onClose();
                  item?.onPress?.();
                }}
              />
            ))}
          </View>

          {/* Operations Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operations</Text>
            {operationsItems?.map((item) => (
              <SidebarButton
                key={item?.key}
                item={item}
                onPress={() => {
                  onClose();
                  item?.onPress?.();
                }}
              />
            ))}
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            {supportItems?.map((item) => (
              <SidebarButton
                key={item?.key}
                item={item}
                onPress={() => {
                  onClose();
                  item?.onPress?.();
                }}
              />
            ))}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {bottomItems?.map((item) => (
            <TouchableOpacity 
              key={item?.key}
              style={[
                styles.bottomButton,
                item?.variant === "danger" ? styles.logoutButton : styles.modulesButton
              ]}
              onPress={() => {
                onClose();
                item?.onPress?.();
              }}
            >
              <item.icon size={20} color={item?.variant === "danger" ? COLORS.danger : COLORS.brand} />
              <Text style={[
                styles.bottomButtonText,
                { color: item?.variant === "danger" ? COLORS.danger : COLORS.brand }
              ]}>
                {item?.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

// Main DashboardLab Component
const DashboardLab: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();

  const departmentType = user?.roleName === 'radiology' ? 'radiology' : 'pathology';

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [lineProcessed, setLineProcessed] = useState<XY[]>([]);
  const [lineCompleted, setLineCompleted] = useState<XY[]>([]);
  const [recentPatients, setRecentPatients] = useState<PatientCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const [dailyTests, setDailyTests] = useState(0);
  const [pendingResults, setPendingResults] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [approvedToday, setApprovedToday] = useState(0);
  const [rejectedToday, setRejectedToday] = useState(0);

  const departmentName = departmentType === 'radiology' ? 'Radiology' : 'Laboratory';
  const dashboardTitle = `${departmentName} Services Dashboard`;

  const getRecentPatients = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        setRecentPatients([]);
        return;
      }

      const roleName = departmentType;
      let patientList: PatientCardData[] = [];

      try {
        const alertsResponse = await AuthFetch(
          `test/${roleName}/${user.hospitalID}/getAlerts`,
          token
        );

        if (alertsResponse?.status === "success" && Array.isArray(alertsResponse?.data?.alerts)) {
          const alertsWithDepartments = await Promise.all(
            alertsResponse?.data?.alerts?.map(async (alert: any) => {
              let departmentName = alert?.dept || "--";

              if (alert?.departmentID) {
                try {
                  const departmentData = await AuthFetch(
                    `department/singledpt/${alert.departmentID}`,
                    token
                  );
                  departmentName = departmentData?.department?.[0]?.name || departmentName;
                } catch {
                  // Use default department name
                }
              }

              return {
                ...alert,
                id: alert?.id || alert?.timeLineID,
                isFromAlert: true,
                alertTimestamp: alert?.addedOn || alert?.createdAt || alert?.timestamp || alert?.orderDate,
                departmentName: departmentName,
                doctorName: alert?.doctor_firstName
                  ? `${alert?.doctor_firstName} ${alert?.doctor_lastName || ''}`.trim()
                  : "--",
                patientID: alert?.patientID,
                pID: alert?.pID,
                pName: alert?.pName,
                patientName: alert?.patientName,
                ptype: alert?.ptype
              };
            })
          );

          patientList = [...patientList, ...alertsWithDepartments];
        }
      } catch {
        // Continue with regular patients if alerts fail
      }

      try {
        const response = await AuthFetch(
          `test/${roleName}/${user.hospitalID}/${user.id}/getAllPatient`,
          token
        );

        if (response?.message === "success" && Array.isArray(response?.patientList)) {
          const regularPatients = response?.patientList?.map((patient: any) => ({
            ...patient,
            id: patient?.timeLineID || patient?.id,
            isFromAlert: false,
            departmentName: patient?.department_name || patient?.dept || "--",
            doctorName: patient?.doctor_firstName && patient?.doctor_lastName
              ? `${patient?.doctor_firstName} ${patient?.doctor_lastName}`
              : patient?.firstName && patient?.lastName
                ? `${patient?.firstName} ${patient?.lastName}`
                : "--",
            alertTimestamp: patient?.latestTestTime || patient?.addedOn,
            patientID: patient?.patientID,
            pID: patient?.pID,
            pName: patient?.pName,
            patientName: patient?.patientName,
            ptype: patient?.ptype
          }));
          patientList = [...patientList, ...regularPatients];
        }
      } catch {
        // Continue with walk-in patients if regular patients fail
      }

      try {
        const walkinResponse = await AuthFetch(
          `test/getWalkinTaxinvoicePatientsData/${user.hospitalID}/${roleName}`,
          token
        );

        if (walkinResponse?.status === 200 && Array.isArray(walkinResponse?.data)) {
          const walkinPatients = walkinResponse?.data?.map((patient: any) => ({
            ...patient,
            id: patient?.id,
            isFromAlert: false,
            departmentName: patient?.department || "--",
            doctorName: "--",
            alertTimestamp: patient?.addedOn,
            patientID: patient?.pID,
            pID: patient?.pID,
            pName: patient?.pName,
            patientName: patient?.pName,
            ptype: 1,
            prescriptionURL: patient?.prescriptionURL || patient?.fileName
          }));
          patientList = [...patientList, ...walkinPatients];
        }
      } catch {
        // Silent catch for walk-in patients
      }

      const sortedPatients = patientList
        ?.filter(patient => patient?.alertTimestamp)
        ?.sort((a: any, b: any) => {
          const dateA = new Date(a?.alertTimestamp || 0);
          const dateB = new Date(b?.alertTimestamp || 0);
          return dateB.getTime() - dateA.getTime();
        })
        ?.slice(0, 5);

      setRecentPatients(sortedPatients || []);
    } catch {
      setRecentPatients([]);
    }
  }, [user?.hospitalID, user?.id, departmentType]);

  const getTestCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        return;
      }

      const res = await AuthFetch(
        `test/${user.hospitalID}/${user.roleName}/getTestsDashboardCount`,
        token
      );    
      
      let countsData = null;

      if (res?.status === "success") {
        if (res?.data?.data) {
          countsData = res.data.data;
        } else if (res?.data) {
          countsData = res.data;
        }
      } else if (res?.message === "success") {
        countsData = res.data;
      } else if (res?.data) {
        countsData = res.data;
      }
      
      if (countsData) {
        const {
          dailyTests = 0,
          pendingResults = 0,
          completedToday = 0,
          approvedToday = 0,
          rejectedToday = 0,
        } = countsData;

        setDailyTests(dailyTests);
        setPendingResults(pendingResults);
        setCompletedToday(completedToday);
        setApprovedToday(approvedToday);
        setRejectedToday(rejectedToday);
      } else {
        setDailyTests(0);
        setPendingResults(0);
        setCompletedToday(0);
        setApprovedToday(0);
        setRejectedToday(0);
      }
    } catch {
      setDailyTests(0);
      setPendingResults(0);
      setCompletedToday(0);
      setApprovedToday(0);
      setRejectedToday(0);
    }
  }, [user?.hospitalID, departmentType]);

  const getTestsBargraphData = useCallback(async (year: string, month: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        return;
      }

      const roleName = departmentType;
      let url = `test/${roleName}/${user.hospitalID}/fullYear?filter=year&filterYear=${year}`;
      
      if (month !== "0") {
        url = `test/${roleName}/${user.hospitalID}/fullYear?filter=month&filterYear=${year}&filterMonth=${month}`;
      }

      const res = await AuthFetch(url, token);

      let counts = [];
      
      if (res?.status === "success" && res?.data?.counts) {
        counts = res.data.counts;
      } else if (res?.message === "success" && Array.isArray(res?.counts)) {
        counts = res.counts;
      } else if (res?.data?.counts) {
        counts = res.data.counts;
      }

      if (Array.isArray(counts) && counts?.length > 0) {
        const processedData = counts?.map((c: any) => ({
          x: c?.filter_value,
          y: Number(c?.tests_processed || 0),
        }));
        
        const completedData = counts?.map((c: any) => ({
          x: c?.filter_value,
          y: Number(c?.tests_completed || 0),
        }));

        setLineProcessed(processedData);
        setLineCompleted(completedData);
      } else {
        setLineProcessed([]);
        setLineCompleted([]);
      }
    } catch {
      setLineProcessed([]);
      setLineCompleted([]);
    }
  }, [user?.hospitalID, departmentType]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          getRecentPatients(),
          getTestCount(),
          getTestsBargraphData(filterYear, filterMonth)
        ]);
      } catch {
        // Error handling is done in individual functions
      } finally {
        setLoading(false);
      }
    };

    if (user?.hospitalID) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [user?.hospitalID, getRecentPatients, getTestCount, getTestsBargraphData, filterYear, filterMonth]);

  const handleRowClick = (patient: PatientCardData) => {
    const idToPass = patient?.prescriptionURL || patient?.fileName
      ? patient?.id
      : patient?.timeLineID;

    const newState: {
      timeLineID: number | undefined;
      prescriptionURL?: string;
      tab?: string;
      patientData?: PatientCardData;
    } = {
      timeLineID: idToPass,
      tab: "normal",
      patientData: patient,
    };

    if (patient?.prescriptionURL || patient?.fileName) {
      newState.prescriptionURL = patient?.prescriptionURL || patient?.fileName;
    }

    const alertRoute = departmentType === 'radiology' 
      ? "AlertsLab" 
      : "AlertsLab";
    
    navigation.navigate(alertRoute, { state: newState });
  };

  const getPatientType = (patient: PatientCardData) => {
    if (patient?.ptype === 1) return "OPD";
    if (patient?.ptype === 2) return "IPD";
    if (patient?.ptype === 3) return "Emergency";
    if (patient?.ptype === 21) return "Discharged";
    return "";
  };

  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  const onLogoutPress = () => setConfirmVisible(true);
  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userID"]);
    } catch {
      // Silent catch for storage cleanup
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  const getSidebarItems = (): SidebarItem[] => {
    const basePath = departmentType === 'radiology' ? 'Radio' : 'Lab';
    
    return [
      // Overview Section
      {
        key: "dash",
        label: "Dashboard",
        icon: LayoutDashboardIcon,
        onPress: () => go("DashboardLab")
      },
      {
        key: "alerts", 
        label: "Alerts",
        icon: AlertTriangleIcon,
        onPress: () => go(`AlertsLab`)
      },
      
      // Patient Management Section
      {
        key: "patients",
        label: "Patient List",
        icon: UsersIcon,
        onPress: () => go(`PatientListLab`)
      },
      {
        key: "walkin",
        label: "Walk-In",
        icon: ShoppingBagIcon,
        onPress: () => go(`SaleComp`)
      },
      {
        key: "billing",
        label: "Billing",
        icon: FileTextIcon,
        onPress: () => navigation.navigate("TaxInvoiceTabs", { 
          mode: "billing",
          department: departmentType 
        }),
      },
      {
        key: "tax",
        label: "Tax Invoice",
        icon: ReceiptIcon,
        onPress: () => navigation.navigate("TaxInvoiceTabs", { 
          mode: "allTax",
          department: departmentType 
        }),
      },
      
      // Operations Section
      {
        key: "management",
        label: "Management",
        icon: SettingsIcon,
        onPress: () => go("Management")
      },
      {
        key: "pricing",
        label: "Test Price",
        icon: DollarSignIcon,
        onPress: () => go(`TestPricing`)
      },
      
      // Support Section
      {
        key: "help",
        label: "Help",
        icon: HelpCircleIcon,
        onPress: () => go("HelpScreen")
      },
    ];
  };

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

  const renderPatientRow = ({ item }: { item: PatientCardData }) => (
    <TouchableOpacity
      style={styles.patientRow}
      onPress={() => handleRowClick(item)}
      activeOpacity={0.7}
    >
      <View style={styles.patientInfo}>
        <Text style={styles.patientId}>{item?.patientID || item?.pID || "--"}</Text>
        <Text style={styles.patientName}>{item?.pName || item?.patientName || "--"}</Text>
        <Text style={styles.patientType}>{getPatientType(item)}</Text>
      </View>
      <View style={styles.patientDetails}>
        <Text style={styles.doctor}>{item?.doctorName || item?.doctor_firstName || "--"}</Text>
        <Text style={styles.date}>
          {formatDateTime(
            item?.alertTimestamp || item?.addedOn || item?.createdAt || item?.timestamp
          )}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const MainIcon = departmentType === 'radiology' ? ScanIcon : TestTube2Icon;
  const tableTitle = departmentType === 'radiology' 
    ? "Recent Radiology Scans" 
    : "Recent Laboratory Tests";
  const tableSubtitle = departmentType === 'radiology'
    ? "Latest radiology scan data"
    : "Latest laboratory test data";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColor} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} backgroundColor={COLORS.brand} />
      <HeaderBar 
        title={dashboardTitle} 
        onMenu={() => setMenuOpen(true)}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.containerContent, { paddingBottom: FOOTER_H + insets.bottom + SPACING.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <KpiCard
            title="Daily Tests"
            value={dailyTests}
            icon={<MainIcon size={25} color={brandColor} />}
            bg={COLORS.card}
          />
          <KpiCard
            title="Pending Results"
            value={pendingResults}
            icon={<ClockIcon size={25} color={brandColor} />}
            bg={COLORS.card}
          />
          <KpiCard
            title="Completed Today"
            value={completedToday}
            icon={<FileTextIcon size={25} color={brandColor} />}
            bg={COLORS.card}
          />
          <KpiCard
            title="Approved Tests"
            value={approvedToday}
            icon={<AlertTriangleIcon size={25} color={brandColor} />}
            bg={COLORS.card}
          />
          <KpiCard
            title="Rejected Tests"
            value={rejectedToday}
            icon={<AlertTriangleIcon size={25} color={brandColor} />}
            bg={COLORS.card}
          />
        </View>

        <View style={styles.chartsRow}>
          <View style={styles.chartContainer}>
            <BarChartActualScheduled
              actualData={lineCompleted}
              scheduledData={lineProcessed}
              year={filterYear}
              month={filterMonth}
              onYearChange={setFilterYear}
              onMonthChange={setFilterMonth}
            />
          </View>

          <View>
            <MyTasks />
          </View>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <View style={styles.headerText}>
              <Text style={styles.tableTitle}>{tableTitle}</Text>
              <Text style={styles.tableSubtitle}>{tableSubtitle}</Text>
            </View>
          </View>

          {recentPatients?.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No recent patients found</Text>
              <Text style={styles.noDataSubtext}>
                Patient data will appear here as new orders come in
              </Text>
            </View>
          ) : (
            <FlatList
              data={recentPatients}
              renderItem={renderPatientRow}
              keyExtractor={(item, index) => `${item?.id}-${index}`}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"dashboard"} brandColor={brandColor} />
      </View>

      {/* Bottom Safe Area Shield */}
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        userName={`${user?.firstName} ${user?.lastName}`}
        userImage={user?.avatarUrl || user?.profileImage}
        onProfile={() => {
          setMenuOpen(false);
          navigation.navigate("Profile" as never);
        }}
        items={getSidebarItems()}
        bottomItems={bottomItems}
      />

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

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  header: {
    height: isSmallDevice ? 80 : 100,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.brand,
    paddingTop: Platform.OS === 'ios' ? SPACING.lg : 0,
  },
  headerTitle: { 
    fontSize: isSmallDevice ? FONT_SIZE.lg : FONT_SIZE.xl, 
    fontWeight: "700", 
    color: COLORS.buttonText 
  },
  menuBtn: {
    width: isSmallDevice ? 34 : 38,
    height: isSmallDevice ? 34 : 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  containerContent: { 
    padding: SPACING.md, 
    gap: SPACING.lg 
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    justifyContent: "space-between"
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
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
  },
  cardTitle: { 
    color: COLORS.text, 
    fontSize: FONT_SIZE.sm, 
    opacity: 0.75, 
    marginBottom: SPACING.xs 
  },
  cardValue: { 
    color: COLORS.text, 
    fontSize: FONT_SIZE.xl, 
    fontWeight: "700" 
  },
  chartsRow: {
    flexDirection: isTablet ? "row" : "column",
    gap: SPACING.lg,
  },
  chartContainer: {
    flex: isTablet ? 2 : 1,
  },
  tableContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  tableTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  tableSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginTop: SPACING.xs,
  },
  patientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  patientInfo: {
    flex: 1,
  },
  patientId: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  patientName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 2,
  },
  patientType: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: 2,
  },
  patientDetails: {
    alignItems: "flex-end",
  },
  doctor: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: 2,
  },
  date: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.placeholder,
    marginTop: 2,
  },
  noDataContainer: {
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },
  noDataText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    textAlign: "center",
    fontWeight: "600",
  },
  noDataSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.placeholder,
    textAlign: "center",
    marginTop: SPACING.xs,
    fontStyle: "italic",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
  },
  modalCard: {
    width: "100%",
    maxWidth: responsiveWidth(90),
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.lg,
  },
  modalTitle: { 
    fontSize: FONT_SIZE.lg, 
    fontWeight: "800", 
    color: COLORS.text 
  },
  modalMsg: { 
    fontSize: FONT_SIZE.sm, 
    color: COLORS.text, 
    marginTop: SPACING.sm 
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
  },
  modalBtnGhost: {
    backgroundColor: COLORS.brandLight,
  },
  modalBtnDanger: {
    backgroundColor: COLORS.brand,
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
    height: FOOTER_H,
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
  // Sidebar Styles
  sidebarContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: SPACING.md,
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
  },
  sidebarHeader: {
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: -SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.pill,
  },
  userProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 50,
  },
  userInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  userMetaId: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand,
    fontWeight: "600",
  },
  sidebarContent: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.sub,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sidebarButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  sidebarButtonActive: {
    backgroundColor: COLORS.brandLight,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  buttonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    flex: 1,
  },
  alertBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  alertText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
  },
  bottomActions: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
  },
  modulesButton: {
    backgroundColor: COLORS.brandLight,
  },
  logoutButton: {
    backgroundColor: COLORS.chipBP,
  },
  bottomButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  avatar: {
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
  },
});

export default DashboardLab;