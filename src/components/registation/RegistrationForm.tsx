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
  CheckCircle,
  ChevronDown,
} from 'lucide-react-native';

import { AuthPost } from '../../auth/auth';
import { showSuccess, showError } from '../../store/toast.slice';
import { formatDate, formatDateTime } from '../../utils/dateTime';

interface RegistrationFormProps {
  category: string;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

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

const RegistrationForm: React.FC<RegistrationFormProps> = ({ category }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Dropdown states
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  
  // Data states
  const [countries, setCountries] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(
          "https://countriesnow.space/api/v0.1/countries/positions"
        );
        const data = await res.json();
        const countryNames = data.data.map((item: any) => item.name);
        setCountries(countryNames);
      } catch (error) {
        console.log("Failed to fetch countries");
      }
    };
    fetchCountries();
  }, []);

  // Fetch states when country changes
  useEffect(() => {
    if (!formData.country) return;

    const fetchStates = async () => {
      try {
        const res = await fetch(
          "https://countriesnow.space/api/v0.1/countries/states",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country: formData.country }),
          }
        );
        const data = await res.json();
        const states = data.data.states.map((s: any) => s.name);
        setStateOptions(states);
        setCityOptions([]);
      } catch (error) {
        console.log("Failed to fetch states");
      }
    };
    fetchStates();
  }, [formData.country]);

  // Fetch cities when state changes
  useEffect(() => {
    if (!formData.country || !formData.state) return;

    const fetchCities = async () => {
      try {
        const res = await fetch(
          "https://countriesnow.space/api/v0.1/countries/state/cities",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              country: formData.country,
              state: formData.state,
            }),
          }
        );
        const data = await res.json();
        setCityOptions(data.data);
      } catch (error) {
        console.log("Failed to fetch cities");
      }
    };
    fetchCities();
  }, [formData.state]);

  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Enter a valid email address';
    return null;
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone) return 'Phone number is required';
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) return 'Enter a valid 10-digit phone number starting with 6-9';
    return null;
  };

  const validatePinCode = (pinCode: string): string | null => {
    if (!pinCode) return 'Pin code is required';
    const pinRegex = /^\d{6}$/;
    if (!pinRegex.test(pinCode)) return 'Pin code must be 6 digits';
    return null;
  };

  const validateWebsite = (website: string): string | null => {
    if (!website) return 'Website URL is required';
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (!urlRegex.test(website)) return 'Enter a valid website URL';
    return null;
  };

  const validateName = (name: string, fieldLabel: string): string | null => {
    if (!name) return `${fieldLabel} is required`;
    if (name.length < 2) return `${fieldLabel} must be at least 2 characters`;
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) return 'Only letters and spaces allowed';
    return null;
  };

  const validateOrgName = (name: string, fieldLabel: string): string | null => {
    if (!name) return `${fieldLabel} is required`;
    if (name.length < 2) return `${fieldLabel} must be at least 2 characters`;
    const orgNameRegex = /^[A-Za-z0-9\s\-&.]+$/;
    if (!orgNameRegex.test(name)) return 'Only letters, numbers, spaces, hyphens, dots and & allowed';
    return null;
  };

  const validateAddress = (address: string): string | null => {
    if (!address) return 'Address is required';
    if (address.length < 10) return 'Address must be at least 10 characters';
    return null;
  };

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
          { name: 'country', label: 'Country', type: 'dropdown', placeholder: 'Select country', required: true },
          { name: 'state', label: 'State', type: 'dropdown', placeholder: 'Select state', required: true },
          { name: 'city', label: 'City', type: 'dropdown', placeholder: 'Select city', required: true },
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
          { name: 'country', label: 'Country', type: 'dropdown', placeholder: 'Select country', required: true },
          { name: 'state', label: 'State', type: 'dropdown', placeholder: 'Select state', required: true },
          { name: 'city', label: 'City', type: 'dropdown', placeholder: 'Select city', required: true },
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
          { name: 'parent', label: 'Parent/Group', type: 'text', placeholder: 'Enter parent/group name', required: true },
          { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Enter complete address', required: true },
          { name: 'country', label: 'Country', type: 'dropdown', placeholder: 'Select country', required: true },
          { name: 'state', label: 'State', type: 'dropdown', placeholder: 'Select state', required: true },
          { name: 'city', label: 'City', type: 'dropdown', placeholder: 'Select city', required: true },
          { name: 'district', label: 'District', type: 'text', placeholder: 'Enter district', required: true },
          { name: 'pinCode', label: 'Pin Code', type: 'text', placeholder: 'Enter pin code', required: true },
          { name: 'website', label: 'Website', type: 'text', placeholder: 'Enter website URL', required: true },
          { name: 'labEmail', label: 'Email', type: 'email', placeholder: 'Enter lab email', required: true },
          { name: 'phoneNo', label: 'Phone', type: 'tel', placeholder: 'Enter 10-digit phone number', required: true },
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
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'phoneNo' || field === 'adminPhone') {
      formattedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    
    if (field === 'pinCode') {
      formattedValue = value.replace(/\D/g, '').slice(0, 6);
    }
    
    const nameFields = ['name', 'firstName', 'lastName', 'adminFirstName', 'adminLastName', 
                       'userFirstName', 'userLastName', 'labFirstName', 'labLastName', 
                       'bloodBankName', 'pointOfContact', 'district'];
    
if (nameFields.includes(field)) {
  const categoryLower = category?.toLowerCase();

  let maxLength = 30;

  if (
    categoryLower === 'hospital' &&
    (field === 'adminFirstName' || field === 'adminLastName')
  ) {
    maxLength = 20;
  }

  formattedValue = value
    .replace(/[^A-Za-z\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maxLength);
}

    if (field.includes('email')) {
      formattedValue = value.replace(/[^a-zA-Z0-9@._-]/g, '');
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    const categoryLower = category?.toLowerCase();
    
    if (categoryLower === 'hospital') {
      if (field === 'email') {
        setFormData(prev => ({ ...prev, adminEmail: formattedValue }));
      }
      if (field === 'phoneNo') {
        setFormData(prev => ({ 
          ...prev, 
          adminPhone: formattedValue,
          phoneNo: formattedValue 
        }));
      }
    } else if (categoryLower === 'pharmacy') {
      if (field === 'email') {
        setFormData(prev => ({ 
          ...prev, 
          userEmail: formattedValue,
          email: formattedValue 
        }));
      }
    } else if (categoryLower === 'lab') {
      if (field === 'labEmail') {
        setFormData(prev => ({ 
          ...prev, 
          email: formattedValue,
          userEmail: formattedValue 
        }));
      }
      if (field === 'labFirstName') {
        setFormData(prev => ({ ...prev, userFirstName: formattedValue }));
      }
      if (field === 'labLastName') {
        setFormData(prev => ({ ...prev, userLastName: formattedValue }));
      }
    }
  };

  const renderDropdownField = (field: FormField) => {
    let options: string[] = [];
    let modalVisible = false;
    let setModalVisible: (visible: boolean) => void = () => {};
    let placeholder = field.placeholder || `Select ${field.label}`;

    if (field.name === 'country') {
      options = countries;
      modalVisible = showCountryPicker;
      setModalVisible = setShowCountryPicker;
    } else if (field.name === 'state') {
      options = stateOptions;
      modalVisible = showStatePicker;
      setModalVisible = setShowStatePicker;
      if (!formData.country) {
        placeholder = 'Select country first';
      }
    } else if (field.name === 'city') {
      options = cityOptions;
      modalVisible = showCityPicker;
      setModalVisible = setShowCityPicker;
      if (!formData.state) {
        placeholder = 'Select state first';
      }
    }

    return (
      <View key={field.name} style={styles.fieldContainer}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        
        <TouchableOpacity
          style={[styles.Select, formErrors[field.name] && styles.SelectError]}
          onPress={() => {
            if (field.name === 'state' && !formData.country) {
              dispatch(showError('Please select country first'));
              return;
            }
            if (field.name === 'city' && !formData.state) {
              dispatch(showError('Please select state first'));
              return;
            }
            setModalVisible(true);
          }}
          disabled={isSubmitting || 
            (field.name === 'state' && !formData.country) ||
            (field.name === 'city' && !formData.state)}
        >
          <Text style={[styles.SelectText, !formData[field.name] && { color: COLORS.placeholder }]}>
            {formData[field.name] || placeholder}
          </Text>
          <ChevronDown size={FONT_SIZE.md} color={COLORS.sub} />
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select {field.label}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.pickerModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.pickerOption}
                    onPress={() => {
                      handleInputChange(field.name, option);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {formErrors[field.name] ? (
          <Text style={styles.errorText}>{formErrors[field.name]}</Text>
        ) : null}
      </View>
    );
  };

  const validateForm = (): boolean => {
    if (!termsAccepted) {
      dispatch(showError('Please accept the Terms of Service and Privacy Policy'));
      return false;
    }

    const errors: Record<string, string> = {};
    const categoryLower = category?.toLowerCase();

    const email = formData.email;
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const phoneNo = formData.phoneNo;
    const phoneError = validatePhone(phoneNo);
    if (phoneError) errors.phoneNo = phoneError;

    if (categoryLower === 'hospital') {
      const nameError = validateOrgName(formData.name, 'Hospital name');
      if (nameError) errors.name = nameError;

      const parentError = validateOrgName(formData.parent, 'Parent/Group name');
      if (parentError) errors.parent = parentError;

      const addressError = validateAddress(formData.address);
      if (addressError) errors.address = addressError;

      if (!formData.country) errors.country = 'Country is required';
      
      if (!formData.state) errors.state = 'State is required';
      else {
        const stateError = validateName(formData.state, 'State');
        if (stateError) errors.state = stateError;
      }

      if (!formData.city) errors.city = 'City is required';
      else {
        const cityError = validateName(formData.city, 'City');
        if (cityError) errors.city = cityError;
      }

      const districtError = validateName(formData.district, 'District');
      if (districtError) errors.district = districtError;

      const pinCodeError = validatePinCode(formData.pinCode);
      if (pinCodeError) errors.pinCode = pinCodeError;

      const websiteError = validateWebsite(formData.website);
      if (websiteError) errors.website = websiteError;

      const adminFirstNameError = validateName(formData.adminFirstName, 'Admin first name');
      if (adminFirstNameError) errors.adminFirstName = adminFirstNameError;

      const adminLastNameError = validateName(formData.adminLastName, 'Admin last name');
      if (adminLastNameError) errors.adminLastName = adminLastNameError;

      const adminEmailError = validateEmail(formData.adminEmail);
      if (adminEmailError) errors.adminEmail = adminEmailError;

      if (formData.adminPhone) {
        const adminPhoneError = validatePhone(formData.adminPhone);
        if (adminPhoneError) errors.adminPhone = adminPhoneError;
      }
    }

    if (categoryLower === 'doctor') {
      const firstNameError = validateName(formData.firstName, 'First name');
      if (firstNameError) errors.firstName = firstNameError;

      const lastNameError = validateName(formData.lastName, 'Last name');
      if (lastNameError) errors.lastName = lastNameError;
    }

    if (categoryLower === 'pharmacy') {
      const nameError = validateOrgName(formData.name, 'Pharmacy name');
      if (nameError) errors.name = nameError;

      const parentError = validateOrgName(formData.parent, 'Parent/Group name');
      if (parentError) errors.parent = parentError;

      const addressError = validateAddress(formData.address);
      if (addressError) errors.address = addressError;

      if (!formData.country) errors.country = 'Country is required';
      
      if (!formData.state) errors.state = 'State is required';
      else {
        const stateError = validateName(formData.state, 'State');
        if (stateError) errors.state = stateError;
      }

      if (!formData.city) errors.city = 'City is required';
      else {
        const cityError = validateName(formData.city, 'City');
        if (cityError) errors.city = cityError;
      }

      const districtError = validateName(formData.district, 'District');
      if (districtError) errors.district = districtError;

      const pinCodeError = validatePinCode(formData.pinCode);
      if (pinCodeError) errors.pinCode = pinCodeError;

      const websiteError = validateWebsite(formData.website);
      if (websiteError) errors.website = websiteError;

      const userFirstNameError = validateName(formData.userFirstName, 'First name');
      if (userFirstNameError) errors.userFirstName = userFirstNameError;

      const userLastNameError = validateName(formData.userLastName, 'Last name');
      if (userLastNameError) errors.userLastName = userLastNameError;
    }

    if (categoryLower === 'lab') {
      const nameError = validateOrgName(formData.name, 'Lab name');
      if (nameError) errors.name = nameError;

      const parentError = validateOrgName(formData.parent, 'Parent/Group name');
      if (parentError) errors.parent = parentError;

      const addressError = validateAddress(formData.address);
      if (addressError) errors.address = addressError;

      if (!formData.country) errors.country = 'Country is required';
      
      if (!formData.state) errors.state = 'State is required';
      else {
        const stateError = validateName(formData.state, 'State');
        if (stateError) errors.state = stateError;
      }

      if (!formData.city) errors.city = 'City is required';
      else {
        const cityError = validateName(formData.city, 'City');
        if (cityError) errors.city = cityError;
      }

      const districtError = validateName(formData.district, 'District');
      if (districtError) errors.district = districtError;

      const pinCodeError = validatePinCode(formData.pinCode);
      if (pinCodeError) errors.pinCode = pinCodeError;

      const websiteError = validateWebsite(formData.website);
      if (websiteError) errors.website = websiteError;

      const labEmailError = validateEmail(formData.labEmail);
      if (labEmailError) errors.labEmail = labEmailError;

      const labFirstNameError = validateName(formData.labFirstName, 'First name');
      if (labFirstNameError) errors.labFirstName = labFirstNameError;

      const labLastNameError = validateName(formData.labLastName, 'Last name');
      if (labLastNameError) errors.labLastName = labLastNameError;
    }

    if (categoryLower === 'blood bank') {
      const bloodBankNameError = validateOrgName(formData.bloodBankName, 'Blood bank name');
      if (bloodBankNameError) errors.bloodBankName = bloodBankNameError;

      const pointOfContactError = validateName(formData.pointOfContact, 'Point of contact');
      if (pointOfContactError) errors.pointOfContact = pointOfContactError;

      const firstNameError = validateName(formData.firstName, 'First name');
      if (firstNameError) errors.firstName = firstNameError;

      const lastNameError = validateName(formData.lastName, 'Last name');
      if (lastNameError) errors.lastName = lastNameError;
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      dispatch(showError(firstError));
      return false;
    }

    return true;
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
            parent: formData.parent || '',
            address: formData.address,
            country: formData.country || 'India',
            state: formData.state,
            district: formData.district,
            city: formData.city,
            pinCode: formData.pinCode,
            email: formData.labEmail || formData.email,
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
          };
          break;

        default:
          endpoint = 'user/register';
          payload = { ...formData, registeredAt: formatDateTime(new Date()) };
      }

      const response = await AuthPost(endpoint, payload, null) as any;
      
      if (response?.status === 'error') {
        dispatch(showError(response.message || 'Registration failed'));
        return;
      }

      if (response?.data?.message?.toLowerCase().includes('already exists')) {
        dispatch(showError(response.data.message));
        return;
      }

      dispatch(showSuccess(response?.data?.message || 'Registration successful!'));
      setShowSuccessScreen(true);
    } catch (error: any) {
      dispatch(showError(error.message || 'An error occurred during registration'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleOtpChange = (index: number, value: string) => {
  //   if (value.length > 1) return;
  //   if (value && !/^\d$/.test(value)) return;

  //   const newOtp = [...otp];
  //   newOtp[index] = value;
  //   setOtp(newOtp);

  //   if (value && index < 5 && otpInputRefs.current?.[index + 1]) {
  //     otpInputRefs.current[index + 1]?.focus();
  //   }
  // };

  // const handleOtpKeyPress = (index: number, key: string) => {
  //   if (key === 'Backspace' && !otp[index] && index > 0 && otpInputRefs.current?.[index - 1]) {
  //     otpInputRefs.current[index - 1]?.focus();
  //   }
  // };

  // const handleOtpSubmit = async () => {
  //   const otpValue = otp.join('');
    
  //   if (otpValue.length !== 6) {
  //     dispatch(showError('Please enter all 6 digits'));
  //     return;
  //   }

  //   setIsSubmitting(true);

  //   try {
  //     let verifyEndpoint = 'user/verify-otp';
  //     const categoryLower = category?.toLowerCase();

  //     if (categoryLower === 'hospital') {
  //       verifyEndpoint = 'hospital/verify-otp';
  //     } else if (categoryLower === 'diagnostic' || categoryLower === 'lab') {
  //       verifyEndpoint = 'diagnostic/verify-otp';
  //     } else if (categoryLower === 'pharmacy') {
  //       verifyEndpoint = 'pharmacy/verify-otp';
  //     } else if (categoryLower === 'doctor') {
  //       verifyEndpoint = 'doctor-registration/verify-otp';
  //     }

  //     const email = formData.email || formData.adminEmail || formData.userEmail || formData.labEmail;
      
  //     const response = await AuthPost(verifyEndpoint, {
  //       email: email,
  //       otp: otpValue
  //     }, null) as any;

  //     if (response?.status === 'error') {
  //       dispatch(showError(response.message || 'OTP verification failed'));
  //       return;
  //     }

  //     if (response?.data?.autoLogin && response?.data?.loginData) {
  //       const loginData = response.data.loginData;
        
  //       await AsyncStorage.setItem('user', JSON.stringify({
  //         ...loginData,
  //         isLoggedIn: true
  //       }));

  //       dispatch(showSuccess(response.data.message || 'Account verified successfully!'));

  //       if (categoryLower === 'hospital') {
  //         const hospitalId = loginData.hospitalID || loginData.hospitalId;
  //         const hospitalStatus = response.data.hospital?.status || loginData.hospitalDetails?.status;
          
  //         if (hospitalStatus === 'pending') {
  //           navigation.navigate('HospitalProfileForm', { hospitalId });
  //         }
  //         setShowOtpModal(false);
  //         return;
  //       } 
        
  //       if (categoryLower === 'diagnostic' || categoryLower === 'lab') {
  //         const diagnosticId = loginData.organizationAssociations?.[0]?.organizationId || loginData.diagnosticID;
  //         const diagnosticStatus = response.data.diagnostic?.status || loginData.organizationAssociations?.[0]?.organizationDetails?.status;
          
  //         if (diagnosticStatus === 'pending') {
  //           navigation.navigate('DiagnosticProfileForm', { diagnosticId });
  //         }
  //         setShowOtpModal(false);
  //         return;
  //       }
        
  //       if (categoryLower === 'pharmacy') {
  //         const pharmacyId = loginData.organizationAssociations?.[0]?.organizationId || loginData.pharmacyID;
  //         const pharmacyStatus = response.data.pharmacy?.status || loginData.organizationAssociations?.[0]?.organizationDetails?.status;
          
  //         if (pharmacyStatus === 'pending') {
  //           navigation.navigate('PharmacyProfileForm', { pharmacyId });
  //         } else {
  //           navigation.navigate('PharmacyDashboard');
  //         }
  //         setShowOtpModal(false);
  //         return;
  //       }

  //       if (categoryLower === 'doctor') {
  //         const doctorId = response?.data?.id || formData.email;
  //         setShowOtpModal(false);
  //         navigation.navigate('DoctorProfileForm', { doctorId });
  //         return;
  //       }
        
  //       setShowSuccessScreen(true);
  //     } else {
  //       setShowSuccessScreen(true);
  //     }
  //   } catch (error: any) {
  //     dispatch(showError(error.message || 'Failed to verify OTP'));
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  // const handleResendOtp = async () => {
  //   setIsResendingOtp(true);

  //   try {
  //     let resendEndpoint = 'user/resend-otp';
  //     const categoryLower = category?.toLowerCase();

  //     if (categoryLower === 'hospital') {
  //       resendEndpoint = 'hospital/resend-otp';
  //     } else if (categoryLower === 'diagnostic' || categoryLower === 'lab') {
  //       resendEndpoint = 'diagnostic/resend-otp';
  //     } else if (categoryLower === 'pharmacy') {
  //       resendEndpoint = 'pharmacy/resend-otp';
  //     } else if (categoryLower === 'doctor') {
  //       resendEndpoint = 'doctor-registration/resend-otp';
  //     }

  //     const email = formData.email || formData.adminEmail || formData.userEmail || formData.labEmail;
      
  //     const response = await AuthPost(resendEndpoint, { email }, null) as any;

  //     if (response?.status === 'error') {
  //       dispatch(showError(response.message || 'Failed to resend OTP'));
  //       return;
  //     }

  //     dispatch(showSuccess('OTP resent successfully! Check your email'));
  //     setOtp(['', '', '', '', '', '']);
  //   } catch (error: any) {
  //     dispatch(showError(error.message || 'Failed to resend OTP'));
  //   } finally {
  //     setIsResendingOtp(false);
  //   }
  // };

  const handleLoginRedirect = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'token']);
      navigation.navigate('Login');
    } catch (error) {
      dispatch(showError('Failed to redirect to login'));
    }
  };

  if (showSuccessScreen) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <View style={styles.successIconWrapper}>
              <CheckCircle size={SPACING.xl} color={COLORS.success} />
            </View>
            <Text style={styles.successTitle}>Registration Successful!</Text>
            <Text style={styles.successMessage}>
              Please login to complete your profile setup to access the {category} dashboard.
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLoginRedirect}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
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
            {fields.map((field) => {
              if (field.type === 'dropdown') {
                return renderDropdownField(field);
              }

              return (
                <View key={field.name} style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    {field.label} {field.required && <Text style={styles.required}>*</Text>}
                  </Text>

                  {field.type === 'textarea' ? (
                    <TextInput
                      style={[styles.textArea, formErrors[field.name] && styles.inputError]}
                      placeholder={field.placeholder}
                      placeholderTextColor={COLORS.placeholder}
                      value={formData[field.name] || ''}
                      onChangeText={(value) => handleInputChange(field.name, value)}
                      multiline
                      maxLength={field.name === 'address' ? 150 : undefined}
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
                      placeholderTextColor={COLORS.placeholder}
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
                        [
                          'name',
                          'parent',
                          'district',
                          'firstName',
                          'lastName',
                          'adminFirstName',
                          'adminLastName',
                          'userFirstName',
                          'userLastName',
                          'labFirstName',
                          'labLastName',
                          'bloodBankName',
                          'pointOfContact'
                        ].includes(field.name)
                          ? 30
                          : undefined
                      }
                      editable={
                        !isSubmitting &&
                        !(category?.toLowerCase() === 'hospital' &&
                          (field.name === 'adminEmail' || field.name === 'adminPhone'))
                      }
                      returnKeyType="next"
                      blurOnSubmit={field.name === fields[fields.length - 1]?.name}
                    />
                  )}

                  {formErrors[field.name] ? (
                    <Text style={styles.errorText}>{formErrors[field.name]}</Text>
                  ) : null}
                  {category?.toLowerCase() === 'hospital' &&
                    (field.name === 'adminEmail' || field.name === 'adminPhone') && (
                      <Text style={styles.helperText}>
                        *Auto-filled from main Email and Phone number below.
                      </Text>
                    )}
                </View>
              );
            })}

            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
                onPress={() => setTermsAccepted(!termsAccepted)}
                disabled={isSubmitting}
              >
                {termsAccepted ? (
                  <Check size={FONT_SIZE.sm} color={COLORS.white} />
                ) : null}
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                I agree to MetaHealth's Terms of Service and Privacy Policy. 
                I confirm that all information provided is accurate.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (isSubmitting || !termsAccepted) && styles.buttonDisabled]}
              onPress={submitRegistration}
              disabled={isSubmitting || !termsAccepted}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.buttonText}>Validate & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* <Modal
          visible={showOtpModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowOtpModal(false)}
          statusBarTranslucent={true}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <KeyboardAvoidingView
              style={styles.modalKeyboardAvoidingView}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.otpHeader}>
                    <View style={styles.otpIconWrapper}>
                      <Mail size={SPACING.lg} color={COLORS.brand} />
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
                        placeholderTextColor={COLORS.placeholder}
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
                    style={[styles.verifyButton, isSubmitting && styles.buttonDisabled]}
                    onPress={handleOtpSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Verify & Submit</Text>
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
        </Modal> */}
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
  formContainer: {
    padding: SPACING.md,
    paddingTop: SPACING.lg,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  checkbox: {
    width: FONT_SIZE.lg,
    height: FONT_SIZE.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SPACING.xs,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginTop: SPACING.xs * 0.5,
  },
  checkboxChecked: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  checkboxText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: FONT_SIZE.md * 1.2,
  },
  submitButton: {
    backgroundColor: COLORS.brand,
    borderRadius: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.sub,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  successContent: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  successIconWrapper: {
    width: SPACING.xl * 1.5,
    height: SPACING.xl * 1.5,
    borderRadius: SPACING.xl,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: FONT_SIZE.md * 1.5,
  },
  loginButton: {
    backgroundColor: COLORS.brand,
    borderRadius: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },


  //   modalSafeArea: {
  //   flex: 1,
  //   backgroundColor: 'rgba(0, 0, 0, 0.5)',
  // },
  // modalKeyboardAvoidingView: {
  //   flex: 1,
  //   justifyContent: 'center',
  // },
  // modalContainer: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   paddingHorizontal: SPACING.md,
  // },
  // modalContent: {
  //   backgroundColor: COLORS.white,
  //   borderRadius: SPACING.lg,
  //   padding: SPACING.lg,
  //   width: '100%',
  //   maxWidth: 500,
  //   borderWidth: 1.5,
  //   borderColor: COLORS.border,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 4 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 8,
  //   elevation: 4,
  // },
  // otpHeader: {
  //   alignItems: 'center',
  //   marginBottom: SPACING.lg,
  // },
  // otpIconWrapper: {
  //   width: SPACING.xl * 1.2,
  //   height: SPACING.xl * 1.2,
  //   borderRadius: SPACING.xl,
  //   backgroundColor: '#E0F2FE',
  //   justifyContent: 'center',
  //   alignItems: 'center',
    // ma
  helperText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: SPACING.xs * 0.5,
    fontStyle: 'italic',
  },

  //   otpTitle: {
  //   fontSize: FONT_SIZE.lg,
  //   fontWeight: '700',
  //   color: COLORS.text,
  //   marginBottom: SPACING.xs,
  // },
  // otpSubtitle: {
  //   fontSize: FONT_SIZE.sm,
  //   color: COLORS.sub,
  //   textAlign: 'center',
  //   lineHeight: FONT_SIZE.md * 1.2,
  // },
  // otpInputsContainer: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   marginBottom: SPACING.lg,
  // },
  // otpInput: {
  //   width: responsiveWidth(12),
  //   height: responsiveWidth(12),
  //   borderWidth: 2,
  //   borderColor: COLORS.border,
  //   borderRadius: SPACING.sm,
  //   fontSize: FONT_SIZE.lg,
  //   color: COLORS.text,
  //   backgroundColor: COLORS.white,
  // },
  // verifyButton: {
  //   backgroundColor: COLORS.brand,
  //   borderRadius: SPACING.lg,
  //   paddingVertical: SPACING.md,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   marginBottom: SPACING.sm,
  // },
  // backButton: {
  //   backgroundColor: COLORS.chipInactive,
  //   borderRadius: SPACING.lg,
  //   paddingVertical: SPACING.md,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   marginBottom: SPACING.md,
  // },
  // backButtonText: {
  //   color: COLORS.text,
  //   fontSize: FONT_SIZE.md,
  //   fontWeight: '600',
  // },
  // resendText: {
  //   fontSize: FONT_SIZE.sm,
  //   color: COLORS.sub,
  //   textAlign: 'center',
  // },
  // resendLink: {
  //   color: COLORS.brand,
  //   fontWeight: '600',
  // },
  // resendLinkDisabled: {
  //   color: COLORS.sub,
  // },
  Select: {
    height: responsiveHeight(6),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.sm,
    backgroundColor: '#f9fafb',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
  },
  SelectError: {
    borderColor: COLORS.error,
  },
  SelectText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.lg,
    width: SCREEN_WIDTH * 0.8,
    maxHeight: SCREEN_HEIGHT * 0.6,
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerModalTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickerModalClose: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.sub,
    padding: SPACING.xs,
  },
  pickerOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
});

export default RegistrationForm;