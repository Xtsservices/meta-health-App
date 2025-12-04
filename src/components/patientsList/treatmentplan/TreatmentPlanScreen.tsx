import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
import usePreOpForm from '../../../utils/usePreOpForm';
import usePostOPStore from '../../../utils/usePostopForm';
import { showError } from '../../../store/toast.slice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
type TopTabType = 'medication' | 'procedure';
type MedicineFilter = {
  label: string;
  value: number;
  icon: JSX.Element;
};

// Medicine Icon Component
const MedicineIcon = ({ type, size = 24, color = "#14b8a6" }: { type: number; size?: number; color?: string }) => {
  const iconProps = { size, color };
  
  const icons = {
    1: <PillIcon {...iconProps} />,
    2: <SyrupIcon {...iconProps} />,
    3: <SquareIcon {...iconProps} />,
    4: <SyringeIcon {...iconProps} />,
    5: <ActivityIcon {...iconProps} />,
    6: <TestTubeIcon {...iconProps} />,
    7: <BandageIcon {...iconProps} />,
    8: <DropletIcon {...iconProps} />,
    9: <WindIcon {...iconProps} />,
    10: <WindIcon {...iconProps} />,
  };

  return icons[type as keyof typeof icons] || <PillIcon {...iconProps} />;
};

// Helper function to convert pre-op medications object to flat array
const convertPreOpMedicationsToArray = (medications: any): MedicineType[] => {
  if (!medications) return [];
  
  const flatArray: MedicineType[] = [];
  
  // Map each category to the flat array
  Object.entries(medications).forEach(([category, meds]) => {
    if (Array.isArray(meds)) {
      meds.forEach((med: any) => {
        // Convert category name to medicineType number
        let medicineType = 1; // default to capsules
        
        switch (category) {
          case 'capsules': medicineType = 1; break;
          case 'syrups': medicineType = 2; break;
          case 'tablets': medicineType = 3; break;
          case 'injections': medicineType = 4; break;
          case 'ivLine': medicineType = 5; break;
          case 'tubing': medicineType = 6; break;
          case 'topical': medicineType = 7; break;
          case 'drop': medicineType = 8; break;
          case 'spray': medicineType = 9; break;
          default: medicineType = 1;
        }
        
        flatArray.push({
          ...med,
          medicineType,
          id: med.id || Math.random(), // Ensure each item has an id
          medicineName: med.medicineName || med.name || 'Unknown',
          daysCount: med.daysCount || med.days || 0,
          doseCount: med.doseCount || med.dose || 0,
        });
      });
    }
  });
  
  return flatArray;
};

// Medicine Data Table Component
const MedicineDataTable = ({ medicines, category }: { medicines: MedicineType[]; category: number }) => {
  // Ensure medicines is always an array
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  
  const filteredMedicines = category === -1 
    ? safeMedicines 
    : safeMedicines?.filter(med => med?.medicineType === category);
  

  const getDosageUnit = (medicineType: number): string => {
    const units: { [key: number]: string } = {
      1: 'mg', // Capsules
      3: 'mg', // Tablets
      6: 'g',  // Tubing
      7: 'g',  // Topical
    };
    return units[medicineType] || 'ml';
  };

  if (filteredMedicines?.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataTitle}>No Medicines Found</Text>
        <Text style={styles.noDataText}>Try selecting a different filter</Text>
      </View>
    );
  }

  return (
    <View style={styles.tableContainer}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={[styles.tableCell, styles.snoCell]}>
          <Text style={styles.headerText}>#</Text>
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
        <View key={medicine?.id || index} style={[
          styles.tableRow,
          index % 2 === 0 && styles.tableRowEven
        ]}>
          <View style={[styles.tableCell, styles.snoCell]}>
            <Text style={styles.cellText}>{index + 1}</Text>
          </View>
          <View style={[styles.tableCell, styles.nameCell]}>
            <View style={styles.medicineNameCell}>
              <MedicineIcon type={medicine?.medicineType || 1} size={20} />
              <Text style={[styles.cellText, styles.medicineName]} numberOfLines={1}>
                {medicine?.medicineName ? 
                  medicine.medicineName.charAt(0).toUpperCase() + 
                  medicine.medicineName.slice(1).toLowerCase() 
                  : 'Unknown'
                }
              </Text>
            </View>
          </View>
          <View style={[styles.tableCell, styles.daysCell]}>
            <View style={styles.daysBadge}>
              <Text style={styles.daysText}>{medicine?.daysCount || '-'}</Text>
            </View>
          </View>
          <View style={[styles.tableCell, styles.dosageCell]}>
            <Text style={styles.dosageText}>
              {medicine?.doseCount || medicine?.dosage} {getDosageUnit(medicine?.medicineType || 1)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// Empty State Component
const EmptyTreatmentPlan = ({
  onAddMedicine,
  readOnly,
}: {
  onAddMedicine: () => void;
  readOnly: boolean;
}) => {
  const user = useSelector((s: RootState) => s.currentUser);

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIcon}>
          <PillIcon size={48} color="#94a3b8" />
        </View>
      </View>
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No Treatment Plan Yet</Text>
        <Text style={styles.emptySubtitle}>
          Start by adding medications to create a treatment plan for your patient
        </Text>
        {!readOnly && user?.roleName !== "reception" && 
        <TouchableOpacity style={styles.primaryButton} onPress={onAddMedicine}>
          <PlusIcon size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Add Medication</Text>
        </TouchableOpacity>}
      </View>
    </View>
  );
};

type TreatmentPlanProps = {
  currentTab?: TopTabType;
};

// Filter Bar Component
const FilterBar = ({ 
  filters, 
  activeFilter, 
  onFilterChange 
}: { 
  filters: MedicineFilter[];
  activeFilter: number;
  onFilterChange: (value: number) => void;
}) => {
  return (
    <View style={styles.filterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {filters.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterOption,
              activeFilter === option.value && styles.filterOptionActive
            ]}
            onPress={() => onFilterChange(option.value)}
          >
            {option.icon}
            <Text style={[
              styles.filterOptionText,
              activeFilter === option.value && styles.filterOptionTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Main Component
const TreatmentPlanScreen: React.FC<TreatmentPlanProps> = (props) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 16; 
  const route = useRoute<any>();        
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const { medications: preOpMedications } = usePreOpForm();
const { medications: postOpMedications } = usePostOPStore();
const dispatch = useDispatch();
  
  const activetab = route.params?.currentTab;
  const shouldShowPreOpTests = activetab === "PreOpRecord";
const shouldShowPostOpTests = activetab === "PostOpRecord";

const readOnly =
  (shouldShowPreOpTests && user?.roleName?.toLowerCase() === "surgeon") ||
  activetab === "PatientFile";

  const [medicineList, setMedicineList] = useState<MedicineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopTab, setActiveTopTab] = useState<TopTabType>('medication');
  const [medFilter, setMedFilter] = useState<number>(-1);

  // Medicine filter options with icons
  const medFilterOptions: MedicineFilter[] = [
    { 
      label: "All", 
      value: -1, 
      icon: <View style={styles.allFilterIcon}><Text style={styles.allFilterText}>All</Text></View>
    },
    { label: "Capsules", value: 1, icon: <PillIcon size={16} color="#64748b" /> },
    { label: "Syrups", value: 2, icon: <SyrupIcon size={16} color="#64748b" /> },
    { label: "Tablets", value: 3, icon: <SquareIcon size={16} color="#64748b" /> },
    { label: "Injections", value: 4, icon: <SyringeIcon size={16} color="#64748b" /> },
    { label: "IV Line", value: 5, icon: <ActivityIcon size={16} color="#64748b" /> },
    { label: "Tubing", value: 6, icon: <TestTubeIcon size={16} color="#64748b" /> },
    { label: "Topical", value: 7, icon: <BandageIcon size={16} color="#64748b" /> },
    { label: "Drops", value: 8, icon: <DropletIcon size={16} color="#64748b" /> },
    { label: "Spray", value: 9, icon: <WindIcon size={16} color="#64748b" /> },
    { label: "Ventilator", value: 10, icon: <WindIcon size={16} color="#64748b" /> },
  ];

  const getAllMedicine = async () => {
    try {
      setError(null);
      
      // If showing pre-op tests, convert the medications object to flat array
      // If showing pre-op or post-op meds, convert the medications object to flat array
if (shouldShowPreOpTests || shouldShowPostOpTests) {
  const sourceMeds = shouldShowPreOpTests ? preOpMedications : postOpMedications;
  const mapped = convertPreOpMedicationsToArray(sourceMeds);
  setMedicineList(mapped || []);
  setLoading(false);
  return;
}

      
      if (!currentPatient?.patientTimeLineID) {
        setError('No patient timeline available');
        setLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await AuthFetch(`medicine/${currentPatient.patientTimeLineID}`, token);

      if (response && response.status === "success" && "data" in response) {
        setMedicineList(response?.data?.medicines || []);
      } else {
        setError(response?.message || 'Failed to load medicines');
        setMedicineList([]);
      }
    } catch (error: any) {
      setError(error?.message || 'Network error');
      setMedicineList([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
    if (currentPatient?.patientTimeLineID) {
      getAllMedicine();
    } else if (!currentPatient?.patientTimeLineID) {
      setLoading(false);
      setError('No patient selected');
    }
  }, [currentPatient]))
  
  // Also update when medications from pre-op form change
// Also update when pre-op / post-op medications change
useEffect(() => {
  if (shouldShowPreOpTests && preOpMedications) {
    const mapped = convertPreOpMedicationsToArray(preOpMedications);
    setMedicineList(mapped || []);
  } else if (shouldShowPostOpTests && postOpMedications) {
    const mapped = convertPreOpMedicationsToArray(postOpMedications);
    setMedicineList(mapped || []);
  }
}, [preOpMedications, postOpMedications, shouldShowPreOpTests, shouldShowPostOpTests]);


  const handleAddMedicine = () => {
    navigation.navigate('AddMedicineScreen', { currentTab: activetab });
  };

  const handleViewTimeline = () => {
    if (!currentPatient?.patientTimeLineID) {
      dispatch(showError("No timeline available for this patient"));
      return;
    }
    
    navigation.navigate(
  "NotificationScreen" as never,
  {
    timelineID: currentPatient.patientTimeLineID,
    patientName: currentPatient.pName,
    patientId: currentPatient.patientid,
    title: "Medicine Timeline",
  } as never
);
  };

  const retryFetch = () => {
    setLoading(true);
    getAllMedicine();
  };

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.centerContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingTitle}>Loading Treatment Plan</Text>
            <Text style={styles.loadingText}>Please wait while we fetch patient data...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error State
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.centerContainer}>
          <View style={styles.errorContent}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconText}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Unable to Load</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={retryFetch}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {medicineList.length === 0 ? (
        <EmptyTreatmentPlan onAddMedicine={handleAddMedicine} readOnly={readOnly} />
      ) : (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Treatment Plan</Text>
              <Text style={styles.headerSubtitle}>
                {currentPatient?.pName ? `For ${currentPatient.pName}` : 'Patient medications'}
              </Text>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleViewTimeline}
              >
                <ClockIcon size={18} color="#14b8a6" />
                <Text style={styles.secondaryButtonText}>View Timeline</Text>
              </TouchableOpacity>
                          {!readOnly && user?.roleName !== "reception" &&
              <TouchableOpacity 
                style={styles.primaryButtonSmall}
                onPress={handleAddMedicine}
              >
                <PlusIcon size={18} color="#fff" />
                <Text style={styles.primaryButtonTextSmall}>Add Medicine</Text>
              </TouchableOpacity>}
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Filter Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Filter by Type</Text>
              <FilterBar 
                filters={medFilterOptions}
                activeFilter={medFilter}
                onFilterChange={setMedFilter}
              />
            </View>

            {/* Medicine List */}
            <View style={styles.medicineSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {medFilter === -1 ? 'All Medications' : 
                   medFilterOptions.find(f => f.value === medFilter)?.label + ' Medications'}
                </Text>
                <Text style={styles.sectionCount}>
                  {medicineList.filter(med => medFilter === -1 || med.medicineType === medFilter).length} items
                </Text>
              </View>
              
              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <MedicineDataTable medicines={medicineList} category={medFilter} />
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
        <Footer active="patients" brandColor="#14b8a6" />
      </View>
    </SafeAreaView>
  );
};

// ... styles remain exactly the same ...
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 40,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContent: {
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  headerContent: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  filterSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterContainer: {
    marginHorizontal: -4,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginHorizontal: 4,
  },
  filterOptionActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  allFilterIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  medicineSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tableContainer: {
    padding: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  tableRowEven: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  snoCell: {
    width: 50,
    alignItems: 'center',
  },
  nameCell: {
    flex: 2,
  },
  daysCell: {
    width: 70,
    alignItems: 'center',
  },
  dosageCell: {
    width: 90,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  medicineNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medicineName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  daysBadge: {
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  daysText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14b8a6',
  },
  dosageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIllustration: {
    marginBottom: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});

export default TreatmentPlanScreen;