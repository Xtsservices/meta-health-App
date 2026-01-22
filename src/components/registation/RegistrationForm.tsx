import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import {
  Check,
  Mail,
  CheckCircle,
} from 'lucide-react-native';

// Local imports
import { AuthPost } from '../../auth/auth';
import { showSuccess, showError } from '../../store/toast.slice';
import { formatDate, formatTime, formatDateTime } from '../../utils/dateTime';

// Types
interface RegistrationFormProps {
  category: string;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
}

// Get dynamic dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;
const isLargeScreen = SCREEN_WIDTH > 768;

const RegistrationForm: React.FC<RegistrationFormProps> = ({ category }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  
  // State
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Refs
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Validation helpers
  const isAlpha = (val: string) => /^[A-Za-z ]+$/.test(val);
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\d{10}$/.test(phone);

  // Form field definitions - UPDATED WITH CORRECT FIELDS
  const getFields = (): FormField[] => {
    const commonFields = [
      { 
        name: 'email', 
        label: 'Email', 
        type: 'email', 
        placeholder: 'Enter email address', 
        required: true 
      },
      { 
        name: 'phoneNo', 
        label: 'Phone Number', 
        type: 'tel', 
        placeholder: 'Enter 10-digit phone number', 
        required: true 
      },
    ];

    switch (category?.toLowerCase()) {
      case 'hospital':
        return [
          { name: 'name', label: 'Hospital Name', type: 'text', placeholder: 'Enter hospital name', required: true },
          { name: 'parent', label: 'Parent/Group', type: 'text', placeholder: 'Enter parent/group name', required: true },
          { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Enter complete address', required: true },
          { name: 'country', label: 'Country', type: 'text', placeholder: 'Enter country', required: true },
          { name: 'state', label: 'State', type: 'text', placeholder: 'Enter state', required: true },
          { name: 'city', label: 'City', type: 'text', placeholder: 'Enter city', required: true },
          { name: 'district', label: 'District', type: 'text', placeholder: 'Enter district', required: true },
          { name: 'pinCode', label: 'Pin Code', type: 'text', placeholder: 'Enter pin code', required: true },
          { name: 'website', label: 'Website', type: 'text', placeholder: 'Enter website URL', required: true },
          { name: 'adminFirstName', label: 'Admin First Name', type: 'text', placeholder: 'Enter admin first name', required: true },
          { name: 'adminLastName', label: 'Admin Last Name', type: 'text', placeholder: 'Enter admin last name', required: true },
          { name: 'adminEmail', label: 'Admin Email', type: 'email', placeholder: 'Enter admin email address', required: true },
          { name: 'adminPhone', label: 'Admin Phone', type: 'tel', placeholder: 'Enter admin phone number', required: false },
          ...commonFields,
        ];

      case 'doctor':
        return [
          { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true },
          ...commonFields,
        ];

      case 'pharmacy':
        return [
          { name: 'name', label: 'Pharmacy Name', type: 'text', placeholder: 'Enter pharmacy name', required: true },
          { name: 'parent', label: 'Parent/Group', type: 'text', placeholder: 'Enter parent/group name', required: true },
          { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Enter complete address', required: true },
          { name: 'country', label: 'Country', type: 'text', placeholder: 'Enter country', required: true },
          { name: 'state', label: 'State', type: 'text', placeholder: 'Enter state', required: true },
          { name: 'city', label: 'City', type: 'text', placeholder: 'Enter city', required: true },
          { name: 'district', label: 'District', type: 'text', placeholder: 'Enter district', required: true },
          { name: 'pinCode', label: 'Pin Code', type: 'text', placeholder: 'Enter pin code', required: true },
          { name: 'website', label: 'Website', type: 'text', placeholder: 'Enter website URL', required: true },
          { name: 'userFirstName', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true },
          { name: 'userLastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true },
          ...commonFields,
        ];

      case 'lab':
        return [
          { name: 'name', label: 'Lab Name', type: 'text', placeholder: 'Enter lab name', required: true },
          { name: 'parent', label: 'Parent/Group', type: 'text', placeholder: 'Enter parent/group name', required: true }, // Added missing field
          { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Enter complete address', required: true },
          { name: 'country', label: 'Country', type: 'text', placeholder: 'Enter country', required: true },
          { name: 'state', label: 'State', type: 'text', placeholder: 'Enter state', required: true },
          { name: 'district', label: 'District', type: 'text', placeholder: 'Enter district', required: true },
          { name: 'city', label: 'City', type: 'text', placeholder: 'Enter city', required: true },
          { name: 'pinCode', label: 'Pin Code', type: 'text', placeholder: 'Enter pin code', required: true },
          { name: 'website', label: 'Website', type: 'text', placeholder: 'Enter website URL', required: true },
          { name: 'labEmail', label: 'Email', type: 'email', placeholder: 'Enter lab email', required: true }, // Specific label for lab
          { name: 'phoneNo', label: 'Phone', type: 'tel', placeholder: 'Enter 10-digit phone number', required: true }, // Specific label for lab
          { name: 'labFirstName', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true },
          { name: 'labLastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true },
        ];

      case 'blood bank':
        return [
          { name: 'bloodBankName', label: 'Blood Bank Name', type: 'text', placeholder: 'Enter blood bank name', required: true },
          { name: 'pointOfContact', label: 'Point of Contact', type: 'text', placeholder: 'Enter point of contact name', required: true },
          { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true },
          ...commonFields,
        ];

      default:
        return commonFields;
    }
  };

  // Effects
  useEffect(() => {
    const initializeData = async () => {
      try {
        await AsyncStorage.multiRemove(['user', 'token']);
        setFormData(prev => ({ ...prev, country: 'India' }));
      } catch (error) {
        dispatch(showError('Failed to initialize form'));
      }
    };
    initializeData();
  }, [dispatch]);

  useEffect(() => {
    // Scroll to top when form is loaded
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // Handlers
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    const categoryLower = category?.toLowerCase();
    
    // Auto-fill logic for different categories
    if (categoryLower === 'hospital') {
      if (field === 'email') {
        setFormData(prev => ({ ...prev, adminEmail: value }));
      }
      if (field === 'phoneNo') {
        setFormData(prev => ({ 
          ...prev, 
          adminPhone: value,
          phoneNo: value 
        }));
      }
    } else if (categoryLower === 'pharmacy') {
      if (field === 'email') {
        setFormData(prev => ({ 
          ...prev, 
          userEmail: value,
          email: value 
        }));
      }
    } else if (categoryLower === 'lab') {
      if (field === 'labEmail') {
        setFormData(prev => ({ 
          ...prev, 
          email: value,
          userEmail: value 
        }));
      }
      if (field === 'labFirstName') {
        setFormData(prev => ({ ...prev, userFirstName: value }));
      }
      if (field === 'labLastName') {
        setFormData(prev => ({ ...prev, userLastName: value }));
      }
    }
  };

  const validateForm = (): boolean => {
    if (!termsAccepted) {
      dispatch(showError('Please accept the Terms of Service and Privacy Policy'));
      return false;
    }

    const errors: Record<string, string> = {};
    const fields = getFields();

    fields.forEach(field => {
      const value = formData[field.name];
      
      if (field.required && !value) {
        errors[field.name] = `${field.label} is required`;
      } else if (value) {
        if (field.name === 'email' || field.name === 'adminEmail' || field.name === 'labEmail' || field.name === 'userEmail') {
          if (!validateEmail(value)) {
            errors[field.name] = 'Enter a valid email address';
          }
        } else if (field.name === 'phoneNo' || field.name === 'adminPhone') {
          if (!validatePhone(value)) {
            errors[field.name] = 'Enter a valid 10-digit phone number';
          } else if (!/^[6-9]/.test(value)) {
            errors[field.name] = 'Phone number must start with 6-9';
          }
        } else if (field.name === 'pinCode') {
          if (!/^\d{6}$/.test(value)) {
            errors[field.name] = 'Pin code must be 6 digits';
          }
        } else if (['name', 'parent', 'firstName', 'lastName', 'adminFirstName', 'adminLastName', 
                   'userFirstName', 'userLastName', 'labFirstName', 'labLastName', 
                   'bloodBankName', 'pointOfContact'].includes(field.name)) {
          if (!isAlpha(value.replace(/\s+/g, ' '))) {
            errors[field.name] = 'Only alphabets and spaces allowed';
          }
        } else if (field.name === 'website' && value) {
          if (!/^https?:\/\/.+\..+/.test(value)) {
            errors[field.name] = 'Enter a valid website URL';
          }
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitRegistration = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let endpoint = '';
      let payload: any = {};
      const categoryLower = category?.toLowerCase();

      switch (categoryLower) {
        case 'hospital':
          endpoint = 'hospital/register';
          payload = {
            name: formData.name,
            parent: formData.parent || '',
            address: formData.address,
            country: formData.country || 'India',
            state: formData.state,
            district: formData.district,
            city: formData.city,
            pinCode: formData.pinCode,
            email: formData.email,
            phoneNo: formData.phoneNo,
            website: formData.website || '',
            adminName: `${formData.adminFirstName || ''} ${formData.adminLastName || ''}`.trim(),
            adminEmail: formData.adminEmail || formData.email,
            adminPhone: formData.adminPhone || formData.phoneNo,
            registrationDate: formatDate(new Date()),
          };
          break;

        case 'doctor':
          endpoint = 'doctor-registration/doctor-registration';
          payload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phoneNo: formData.phoneNo,
            registrationTime: formatDateTime(new Date()),
          };
          break;

        case 'pharmacy':
          endpoint = 'pharmacy/register';
          payload = {
            name: formData.name,
            parent: formData.parent || '',
            address: formData.address,
            country: formData.country || 'India',
            state: formData.state,
            district: formData.district,
            city: formData.city,
            pinCode: formData.pinCode,
            email: formData.email,
            phoneNo: formData.phoneNo,
            website: formData.website || '',
            userEmail: formData.userEmail || formData.email,
            userFirstName: formData.userFirstName,
            userLastName: formData.userLastName,
            registeredAt: formatDateTime(new Date()),
          };
          break;

        case 'lab':
          endpoint = 'diagnostic/register';
          payload = {
            name: formData.name,
            parent: formData.parent || '', // Added parent field
            address: formData.address,
            country: formData.country || 'India',
            state: formData.state,
            district: formData.district,
            city: formData.city,
            pinCode: formData.pinCode,
            email: formData.labEmail || formData.email, // Use labEmail if available
            phoneNo: formData.phoneNo,
            website: formData.website || '',
            userEmail: formData.labEmail || formData.email || formData.userEmail,
            userFirstName: formData.labFirstName || formData.userFirstName,
            userLastName: formData.labLastName || formData.userLastName,
            registrationTimestamp: formatDateTime(new Date()),
          };
          break;

        case 'blood bank':
          endpoint = 'bloodBank/signupBloodBank';
          payload = {
            bloodBankName: formData.bloodBankName || formData.name,
            email: formData.email,
            phoneNo: formData.phoneNo,
            pointOfContact: formData.pointOfContact,
            firstName: formData.firstName,
            lastName: formData.lastName,
            registrationDate: formatDate(new Date()),
          };
          break;

        default:
          endpoint = 'user/register';
          payload = { ...formData, registeredAt: formatDateTime(new Date()) };
      }

      const response = await AuthPost(endpoint, payload, null) as any ;

      if (response?.status === 'error') {
        dispatch(showError(response.message || 'Registration failed'));
        return;
      }

      if (response?.data?.message?.toLowerCase().includes('already exists')) {
        dispatch(showError(response.data.message));
        return;
      }

      if (response?.data?.otpRequired || response?.data?.message?.toLowerCase().includes('otp')) {
        dispatch(showSuccess(response.data.message || 'Registration successful! Please verify your OTP'));
        setShowOtpModal(true);
      } else if (categoryLower === 'blood bank') {
        dispatch(showSuccess(
          response?.data?.message || 'Blood Bank registered successfully! Login password sent to email.'
        ));
        setShowSuccessScreen(true);
      } else {
        dispatch(showSuccess(response?.data?.message || 'Registration successful!'));
        setShowOtpModal(true);
      }
    } catch (error: any) {
      dispatch(showError(error.message || 'An error occurred during registration'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5 && otpInputRefs.current?.[index + 1]) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0 && otpInputRefs.current?.[index - 1]) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      dispatch(showError('Please enter all 6 digits'));
      return;
    }

    setIsSubmitting(true);

    try {
      let verifyEndpoint = 'user/verify-otp';
      const categoryLower = category?.toLowerCase();

      if (categoryLower === 'hospital') {
        verifyEndpoint = 'hospital/verify-otp';
      } else if (categoryLower === 'diagnostic' || categoryLower === 'lab') {
        verifyEndpoint = 'diagnostic/verify-otp';
      } else if (categoryLower === 'pharmacy') {
        verifyEndpoint = 'pharmacy/verify-otp';
      } else if (categoryLower === 'doctor') {
        verifyEndpoint = 'doctor-registration/verify-otp';
      }

      const email = formData.email || formData.adminEmail || formData.userEmail || formData.labEmail;
      
      const response = await AuthPost(verifyEndpoint, {
        email: email,
        otp: otpValue
      }, null) as any ;

      if (response?.status === 'error') {
        dispatch(showError(response.message || 'OTP verification failed'));
        return;
      }

      if (response?.data?.autoLogin && response?.data?.loginData) {
        const loginData = response.data.loginData;
        
        await AsyncStorage.setItem('user', JSON.stringify({
          ...loginData,
          isLoggedIn: true
        }));

        dispatch(showSuccess(response.data.message || 'Account verified successfully!'));

        if (categoryLower === 'hospital') {
          const hospitalId = loginData.hospitalID || loginData.hospitalId;
          const hospitalStatus = response.data.hospital?.status || loginData.hospitalDetails?.status;
          
          if (hospitalStatus === 'pending') {
            navigation.navigate('HospitalProfileForm', { hospitalId });
          } 
        } else if (categoryLower === 'diagnostic' || categoryLower === 'lab') {
          const diagnosticId = loginData.organizationAssociations?.[0]?.organizationId || loginData.diagnosticID;
          const diagnosticStatus = response.data.diagnostic?.status || loginData.organizationAssociations?.[0]?.organizationDetails?.status;
          
          if (diagnosticStatus === 'pending') {
            navigation.navigate('DiagnosticProfileForm', { diagnosticId });
          }
        } else if (categoryLower === 'pharmacy') {
          const pharmacyId = loginData.organizationAssociations?.[0]?.organizationId || loginData.pharmacyID;
          const pharmacyStatus = response.data.pharmacy?.status || loginData.organizationAssociations?.[0]?.organizationDetails?.status;
          
          if (pharmacyStatus === 'pending') {
            navigation.navigate('PharmacyProfileForm', { pharmacyId });
          } else {
            navigation.navigate('PharmacyDashboard');
          }
        } else {
          setShowSuccessScreen(true);
        }
      } else {
        setShowSuccessScreen(true);
      }
    } catch (error: any) {
      dispatch(showError(error.message || 'Failed to verify OTP'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResendingOtp(true);

    try {
      let resendEndpoint = 'user/resend-otp';
      const categoryLower = category?.toLowerCase();

      if (categoryLower === 'hospital') {
        resendEndpoint = 'hospital/resend-otp';
      } else if (categoryLower === 'diagnostic' || categoryLower === 'lab') {
        resendEndpoint = 'diagnostic/resend-otp';
      } else if (categoryLower === 'pharmacy') {
        resendEndpoint = 'pharmacy/resend-otp';
      } else if (categoryLower === 'doctor') {
        resendEndpoint = 'doctor-registration/resend-otp';
      }

      const email = formData.email || formData.adminEmail || formData.userEmail || formData.labEmail;
      
      const response = await AuthPost(resendEndpoint, { email }, null) as any;

      if (response?.status === 'error') {
        dispatch(showError(response.message || 'Failed to resend OTP'));
        return;
      }

      dispatch(showSuccess('OTP resent successfully! Check your email'));
      setOtp(['', '', '', '', '', '']);
    } catch (error: any) {
      dispatch(showError(error.message || 'Failed to resend OTP'));
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleLoginRedirect = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'token']);
      navigation.navigate('Login');
    } catch (error) {
      dispatch(showError('Failed to redirect to login'));
    }
  };

  const setOtpRef = (index: number) => (ref: TextInput | null) => {
    otpInputRefs.current[index] = ref;
  };

  // Success Screen
  if (showSuccessScreen) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <CheckCircle size={SCREEN_WIDTH * 0.15} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Account Verified!</Text>
            <Text style={styles.successMessage}>
              Your account is verified and ready to login. Thank you for registering with MetaHealth!
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLoginRedirect}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Go to Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const fields = getFields();

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
          <View style={styles.formContainer}>

            {fields.map((field) => (
              <View key={field.name} style={styles.inputContainer}>
                <Text style={styles.label}>
                  {field.label} {field.required && <Text style={styles.required}>*</Text>}
                </Text>

                {field.type === 'textarea' ? (
                  <TextInput
                    style={[styles.textArea, formErrors[field.name] && styles.inputError]}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={formData[field.name] || ''}
                    onChangeText={(value) => handleInputChange(field.name, value)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                ) : (
                  <TextInput
                    style={[styles.input, formErrors[field.name] && styles.inputError]}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={formData[field.name] || ''}
                    onChangeText={(value) => handleInputChange(field.name, value)}
                    keyboardType={
                      field.type === 'email' ? 'email-address' :
                      field.type === 'tel' ? 'phone-pad' :
                      'default'
                    }
                    maxLength={
                      field.name === 'phoneNo' || field.name === 'adminPhone' ? 10 :
                      field.name === 'pinCode' ? 6 :
                      undefined
                    }
                    editable={!isSubmitting}
                    returnKeyType="next"
                    blurOnSubmit={field.name === fields[fields.length - 1]?.name}
                  />
                )}

                {formErrors[field.name] ? (
                  <Text style={styles.errorText}>{formErrors[field.name]}</Text>
                ) : null}
              </View>
            ))}

            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
                onPress={() => setTermsAccepted(!termsAccepted)}
                disabled={isSubmitting}
              >
                {termsAccepted ? (
                  <Check size={SCREEN_WIDTH * 0.04} color="#FFFFFF" />
                ) : null}
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                I agree to MetaHealth's Terms of Service and Privacy Policy. 
                I confirm that all information provided is accurate.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (isSubmitting || !termsAccepted) && styles.submitButtonDisabled]}
              onPress={submitRegistration}
              disabled={isSubmitting || !termsAccepted}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Validate & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* OTP Modal */}
        <Modal
          visible={showOtpModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowOtpModal(false)}
          statusBarTranslucent={true}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <KeyboardAvoidingView
              style={styles.modalKeyboardAvoidingView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.otpHeader}>
                    <View style={styles.otpIcon}>
                      <Mail size={SCREEN_WIDTH * 0.1} color="#03989e" />
                    </View>
                    <Text style={styles.otpTitle}>Enter OTP</Text>
                    <Text style={styles.otpSubtitle}>
                      We've sent a 6-digit verification code to your email
                    </Text>
                  </View>

                  <View style={styles.otpInputsContainer}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={setOtpRef(index)}
                        style={styles.otpInput}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        value={digit}
                        onChangeText={(value) => handleOtpChange(index, value)}
                        onKeyPress={({ nativeEvent: { key } }) => handleOtpKeyPress(index, key)}
                        keyboardType="numeric"
                        maxLength={1}
                        textAlign="center"
                        editable={!isSubmitting}
                        autoFocus={index === 0}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.verifyButton, isSubmitting && styles.verifyButtonDisabled]}
                    onPress={handleOtpSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify & Submit</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowOtpModal(false)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.backButtonText}>Back to Form</Text>
                  </TouchableOpacity>

                  <Text style={styles.resendText}>
                    Didn't receive code?{' '}
                    <Text
                      style={[styles.resendLink, isResendingOtp && styles.resendLinkDisabled]}
                      onPress={isResendingOtp ? undefined : handleResendOtp}
                    >
                      {isResendingOtp ? 'Resending...' : 'Resend OTP'}
                    </Text>
                  </Text>
                </View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Responsive Styles
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
    paddingBottom: Platform.OS === 'ios' ? SCREEN_HEIGHT * 0.05 : SCREEN_HEIGHT * 0.03,
  },
  formContainer: {
    padding: SCREEN_WIDTH * 0.05,
    paddingTop: SCREEN_HEIGHT * 0.03,
    minHeight: SCREEN_HEIGHT * 0.9,
  },
  inputContainer: {
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  label: {
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.035 : SCREEN_WIDTH * 0.04,
    fontWeight: '500',
    color: '#374151',
    marginBottom: SCREEN_HEIGHT * 0.005,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    paddingVertical: SCREEN_HEIGHT * 0.015,
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.04 : SCREEN_WIDTH * 0.045,
    color: '#111827',
    minHeight: SCREEN_HEIGHT * 0.06,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    paddingVertical: SCREEN_HEIGHT * 0.015,
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.04 : SCREEN_WIDTH * 0.045,
    color: '#111827',
    minHeight: SCREEN_HEIGHT * 0.12,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: SCREEN_WIDTH * 0.03,
    marginTop: SCREEN_HEIGHT * 0.005,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SCREEN_HEIGHT * 0.025,
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  checkbox: {
    width: SCREEN_WIDTH * 0.06,
    height: SCREEN_WIDTH * 0.06,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: SCREEN_WIDTH * 0.03,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: SCREEN_HEIGHT * 0.002,
  },
  checkboxChecked: {
    backgroundColor: '#03989e',
    borderColor: '#03989e',
  },
  checkboxText: {
    flex: 1,
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.032 : SCREEN_WIDTH * 0.035,
    color: '#374151',
    lineHeight: SCREEN_HEIGHT * 0.025,
  },
  submitButton: {
    backgroundColor: '#03989e',
    borderRadius: 8,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.04 : SCREEN_WIDTH * 0.045,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  successContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SCREEN_WIDTH * 0.06,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  successIcon: {
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    backgroundColor: '#D1FAE5',
    borderRadius: SCREEN_WIDTH * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  successTitle: {
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.06 : SCREEN_WIDTH * 0.065,
    fontWeight: '700',
    color: '#111827',
    marginBottom: SCREEN_HEIGHT * 0.015,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.035 : SCREEN_WIDTH * 0.04,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: SCREEN_HEIGHT * 0.04,
    lineHeight: SCREEN_HEIGHT * 0.025,
  },
  loginButton: {
    backgroundColor: '#03989e',
    borderRadius: 8,
    paddingHorizontal: SCREEN_WIDTH * 0.08,
    paddingVertical: SCREEN_HEIGHT * 0.018,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.04 : SCREEN_WIDTH * 0.045,
    fontWeight: '600',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalKeyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SCREEN_WIDTH * 0.06,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.04,
  },
  otpIcon: {
    width: SCREEN_WIDTH * 0.16,
    height: SCREEN_WIDTH * 0.16,
    backgroundColor: '#E0F2FE',
    borderRadius: SCREEN_WIDTH * 0.08,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  otpTitle: {
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.06 : SCREEN_WIDTH * 0.065,
    fontWeight: '700',
    color: '#111827',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  otpSubtitle: {
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.035 : SCREEN_WIDTH * 0.04,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: SCREEN_HEIGHT * 0.022,
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SCREEN_HEIGHT * 0.04,
  },
  otpInput: {
    width: SCREEN_WIDTH * 0.12,
    height: SCREEN_WIDTH * 0.12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.05 : SCREEN_WIDTH * 0.06,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  verifyButton: {
    backgroundColor: '#03989e',
    borderRadius: 8,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.04 : SCREEN_WIDTH * 0.045,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  backButtonText: {
    color: '#374151',
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.04 : SCREEN_WIDTH * 0.045,
    fontWeight: '500',
  },
  resendText: {
    fontSize: isSmallScreen ? SCREEN_WIDTH * 0.035 : SCREEN_WIDTH * 0.04,
    color: '#6B7280',
    textAlign: 'center',
  },
  resendLink: {
    color: '#03989e',
    fontWeight: '500',
  },
  resendLinkDisabled: {
    color: '#9CA3AF',
  },
});

export default RegistrationForm;