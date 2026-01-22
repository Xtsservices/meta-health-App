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
  Package,
  Clock,
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { useDispatch } from 'react-redux';
import { showSuccess, showError } from '../../store/toast.slice';
import { formatDate, formatTime, formatDateTime } from '../../utils/dateTime';

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
const isSmallScreen = SCREEN_WIDTH < 375;

// Pharmacy fields configuration matching web version
const PHARMACY_FIELDS: ProfileField[] = [
  { name: 'registrationNumber', label: 'Registration Number', type: 'text', required: true, placeholder: 'e.g., ABCD' },
  { name: 'yearOfEstablishment', label: 'Year of Establishment', type: 'number', required: true, placeholder: 'e.g., 1995' },
  { name: 'pharmacyType', label: 'Pharmacy Type', type: 'dropdown', required: true, placeholder: 'Select Pharmacy Type' },
  { name: 'ownership', label: 'Ownership', type: 'dropdown', required: true, placeholder: 'Select Ownership' },
  { name: 'totalStaff', label: 'Total Staff', type: 'number', required: true },
  { name: 'totalPharmacists', label: 'Total Pharmacists', type: 'number', required: true },
  { name: 'totalTechnicians', label: 'Total Technicians', type: 'number', required: true },
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
  { name: 'emergencyHours', label: 'Emergency Hours', type: 'text', required: true, placeholder: 'e.g., 24/7 or 10:00 PM - 6:00 AM' },
  { name: 'deliveryRadius', label: 'Delivery Radius (km)', type: 'number', required: true, placeholder: 'e.g., 5' },
  { name: 'averageDeliveryTime', label: 'Average Delivery Time', type: 'text', required: true, placeholder: 'e.g., 30-45 minutes' },
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
          if (profileData && profileData?.registrationNumber) {
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
      
      // Check organization associations first (matching web logic)
      if (user?.organizationAssociations?.[0]?.organizationType === 'pharmacy') {
        return user.organizationAssociations[0].organizationId;
      }
      
      return user?.pharmacyID || user?.pharmacyId || null;
    } catch {
      return null;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (formErrors?.[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Special validation for registration number
    if (field === 'registrationNumber' && value?.length > 0 && value?.length <= 3) {
      setFormErrors(prev => ({ 
        ...prev, 
        registrationNumber: 'Registration number must be more than three characters' 
      }));
    } else if (field === 'registrationNumber') {
      setFormErrors(prev => ({ ...prev, registrationNumber: '' }));
    }

    // Special validation for year
    if (field === 'yearOfEstablishment') {
      const year = parseInt(value);
      if (value && (year < 1800 || year > new Date().getFullYear())) {
        setFormErrors(prev => ({ 
          ...prev, 
          yearOfEstablishment: 'Year must be between 1800 and current year' 
        }));
      } else if (field === 'yearOfEstablishment') {
        setFormErrors(prev => ({ ...prev, yearOfEstablishment: '' }));
      }
    }
  };

  const toggleYesNo = (field: string, currentValue: string) => {
    handleInputChange(field, currentValue === 'Yes' ? 'No' : 'Yes');
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const currentYear = new Date().getFullYear();
    
    PHARMACY_FIELDS.forEach(field => {
      const value = formData?.[field?.name];
      
      if (field.required && !value && value !== 0) {
        errors[field.name] = `${field.label} is required`;
      }
      
      // Special validations
      if (field.name === 'registrationNumber' && value && value.length <= 3) {
        errors[field.name] = 'Registration number must be more than three characters';
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

      // Prepare payload matching web data types
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
        if (response?.data?.pharmacyId) {
          setProfileId(response.data.pharmacyId);
        }
        
        // Navigate to Login after successful save (if first time)
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
        
        // Navigate to Login after successful verification submission
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

    if (hasExistingProfile) {
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
        
        <View style={styles.Select}>
          <Text style={styles.SelectText}>
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

    if (hasExistingProfile) {
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
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, value === 'Yes' && styles.toggleButtonActive]}
            onPress={() => toggleYesNo(field.name, value)}
            disabled={isSubmitting}
          >
            <Text style={[styles.toggleButtonText, value === 'Yes' && styles.toggleButtonTextActive]}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, value === 'No' && styles.toggleButtonActive]}
            onPress={() => toggleYesNo(field.name, value)}
            disabled={isSubmitting}
          >
            <Text style={[styles.toggleButtonText, value === 'No' && styles.toggleButtonTextActive]}>
              No
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderNumberField = (field: ProfileField) => {
    const value = formData?.[field?.name];

    if (hasExistingProfile) {
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
          placeholderTextColor="#9CA3AF"
          value={value?.toString() || ''}
          onChangeText={(text) => {
            // Allow only numbers and decimal for delivery radius
            let num = text?.replace?.(/[^0-9.]/g, '');
            if (field.name === 'deliveryRadius') {
              // For delivery radius, allow decimals
              if (num === '' || !isNaN(parseFloat(num))) {
                handleInputChange(field.name, num === '' ? '' : parseFloat(num));
              }
            } else {
              // For other numbers, only integers
              num = num?.replace?.(/\./g, '');
              if (num === '' || !isNaN(parseInt(num))) {
                handleInputChange(field.name, num === '' ? '' : parseInt(num));
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

    if (hasExistingProfile) {
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
          placeholderTextColor="#9CA3AF"
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

    if (hasExistingProfile) {
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
          placeholderTextColor="#9CA3AF"
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
    
    // Default text field
    return renderTextField(field);
  };

  const renderSection = (section: typeof FIELD_SECTIONS[0]) => {
    const Icon = section.icon;
    
    return (
      <View key={section.title} style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Icon size={SCREEN_WIDTH * 0.06} color="#03989e" />
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
          <ActivityIndicator size="large" color="#03989e" />
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
              <Text style={styles.title}></Text>
              {hasExistingProfile && (
                <View style={styles.statusContainer}>
                  <CheckCircle size={SCREEN_WIDTH * 0.05} color="#10B981" />
                  <Text style={styles.statusText}>Profile Complete</Text>
                </View>
              )}
            </View>

            <View style={styles.content}>
              {hasExistingProfile ? (
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
                {!hasExistingProfile && (
                  <TouchableOpacity
                    style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
                    onPress={saveProfile}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Save size={SCREEN_WIDTH * 0.05} color="#ffffff" />
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
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <ShieldCheck size={SCREEN_WIDTH * 0.05} color="#ffffff" />
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
    backgroundColor: '#f8fafc',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: SCREEN_HEIGHT * 0.05,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: SCREEN_HEIGHT * 0.02,
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: SCREEN_WIDTH * 0.02,
  },
  title: {
    flex: 1,
    fontSize: SCREEN_WIDTH * 0.055,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginLeft: -SCREEN_WIDTH * 0.1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SCREEN_WIDTH * 0.02,
  },
  statusText: {
    fontSize: SCREEN_WIDTH * 0.035,
    fontWeight: '500',
    color: '#10B981',
  },
  content: {
    padding: SCREEN_WIDTH * 0.05,
  },
  subtitle: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SCREEN_WIDTH * 0.05,
    marginBottom: SCREEN_HEIGHT * 0.025,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
    gap: SCREEN_WIDTH * 0.03,
  },
  sectionIcon: {
    width: SCREEN_WIDTH * 0.1,
    height: SCREEN_WIDTH * 0.1,
    borderRadius: SCREEN_WIDTH * 0.05,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: '600',
    color: '#03989e',
  },
  sectionFields: {
    gap: SCREEN_HEIGHT * 0.02,
  },
  fieldContainer: {
    position: 'relative',
  },
  label: {
    fontSize: SCREEN_WIDTH * 0.038,
    fontWeight: '500',
    color: '#374151',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.015,
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#111827',
    minHeight: SCREEN_HEIGHT * 0.06,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: SCREEN_WIDTH * 0.032,
    marginTop: SCREEN_HEIGHT * 0.005,
  },
  readOnlyValue: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.015,
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#6B7280',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: SCREEN_WIDTH * 0.05,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: SCREEN_HEIGHT * 0.015,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#03989e',
  },
  toggleButtonText: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#6B7280',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    marginTop: SCREEN_HEIGHT * 0.04,
    marginBottom: SCREEN_HEIGHT * 0.05,
  },
  saveButton: {
    backgroundColor: '#03989e',
    borderRadius: 8,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SCREEN_WIDTH * 0.03,
  },
  verifyButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SCREEN_WIDTH * 0.03,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: SCREEN_WIDTH * 0.04,
    fontWeight: '600',
  },
  Select: {
    minHeight: SCREEN_HEIGHT * 0.06,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.04,
  },
  SelectText: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#111827',
  },
  hiddenPicker: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});

export default PharmacyProfileForm;