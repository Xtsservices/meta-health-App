import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  RefreshControl,
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Custom Icons
import {
  XIcon,
} from "../../../utils/SvgIcons";
import { AuthFetch } from "../../../auth/auth";
import PatientOuterTable from "./OuterTable";
import Footer from "../../dashboard/footer";

// Utils
import { 
  SPACING, 
  FONT_SIZE,
  FOOTER_HEIGHT,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { showError } from "../../../store/toast.slice";

const FOOTER_H = FOOTER_HEIGHT;
const brandColor = COLORS.brand;

// Types
interface SidebarItem {
  key: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  variant?: "default" | "danger" | "muted";
}

interface TestAlertsProps {
  filter: string;
  currentAlerts: any[];
  filteredAlerts: any[];
  currentPage: number;
  totalPages: number;
  expandedPatientId: string | null;
  onPageChange: (page: number) => void;
  onPatientExpand: (id: string | null) => void;
  onFilterChange: (filter: string) => void;
   alertFrom?: "lab" | "reception";
}

interface RejectedAlertsProps {
  rejectedOrders: any[];
}

interface AlertsTabsProps {
  allAlerts: any[];
  filteredAlerts: any[];
  rejectedOrders: any[];
  filter: string;
  currentPage: number;
  expandedPatientId: string | null;
  onFilterChange: (filter: string) => void;
  onPageChange: (page: number) => void;
  onPatientExpand: (id: string | null) => void;
  alertFrom?: "lab" | "reception";
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
          {userImage ? (
            <Image source={{ uri: userImage }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarText}>
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <Text style={styles.userName}>{userName || "User"}</Text>
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

// Test Alerts Component
const TestAlerts: React.FC<TestAlertsProps> = ({ 
  filter, 
  currentAlerts, 
  filteredAlerts, 
  currentPage, 
  totalPages, 
  expandedPatientId, 
  onPageChange, 
  onPatientExpand,
  onFilterChange,
  alertFrom = "lab",
}) => {
  const isReception = alertFrom === "reception";
  const titlePrefix = isReception ? "Reception Alerts" : "Lab Test Alerts";

  return (
    <View style={styles.tabContent}>
      <PatientOuterTable
         title={`${titlePrefix} - ${filter}`}
        data={currentAlerts ?? []}
        isButton={true}
         alertFrom={isReception ? "Reception" : "Lab"}
        expandedPatientId={expandedPatientId}
        onPatientExpand={onPatientExpand}
        filter={filter}
        onFilterChange={onFilterChange}
        showFilter={true}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <Text style={styles.resultsText}>
        Showing {currentAlerts?.length ?? 0} of {filteredAlerts?.length ?? 0} result
        {filteredAlerts?.length !== 1 ? "s" : ""}
        {expandedPatientId && " • Patient details expanded above"}
      </Text>
    </View>
  );
};

// Rejected Alerts Component
const RejectedAlerts: React.FC<RejectedAlertsProps> = ({ rejectedOrders }) => {
  return (
    <View style={styles.tabContent}>
      <PatientOuterTable
        title="Rejected Alerts"
        data={rejectedOrders ?? []}
        isButton={false}
        alertFrom="Lab"
        isRejectedTab={true}
      />

      <Text style={styles.resultsText}>
        Showing {rejectedOrders?.length ?? 0} result
        {rejectedOrders?.length !== 1 ? "s" : ""}
      </Text>
    </View>
  );
};

// Alerts Tabs Component
const AlertsTabs: React.FC<AlertsTabsProps> = ({ 
  allAlerts, 
  filteredAlerts, 
  rejectedOrders, 
  filter, 
  currentPage, 
  expandedPatientId, 
  onFilterChange, 
  onPageChange, 
  onPatientExpand,
  alertFrom = "lab",
}) => {
  const [activeTab, setActiveTab] = useState("test-alerts");
  const rowsPerPage = 10;
 const isReception = alertFrom === "reception";
  const indexOfFirstRow = currentPage * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;
  const currentAlerts = filteredAlerts?.slice(indexOfFirstRow, indexOfLastRow) ?? [];
  const totalPages = Math.ceil((filteredAlerts?.length ?? 0) / rowsPerPage);

  const renderContent = () => {
    switch (activeTab) {
      case "test-alerts":
        return (
          <View style={{ flex: 1 }}>
            <TestAlerts
              filter={filter}
              currentAlerts={currentAlerts}
              filteredAlerts={filteredAlerts ?? []}
              currentPage={currentPage}
              totalPages={totalPages}
              expandedPatientId={expandedPatientId}
              onPageChange={onPageChange}
              onPatientExpand={onPatientExpand}
              onFilterChange={onFilterChange}
               alertFrom={alertFrom}
            />
          </View>
        );
      case "rejected-alerts":
        return (
          <View style={{ flex: 1 }}>
            <RejectedAlerts rejectedOrders={rejectedOrders ?? []} />
          </View>
        );
      default:
        return null;
    }
  };

 const tabs = [
    { key: "test-alerts", label: isReception ? "Alerts" : "Test Alerts" },
    { key: "rejected-alerts", label: isReception ? "Rejected" : "Rejected Alerts" },
  ];

  return (
    <View style={styles.tabsMainContainer}>
      {/* Enhanced Tab Headers with Gradient */}
      <View style={styles.tabContainer}>
        {tabs?.map((tab) => (
          <TouchableOpacity
            key={tab?.key}
            style={[styles.tab, activeTab === tab?.key && styles.tabActive]}
            onPress={() => {
              setActiveTab(tab?.key);
              onPatientExpand(null);
              onPageChange(0);
            }}
          >
            {activeTab === tab?.key ? (
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

// Main AlertsLab Component
const AlertsLab: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);
  const insets = useSafeAreaInsets();

  const [allAlerts, setAllAlerts] = useState<any[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);
  const [rejectedOrders, setRejectedOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isReceptionAlerts = user?.roleName === "reception";

  const navigationState = route?.params?.state || {};

  const departmentType = user?.roleName === 'radiology' ? 'radiology' : 'pathology';
  const departmentName = departmentType === 'radiology' ? 'Radiology' : 'Laboratory';

  // Navigation function
  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  useEffect(() => {
    if (navigationState?.patientData) {
      const patientId = navigationState?.patientData?.patientID || 
                       navigationState?.patientData?.pID || 
                       navigationState?.patientData?.id;
      setExpandedPatientId(patientId);
      
      const patientType = navigationState?.patientData?.ptype;
      if (patientType === 1) {
        setFilter("OPD");
      } else if (patientType === 2) {
        setFilter("IPD");
      } else if (patientType === 3) {
        setFilter("Emergency");
      }
      
      if (patientId && allAlerts?.length > 0) {
        const patientIndex = allAlerts?.findIndex((alert: any) => 
          alert?.patientID === patientId || 
          alert?.pID === patientId ||
          alert?.id === patientId
        );
        
        if (patientIndex !== -1) {
          const targetPage = Math.floor(patientIndex / 10);
          setCurrentPage(targetPage);
        }
      }
    }
  }, [navigationState, allAlerts]);

  // Fetch all test alerts
  const getAlerts = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        navigation.navigate("Login" as never);
        return;
      }
   let alertsData: any[] = [];
     if (isReceptionAlerts) {
        // 👇 Reception pending alerts
        const response = await AuthFetch(
          `reception/${user?.hospitalID}/pending/getReceptionAlertsData`,
          token
        );
        alertsData = response?.data?.data?.data || response?.data || [];
      } else {
        // 👇 Existing lab alerts
        const response = await AuthFetch(
          `test/${user?.roleName}/${user?.hospitalID}/getAlerts`,
          token
        );
        alertsData = response?.data?.alerts || response?.alerts || [];
      }
      
      if (Array.isArray(alertsData)) {
        setAllAlerts(alertsData);
        setFilteredAlerts(alertsData);
        if (!alertsData.length && !isReceptionAlerts) {
          dispatch(showError("No alerts found"));
        }
      } else {
        setAllAlerts([]);
        setFilteredAlerts([]);
        if (!isReceptionAlerts) {
          dispatch(showError("No alerts found"));
        }
      }
    } catch (error) {
      dispatch(showError("Failed to load alerts"));
      setAllAlerts([]);
      setFilteredAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.hospitalID) {
      getAlerts();
    } else {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.token, navigation]);

  // Fetch rejected alerts
  useEffect(() => {
    const getRejectedOrders = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        
        if (!token) {
          dispatch(showError("Not authorized. Please login again."));
          navigation.navigate("Login" as never);
          return;
        }

                let rejectedData: any[] = [];

        if (isReceptionAlerts) {
          // 👇 Reception rejected list
          const response = await AuthFetch(
            `reception/${user?.hospitalID}/rejected/getReceptionRejectedList`,
            token
          );
          rejectedData = response?.data?.data || response?.data || [];
        } else {
          // 👇 Existing lab rejected billing
          const response = await AuthFetch(
            `test/${user?.roleName}/${user?.hospitalID}/rejected/getBillingData`,
            token
          );
          rejectedData = response?.data?.billingData || response?.billingData || [];
        }
        if (Array.isArray(rejectedData)) {
          setRejectedOrders(rejectedData);
        } else {
          setRejectedOrders([]);
        }

      } catch (error) {
        dispatch(showError("Failed to load rejected orders"));
        setRejectedOrders([]);
      }
    };

    if (user?.hospitalID) getRejectedOrders();
  }, [user?.hospitalID, navigation]);

  // Apply department filter for Test Alerts
  useEffect(() => {
    let filtered = [...allAlerts];
    if (filter === "OPD") {
      
      filtered = allAlerts?.filter((order) => order?.ptype === 21) ?? [];
    } else if (filter === "IPD") {
      filtered = allAlerts?.filter((order) => order?.ptype === 2) ?? [];
    } else if (filter === "Emergency") {
      filtered = allAlerts?.filter((order) => order?.ptype === 3) ?? [];
    } else {
      filtered = allAlerts;
    }
    setFilteredAlerts(filtered);
    setCurrentPage(0);
  }, [filter, allAlerts]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setExpandedPatientId(null);
    setCurrentPage(0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedPatientId(null);
  };

  const handlePatientExpand = (id: string | null) => {
    setExpandedPatientId(id);
  };

  const onRefresh = () => {
    getAlerts(true);
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={brandColor} />
          <Text style={styles.loadingText}>Loading Alerts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} backgroundColor={COLORS.brand} />

        {/* Main Content with proper spacing */}
        <View style={styles.mainContainer}>
          <AlertsTabs
            allAlerts={allAlerts}
            filteredAlerts={filteredAlerts}
            rejectedOrders={rejectedOrders}
            filter={filter}
            currentPage={currentPage}
            expandedPatientId={expandedPatientId}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onPatientExpand={handlePatientExpand}
            alertFrom={isReceptionAlerts ? "reception" : "lab"}

          />
        </View>
      </KeyboardAvoidingView>

      {/* Fixed Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"alerts"} brandColor={brandColor} />
      </View>

      {/* Bottom Safe Area Shield */}
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    marginBottom: FOOTER_H,
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
  },
  tabsMainContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // Enhanced Tab Styles with Gradient - Fixed Height
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
    // Gradient handled by LinearGradient component
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
  resultsText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    textAlign: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
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
    justifyContent: "flex-end",
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.sm,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  userAvatarText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  userName: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
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

export default AlertsLab;