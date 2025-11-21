// PatientTable.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Check } from 'lucide-react-native';
// import { getAge } from '../../utility/global';
import { patientStatus } from '../../utils/role';
import { RootState } from '../../store/store';
import { AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateTime, } from "../../utils/dateTime";
import { PatientType } from '../../utils/types';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { showError } from '../../store/toast.slice';

const PatientTable = ({ 
  navigation, 
  patientType = patientStatus.outpatient, 
  zone
}: { 
  navigation: NavigationProp<any>;
  patientType?: number; 
  zone?: number;
}) => {
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchOnce = useRef(true);
  const dispatch = useDispatch()
const user = useSelector((s: RootState) => s.currentUser);
  // Fetch Recent Patients
  const fetchRecentPatients = async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    try {
  let endpoint
      if (patientType === 3 && !zone){
endpoint = `patient/${user?.hospitalID}/patients/recent/${patientType}?userID=${user?.id}&role=${user?.role}&category=triage`
      }else{
 endpoint = user?.role === 2003
        ? `patient/${user?.hospitalID}/patients/nurseRecent/${patientType}?userID=${user?.id}&role=${user?.role}`
        : `patient/${user?.hospitalID}/patients/recent/${patientType}?userID=${user?.id}&role=${user?.role}`;
      }
      

      if (zone !== undefined) {
        endpoint += `&zone=${zone}`;
      }
      const response = await AuthFetch(endpoint, token);
      if (response?.status === 'success' && Array.isArray(response?.data?.patients)) {
        const latestFive = response?.data?.patients.slice(0, 5);
        setPatients(latestFive);
      } else {
        setPatients([]);
      }
    } catch (error) {
      dispatch(showError(error?.message || error || 'Error fetching patients' ))
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
    if (user && fetchOnce?.current) {
      fetchOnce.current = false;
      fetchRecentPatients();
    }
  }, [user]))

  // Handle View Patient
  const handleView = async (id: number) => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    try {
      const response = await AuthFetch(
        `patient/${user?.hospitalID}/patients/isviewchange/${id}`,
        token
      );
      if (response?.status === 'success') {
        navigation.navigate('PatientProfile', { id: id });
      }
    } catch (error) {
       dispatch(showError(error?.message || error || 'Error navigating to patient' ))
    }
  };

  // Handle View All
    const handleViewAll = () => {
      if (user?.patientStatus === 1) {
        navigation.navigate('AppointmentsList');
      } else if (user?.patientStatus === 3) {
        navigation.navigate('PatientList', {
          zone: zone,
          patientStatus: patientStatus.emergency
        });
      } else {
        navigation.navigate('PatientList');
      }
    };

  // Render Patient Card
  const renderPatientCard = ({ item }: { item: PatientType }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item?.pName || '-'}, {item?.age}</Text>
          <Text style={styles.dateText}>
            {formatDateTime( item?.lastModified)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => item.id && handleView(item.id)}
          activeOpacity={0.7}
        >
          <Eye/>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Empty State
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No recent patients found</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Latest Patient Details</Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={handleViewAll}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Patient List */}
      <FlatList
        data={patients}
        renderItem={renderPatientCard}
        keyExtractor={(item) => item?.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#14b8a6',
    borderRadius: 6,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  patientInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewIcon: {
    fontSize: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});

export default PatientTable;