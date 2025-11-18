import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../../store/store';
import { MedicineType, PatientType } from '../../../utils/types';
import { AuthPost } from '../../../auth/auth';
import { debounce } from '../../../utils/debounce';
import { 
  ArrowLeftIcon, 
  PillIcon, 
  SyringeIcon, 
  DropletIcon, 
  TestTubeIcon, 
  BandageIcon, 
  ActivityIcon, 
  WindIcon, 
  SquareIcon, 
  BeakerIcon,
  PlusIcon,
  SyrupIcon
} from '../../../utils/SvgIcons';
import Footer from '../../dashboard/footer';

// Import responsive utilities
import {
  isTablet,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT
} from '../../../utils/responsive';

// Import colors
import { COLORS } from '../../../utils/colour';

// Medicine Category Options
const medicineCategories = [
  { label: 'Capsules', value: 1, icon: PillIcon },
  { label: 'Syrups', value: 2, icon: SyrupIcon },
  { label: 'Tablets', value: 3, icon: SquareIcon },
  { label: 'Injections', value: 4, icon: SyringeIcon },
  { label: 'IV Line', value: 5, icon: ActivityIcon },
  { label: 'Tubing', value: 6, icon: TestTubeIcon },
  { label: 'Topical', value: 7, icon: BandageIcon },
  { label: 'Drops', value: 8, icon: DropletIcon },
  { label: 'Spray', value: 9, icon: WindIcon },
  { label: 'Ventilator', value: 10, icon: WindIcon },
];

// Medication Time Options
const medicationTimes = [
  'Before Breakfast',
  'After Breakfast',
  'Before Lunch',
  'After Lunch',
  'Before Dinner',
  'After Dinner',
  'Before Sleep',
  'As Per Need',
];

const AddMedicineScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient) as PatientType | undefined;

  const [medicineData, setMedicineData] = useState({
    timeLineID: currentPatient?.patientTimeLineID || null,
    userID: user?.id || null,
    medicineType: null as number | null,
    medicineName: '',
    daysCount: null as number | null,
    doseCount: null as number | null,
    Frequency: 1,
    medicationTime: '',
    doseTimings: new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    notes: '',
  });

  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // NEW: State for medicine autocomplete
  const [medicineSuggestions, setMedicineSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMedicineSelected, setIsMedicineSelected] = useState(false);

  // NEW: Medicine autocomplete function
  const fetchMedicineSuggestions = async (text: string) => {
    try {
      if (text.length < 3) {
        setMedicineSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const token = user?.token || (await AsyncStorage.getItem('token'));
      
      const response = await AuthPost(
        `medicine/${user?.hospitalID}/getMedicines`,
        { text },
        token
      );

      // Handle different response structures
      if (response?.data?.message === 'success') {
        const names = response?.data?.medicines?.map((m: any) => m.Medicine_Name).filter(Boolean) || [];
        setMedicineSuggestions(names);
        setShowSuggestions(names.length > 0);
      } else {
        setMedicineSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      setMedicineSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // NEW: Debounced version of the function
  const debouncedFetchSuggestions = useCallback(
    debounce((text: string) => {
      fetchMedicineSuggestions(text);
    }, 300),
    [user]
  );

  const handleTimeSelect = (time: string) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter(t => t !== time));
    } else {
      setSelectedTimes([...selectedTimes, time]);
    }
  };

  const getDosageUnit = () => {
    const type = medicineData.medicineType;
    if (type === 1 || type === 3) return 'mg';
    if (type === 6) return 'g';
    return 'ml';
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const token = user?.token || (await AsyncStorage.getItem('token'));
      
      const finalData = {
        timeLineID: medicineData.timeLineID,
        userID: medicineData.userID,
        medicineType: medicineData.medicineType,
        medicineName: medicineData.medicineName,
        daysCount: medicineData.daysCount,
        doseCount: medicineData.doseCount,
        Frequency: medicineData.Frequency,
        medicationTime: selectedTimes.join(','),
        doseTimings: medicineData.doseTimings,
        notes: medicineData.notes,
        patientID: currentPatient?.id,
      };

      const response = await AuthPost('medicine', { medicines: [finalData] }, token);

      if (response?.data?.message === 'success') {
        Alert.alert('Success', 'Medicine added successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', response?.message || 'Failed to add medicine');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!medicineData.medicineType) {
      Alert.alert('Error', 'Please select medicine type');
      return false;
    }
    if (!medicineData.medicineName?.trim()) {
      Alert.alert('Error', 'Please enter medicine name');
      return false;
    }
    if (!medicineData.doseCount || medicineData.doseCount <= 0) {
      Alert.alert('Error', 'Please enter valid dosage');
      return false;
    }
    if (!medicineData.daysCount || medicineData.daysCount <= 0) {
      Alert.alert('Error', 'Please enter valid number of days');
      return false;
    }
    if (selectedTimes?.length === 0) {
      Alert.alert('Error', 'Please select medication time');
      return false;
    }
    if (selectedTimes?.length > medicineData.Frequency) {
      Alert.alert('Error', `Please select only ${medicineData.Frequency} time(s) of medication`);
      return false;
    }
    return true;
  };

  // NEW: Function to handle medicine selection from suggestions
  const handleMedicineSelect = (medicineName: string) => {
    setMedicineData({ ...medicineData, medicineName });
    setIsMedicineSelected(true);
    setShowSuggestions(false);
    setMedicineSuggestions([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Adding...' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, {
            paddingBottom: FOOTER_HEIGHT + SPACING.md + insets.bottom
          }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Medicine Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medicine Type</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {medicineCategories?.map((category) => {
                const Icon = category?.icon;
                const isSelected = medicineData.medicineType === category?.value;
                
                return (
                  <TouchableOpacity
                    key={category?.value}
                    style={[
                      styles.categoryButton,
                      isSelected && styles.categoryButtonSelected,
                    ]}
                    onPress={() => setMedicineData({ ...medicineData, medicineType: category?.value })}
                  >
                    <View style={[
                      styles.categoryIcon,
                      isSelected && styles.categoryIconSelected,
                    ]}>
                      <Icon 
                        size={ICON_SIZE.md} 
                        color={isSelected ? COLORS.brand : COLORS.sub} 
                      />
                    </View>
                    <Text style={[
                      styles.categoryLabel,
                      isSelected && styles.categoryLabelSelected,
                    ]}>
                      {category?.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Medicine Name with Autocomplete */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medicine Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter medicine name"
                value={medicineData.medicineName}
                onChangeText={(text) => {
                  setMedicineData({ ...medicineData, medicineName: text });
                  setIsMedicineSelected(false);
                  setShowSuggestions(false);
                  
                  // Trigger autocomplete after a short delay
                  if (text.length >= 3) {
                    debouncedFetchSuggestions(text);
                  } else {
                    setMedicineSuggestions([]);
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (medicineData.medicineName.length >= 3 && medicineSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow for selection
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholderTextColor={COLORS.placeholder}
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && medicineSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView 
                    style={styles.suggestionsList}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {medicineSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => handleMedicineSelect(suggestion)}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            {medicineData.medicineName.length > 0 && medicineData.medicineName.length < 3 && (
              <Text style={styles.hintText}>Type 3 or more letters to see suggestions</Text>
            )}
          </View>

          {/* Dosage and Frequency */}
          <View style={styles.row}>
            <View style={[styles.section, styles.flex1]}>
              <Text style={styles.sectionTitle}>Dosage</Text>
              <View style={styles.dosageContainer}>
                <TextInput
                  style={[styles.textInput, styles.dosageInput]}
                  placeholder="0"
                  value={medicineData.doseCount?.toString() || ''}
                  onChangeText={(text) => {
                    const value = text === '' ? null : Number(text);
                    if (value !== null && value > 0) {
                      setMedicineData({ ...medicineData, doseCount: value });
                    } else {
                      setMedicineData({ ...medicineData, doseCount: null });
                    }
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.placeholder}
                />
                <Text style={styles.unitText}>
                  {medicineData.medicineType ? getDosageUnit() : '--'}
                </Text>
              </View>
            </View>

            <View style={[styles.section, styles.flex1]}>
              <Text style={styles.sectionTitle}>Frequency</Text>
              <View style={styles.frequencyContainer}>
                <TextInput
                  style={[styles.textInput, styles.frequencyInput]}
                  placeholder="1"
                  value={medicineData.Frequency?.toString() || '1'}
                  onChangeText={(text) => {
                    const value = text === '' ? 1 : Math.min(Math.max(Number(text), 1), 6);
                    setMedicineData({ ...medicineData, Frequency: value });
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.placeholder}
                  editable={!selectedTimes?.includes('As Per Need')}
                />
                <View style={styles.frequencyButtons}>
                  <TouchableOpacity
                    style={[styles.frequencyButton, styles.frequencyButtonUp]}
                    onPress={() => {
                      const newValue = Math.min((medicineData.Frequency || 1) + 1, 6);
                      setMedicineData({ ...medicineData, Frequency: newValue });
                    }}
                    disabled={medicineData.Frequency >= 6 || selectedTimes?.includes('As Per Need')}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      (medicineData.Frequency >= 6 || selectedTimes?.includes('As Per Need')) && styles.frequencyButtonDisabled
                    ]}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.frequencyButton, styles.frequencyButtonDown]}
                    onPress={() => {
                      const newValue = Math.max((medicineData.Frequency || 1) - 1, 1);
                      setMedicineData({ ...medicineData, Frequency: newValue });
                    }}
                    disabled={medicineData.Frequency <= 1 || selectedTimes?.includes('As Per Need')}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      (medicineData.Frequency <= 1 || selectedTimes?.includes('As Per Need')) && styles.frequencyButtonDisabled
                    ]}>↓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Days */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Number of Days</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter number of days"
              value={medicineData.daysCount?.toString() || ''}
              onChangeText={(text) => {
                const value = text === '' ? null : Number(text);
                if (value !== null && value > 0) {
                  setMedicineData({ ...medicineData, daysCount: value });
                } else {
                  setMedicineData({ ...medicineData, daysCount: null });
                }
              }}
              keyboardType="numeric"
              placeholderTextColor={COLORS.placeholder}
              editable={!selectedTimes?.includes('As Per Need')}
            />
          </View>

          {/* Medication Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Medication Time {medicineData.Frequency > 1 && `(Select ${medicineData.Frequency})`}
            </Text>
            <View style={styles.timeGrid}>
              {medicationTimes?.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeButton,
                    selectedTimes?.includes(time) && styles.timeButtonSelected,
                  ]}
                  onPress={() => handleTimeSelect(time)}
                >
                  <Text style={[
                    styles.timeButtonText,
                    selectedTimes?.includes(time) && styles.timeButtonTextSelected,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedTimes?.length > 0 && (
              <Text style={styles.selectedTimesText}>
                Selected: {selectedTimes?.join(', ')}
              </Text>
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              placeholder="Add any additional notes..."
              value={medicineData.notes}
              onChangeText={(text) => setMedicineData({ ...medicineData, notes: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footerContainer, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor={COLORS.brand} />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.bottomShield, { height: insets.bottom }]} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backButton: {
    padding: SPACING.xs,
  },
  submitButton: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.sub,
  },
  submitButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  section: {
    marginBottom: isTablet ? SPACING.lg : SPACING.md,
  },
  sectionTitle: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  categoryScrollContent: {
    paddingRight: SPACING.md,
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: isTablet ? SPACING.sm : SPACING.xs,
    padding: isTablet ? SPACING.sm : SPACING.xs,
    borderRadius: SPACING.sm,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: isTablet ? 90 : 80,
  },
  categoryButtonSelected: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  categoryIcon: {
    width: isTablet ? 44 : 40,
    height: isTablet ? 44 : 40,
    borderRadius: isTablet ? 22 : 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryIconSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  categoryLabel: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: '500',
    color: COLORS.sub,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: COLORS.brand,
    fontWeight: '600',
  },
  inputContainer: {
    position: 'relative',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: isTablet ? SPACING.sm : SPACING.xs,
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: SPACING.xs,
    borderBottomRightRadius: SPACING.xs,
    maxHeight: 150,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: isTablet ? SPACING.sm : SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
  },
  suggestionText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.text,
  },
  hintText: {
    fontSize: isTablet ? FONT_SIZE.xs : FONT_SIZE.xs - 1,
    color: COLORS.sub,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  dosageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dosageInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  unitText: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: isTablet ? SPACING.sm : SPACING.xs,
    backgroundColor: COLORS.pill,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: COLORS.border,
    borderTopRightRadius: SPACING.xs,
    borderBottomRightRadius: SPACING.xs,
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    color: COLORS.text,
    minWidth: isTablet ? 60 : 50,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: isTablet ? SPACING.sm : SPACING.xs,
  },
  flex1: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? SPACING.xs : 6,
  },
  timeButton: {
    paddingHorizontal: isTablet ? SPACING.md : SPACING.sm,
    paddingVertical: isTablet ? SPACING.sm : SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeButtonSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brandDark,
  },
  timeButtonText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: '500',
    color: COLORS.sub,
  },
  timeButtonTextSelected: {
    color: COLORS.buttonText,
    fontWeight: '600',
  },
  selectedTimesText: {
    marginTop: SPACING.xs,
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.brand,
    fontWeight: '500',
  },
  notesInput: {
    minHeight: isTablet ? 90 : 80,
    textAlignVertical: 'top',
  },
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    justifyContent: 'center',
  },
  bottomShield: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  frequencyButtons: {
    flexDirection: 'column',
    height: '100%',
  },
  frequencyButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.pill,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: COLORS.border,
    minWidth: isTablet ? 35 : 30,
  },
  frequencyButtonUp: {
    borderTopRightRadius: SPACING.xs,
    borderBottomWidth: 0.5,
  },
  frequencyButtonDown: {
    borderBottomRightRadius: SPACING.xs,
    borderTopWidth: 0.5,
  },
  frequencyButtonText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.text,
  },
  frequencyButtonDisabled: {
    color: COLORS.sub,
  },
});

export default AddMedicineScreen;