// components/Notification/MedicineCard.tsx
import React, { useState, useEffect, JSX } from "react";
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
import { AuthPatch } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatTime } from "../../utils/dateTime";
import {
  ActivityIcon, 
  BeakerIcon 
} from "../../utils/SvgIcons";
import {
  Droplets as SyrupIcon,
  PillIcon,
  FilterIcon,
  ScissorsLineDashed as TestTubeIcon,
  Syringe as SyringeIcon, 
  DropletIcon,
  BandageIcon,
  Circle as SquareIcon,
  WindIcon,
} from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor: number = 0.5) =>
  size + (scale(size) - size) * factor;

type ReminderGroup = {
  dosageTime: string;
  reminders: any[];
  percentage?: number;
};

type MedicineCardProps = {
  medicineType: number | string | null;
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
  isToday?: boolean;
  dosage?: string | number | null;
  givenBy?: string | null;
    onStatusChange?: (newStatus: number) => void;

};

const MedicineCard: React.FC<MedicineCardProps> = ({
  medicineType,
  medicineName,
  timeOfMedication,
  timestamp,
  givenAt = "------",
  status,
  day,
  medicineID,
  activeIndex,
  indexTime,
  reminderGroup,
  isToday = false,
  dosage,
  givenBy,
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [selectedStatus, setSelectedStatus] =
 useState<MedicineCardProps["status"]>(status);
  const [loading, setLoading] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [givenAtState, setGivenAtState] = useState<string | undefined>(givenAt);

  useEffect(() => {
    setGivenAtState(givenAt);
  }, [givenAt]);
  const isAfterStartTime = (): boolean => {
    if (!timeOfMedication) return false;
    
    try {
      let startTimeStr = timeOfMedication;
      if (timeOfMedication.includes(' - ')) {
        const parts = timeOfMedication.split(' - ');
        if (parts.length > 0) {
          startTimeStr = parts[0].trim();
        }
      }
      
      const currentTime = new Date();
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      
      // Parse the start time
      const parseTime = (timeStr: string): number => {
        let hours = 0;
        let minutes = 0;
        
        // Check for AM/PM
        const isPM = timeStr.toLowerCase().includes('pm');
        const isAM = timeStr.toLowerCase().includes('am');
        
        // Remove AM/PM and whitespace
        const cleanTime = timeStr.replace(/[apm\s]/gi, '').trim();
        const timeParts = cleanTime.split(':');
        
        if (timeParts.length === 2) {
          hours = parseInt(timeParts[0], 10);
          minutes = parseInt(timeParts[1], 10);
        } else if (timeParts.length === 1) {
          hours = parseInt(timeParts[0], 10);
        }
        
        // Convert to 24-hour format
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      };
      
      const startMinutes = parseTime(startTimeStr);
      return currentTotalMinutes >= startMinutes;
      
    } catch (error) {
      return true; 
    }
  };

  const getMedicineIcon = () => {
    const iconProps = { size: 20, color: "#14b8a6" };
    const typeNum = Number(medicineType);

    const icons: { [key: number]: JSX.Element } = {
      1: <PillIcon {...iconProps} />,       // Capsules
      2: <SyrupIcon {...iconProps} />,      // Syrups
      3: <SquareIcon {...iconProps} />,     // Tablets
      4: <SyringeIcon {...iconProps} />,    // Injections
      5: <ActivityIcon {...iconProps} />,   // IV line
      6: <TestTubeIcon {...iconProps} />,   // Tubing / tests
      7: <BandageIcon {...iconProps} />,    // Topical
      8: <DropletIcon {...iconProps} />,    // Drops
      9: <WindIcon {...iconProps} />,       // Ventilator
      10: <WindIcon {...iconProps} />,      // Ventilator / other
    };

    if (icons[typeNum]) return icons[typeNum];

    switch (String(medicineType)?.toLowerCase()) {
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

  const getMedicineTypeLabel = () => {
    const typeNum = Number(medicineType);
    const labels: { [key: number]: string } = {
      1: "Capsules",
      2: "Syrup",
      3: "Tablets",
      4: "Injection",
      5: "IV Line",
      6: "Tubing",
      7: "Topical",
      8: "Drops",
      9: "Ventilator",
      10: "Ventilator",
    };

    return labels[typeNum] || String(medicineType || "—");
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

    // Type definitions for API response
    type SuccessResponseData = {
      givenTime?: string;
      updatedReminder?: {
        givenTime?: string;
      };
      message?: string;
      status?: string;
    };

    type SuccessResponse = {
      status: "success";
      message?: string;
      data?: SuccessResponseData;
      givenTime?: string;
    };

    type ErrorResponse = {
      status: "error" | string;
      message: string;
      data?: {
        message?: string;
      };
    };

    type ApiResponse = SuccessResponse | ErrorResponse;

    // Make API call
    const response = await AuthPatch(
      `medicineReminder/${medicineID}`,
      payload,
      token
    );

    // Type assertion
    const apiResponse = response as ApiResponse;

    // Check for success
    const isSuccess = 
      apiResponse.status === "success" || 
      apiResponse.message === "success" ||
      (apiResponse as any)?.data?.status === "success";

    if (isSuccess) {
      const mappedStatus =
        newStatus === 1 ? "Completed" : newStatus === 2 ? "Not Required" : "Pending";
      setSelectedStatus(mappedStatus as MedicineCardProps["status"]);
      setStatusMenuOpen(false);
      
      // Extract givenTime safely with multiple fallbacks
      let responseGivenTime: string;
      
      // Better type checking using custom type guard
      const isSuccessResponse = (response: ApiResponse): response is SuccessResponse => {
        return response.status === "success" || response.message === "success";
      };

      if (isSuccessResponse(apiResponse)) {
        // Now TypeScript knows this is a SuccessResponse
        const successData = apiResponse.data;
        
        responseGivenTime = 
          successData?.givenTime ||
          successData?.updatedReminder?.givenTime ||
          apiResponse.givenTime ||
          new Date().toISOString();
      } else {
        // Fallback to current time if not a success response
        responseGivenTime = new Date().toISOString();
      }

      setGivenAtState(responseGivenTime);
      
      // Update local state
      if (reminderGroup?.[activeIndex]?.[indexTime]) {
        const timeSlot = reminderGroup[activeIndex][indexTime];
        if (timeSlot?.reminders) {
          const updatedReminders = timeSlot.reminders.map((reminder: any) =>
            reminder?.id === medicineID
              ? { ...reminder, doseStatus: newStatus, givenTime: responseGivenTime }
              : reminder
          );
          
          timeSlot.reminders = updatedReminders;
          
          const completedCount = updatedReminders.filter(
            (r: any) => r?.doseStatus === 1
          ).length || 0;
          const percentage = (completedCount / (updatedReminders.length || 1)) * 100;
          timeSlot.percentage = percentage;
        }
      }
    } else {
      // Safely extract error message
      let errorMessage = "Failed to update status";
      
      // Use type guard for error response
      const isErrorResponse = (response: ApiResponse): response is ErrorResponse => {
        return response.status !== "success" && response.message !== "success";
      };

      if (isErrorResponse(apiResponse)) {
        errorMessage = apiResponse.message || apiResponse.data?.message || errorMessage;
      }
      
      Alert.alert("Error", errorMessage);
    }
  } catch (error: any) {
    console.error("Medicine status update error:", error);
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

  const isStatusDisabled = selectedStatus === "Completed" || selectedStatus === "Not Required" || !isToday ||!isAfterStartTime();

  const formatDay = (dayStr: string | null | undefined) => {
    if (!dayStr) return "-";
    
    const parts = dayStr?.split("/");
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
      const formatted = formatTime(time);
      if (formatted && formatted !== '-')
       return formatted;
    } catch (e) {}
    const timeParts = time?.split(":");
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

  const renderDosage = () => {
    if (dosage === null || dosage === undefined || dosage === "") {
      return "-";
    }
    if (typeof dosage === "number") {
      return `${dosage} ml`;
    }
    return String(dosage);
  };

  const renderGivenBy = () => {
    if (!givenBy) return "-";
    return givenBy;
  };

  // Helper to extract just the start time for display
  const getStartTimeOnly = () => {
    if (!timeOfMedication) return "";
    
    if (timeOfMedication.includes(' - ')) {
      const parts = timeOfMedication.split(' - ');
      return parts[0].trim();
    }
    
    return timeOfMedication.trim();
  };

  return (
    <View style={styles.medicineCard}>
      <View style={styles.medicineCardRow}>
        {/* Icon avatar */}
        <View style={styles.medicineAvatar}>{getMedicineIcon()}</View>

        <View style={styles.medicineMeta}>
          {/* Name + type badge */}
          <View style={styles.medicineNameRow}>
          <Text style={styles.medicineCardName} numberOfLines={1}>
            {medicineName || " "}
          </Text>
          <Text style={styles.medicineTypeBadge} numberOfLines={1}>
            {getMedicineTypeLabel()}
          </Text>
        </View>
        <View style={styles.medicineInfoRow}>
          <Text style={styles.medicineInfoText}>
              Dosage:{" "}
              <Text style={styles.medicineInfoStrong}>{renderDosage()}</Text>
          </Text>
      </View>

          <View style={styles.medicineInfoRow}>
        <Text style={styles.medicineInfoText}>
              Given By:{" "}
              <Text style={styles.medicineInfoStrong}>{renderGivenBy()}</Text>
            </Text>
        </View>
          <View style={styles.medicineInfoRow}>
          <Text style={styles.medicineInfoText}>
              Medication Time:{" "}
            <Text style={styles.medicineInfoStrong}>
              {timeOfMedication || "-"}
            </Text>
            </Text>
          </View>
          <View style={styles.medicineInfoRow}>
            <Text style={styles.medicineInfoText}>Given At:{" "}
            <Text style={[
              styles.medicineInfoStrong,
                  (!givenAtState ||
              givenAtState === "Not given yet" || givenAtState === "------") && styles.notGivenText,
            ]}
              >
              {formatGivenAtTime(givenAtState)}
              </Text>
            </Text>
      </View>

      {/* Bottom Row - Status */}
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#14b8a6" />
        ) : (
          <View style={styles.dropdownWrapper}>
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
                setStatusMenuOpen((prev) => !prev);
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
                  {!isStatusDisabled && (
                    <Text style={styles.statusArrow}>
                      {statusMenuOpen ? "▲" : "▼"}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Dropdown menu */}
                {statusMenuOpen && !isStatusDisabled && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleStatusUpdate(1)}
                    >
                      <Text style={styles.dropdownItemText}>Completed</Text>
                    </TouchableOpacity>
                    <View style={styles.dropdownDivider} />
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleStatusUpdate(2)}
                    >
                      <Text style={styles.dropdownItemText}>Not Required</Text>
          </TouchableOpacity>
                  </View>
                )}

                {/* Tooltip for why dropdown is disabled */}
                {isStatusDisabled && !(selectedStatus === "Completed" || selectedStatus === "Not Required") && (
                  <Text style={styles.disabledTooltip}>
                    Available from {getStartTimeOnly()}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  medicineCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medicineCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  medicineAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#f8fafc",
  },
  medicineMeta: {
    flex: 1,
    minHeight: 60,
  },
  medicineNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  medicineCardName: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
    color: "#0f172a",
  },
  medicineTypeBadge: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: "700",
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: "#0f766e",
    maxWidth: 110,
    textAlign: "right",
  },
  medicineInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },
  medicineInfoText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    color: "#64748b",
  },
  medicineInfoStrong: {
    fontWeight: "700",
    color: "#0f172a",
  },
  notGivenText: {
    color: "#9ca3af",
    fontWeight: "500",
  },
  statusRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  dropdownWrapper: {
    flexShrink: 1,
    alignItems: "flex-end",
  },
  statusButton: {
    paddingHorizontal: SCREEN_WIDTH < 375 ? 12 : 14,
    paddingVertical: SCREEN_WIDTH < 375 ? 6 : 8,
    borderRadius: 8,
    minWidth: SCREEN_WIDTH < 375 ? 110 : 120,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  statusText: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statusArrow: {
    fontSize: 10,
    marginLeft: 6,
    color: "#6b7280",
  },
  dropdownMenu: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    minWidth: 140,
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdownItemText: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "500",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  disabledTooltip: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default MedicineCard;