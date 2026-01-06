import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import NoTripRequests from './NoTripRequests';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE } from '../../utils/responsive';
import { 
  acceptTripRequest,
  TripRequest,
  setupTripRequestsListener,
  requestDriverBookingRequests
} from '../../services/tripRequestService';
import { RootState } from '../../store/store';
import { getSocket } from '../../socket/socket';
import { initNotificationSound, releaseNotificationSound, stopNotificationSound } from '../../utils/notificationSound';
import { showError, showSuccess } from '../../store/toast.slice';

// Helper function to get priority colors based on priority type
const getPriorityColors = (priority: string) => {
  if (priority === 'Emergency') {
    return {
      backgroundColor: '#FFEBEE',
      textColor: COLORS.danger,
    };
  }
  // Normal priority - yellow
  return {
    backgroundColor: '#FFF8E1',
    textColor: '#F9A825',
  };
};

const AmbulanceDriverDashboard: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);
  const dispatch = useDispatch();

  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const previousTripIdsRef = useRef<Set<string>>(new Set());

  // Initialize notification sound on mount
  useEffect(() => {
    initNotificationSound();
    return () => {
      releaseNotificationSound();
    };
  }, []);

  // Monitor socket connection status and update isOnline automatically
  useFocusEffect(
    useCallback(() => {
      const socket = getSocket();
      
      if (!socket) {
        console.log('⚠️ Socket not initialized');
        setIsOnline(false);
        return;
      }

      // Set initial status
      setIsOnline(socket.connected);
      console.log('🔌 Initial socket status:', socket.connected ? 'Connected' : 'Disconnected');

      // Listen for connection events
      const handleConnect = () => {
        console.log('✅ Socket connected - Driver is now ONLINE');
        setIsOnline(true);
      };

      const handleDisconnect = (reason: string) => {
        console.log('❌ Socket disconnected - Driver is now OFFLINE. Reason:', reason);
        setIsOnline(false);
        setTripRequests([]); // Clear requests when offline
      };

      const handleConnectError = (error: Error) => {
        console.log('⚠️ Socket connection error:', error.message);
        setIsOnline(false);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      // Cleanup listeners when screen loses focus
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      };
    }, [])
  );



  // Handle trip requests received from socket
  const handleTripRequestsReceived = useCallback((requests: TripRequest[]) => {
    console.log('📨 Trip requests received:', requests.length);
    
    // Check for new trips by comparing with previous trip IDs
    const currentTripIds = new Set(requests.map(trip => trip.id));
    const hasNewTrips = requests.some(trip => !previousTripIdsRef.current.has(trip.id));
    
    if (hasNewTrips && requests.length > 0) {
      console.log('🔔 New trips detected, sound will be played by socket listener');
    }
    
    // Update previous trip IDs (ref doesn't trigger re-render)
    previousTripIdsRef.current = currentTripIds;
    setTripRequests(requests);
    setLoading(false);
  }, []); // Empty dependency array - stable callback

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
    // Status is now automatic based on socket connection
    // This button is just informational
    if (isOnline) {
      dispatch(showSuccess('You are connected to the server and receiving trip requests automatically.'));
    } else {
      dispatch(showError('You are disconnected. Please check your internet connection.'));
    }
  };

  const handleAcceptTrip = async (trip: TripRequest) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        dispatch(showError('Authentication required'));
        return;
      }

      // Stop notification sound when trip is accepted
      stopNotificationSound();
      
      // Accept trip via API
      console.log('Accepting trip request:', trip);
      await acceptTripRequest(trip.bookingID, token);
      
      console.log('Trip accepted:', trip.id);
      
      // Pass trip data to Active Trip screen
      const tripData = {
        id: trip.bookingID,
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
      
      dispatch(showSuccess('Trip accepted! Navigating to Active Trip...'));
      
      // Navigate to Active Trip screen with data
      (navigation as any).navigate('AmbulanceDriverActiveTrip', { tripData });
      
      // Request fresh trip data via socket
      if (user?.id) {
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        requestDriverBookingRequests(userId);
      }
    } catch (error: any) {
      console.error('Error accepting trip:', error);
      dispatch(showError(error?.message || 'Failed to accept trip. Please try again.'));
    } finally {
      setLoading(false);
    }
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
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, isOnline && styles.statusDotActive]} />
          <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trip Request Queue */}
      <ScrollView 
        style={styles.requestContainer} 
        contentContainerStyle={styles.requestContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading && tripRequests.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.loadingText}>Loading trip requests...</Text>
          </View>
        ) : tripRequests.length > 0 ? (
          <>
            <Text style={styles.requestsHeader}>
              {tripRequests.length} Trip Request{tripRequests.length > 1 ? 's' : ''} Available
            </Text>
            {tripRequests.map((trip) => (
              <View key={trip.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColors(trip.priority).backgroundColor }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColors(trip.priority).textColor }]}>{trip.priority}</Text>
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
          <NoTripRequests isOnline={isOnline} />
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
    marginBottom: 80, // Space for footer
  },
  requestContentContainer: {
    paddingBottom: 100, // Extra padding at bottom for last card to be fully visible above footer
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
    borderRadius: 6,
  },
  priorityText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 3,
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
});

export default AmbulanceDriverDashboard;
