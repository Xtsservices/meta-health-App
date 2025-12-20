// components/Pharmacy/DashboardPharma.tsx
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

import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import Footer from "../dashboard/footer";
import { LineChart, BarChart } from "react-native-chart-kit";
import { formatDate, formatDateTime } from "../../utils/dateTime";

// Import responsive utils and colors
import { 
  SPACING, 
  FONT_SIZE,
  FOOTER_HEIGHT,
  ICON_SIZE,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  responsiveWidth,
  responsiveHeight 
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";

// Import SVG Icons
import {
  ClockIcon,
  AlertTriangleIcon,
  PillIcon,
  IndianRupeeIcon,
  EyeIcon,
  ChevronRightIcon,
  PlusIcon,
  MenuIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  BellIcon,
  PackageIcon,
  DollarSignIcon,
  HelpCircleIcon,
  LogOutIcon,
  GridIcon,
  FileTextIcon,
  XIcon,
  UsersIcon,
  ReceiptIcon,
  TrendingUpIcon,
  Package2Icon
} from "../../utils/SvgIcons";

// Types
interface DashboardCounts {
  prescriptionsToday: number;
  acceptedPrescriptions: number;
  lowStockItems: number;
  revenueToday: number;
  paidPatientsToday: number;
}

interface WeeklySalesData {
  day: string;
  sales: number;
  prescriptions: number;
}

interface TopMedication {
  name: string;
  prescribed: number;
  category: string;
}

interface PharmacyOrder {
  id: number;
  patientID?: number;
  pID?: string;
  pName: string;
  patientName?: string;
  departmentID?: number;
  addedOn: string;
  medicinesList: any[];
  location: string;
  paidAmount: string;
  alertStatus?: string;
  createdAt?: string;
  timestamp?: string;
  ptype?: number;
  doctorName?: string;
  departmentName?: string;
}

interface LowStock {
  id: number;
  name: string;
  quantity: number;
  totalQuantity: number;
  isOutofStock?: boolean;
  category: string;
}

interface ExpiredMedicineData {
  id: number;
  name: string;
  totalQuantity: number;
  expiryDate: string;
  category: string;
}

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

/* -------------------------- Header -------------------------- */
const HeaderBar: React.FC<{ 
  title: string; 
  onMenu: () => void;
}> = ({ title, onMenu }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn} accessibilityLabel="Open menu">
        <MenuIcon size={isSmallDevice ? 24 : 30} color={COLORS.buttonText} />
      </TouchableOpacity>
    </View>
  );
};

/* -------------------------- Stat Card -------------------------- */
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: number;
}> = ({ title, value, icon: Icon, color, trend }) => {
  const cardWidth = isTablet 
    ? responsiveWidth(22) 
    : (responsiveWidth(100) - SPACING.lg * 2 - SPACING.sm) / 2;

  return (
    <View style={[styles.statCard, { width: cardWidth }]}>
      <View style={styles.statContent}>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
          {trend !== undefined && (
            <View style={styles.trendContainer}>
              <TrendingUpIcon size={14} color={trend >= 0 ? COLORS.success : COLORS.danger} />
              <Text style={[styles.trendText, { color: trend >= 0 ? COLORS.success : COLORS.danger }]}>
                {trend >= 0 ? '+' : ''}{trend}%
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
          <Icon size={isSmallDevice ? ICON_SIZE.sm : ICON_SIZE.md} color={color} />
        </View>
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

/* -------------------------- Chart Card -------------------------- */
const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.chartCard}>
    <View style={styles.chartHeader}>
      <Text style={styles.chartTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

/* -------------------------- Sidebar Button -------------------------- */
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

/* -------------------------- Avatar -------------------------- */
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

/* -------------------------- Sidebar -------------------------- */
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

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

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
                {userName || "User"}
              </Text>
              <Text style={styles.userMetaId}>
                Meta Health ID: {user?.id || "N/A"}
              </Text>
              <Text style={styles.userDepartment}>
                Pharmacy
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation Sections */}
        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          
          {/* Overview Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            {items?.filter(item => ["dash", "alerts"].includes(item.key)).map((item) => (
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

          {/* Pharmacy Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pharmacy Management</Text>
            {items?.filter(item => ["sale", "orders", "tax", "stock", "add", "orderplacement"].includes(item.key)).map((item) => (
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            {items?.filter(item => item.key === "help").map((item) => (
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
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {bottomItems.map((item) => (
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
              <item.icon size={20} color={item.variant === "danger" ? COLORS.danger : COLORS.brand} />
              <Text style={[
                styles.bottomButtonText,
                { color: item.variant === "danger" ? COLORS.danger : COLORS.brand }
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

/* -------------------------- Main Dashboard -------------------------- */
const DashboardPharma: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage || user?.imageURL;

  const hasBottomInsets = insets.bottom > 0;

  // Sidebar & logout
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // Dashboard data states
  const [dashboardCounts, setDashboardCounts] = useState<DashboardCounts | null>(null);
  const [weeklySalesData, setWeeklySalesData] = useState<WeeklySalesData[]>([]);
  const [topMedications, setTopMedications] = useState<TopMedication[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<PharmacyOrder[]>([]);
  const [lowStockMedicineData, setLowStockMedicineData] = useState<LowStock[]>([]);
  const [expiredMedicineData, setExpiredMedicineData] = useState<ExpiredMedicineData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWeeklyDataLoading, setIsWeeklyDataLoading] = useState(false);
  const [isTopMedicationsLoading, setIsTopMedicationsLoading] = useState(false);
  const [isDashboardCountsLoading, setIsDashboardCountsLoading] = useState(false);

  // Fetch dashboard counts
  const fetchDashboardCounts = useCallback(async () => {
    if (!user?.hospitalID) return;

    setIsDashboardCountsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `medicineInventoryPatientsOrder/${user.hospitalID}/getPharmacyDashboardCount`,
        token
      );

      if (response?.status === 'success' && "data" in response && response?.data) {
        const data = response?.data?.data;
        setDashboardCounts({
          prescriptionsToday: Number(data?.prescriptionsToday) || 0,
          acceptedPrescriptions: Number(data?.acceptedPrescriptions) || 0,
          lowStockItems: Number(data?.lowStockItems) || 0,
          revenueToday: Number(data?.revenueToday) || 0,
          paidPatientsToday: Number(data?.paidPatientsToday) || 0,
        });
      } else {
        setDashboardCounts({
          prescriptionsToday: 0,
          acceptedPrescriptions: 0,
          lowStockItems: 0,
          revenueToday: 0,
          paidPatientsToday: 0,
        });
      }
    } catch (error) {
      setDashboardCounts({
        prescriptionsToday: 0,
        acceptedPrescriptions: 0,
        lowStockItems: 0,
        revenueToday: 0,
        paidPatientsToday: 0,
      });
    } finally {
      setIsDashboardCountsLoading(false);
    }
  }, [user]);

  // Fetch weekly sales data
  const fetchWeeklySalesData = useCallback(async () => {
    if (!user?.hospitalID) return;

    setIsWeeklyDataLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const formattedFromDate = startDate.toISOString().split('T')[0];
      const formattedToDate = new Date().toISOString().split('T')[0];

      const response = await AuthFetch(
        `medicineInventoryPatientsOrder/${user.hospitalID}/weeklySalesPrescriptions?from=${formattedFromDate}&to=${formattedToDate}`,
        token
      );

      if (response?.status === 'success' && "data" in response && response?.data) {
        const responseData = response?.data?.data;

        if (responseData?.dates && responseData?.prescriptions && responseData?.sales) {
          const processedData: WeeklySalesData[] = responseData?.dates?.map((date: string) => {
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            return {
              day: dayName,
              sales: Number(responseData?.sales?.[date]) || 0,
              prescriptions: Number(responseData?.prescriptions?.[date]) || 0,
            };
          });
          setWeeklySalesData(processedData);
        } else if (Array.isArray(responseData)) {
          const processedData: WeeklySalesData[] = responseData?.map((item: any) => ({
            day: item?.day || 'Unknown',
            sales: Number(item?.sales) || 0,
            prescriptions: Number(item?.prescriptions) || 0,
          }));
          setWeeklySalesData(processedData);
        } else {
          setWeeklySalesData([]);
        }
      } else {
        setWeeklySalesData([]);
      }
    } catch (error) {
      setWeeklySalesData([]);
    } finally {
      setIsWeeklyDataLoading(false);
    }
  }, [user]);

  // Fetch top medications
  const fetchTopMedications = useCallback(async () => {
    if (!user?.hospitalID) return;

    setIsTopMedicationsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `medicineInventoryPatientsOrder/${user.hospitalID}/getTopMedications`,
        token
      );

      if (response?.status === 'success' && "data" in response) {
        let medicationsData = [];

        if (Array.isArray(response?.data)) {
          medicationsData = response.data;
        } else if (response?.data && Array.isArray(response?.data?.data)) {
          medicationsData = response.data.data;
        }

        const processedData: TopMedication[] = medicationsData?.map((item: any) => ({
          name: item?.name || 'Unknown',
          prescribed: Number(item?.totalSold) || 0,
          category: item?.category || 'Unknown',
        }));
        setTopMedications(processedData.slice(0, 5));
      } else {
        setTopMedications([]);
      }
    } catch (error) {
      setTopMedications([]);
    } finally {
      setIsTopMedicationsLoading(false);
    }
  }, [user]);

  // Fetch recent prescriptions
  const fetchRecentPrescriptions = useCallback(async () => {
    if (!user?.hospitalID) return;

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `medicineInventoryPatientsOrder/${user.hospitalID}/pending/getMedicineInventoryPatientsOrder`,
        token
      );

      if (response?.status === 'success' && "data" in response) {
        let prescriptionsData = [];

        if (Array.isArray(response?.data)) {
          prescriptionsData = response.data;
        } else if (response?.data && Array.isArray(response?.data?.data)) {
          prescriptionsData = response.data.data;
        }

        const sortedPrescriptions = prescriptionsData
          ?.sort((a: any, b: any) => new Date(b?.addedOn).getTime() - new Date(a?.addedOn).getTime())
          ?.slice(0, 5) || [];
        setRecentPrescriptions(sortedPrescriptions);
      } else {
        setRecentPrescriptions([]);
      }
    } catch (error) {
      setRecentPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch low stock medicines
  const fetchLowStockMedicines = useCallback(async () => {
    if (!user?.hospitalID) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `/medicineInventoryPatientsOrder/${user.hospitalID}/getLowStockProductInfo`,
        token
      );

      if (response?.status === 'success' && "data" in response) {
        if (Array.isArray(response?.data)) {
          setLowStockMedicineData(response.data);
        } else if (response?.data && Array.isArray(response?.data?.data)) {
          setLowStockMedicineData(response.data.data);
        } else {
          setLowStockMedicineData([]);
        }
      } else if (response && 'message' in response && response.message === 'Something went wrong') {
        setLowStockMedicineData([]);
      } else {
        setLowStockMedicineData([]);
      }
    } catch (error) {
      setLowStockMedicineData([]);
    }
  }, [user]);

  // Fetch expired medicines
  const fetchExpiredMedicines = useCallback(async () => {
    if (!user?.hospitalID) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `/medicineInventoryPatientsOrder/${user.hospitalID}/getExpiryProductInfo`,
        token
      );

      if (response?.status === 'success' && "data" in response) {
        if (Array.isArray(response?.data)) {
          setExpiredMedicineData(response.data);
        } else if (response?.data && Array.isArray(response?.data?.data)) {
          setExpiredMedicineData(response.data.data);
        } else {
          setExpiredMedicineData([]);
        }
      } else if (response && "message" in response && response?.message === 'Something went wrong') {
        setExpiredMedicineData([]);
      } else {
        setExpiredMedicineData([]);
      }
    } catch (error) {
      setExpiredMedicineData([]);
    }
  }, [user]);

  // Load all data
  useEffect(() => {
    if (user?.hospitalID) {
      fetchDashboardCounts();
      fetchWeeklySalesData();
      fetchTopMedications();
      fetchRecentPrescriptions();
      fetchLowStockMedicines();
      fetchExpiredMedicines();
    }
  }, [
    user,
    fetchDashboardCounts,
    fetchWeeklySalesData,
    fetchTopMedications,
    fetchRecentPrescriptions,
    fetchLowStockMedicines,
    fetchExpiredMedicines
  ]);

  const onAddInventory = () => navigation.navigate("AddInventory");

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
      // Logout error handled silently
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  const handleRowClick = (patient: PharmacyOrder) => {
    // Handle patient row click - navigate to prescription details
    navigation.navigate("OrderDetails", { 
      orderId: patient.id,
      patientData: patient
    });
  };

  const onViewAllPress = () => {
    navigation.navigate("AlertsLab");
  };

  // Sidebar items for Pharmacy with SVG icons
  const sidebarItems: SidebarItem[] = [
    // Overview Section
    {
      key: "dash",
      label: "Dashboard",
      icon: LayoutDashboardIcon,
      onPress: () => go("DashboardPharma")
    },
    
    // Pharmacy Management Section
    {
      key: "sale",
      label: "Sale",
      icon: ShoppingCartIcon,
      onPress: () => navigation.navigate("SaleComp", { 
        type: "medicine" 
      })
    },
    {
      key: "alerts",
      label: "Alerts",
      icon: BellIcon,
      onPress: () => go("AlertsLab"),
      isAlert: true,
    },
    {
      key: "orders",
      label: "Patient Orders",
      icon: FileTextIcon,
      onPress: () => navigation.navigate("TaxInvoiceTabs", { 
        mode: "billing",
        department: "pharmacy" 
      }),
    },
    {
      key: "tax",
      label: "Tax Invoice",
      icon: ReceiptIcon,
      onPress: () => navigation.navigate("TaxInvoiceTabs", { 
        mode: "allTax",
        department: "pharmacy" 
      }),
    },
    {
      key: "stock",
      label: "In Stock",
      icon: PackageIcon,
      onPress: () => go("InStock")
    },
    {
      key: "add",
      label: "Add Inventory",
      icon: PlusIcon,
      onPress: () => go("AddInventory")
    },
    {
      key: "orderplacement",
      label: "Order Placement",
      icon: ShoppingCartIcon,
      onPress: () => go("PharmacyExpenses")
    },
    
    // Support Section
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

  // Render medication item
  const renderMedicationItem = ({ item, index }: { item: TopMedication; index: number }) => (
    <TouchableOpacity style={styles.medicationItem} activeOpacity={0.7}>
      <View style={styles.medicationRank}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.medicationIcon}>
        <PillIcon size={isSmallDevice ? ICON_SIZE.sm : ICON_SIZE.md} color={COLORS.brand} />
      </View>
      <View style={styles.medicationInfo}>
        <Text style={styles.medicationName} numberOfLines={1}>
          {item?.name}
        </Text>
        <Text style={styles.medicationCategory}>{item?.category}</Text>
      </View>
      <View style={styles.prescribedCount}>
        <Text style={styles.prescribedText}>{item?.prescribed}</Text>
        <Text style={styles.prescribedLabel}>prescribed</Text>
      </View>
    </TouchableOpacity>
  );

  // Get patient type
  const getPatientType = (patient: PharmacyOrder) => {
    if (patient?.ptype === 1) return "OPD";
    if (patient?.ptype === 2) return "IPD";
    if (patient?.ptype === 3) return "Emergency";
    if (patient?.ptype === 21) return "Discharged";
    return "";
  };

  // Render patient row - matching reference code style
  const renderPatientRow = ({ item }: { item: PharmacyOrder }) => (
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
        <Text style={styles.doctor}>{item?.doctorName || "--"}</Text>
        <Text style={styles.date}>
          {formatDateTime(
            item?.addedOn || item?.createdAt || item?.timestamp || ""
          )}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Format currency to remove "₹0" display
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>Loading Pharmacy Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} backgroundColor={COLORS.brand} />
      <HeaderBar title="Pharmacy Management" onMenu={() => setMenuOpen(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.containerContent, 
          { 
            paddingBottom: FOOTER_H + (hasBottomInsets ? insets.bottom : SPACING.lg) + SPACING.lg 
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section - Fixed date badge positioning */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>Welcome back, {user?.firstName}!</Text>
            <Text style={styles.welcomeSubtitle}>Here's your pharmacy overview for today</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        </View>

        {/* Stats Grid - Using KpiCard from reference */}
        <View style={styles.statsGrid}>
          {isDashboardCountsLoading ? (
            <ActivityIndicator size="small" color={COLORS.brand} />
          ) : dashboardCounts ? (
            <>
              <KpiCard
                title="Prescriptions Today"
                value={dashboardCounts.prescriptionsToday}
                icon={<FileTextIcon size={25} color={brandColor} />}
                bg={COLORS.card}
              />
              <KpiCard
                title="Pending Orders"
                value={dashboardCounts.prescriptionsToday - dashboardCounts.acceptedPrescriptions}
                icon={<ClockIcon size={25} color={brandColor} />}
                bg={COLORS.card}
              />
              <KpiCard
                title="Low Stock Items"
                value={dashboardCounts.lowStockItems}
                icon={<AlertTriangleIcon size={25} color={brandColor} />}
                bg={COLORS.card}
              />
              <KpiCard
                title="Revenue Today"
                value={formatCurrency(dashboardCounts.revenueToday)}
                icon={<IndianRupeeIcon size={25} color={brandColor} />}
                bg={COLORS.card}
              />
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No dashboard data available</Text>
            </View>
          )}
        </View>

        {/* Primary action */}
        <View style={styles.controlPanel}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddInventory} activeOpacity={0.85}>
            <PlusIcon size={isSmallDevice ? ICON_SIZE.sm : ICON_SIZE.md} color={COLORS.buttonText} />
            <Text style={styles.primaryBtnText}>Add New Inventory</Text>
          </TouchableOpacity>
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          {/* Sales Chart */}
          <ChartCard title="Weekly Sales & Prescriptions">
            {isWeeklyDataLoading ? (
              <View style={styles.chartLoading}>
                <ActivityIndicator size="small" color={COLORS.brand} />
              </View>
            ) : weeklySalesData?.length > 0 ? (
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: weeklySalesData?.map(item => item?.day),
                    datasets: [
                      {
                        data: weeklySalesData?.map(item => item?.sales),
                        color: () => COLORS.brand,
                        strokeWidth: 3,
                      },
                      {
                        data: weeklySalesData?.map(item => item?.prescriptions),
                        color: () => COLORS.warning,
                        strokeWidth: 2,
                        withDots: false,
                      },
                    ],
                    legend: ['Sales Revenue', 'Prescriptions'],
                  }}
                  width={responsiveWidth(90)}
                  height={isSmallDevice ? 200 : 240}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: COLORS.card,
                    backgroundGradientFrom: COLORS.card,
                    backgroundGradientTo: COLORS.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: COLORS.brand,
                    },
                    propsForBackgroundLines: {
                      stroke: COLORS.border,
                      strokeDasharray: '3 3',
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withHorizontalLabels={true}
                  withVerticalLabels={true}
                  fromZero={true}
                />
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.brand }]} />
                    <Text style={styles.legendText}>Sales Revenue</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
                    <Text style={styles.legendText}>Prescriptions</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No sales data available</Text>
              </View>
            )}
          </ChartCard>

          {/* Top Medications */}
          <ChartCard title="Top Medications This Week">
            {isTopMedicationsLoading ? (
              <View style={styles.chartLoading}>
                <ActivityIndicator size="small" color={COLORS.brand} />
              </View>
            ) : topMedications?.length > 0 ? (
              <FlatList
                data={topMedications}
                renderItem={renderMedicationItem}
                keyExtractor={(item, index) => `${item?.name}-${index}`}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No medication data available</Text>
              </View>
            )}
          </ChartCard>
        </View>

        {/* Recent Prescriptions - Using reference style */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <View style={styles.headerText}>
              <Text style={styles.tableTitle}>Recent Prescriptions</Text>
              <Text style={styles.tableSubtitle}>Latest patient orders and prescriptions</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={onViewAllPress}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRightIcon size={16} color={COLORS.brand} />
            </TouchableOpacity>
          </View>
          {recentPrescriptions?.length > 0 ? (
            <FlatList
              data={recentPrescriptions}
              renderItem={renderPatientRow}
              keyExtractor={(item) => item?.id?.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No recent prescriptions</Text>
              <Text style={styles.noDataSubtext}>New prescriptions will appear here</Text>
            </View>
          )}
        </View>

      </ScrollView>

      <View style={[
        styles.footerWrap, 
        { 
          bottom: hasBottomInsets ? insets.bottom : 0,
          height: FOOTER_H
        }
      ]}>
        <Footer active={"dashboard"} brandColor={COLORS.brand} />
      </View>

      {hasBottomInsets && (
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

export default DashboardPharma;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },

  /* Header - Fixed to match reference */
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

  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: '500',
  },
  dateBadge: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    marginLeft: SPACING.sm,
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand,
    fontWeight: '600',
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
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flex: 1,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  statValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  statIcon: {
    width: isSmallDevice ? 44 : 48,
    height: isSmallDevice ? 44 : 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  controlPanel: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "flex-end" 
  },
  primaryBtn: {
    backgroundColor: COLORS.brand,
    height: isSmallDevice ? 48 : 52,
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  primaryBtnText: { 
    color: COLORS.buttonText, 
    fontWeight: "700", 
    fontSize: FONT_SIZE.md 
  },

  chartsSection: { 
    gap: SPACING.xl 
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  chartTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.lg,
    marginTop: SPACING.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: '500',
  },

  medicationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  medicationRank: {
    width: isSmallDevice ? 32 : 36,
    height: isSmallDevice ? 32 : 36,
    borderRadius: isSmallDevice ? 16 : 18,
    backgroundColor: COLORS.pill,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  rankText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "800",
    color: COLORS.sub,
  },
  medicationIcon: {
    width: isSmallDevice ? 40 : 44,
    height: isSmallDevice ? 40 : 44,
    borderRadius: isSmallDevice ? 20 : 22,
    backgroundColor: COLORS.brandLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  medicationCategory: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: '500',
  },
  prescribedCount: {
    alignItems: "flex-end",
  },
  prescribedText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "800",
    color: COLORS.brand,
  },
  prescribedLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    textTransform: "uppercase",
    fontWeight: '600',
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
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  viewAllText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand,
    fontWeight: "600",
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

  /* Modal */
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