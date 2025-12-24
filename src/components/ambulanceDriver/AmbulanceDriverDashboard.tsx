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
import { useNavigation } from '@react-navigation/native';
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
}

interface DashboardStats {
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
}

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  successLight: '#d1fae5',
  errorLight: '#fee2e2',
  warningLight: '#fef3c7',
};

const AmbulanceDriverDashboard: React.FC = () => {
  const navigation = useNavigation();

  // Dummy data
  const [stats] = useState<DashboardStats>({
    totalAssignments: 12,
    activeAssignments: 3,
    completedAssignments: 9,
  });

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
    },
  ]);

  const [driverInfo] = useState({
    name: 'Rajesh Kumar',
    mobile: '+91 98765 43210',
    licenseNumber: 'MH1420190012345',
    email: 'rajesh.kumar@example.com',
  });

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: () => {
            (navigation as any).navigate('Login');
          },
        },
      ]
    );
  };

  const handleAssignmentDetails = (assignment: Assignment) => {
    Alert.alert(
      'Assignment Details',
      `${assignment.ambulanceName}\n${assignment.ambulanceNumber}\nShift: ${assignment.shiftType}\nStatus: ${assignment.status}`,
      [{ text: 'OK' }]
    );
  };

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

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return COLORS.successLight;
      case 'upcoming':
        return COLORS.warningLight;
      case 'completed':
        return '#e0f2f1';
      default:
        return '#f3f4f6';
    }
  };

  const renderAssignmentCard = ({ item }: { item: Assignment }) => {
    return (
      <TouchableOpacity
        style={styles.assignmentCard}
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
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(item.fromDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Time:</Text>
            <Text style={styles.value}>{`${item.fromTime} - ${item.toTime}`}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Shift Type:</Text>
            <Text style={styles.value}>{item.shiftType}</Text>
          </View>
          {item.remarks && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Remarks:</Text>
              <Text style={styles.value}>{item.remarks}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Ambulance Driver</Text>
              <Text style={styles.headerSubtitle}>Dashboard</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Driver Info */}
          <View style={styles.driverInfoCard}>
            <Text style={styles.driverName}>{driverInfo.name}</Text>
            <Text style={styles.driverDetail}>📱 {driverInfo.mobile}</Text>
            <Text style={styles.driverDetail}>🪪 {driverInfo.licenseNumber}</Text>
            <Text style={styles.driverDetail}>✉️ {driverInfo.email}</Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalAssignments}</Text>
            <Text style={styles.statLabel}>Total Assignments</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {stats.activeAssignments}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#e0f2f1' }]}>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>
              {stats.completedAssignments}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Assignments List */}
        <View style={styles.listSection}>
         
          <Text style={styles.sectionTitle}>My Assignments</Text>
          {assignments.length > 0 ? (
            <FlatList
              data={assignments}
              renderItem={renderAssignmentCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No assignments yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <AmbulanceDriverFooter active="dashboard" brandColor={COLORS.primary} />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  driverInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  driverName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  driverDetail: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#e0f2f1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  listSection: {
    paddingHorizontal: isSmallDevice ? 16 : 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
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
    alignItems: 'center',
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
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
});

export default AmbulanceDriverDashboard;
