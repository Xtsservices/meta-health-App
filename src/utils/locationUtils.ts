import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { getSocket } from '../socket/socket';
import BackgroundService from 'react-native-background-actions';

export interface Location {
  latitude: number;
  longitude: number;
}


const sleep = (time: number) =>
  new Promise<void>(resolve => setTimeout(resolve, time));

let backgroundWatchId: number | null = null;
let lastEmitTime = 0; // Track last emission time for throttling

const backgroundTask = async (taskData?: { driverId: string , ambulanceID: string }) => {
  const driverId = taskData?.driverId;
  const ambulanceID = taskData?.ambulanceID;

  if (!driverId) {
    console.error('backgroundTask: Missing driverId in task parameters');
    return;
  }

  console.log('🚑 Background location tracking started for driver:', driverId);

  try {
    // Set up continuous location watching
    backgroundWatchId = Geolocation.watchPosition(
      position => {
        try {
          // ⏱️ THROTTLE: Only emit every 10 seconds
          const now = Date.now();
          if (now - lastEmitTime < 10000) {
            console.log('⏭️ Skipping update (throttled), next in:', Math.ceil((10000 - (now - lastEmitTime)) / 1000), 'seconds');
            return; // Skip if less than 10 seconds since last emit
          }
          lastEmitTime = now;

          const socket = getSocket();
          
          if (socket && socket.connected) {
            const locationData = {
              driverId,
              ambulanceID,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            };
            
            // Emit continuous live location update
            socket.emit('location-update', locationData);
            console.log('📍 Location update emitted:', {
              driverId,
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6),
              accuracy: position.coords.accuracy?.toFixed(2),
              speed: position.coords.speed?.toFixed(2),
            });
          } else {
            console.warn('⚠️ Socket not connected, skipping location update');
          }
        } catch (err) {
          console.error('❌ Error emitting location update:', err);
        }
      },
      error => {
        console.error('❌ Background location error:', error.code, error.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 0, // Update even when stationary (0 = no filter)
        interval: 5000, // Update every 5 seconds (Android)
        fastestInterval: 5000, // Minimum 5 seconds between updates
        timeout: 15000,
        maximumAge: 5000,
        useSignificantChanges: false, // Disable significant changes only mode
      },
    );

    // Keep the background task alive
    while (BackgroundService.isRunning()) {
      await sleep(10000); // Check every 10 seconds
      console.log('🔄 Background service still running...');
    }
  } catch (error) {
    console.error('❌ Fatal error in background task:', error);
  } finally {
    // Clean up when service stops
    if (backgroundWatchId !== null) {
      Geolocation.clearWatch(backgroundWatchId);
      backgroundWatchId = null;
      console.log('🛑 Location watching stopped');
    }
  }
};

export const startLocationTracking = async (driverId: string, ambulanceID: string) => {
  console.log('🚀 Starting location tracking for driver:', driverId);
  
  try {
    // Check if already running
    if (BackgroundService.isRunning()) {
      console.log('⚠️ Background service already running');
      return;
    }

    await BackgroundService.start(backgroundTask, {
      taskName: 'Ambulance Tracking',
      taskTitle: 'Ambulance tracking active',
      taskDesc: 'Sharing live location',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      parameters: { driverId, ambulanceID },
      linkingURI: 'metahealthapp://', // Deep link for notification tap
      progressBar: {
        max: 100,
        value: 0,
        indeterminate: true,
      },
    });
    console.log('✅ Background service started successfully');
  } catch (error: any) {
    console.error('❌ Failed to start background service:', error?.message || error);
    throw error;
  }
};

export const stopLocationTracking = async () => {
  console.log('🛑 Stopping location tracking...');
  
  try {
    // Clear the watch before stopping the service
    if (backgroundWatchId !== null) {
      Geolocation.clearWatch(backgroundWatchId);
      backgroundWatchId = null;
      console.log('✅ Location watch cleared');
    }
    
    await BackgroundService.stop();
    console.log('✅ Background service stopped successfully');
  } catch (error) {
    console.error('❌ Error stopping background service:', error);
    throw error;
  }
};

/**
 * Check if background tracking is currently running
 */
export const isLocationTrackingActive = (): boolean => {
  return BackgroundService.isRunning();
};








/**
 * Request location permissions based on platform
 */

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS permissions handled via Info.plist
    // Must set: NSLocationAlwaysAndWhenInUseUsageDescription
    return true;
  }

  if (Platform.OS === 'android') {
    try {
      // 1️⃣ Foreground location
      const fineLocationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'Ambulance service needs access to your location to provide live tracking.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        },
      );

      if (fineLocationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Fine location denied');
        return false;
      }

      // 2️⃣ Background location (Android 10+)
      if (Platform.Version >= 29) {
        const backgroundGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location Permission',
            message:
              'Allow background location to track ambulance even when app is minimized.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );

        if (backgroundGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Required',
            'Background location is required for continuous ambulance tracking.',
          );
          return false;
        }
      }

      // 3️⃣ Notification permission (Android 13+)
      if (Platform.Version >= 33) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }

      console.log('All required location permissions granted');
      return true;
    } catch (error) {
      console.warn('Location permission error:', error);
      return false;
    }
  }

  return false;
};


/**
 * Check if location permissions are granted
 */
export const checkLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted;
    } catch (err) {
      console.warn('Error checking location permission:', err);
      return false;
    }
  }

  // For iOS, we'll try to get current position to check
  return true;
};

/**
 * Get current location
 */
export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    // First try with high accuracy
    Geolocation.getCurrentPosition(
      position => {
        console.log('Got location:', position.coords);
        //here we need to socket io emit this coords
        const socket = getSocket();
        console.log("socketboom", socket);
        if (socket && socket.connected) {
          console.log("Emitting location update==================", { ...position.coords });
          socket.emit("location-update", {
            ...position.coords,
          });
        }
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => {
        console.warn('High accuracy location error:', error);
        // If high accuracy fails, try with low accuracy
        Geolocation.getCurrentPosition(
          position => {
            console.log('Got location (low accuracy):', position.coords);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          error2 => {
            console.error('All location attempts failed:', error2);
            reject(error2);
          },
          {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 60000,
          },
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    );
  });
};

/**
 * Request location permission with user-friendly alerts
 */
export const ensureLocationPermission = async (): Promise<boolean> => {
  // Check if permission is already granted
  const hasPermission = await checkLocationPermission();

  if (hasPermission) {
    return true;
  }

  // Request permission
  const granted = await requestLocationPermission();

  if (!granted) {
    Alert.alert(
      'Location Permission Required',
      'Please enable location services to use the ambulance booking feature.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ],
    );
    return false;
  }

  return true;
};

/**
 * Watch user location for real-time tracking
 */
export const watchLocation = (
  onLocationUpdate: (location: Location) => void,
  onError?: (error: any) => void,
): number => {
  const watchId = Geolocation.watchPosition(
    position => {
      onLocationUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    error => {
      console.warn('Error watching location:', error);
      if (onError) {
        onError(error);
      }
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10, // Update every 10 meters
      interval: 5000, // Update every 5 seconds
      fastestInterval: 2000,
    },
  );

  return watchId;
};

/**
 * Stop watching location
 */
export const stopWatchingLocation = (watchId: number): void => {
  Geolocation.clearWatch(watchId);
};

/**
 * Calculate distance between two coordinates (in kilometers)
 */
export const calculateDistance = (from: Location, to: Location): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};
