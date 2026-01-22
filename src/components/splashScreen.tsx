import React, { useEffect } from 'react';
import { Image, StyleSheet, Dimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';

import { AuthFetch } from '../auth/auth';
import { currentUser } from '../store/store';
import { showError } from '../store/toast.slice';
import { Role_NAME } from '../utils/role';


const { width } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();



  // 🔹 AUTH FLOW
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log("Token retrieved:", token);
        const userId = await AsyncStorage.getItem('userID');

        if (!token || !userId) {
          navigation.replace('LandingPage');
          return;
        }

        const res = await AuthFetch(`user/${Number(userId)}`, token);
        console.log("User data fetched:", res);
        const user = res?.data?.user;

        if (!user) {
          navigation.replace('Login');
          return;
        }

        dispatch(currentUser(user));

        if (user.role === Role_NAME.ambulanceAdmin) {
          navigation.replace('AmbulanceAdminDashboard');
        } else if (user.role === Role_NAME.ambulanceDriver) {
          navigation.replace('AmbulanceDriverDashboard');
        } else if (user.scope === '5007' || user.scope === '5008') {
          navigation.replace('OtDashboard');
        } else if (user.role === 2002 || user.role === 2003) {
          navigation.replace('NurseDashboard');
        }else {
          navigation.replace('Home');
        }
      } catch (e) {
        dispatch(showError('Auto login failed'));
        navigation.replace('Login');
      }
    };

    const timer = setTimeout(checkLogin, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require('../assets/Logo.png')} style={styles.logo} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    resizeMode: 'contain',
  },
});

export default SplashScreen;
