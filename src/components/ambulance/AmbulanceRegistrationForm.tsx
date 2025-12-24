import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { showSuccess, showError } from '../../store/toast.slice';
import { AuthPost, AuthPut } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AmbulanceFooter from './AmbulanceFooter';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface AmbulanceData {
  id?: number;
  ambulanceName: string;
  ambulanceNumber: string;
  ownerType?: string;
  hospitalID?: number;
  email: string;
  phoneNo: string;
  firstName: string;
  lastName: string;
  state?: string;
  city?: string;
  pinCode?: number;
  ambulanceType?: string;
  rcNumber?: string;
  insuranceNumber?: string;
  insuranceValidTill?: string;
  pollutionNumber?: string;
  pollutionValidTill?: string;
  fitnessNumber?: string;
  fitnessValidTill?: string;
  ventilator?: boolean;
  oxygenCylinders?: number;
  cardiacMonitor?: boolean;
  suctionMachine?: boolean;
  defibrillator?: boolean;
  gpsEnabled?: boolean;
  available24x7?: boolean;
}

const AmbulanceRegistrationForm: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  // Determine if this is registration (new) or update (existing)
  const isUpdate = route.params?.ambulance ? true : false;
  const existingAmbulance = route.params?.ambulance as AmbulanceData | undefined;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [readOnlyFields, setReadOnlyFields] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<AmbulanceData>({
    ambulanceName: existingAmbulance?.ambulanceName || '',
    ambulanceNumber: existingAmbulance?.ambulanceNumber || '',
    ownerType: existingAmbulance?.ownerType || '',
    hospitalID: existingAmbulance?.hospitalID || undefined,
    email: existingAmbulance?.email || '',
    phoneNo: existingAmbulance?.phoneNo || '',
    firstName: existingAmbulance?.firstName || '',
    lastName: existingAmbulance?.lastName || '',
    state: existingAmbulance?.state || '',
    city: existingAmbulance?.city || '',
    pinCode: existingAmbulance?.pinCode || undefined,
    ambulanceType: existingAmbulance?.ambulanceType || 'ALS',
    rcNumber: existingAmbulance?.rcNumber || '',
    insuranceNumber: existingAmbulance?.insuranceNumber || '',
    insuranceValidTill: existingAmbulance?.insuranceValidTill || '',
    pollutionNumber: existingAmbulance?.pollutionNumber || '',
    pollutionValidTill: existingAmbulance?.pollutionValidTill || '',
    fitnessNumber: existingAmbulance?.fitnessNumber || '',
    fitnessValidTill: existingAmbulance?.fitnessValidTill || '',
    ventilator: existingAmbulance?.ventilator || false,
    oxygenCylinders: existingAmbulance?.oxygenCylinders || 2,
    cardiacMonitor: existingAmbulance?.cardiacMonitor || false,
    suctionMachine: existingAmbulance?.suctionMachine || false,
    defibrillator: existingAmbulance?.defibrillator || false,
    gpsEnabled: existingAmbulance?.gpsEnabled || false,
    available24x7: existingAmbulance?.available24x7 || false,
  });

  // Initialize read-only fields for update mode
  useEffect(() => {
    if (isUpdate) {
      setReadOnlyFields(
        new Set(['ambulanceName', 'ambulanceNumber', 'email', 'phoneNo', 'firstName', 'lastName'])
      );
    }
  }, [isUpdate]);

  const handleInputChange = (field: keyof AmbulanceData, value: any) => {
    if (readOnlyFields.has(field)) {
      return; // Don't allow changes to read-only fields
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Validate Step 1 (Basic Information)
  const validateStep1 = (): boolean => {
    const requiredFields = ['ambulanceName', 'ambulanceNumber', 'email', 'phoneNo', 'firstName'];

    for (const field of requiredFields) {
      if (!formData[field as keyof AmbulanceData]) {
        dispatch(showError(`Please fill in ${field}`));
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      dispatch(showError('Please enter a valid email'));
      return false;
    }

    return true;
  };

  // Validate Step 2 (Profile Information)
  const validateStep2 = (): boolean => {
    const requiredFields = [
      'ambulanceType',
      'rcNumber',
      'insuranceNumber',
      'insuranceValidTill',
      'pollutionNumber',
      'pollutionValidTill',
      'fitnessNumber',
      'fitnessValidTill',
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof AmbulanceData]) {
        dispatch(showError(`Please fill in ${field}`));
        return false;
      }
    }

    // Validate oxygen cylinders
    if (isNaN(Number(formData.oxygenCylinders)) || Number(formData.oxygenCylinders) < 0) {
      dispatch(showError('Please enter valid number of oxygen cylinders'));
      return false;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const dateFields = [
      'insuranceValidTill',
      'pollutionValidTill',
      'fitnessValidTill',
    ];

    for (const field of dateFields) {
      const value = formData[field as keyof AmbulanceData];
      if (!dateRegex.test(String(value))) {
        dispatch(showError(`${field} must be in YYYY-MM-DD format`));
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) {
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        dispatch(showError('Authentication required'));
        return;
      }

      if (isUpdate && existingAmbulance?.id) {
        // Update mode: Use PUT /ambulance/:id/profile
        const updateData = {
          ambulanceType: formData.ambulanceType,
          rcNumber: formData.rcNumber,
          insuranceNumber: formData.insuranceNumber,
          insuranceValidTill: formData.insuranceValidTill,
          pollutionNumber: formData.pollutionNumber,
          pollutionValidTill: formData.pollutionValidTill,
          fitnessNumber: formData.fitnessNumber,
          fitnessValidTill: formData.fitnessValidTill,
          ventilator: formData.ventilator,
          oxygenCylinders: Number(formData.oxygenCylinders),
          cardiacMonitor: formData.cardiacMonitor,
          suctionMachine: formData.suctionMachine,
          defibrillator: formData.defibrillator,
          gpsEnabled: formData.gpsEnabled,
          available24x7: formData.available24x7,
        };

        const response: any = await AuthPut(
          `ambulance/${existingAmbulance.id}/profile`,
          updateData,
          token
        );

        if (response?.status === 'success' || response?.message) {
          dispatch(showSuccess('Ambulance profile updated successfully'));
          setTimeout(() => {
            navigation.goBack();
          }, 1500);
        } else {
          dispatch(showError(response?.message || 'Failed to update ambulance profile'));
        }
      } else {
        // Registration mode: First register, then update profile
        // Step 1: Register ambulance
        const registerData = {
          ambulanceName: formData.ambulanceName,
          ambulanceNumber: formData.ambulanceNumber,
          ownerType: formData.ownerType || null,
          hospitalID: formData.hospitalID || null,
          email: formData.email,
          phoneNo: formData.phoneNo,
          firstName: formData.firstName,
          lastName: formData.lastName || '',
          state: formData.state || null,
          city: formData.city || null,
          pinCode: formData.pinCode || null,
        };

        const registerResponse: any = await AuthPost(
          'ambulance/register',
          registerData,
          token
        );

        if (!registerResponse?.ambulance?.id) {
          dispatch(showError(registerResponse?.message || 'Failed to register ambulance'));
          return;
        }

        const ambulanceId = registerResponse.ambulance.id;

        // Step 2: Update profile with documents and equipment
        const profileData = {
          ambulanceType: formData.ambulanceType,
          rcNumber: formData.rcNumber,
          insuranceNumber: formData.insuranceNumber,
          insuranceValidTill: formData.insuranceValidTill,
          pollutionNumber: formData.pollutionNumber,
          pollutionValidTill: formData.pollutionValidTill,
          fitnessNumber: formData.fitnessNumber,
          fitnessValidTill: formData.fitnessValidTill,
          ventilator: formData.ventilator,
          oxygenCylinders: Number(formData.oxygenCylinders),
          cardiacMonitor: formData.cardiacMonitor,
          suctionMachine: formData.suctionMachine,
          defibrillator: formData.defibrillator,
          gpsEnabled: formData.gpsEnabled,
          available24x7: formData.available24x7,
        };

        const profileResponse: any = await AuthPut(
          `ambulance/${ambulanceId}/profile`,
          profileData,
          token
        );

        if (profileResponse?.status === 'success' || profileResponse?.message) {
          dispatch(showSuccess('Ambulance registered successfully'));
          setTimeout(() => {
            navigation.goBack();
          }, 1500);
        } else {
          dispatch(showError(profileResponse?.message || 'Failed to complete ambulance registration'));
        }
      }
    } catch (error) {
      // console.error('Error submitting form:', error);
      dispatch(showError('Failed to submit form'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              {isUpdate ? 'Update Ambulance' : 'Register Ambulance'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isUpdate ? 'Step 2 of 2' : `Step ${currentStep} of 2`}
            </Text>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {currentStep === 1 && !isUpdate && (
            <>
              {/* Step 1: Basic Information */}
              <Text style={styles.stepTitle}>Basic Information</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ambulance Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter ambulance name"
                  placeholderTextColor="#999"
                  value={formData.ambulanceName}
                  onChangeText={(text) => handleInputChange('ambulanceName', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ambulance Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., MH02JK1999"
                  placeholderTextColor="#999"
                  value={formData.ambulanceNumber}
                  onChangeText={(text) => handleInputChange('ambulanceNumber', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Owner Type</Text>
                <View style={styles.typeButtonsContainer}>
                  {['hospital', 'private', 'ngo'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        formData.ownerType === type && styles.typeButtonActive,
                      ]}
                      onPress={() => handleInputChange('ownerType', type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.ownerType === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={formData.phoneNo}
                  onChangeText={(text) => handleInputChange('phoneNo', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                  value={formData.firstName}
                  onChangeText={(text) => handleInputChange('firstName', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                  value={formData.lastName}
                  onChangeText={(text) => handleInputChange('lastName', text)}
                />
              </View>

              <Text style={styles.sectionTitle}>Address</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter state"
                  placeholderTextColor="#999"
                  value={formData.state}
                  onChangeText={(text) => handleInputChange('state', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter city"
                  placeholderTextColor="#999"
                  value={formData.city}
                  onChangeText={(text) => handleInputChange('city', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Pin Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pin code"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={String(formData.pinCode || '')}
                  onChangeText={(text) =>
                    handleInputChange('pinCode', text ? Number(text) : undefined)
                  }
                />
              </View>

              {/* Navigation Buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitButton} onPress={handleNextStep}>
                  <Text style={styles.submitButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {(currentStep === 2 || isUpdate) && (
            <>
              {/* Step 2: Profile Information */}
              <Text style={styles.stepTitle}>
                {isUpdate ? 'Update Profile Details' : 'Profile Information'}
              </Text>

              {isUpdate && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxText}>
                    ℹ️ Some fields are read-only. Fill in missing information and documents.
                  </Text>
                </View>
              )}

              {/* Ambulance Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ambulance Type *</Text>
                <View style={styles.typeButtonsContainer}>
                  {['ALS', 'BLS', 'ICU', 'Mortuary'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        formData.ambulanceType === type && styles.typeButtonActive,
                      ]}
                      onPress={() => handleInputChange('ambulanceType', type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.ambulanceType === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionTitle}>Documents</Text>

              {/* RC Number */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>RC Number *</Text>
                <TextInput
                  style={[
                    styles.input,
                    readOnlyFields.has('rcNumber') && styles.readOnlyInput,
                  ]}
                  placeholder="Enter RC number"
                  placeholderTextColor="#999"
                  value={formData.rcNumber}
                  onChangeText={(text) => handleInputChange('rcNumber', text)}
                  editable={!readOnlyFields.has('rcNumber')}
                />
              </View>

              {/* Insurance Number */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Insurance Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter insurance number"
                  placeholderTextColor="#999"
                  value={formData.insuranceNumber}
                  onChangeText={(text) => handleInputChange('insuranceNumber', text)}
                />
              </View>

              {/* Insurance Valid Till */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Insurance Valid Till (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  value={formData.insuranceValidTill}
                  onChangeText={(text) => handleInputChange('insuranceValidTill', text)}
                />
              </View>

              {/* Pollution Number */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Pollution Certificate Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pollution certificate number"
                  placeholderTextColor="#999"
                  value={formData.pollutionNumber}
                  onChangeText={(text) => handleInputChange('pollutionNumber', text)}
                />
              </View>

              {/* Pollution Valid Till */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Pollution Valid Till (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  value={formData.pollutionValidTill}
                  onChangeText={(text) => handleInputChange('pollutionValidTill', text)}
                />
              </View>

              {/* Fitness Number */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Fitness Certificate Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter fitness certificate number"
                  placeholderTextColor="#999"
                  value={formData.fitnessNumber}
                  onChangeText={(text) => handleInputChange('fitnessNumber', text)}
                />
              </View>

              {/* Fitness Valid Till */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Fitness Valid Till (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  value={formData.fitnessValidTill}
                  onChangeText={(text) => handleInputChange('fitnessValidTill', text)}
                />
              </View>

              <Text style={styles.sectionTitle}>Equipment & Features</Text>

              {/* Oxygen Cylinders */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Number of Oxygen Cylinders *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={String(formData.oxygenCylinders)}
                  onChangeText={(text) =>
                    handleInputChange('oxygenCylinders', text ? Number(text) : 0)
                  }
                />
              </View>

              {/* Equipment Toggles */}
              <View style={styles.toggleGroup}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Ventilator Available</Text>
                  <Switch
                    value={formData.ventilator}
                    onValueChange={(value) => handleInputChange('ventilator', value)}
                    trackColor={{ false: '#ccc', true: '#81c784' }}
                    thumbColor="#14b8a6"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Cardiac Monitor</Text>
                  <Switch
                    value={formData.cardiacMonitor}
                    onValueChange={(value) => handleInputChange('cardiacMonitor', value)}
                    trackColor={{ false: '#ccc', true: '#81c784' }}
                    thumbColor="#14b8a6"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Suction Machine</Text>
                  <Switch
                    value={formData.suctionMachine}
                    onValueChange={(value) => handleInputChange('suctionMachine', value)}
                    trackColor={{ false: '#ccc', true: '#81c784' }}
                    thumbColor="#14b8a6"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Defibrillator</Text>
                  <Switch
                    value={formData.defibrillator}
                    onValueChange={(value) => handleInputChange('defibrillator', value)}
                    trackColor={{ false: '#ccc', true: '#81c784' }}
                    thumbColor="#14b8a6"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>GPS Enabled</Text>
                  <Switch
                    value={formData.gpsEnabled}
                    onValueChange={(value) => handleInputChange('gpsEnabled', value)}
                    trackColor={{ false: '#ccc', true: '#81c784' }}
                    thumbColor="#14b8a6"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Available 24/7</Text>
                  <Switch
                    value={formData.available24x7}
                    onValueChange={(value) => handleInputChange('available24x7', value)}
                    trackColor={{ false: '#ccc', true: '#81c784' }}
                    thumbColor="#14b8a6"
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    if (currentStep === 2 && !isUpdate) {
                      setCurrentStep(1);
                    } else {
                      navigation.goBack();
                    }
                  }}
                >
                  <Text style={styles.cancelButtonText}>
                    {currentStep === 2 && !isUpdate ? 'Back' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                  <Text style={styles.submitButtonText}>
                    {isUpdate ? 'Update' : 'Register'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <AmbulanceFooter active="ambulances" brandColor="#14b8a6" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: 16,
    color: '#333',
  },
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: isSmallDevice ? 20 : 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#1565c0',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toggleGroup: {
    marginTop: 16,
    gap: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#14b8a6',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default AmbulanceRegistrationForm;
