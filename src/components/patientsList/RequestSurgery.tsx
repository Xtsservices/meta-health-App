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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
// Import responsive utilities
import { 
  SCREEN_WIDTH, 
  SCREEN_HEIGHT, 
  isTablet, 
  isSmallDevice, 
  isExtraSmallDevice,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";
import { RootStackParamList } from "../../navigation/navigationTypes";

// Import colors

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

type RequestSurgeryRouteParams = {
  timelineID?: string | number;
  zone?: number; // 👈 ADD THIS

};

export default function RequestSurgeryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const dispatch = useDispatch();

  const params: RequestSurgeryRouteParams = route.params || {};
  const user = useSelector((s: RootState) => s.currentUser);

  const timelineID = params.timelineID;
  const patientZone = params.zone; // 👈 ADD THIS

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
      if (!user?.hospitalID) {
        dispatch(showError("User information not available"));
        setLoading(false);
        return;
      }
      
      if (!timelineID) {
        dispatch(showError("Timeline ID is required"));
        setLoading(false);
        return;
      }

      const data = {
        patientType: patientType,
        surgeryType: selectedSurgeryType,
        zone: patientZone || user?.zone,
      };      
      const res = await AuthPost(
        `ot/${user.hospitalID}/${timelineID}`,
        data,
        token
      );
      // FIXED: Check response structure properly
if ("data" in res && res?.data?.status === 201) {
  dispatch(showSuccess("Surgery request submitted successfully"));

  setTimeout(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name:
            user?.role === 2003 || user?.role === 2002
              ? "nursePatientList"
              : "PatientList",
          params: { zone: patientZone || user?.zone },
        },
      ],
    });
  }, 1500);
}

      else {
        let errorMessage = "Failed to submit surgery request";
        if ("message" in res && res.message) {
          errorMessage = res.message;
        } else if ("data" in res && res.data?.message) {
          errorMessage = res.data.message;
        }
        
        dispatch(showError(errorMessage));
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
          { paddingBottom: FOOTER_HEIGHT + SPACING.lg + insets.bottom }
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
                    { marginTop: SPACING.sm, borderColor: COLORS.border },
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
        <Footer active={"patients"} brandColor={COLORS.brand} />
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
    padding: isTablet ? SPACING.xl : SPACING.md,
    paddingTop: isSmallDevice ? SPACING.md : SPACING.lg,
  },
  mainCard: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
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
    paddingVertical: isTablet ? SPACING.xl : SPACING.lg,
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.lg,
    backgroundColor: COLORS.brandLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  surgeryImage: {
    width: isTablet ? 200 : 160,
    height: isTablet ? 150 : 120,
    borderRadius: SPACING.sm,
  },
  formSection: {
    padding: isTablet ? SPACING.xl : SPACING.lg,
  },
  formTitle: {
    fontSize: isTablet ? FONT_SIZE.xxl + 8 : FONT_SIZE.xxl,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: isTablet ? FONT_SIZE.lg : FONT_SIZE.md,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: isTablet ? SPACING.xl : SPACING.lg,
    lineHeight: FONT_SIZE.lg + 4,
  },
  inputGroup: {
    marginBottom: isTablet ? SPACING.lg : SPACING.md,
  },
  inputLabel: {
    fontSize: isTablet ? FONT_SIZE.lg : FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: isTablet ? SPACING.md : SPACING.sm,
  },
  radioGroup: {
    flexDirection: isTablet ? "row" : "column",
    gap: isTablet ? SPACING.md : SPACING.sm,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: isTablet ? SPACING.md : SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    backgroundColor: COLORS.card,
    flex: isTablet ? 1 : undefined,
  },
  radioOptionSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  radioCircle: {
    width: ICON_SIZE.sm,
    height: ICON_SIZE.sm,
    borderRadius: ICON_SIZE.sm / 2,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  radioCircleSelected: {
    borderColor: COLORS.brand,
  },
  radioInner: {
    width: ICON_SIZE.sm - 10,
    height: ICON_SIZE.sm - 10,
    borderRadius: (ICON_SIZE.sm - 10) / 2,
    backgroundColor: COLORS.brand,
  },
  radioLabel: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  radioLabelSelected: {
    color: COLORS.brand,
  },
  selectInput: {
    borderWidth: 2,
    borderRadius: SPACING.sm,
    padding: isTablet ? SPACING.md : SPACING.sm,
    backgroundColor: COLORS.card,
  },
  selectText: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 2,
    borderRadius: SPACING.sm,
    padding: isTablet ? SPACING.md : SPACING.sm,
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    backgroundColor: COLORS.card,
    color: COLORS.text,
  },
  formActions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: isTablet ? SPACING.xl : SPACING.lg,
    justifyContent: "center",
  },
  actionButton: {
    paddingHorizontal: isTablet ? SPACING.lg : SPACING.md,
    paddingVertical: isTablet ? SPACING.md : SPACING.sm,
    borderRadius: SPACING.sm,
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
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  submitButtonText: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    fontWeight: "700",
    color: "#fff",
  },
  footerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
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
    borderTopLeftRadius: SPACING.md,
    borderTopRightRadius: SPACING.md,
    maxHeight: "80%",
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
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeButtonText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.text,
    fontWeight: "300",
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
  },
});