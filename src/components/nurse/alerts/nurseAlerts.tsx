import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from 'react-redux';
import { showError } from "../../../store/toast.slice";
import Footer from "../../dashboard/footer";
import { RootState } from "../../../store/store";
import { AuthFetch, AuthPatch } from "../../../auth/auth";
import { BellIcon, ChevronRight } from "../../../utils/SvgIcons";

const { width } = Dimensions.get("window");

const RESPONSIVE = {
  fontSize: {
    xs: width * 0.03,
    sm: width * 0.035,
    md: width * 0.04,
    lg: width * 0.045,
    xl: width * 0.05,
  },
  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
  },
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
  },
  containerContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: RESPONSIVE.fontSize.md,
    color: "#64748b",
    fontFamily: "Inter-Medium",
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontFamily: "Inter-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontFamily: "Inter-Regular",
    color: "#64748b",
  },
  
  // Tabs styling
  tabsWrapper: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabsContainer: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  tabsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    zIndex: 10,
  },
  tabInner: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabInnerActive: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    letterSpacing: 0.2,
    fontFamily: "Inter-SemiBold",
  },
  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
    fontFamily: "Inter-Bold",
  },
  
  scroll: { 
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  
  // Stats Cards
  statsGrid: {
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsTitle: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontFamily: "Inter-Medium",
    color: "#64748b",
    marginBottom: 4,
  },
  statsValue: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: "Inter-Bold",
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    zIndex: 10,
    elevation: 6,
  },
  navShield: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
  },
  tabContentContainer: {
    paddingHorizontal: 12,
  },
});

type TabKey = "PatientsAlerts" | "MedicationMissedAlerts" | "MedicationAlerts";

const TabButton: React.FC<{
  tab: TabKey;
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, label, isActive, onPress }) => {
  const iconColor = isActive ? "#ffffff" : "#9ca3af";

  return (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        isActive && styles.tabButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.tabInner,
          isActive && styles.tabInnerActive,
        ]}
      >
        <View style={styles.tabContent}>
          <Text
            style={[
              styles.tabButtonText,
              isActive && styles.tabButtonTextActive,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <ChevronRight
            size={16}
            color={iconColor}
            strokeWidth={2.5}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const StatsCard: React.FC<{
  title: string;
  value: number;
  color: string;
  backgroundColor: string;
  icon: React.ReactNode;
}> = ({ title, value, color, backgroundColor, icon }) => {
  return (
    <View style={[styles.statsCard, { backgroundColor }]}>
      <View style={styles.statsContent}>
        <View>
          <Text style={styles.statsTitle}>{title}</Text>
          <Text style={[styles.statsValue, { color }]}>{value}</Text>
        </View>
        <View style={[styles.statsIcon, { backgroundColor: `${color}15` }]}>
          {icon}
        </View>
      </View>
    </View>
  );
};

const NurseAlerts: React.FC<{ navigation: any }> = ({ navigation }) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>("PatientsAlerts");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertsData, setAlertsData] = useState<any>(null);

  const FOOTER_HEIGHT = 70;
  const dispatch = useDispatch();
  
  const getAlertData = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      
      if (activeTab === "PatientsAlerts") {
        const response = await AuthFetch(`nurse/alerts/${user.hospitalID}/${user.role}`, token) as any;
        
        if (response?.status === "success" && response?.data) {
          setAlertsData(response.data);
        } else {
          setAlertsData(null);
        }
      } else {
        // For other tabs, fetch their respective data
        // You'll need to implement these API calls
        setAlertsData(null);
      }
      
      setLoading(false);
      setRefreshing(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to fetch alerts';
      dispatch(showError(errorMessage));
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, dispatch, user]);

  // Calculate statistics from alerts data
  const calculateStats = useCallback(() => {
    if (!alertsData || !alertsData.data) {
      return {
        total: 0,
        critical: 0,
        active: 0,
        routine: 0
      };
    }

    // Extract all alerts from different sources
    const highPriorityData = alertsData.data.HighPriorityData || [];
    const mediumPriorityData = alertsData.data.MediumPriorityData || [];
    const lowPriorityData = alertsData.data.LowPriorityData || [];
    const mainAlerts = alertsData.alerts || [];

    // Combine all alerts
    const allAlerts = [
      ...highPriorityData,
      ...mediumPriorityData,
      ...lowPriorityData,
      ...mainAlerts
    ];

    // Remove duplicates by id
    const uniqueAlerts = allAlerts.filter((alert, index, self) =>
      index === self.findIndex(a => a.id === alert.id)
    );

    // Calculate counts based on priority
    const highPriorityCount = uniqueAlerts.filter(alert => 
      alert.priority === "High" && alert.seen === 0
    ).length;
    
    const mediumPriorityCount = uniqueAlerts.filter(alert => 
      alert.priority === "Medium" && alert.seen === 0
    ).length;
    
    const lowPriorityCount = uniqueAlerts.filter(alert => 
      alert.priority === "Low" && alert.seen === 0
    ).length;

    const totalUnseen = highPriorityCount + mediumPriorityCount + lowPriorityCount;

    // Map priorities to your stats categories
    // Assuming: High = Critical, Medium = Active, Low = Routine
    return {
      total: totalUnseen,
      critical: highPriorityCount,
      active: mediumPriorityCount,
      routine: lowPriorityCount
    };
  }, [alertsData]);

  const patientsStats = calculateStats();

  const onRefresh = () => {
    setRefreshing(true);
    getAlertData();
  };

  useEffect(() => {
    getAlertData();
  }, [getAlertData]);

  const renderContent = () => {
    switch (activeTab) {
      case "PatientsAlerts":
        return (
          <PatientsAlertsTab 
            navigation={navigation}
            user={user}
            refreshing={refreshing}
            onRefresh={onRefresh}
            alertsData={alertsData}
          />
        );
      case "MedicationMissedAlerts":
        return (
          <MedicationMissedAlertsTab 
            navigation={navigation}
            user={user}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      case "MedicationAlerts":
        return (
          <MedicationAlertsTab 
            navigation={navigation}
            user={user}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      default:
        return null;
    }
  };

  const renderStatsCards = () => {
    // Only show stats cards for PatientsAlerts tab
    if (activeTab !== "PatientsAlerts") {
      return null;
    }

    return (
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatsCard
            title="Total Alerts"
            value={patientsStats.total}
            color="#3b82f6"
            backgroundColor="#ffffff"
            icon={<BellIcon size={RESPONSIVE.icon.md} color="#3b82f6" />}
          />
          <StatsCard
            title="Critical"
            value={patientsStats.critical}
            color="#dc2626"
            backgroundColor="#ffffff"
            icon={<BellIcon size={RESPONSIVE.icon.md} color="#dc2626" />}
          />
        </View>
        <View style={styles.statsRow}>
          <StatsCard
            title="Active"
            value={patientsStats.active}
            color="#ca8a04"
            backgroundColor="#ffffff"
            icon={<BellIcon size={RESPONSIVE.icon.md} color="#ca8a04" />}
          />
          <StatsCard
            title="Routine"
            value={patientsStats.routine}
            color="#16a34a"
            backgroundColor="#ffffff"
            icon={<BellIcon size={RESPONSIVE.icon.md} color="#16a34a" />}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading Alerts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Tabs row */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            <TabButton
              tab="PatientsAlerts"
              label="Patients Alerts"
              isActive={activeTab === "PatientsAlerts"}
              onPress={() => setActiveTab("PatientsAlerts")}
            />
            <TabButton
              tab="MedicationMissedAlerts"
              label="Medication Missed"
              isActive={activeTab === "MedicationMissedAlerts"}
              onPress={() => setActiveTab("MedicationMissedAlerts")}
            />
          </View>
          <View style={styles.tabsRow}>
            <TabButton
              tab="MedicationAlerts"
              label="Medication Alerts"
              isActive={activeTab === "MedicationAlerts"}
              onPress={() => setActiveTab("MedicationAlerts")}
            />
            {/* Empty space to maintain grid layout */}
            <View style={styles.tabButton} />
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingBottom: FOOTER_HEIGHT + (insets.bottom > 0 ? insets.bottom + 16 : 16)
          }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards - Only shown for PatientsAlerts tab */}
        {renderStatsCards()}

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {renderContent()}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"alerts"} brandColor="#14b8a6" />
      </View>
      
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </View>
  );
};

// Update the PatientsAlertsTab props to receive alertsData
import PatientsAlertsTab from "./PatientsAlertsTab";
import MedicationMissedAlertsTab from "./MedicationMissedAlertsTab";
import MedicationAlertsTab from "./MedicationAlertsTab";

export default NurseAlerts;