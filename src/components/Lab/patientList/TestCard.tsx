import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Icons (your SVG icons)
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
import { showError, showSuccess } from "../../../store/toast.slice";
import { COLORS } from "../../../utils/colour";



type TestCardProps = {
  testName: string;
  timeLineID: number;
  status: string;
  testID: number | string;
  date: string;
  prescriptionURL?: string;
  test?: any; // if passed as object
  loincCode?: string | number;
  walkinID?: number;
  patientData?: any;
  onStatusChange?: () => void;
};

const GradientStatusPill: React.FC<{ text: string; type: "completed" | "active" | "pending" }> = ({ text, type }) => {
  const getGradientColors = () => {
    switch (type) {
      case "completed": return [COLORS.gradientSuccessStart, COLORS.gradientSuccessEnd];
      case "active": return [COLORS.gradientProcessingStart, COLORS.gradientProcessingEnd];
      case "pending": return [COLORS.gradientWarningStart, COLORS.gradientWarningEnd];
      default: return [COLORS.sub, COLORS.sub];
    }
  };

  return (
    <LinearGradient colors={getGradientColors()} style={styles.gradientPill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <Text style={styles.gradientPillText}>{text}</Text>
    </LinearGradient>
  );
};

const GradientDot: React.FC<{ 
  type: "completed" | "active" | "pending";
  isClickable?: boolean;
  onPress?: () => void;
  loading?: boolean;
}> = ({ type, isClickable = false, onPress, loading = false }) => {
  const getGradientColors = () => {
    switch (type) {
      case "completed": return [COLORS.gradientSuccessStart, COLORS.gradientSuccessEnd];
      case "active": return [COLORS.gradientProcessingStart, COLORS.gradientProcessingEnd];
      case "pending": return [COLORS.gradientWarningStart, COLORS.gradientWarningEnd];
      default: return [COLORS.sub, COLORS.sub];
    }
  };

  const DotContent = () => {
    if (loading) return <ActivityIndicator size={12} color="#fff" />;
    if (type === "completed") return <CheckIcon size={16} color="#fff" />;
    return <AdjustIcon size={16} color="#fff" />;
  };

  if (!isClickable) {
    return (
      <LinearGradient colors={getGradientColors()} style={[styles.gradientDot, styles.disabledDot]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <DotContent />
      </LinearGradient>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={loading}>
      <LinearGradient colors={getGradientColors()} style={styles.gradientDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <DotContent />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const TestCard: React.FC<TestCardProps> = ({ testName, timeLineID, status, testID, date, test, loincCode, walkinID, patientData, onStatusChange }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);

  // Use test.status if present (test-level status should take precedence)
  const initialStatus = test?.status ?? status ?? "pending";
  const [progress, setProgress] = useState<string>(initialStatus);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // keep in sync when parent updates status
  useEffect(() => {
    const next = test?.status ?? status ?? "pending";
    setProgress(next);
  }, [status, test?.status]);

  // Helper to detect success across server response shapes
  const isResponseSuccess = (response: any) => {
    return (
      response !== undefined &&
      (
        response?.data?.message === "success" ||
        response?.message === "success" ||
        response?.data?.status === 200 ||
        response?.status === 200
      )
    );
  };

  // Start processing (Step 2)
  const handleStartProcessing = async () => {
    if (progress !== "pending") return;

    try {
      setLoading(true);
      // optimistic update
      setProgress("processing");

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        setProgress("pending");
        setLoading(false);
        return;
      }

      let response;
      // If loincCode + test exist -> treat as walkin / loinc route
      if (test?.test) {
        response = await AuthPost(`test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`, { status: "processing" }, token);
      } else {
        // regular test endpoint expects testID (the test record id)
        response = await AuthPost(`test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`, { status: "processing" }, token);
      }

      if (isResponseSuccess(response)) {
        // notify parent to refresh list from server
        if (typeof onStatusChange === "function") onStatusChange();
        dispatch(showSuccess("Test status set to processing."));
        // leave progress as "processing" until parent refresh signals otherwise
      } else {
        // revert optimistic update
        setProgress("pending");
        dispatch(showError("Unable to start processing (server returned failure)."));
      }
    } catch (err: any) {
      setProgress("pending");
      dispatch(showError(err?.message ?? "Failed to start processing."));
    } finally {
      setLoading(false);
    }
  };

  // Navigate to upload screen but DO NOT set completed here permanently.
  // We pass a callback so UploadTest can notify us after a successful upload+server-update.
  const handleGoToUpload = () => {
    if (progress !== "processing") return;

    const navigationState: any = { timeLineID, testID, testName, patientData };
    if (loincCode && walkinID) {
      navigationState.walkinID = walkinID;
      navigationState.loincCode = loincCode;
    }

    navigation.navigate("UploadTest", {
      state: navigationState,
      // UploadTest must call this when upload+server update succeeds:
      onUploadComplete: (success: boolean) => {
        if (success) {
          // temporary optimistic UI change; parent refresh will validate
          setProgress("completed");
          if (typeof onStatusChange === "function") onStatusChange();
        } else {
          // keep in processing state - UploadTest should show failure messages
        }
      }
    });
  };

  const StepHint = ({ text }: { text: string }) => <Text style={styles.stepHint}>{text}</Text>;

  return (
    <View style={styles.testCard}>
      <View style={styles.header}>
        <View style={styles.testInfo}>
          <Text style={styles.testName}>{testName}</Text>
          <Text style={styles.testDate}>{formatDateTime(date)}</Text>
        </View>

        <TouchableOpacity style={styles.viewButton} onPress={() => setExpanded(!expanded)}>
          <EyeIcon size={16} color={COLORS.text} />
          <Text style={styles.viewButtonText}>{expanded ? "Hide" : "View"}</Text>
          {expanded ? <ChevronUpIcon size={16} color={COLORS.text} /> : <ChevronDownIcon size={16} color={COLORS.text} />}
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.progressCard}>
          {/* Step 1 - Received (always completed) */}
          <View style={[styles.timelineItem]}>
            <View style={styles.dotWrapper}>
              <GradientDot type="completed" isClickable={false} />
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.title}>Test Received</Text>
                <GradientStatusPill text="Completed" type="completed" />
              </View>
            </View>
          </View>

          {/* Step 2 - Processing */}
          <View style={styles.timelineItem}>
            <View style={styles.dotWrapper}>
              <GradientDot
                type={progress === "processing" ? "active" : progress === "completed" ? "completed" : "pending"}
                isClickable={progress === "pending"}
                onPress={handleStartProcessing}
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
              {progress === "pending" && <StepHint text="Click to start processing" />}
              {progress === "processing" && <StepHint text="Processing — upload next" />}
            </View>
          </View>

          {/* Step 3 - Upload / Result */}
          <View style={styles.timelineItem}>
            <View style={styles.dotWrapper}>
              <GradientDot
                type={progress === "completed" ? "completed" : "pending"}
                isClickable={progress === "processing"}
                onPress={handleGoToUpload}
              />
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.title}>{progress === "completed" ? "Result Submitted" : "Upload Result"}</Text>
                {progress === "completed" ? (
                  <GradientStatusPill text="Submitted" type="completed" />
                ) : (
                  <GradientStatusPill text="Pending" type="pending" />
                )}
              </View>
              {progress === "processing" && <StepHint text="Click to upload results" />}
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  testInfo: { flex: 1 },
  testName: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  testDate: { fontSize: 12, color: COLORS.sub },
  viewButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  viewButtonText: { fontSize: 12, fontWeight: "600", color: COLORS.text },
  progressCard: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  timelineItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  dotWrapper: { marginRight: 12, marginTop: 2 },
  gradientDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  disabledDot: { opacity: 0.35 },
  content: { flex: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 14, fontWeight: "600", color: COLORS.text, flex: 1 },
  gradientPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 80, alignItems: "center", justifyContent: "center" },
  gradientPillText: { fontSize: 12, fontWeight: "700", color: "#ffffff", textAlign: "center" },
  stepHint: { fontSize: 11, color: COLORS.brand, fontStyle: "italic", marginTop: 4 },
});

export default TestCard;