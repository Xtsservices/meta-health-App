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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ArrowLeft, 
  CheckCircle, 
  Save,
  ShieldCheck,
  Building2,
  Users,
  Activity,
  Award,
  Thermometer,
  Clock,
  AlertCircle,
  Edit,
} from 'lucide-react-native';
import { AuthFetch, AuthPost } from '../../auth/auth';
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
  { name: 'totalBeds', label: 'Total Beds', type: 'number', required: true, placeholder: '0' },
  { name: 'icuBeds', label: 'ICU Beds', type: 'number', required: true, placeholder: '0' },
  { name: 'emergencyFacility', label: 'Emergency Facility', type: 'text', required: false },
  { name: 'operationTheatres', label: 'Operation Theatres', type: 'number', required: true, placeholder: '0' },
  { name: 'generalWard', label: 'General Ward', type: 'number', required: true, placeholder: '0' },
  { name: 'semiPrivate', label: 'Semi Private', type: 'number', required: true, placeholder: '0' },
  { name: 'privateRoom', label: 'Private Room', type: 'number', required: true, placeholder: '0' },
  { name: 'deluxeSuite', label: 'Deluxe Suite', type: 'number', required: true, placeholder: '0' },
  { name: 'totalDoctors', label: 'Total Doctors', type: 'number', required: true, placeholder: '0' },
  { name: 'nursesAndSupport', label: 'Nurses and Support', type: 'number', required: true, placeholder: '0' },
  { name: 'visitingConsultants', label: 'Visiting Consultants', type: 'number', required: false, placeholder: '0' },
  { name: 'laboratory24x7', label: 'Laboratory 24x7', type: 'text', required: false },
  { name: 'pharmacy24x7', label: 'Pharmacy 24x7', type: 'text', required: false },
  { name: 'radiologyXRay', label: 'Radiology X-Ray', type: 'text', required: false },
  { name: 'radiologyCT', label: 'Radiology CT', type: 'text', required: false },
  { name: 'radiologyMRI', label: 'Radiology MRI', type: 'text', required: false },
  { name: 'radiologyUltrasound', label: 'Radiology Ultrasound', type: 'text', required: false },
  { name: 'ambulanceService', label: 'Ambulance Service', type: 'text', required: false },
  { name: 'bloodBank', label: 'Blood Bank', type: 'text', required: false },
  { name: 'physiotherapyUnit', label: 'Physiotherapy Unit', type: 'text', required: false },
  { name: 'nabhAccredited', label: 'NABH Accredited', type: 'text', required: false },
  { name: 'isoCertification', label: 'ISO Certification', type: 'text', required: false },
  { name: 'fireSafetyClearance', label: 'Fire Safety Clearance', type: 'text', required: false },
  { name: 'pollutionControlCompliance', label: 'Pollution Control Compliance', type: 'text', required: false },
];

const HOSPITAL_SECTIONS = [
  {
    title: 'Basic Information',
    icon: Building2,
    fields: ['registrationNumber', 'yearOfEstablishment', 'hospitalType', 'ownership']
  },
  {
    title: 'Infrastructure & Capacity',
    icon: Activity,
    fields: ['totalBeds', 'icuBeds', 'operationTheatres', 'generalWard', 'semiPrivate', 'privateRoom', 'deluxeSuite']
  },
  {
    title: 'Staff & Workforce',
    icon: Users,
    fields: ['totalDoctors', 'nursesAndSupport', 'visitingConsultants']
  },
  {
    title: 'Medical Services',
    icon: Thermometer,
    fields: ['emergencyFacility', 'laboratory24x7', 'pharmacy24x7', 'ambulanceService', 'bloodBank', 'physiotherapyUnit']
  },
  {
    title: 'Radiology & Diagnostics',
    icon: Activity,
    fields: ['radiologyXRay', 'radiologyCT', 'radiologyMRI', 'radiologyUltrasound']
  },
  {
    title: 'Accreditations & Compliance',
    icon: Award,
    fields: ['nabhAccredited', 'isoCertification', 'fireSafetyClearance', 'pollutionControlCompliance']
  }
];

const HospitalProfileForm = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { hospitalId } = route.params as { hospitalId?: string } || {};
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  
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
          if (profileData && Object.keys(profileData).length > 0) {
            setFormData(profileData);
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
  }, [hospitalId]);

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
    let formattedValue = value;

    if (field === 'registrationNumber') {
      formattedValue = value.replace(/[^A-Za-z0-9]/g, '');
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));

    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const currentYear = new Date().getFullYear();
    
    HOSPITAL_FIELDS.forEach(field => {
      const value = formData?.[field?.name];
      
      if (field.required) {
        if (value === undefined || value === null || value === '') {
          errors[field.name] = `${field.label} is required`;
        }
        else if (field.type === 'number') {
          const num = Number(value);
          if (isNaN(num)) {
            errors[field.name] = `${field.label} must be a valid number`;
          } else if (num < 1) {
            errors[field.name] = `${field.label} must be at least 1`;
          }
        }
      }
      
      if (field.name === 'yearOfEstablishment' && value) {
        const year = parseInt(value);
        if (year < 1800 || year > currentYear) {
          errors[field.name] = `Year must be between 1800 and ${currentYear}`;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveProfile = async () => {
    if (!validateForm()) {
      dispatch(showError('Please fill all required fields'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      if (!token) return;

      let response;
      if (profileId) {
        response = await AuthPost(`hospital/${profileId}/profile`, formData, token) as any;
      } else {
        response = await AuthPost('hospital/profile', formData, token) as any;
      }

      if (response?.status === 'success' || response?.data?.message?.toLowerCase().includes('success')) {
        dispatch(showSuccess(response?.data?.message || 'Profile saved successfully'));
        setHasExistingProfile(true);
        setEditMode(false);
        if (response?.data?.hospitalId) {
          setProfileId(response.data.hospitalId);
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

      const response = await AuthPost(`hospital/${profileId}/profile/submit-verification`, {}, token) as any;
      
      if (response?.data?.currentStatus === 'approval_awaiting') {
        dispatch(showError('Profile is already pending approval'));
      } else if (response?.status === 'success' || response?.data?.message?.toLowerCase().includes('success')) {
        dispatch(showSuccess('Profile submitted for verification'));
        setHasExistingProfile(true);
        setEditMode(false);
        navigation.replace('Login'); 
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

  const isReadOnly = (hasExistingProfile && !editMode);

  const renderField = (field: ProfileField) => {
    const value = formData[field.name];
    
    if (isReadOnly) {
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
            placeholderTextColor={COLORS.placeholder}
            value={value ? String(value) : ''}
            onChangeText={(text) => {
              const num = text.replace(/[^0-9]/g, '');
              if (num === '' || !isNaN(parseInt(num))) {
                handleInputChange(field.name, num === '' ? '' : parseInt(num));
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
            placeholder="0"
            placeholderTextColor={COLORS.placeholder}
            value={value !== undefined && value !== null ? String(value) : ''}
            onChangeText={(text) => {
              const num = text.replace(/[^0-9]/g, '');
              if (num === '') {
                handleInputChange(field.name, '');
              } else if (!isNaN(parseInt(num))) {
                const parsedNum = parseInt(num);
                handleInputChange(field.name, parsedNum);
              }
            }}
            onBlur={() => {
              const value = formData[field.name];
              if (value === '' || value === undefined || value === null) {
                setFormErrors(prev => ({
                  ...prev,
                  [field.name]: `${field.label} is required`
                }));
              } else {
                const num = Number(value);
                if (isNaN(num) || num < 1) {
                  setFormErrors(prev => ({
                    ...prev,
                    [field.name]: `${field.label} must be at least 1`
                  }));
                } else {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field.name];
                    return newErrors;
                  });
                }
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
              <View style={[styles.radioCircle, value === 'Yes' && styles.radioCircleSelected]}>
                {value === 'Yes' && <View style={styles.radioSelected} />}
              </View>
              <Text style={[styles.radioText, value === 'Yes' && styles.radioTextSelected]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => handleInputChange(field.name, 'No')}
              disabled={isSubmitting}
            >
              <View style={[styles.radioCircle, value === 'No' && styles.radioCircleSelected]}>
                {value === 'No' && <View style={styles.radioSelected} />}
              </View>
              <Text style={[styles.radioText, value === 'No' && styles.radioTextSelected]}>No</Text>
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
          value={formData[field.name] || ''}
          onChangeText={(value) => handleInputChange(field.name, value)}
          editable={!isSubmitting}
        />
        {formErrors[field.name] && (
          <Text style={styles.errorText}>{formErrors[field.name]}</Text>
        )}
      </View>
    );
  };

  const renderSection = (section: typeof HOSPITAL_SECTIONS[0]) => {
    const Icon = section.icon;
    
    return (
      <View key={section.title} style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Icon size={SPACING.md} color={COLORS.brand} />
          </View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        
        <View style={styles.sectionFields}>
          {section.fields.map(fieldName => {
            const field = HOSPITAL_FIELDS.find(f => f.name === fieldName);
            return field ? renderField(field) : null;
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading hospital profile...</Text>
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
\            </TouchableOpacity>
            {hasExistingProfile && !editMode && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEdit}
                disabled={isSubmitting}
              >
                <Edit size={FONT_SIZE.md} color={COLORS.brand} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.content}>
            {hasExistingProfile && !editMode && (
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

            {hasExistingProfile && !editMode ? (
              <Text style={styles.subtitle}>
                View your hospital profile information
              </Text>
            ) : (
              <Text style={styles.subtitle}>
                Complete your profile to activate your account
              </Text>
            )}

            {HOSPITAL_SECTIONS.map(section => renderSection(section))}

            <View style={styles.buttonContainer}>
              {(!hasExistingProfile || editMode) && (
                <TouchableOpacity
                  style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
                  onPress={saveProfile}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Save size={FONT_SIZE.md} color={COLORS.white} />
                      <Text style={styles.buttonText}>Save Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {hasExistingProfile && !editMode && (
                <TouchableOpacity
                  style={[styles.verifyButton, isSubmitting && styles.buttonDisabled]}
                  onPress={submitForVerification}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={COLORS.white} />
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
  radioContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  radioCircle: {
    width: FONT_SIZE.lg,
    height: FONT_SIZE.lg,
    borderRadius: FONT_SIZE.lg / 2,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.brand,
  },
  radioSelected: {
    width: FONT_SIZE.sm,
    height: FONT_SIZE.sm,
    borderRadius: FONT_SIZE.sm / 2,
    backgroundColor: COLORS.brand,
  },
  radioText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  radioTextSelected: {
    color: COLORS.brand,
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  optionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.white,
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
});

export default HospitalProfileForm;