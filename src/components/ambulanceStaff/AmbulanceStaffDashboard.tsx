import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { showError } from '../../store/toast.slice';
import { AuthFetch } from '../../auth/auth';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE, isTablet } from '../../utils/responsive';
import { UserIcon, ActivityIcon } from '../../utils/SvgIcons';
import AmbulanceStaffFooter from './AmbulanceStaffFooter';

// Patient type definition
type Patient = {
  id: number;
  name: string;
  age: number;
  gender: string;
  ward?: string;
  bed?: string;
  admissionDate?: string;
  diagnosis?: string;
  status?: string;
};

const AmbulanceStaffDashboard: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);
  const { width: windowWidth } = useWindowDimensions();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate responsive values
  const cardWidth = isTablet 
    ? (windowWidth - (SPACING.lg * 3)) / 2
    : windowWidth - (SPACING.lg * 2);

  // Fetch patients list
  const fetchPatients = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      const token = user?.token;
      if (!token) {
        dispatch(showError('Authentication token not found'));
        return;
      }

      // Fetch patients assigned to ambulance staff
      // Replace with your actual API endpoint
      const response = await AuthFetch('patient/ambulanceStaffPatients', token);
      
      if (response?.status === 'success') {
        const data = 'data' in response ? response.data : [];
        setPatients(data);
      } else {
        const message = 'message' in response ? response.message : 'Failed to fetch patients';
        dispatch(showError(message));
      }
    } catch (error: any) {
      console.error('Error fetching patients:', error);
      dispatch(showError(error?.message || 'Failed to fetch patients'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load patients on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchPatients();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Handle pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPatients(true);
  };

  // Navigate to Add Vitals screen
  const handleAddVitals = (patient: Patient) => {
    (navigation as any).navigate('AmbulanceStaffAddVitals', { 
      patientId: patient.id,
      patientName: patient.name,
    });
  };

  // Navigate to patient details
  const handleViewPatient = (patient: Patient) => {
    (navigation as any).navigate('PatientProfile', {
      patientId: patient.id,
    });
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <UserIcon size={64} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No Patients Assigned</Text>
      <Text style={styles.emptySubtitle}>
        Patients assigned to you will appear here
      </Text>
    </View>
  );

  // Render patient card
  const renderPatientCard = ({ item }: { item: Patient }) => (
    <View style={[styles.patientCard, { width: cardWidth }]}>
      <TouchableOpacity 
        style={styles.cardHeader}
        onPress={() => handleViewPatient(item)}
        activeOpacity={0.7}
      >
        <View style={styles.patientIconContainer}>
          <UserIcon size={24} color={COLORS.brand} />
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.patientDetails}>
            {item.age} yrs • {item.gender}
          </Text>
        </View>
      </TouchableOpacity>

      {item.diagnosis && (
        <View style={styles.diagnosisContainer}>
          <Text style={styles.diagnosisLabel}>Diagnosis:</Text>
          <Text style={styles.diagnosisText} numberOfLines={2}>
            {item.diagnosis}
          </Text>
        </View>
      )}

      {(item.ward || item.bed) && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            {item.ward && `Ward: ${item.ward}`}
            {item.ward && item.bed && ' • '}
            {item.bed && `Bed: ${item.bed}`}
          </Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.addVitalsButton}
          onPress={() => handleAddVitals(item)}
          activeOpacity={0.8}
        >
          <ActivityIcon size={18} color="#fff" />
          <Text style={styles.addVitalsButtonText}>Add Vitals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => handleViewPatient(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewDetailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>Loading patients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ambulance Staff</Text>
          <Text style={styles.headerSubtitle}>
            Manage patient vitals and care
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statBadge}>
            <Text style={styles.statNumber}>{patients.length}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
        </View>
      </View>

      {/* Patient List */}
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPatientCard}
        contentContainerStyle={[
          styles.listContent,
          patients.length === 0 && styles.emptyListContent,
        ]}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      <AmbulanceStaffFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    marginBottom: SPACING.md,
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
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statNumber: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: SPACING.md,
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
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  patientIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  diagnosisContainer: {
    backgroundColor: '#f8fafc',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  diagnosisLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.sub,
    marginBottom: 4,
  },
  diagnosisText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 20,
  },
  locationContainer: {
    marginBottom: SPACING.md,
  },
  locationText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addVitalsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  addVitalsButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#fff',
  },
  viewDetailsButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewDetailsButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default AmbulanceStaffDashboard;
