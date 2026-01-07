import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import { AuthFetch } from '../../auth/auth';
import { showError } from '../../store/toast.slice'; 

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
  status: 'searching' | 'accepted' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled_by_patient' | 'cancelled_by_driver' | 'expired';
}

const AmbulanceDriverHistory: React.FC = () => {
  const dispatch = useDispatch();
  const [history, setHistory] = useState<TripHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTrips, setTotalTrips] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'cancelled' | 'in_progress' | 'expired'>('all');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Authentication required'));
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
          const date = new Date(booking.requestedAt).toISOString().split('T')[0];

          // Use addresses directly from API response
          const pickup = booking.fromAddress || 'Pickup address not available';
          const drop = booking.toAddress || 'Drop location not specified';

          // Placeholder for patient name (if available in future)
          const patientName = 'Patient'; // Update if backend provides patient name

          // Placeholder distance & duration (can be improved later with real calculation)
          const distance = booking.status === 'completed' ? '—' : '-';
          const duration = booking.status === 'completed' ? '—' : '-';

          processedHistory.push({
            id: booking.id,
            date,
            patientName,
            pickup,
            drop,
            distance,
            duration,
            status: booking.status as TripHistory['status'],
          });
        }

        setHistory(processedHistory);

        // Count trips by status
        const completedCount = processedHistory.filter(t => t.status === 'completed').length;
        const cancelledCount = processedHistory.filter(t => 
          t.status === 'cancelled_by_patient' || t.status === 'cancelled_by_driver'
        ).length;
        const activeCount = processedHistory.filter(t => 
          t.status === 'searching' || t.status === 'accepted' || 
          t.status === 'on_the_way' || t.status === 'in_progress'
        ).length;
        const expiredCount = processedHistory.filter(t => t.status === 'expired').length;
        
        setTotalTrips(completedCount);
      }
    } catch (error: any) {
      console.error('Error fetching history:', error);
      dispatch(showError('Failed to load trip history'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Calculate counts for filter badges
  const allCount = history.length;
  const completedCount = history.filter(t => t.status === 'completed').length;
  const cancelledCount = history.filter(t => 
    t.status === 'cancelled_by_patient' || t.status === 'cancelled_by_driver'
  ).length;
  const activeCount = history.filter(t => 
    t.status === 'searching' || t.status === 'accepted' || 
    t.status === 'on_the_way' || t.status === 'in_progress'
  ).length;
  const expiredCount = history.filter(t => t.status === 'expired').length;

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

        {/* Filter Buttons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScrollContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
            <View style={[
              styles.filterCountBadge,
              activeFilter === 'all' && styles.filterCountBadgeActive,
            ]}>
              <Text style={[
                styles.filterCountText,
                activeFilter === 'all' && styles.filterCountTextActive,
              ]}>
                {allCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'completed' && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter('completed')}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === 'completed' && styles.filterButtonTextActive,
              ]}
            >
              Completed
            </Text>
            <View style={[
              styles.filterCountBadge,
              activeFilter === 'completed' && styles.filterCountBadgeActive,
            ]}>
              <Text style={[
                styles.filterCountText,
                activeFilter === 'completed' && styles.filterCountTextActive,
              ]}>
                {completedCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'in_progress' && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter('in_progress')}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === 'in_progress' && styles.filterButtonTextActive,
              ]}
            >
              Active
            </Text>
            <View style={[
              styles.filterCountBadge,
              activeFilter === 'in_progress' && styles.filterCountBadgeActive,
            ]}>
              <Text style={[
                styles.filterCountText,
                activeFilter === 'in_progress' && styles.filterCountTextActive,
              ]}>
                {activeCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'cancelled' && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter('cancelled')}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === 'cancelled' && styles.filterButtonTextActive,
              ]}
            >
              Cancelled
            </Text>
            <View style={[
              styles.filterCountBadge,
              activeFilter === 'cancelled' && styles.filterCountBadgeActive,
            ]}>
              <Text style={[
                styles.filterCountText,
                activeFilter === 'cancelled' && styles.filterCountTextActive,
              ]}>
                {cancelledCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'expired' && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter('expired')}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === 'expired' && styles.filterButtonTextActive,
              ]}
            >
              Expired
            </Text>
            <View style={[
              styles.filterCountBadge,
              activeFilter === 'expired' && styles.filterCountBadgeActive,
            ]}>
              <Text style={[
                styles.filterCountText,
                activeFilter === 'expired' && styles.filterCountTextActive,
              ]}>
                {expiredCount}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.historyList}>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No trip history found</Text>
          ) : (
            history
              .filter((trip) => {
                if (activeFilter === 'all') return true;
                if (activeFilter === 'cancelled') {
                  return trip.status === 'cancelled_by_patient' || 
                         trip.status === 'cancelled_by_driver';
                }
                if (activeFilter === 'in_progress') {
                  return trip.status === 'searching' || 
                         trip.status === 'accepted' || 
                         trip.status === 'on_the_way' || 
                         trip.status === 'in_progress';
                }
                return trip.status === activeFilter;
              })
              .map((trip) => (
              <View key={trip.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{trip.date}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      trip.status === 'completed' && styles.statusCompleted,
                      (trip.status === 'cancelled_by_patient' || trip.status === 'cancelled_by_driver') && styles.statusCancelled,
                      trip.status === 'expired' && styles.statusExpired,
                      (trip.status === 'searching' || trip.status === 'accepted' || trip.status === 'on_the_way' || trip.status === 'in_progress') && styles.statusActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        trip.status === 'completed' && { color: COLORS.success },
                        (trip.status === 'cancelled_by_patient' || trip.status === 'cancelled_by_driver') && { color: COLORS.error },
                        trip.status === 'expired' && { color: '#f59e0b' },
                        (trip.status === 'searching' || trip.status === 'accepted' || trip.status === 'on_the_way' || trip.status === 'in_progress') && { color: COLORS.primary },
                      ]}
                    >
                      {trip.status === 'completed' && 'Completed'}
                      {trip.status === 'cancelled_by_patient' && 'Cancelled by Patient'}
                      {trip.status === 'cancelled_by_driver' && 'Cancelled by Driver'}
                      {trip.status === 'expired' && 'Expired'}
                      {trip.status === 'searching' && 'Searching'}
                      {trip.status === 'accepted' && 'Accepted'}
                      {trip.status === 'on_the_way' && 'On the Way'}
                      {trip.status === 'in_progress' && 'In Progress'}
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
  filterScrollContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
    marginRight: 0,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterCountBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterCountTextActive: {
    color: '#fff',
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
  statusExpired: {
    backgroundColor: '#fef3c7',
  },
  statusActive: {
    backgroundColor: '#dbeafe',
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