import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";

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
  test?: any;
  loincCode?: string | number;
  walkinID?: number;
  patientData?: any;
  onStatusChange?: () => void;
};

/* ------------------------------------------------------------------ */
/* STEP BUTTON – MATCHES GradientDot BEHAVIOUR EXACTLY */
/* ------------------------------------------------------------------ */
const StepButton = ({
  type,
  loading,
  onPress,
  isClickable,
}: {
  type: "completed" | "active" | "pending";
  loading?: boolean;
  onPress?: () => void;
  isClickable: boolean;
}) => {
  const colors =
    type === "completed"
      ? [COLORS.gradientSuccessStart, COLORS.gradientSuccessEnd]
      : type === "active"
      ? [COLORS.gradientProcessingStart, COLORS.gradientProcessingEnd] // 🔵 BLUE
      : [COLORS.gradientWarningStart, COLORS.gradientWarningEnd];

  const content = () => {
    if (loading) return <ActivityIndicator color="#fff" />;
    if (type === "completed") return <CheckIcon size={18} color="#fff" />;
    return <AdjustIcon size={18} color="#fff" />;
  };

  return (
    <TouchableOpacity disabled={!isClickable || loading} onPress={onPress}>
      <LinearGradient
        colors={colors}
        style={[
          styles.stepButton,
          !isClickable && styles.disabledButton, // 👈 disabled look
        ]}
      >
        {content()}
      </LinearGradient>
    </TouchableOpacity>
  );
};

/* ------------------------------------------------------------------ */
/* STEP CARD */
/* ------------------------------------------------------------------ */
const StepCard = ({
  step,
  title,
  description,
  status,
  actionText,
  onPress,
  loading,
  isClickable,
}: any) => {
  return (
    <View style={styles.stepWrapper}>
      <View style={styles.stepCard}>
        <Text style={styles.stepLabel}>STEP {step}</Text>

        <StepButton
          type={status}
          onPress={onPress}
          loading={loading}
          isClickable={isClickable}
        />

        {actionText && isClickable && (
          <Text style={styles.buttonHint}>{actionText}</Text>
        )}

        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{description}</Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {status === "completed"
              ? "Completed"
              : status === "active"
              ? "In Progress"
              : "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.stepDivider} />
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* MAIN TEST CARD */
/* ------------------------------------------------------------------ */
const TestCard: React.FC<TestCardProps> = ({ testName, timeLineID, status, testID, date, test, loincCode, walkinID, patientData, onStatusChange,}) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);

  const initialStatus = test?.status ?? status ?? "pending";
  const [progress, setProgress] = useState(initialStatus);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProgress(test?.status ?? status ?? "pending");
  }, [status, test?.status]);

  const isSuccess = (res: any) =>
    res?.message === "success" || res?.data?.message === "success";

  const startProcessing = async () => {
    if (progress !== "pending") return;

    try {
      setLoading(true);
      setProgress("processing");

      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Unauthorized");

      let res;
      if (patientData?.loinc_num_ && patientData?.test) {
        res = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "processing" },
          token
        );
      } else {
        res = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "processing" },
          token
        );
      }

      if (isSuccess(res)) {
        dispatch(showSuccess("Processing started"));
        onStatusChange?.();
      } else {
        throw new Error("Failed");
      }
    } catch (e: any) {
      setProgress("pending");
      dispatch(showError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const goToUpload = () => {
    if (progress !== "processing") return;

    navigation.navigate("UploadTest", {
      state: { timeLineID, testID, testName, patientData, loincCode, walkinID },
      onUploadComplete: (success: boolean) => {
        if (success) {
          setProgress("completed");
          onStatusChange?.();
        }
      },
    });
  };

  return (
    <View style={styles.card}>
<View style={styles.header}>
  <View style={styles.titleContainer}>
    <Text
      style={styles.testName}
      numberOfLines={2}
      ellipsizeMode="tail"
    >
      {testName}
    </Text>
    <Text style={styles.date}>{formatDateTime(date)}</Text>
  </View>

  <TouchableOpacity onPress={() => setExpanded(!expanded)}>
    <View style={styles.eyeContainer}>
      {/* <EyeIcon size={16} color={COLORS.text} /> */}
      {expanded ? (
        <ChevronUpIcon size={16} color={COLORS.text} />
      ) : (
        <ChevronDownIcon size={16} color={COLORS.text} />
      )}
    </View>
  </TouchableOpacity>
</View>


      {expanded && (
        <>
          <StepCard
            step={1}
            title="Test Received"
            description="The test request has been received."
            status="completed"
            isClickable={false}
          />

          <StepCard
            step={2}
            title="Processing"
            description="Start processing the test sample."
            status={progress === "pending" ? "pending" : "active"}
            loading={loading}
            onPress={startProcessing}
            isClickable={progress === "pending"}
            actionText="Click on the button"
          />

          <StepCard
            step={3}
            title="Upload Result"
            description="Upload test report and submit."
            status={progress === "completed" ? "completed" : "pending"}
            onPress={goToUpload}
            isClickable={progress === "processing"}
            actionText="Click on the button"
          />
        </>
      )}
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* STYLES */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},
titleContainer: {
  flex: 1,              // 👈 IMPORTANT
  paddingRight: 12,     // keeps gap from icons
},

eyeContainer: {
  flexDirection: "row",
  alignItems: "center",
  flexShrink: 0,        // 👈 icons NEVER move
},

  testName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  date: { fontSize: 12, color: COLORS.sub },

  stepWrapper: { marginTop: 16 },

  stepCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },

  stepLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.brand,
    marginBottom: 8,
  },

  stepButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  disabledButton: {
    opacity: 0.35,
  },

  buttonHint: {
    fontSize: 11,
    fontStyle: "italic",
    color: COLORS.brand,
    marginBottom: 6,
  },

  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },

  stepDesc: {
    fontSize: 12,
    color: COLORS.sub,
    textAlign: "center",
    marginTop: 4,
  },

  statusPill: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  stepDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.4,
    marginHorizontal: 12,
    marginTop: 12,
  },
});

export default TestCard;
