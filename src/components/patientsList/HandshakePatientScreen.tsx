import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { AuthFetch, AuthPost } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { showError, showSuccess } from "../../store/toast.slice";
import Footer from "../dashboard/footer";
import { XIcon, UserIcon, ChevronRightIcon } from "../../utils/SvgIcons";
import { HandshakeIcon } from "lucide-react-native";
import { Role_NAME } from "../../utils/role";

// Import responsive utilities
import { 
  SCREEN_HEIGHT, 
  isTablet, 
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT
} from "../../utils/responsive";

// Import colors
import { COLORS } from "../../utils/colour";

const reasons = [
  "Patient Request",
  "Patient Preference",
  "Retirement",
  "Relocation",
  "Termination",
  "Vacation",
  "Sick Leave",
  "Maternity/Paternity Leave",
  "Sabbatical",
  "Continuing Medical Education (CME)",
  "Conference or Seminar",
  "Personal Reasons",
  "Medical Leave",
  "Bereavement Leave",
  "Off-Duty",
];

const ACTION_BAR_H = Math.max(60, SCREEN_HEIGHT * 0.08);

type HandshakeRouteParams = {
  patientID?: string | number;
  timelineID?: string | number;
};

type Doctor = {
  id: number;
  firstName?: string;
  lastName?: string;
  departmentID?: number;
};

export default function HandshakePatientScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();

  const params: HandshakeRouteParams = route.params || {};
  const user = useSelector((s: RootState) => s.currentUser);

  const patientID = params.patientID;
  const timelineID = params.timelineID;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [reason, setReason] = useState<string>("");
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const token = user?.token || (await AsyncStorage.getItem("token"));
        
        const response = await AuthFetch(
          `user/${user?.hospitalID}/list/${Role_NAME.doctor}`,
          token
        );
        
        if (("data" in response && response?.data?.status === "success") || 
            response?.status === "success") {
            let users: Doctor[] = [];
          
          if ("data" in response && response.data?.users && Array.isArray(response.data.users)) {
            users = response.data.users;
          } else if ("users" in response && response.users && Array.isArray(response.users)) {
            users = response.users;
          }
          
          const filteredDoctors = users?.filter((doc: Doctor) => doc?.id !== user?.id) || [];
          setDoctors(filteredDoctors);
        } else {
          dispatch(showError("Failed to load doctors list"));
        }
      } catch (error) {
        dispatch(showError("Failed to load doctors list"));
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [user, dispatch]);

  const handleSubmit = async () => {
    if (!selectedDoctor) {
      dispatch(showError("Please select a doctor"));
      return;
    }
    if (!reason) {
      dispatch(showError("Please select a reason"));
      return;
    }
    if (!timelineID) {
      dispatch(showError("Timeline ID is required"));
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");

      const requestData = {
        handshakingTo: selectedDoctor,
        handshakingfrom: user?.id,
        handshakingBy: user?.id,
        reason: reason,
      };

      const response = await AuthPost(
        `doctor/${user?.hospitalID}/${timelineID}/transfer`,
        requestData,
        token
      );

      if (("data" in response && response?.data?.status === "success") || 
          response?.status === "success") {
        dispatch(showSuccess("Patient successfully handshaked"));
        navigation.navigate("PatientList" as never);
      } else {
      let errorMessage = "Failed to handshake patient";
      
      if ("message" in response && response.message) {
        errorMessage = response.message;
      } else if ("data" in response && response.data?.message) {
        errorMessage = response.data.message;
      }
      
      dispatch(showError(errorMessage));
      }
    } catch (error) {
      dispatch(showError("Failed to handshake patient"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const getSelectedDoctorName = () => {
    if (!selectedDoctor) return "Select Doctor";
    const doctor = doctors?.find(d => d?.id === selectedDoctor);
    if (!doctor) return "Select Doctor";
    return `${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim();
  };

  const bottomPadding = ACTION_BAR_H + FOOTER_HEIGHT + Math.max(insets.bottom, SPACING.sm) + SPACING.md;

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        contentContainerStyle={{
          padding: SPACING.md,
          paddingBottom: bottomPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <HandshakeIcon size={ICON_SIZE.md} color={COLORS.brand} strokeWidth={2} />
          </View>
          <Text style={styles.headerTitle}>Handshake Patient</Text>
          <Text style={styles.headerSubtitle}>
            Transfer patient care to another doctor
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Current Doctor */}
          <View style={styles.section}>
            <Text style={styles.label}>From</Text>
            <View style={styles.infoBox}>
              <View style={styles.iconCircle}>
                <UserIcon size={ICON_SIZE.sm} color={COLORS.brand} />
              </View>
              <Text style={styles.infoText}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
          </View>

          {/* Select Doctor */}
          <View style={styles.section}>
            <Text style={styles.label}>
              To <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectInput,
                selectedDoctor ? styles.selectInputActive : null,
              ]}
              onPress={() => setShowDoctorModal(true)}
              disabled={loading}
            >
              <View style={styles.selectContent}>
                <View style={styles.iconCircle}>
                  <UserIcon size={ICON_SIZE.sm} color={selectedDoctor ? COLORS.brand : COLORS.placeholder} />
                </View>
                <Text style={[
                  styles.selectText,
                  selectedDoctor ? styles.selectTextActive : null, 
                ]}>
                  {getSelectedDoctorName()}
                </Text>
              </View>
              <ChevronRightIcon size={ICON_SIZE.sm} color={COLORS.sub} />
            </TouchableOpacity>
          </View>

          {/* Reason */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Reason <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectInput,
                reason && styles.selectInputActive,
              ]}
              onPress={() => setShowReasonModal(true)}
            >
              <View style={styles.selectContent}>
                <Text style={[
                  styles.selectText,
                  reason && styles.selectTextActive,
                ]}>
                  {reason || "Select Reason"}
                </Text>
              </View>
              <ChevronRightIcon size={ICON_SIZE.sm} color={COLORS.sub} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={[styles.actionBar, { 
        height: ACTION_BAR_H,
        bottom: FOOTER_HEIGHT + insets.bottom,
      }]}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={submitting}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!selectedDoctor || !reason || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || !selectedDoctor || !reason}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Confirm Handshake</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={[styles.footerWrap, { 
        bottom: insets.bottom,
        height: FOOTER_HEIGHT,
      }]}>
        <Footer active={"patients"} brandColor={COLORS.brand} />
      </View>

      {/* Safe area bottom spacer */}
      {insets.bottom > 0 && (
        <View style={[styles.safeBottom, { height: insets.bottom }]} />
      )}

      {/* Doctor Selection Modal */}
      <Modal
        visible={showDoctorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDoctorModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDoctorModal(false)}
        />
        <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.75 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Doctor</Text>
            <Pressable 
              onPress={() => setShowDoctorModal(false)}
              style={styles.modalClose}
            >
              <XIcon size={ICON_SIZE.md} color={COLORS.sub} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {doctors?.map((doctor) => (
              <Pressable
                key={doctor?.id}
                style={({ pressed }) => [
                  styles.modalItem,
                  pressed && styles.modalItemPressed,
                  selectedDoctor === doctor?.id && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setSelectedDoctor(doctor?.id);
                  setShowDoctorModal(false);
                }}
              >
                <View style={[
                  styles.modalIconCircle,
                  selectedDoctor === doctor?.id && styles.modalIconCircleSelected,
                ]}>
                  <UserIcon 
                    size={ICON_SIZE.sm} 
                    color={selectedDoctor === doctor?.id ? COLORS.brand : COLORS.sub} 
                  />
                </View>
                <Text style={[
                  styles.modalItemText,
                  selectedDoctor === doctor?.id && styles.modalItemTextSelected,
                ]}>
                  {doctor?.firstName} {doctor?.lastName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Reason Selection Modal */}
      <Modal
        visible={showReasonModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReasonModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowReasonModal(false)}
        />
        <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.75 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Reason</Text>
            <Pressable 
              onPress={() => setShowReasonModal(false)}
              style={styles.modalClose}
            >
              <XIcon size={ICON_SIZE.md} color={COLORS.sub} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {reasons?.map((reasonItem, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.modalItem,
                  pressed && styles.modalItemPressed,
                  reason === reasonItem && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setReason(reasonItem);
                  setShowReasonModal(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  reason === reasonItem && styles.modalItemTextSelected,
                ]}>
                  {reasonItem}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: isTablet ? SPACING.lg : SPACING.md,
    paddingBottom: isTablet ? SPACING.lg : SPACING.sm,
  },
  headerIcon: {
    width: isTablet ? 60 : 48,
    height: isTablet ? 60 : 48,
    borderRadius: isTablet ? 30 : 24,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: isTablet ? FONT_SIZE.xl : FONT_SIZE.lg,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.sub,
    textAlign: "center",
    lineHeight: FONT_SIZE.sm + 4,
    fontWeight: "500",
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
    padding: isTablet ? SPACING.lg : SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  section: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  required: {
    color: COLORS.danger,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    backgroundColor: COLORS.pill,
    gap: SPACING.sm,
    minHeight: 44, // Reduced height
  },
  iconCircle: {
    width: isTablet ? 32 : 28,
    height: isTablet ? 32 : 28,
    borderRadius: isTablet ? 16 : 14,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm - 2,
    backgroundColor: COLORS.card,
    minHeight: 44, // Reduced from 60
  },
  selectInputActive: {
    borderColor: COLORS.brand,
    backgroundColor: `${COLORS.brand}08`,
  },
  selectContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  selectText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.placeholder,
    flex: 1,
  },
  selectTextActive: {
    color: COLORS.text,
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    paddingVertical: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelBtn: {
    flex: 1,
    height: isTablet ? 48 : 44,
    borderRadius: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitBtn: {
    flex: 1,
    height: isTablet ? 48 : 44,
    borderRadius: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  cancelBtnText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.text,
  },
  submitBtnText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: "700",
    color: "#fff",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
  },
  safeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  modalContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SPACING.lg,
    borderTopRightRadius: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: isTablet ? FONT_SIZE.lg : FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalClose: {
    padding: SPACING.xs,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
    minHeight: 56, // Reduced from 64
  },
  modalItemPressed: {
    backgroundColor: COLORS.pill,
  },
  modalItemSelected: {
    backgroundColor: COLORS.brandLight,
  },
  modalIconCircle: {
    width: isTablet ? 36 : 32,
    height: isTablet ? 36 : 32,
    borderRadius: isTablet ? 18 : 16,
    backgroundColor: COLORS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconCircleSelected: {
    backgroundColor: COLORS.card,
  },
  modalItemText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  modalItemTextSelected: {
    color: COLORS.brand,
    fontWeight: "700",
  },
});