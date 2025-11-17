// components/Notification/MedicineCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { AuthFetch, AuthPatch } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatTime } from "../../utils/dateTime";
import { 
  PillIcon, 
  SyringeIcon, 
  DropletIcon, 
  TestTubeIcon, 
  BandageIcon, 
  ActivityIcon, 
  WindIcon, 
  SquareIcon, 
  BeakerIcon 
} from "../../utils/SvgIcons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ReminderGroup = {
  dosageTime: string;
  reminders: any[];
  percentage?: number;
};

type MedicineCardProps = {
  medicineType: string;
  medicineName: string;
  timeOfMedication: string | undefined;
  timestamp?: string;
  givenAt?: string;
  status: "Completed" | "Pending" | "Not Required";
  day: string | null | undefined;
  medicineID: number | null;
  activeIndex: number;
  indexTime: number;
  reminderGroup: ReminderGroup[][];
  dosageTime: string;
  isToday?: boolean;
};

const MedicineCard: React.FC<MedicineCardProps> = ({
  medicineType,
  medicineName,
  timeOfMedication,
  givenAt = "------",
  status,
  day,
  medicineID,
  activeIndex,
  indexTime,
  reminderGroup,
  isToday = false,
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [loading, setLoading] = useState(false);

  const getMedicineIcon = () => {
    const iconProps = { 
      size: SCREEN_WIDTH < 375 ? 20 : 22, 
      color: "#14b8a6" 
    };
    
    switch (medicineType?.toLowerCase()) {
      case "capsules":
        return <PillIcon {...iconProps} />;
      case "tablets":
        return <SquareIcon {...iconProps} />;
      case "injections":
        return <SyringeIcon {...iconProps} />;
      case "drops":
        return <DropletIcon {...iconProps} />;
      case "tubing":
        return <TestTubeIcon {...iconProps} />;
      case "topical":
        return <BandageIcon {...iconProps} />;
      case "syrups":
        return <BeakerIcon {...iconProps} />;
      case "iv line":
        return <ActivityIcon {...iconProps} />;
      case "ventilator":
        return <WindIcon {...iconProps} />;
      default:
        return <PillIcon {...iconProps} />;
    }
  };

  const getMedicineColor = () => {
    switch (medicineType?.toLowerCase()) {
      case "capsules":
        return "#FFF0DA";
      case "tablets":
        return "#E4F8F8";
      case "injections":
        return "#F0F9FF";
      case "drops":
        return "#F0FDF4";
      case "tubing":
        return "#FFFBEB";
      case "topical":
        return "#FEF2F2";
      case "syrups":
        return "#E6F2FE";
      case "iv line":
        return "#F3E8FF";
      case "ventilator":
        return "#ECFDF5";
      default:
        return "#f8fafc";
    }
  };

  const handleStatusUpdate = async (newStatus: number) => {
    if (!medicineID) return;
    
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const payload = {
        userID: user?.id,
        doseStatus: newStatus,
        medicineID: medicineID,
        medicationTime: timeOfMedication || "",
      };

      const response = await AuthPatch(
        `medicineReminder/${medicineID}`,
        payload,
        token,
        "PATCH"
      );

      if (response?.status === "success" || response?.message === "success") {
        setSelectedStatus(
          newStatus === 1 ? "Completed" : newStatus === 2 ? "Not Required" : "Pending"
        );
        
        if (reminderGroup?.[activeIndex]?.[indexTime]) {
          const updatedReminders = reminderGroup[activeIndex][indexTime]?.reminders?.map(
            (reminder: any) =>
              reminder?.id === medicineID
                ? { ...reminder, doseStatus: newStatus }
                : reminder
          );
          
          reminderGroup[activeIndex][indexTime].reminders = updatedReminders;
          
          const completedCount = updatedReminders?.filter(
            (r: any) => r?.doseStatus === 1
          )?.length || 0;
          const percentage = (completedCount / (updatedReminders?.length || 1)) * 100;
          reminderGroup[activeIndex][indexTime].percentage = percentage;
        }
        
        Alert.alert("Success", "Medicine status updated successfully");
      } else {
        Alert.alert("Error", response?.message || response?.data?.message || "Failed to update status");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update medicine status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (selectedStatus) {
      case "Completed":
        return "#10b981";
      case "Not Required":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusBackgroundColor = () => {
    switch (selectedStatus) {
      case "Completed":
        return "#d1fae5";
      case "Not Required":
        return "#fee2e2";
      default:
        return "#f3f4f6";
    }
  };

  const isStatusDisabled = selectedStatus === "Completed" || selectedStatus === "Not Required" || !isToday;

  const formatDay = (dayStr: string | null | undefined) => {
    if (!dayStr) return "?/?";
    
    const parts = dayStr?.split('/');
    if (parts?.length === 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    
    return dayStr;
  };

  // Enhanced time formatting with fallback
  const formatTimeDisplay = (time: string | undefined) => {
    if (!time) return "--:--";
    
    // First try using the utils formatTime
    try {
      const formattedTime = formatTime(time);
      if (formattedTime && formattedTime !== '-') {
        return formattedTime;
      }
    } catch (error) {
      // Fallback to manual formatting if utils fails
    }
    
    // Manual fallback formatting
    const timeParts = time?.split(':');
    if (timeParts?.length >= 2) {
      const hours = timeParts[0]?.padStart(2, '0') || '00';
      const minutes = timeParts[1]?.padStart(2, '0') || '00';
      return `${hours}:${minutes}`;
    }
    
    return time || "--:--";
  };

  const formatGivenAtTime = (time: string | undefined) => {
    if (!time || time === "------" || time === "Not given yet") {
      return "Not given";
    }
    return formatTimeDisplay(time);
  };

  return (
    <View style={[styles.container, { backgroundColor: getMedicineColor() }]}>
      {/* Top Row - Medicine Name and Day Counter */}
      <View style={styles.topRow}>
        <View style={styles.nameContainer}>
          <Text style={styles.medicineName} numberOfLines={1}>
            {medicineName}
          </Text>
          <Text style={styles.medicineType} numberOfLines={1}>
            {medicineType}
          </Text>
        </View>
        <View style={styles.dayContainer}>
          <Text style={styles.dayText}>
            {formatDay(day)}
          </Text>
        </View>
      </View>

      {/* Middle Row - Icon and Time Information */}
      <View style={styles.middleRow}>
        <View style={styles.iconContainer}>
          {getMedicineIcon()}
        </View>
        
        {/* Time Information in single line */}
        <View style={styles.timeInfoContainer}>
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Scheduled: </Text>
            <Text style={styles.timeValue} numberOfLines={1}>
              {formatTimeDisplay(timeOfMedication)}
            </Text>
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Given At: </Text>
            <Text style={[
              styles.timeValue, 
              styles.givenAtText,
              givenAt === "Not given yet" || givenAt === "------" ? styles.notGivenText : {}
            ]} numberOfLines={1}>
              {formatGivenAtTime(givenAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Row - Status */}
      <View style={styles.bottomRow}>
        <Text style={styles.statusLabel}>Status</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#14b8a6" style={styles.statusLoader} />
        ) : (
          <TouchableOpacity
            style={[
              styles.statusButton,
              {
                backgroundColor: getStatusBackgroundColor(),
                opacity: isStatusDisabled ? 0.6 : 1,
              },
            ]}
            disabled={isStatusDisabled}
            onPress={() => {
              if (!isStatusDisabled) {
                Alert.alert(
                  "Update Status",
                  `Mark "${medicineName}" as:`,
                  [
                    { 
                      text: "Cancel", 
                      style: "cancel" 
                    },
                    { 
                      text: "Completed", 
                      onPress: () => handleStatusUpdate(1),
                      style: "default"
                    },
                    { 
                      text: "Not Required", 
                      onPress: () => handleStatusUpdate(2),
                      style: "destructive"
                    },
                  ]
                );
              }
            }}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor() },
              ]}
              numberOfLines={1}
            >
              {selectedStatus}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: SCREEN_WIDTH < 375 ? 12 : 16,
    marginBottom: 8,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    minHeight: SCREEN_WIDTH < 375 ? 140 : 150,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: SCREEN_WIDTH < 375 ? 10 : 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: SCREEN_WIDTH < 375 ? 8 : 10,
  },
  medicineName: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: "600",
    color: "#0f172a",
    lineHeight: SCREEN_WIDTH < 375 ? 20 : 22,
    marginBottom: 2,
  },
  medicineType: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "500",
    color: "#64748b",
    textTransform: "capitalize",
  },
  dayContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: SCREEN_WIDTH < 375 ? 8 : 10,
    paddingVertical: SCREEN_WIDTH < 375 ? 4 : 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    minWidth: SCREEN_WIDTH < 375 ? 45 : 50,
  },
  dayText: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 11,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SCREEN_WIDTH < 375 ? 12 : 14,
  },
  iconContainer: {
    width: SCREEN_WIDTH < 375 ? 36 : 40,
    height: SCREEN_WIDTH < 375 ? 36 : 40,
    borderRadius: SCREEN_WIDTH < 375 ? 18 : 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SCREEN_WIDTH < 375 ? 12 : 14,
    borderWidth: 1.5,
    borderColor: "rgba(20, 184, 166, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeInfoContainer: {
    flex: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SCREEN_WIDTH < 375 ? 4 : 6,
  },
  timeLabel: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "600",
    color: "#64748b",
    minWidth: SCREEN_WIDTH < 375 ? 70 : 75,
  },
  timeValue: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "500",
    color: "#374151",
    flex: 1,
    flexWrap: 'nowrap',
  },
  givenAtText: {
    color: "#6b7280",
    fontStyle: "italic",
  },
  notGivenText: {
    color: "#9ca3af",
    fontStyle: "normal",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SCREEN_WIDTH < 375 ? 8 : 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  statusLabel: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  statusLoader: {
    marginLeft: "auto",
  },
  statusButton: {
    paddingHorizontal: SCREEN_WIDTH < 375 ? 12 : 14,
    paddingVertical: SCREEN_WIDTH < 375 ? 6 : 8,
    borderRadius: 8,
    minWidth: SCREEN_WIDTH < 375 ? 80 : 90,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  statusText: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});

export default MedicineCard;