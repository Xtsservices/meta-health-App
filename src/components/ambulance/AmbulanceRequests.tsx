import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { showSuccess } from '../../store/toast.slice';
import AmbulanceFooter from './AmbulanceFooter';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface AmbulanceRequest {
  id: number;
  requestId: string;
  patientName: string;
  status: string;
  pickupLocation: string;
  dropoffLocation: string;
  requestTime: string;
  ambulance: string;
  driver: string;
}

const AmbulanceRequests: React.FC = () => {
  const dispatch = useDispatch();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Dummy request data
  const dummyRequests: AmbulanceRequest[] = [
    {
      id: 1,
      requestId: 'REQ-001',
      patientName: 'Robert Brown',
      status: 'pending',
      pickupLocation: 'City Hospital',
      dropoffLocation: 'Central Medical Clinic',
      requestTime: '2025-12-22 09:30 AM',
      ambulance: 'AMB-001',
      driver: 'John Smith',
    },
    {
      id: 2,
      requestId: 'REQ-002',
      patientName: 'Jessica Davis',
      status: 'completed',
      pickupLocation: 'Home Address',
      dropoffLocation: 'City Hospital',
      requestTime: '2025-12-22 08:15 AM',
      ambulance: 'AMB-002',
      driver: 'Sarah Johnson',
    },
    {
      id: 3,
      requestId: 'REQ-003',
      patientName: 'Michael Wilson',
      status: 'pending',
      pickupLocation: 'Emergency Zone',
      dropoffLocation: 'Trauma Center',
      requestTime: '2025-12-22 10:45 AM',
      ambulance: 'AMB-004',
      driver: 'Emily Brown',
    },
    {
      id: 4,
      requestId: 'REQ-004',
      patientName: 'Linda Garcia',
      status: 'cancelled',
      pickupLocation: 'Residential Area',
      dropoffLocation: 'General Hospital',
      requestTime: '2025-12-22 07:30 AM',
      ambulance: 'AMB-003',
      driver: 'Mike Williams',
    },
    {
      id: 5,
      requestId: 'REQ-005',
      patientName: 'James Martinez',
      status: 'completed',
      pickupLocation: 'Airport',
      dropoffLocation: 'Medical Center',
      requestTime: '2025-12-22 06:00 AM',
      ambulance: 'AMB-005',
      driver: 'David Lee',
    },
  ];

  const filteredRequests = dummyRequests.filter(
    (request) => filterStatus === 'all' || request.status === filterStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#666';
    }
  };

  const handleRequestPress = (request: AmbulanceRequest) => {
    dispatch(showSuccess(`Request ${request.requestId} selected`));
  };

  const renderRequestCard = ({ item }: { item: AmbulanceRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => handleRequestPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.requestId}>{item.requestId}</Text>
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
          <Text style={styles.label}>📍 From:</Text>
          <Text style={styles.value}>{item.pickupLocation}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>📍 To:</Text>
          <Text style={styles.value}>{item.dropoffLocation}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>🚑 Ambulance:</Text>
          <Text style={styles.value}>{item.ambulance}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>👤 Driver:</Text>
          <Text style={styles.value}>{item.driver}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>⏰ Time:</Text>
          <Text style={styles.value}>{item.requestTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Requests</Text>
          <Text style={styles.headerSubtitle}>Service Bookings</Text>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All ({dummyRequests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'pending' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'pending' && styles.filterButtonTextActive,
              ]}
            >
              Pending ({dummyRequests.filter((r) => r.status === 'pending').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'completed' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus('completed')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'completed' && styles.filterButtonTextActive,
              ]}
            >
              Completed ({dummyRequests.filter((r) => r.status === 'completed').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Requests List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Recent Requests</Text>
          {filteredRequests.length > 0 ? (
            <FlatList
              data={filteredRequests}
              renderItem={renderRequestCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No requests found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your filter
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AmbulanceFooter active="requests" brandColor="#14b8a6" />
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
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  requestId: {
    fontSize: 12,
    color: '#999',
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
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    width: '25%',
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
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});

export default AmbulanceRequests;
