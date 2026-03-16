import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { showSuccess, showError } from '../../store/toast.slice';
import AmbulanceFooter from './AmbulanceFooter';
import { AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface AmbulanceItem {
  id: number;
  ambulanceNumber: string;
  ambulanceName: string;
  status: string;
  location?: string;
  driver?: string;
  phoneNo?: string;
  contactPhone?: string;
    firstName?: string;
    lastName?: string;
  contactEmail?: string;
  ambulanceType?: string;
  rcNumber?: string;
  insuranceNumber?: string;
  insuranceValidTill?: string;
  pollutionNumber?: string;
  pollutionValidTill?: string;
  fitnessNumber?: string;
  fitnessValidTill?: string;
  ventilator?: boolean;
  oxygenCylinders?: number;
  cardiacMonitor?: boolean;
  suctionMachine?: boolean;
  defibrillator?: boolean;
  gpsEnabled?: boolean;
  available24x7?: boolean;
  frontImage?: string;
  backImage?: string;
  insideImage?: string;
  updatedOn?: string;
}

const AmbulanceList: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [ambulances, setAmbulances] = useState<AmbulanceItem[]>([]);
  const [_loading, setLoading] = useState(true);

  // Fetch ambulances from API
  useEffect(() => {
    const fetchAmbulances = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          dispatch(showError('Authentication required'));
          return;
        }

        const response: any = await AuthFetch('ambulance/getAllAmbulances', token);

        if (response?.data?.ambulances && Array.isArray(response.data.ambulances)) {
          setAmbulances(response.data.ambulances);
          dispatch(showSuccess('Ambulances loaded'));
        } else {
          dispatch(showError('Failed to load ambulances'));
        }
      } catch (error) {
        // console.error('Error fetching ambulances:', error);
        dispatch(showError('Failed to fetch ambulances'));
      } finally {
        setLoading(false);
      }
    };

    fetchAmbulances();
  }, [dispatch]);

  const filteredAmbulances = ambulances.filter(
    (ambulance) => filterStatus === 'all' || ambulance.status === filterStatus
  );


  const handleAmbulancePress = (ambulance: AmbulanceItem) => {
  if (ambulance.status === 'pending') {
      // Navigate to complete ambulance details form
      navigation.navigate('AmbulanceForm', { 
        ambulance: {
          ambulance_name: ambulance.ambulanceName,
          ambulance_number: ambulance.ambulanceNumber,
          email: ambulance.contactEmail || '',
          phone_no: ambulance.contactPhone || '',
          first_name: ambulance.firstName || '',
          last_name: ambulance.lastName || '',
          id: ambulance.id,
          // Include other existing fields that might be partially filled
          owner_type: 'hospital',
          hospital_id: '',
          state: '',
          city: '',
          pin_code: '',
          ambulance_type: 'ALS',
          rc_number: '',
          insurance_number: '',
          insurance_valid_till: '',
          pollution_number: '',
          pollution_valid_till: '',
          fitness_number: '',
          fitness_valid_till: '',
          ventilator: ambulance.ventilator || false,
          oxygen_cylinders: ambulance.oxygenCylinders?.toString() || '2',
          cardiac_monitor: ambulance.cardiacMonitor || false,
          suction_machine: ambulance.suctionMachine || false,
          defibrillator: ambulance.defibrillator || false,
          gps_enabled: ambulance.gpsEnabled || false,
          available_24x7: ambulance.available24x7 || false,
        }
      });
    } else {
      if (ambulance.status === 'active') {
        navigation.navigate('AmbulanceDetails', { ambulance, ambulanceId: ambulance.id });
      } else {
        dispatch(showSuccess(`${ambulance.ambulanceName} selected`));
      }
    }
  };

  const renderAmbulanceCard = ({ item }: { item: AmbulanceItem }) => (
    <TouchableOpacity
      style={styles.ambulanceCard}
      onPress={() => handleAmbulancePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.ambulanceName}>{item.ambulanceName}</Text>
          <Text style={styles.ambulanceNumber}>{item.ambulanceNumber}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'active'
              ? styles.statusActive
              : item.status === 'pending'
              ? styles.statusPending
              : styles.statusInactive,
          ]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.location && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>📍 Location:</Text>
            <Text style={styles.value}>{item.location}</Text>
          </View>
        )}
        {item.driver && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>👤 Driver:</Text>
            <Text style={styles.value}>{item.driver}</Text>
          </View>
        )}
        {item.contactPhone && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>📞 Phone:</Text>
            <Text style={styles.value}>{item.contactPhone}</Text>
          </View>
        )}
        {item.contactEmail && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>📧 Email:</Text>
            <Text style={styles.value}>{item.contactEmail}</Text>
          </View>
        )}
        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleAmbulancePress(item)}
          >
            <Text style={styles.completeButtonText}>Complete Details</Text>
          </TouchableOpacity>
        )}
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
          <View>
            <Text style={styles.headerTitle}>Ambulances</Text>
            <Text style={styles.headerSubtitle}>Manage Fleet</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              navigation.navigate('AmbulanceForm' as never);
            }}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
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
              All ({ambulances.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'active' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus('active')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'active' && styles.filterButtonTextActive,
              ]}
            >
              Active ({ambulances.filter((a: AmbulanceItem) => a.status === 'active').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'inactive' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus('inactive')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'inactive' && styles.filterButtonTextActive,
              ]}
            >
              Inactive ({ambulances.filter((a: AmbulanceItem) => a.status === 'inactive').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ambulances List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Fleet Overview</Text>
          {filteredAmbulances.length > 0 ? (
            <FlatList
              data={filteredAmbulances}
              renderItem={renderAmbulanceCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No ambulances found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your filter
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AmbulanceFooter active="ambulances" brandColor="#14b8a6" />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
  ambulanceCard: {
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
  ambulanceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  ambulanceNumber: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    color: '#333',
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
    width: '30%',
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
  completeButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});


export default AmbulanceList;
