import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Pressable,
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Custom Icons
import {
  MenuIcon,
  FileTextIcon,
  UsersIcon,
  AlertTriangleIcon,
  ShoppingBagIcon,
  XIcon,
} from "../../../utils/SvgIcons";
import { AuthFetch } from "../../../auth/auth";
import PatientOuterTable from "../../Alerts/AlertsLab/OuterTable";
import Footer from "../../dashboard/footer";

// Utils
import { 
  SPACING, 
  FONT_SIZE,
  FOOTER_HEIGHT,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { showError } from "../../../store/toast.slice";

const FOOTER_H = FOOTER_HEIGHT;
const brandColor = COLORS.brand;

// Types
type LabTestOrder = {
  id: number;
  patientID: string;
  pID?: string;
  pName: string;
  patientName?: string;
  dept?: string;
  departmentID?: number;
  doctor_firstName?: string;
  doctor_lastName?: string;
  firstName?: string;
  lastName?: string;
  addedOn: string;
  paidAmount?: string;
  dueAmount?: string;
  ptype: number;
  testsList: any[];
  totalAmount?: string;
  timeLineID?: number;
};

interface SidebarItem {
  key: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  variant?: "default" | "danger" | "muted";
}

// Sidebar Component
const Sidebar: React.FC<{
  open: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string;
  onProfile: () => void;
  items: SidebarItem[];
  bottomItems: SidebarItem[];
}> = ({ open, onClose, userName, userImage, onProfile, items, bottomItems }) => {
  const slide = React.useRef(new Animated.Value(-300)).current;
  const width = Math.min(320, SCREEN_WIDTH * 0.82);

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
        <View style={styles.sidebarHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sidebarContent}>
          {items?.map((item) => (
            <TouchableOpacity
              key={item?.key}
              style={styles.sidebarButton}
              onPress={() => {
                onClose();
                item?.onPress?.();
              }}
            >
              <item.icon size={20} color={COLORS.text} />
              <Text style={styles.sidebarButtonText}>{item?.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.bottomActions}>
          {bottomItems?.map((item) => (
            <TouchableOpacity
              key={item?.key}
              style={[
                styles.bottomButton,
                item?.variant === "danger" && styles.logoutButton,
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

// IPD Orders Component
const IpdOrders: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((s: any) => s.currentUser);
  const [ipdOrders, setIpdOrders] = useState<LabTestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 10;

  const getPatientBillingData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        dispatch(showError("Not authorized. Please login again."));
        return [];
      }

      const response = await AuthFetch(
        `test/${user?.roleName}/${user?.hospitalID}/approved/getBillingData`,
        token
      );

      const billingData = response?.data?.billingData || response?.billingData;
      
      if ((response?.data?.message === "success" || response?.message === "success") && Array.isArray(billingData)) {
        const filterData: LabTestOrder[] = billingData?.filter(
          (each: LabTestOrder) => each?.ptype === 2 || each?.ptype === 3
        );

        const sortedData = filterData?.sort((a: LabTestOrder, b: LabTestOrder) => {
          const dateA = new Date(a?.completed_status || ((a?.testsList?.[0] as any)?.approved_status) || a?.addedOn || 0).getTime();
          const dateB = new Date(b?.completed_status || ((b?.testsList?.[0] as any)?.approved_status) || b?.addedOn || 0).getTime();
          return dateB - dateA;
        });

        return sortedData;
      } else {
        dispatch(showError("No IPD orders found"));
        return [];
      }
    } catch (error) {
      dispatch(showError("Failed to load IPD orders"));
      return [];
    }
  }, [user?.hospitalID, user?.roleName]);

  // Pagination calculations
  const totalItems = ipdOrders?.length ?? 0;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  const indexOfFirstRow = currentPage * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;
  const pagedData = ipdOrders?.slice(indexOfFirstRow, indexOfLastRow) ?? [];

  const handleProceedToPay = (order: LabTestOrder) => {
    const dueAmount = calculateDueAmount(order);

    navigation.navigate("PaymentScreen", {
      orderData: order,
      amount: dueAmount,
      department: user?.roleName || 'lab',
      user: user,
      onPaymentSuccess: () => {
        refreshOrders();
      }
    });
  };

  const refreshOrders = async () => {
    try {
      const data = await getPatientBillingData();
      setIpdOrders(data);
    } catch (error) {
      dispatch(showError("Failed to refresh orders"));
    }
  };

  const calculateDueAmount = (order: LabTestOrder) => {
    if (!order?.testsList || order?.testsList?.length === 0) return 0;
    
    let totalAmount = 0;
    order?.testsList?.forEach((test: any) => {
      const price = test?.testPrice || 0;
      const gst = test?.gst || 18;
      totalAmount += price + (price * gst) / 100;
    });
    
    const paidAmount = parseFloat(order?.paidAmount || "0");
    return Math.max(0, totalAmount - paidAmount);
  };

  // Pagination navigation function
  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getPatientBillingData();
        setIpdOrders(data);
      } catch (error) {
        dispatch(showError("Failed to load IPD orders"));
      } finally {
        setLoading(false);
      }
    };

    if (user?.hospitalID) {
      loadData();
    }
  }, [user?.hospitalID, getPatientBillingData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColor} />
        <Text style={styles.loadingText}>Loading IPD Orders...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PatientOuterTable
        title="IPD Orders"
        data={pagedData}
        isButton={false}
        patientOrderPay="patientOrderPay"
        isBilling={true}
        onProceedToPay={handleProceedToPay}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </View>
  );
};

// OPD Orders Component
const OpdOrders: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((s: any) => s.currentUser);
  const [opdOrders, setOpdOrders] = useState<LabTestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 10;

  const getPatientBillingData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        dispatch(showError("Not authorized. Please login again."));
        return [];
      }

      const response = await AuthFetch(
        `test/${user?.roleName}/${user?.hospitalID}/approved/getBillingData`,
        token
      );

      const billingData = response?.data?.billingData || response?.billingData;
      
      if ((response?.data?.message === "success" || response?.message === "success") && Array.isArray(billingData)) {
        const filterData = billingData?.filter(
          (each: LabTestOrder) => each?.ptype === 21
        );

        const sortedData = filterData?.sort((a: LabTestOrder, b: LabTestOrder) => {
          const dateA = new Date(a?.completed_status || ((a?.testsList?.[0] as any)?.approved_status) || a?.addedOn || 0).getTime();
          const dateB = new Date(b?.completed_status || ((b?.testsList?.[0] as any)?.approved_status) || b?.addedOn || 0).getTime();
          return dateB - dateA;
        });

        return sortedData;
      } else {
        dispatch(showError("No OPD orders found"));
        return [];
      }
    } catch (error) {
      dispatch(showError("Failed to load OPD orders"));
      return [];
    }
  }, [user?.hospitalID, user?.roleName]);

  // Pagination calculations
  const totalItems = opdOrders?.length ?? 0;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  const indexOfFirstRow = currentPage * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;
  const pagedData = opdOrders?.slice(indexOfFirstRow, indexOfLastRow) ?? [];

  const handleProceedToPay = (order: LabTestOrder) => {
    const dueAmount = calculateDueAmount(order);

    navigation.navigate("PaymentScreen", {
      orderData: order,
      amount: dueAmount,
      department: user?.roleName || 'lab',
      user: user,
      onPaymentSuccess: () => {
        refreshOrders();
      }
    });
  };

  const refreshOrders = async () => {
    try {
      const data = await getPatientBillingData();
      setOpdOrders(data);
    } catch (error) {
      dispatch(showError("Failed to refresh orders"));
    }
  };

  const calculateDueAmount = (order: LabTestOrder) => {
    if (!order?.testsList || order?.testsList?.length === 0) return 0;
    
    let totalAmount = 0;
    order?.testsList?.forEach((test: any) => {
      const price = test?.testPrice || 0;
      const gst = test?.gst || 18;
      totalAmount += price + (price * gst) / 100;
    });
    
    const paidAmount = parseFloat(order?.paidAmount || "0");
    return Math.max(0, totalAmount - paidAmount);
  };

  // Pagination navigation function
  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getPatientBillingData();
        setOpdOrders(data);
      } catch (error) {
        dispatch(showError("Failed to load OPD orders"));
      } finally {
        setLoading(false);
      }
    };

    if (user?.hospitalID) {
      loadData();
    }
  }, [user?.hospitalID, getPatientBillingData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColor} />
        <Text style={styles.loadingText}>Loading OPD Orders...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PatientOuterTable
        title="OPD Orders"
        data={pagedData}
        isButton={false}
        patientOrderOpd="patientOrderOpd"
        isBilling={true}
        onProceedToPay={handleProceedToPay}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </View>
  );
};

// Orders Tabs Component
const OrdersTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState("IPD");

  const renderContent = () => {
    switch (activeTab) {
      case "IPD":
        return <IpdOrders />;
      case "OPD":
        return <OpdOrders />;
      default:
        return null;
    }
  };

  const tabs = [
    { key: "ipd", label: "IPD" },
    { key: "opd", label: "OPD" },
  ];

  return (
    <View style={styles.tabsMainContainer}>
      {/* Enhanced Tab Headers with Gradient */}
      <View style={styles.tabContainer}>
        {tabs?.map((tab) => (
          <TouchableOpacity
            key={tab?.key}
            style={[styles.tab, activeTab === tab?.label && styles.tabActive]}
            onPress={() => {
              setActiveTab(tab?.label);
            }}
          >
            {activeTab === tab?.label ? (
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.tabGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>
                  {tab?.label}
                </Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.tabText, { color: COLORS.sub }]}>
                {tab?.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentArea}>
        {renderContent()}
      </View>
    </View>
  );
};

// Main BillingLab Component
const BillingLab: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: any) => s.currentUser);
  const insets = useSafeAreaInsets();

  const departmentType = user?.roleName === 'radiology' ? 'radiology' : 'pathology';
  const departmentName = departmentType === 'radiology' ? 'Radiology' : 'Laboratory';

  const [menuOpen, setMenuOpen] = useState(false);

  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  const getSidebarItems = (): SidebarItem[] => {
    const basePath = departmentType === 'radiology' ? 'Radio' : 'Lab';
    
    return [
      {
        key: "dash",
        label: "Dashboard",
        icon: FileTextIcon,
        onPress: () => go("DashboardLab")
      },
      {
        key: "alerts", 
        label: "Alerts",
        icon: AlertTriangleIcon,
        onPress: () => go(`AlertsLab`)
      },
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
        onPress: () => go(`Billing${basePath}`)
      },
    ];
  };

  const bottomItems: SidebarItem[] = [
    {
      key: "modules",
      label: "Go to Modules",
      icon: FileTextIcon,
      onPress: () => go("Home")
    },
    {
      key: "logout",
      label: "Logout",
      icon: AlertTriangleIcon,
      onPress: () => {
        setMenuOpen(false);
        // Add logout logic
      },
      variant: "danger"
    },
  ];

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} backgroundColor={COLORS.brand} />
      <View style={styles.container}>
        <OrdersTabs />
      </View>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"billing"} brandColor={brandColor} />
      </View>

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
    minHeight: 200,
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
    backgroundColor: COLORS.bg,
    marginBottom: FOOTER_H,
  },
  tabsMainContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // --- Tab styles copied from AlertsLab (gradient tabs) ---
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 12,
    padding: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
    height: 52,
  },
  tab: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabActive: {
    // gradient applied via LinearGradient wrapper
  },
  tabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.sm,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: SPACING.sm,
  },
  tabTextActive: {
    color: COLORS.buttonText,
    fontWeight: "700",
  },
  tabContentArea: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  // --- end tab styles ---
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
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
  sidebarContent: {
    flex: 1,
  },
  sidebarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  sidebarButtonText: {
    fontSize: isSmallDevice ? FONT_SIZE.sm : FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
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
  logoutButton: {
    backgroundColor: COLORS.chipBP,
  },
  bottomButtonText: {
    fontSize: isSmallDevice ? FONT_SIZE.sm : FONT_SIZE.sm,
    fontWeight: "600",
  },
});

export default BillingLab;