// components/TestCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
}) => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const [progress, setProgress] = useState(status);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFirstButtonClick = async () => {
    if (progress !== "pending") return;
    
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      let response;
      if (test && loincCode) {
        // Walk-in test status update
        response = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "processing" },
          token,
        );
      } else {
        // Regular test status update
        response = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "processing" },
          token,
        );
      }
      
      if (response?.status === "success" || response?.message === "success") {
        setProgress("processing");
      }
    } catch (error) {
      console.error('Error updating test status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSecondButtonClick = () => {
    console.log("Upload button clicked for test:", testName);
    const navigationState: any = { 
      timeLineID, 
      testID, 
      testName,
      patientData: patientData  
    };

    if (test && loincCode) {
      navigationState.walkinID = walkinID;
      navigationState.loincCode = loincCode;
    }

    navigation.navigate("UploadTest", { 
      state: navigationState
    });
  };

  const StatusPill = ({ text, type }: { text: string; type: "completed" | "active" | "pending" }) => (
    <View style={[
      styles.statusPill,
      type === "completed" && styles.completedPill,
      type === "active" && styles.activePill,
      type === "pending" && styles.pendingPill,
    ]}>
      <Text style={styles.statusPillText}>{text}</Text>
    </View>
  );

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

      {/* Progress Timeline */}
      {expanded && (
        <View style={styles.progressCard}>
          {/* Step 1 - Received */}
          <View style={[styles.timelineItem, styles.completed]}>
            <View style={styles.dotWrapper}>
              <View style={[styles.dot, styles.completedDot]}>
                <CheckIcon size={16} color="#fff" />
              </View>
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.title}>Test Received</Text>
                <StatusPill text="Completed" type="completed" />
              </View>
            </View>
          </View>

          {/* Step 2 - Processing */}
          <View style={[
            styles.timelineItem,
            progress === "completed" && styles.completed,
            progress === "processing" && styles.active,
          ]}>
            <View style={styles.dotWrapper}>
              <TouchableOpacity
                style={[
                  styles.dot,
                  progress === "pending" && styles.clickableDot,
                  progress === "processing" && styles.activeDot,
                  progress === "completed" && styles.completedDot,
                ]}
                onPress={handleFirstButtonClick}
                disabled={loading || progress !== "pending"}
              >
                {loading ? (
                  <ActivityIndicator size={12} color="#fff" />
                ) : progress === "completed" ? (
                  <CheckIcon size={16} color="#fff" />
                ) : (
                  <AdjustIcon size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.title}>Processing</Text>
                {progress === "completed" ? (
                  <StatusPill text="Completed" type="completed" />
                ) : progress === "processing" ? (
                  <StatusPill text="In Progress" type="active" />
                ) : (
                  <StatusPill text="Pending" type="pending" />
                )}
              </View>
              {progress === "pending" && (
                <StepHint text="Click to start processing" />
              )}
            </View>
          </View>

          {/* Step 3 - Result */}
          <View style={[
            styles.timelineItem,
            progress === "completed" && styles.completed,
          ]}>
            <View style={styles.dotWrapper}>
              <TouchableOpacity
                style={[
                  styles.dot,
                  progress === "processing" && styles.clickableDot,
                  progress === "completed" && styles.completedDot,
                ]}
                onPress={handleSecondButtonClick}
                disabled={progress !== "processing" && progress !== "completed"}
              >
                {progress === "completed" ? (
                  <CheckIcon size={16} color="#fff" />
                ) : (
                  <AdjustIcon size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.title}>
                  {progress === "completed" ? "Result Submitted" : "Upload Result"}
                </Text>
                {progress === "completed" ? (
                  <StatusPill text="Submitted" type="completed" />
                ) : (
                  <StatusPill text="Pending" type="pending" />
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
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clickableDot: {
    backgroundColor: COLORS.brand,
  },
  activeDot: {
    backgroundColor: COLORS.info,
  },
  completedDot: {
    backgroundColor: COLORS.success,
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
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  completedPill: {
    backgroundColor: "#dcfce7",
  },
  activePill: {
    backgroundColor: "#dbeafe",
  },
  pendingPill: {
    backgroundColor: "#fef3c7",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.text,
  },
  stepHint: {
    fontSize: 11,
    color: COLORS.brand,
    fontStyle: "italic",
    marginTop: 4,
  },
});

export default TestCard;