import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  PillIcon, 
  SyringeIcon, 
  DropletIcon, 
  TestTubeIcon, 
  BandageIcon, 
  ActivityIcon, 
  WindIcon, 
  SquareIcon, 
  SyrupIcon,
  ClockIcon,
  PlusIcon,
} from '../../../utils/SvgIcons';
import { MedicineType } from '../../../utils/types';
import { RootState } from '../../../store/store';
import { AuthFetch } from '../../../auth/auth';
import Footer from '../../dashboard/footer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
type TopTabType = 'medication' | 'procedure';
type MedicineFilter = {
  label: string;
  value: number;
};

// Medicine Icon Component
const MedicineIcon = ({ type, size = 20, color = "#14b8a6" }: { type: number; size?: number; color?: string }) => {
  const iconProps = { size, color };
  
  switch (type) {
    case 1: return <PillIcon {...iconProps} />;
    case 2: return <SyrupIcon {...iconProps} />;
    case 3: return <SquareIcon {...iconProps} />;
    case 4: return <SyringeIcon {...iconProps} />;
    case 5: return <ActivityIcon {...iconProps} />;
    case 6: return <TestTubeIcon {...iconProps} />;
    case 7: return <BandageIcon {...iconProps} />;
    case 8: return <DropletIcon {...iconProps} />;
    case 9: return <WindIcon {...iconProps} />;
    case 10: return <WindIcon {...iconProps} />;
    default: return <PillIcon {...iconProps} />;
  }
};

// Medicine Data Table Component
const MedicineDataTable = ({ medicines, category }: { medicines: MedicineType[]; category: number }) => {
  const filteredMedicines = category === -1 
    ? medicines 
    : medicines?.filter(med => med?.medicineType === category);

  const getDosageUnit = (medicineType: number): string => {
    if (medicineType === 1 || medicineType === 3) return 'mg';
    if (medicineType === 6) return 'g';
    return 'ml';
  };

  if (filteredMedicines?.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No medicines found for this filter</Text>
      </View>
    );
  }

  return (
    <View style={styles.tableContainer}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={[styles.tableCell, styles.snoCell]}>
          <Text style={styles.headerText}>S.No</Text>
        </View>
        <View style={[styles.tableCell, styles.nameCell]}>
          <Text style={styles.headerText}>Medicine Name</Text>
        </View>
        <View style={[styles.tableCell, styles.daysCell]}>
          <Text style={styles.headerText}>Days</Text>
        </View>
        <View style={[styles.tableCell, styles.dosageCell]}>
          <Text style={styles.headerText}>Dosage</Text>
        </View>
      </View>

      {/* Table Rows */}
      {filteredMedicines?.map((medicine, index) => (
        <View key={medicine?.id || index} style={styles.tableRow}>
          <View style={[styles.tableCell, styles.snoCell]}>
            <Text style={styles.cellText}>{index + 1}</Text>
          </View>
          <View style={[styles.tableCell, styles.nameCell]}>
            <View style={styles.medicineNameCell}>
              <MedicineIcon type={medicine?.medicineType || 1} size={SCREEN_WIDTH < 375 ? 14 : 16} />
              <Text style={[styles.cellText, styles.medicineName]} numberOfLines={2}>
                {medicine?.medicineName ? 
                  medicine?.medicineName?.slice(0, 1)?.toUpperCase() + 
                  medicine?.medicineName?.slice(1)?.toLowerCase() 
                  : 'Unknown'
                }
              </Text>
            </View>
          </View>
          <View style={[styles.tableCell, styles.daysCell]}>
            <Text style={styles.cellText}>{medicine?.daysCount || '-'}</Text>
          </View>
          <View style={[styles.tableCell, styles.dosageCell]}>
            <Text style={styles.cellText}>
              {medicine?.doseCount || '0'} {getDosageUnit(medicine?.medicineType || 1)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// Empty State Component
const EmptyTreatmentPlan = ({ onAddMedicine }: { onAddMedicine: () => void }) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No treatment plan yet!</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddMedicine}>
          <PlusIcon size={SCREEN_WIDTH < 375 ? 18 : 20} color="#fff" />
          <Text style={styles.addButtonText}>ADD MEDICATION</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Component
const TreatmentPlanScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  
  const [medicineList, setMedicineList] = useState<MedicineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopTab, setActiveTopTab] = useState<TopTabType>('medication');
  const [medFilter, setMedFilter] = useState<number>(-1);

  const getAllMedicineApi = useRef(true);

  // Medicine filter options
  const medFilterOptions: MedicineFilter[] = [
    { label: "All", value: -1 },
    { label: "Capsules", value: 1 },
    { label: "Syrups", value: 2 },
    { label: "Tablets", value: 3 },
    { label: "Injections", value: 4 },
    { label: "IV Line", value: 5 },
    { label: "Tubing", value: 6 },
    { label: "Topical", value: 7 },
    { label: "Drops", value: 8 },
    { label: "Spray", value: 9 },
    { label: "Ventilator", value: 10 },
  ];

  const getAllMedicine = async () => {
    try {
      setError(null);
      
      if (!currentPatient?.patientTimeLineID) {
        setError('No patient timeline ID found');
        setLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await AuthFetch(`medicine/${currentPatient.patientTimeLineID}`, token);

      if (response && response.status === "success") {
        setMedicineList(response?.data?.medicines || []);
      } else {
        setError(response?.message || 'Failed to fetch medicines');
        setMedicineList([]);
      }
    } catch (error: any) {
      setError(error?.message || 'Network error');
      setMedicineList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPatient?.patientTimeLineID && getAllMedicineApi.current) {
      getAllMedicineApi.current = false;
      getAllMedicine();
    } else if (!currentPatient?.patientTimeLineID) {
      setLoading(false);
      setError('No patient selected or patient has no timeline');
    }
  }, [currentPatient]);

  const handleAddMedicine = () => {
    navigation.navigate('AddMedicineScreen' as never);
  };

  const handleViewTimeline = () => {
    if (!currentPatient?.patientTimeLineID) {
      Alert.alert('Error', 'No timeline available for this patient');
      return;
    }
    
    navigation.navigate('MedicationTimelineScreen' as never, {
      timelineID: currentPatient?.patientTimeLineID,
      patientName: currentPatient?.pName,
      patientId: currentPatient?.patientid
    } as never);
  };

  const retryFetch = () => {
    setLoading(true);
    getAllMedicine();
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading treatment plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Treatment Plan</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {medicineList?.length === 0 ? (
        <EmptyTreatmentPlan onAddMedicine={handleAddMedicine} />
      ) : (
        <View style={styles.container}>
          {/* Top Tabs */}
          <View style={styles.topTabs}>
            <TouchableOpacity
              style={[
                styles.tabPill,
                activeTopTab === 'medication' && styles.tabPillActive
              ]}
              onPress={() => setActiveTopTab('medication')}
            >
              <Text style={[
                styles.tabPillText,
                activeTopTab === 'medication' && styles.tabPillTextActive
              ]}>
                Medication
              </Text>
            </TouchableOpacity>

            <View style={styles.topActions}>
              <TouchableOpacity 
                style={styles.addMedicineButton}
                onPress={handleAddMedicine}
              >
                <PlusIcon size={SCREEN_WIDTH < 375 ? 16 : 18} color="#fff" />
                <Text style={styles.addMedicineButtonText}>Add Medicine</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {activeTopTab === 'medication' && (
              <View style={styles.medicationPanel}>
                {/* Filter Bar */}
                <View style={styles.filterBar}>
                  <View style={styles.filterContainer}>
                    <Text style={styles.filterLabel}>Filter:</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.filterScroll}
                      contentContainerStyle={styles.filterScrollContent}
                    >
                      {medFilterOptions?.map((option) => (
                        <TouchableOpacity
                          key={option?.value}
                          style={[
                            styles.filterOption,
                            medFilter === option?.value && styles.filterOptionActive
                          ]}
                          onPress={() => setMedFilter(option?.value)}
                        >
                          <Text style={[
                            styles.filterOptionText,
                            medFilter === option?.value && styles.filterOptionTextActive
                          ]}>
                            {option?.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Medicine List */}
                <ScrollView 
                  style={styles.medicineList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.medicineListContent}
                >
                  <MedicineDataTable medicines={medicineList} category={medFilter} />
                </ScrollView>
              </View>
            )}

            {activeTopTab === 'procedure' && (
              <View style={styles.procedurePanel}>
                <Text style={styles.comingSoonText}>Procedures coming soon...</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footerContainer, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.bottomShield, { height: insets.bottom }]} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 16 : 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 18 : 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: SCREEN_WIDTH < 375 ? 10 : 12,
    paddingVertical: SCREEN_WIDTH < 375 ? 6 : 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  timelineButtonText: {
    marginLeft: 6,
    fontSize: SCREEN_WIDTH < 375 ? 12 : 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 16 : 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    fontWeight: '600',
    color: '#fff',
  },
  topTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tabPill: {
    paddingHorizontal: SCREEN_WIDTH < 375 ? 16 : 20,
    paddingVertical: SCREEN_WIDTH < 375 ? 6 : 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  tabPillActive: {
    backgroundColor: '#14b8a6',
  },
  tabPillText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabPillTextActive: {
    color: '#fff',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMedicineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingVertical: SCREEN_WIDTH < 375 ? 6 : 8,
    borderRadius: 8,
  },
  addMedicineButtonText: {
    marginLeft: 6,
    fontSize: SCREEN_WIDTH < 375 ? 12 : 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  medicationPanel: {
    flex: 1,
  },
  procedurePanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    color: '#64748b',
  },
  filterBar: {
    padding: SCREEN_WIDTH < 375 ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  filterScroll: {
    flex: 1,
  },
  filterScrollContent: {
    paddingRight: 16,
  },
  filterOption: {
    paddingHorizontal: SCREEN_WIDTH < 375 ? 10 : 12,
    paddingVertical: SCREEN_WIDTH < 375 ? 5 : 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  filterOptionActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#0d9488',
  },
  filterOptionText: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 12,
    fontWeight: '500',
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  medicineList: {
    flex: 1,
  },
  medicineListContent: {
    flexGrow: 1,
  },
  tableContainer: {
    flex: 1,
    padding: SCREEN_WIDTH < 375 ? 12 : 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  tableCell: {
    paddingVertical: SCREEN_WIDTH < 375 ? 10 : 12,
    paddingHorizontal: SCREEN_WIDTH < 375 ? 6 : 8,
    justifyContent: 'center',
  },
  snoCell: {
    width: SCREEN_WIDTH < 375 ? 50 : 60,
    alignItems: 'center',
  },
  nameCell: {
    flex: 2,
  },
  daysCell: {
    width: SCREEN_WIDTH < 375 ? 50 : 60,
    alignItems: 'center',
  },
  dosageCell: {
    width: SCREEN_WIDTH < 375 ? 70 : 80,
    alignItems: 'center',
  },
  headerText: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    color: '#374151',
  },
  medicineNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicineName: {
    marginLeft: 6,
    flex: 1,
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    color: '#64748b',
    textAlign: 'center',
  },
  footerContainer: {
    left: 0,
    right: 0,
    height: 70,
    justifyContent: 'center',
  },
  bottomShield: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});

export default TreatmentPlanScreen;