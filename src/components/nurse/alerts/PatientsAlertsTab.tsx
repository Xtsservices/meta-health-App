import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { AlertType } from "../../../utils/types";
import { AuthFetch, AuthPatch } from "../../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showError } from "../../../store/toast.slice";
import AllAlerts from "../../Alerts/AlertsIpd/AllAlerts";
import WatchedAlerts from "../../Alerts/AlertsIpd/WatchedAlerts";

const styles = {
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 6,
    marginHorizontal: 1,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#14b8a6",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonInactive: {
    backgroundColor: "transparent",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Inter-Medium",
  },
  tabTextActive: {
    color: "#14b8a6",
    fontWeight: "600",
  },
  tabTextInactive: {
    color: "#64748b",
  },
  tabBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Inter-Medium",
  },
};

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
      activeOpacity={0.7}
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

const PatientsAlertsTab: React.FC<{ 
  navigation: any; 
  user: any;
  refreshing: boolean;
  onRefresh: () => void;
}> = ({ navigation, user, refreshing, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<"all" | "watched">("all");
  const [loading, setLoading] = useState(true);
  
  const [highPriority, setHighPriority] = useState<AlertType[]>([]);
  const [mediumPriority, setMediumPriority] = useState<AlertType[]>([]);
  const [lowPriority, setLowPriority] = useState<AlertType[]>([]);
  const [watchedHighPriority, setWatchedHighPriority] = useState<AlertType[]>([]);
  const [watchedMediumPriority, setWatchedMediumPriority] = useState<AlertType[]>([]);
  const [watchedLowPriority, setWatchedLowPriority] = useState<AlertType[]>([]);

  // State to track all alerts for calculations
  const [allAlerts, setAllAlerts] = useState<AlertType[]>([]);

  const getAlertData = useCallback(async () => {
    try {
      setLoading(true);
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const response = await AuthFetch(`nurse/alerts/${user.hospitalID}/${user.role}`, token);
      
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
            doctorName: el.docotorName || el.doctorName || "",
            alertType: el.alertType || "",
            index: el.index || 0,
            token: el.token || "",
          })) || [];

        // Process alerts from all sources
        const highPriorityData = processAlerts(response?.data?.data?.HighPriorityData ?? []);
        const mediumPriorityData = processAlerts(response?.data?.data?.MediumPriorityData ?? []);
        const lowPriorityData = processAlerts(response?.data?.data?.LowPriorityData ?? []);
        const mainAlerts = processAlerts(response?.data?.alerts ?? []);

        // Combine all alerts and remove duplicates by id
        const allAlertsCombined = [...highPriorityData, ...mediumPriorityData, ...lowPriorityData, ...mainAlerts];
        const uniqueAlerts = allAlertsCombined.filter((alert, index, self) =>
          index === self.findIndex(a => a.id === alert.id)
        );

        setAllAlerts(uniqueAlerts);

        // Filter into seen and unseen based on priority
        const highUnseen = uniqueAlerts.filter(alert => 
          alert.priority === "High" && alert.seen === 0
        );
        const mediumUnseen = uniqueAlerts.filter(alert => 
          alert.priority === "Medium" && alert.seen === 0
        );
        const lowUnseen = uniqueAlerts.filter(alert => 
          alert.priority === "Low" && alert.seen === 0
        );

        const highSeen = uniqueAlerts.filter(alert => 
          alert.priority === "High" && alert.seen === 1
        );
        const mediumSeen = uniqueAlerts.filter(alert => 
          alert.priority === "Medium" && alert.seen === 1
        );
        const lowSeen = uniqueAlerts.filter(alert => 
          alert.priority === "Low" && alert.seen === 1
        );

        // Set states
        setHighPriority(highUnseen);
        setMediumPriority(mediumUnseen);
        setLowPriority(lowUnseen);
        setWatchedHighPriority(highSeen);
        setWatchedMediumPriority(mediumSeen);
        setWatchedLowPriority(lowSeen);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to fetch alerts';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.token]);

  const handleIsSeen = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        showError("Authentication token not found");
        return;
      }
      
      // Update the alert as seen
      await AuthPatch(`alerts/hospital/${id}`, { seen: 1 }, token);
      
      // Update local state immediately for better UX
      setAllAlerts(prev => 
        prev.map(alert => 
          alert.id === id ? { ...alert, seen: 1 } : alert
        )
      );

      // Move alert from unseen to watched arrays based on priority
      const allAlertsCopy = [...allAlerts];
      const alertIndex = allAlertsCopy.findIndex(a => a.id === id);
      
      if (alertIndex !== -1) {
        const alert = allAlertsCopy[alertIndex];
        
        // Remove from unseen arrays
        if (alert.priority === "High") {
          setHighPriority(prev => prev.filter(a => a.id !== id));
        } else if (alert.priority === "Medium") {
          setMediumPriority(prev => prev.filter(a => a.id !== id));
        } else if (alert.priority === "Low") {
          setLowPriority(prev => prev.filter(a => a.id !== id));
        }
        
        // Add to watched arrays
        if (alert.priority === "High") {
          setWatchedHighPriority(prev => [...prev, { ...alert, seen: 1 }]);
        } else if (alert.priority === "Medium") {
          setWatchedMediumPriority(prev => [...prev, { ...alert, seen: 1 }]);
        } else if (alert.priority === "Low") {
          setWatchedLowPriority(prev => [...prev, { ...alert, seen: 1 }]);
        }
      }

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to update alert status';
      showError(errorMessage);
    }
  };

  // Calculate counts
  const calculateCounts = useCallback(() => {
    const allCount = highPriority.length + mediumPriority.length + lowPriority.length;
    const watchedCount = watchedHighPriority.length + watchedMediumPriority.length + watchedLowPriority.length;
    
    return { allCount, watchedCount };
  }, [highPriority, mediumPriority, lowPriority, watchedHighPriority, watchedMediumPriority, watchedLowPriority]);

  const { allCount, watchedCount } = calculateCounts();

  useEffect(() => {
    getAlertData();
  }, [getAlertData]);

  // Refresh when parent component triggers refresh
  useEffect(() => {
    if (refreshing) {
      getAlertData();
      onRefresh(); // Call parent's onRefresh to reset refreshing state
    }
  }, [refreshing]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading Patient Alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    </View>
  );
};

export default PatientsAlertsTab;