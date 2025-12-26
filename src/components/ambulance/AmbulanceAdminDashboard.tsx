import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showError, showSuccess } from '../../store/toast.slice';
import { AuthFetch } from '../../auth/auth';
import AmbulanceFooter from './AmbulanceFooter';

// Responsive helper
const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface AmbulanceData {
  id: number;
  ambulanceNumber: string;
  ambulanceName: string;
  firstName?: string;
  lastName?: string;
  phoneNo?: string;
  contactPhone?: string;
  email?: string;
  contactEmail?: string;
  status: string;
  registeredDate?: string;
  updatedOn?: string;
  ambulanceType?: string;
  state?: string;
  city?: string;
  pinCode?: string;
  rcNumber?: string;
  insuranceNumber?: string;
  insuranceValidTill?: string;
  pollutionNumber?: string;
  pollutionValidTill?: string;
  fitnessNumber?: string;
  fitnessValidTill?: string;
  ventilator?: boolean;
  oxygenCylinders?: number;
  cardiacMonitor?: boolean;
  suctionMachine?: boolean;
  defibrillator?: boolean;
  gpsEnabled?: boolean;
  available24x7?: boolean;
}

interface DashboardStats {
  totalAmbulances: number;
  activeAmbulances: number;
  inactiveAmbulances: number;
}

// Color constants
const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  successLight: '#d1fae5',
  errorLight: '#fee2e2',
};

// Animated Card Component
const AnimatedAmbulanceCard: React.FC<{ 
  item: AmbulanceData; 
  onPress: () => void; 
  onCompletePress: () => void;
}> = ({ item, onPress, onCompletePress }) => {
  const hasActiveDriver = !!(item as any).activeDriverName;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasActiveDriver) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.015,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [hasActiveDriver, pulseAnim]);

  return (
    <Animated.View 
      style={[
        styles.ambulanceCard,
        hasActiveDriver && styles.ambulanceCardWithDriver,
        hasActiveDriver && { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        style={styles.cardTouchable}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text style={styles.ambulanceName}>{item.ambulanceName}</Text>
            <Text style={styles.vehicleNumber}>{item.ambulanceNumber}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    item.status === 'active' 
                      ? COLORS.success 
                      : item.status === 'pending'
                      ? COLORS.warning
                      : COLORS.error,
                },
              ]}
            >
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
            {hasActiveDriver && (
              <View style={styles.driverIconContainer}>
                <Text style={styles.driverIcon}>👤</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          {item.ambulanceType && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Type:</Text>
              <Text style={styles.value}>{item.ambulanceType}</Text>
            </View>
          )}
          {item.city && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>City:</Text>
              <Text style={styles.value}>{item.city}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Driver Name:</Text>
            <Text style={[styles.value, hasActiveDriver && styles.activeDriverText]}>
              {(item as any).activeDriverName || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Driver Mobile:</Text>
            <Text style={[styles.value, hasActiveDriver && styles.activeDriverText]}>
              {(item as any).activeDriverMobile || 'N/A'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={onCompletePress}
        >
          <Text style={styles.completeButtonText}>✓ Complete Details</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const AmbulanceAdminDashboard: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [ambulances, setAmbulances] = useState<AmbulanceData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAmbulances: 0,
    activeAmbulances: 0,
    inactiveAmbulances: 0,
  });

  const currentUser = useSelector((state: any) => state.user?.currentUser);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        dispatch(showError('Authentication required'));
        setIsLoading(false);
        return;
      }

      const response: any = await AuthFetch('ambulance/getAllAmbulances', token);
      // console.log('Ambulance fetch response:', response);

      if (response?.data?.ambulances && Array.isArray(response.data.ambulances)) {
        const fetchedAmbulances = response.data.ambulances;
        setAmbulances(fetchedAmbulances);
        
        // Calculate stats from fetched data
        const total = fetchedAmbulances.length;
        const active = fetchedAmbulances.filter((a: any) => a.status === 'active').length;
        const inactive = fetchedAmbulances.filter((a: any) => a.status === 'inactive').length;

        setStats({
          totalAmbulances: total,
          activeAmbulances: active,
          inactiveAmbulances: inactive,
        });

        dispatch(showSuccess('Dashboard loaded successfully'));
      } else {
        dispatch(showError('Failed to load ambulances'));
        // Set empty data if fetch fails
        setAmbulances([]);
        setStats({
          totalAmbulances: 0,
          activeAmbulances: 0,
          inactiveAmbulances: 0,
        });
      }
    } catch (error: any) {
      // console.error('Error loading ambulances:', error);
      dispatch(showError(error?.response?.data?.message || 'Failed to load data'));
      // Set empty data on error
      setAmbulances([]);
      setStats({
        totalAmbulances: 0,
        activeAmbulances: 0,
        inactiveAmbulances: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userID');
              dispatch(showSuccess('Logged out successfully'));
              navigation.navigate('Login' as never);
            } catch {
              dispatch(showError('Logout failed'));
            }
          },
        },
      ]
    );
  };

  const handleCompleteDetails = (ambulance: AmbulanceData) => {
    const ambulanceData = {
      ambulance_name: ambulance.ambulanceName,
      ambulance_number: ambulance.ambulanceNumber,
      email: ambulance.email || ambulance.contactEmail || '',
      phone_no: ambulance.phoneNo || ambulance.contactPhone || '',
      first_name: ambulance.firstName || '',
      last_name: ambulance.lastName || '',
      id: ambulance.id,
      // Include other existing fields that might be partially filled
      owner_type: 'hospital',
      hospital_id: '',
      state: '',
      city: '',
      pin_code: '',
      ambulance_type: ambulance.ambulanceType || 'ALS',
      rc_number: ambulance.rcNumber || '',
      insurance_number: ambulance.insuranceNumber || '',
      insurance_valid_till: ambulance.insuranceValidTill || '',
      pollution_number: ambulance.pollutionNumber || '',
      pollution_valid_till: ambulance.pollutionValidTill || '',
      fitness_number: ambulance.fitnessNumber || '',
      fitness_valid_till: ambulance.fitnessValidTill || '',
      ventilator: ambulance.ventilator || false,
      oxygen_cylinders: ambulance.oxygenCylinders?.toString() || '2',
      cardiac_monitor: ambulance.cardiacMonitor || false,
      suction_machine: ambulance.suctionMachine || false,
      defibrillator: ambulance.defibrillator || false,
      gps_enabled: ambulance.gpsEnabled || false,
      available_24x7: ambulance.available24x7 || false,
      status: ambulance.status,
    };
    (navigation as any).navigate('AmbulanceForm', { ambulance: ambulanceData });
  };

  const handleAmbulanceDetails = (ambulance: AmbulanceData) => {
    // Navigate to ambulance details screen based on status
    if (ambulance.status === 'pending') {
      // If pending, navigate to form to complete details
      handleCompleteDetails(ambulance);
    } else if (ambulance.status === 'active') {
      // If active, navigate to details screen
      (navigation as any).navigate('AmbulanceDetails', { 
        ambulance, 
        ambulanceId: ambulance.id 
      });
    } else {
      // For other statuses, show info
      Alert.alert(
        'Ambulance Details',
        `${ambulance.ambulanceName}\n${ambulance.ambulanceNumber}\nStatus: ${ambulance.status}`
      );
    }
  };

  const renderAmbulanceCard = ({ item }: { item: AmbulanceData }) => {
    return (
      <AnimatedAmbulanceCard
        item={item}
        onPress={() => handleAmbulanceDetails(item)}
        onCompletePress={() => handleCompleteDetails(item)}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Ambulance Admin</Text>
              <Text style={styles.headerSubtitle}>Dashboard</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {currentUser && (
            <View style={styles.userInfo}>
              <Text style={styles.userGreeting}>
                Welcome, {currentUser.firstName || 'Admin'}!
              </Text>
              <Text style={styles.userEmail}>{currentUser.email}</Text>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalAmbulances}</Text>
            <Text style={styles.statLabel}>Total Ambulances</Text>
          </View>
          <View style={styles.statCardActive}>
            <Text style={styles.statNumberActive}>{stats.activeAmbulances}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCardInactive}>
            <Text style={styles.statNumberInactive}>{stats.inactiveAmbulances}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>

       

        {/* Ambulances List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Registered Ambulances</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => (navigation as any).navigate('AmbulanceForm')}
            >
              <Text style={styles.addButtonText}>+ New</Text>
            </TouchableOpacity>
          </View>

          {ambulances.length > 0 ? (
            <FlatList
              data={ambulances}
              renderItem={renderAmbulanceCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No ambulances registered yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "+ New" to register an ambulance
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      <AmbulanceFooter active="dashboard" brandColor={COLORS.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: isSmallDevice ? 20 : 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: isSmallDevice ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  userInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  userGreeting: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#e0f2f1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  statCardActive: {
    flex: 1,
    backgroundColor: COLORS.successLight,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumberActive: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 4,
  },
  statCardInactive: {
    flex: 1,
    backgroundColor: COLORS.errorLight,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumberInactive: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  registerButton: {
    marginHorizontal: isSmallDevice ? 16 : 24,
    backgroundColor: '#14b8a6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  listSection: {
    paddingHorizontal: isSmallDevice ? 16 : 24,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  ambulanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  ambulanceCardWithDriver: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTouchable: {
    padding: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.1)',
  },
  completeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#14b8a6',
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 184, 166, 0.1)',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cardTitleSection: {
    flex: 1,
  },
  ambulanceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  vehicleNumber: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  driverIconContainer: {
    marginTop: 6,
    backgroundColor: '#10b981',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverIcon: {
    fontSize: 14,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    width: '35%',
  },
  value: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  activeDriverText: {
    color: '#10b981',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});

export default AmbulanceAdminDashboard;
