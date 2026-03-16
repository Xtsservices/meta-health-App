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
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  Calendar,
  Edit,
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { useDispatch } from 'react-redux';
import { showSuccess, showError } from '../../store/toast.slice';
import { formatDateTime } from '../../utils/dateTime';
import { SCOPE_LIST, SCOPE_LIST_Type } from '../../utils/role';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 600;

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

const LANGUAGES = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 
  'Gujarati', 'Kannada', 'Odia', 'Malayalam', 'Punjabi', 'Assamese'
];

const SPECIALIZATIONS = [
  'Cardiologist', 'Dermatologist', 'Pediatrician', 'Neurologist', 
  'Orthopedic Surgeon', 'Ophthalmologist', 'Gynecologist', 'ENT Specialist',
  'Psychiatrist', 'Radiologist', 'Anesthesiologist', 'General Physician',
  'Dentist', 'Pulmonologist', 'Gastroenterologist', 'Endocrinologist'
];

const WEEK_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const allowedScopes: (keyof SCOPE_LIST_Type)[] = [
  'inpatient',
  'outpatient',
  'emergency_green_zone',
  'emergency_yellow_zone',
  'emergency_red_zone',
  'triage',
  'surgeon',
  'anesthetist',
  'pathology',
  'radiology',
  'pharmacy',
  'reception'
];

const scopeOptions = allowedScopes.map((key) => ({
  label: key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
  value: String(SCOPE_LIST[key])
}));

const TimePickerModal = ({
  visible,
  onClose,
  onSelect,
  initialHour = '09',
  initialMinute = '00',
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  initialHour?: string;
  initialMinute?: string;
}) => {
  const [selectedHour, setSelectedHour] = useState(initialHour);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);

  useEffect(() => {
    if (visible) {
      setSelectedHour(initialHour);
      setSelectedMinute(initialMinute);
    }
  }, [visible, initialHour, initialMinute]);

  const handleConfirm = () => {
    const timeString = `${selectedHour}:${selectedMinute}`;
    onSelect(timeString);
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
        <View style={styles.timePickerModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <X size={FONT_SIZE.lg} color={COLORS.sub} />
            </TouchableOpacity>
          </View>

          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerColumn}>
              <Text style={styles.timePickerLabel}>Hour</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {HOURS.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.timePickerItem,
                      selectedHour === hour && styles.timePickerItemSelected
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text style={[
                      styles.timePickerItemText,
                      selectedHour === hour && styles.timePickerItemTextSelected
                    ]}>{hour}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.timePickerColumn}>
              <Text style={styles.timePickerLabel}>Minute</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {MINUTES.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.timePickerItem,
                      selectedMinute === minute && styles.timePickerItemSelected
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text style={[
                      styles.timePickerItemText,
                      selectedMinute === minute && styles.timePickerItemTextSelected
                    ]}>{minute}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

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
  options: string[] | { label: string; value: string }[]; 
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

  const getOptionLabel = (option: string | { label: string; value: string }) => {
    if (typeof option === 'string') return option;
    return option.label;
  };

  const getOptionValue = (option: string | { label: string; value: string }) => {
    if (typeof option === 'string') return option;
    return option.value;
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
            {options.map((option) => {
              const value = getOptionValue(option);
              const label = getOptionLabel(option);
              return (
                <TouchableOpacity
                  key={value}
                  style={styles.modalOption}
                  onPress={() => toggleOption(value)}
                >
                  <View style={[styles.checkbox, tempSelected.includes(value) && styles.checkboxChecked]}>
                    {tempSelected.includes(value) && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.modalOptionText}>{label}</Text>
                </TouchableOpacity>
              );
            })}
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
    // consultationFee: '',
    availableFrom: '',
    availableTo: '',
    workingDays: [] as string[],
    about: '',
    achievements: '',
    languagesSpoken: [] as string[],
    employmentType: 'FULL_TIME',
    scope: '',
  });
  
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [existingProfileData, setExistingProfileData] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  
  const [workingDaysModalVisible, setWorkingDaysModalVisible] = useState(false);
  const [languagesModalVisible, setLanguagesModalVisible] = useState(false);
  const [scopesModalVisible, setScopesModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timePickerVisible, setTimePickerVisible] = useState<'from' | 'to' | null>(null);

useEffect(() => {
  if (WEEK_DAYS.length === 0) return;

  if (formData.employmentType === 'FULL_TIME') {
    setFormData(prev => ({
      ...prev,
      workingDays: WEEK_DAYS
    }));
  }

  if (formData.employmentType === 'PART_TIME') {
    setFormData(prev => ({
      ...prev,
      workingDays: []
    }));
  }

}, [formData.employmentType]);


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

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    return `${hour}:${minute}`;
  };

  const parseTimeForPicker = (timeString: string) => {
    if (!timeString) return { hour: '09', minute: '00' };
    const [hour, minute] = timeString.split(':');
    return { hour, minute };
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
      setProfileId(id);

      try {
        const response = await AuthFetch('doctor-profile/my-profile', token) as any;
        
        if (response?.status === 'success' && response?.data?.data) {
          const profile = response.data.data;
          setExistingProfileData(profile);
          
          if (profile.verificationStatus === 'submitted') {
            setHasExistingProfile(true);
          } else if (profile.specialization || profile.gender || profile.dob) {
            setHasExistingProfile(true);
          }
          
          const dobDate = profile.dob ? new Date(profile.dob) : undefined;
          setSelectedDate(dobDate);

          const scopeValue = profile.scope || '';
          const scopeArray = scopeValue ? scopeValue.split('#') : [];
          setSelectedScopes(scopeArray);

          setFormData({
            specialization: profile.specialization || '',
            gender: profile.gender || '',
            dob: profile.dob ? formatDateForInput(profile.dob) : '',
            qualifications: profile.qualifications || '',
            experienceYears: profile.experienceYears ? String(profile.experienceYears) : '',
            licenseNumber: profile.licenseNumber || '',
            // consultationFee: profile.consultationFee ? String(profile.consultationFee) : '',
            availableFrom: profile.availableFrom || '',
            availableTo: profile.availableTo || '',
            workingDays: profile.workingDays || [],
            about: profile.about || '',
            achievements: profile.achievements || '',
            languagesSpoken: profile.languagesSpoken || [],
            employmentType: profile.employmentType || 'FULL_TIME',
            scope: scopeValue,
          });
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

  const handleScopeChange = (scopes: string[]) => {
    setSelectedScopes(scopes);
    const scopeString = scopes.join('#');
    handleInputChange('scope', scopeString);
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      handleInputChange('dob', dateString);
    }
  };

  const handleTimeSelect = (field: 'availableFrom' | 'availableTo', time: string) => {
    handleInputChange(field, time);
    setTimePickerVisible(null);
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
    // if (!formData.consultationFee) errors.consultationFee = 'Consultation fee is required';
    // else if (parseInt(formData.consultationFee) < 0) errors.consultationFee = 'Fee cannot be negative';
    
    if (!formData.availableFrom) errors.availableFrom = 'Available from time is required';
    if (!formData.availableTo) errors.availableTo = 'Available to time is required';
    if (formData.workingDays.length === 0) errors.workingDays = 'Select at least one working day';
    if (!formData.about) errors.about = 'About is required';
    if (!formData.achievements) errors.achievements = 'Achievements are required';
    if (formData.languagesSpoken.length === 0) errors.languagesSpoken = 'Select at least one language';
    if (!formData.scope) errors.scope = 'Select at least one scope';
    
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
        // consultationFee: parseInt(formData.consultationFee) || 0,
      };

      const endpoint = 'doctor-profile/doctorProfile';
      
      let response: any = await AuthPost(endpoint, payload, token);
      if (response?.status === 'success' || response?.data?.message?.toLowerCase()?.includes('success')) {
        dispatch(showSuccess(response?.data?.message || 'Profile saved successfully'));
        setHasExistingProfile(true);
        setEditMode(false);
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
        // consultationFee: parseInt(formData.consultationFee) || 0,
      };
      
      const response = await AuthPost(`doctor-profile/${profileId}/submit-verification`, payload, token) as any;
      
      if (response?.data?.currentStatus === 'approval_awaiting') {
        dispatch(showError('Profile is already pending approval'));
      } else if (response?.status === 'success' || response?.data?.message?.toLowerCase()?.includes('success')) {
        dispatch(showSuccess('Profile submitted for verification'));
        setHasExistingProfile(true);
        setEditMode(false);
        setExistingProfileData({ ...existingProfileData, verificationStatus: 'submitted' });
      } else {
        dispatch(showError(response?.message || 'Failed to submit for verification'));
      }
    } catch (error: any) {
      dispatch(showError(error?.message || 'Failed to submit for verification'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const isReadOnly = (hasExistingProfile && !editMode) || existingProfileData?.verificationStatus === 'submitted';

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
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation?.goBack?.()}
              disabled={isSubmitting}
            >
            </TouchableOpacity>
            {hasExistingProfile && !editMode && existingProfileData?.verificationStatus !== 'submitted' && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEdit}
                disabled={isSubmitting}
              >
                <Edit size={FONT_SIZE.md} color={COLORS.brand} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            {existingProfileData?.verificationStatus === 'submitted' && !editMode && (
              <View style={styles.statusContainer}>
                <CheckCircle size={FONT_SIZE.sm} color={COLORS.success} />
                <Text style={styles.statusText}>Submitted</Text>
              </View>
            )}
          </View>

          <View style={styles.content}>
            {existingProfileData?.verificationStatus === 'submitted' && !editMode && (
              <View style={styles.approvalWaitingCard}>
                <View style={styles.approvalWaitingIconWrapper}>
                  <Clock size={SPACING.md} color={COLORS.warning} />
                </View>
                <View style={styles.approvalWaitingContent}>
                  <Text style={styles.approvalWaitingTitle}>Pending Approval</Text>
                  <Text style={styles.approvalWaitingDescription}>
                    Your profile has been submitted and is currently under review by our team.
                  </Text>
                  <View style={styles.approvalWaitingBadge}>
                    <AlertCircle size={FONT_SIZE.xs} color={COLORS.warning} />
                    <Text style={styles.approvalWaitingBadgeText}>Under Review</Text>
                  </View>
                </View>
              </View>
            )}

            {hasExistingProfile && !editMode ? (
              <Text style={styles.subtitle}>
                View your doctor profile information
              </Text>
            ) : (
              <Text style={styles.subtitle}>
                Complete your profile to activate your account
              </Text>
            )}

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Users size={SPACING.md} color={COLORS.brand} />
                </View>
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>
              
              <View style={styles.sectionFields}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Specialization <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>{formData.specialization || '-'}</Text>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Gender <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>{formData.gender || '-'}</Text>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>{formData.dob || '-'}</Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.dateButton, formErrors.dob && styles.inputError]}
                        onPress={() => setShowDatePicker(true)}
                        disabled={isSubmitting}
                      >
                        <Text style={formData.dob ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                          {formData.dob || 'Select date of birth'}
                        </Text>
                        <Calendar size={FONT_SIZE.md} color={COLORS.sub} />
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={selectedDate || new Date()}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleDateChange}
                          maximumDate={new Date()}
                        />
                      )}
                      {formErrors.dob && <Text style={styles.errorText}>{formErrors.dob}</Text>}
                    </>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Award size={SPACING.md} color={COLORS.brand} />
                </View>
                <Text style={styles.sectionTitle}>Professional Details</Text>
              </View>
              
              <View style={styles.sectionFields}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Qualifications <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>{formData.qualifications || '-'}</Text>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Experience (Years) <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>{formData.experienceYears || '-'}</Text>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>License Number <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>{formData.licenseNumber || '-'}</Text>
                  ) : (
                    <>
                      <TextInput
                        style={[styles.input, formErrors.licenseNumber && styles.inputError]}
                        placeholder="Enter license number"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.licenseNumber}
                         onChangeText={(text) => {
                          const filtered = text.replace(/[^A-Za-z0-9-]/g, '');
                          handleInputChange('licenseNumber', filtered);
                        }}
                        editable={!isSubmitting}
                      />
                      {formErrors.licenseNumber && <Text style={styles.errorText}>{formErrors.licenseNumber}</Text>}
                    </>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Clock size={SPACING.md} color={COLORS.brand} />
                </View>
                <Text style={styles.sectionTitle}>Availability</Text>
              </View>
              
              <View style={styles.sectionFields}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Scopes <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>
                      {selectedScopes.length > 0 
                        ? selectedScopes.map(scope => {
                            const scopeObj = scopeOptions.find(opt => opt.value === scope);
                            return scopeObj?.label || scope;
                          }).join(', ') 
                        : '-'}
                    </Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.selectButton, formErrors.scope && styles.SelectError]}
                        onPress={() => setScopesModalVisible(true)}
                        disabled={isSubmitting}
                      >
                        <Text style={selectedScopes.length > 0 ? styles.selectButtonText : styles.selectButtonPlaceholder} numberOfLines={1} ellipsizeMode="tail">
                          {selectedScopes.length > 0 
                            ? selectedScopes.map(scope => {
                                const scopeObj = scopeOptions.find(opt => opt.value === scope);
                                return scopeObj?.label || scope;
                              }).join(', ') 
                            : 'Select scopes'}
                        </Text>
                        <ChevronDown size={FONT_SIZE.md} color={COLORS.sub} />
                      </TouchableOpacity>
                      {formErrors.scope && <Text style={styles.errorText}>{formErrors.scope}</Text>}
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Employment Type <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>
                      {formData.employmentType === 'FULL_TIME' ? 'Full Time' : 'Part Time'}
                    </Text>
                  ) : (
                    <View style={styles.radioGroup}>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => handleInputChange('employmentType', 'FULL_TIME')}
                        disabled={isSubmitting}
                      >
                        <View style={[styles.radio, formData.employmentType === 'FULL_TIME' && styles.radioSelected]}>
                          {formData.employmentType === 'FULL_TIME' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.radioLabel}>Full Time</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => handleInputChange('employmentType', 'PART_TIME')}
                        disabled={isSubmitting}
                      >
                        <View style={[styles.radio, formData.employmentType === 'PART_TIME' && styles.radioSelected]}>
                          {formData.employmentType === 'PART_TIME' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.radioLabel}>Part Time</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Available From <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>{formatTimeForDisplay(formData.availableFrom) || '-'}</Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.dateButton, formErrors.availableFrom && styles.inputError]}
                        onPress={() => setTimePickerVisible('from')}
                        disabled={isSubmitting}
                      >
                        <Text style={formData.availableFrom ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                          {formData.availableFrom ? formatTimeForDisplay(formData.availableFrom) : 'Select start time'}
                        </Text>
                        <Clock size={FONT_SIZE.md} color={COLORS.sub} />
                      </TouchableOpacity>
                      {formErrors.availableFrom && <Text style={styles.errorText}>{formErrors.availableFrom}</Text>}
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Available To <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>{formatTimeForDisplay(formData.availableTo) || '-'}</Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.dateButton, formErrors.availableTo && styles.inputError]}
                        onPress={() => setTimePickerVisible('to')}
                        disabled={isSubmitting}
                      >
                        <Text style={formData.availableTo ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                          {formData.availableTo ? formatTimeForDisplay(formData.availableTo) : 'Select end time'}
                        </Text>
                        <Clock size={FONT_SIZE.md} color={COLORS.sub} />
                      </TouchableOpacity>
                      {formErrors.availableTo && <Text style={styles.errorText}>{formErrors.availableTo}</Text>}
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Working Days <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>
                      {formData.workingDays.length > 0 ? formData.workingDays.join(', ') : '-'}
                    </Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.selectButton, formErrors.workingDays && styles.SelectError]}
                        onPress={() => setWorkingDaysModalVisible(true)}
                        disabled={isSubmitting}
                      >
                        <Text style={formData.workingDays.length > 0 ? styles.selectButtonText : styles.selectButtonPlaceholder} numberOfLines={1} ellipsizeMode="tail">
                          {formData.workingDays.length > 0 
                            ? formData.workingDays.join(', ') 
                            : formData.employmentType === 'FULL_TIME' 
                              ? 'All days (Full Time)' 
                              : 'Select working days'}
                        </Text>
                        <ChevronDown size={FONT_SIZE.md} color={COLORS.sub} />
                      </TouchableOpacity>
                      {formErrors.workingDays && <Text style={styles.errorText}>{formErrors.workingDays}</Text>}
                    </>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Stethoscope size={SPACING.md} color={COLORS.brand} />
                </View>
                <Text style={styles.sectionTitle}>About & Achievements</Text>
              </View>
              
              <View style={styles.sectionFields}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>About <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValueMultiline}>{formData.about || '-'}</Text>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Achievements <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValueMultiline}>{formData.achievements || '-'}</Text>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Languages Spoken <Text style={styles.required}>*</Text></Text>
                  {isReadOnly ? (
                    <Text style={styles.readOnlyValue}>
                      {formData.languagesSpoken.length > 0 ? formData.languagesSpoken.join(', ') : '-'}
                    </Text>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              {(!hasExistingProfile || editMode) && existingProfileData?.verificationStatus !== 'submitted' && (
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
              
              {hasExistingProfile && !editMode && existingProfileData?.verificationStatus !== 'submitted' && (
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

      <MultiSelectModal
        visible={workingDaysModalVisible}
        onClose={() => setWorkingDaysModalVisible(false)}
        options={WEEK_DAYS}
        selected={formData.workingDays}
        onSelect={(selected) => handleInputChange('workingDays', selected)}
        title="Select Working Days"
      />

      <MultiSelectModal
        visible={languagesModalVisible}
        onClose={() => setLanguagesModalVisible(false)}
        options={LANGUAGES}
        selected={formData.languagesSpoken}
        onSelect={(selected) => handleInputChange('languagesSpoken', selected)}
        title="Select Languages Spoken"
      />

      <MultiSelectModal
        visible={scopesModalVisible}
        onClose={() => setScopesModalVisible(false)}
        options={scopeOptions}
        selected={selectedScopes}
        onSelect={handleScopeChange}
        title="Select Scopes"
      />

      <TimePickerModal
        visible={timePickerVisible !== null}
        onClose={() => setTimePickerVisible(null)}
        onSelect={(time) => handleTimeSelect(timePickerVisible === 'from' ? 'availableFrom' : 'availableTo', time)}
        {...parseTimeForPicker(timePickerVisible === 'from' ? formData.availableFrom : formData.availableTo)}
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: '#E0F2FE',
    borderRadius: SPACING.sm,
  },
  editButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.brand,
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
  readOnlyValue: {
    height: responsiveHeight(6),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'center',
  },
  readOnlyValueMultiline: {
    minHeight: responsiveHeight(12),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
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
  dateButton: {
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
  dateButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    flex: 1,
  },
  dateButtonPlaceholder: {
    fontSize: FONT_SIZE.md,
    color: COLORS.placeholder,
    flex: 1,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  radio: {
    width: FONT_SIZE.lg,
    height: FONT_SIZE.lg,
    borderRadius: FONT_SIZE.lg / 2,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: COLORS.brand,
  },
  radioInner: {
    width: FONT_SIZE.sm,
    height: FONT_SIZE.sm,
    borderRadius: FONT_SIZE.sm / 2,
    backgroundColor: COLORS.brand,
  },
  radioLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
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
  timePickerModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    width: '90%',
    maxWidth: 500,
    height: responsiveHeight(55),
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
  timePickerContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
    flex: 1,
  },
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.sub,
    marginBottom: SPACING.sm,
  },
  timePickerItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: SPACING.sm,
    marginVertical: 2,
    width: '100%',
    alignItems: 'center',
  },
  timePickerItemSelected: {
    backgroundColor: COLORS.brand,
  },
  timePickerItemText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  timePickerItemTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default DoctorProfileForm;