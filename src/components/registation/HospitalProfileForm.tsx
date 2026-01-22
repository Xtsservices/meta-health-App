import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, ShieldCheck } from 'lucide-react-native';
import { AuthFetch, AuthPost } from '../../auth/auth';
interface ProfileField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

const HOSPITAL_FIELDS: ProfileField[] = [
  { name: 'registrationNumber', label: 'Registration Number', type: 'text', required: true, placeholder: 'DGN2024001' },
  { name: 'yearOfEstablishment', label: 'Year of Establishment', type: 'number', required: true, placeholder: '2020' },
  { name: 'hospitalType', label: 'Hospital Type', type: 'text', required: true, placeholder: 'Multi-Speciality' },
  { name: 'ownership', label: 'Ownership', type: 'text', required: true, placeholder: 'Private' },
  { name: 'totalBeds', label: 'Total Beds', type: 'number', required: true },
  { name: 'icuBeds', label: 'ICU Beds', type: 'number', required: true },
  { name: 'emergencyFacility', label: 'Emergency Facility', type: 'text', required: true },
  { name: 'operationTheatres', label: 'Operation Theatres', type: 'number', required: true },
  { name: 'generalWard', label: 'General Ward', type: 'number', required: true },
  { name: 'semiPrivate', label: 'Semi Private', type: 'number', required: true },
  { name: 'privateRoom', label: 'Private Room', type: 'number', required: true },
  { name: 'deluxeSuite', label: 'Deluxe Suite', type: 'number', required: true },
  { name: 'totalDoctors', label: 'Total Doctors', type: 'number', required: true },
  { name: 'nursesAndSupport', label: 'Nurses and Support', type: 'number', required: true },
  { name: 'visitingConsultants', label: 'Visiting Consultants', type: 'number', required: true },
  { name: 'laboratory24x7', label: 'Laboratory 24x7', type: 'text', required: true },
  { name: 'pharmacy24x7', label: 'Pharmacy 24x7', type: 'text', required: true },
  { name: 'radiologyXRay', label: 'Radiology X-Ray', type: 'text', required: true },
  { name: 'radiologyCT', label: 'Radiology CT', type: 'text', required: true },
  { name: 'radiologyMRI', label: 'Radiology MRI', type: 'text', required: true },
  { name: 'radiologyUltrasound', label: 'Radiology Ultrasound', type: 'text', required: true },
  { name: 'ambulanceService', label: 'Ambulance Service', type: 'text', required: true },
  { name: 'bloodBank', label: 'Blood Bank', type: 'text', required: true },
  { name: 'physiotherapyUnit', label: 'Physiotherapy Unit', type: 'text', required: true },
  { name: 'nabhAccredited', label: 'NABH Accredited', type: 'text', required: true },
  { name: 'isoCertification', label: 'ISO Certification', type: 'text', required: true },
  { name: 'fireSafetyClearance', label: 'Fire Safety Clearance', type: 'text', required: true },
  { name: 'pollutionControlCompliance', label: 'Pollution Control Compliance', type: 'text', required: true },
];

const HospitalProfileForm = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { hospitalId } = route.params as { hospitalId?: string };
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  
  const getToken = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return null;
      const user = JSON.parse(userData);
      return user?.token || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Please login to continue');
        navigation.navigate('Login');
        return;
      }

      const id = hospitalId || await getHospitalIdFromStorage();
      if (!id) {
        setLoading(false);
        return;
      }

      setProfileId(id);
      
      try {
        const response = await AuthFetch(`hospital/${id}/profile`, token) as any;
        if (response?.status === 'success' && response.data) {
          const profileData = response.data.hospitalProfile || response.data;
          if (profileData && profileData.registrationNumber) {
            setFormData(profileData);
            setHasExistingProfile(true);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [hospitalId, navigation]);

  const getHospitalIdFromStorage = async (): Promise<string | null> => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return null;
      const user = JSON.parse(userData);
      return user?.hospitalID || user?.hospitalId || null;
    } catch {
      return null;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Please login to continue');
        navigation.navigate('Login');
        return;
      }

      let response;
      if (profileId) {
        response = await AuthPost(`hospital/${profileId}/profile`, formData, token) as any;
      } else {
        response = await AuthPost('hospital/profile', formData, token) as any;
      }

      if (response?.status === 'success' || response?.data?.message?.toLowerCase().includes('success')) {
        Alert.alert('Success', response?.data?.message || 'Profile saved successfully');
        setHasExistingProfile(true);
        if (response?.data?.hospitalId) {
          setProfileId(response.data.hospitalId);
        }
      } else {
        Alert.alert('Error', response?.message || 'Failed to save profile');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitForVerification = async () => {
    if (!profileId) {
      Alert.alert('Error', 'Please save your profile first');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Please login to continue');
        navigation.navigate('Login');
        return;
      }

      const response = await AuthPost(`hospital/${profileId}/profile/submit-verification`, {}, token) as any;
      
      if (response?.data?.currentStatus === 'approval_awaiting') {
        Alert.alert('Info', 'Profile is already pending approval');
      } else if (response?.status === 'success' || response?.data?.message?.toLowerCase().includes('success')) {
        Alert.alert('Success', 'Profile submitted for verification');
      } else {
        Alert.alert('Error', response?.message || 'Failed to submit for verification');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit for verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: ProfileField) => {
    const value = formData[field.name];
    
    if (hasExistingProfile) {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.readOnlyValue}>{value || '-'}</Text>
        </View>
      );
    }

    if (field.name === 'yearOfEstablishment') {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>
            {field.label} {field.required && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={[styles.input, formErrors[field.name] && styles.inputError]}
            placeholder={field.placeholder}
            value={value ? String(value) : ''}
            onChangeText={(text) => {
              const num = parseInt(text);
              if (!isNaN(num) || text === '') {
                handleInputChange(field.name, text === '' ? '' : num);
              }
            }}
            keyboardType="numeric"
            maxLength={4}
            editable={!isSubmitting}
          />
          {formErrors[field.name] && (
            <Text style={styles.errorText}>{formErrors[field.name]}</Text>
          )}
        </View>
      );
    }

    if (field.type === 'number') {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>
            {field.label} {field.required && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={[styles.input, formErrors[field.name] && styles.inputError]}
            placeholder={field.placeholder}
            value={value ? String(value) : ''}
            onChangeText={(text) => {
              const num = parseInt(text);
              if (!isNaN(num) || text === '') {
                handleInputChange(field.name, text === '' ? '' : num);
              }
            }}
            keyboardType="numeric"
            editable={!isSubmitting}
          />
          {formErrors[field.name] && (
            <Text style={styles.errorText}>{formErrors[field.name]}</Text>
          )}
        </View>
      );
    }

    if (['emergencyFacility', 'laboratory24x7', 'pharmacy24x7', 'ambulanceService', 'bloodBank', 
         'physiotherapyUnit', 'nabhAccredited', 'isoCertification', 'fireSafetyClearance', 
         'pollutionControlCompliance', 'radiologyXRay', 'radiologyCT', 'radiologyMRI', 'radiologyUltrasound'].includes(field.name)) {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>
            {field.label} {field.required && <Text style={styles.required}>*</Text>}
          </Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => handleInputChange(field.name, 'Yes')}
              disabled={isSubmitting}
            >
              <View style={styles.radioCircle}>
                {value === 'Yes' && <View style={styles.radioSelected} />}
              </View>
              <Text style={styles.radioText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => handleInputChange(field.name, 'No')}
              disabled={isSubmitting}
            >
              <View style={styles.radioCircle}>
                {value === 'No' && <View style={styles.radioSelected} />}
              </View>
              <Text style={styles.radioText}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (['hospitalType', 'ownership'].includes(field.name)) {
      const options = field.name === 'hospitalType' 
        ? ['Multi-Speciality', 'Super-Speciality', 'Clinic', 'Nursing Home']
        : ['Private', 'Trust', 'Government'];

      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>
            {field.label} {field.required && <Text style={styles.required}>*</Text>}
          </Text>
          <View style={styles.optionsContainer}>
            {options.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.optionButton, value === option && styles.optionButtonSelected]}
                onPress={() => handleInputChange(field.name, option)}
                disabled={isSubmitting}
              >
                <Text style={[styles.optionText, value === option && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer} key={field.name}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[styles.input, formErrors[field.name] && styles.inputError]}
          placeholder={field.placeholder}
          value={value || ''}
          onChangeText={(text) => handleInputChange(field.name, text)}
          editable={!isSubmitting}
        />
        {formErrors[field.name] && (
          <Text style={styles.errorText}>{formErrors[field.name]}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#03989e" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          {hasExistingProfile ? (
            <Text style={styles.subtitle}>
              View your hospital profile information
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              Complete your profile to activate your account
            </Text>
          )}

          {HOSPITAL_FIELDS.map(field => renderField(field))}

          <View style={styles.buttonContainer}>
            {!hasExistingProfile && (
              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
                onPress={saveProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Check size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {hasExistingProfile && (
              <TouchableOpacity
                style={[styles.verifyButton, isSubmitting && styles.buttonDisabled]}
                onPress={submitForVerification}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <ShieldCheck size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Submit for Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginLeft: -40,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  readOnlyValue: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#03989e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#03989e',
  },
  radioText: {
    fontSize: 16,
    color: '#374151',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    backgroundColor: '#03989e',
    borderColor: '#03989e',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    marginTop: 32,
    marginBottom: 40,
  },
  saveButton: {
    backgroundColor: '#03989e',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HospitalProfileForm;