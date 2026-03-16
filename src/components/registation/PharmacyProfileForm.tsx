import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
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
  Clock,
  AlertCircle,
  Edit,
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { useDispatch } from 'react-redux';
import { showSuccess, showError } from '../../store/toast.slice';
import { formatDateTime } from '../../utils/dateTime';

// Types
interface ProfileField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

// Get dynamic dimensions
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

// Validation regex
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9\s\-/]+$/;
const TIME_REGEX = /^[0-9\s:AMPamp\-]+$/;

// Pharmacy fields configuration matching web version
const PHARMACY_FIELDS: ProfileField[] = [
  { name: 'registrationNumber', label: 'Registration Number', type: 'text', required: true, placeholder: 'e.g., ABCD' },
  { name: 'yearOfEstablishment', label: 'Year of Establishment', type: 'number', required: true, placeholder: 'e.g., 1995' },
  { name: 'pharmacyType', label: 'Pharmacy Type', type: 'dropdown', required: true, placeholder: 'Select Pharmacy Type' },
  { name: 'ownership', label: 'Ownership', type: 'dropdown', required: true, placeholder: 'Select Ownership' },
  { name: 'totalStaff', label: 'Total Staff', type: 'number', required: true, placeholder: '0' },
  { name: 'totalPharmacists', label: 'Total Pharmacists', type: 'number', required: true, placeholder: '0' },
  { name: 'totalTechnicians', label: 'Total Technicians', type: 'number', required: true, placeholder: '0' },
  { name: 'emergencyService', label: 'Emergency Service', type: 'toggle', required: false },
  { name: 'homeDelivery', label: 'Home Delivery', type: 'toggle', required: false },
  { name: 'onlineOrdering', label: 'Online Ordering', type: 'toggle', required: false },
  { name: 'consultationService', label: 'Consultation Service', type: 'toggle', required: false },
  { name: 'prescriptionDispensing', label: 'Prescription Dispensing', type: 'toggle', required: false },
  { name: 'otcMedicines', label: 'OTC Medicines', type: 'toggle', required: false },
  { name: 'compoundingServices', label: 'Compounding Services', type: 'toggle', required: false },
  { name: 'vaccinationServices', label: 'Vaccination Services', type: 'toggle', required: false },
  { name: 'healthScreening', label: 'Health Screening', type: 'toggle', required: false },
  { name: 'coldStorageFacility', label: 'Cold Storage Facility', type: 'toggle', required: false },
  { name: 'sterileFacility', label: 'Sterile Facility', type: 'toggle', required: false },
  { name: 'qualityTesting', label: 'Quality Testing', type: 'toggle', required: false },
  { name: 'inventoryManagement', label: 'Inventory Management', type: 'dropdown', required: false },
  { name: 'drugLicense', label: 'Drug License', type: 'toggle', required: false },
  { name: 'gmpCertified', label: 'GMP Certified', type: 'toggle', required: false },
  { name: 'isoCertification', label: 'ISO Certification', type: 'toggle', required: false },
  { name: 'nabpAccredited', label: 'NABP Accredited', type: 'toggle', required: false },
  { name: 'fireSafetyClearance', label: 'Fire Safety Clearance', type: 'toggle', required: false },
  { name: 'operatingHours', label: 'Operating Hours', type: 'text', required: true, placeholder: 'e.g., 9:00 AM - 10:00 PM' },
  { name: 'emergencyHours', label: 'Emergency Hours', type: 'text', required: false, placeholder: 'e.g., 24/7 or 10:00 PM - 6:00 AM' },
  { name: 'deliveryRadius', label: 'Delivery Radius (km)', type: 'number', required: false, placeholder: 'e.g., 5' },
  { name: 'averageDeliveryTime', label: 'Average Delivery Time', type: 'text', required: false, placeholder: 'e.g., 30-45 minutes' },
  { name: 'insuranceAccepted', label: 'Insurance Accepted', type: 'toggle', required: false },
  { name: 'cashPayment', label: 'Cash Payment', type: 'toggle', required: false },
  { name: 'cardPayment', label: 'Card Payment', type: 'toggle', required: false },
  { name: 'digitalPayment', label: 'Digital Payment', type: 'toggle', required: false },
];

// Field sections for better organization matching web
const FIELD_SECTIONS = [
  {
    title: 'Basic Information',
    icon: Building2,
    fields: ['registrationNumber', 'yearOfEstablishment', 'pharmacyType', 'ownership']
  },
  {
    title: 'Staff Information',
    icon: Users,
    fields: ['totalStaff', 'totalPharmacists', 'totalTechnicians']
  },
  {
    title: 'Services Offered',
    icon: Activity,
    fields: [
      'emergencyService', 'homeDelivery', 'onlineOrdering', 'consultationService',
      'prescriptionDispensing', 'otcMedicines', 'compoundingServices', 'vaccinationServices',
      'healthScreening'
    ]
  },
  {
    title: 'Facilities & Infrastructure',
    icon: Building2,
    fields: ['coldStorageFacility', 'sterileFacility', 'qualityTesting', 'inventoryManagement']
  },
  {
    title: 'Certifications & Compliance',
    icon: Award,
    fields: ['drugLicense', 'gmpCertified', 'isoCertification', 'nabpAccredited', 'fireSafetyClearance']
  },
  {
    title: 'Operating Hours & Delivery',
    icon: Clock,
    fields: ['operatingHours', 'emergencyHours', 'deliveryRadius', 'averageDeliveryTime']
  },
  {
    title: 'Payment Methods',
    icon: Activity,
    fields: ['insuranceAccepted', 'cashPayment', 'cardPayment', 'digitalPayment']
  }
];

// Dropdown options matching web
const pharmacyTypes = [
  'Retail Pharmacy',
  'Hospital Pharmacy', 
  'Clinical Pharmacy',
  'Compounding Pharmacy',
  'Online Pharmacy'
];

const ownershipOptions = [
  'Private',
  'Trust',
  'Government',
  'Corporate'
];

const inventoryManagementOptions = [
  'Manual',
  'Automated', 
  'Semi-Automated'
];

const PharmacyProfileForm = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { pharmacyId } = route?.params as { pharmacyId?: string } || {};
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);

  const getToken = async (): Promise<string | null> => {
    try {
      const userData = await AsyncStorage?.getItem('user');
      if (!userData) {
        dispatch(showError('Please login to continue'));
        navigation?.navigate?.('Login');
        return null;
      }
      const user = JSON?.parse?.(userData);
      return user?.token || null;
    } catch {
      dispatch(showError('Authentication error'));
      navigation?.navigate?.('Login');
      return null;
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const token = await getToken();
      if (!token) return;

      const id = pharmacyId || await getPharmacyIdFromStorage();
      if (!id) {
        setLoading(false);
        return;
      }

      setProfileId(id);
      
      try {
        const response = await AuthFetch(`pharmacy/${id}/profile`, token) as any;
        if (response?.status === 'success' && response?.data) {
          const profileData = response?.data?.pharmacyProfile || response?.data;
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
  }, [pharmacyId]);

  const getPharmacyIdFromStorage = async (): Promise<string | null> => {
    try {
      const userData = await AsyncStorage?.getItem('user');
      if (!userData) return null;
      const user = JSON?.parse?.(userData);
      
      if (user?.organizationAssociations?.[0]?.organizationType === 'pharmacy') {
        return user.organizationAssociations[0].organizationId;
      }
      
      return user?.pharmacyID || user?.pharmacyId || null;
    } catch {
      return null;
    }
  };

  const validateMobileNumber = (mobile: string): boolean => {
    return MOBILE_REGEX.test(mobile);
  };

  const validateEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email);
  };

  const validateAlphanumeric = (text: string): boolean => {
    return ALPHANUMERIC_REGEX.test(text);
  };

  const validateTimeFormat = (text: string): boolean => {
    return TIME_REGEX.test(text);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (formErrors?.[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    if (field === 'registrationNumber' && value?.length > 0) {
      if (value?.length <= 3) {
        setFormErrors(prev => ({ 
          ...prev, 
          registrationNumber: 'Registration number must be more than three characters' 
        }));
      } else if (!validateAlphanumeric(value)) {
        setFormErrors(prev => ({ 
          ...prev, 
          registrationNumber: 'Registration number can only contain letters, numbers, spaces, hyphens and slashes' 
        }));
      } else {
        setFormErrors(prev => ({ ...prev, registrationNumber: '' }));
      }
    }

    if (field === 'yearOfEstablishment') {
      const year = parseInt(value);
      if (value && (year < 1800 || year > new Date().getFullYear())) {
        setFormErrors(prev => ({ 
          ...prev, 
          yearOfEstablishment: `Year must be between 1800 and ${new Date().getFullYear()}` 
        }));
      } else if (year === 0) {
        setFormErrors(prev => ({ 
          ...prev, 
          yearOfEstablishment: 'Year cannot be 0' 
        }));
      } else {
        setFormErrors(prev => ({ ...prev, yearOfEstablishment: '' }));
      }
    }

    if (field === 'operatingHours' || field === 'emergencyHours' || field === 'averageDeliveryTime') {
      if (value && !validateAlphanumeric(value) && !validateTimeFormat(value)) {
        setFormErrors(prev => ({ 
          ...prev, 
          [field]: `${field === 'operatingHours' ? 'Operating hours' : field === 'emergencyHours' ? 'Emergency hours' : 'Average delivery time'} can only contain letters, numbers, spaces, hyphens, colons and slashes` 
        }));
      } else {
        setFormErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const currentYear = new Date().getFullYear();
    
    PHARMACY_FIELDS.forEach(field => {
      const value = formData?.[field?.name];
      
      if (field.required && !value && value !== 0) {
        errors[field.name] = `${field.label} is required`;
      }
      
      if (field.name === 'registrationNumber' && value) {
        if (value.length <= 3) {
          errors[field.name] = 'Registration number must be more than three characters';
        } else if (!validateAlphanumeric(value)) {
          errors[field.name] = 'Registration number can only contain letters, numbers, spaces, hyphens and slashes';
        }
      }
      
      if (field.name === 'yearOfEstablishment' && value) {
        const year = parseInt(value);
        if (year < 1800 || year > currentYear) {
          errors[field.name] = `Year must be between 1800 and ${currentYear}`;
        } else if (year === 0) {
          errors[field.name] = 'Year cannot be 0';
        }
      }

      if ((field.name === 'operatingHours' || field.name === 'emergencyHours' || field.name === 'averageDeliveryTime') && value) {
        if (!validateAlphanumeric(value) && !validateTimeFormat(value)) {
          errors[field.name] = `${field.label} can only contain letters, numbers, spaces, hyphens, colons and slashes`;
        }
      }
    });

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
        yearOfEstablishment: formData?.yearOfEstablishment ? parseInt(formData.yearOfEstablishment) : null,
        totalStaff: formData?.totalStaff ? parseInt(formData.totalStaff) : 0,
        totalPharmacists: formData?.totalPharmacists ? parseInt(formData.totalPharmacists) : 0,
        totalTechnicians: formData?.totalTechnicians ? parseInt(formData.totalTechnicians) : 0,
        deliveryRadius: formData?.deliveryRadius ? parseFloat(formData.deliveryRadius) : 0,
        pharmacyId: profileId ? parseInt(profileId) : null,
        updatedAt: formatDateTime(new Date()),
      };

      let response: any;
      if (profileId) {
        response = await AuthPost(`pharmacy/${profileId}/profile`, payload, token);
      } else {
        response = await AuthPost('pharmacy/profile', payload, token);
      }

      if (response?.status === 'success' || response?.data?.message?.toLowerCase()?.includes('success')) {
        dispatch(showSuccess(response?.data?.message || 'Profile saved successfully'));
        setHasExistingProfile(true);
        setEditMode(false);
        if (response?.data?.pharmacyId) {
          setProfileId(response.data.pharmacyId);
        }
        
        if (!profileId) {
          setTimeout(() => {
            navigation?.navigate?.('Login');
          }, 1500);
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

      const response = await AuthPost(`pharmacy/${profileId}/profile/submit-verification`, {}, token) as any;
      
      if (response?.data?.currentStatus === 'approval_awaiting') {
        dispatch(showError('Profile is already pending approval'));
      } else if (response?.status === 'success' || response?.data?.message?.toLowerCase()?.includes('success')) {
        dispatch(showSuccess('Profile submitted for verification'));
        setHasExistingProfile(true);
        setEditMode(false);
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

  const handleEdit = () => {
    setEditMode(true);
  };

  const isReadOnly = (hasExistingProfile && !editMode);

  const renderPickerField = (field: ProfileField) => {
    const value = formData?.[field?.name];
    let options: string[] = [];
    
    if (field.name === 'pharmacyType') {
      options = pharmacyTypes;
    } else if (field.name === 'ownership') {
      options = ownershipOptions;
    } else if (field.name === 'inventoryManagement') {
      options = inventoryManagementOptions;
    }

    if (isReadOnly) {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.readOnlyValue}>{value || '-'}</Text>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer} key={field.name}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        
        <View style={[styles.Select, formErrors?.[field.name] && styles.SelectError]}>
          <Text style={styles.SelectText} numberOfLines={1} ellipsizeMode="tail">
            {value || field.placeholder || `Select ${field.label}`}
          </Text>

          <Picker
            selectedValue={value || ''}
            onValueChange={(itemValue) => handleInputChange(field.name, itemValue)}
            style={styles.hiddenPicker}
            enabled={!isSubmitting}
          >
            <Picker.Item label={field.placeholder || `Select ${field.label}`} value="" />
            {options?.map((option, index) => (
              <Picker.Item key={`${field.name}-${index}`} label={option} value={option} />
            ))}
          </Picker>
        </View>

        {formErrors?.[field.name] ? (
          <Text style={styles.errorText}>{formErrors[field.name]}</Text>
        ) : null}
      </View>
    );
  };

  const renderToggleField = (field: ProfileField) => {
    const value = formData?.[field?.name];

    if (isReadOnly) {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.readOnlyValue}>{value || '-'}</Text>
        </View>
      );
    }

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
        {formErrors?.[field.name] ? (
          <Text style={styles.errorText}>{formErrors[field.name]}</Text>
        ) : null}
      </View>
    );
  };

  const renderNumberField = (field: ProfileField) => {
    const value = formData?.[field?.name];

    if (isReadOnly) {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.readOnlyValue}>{value || '0'}</Text>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer} key={field.name}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[styles.input, formErrors?.[field.name] && styles.inputError]}
          placeholder={field.placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={value?.toString() || ''}
          onChangeText={(text) => {
            let num = text?.replace?.(/[^0-9.]/g, '');
            if (field.name === 'deliveryRadius') {
              if (num === '' || !isNaN(parseFloat(num))) {
                handleInputChange(field.name, num === '' ? '' : parseFloat(num));
              }
            } else {
              num = num?.replace?.(/\./g, '');
              if (num === '' || !isNaN(parseInt(num))) {
                const intValue = num === '' ? '' : parseInt(num);
                handleInputChange(field.name, intValue);
                if (intValue === 0 && field.required) {
                  setFormErrors(prev => ({ 
                    ...prev, 
                    [field.name]: `${field.label} cannot be 0` 
                  }));
                }
              }
            }
          }}
          keyboardType="decimal-pad"
          editable={!isSubmitting}
        />
        {formErrors?.[field.name] ? (
          <Text style={styles.errorText}>{formErrors[field.name]}</Text>
        ) : null}
      </View>
    );
  };

  const renderTextField = (field: ProfileField) => {
    const value = formData?.[field?.name];

    if (isReadOnly) {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.readOnlyValue}>{value || '-'}</Text>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer} key={field.name}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[styles.input, formErrors?.[field.name] && styles.inputError]}
          placeholder={field.placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={value || ''}
          onChangeText={(text) => handleInputChange(field.name, text)}
          editable={!isSubmitting}
        />
        {formErrors?.[field.name] ? (
          <Text style={styles.errorText}>{formErrors[field.name]}</Text>
        ) : null}
      </View>
    );
  };

  const renderYearField = (field: ProfileField) => {
    const value = formData?.[field?.name];

    if (isReadOnly) {
      return (
        <View style={styles.fieldContainer} key={field.name}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.readOnlyValue}>{value || '-'}</Text>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer} key={field.name}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[styles.input, formErrors?.[field.name] && styles.inputError]}
          placeholder={field.placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={value?.toString() || ''}
          onChangeText={(text) => {
            const num = text?.replace?.(/[^0-9]/g, '');
            if (num === '' || !isNaN(parseInt(num))) {
              const year = num === '' ? '' : parseInt(num);
              handleInputChange(field.name, year);
            }
          }}
          keyboardType="numeric"
          maxLength={4}
          editable={!isSubmitting}
        />
        {formErrors?.[field.name] ? (
          <Text style={styles.errorText}>{formErrors[field.name]}</Text>
        ) : null}
      </View>
    );
  };

  const renderField = (fieldName: string) => {
    const field = PHARMACY_FIELDS.find(f => f.name === fieldName);
    if (!field) return null;

    if (field.type === 'dropdown') {
      return renderPickerField(field);
    }
    
    if (field.type === 'toggle') {
      return renderToggleField(field);
    }
    
    if (field.type === 'number') {
      return renderNumberField(field);
    }
    
    if (field.name === 'yearOfEstablishment') {
      return renderYearField(field);
    }
    
    return renderTextField(field);
  };

  const renderSection = (section: typeof FIELD_SECTIONS[0]) => {
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
          {section.fields.map(fieldName => renderField(fieldName))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading pharmacy profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                  View your pharmacy profile information
                </Text>
              ) : (
                <Text style={styles.subtitle}>
                  Complete your profile to activate your account
                </Text>
              )}

              {/* Render all sections */}
              {FIELD_SECTIONS.map(section => renderSection(section))}

              <View style={styles.buttonContainer}>
                {(!hasExistingProfile || editMode) && (
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
                
                {hasExistingProfile && !editMode && (
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
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
});

export default PharmacyProfileForm;