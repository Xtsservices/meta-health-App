import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import { AuthFetch } from '../../auth/auth';
import { reverseGeocode } from '../../utils/locationUtils'; 

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
};

interface TripHistory {
  id: number;
  date: string;
  patientName: string;
  pickup: string;
  drop: string;
  distance: string;
  duration: string;
  status: 'completed' | 'cancelled';
}

const AmbulanceDriverHistory: React.FC = () => {
  const [history, setHistory] = useState<TripHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTrips, setTotalTrips] = useState(0);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response: any = await AuthFetch('ambulance/driver/history', token);

      console.log('History response:', response);

      if (response.status === 'success') {
        const bookings = response.data.bookings || [];

        // Sort by most recent first
        bookings.sort((a: any, b: any) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        );

        // Process each booking to get addresses via reverse geocoding
        const processedHistory: TripHistory[] = [];

        for (const booking of bookings) {
          const isCompleted = booking.status === 'completed';
          const isCancelled =
            booking.status.includes('cancelled') || booking.status === 'expired';

          const date = new Date(booking.requestedAt).toISOString().split('T')[0];

          let pickup = 'Fetching pickup address...';
          let drop = 'Fetching drop address...';

          // Only try to reverse geocode if coordinates exist
          if (booking.fromLatitude && booking.fromLongitude) {
            try {
              pickup = await reverseGeocode(booking.fromLatitude, booking.fromLongitude);
            } catch (err) {
              console.warn('Failed to reverse geocode pickup:', err);
              pickup = `Pickup: ${parseFloat(booking.fromLatitude).toFixed(4)}, ${parseFloat(booking.fromLongitude).toFixed(4)}`;
            }
          }

          if (booking.toLatitude && booking.toLongitude) {
            try {
              drop = await reverseGeocode(booking.toLatitude, booking.toLongitude);
            } catch (err) {
              console.warn('Failed to reverse geocode drop:', err);
              drop = `Drop: ${parseFloat(booking.toLatitude).toFixed(4)}, ${parseFloat(booking.toLongitude).toFixed(4)}`;
            }
          } else if (!booking.toLatitude) {
            drop = 'Drop location not specified';
          }

          // Placeholder for patient name (if available in future)
          const patientName = 'Patient'; // Update if backend provides patient name

          // Placeholder distance & duration (can be improved later with real calculation)
          const distance = isCompleted ? '—' : '-';
          const duration = isCompleted ? '—' : '-';

          processedHistory.push({
            id: booking.id,
            date,
            patientName,
            pickup,
            drop,
            distance,
            duration,
            status: isCompleted ? 'completed' : 'cancelled',
          });
        }

        setHistory(processedHistory);

        // Count completed trips
        const completedCount = processedHistory.filter(t => t.status === 'completed').length;
        setTotalTrips(completedCount);
      }
    } catch (error: any) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to load trip history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading trip history and addresses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trip History</Text>
        </View>

        {/* Stats Card - Only Total Completed Trips */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalTrips}</Text>
            <Text style={styles.statLabel}>Total Completed Trips</Text>
          </View>
        </View>

        <View style={styles.historyList}>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No trip history found</Text>
          ) : (
            history.map((trip) => (
              <View key={trip.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{trip.date}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      trip.status === 'completed'
                        ? styles.statusCompleted
                        : styles.statusCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: trip.status === 'completed' ? COLORS.success : COLORS.error },
                      ]}
                    >
                      {trip.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.patientName}>{trip.patientName}</Text>

                <View style={styles.locationRow}>
                  <View style={styles.locationDot} />
                  <Text style={styles.locationText} numberOfLines={2}>
                    {trip.pickup}
                  </Text>
                </View>

                {trip.drop && (
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.locationDotRed]} />
                    <Text style={styles.locationText} numberOfLines={2}>
                      {trip.drop}
                    </Text>
                  </View>
                )}

                <View style={styles.historyFooter}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{trip.distance}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{trip.duration}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AmbulanceDriverFooter active="history" brandColor={COLORS.primary} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 40,
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
  statsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  historyList: {
    padding: 16,
    paddingTop: 0,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
    marginTop: 4,
  },
  locationDotRed: {
    backgroundColor: COLORS.error,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
});

export default AmbulanceDriverHistory;