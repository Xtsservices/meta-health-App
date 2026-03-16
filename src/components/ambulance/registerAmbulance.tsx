import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { UsePost } from '../../auth/auth';
import { showError, showSuccess } from '../../store/toast.slice';

// Responsive helper
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface FormData {
  vehicleNumber: {
    value: string;
    valid: boolean;
    message: string;
  };
  ambulanceName: {
    value: string;
    valid: boolean;
    message: string;
  };
  firstName: {
    value: string;
    valid: boolean;
    message: string;
  };
  lastName: {
    value: string;
    valid: boolean;
    message: string;
  };
  ownerPhoneNumber: {
    value: string;
    valid: boolean;
    message: string;
  };
  email: {
    value: string;
    valid: boolean;
    message: string;
  };
}

const RegisterAmbulance: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const scrollRef = useRef<ScrollView>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    vehicleNumber: {
      value: '',
      valid: true,
      message: '',
    },
    ambulanceName: {
      value: '',
      valid: true,
      message: '',
    },
    firstName: {
      value: '',
      valid: true,
      message: '',
    },
    lastName: {
      value: '',
      valid: true,
      message: '',
    },
    ownerPhoneNumber: {
      value: '',
      valid: true,
      message: '',
    },
    email: {
      value: '',
      valid: true,
      message: '',
    },
  });

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const kbH = e?.endCoordinates?.height ?? 0;
        setKeyboardHeight(kbH);
        setKeyboardOpen(true);

        // Let layout settle, then scroll to reveal the bottom (submit button)
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
          }, 50);
        });
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardOpen(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Validation functions
  const validateVehicleNumber = (text: string): boolean => {
    // Vehicle number validation - typically alphanumeric
    const vehicleRegex = /^[A-Z]{2}[A-Z0-9]{2}[A-Z]{2}\d{4}$/i;
    return text === '' || vehicleRegex.test(text) || text.length >= 3;
  };

  const validateOwnerName = (text: string): boolean => {
    // Name validation - alphabetic characters and spaces
    const nameRegex = /^[a-zA-Z\s]*$/;
    return text === '' || nameRegex.test(text);
  };

  const validatePhoneNumber = (text: string): boolean => {
    // Phone number validation - only numbers, exactly 10 digits when filled
    // Allow empty or exactly 10 digits, no special characters
    if (text === '') return true;
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(text);
  };

  const isFormValid =
    formData.vehicleNumber.value.trim() !== '' &&
    formData.ambulanceName.value.trim() !== '' &&
    formData.firstName.value.trim() !== '' &&
    formData.lastName.value.trim() !== '' &&
    formData.ownerPhoneNumber.value.trim() !== '' &&
    formData.email.value.trim() !== '' &&
    formData.vehicleNumber.valid &&
    formData.ambulanceName.valid &&
    formData.firstName.valid &&
    formData.lastName.valid &&
    formData.ownerPhoneNumber.valid &&
    formData.email.valid &&
    formData.ownerPhoneNumber.value.length === 10;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const body = {
        ambulanceNumber: formData.vehicleNumber.value,
        ambulanceName: formData.ambulanceName.value,
        firstName: formData.firstName.value,
        lastName: formData.lastName.value,
        phoneNo: formData.ownerPhoneNumber.value,
        email: formData.email.value,
      };

      const response = await UsePost('ambulance/registerAmbulance', body);

      if (response?.status === 'success') {
        dispatch(showSuccess('Ambulance registered successfully!'));
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        dispatch(
          showError('Registration failed. Please try again.')
        );
      }
    } catch (error: any) {
      dispatch(showError(error?.response?.data?.message || 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (keyboardOpen ? keyboardHeight : 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.rightSection}>
          <View style={styles.formContainer}>
            {/* Header */}
            <View style={styles.headerSection}>
              <Text style={styles.title}>Register Ambulance</Text>
              <Text style={styles.subtitle}>
                Please fill in all the required fields
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Vehicle Number Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Vehicle Number *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    !formData.vehicleNumber.valid && styles.formInputError,
                  ]}
                  placeholder="e.g., MH02AB1234"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  value={formData.vehicleNumber.value}
                  onChangeText={(text) => {
                    const isValid = validateVehicleNumber(text);
                    setFormData((prevValue) => ({
                      ...prevValue,
                      vehicleNumber: {
                        value: text,
                        valid: isValid,
                        message: isValid ? '' : 'Invalid vehicle number format',
                      },
                    }));
                  }}
                />
                {!formData.vehicleNumber.valid && (
                  <Text style={styles.errorMessage}>
                    {formData.vehicleNumber.message}
                  </Text>
                )}
              </View>

              {/* Ambulance Name Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ambulance Name *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    !formData.ambulanceName.valid && styles.formInputError,
                  ]}
                  placeholder="Enter ambulance name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  value={formData.ambulanceName.value}
                  onChangeText={(text) => {
                    const isValid = validateOwnerName(text);
                    setFormData((prevValue) => ({
                      ...prevValue,
                      ambulanceName: {
                        value: text,
                        valid: isValid,
                        message: isValid
                          ? ''
                          : 'Only alphabetic characters allowed',
                      },
                    }));
                  }}
                />
                {!formData.ambulanceName.valid && (
                  <Text style={styles.errorMessage}>
                    {formData.ambulanceName.message}
                  </Text>
                )}
              </View>

              {/* Owner First Name Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    !formData.firstName.valid && styles.formInputError,
                  ]}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  value={formData.firstName.value}
                  onChangeText={(text) => {
                    const isValid = validateOwnerName(text);
                    setFormData((prevValue) => ({
                      ...prevValue,
                      firstName: {
                        value: text,
                        valid: isValid,
                        message: isValid
                          ? ''
                          : 'Only alphabetic characters allowed',
                      },
                    }));
                  }}
                />
                {!formData.firstName.valid && (
                  <Text style={styles.errorMessage}>
                    {formData.firstName.message}
                  </Text>
                )}
              </View>

              {/* Owner Last Name Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    !formData.lastName.valid && styles.formInputError,
                  ]}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  value={formData.lastName.value}
                  onChangeText={(text) => {
                    const isValid = validateOwnerName(text);
                    setFormData((prevValue) => ({
                      ...prevValue,
                      lastName: {
                        value: text,
                        valid: isValid,
                        message: isValid
                          ? ''
                          : 'Only alphabetic characters allowed',
                      },
                    }));
                  }}
                />
                {!formData.lastName.valid && (
                  <Text style={styles.errorMessage}>
                    {formData.lastName.message}
                  </Text>
                )}
              </View>

              {/* Owner Phone Number Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Owner Phone Number *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    !formData.ownerPhoneNumber.valid && styles.formInputError,
                  ]}
                  placeholder="10-digit phone number"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={10}
                  value={formData.ownerPhoneNumber.value}
                  onChangeText={(text) => {
                    // Only allow numbers
                    const numericOnly = text.replace(/[^0-9]/g, '');
                    const isValid = validatePhoneNumber(numericOnly);
                    setFormData((prevValue) => ({
                      ...prevValue,
                      ownerPhoneNumber: {
                        value: numericOnly,
                        valid: isValid,
                        message: isValid
                          ? ''
                          : numericOnly.length === 0 ? 'Phone number is required' : 'Phone number must be exactly 10 digits',
                      },
                    }));
                  }}
                />
                {!formData.ownerPhoneNumber.valid && (
                  <Text style={styles.errorMessage}>
                    {formData.ownerPhoneNumber.message}
                  </Text>
                )}
              </View>

              {/* Email Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    !formData.email.valid && styles.formInputError,
                  ]}
                  placeholder="Enter email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={formData.email.value}
                  onChangeText={(text) => {
                    const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    const isValid = text === '' ? true : emailRegex.test(text);
                    let errorMessage = '';
                    if (text !== '' && !isValid) {
                      if (!text.includes('@')) {
                        errorMessage = 'Email must contain @ symbol';
                      } else if (!text.includes('.')) {
                        errorMessage = 'Email must contain a domain (e.g., gmail.com)';
                      } else {
                        const parts = text.split('.');
                        const tld = parts[parts.length - 1];
                        if (tld.length < 2) {
                          errorMessage = 'Domain extension must be at least 2 characters (e.g., .com)';
                        } else {
                          errorMessage = 'Please enter a valid email address';
                        }
                      }
                    }
                    setFormData((prevValue) => ({
                      ...prevValue,
                      email: {
                        value: text,
                        valid: isValid,
                        message: errorMessage,
                      },
                    }));
                  }}
                />
                {!formData.email.valid && formData.email.message && (
                  <Text style={styles.errorMessage}>
                    {formData.email.message}
                  </Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Register Ambulance</Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                All fields marked with * are mandatory
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#14b8a6',
    height: '100%',
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: height,
    backgroundColor: '#14b8a6',
    flexDirection: 'column',
  },
  rightSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 24 : 32,
    paddingHorizontal: isSmallDevice ? 16 : 32,
  },
  formContainer: {
    width: '100%',
    maxWidth: isSmallDevice ? width * 0.95 : 600,
    backgroundColor: '#ffffff',
    borderRadius: isSmallDevice ? 15 : 20,
    padding: isSmallDevice ? 20 : 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.1,
    shadowRadius: 50,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 209, 199, 0.2)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  form: {
    width: '100%',
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
  formInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  formInputError: {
    borderColor: '#FF0000',
    borderWidth: 2,
  },
  errorMessage: {
    fontSize: 12,
    color: '#FF0000',
    marginTop: 4,
    fontWeight: '500',
  },
  submitButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#14b8a6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#14b8a6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#a0e7e0',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelButton: {
    width: '100%',
    height: 50,
    borderColor: '#14b8a6',
    borderWidth: 1.5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#14b8a6',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  infoText: {
    fontSize: 12,
    color: '#14b8a6',
    fontWeight: '500',
  },
});

export default RegisterAmbulance;
