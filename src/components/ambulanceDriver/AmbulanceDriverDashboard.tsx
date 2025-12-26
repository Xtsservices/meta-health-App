import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE, responsiveHeight } from '../../utils/responsive';

// Dummy trip request data - Replace with real API data
const DUMMY_TRIP_REQUESTS = [
  {
    id: 'trip_001',
    patientName: 'Rajesh Kumar',
    pickupAddress: 'AIIMS, Sri Aurobindo Marg, New Delhi',
    dropAddress: 'Max Hospital, Saket, New Delhi',
    distance: '12.5 km',
    estimatedTime: '25 mins',
    priority: 'High',
    requestTime: '10:30 AM',
  },
  {
    id: 'trip_002',
    patientName: 'Priya Sharma',
    pickupAddress: 'Safdarjung Hospital, New Delhi',
    dropAddress: 'Apollo Hospital, Jasola, New Delhi',
    distance: '8.2 km',
    estimatedTime: '18 mins',
    priority: 'Medium',
    requestTime: '10:45 AM',
  },
];

const AmbulanceDriverDashboard: React.FC = () => {
  const navigation = useNavigation();

  const [tripRequests, setTripRequests] = useState(DUMMY_TRIP_REQUESTS);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(false);




  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      Alert.alert('Status', 'You are now online and will receive trip requests');
    } else {
      Alert.alert('Status', 'You are now offline');
    }
  };

  const handleAcceptTrip = () => {
    const currentTrip = tripRequests[currentRequestIndex];
    Alert.alert(
      'Accept Trip',
      `Accept trip for ${currentTrip.patientName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: () => {
            // TODO: Accept trip via API
            console.log('Trip accepted:', currentTrip.id);
            Alert.alert('Success', 'Trip accepted! Navigating to Active Trip...');
            // Navigate to Active Trip screen
            navigation.navigate('AmbulanceDriverActiveTrip' as never);
          },
        },
      ]
    );
  };

  const handleRejectTrip = () => {
    const currentTrip = tripRequests[currentRequestIndex];
    Alert.alert(
      'Reject Trip',
      `Reject trip for ${currentTrip.patientName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            // Move to next request
            if (currentRequestIndex < tripRequests.length - 1) {
              setCurrentRequestIndex(currentRequestIndex + 1);
            } else {
              setTripRequests([]);
              Alert.alert('Info', 'No more trip requests available');
            }
          },
        },
      ]
    );
  };

  const currentTrip = tripRequests[currentRequestIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <Text style={styles.headerSubtitle}>Ambulance Driver</Text>
        </View>
        <TouchableOpacity
          style={[styles.onlineButton, isOnline && styles.onlineButtonActive]}
          onPress={handleToggleOnline}
        >
          <View style={[styles.statusDot, isOnline && styles.statusDotActive]} />
          <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trip Request Queue */}
      <ScrollView style={styles.requestContainer} showsVerticalScrollIndicator={false}>
        {tripRequests.length > 0 && currentTrip ? (
          <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>{currentTrip.priority} Priority</Text>
              </View>
              <Text style={styles.requestTime}>{currentTrip.requestTime}</Text>
            </View>

            <View style={styles.requestBody}>
              <Text style={styles.patientName}>{currentTrip.patientName}</Text>

              <View style={styles.addressContainer}>
                <View style={styles.addressRow}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>P</Text>
                  </View>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressLabel}>Pickup</Text>
                    <Text style={styles.addressText}>{currentTrip.pickupAddress}</Text>
                  </View>
                </View>

                <View style={styles.dashedLine} />

                <View style={styles.addressRow}>
                  <View style={[styles.iconCircle, styles.iconCircleDrop]}>
                    <Text style={styles.iconText}>D</Text>
                  </View>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressLabel}>Drop</Text>
                    <Text style={styles.addressText}>{currentTrip.dropAddress}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tripInfoRow}>
                <View style={styles.tripInfoItem}>
                  <Text style={styles.tripInfoLabel}>Distance</Text>
                  <Text style={styles.tripInfoValue}>{currentTrip.distance}</Text>
                </View>
                <View style={styles.tripInfoDivider} />
                <View style={styles.tripInfoItem}>
                  <Text style={styles.tripInfoLabel}>Est. Time</Text>
                  <Text style={styles.tripInfoValue}>{currentTrip.estimatedTime}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleRejectTrip}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAcceptTrip}
              >
                <Text style={styles.acceptButtonText}>Accept Trip</Text>
              </TouchableOpacity>
            </View>

            {tripRequests.length > 1 && (
              <Text style={styles.queueText}>
                {currentRequestIndex + 1} of {tripRequests.length} requests
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Trip Requests</Text>
            <Text style={styles.emptyStateText}>
              {isOnline
                ? 'Waiting for trip requests...'
                : 'Go online to receive trip requests'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <AmbulanceDriverFooter active="dashboard" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.brand,
    borderBottomWidth: 0,
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.primaryText,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryText,
    marginTop: 2,
    opacity: 0.9,
  },
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onlineButtonActive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.card,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  onlineTextActive: {
    color: COLORS.brand,
  },
  requestContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  requestCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },
  priorityText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.danger,
  },
  requestTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  requestBody: {
    marginBottom: SPACING.lg,
  },
  patientName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  addressContainer: {
    marginBottom: SPACING.md,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  iconCircleDrop: {
    backgroundColor: '#FFF3E0',
  },
  iconText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.brand,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 2,
  },
  addressText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  dashedLine: {
    height: 20,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    borderStyle: 'dashed',
    marginLeft: 15,
    marginVertical: -6,
  },
  tripInfoRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  tripInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  tripInfoDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  tripInfoLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 4,
  },
  tripInfoValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
  rejectButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.danger,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  acceptButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.buttonText,
  },
  queueText: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: responsiveHeight(5),
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: 'center',
  },
});

export default AmbulanceDriverDashboard;
