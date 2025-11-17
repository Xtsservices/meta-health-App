import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { AuthPost } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { showError, showSuccess } from "../../store/toast.slice";
import Footer from "../dashboard/footer";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;
const isSmallDevice = SCREEN_HEIGHT < 700;

// Import your surgery image - make sure the path is correct
const requestSurgeryImage = require("../../assets/requestSurgery.png");

const surgeryTypesData = [
  "Orthopedic Surgery",
  "Spine Surgery",
  "Cataract Surgery",
  "Neuro Surgery",
  "General Surgery",
  "Transplantation",
  "Endocrine Surgery",
  "Arthoscopy",
  "Others",
];

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  danger: "#ef4444",
  overlay: "rgba(0,0,0,0.45)",
  pill: "#f1f5f9",
};

type RequestSurgeryRouteParams = {
  timelineID?: string | number;
};

export default function RequestSurgeryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const params: RequestSurgeryRouteParams = route.params || {};
  const user = useSelector((s: RootState) => s.currentUser);

  const timelineID = params.timelineID;

  const [loading, setLoading] = useState(false);
  const [patientType, setPatientType] = useState<string>("");
  const [surgeryType, setSurgeryType] = useState<string>("");
  const [manualSurgeryType, setManualSurgeryType] = useState<string>("");
  const [showSurgeryTypeModal, setShowSurgeryTypeModal] = useState(false);

  const handleSubmit = async () => {
    if (!patientType) {
      dispatch(showError("Please select surgery urgency"));
      return;
    }
    if (!surgeryType) {
      dispatch(showError("Please select surgery type"));
      return;
    }
    if (surgeryType === "Others" && !manualSurgeryType) {
      dispatch(showError("Please enter surgery type"));
      return;
    }

    const selectedSurgeryType = surgeryType === "Others" ? manualSurgeryType : surgeryType;

    try {
      setLoading(true);
      const token = user?.token || (await AsyncStorage.getItem("token"));
      
      if (!timelineID) {
        dispatch(showError("Timeline ID is required"));
        setLoading(false);
        return;
      }

      const data = {
        patientType: patientType,
        surgeryType: selectedSurgeryType,
      };      
      const res = await AuthPost(
        `ot/${user.hospitalID}/${timelineID}`,
        data,
        token
      );
      // FIXED: Check response structure properly
      if (res?.data?.status === 201) {
        dispatch(showSuccess("Surgery request submitted successfully"));
        // Navigate back to patient profile
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
      else {
        dispatch(showError(res?.data?.message || "Failed to submit surgery request"));
      }
    } catch (error) {
      dispatch(showError("Failed to submit surgery request"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content Card */}
        <View style={styles.mainCard}>
          {/* Image Section - Top */}
          <View style={styles.imageSection}>
            <Image 
              source={requestSurgeryImage} 
              style={styles.surgeryImage}
              resizeMode="contain"
              onError={() => console.log("Failed to load surgery image")}
            />
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Request For Surgery</Text>
            <Text style={styles.formSubtitle}>
              Submit a surgery request for the patient
            </Text>

            {/* Surgery Urgency */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Surgery urgency *</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    patientType === "elective" && styles.radioOptionSelected,
                  ]}
                  onPress={() => setPatientType("elective")}
                >
                  <View style={[
                    styles.radioCircle,
                    patientType === "elective" && styles.radioCircleSelected,
                  ]}>
                    {patientType === "elective" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[
                    styles.radioLabel,
                    patientType === "elective" && styles.radioLabelSelected,
                  ]}>
                    Elective
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    patientType === "emergency" && styles.radioOptionSelected,
                  ]}
                  onPress={() => setPatientType("emergency")}
                >
                  <View style={[
                    styles.radioCircle,
                    patientType === "emergency" && styles.radioCircleSelected,
                  ]}>
                    {patientType === "emergency" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[
                    styles.radioLabel,
                    patientType === "emergency" && styles.radioLabelSelected,
                  ]}>
                    Emergency
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Surgery Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type of Surgery *</Text>
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  { borderColor: surgeryType ? COLORS.brand : COLORS.border },
                ]}
                onPress={() => setShowSurgeryTypeModal(true)}
              >
                <Text style={[
                  styles.selectText,
                  { color: surgeryType ? COLORS.text : COLORS.sub },
                ]}>
                  {surgeryType || "Select Surgery Type"}
                </Text>
              </TouchableOpacity>

              {surgeryType === "Others" && (
                <TextInput
                  style={[
                    styles.textInput,
                    { marginTop: 12, borderColor: COLORS.border },
                  ]}
                  placeholder="Enter surgery type"
                  placeholderTextColor={COLORS.sub}
                  value={manualSurgeryType}
                  onChangeText={setManualSurgeryType}
                />
              )}
            </View>

            {/* Submit Button - Inside Form */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerContainer, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

      {/* Surgery Type Modal */}
      <Modal
        visible={showSurgeryTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSurgeryTypeModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowSurgeryTypeModal(false)}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Surgery Type</Text>
            <Pressable 
              onPress={() => setShowSurgeryTypeModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalList}>
            {surgeryTypesData?.map((type, index) => (
              <Pressable
                key={index}
                style={styles.modalItem}
                onPress={() => {
                  setSurgeryType(type);
                  setShowSurgeryTypeModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{type}</Text>
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
  scrollContent: {
    flexGrow: 1,
    padding: isTablet ? 32 : 16,
    paddingTop: isSmallDevice ? 16 : 24,
  },
  mainCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
    maxWidth: isTablet ? 800 : "100%",
    alignSelf: "center",
    width: "100%",
  },
  imageSection: {
    alignItems: "center",
    paddingVertical: isTablet ? 40 : 32,
    paddingHorizontal: isTablet ? 40 : 24,
    backgroundColor: `${COLORS.brand}08`,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  surgeryImage: {
    width: isTablet ? 200 : 160,
    height: isTablet ? 150 : 120,
    borderRadius: 12,
  },
  formSection: {
    padding: isTablet ? 40 : 24,
  },
  formTitle: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: isTablet ? 18 : 16,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: isTablet ? 40 : 32,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: isTablet ? 32 : 24,
  },
  inputLabel: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: isTablet ? 16 : 12,
  },
  radioGroup: {
    flexDirection: isTablet ? "row" : "column",
    gap: isTablet ? 20 : 12,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: isTablet ? 20 : 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    flex: isTablet ? 1 : undefined,
  },
  radioOptionSelected: {
    borderColor: COLORS.brand,
    backgroundColor: `${COLORS.brand}08`,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: COLORS.brand,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brand,
  },
  radioLabel: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  radioLabelSelected: {
    color: COLORS.brand,
  },
  selectInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: isTablet ? 20 : 16,
    backgroundColor: COLORS.card,
  },
  selectText: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: isTablet ? 20 : 16,
    fontSize: isTablet ? 16 : 15,
    backgroundColor: COLORS.card,
    color: COLORS.text,
  },
  formActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: isTablet ? 40 : 32,
    justifyContent: "center",
  },
  actionButton: {
    paddingHorizontal: isTablet ? 32 : 24,
    paddingVertical: isTablet ? 16 : 14,
    borderRadius: 12,
    minWidth: isTablet ? 140 : 120,
    alignItems: "center",
    justifyContent: "center",
    flex: isTablet ? undefined : 1,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.brand,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  submitButtonText: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: "700",
    color: "#fff",
  },
  footerContainer: {
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
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
    fontWeight: "700",
    color: COLORS.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: "300",
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
});