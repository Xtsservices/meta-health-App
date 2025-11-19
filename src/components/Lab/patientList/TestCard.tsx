// components/TestCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Icons
import {
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  AdjustIcon,
} from "../../../utils/SvgIcons";
import { RootState } from "../../../store/store";
import { AuthPost } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";

// Colors
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6",
  gradientStart: "#14b8a6",
  gradientEnd: "#0d9488",
  gradientWarningStart: "#f59e0b",
  gradientWarningEnd: "#ea580c",
  gradientSuccessStart: "#10b981",
  gradientSuccessEnd: "#059669",
  gradientProcessingStart: "#3b82f6",
  gradientProcessingEnd: "#1d4ed8",
};

type TestCardProps = {
  testName: string;
  timeLineID: number;
  status: string;
  testID: number;
  date: string;
  prescriptionURL?: string;
  test?: string;
  loincCode?: string;
  walkinID?: number;
  patientData?: any;
  onStatusChange?: () => void;
};

// Gradient Status Pill Component
const GradientStatusPill: React.FC<{ 
  text: string; 
  type: "completed" | "active" | "pending" 
}> = ({ text, type }) => {
  const getGradientColors = () => {
    switch (type) {
      case "completed":
        return [COLORS.gradientSuccessStart, COLORS.gradientSuccessEnd];
      case "active":
        return [COLORS.gradientProcessingStart, COLORS.gradientProcessingEnd];
      case "pending":
        return [COLORS.gradientWarningStart, COLORS.gradientWarningEnd];
      default:
        return [COLORS.sub, COLORS.sub];
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={styles.gradientPill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text style={styles.gradientPillText}>{text}</Text>
    </LinearGradient>
  );
};

// Gradient Dot Component
const GradientDot: React.FC<{ 
  type: "completed" | "active" | "pending";
  isClickable?: boolean;
  onPress?: () => void;
  loading?: boolean;
}> = ({ type, isClickable = false, onPress, loading = false }) => {
  const getGradientColors = () => {
    switch (type) {
      case "completed":
        return [COLORS.gradientSuccessStart, COLORS.gradientSuccessEnd];
      case "active":
        return [COLORS.gradientProcessingStart, COLORS.gradientProcessingEnd];
      case "pending":
        return [COLORS.gradientWarningStart, COLORS.gradientWarningEnd];
      default:
        return [COLORS.sub, COLORS.sub];
    }
  };

  const DotContent = () => {
    if (loading) {
      return <ActivityIndicator size={12} color="#fff" />;
    }
    
    switch (type) {
      case "completed":
        return <CheckIcon size={16} color="#fff" />;
      case "active":
      case "pending":
        return <AdjustIcon size={16} color="#fff" />;
      default:
        return <AdjustIcon size={16} color="#fff" />;
    }
  };

  const dotStyle = [
    styles.gradientDot,
    isClickable && styles.clickableDot,
  ];

  if (onPress && isClickable) {
    return (
      <TouchableOpacity onPress={onPress} disabled={loading}>
        <LinearGradient
          colors={getGradientColors()}
          style={dotStyle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <DotContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={dotStyle}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <DotContent />
    </LinearGradient>
  );
};

const TestCard: React.FC<TestCardProps> = ({
  testName,
  timeLineID,
  status,
  testID,
  date,
  test,
  loincCode,
  walkinID,
  patientData,
  onStatusChange,
}) => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const [progress, setProgress] = useState(status);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // EXACT SAME LOGIC AS WEB - Handle processing status update
  const handleFirstButtonClick = async () => {
    if (progress !== "pending") return;
    
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      let response;
      
      // EXACT SAME API CALLS AS WEB
      if (test && loincCode) {
        // Walk-in test status update - EXACT SAME AS WEB
        response = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "processing" },
          token,
        );
      } else {
        // Regular test status update - EXACT SAME AS WEB
        response = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "processing" },
          token,
        );
      }
      
      // EXACT SAME RESPONSE HANDLING AS WEB
      if (response?.data?.message === "success" || response?.data?.message === "success") {
        setProgress("processing");
        // Refresh parent component to reflect changes
        if (onStatusChange) {
          onStatusChange();
        }
        Alert.alert("Success", "Test status updated to processing");
      } else {
        Alert.alert("Error", "Failed to update test status");
      }
    } catch (error: any) {
      console.error('Error updating test status:', error);
      Alert.alert("Error", error?.message || "Failed to update test status");
    } finally {
      setLoading(false);
    }
  };

  // EXACT SAME LOGIC AS WEB - Navigate to upload
  const handleSecondButtonClick = () => {
    console.log("Upload button clicked for test:", testName);
    
    // EXACT SAME NAVIGATION STATE AS WEB
    const navigationState: any = { 
      timeLineID, 
      testID, 
      testName,
      patientData: patientData  
    };

    // EXACT SAME CONDITIONAL LOGIC AS WEB
    if (test && loincCode) {
      navigationState.walkinID = walkinID;
      navigationState.loincCode = loincCode;
    }

    // Navigate to upload screen - EXACT SAME AS WEB
    navigation.navigate("UploadTest", { 
      state: navigationState
    });
  };

  const StepHint = ({ text }: { text: string }) => (
    <Text style={styles.stepHint}>{text}</Text>
  );

  return (
    <View style={styles.testCard}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.testInfo}>
          <Text style={styles.testName}>{testName}</Text>
          <Text style={styles.testDate}>{formatDateTime(date)}</Text>
        </View>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => setExpanded(!expanded)}
        >
          <EyeIcon size={16} color={COLORS.text} />
          <Text style={styles.viewButtonText}>
            {expanded ? "Hide" : "View"}
          </Text>
          {expanded ? (
            <ChevronUpIcon size={16} color={COLORS.text} />
          ) : (
            <ChevronDownIcon size={16} color={COLORS.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Timeline - EXACT SAME VISUAL STRUCTURE AS WEB */}
      {expanded && (
        <View style={styles.progressCard}>
          {/* Step 1 - Received - EXACT SAME AS WEB */}
          <View style={[styles.timelineItem, styles.completed]}>
            <View style={styles.dotWrapper}>
              <GradientDot type="completed" />
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.title}>Test Received</Text>
                <GradientStatusPill text="Completed" type="completed" />
              </View>
            </View>
          </View>

          {/* Step 2 - Processing - EXACT SAME AS WEB */}
          <View style={[
            styles.timelineItem,
            progress === "completed" && styles.completed,
            progress === "processing" && styles.active,
          ]}>
            <View style={styles.dotWrapper}>
              <GradientDot 
                type={
                  progress === "completed" ? "completed" :
                  progress === "processing" ? "active" : "pending"
                }
                isClickable={progress === "pending"}
                onPress={handleFirstButtonClick}
                loading={loading}
              />
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.title}>Processing</Text>
                {progress === "completed" ? (
                  <GradientStatusPill text="Completed" type="completed" />
                ) : progress === "processing" ? (
                  <GradientStatusPill text="In Progress" type="active" />
                ) : (
                  <GradientStatusPill text="Pending" type="pending" />
                )}
              </View>
              {progress === "pending" && (
                <StepHint text="Click to start processing" />
              )}
            </View>
          </View>

          {/* Step 3 - Result - EXACT SAME AS WEB */}
          <View style={[
            styles.timelineItem,
            progress === "completed" && styles.completed,
          ]}>
            <View style={styles.dotWrapper}>
              <GradientDot 
                type={progress === "completed" ? "completed" : "pending"}
                isClickable={progress === "processing"}
                onPress={handleSecondButtonClick}
              />
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.title}>
                  {progress === "completed" ? "Result Submitted" : "Upload Result"}
                </Text>
                {progress === "completed" ? (
                  <GradientStatusPill text="Submitted" type="completed" />
                ) : (
                  <GradientStatusPill text="Pending" type="pending" />
                )}
              </View>
              {progress === "processing" && (
                <StepHint text="Click to upload results" />
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  testCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  testDate: {
    fontSize: 12,
    color: COLORS.sub,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  progressCard: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  completed: {
    opacity: 1,
  },
  active: {
    opacity: 1,
  },
  dotWrapper: {
    marginRight: 12,
    marginTop: 2,
  },
  gradientDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  clickableDot: {
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  gradientPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  gradientPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  stepHint: {
    fontSize: 11,
    color: COLORS.brand,
    fontStyle: "italic",
    marginTop: 4,
  },
});

export default TestCard;