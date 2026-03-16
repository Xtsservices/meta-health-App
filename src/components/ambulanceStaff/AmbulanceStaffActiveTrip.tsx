import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { showError } from '../../store/toast.slice';
import { AuthFetch } from '../../auth/auth';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE } from '../../utils/responsive';
import { 
  MapPinIcon, 
  UserIcon, 
  PhoneIcon, 
  ActivityIcon,
  ClockIcon,
} from '../../utils/SvgIcons';
import AmbulanceStaffFooter from './AmbulanceStaffFooter';

type TripInfo = {
  id: number;
  patientName: string;
  patientAge: number;
  patientGender: string;
  pickupLocation: string;
  dropLocation: string;
  priority: string;
  status: string;
  startTime?: string;
  estimatedArrival?: string;
  contactNumber?: string;
  specialInstructions?: string;
};

const AmbulanceStaffActiveTrip: React.FC = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<TripInfo | null>(null);

  const fetchActiveTrip = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      const token = user?.token;
      if (!token) {
        dispatch(showError('Authentication token not found'));
        return;
      }

      // Replace with your actual API endpoint
      const response = await AuthFetch('ambulance/staff/activeTrip', token);
      
      if (response?.status === 'success') {
        const data = 'data' in response ? response.data : null;
        setActiveTrip(data);
      } else {
        const message = 'message' in response ? response.message : 'Failed to fetch active trip';
        dispatch(showError(message));
      }
    } catch (error: any) {
      console.error('Error fetching active trip:', error);
      dispatch(showError(error?.message || 'Failed to fetch active trip'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActiveTrip();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveTrip(true);
  };

  const renderNoActiveTrip = () => (
    <View style={styles.emptyContainer}>
      <ActivityIcon size={64} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No Active Trip</Text>
      <Text style={styles.emptySubtitle}>
        You don't have any active trip assignments at the moment
      </Text>
    </View>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'emergency':
        return COLORS.danger;
      case 'urgent':
        return '#F9A825';
      default:
        return COLORS.brand;
    }
  };

  const renderTripInfo = () => {
    if (!activeTrip) return renderNoActiveTrip();

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
      >
        {/* Trip Status Header */}
        <View style={styles.statusHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(activeTrip.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(activeTrip.priority) }]}>
              {activeTrip.priority}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{activeTrip.status}</Text>
          </View>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <UserIcon size={20} color={COLORS.brand} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Patient Name</Text>
                <Text style={styles.infoValue}>{activeTrip.patientName}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Age & Gender</Text>
              <Text style={styles.infoValue}>
                {activeTrip.patientAge} years • {activeTrip.patientGender}
              </Text>
            </View>
            {activeTrip.contactNumber && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <PhoneIcon size={20} color={COLORS.brand} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Contact Number</Text>
                    <Text style={styles.infoValue}>{activeTrip.contactNumber}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          <View style={styles.card}>
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <View style={styles.pickupDot} />
              </View>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Pickup Location</Text>
                <Text style={styles.locationValue}>{activeTrip.pickupLocation}</Text>
              </View>
            </View>
            <View style={styles.locationLine} />
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <MapPinIcon size={20} color={COLORS.danger} />
              </View>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Drop Location</Text>
                <Text style={styles.locationValue}>{activeTrip.dropLocation}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Time Information */}
        {(activeTrip.startTime || activeTrip.estimatedArrival) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.card}>
              {activeTrip.startTime && (
                <View style={styles.infoRow}>
                  <ClockIcon size={20} color={COLORS.brand} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Start Time</Text>
                    <Text style={styles.infoValue}>{activeTrip.startTime}</Text>
                  </View>
                </View>
              )}
              {activeTrip.estimatedArrival && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <ClockIcon size={20} color={COLORS.brand} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Estimated Arrival</Text>
                      <Text style={styles.infoValue}>{activeTrip.estimatedArrival}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Special Instructions */}
        {activeTrip.specialInstructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <View style={[styles.card, styles.instructionsCard]}>
              <Text style={styles.instructionsText}>{activeTrip.specialInstructions}</Text>
            </View>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Complete Trip</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading trip information...</Text>
        </View>
        <AmbulanceStaffFooter />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Trip</Text>
        <Text style={styles.headerSubtitle}>Current trip information</Text>
      </View>
      {renderTripInfo()}
      <AmbulanceStaffFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  header: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    textAlign: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  priorityText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },
  statusText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: SPACING.md,
  },
  locationRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  locationIconContainer: {
    width: 32,
    alignItems: 'center',
    paddingTop: 4,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.brand,
    borderWidth: 3,
    borderColor: COLORS.brand + '40',
  },
  locationLine: {
    width: 2,
    height: 24,
    backgroundColor: '#cbd5e1',
    marginLeft: 15,
    marginVertical: SPACING.xs,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: 4,
  },
  locationValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 20,
  },
  instructionsCard: {
    backgroundColor: '#fff7ed',
  },
  instructionsText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: COLORS.brand,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AmbulanceStaffActiveTrip;
