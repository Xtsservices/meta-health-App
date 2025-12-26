import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { getSocket } from '../socket/socket';

export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Request location permissions based on platform
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled through Info.plist
    // Geolocation will automatically request authorization when needed
    return true;
  }

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'Ambulance service needs access to your location to provide accurate pickup and tracking.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission granted');
        return true;
      } else {
        console.log('Location permission denied');
        return false;
      }
    } catch (err) {
      console.warn('Location permission error:', err);
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
