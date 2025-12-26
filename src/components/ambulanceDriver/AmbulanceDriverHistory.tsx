import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';

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
  fare: string;
  status: 'completed' | 'cancelled';
}

const AmbulanceDriverHistory: React.FC = () => {
  const [history] = useState<TripHistory[]>([
    {
      id: 1,
      date: '2025-12-24',
      patientName: 'Amit Kumar',
      pickup: 'Gandhi Hospital',
      drop: 'Apollo Hospital',
      distance: '3.2 km',
      duration: '15 mins',
      fare: '₹250',
      status: 'completed',
    },
    {
      id: 2,
      date: '2025-12-23',
      patientName: 'Sunita Sharma',
      pickup: 'Lilavati Hospital',
      drop: 'KEM Hospital',
      distance: '5.8 km',
      duration: '22 mins',
      fare: '₹380',
      status: 'completed',
    },
    {
      id: 3,
      date: '2025-12-22',
      patientName: 'Rahul Singh',
      pickup: 'Local Clinic',
      drop: 'City Hospital',
      distance: '2.1 km',
      duration: '10 mins',
      fare: '₹180',
      status: 'completed',
    },
  ]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trip History</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹18,450</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        <View style={styles.historyList}>
          {history.map((trip) => (
            <View key={trip.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>{trip.date}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    trip.status === 'completed' ? styles.statusCompleted : styles.statusCancelled,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {trip.status === 'completed' ? 'Completed' : 'Cancelled'}
                  </Text>
                </View>
              </View>

              <Text style={styles.patientName}>{trip.patientName}</Text>

              <View style={styles.locationRow}>
                <View style={styles.locationDot} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {trip.pickup}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <View style={[styles.locationDot, styles.locationDotRed]} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {trip.drop}
                </Text>
              </View>

              <View style={styles.historyFooter}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{trip.distance}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{trip.duration}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Fare</Text>
                  <Text style={styles.fareValue}>{trip.fare}</Text>
                </View>
              </View>
            </View>
          ))}
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
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
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
    color: COLORS.success,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  locationDotRed: {
    backgroundColor: COLORS.error,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  fareValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
});

export default AmbulanceDriverHistory;
