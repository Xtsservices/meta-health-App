import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets,  SafeAreaView  } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AuthPost } from "../../auth/auth";
import { formatDateTime } from "../../utils/dateTime";
import { ChevronDownIcon, XIcon } from "../../utils/SvgIcons";
import Footer from "../dashboard/footer";
import { FormData, DietItem } from "../../utils/types";
import { RESPONSIVE, styles } from "./DischargeStyles";
import { COLORS } from "../../utils/colour";
import { showError, showSuccess } from "../../store/toast.slice";

const dietList: DietItem[] = [
  { id: "1", name: "Pineapple" },
  { id: "2", name: "Miannoase" },
  { id: "3", name: "Soft Diet" },
  { id: "4", name: "Liquid Diet" },
  { id: "5", name: "Diabetic Diet" },
  { id: "6", name: "Low Salt Diet" },
];

// Bottom sheet dropdown for diet selection
const DietDropdown: React.FC<{
  visible: boolean;
  onClose: () => void;
  selectedDiets: string[];
  onToggleDiet: (diet: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredDiets: DietItem[];
}> = ({
  visible,
  onClose,
  selectedDiets,
  onToggleDiet,
  searchQuery,
  onSearchChange,
  filteredDiets,
}) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const selectedSummary =
    selectedDiets.length === 0
      ? "No diet selected"
      : `Selected: ${selectedDiets.join(", ")}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.dropdownOverlay}>
        {/* tap outside to close */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
        <View
          style={[
            styles.dropdownContainer,
            {
              backgroundColor: COLORS.dropdownBg ?? COLORS.card,
            },
          ]}
        >
          <View style={styles.dropdownHeader}>
            <Text
              style={[styles.dropdownTitle, { color: COLORS.text }]}
            >
              Select Diet
            </Text>
            <TouchableOpacity onPress={onClose}>
              <XIcon size={RESPONSIVE.icon.md} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.selectedSummaryText,
              { color: COLORS.sub },
            ]}
            numberOfLines={2}
          >
            {selectedSummary}
          </Text>

          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: COLORS.inputBg,
                color: COLORS.text,
                borderColor: COLORS.border,
              },
            ]}
            placeholder="Search diets..."
            placeholderTextColor={COLORS.sub}
            value={searchQuery}
            onChangeText={onSearchChange}
          />

          <FlatList
            data={filteredDiets}
            keyExtractor={(item) => item?.id}
            style={styles.dietList}
            contentContainerStyle={{ paddingBottom: RESPONSIVE.spacing.md }}
            renderItem={({ item }) => {
              const isSelected = selectedDiets?.includes(item?.name);
              return (
                <Pressable
                  style={[
                    styles.dietItem,
                    {
                      backgroundColor: isSelected
                        ? `${COLORS.button}20`
                        : COLORS.card,
                      borderColor: COLORS.border,
                    },
                  ]}
                  onPress={() => onToggleDiet(item?.name)}
                >
                  <Text
                    style={[
                      styles.dietItemText,
                      { color: COLORS.text },
                    ]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item?.name}
                  </Text>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected
                          ? COLORS.button
                          : "transparent",
                        borderColor: COLORS.border,
                      },
                    ]}
                  >
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={styles.dropdownActions}>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                { backgroundColor: COLORS.cancelButton },
              ]}
              onPress={onClose}
            >
              <Text style={styles.dropdownButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                { backgroundColor: COLORS.button },
              ]}
              onPress={onClose}
            >
              <Text style={styles.dropdownButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DischargeScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";
const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);
  const { patientId, hospitalID } = route.params ?? {};

  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDiets, setFilteredDiets] =
    useState<DietItem[]>(dietList);

  const [formData, setFormData] = useState<FormData>({
    dischargeType: 0,
    advice: "",
    followUp: 0,
    followUpDate: "",
    diagnosis: "",
    prescription: "",
  });

  const [loading, setLoading] = useState(false);

  // Follow-up date state (actual Date + picker flag)
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false);

  // Filter diets as user types
  useEffect(() => {
    if (searchQuery) {
      setFilteredDiets(
        dietList?.filter((diet) =>
          diet?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase())
        ) ?? []
      );
    } else {
      setFilteredDiets(dietList);
    }
  }, [searchQuery]);

  // UI string for follow-up date (DD-MM-YYYY)
  const getFollowUpDisplay = () => {
    if (!followUpDate) return "";
    const dd = String(followUpDate.getDate()).padStart(2, "0");
    const mm = String(followUpDate.getMonth() + 1).padStart(2, "0");
    const yyyy = followUpDate.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const handleFollowUpDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowFollowUpPicker(false);
    }
    if (!date) return;

    setFollowUpDate(date);

    // Store for API as YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const apiString = `${yyyy}-${mm}-${dd}`;

    setFormData((data) => ({
      ...data,
      followUpDate: apiString,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData?.dischargeType || formData?.dischargeType === 0) {
      Alert.alert("Error", "Please select a reason for Discharge");
      return false;
    }

    if (formData?.followUp === 1 && !followUpDate) {
      Alert.alert("Error", "Follow-up date is required.");
      return false;
    }

    if (!formData?.diagnosis?.trim()) {
      Alert.alert("Error", "Final diagnosis is required.");
      return false;
    }

    return true;
  };

  const handleDischarge = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = user?.token || (await AsyncStorage.getItem("token"));
      const response = await AuthPost(
        `patient/${hospitalID}/patients/discharge/${patientId}`,
        {
          dischargeType: formData?.dischargeType,
          diet: selectedDiets?.join(","),
          advice: formData?.advice,
          followUp: formData?.followUp,
          followUpDate: formData?.followUpDate,
          diagnosis: formData?.diagnosis,
          prescription: formData?.prescription,
        },
        token
      );

      if (response?.status === "success") {
        dispatch(showSuccess("Patient successfully discharged"));
        setTimeout(() => {
          navigation.navigate("DischargePatient" as never);
        }, 2000);
      } else {
         dispatch(showError(response?.message ||"Patient discharge failed"));
        
      }
    } catch (error) {
        dispatch(showError(error?.message ||"An error occurred during discharge"));
     
    } finally {
      setLoading(false);
    }
  };

  const toggleDiet = (diet: string) => {
    if (selectedDiets?.includes(diet)) {
      setSelectedDiets(
        selectedDiets?.filter((item) => item !== diet) ?? []
      );
    } else {
      setSelectedDiets([...(selectedDiets ?? []), diet]);
    }
  };

  const removeDiet = (diet: string) => {
    setSelectedDiets(
      selectedDiets?.filter((item) => item !== diet) ?? []
    );
  };

  if (!patientId || !hospitalID) {
    return (
      <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: COLORS.text }]}>
            Invalid patient data
          </Text>
        </View>
        <View
          style={[
            styles.footerWrap,
            {
              paddingBottom:
                (insets.bottom || RESPONSIVE.spacing.md) +
                RESPONSIVE.spacing.lg,
            },
          ]}
        >
          <Footer active={"patients"} brandColor="#14b8a6" />
        </View>
      </View>
    );
  }

  // Diet trigger text: show selected names (comma separated) or placeholder
  const dietTriggerLabel =
    selectedDiets.length === 0
      ? "Select diets..."
      : selectedDiets.join(", ");

  return (
   <SafeAreaView
    style={[styles.safe, { backgroundColor: COLORS.bg }]}
    edges={["top", "left", "right", "bottom"]}
  >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom:
              RESPONSIVE.spacing.xxl * 2 +
              (insets.bottom || RESPONSIVE.spacing.lg) +
              100, // enough space above buttons & footer
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.gridContainer}>
              {/* Left Column - Form */}
              <View style={styles.formColumn}>
                {/* Reason for Discharge */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: COLORS.text }]}>
                    Reason for Discharge *
                  </Text>
                  <View
                    style={[
                      styles.pickerContainer,
                      {
                        borderColor: COLORS.border,
                        backgroundColor: COLORS.inputBg,
                      },
                    ]}
                  >
                    <Picker
                      selectedValue={String(formData?.dischargeType)}
                      onValueChange={(value) =>
                        setFormData((data) => ({
                          ...data,
                          dischargeType: Number(value),
                          ...(Number(value) !== 1
                            ? {
                                followUp: 0,
                                followUpDate: "",
                              }
                            : {}),
                        }))
                      }
                      style={[styles.picker, { color: COLORS.text }]}
                    >
                      <Picker.Item label="Select reason" value="0" />
                      <Picker.Item label="Discharge Success" value="1" />
                      <Picker.Item label="DOPR" value="2" />
                      <Picker.Item label="Absconded" value="3" />
                      <Picker.Item
                        label="Left against medical advice"
                        value="4"
                      />
                      <Picker.Item label="Death" value="5" />
                    </Picker>
                  </View>
                </View>

                {/* Date */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: COLORS.text }]}>
                    Date
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.disabledInput,
                      {
                        backgroundColor: COLORS.inputBg,
                        color: COLORS.text,
                        borderColor: COLORS.border,
                      },
                    ]}
                    value={formatDateTime(new Date())}
                    editable={false}
                  />
                </View>

                {/* If Discharge Success */}
                {formData?.dischargeType === 1 && (
                  <>
                    {/* Diet Section */}
                    <View style={styles.formGroup}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: COLORS.text },
                        ]}
                      >
                        Diet
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.dietDropdownTrigger,
                          {
                            backgroundColor: COLORS.inputBg,
                            borderColor: COLORS.border,
                          },
                        ]}
                        onPress={() => setDropdownVisible(true)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.dietDropdownText,
                            {
                              color:
                                selectedDiets?.length > 0
                                  ? COLORS.text
                                  : COLORS.sub,
                            },
                          ]}
                         numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {dietTriggerLabel}
                        </Text>
                        <ChevronDownIcon
                          size={RESPONSIVE.icon.md}
                          color={COLORS.sub}
                        />
                      </TouchableOpacity>

                      {/* {selectedDiets?.length > 0 && (
                        <View style={styles.chipsContainer}>
                          {selectedDiets?.map((item, index) => (
                            <View
                              key={index}
                              style={[
                                styles.chip,
                                { backgroundColor: `${COLORS.button}20` },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  { color: COLORS.text },
                                ]}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {item}qwerty
                              </Text>
                              <TouchableOpacity
                                onPress={() => removeDiet(item)}
                                style={styles.chipRemove}
                              >
                                <XIcon
                                  size={RESPONSIVE.icon.sm}
                                  color={COLORS.text}
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )} */}
                    </View>

                    {/* Advice on Discharge */}
                    <View style={styles.formGroup}>
                      <Text style={[styles.label, { color: COLORS.text }]}>
                        Advice on Discharge
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          styles.textArea,
                          {
                            backgroundColor: COLORS.inputBg,
                            color: COLORS.text,
                            borderColor: COLORS.border,
                          },
                        ]}
                        multiline
                        numberOfLines={3}
                        placeholder="Enter advice"
                        placeholderTextColor={COLORS.sub}
                        value={formData?.advice}
                        onChangeText={(text) =>
                          setFormData((data) => ({
                            ...data,
                            advice: text,
                          }))
                        }
                      />
                    </View>

                    {/* Prescription */}
                    <View style={styles.formGroup}>
                      <Text style={[styles.label, { color: COLORS.text }]}>
                        Prescription
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          styles.textArea,
                          {
                            backgroundColor: COLORS.inputBg,
                            color: COLORS.text,
                            borderColor: COLORS.border,
                          },
                        ]}
                        multiline
                        numberOfLines={3}
                        placeholder="Enter prescription"
                        placeholderTextColor={COLORS.sub}
                        value={formData?.prescription}
                        onChangeText={(text) =>
                          setFormData((data) => ({
                            ...data,
                            prescription: text,
                          }))
                        }
                      />
                    </View>
                  </>
                )}

                {/* Final Diagnosis */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: COLORS.text }]}>Final Diagnosis *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, {
                      backgroundColor: COLORS.inputBg,
                      color: COLORS.text,
                      borderColor: COLORS.border
                    }]}
                    multiline
                    numberOfLines={3}
                    placeholder="Enter final diagnosis"
                    placeholderTextColor={COLORS.sub}
                    value={formData?.diagnosis}
                    onChangeText={(text) =>
                      setFormData((data) => ({
                        ...data,
                        diagnosis: text,
                      }))
                    }
                  />
                </View>

                {/* Follow Up (only when Discharge Success) */}
                {formData?.dischargeType === 1 && (
                  <View style={styles.row}>
                    {/* Follow Up Required */}
                    <View style={[styles.formGroup, styles.halfWidth]}>
                      <Text style={[styles.label, { color: COLORS.text }]}>
                        Follow up required?
                      </Text>
                      <View
                        style={[
                          styles.pickerContainer,
                          {
                            borderColor: COLORS.border,
                            backgroundColor: COLORS.inputBg,
                          },
                        ]}
                      >
                        <Picker
                          selectedValue={String(formData?.followUp)}
                          onValueChange={(value) => {
                            const v = Number(value);
                            setFormData((data) => ({
                              ...data,
                              followUp: v,
                              ...(v === 0 ? { followUpDate: "" } : {}),
                            }));
                            if (v === 0) {
                              setFollowUpDate(null);
                              setShowFollowUpPicker(false);
                            }
                          }}
                          style={[styles.picker, { color: COLORS.text }]}
                        >
                          <Picker.Item label="No" value="0" />
                          <Picker.Item label="Yes" value="1" />
                        </Picker>
                      </View>
                    </View>

                    {/* Follow Up Date (DatePicker) */}
                    <View style={[styles.formGroup, styles.halfWidth]}>
                      <Text style={[styles.label, { color: COLORS.text }]}>
                        Follow up Date
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                          formData?.followUp === 1 &&
                          setShowFollowUpPicker(true)
                        }
                        disabled={formData?.followUp === 0}
                      >
                        <TextInput
                          style={[
                            styles.input,
                            {
                              backgroundColor: COLORS.inputBg,
                              color: COLORS.text,
                              borderColor: COLORS.border,
                            },
                            formData?.followUp === 0 &&
                              styles.disabledInput,
                          ]}
                          placeholder="DD-MM-YYYY"
                          placeholderTextColor={COLORS.sub}
                          value={getFollowUpDisplay()}
                          editable={false}
                        />
                      </TouchableOpacity>

                      {showFollowUpPicker && (
                        <DateTimePicker
                          value={followUpDate || new Date()}
                          mode="date"
                          display={
                            Platform.OS === "android"
                              ? "spinner"
                              : "default"
                          }
                          
                          minimumDate={new Date()}
                          onChange={handleFollowUpDateChange}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Actions – above footer and navigation bar */}
        <View
          style={[
            styles.actions,
            {
              backgroundColor: COLORS.card,
              borderTopColor: COLORS.border,
              paddingBottom:
               
                RESPONSIVE.spacing.xs, // lift buttons above nav bar
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: COLORS.cancelButton },
            ]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.button }]}
            onPress={handleDischarge}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer (bottom navigation), clearly above system nav bar */}
        <View
          style={[
            styles.footerWrap,
            {
              paddingBottom:
                (insets.bottom || RESPONSIVE.spacing.md) +
                RESPONSIVE.spacing.lg,
            },
          ]}
        >
          <Footer active={"patients"} brandColor="#14b8a6" />
        </View>
      </KeyboardAvoidingView>

      {/* Diet Dropdown Modal */}
      <DietDropdown
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        selectedDiets={selectedDiets}
        onToggleDiet={toggleDiet}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredDiets={filteredDiets}
      />
    </SafeAreaView>
  );
};

export default DischargeScreen;
