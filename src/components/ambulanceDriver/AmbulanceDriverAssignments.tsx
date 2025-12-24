import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface Assignment {
  id: number;
  ambulanceName: string;
  ambulanceNumber: string;
  patientName: string;
  pickupLocation: string;
  dropLocation: string;
  fromDate: string;
  toDate: string;
  fromTime: string;
  toTime: string;
  shiftType: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  remarks?: string;
  distance?: string;
}

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  successLight: '#d1fae5',
  errorLight: '#fee2e2',
  warningLight: '#fef3c7',
  infoLight: '#dbeafe',
};

const AmbulanceDriverAssignments: React.FC = () => {
  const [assignments] = useState<Assignment[]>([
    {
      id: 1,
      ambulanceName: 'City Ambulance A1',
      ambulanceNumber: 'MH-12-AB-1234',
      patientName: 'Ramesh Sharma',
      pickupLocation: 'Gandhi Hospital, Mumbai',
      dropLocation: 'Apollo Hospital, Navi Mumbai',
      fromDate: '2025-12-23',
      toDate: '2025-12-23',
      fromTime: '08:00',
      toTime: '10:00',
      shiftType: 'Emergency',
      status: 'active',
      remarks: 'Patient requires oxygen support',
      distance: '25 km',
    },
    {
      id: 2,
      ambulanceName: 'Emergency Van B2',
      ambulanceNumber: 'MH-12-CD-5678',
      patientName: 'Priya Patel',
      pickupLocation: 'Home - Andheri West',
      dropLocation: 'Lilavati Hospital, Bandra',
      fromDate: '2025-12-23',
      toDate: '2025-12-23',
      fromTime: '14:00',
      toTime: '15:30',
      shiftType: 'Scheduled',
      status: 'upcoming',
      remarks: 'Regular checkup transfer',
      distance: '12 km',
    },
    {
      id: 3,
      ambulanceName: 'Medical Transport C3',
      ambulanceNumber: 'MH-12-EF-9012',
      patientName: 'Suresh Kumar',
      pickupLocation: 'KEM Hospital, Parel',
      dropLocation: 'Home - Thane',
      fromDate: '2025-12-22',
      toDate: '2025-12-22',
      fromTime: '16:00',
      toTime: '18:00',
      shiftType: 'Discharge',
      status: 'completed',
      distance: '28 km',
    },
    {
      id: 4,
      ambulanceName: 'Rescue Unit D4',
      ambulanceNumber: 'MH-12-GH-3456',
      patientName: 'Anjali Desai',
      pickupLocation: 'Office - BKC',
      dropLocation: 'Hinduja Hospital, Mahim',
      fromDate: '2025-12-24',
      toDate: '2025-12-24',
      fromTime: '10:00',
      toTime: '11:00',
      shiftType: 'Emergency',
      status: 'upcoming',
      remarks: 'Cardiac emergency',
      distance: '8 km',
    },
    {
      id: 5,
      ambulanceName: 'City Ambulance A1',
      ambulanceNumber: 'MH-12-AB-1234',
      patientName: 'Vikram Singh',
      pickupLocation: 'Nanavati Hospital, Vile Parle',
      dropLocation: 'Home - Borivali',
      fromDate: '2025-12-21',
      toDate: '2025-12-21',
      fromTime: '09:00',
      toTime: '11:00',
      shiftType: 'Discharge',
      status: 'completed',
      distance: '18 km',
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');

  const getFilteredAssignments = () => {
    if (filter === 'all') return assignments;
    return assignments.filter((a) => a.status === filter);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return COLORS.success;
      case 'upcoming':
        return COLORS.warning;
      case 'completed':
        return COLORS.primary;
      case 'cancelled':
        return COLORS.error;
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleAssignmentDetails = (assignment: Assignment) => {
    Alert.alert(
      'Assignment Details',
      `Patient: ${assignment.patientName}\n\nFrom: ${assignment.pickupLocation}\n\nTo: ${assignment.dropLocation}\n\nTime: ${assignment.fromTime} - ${assignment.toTime}\nDistance: ${assignment.distance || 'N/A'}\n\nStatus: ${assignment.status.toUpperCase()}`,
      [{ text: 'OK' }]
    );
  };

  const handleStartAssignment = (assignment: Assignment) => {
    Alert.alert(
      'Start Assignment',
      `Start trip for ${assignment.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            Alert.alert('Success', 'Assignment started successfully!');
          },
        },
      ]
    );
  };

  const renderAssignmentCard = ({ item }: { item: Assignment }) => {
    return (
      <TouchableOpacity
        style={[
          styles.assignmentCard,
          item.status === 'active' && styles.activeCard,
        ]}
        onPress={() => handleAssignmentDetails(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text style={styles.ambulanceName}>{item.ambulanceName}</Text>
            <Text style={styles.vehicleNumber}>{item.ambulanceNumber}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.patientSection}>
            <Text style={styles.patientLabel}>Patient:</Text>
            <Text style={styles.patientName}>{item.patientName}</Text>
          </View>

          <View style={styles.locationSection}>
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationText}>{item.pickupLocation}</Text>
              </View>
            </View>
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>🏥</Text>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Drop</Text>
                <Text style={styles.locationText}>{item.dropLocation}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{formatDate(item.fromDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Time:</Text>
              <Text style={styles.infoValue}>{`${item.fromTime} - ${item.toTime}`}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{item.shiftType}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>{item.distance || 'N/A'}</Text>
            </View>
          </View>

          {item.remarks && (
            <View style={styles.remarksSection}>
              <Text style={styles.remarksLabel}>Remarks:</Text>
              <Text style={styles.remarksText}>{item.remarks}</Text>
            </View>
          )}
        </View>

        {item.status === 'upcoming' && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartAssignment(item)}
          >
            <Text style={styles.startButtonText}>▶ Start Trip</Text>
          </TouchableOpacity>
        )}

        {item.status === 'active' && (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeIndicatorText}>🔴 Trip in Progress</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Assignments</Text>
        <Text style={styles.headerSubtitle}>Manage your trips</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({assignments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Active ({assignments.filter((a) => a.status === 'active').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
            onPress={() => setFilter('upcoming')}
          >
            <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
              Upcoming ({assignments.filter((a) => a.status === 'upcoming').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
            onPress={() => setFilter('completed')}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              Completed ({assignments.filter((a) => a.status === 'completed').length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listSection}>
          {getFilteredAssignments().length > 0 ? (
            <FlatList
              data={getFilteredAssignments()}
              renderItem={renderAssignmentCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📋</Text>
              <Text style={styles.emptyStateText}>No assignments found</Text>
              <Text style={styles.emptyStateSubtext}>
                {filter === 'all' ? 'You have no assignments yet' : `No ${filter} assignments`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      <AmbulanceDriverFooter active="assignments" brandColor={COLORS.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: isSmallDevice ? 20 : 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: isSmallDevice ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  filterSection: {
    paddingVertical: 16,
    paddingHorizontal: isSmallDevice ? 16 : 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
  },
  filterTabActive: {
    backgroundColor: '#14b8a6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  listSection: {
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: 16,
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  activeCard: {
    borderLeftColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.1)',
  },
  cardTitleSection: {
    flex: 1,
  },
  ambulanceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  vehicleNumber: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  patientSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  patientLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  locationSection: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  remarksSection: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  remarksLabel: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 12,
    color: '#78350f',
    fontWeight: '500',
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#14b8a6',
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 184, 166, 0.1)',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  activeIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#d1fae5',
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
  },
  activeIndicatorText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default AmbulanceDriverAssignments;
