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
  Switch,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ArrowLeft, 
  CheckCircle, 
  Save,
  ShieldCheck,
  Building2,
  MapPin,
  Thermometer,
  TestTube,
  Droplets,
  X,
  AlertCircle,
  Clock,
  Award,
  Home,
  Mail,
  Phone,
  User,
  Calendar,
  FileText,
  Hash,
  Activity,
  Beaker,
  FlaskConical,
  Syringe,
  HeartPulse,
  Check,
} from 'lucide-react-native';
import { AuthPost, AuthFetch, AuthPut } from '../../auth/auth';
import { useDispatch } from 'react-redux';
import { showSuccess, showError } from '../../store/toast.slice';

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

const BLOOD_BANK_TYPES = [
  'Government',
  'Private',
  'Charitable Trust',
  'Red Cross',
];

const YES_NO_OPTIONS = ['Yes', 'No'];

const PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface BloodBankProfileData {
  registrationNumber: string;
  licenseNumber: string;
  yearOfEstablishment: string;
  bloodBankType: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  is24x7: string;
  componentSeparationUnit: string;
  apheresisFacility: string;
  hivTesting: string;
  hbvTesting: string;
  hcvTesting: string;
  malariaTesting: string;
  syphilisTesting: string;
  coldStorageCapacityML: string;
  supportsWholeBlood: string;
  supportsPlasma: string;
  supportsPlatelets: string;
  supportsRBC: string;
}

interface BloodBankAPIResponse {
  id: number;
  bloodBankName: string;
  email: string;
  phoneNo: string | null;
  pointOfContact: string | null;
  registrationNumber: string;
  licenseNumber: string;
  yearOfEstablishment: number;
  bloodBankType: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  is24x7: string;
  componentSeparationUnit: string;
  apheresisFacility: string;
  hivTesting: string;
  hbvTesting: string;
  hcvTesting: string;
  malariaTesting: string;
  syphilisTesting: string;
  coldStorageCapacityML: number;
  supportsWholeBlood: string;
  supportsPlasma: string;
  supportsPlatelets: string;
  supportsRBC: string;
  totalStaff: number;
  linkedHospitalIds: number[];
  status: string;
  isActive: number;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const initialProfileData: BloodBankProfileData = {
  registrationNumber: '',
  licenseNumber: '',
  yearOfEstablishment: '',
  bloodBankType: '',
  address: '',
  city: '',
  state: '',
  pinCode: '',
  is24x7: 'No',
  componentSeparationUnit: 'No',
  apheresisFacility: 'No',
  hivTesting: 'No',
  hbvTesting: 'No',
  hcvTesting: 'No',
  malariaTesting: 'No',
  syphilisTesting: 'No',
  coldStorageCapacityML: '',
  supportsWholeBlood: 'No',
  supportsPlasma: 'No',
  supportsPlatelets: 'No',
  supportsRBC: 'No',
};

interface MultiSelectModalProps {
  visible: boolean;
  onClose: () => void;
  options: string[];
  selected: string;
  onSelect: (selected: string) => void;
  title: string;
}

const SelectModal = ({ 
  visible, 
  onClose, 
  options, 
  selected, 
  onSelect,
  title 
}: MultiSelectModalProps) => {
  const [tempSelected, setTempSelected] = useState(selected);

  useEffect(() => {
    if (visible) {
      setTempSelected(selected);
    }
  }, [visible, selected]);

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
                onPress={() => setTempSelected(option)}
              >
                <View style={[styles.radioButton, tempSelected === option && styles.radioButtonSelected]}>
                  {tempSelected === option && <View style={styles.radioButtonInner} />}
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

const BloodBankProfileForm = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { orgId } = route?.params as { orgId?: string } || {};
  
  const [formData, setFormData] = useState<BloodBankProfileData>(initialProfileData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bloodBankId, setBloodBankId] = useState<string | null>(orgId || null);
  const [bloodBankStatus, setBloodBankStatus] = useState<string>('');
  const [isApproved, setIsApproved] = useState(false);
  
  const [bloodBankTypeModalVisible, setBloodBankTypeModalVisible] = useState(false);
  const [yesNoModalVisible, setYesNoModalVisible] = useState<{
    field: string;
    visible: boolean;
  }>({ field: '', visible: false });

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

  const getBloodBankIdFromStorage = async (): Promise<string | null> => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return null;
      const user = JSON.parse(userData);
      return user?.bloodBankData?.id || null;
    } catch {
      return null;
    }
  };

  const fetchBloodBankData = async (bbId: string, token: string) => {
    try {
    const token = await AsyncStorage.getItem("token");
      setLoading(true);
      
      const response = await AuthFetch(`bloodbank/getBloodbankByID/${bbId}`, token) as any;
      
      if (response?.status === 'error') {
        throw new Error(response?.message || 'Failed to fetch blood bank data');
      }

      let apiData = response?.data || response;
      let data: BloodBankAPIResponse;
      
      if (apiData?.data && typeof apiData.data === 'object' && apiData.data.id) {
        data = apiData.data;
      } else if (apiData?.id && typeof apiData.id === 'number') {
        data = apiData as BloodBankAPIResponse;
      } else {
        throw new Error('Invalid response structure from API');
      }

      const isApprovedStatus = data.status === 'approved';
      setIsApproved(isApprovedStatus);
      setBloodBankStatus(data.status);

      setFormData({
        registrationNumber: data.registrationNumber || '',
        licenseNumber: data.licenseNumber || '',
        yearOfEstablishment: data.yearOfEstablishment?.toString() || '',
        bloodBankType: data.bloodBankType || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pinCode: data.pinCode || '',
        is24x7: data.is24x7 || 'No',
        componentSeparationUnit: data.componentSeparationUnit || 'No',
        apheresisFacility: data.apheresisFacility || 'No',
        hivTesting: data.hivTesting || 'No',
        hbvTesting: data.hbvTesting || 'No',
        hcvTesting: data.hcvTesting || 'No',
        malariaTesting: data.malariaTesting || 'No',
        syphilisTesting: data.syphilisTesting || 'No',
        coldStorageCapacityML: data.coldStorageCapacityML?.toString() || '',
        supportsWholeBlood: data.supportsWholeBlood || 'No',
        supportsPlasma: data.supportsPlasma || 'No',
        supportsPlatelets: data.supportsPlatelets || 'No',
        supportsRBC: data.supportsRBC || 'No',
      });
      
    } catch (error: any) {
      dispatch(showError(error?.message || 'Failed to load blood bank profile'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const token = await getToken();
      if (!token) {
        dispatch(showError('Please login to continue'));
        navigation.navigate('Login');
        return;
      }

      const id = orgId || await getBloodBankIdFromStorage();
      setBloodBankId(id);

      if (id) {
        await fetchBloodBankData(id, token);
      } else {
        setLoading(false);
      }
    };

    loadProfile();
  }, [orgId]);

  const handleInputChange = (field: keyof BloodBankProfileData, value: any) => {
    if (isApproved) return;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validatePinCode = (pinCode: string): boolean => {
    return PIN_CODE_REGEX.test(pinCode);
  };

  const validateMobileNumber = (mobile: string): boolean => {
    return MOBILE_REGEX.test(mobile);
  };

  const validateEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.registrationNumber) {
      errors.registrationNumber = 'Registration number is required';
    } else if (formData.registrationNumber.trim().length === 0) {
      errors.registrationNumber = 'Registration number cannot be empty';
    }
    
    if (!formData.licenseNumber) {
      errors.licenseNumber = 'License number is required';
    } else if (formData.licenseNumber.trim().length === 0) {
      errors.licenseNumber = 'License number cannot be empty';
    }
    
    if (formData.yearOfEstablishment) {
      const year = parseInt(formData.yearOfEstablishment);
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear) {
        errors.yearOfEstablishment = `Year must be between 1900 and ${currentYear}`;
      } else if (year === 0) {
        errors.yearOfEstablishment = 'Year cannot be 0';
      }
    }
    
    if (!formData.bloodBankType) {
      errors.bloodBankType = 'Blood bank type is required';
    }
    
    if (!formData.address) {
      errors.address = 'Address is required';
    } else if (formData.address.trim().length === 0) {
      errors.address = 'Address cannot be empty';
    }
    
    if (!formData.city) {
      errors.city = 'City is required';
    } else if (formData.city.trim().length === 0) {
      errors.city = 'City cannot be empty';
    }
    
    if (!formData.state) {
      errors.state = 'State is required';
    } else if (formData.state.trim().length === 0) {
      errors.state = 'State cannot be empty';
    }
    
    if (!formData.pinCode) {
      errors.pinCode = 'Pin code is required';
    } else if (!validatePinCode(formData.pinCode)) {
      errors.pinCode = 'Pin code must be 6 digits and start with 1-9';
    }
    
    if (!formData.is24x7) {
      errors.is24x7 = 'Please select 24x7 service availability';
    }
    
    if (!formData.componentSeparationUnit) {
      errors.componentSeparationUnit = 'Please select component separation unit availability';
    }
    
    if (!formData.apheresisFacility) {
      errors.apheresisFacility = 'Please select apheresis facility availability';
    }
    
    if (!formData.hivTesting) {
      errors.hivTesting = 'Please select HIV testing availability';
    }
    
    if (!formData.hbvTesting) {
      errors.hbvTesting = 'Please select HBV testing availability';
    }
    
    if (!formData.hcvTesting) {
      errors.hcvTesting = 'Please select HCV testing availability';
    }
    
    if (!formData.malariaTesting) {
      errors.malariaTesting = 'Please select malaria testing availability';
    }
    
    if (!formData.syphilisTesting) {
      errors.syphilisTesting = 'Please select syphilis testing availability';
    }
    
    if (formData.coldStorageCapacityML) {
      const capacity = parseInt(formData.coldStorageCapacityML);
      if (capacity < 0) {
        errors.coldStorageCapacityML = 'Cold storage capacity cannot be negative';
      } else if (capacity === 0) {
        errors.coldStorageCapacityML = 'Cold storage capacity cannot be 0';
      }
    }
    
    if (!formData.supportsWholeBlood) {
      errors.supportsWholeBlood = 'Please select whole blood support';
    }
    
    if (!formData.supportsPlasma) {
      errors.supportsPlasma = 'Please select plasma support';
    }
    
    if (!formData.supportsPlatelets) {
      errors.supportsPlatelets = 'Please select platelets support';
    }
    
    if (!formData.supportsRBC) {
      errors.supportsRBC = 'Please select RBC support';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveProfile = async () => {
    if (isApproved) {
      dispatch(showError('This blood bank profile is approved and cannot be edited.'));
      return;
    }

    if (!validateForm()) {
      dispatch(showError('Please fill all required fields correctly'));
      return;
    }

    if (!bloodBankId) {
      dispatch(showError('Blood Bank ID not found. Please login again.'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      if (!token) return;

      const payload = {
        bloodBankID: parseInt(bloodBankId),
        registrationNumber: formData.registrationNumber,
        licenseNumber: formData.licenseNumber,
        yearOfEstablishment: parseInt(formData.yearOfEstablishment) || 0,
        bloodBankType: formData.bloodBankType,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pinCode: formData.pinCode,
        is24x7: formData.is24x7,
        componentSeparationUnit: formData.componentSeparationUnit,
        apheresisFacility: formData.apheresisFacility,
        hivTesting: formData.hivTesting,
        hbvTesting: formData.hbvTesting,
        hcvTesting: formData.hcvTesting,
        malariaTesting: formData.malariaTesting,
        syphilisTesting: formData.syphilisTesting,
        coldStorageCapacityML: parseInt(formData.coldStorageCapacityML) || 0,
        supportsWholeBlood: formData.supportsWholeBlood,
        supportsPlasma: formData.supportsPlasma,
        supportsPlatelets: formData.supportsPlatelets,
        supportsRBC: formData.supportsRBC,
      };

      const response = await AuthPut('bloodBank/updateBloodBankProfile', payload, token) as any;
      console.log("Response from API:", response,payload,token);

      if (response?.status === true || response?.status === 'success') {
        dispatch(showSuccess(response.message || 'Blood Bank profile updated successfully'));
        if (response?.data?.bloodBankId) {
          setBloodBankId(response.data.bloodBankId.toString());
        }
      } else {
        dispatch(showError(response.message || 'Failed to update profile'));
      }
    } catch (error: any) {
      dispatch(showError(error?.message || 'Failed to update profile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    if (isApproved) {
      dispatch(showError('This blood bank profile is approved and cannot be edited.'));
      return;
    }
    setFormData(initialProfileData);
    setFormErrors({});
    dispatch(showSuccess('Form reset to initial state'));
  };

  const openYesNoModal = (field: string) => {
    setYesNoModalVisible({ field, visible: true });
  };

  const handleYesNoSelect = (value: string) => {
    if (yesNoModalVisible.field) {
      handleInputChange(yesNoModalVisible.field as keyof BloodBankProfileData, value);
    }
    setYesNoModalVisible({ field: '', visible: false });
  };

  const renderYesNoField = (
    label: string,
    field: keyof BloodBankProfileData,
    icon: React.ReactNode,
    required: boolean = true
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
      </Text>
      <TouchableOpacity
        style={[styles.selectButton, formErrors[field] && styles.inputError]}
        onPress={() => openYesNoModal(field)}
        disabled={isApproved || isSubmitting}
      >
        <View style={styles.selectButtonContent}>
          {icon}
          <Text style={formData[field] ? styles.selectButtonText : styles.selectButtonPlaceholder}>
            {formData[field] || `Select ${label}`}
          </Text>
        </View>
        <View style={styles.selectButtonArrow}>
          <Text style={styles.selectButtonArrowText}>▼</Text>
        </View>
      </TouchableOpacity>
      {formErrors[field] && <Text style={styles.errorText}>{formErrors[field]}</Text>}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading blood bank profile...</Text>
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


          <View style={styles.content}>
            {isApproved && (
              <View style={styles.approvalCard}>
                <View style={styles.approvalIconWrapper}>
                  <ShieldCheck size={SPACING.md} color={COLORS.success} />
                </View>
                <View style={styles.approvalContent}>
                  <Text style={styles.approvalTitle}>Profile Approved</Text>
                  <Text style={styles.approvalDescription}>
                    This blood bank profile is approved and is in read-only mode.
                  </Text>
                </View>
              </View>
            )}

            {!isApproved && !loading && bloodBankStatus && bloodBankStatus !== 'approved' && (

<View style={styles.pendingContainer}>
  <View style={styles.pendingBadge}>
    <Clock size={FONT_SIZE.md} color="#8B5E34" />
    <Text style={styles.pendingText}>Pending Approval</Text>
  </View>
</View>

            )}

            {!bloodBankId && !loading && (
              <View style={styles.warningCard}>
                <View style={styles.warningIconWrapper}>
                  <AlertCircle size={SPACING.md} color={COLORS.error} />
                </View>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Blood Bank ID Not Found</Text>
                  <Text style={styles.warningDescription}>
                    Blood Bank ID not found. Please login again.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.form}>
              {/* Basic Information Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Building2 size={SPACING.md} color={COLORS.brand} />
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                </View>

                <View style={styles.sectionContent}>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      Registration Number <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, formErrors.registrationNumber && styles.inputError]}
                        placeholder="Enter registration number (REG-987654)"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.registrationNumber}
                        onChangeText={(text) => {
                      const cleanText = text.replace(/[^a-zA-Z0-9-]/g, '');
                      handleInputChange('registrationNumber', cleanText);
}}
                        editable={!isApproved && !isSubmitting}
                      />
                    </View>
                    {formErrors.registrationNumber && (
                      <Text style={styles.errorText}>{formErrors.registrationNumber}</Text>
                    )}
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      License Number <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, formErrors.licenseNumber && styles.inputError]}
                        placeholder="Enter license number (LC-2025-7788)"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.licenseNumber}
                        onChangeText={(text) => {
                        const cleanText = text.replace(/[^a-zA-Z0-9-]/g, '');
                        handleInputChange('licenseNumber', cleanText);
                      }}
                        editable={!isApproved && !isSubmitting}
                      />
                    </View>
                    {formErrors.licenseNumber && (
                      <Text style={styles.errorText}>{formErrors.licenseNumber}</Text>
                    )}
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Year of Establishment</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, formErrors.yearOfEstablishment && styles.inputError]}
                        placeholder="Enter year (e.g., 2001)"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.yearOfEstablishment}
                        onChangeText={(text) => {
                          const numericText = text.replace(/[^0-9]/g, '');
                          handleInputChange('yearOfEstablishment', numericText);
                        }}
                        keyboardType="numeric"
                        maxLength={4}
                        editable={!isApproved && !isSubmitting}
                      />
                    </View>
                    {formErrors.yearOfEstablishment && (
                      <Text style={styles.errorText}>{formErrors.yearOfEstablishment}</Text>
                    )}
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      Blood Bank Type <Text style={styles.required}></Text>
                    </Text>
                    <TouchableOpacity
                      style={[styles.selectButton, formErrors.bloodBankType && styles.inputError]}
                      onPress={() => setBloodBankTypeModalVisible(true)}
                      disabled={isApproved || isSubmitting}
                    >
                      <View style={styles.selectButtonContent}>
                        <Building2 size={FONT_SIZE.md} color={COLORS.sub} />
                        <Text style={formData.bloodBankType ? styles.selectButtonText : styles.selectButtonPlaceholder}>
                          {formData.bloodBankType || 'Select blood bank type'}
                        </Text>
                      </View>
                      <View style={styles.selectButtonArrow}>
                        <Text style={styles.selectButtonArrowText}>▼</Text>
                      </View>
                    </TouchableOpacity>
                    {formErrors.bloodBankType && (
                      <Text style={styles.errorText}>{formErrors.bloodBankType}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Address Information Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MapPin size={SPACING.md} color={COLORS.brand} />
                  <Text style={styles.sectionTitle}>Address Information</Text>
                </View>

                <View style={styles.sectionContent}>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      Address <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, styles.textArea, formErrors.address && styles.inputError]}
                        placeholder="Enter complete address"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.address}
                        onChangeText={(text) => handleInputChange('address', text)}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        editable={!isApproved && !isSubmitting}
                      />
                    </View>
                    {formErrors.address && (
                      <Text style={styles.errorText}>{formErrors.address}</Text>
                    )}
                  </View>

                  <View style={styles.rowContainer}>
                    <View style={[styles.fieldContainer, { flex: 1 }]}>
                      <Text style={styles.label}>
                        City <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.input, formErrors.city && styles.inputError]}
                        placeholder="Enter city"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.city}
                        onChangeText={(text) => handleInputChange('city', text)}
                        editable={!isApproved && !isSubmitting}
                      />
                      {formErrors.city && (
                        <Text style={styles.errorText}>{formErrors.city}</Text>
                      )}
                    </View>

                    <View style={[styles.fieldContainer, { flex: 1 }]}>
                      <Text style={styles.label}>
                        State <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.input, formErrors.state && styles.inputError]}
                        placeholder="Enter state"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.state}
                        onChangeText={(text) => handleInputChange('state', text)}
                        editable={!isApproved && !isSubmitting}
                      />
                      {formErrors.state && (
                        <Text style={styles.errorText}>{formErrors.state}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      Pin Code <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, formErrors.pinCode && styles.inputError]}
                      placeholder="Enter 6-digit pin code"
                      placeholderTextColor={COLORS.placeholder}
                      value={formData.pinCode}
                      onChangeText={(text) => {
                        const numericText = text.replace(/[^0-9]/g, '');
                        if (numericText.length <= 6) {
                          handleInputChange('pinCode', numericText);
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={6}
                      editable={!isApproved && !isSubmitting}
                    />
                    {formErrors.pinCode && (
                      <Text style={styles.errorText}>{formErrors.pinCode}</Text>
                    )}
                    {formData.pinCode.length > 0 && !validatePinCode(formData.pinCode) && (
                      <Text style={styles.hintText}>
                        Pin code must be 6 digits and start with 1-9
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Facilities & Services Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Thermometer size={SPACING.md} color={COLORS.brand} />
                  <Text style={styles.sectionTitle}>Facilities & Services</Text>
                </View>

                <View style={styles.sectionContent}>
                  {renderYesNoField(
                    '24x7 Service',
                    'is24x7',
                    <Clock size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'Component Separation Unit',
                    'componentSeparationUnit',
                    <TestTube size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'Apheresis Facility',
                    'apheresisFacility',
                    <Activity size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Cold Storage Capacity (ML)<Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Thermometer size={FONT_SIZE.md} color={COLORS.sub} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, formErrors.coldStorageCapacityML && styles.inputError]}
                        placeholder="Enter capacity in ML"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.coldStorageCapacityML}
                        onChangeText={(text) => {
                          const numericText = text.replace(/[^0-9]/g, '');
                          handleInputChange('coldStorageCapacityML', numericText);
                        }}
                        keyboardType="numeric"
                        editable={!isApproved && !isSubmitting}
                      />
                    </View>
                    {formErrors.coldStorageCapacityML && (
                      <Text style={styles.errorText}>{formErrors.coldStorageCapacityML}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Testing Facilities Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Beaker size={SPACING.md} color={COLORS.brand} />
                  <Text style={styles.sectionTitle}>Testing Facilities</Text>
                </View>

                <View style={styles.sectionContent}>
                  {renderYesNoField(
                    'HIV Testing',
                    'hivTesting',
                    <FlaskConical size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'HBV Testing',
                    'hbvTesting',
                    <FlaskConical size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'HCV Testing',
                    'hcvTesting',
                    <FlaskConical size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'Malaria Testing',
                    'malariaTesting',
                    <Syringe size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'Syphilis Testing',
                    'syphilisTesting',
                    <Syringe size={FONT_SIZE.md} color={COLORS.sub} />
                  )}
                </View>
              </View>

              {/* Blood Components Support Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Droplets size={SPACING.md} color={COLORS.brand} />
                  <Text style={styles.sectionTitle}>Blood Components Support</Text>
                </View>

                <View style={styles.sectionContent}>
                  {renderYesNoField(
                    'Whole Blood',
                    'supportsWholeBlood',
                    <HeartPulse size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'Plasma',
                    'supportsPlasma',
                    <Droplets size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'Platelets',
                    'supportsPlatelets',
                    <Activity size={FONT_SIZE.md} color={COLORS.sub} />
                  )}

                  {renderYesNoField(
                    'RBC',
                    'supportsRBC',
                    <Droplets size={FONT_SIZE.md} color={COLORS.sub} />
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {!isApproved && (
                  <TouchableOpacity
                    style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
                    onPress={saveProfile}
                    disabled={isSubmitting || isApproved}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <>
                        <Save size={FONT_SIZE.md} color={COLORS.white} />
                        <Text style={styles.buttonText}>Update Profile</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {!isApproved && (
                  <TouchableOpacity
                    style={[styles.resetButton, (isSubmitting || isApproved) && styles.buttonDisabled]}
                    onPress={resetForm}
                    disabled={isSubmitting || isApproved}
                  >
                    <Text style={styles.resetButtonText}>Reset Form</Text>
                  </TouchableOpacity>
                )}

                {isApproved && (
                  <View style={styles.readOnlyMessage}>
                    <ShieldCheck size={FONT_SIZE.md} color={COLORS.success} />
                    <Text style={styles.readOnlyMessageText}>
                      Profile is approved and in read-only mode
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Blood Bank Type Modal */}
      <SelectModal
        visible={bloodBankTypeModalVisible}
        onClose={() => setBloodBankTypeModalVisible(false)}
        options={BLOOD_BANK_TYPES}
        selected={formData.bloodBankType}
        onSelect={(value) => handleInputChange('bloodBankType', value)}
        title="Select Blood Bank Type"
      />

      {/* Yes/No Modal */}
      <SelectModal
        visible={yesNoModalVisible.visible}
        onClose={() => setYesNoModalVisible({ field: '', visible: false })}
        options={YES_NO_OPTIONS}
        selected={formData[yesNoModalVisible.field as keyof BloodBankProfileData] as string || ''}
        onSelect={handleYesNoSelect}
        title={`Select ${yesNoModalVisible.field.replace(/([A-Z])/g, ' $1').trim()}`}
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
    flex: 1,
    marginLeft: SPACING.sm,
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
  content: {
    padding: SPACING.md,
  },
  approvalCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: SPACING.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  approvalIconWrapper: {
    width: SPACING.xl,
    height: SPACING.xl,
    borderRadius: SPACING.lg,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalContent: {
    flex: 1,
  },
  approvalTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#166534',
    marginBottom: SPACING.xs * 0.5,
  },
  approvalDescription: {
    fontSize: FONT_SIZE.sm,
    color: '#166534',
    lineHeight: FONT_SIZE.md * 1.4,
  },
  statusCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: SPACING.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  statusIconWrapper: {
    width: SPACING.xl,
    height: SPACING.xl,
    borderRadius: SPACING.lg,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: SPACING.xs * 0.5,
  },
  statusBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  statusBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: '#92400E',
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: SPACING.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  warningIconWrapper: {
    width: SPACING.xl,
    height: SPACING.xl,
    borderRadius: SPACING.lg,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: SPACING.xs * 0.5,
  },
  warningDescription: {
    fontSize: FONT_SIZE.sm,
    color: '#991B1B',
    lineHeight: FONT_SIZE.md * 1.4,
  },
  form: {
    gap: SPACING.md,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingContainer: {
  alignItems: 'center',
  marginBottom: SPACING.md,
},

pendingBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: SPACING.sm,
  backgroundColor: '#FCEFCB', // soft yellow
  paddingVertical: SPACING.sm,
  paddingHorizontal: SPACING.lg,
  borderRadius: 16,
  borderWidth: 1.5,
  borderColor: '#E6B85C',
},

pendingText: {
  fontSize: FONT_SIZE.md,
  fontWeight: '600',
  color: '#8B5E34', // brownish text like screenshot
},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.brand,
  },
  sectionContent: {
    gap: SPACING.md,
  },
  fieldContainer: {
    marginBottom: SPACING.sm,
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
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: SPACING.sm,
    top: Platform.OS === 'ios' ? 12 : 14,
    zIndex: 1,
  },
input: {
  minHeight: 48,
  borderWidth: 1.5,
  borderColor: COLORS.border,
  borderRadius: SPACING.sm,
  paddingHorizontal: SPACING.md,
  paddingVertical: 12,
  fontSize: FONT_SIZE.md,
  color: COLORS.text,
  backgroundColor: '#f9fafb',
},
  textArea: {
    minHeight: responsiveHeight(12),
    paddingTop: SPACING.sm,
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
  hintText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.warning,
    marginTop: SPACING.xs * 0.5,
  },
rowContainer: {
  flexDirection: 'row',
  gap: SPACING.sm,
  alignItems: 'flex-start',   // ✅ important
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
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
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
  selectButtonArrow: {
    paddingLeft: SPACING.sm,
  },
  selectButtonArrowText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
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
  resetButton: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    color: COLORS.sub,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  readOnlyMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: '#F0FDF4',
    borderRadius: SPACING.lg,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  readOnlyMessageText: {
    fontSize: FONT_SIZE.md,
    color: '#166534',
    fontWeight: '500',
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
    maxHeight: responsiveHeight(40),
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
    flex: 1,
  },
  radioButton: {
    width: FONT_SIZE.lg,
    height: FONT_SIZE.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: FONT_SIZE.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.brand,
  },
  radioButtonInner: {
    width: FONT_SIZE.sm,
    height: FONT_SIZE.sm,
    borderRadius: FONT_SIZE.sm,
    backgroundColor: COLORS.brand,
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

export default BloodBankProfileForm;