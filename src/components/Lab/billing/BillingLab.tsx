import React, { useState, useEffect, useCallback } from "react";
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
  FlatList,
  Animated,
  Easing,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

// Custom Icons
import {
  MenuIcon,
  FileTextIcon,
  UsersIcon,
  AlertTriangleIcon,
  ShoppingBagIcon,
  XIcon,
} from "../../../utils/SvgIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import PatientOuterTable from "../../Alerts/AlertsLab/OuterTable";
import CustomTabs from "../../Alerts/AlertsLab/CustomTabs";
import Footer from "../../dashboard/footer";

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

const { width: W, height: H } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallScreen = W < 375;
const brandColor = '#14b8a6';

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
  const width = Math.min(320, W * 0.82);

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
            <XIcon size={24} color="#0b1220" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sidebarContent}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.sidebarButton}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <item.icon size={20} color="#0b1220" />
              <Text style={styles.sidebarButtonText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.bottomActions}>
          {bottomItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.bottomButton,
                item.variant === "danger" && styles.logoutButton,
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

// Header Component
const HeaderBar: React.FC<{ 
  title: string; 
  onMenu: () => void;
}> = ({ title, onMenu }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn}>
        <MenuIcon size={isSmallScreen ? 24 : 30} color="#ffffffff" />
      </TouchableOpacity>
    </View>
  );
};

// IPD Orders Component
const IpdOrders: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [ipdOrders, setIpdOrders] = useState<LabTestOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const getPatientBillingData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        console.log("Missing hospitalID or token");
        return [];
      }

      const response = await AuthFetch(
        `test/${user.roleName}/${user.hospitalID}/approved/getBillingData`,
        token
      );

      console.log("IPD Billing API Response:", response);

      if (response?.data?.message === "success" && Array.isArray(response?.data?.billingData)) {
        // Filter for IPD orders (ptype 2 or 3)
        const filterData: LabTestOrder[] = response.data.billingData.filter(
          (each: LabTestOrder) => each.ptype === 2 || each.ptype === 3
        );

        console.log("Filtered IPD Orders:", filterData);

        // Sort latest data on top
        const sortedData = filterData.sort((a: LabTestOrder, b: LabTestOrder) => {
          const dateA = new Date(a.addedOn || 0).getTime();
          const dateB = new Date(b.addedOn || 0).getTime();
          return dateB - dateA; // latest first
        });

        return sortedData;
      } else {
        console.log("Invalid response format for IPD:", response);
        return [];
      }
    } catch (error) {
      console.error("Error fetching IPD billing data:", error);
      return [];
    }
  }, [user?.hospitalID, user?.roleName]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getPatientBillingData();
        setIpdOrders(data);
        console.log("IPD Orders set:", data);
      } catch (error) {
        console.error("Error loading IPD data:", error);
        Alert.alert("Error", "Failed to load IPD orders");
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
    <PatientOuterTable
      title="IPD Orders"
      data={ipdOrders}
      isButton={false}
      patientOrderPay="patientOrderPay"
      isBilling={true}
    />
  );
};

// OPD Orders Component
const OpdOrders: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [opdOrders, setOpdOrders] = useState<LabTestOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const getPatientBillingData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        console.log("Missing hospitalID or token for OPD");
        return [];
      }

      const response = await AuthFetch(
        `test/${user.roleName}/${user.hospitalID}/approved/getBillingData`,
        token
      );

      console.log("OPD Billing API Response:", response);

      // Handle both response formats
      const billingData = response?.data?.billingData || response?.billingData;
      
      if ((response?.data?.message === "success" || response?.message === "success") && Array.isArray(billingData)) {
        // Filter for OPD orders (ptype 21)
        const filterData = billingData.filter(
          (each: LabTestOrder) => each.ptype === 21
        );

        console.log("Filtered OPD Orders:", filterData);

        // Sort latest data on top
        const sortedData = filterData.sort((a: LabTestOrder, b: LabTestOrder) => {
          const dateA = new Date(a.addedOn || 0).getTime();
          const dateB = new Date(b.addedOn || 0).getTime();
          return dateB - dateA; // latest first
        });

        return sortedData;
      } else {
        console.log("Invalid response format for OPD:", response);
        return [];
      }
    } catch (error) {
      console.error("Error fetching OPD billing data:", error);
      return [];
    }
  }, [user?.hospitalID, user?.roleName]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getPatientBillingData();
        setOpdOrders(data);
        console.log("OPD Orders set:", data);
      } catch (error) {
        console.error("Error loading OPD data:", error);
        Alert.alert("Error", "Failed to load OPD orders");
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
    <PatientOuterTable
      title="OPD Orders"
      data={opdOrders}
      isButton={false}
      patientOrderOpd="patientOrderOpd"
      isBilling={true}
    />
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
      <View style={styles.tabHeaders}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabHeaderButton,
              activeTab === tab.label && styles.activeTabHeader
            ]}
            onPress={() => setActiveTab(tab.label)}
          >
            <Text style={[
              styles.tabHeaderText,
              activeTab === tab.label && styles.activeTabHeaderText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabContent}>
        {renderContent()}
      </View>
    </View>
  );
};

// Main BillingLab Component
const BillingLab: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();

  const departmentType = user?.roleName === 'radiology' ? 'radiology' : 'pathology';
  const departmentName = departmentType === 'radiology' ? 'Radiology' : 'Laboratory';
  const billingTitle = `${departmentName} Billing`;

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
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} backgroundColor="#14b8a6" />

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
    backgroundColor: "#fff" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#64748b',
  },
  header: {
    height: isSmallScreen ? 80 : 100,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#14b8a6",
  },
  headerTitle: { 
    fontSize: isSmallScreen ? 20 : 24, 
    fontWeight: "700", 
    color: "#ffffff" 
  },
  menuBtn: {
    width: isSmallScreen ? 34 : 38,
    height: isSmallScreen ? 34 : 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
  },
  tabsMainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  tabHeaders: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabHeaderButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  activeTabHeader: {
    backgroundColor: "#14b8a6",
  },
  tabHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  activeTabHeaderText: {
    color: "#ffffff",
  },
  tabContent: {
    flex: 1,
    padding: isSmallScreen ? 12 : 16,
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
  // Sidebar Styles
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
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  sidebarButtonText: {
    fontSize: isSmallScreen ? 13 : 15,
    fontWeight: "600",
    color: "#0b1220",
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
  logoutButton: {
    backgroundColor: "#fef2f2",
  },
  bottomButtonText: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: "600",
  },
});

export default BillingLab;