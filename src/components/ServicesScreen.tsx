import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  StatusBar,
  SafeAreaView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  moderateScale,
  moderateVerticalScale,
  fontWithLineHeight,
  wp,
  hp,
  getResponsiveFontSize,
  responsivePadding,
  responsiveMargin,
  getSafeAreaInsets
} from '../utils/responsive'; // Adjust the import path as needed

const services = [
  { 
    id: 1, 
    label: 'Hospital', 
    route: 'HospitalRegistration', 
    category: 'hospital' 
  },
  { 
    id: 2, 
    label: 'Doctor', 
    route: 'DoctorRegistration', 
    category: 'doctor' 
  },
  { 
    id: 3, 
    label: 'Blood Bank', 
    route: 'BloodBankRegistration', 
    category: 'blood bank' 
  },
  { 
    id: 4, 
    label: 'Lab', 
    route: 'LabRegistration', 
    category: 'lab' 
  },
  { 
    id: 5, 
    label: 'Pharmacy', 
    route: 'PharmacyRegistration', 
    category: 'pharmacy' 
  },
];

const ServicesScreen = () => {
  const navigation = useNavigation<any>();
  const safeAreaInsets = getSafeAreaInsets();

  const handleServicePress = (item: typeof services[0]) => {
    // Add any validation or loading logic here
    navigation.navigate(item.route, { category: item.category });
  };

  if (!services?.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No services available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          responsivePadding(SPACING.md, SPACING.lg, SPACING.xl, SPACING.lg)
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.header,
          responsiveMargin(SPACING.sm, 0, SPACING.xl, 0)
        ]}>
          <Text style={styles.heading}>Choose a Service</Text>
          <Text style={styles.subHeading}>
            Select the service you want to register
          </Text>
        </View>
        
        <View style={styles.servicesGrid}>
          {services?.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handleServicePress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardText}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ServicesScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
  },
  heading: {
    fontWeight: '700',
    color: '#03989e',
    textAlign: 'center',
    marginBottom: moderateVerticalScale(8),
    fontSize: getResponsiveFontSize(28, { min: 24, max: 32 }),
    lineHeight: moderateScale(34),
    ...(isSmallDevice && {
      fontSize: moderateScale(24),
      lineHeight: moderateScale(30),
    }),
    ...(isTablet && {
      fontSize: moderateScale(32),
      lineHeight: moderateScale(40),
    }),
  },
  subHeading: {
    color: '#64748b',
    textAlign: 'center',
    maxWidth: isTablet ? wp(60) : wp(80),
    fontSize: getResponsiveFontSize(14, { min: 12, max: 16 }),
    lineHeight: moderateScale(20),
    ...(isSmallDevice && {
      fontSize: moderateScale(12),
      lineHeight: moderateScale(18),
    }),
    ...(isTablet && {
      fontSize: moderateScale(16),
      lineHeight: moderateScale(24),
    }),
  },
  servicesGrid: {
    flexDirection: 'column',
    gap: moderateVerticalScale(16),
    ...(isSmallDevice && {
      gap: moderateVerticalScale(12),
    }),
    ...(isTablet && {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: moderateScale(20),
    }),
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.md,
    padding: moderateScale(isTablet ? 24 : 20),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...(isTablet && {
      width: wp(isExtraSmallDevice ? 90 : 45),
      marginHorizontal: moderateScale(5),
    }),
    ...(isExtraSmallDevice && {
      padding: moderateScale(16),
    }),
  },
  cardContent: {
    alignItems: 'center',
  },
  cardText: {
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: getResponsiveFontSize(18, { min: 16, max: 20 }),
    lineHeight: moderateScale(24),
    ...(isSmallDevice && {
      fontSize: moderateScale(16),
      lineHeight: moderateScale(22),
    }),
    ...(isTablet && {
      fontSize: moderateScale(20),
      lineHeight: moderateScale(28),
    }),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: getResponsiveFontSize(16, { min: 14, max: 18 }),
    lineHeight: moderateScale(24),
  },
});