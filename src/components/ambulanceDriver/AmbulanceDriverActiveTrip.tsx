import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store/store';
import { AuthFetch } from '../../auth/auth';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

interface TripData {
  id: string | number;
  patientName: string;
  patientPhone?: string;
  pickupAddress: string;
  dropAddress: string;
  distance?: string;
  estimatedTime?: string;
  priority?: string;
  status: string;
  requestTime?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropLatitude?: number;
  dropLongitude?: number;
}

const AmbulanceDriverActiveTrip: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.currentUser);

  const [loading, setLoading] = useState(false);
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);

  // Check if trip data was passed from navigation (when accepting a trip)
  useEffect(() => {
    if (route.params?.tripData) {
      setActiveTrip(route.params.tripData);
    }
  }, [route.params]);

  // Fetch active trip data from API
  const fetchActiveTrip = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.id) {
        console.log('No token or user ID');
        return;
      }

      // TODO: Replace with your actual API endpoint
      const response: any = await AuthFetch(`ambulance/getActiveTrip?driverId=${user.id}`, token);
      
      if (response?.status === 'success' && response?.data?.trip) {
        setActiveTrip(response.data.trip);
      } else if (response?.trip) {
        setActiveTrip(response.trip);
      } else {
        // No active trip
        setActiveTrip(null);
      }
    } catch (error) {
      console.error('Error fetching active trip:', error);
      // Don't show error alert, just log it
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch active trip when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!route.params?.tripData) {
        fetchActiveTrip();
      }
    }, [route.params?.tripData, fetchActiveTrip])
  );

  const handleStartTrip = () => {
    if (!activeTrip) return;

    Alert.alert(
      'Start Trip',
      'Are you ready to start this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              // TODO: Call API to update trip status to 'in_progress'
              // await AuthPost('ambulance/startTrip', { tripId: activeTrip.id }, token);
              
              Alert.alert('Success', 'Trip started! Navigate to pickup location.');
              // Update local state
              setActiveTrip({ ...activeTrip, status: 'in_progress' });
            } catch (error) {
              Alert.alert('Error', 'Failed to start trip. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCompleteTrip = () => {
    if (!activeTrip) return;

    Alert.alert(
      'Complete Trip',
      'Mark this trip as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              // TODO: Call API to update trip status to 'completed'
              // await AuthPost('ambulance/completeTrip', { tripId: activeTrip.id }, token);
              
              Alert.alert('Success', 'Trip completed successfully!');
              setActiveTrip(null);
              navigation.navigate('AmbulanceDriverDashboard');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete trip. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleNavigate = () => {
    if (!activeTrip) return;
    
    // TODO: Open maps with navigation to pickup/drop location
    Alert.alert('Navigation', 'Opening maps for navigation...');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Active Trip</Text>
          {activeTrip && (
            <Text style={styles.headerSubtitle}>Status: {activeTrip.status}</Text>
          )}
        </View>

        {activeTrip ? (
          <>
            {/* Trip Status Card */}
            <View style={[styles.card, styles.statusCard]}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusTitle}>Trip In Progress</Text>
                {activeTrip.priority && (
                  <View style={[
                    styles.priorityBadge, 
                    activeTrip.priority === 'High' && styles.priorityHigh,
                    activeTrip.priority === 'Medium' && styles.priorityMedium
                  ]}>
                    <Text style={styles.priorityText}>{activeTrip.priority}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate}>
                <Text style={styles.navigateButtonText}>🗺️ Open Navigation</Text>
              </TouchableOpacity>
            </View>

            {/* Patient Information */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Patient Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{activeTrip.patientName}</Text>
              </View>
              {activeTrip.patientPhone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{activeTrip.patientPhone}</Text>
                </View>
              )}
            </View>

            {/* Trip Details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trip Details</Text>
              <View style={styles.locationContainer}>
                <View style={styles.locationRow}>
                  <View style={styles.locationDot} />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>Pickup Location</Text>
                    <Text style={styles.locationText}>{activeTrip.pickupAddress}</Text>
                  </View>
                </View>
                
                <View style={styles.locationLine} />
                
                <View style={styles.locationRow}>
                  <View style={[styles.locationDot, styles.locationDotDrop]} />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>Drop Location</Text>
                    <Text style={styles.locationText}>{activeTrip.dropAddress}</Text>
                  </View>
                </View>
              </View>

              {(activeTrip.distance || activeTrip.estimatedTime) && (
                <View style={styles.tripMetrics}>
                  {activeTrip.distance && (
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Distance</Text>
                      <Text style={styles.metricValue}>{activeTrip.distance}</Text>
                    </View>
                  )}
                  {activeTrip.estimatedTime && (
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Est. Time</Text>
                      <Text style={styles.metricValue}>{activeTrip.estimatedTime}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            {activeTrip.status === 'accepted' && (
              <TouchableOpacity 
                style={[styles.button, styles.buttonSuccess]} 
                onPress={handleStartTrip}
              >
                <Text style={styles.buttonText}>Start Trip</Text>
              </TouchableOpacity>
            )}

            {activeTrip.status === 'in_progress' && (
              <TouchableOpacity 
                style={[styles.button, styles.buttonPrimary]} 
                onPress={handleCompleteTrip}
              >
                <Text style={styles.buttonText}>Complete Trip</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {/* No Active Trip */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No Active Trip</Text>
              <Text style={styles.cardSubtitle}>
                Accept a trip from the dashboard to start
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.infoTitle}>Trip Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Patient:</Text>
                <Text style={styles.infoValue}>N/A</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pickup:</Text>
                <Text style={styles.infoValue}>N/A</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Destination:</Text>
                <Text style={styles.infoValue}>N/A</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Distance:</Text>
                <Text style={styles.infoValue}>N/A</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
              <Text style={styles.buttonText}>Start Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
              <Text style={styles.buttonText}>Complete Trip</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <AmbulanceDriverFooter active="activeTrip" brandColor={COLORS.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusCard: {
    backgroundColor: COLORS.primary,
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  priorityHigh: {
    backgroundColor: COLORS.error,
  },
  priorityMedium: {
    backgroundColor: COLORS.warning,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  navigateButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  locationContainer: {
    marginTop: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginRight: 12,
  },
  locationDotDrop: {
    backgroundColor: COLORS.success,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  locationLine: {
    width: 2,
    height: 24,
    backgroundColor: '#ddd',
    marginLeft: 5,
    marginVertical: 4,
  },
  tripMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  button: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonSuccess: {
    backgroundColor: COLORS.success,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AmbulanceDriverActiveTrip;
