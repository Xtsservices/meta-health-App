import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Marker } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ensureLocationPermission,
  getCurrentLocation,
  reverseGeocode,
} from '../../utils/locationUtils';

// Import your custom SVG icons — same as in AmbulanceFooter
import { MapPinIcon } from '../../utils/SvgIcons';

// If you don't have a dedicated Home icon, you can reuse LayoutDashboardIcon temporarily
// Or better: add a proper HomeIcon.svg and export it from SvgIcons.ts
import { LayoutDashboardIcon as HomeIcon ,UserHomeIcon} from '../../utils/SvgIcons'; // temporary fallback
import { AuthFetch } from '../../auth/auth';
import { useDispatch } from 'react-redux';
import { showError } from '../../store/toast.slice';

type Location = {
  latitude: number;
  longitude: number;
};

const DEFAULT_LOCATION: Location = {
  latitude: 17.4475,
  longitude: 78.3762,
};

const AmbulanceLocation: React.FC = () => {
  const navigation = useNavigation<any>();
   const dispatch = useDispatch();
  const route: any = useRoute();
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [_ambulancesLoading, setAmbulancesLoading] = useState(false);
  const [ambulances, setAmbulances] = useState<Array<any>>([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState<any | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [pendingAmbulance, setPendingAmbulance] = useState<any | null>(null);

  // Use shared reverseGeocode utility from locationUtils (supports caching & fallbacks)

  // When a new ambulance is selected, fetch its human-friendly location name
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!selectedAmbulance) return;
      const lat = Number(selectedAmbulance.lat);
      const lon = Number(selectedAmbulance.lon);
      if (!lat || !lon) {
        if (mounted) {
          setSelectedAddress(null);
          setAddressLoading(false);
        }
        return;
      }

  setAddressLoading(true);
  // reverseGeocode expects string inputs in the repo utilities
  const name = await reverseGeocode(String(lat), String(lon));
      if (!mounted) return;
      setSelectedAddress(name);
      setAddressLoading(false);
    };

    run();
    return () => {
      mounted = false;
    };
  }, [selectedAmbulance]);

  // If a marker was pressed, pendingAmbulance will be set — resolve address first
  useEffect(() => {
    let mounted = true;
    const resolvePending = async () => {
      if (!pendingAmbulance) return;
      const lat = Number(pendingAmbulance.lat);
      const lon = Number(pendingAmbulance.lon);
      if (!lat || !lon) {
        if (mounted) {
          setSelectedAddress(null);
          setAddressLoading(false);
          setSelectedAmbulance(pendingAmbulance);
          setPendingAmbulance(null);
        }
        return;
      }

      try {
        setAddressLoading(true);
        const addr = await reverseGeocode(String(lat), String(lon));
        if (!mounted) return;
        setSelectedAddress(addr);
        setSelectedAmbulance(pendingAmbulance);
      } catch (err) {
        console.error('Error resolving pending ambulance address:', err);
        if (mounted) {
          setSelectedAddress(null);
          setSelectedAmbulance(pendingAmbulance);
        }
      } finally {
        if (mounted) setAddressLoading(false);
        setPendingAmbulance(null);
      }
    };

    resolvePending();
    return () => { mounted = false; };
  }, [pendingAmbulance]);

  // Safe marker press handler (centralizes behavior)
  const handleMarkerPress = useCallback((a: any) => {
    try {
      if (!a) return;
      const lat = Number(a.lat);
      const lon = Number(a.lon);
      // If coords missing, show ambulance card without reverse-geocoding
      if (!lat || !lon) {
        setSelectedAddress(null);
        setAddressLoading(false);
        setSelectedAmbulance(a);
        setPendingAmbulance(null);
        return;
      }

      setPendingAmbulance(a);
      setSelectedAddress(null);
      setAddressLoading(true);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }
    } catch (err) {
      console.error('Error in handleMarkerPress:', err);
      setAddressLoading(false);
      setSelectedAmbulance(a);
      setPendingAmbulance(null);
    }
  }, []);

  const applyDefaultLocation = useCallback(() => {
    setCurrentLocation(DEFAULT_LOCATION);
    setLoading(false);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...DEFAULT_LOCATION,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
    }
  }, []);

  // Auto-focus is handled by initializeLocation and currentLocation updates

  const initializeLocation = useCallback(async () => {
    try {
      setLoading(true);

      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Location access is needed to show your position on the map.',
          [
            { text: 'Cancel', onPress: () => { applyDefaultLocation(); setLoading(false); } },
            { text: 'Retry', onPress: () => { setLoading(true); initializeLocation(); } },
          ]
        );
    return;
      }

      // Check whether device location services (GPS / network) are enabled
      const servicesEnabled = await (await import('../../utils/locationUtils')).isLocationServiceEnabled();
      if (!servicesEnabled) {
        Alert.alert(
          'Enable Location Services',
          'Device location services appear to be disabled. Please enable GPS/location services to get accurate positioning.',
          [
            { text: 'Retry', onPress: () => { setLoading(true); initializeLocation(); } },
          ]
        );
    setLoading(false);
        return;
      }

      const location = await getCurrentLocation();
      setCurrentLocation(location);

      if (mapRef.current && location) {
        mapRef.current.animateToRegion(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error getting location:', error);

      let message = 'Unable to get your location.';
      if (error.code === 1) message = 'Location permission denied.';
      if (error.code === 2) message = 'Location service is unavailable.';
      if (error.code === 3) message = 'Location request timed out.';

      Alert.alert('Location Error', message, [
    { text: 'Use Default', onPress: applyDefaultLocation },
        { text: 'Retry', onPress: initializeLocation },
      ]);
    }
  }, [applyDefaultLocation]);

  const fetchAmbulances = useCallback(async () => {
    try {
  setAmbulancesLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Authentication required'));
  setAmbulancesLoading(false);
        return;
      }

  // API returns an array of objects with keys: ambulance, driver, location, booking
  const res: any = await AuthFetch('ambulance/ambulanceOwner/ambulances', token);
  console.log('Fetched ambulances (raw):', res);
  if (res?.status === 'success' && Array.isArray(res?.data?.data)) {
        // Map API shape to internal marker shape used in this component
        const mapped = res.data.data.map((item: any) => {
          const amb = item.ambulance || {};
          const drv = item.driver || { name: '', phone: '' };
          const loc = item.location;
          const booking = item.booking;

          // Prefer live location if available, else fallback to booking pickup location if present
          let lat: number | null = null;
          let lon: number | null = null;
          if (loc && loc.latitude && loc.longitude) {
            lat = Number(loc.latitude);
            lon = Number(loc.longitude);
          } else if (booking && booking.pickup && booking.pickup.latitude && booking.pickup.longitude) {
            lat = Number(booking.pickup.latitude);
            lon = Number(booking.pickup.longitude);
          }

          const pickupStr = booking?.pickup?.address ?? (booking?.pickup ? `${booking.pickup.latitude || ''}, ${booking.pickup.longitude || ''}` : null);
          const dropStr = booking?.drop?.address ?? (booking?.drop ? `${booking.drop.latitude || ''}, ${booking.drop.longitude || ''}` : null);

          return {
            id: String(amb.id ?? amb.name ?? Math.random().toString(36).slice(2, 9)),
            name: amb.name ?? null,
            lat,
            lon,
            driver: { name: drv.name ?? '', phone: drv.phone ?? '' },
            status: amb.status ?? (loc && loc.status) ?? 'idle',
            pickup: pickupStr,
            drop: dropStr,
            raw: item,
          };
        })
        // filter out entries without coordinates so markers don't break
        .filter((m: any) => m.lat !== null && m.lon !== null);

        setAmbulances(mapped);
      } else {
        dispatch(showError(res?.message || 'Failed to fetch ambulances'));
      }
    } catch (error) {
      console.error('Error fetching ambulances:', error);
      dispatch(showError('Failed to fetch ambulances'));
    } finally {
  setAmbulancesLoading(false);
    }
  }, [dispatch]); 
  

  useEffect(() => {
    initializeLocation();
    fetchAmbulances();
  }, [initializeLocation, fetchAmbulances]);

  // If route passed explicit mark coordinates, add/center that marker
  useEffect(() => {
    const params = route?.params ?? {};
    const markLat = params.markLat;
    const markLon = params.markLon;
    const markId = params.markId ?? 'marked';

    if (markLat && markLon) {
      const markedAmb = {
        id: markId,
        name: params.name ?? 'Marked Ambulance',
        lat: Number(markLat),
        lon: Number(markLon),
        driver: { name: 'Marked Ambulance', phone: '' },
        status: 'active',
        pickup: params.pickup,
        drop: params.drop,
      };

      setAmbulances(prev => {
        // replace if exists else append
        const exists = prev.find(p => p.id === markId);
        if (exists) {
          return prev.map(p => (p.id === markId ? markedAmb : p));
        }
        return [...prev, markedAmb];
      });

      setSelectedAmbulance(markedAmb);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: Number(markLat),
          longitude: Number(markLon),
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      }
    }
  }, [route?.params]);

  // Dummy ambulance data for now; will replace with API later
  // No dummy data: ambulances are loaded from API in fetchAmbulances

  const goHome = () => {
    navigation.navigate('AmbulanceAdminDashboard');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20D9B6" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
  provider={PROVIDER_GOOGLE}
  style={styles.map}
  showsUserLocation={true}
  showsMyLocationButton={true}
        initialRegion={{
          latitude: currentLocation?.latitude ?? DEFAULT_LOCATION.latitude,
          longitude: currentLocation?.longitude ?? DEFAULT_LOCATION.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >

  {/* native user location dot will be used */}

        {/* Render ambulance markers as children so coordinates anchor correctly */}
        {ambulances.map(a => (
          a.status === 'active' ? (
            <Marker
              key={a.id}
              coordinate={{ latitude: Number(a.lat), longitude: Number(a.lon) }}
              onPress={() => handleMarkerPress(a)}
            >
              <View style={[styles.ambulanceMarker, styles.activeMarker]}>
                <Text style={styles.ambulanceMarkerText}>🚑</Text>
              </View>
            </Marker>
          ) : (
            <Marker
              key={a.id}
              coordinate={{ latitude: Number(a.lat), longitude: Number(a.lon) }}
              onPress={() => handleMarkerPress(a)}
            >
              <View style={[styles.ambulanceMarker, styles.idleMarker]}>
                <Text style={styles.ambulanceMarkerText}>🚑</Text>
              </View>
            </Marker>
          )
        ))}

      </MapView>

  {/* Auto-focus to current location is handled on init; manual button removed */}

      {/* Loading overlay while resolving pending ambulance address */}
      {addressLoading && pendingAmbulance && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Getting ambulance location...</Text>
          </View>
        </View>
      )}

      {/* Home Icon Button (top-right) - using your custom SVG style */}
      <TouchableOpacity
        style={[styles.iconButton, styles.homeButton]}
        onPress={goHome}
        activeOpacity={0.8}
      >
        <UserHomeIcon size={23} color="#fff" />
        <Text style={styles.iconButtonText}>Home</Text>
      </TouchableOpacity>

      {/* Selected ambulance info card */}
      {selectedAmbulance && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <MapPinIcon size={20} color="#fff" />
            <Text style={styles.infoTitle}>{selectedAmbulance?.name ?? selectedAmbulance?.id}</Text>
            <Text style={styles.infoStatus}>({selectedAmbulance?.status})</Text>
          </View>

          <Text style={styles.infoText}>Driver: {selectedAmbulance?.driver?.name ?? 'N/A'}</Text>
          <Text style={styles.infoText}>Phone: {selectedAmbulance?.driver?.phone ?? 'N/A'}</Text>

          {/* Show current location (reverse geocoded). While loading, show message */}
          {addressLoading ? (
            <Text style={styles.infoText}>Getting ambulance info...</Text>
          ) : selectedAddress ? (
            <Text style={styles.infoText}>Location: {selectedAddress}</Text>
          ) : null}

          {selectedAmbulance.status === 'active' && (
            <>
              <Text style={styles.infoText}>Pickup: {String(selectedAmbulance.pickup ?? 'N/A')}</Text>
              <Text style={styles.infoText}>Drop: {String(selectedAmbulance.drop ?? 'N/A')}</Text>
            </>
          )}

          <View style={styles.infoActions}>
            <TouchableOpacity onPress={() => setSelectedAmbulance(null)} style={styles.actionButton}>
              <Text style={styles.actionText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (mapRef.current) {
                  mapRef.current.animateToRegion({
                    latitude: selectedAmbulance.lat,
                    longitude: selectedAmbulance.lon,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }, 500);
                }
              }}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Center</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  iconButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#20D9B6',
    fontWeight: '500',
  },
  iconButton: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#20D9B6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  backButton: {
    top: 50,
    left: 20,
  },
  homeButton: {
    top: 50,
    right: 20,
  },
  myLocationMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#20D9B6',
  },
  myLocationInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#20D9B6',
  },
  infoCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 30,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    elevation: 10,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
  },
  infoStatus: {
    color: '#fff',
    marginLeft: 8,
  },
  infoText: {
    color: '#fff',
    marginTop: 8,
  },
  infoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    marginLeft: 12,
  },
  actionText: {
    color: '#fff',
  },
  ambulanceMarker: {
    backgroundColor: '#ff4d4f',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambulanceMarkerText: {
    fontSize: 18,
  },
  activeMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff4d4f',
  },
  idleMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#20D9B6',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  loadingBox: {
    padding: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default AmbulanceLocation;