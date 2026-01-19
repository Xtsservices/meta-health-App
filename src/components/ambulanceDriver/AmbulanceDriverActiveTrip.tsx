import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store/store';
import { AuthFetch, AuthPost } from '../../auth/auth';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import {
  calculateDistance,
  calculateEstimatedTime,
  formatDistance,
  getCurrentLocation,
  getDistanceAndTime,
} from '../../utils/locationUtils';
import {
  getDirections,
  DirectionsResult,
  RouteCoordinates,
} from '../../utils/directionsUtils';
import { useSocket } from '../../socket/useSocket';
import { showError, showSuccess } from '../../store/toast.slice';

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
  bookingType?: string; // 'SOS' or 'NORMAL'
  destinationType?: string;
}

interface Hospital {
  placeID: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: string;
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
    }),
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
  // Cancel Trip Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.currentUser);
  const dispatch = useDispatch();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [arrivedLoading, setArrivedLoading] = useState(false);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const [distanceToPickupText, setDistanceToPickupText] = useState<string>('N/A');
  const [timeToPickupText, setTimeToPickupText] = useState<string>('N/A');
  const [distanceToDestinationText, setDistanceToDestinationText] = useState<string>('N/A');
  const [timeToDestinationText, setTimeToDestinationText] = useState<string>('N/A');
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [showSwipeButton, setShowSwipeButton] = useState(false);
  const [topCardCollapsed, setTopCardCollapsed] = useState(false);
  const [bottomCardCollapsed, setBottomCardCollapsed] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinates[]>(
    [],
  );
  const [loadingRoute, setLoadingRoute] = useState(false);
  const lastCameraUpdate = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [userInteractingWithMap, setUserInteractingWithMap] = useState(false);
  const [hospitalModalVisible, setHospitalModalVisible] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);

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
console.log('useEffect activeTrip', activeTrip);
    const checkDistanceToPickup = async () => {
      if (!activeTrip || activeTrip.status !== 'accepted') return;
      if (!activeTrip.pickupLatitude || !activeTrip.pickupLongitude) return;

      try {
        const location = await getCurrentLocation();
        console.log('Current location for distance check:', location);
        
        // Use Google Distance Matrix API for accurate distance and time
        const distanceData = await getDistanceAndTime({
          fromLat: location.latitude,
          fromLng: location.longitude,
          toLat: activeTrip.pickupLatitude,
          toLng: activeTrip.pickupLongitude,
        });
        
        console.log('Distance data from API:', distanceData);
        
        // Store formatted values from API
        setDistanceToPickupText(distanceData.distanceText);
        setTimeToPickupText(distanceData.durationText);
        
        // Convert meters to kilometers for comparison
        const distanceKm = distanceData.distanceMeters / 1000;
        setDistanceToPickup(distanceKm);
        console.log('Distance to pickup:', distanceKm, 'km');

        // Show swipe button when within 200 meters of pickup
        setShowSwipeButton(distanceKm <= 0.2);

        console.log(`Distance: ${distanceData.distanceText}, Time: ${distanceData.durationText}`);
      } catch (error) {
        console.error('Error checking distance to pickup:', error);
        // Fallback to simple calculation if API fails
        try {
          const location = await getCurrentLocation();
          const distance = calculateDistance(
            { latitude: location.latitude, longitude: location.longitude },
            {
              latitude: activeTrip.pickupLatitude,
              longitude: activeTrip.pickupLongitude,
            },
          );
          setDistanceToPickup(distance);
          setDistanceToPickupText(formatDistance(distance));
          setTimeToPickupText(calculateEstimatedTime(distance));
          setShowSwipeButton(distance <= 0.2);
        } catch (fallbackError) {
          console.error('Fallback distance calculation also failed:', fallbackError);
        }
      }
    };

    const checkDistanceToDestination = async () => {
      if (!activeTrip || activeTrip.status !== 'in_progress') return;
      if (!activeTrip.dropLatitude || !activeTrip.dropLongitude) return;

      try {
        const location = await getCurrentLocation();
        console.log('Current location for destination distance check:', location);
        
        // Use Google Distance Matrix API for accurate distance and time to destination
        const distanceData = await getDistanceAndTime({
          fromLat: location.latitude,
          fromLng: location.longitude,
          toLat: activeTrip.dropLatitude,
          toLng: activeTrip.dropLongitude,
        });
        
        console.log('Distance data to destination from API:', distanceData);
        
        // Store formatted values from API
        setDistanceToDestinationText(distanceData.distanceText);
        setTimeToDestinationText(distanceData.durationText);

        console.log(`Distance to destination: ${distanceData.distanceText}, Time: ${distanceData.durationText}`);
      } catch (error) {
        console.error('Error checking distance to destination:', error);
        // Fallback to simple calculation if API fails
        try {
          const location = await getCurrentLocation();
          const distance = calculateDistance(
            { latitude: location.latitude, longitude: location.longitude },
            {
              latitude: activeTrip.dropLatitude,
              longitude: activeTrip.dropLongitude,
            },
          );
          setDistanceToDestinationText(formatDistance(distance));
          setTimeToDestinationText(calculateEstimatedTime(distance));
        } catch (fallbackError) {
          console.error('Fallback destination distance calculation also failed:', fallbackError);
        }
      }
    };

    if (activeTrip?.status === 'accepted') {
      checkDistanceToPickup();
      // Check every 10 seconds
      intervalId = setInterval(checkDistanceToPickup, 10000);
    } else if (activeTrip?.status === 'in_progress') {
      checkDistanceToDestination();
      // Check every 10 seconds
      intervalId = setInterval(checkDistanceToDestination, 10000);
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

      const response: any = await AuthFetch(
        `ambulance/driver/activeBooking`,
        token,
      );

      console.log('activeBooking response', response);

      // Handle nested data structure
      const bookingData = response?.data?.booking || response?.booking;

      if (bookingData) {
        const booking = bookingData;

        // Parse pickup coordinates from API
        const pickupLat = parseFloat(booking.fromLatitude);
        const pickupLon = parseFloat(booking.fromLongitude);

        // Use addresses directly from API (no reverse geocoding needed)
        const pickupAddress = booking.fromAddress || 'Pickup location';
        const dropAddress = booking.toAddress || 'Hospital (To be selected)';

        // Check if destination is missing (no toAddress or coordinates)
        const isSOS = !booking.toAddress || !booking.toLatitude || !booking.toLongitude;

        let dropLat = null;
        let dropLon = null;
        let distanceKm = 0;

        if (!isSOS && booking.toLatitude && booking.toLongitude) {
          // Normal booking with destination
          dropLat = parseFloat(booking.toLatitude);
          dropLon = parseFloat(booking.toLongitude);

          // Calculate straight-line distance for priority
          distanceKm = calculateDistance(
            { latitude: pickupLat, longitude: pickupLon },
            { latitude: dropLat, longitude: dropLon },
          );
        }

        // Format trip data
        const tripData: TripData = {
          id: booking.id,
          patientName: `Patient #${booking.patientUserID}`,
          patientPhone: undefined,
          pickupAddress,
          dropAddress,
          distance: distanceKm > 0 ? formatDistance(distanceKm) : 'N/A',
          estimatedTime: distanceKm > 0 ? calculateEstimatedTime(distanceKm) : 'N/A',
          priority:
            distanceKm > 15 ? 'High' : distanceKm > 5 ? 'Medium' : 'Low',
          status: booking.status,
          requestTime: booking.requestedAt,
          pickupLatitude: pickupLat,
          pickupLongitude: pickupLon,
          dropLatitude: dropLat ?? undefined,
          dropLongitude: dropLon ?? undefined,
          bookingType: booking.bookingType,
          destinationType: booking.destinationType,
        };

        setActiveTrip(tripData);
      } else {
        // No active trip
        console.log('✅ No active booking found');
        setActiveTrip(null);
        setRouteCoordinates([]);
      }
    } catch (error: any) {
      console.error('Error fetching active trip:', error);
      // Check if error means no active booking
      if (error?.message?.includes('No active booking')) {
        console.log('✅ Confirmed: No active booking');
        setActiveTrip(null);
        setRouteCoordinates([]);
      }
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [user?.id]);

  // Fetch active trip when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchActiveTrip();
    }, [fetchActiveTrip]),
  );

  // Socket listener for SOS destination updates
  const { socket } = useSocket();
  
  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ Socket not available for SOS_DESTINATION_UPDATE listener');
      return;
    }

    console.log('🔌 Setting up SOS_DESTINATION_UPDATE listener');
    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);
    console.log('Active trip ID:', activeTrip?.id);

    const handleDestinationUpdate = (data: any) => {
      console.log('🔔 SOS_DESTINATION_UPDATE received:', data);
      console.log('Current booking ID:', activeTrip?.id);
      console.log('Updated booking ID:', data?.bookingId || data?.booking?.id);
      
      // Refresh the active trip to get updated destination information
      fetchActiveTrip();
    };

    // Listen for SOS destination updates
    socket.on('SOS_DESTINATION_UPDATE', handleDestinationUpdate);

    console.log('✅ Socket listener registered for SOS_DESTINATION_UPDATE');

    // Log all events for debugging (remove in production)
    const logAllEvents = (eventName: string, ...args: any[]) => {
      console.log(`📨 Socket event received: ${eventName}`, args);
    };
    
    // Temporary: Listen to all events to see what's coming through
    socket.onAny(logAllEvents);

    // Cleanup listener on unmount
    return () => {
      socket.off('SOS_DESTINATION_UPDATE', handleDestinationUpdate);
      socket.offAny(logAllEvents);
      console.log('🧹 Socket listener removed for SOS_DESTINATION_UPDATE');
    };
  }, [socket, fetchActiveTrip, activeTrip?.id]);

  // Fetch route from Google Directions API when trip changes or location updates
  useEffect(() => {
    const fetchRoute = async () => {
      if (!activeTrip || !currentLocation) return;

      try {
        setLoadingRoute(true);
        let origin = currentLocation;
        let destination;

        // When heading to pickup (accepted status)
        if (
          activeTrip.status === 'accepted' &&
          activeTrip.pickupLatitude &&
          activeTrip.pickupLongitude
        ) {
          destination = {
            latitude: activeTrip.pickupLatitude,
            longitude: activeTrip.pickupLongitude,
          };
        }
        // When in journey (in_progress status)
        else if (
          activeTrip.status === 'in_progress' &&
          activeTrip.dropLatitude &&
          activeTrip.dropLongitude
        ) {
          destination = {
            latitude: activeTrip.dropLatitude,
            longitude: activeTrip.dropLongitude,
          };
        } else {
          setRouteCoordinates([]);
          return;
        }

        console.log(
          '🗺️ Fetching route from current location to destination...',
        );
        const directionsResult: DirectionsResult = await getDirections(
          origin,
          destination,
        );

        // Remove the first coordinate if it's too close to current location (< 5 meters)
        // This prevents duplicate points at the start
        let cleanedCoordinates = directionsResult.coordinates;
        if (cleanedCoordinates.length > 0) {
          const firstPoint = cleanedCoordinates[0];
          const distanceToFirst = Math.sqrt(
            Math.pow(firstPoint.latitude - origin.latitude, 2) +
              Math.pow(firstPoint.longitude - origin.longitude, 2),
          );
          // If first point is very close to origin (< 0.00005 degrees ≈ 5 meters), remove it
          if (distanceToFirst < 0.00005) {
            cleanedCoordinates = cleanedCoordinates.slice(1);
          }
        }

        setRouteCoordinates(cleanedCoordinates);
        console.log(
          `✅ Route loaded with ${cleanedCoordinates.length} waypoints`,
        );
        console.log(
          `📊 Distance: ${directionsResult.distance}, Duration: ${directionsResult.duration}`,
        );

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
  }, [
    activeTrip?.status,
    activeTrip?.pickupLatitude,
    activeTrip?.pickupLongitude,
    activeTrip?.dropLatitude,
    activeTrip?.dropLongitude,
    currentLocation,
  ]);

  // Fetch nearby hospitals when modal opens
  const fetchNearbyHospitals = async () => {
    if (loadingHospitals || nearbyHospitals.length > 0) {
      // Don't fetch if already loading or already have hospitals
      return;
    }

    if (!activeTrip?.id) {
      console.warn('⚠️ No booking ID available to fetch hospitals');
      return;
    }

    try {
      setLoadingHospitals(true);
      console.log('🏥 Fetching nearby hospitals for booking:', activeTrip.id);
      const token = await AsyncStorage.getItem('token');

      const response: any = await AuthFetch(
        `ambulance/sosNearbyHospitals/${activeTrip.id}`,
        token,
      );

      console.log('🏥 Nearby hospitals response:', response);

      if (response && response?.data?.hospitals && Array.isArray(response?.data?.hospitals)) {
        setNearbyHospitals(response.data.hospitals);
        console.log(`✅ Loaded ${response.data.hospitals.length} nearby hospitals`);
      } else {
        console.warn('⚠️ No hospitals found in response');
        setNearbyHospitals([]);
      }
    } catch (error) {
      console.error('❌ Error fetching nearby hospitals:', error);
      setNearbyHospitals([]);
    } finally {
      setLoadingHospitals(false);
    }
  };

  // Single unified map control - handles initial centering and live tracking
  useEffect(() => {
    if (!mapRef.current || !activeTrip || !currentLocation) return;

    // Don't auto-move map if user is manually interacting with it
    if (userInteractingWithMap) return;

    // Check if location has changed significantly (more than ~10 meters)
    const hasLocationChangedSignificantly = () => {
      if (!lastCameraUpdate.current) return true;

      const latDiff = Math.abs(
        currentLocation.latitude - lastCameraUpdate.current.latitude,
      );
      const lngDiff = Math.abs(
        currentLocation.longitude - lastCameraUpdate.current.longitude,
      );

      // ~0.0001 degrees = ~11 meters
      return latDiff > 0.0001 || lngDiff > 0.0001;
    };

    // Only fit to coordinates on first load (when trip first becomes active)
    const isInitialLoad = !mapRegion;

    if (isInitialLoad) {
      // Initial load: fit all points in view
      const coordinates = [
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
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
        
        // After initial fit, zoom to road level view smoothly
        setTimeout(() => {
          mapRef.current?.animateCamera(
            {
              center: {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              },
              zoom: 18.5, // Road-level zoom like Google Maps
              pitch: 45, // 3D tilt for better road view
              heading: 0, // North-up initially
            },
            { duration: 2000 },
          );
        }, 1000);
      }, 500);
    } else if (hasLocationChangedSignificantly()) {
      // During active tracking: smoothly follow ambulance only if moved significantly
      if (
        activeTrip.status === 'accepted' ||
        activeTrip.status === 'in_progress'
      ) {
        // Google Maps style: Stay at constant zoom level with smooth camera movement
        mapRef.current.animateCamera(
          {
            center: {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            },
            zoom: 18.5, // Keep consistent road-level zoom (no blinking zoom in/out)
            pitch: 45, // Maintain 3D perspective
            heading: 0, // Can be updated with bearing if needed
          },
          { duration: 1500 }, // Smooth transition
        );

        lastCameraUpdate.current = currentLocation;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentLocation?.latitude,
    currentLocation?.longitude,
    activeTrip?.id,
    userInteractingWithMap,
  ]);

  // Swipe button success handler - Mark driver as arrived
  const handleSwipeConfirm = async () => {
    if (!activeTrip) return;

    try {
      setArrivedLoading(true);
      const token = await AsyncStorage.getItem('token');
      console.log('activeTrip', activeTrip);
      const response: any = await AuthPost(
        `ambulance/driver/bookings/${activeTrip.id}/arrived`,
        {},
        token,
      );

      console.log('Arrived response:', response);

      if (
        response?.status === 'success' ||
        (response as any)?.message?.includes('arrived')
      ) {
        dispatch(showSuccess('Arrival confirmed! Please collect the OTP from the patient.'));
        // Update local state
        setActiveTrip({ ...activeTrip, status: 'arrived' });
        // Show OTP modal
        setOtpModalVisible(true);
      } else {
        throw new Error(
          (response as any)?.message || 'Failed to mark arrival',
        );
      }
    } catch (error: any) {
      console.log('Arrival error:', error);
      dispatch(showError(error?.message || 'Failed to mark arrival. Please try again.'));
    } finally {
      setArrivedLoading(false);
    }
  };

  // Verify OTP to start journey
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      dispatch(showError('Please enter a valid OTP.'));
      return;
    }

    // Check if destination is set before starting journey
    if (!activeTrip?.dropLatitude || !activeTrip?.dropLongitude) {
      // Close modal first so error is visible
      setOtpModalVisible(false);
      setOtp('');
      // Show error after modal closes
      setTimeout(() => {
        dispatch(showError('Please select a destination hospital before starting the journey.'));
      }, 300);
      return;
    }

    try {
      setOtpLoading(true);
      const token = await AsyncStorage.getItem('token');

      const response: any = await AuthPost(
        `ambulance/driver/bookings/${activeTrip?.id}/verifyOtp`,
        { otp },
        token,
      );

      console.log('OTP verification response:', response);

      if (
        response?.status === 'success' ||
        (response as any)?.message?.includes('verified')
      ) {
        setOtpModalVisible(false);
        setOtp('');
        dispatch(showSuccess('OTP verified! Journey started.'));
        // Update local state to in_progress
        if (activeTrip) {
          setActiveTrip({ ...activeTrip, status: 'in_progress' });
        }

        // Zoom to current location after OTP verification
        if (currentLocation && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.003, // Road-level zoom (tighter delta)
              longitudeDelta: 0.003,
            },
            1000,
          );
          
          // Apply 3D camera view for better road navigation
          setTimeout(() => {
            mapRef.current?.animateCamera(
              {
                center: currentLocation,
                zoom: 18.5,
                pitch: 45,
                heading: 0,
              },
              { duration: 1000 },
            );
          }, 1000);
        }
      } else {
        throw new Error((response as any)?.message || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      dispatch(showError(error?.message || 'Failed to verify OTP. Please try again.'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      const response = await AuthPost(
        `ambulance/driver/bookings/${activeTrip.id}/complete`,
        {},
        token,
      );

      console.log('Complete trip response:', response);

      dispatch(showSuccess('Trip completed successfully!'));
      setActiveTrip(null);
      navigation.navigate('AmbulanceDriverDashboard');
    } catch (error: any) {
      console.error('Complete trip error:', error);
      dispatch(showError(error?.message || 'Failed to complete trip. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle hospital selection for SOS bookings
  const handleSelectHospital = async (hospital: Hospital) => {
    if (!activeTrip) return;

    // Show confirmation dialog
    Alert.alert(
      'Confirm Hospital Selection',
      `Set destination to:\n\n${hospital.name}\n${hospital.address}\n\nThis will notify the patient and cannot be easily changed.`,
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => {
            console.log('Hospital selection cancelled');
          }
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('token');

              console.log('📍 Sending destination to backend...');
              console.log('Hospital:', hospital.name);
              console.log('Booking ID:', activeTrip.id);

              const payload = {
                latitude: hospital.latitude,
                longitude: hospital.longitude,
                address: hospital.address,
              };

              console.log('📍 Payload:', payload);

              // Call API to update booking destination
              const response: any = await AuthPost(
                `ambulance/sosBooking/${activeTrip.id}/selectDestination`,
                payload,
                token,
              );

              console.log('✅ Destination confirmed response:', response);

              // Update local state with selected hospital
              setActiveTrip({
                ...activeTrip,
                dropLatitude: hospital.latitude,
                dropLongitude: hospital.longitude,
                dropAddress: hospital.address,
              });

              setSelectedHospital(hospital);
              setHospitalModalVisible(false);

              dispatch(showSuccess(`Hospital destination has been set to ${hospital.name}!`));
            } catch (error: any) {
              console.error('❌ Error confirming destination:', error);
              dispatch(showError(error?.message || 'Failed to set destination. Please try again.'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  
  // Show hospital selection only if destination address is missing and journey hasn't started
  const canSelectHospital = (!activeTrip?.dropAddress || activeTrip?.dropAddress === 'Hospital (To be selected)') && activeTrip?.status !== 'in_progress';
  const hasSelectedHospital = activeTrip?.dropLatitude && activeTrip?.dropLongitude;

  // Show loading only during initial fetch or when actively loading
  if (loading && !initialLoadComplete) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAmbulanceWrapper}>
            <Text style={styles.loadingAmbulance}>🚑</Text>
            <View style={styles.loadingPulse} />
          </View>
          <Text style={styles.loadingTitle}>Loading Trip</Text>
          <Text style={styles.loadingSubtitle}>Fetching trip details...</Text>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  // Show "No Active Trip" screen if initial load is complete but no trip found
  if (initialLoadComplete && !activeTrip) {
    return (
      <View style={styles.container}>
        <View style={styles.noActiveTripContainer}>
          <Text style={styles.noActiveTripEmoji}>🚑</Text>
          <Text style={styles.noActiveTripTitle}>No Active Trip</Text>
          <Text style={styles.noActiveTripSubtitle}>
            You don't have any active trips at the moment.
          </Text>
          <TouchableOpacity
            style={styles.noActiveTripButton}
            onPress={() => navigation.navigate('AmbulanceDriverDashboard')}
          >
            <Text style={styles.noActiveTripButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
        <AmbulanceDriverFooter active="activeTrip" brandColor={COLORS.primary} />
      </View>
    );
  }

  // Show loading if we have a trip but still waiting for location/map data
  if (activeTrip && (!mapRegion || !currentLocation)) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAmbulanceWrapper}>
            <Text style={styles.loadingAmbulance}>🚑</Text>
            <View style={styles.loadingPulse} />
          </View>
          <Text style={styles.loadingTitle}>Preparing Map</Text>
          <Text style={styles.loadingSubtitle}>
            {!currentLocation ? 'Getting your location...' : 'Loading map...'}
          </Text>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingSpinner} />
        </View>
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
            showsBuildings={true}
            showsIndoors={true}
            showsPointsOfInterests={true}
            loadingEnabled={true}
            pitchEnabled={true}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            zoomTapEnabled={true}
            zoomControlEnabled={true}
            mapType="standard"
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
            {activeTrip.pickupLatitude &&
              activeTrip.pickupLongitude &&
              activeTrip.status === 'accepted' && (
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
            {activeTrip.dropLatitude &&
              activeTrip.dropLongitude &&
              activeTrip.status === 'in_progress' && (
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
                    {
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    },
                    ...routeCoordinates,
                  ]}
                  strokeColor={
                    activeTrip.status === 'accepted'
                      ? COLORS.primary + '40'
                      : COLORS.success + '40'
                  }
                  strokeWidth={10}
                  lineCap="round"
                  lineJoin="round"
                  geodesic={true}
                />

                {/* Main route polyline with proper joining */}
                <Polyline
                  coordinates={[
                    // Start from current ambulance location
                    {
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    },
                    // Include all route waypoints from Google Directions
                    ...routeCoordinates,
                  ]}
                  strokeColor={
                    activeTrip.status === 'accepted'
                      ? COLORS.primary
                      : COLORS.success
                  }
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
                  ))}
              </>
            )}

            {/* Loading indicator for route - dashed line while fetching */}
            {loadingRoute &&
              routeCoordinates.length === 0 &&
              currentLocation &&
              activeTrip.pickupLatitude &&
              activeTrip.pickupLongitude && (
                <Polyline
                  coordinates={[
                    {
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    },
                    {
                      latitude: activeTrip.pickupLatitude,
                      longitude: activeTrip.pickupLongitude,
                    },
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
                  mapRef.current.animateCamera(
                    {
                      center: currentLocation,
                      zoom: 18.5, // Road-level zoom
                      pitch: 45, // 3D tilt
                      heading: 0,
                    },
                    { duration: 1000 },
                  );
                }
              }}
            >
              <Text style={styles.recenterButtonText}>📍</Text>
              <Text style={styles.recenterButtonLabel}>Re-center</Text>
            </TouchableOpacity>
          )}

          {/* Floating Info Card with Collapse */}
          <View
            style={[
              styles.floatingInfoCard,
              topCardCollapsed && styles.floatingInfoCardCollapsed,
            ]}
          >
            {/* Collapse/Expand Toggle Button - Top Right */}
            <TouchableOpacity
              style={styles.collapseButton}
              onPress={() => setTopCardCollapsed(!topCardCollapsed)}
            >
              <Text style={styles.collapseButtonText}>
                {topCardCollapsed ? '▼' : '▲'}
              </Text>
            </TouchableOpacity>

            {/* Status Header */}
            <View style={styles.floatingHeader}>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    activeTrip.status === 'accepted' && {
                      backgroundColor: COLORS.warning,
                    },
                    activeTrip.status === 'arrived' && {
                      backgroundColor: COLORS.info,
                    },
                    activeTrip.status === 'in_progress' && {
                      backgroundColor: COLORS.success,
                    },
                  ]}
                />
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
            </View>

            {!topCardCollapsed && (
              <>
                {/* SOS Booking - Hospital Selection */}
                {canSelectHospital && (
                  <View style={styles.sosAlertMain}>
                    <View style={styles.sosMainHeader}>
                      <View style={styles.sosIconCircle}>
                        <Text style={styles.sosMainEmoji}>🚨</Text>
                      </View>
                      <View style={styles.sosMainContent}>
                        <Text style={styles.sosMainTitle}>Emergency SOS</Text>
                        <Text style={styles.sosMainText}>
                          {hasSelectedHospital ? 'Destination selected' : 'Select destination hospital'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Show selected hospital if available */}
                    {hasSelectedHospital && selectedHospital && (
                      <View style={styles.selectedHospitalInfo}>
                        <View style={styles.selectedHospitalIcon}>
                          <Text style={styles.selectedHospitalEmoji}>🏥</Text>
                        </View>
                        <View style={styles.selectedHospitalDetails}>
                          <Text style={styles.selectedHospitalName}>
                            {selectedHospital.name}
                          </Text>
                          <Text style={styles.selectedHospitalAddress} numberOfLines={1}>
                            {selectedHospital.address}
                          </Text>
                        </View>
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.selectHospitalButtonMain}
                      onPress={() => {
                        setHospitalModalVisible(true);
                        fetchNearbyHospitals();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectHospitalTextMain}>
                        {hasSelectedHospital ? '🔄 Change Hospital' : '🏥 Choose Hospital'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Show distance to pickup when heading to pickup */}
                {activeTrip.status === 'accepted' &&
                  distanceToPickup !== null && (
                    <View style={styles.distanceAlertMain}>
                      <Text style={styles.distanceIcon}>📍</Text>
                      <View style={styles.distanceContent}>
                        <Text style={styles.distanceValue}>
                          {distanceToPickupText}
                        </Text>
                        <Text style={styles.distanceLabel}>to pickup • ETA: {timeToPickupText}</Text>
                      </View>
                    </View>
                  )}

                {/* Pickup and Drop Addresses */}
                <View style={styles.addressesContainer}>
                  <View style={styles.addressItem}>
                    <Text style={styles.addressLabel}>📍 Pickup</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {activeTrip.pickupAddress || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.addressItem}>
                    <Text style={styles.addressLabel}>🏁 Drop</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {activeTrip.dropAddress || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Show Distance and ETA during journey */}
                {activeTrip.status === 'in_progress' && (
                  <View style={styles.destinationDistanceContainer}>
                    <View style={styles.destinationDistanceItem}>
                      <Text style={styles.destinationDistanceLabel}>Distance</Text>
                      <Text style={styles.destinationDistanceValue}>
                        {distanceToDestinationText === 'N/A' ? 'Calculating...' : distanceToDestinationText}
                      </Text>
                    </View>
                    <View style={styles.destinationDistanceDivider} />
                    <View style={styles.destinationDistanceItem}>
                      <Text style={styles.destinationDistanceLabel}>ETA</Text>
                      <Text style={styles.destinationDistanceValue}>
                        {timeToDestinationText === 'N/A' ? 'Calculating...' : timeToDestinationText}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Cancel Trip Button */}
                {(activeTrip.status === 'accepted' || activeTrip.status === 'arrived') && (
                  <TouchableOpacity
                    onPress={() => setCancelModalVisible(true)}
                    style={styles.cancelTripButtonMain}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelTripTextMain}>✕ Cancel Trip</Text>
                  </TouchableOpacity>
                )}

              </>
            )}
          </View>
        </View>
      )}

      {/* Cancel Trip Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Trip</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for cancelling this trip
            </Text>
            <TextInput
              style={styles.cancelReasonInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Enter reason..."
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={3}
              maxLength={200}
              editable={!cancelLoading}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancelReason('');
                }}
                disabled={cancelLoading}
              >
                <Text style={styles.modalButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonVerify,
                  !cancelReason.trim() && styles.modalButtonVerifyDisabled,
                ]}
                onPress={async () => {
                  if (!cancelReason.trim()) return;
                  try {
                    setCancelLoading(true);
                    const token = await AsyncStorage.getItem('token');
                    const response = await AuthPost(
                      `ambulance/driver/bookings/${activeTrip?.id}/cancel`,
                      { reason: cancelReason.trim() },
                      token,
                    );
                    if (
                      response?.status === 'success' ||
                      (response as any)?.message?.includes(
                        'cancelled',
                      )
                    ) {
                      dispatch(showSuccess('The trip has been cancelled.'));
                      setActiveTrip(null);
                      setCancelModalVisible(false);
                      setCancelReason('');
                      navigation.navigate('AmbulanceDriverDashboard');
                    } else {
                      throw new Error(
                        (response as any)?.message ||
                          'Failed to cancel trip',
                      );
                    }
                  } catch (error: any) {
                    dispatch(showError(error?.message || 'Failed to cancel trip. Please try again.'));
                  } finally {
                    setCancelLoading(false);
                  }
                }}
                disabled={cancelLoading || !cancelReason.trim()}
              >
                {cancelLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextVerify}>
                    Cancel Trip
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Action Panel with Collapse */}
      <View
        style={[
          styles.bottomPanel,
          bottomCardCollapsed && styles.bottomPanelCollapsed,
        ]}
      >
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
                      <ActivityIndicator
                        style={styles.activityIndicator}
                        color={COLORS.primary}
                      />
                    )}
                  </View>
                ) : (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>
                      Navigate to Pickup Location
                    </Text>
                    <Text style={styles.infoSectionText}>
                      Follow the map directions. Swipe button will appear when
                      you reach.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Status: arrived - Waiting for OTP */}
            {activeTrip.status === 'arrived' && (
              <View style={styles.otpSection}>
                <Text style={styles.otpSectionTitle}>
                  Ready to Start Journey
                </Text>
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
                <Text style={styles.journeySectionTitle}>
                  Journey in Progress 🚑
                </Text>
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
                    <Text style={styles.completeButtonText}>
                      ✓ Complete Trip
                    </Text>
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

      {/* Hospital Selection Modal for SOS Bookings */}
      <Modal
        visible={hospitalModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHospitalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.hospitalModalContent}>
            {/* Modal Header */}
            <View style={styles.hospitalModalHeader}>
              <View style={styles.hospitalModalIcon}>
                <Text style={styles.hospitalModalEmoji}>🏥</Text>
              </View>
              <Text style={styles.hospitalModalTitle}>Select Hospital</Text>
              <Text style={styles.hospitalModalSubtitle}>
                Choose nearest emergency facility
              </Text>
            </View>

            {/* Hospital List */}
            <ScrollView 
              style={styles.hospitalListContainer}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.hospitalListContent}
            >
              {loadingHospitals ? (
                <View style={styles.hospitalLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.hospitalLoadingText}>Loading nearby hospitals...</Text>
                </View>
              ) : nearbyHospitals.length === 0 ? (
                <View style={styles.hospitalEmptyContainer}>
                  <Text style={styles.hospitalEmptyText}>No hospitals found nearby</Text>
                </View>
              ) : (
                nearbyHospitals.map((hospital) => (
                  <TouchableOpacity
                    key={hospital.placeID}
                    style={[
                      styles.hospitalCard,
                      selectedHospital?.placeID === hospital.placeID && styles.hospitalCardSelected,
                    ]}
                    onPress={() => handleSelectHospital(hospital)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.hospitalName}>{hospital.name}</Text>
                    <Text style={styles.hospitalAddress} numberOfLines={3}>
                      {hospital.address}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.hospitalModalCancelButton}
              onPress={() => setHospitalModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.hospitalModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              placeholderTextColor={"gray"}
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
  // Simplified Main Card Styles
  sosAlertMain: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.error + '08',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.error + '25',
  },
  sosMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sosIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sosMainEmoji: {
    fontSize: 24,
  },
  sosMainContent: {
    flex: 1,
  },
  sosMainTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 2,
  },
  sosMainText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  selectHospitalButtonMain: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  selectHospitalTextMain: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  selectedHospitalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  selectedHospitalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectedHospitalEmoji: {
    fontSize: 20,
  },
  selectedHospitalDetails: {
    flex: 1,
  },
  selectedHospitalName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  selectedHospitalAddress: {
    fontSize: 11,
    color: COLORS.gray,
  },

  // Distance Alert Simplified
  distanceAlertMain: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  distanceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  distanceContent: {
    flex: 1,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  distanceLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },

  // Addresses Container
  addressesContainer: {
    marginTop: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  addressItem: {
    gap: 6,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },

  // Cancel Trip Button Simplified
  cancelTripButtonMain: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  cancelTripTextMain: {
    color: COLORS.error,
    fontWeight: '700',
    fontSize: 15,
  },
  
  cancelReasonInput: {
    borderWidth: 2,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
    maxHeight: 120,
    marginBottom: 20,
    color: COLORS.black,
    backgroundColor: COLORS.white,
    textAlignVertical: 'top',
  },

  // Hospital Modal Redesign
  hospitalModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  hospitalModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  hospitalModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalModalEmoji: {
    fontSize: 32,
  },
  hospitalModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  hospitalModalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  hospitalListContainer: {
    maxHeight: 420,
    marginBottom: 12,
  },
  hospitalListContent: {
    paddingBottom: 8,
  },
  hospitalCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  hospitalCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 6,
  },
  hospitalAddress: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  hospitalModalCancelButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
  },
  hospitalModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
  },
  hospitalLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  hospitalEmptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalEmptyText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingAmbulanceWrapper: {
    position: 'relative',
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAmbulance: {
    fontSize: 80,
    zIndex: 2,
  },
  loadingPulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '30',
    zIndex: 1,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 24,
  },
  loadingSpinner: {
    marginTop: 8,
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
    borderRadius: 18,
    padding: 18,
    elevation: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  floatingInfoCardCollapsed: {
    paddingBottom: 18,
  },
  floatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  collapseButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  collapseButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginRight: 5,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
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
    marginBottom: 30,
  },
  bottomPanelCollapsed: {
    paddingTop: 8,
    paddingBottom: 92,
    marginBottom: 40,
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
    marginBottom: 16,
  },
  destinationDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
    gap: 20,
  },
  destinationDistanceItem: {
    alignItems: 'center',
  },
  destinationDistanceLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  destinationDistanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  destinationDistanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.gray + '40',
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
  modalButtonVerifyDisabled: {
    opacity: 0.5,
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
  
  // No Active Trip Screen Styles
  noActiveTripContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: COLORS.white,
  },
  noActiveTripEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  noActiveTripTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
    textAlign: 'center',
  },
  noActiveTripSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  noActiveTripButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  noActiveTripButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
