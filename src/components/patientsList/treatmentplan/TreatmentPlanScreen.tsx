// TreatmentPlanScreen.tsx
import React, { useState, useEffect, useCallback, JSX } from 'react';
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
  Modal,
  Image,
  Keyboard,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Droplets as SyrupIcon,
  PillIcon,
  FilterIcon,
  ScissorsLineDashed as TestTubeIcon,
  Syringe as SyringeIcon, 
  DropletIcon,
  BandageIcon,
  Circle as SquareIcon,
  WindIcon,
} from 'lucide-react-native';
import { 
  ActivityIcon, 
  ClockIcon,
  PlusIcon,
  UserIcon,
} from '../../../utils/SvgIcons';
import { MedicineType } from '../../../utils/types';
import { RootState } from '../../../store/store';
import { AuthFetch } from '../../../auth/auth';
import Footer from '../../dashboard/footer';
import usePreOpForm from '../../../utils/usePreOpForm';
import usePostOPStore from '../../../utils/usePostopForm';
import { showError } from '../../../store/toast.slice';
import { COLORS } from '../../../utils/colour';
import { formatDate } from '../../../utils/dateTime';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor: number = 0.5) =>
  size + (scale(size) - size) * factor;

// Types
type TopTabType = 'medication' | 'procedure';
type MedicineFilter = {
  label: string;
  value: number;
  icon: JSX.Element;
};

type UserData = {
  imageURL?: string;
  firstName: string;
  lastName: string;
  phoneNo: string;
  gender: string;
  dob: string;
  state: string;
  city: string;
  pinCode: string;
  email: string;
  address: string;
  departmentID: string;
  role: number;
};

const RoleList: { [key: number]: string } = {
  10007: 'sAdmin',
  9999: 'admin',
  4001: 'doctor',
  2003: 'nurse',
  1003: 'staff',
  3001: 'management',
  6001: 'reception',
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

// Helper: convert pre-op / post-op medications object to flat array
const convertPreOpMedicationsToArray = (medications: any): MedicineType[] => {
  if (!medications) return [];
  
  const flatArray: MedicineType[] = [];
  
  Object.entries(medications).forEach(([category, meds]) => {
    if (Array.isArray(meds)) {
      meds.forEach((med: any) => {
        let medicineType = 1; // default capsules
        
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
          id: med.id || Math.random(),
          medicineName: med.medicineName || med.name || 'Unknown',
          daysCount: med.daysCount || med.days || 0,
          doseCount: med.doseCount || med.dose || 0,
        });
      });
    }
  });
  
  return flatArray;
};

const getDosageUnit = (medicineType: number): string => {
  const units: { [key: number]: string } = {
    1: 'mg', // Capsules
    3: 'mg', // Tablets
    6: 'g',  // Tubing
    7: 'g',  // Topical
  };
  return units[medicineType] || 'ml';
};

const getMedTypeLabel = (type: number, filterOptions: MedicineFilter[]): string => {
  const found = filterOptions.find(f => f.value === type);
  return found?.label || 'Unknown';
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
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
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
        {!readOnly && user?.roleName !== "reception" && currentPatient?.ptype != 21 &&
          <TouchableOpacity style={styles.primaryButton} onPress={onAddMedicine}>
            <PlusIcon size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Add Medication</Text>
          </TouchableOpacity>
        }
      </View>
    </View>
  );
};

type TreatmentPlanProps = {
  currentTab?: TopTabType;
};

// Medicine Cards List
const MedicineCardsList = ({
  medicines,
  category,
  medFilterOptions,
  onAddedByPress,
}: {
  medicines: MedicineType[];
  category: number;
  medFilterOptions: MedicineFilter[];
  onAddedByPress: (medicine: MedicineType) => void;
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const safeMedicines = Array.isArray(medicines) ? medicines : [];

  const filteredMedicines =
    category === -1
      ? safeMedicines
      : safeMedicines.filter((med) => med?.medicineType === category);

  if (!filteredMedicines || filteredMedicines.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataTitle}>No Medicines Found</Text>
        <Text style={styles.noDataText}>Try selecting a different filter</Text>
      </View>
    );
  }

  return (
    <View style={styles.cardsWrapper}>
      {filteredMedicines.map((medicine: any, index: number) => {
        const medName = medicine?.medicineName
          ? medicine.medicineName.charAt(0).toUpperCase() +
            medicine.medicineName.slice(1).toLowerCase()
          : 'Unknown';

        const medTypeLabel = getMedTypeLabel(medicine?.medicineType || 1, medFilterOptions);
        const dosageUnit = getDosageUnit(medicine?.medicineType || 1);
        const dosageValue = medicine?.doseCount || medicine?.dosage || '-';
        const daysValue = medicine?.daysCount ?? '-';
        const timing = medicine?.medicationTime || medicine?.doseTimings || '';

        return (
          <View
            key={medicine?.id || `${medName}-${index}`}
            style={styles.medicineCard}
          >
            <View style={styles.medicineCardRow}>
              <View style={styles.medicineAvatar}>
                <MedicineIcon
                  type={medicine?.medicineType || 1}
                  size={20}
                  color="#14b8a6"
                />
              </View>

              <View style={styles.medicineMeta}>
                <View style={styles.medicineNameRow}>
                  <Text
                    style={styles.medicineCardName}
                    numberOfLines={1}
                  >
                    {medName}
                  </Text>
                  <Text style={styles.medicineTypeBadge}>
                    {medTypeLabel}
                  </Text>
                </View>

                <View style={styles.medicineInfoRow}>
                  <Text style={styles.medicineInfoText}>
                    Days: <Text style={styles.medicineInfoStrong}>{daysValue}</Text>
                  </Text>
                  <Text style={styles.medicineDot}>•</Text>
                  <Text style={styles.medicineInfoText}>
                    Dosage:{' '}
                    <Text style={styles.medicineInfoStrong}>
                      {dosageValue} {dosageUnit}
                    </Text>
                  </Text>
                </View>

                {!!timing && (
                  <Text style={styles.medicineTimingText}>
                    {timing.split(',').map((time: string, idx: number, arr: string[]) => (
                      <Text key={idx}>
                        {time.trim()}
                        {idx < arr.length - 1 ? '\n' : ''}
                      </Text>
                    ))}
                  </Text>
                )}

                <Text style={styles.medicineInfoStrong}>
                  Note:{' '}
                  <Text style={styles.medicineInfoText}>
                    {medicine?.notes || '-'}
                  </Text>
                </Text>

                {medicine?.userID && (
                  <TouchableOpacity
                    onPress={() => onAddedByPress(medicine)}
                    style={styles.addedByRow}
                  >
                    <View style={styles.userContainer}>
                      <UserIcon size={moderateScale(12)} color={COLORS.brand} />
                      <Text style={styles.userText}>
                        Added By: {user?.firstName} {user?.lastName || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Main Component
const TreatmentPlanScreen: React.FC<TreatmentPlanProps> = (props) => {
  const navigation = useNavigation<any>();
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
    currentPatient?.status === "approved" ||
    activetab === "PatientFile";

  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');
  const [currentMedicines, setCurrentMedicines] = useState<MedicineType[]>([]);
  const [previousMedicines, setPreviousMedicines] = useState<MedicineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medFilter, setMedFilter] = useState<number>(-1);

  // User details modal states (same as TestsScreen)
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [viewDepartment, setViewDepartment] = useState<string>("");
  const [viewRole, setViewRole] = useState<string>("");
  const [viewGender, setViewGender] = useState<string>("");
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Medicine filter options with icons:
  const medFilterOptions: MedicineFilter[] = [
    { 
      label: "All", value: -1,
      icon: <View style={[styles.allFilterIcon, { backgroundColor: COLORS.sub }]}></View>
    },
    { label: "Capsules", value: 1, icon: <PillIcon size={16} color={COLORS.sub} /> },
    { label: "Syrups", value: 2, icon: <SyrupIcon size={16} color={COLORS.sub} /> },
    { label: "Tablets", value: 3, icon: <SquareIcon size={16} color={COLORS.sub} /> },
    { label: "Injections", value: 4, icon: <SyringeIcon size={16} color={COLORS.sub} /> },
    { label: "IV Line", value: 5, icon: <ActivityIcon size={16} color={COLORS.sub} /> },
    { label: "Tubing", value: 6, icon: <TestTubeIcon size={16} color={COLORS.sub} /> },
    { label: "Topical", value: 7, icon: <BandageIcon size={16} color={COLORS.sub} /> },
    { label: "Drops", value: 8, icon: <DropletIcon size={16} color={COLORS.sub} /> },
    { label: "Spray", value: 9, icon: <WindIcon size={16} color={COLORS.sub} /> },
    { label: "Ventilator", value: 10, icon: <WindIcon size={16} color={COLORS.sub} /> },
  ];

  const getAllMedicine = async () => {
    try {
      setError(null);
      
      // Pre-op / Post-op from local store
      if (shouldShowPreOpTests || shouldShowPostOpTests) {
        const sourceMeds = shouldShowPreOpTests ? preOpMedications : postOpMedications;
        const mapped = convertPreOpMedicationsToArray(sourceMeds);
        setCurrentMedicines(mapped || []);
        setPreviousMedicines([]);
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

      const response = await AuthFetch(`medicine/${currentPatient.id}/${currentPatient.patientTimeLineID}/getPatientMedicineHistory`, token) as any;
      if (response && response.status === "success" && "data" in response) {
        const data = response.data?.data;
        setCurrentMedicines(data?.currentMedicines || []);
        setPreviousMedicines(data?.previousMedicines || []);
      } else {
        setError(response?.message || 'Failed to load medicines');
        setCurrentMedicines([]);
        setPreviousMedicines([]);
      }
    } catch (error: any) {
      setError(error?.message || 'Network error');
      setCurrentMedicines([]);
      setPreviousMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldShowPreOpTests) {
      const mapped = convertPreOpMedicationsToArray(preOpMedications);
      setCurrentMedicines(mapped || []);
      setPreviousMedicines([]);
      setLoading(false);
      return;
    }

    if (shouldShowPostOpTests) {
      const mapped = convertPreOpMedicationsToArray(postOpMedications);
      setCurrentMedicines(mapped || []);
      setPreviousMedicines([]);
      setLoading(false);
      return;
    }

    if (currentPatient?.patientTimeLineID) {
        setLoading(true);
        getAllMedicine();
    }
  }, [
    currentPatient?.patientTimeLineID,
    shouldShowPreOpTests,
    shouldShowPostOpTests,
    preOpMedications,   
    postOpMedications      
  ])
);

  
  // Also update when pre-op / post-op medications change
  useEffect(() => {
    if (shouldShowPreOpTests && preOpMedications) {
      const mapped = convertPreOpMedicationsToArray(preOpMedications);
      setCurrentMedicines(mapped || []);
    } else if (shouldShowPostOpTests && postOpMedications) {
      const mapped = convertPreOpMedicationsToArray(postOpMedications);
      setCurrentMedicines(mapped || []);
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

  // Fetch user details (same logic as TestsScreen)
  const fetchUserData = async (userId: number) => {
    if (!userId) return;
    
    setLoadingUserData(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(`user/${userId}`, token)as any;
      
      if (res?.data?.message === "success") {
        const fetchedUser = res?.data?.user as UserData;
        
        // Fetch department name
        if (fetchedUser.departmentID) {
          const deptRes = await AuthFetch(`department/singledpt/${fetchedUser.departmentID}`, token)as any;
          if (deptRes?.data?.message === "success") {
            setViewDepartment(deptRes.data.department[0]?.name || "");
          }
        }
        
        // Set role
        setViewRole(RoleList[fetchedUser.role] || "");
        
        // Set gender
        let gender = "others";
        if (fetchedUser.gender === "1") {
          gender = "male";
        } else if (fetchedUser.gender === "2") {
          gender = "female";
        }
        setViewGender(gender);
        
        setUserData(fetchedUser);
        setUserModalVisible(true);
      }
    } catch (error: any) {
      dispatch(showError("Failed to load user details"));
    } finally {
      setLoadingUserData(false);
    }
  };

  const handleUserPress = (userId: number) => {
    setSelectedUserId(userId);
    fetchUserData(userId);
  };

  const openAddedByModal = (medicine: MedicineType) => {
    if (!medicine?.userID) {
      dispatch(showError("User details not available for this medicine."));
      return;
    }
    handleUserPress(medicine.userID as number);
  };

  // Get active medicines based on selected tab
  const getActiveMedicines = () => {
    return activeTab === 'current' ? currentMedicines : previousMedicines;
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

  const activeMedicines = getActiveMedicines();
  const totalMedicines = currentMedicines.length + previousMedicines.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {totalMedicines === 0 ? (
        <EmptyTreatmentPlan onAddMedicine={handleAddMedicine} readOnly={readOnly} />
      ) : (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleViewTimeline}
              >
                <ClockIcon size={18} color="#000000" />
                <Text style={styles.secondaryButtonText}>View Timeline</Text>
              </TouchableOpacity>
              {!readOnly && user?.roleName !== "reception" && currentPatient?.ptype != 21 &&
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={handleAddMedicine}
                >
                  <PlusIcon size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Add Medication</Text>
                </TouchableOpacity>
              }
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Tab Section */}
            <View style={styles.tabSection}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'current' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('current')}
              >
                <Text style={[
                  styles.tabButtonText,
                  activeTab === 'current' && styles.activeTabButtonText
                ]}>
                  Current ({currentMedicines.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'previous' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('previous')}
              >
                <Text style={[
                  styles.tabButtonText,
                  activeTab === 'previous' && styles.activeTabButtonText
                ]}>
                  Previous ({previousMedicines.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
              <View style={styles.filterDropdownContainer}>
                <View style={styles.filterDropdownIcon}>
                  <FilterIcon
                    size={16}
                    color={medFilter !== -1 ? '#14b8a6' : '#64748b'}
                  />
                </View>
                <View style={styles.filterPickerWrapper}>
                  <Picker
                    selectedValue={medFilter}
                    onValueChange={(value) => setMedFilter(value)}
                    style={styles.filterPicker}
                    dropdownIconColor="#14b8a6"
                  >
                    {medFilterOptions.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        color={COLORS.text}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Medicine Cards */}
            <View style={styles.medicineSection}>
              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>
                    {activeTab === 'current' ? 'Current' : 'Previous'} Treatment Plan {currentPatient?.pName ? `For ${currentPatient.pName}` : 'Patient medications'}
                  </Text>
                </View>
                <MedicineCardsList
                  medicines={activeMedicines}
                  category={medFilter}
                  medFilterOptions={medFilterOptions}
                  onAddedByPress={openAddedByModal}
                />
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footerContainer, { bottom: insets.bottom }]}>
        <Footer active="patients" brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && !isKeyboardVisible && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

      {/* User Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={userModalVisible}
        onRequestClose={() => setUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Added By</Text>
                <TouchableOpacity onPress={() => setUserModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              {loadingUserData ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.brand} />
                  <Text style={styles.loadingText}>Loading user details...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.modalBody}>
                    {userData?.imageURL ? (
                      <View style={styles.imageContainer}>
                        <Image 
                          source={{ uri: userData.imageURL }} 
                          style={styles.profileImage}
                          resizeMode="cover"
                        />
                      </View>
                    ) : (
                      <View style={styles.noImageContainer}>
                        <UserIcon size={moderateScale(40)} color={COLORS.sub} />
                        <Text style={styles.noImageText}>No profile image</Text>
                      </View>
                    )}
                    
                    <Text style={styles.userId}>ID: {selectedUserId ?? '—'}</Text>
                    
                    <View style={styles.gridContainer}>
                      {/* First Name */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>First Name</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.firstName || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Last Name */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Last Name</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.lastName || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Department */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Department</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{viewDepartment || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Role */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Role</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{viewRole || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Phone Number */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.phoneNo || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Gender */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Gender</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{viewGender || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Date of Birth */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Date of Birth</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>
                            {userData?.dob ? formatDate(userData.dob) : ""}
                          </Text>
                        </View>
                      </View>
                      
                      {/* State */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>State</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.state || ""}</Text>
                        </View>
                      </View>
                      
                      {/* City */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>City</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.city || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Pincode */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Pincode</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.pinCode || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Email */}
                      <View style={[styles.inputContainer, styles.fullWidth]}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.email || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Address */}
                      {userData?.address && (
                        <View style={[styles.inputContainer, styles.fullWidth]}>
                          <Text style={styles.inputLabel}>Address</Text>
                          <View style={styles.inputValue}>
                            <Text style={styles.inputText}>{userData?.address || ""}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: COLORS.brand }]}
                      onPress={() => setUserModalVisible(false)}
                    >
                      <Text style={[styles.modalButtonText, { color: '#fff' }]}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Styles (unchanged from your original)
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
  // loadingText: {
  //   fontSize: 14,
  //   color: '#64748b',
  //   textAlign: 'center',
  //   lineHeight: 20,
  // },
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
    paddingVertical: 12,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  headerContent: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
    fontStyle: 'italic', 
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    gap: 5             ,
  },
  content: {
    flex: 1,
     marginBottom: 80,
  },
  // Tab Section Styles
  tabSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#14b8a6',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabButtonText: {
    color: '#14b8a6',
    fontWeight: '700',
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomColor: '#f1f5f9',
  },
  filterDropdownContainer: {
    minHeight: 54,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  filterDropdownIcon: {
    marginRight: 6,
  },
  filterPickerWrapper: {
    flex: 1,
  },
  filterPicker: {
    flex: 1,
    height: 40,
    marginLeft: 2,
    marginRight: -12,
  },
  allFilterIcon: {
    width: 0,
    height: 0,
    borderRadius: 8,
    backgroundColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineSection: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  cardsWrapper: {
    paddingBottom: 20,
  },
  medicineCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medicineCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicineAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#f8fafc',
  },
  medicineMeta: {
    flex: 1,
    minHeight: 60,
  },
  medicineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  medicineCardName: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    color: '#0f172a',
  },
  medicineTypeBadge: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: '700',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#0f766e',
  },
  medicineInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  medicineInfoText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    color: '#64748b',
  },
  medicineInfoStrong: {
    fontWeight: '700',
    color: '#0f172a',
  },
  medicineDot: {
    fontSize: 12,
    color: '#64748b',
  },
  medicineTimingText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    marginTop: 4,
    color: COLORS.sub,
    flexWrap: 'wrap',
    flexDirection: 'row',
    flex: 1,
  },
  addedByRow: {
    marginTop: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 18,
    paddingVertical: 10,
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#14b8a6',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 64,
    justifyContent: 'center',
    zIndex: 5,
  },
  navShield: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  userText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    textDecorationLine: 'underline',
    color: COLORS.brand,
  },
  // User Details Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: moderateScale(8),
  },
  closeButtonText: {
    fontSize: moderateScale(18),
    color: '#666',
  },
  modalBody: {
    padding: moderateScale(16),
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  profileImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 2,
    borderColor: COLORS.brand,
  },
  noImageContainer: {
    alignItems: 'center',
    marginBottom: moderateScale(16),
    padding: moderateScale(20),
    backgroundColor: '#f5f5f5',
    borderRadius: moderateScale(50),
  },
  noImageText: {
    fontSize: moderateScale(12),
    color: COLORS.sub,
    marginTop: moderateScale(4),
  },
  userId: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: moderateScale(16),
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  inputContainer: {
    width: '48%',
    marginBottom: moderateScale(12),
  },
  fullWidth: {
    width: '100%',
  },
  inputLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#666',
    marginBottom: moderateScale(4),
  },
  inputValue: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: moderateScale(6),
    padding: moderateScale(8),
    backgroundColor: '#f9f9f9',
  },
  inputText: {
    fontSize: moderateScale(14),
    color: '#333',
  },
  modalFooter: {
    padding: moderateScale(16),
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  loadingContainer: {
    padding: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TreatmentPlanScreen;