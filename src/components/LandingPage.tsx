import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

// Get responsive dimensions
const { width, height } = Dimensions.get('window');

// Responsive scaling function
const scale = (size: number) => (width / 375) * size;
const verticalScale = (size: number) => (height / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Check for devices with bottom navigation bar
const hasNotch = Platform.OS === 'ios' && (height >= 812 || width >= 812);
const hasBottomNavigation = Platform.OS === 'android' && height < 600;

const slides = [
  { 
    text: 'Find the Best Hospitals', 
    subtext: 'Register or search hospitals near you' 
  },
  { 
    text: 'Connect with Expert Doctors', 
    subtext: 'Find and connect with certified doctors' 
  },
  { 
    text: 'Search Blood Banks', 
    subtext: 'Search or register blood banks nationwide' 
  },
  { 
    text: 'Book Lab Tests', 
    subtext: 'Book lab tests or register your laboratory' 
  },
];

const LandingPage = () => {
  const navigation = useNavigation<any>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    animateIn();
    const interval = setInterval(() => {
      animateOut(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
        animateIn();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fade, { 
        toValue: 1, 
        duration: 500, 
        useNativeDriver: true 
      }),
      Animated.timing(translateY, { 
        toValue: 0, 
        duration: 500, 
        useNativeDriver: true 
      }),
    ]).start();
  };

  const animateOut = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(fade, { 
        toValue: 0, 
        duration: 300, 
        useNativeDriver: true 
      }),
      Animated.timing(translateY, { 
        toValue: -30, 
        duration: 300, 
        useNativeDriver: true 
      }),
    ]).start(cb);
  };

  const handleExploreServices = () => {
    // Add any validation or loading logic here if needed
    navigation.navigate('Services');
  };

  const handleLoginRegister = () => {
    // Add any validation or loading logic here if needed
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#03989e" />
      <View style={styles.root}>
        <LinearGradient 
          colors={['#059fa3', '#03989e']} 
          style={StyleSheet.absoluteFill} 
        />

        {/* Logo at the top */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/112Logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.center}>
          <Animated.View style={[
            styles.slideBox, 
            { 
              opacity: fade, 
              transform: [{ translateY }] 
            }
          ]}>
            <Text style={styles.title}>
              {slides[currentSlide]?.text}
            </Text>
            <Text style={styles.subtitle}>
              {slides[currentSlide]?.subtext}
            </Text>
          </Animated.View>

          <View style={styles.dots}>
            {slides?.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  i === currentSlide && styles.activeDot
                ]} 
              />
            ))}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleExploreServices}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryText}>
                Explore Services →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={handleLoginRegister}
              activeOpacity={0.8}
            >
              <Text style={styles.outlineText}>
                Login / Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wave SVG at bottom */}
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

export default LandingPage;

/* ===== STYLES ===== */
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
  // Logo Styles
  logoContainer: {
    position: 'absolute',
    top: hasNotch ? verticalScale(60) : verticalScale(40),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  logoImage: {
    width: scale(150),
    height: verticalScale(150),
    tintColor: '#fff',
    marginTop: hasNotch ? verticalScale(40) : verticalScale(60),
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: moderateScale(20),
    paddingTop: verticalScale(180), // Space for logo
    paddingBottom: verticalScale(100), // Space for wave
  },
  slideBox: { 
    alignItems: 'center', 
    minHeight: verticalScale(160),
    width: '100%',
  },
  title: { 
    color: '#fff', 
    fontSize: moderateScale(28), 
    fontWeight: '700', 
    textAlign: 'center', 
    marginBottom: verticalScale(12),
    paddingHorizontal: moderateScale(20),
    lineHeight: moderateScale(34),
  },
  subtitle: { 
    color: '#e6fffb', 
    fontSize: moderateScale(15), 
    textAlign: 'center', 
    maxWidth: scale(320),
    paddingHorizontal: moderateScale(20),
    lineHeight: moderateScale(22),
  },
  dots: { 
    flexDirection: 'row', 
    marginVertical: verticalScale(24),
    alignItems: 'center',
  },
  dot: { 
    width: scale(8), 
    height: verticalScale(8), 
    borderRadius: scale(4), 
    backgroundColor: 'rgba(255,255,255,0.4)', 
    marginHorizontal: scale(4),
  },
  activeDot: { 
    width: scale(22), 
    backgroundColor: '#fff',
  },
  buttons: { 
    flexDirection: 'row', 
    gap: scale(16),
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: moderateScale(20),
  },
  primaryBtn: { 
    backgroundColor: '#fff', 
    paddingVertical: verticalScale(14), 
    paddingHorizontal: scale(26), 
    borderRadius: scale(30),
    minWidth: scale(160),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  primaryText: { 
    color: '#03989e', 
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  outlineBtn: { 
    borderWidth: 1.5, 
    borderColor: '#fff', 
    paddingVertical: verticalScale(14), 
    paddingHorizontal: scale(26), 
    borderRadius: scale(30),
    minWidth: scale(160),
    alignItems: 'center',
  },
  outlineText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  wave: { 
    position: 'absolute', 
    bottom: 0,
    left: 0,
    right: 0,
  },
});