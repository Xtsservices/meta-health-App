import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import CryptoJS from 'crypto-js';
import { Eye, EyeOff, Check } from 'lucide-react-native';
import { AuthFetch, UsePost } from '../auth/auth';
import { currentUser } from '../store/store';
import { roleRoutes, scopeLinks } from '../utils/roleNames';
import { showError,  showSuccess } from '../store/toast.slice';

// import { setCurrentUser } from '../../store/store';
// import { setError, setSuccess } from '../../store/error/error.action';

// Responsive helper
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 768;
const isTablet = width >= 768 && width < 1024;

const Login: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
const [keyboardHeight, setKeyboardHeight] = useState(0);
const [keyboardOpen, setKeyboardOpen] = useState(false);
  // Form state
  const [formData, setFormData] = useState({
    email: {
      value: '',
      valid: true,
      message: '',
    },
    password: {
      value: '',
      valid: true,
      message: '',
    },
  });
  const [showPassword, setShowPassword] = useState(false);

  const isFormValid =
    formData.email.value.trim() !== '' && formData.password.value.trim() !== '';

useFocusEffect(
  React.useCallback(() => {
    let isActive = true;
//  navigation.navigate('Home' as never);
    (async () => {
      const token = await AsyncStorage.getItem('token');
      const userIdStr = await AsyncStorage.getItem('userID'); // string | null
      if (!isActive || !token) return;
      const userIdNum = userIdStr !== null ? Number(userIdStr) : NaN;
      if (Number.isNaN(userIdNum)) {       
        return;
      }

      try {
        const response = await AuthFetch(`user/${userIdNum}`, token);
        dispatch(currentUser(response?.data?.user));
        
        navigation.reset({ index: 0, routes: [{ name: 'Home' as never }] });
      } catch (error) {
        dispatch(showError(error?.message))
      }
    })();

    return () => { isActive = false; };
  }, [navigation])
);

  useEffect(() => {
  const showSub = Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
    (e) => {
      const kbH = e?.endCoordinates?.height ?? 0;
      setKeyboardHeight(kbH);
      setKeyboardOpen(true);

      // Let layout settle, then scroll to reveal the bottom (login button)
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


  const login = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const body = {
         email: formData.email.value,
        password: formData.password.value,
      }

      const response = await UsePost('user/emailLogin', body);
      const data = response?.data;
      if (data.message === 'success') {
      
        await AsyncStorage.setItem('token', data?.token);
       if (data?.id != null) {
  await AsyncStorage.setItem('userID', String(data.id));
}
        
        dispatch(showSuccess('Successfully Logged In'));
        dispatch(currentUser(data));
        if (data?.role === 2002 || data?.role === 2003) {
          navigation.navigate('Nurse' as never);
        } else if (roleRoutes[data.role]) {
          navigation.navigate(roleRoutes[data.role] as never);
        } else {
          const userScopes = data?.scope?.split('#');
          if (userScopes?.length === 1) {
            const scope = parseInt(userScopes[0], 10);
            const link = scopeLinks[scope];
            if (link) {
              // navigation.navigate(`HospitalDashboard/${link}` as never);
            }
          } else {
            navigation.navigate('Home' as never);
          }
        }
      } else {
        dispatch( showError(data?.message));
      }
    } catch (error: any) {
      dispatch(showError(error?.response?.data?.message || 'Login failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

//   if (isLoading) {
//     return (
//       <View style={[styles.container, styles.centerContent]}>
//         <ActivityIndicator size="large" color="#14b8a6" />
//       </View>
//     );
//   }

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
          <View style={styles.loginContainer}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Image
                source={require('../assets/Logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.formGroup}>
                <TextInput
                  style={[
                    styles.formInput,
                    !formData.email.valid && styles.formInputError,
                  ]}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={formData.email.value}
                  onChangeText={(text) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    setFormData((prevValue) => ({
                      ...prevValue,
                      email: {
                        value: text,
                        valid: text === '' || emailRegex.test(text),
                        message: '',
                      },
                    }));
                  }}
                />
              </View>

              {/* Password Input */}
              <View style={styles.formGroup}>
                <View style={styles.passwordInput}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={formData.password.value}
                    onChangeText={(text) => {
                      setFormData((prevValue) => ({
                        ...prevValue,
                        password: {
                          value: text,
                          valid: text.length >= 5 && text.length <= 20,
                          message: '',
                        },
                      }));
                    }}
                    maxLength={20}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye color="#666" size={24} /> : <EyeOff color="#666" size={24} />}
                     
                    {/* <Ionicons
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={24}
                      color="#666"
                    /> */}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Options */}
              {/* <View style={styles.formOptions}>
                

                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View> */}

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  (!isFormValid || isSubmitting) && styles.loginButtonDisabled,
                ]}
                onPress={login}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4fd1c7',
    height: '100%',
    width: '100%'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: height,
    backgroundColor: '#14b8a6',
    flexDirection: 'column'
  },
  leftSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 40 : 60,
    paddingHorizontal: isSmallDevice ? 16 : 32,
    backgroundColor: '#4fd1c7',
    minHeight: isSmallDevice ? height * 0.4 : height * 0.5,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: isSmallDevice ? 250 : isTablet ? 350 : 400,
    height: isSmallDevice ? 300 : isTablet ? 400 : 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  rightSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 24 : 32,
    paddingHorizontal: isSmallDevice ? 24 : 32,
    backgroundColor: '#ffffff',
    minHeight: isSmallDevice ? height * 0.6 : 'auto',
  },
  loginContainer: {
    width: '100%',
    maxWidth: isSmallDevice ? width * 0.9 : 600,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: isSmallDevice ? 15 : 20,
    padding: isSmallDevice ? 24 : 32,
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
    marginRight: isSmallDevice ? 0 : isTablet ? 40 : 80,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 209, 199, 0.2)',
  },
  logo: {
    width: isSmallDevice ? 200 : 300,
    height: isSmallDevice ? 100 : 150,
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  formGroup: {
    marginBottom: 20,
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
  },
  passwordInput: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 13,
    zIndex: 1,
  },
  formOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#4fd1c7',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4fd1c7',
  },
  forgotLink: {
    fontSize: 14,
    color: '#4fd1c7',
    fontWeight: '500',
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#4fd1c7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4fd1c7',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: '#a0e7e0',
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default Login;