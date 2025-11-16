// DischargeScreen.tsx
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
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { AuthPost } from "../../auth/auth";
import { formatDateTime } from "../../utils/dateTime";
import { ChevronDownIcon, XIcon } from "../../utils/SvgIcons";
import Footer from "../dashboard/footer";
import { RouteParams, FormData, DietItem } from "../../utils/types";
import { RESPONSIVE, styles } from "./DischargeStyles";

const dietList: DietItem[] = [
  { id: "1", name: "Pineapple" },
  { id: "2", name: "Miannoase" },
  { id: "3", name: "Soft Diet" },
  { id: "4", name: "Liquid Diet" },
  { id: "5", name: "Diabetic Diet" },
  { id: "6", name: "Low Salt Diet" },
];

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
  filteredDiets 
}) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  
  const COLORS = {
    bg: isDark ? "#0f172a" : "#f8fafc",
    card: isDark ? "#0b1220" : "#ffffff",
    text: isDark ? "#e5e7eb" : "#0f172a",
    sub: isDark ? "#94a3b8" : "#475569",
    border: isDark ? "#334155" : "#e2e8f0",
    button: isDark ? "#0d9488" : "#14b8a6",
    buttonText: "#ffffff",
    cancelButton: isDark ? "#374151" : "#6b7280",
    inputBg: isDark ? "#1f2937" : "#ffffff",
    dropdownBg: isDark ? "#1f2937" : "#ffffff",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.dropdownOverlay}
        onPress={onClose}
      />
      <View style={[styles.dropdownContainer, { backgroundColor: COLORS.dropdownBg }]}>
        <View style={styles.dropdownHeader}>
          <Text style={[styles.dropdownTitle, { color: COLORS.text }]}>Select Diet</Text>
          <TouchableOpacity onPress={onClose}>
            <XIcon size={RESPONSIVE.icon.md} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: COLORS.inputBg, 
            color: COLORS.text,
            borderColor: COLORS.border 
          }]}
          placeholder="Search diets..."
          placeholderTextColor={COLORS.sub}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        
        <FlatList
          data={filteredDiets}
          keyExtractor={(item) => item?.id}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.dietItem,
                { 
                  backgroundColor: selectedDiets?.includes(item?.name) 
                    ? `${COLORS.button}20` 
                    : "transparent",
                  borderColor: COLORS.border
                }
              ]}
              onPress={() => onToggleDiet(item?.name)}
            >
              <Text style={[styles.dietItemText, { color: COLORS.text }]}>
                {item?.name}
              </Text>
              <View style={[
                styles.checkbox,
                { 
                  backgroundColor: selectedDiets?.includes(item?.name) 
                    ? COLORS.button 
                    : "transparent",
                  borderColor: COLORS.border
                }
              ]}>
                {selectedDiets?.includes(item?.name) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </Pressable>
          )}
          style={styles.dietList}
        />
        
        <View style={styles.dropdownActions}>
          <TouchableOpacity
            style={[styles.dropdownButton, { backgroundColor: COLORS.cancelButton }]}
            onPress={onClose}
          >
            <Text style={styles.dropdownButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dropdownButton, { backgroundColor: COLORS.button }]}
            onPress={onClose}
          >
            <Text style={styles.dropdownButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const DischargeScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";
  
  const user = useSelector((state: any) => state.currentUser);
  const { patientId, patientData, timelineData, hospitalID } = route.params ?? {};

  const COLORS = {
    bg: isDark ? "#0f172a" : "#f8fafc",
    card: isDark ? "#0b1220" : "#ffffff",
    text: isDark ? "#e5e7eb" : "#0f172a",
    sub: isDark ? "#94a3b8" : "#475569",
    border: isDark ? "#334155" : "#e2e8f0",
    button: isDark ? "#0d9488" : "#14b8a6",
    buttonText: "#ffffff",
    cancelButton: isDark ? "#374151" : "#6b7280",
    inputBg: isDark ? "#1f2937" : "#ffffff",
    dropdownBg: isDark ? "#1f2937" : "#ffffff",
  };

  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDiets, setFilteredDiets] = useState<DietItem[]>(dietList);

  const [formData, setFormData] = useState<FormData>({
    dischargeType: 0,
    advice: "",
    followUp: 0,
    followUpDate: "",
    diagnosis: "",
    prescription: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      setFilteredDiets(
        dietList?.filter(diet =>
          diet?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase())
        ) ?? []
      );
    } else {
      setFilteredDiets(dietList);
    }
  }, [searchQuery]);

  const validateForm = (): boolean => {
    if (!formData?.dischargeType || formData?.dischargeType === 0) {
      Alert.alert("Error", "Please select a reason for Discharge");
      return false;
    }

    if (formData?.followUp === 1 && !formData?.followUpDate?.trim()) {
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
    if (!validateForm()) {
      return;
    }

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
        Alert.alert("Success", "Patient successfully discharged");
        
        setTimeout(() => {
          navigation.navigate("DischargePatient" as never);
        }, 2000);
      } else {
        Alert.alert("Error", response?.message || "Discharge failed");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred during discharge");
    } finally {
      setLoading(false);
    }
  };

  const toggleDiet = (diet: string) => {
    if (selectedDiets?.includes(diet)) {
      setSelectedDiets(selectedDiets?.filter(item => item !== diet) ?? []);
    } else {
      setSelectedDiets([...(selectedDiets ?? []), diet]);
    }
  };

  const removeDiet = (diet: string) => {
    setSelectedDiets(selectedDiets?.filter(item => item !== diet) ?? []);
  };

  if (!patientId || !hospitalID) {
    return (
      <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: COLORS.text }]}>
            Invalid patient data
          </Text>
        </View>
        <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
          <Footer active={"patients"} brandColor="#14b8a6" />
        </View>
        {insets.bottom > 0 && (
          <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={styles.content}>
          <View style={styles.gridContainer}>
            {/* Left Column - Form */}
            <View style={styles.formColumn}>
              {/* Reason for Discharge */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.text }]}>Reason for Discharge *</Text>
                <View style={[styles.pickerContainer, { borderColor: COLORS.border, backgroundColor: COLORS.inputBg }]}>
                  <Picker
                    selectedValue={String(formData?.dischargeType)}
                    onValueChange={(value) =>
                      setFormData((data) => ({
                        ...data,
                        dischargeType: Number(value),
                      }))
                    }
                    style={[styles.picker, { color: COLORS.text }]}
                  >
                    <Picker.Item label="Select reason" value="0" />
                    <Picker.Item label="Discharge Success" value="1" />
                    <Picker.Item label="DOPR" value="2" />
                    <Picker.Item label="Absconded" value="3" />
                    <Picker.Item label="Left against medical advice" value="4" />
                    <Picker.Item label="Death" value="5" />
                  </Picker>
                </View>
              </View>

              {/* Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.text }]}>Date</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput, { 
                    backgroundColor: COLORS.inputBg, 
                    color: COLORS.text,
                    borderColor: COLORS.border 
                  }]}
                  value={formatDateTime(new Date())}
                  editable={false}
                />
              </View>

              {/* Conditional Fields for Discharge Success */}
              {formData?.dischargeType === 1 && (
                <>
                  {/* Diet Section */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Diet</Text>
                    
                    {/* Diet Dropdown Trigger */}
                    <TouchableOpacity
                      style={[styles.dietDropdownTrigger, { 
                        backgroundColor: COLORS.inputBg, 
                        borderColor: COLORS.border 
                      }]}
                      onPress={() => setDropdownVisible(true)}
                    >
                      <Text style={[styles.dietDropdownText, { color: selectedDiets?.length > 0 ? COLORS.text : COLORS.sub }]}>
                        {selectedDiets?.length > 0 ? `${selectedDiets?.length} diet(s) selected` : "Select diets..."}
                      </Text>
                      <ChevronDownIcon size={RESPONSIVE.icon.md} color={COLORS.sub} />
                    </TouchableOpacity>

                    {/* Selected Diet Chips */}
                    {selectedDiets?.length > 0 && (
                      <View style={styles.chipsContainer}>
                        {selectedDiets?.map((item, index) => (
                          <View key={index} style={[styles.chip, { backgroundColor: `${COLORS.button}20` }]}>
                            <Text style={[styles.chipText, { color: COLORS.text }]}>{item}</Text>
                            <TouchableOpacity
                              onPress={() => removeDiet(item)}
                              style={styles.chipRemove}
                            >
                              <XIcon size={RESPONSIVE.icon.sm} color={COLORS.text} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Advice on Discharge */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: COLORS.text }]}>Advice on Discharge</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { 
                        backgroundColor: COLORS.inputBg, 
                        color: COLORS.text,
                        borderColor: COLORS.border 
                      }]}
                      multiline
                      numberOfLines={3}
                      placeholder="Enter advice"
                      placeholderTextColor={COLORS.sub}
                      value={formData?.advice}
                      onChangeText={(text) =>
                        setFormData((data) => ({ ...data, advice: text }))
                      }
                    />
                  </View>

                  {/* Prescription */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: COLORS.text }]}>Prescription</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { 
                        backgroundColor: COLORS.inputBg, 
                        color: COLORS.text,
                        borderColor: COLORS.border 
                      }]}
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
                    setFormData((data) => ({ ...data, diagnosis: text }))
                  }
                />
              </View>

              {/* Follow Up Section - Only for Discharge Success */}
              {formData?.dischargeType === 1 && (
                <View style={styles.row}>
                  {/* Follow Up Required */}
                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={[styles.label, { color: COLORS.text }]}>Follow up required?</Text>
                    <View style={[styles.pickerContainer, { borderColor: COLORS.border, backgroundColor: COLORS.inputBg }]}>
                      <Picker
                        selectedValue={String(formData?.followUp)}
                        onValueChange={(value) =>
                          setFormData((data) => ({
                            ...data,
                            followUp: Number(value),
                          }))
                        }
                        style={[styles.picker, { color: COLORS.text }]}
                      >
                        <Picker.Item label="No" value="0" />
                        <Picker.Item label="Yes" value="1" />
                      </Picker>
                    </View>
                  </View>

                  {/* Follow Up Date */}
                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={[styles.label, { color: COLORS.text }]}>Follow up Date</Text>
                    <TextInput
                      style={[
                        styles.input, 
                        { 
                          backgroundColor: COLORS.inputBg, 
                          color: COLORS.text,
                          borderColor: COLORS.border 
                        },
                        formData?.followUp === 0 && styles.disabledInput,
                      ]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.sub}
                      value={formData?.followUpDate}
                      onChangeText={(text) =>
                        setFormData((data) => ({
                          ...data,
                          followUpDate: text,
                        }))
                      }
                      editable={formData?.followUp === 1}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Right Column - Image (commented out as per original) */}
            {/* <View style={styles.imageColumn}>
              <Image
                source={DISCHARGE_GIF}
                style={styles.dischargeImage}
                resizeMode="contain"
              />
            </View> */}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={[styles.actions, { backgroundColor: COLORS.card, borderTopColor: COLORS.border }]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: COLORS.cancelButton }]}
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

      Footer
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

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
    </View>
  );
};

export default DischargeScreen;