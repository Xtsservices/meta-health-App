import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Platform, PermissionsAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { UploadFiles } from '../../auth/auth';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { showSuccess, showError } from '../../store/toast.slice';

const AddDriver: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    mobile: '', 
    email: '', 
    password: '', 
    aadharNumber: '', 
    drivingLicenceNumber: '' 
  });
  const [images, setImages] = useState<{ 
    aadharImage?: any; 
    licenceFrontImage?: any; 
    licenceBackImage?: any 
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (key: string, value: string) => {
    // Mobile: only digits, max 10
    if (key === 'mobile') {
      if (value && !/^\d{0,10}$/.test(value)) return;
    }
    
    // Aadhar: only digits, max 12
    if (key === 'aadharNumber') {
      if (value && !/^\d{0,12}$/.test(value)) return;
    }
    
    setForm((s) => ({ ...s, [key]: value }));
  };

  const handleAddDriver = async () => {
    // All fields are mandatory - validate each field
    const errs: string[] = [];
    
    // First name validation
    if (!form.firstName || form.firstName.trim().length === 0) {
      errs.push('First name is required');
    } else if (form.firstName.trim().length < 2) {
      errs.push('First name must be at least 2 characters');
    }
    
    // Last name validation
    if (!form.lastName || form.lastName.trim().length === 0) {
      errs.push('Last name is required');
    } else if (form.lastName.trim().length < 2) {
      errs.push('Last name must be at least 2 characters');
    }
    
    // Mobile validation - must be exactly 10 digits, no special characters
    if (!form.mobile || form.mobile.trim().length === 0) {
      errs.push('Mobile number is required');
    } else if (!/^[0-9]{10}$/.test(form.mobile)) {
      errs.push('Mobile number must be exactly 10 digits');
    }
    
    // Email validation - must be valid format
    if (!form.email || form.email.trim().length === 0) {
      errs.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.push('Email must be a valid email address');
    }
    
    // Password validation
    if (!form.password || form.password.trim().length === 0) {
      errs.push('Password is required');
    } else if (form.password.length < 6) {
      errs.push('Password must be at least 6 characters');
    } else if (!/^(?=.*[0-9])(?=.*[!@#$%^&*])/.test(form.password)) {
      errs.push('Password must contain at least 1 number and 1 special character');
    }
    
    // Aadhar validation - must be exactly 12 digits
    if (!form.aadharNumber || form.aadharNumber.trim().length === 0) {
      errs.push('Aadhar number is required');
    } else if (!/^[0-9]{12}$/.test(form.aadharNumber)) {
      errs.push('Aadhar number must be exactly 12 digits');
    }
    
    // Driving licence validation
    if (!form.drivingLicenceNumber || form.drivingLicenceNumber.trim().length === 0) {
      errs.push('Driving licence number is required');
    }
    
    // Image validations - all are mandatory
    if (!images.aadharImage || !images.aadharImage.uri) {
      errs.push('Aadhar image is required');
    }
    if (!images.licenceFrontImage || !images.licenceFrontImage.uri) {
      errs.push('Driving licence front image is required');
    }
    if (!images.licenceBackImage || !images.licenceBackImage.uri) {
      errs.push('Driving licence back image is required');
    }

    if (errs.length) {
      dispatch(showError(errs.join('\n')));
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Authentication required'));
        return;
      }

      const fd: any = new FormData();
      // Append fields expected by backend
      fd.append('firstName', form.firstName);
      fd.append('lastName', form.lastName);
      fd.append('mobile', form.mobile);
      fd.append('email', form.email);
      fd.append('password', form.password);
      fd.append('aadharNumber', form.aadharNumber);
      fd.append('drivingLicenceNumber', form.drivingLicenceNumber);

      // Append files if present
      if (images.aadharImage && images.aadharImage.uri) {
        fd.append('aadharImage', {
          uri: images.aadharImage.uri,
          name: images.aadharImage.fileName || `aadhar_${Date.now()}.jpg`,
          type: images.aadharImage.type || 'image/jpeg',
        } as any);
      }
      if (images.licenceFrontImage && images.licenceFrontImage.uri) {
        fd.append('licenceFrontImage', {
          uri: images.licenceFrontImage.uri,
          name: images.licenceFrontImage.fileName || `licence_front_${Date.now()}.jpg`,
          type: images.licenceFrontImage.type || 'image/jpeg',
        } as any);
      }
      if (images.licenceBackImage && images.licenceBackImage.uri) {
        fd.append('licenceBackImage', {
          uri: images.licenceBackImage.uri,
          name: images.licenceBackImage.fileName || `licence_back_${Date.now()}.jpg`,
          type: images.licenceBackImage.type || 'image/jpeg',
        } as any);
      }

      const res: any = await UploadFiles('ambulance/addDriver', fd, token);
      
      // Only navigate back on successful response
      if (res?.status === 'success') {
        dispatch(showSuccess(res.message || 'Driver added successfully'));
        
        // Navigate back to drivers list
        navigation.goBack();
      } else {
        // Show error but keep on same screen with data intact
        dispatch(showError(res?.message || 'Failed to add driver'));
      }
    } catch (err) {
      // console.error('addDriver error', err);
      // Show error but keep on same screen with data intact
      dispatch(showError('Failed to add driver. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Request permissions on Android
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const perms: string[] = [PermissionsAndroid.PERMISSIONS.CAMERA];
        const sdkInt = Platform.Version as number;
        if (sdkInt >= 33) {
          // @ts-ignore
          perms.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        } else {
          perms.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
          perms.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        }
        const res = await PermissionsAndroid.requestMultiple(perms as any);
        for (const p of perms) {
          if (res[p as keyof typeof res] !== PermissionsAndroid.RESULTS.GRANTED) return false;
        }
        return true;
      } catch {
        return false;
      }
    }
    return true;
  };

  const pickImage = async (key: 'aadharImage' | 'licenceFrontImage' | 'licenceBackImage', useCamera = false) => {
    const ok = await requestPermissions();
    if (!ok) {
      dispatch(showError('Permissions required to pick images'));
      return;
    }

    const options: any = { mediaType: 'photo', includeBase64: false, quality: 0.8 };
    const cb = (response: any) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        dispatch(showError(response.errorMessage || 'Failed to pick image'));
        return;
      }
      if (response.assets && response.assets[0]) {
        const a = response.assets[0];
        setImages((s) => ({ ...s, [key]: { uri: a.uri, fileName: a.fileName, type: a.type } }));
        dispatch(showSuccess('Image selected'));
      }
    };

    if (useCamera) launchCamera(options, cb); else launchImageLibrary(options, cb);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Personal Information</Text>
          <TextInput 
            placeholder="First name *" 
            value={form.firstName} 
            onChangeText={(v) => handleChange('firstName', v)} 
            style={styles.input} 
            placeholderTextColor="#999" 
          />
          <TextInput 
            placeholder="Last name *" 
            value={form.lastName} 
            onChangeText={(v) => handleChange('lastName', v)} 
            style={styles.input} 
            placeholderTextColor="#999" 
          />
          <TextInput 
            placeholder="Mobile (10 digits) *" 
            value={form.mobile} 
            onChangeText={(v) => handleChange('mobile', v)} 
            keyboardType="number-pad" 
            maxLength={10}
            style={styles.input} 
            placeholderTextColor="#999" 
          />
          <TextInput 
            placeholder="Email *" 
            value={form.email} 
            onChangeText={(v) => handleChange('email', v)} 
            keyboardType="email-address" 
            autoCapitalize="none"
            style={styles.input} 
            placeholderTextColor="#999" 
          />
          
          <View style={styles.passwordContainer}>
            <TextInput 
              placeholder="Password (min 6 chars, 1 number, 1 special) *" 
              value={form.password} 
              onChangeText={(v) => handleChange('password', v)} 
              secureTextEntry={!showPassword}
              style={styles.passwordInput} 
              placeholderTextColor="#999" 
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Documents</Text>
          <TextInput 
            placeholder="Aadhar Number (12 digits) *" 
            value={form.aadharNumber} 
            onChangeText={(v) => handleChange('aadharNumber', v)} 
            keyboardType="number-pad" 
            maxLength={12}
            style={styles.input} 
            placeholderTextColor="#999" 
          />
          <TextInput 
            placeholder="Driving Licence Number *" 
            value={form.drivingLicenceNumber} 
            onChangeText={(v) => handleChange('drivingLicenceNumber', v)} 
            style={styles.input} 
            placeholderTextColor="#999" 
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Upload Documents</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Aadhar Image *</Text>
            <View style={styles.uploadContainer}>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('aadharImage', true)}>
                <Text style={styles.uploadButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.uploadButton, styles.uploadButtonLast]} onPress={() => pickImage('aadharImage', false)}>
                <Text style={styles.uploadButtonText}>📁 Choose File</Text>
              </TouchableOpacity>
            </View>
            {images.aadharImage?.uri && (
              <Text style={styles.selectedFileText} numberOfLines={1} ellipsizeMode="middle">
                ✓ {images.aadharImage?.fileName || 'Image selected'}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Driving Licence Front *</Text>
            <View style={styles.uploadContainer}>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('licenceFrontImage', true)}>
                <Text style={styles.uploadButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.uploadButton, styles.uploadButtonLast]} onPress={() => pickImage('licenceFrontImage', false)}>
                <Text style={styles.uploadButtonText}>📁 Choose File</Text>
              </TouchableOpacity>
            </View>
            {images.licenceFrontImage?.uri && (
              <Text style={styles.selectedFileText} numberOfLines={1} ellipsizeMode="middle">
                ✓ {images.licenceFrontImage?.fileName || 'Image selected'}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Driving Licence Back *</Text>
            <View style={styles.uploadContainer}>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('licenceBackImage', true)}>
                <Text style={styles.uploadButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.uploadButton, styles.uploadButtonLast]} onPress={() => pickImage('licenceBackImage', false)}>
                <Text style={styles.uploadButtonText}>📁 Choose File</Text>
              </TouchableOpacity>
            </View>
            {images.licenceBackImage?.uri && (
              <Text style={styles.selectedFileText} numberOfLines={1} ellipsizeMode="middle">
                ✓ {images.licenceBackImage?.fileName || 'Image selected'}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
          onPress={handleAddDriver} 
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>Add Driver</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 10, 
    padding: 14, 
    marginBottom: 16, 
    backgroundColor: '#fff',
    color: '#1f2937',
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: '#1f2937',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 20,
  },
  formGroup: { 
    marginBottom: 20,
  },
  label: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 10,
  },
  uploadContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  uploadButtonLast: {
    marginRight: 0,
  },
  uploadButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#14b8a6',
  },
  selectedFileText: { 
    marginTop: 10, 
    fontSize: 13, 
    color: '#059669',
    fontWeight: '500',
  },
  footer: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelButton: { 
    flex: 1,
    padding: 16, 
    borderRadius: 10,
    alignItems: 'center', 
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 12,
  },
  cancelText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: { 
    flex: 1,
    padding: 16, 
    borderRadius: 10,
    alignItems: 'center', 
    backgroundColor: '#14b8a6',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AddDriver;
