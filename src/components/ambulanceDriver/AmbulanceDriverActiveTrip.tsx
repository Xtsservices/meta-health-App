import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store/store';
import { AuthFetch, AuthPost } from '../../auth/auth';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import { 
  reverseGeocode, 
  calculateDistance, 
  calculateEstimatedTime,
  formatDistance,
  getCurrentLocation
} from '../../utils/locationUtils';
import {
  getDirections,
  DirectionsResult,
  RouteCoordinates,
} from '../../utils/directionsUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.7; // 70% of screen width

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  white: '#ffffff',
  black: '#000000',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
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

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Swipe Button Component
const SwipeButton: React.FC<{
  onSwipeSuccess: () => void;
  disabled?: boolean;
}> = ({ onSwipeSuccess, disabled = false }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx <= SWIPE_THRESHOLD) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: SWIPE_THRESHOLD,
            useNativeDriver: true,
          }).start(() => {
            onSwipeSuccess();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeBackground}>
        <Text style={styles.swipeBackgroundText}>
          Swipe to confirm arrival →
        </Text>
      </View>
      <Animated.View
        style={[
          styles.swipeButton,
          { transform: [{ translateX }] },
          disabled && styles.swipeButtonDisabled,
        ]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.swipeButtonText}>→</Text>
      </Animated.View>
    </View>
  );
};

const AmbulanceDriverActiveTrip: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.currentUser);
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(false);
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [arrivedLoading, setArrivedLoading] = useState(false);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [showSwipeButton, setShowSwipeButton] = useState(false);
  const [topCardCollapsed, setTopCardCollapsed] = useState(false);
  const [bottomCardCollapsed, setBottomCardCollapsed] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinates[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const lastCameraUpdate = useRef<{latitude: number; longitude: number} | null>(null);
  const [userInteractingWithMap, setUserInteractingWithMap] = useState(false);

  // Check if trip data was passed from navigation (when accepting a trip)
  useEffect(() => {
    if (route.params?.tripData) {
      setActiveTrip(route.params.tripData);
    }
  }, [route.params]);

  // Track current location with higher frequency
  useEffect(() => {
    const updateCurrentLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        
        // Update map region to show current location
        if (!mapRegion && location) {
          setMapRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } catch (error) {
        console.error('Error getting current location:', error);
      }
    };

    updateCurrentLocation();
    // Update every 5 seconds for stable tracking (not too frequent to avoid jitter)
    const intervalId = setInterval(updateCurrentLocation, 5000);

    return () => clearInterval(intervalId);
  }, [mapRegion]);

  // Check distance to pickup location and enable swipe button
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkDistanceToPickup = async () => {
      if (!activeTrip || activeTrip.status !== 'accepted') return;
      if (!activeTrip.pickupLatitude || !activeTrip.pickupLongitude) return;

      try {
        const location = await getCurrentLocation();
        const distance = calculateDistance(
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: activeTrip.pickupLatitude, longitude: activeTrip.pickupLongitude }
        );
        setDistanceToPickup(distance);
        
        // Show swipe button when within 200 meters of pickup
        setShowSwipeButton(distance <= 0.2);
        
        console.log(`Distance to pickup: ${distance.toFixed(2)} km`);
      } catch (error) {
        console.error('Error checking distance to pickup:', error);
      }
    };

    if (activeTrip?.status === 'accepted') {
      checkDistanceToPickup();
      // Check every 10 seconds
      intervalId = setInterval(checkDistanceToPickup, 10000);
    } else {
      setShowSwipeButton(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTrip]);

  // Fetch active trip data from API
  const fetchActiveTrip = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.id) {
        console.log('No token or user ID');
        return;
      }

      const response: any = await AuthFetch(`ambulance/driver/activeBooking`, token);

      console.log("activeBooking response", response);

      // Handle nested data structure
      const bookingData = response?.data?.booking || response?.booking;
      
      if (bookingData) {
        const booking = bookingData;
        
        // Parse pickup and drop coordinates from API
        const pickupLat = parseFloat(booking.fromLatitude);
        const pickupLon = parseFloat(booking.fromLongitude);
        const dropLat = parseFloat(booking.toLatitude);
        const dropLon = parseFloat(booking.toLongitude);
        
        // Calculate straight-line distance for priority
        const distanceKm = calculateDistance(
          { latitude: pickupLat, longitude: pickupLon },
          { latitude: dropLat, longitude: dropLon }
        );

        // Get addresses using reverse geocoding
        const [pickupAddress, dropAddress] = await Promise.all([
          reverseGeocode(booking.fromLatitude, booking.fromLongitude),
          reverseGeocode(booking.toLatitude, booking.toLongitude),
        ]);

        // Format trip data
        const tripData: TripData = {
          id: booking.id,
          patientName: `Patient #${booking.patientUserID}`,
          patientPhone: undefined,
          pickupAddress,
          dropAddress,
          distance: formatDistance(distanceKm),
          estimatedTime: calculateEstimatedTime(distanceKm),
          priority: distanceKm > 15 ? 'High' : distanceKm > 5 ? 'Medium' : 'Low',
          status: booking.status,
          requestTime: booking.requestedAt,
          pickupLatitude: pickupLat,
          pickupLongitude: pickupLon,
          dropLatitude: dropLat,
          dropLongitude: dropLon,
        };

        setActiveTrip(tripData);
      } else {
        // No active trip
        setActiveTrip(null);
        setRouteCoordinates([]);
      }
    } catch (error: any) {
      console.error('Error fetching active trip:', error);
      // Check if error means no active booking
      if (error?.message?.includes('No active booking')) {
        setActiveTrip(null);
        setRouteCoordinates([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch active trip when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchActiveTrip();
    }, [fetchActiveTrip])
  );

  // Fetch route from Google Directions API when trip changes or location updates
  useEffect(() => {
    const fetchRoute = async () => {
      if (!activeTrip || !currentLocation) return;

      try {
        setLoadingRoute(true);
        let origin = currentLocation;
        let destination;

        // When heading to pickup (accepted status)
        if (activeTrip.status === 'accepted' && activeTrip.pickupLatitude && activeTrip.pickupLongitude) {
          destination = {
            latitude: activeTrip.pickupLatitude,
            longitude: activeTrip.pickupLongitude,
          };
        }
        // When in journey (in_progress status)
        else if (activeTrip.status === 'in_progress' && activeTrip.dropLatitude && activeTrip.dropLongitude) {
          destination = {
            latitude: activeTrip.dropLatitude,
            longitude: activeTrip.dropLongitude,
          };
        } else {
          setRouteCoordinates([]);
          return;
        }

        console.log('🗺️ Fetching route from current location to destination...');
        const directionsResult: DirectionsResult = await getDirections(origin, destination);
        
        // Remove the first coordinate if it's too close to current location (< 5 meters)
        // This prevents duplicate points at the start
        let cleanedCoordinates = directionsResult.coordinates;
        if (cleanedCoordinates.length > 0) {
          const firstPoint = cleanedCoordinates[0];
          const distanceToFirst = Math.sqrt(
            Math.pow(firstPoint.latitude - origin.latitude, 2) +
            Math.pow(firstPoint.longitude - origin.longitude, 2)
          );
          // If first point is very close to origin (< 0.00005 degrees ≈ 5 meters), remove it
          if (distanceToFirst < 0.00005) {
            cleanedCoordinates = cleanedCoordinates.slice(1);
          }
        }
        
        setRouteCoordinates(cleanedCoordinates);
        console.log(`✅ Route loaded with ${cleanedCoordinates.length} waypoints`);
        console.log(`📊 Distance: ${directionsResult.distance}, Duration: ${directionsResult.duration}`);
        
        // Update trip data with accurate distance and time from Google
        if (activeTrip) {
          setActiveTrip({
            ...activeTrip,
            distance: directionsResult.distance,
            estimatedTime: directionsResult.duration,
          });
        }
      } catch (error) {
        console.error('❌ Error fetching route:', error);
        // Fallback to straight line if route fetch fails
        setRouteCoordinates([]);
      } finally {
        setLoadingRoute(false);
      }
    };

    // Fetch route initially and when location changes significantly
    fetchRoute();

    // Refresh route every 30 seconds to update based on traffic and location changes
    const routeRefreshInterval = setInterval(fetchRoute, 30000);

    return () => clearInterval(routeRefreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.status, activeTrip?.pickupLatitude, activeTrip?.pickupLongitude, activeTrip?.dropLatitude, activeTrip?.dropLongitude, currentLocation]);

  // Single unified map control - handles initial centering and live tracking
  useEffect(() => {
    if (!mapRef.current || !activeTrip || !currentLocation) return;
    
    // Don't auto-move map if user is manually interacting with it
    if (userInteractingWithMap) return;

    // Check if location has changed significantly (more than ~10 meters)
    const hasLocationChangedSignificantly = () => {
      if (!lastCameraUpdate.current) return true;
      
      const latDiff = Math.abs(currentLocation.latitude - lastCameraUpdate.current.latitude);
      const lngDiff = Math.abs(currentLocation.longitude - lastCameraUpdate.current.longitude);
      
      // ~0.0001 degrees = ~11 meters
      return latDiff > 0.0001 || lngDiff > 0.0001;
    };

    // Only fit to coordinates on first load (when trip first becomes active)
    const isInitialLoad = !mapRegion;
    
    if (isInitialLoad) {
      // Initial load: fit all points in view
      const coordinates = [
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
      ];
      
      if (activeTrip.pickupLatitude && activeTrip.pickupLongitude) {
        coordinates.push({
          latitude: activeTrip.pickupLatitude,
          longitude: activeTrip.pickupLongitude,
        });
      }
      
      if (activeTrip.dropLatitude && activeTrip.dropLongitude) {
        coordinates.push({
          latitude: activeTrip.dropLatitude,
          longitude: activeTrip.dropLongitude,
        });
      }

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
        lastCameraUpdate.current = currentLocation;
      }, 500);
    } else if (hasLocationChangedSignificantly()) {
      // During active tracking: smoothly follow ambulance only if moved significantly
      if (activeTrip.status === 'accepted' || activeTrip.status === 'in_progress') {
        mapRef.current.animateCamera({
          center: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          zoom: 15, // Moderate zoom for navigation
        }, { duration: 2000 }); // Slower animation for smoother movement
        
        lastCameraUpdate.current = currentLocation;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation?.latitude, currentLocation?.longitude, activeTrip?.id, userInteractingWithMap]);

  // Swipe button success handler - Mark driver as arrived
  const handleSwipeConfirm = async () => {
    if (!activeTrip) return;

    Alert.alert(
      'Confirm Arrival',
      'Have you reached the pickup location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I\'ve Arrived',
          onPress: async () => {
            try {
              setArrivedLoading(true);
              const token = await AsyncStorage.getItem('token');
              console.log("activeTrip",activeTrip)
              const response: any = await AuthPost(
                `ambulance/driver/bookings/${activeTrip.id}/arrived`,
                {},
                token
              );

              console.log('Arrived response:', response);

              if (response?.status === 'success' || (response as any)?.message?.includes('arrived')) {
                Alert.alert('Success', 'Arrival confirmed! Please collect the OTP from the patient.');
                // Update local state
                setActiveTrip({ ...activeTrip, status: 'arrived' });
                // Show OTP modal
                setOtpModalVisible(true);
              } else {
                throw new Error((response as any)?.message || 'Failed to mark arrival');
              }
            } catch (error: any) {
              console.log('Arrival error:', error);
              Alert.alert('Error', error?.message || 'Failed to mark arrival. Please try again.');
            } finally {
              setArrivedLoading(false);
            }
          },
        },
      ]
    );
  };

  // Verify OTP to start journey
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter a valid OTP.');
      return;
    }

    try {
      setOtpLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      const response: any = await AuthPost(
        `ambulance/driver/bookings/${activeTrip?.id}/verifyOtp`,
        { otp },
        token
      );

      console.log('OTP verification response:', response);

      if (response?.status === 'success' || (response as any)?.message?.includes('verified')) {
        setOtpModalVisible(false);
        setOtp('');
        Alert.alert('Success', 'OTP verified! Journey started.');
        // Update local state to in_progress
        if (activeTrip) {
          setActiveTrip({ ...activeTrip, status: 'in_progress' });
        }
        
        // Zoom to current location after OTP verification
        if (currentLocation && mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.005, // Very zoomed in
            longitudeDelta: 0.005,
          }, 1000);
        }
      } else {
        throw new Error((response as any)?.message || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', error?.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
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
              setLoading(true);
              const token = await AsyncStorage.getItem('token');
              
              // TODO: Replace with actual complete trip endpoint
              const response = await AuthPost(
                `ambulance/driver/bookings/${activeTrip.id}/complete`,
                {},
                token
              );

              console.log('Complete trip response:', response);
              
              Alert.alert('Success', 'Trip completed successfully!');
              setActiveTrip(null);
              navigation.navigate('AmbulanceDriverDashboard');
            } catch (error: any) {
              console.error('Complete trip error:', error);
              Alert.alert('Error', error?.message || 'Failed to complete trip. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Determine if driver is close enough to pickup location (within 200 meters)
  const isNearPickup = distanceToPickup !== null && distanceToPickup <= 0.2; // 200 meters

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
      {/* Map View */}
      {activeTrip && mapRegion && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={mapRegion}
            showsUserLocation={false}
            showsMyLocationButton={true}
            followsUserLocation={false}
            showsTraffic={true}
            loadingEnabled={true}
            onTouchStart={() => setUserInteractingWithMap(true)}
            onTouchEnd={() => {
              // Re-enable auto-tracking after 10 seconds of no interaction
              setTimeout(() => setUserInteractingWithMap(false), 10000);
            }}
            onPanDrag={() => setUserInteractingWithMap(true)}
          >
            {/* Custom Ambulance Marker for current location - Always show during active trip */}
            {currentLocation && (
              <Marker
                coordinate={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                title="Your Location (Live)"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.ambulanceMarker}>
                  <Text style={styles.ambulanceIcon}>🚑</Text>
                </View>
              </Marker>
            )}

            {/* Pickup Marker */}
            {activeTrip.pickupLatitude && activeTrip.pickupLongitude && activeTrip.status === 'accepted' && (
              <Marker
                coordinate={{
                  latitude: activeTrip.pickupLatitude,
                  longitude: activeTrip.pickupLongitude,
                }}
                title="Pickup Location"
                description={activeTrip.pickupAddress}
                pinColor={COLORS.success}
              />
            )}

            {/* Drop Marker */}
            {activeTrip.dropLatitude && activeTrip.dropLongitude && activeTrip.status === 'in_progress' && (
              <Marker
                coordinate={{
                  latitude: activeTrip.dropLatitude,
                  longitude: activeTrip.dropLongitude,
                }}
                title="Drop Location"
                description={activeTrip.dropAddress}
                pinColor={COLORS.error}
              />
            )}

            {/* Road-based Route Polyline from Google Directions */}
            {routeCoordinates.length > 0 && currentLocation && (
              <>
                {/* Outer glow/shadow effect for better visibility */}
                <Polyline
                  coordinates={[
                    { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                    ...routeCoordinates,
                  ]}
                  strokeColor={activeTrip.status === 'accepted' ? COLORS.primary + '40' : COLORS.success + '40'}
                  strokeWidth={10}
                  lineCap="round"
                  lineJoin="round"
                  geodesic={true}
                />
                
                {/* Main route polyline with proper joining */}
                <Polyline
                  coordinates={[
                    // Start from current ambulance location
                    { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                    // Include all route waypoints from Google Directions
                    ...routeCoordinates,
                  ]}
                  strokeColor={activeTrip.status === 'accepted' ? COLORS.primary : COLORS.success}
                  strokeWidth={6}
                  lineCap="round"
                  lineJoin="round"
                  geodesic={true}
                />
                
                {/* Optional: Add small markers at regular intervals for visual feedback */}
                {routeCoordinates
                  .filter((_, index) => index % 20 === 0 && index > 0) // Every 20th point
                  .map((coord, index) => (
                    <Marker
                      key={`route-point-${index}`}
                      coordinate={coord}
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                      <View style={styles.routePointMarker}>
                        <View style={styles.routePointDot} />
                      </View>
                    </Marker>
                  ))
                }
              </>
            )}
            
            {/* Loading indicator for route - dashed line while fetching */}
            {loadingRoute && routeCoordinates.length === 0 && currentLocation && activeTrip.pickupLatitude && activeTrip.pickupLongitude && (
              <Polyline
                coordinates={[
                  { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                  { latitude: activeTrip.pickupLatitude, longitude: activeTrip.pickupLongitude },
                ]}
                strokeColor={COLORS.gray}
                strokeWidth={3}
                lineDashPattern={[10, 5]}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </MapView>

          {/* Re-center button - appears when user manually moves map */}
          {userInteractingWithMap && (
            <TouchableOpacity
              style={styles.recenterButton}
              onPress={() => {
                setUserInteractingWithMap(false);
                if (currentLocation && mapRef.current) {
                  mapRef.current.animateCamera({
                    center: currentLocation,
                    zoom: 15,
                  }, { duration: 1000 });
                }
              }}
            >
              <Text style={styles.recenterButtonText}>📍</Text>
              <Text style={styles.recenterButtonLabel}>Re-center</Text>
            </TouchableOpacity>
          )}

          {/* Floating Info Card with Collapse */}
          <View style={[
            styles.floatingInfoCard,
            topCardCollapsed && styles.floatingInfoCardCollapsed
          ]}>
            <View style={styles.floatingHeader}>
              <View style={styles.statusBadge}>
                <View style={[
                  styles.statusDot,
                  activeTrip.status === 'accepted' && { backgroundColor: COLORS.warning },
                  activeTrip.status === 'arrived' && { backgroundColor: COLORS.info },
                  activeTrip.status === 'in_progress' && { backgroundColor: COLORS.success },
                ]} />
                <Text style={styles.statusText}>
                  {activeTrip.status === 'accepted' && 'Heading to Pickup'}
                  {activeTrip.status === 'arrived' && 'Arrived at Pickup'}
                  {activeTrip.status === 'in_progress' && 'Journey in Progress'}
                </Text>
              </View>
              
              {/* Live Location Indicator */}
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              
              {/* Collapse/Expand Toggle Button */}
              <TouchableOpacity
                style={styles.collapseButton}
                onPress={() => setTopCardCollapsed(!topCardCollapsed)}
              >
                <Text style={styles.collapseButtonText}>
                  {topCardCollapsed ? '▼' : '▲'}
                </Text>
              </TouchableOpacity>
            </View>

            {!topCardCollapsed && (
              <>
                {activeTrip.priority && (
                  <View style={[
                    styles.priorityBadgeInline,
                    activeTrip.priority === 'High' && styles.priorityHigh,
                    activeTrip.priority === 'Medium' && styles.priorityMedium,
                  ]}>
                    <Text style={styles.priorityText}>{activeTrip.priority}</Text>
                  </View>
                )}

                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>👤 {activeTrip.patientName}</Text>
                  {activeTrip.distance && activeTrip.estimatedTime && (
                    <View style={styles.tripMetricsHorizontal}>
                      <Text style={styles.metricSmall}>📍 {activeTrip.distance}</Text>
                      <Text style={styles.metricSmall}>⏱️ {activeTrip.estimatedTime}</Text>
                    </View>
                  )}
                </View>

                {/* Show distance to pickup when heading to pickup */}
                {activeTrip.status === 'accepted' && distanceToPickup !== null && (
                  <View style={styles.distanceAlert}>
                    <Text style={styles.distanceAlertText}>
                      {formatDistance(distanceToPickup)} from pickup location
                    </Text>
                    {!isNearPickup && (
                      <Text style={styles.distanceAlertSubtext}>
                        Get within 200m to confirm arrival
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      )}

      {/* Bottom Action Panel with Collapse */}
      <View style={[
        styles.bottomPanel,
        bottomCardCollapsed && styles.bottomPanelCollapsed
      ]}>
        {/* Collapse/Expand Toggle Button */}
        <TouchableOpacity
          style={styles.bottomCollapseButton}
          onPress={() => setBottomCardCollapsed(!bottomCardCollapsed)}
        >
          <Text style={styles.bottomCollapseButtonText}>
            {bottomCardCollapsed ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {!bottomCardCollapsed && activeTrip && (
          <>
            {/* Status: accepted - Heading to Pickup */}
            {activeTrip.status === 'accepted' && (
              <>
                {showSwipeButton ? (
                  <View style={styles.swipeSection}>
                    <Text style={styles.swipeSectionTitle}>
                      You've arrived at pickup location! 🎉
                    </Text>
                    <SwipeButton
                      onSwipeSuccess={handleSwipeConfirm}
                      disabled={arrivedLoading}
                    />
                    {arrivedLoading && (
                      <ActivityIndicator style={styles.activityIndicator} color={COLORS.primary} />
                    )}
                  </View>
                ) : (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Navigate to Pickup Location</Text>
                    <Text style={styles.infoSectionText}>
                      Follow the map directions. Swipe button will appear when you reach.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Status: arrived - Waiting for OTP */}
            {activeTrip.status === 'arrived' && (
              <View style={styles.otpSection}>
                <Text style={styles.otpSectionTitle}>Ready to Start Journey</Text>
                <Text style={styles.otpSectionText}>
                  Please collect OTP from patient to begin
                </Text>
                <TouchableOpacity
                  style={styles.otpButton}
                  onPress={() => setOtpModalVisible(true)}
                >
                  <Text style={styles.otpButtonText}>🔐 Enter OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Status: in_progress - Journey to Destination */}
            {activeTrip.status === 'in_progress' && (
              <View style={styles.journeySection}>
                <Text style={styles.journeySectionTitle}>Journey in Progress 🚑</Text>
                <Text style={styles.journeySectionText}>
                  Navigating to {activeTrip.dropAddress}
                </Text>
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={handleCompleteTrip}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.completeButtonText}>✓ Complete Trip</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {!bottomCardCollapsed && !activeTrip && (
          <View style={styles.noTripSection}>
            <Text style={styles.noTripTitle}>No Active Trip</Text>
            <Text style={styles.noTripText}>
              Accept a trip from the dashboard to start
            </Text>
          </View>
        )}
      </View>

      {/* OTP Verification Modal */}
      <Modal
        visible={otpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter OTP</Text>
            <Text style={styles.modalSubtitle}>
              Please ask the patient for the OTP to start the journey
            </Text>

            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setOtpModalVisible(false);
                  setOtp('');
                }}
                disabled={otpLoading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonVerify]}
                onPress={handleVerifyOtp}
                disabled={otpLoading || otp.length < 4}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextVerify}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AmbulanceDriverFooter active="activeTrip" brandColor={COLORS.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  
  // Map Styles
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // Re-center Button
  recenterButton: {
    position: 'absolute',
    bottom: 350,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  recenterButtonText: {
    fontSize: 20,
    marginRight: 6,
  },
  recenterButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  
  // Floating Info Card on Map
  floatingInfoCard: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingInfoCardCollapsed: {
    paddingBottom: 12,
  },
  floatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  collapseButtonText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: 'bold',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.error,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  priorityBadgeInline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 4,
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
    color: COLORS.white,
  },
  patientInfo: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 12,
    marginTop: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  tripMetricsHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricSmall: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  distanceAlert: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  distanceAlertText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  distanceAlertSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  
  // Bottom Panel Styles
  bottomPanel: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 100,
    elevation: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    position: 'relative',
  },
  bottomPanelCollapsed: {
    paddingTop: 8,
    paddingBottom: 92,
  },
  bottomCollapseButton: {
    position: 'absolute',
    top: -16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  bottomCollapseButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  
  // Swipe Button Styles
  swipeSection: {
    alignItems: 'center',
  },
  swipeSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
    textAlign: 'center',
    marginBottom: 20,
  },
  swipeContainer: {
    width: SCREEN_WIDTH - 80,
    height: 60,
    backgroundColor: COLORS.success + '30',
    borderRadius: 30,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  swipeBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeBackgroundText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
  },
  swipeButton: {
    position: 'absolute',
    left: 0,
    width: 60,
    height: 60,
    backgroundColor: COLORS.success,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  swipeButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  swipeButtonText: {
    fontSize: 28,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  
  // Info Section Styles
  infoSection: {
    alignItems: 'center',
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  infoSectionText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // OTP Section Styles
  otpSection: {
    alignItems: 'center',
  },
  otpSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  otpSectionText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  otpButton: {
    backgroundColor: COLORS.info,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  otpButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // Journey Section Styles
  journeySection: {
    alignItems: 'center',
  },
  journeySectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 8,
  },
  journeySectionText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 12,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minWidth: 200,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // No Trip Section
  noTripSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noTripTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray,
    marginBottom: 8,
  },
  noTripText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.lightGray,
  },
  modalButtonVerify: {
    backgroundColor: COLORS.success,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  modalButtonTextVerify: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  activityIndicator: {
    marginTop: 10,
  },
  
  // Ambulance Marker Styles
  ambulanceMarker: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  ambulanceIcon: {
    fontSize: 28,
  },
  
  // Route Point Markers
  routePointMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  routePointDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
});

export default AmbulanceDriverActiveTrip;
