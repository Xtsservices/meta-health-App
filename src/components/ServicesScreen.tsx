import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Get responsive dimensions
const { width, height } = Dimensions.get('window');

// Responsive scaling functions
const scale = (size: number) => (width / 375) * size;
const verticalScale = (size: number) => (height / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

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
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Choose a Service</Text>
          <Text style={styles.subHeading}>Select the service you want to register</Text>
        </View>
        
        <View style={styles.servicesGrid}>
          {services?.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handleServicePress(item)}
              activeOpacity={0.8}
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
    paddingHorizontal: moderateScale(20),
    paddingBottom: verticalScale(40),
    paddingTop: verticalScale(20),
  },
  header: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
    marginTop: verticalScale(10),
  },
  heading: {
    fontSize: moderateScale(28),
    fontWeight: '700',
    color: '#03989e',
    textAlign: 'center',
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(34),
  },
  subHeading: {
    fontSize: moderateScale(14),
    color: '#64748b',
    textAlign: 'center',
    maxWidth: scale(280),
    lineHeight: moderateScale(20),
  },
  servicesGrid: {
    flexDirection: 'column',
    gap: verticalScale(16),
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(14),
    padding: moderateScale(20),
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
  },
  cardContent: {
    alignItems: 'center',
  },
  cardText: {
    fontSize: moderateScale(18),
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: '#64748b',
    textAlign: 'center',
  },
});