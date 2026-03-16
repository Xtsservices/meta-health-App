import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogOut } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

/* ---------------- Responsive Helpers ---------------- */

const scale = (size: number) => (width / 375) * size;
const verticalScale = (size: number) => (height / 812) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

const hasNotch = Platform.OS === 'ios' && (height >= 812 || width >= 812);
const hasBottomNavigation = Platform.OS === 'android' && height < 600;

/* ---------------- Component ---------------- */

const WebOnlyLogin = () => {
  const navigation = useNavigation<any>();

  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'userID', 'user']);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#03989e" />

      <View style={styles.root}>
        <LinearGradient
          colors={['#059fa3', '#03989e']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.center}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fade,
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Illustration */}
            <View style={styles.iconWrapper}>
              <Svg width={100} height={100} viewBox="0 0 24 24">
                <Rect
                  x="3"
                  y="4"
                  width="18"
                  height="12"
                  rx="2"
                  stroke="#03989e"
                  strokeWidth="1.5"
                  fill="none"
                />
                <Circle cx="12" cy="10" r="3" stroke="#03989e" strokeWidth="1.5" fill="none" />
                <Path
                  d="M8 20h8"
                  stroke="#03989e"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            <Text style={styles.title}>Web Login Required</Text>

            <Text style={styles.description}>
              For security and account management purposes,
              login is available only through our official website.
            </Text>

            <Text style={styles.note}>
              Please access your account using a desktop browser.
              Mobile app login is currently disabled.
            </Text>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <LogOut color="#fff" size={18} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Bottom Wave */}
        <Svg
          width={width}
          height={verticalScale(100)}
          viewBox="0 0 1440 120"
          style={styles.wave}
        >
          <Path
            fill="#ffffff"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L0,120Z"
          />
        </Svg>
      </View>
    </SafeAreaView>
  );
};

export default WebOnlyLogin;

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#03989e',
  },
  root: {
    flex: 1,
    backgroundColor: '#03989e',
    paddingBottom: hasNotch || hasBottomNavigation ? verticalScale(20) : 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moderateScale(24),
    paddingBottom: verticalScale(100),
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(30),
    padding: moderateScale(32),
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrapper: {
    backgroundColor: '#e6f7f8',
    padding: moderateScale(22),
    borderRadius: 70,
    marginBottom: verticalScale(24),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: '#03989e',
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  description: {
    fontSize: moderateScale(15),
    textAlign: 'center',
    color: '#444',
    marginBottom: verticalScale(12),
    lineHeight: 22,
  },
  note: {
    fontSize: moderateScale(14),
    textAlign: 'center',
    color: '#777',
    marginBottom: verticalScale(28),
    lineHeight: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#03989e',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(32),
    borderRadius: 40,
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: moderateScale(15),
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
