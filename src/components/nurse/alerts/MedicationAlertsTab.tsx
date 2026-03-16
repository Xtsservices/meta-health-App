import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showError } from "../../../store/toast.slice";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";

interface MedicationAlert {
  patientId: number;
  pName: string;
  ward: string;
  department: string;
  medicationTime: string;
  dosageTimes: string;
  timeLine: number;
}

const MedicationAlertsTab: React.FC<{
  navigation: any;
  refreshing: boolean;
  onRefresh: () => void;
}> = ({ navigation, refreshing, onRefresh }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);
  const [alerts, setAlerts] = useState<MedicationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setTokenError(true);
        dispatch(showError('Not authorized. Please login again.'));
        return false;
      }
      return true;
    } catch (error) {
      dispatch(showError('Authentication check failed'));
      return false;
    }
  }, [dispatch]);

  const fetchMedicationAlerts = useCallback(async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const response = await AuthFetch(
        `nurse/getpatientsmedicationalerts/${user?.hospitalID}/${user?.role}`,
        token
      ) as any;

      if (response?.status === "success") {
        setAlerts(response?.data?.data?.medicationAlerts || []);
      } else {
        dispatch(showError('Failed to fetch medication alerts'));
      }
    } catch (error: any) {
      dispatch(
        showError(
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch medication alerts"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [user, dispatch, checkAuth]);

  useEffect(() => {
    fetchMedicationAlerts();
  }, [fetchMedicationAlerts]);

  useEffect(() => {
    if (refreshing) {
      fetchMedicationAlerts();
      onRefresh?.();
    }
  }, [refreshing, fetchMedicationAlerts, onRefresh]);

  const handleViewPatient = (patientId: number, patientName: string, timeLine: number) => {
    navigation.navigate("NotificationScreen", {
      timelineID: timeLine,
      patientName: patientName,
      patientId: patientId,
    });
  };

  if (loading && alerts?.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading Medication Alerts...</Text>
      </View>
    );
  }

  if (tokenError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Not authorized. Please login again.</Text>
      </View>
    );
  }

  if (alerts?.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Medication Alerts</Text>
        <Text style={styles.emptySubtitle}>
          All medications are on schedule
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {alerts?.map((alert, index) => (
        <View key={`${alert?.patientId}-${index}`} style={styles.card}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{alert?.pName}</Text>
              <Text style={styles.subText}>
                ID: {alert?.patientId} • Ward: {alert?.ward}
              </Text>
            </View>

            <View style={styles.statusChip}>
              <Text style={styles.statusText}>Scheduled</Text>
            </View>
          </View>

          {/* DEPARTMENT */}
          {alert?.department && (
            <Text style={styles.departmentText}>
              Department: {alert?.department}
            </Text>
          )}

          {/* SCHEDULE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medication Schedule</Text>

            {alert?.medicationTime?.split(",").map((block, i) => (
              <View key={i} style={{ marginBottom: 4 }}>
                {block?.split("\n").map((line, j) => (
                  <Text key={j} style={styles.scheduleText}>
                    {j === 0 ? "🕒 " : " - "}
                    {line?.trim()}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          {/* ACTION ROW */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewPatient(
                alert?.patientId,
                alert?.pName,
                alert?.timeLine
              )}
              activeOpacity={0.7}
            >
              <Text style={styles.viewButtonText}>View Medications</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  errorContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  subText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  statusChip: {
    backgroundColor: "#d1fae5",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  departmentText: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
    fontStyle: "italic",
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewButton: {
    backgroundColor: "#14b8a6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default MedicationAlertsTab;