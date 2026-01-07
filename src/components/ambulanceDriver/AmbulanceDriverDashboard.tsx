import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import NoTripRequests from './NoTripRequests';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE, isTablet, responsiveWidth, FOOTER_HEIGHT } from '../../utils/responsive';
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
  const { width: windowWidth } = useWindowDimensions();

  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const previousTripIdsRef = useRef<Set<string>>(new Set());

  // Calculate number of columns based on screen width
  const numColumns = isTablet ? 2 : 1;
  // Calculate card width with proper margins for tablet (2 columns) and mobile (1 column)
  const cardWidth = isTablet 
    ? (windowWidth - (SPACING.md * 3)) / 2 - SPACING.xs
    : windowWidth - (SPACING.lg * 2);

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



  // Render individual trip card
  const renderTripCard = ({ item: trip }: { item: TripRequest }) => (
    <View style={[styles.requestCard, { width: cardWidth }]}>
      <View style={styles.requestHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColors(trip.priority).backgroundColor }]}>
          <Text style={[styles.priorityText, { color: getPriorityColors(trip.priority).textColor }]}>
            {trip.priority}
          </Text>
        </View>
        <Text style={styles.requestTime}>{trip.requestTime}</Text>
      </View>

      <View style={styles.requestBody}>
        <Text style={styles.patientName} numberOfLines={1}>{trip.patientName}</Text>

        <View style={styles.addressContainer}>
          <View style={styles.addressRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>P</Text>
            </View>
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressLabel}>Pickup</Text>
              <Text style={styles.addressText} numberOfLines={2}>{trip.pickupAddress}</Text>
            </View>
          </View>

          <View style={styles.dashedLine} />

          <View style={styles.addressRow}>
            <View style={[styles.iconCircle, styles.iconCircleDrop]}>
              <Text style={styles.iconText}>D</Text>
            </View>
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressLabel}>Drop</Text>
              <Text style={styles.addressText} numberOfLines={2}>{trip.dropAddress}</Text>
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
          activeOpacity={0.8}
        >
          <Text style={styles.acceptButtonText}>Accept Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
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
      {loading && tripRequests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading trip requests...</Text>
        </View>
      ) : tripRequests.length > 0 ? (
        <View style={styles.listContainer}>
          <View style={styles.requestsHeaderContainer}>
            <Text style={styles.requestsHeader}>
              {tripRequests.length} Trip Request{tripRequests.length > 1 ? 's' : ''} Available
            </Text>
          </View>
          <FlatList
            data={tripRequests}
            renderItem={renderTripCard}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns} // Force re-render when columns change
            columnWrapperStyle={isTablet ? styles.row : undefined}
            contentContainerStyle={styles.requestContentContainer}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      ) : (
        <ScrollView 
          style={styles.requestContainer}
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
        >
          <NoTripRequests isOnline={isOnline} />
        </ScrollView>
      )}

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
    minHeight: isTablet ? 90 : 80,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: isTablet ? FONT_SIZE.xl : FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.primaryText,
    marginTop: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.sm,
    color: COLORS.primaryText,
    marginTop: 2,
    opacity: 0.9,
  },
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTablet ? SPACING.lg : SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: isTablet ? 140 : 120,
    justifyContent: 'center',
  },
  onlineButtonActive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.card,
  },
  statusDot: {
    width: isTablet ? 12 : 10,
    height: isTablet ? 12 : 10,
    borderRadius: isTablet ? 6 : 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  onlineTextActive: {
    color: COLORS.brand,
  },
  listContainer: {
    flex: 1,
    paddingBottom: FOOTER_HEIGHT,
  },
  requestsHeaderContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.bg,
  },
  requestsHeader: {
    fontSize: isTablet ? FONT_SIZE.lg : FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  requestContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  requestContentContainer: {
    paddingHorizontal: isTablet ? SPACING.md : SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  separator: {
    height: isTablet ? SPACING.md : SPACING.sm,
  },
  requestCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginVertical: SPACING.xs,
    overflow: 'hidden',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  priorityBadge: {
    paddingHorizontal: isTablet ? SPACING.md : SPACING.sm,
    paddingVertical: isTablet ? 8 : 6,
    borderRadius: isTablet ? 8 : 6,
  },
  priorityText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: '600',
  },
  requestTime: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.sub,
  },
  requestBody: {
    marginBottom: SPACING.lg,
  },
  patientName: {
    fontSize: isTablet ? FONT_SIZE.lg : FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  addressContainer: {
    marginBottom: SPACING.md,
    width: '100%',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    width: '100%',
  },
  iconCircle: {
    width: isTablet ? 36 : 32,
    height: isTablet ? 36 : 32,
    borderRadius: isTablet ? 18 : 16,
    backgroundColor: COLORS.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    flexShrink: 0,
  },
  iconCircleDrop: {
    backgroundColor: '#FFF3E0',
  },
  iconText: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.brand,
  },
  addressTextContainer: {
    flex: 1,
    flexShrink: 1,
    paddingRight: SPACING.sm,
    minWidth: 0,
  },
  addressLabel: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 2,
    fontWeight: '500',
  },
  addressText: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: isTablet ? 20 : 18,
  },
  dashedLine: {
    height: 20,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    borderStyle: 'dashed',
    marginLeft: isTablet ? 17 : 15,
    marginVertical: -6,
  },
  tripInfoRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: isTablet ? 10 : 8,
    padding: isTablet ? SPACING.md : SPACING.sm,
  },
  tripInfoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  tripInfoDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: isTablet ? SPACING.md : 10,
  },
  tripInfoLabel: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 4,
    fontWeight: '500',
  },
  tripInfoValue: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: isTablet ? SPACING.md : SPACING.sm + 2,
    borderRadius: isTablet ? 10 : 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  acceptButtonText: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.buttonText,
  },
  queueText: {
    textAlign: 'center',
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  loadingText: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.md,
    color: COLORS.sub,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
});

export default AmbulanceDriverDashboard;
