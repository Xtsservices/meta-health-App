import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { SPACING } from '../../utils/responsive';

type GpsSignalStrength = 'Strong' | 'Good' | 'Weak' | 'No Signal';

interface GpsStatus {
  strength: GpsSignalStrength;
  accuracy: number | null;
}

const getGpsSignalStrength = (accuracy: number | null): GpsStatus => {
  console.log('GPS Accuracy:', accuracy);
  if (accuracy === null) {
    return { strength: 'No Signal', accuracy: null };
  }
  // accuracy is in meters - lower is better
  if (accuracy <= 10) {
    return { strength: 'Strong', accuracy };
  } else if (accuracy <= 30) {
    return { strength: 'Good', accuracy };
  } else if (accuracy <= 100) {
    return { strength: 'Weak', accuracy };
  } else {
    return { strength: 'No Signal', accuracy };
  }
};

const getSignalColor = (strength: GpsSignalStrength): string => {
  switch (strength) {
    case 'Strong':
      return '#4CAF50'; // Green
    case 'Good':
      return '#8BC34A'; // Light Green
    case 'Weak':
      return '#FF9800'; // Orange
    case 'No Signal':
      return '#F44336'; // Red
    default:
      return '#999999';
  }
};

interface NoTripRequestsProps {
  isOnline: boolean;
}

const NoTripRequests: React.FC<NoTripRequestsProps> = ({ isOnline }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>({ strength: 'No Signal', accuracy: null });

  // GPS Signal monitoring
  useEffect(() => {
    let watchId: number | null = null;
console.log("isOnline",isOnline)
    if (isOnline) {
      // Start watching GPS position
      watchId = Geolocation.watchPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          console.log('GPS Position Accuracy:', accuracy);
          setGpsStatus(getGpsSignalStrength(accuracy));
        },
        (error) => {
          console.log('GPS Error:', error.message);
          setGpsStatus({ strength: 'No Signal', accuracy: null });
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 0,
          interval: 5000,
          fastestInterval: 2000,
        }
      );
    }

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [isOnline]);

  useEffect(() => {
    // Simple fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Gentle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, pulseAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header Section */}
      <View style={styles.header}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.icon}>🚑</Text>
        </Animated.View>
        
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, isOnline ? styles.statusDotOnline : styles.statusDotOffline]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Connecting...'}</Text>
        </View>

        <Text style={styles.title}>
          {isOnline ? 'Ready for Service' : 'Establishing Connection'}
        </Text>
        <Text style={styles.subtitle}>
          {isOnline ? 'No active trip requests at the moment' : 'Please wait while we connect...'}
        </Text>
      </View>

      {/* Info Cards */}
      {isOnline && (
        <View style={styles.cardsContainer}>
          <View style={styles.card}>
            <Text style={styles.cardIcon}>⚡</Text>
            <Text style={styles.cardLabel}>Avg Response</Text>
            <Text style={styles.cardValue}>{'< 60 sec'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardIcon}>🛰️</Text>
            <Text style={styles.cardLabel}>GPS Signal</Text>
            <Text style={[styles.cardValue, { color: getSignalColor(gpsStatus.strength) }]}>
              {gpsStatus.strength}
            </Text>
            {gpsStatus.accuracy !== null && (
              <Text style={styles.accuracyText}>±{Math.round(gpsStatus.accuracy)}m</Text>
            )}
          </View>

         
        </View>
      )}

      {/* Info Message */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          {isOnline 
            ? 'You will be notified when a new trip request is available.'
            : 'Connecting to dispatch network...'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: {
    fontSize: 50,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  statusDotOnline: {
    backgroundColor: '#4CAF50',
  },
  statusDotOffline: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999999',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  accuracyText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#999999',
    marginTop: 2,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#555555',
    lineHeight: 20,
  },
});

export default NoTripRequests;