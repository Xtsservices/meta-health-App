import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ArrowLeft, 
  CheckCircle, 
  Save,
  ShieldCheck,
  Users,
  Award,
  Clock,
  Stethoscope,
  ChevronDown,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { useDispatch } from 'react-redux';
import { showSuccess, showError } from '../../store/toast.slice';
import { formatDateTime } from '../../utils/dateTime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 600;

// Responsive sizing
const FONT_SIZE = {
  xs: SCREEN_WIDTH * 0.03,
  sm: SCREEN_WIDTH * 0.035,
  md: SCREEN_WIDTH * 0.04,
  lg: SCREEN_WIDTH * 0.045,
  xl: SCREEN_WIDTH * 0.055,
};

const SPACING = {
  xs: SCREEN_WIDTH * 0.02,
  sm: SCREEN_WIDTH * 0.03,
  md: SCREEN_WIDTH * 0.04,
  lg: SCREEN_WIDTH * 0.05,
  xl: SCREEN_WIDTH * 0.06,
};

const responsiveHeight = (factor: number) => SCREEN_HEIGHT * (factor / 100);
const responsiveWidth = (factor: number) => SCREEN_WIDTH * (factor / 100);

const COLORS = {
  brand: '#03989e',
  text: '#111827',
  sub: '#6B7280',
  border: '#D1D5DB',
  placeholder: '#9CA3AF',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  background: '#f8fafc',
  white: '#ffffff',
  chipActive: '#03989e',
  chipInactive: '#e5e7eb',
};

// Languages list
const LANGUAGES = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 
  'Gujarati', 'Kannada', 'Odia', 'Malayalam', 'Punjabi', 'Assamese'
];

// Specializations list
const SPECIALIZATIONS = [
  'Cardiologist', 'Dermatologist', 'Pediatrician', 'Neurologist', 
  'Orthopedic Surgeon', 'Ophthalmologist', 'Gynecologist', 'ENT Specialist',
  'Psychiatrist', 'Radiologist', 'Anesthesiologist', 'General Physician',
  'Dentist', 'Pulmonologist', 'Gastroenterologist', 'Endocrinologist'
];

// Week days list
const WEEK_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Gender options
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

// Multi-select modal component
const MultiSelectModal = ({ 
  visible, 
  onClose, 
  options, 
  selected, 
  onSelect,
  title 
}: { 
  visible: boolean; 
  onClose: () => void; 
  options: string[]; 
  selected: string[]; 
  onSelect: (selected: string[]) => void;
  title: string;
}) => {
  const [tempSelected, setTempSelected] = useState<string[]>(selected);

  useEffect(() => {
    if (visible) {
      setTempSelected(selected);
    }
  }, [visible, selected]);

  const toggleOption = (option: string) => {
    if (tempSelected.includes(option)) {
      setTempSelected(tempSelected.filter(item => item !== option));
    } else {
      setTempSelected([...tempSelected, option]);
    }
  };

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <X size={FONT_SIZE.lg} color={COLORS.sub} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalOptionsList}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => toggleOption(option)}
              >
                <View style={[styles.checkbox, tempSelected.includes(option) && styles.checkboxChecked]}>
                  {tempSelected.includes(option) && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirm}>
              <Text style={styles.modalConfirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DoctorProfileForm = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { doctorId } = route?.params as { doctorId?: string } || {};
  
  const [formData, setFormData] = useState({
    specialization: '',
    gender: '',
    dob: '',
    qualifications: '',
    experienceYears: '',
    licenseNumber: '',
    consultationFee: '',
    availableFrom: '',
    availableTo: '',
    workingDays: [] as string[],
    about: '',
    achievements: '',
    languagesSpoken: [] as string[],
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  
  // Modal states
  const [workingDaysModalVisible, setWorkingDaysModalVisible] = useState(false);
  const [languagesModalVisible, setLanguagesModalVisible] = useState(false);

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
        dispatch(showError('Please login to continue'));
        navigation.navigate('Login');
        return;
      }

      const id = doctorId || await getDoctorIdFromStorage();
      if (!id) {
        setLoading(false);
        return;
      }

      setProfileId(id);
      
      try {
        const response = await AuthFetch(`doctor-profile/${id}`, token) as any;
        if (response?.status === 'success' && response?.data) {
          const profile = response.data.doctorProfile || response.data;
          if (profile && (profile.specialization || profile.qualifications)) {
            setFormData({
              specialization: profile.specialization || '',
              gender: profile.gender || '',
              dob: profile.dob ? profile.dob.slice(0, 10) : '',
              qualifications: profile.qualifications || '',
              experienceYears: profile.experienceYears ? profile.experienceYears.toString() : '',
              licenseNumber: profile.licenseNumber || '',
              consultationFee: profile.consultationFee ? profile.consultationFee.toString() : '',
              availableFrom: profile.availableFrom || '',
              availableTo: profile.availableTo || '',
              workingDays: profile.workingDays || [],
              about: profile.about || '',
              achievements: profile.achievements || '',
              languagesSpoken: profile.languagesSpoken || [],
            });
            setHasExistingProfile(true);
          }
        }
      } catch (error: any) {
        dispatch(showError(error?.message || 'Failed to load profile'));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [doctorId]);

  const getDoctorIdFromStorage = async (): Promise<string | null> => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return null;
      const user = JSON.parse(userData);
      return user?.doctorId || user?.id || user?.userId || null;
    } catch {
      return null;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.specialization) errors.specialization = 'Specialization is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (!formData.dob) errors.dob = 'Date of birth is required';
    if (!formData.qualifications) errors.qualifications = 'Qualifications are required';
    
    if (formData.qualifications && !/^[A-Za-z\s]+$/.test(formData.qualifications)) {
      errors.qualifications = 'Only alphabets and spaces allowed';
    }
    
    if (!formData.experienceYears) errors.experienceYears = 'Experience is required';
    else if (parseInt(formData.experienceYears) < 0) errors.experienceYears = 'Experience cannot be negative';
    
    if (!formData.licenseNumber) errors.licenseNumber = 'License number is required';
    if (!formData.consultationFee) errors.consultationFee = 'Consultation fee is required';
    else if (parseInt(formData.consultationFee) < 0) errors.consultationFee = 'Fee cannot be negative';
    
    if (!formData.availableFrom) errors.availableFrom = 'Available from time is required';
    if (!formData.availableTo) errors.availableTo = 'Available to time is required';
    if (formData.workingDays.length === 0) errors.workingDays = 'Select at least one working day';
    if (!formData.about) errors.about = 'About is required';
    if (!formData.achievements) errors.achievements = 'Achievements are required';
    if (formData.languagesSpoken.length === 0) errors.languagesSpoken = 'Select at least one language';
    
    if (formData.dob && new Date(formData.dob) > new Date()) {
      errors.dob = 'Date of birth cannot be in future';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveProfile = async () => {
    if (!validateForm()) {
      dispatch(showError('Please fill all required fields correctly'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      if (!token) return;

      const payload = {
        ...formData,
        experienceYears: parseInt(formData.experienceYears) || 0,
        consultationFee: parseInt(formData.consultationFee) || 0,
      };

let endpoint = '';

if (profileId) {
  endpoint = `doctor-profile/doctorProfile`;
} else {
  endpoint = 'doctor-profile/doctorProfile';
}

console.log('Calling API URL:', endpoint);
console.log('Payload:', payload);

let response: any = await AuthPost(endpoint, payload, token);

console.log('Profile save response:', response);

      if (response?.status === 'success' || response?.data?.message?.toLowerCase()?.includes('success')) {
        dispatch(showSuccess(response?.data?.message || 'Profile saved successfully'));
        setHasExistingProfile(true);
        if (response?.data?.doctorId) {
          setProfileId(response.data.doctorId);
        }
      } else {
        dispatch(showError(response?.message || 'Failed to save profile'));
      }
    } catch (error: any) {
      dispatch(showError(error?.message || 'Failed to save profile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitForVerification = async () => {
    if (!profileId) {
      dispatch(showError('Please save your profile first'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      if (!token) return;

      const payload = { 
        ...formData,
        userId: profileId,
        experienceYears: parseInt(formData.experienceYears) || 0,
        consultationFee: parseInt(formData.consultationFee) || 0,
      };
      
      const response = await AuthPost(`doctor-profile/${profileId}/submit-verification`, payload, token) as any;
      console.log('7676767', response);
      if (response?.data?.currentStatus === 'approval_awaiting') {
        dispatch(showError('Profile is already pending approval'));
      } else if (response?.status === 'success' || response?.data?.message?.toLowerCase()?.includes('success')) {
        dispatch(showSuccess('Profile submitted for verification'));
        setTimeout(() => {
          navigation?.navigate?.('Login');
        }, 1500);
      } else {
        dispatch(showError(response?.message || 'Failed to submit for verification'));
      }
    } catch (error: any) {
      dispatch(showError(error?.message || 'Failed to submit for verification'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading doctor profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation?.goBack?.()}
              disabled={isSubmitting}
            >
            </TouchableOpacity>
            {hasExistingProfile && (
              <View style={styles.statusContainer}>
                <CheckCircle size={FONT_SIZE.sm} color={COLORS.success} />
                <Text style={styles.statusText}>Saved</Text>
              </View>
            )}
          </View>

          <View style={styles.content}>
            {hasExistingProfile && (
              <View style={styles.approvalWaitingCard}>
                <View style={styles.approvalWaitingIconWrapper}>
                  <Clock size={SPACING.md} color={COLORS.warning} />
                </View>
                <View style={styles.approvalWaitingContent}>
                  <Text style={styles.approvalWaitingTitle}>Pending Approval</Text>
                  <Text style={styles.approvalWaitingDescription}>
                    Your profile has been submitted and is currently under review by our team. 
                    You cannot edit the profile while it's pending approval.
                  </Text>
                  <View style={styles.approvalWaitingBadge}>
                    <AlertCircle size={FONT_SIZE.xs} color={COLORS.warning} />
                    <Text style={styles.approvalWaitingBadgeText}>Under Review</Text>
                  </View>
                </View>
              </View>
            )}

            {hasExistingProfile ? (
              <Text style={styles.subtitle}>
                View your doctor profile information
              </Text>
            ) : (
              <Text style={styles.subtitle}>
                Complete your profile to activate your account
              </Text>
            )}

            {/* Basic Information Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Users size={SPACING.md} color={COLORS.brand} />
                </View>
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>
              
              <View style={styles.sectionFields}>
                {/* Specialization */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Specialization <Text style={styles.required}>*</Text></Text>
                  <View style={[styles.Select, formErrors.specialization && styles.SelectError]}>
                    <Text style={styles.SelectText} numberOfLines={1} ellipsizeMode="tail">
                      {formData.specialization || 'Select specialization'}
                    </Text>
                    <Picker
                      selectedValue={formData.specialization}
                      onValueChange={(value) => handleInputChange('specialization', value)}
                      style={styles.hiddenPicker}
                      enabled={!isSubmitting}
                    >
                      <Picker.Item label="Select specialization" value="" />
                      {SPECIALIZATIONS.map((spec, index) => (
                        <Picker.Item key={index} label={spec} value={spec} />
                      ))}
                    </Picker>
                  </View>
                  {formErrors.specialization && <Text style={styles.errorText}>{formErrors.specialization}</Text>}
                </View>

                {/* Gender */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Gender <Text style={styles.required}>*</Text></Text>
                  <View style={[styles.Select, formErrors.gender && styles.SelectError]}>
                    <Text style={styles.SelectText} numberOfLines={1} ellipsizeMode="tail">
                      {formData.gender || 'Select gender'}
                    </Text>
                    <Picker
                      selectedValue={formData.gender}
                      onValueChange={(value) => handleInputChange('gender', value)}
                      style={styles.hiddenPicker}
                      enabled={!isSubmitting}
                    >
                      <Picker.Item label="Select gender" value="" />
                      {GENDER_OPTIONS.map((gender, index) => (
                        <Picker.Item key={index} label={gender} value={gender} />
                      ))}
                    </Picker>
                  </View>
                  {formErrors.gender && <Text style={styles.errorText}>{formErrors.gender}</Text>}
                </View>

                {/* Date of Birth */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, formErrors.dob && styles.inputError]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.dob}
                    onChangeText={(text) => handleInputChange('dob', text)}
                    editable={!isSubmitting}
                  />
                  {formErrors.dob && <Text style={styles.errorText}>{formErrors.dob}</Text>}
                </View>
              </View>
            </View>

            {/* Professional Details Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Award size={SPACING.md} color={COLORS.brand} />
                </View>
                <Text style={styles.sectionTitle}>Professional Details</Text>
              </View>
              
              <View style={styles.sectionFields}>
                {/* Qualifications */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Qualifications <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, formErrors.qualifications && styles.inputError]}
                    placeholder="Enter qualifications"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.qualifications}
                    onChangeText={(text) => {
                      if (/^[A-Za-z\s]*$/.test(text) || text === '') {
                        handleInputChange('qualifications', text);
                      }
                    }}
                    editable={!isSubmitting}
                  />
                  {formErrors.qualifications && <Text style={styles.errorText}>{formErrors.qualifications}</Text>}
                </View>

                {/* Experience Years */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Experience (Years) <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, formErrors.experienceYears && styles.inputError]}
                    placeholder="Enter years of experience"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.experienceYears}
                    onChangeText={(text) => {
                      const num = text.replace(/[^0-9]/g, '');
                      handleInputChange('experienceYears', num);
                    }}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                  {formErrors.experienceYears && <Text style={styles.errorText}>{formErrors.experienceYears}</Text>}
                </View>

                {/* License Number */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>License Number <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, formErrors.licenseNumber && styles.inputError]}
                    placeholder="Enter license number"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.licenseNumber}
                    onChangeText={(text) => handleInputChange('licenseNumber', text)}
                    editable={!isSubmitting}
                  />
                  {formErrors.licenseNumber && <Text style={styles.errorText}>{formErrors.licenseNumber}</Text>}
                </View>

                {/* Consultation Fee */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Consultation Fee <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, formErrors.consultationFee && styles.inputError]}
                    placeholder="Enter consultation fee"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.consultationFee}
                    onChangeText={(text) => {
                      const num = text.replace(/[^0-9]/g, '');
                      handleInputChange('consultationFee', num);
                    }}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                  {formErrors.consultationFee && <Text style={styles.errorText}>{formErrors.consultationFee}</Text>}
                </View>
              </View>
            </View>

            {/* Availability Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Clock size={SPACING.md} color={COLORS.brand} />
                </View>
                <Text style={styles.sectionTitle}>Availability</Text>
              </View>
              
              <View style={styles.sectionFields}>
                {/* Available From */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Available From <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, formErrors.availableFrom && styles.inputError]}
                    placeholder="HH:MM (24hr format)"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.availableFrom}
                    onChangeText={(text) => handleInputChange('availableFrom', text)}
                    editable={!isSubmitting}
                  />
                  {formErrors.availableFrom && <Text style={styles.errorText}>{formErrors.availableFrom}</Text>}
                </View>

                {/* Available To */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Available To <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, formErrors.availableTo && styles.inputError]}
                    placeholder="HH:MM (24hr format)"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.availableTo}
                    onChangeText={(text) => handleInputChange('availableTo', text)}
                    editable={!isSubmitting}
                  />
                  {formErrors.availableTo && <Text style={styles.errorText}>{formErrors.availableTo}</Text>}
                </View>

                {/* Working Days */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Working Days <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity
                    style={[styles.selectButton, formErrors.workingDays && styles.SelectError]}
                    onPress={() => setWorkingDaysModalVisible(true)}
                    disabled={isSubmitting}
                  >
                    <Text style={formData.workingDays.length > 0 ? styles.selectButtonText : styles.selectButtonPlaceholder} numberOfLines={1} ellipsizeMode="tail">
                      {formData.workingDays.length > 0 
                        ? formData.workingDays.join(', ') 
                        : 'Select working days'}
                    </Text>
                    <ChevronDown size={FONT_SIZE.md} color={COLORS.sub} />
                  </TouchableOpacity>
                  {formErrors.workingDays && <Text style={styles.errorText}>{formErrors.workingDays}</Text>}
                </View>
              </View>
            </View>

            {/* About & Achievements Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Stethoscope size={SPACING.md} color={COLORS.brand} />
                </View>
                <Text style={styles.sectionTitle}>About & Achievements</Text>
              </View>
              
              <View style={styles.sectionFields}>
                {/* About */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>About <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.textArea, formErrors.about && styles.inputError]}
                    placeholder="Tell us about yourself"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.about}
                    onChangeText={(text) => handleInputChange('about', text)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                  />
                  {formErrors.about && <Text style={styles.errorText}>{formErrors.about}</Text>}
                </View>

                {/* Achievements */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Achievements <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.textArea, formErrors.achievements && styles.inputError]}
                    placeholder="List your achievements"
                    placeholderTextColor={COLORS.placeholder}
                    value={formData.achievements}
                    onChangeText={(text) => handleInputChange('achievements', text)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                  />
                  {formErrors.achievements && <Text style={styles.errorText}>{formErrors.achievements}</Text>}
                </View>

                {/* Languages Spoken */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Languages Spoken <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity
                    style={[styles.selectButton, formErrors.languagesSpoken && styles.SelectError]}
                    onPress={() => setLanguagesModalVisible(true)}
                    disabled={isSubmitting}
                  >
                    <Text style={formData.languagesSpoken.length > 0 ? styles.selectButtonText : styles.selectButtonPlaceholder} numberOfLines={1} ellipsizeMode="tail">
                      {formData.languagesSpoken.length > 0 
                        ? formData.languagesSpoken.join(', ') 
                        : 'Select languages'}
                    </Text>
                    <ChevronDown size={FONT_SIZE.md} color={COLORS.sub} />
                  </TouchableOpacity>
                  {formErrors.languagesSpoken && <Text style={styles.errorText}>{formErrors.languagesSpoken}</Text>}
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {!hasExistingProfile && (
                <TouchableOpacity
                  style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
                  onPress={saveProfile}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Save size={FONT_SIZE.md} color={COLORS.white} />
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
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <ShieldCheck size={FONT_SIZE.md} color={COLORS.white} />
                      <Text style={styles.buttonText}>Submit for Verification</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Working Days Modal */}
      <MultiSelectModal
        visible={workingDaysModalVisible}
        onClose={() => setWorkingDaysModalVisible(false)}
        options={WEEK_DAYS}
        selected={formData.workingDays}
        onSelect={(selected) => handleInputChange('workingDays', selected)}
        title="Select Working Days"
      />

      {/* Languages Modal */}
      <MultiSelectModal
        visible={languagesModalVisible}
        onClose={() => setLanguagesModalVisible(false)}
        options={LANGUAGES}
        selected={formData.languagesSpoken}
        onSelect={(selected) => handleInputChange('languagesSpoken', selected)}
        title="Select Languages Spoken"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: '#065F46',
  },
  approvalWaitingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: SPACING.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  approvalWaitingIconWrapper: {
    width: SPACING.xl,
    height: SPACING.xl,
    borderRadius: SPACING.lg,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalWaitingContent: {
    flex: 1,
  },
  approvalWaitingTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: SPACING.xs * 0.5,
  },
  approvalWaitingDescription: {
    fontSize: FONT_SIZE.sm,
    color: '#B45309',
    lineHeight: FONT_SIZE.md * 1.4,
    marginBottom: SPACING.xs,
  },
  approvalWaitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  approvalWaitingBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: '#92400E',
  },
  content: {
    padding: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  sectionContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionIcon: {
    width: SPACING.xl,
    height: SPACING.xl,
    borderRadius: SPACING.lg,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.brand,
  },
  sectionFields: {
    gap: SPACING.sm,
  },
  fieldContainer: {
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.sub,
    marginBottom: SPACING.xs,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    height: responsiveHeight(6),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: responsiveHeight(12),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.error,
    marginTop: SPACING.xs * 0.5,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: responsiveHeight(6),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    backgroundColor: '#f9fafb',
    paddingHorizontal: SPACING.sm,
  },
  selectButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    flex: 1,
  },
  selectButtonPlaceholder: {
    fontSize: FONT_SIZE.md,
    color: COLORS.placeholder,
    flex: 1,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  saveButton: {
    backgroundColor: COLORS.brand,
    borderRadius: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyButton: {
    backgroundColor: COLORS.success,
    borderRadius: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: COLORS.sub,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  Select: {
    height: responsiveHeight(6),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  SelectError: {
    borderColor: COLORS.error,
  },
  SelectText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  hiddenPicker: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalOptionsList: {
    padding: SPACING.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  checkbox: {
    width: FONT_SIZE.lg,
    height: FONT_SIZE.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  checkboxCheck: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.md,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  modalCancelButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalCancelButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    fontWeight: '600',
  },
  modalConfirmButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.sm,
    backgroundColor: COLORS.brand,
  },
  modalConfirmButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default DoctorProfileForm;