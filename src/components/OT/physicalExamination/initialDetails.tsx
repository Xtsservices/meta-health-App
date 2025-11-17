// src/screens/ot/MainFormFieldsMobile.tsx

import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import Footer from "../../dashboard/footer";
import usePhysicalExaminationForm from "../../../utils/usePhysicalExaminationForm";

// 🔹 Infer inner type from the store
type MainFormFieldsInner = ReturnType<
  typeof usePhysicalExaminationForm
>["mainFormFields"];

// 🔹 Keys that are booleans in mainFormFields slice
type BooleanFieldKey =
  | "mp1"
  | "mp2"
  | "mp3"
  | "mp4"
  | "morbidObesity"
  | "difficultAirway"
  | "teethPoorRepair"
  | "micrognathia"
  | "edentulous"
  | "beard"
  | "shortMuscularNeck"
  | "prominentIncisors";

const MainFormFieldsMobile: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // 🔹 Get slice from Zustand store
  const { mainFormFields, setMainFormFields } = usePhysicalExaminationForm();

  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Simple “saved” indicator (no AsyncStorage – data lives in store)
  const saveFormData = async (data: MainFormFieldsInner) => {
    try {

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 1000);
      });
    } catch (error) {
      console.error("Error in save indicator:", error);
    }
  };

  // Checkbox change → update store + show saved
  const handleCheckboxChange = (field: BooleanFieldKey, value: boolean) => {
    const newFormFields: MainFormFieldsInner = {
      ...mainFormFields,
      [field]: value,
    };
    setMainFormFields({ [field]: value } as Partial<MainFormFieldsInner>);
    saveFormData(newFormFields);
  };

  // Mouth opening / neck rotation buttons
  const handleButtonGroupChange = (
    field: "mouthOpening" | "neckRotation",
    value: string
  ) => {
    const newFormFields: MainFormFieldsInner = {
      ...mainFormFields,
      [field]: value,
    };
    setMainFormFields({ [field]: value } as Partial<MainFormFieldsInner>);
    saveFormData(newFormFields);
  };

  // TM distance input
  const handleTextFieldInput = (field: "tmDistance", value: string) => {
    const newFormFields: MainFormFieldsInner = {
      ...mainFormFields,
      [field]: value,
    };
    setMainFormFields({ [field]: value } as Partial<MainFormFieldsInner>);
    saveFormData(newFormFields);
  };

  const handleNext = () => {
    navigation.navigate("ExaminationFindinfNotes" as never);
  };

  const Checkbox: React.FC<{
    label: string;
    checked: boolean;
    onPress: () => void;
    size?: number;
  }> = ({ label, checked, onPress, size = 24 }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
      <View
        style={[
          styles.checkbox,
          { width: size, height: size },
          checked && styles.checkboxChecked,
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          {/* Main Content */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Airways Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Airways</Text>

              {/* MP Checkboxes */}
              <View style={styles.checkboxRow}>
                <Checkbox
                  label="MP 1"
                  checked={!!mainFormFields.mp1}
                  onPress={() =>
                    handleCheckboxChange("mp1", !mainFormFields.mp1)
                  }
                />
                <Checkbox
                  label="MP 2"
                  checked={!!mainFormFields.mp2}
                  onPress={() =>
                    handleCheckboxChange("mp2", !mainFormFields.mp2)
                  }
                />
                <Checkbox
                  label="MP 3"
                  checked={!!mainFormFields.mp3}
                  onPress={() =>
                    handleCheckboxChange("mp3", !mainFormFields.mp3)
                  }
                />
                <Checkbox
                  label="MP 4"
                  checked={!!mainFormFields.mp4}
                  onPress={() =>
                    handleCheckboxChange("mp4", !mainFormFields.mp4)
                  }
                />
              </View>

              {/* TM Distance Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>TM Distance</Text>
                <TextInput
                  style={styles.textInput}
                  value={mainFormFields.tmDistance ?? ""}
                  onChangeText={(text) =>
                    handleTextFieldInput("tmDistance", text)
                  }
                  placeholder="Enter distance"
                  keyboardType="numeric"
                />
              </View>

              {/* Mouth Opening Button Group */}
              <View style={styles.buttonGroupContainer}>
                <Text style={styles.buttonGroupLabel}>Mouth Opening:</Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.groupButton,
                      mainFormFields.mouthOpening === "yes" &&
                        styles.groupButtonActive,
                    ]}
                    onPress={() =>
                      handleButtonGroupChange("mouthOpening", "yes")
                    }
                  >
                    <Text
                      style={[
                        styles.groupButtonText,
                        mainFormFields.mouthOpening === "yes" &&
                          styles.groupButtonTextActive,
                      ]}
                    >
                      Yes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.groupButton,
                      mainFormFields.mouthOpening === "no" &&
                        styles.groupButtonActive,
                    ]}
                    onPress={() =>
                      handleButtonGroupChange("mouthOpening", "no")
                    }
                  >
                    <Text
                      style={[
                        styles.groupButtonText,
                        mainFormFields.mouthOpening === "no" &&
                          styles.groupButtonTextActive,
                      ]}
                    >
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Neck Rotation Button Group */}
              <View style={styles.buttonGroupContainer}>
                <Text style={styles.buttonGroupLabel}>Neck Rotation:</Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.groupButton,
                      mainFormFields.neckRotation === "full" &&
                        styles.groupButtonActive,
                    ]}
                    onPress={() =>
                      handleButtonGroupChange("neckRotation", "full")
                    }
                  >
                    <Text
                      style={[
                        styles.groupButtonText,
                        mainFormFields.neckRotation === "full" &&
                          styles.groupButtonTextActive,
                      ]}
                    >
                      Full
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.groupButton,
                      mainFormFields.neckRotation === "limited" &&
                        styles.groupButtonActive,
                    ]}
                    onPress={() =>
                      handleButtonGroupChange("neckRotation", "limited")
                    }
                  >
                    <Text
                      style={[
                        styles.groupButtonText,
                        mainFormFields.neckRotation === "limited" &&
                          styles.groupButtonTextActive,
                      ]}
                    >
                      Limited
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.groupButton,
                      mainFormFields.neckRotation === "no" &&
                        styles.groupButtonActive,
                    ]}
                    onPress={() =>
                      handleButtonGroupChange("neckRotation", "no")
                    }
                  >
                    <Text
                      style={[
                        styles.groupButtonText,
                        mainFormFields.neckRotation === "no" &&
                          styles.groupButtonTextActive,
                      ]}
                    >
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Additional Checkboxes Section */}
            <View style={styles.section}>
              <View style={styles.checkboxGrid}>
                <View style={styles.checkboxColumn}>
                  <Checkbox
                    label="Morbid Obesity"
                    checked={!!mainFormFields.morbidObesity}
                    onPress={() =>
                      handleCheckboxChange(
                        "morbidObesity",
                        !mainFormFields.morbidObesity
                      )
                    }
                  />
                  <Checkbox
                    label="H/O Difficult Airway"
                    checked={!!mainFormFields.difficultAirway}
                    onPress={() =>
                      handleCheckboxChange(
                        "difficultAirway",
                        !mainFormFields.difficultAirway
                      )
                    }
                  />
                  <Checkbox
                    label="Teeth Poor Repair/Loose"
                    checked={!!mainFormFields.teethPoorRepair}
                    onPress={() =>
                      handleCheckboxChange(
                        "teethPoorRepair",
                        !mainFormFields.teethPoorRepair
                      )
                    }
                  />
                  <Checkbox
                    label="Micrognathia"
                    checked={!!mainFormFields.micrognathia}
                    onPress={() =>
                      handleCheckboxChange(
                        "micrognathia",
                        !mainFormFields.micrognathia
                      )
                    }
                  />
                </View>

                <View style={styles.checkboxColumn}>
                  <Checkbox
                    label="Edentulous"
                    checked={!!mainFormFields.edentulous}
                    onPress={() =>
                      handleCheckboxChange(
                        "edentulous",
                        !mainFormFields.edentulous
                      )
                    }
                  />
                  <Checkbox
                    label="Beard"
                    checked={!!mainFormFields.beard}
                    onPress={() =>
                      handleCheckboxChange("beard", !mainFormFields.beard)
                    }
                  />
                  <Checkbox
                    label="Short Muscular Neck"
                    checked={!!mainFormFields.shortMuscularNeck}
                    onPress={() =>
                      handleCheckboxChange(
                        "shortMuscularNeck",
                        !mainFormFields.shortMuscularNeck
                      )
                    }
                  />
                  <Checkbox
                    label="Prominent Incisors"
                    checked={!!mainFormFields.prominentIncisors}
                    onPress={() =>
                      handleCheckboxChange(
                        "prominentIncisors",
                        !mainFormFields.prominentIncisors
                      )
                    }
                  />
                </View>
              </View>
            </View>

            {/* Next Button at the end of form */}
            <View style={styles.nextButtonContainer}>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>

            {/* Extra space for keyboard and footer */}
            <View
              style={[styles.keyboardSpacer, { height: insets.bottom + 100 }]}
            />
          </ScrollView>

          {/* Save Indicator */}
          <Animated.View style={[styles.saveIndicator, { opacity: fadeAnim }]}>
            <Text style={styles.saveIndicatorText}>✓ Data Saved</Text>
          </Animated.View>

          {/* Fixed Footer */}
          <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
            <Footer active={"dashboard"} brandColor="#14b8a6" />
          </View>
          {insets.bottom > 0 && (
            <View
              pointerEvents="none"
              style={[styles.navShield, { height: insets.bottom }]}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  innerContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  checkboxRow: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  buttonGroupContainer: {
    marginBottom: 20,
  },
  buttonGroupLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
  },
  groupButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  groupButtonActive: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },
  groupButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  groupButtonTextActive: {
    color: "#fff",
  },
  checkboxGrid: {
    flexDirection: "row",
    gap: 16,
  },
  checkboxColumn: {
    flex: 1,
  },
  nextButtonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  nextButton: {
    backgroundColor: "#14b8a6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 16,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  keyboardSpacer: {
    height: 100,
  },
  saveIndicator: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  saveIndicatorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  navShield: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
  },
});

export default MainFormFieldsMobile;
