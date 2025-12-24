import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface Assignment {
  id: number;
  ambulanceName: string;
  ambulanceNumber: string;
  fromDate: string;
  toDate: string;
  fromTime: string;
  toTime: string;
  shiftType: string;
  status: string;
  remarks?: string;
  location?: string;
}

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

const AssignmentsList: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');

  const [assignments] = useState<Assignment[]>([
    {
      id: 1,
      ambulanceName: 'City Ambulance A1',
      ambulanceNumber: 'MH-12-AB-1234',
      fromDate: '2025-12-23',
      toDate: '2025-12-23',
      fromTime: '08:00',
      toTime: '16:00',
      shiftType: 'day',
      status: 'active',
      location: 'City Hospital, Mumbai',
      remarks: 'Regular shift',
    },
    {
      id: 2,
      ambulanceName: 'Emergency Van B2',
      ambulanceNumber: 'MH-12-CD-5678',
      fromDate: '2025-12-24',
      toDate: '2025-12-24',
      fromTime: '20:00',
      toTime: '04:00',
      shiftType: 'night',
      status: 'upcoming',
      location: 'Metro Hospital, Mumbai',
      remarks: 'Night shift coverage',
    },
    {
      id: 3,
      ambulanceName: 'Medical Transport C3',
      ambulanceNumber: 'MH-12-EF-9012',
      fromDate: '2025-12-22',
      toDate: '2025-12-22',
      fromTime: '09:00',
      toTime: '17:00',
      shiftType: 'general',
      status: 'completed',
      location: 'Central Hospital, Mumbai',
    },
    {
      id: 4,
      ambulanceName: 'Rescue Unit D4',
      ambulanceNumber: 'MH-12-GH-3456',
      fromDate: '2025-12-25',
      toDate: '2025-12-25',
      fromTime: '06:00',
      toTime: '14:00',
      shiftType: 'day',
      status: 'upcoming',
      location: 'District Hospital, Mumbai',
    },
    {
      id: 5,
      ambulanceName: 'Life Saver E5',
      ambulanceNumber: 'MH-12-IJ-7890',
      fromDate: '2025-12-21',
      toDate: '2025-12-21',
      fromTime: '10:00',
      toTime: '18:00',
      shiftType: 'general',
      status: 'completed',
      location: 'Community Hospital, Mumbai',
    },
  ]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return COLORS.success;
      case 'upcoming':
        return COLORS.warning;
      case 'completed':
        return COLORS.primary;
      default:
        return '#6b7280';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    return assignment.status.toLowerCase() === filter;
  });

  const handleAssignmentPress = (assignment: Assignment) => {
    Alert.alert(
      'Assignment Details',
      `Ambulance: ${assignment.ambulanceName}\nNumber: ${assignment.ambulanceNumber}\nDate: ${formatDate(assignment.fromDate)}\nTime: ${assignment.fromTime} - ${assignment.toTime}\nShift: ${assignment.shiftType}\nLocation: ${assignment.location || 'N/A'}\nStatus: ${assignment.status}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Assignments</Text>
        <Text style={styles.headerSubtitle}>View all your shifts</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Assignments List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map(assignment => (
            <TouchableOpacity
              key={assignment.id}
              style={styles.assignmentCard}
              onPress={() => handleAssignmentPress(assignment)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleSection}>
                  <Text style={styles.ambulanceName}>{assignment.ambulanceName}</Text>
                  <Text style={styles.vehicleNumber}>{assignment.ambulanceNumber}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(assignment.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{assignment.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>📅 Date:</Text>
                  <Text style={styles.value}>{formatDate(assignment.fromDate)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>🕐 Time:</Text>
                  <Text style={styles.value}>
                    {assignment.fromTime} - {assignment.toTime}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>🌓 Shift:</Text>
                  <Text style={styles.value}>{assignment.shiftType}</Text>
                </View>
                {assignment.location && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>📍 Location:</Text>
                    <Text style={styles.value}>{assignment.location}</Text>
                  </View>
                )}
                {assignment.remarks && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>📝 Remarks:</Text>
                    <Text style={styles.value}>{assignment.remarks}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No {filter !== 'all' ? filter : ''} assignments found</Text>
          </View>
        )}
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
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: isSmallDevice ? 20 : 24,
    paddingBottom: 20,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingBottom: 100,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    width: '35%',
  },
  value: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
});

export default AssignmentsList;
