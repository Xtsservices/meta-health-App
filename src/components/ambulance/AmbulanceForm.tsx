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
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { showSuccess, showError } from '../../store/toast.slice';
import { UploadFiles, UpdateFiles } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AmbulanceFooter from './AmbulanceFooter';
import { state, city } from '../../utils/stateCity';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface AmbulanceFormData {
  ambulance_name: string;
  ambulance_number: string;
  owner_type: string;
  hospital_id: string;
  email: string;
  phone_no: string;
  first_name: string;
  last_name: string;
  state: string;
  city: string;
  pin_code: string;
  ambulance_type: string;
  rc_number: string;
  insurance_number: string;
  insurance_valid_till: string;
  pollution_number: string;
  pollution_valid_till: string;
  fitness_number: string;
  fitness_valid_till: string;
  ventilator: boolean;
  oxygen_cylinders: string;
  cardiac_monitor: boolean;
  suction_machine: boolean;
  defibrillator: boolean;
  gps_enabled: boolean;
  available_24x7: boolean;
}

interface RouteParams {
  ambulance?: Partial<AmbulanceFormData> & { id?: number };
}

const AmbulanceForm: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const params = route.params as RouteParams | undefined;
  const isUpdate = !!params?.ambulance;
  const existingAmbulance = params?.ambulance;
 

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [_permissionsGranted, setPermissionsGranted] = useState(false);
  const [_documents, _setDocuments] = useState<{
    [key: string]: { uri: string; name: string; type: string } | null;
  }>({
    rcDoc: null,
    frontImage: null,
    backImage: null,
    insideImage: null,
  });
  const [readOnlyFields] = useState(
    new Set([
      'ambulance_name',
      'ambulance_number',
      'email',
      'phone_no',
      'first_name',
      'last_name',
      'firstName',
      'lastName',
      'contactEmail',
      'contactPhone',
    ])
  );

  const [formData, setFormData] = useState<AmbulanceFormData>({
  ambulance_name: existingAmbulance?.ambulance_name || (existingAmbulance as any)?.ambulanceName || '',
  ambulance_number: existingAmbulance?.ambulance_number || (existingAmbulance as any)?.ambulanceNumber || '',
    owner_type: existingAmbulance?.owner_type || 'hospital',
  hospital_id: existingAmbulance?.hospital_id || (existingAmbulance as any)?.hospitalID || null,
  email: existingAmbulance?.email || (existingAmbulance as any)?.contactEmail || '',
  phone_no: existingAmbulance?.phone_no || (existingAmbulance as any)?.contactPhone || '',
  first_name: existingAmbulance?.first_name || (existingAmbulance as any)?.firstName || '',
  last_name: existingAmbulance?.last_name || (existingAmbulance as any)?.lastName || '',
    state: existingAmbulance?.state || '',
    city: existingAmbulance?.city || '',
    pin_code: existingAmbulance?.pin_code || '',
    ambulance_type: existingAmbulance?.ambulance_type || 'ALS',
    rc_number: existingAmbulance?.rc_number || '',
    insurance_number: existingAmbulance?.insurance_number || '',
    insurance_valid_till: existingAmbulance?.insurance_valid_till || '',
    pollution_number: existingAmbulance?.pollution_number || '',
    pollution_valid_till: existingAmbulance?.pollution_valid_till || '',
    fitness_number: existingAmbulance?.fitness_number || '',
    fitness_valid_till: existingAmbulance?.fitness_valid_till || '',
    ventilator: existingAmbulance?.ventilator || false,
  oxygen_cylinders: existingAmbulance?.oxygen_cylinders?.toString() || ((existingAmbulance as any)?.oxygenCylinders ? String((existingAmbulance as any).oxygenCylinders) : '2'),
  cardiac_monitor: existingAmbulance?.cardiac_monitor || (existingAmbulance as any)?.cardiacMonitor || false,
  suction_machine: existingAmbulance?.suction_machine || (existingAmbulance as any)?.suctionMachine || false,
  defibrillator: existingAmbulance?.defibrillator || (existingAmbulance as any)?.defibrillator || false,
  gps_enabled: existingAmbulance?.gps_enabled || (existingAmbulance as any)?.gpsEnabled || false,
  available_24x7: existingAmbulance?.available_24x7 || (existingAmbulance as any)?.available24x7 || false,
  });

  // Request permissions when component mounts
  useEffect(() => {
    const initializePermissions = async () => {
      const hasPermission = await requestPermissions();
      setPermissionsGranted(hasPermission);
      
      if (!hasPermission) {
        dispatch(showError('Camera and storage permissions are required to use this feature'));
      } else {
        console.log('All permissions granted - ready to use camera');
      }
    };

    initializePermissions();
  }, [dispatch]); // Run when component mounts, dispatch available

  const handleInputChange = (field: keyof AmbulanceFormData, value: any) => {
    if (isUpdate && readOnlyFields.has(field)) {
      return;
    }
    
    // Validate pin code - only 6 digits
    if (field === 'pin_code') {
      if (value && !/^\d{0,6}$/.test(value)) {
        return; // Don't update if not valid digits or more than 6
      }
    }
    // Phone number: only digits, max 10
    if (field === 'phone_no') {
      if (value && !/^\d{0,10}$/.test(value)) {
        return; // restrict to digits and max length 10
      }
    }

    // First/Last name: prevent digits (allow letters, spaces, hyphen, apostrophe)
    if (field === 'first_name' || field === 'last_name') {
      if (value && !/^[A-Za-z\s'-]*$/.test(value)) {
        return; // disallow numbers and other symbols
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'ambulance_name',
      'ambulance_number',
      'ambulance_type',
      'state',
      'city',
      'pin_code',
      'rc_number',
      'insurance_number',
      'insurance_valid_till',
      'pollution_number',
      'pollution_valid_till',
      'fitness_number',
      'fitness_valid_till',
      'oxygen_cylinders',
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof AmbulanceFormData]) {
        dispatch(showError(`Please fill in ${field.replace(/_/g, ' ')}`));
        return false;
      }
    }

    // Validate pin code format - exactly 6 digits
    if (!/^\d{6}$/.test(formData.pin_code)) {
      dispatch(showError('Pin code must be exactly 6 digits'));
      return false;
    }

    // Validate oxygen cylinders is a number
    if (isNaN(Number(formData.oxygen_cylinders))) {
      dispatch(showError('Oxygen cylinders must be a number'));
      return false;
    }

    // Validate phone number format if provided - exactly 10 digits
    if (formData.phone_no && formData.phone_no.trim() !== '' && !/^[0-9]{10}$/.test(formData.phone_no)) {
      dispatch(showError('Phone number must be exactly 10 digits'));
      return false;
    }

    // Validate email format if provided
    if (formData.email && formData.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      dispatch(showError('Please enter a valid email address'));
      return false;
    }

    // Validate first and last name should not contain digits (if provided)
    if (formData.first_name && formData.first_name.trim() !== '' && /[0-9]/.test(formData.first_name)) {
      dispatch(showError('First name cannot contain numbers'));
      return false;
    }
    if (formData.last_name && formData.last_name.trim() !== '' && /[0-9]/.test(formData.last_name)) {
      dispatch(showError('Last name cannot contain numbers'));
      return false;
    }

    // Validate documents/images are uploaded (mandatory)
    const requiredDocuments = ['rcDoc', 'frontImage', 'backImage', 'insideImage'];
    for (const docType of requiredDocuments) {
      if (!_documents[docType] || !_documents[docType]?.uri) {
        dispatch(showError(`Please upload ${docType.replace(/([A-Z])/g, ' $1').trim()} document`));
        return false;
      }
    }

    return true;
  };

  // Request permissions for camera and file access
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const sdkInt = Platform.Version as number;
        // console.log('Android SDK version:', sdkInt);

        const perms: string[] = [];
        // Always need camera for capturing
        perms.push(PermissionsAndroid.PERMISSIONS.CAMERA);

        if (sdkInt >= 33) {
          // @ts-ignore - READ_MEDIA_IMAGES may not be present in some RN typings
          perms.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        } else {
          perms.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
          perms.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        }

        // console.log('Requesting permissions:', perms);
        const results = await PermissionsAndroid.requestMultiple(perms as any);
        // console.log('Permission results:', results);

        // Verify all required permissions are granted
        for (const p of perms) {
          const res = results[p as keyof typeof results];
          if (res !== PermissionsAndroid.RESULTS.GRANTED) {
            // console.warn(`Permission ${p} not granted:`, res);
            return false;
          }
        }

        // console.log('All permissions granted or already available');
        return true;
      } catch {
        console.error('Permission request error');
        return false;
      }
    }
    return true; // iOS will request permissions automatically from Info.plist
  };

  const handleDatePick = (field: string, date: Date) => {
    setShowDatePicker(null);
    const formattedDate = date.toISOString().split('T')[0];
    handleInputChange(field as keyof AmbulanceFormData, formattedDate);
  };

  // Handle document upload (camera or gallery)
  const handleDocumentUpload = async (
    documentType: 'rcDoc' | 'frontImage' | 'backImage' | 'insideImage',
    useCamera: boolean
  ) => {
    try {
      // console.log(`Attempting to ${useCamera ? 'take photo' : 'select image'} for ${documentType}`);

      // Re-check/request permissions right before action to handle cases where user recently changed settings
      const ok = await requestPermissions();
      setPermissionsGranted(ok);
      if (!ok) {
        dispatch(showError('Permissions not granted. Please allow camera/storage permissions from settings.'));
        return;
      }

      const options: any = {
        mediaType: 'photo',
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
  saveToPhotos: false, // avoid requiring WRITE_EXTERNAL_STORAGE on some devices
        cameraType: 'back',
        includeBase64: false,
        includeExtra: true,
      };

      if (useCamera) {
        // console.log('Launching camera...');
        launchCamera(options, (response) => {
          // console.log('Camera response:', response);
          
          if (response.didCancel) {
            // console.log('User cancelled camera');
          } else if (response.errorCode) {
            // console.error('Camera error:', response.errorCode, response.errorMessage);
            dispatch(showError(`Camera error: ${response.errorMessage || 'Failed to capture image'}`));
          } else if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            // console.log('Photo captured:', asset.uri);
            _setDocuments((prev: any) => ({
              ...prev,
              [documentType]: {
                uri: asset.uri!,
                name: asset.fileName || `${String(documentType)}.jpg`,
                type: asset.type || 'image/jpeg',
              },
            }));
            dispatch(showSuccess('Image captured successfully'));
          } else {
            console.error('No assets in response');
            dispatch(showError('Failed to capture image'));
          }
        });
      } else {
        // console.log('Launching image library...');
        launchImageLibrary(options, (response) => {
          // console.log('Gallery response:', response);
          
          if (response.didCancel) {
            // console.log('User cancelled gallery');
          } else if (response.errorCode) {
            // console.error('Gallery error:', response.errorCode, response.errorMessage);
            dispatch(showError(`Gallery error: ${response.errorMessage || 'Failed to select image'}`));
          } else if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            // console.log('Image selected:', asset.uri);
            _setDocuments((prev: any) => ({
              ...prev,
              [documentType]: {
                uri: asset.uri!,
                name: asset.fileName || `${String(documentType)}.jpg`,
                type: asset.type || 'image/jpeg',
              },
            }));
            dispatch(showSuccess('Image selected successfully'));
          } else {
            console.error('No assets in response');
            dispatch(showError('Failed to select image'));
          }
        });
      }
    } catch (error) {
      // console.error('Error uploading document:', error);
      dispatch(showError('Failed to process image'));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Prevent duplicate submissions
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        dispatch(showError('Authentication required'));
        setLoading(false);
        return;
      }

      // Build multipart form data
      const fd: any = new FormData();

      if (isUpdate && existingAmbulance?.id) {
        // For UPDATE API - only send profile fields, location, and documents
        const updateFields: { [key: string]: any } = {
          // Profile fields
          ambulanceType: formData.ambulance_type,
          rcNumber: formData.rc_number,
          insuranceNumber: formData.insurance_number,
          insuranceValidTill: formData.insurance_valid_till,
          pollutionNumber: formData.pollution_number,
          pollutionValidTill: formData.pollution_valid_till,
          fitnessNumber: formData.fitness_number,
          fitnessValidTill: formData.fitness_valid_till,
          ventilator: Boolean(formData.ventilator),
          oxygenCylinders: Number(formData.oxygen_cylinders),
          cardiacMonitor: Boolean(formData.cardiac_monitor),
          suctionMachine: Boolean(formData.suction_machine),
          defibrillator: Boolean(formData.defibrillator),
          gpsEnabled: Boolean(formData.gps_enabled),
          available24x7: Boolean(formData.available_24x7),
          // Location fields
          state: formData.state,
          city: formData.city,
          pinCode: Number(formData.pin_code),
        };

        Object.entries(updateFields).forEach(([k, v]) => {
          fd.append(k, String(v));
        });

        // Append documents (mandatory for update)
        Object.entries(_documents).forEach(([key, file]) => {
          if (file && file.uri) {
            fd.append(key, {
              uri: file.uri,
              name: file.name || `${key}.jpg`,
              type: file.type || 'image/jpeg',
            } as any);
          }
        });
      } else {
        // For CREATE API - send all fields including ambulance details
        const createFields: { [key: string]: any } = {
          // Ambulance
          ambulanceName: formData.ambulance_name,
          ambulanceNumber: formData.ambulance_number,
          ownerType: formData.owner_type,
          state: formData.state,
          city: formData.city,
          pinCode: Number(formData.pin_code),

          // Profile
          ambulanceType: formData.ambulance_type,
          rcNumber: formData.rc_number,
          insuranceNumber: formData.insurance_number,
          insuranceValidTill: formData.insurance_valid_till,
          pollutionNumber: formData.pollution_number,
          pollutionValidTill: formData.pollution_valid_till,
          fitnessNumber: formData.fitness_number,
          fitnessValidTill: formData.fitness_valid_till,
          ventilator: Boolean(formData.ventilator),
          oxygenCylinders: Number(formData.oxygen_cylinders),
          cardiacMonitor: Boolean(formData.cardiac_monitor),
          suctionMachine: Boolean(formData.suction_machine),
          defibrillator: Boolean(formData.defibrillator),
          gpsEnabled: Boolean(formData.gps_enabled),
          available24x7: Boolean(formData.available_24x7),
        };

        // Append optional fields if provided
        if (formData.email && formData.email.trim() !== '') {
          createFields.email = formData.email;
        }
        if (formData.phone_no && formData.phone_no.trim() !== '') {
          createFields.phoneNo = formData.phone_no;
        }
        if (formData.first_name && formData.first_name.trim() !== '') {
          createFields.firstName = formData.first_name;
        }
        if (formData.last_name && formData.last_name.trim() !== '') {
          createFields.lastName = formData.last_name;
        }

        Object.entries(createFields).forEach(([k, v]) => {
          fd.append(k, String(v));
        });

        // Append hospitalID only when available (optional field)
        if (formData.hospital_id !== null && formData.hospital_id !== '' && typeof formData.hospital_id !== 'undefined') {
          const hid = Number(formData.hospital_id);
          if (!Number.isNaN(hid)) {
            fd.append('hospitalID', String(hid));
          }
        }

        // Append all documents (mandatory for create)
        Object.entries(_documents).forEach(([key, file]) => {
          if (file && file.uri) {
            fd.append(key, {
              uri: file.uri,
              name: file.name || `${key}.jpg`,
              type: file.type || 'image/jpeg',
            } as any);
          }
        });
      }

      

      if (isUpdate && existingAmbulance?.id) {
        // console.log('Submitting updated ambulance with files', fd);

        const response: any = await UpdateFiles(`ambulance/${existingAmbulance.id}/profile`, fd, token);
        // console.log('UpdateFiles response:', response);

        if (response?.status === 'success') {
          dispatch(showSuccess('Ambulance updated successfully'));
          setTimeout(() => navigation.goBack(), 1500);
        } else {
          dispatch(showError(response?.message || 'Failed to update'));
        }
      } else {
        // console.log('Submitting new ambulance with files', fd);
        const response: any = await UploadFiles('ambulance/addAmbulanceWithProfile', fd, token);
        // console.log('UploadFiles response:', response);
        
        if (response?.data?.ambulanceID) {
          dispatch(showSuccess('Ambulance registered successfully'));
          setTimeout(() => navigation.goBack(), 1500);
        } else {
          dispatch(showError(response?.message || 'Failed to register'));
        }
      }
    } catch (error) {
      // console.log('Error submitting form:', error);
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
          <Text style={styles.headerTitle}>
            {isUpdate ? 'Complete Ambulance Details' : 'Register Ambulance'}
          </Text>
        </View>

        {/* Info Box for Update */}
        {isUpdate && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Some fields are pre-filled and cannot be edited
            </Text>
          </View>
        )}

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Basic Information */}
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <FormField
            label="Ambulance Name *"
            value={formData.ambulance_name}
            onChangeText={(text) => handleInputChange('ambulance_name', text)}
            editable={!isUpdate}
            placeholder="Enter ambulance name"
          />

          <FormField
            label="Ambulance Number *"
            value={formData.ambulance_number}
            onChangeText={(text) => handleInputChange('ambulance_number', text)}
            editable={!isUpdate}
            placeholder="Enter ambulance number"
          />

          <OwnerTypeDropdown
            value={formData.owner_type}
            onSelect={(selectedOwnerType) => handleInputChange('owner_type', selectedOwnerType)}
          />

          <FormField
            label="Hospital ID"
            value={formData.hospital_id}
            onChangeText={(text) => handleInputChange('hospital_id', text)}
            placeholder="Optional"
          />

          <StateDropdown
            value={formData.state}
            onSelect={(selectedStateValue) => {
              handleInputChange('state', selectedStateValue);
              handleInputChange('city', ''); // Reset city when state changes
            }}
          />

          <CityDropdown
            state={formData.state}
            value={formData.city}
            onSelect={(selectedCity) => handleInputChange('city', selectedCity)}
          />

          <FormField
            label="Pin Code *"
            value={formData.pin_code}
            onChangeText={(text) => handleInputChange('pin_code', text)}
            placeholder="Enter pin code (6 digits)"
            keyboardType="number-pad"
          />

          {/* Ambulance Details */}
          <Text style={styles.sectionTitle}>Ambulance Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ambulance Type *</Text>
            <View style={styles.typeContainer}>
              {['ALS', 'BLS', 'ICU', 'Mortuary'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.ambulance_type === type && styles.typeButtonActive,
                  ]}
                  onPress={() => handleInputChange('ambulance_type', type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.ambulance_type === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Documents */}
          <Text style={styles.sectionTitle}>Documents</Text>

          <FormField
            label="RC Number *"
            value={formData.rc_number}
            onChangeText={(text) => handleInputChange('rc_number', text)}
            placeholder="Enter RC number"
          />

          <FormField
            label="Insurance Number *"
            value={formData.insurance_number}
            onChangeText={(text) => handleInputChange('insurance_number', text)}
            placeholder="Enter insurance number"
          />

          <DateField
            label="Insurance Valid Till *"
            value={formData.insurance_valid_till}
            onPress={() => setShowDatePicker('insurance_valid_till')}
          />

          <FormField
            label="Pollution Number *"
            value={formData.pollution_number}
            onChangeText={(text) => handleInputChange('pollution_number', text)}
            placeholder="Enter pollution number"
          />

          <DateField
            label="Pollution Valid Till *"
            value={formData.pollution_valid_till}
            onPress={() => setShowDatePicker('pollution_valid_till')}
          />

          <FormField
            label="Fitness Number *"
            value={formData.fitness_number}
            onChangeText={(text) => handleInputChange('fitness_number', text)}
            placeholder="Enter fitness number"
          />

          <DateField
            label="Fitness Valid Till *"
            value={formData.fitness_valid_till}
            onPress={() => setShowDatePicker('fitness_valid_till')}
          />

          {/* Equipment */}
          <Text style={styles.sectionTitle}>Equipment & Features</Text>

          <FormField
            label="Oxygen Cylinders *"
            value={formData.oxygen_cylinders}
            onChangeText={(text) => handleInputChange('oxygen_cylinders', text)}
            placeholder="0"
            keyboardType="number-pad"
          />

          <ToggleField
            label="Ventilator"
            value={formData.ventilator}
            onValueChange={(value) => handleInputChange('ventilator', value)}
          />

          <ToggleField
            label="Cardiac Monitor"
            value={formData.cardiac_monitor}
            onValueChange={(value) => handleInputChange('cardiac_monitor', value)}
          />

          <ToggleField
            label="Suction Machine"
            value={formData.suction_machine}
            onValueChange={(value) => handleInputChange('suction_machine', value)}
          />

          <ToggleField
            label="Defibrillator"
            value={formData.defibrillator}
            onValueChange={(value) => handleInputChange('defibrillator', value)}
          />

          <ToggleField
            label="GPS Enabled"
            value={formData.gps_enabled}
            onValueChange={(value) => handleInputChange('gps_enabled', value)}
          />

          <ToggleField
            label="Available 24/7"
            value={formData.available_24x7}
            onValueChange={(value) => handleInputChange('available_24x7', value)}
          />

          {/* Document Upload Section */}
          <Text style={styles.sectionTitle}>Documents Upload (All Required)</Text>
          
          <DocumentUploadField 
            label="RC Document *" 
            documentType="rcDoc"
            currentFile={_documents.rcDoc}
            onUpload={handleDocumentUpload}
          />
          <DocumentUploadField 
            label="Front Image *" 
            documentType="frontImage"
            currentFile={_documents.frontImage}
            onUpload={handleDocumentUpload}
          />
          <DocumentUploadField 
            label="Back Image *" 
            documentType="backImage"
            currentFile={_documents.backImage}
            onUpload={handleDocumentUpload}
          />
          <DocumentUploadField 
            label="Inside Image *" 
            documentType="insideImage"
            currentFile={_documents.insideImage}
            onUpload={handleDocumentUpload}
          />

          {/* Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Processing...' : (isUpdate ? 'Update' : 'Register')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AmbulanceFooter active="dashboard" brandColor="#14b8a6" />

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()} // Disable past dates
          onChange={(event, date) => {
            if (date) {
              handleDatePick(showDatePicker, date);
            }
          }}
        />
      )}
    </View>
  );
};

// Form Field Component
const FormField: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: any;
}> = ({ label, value, onChangeText, placeholder, editable = true, keyboardType = 'default' }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      keyboardType={keyboardType}
    />
  </View>
);

// Date Field Component
const DateField: React.FC<{
  label: string;
  value: string;
  onPress: () => void;
}> = ({ label, value, onPress }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity style={styles.dateInput} onPress={onPress}>
      <Text style={[styles.dateText, !value && styles.placeholderText]}>
        {value || 'YYYY-MM-DD'}
      </Text>
    </TouchableOpacity>
  </View>
);

// Toggle Field Component
const ToggleField: React.FC<{
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ label, value, onValueChange }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#ccc', true: '#81c784' }}
      thumbColor="#14b8a6"
    />
  </View>
);

// Document Upload Field Component
const DocumentUploadField: React.FC<{
  label: string;
  documentType: 'rcDoc' | 'frontImage' | 'backImage' | 'insideImage';
  currentFile?: { uri: string; name: string; type: string } | null;
  onUpload: (documentType: 'rcDoc' | 'frontImage' | 'backImage' | 'insideImage', useCamera: boolean) => Promise<void>;
}> = ({ label, documentType, currentFile, onUpload }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.uploadContainer}>
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={() => onUpload(documentType, true)}
      >
        <Text style={styles.uploadButtonText}>📷 Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={() => onUpload(documentType, false)}
      >
        <Text style={styles.uploadButtonText}>📁 Choose File</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.selectedFileText} numberOfLines={1} ellipsizeMode="tail">
      {currentFile && currentFile.name ? `Selected: ${currentFile.name}` : 'No file selected'}
    </Text>
  </View>
);

// State Dropdown Component
const StateDropdown: React.FC<{
  value: string;
  onSelect: (state: string) => void;
}> = ({ value, onSelect }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>State *</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={[styles.dropdownButtonText, !value && styles.placeholderText]}>
          {value || 'Select a state'}
        </Text>
        <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showDropdown && (
        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
          {state.map((stateName) => (
            <TouchableOpacity
              key={stateName}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(stateName);
                setShowDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  value === stateName && styles.dropdownItemTextSelected,
                ]}
              >
                {stateName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// City Dropdown Component
const CityDropdown: React.FC<{
  state: string;
  value: string;
  onSelect: (city: string) => void;
}> = ({ state: selectedState, value, onSelect }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const stateIndex = state.indexOf(selectedState);
  const cities = stateIndex >= 0 ? city[stateIndex] : [];

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>City *</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, !selectedState && styles.dropdownButtonDisabled]}
        onPress={() => selectedState && setShowDropdown(!showDropdown)}
        disabled={!selectedState}
      >
        <Text
          style={[
            styles.dropdownButtonText,
            !value && styles.placeholderText,
            !selectedState && styles.dropdownButtonTextDisabled,
          ]}
        >
          {!selectedState ? 'Select state first' : value || 'Select a city'}
        </Text>
        <Text style={[styles.dropdownArrow, !selectedState && styles.dropdownArrowDisabled]}>
          {showDropdown ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      {showDropdown && cities.length > 0 && (
        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
          {cities.map((cityName) => (
            <TouchableOpacity
              key={cityName}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(cityName);
                setShowDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  value === cityName && styles.dropdownItemTextSelected,
                ]}
              >
                {cityName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// Owner Type Dropdown Component
const OwnerTypeDropdown: React.FC<{
  value: string;
  onSelect: (ownerType: string) => void;
}> = ({ value, onSelect }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const ownerTypes = ['hospital', 'private', 'ngo'];

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>Owner Type</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={[styles.dropdownButtonText, !value && styles.placeholderText]}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Select owner type'}
        </Text>
        <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showDropdown && (
        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
          {ownerTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(type);
                setShowDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  value === type && styles.dropdownItemTextSelected,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingVertical: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  formSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1565c0',
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    color: '#333',
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
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  dateInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
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
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  uploadContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 20,
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
  submitButtonDisabled: {
    backgroundColor: '#a0a0a0',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  dropdownButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownButtonTextDisabled: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  dropdownArrowDisabled: {
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    marginTop: -1,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#333',
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: '#14b8a6',
  },
  selectedFileText: {
    marginTop: 8,
    fontSize: 13,
    color: '#444',
  },
});

export default AmbulanceForm;
