import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE, responsiveHeight } from '../../utils/responsive';
import { 
  acceptTripRequest, 
  rejectTripRequest,
  TripRequest,
  setupTripRequestsListener,
  requestDriverBookingRequests
} from '../../services/tripRequestService';
import { RootState } from '../../store/store';

const AmbulanceDriverDashboard: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);

  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);



  // Handle trip requests received from socket
  const handleTripRequestsReceived = useCallback((requests: TripRequest[]) => {
    console.log('📨 Trip requests received:', requests.length);
    setTripRequests(requests);
    setLoading(false);
  }, []);

  // Setup Socket.IO real-time listener when online (NO POLLING)
  useEffect(() => {
    if (!isOnline || !user?.id) {
      console.log('⏸️ Not starting listener - Online:', isOnline, 'User ID:', user?.id);
      return;
    }

    console.log('🚀 Starting Socket.IO real-time listener for user:', user.id);
    setLoading(true);

    // Setup real-time listener - Socket will automatically push data when available
    const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
    const cleanup = setupTripRequestsListener(userId, handleTripRequestsReceived);

    return () => {
      console.log('🛑 Stopping Socket.IO real-time listener');
      cleanup();
    };
  }, [isOnline, user?.id, handleTripRequestsReceived]);

  // Refresh trip requests when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isOnline && user?.id) {
        console.log('🔄 Screen focused - requesting trip updates');
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        requestDriverBookingRequests(userId);
      }
    }, [isOnline, user?.id])
  );

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      Alert.alert('Status', 'You are now online and will receive trip requests');
      // Requests will be loaded automatically by the socket polling effect
    } else {
      Alert.alert('Status', 'You are now offline');
      setTripRequests([]); // Clear requests when going offline
    }
  };

  const handleAcceptTrip = async (trip: TripRequest) => {
    Alert.alert(
      'Accept Trip',
      `Accept trip for ${trip.patientName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('token');
              
              if (!token) {
                Alert.alert('Error', 'Authentication required');
                return;
              }

              // Accept trip via API
              await acceptTripRequest(trip.requestID, token);
              
              console.log('Trip accepted:', trip.id);
              
              // Pass trip data to Active Trip screen
              const tripData = {
                id: trip.id,
                patientName: trip.patientName,
                pickupAddress: trip.pickupAddress,
                dropAddress: trip.dropAddress,
                distance: trip.distance,
                estimatedTime: trip.estimatedTime,
                priority: trip.priority,
                requestTime: trip.requestTime,
                status: 'accepted',
                requestID: trip.requestID,
                bookingID: trip.bookingID,
                fromLatitude: trip.fromLatitude,
                fromLongitude: trip.fromLongitude,
                toLatitude: trip.toLatitude,
                toLongitude: trip.toLongitude,
              };
              
              Alert.alert('Success', 'Trip accepted! Navigating to Active Trip...');
              
              // Navigate to Active Trip screen with data
              (navigation as any).navigate('AmbulanceDriverActiveTrip', { tripData });
              
              // Request fresh trip data via socket
              if (user?.id) {
                const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
                requestDriverBookingRequests(userId);
              }
            } catch (error: any) {
              console.error('Error accepting trip:', error);
              Alert.alert('Error', error?.message || 'Failed to accept trip. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectTrip = async (trip: TripRequest) => {
    Alert.alert(
      'Reject Trip',
      `Reject trip for ${trip.patientName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('token');
              
              if (!token) {
                Alert.alert('Error', 'Authentication required');
                return;
              }

              // Reject trip via API
              await rejectTripRequest(trip.requestID, token);
              
              console.log('Trip rejected:', trip.id);
              
              // Request fresh trip data via socket
              if (user?.id) {
                const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
                requestDriverBookingRequests(userId);
              }
              
              Alert.alert('Success', 'Trip rejected');
            } catch (error: any) {
              console.error('Error rejecting trip:', error);
              Alert.alert('Error', error?.message || 'Failed to reject trip. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <Text style={styles.headerSubtitle}>Ambulance Driver</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.onlineButton, isOnline && styles.onlineButtonActive]}
          onPress={handleToggleOnline}
        >
          <View style={[styles.statusDot, isOnline && styles.statusDotActive]} />
          <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trip Request Queue */}
      <ScrollView style={styles.requestContainer} showsVerticalScrollIndicator={false}>
        {loading && tripRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.emptyStateText}>Loading trip requests...</Text>
          </View>
        ) : tripRequests.length > 0 ? (
          <>
            <Text style={styles.requestsHeader}>
              {tripRequests.length} Trip Request{tripRequests.length > 1 ? 's' : ''} Available
            </Text>
            {tripRequests.map((trip) => (
              <View key={trip.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>{trip.priority} Priority</Text>
                  </View>
                  <Text style={styles.requestTime}>{trip.requestTime}</Text>
                </View>

                <View style={styles.requestBody}>
                  <Text style={styles.patientName}>{trip.patientName}</Text>

                  <View style={styles.addressContainer}>
                    <View style={styles.addressRow}>
                      <View style={styles.iconCircle}>
                        <Text style={styles.iconText}>P</Text>
                      </View>
                      <View style={styles.addressTextContainer}>
                        <Text style={styles.addressLabel}>Pickup</Text>
                        <Text style={styles.addressText}>{trip.pickupAddress}</Text>
                      </View>
                    </View>

                    <View style={styles.dashedLine} />

                    <View style={styles.addressRow}>
                      <View style={[styles.iconCircle, styles.iconCircleDrop]}>
                        <Text style={styles.iconText}>D</Text>
                      </View>
                      <View style={styles.addressTextContainer}>
                        <Text style={styles.addressLabel}>Drop</Text>
                        <Text style={styles.addressText}>{trip.dropAddress}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tripInfoRow}>
                    <View style={styles.tripInfoItem}>
                      <Text style={styles.tripInfoLabel}>Distance</Text>
                      <Text style={styles.tripInfoValue}>{trip.distance}</Text>
                    </View>
                    <View style={styles.tripInfoDivider} />
                    <View style={styles.tripInfoItem}>
                      <Text style={styles.tripInfoLabel}>Est. Time</Text>
                      <Text style={styles.tripInfoValue}>{trip.estimatedTime}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRejectTrip(trip)}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptTrip(trip)}
                  >
                    <Text style={styles.acceptButtonText}>Accept Trip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Trip Requests</Text>
            <Text style={styles.emptyStateText}>
              {isOnline
                ? 'Waiting for trip requests...'
                : 'Go online to receive trip requests'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <AmbulanceDriverFooter active="dashboard" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.brand,
    borderBottomWidth: 0,
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,

  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.primaryText,
    marginTop: 10,

  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryText,
    marginTop: 2,
    opacity: 0.9,
  },
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onlineButtonActive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.card,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  onlineTextActive: {
    color: COLORS.brand,
  },
  requestContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  requestsHeader: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  requestCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },
  priorityText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.danger,
  },
  requestTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  requestBody: {
    marginBottom: SPACING.lg,
  },
  patientName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  addressContainer: {
    marginBottom: SPACING.md,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  iconCircleDrop: {
    backgroundColor: '#FFF3E0',
  },
  iconText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.brand,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 2,
  },
  addressText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  dashedLine: {
    height: 20,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    borderStyle: 'dashed',
    marginLeft: 15,
    marginVertical: -6,
  },
  tripInfoRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  tripInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  tripInfoDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  tripInfoLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 4,
  },
  tripInfoValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
  rejectButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.danger,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  acceptButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.buttonText,
  },
  queueText: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: responsiveHeight(5),
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: 'center',
  },
});

export default AmbulanceDriverDashboard;
