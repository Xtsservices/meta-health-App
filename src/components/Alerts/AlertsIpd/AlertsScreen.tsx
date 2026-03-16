// AlertsScreen.tsx
import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPatch } from "../../../auth/auth";

import { BellIcon, MenuIcon } from "../../../utils/SvgIcons";
import { RESPONSIVE, styles } from "./AlertsStyles";
import { AlertType } from "../../../utils/types";
import Footer from "../../dashboard/footer";
import { useDispatch } from 'react-redux';
import { showError } from "../../../store/toast.slice";
import AllAlerts from "./AllAlerts";
import WatchedAlerts from "./WatchedAlerts";

const TabButton: React.FC<{
  title: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}> = ({ title, count, isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonInactive]}
      onPress={onPress}
    >
      <View style={styles.tabContent}>
        <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
          {title}
        </Text>
        {count > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        )}
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

const AlertsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"all" | "watched">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [highPriority, setHighPriority] = useState<AlertType[]>([]);
  const [mediumPriority, setMediumPriority] = useState<AlertType[]>([]);
  const [lowPriority, setLowPriority] = useState<AlertType[]>([]);
  const [watchedHighPriority, setWatchedHighPriority] = useState<AlertType[]>([]);
  const [watchedMediumPriority, setWatchedMediumPriority] = useState<AlertType[]>([]);
  const [watchedLowPriority, setWatchedLowPriority] = useState<AlertType[]>([]);

  const [allCount, setAllCount] = useState(0);
  const [watchedCount, setWatchedCount] = useState(0);

  const totalAlerts = allCount;
  const criticalAlerts = highPriority?.length ?? 0;
  const activeAlerts = mediumPriority?.length ?? 0;
  const routineAlerts = lowPriority?.length ?? 0;

  const FOOTER_HEIGHT = 70; // Add footer height constant
  const dispatch = useDispatch();
  const getAlertData = useCallback(async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const response = await AuthFetch(`alerts/hospital/${user.hospitalID}`, token);
      
      if (response?.status === "success" && "data" in response && response?.data?.message === "success") {
        const processAlerts = (alerts: any[]): AlertType[] =>
          alerts?.map((el: any) => ({
            id: el.id,
            patientName: el.patientName || "Unknown",
            alertMessage: el.alertMessage || "",
            alertValue: el.alertValue || "",
            ward: el.ward || "",
            datetime: el.datetime || el.addedOn,
            addedOn: el.addedOn,
            seen: el.seen || 0,
            patientID: el.patientID || 0,
            hospitalID: el.hospitalID || user.hospitalID,
            state: el.state || "",
            city: el.city || "",
            nurseName: el.nurseName || "",
            priority: el.priority || "Medium",
            // Provide defaults for missing properties
            doctorName: el.doctorName || "",
            alertType: el.alertType || "",
            index: el.index || 0,
            token: el.token || "",
          })) || [];

        const highPriorityData = processAlerts(response?.data?.HighPriorityData ?? []);
        const mediumPriorityData = processAlerts(response?.data?.MediumPriorityData ?? []);
        const lowPriorityData = processAlerts(response?.data?.LowPriorityData ?? []);
        
        const allAlerts = processAlerts(response?.data?.alerts ?? []);
        const watchedHighData = allAlerts?.filter(alert => alert.priority === "High" && alert.seen === 1) ?? [];
        const watchedMediumData = allAlerts?.filter(alert => alert.priority === "Medium" && alert.seen === 1) ?? [];
        const watchedLowData = allAlerts?.filter(alert => alert.priority === "Low" && alert.seen === 1) ?? [];

        setHighPriority(highPriorityData);
        setMediumPriority(mediumPriorityData);
        setLowPriority(lowPriorityData);
        setWatchedHighPriority(watchedHighData);
        setWatchedMediumPriority(watchedMediumData);
        setWatchedLowPriority(watchedLowData);

        const allCount = highPriorityData.length + mediumPriorityData.length + lowPriorityData.length;
        const watchedCount = watchedHighData.length + watchedMediumData.length + watchedLowData.length;
        
        setAllCount(allCount);
        setWatchedCount(watchedCount);
      }
    } catch (error: any) {
  const errorMessage = error?.response?.data?.message || 
                      error?.message || 
                      'Failed to fetch alerts';
  dispatch(showError(errorMessage));
}finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.hospitalID, user?.token]);

  const handleIsSeen = async (id: number) => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      await AuthPatch(`alerts/hospital/${id}`, {}, token);
      getAlertData();
} catch (error: any) {
  const errorMessage = error?.response?.data?.message || 
                      error?.message || 
                      'Failed to fetch alerts';
  dispatch(showError(errorMessage));
}
  };

  const onRefresh = () => {
    setRefreshing(true);
    getAlertData();
  };

  useEffect(() => {
    getAlertData();
  }, [getAlertData]);

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
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.containerContent,
          { 
            paddingBottom: FOOTER_HEIGHT + (insets.bottom > 0 ? insets.bottom + 16 : 16)
          }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
{/* Stats Cards - 2x2 Grid */}
<View style={styles.statsGrid}>
  {/* Top Row - Two cards side by side */}
  <View style={styles.statsRow}>
    <StatsCard
      title="Total Alerts"
      value={totalAlerts}
      color="#3b82f6"
      backgroundColor="#ffffff"
      icon={<BellIcon size={RESPONSIVE.icon.md} color="#3b82f6" />}
    />
    <StatsCard
      title="Immediate Attention"
      value={criticalAlerts}
      color="#dc2626"
      backgroundColor="#ffffff"
      icon={<BellIcon size={RESPONSIVE.icon.md} color="#dc2626" />}
    />
  </View>
  
  {/* Bottom Row - Two cards side by side */}
  <View style={styles.statsRow}>
    <StatsCard
      title="Monitor Closely"
      value={activeAlerts}
      color="#ca8a04"
      backgroundColor="#ffffff"
      icon={<BellIcon size={RESPONSIVE.icon.md} color="#ca8a04" />}
    />
    <StatsCard
      title="Routine Alerts"
      value={routineAlerts}
      color="#16a34a"
      backgroundColor="#ffffff"
      icon={<BellIcon size={RESPONSIVE.icon.md} color="#16a34a" />}
    />
  </View>
</View>

        <View style={styles.tabsContainer}>
          <TabButton
            title="All Alerts"
            count={allCount}
            isActive={activeTab === "all"}
            onPress={() => setActiveTab("all")}
          />
          <TabButton
            title="Watched Alerts"
            count={watchedCount}
            isActive={activeTab === "watched"}
            onPress={() => setActiveTab("watched")}
          />
        </View>

        {activeTab === "all" ? (
          <AllAlerts
            HighPriorityData={highPriority}
            MediumPriorityData={mediumPriority}
            LowPriorityData={lowPriority}
            handleIsSeen={handleIsSeen}
            navigation={navigation}
          />
        ) : (
          <WatchedAlerts
            HighPriorityData={watchedHighPriority}
            MediumPriorityData={watchedMediumPriority}
            LowPriorityData={watchedLowPriority}
            handleIsSeen={handleIsSeen}
            navigation={navigation}
          />
        )}
      </ScrollView>

      {/* Add Footer here */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"alerts"} brandColor="#14b8a6" />
      </View>
      
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </View>
  );
};

export default AlertsScreen;