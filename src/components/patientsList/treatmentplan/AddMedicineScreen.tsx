import React, { useState } from 'react';
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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../../store/store';
import { MedicineType, PatientType } from '../../../utils/types';
import { AuthPost } from '../../../auth/auth';
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
  PlusIcon ,
  SyrupIcon
} from '../../../utils/SvgIcons';
import Footer from '../../dashboard/footer';
import usePreOpForm from '../../../utils/usePreOpForm';
import usePostOPStore from '../../../utils/usePostopForm';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const mapToStoreFormat = (med: any) => ({
  name: med.medicineName,
  days: med.daysCount,
  dosage: med.doseCount,
  time: med.medicationTime,
  notify: false,
});


const getCategoryFromType = (type: number) => {
  switch (type) {
    case 1: return "capsules";
    case 2: return "syrups";
    case 3: return "tablets";
    case 4: return "injections";
    case 5: return "ivLine";
    case 6: return "tubing";
    case 7: return "topical";
    case 8: return "drop";
    case 9: return "spray";
    case 10: return "ventilator";
    default: return "capsules";
  }
};


const AddMedicineScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient) as PatientType | undefined;
const route = useRoute<any>();
const activeTab = route.params?.currentTab;

const { medications: preOpMeds, setMedications } = usePreOpForm();
const { medications: postOpMeds, setPostMedications } = usePostOPStore();

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

  const category = getCategoryFromType(finalData?.medicineType);
const newEntry = mapToStoreFormat(finalData);
if (activeTab === "PreOpRecord") {
  const existing = preOpMeds[category] || [];
 
  setMedications(category, [...existing, newEntry]);
}

if (activeTab === "PostOpRecord") {
  const existing = postOpMeds[category] || [];
  setPostMedications(category, [...existing, newEntry]);
}

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
          contentContainerStyle={styles.scrollContent}
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
                        size={SCREEN_WIDTH < 375 ? 18 : 20} 
                        color={isSelected ? '#14b8a6' : '#9ca3af'} 
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

          {/* Medicine Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medicine Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter medicine name"
              value={medicineData.medicineName}
              onChangeText={(text) => setMedicineData({ ...medicineData, medicineName: text })}
              placeholderTextColor="#9ca3af"
            />
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
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.unitText}>
                  {medicineData.medicineType ? getDosageUnit() : '--'}
                </Text>
              </View>
            </View>

            <View style={[styles.section, styles.flex1]}>
              <Text style={styles.sectionTitle}>Frequency</Text>
              <TextInput
                style={styles.textInput}
                placeholder="1"
                value={medicineData.Frequency?.toString() || '1'}
                onChangeText={(text) => {
                  const value = text === '' ? 1 : Math.min(Math.max(Number(text), 1), 6);
                  setMedicineData({ ...medicineData, Frequency: value });
                }}
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                editable={!selectedTimes?.includes('As Per Need')}
              />
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
              placeholderTextColor="#9ca3af"
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
              placeholderTextColor="#9ca3af"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footerContainer, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 16 : 18,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: SCREEN_WIDTH < 375 ? 20 : 24,
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  categoryScrollContent: {
    paddingRight: 16,
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: SCREEN_WIDTH < 375 ? 10 : 12,
    padding: SCREEN_WIDTH < 375 ? 10 : 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: SCREEN_WIDTH < 375 ? 70 : 80,
  },
  categoryButtonSelected: {
    backgroundColor: '#f0fdfa',
    borderColor: '#14b8a6',
  },
  categoryIcon: {
    width: SCREEN_WIDTH < 375 ? 36 : 40,
    height: SCREEN_WIDTH < 375 ? 36 : 40,
    borderRadius: SCREEN_WIDTH < 375 ? 18 : 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryIconSelected: {
    borderColor: '#14b8a6',
    backgroundColor: '#f0fdfa',
  },
  categoryLabel: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: SCREEN_WIDTH < 375 ? 10 : 12,
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    color: '#374151',
    backgroundColor: '#fff',
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
    paddingHorizontal: 12,
    paddingVertical: SCREEN_WIDTH < 375 ? 10 : 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#d1d5db',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    color: '#374151',
    minWidth: SCREEN_WIDTH < 375 ? 50 : 60,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: SCREEN_WIDTH < 375 ? 10 : 12,
  },
  flex1: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SCREEN_WIDTH < 375 ? 6 : 8,
  },
  timeButton: {
    paddingHorizontal: SCREEN_WIDTH < 375 ? 14 : 16,
    paddingVertical: SCREEN_WIDTH < 375 ? 8 : 10,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeButtonSelected: {
    backgroundColor: '#14b8a6',
    borderColor: '#0d9488',
  },
  timeButtonText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  timeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedTimesText: {
    marginTop: 8,
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    color: '#14b8a6',
    fontWeight: '500',
  },
  notesInput: {
    minHeight: SCREEN_WIDTH < 375 ? 70 : 80,
    textAlignVertical: 'top',
  },
  footerContainer: {
    left: 0,
    right: 0,
    height: 70,
    justifyContent: 'center',
  },
  bottomShield: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});

export default AddMedicineScreen;