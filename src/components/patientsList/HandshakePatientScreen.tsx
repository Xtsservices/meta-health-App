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
  Dimensions,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  brandLight: "#ccfbf1",
  danger: "#ef4444",
  overlay: "rgba(0,0,0,0.5)",
  pill: "#f1f5f9",
  placeholder: "#94a3b8",
};

const FOOTER_H = 70;
const ACTION_BAR_H = 80;

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
        
        if (response?.status === "success") {
          const filteredDoctors = (response?.data?.users || response?.users || [])
            ?.filter((doc: Doctor) => doc?.id !== user?.id) || [];
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
      const token = user?.token || (await AsyncStorage.getItem("token"));

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

      if (response?.data?.message === "success") {
        dispatch(showSuccess("Patient successfully handshaked"));
        navigation.goBack();
      } else {
        dispatch(showError(response?.data?.message || "Failed to handshake patient"));
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

  const bottomPadding = ACTION_BAR_H + FOOTER_H + Math.max(insets.bottom, 12) + 16;

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: bottomPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <HandshakeIcon size={28} color={COLORS.brand} strokeWidth={2} />
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
                <UserIcon size={18} color={COLORS.brand} />
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
                selectedDoctor && styles.selectInputActive,
              ]}
              onPress={() => setShowDoctorModal(true)}
              disabled={loading}
            >
              <View style={styles.selectContent}>
                <View style={styles.iconCircle}>
                  <UserIcon size={18} color={selectedDoctor ? COLORS.brand : COLORS.placeholder} />
                </View>
                <Text style={[
                  styles.selectText,
                  selectedDoctor && styles.selectTextActive,
                ]}>
                  {getSelectedDoctorName()}
                </Text>
              </View>
              <ChevronRightIcon size={20} color={COLORS.sub} />
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
              <ChevronRightIcon size={20} color={COLORS.sub} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={[styles.actionBar, { 
        height: ACTION_BAR_H,
        bottom: FOOTER_H + insets.bottom,
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
        height: FOOTER_H,
      }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
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
              <XIcon size={24} color={COLORS.sub} />
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
                    size={18} 
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
              <XIcon size={24} color={COLORS.sub} />
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
    paddingVertical: 32,
    paddingBottom: 24,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.sub,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  required: {
    color: COLORS.danger,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.pill,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: COLORS.card,
    minHeight: 60,
  },
  selectInputActive: {
    borderColor: COLORS.brand,
    backgroundColor: `${COLORS.brand}08`,
  },
  selectContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  selectText: {
    fontSize: 15,
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
    gap: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  footerWrap: {
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalClose: {
    padding: 4,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    minHeight: 64,
  },
  modalItemPressed: {
    backgroundColor: COLORS.pill,
  },
  modalItemSelected: {
    backgroundColor: COLORS.brandLight,
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconCircleSelected: {
    backgroundColor: COLORS.card,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  modalItemTextSelected: {
    color: COLORS.brand,
    fontWeight: "700",
  },
});