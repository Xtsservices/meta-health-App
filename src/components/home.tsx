import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// Icons
import {
  StethoscopeIcon,
  BedIcon,
  AlertTriangleIcon,
  ShieldAlertIcon,
  ClockIcon,
  CheckCircleIcon,
  MicroscopeIcon,
  ScanIcon,
  PillIcon,
  UsersIcon,
} from '../utils/SvgIcons';

import { Role_NAME, SCOPE_LIST } from '../utils/role';
import { currentUser, RootState, updatePatientStatus } from '../store/store';
import { showError } from '../store/toast.slice';

type CardSpec = {
  key: string;
  heading: string;
  link: string;
  paragraph: string;
  icon: React.ElementType;
  color: CardColor;
  status?: string;
};

type SectionSpec = { title: string; data: CardSpec[] };

type CardColor =
  | 'emergencyRed'
  | 'emergencyYellow'
  | 'emergencyGreen'
  | 'opd'
  | 'ipd'
  | 'triage'
  | 'pathology'
  | 'radiology'
  | 'pharmacy'
  | 'reception';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

/* ---------- Card Component ---------- */
type WidgetCardProps = {
  spec: CardSpec;
  selected: boolean;
  onPress: () => void;
  onArrowPress: () => void;
};

const WidgetCard: React.FC<WidgetCardProps> = ({ spec, selected, onPress, onArrowPress }) => {
  const IconComp = spec.icon as any;

  const colorStyleMap: Record<CardColor, any> = {
    emergencyRed: styles.card_emergencyRed,
    emergencyYellow: styles.card_emergencyYellow,
    emergencyGreen: styles.card_emergencyGreen,
    opd: styles.card_opd,
    ipd: styles.card_ipd,
    triage: styles.card_triage,
    pathology: styles.card_pathology,
    radiology: styles.card_radiology,
    pharmacy: styles.card_pharmacy,
    reception: styles.card_reception,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, colorStyleMap[spec.color], selected && styles.cardSelected]}
    >
      {!!spec.status && <Text style={styles.statusPill}>{spec.status}</Text>}

      <View style={styles.cardBody}>
        <View style={styles.cardLeft}>
          <View style={styles.iconWrap}>
            <IconComp size={18} color="#16b097" /> {/* NEW: slightly larger for mobile */}
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardHeading} numberOfLines={1}>
            {spec.heading}
          </Text>
          <Text style={styles.paragraph} numberOfLines={3}>
            {spec.paragraph}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onArrowPress} style={styles.arrowButton} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        {/* optional arrow image */}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

/* ---------- Main Screen ---------- */
const Home: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const dispatch = useDispatch();
  const [flags, setFlags] = useState({
    hasInpatient: false,
    hasOutpatient: false,
    hasTriage: false,
    hasEmergencyRedZone: false,
    hasEmergencyYellowZone: false,
    hasEmergencyGreenZone: false,
    hasPathology: false,
    hasRadiology: false,
    hasPharmacy: false,
    hasReception: false,
  });

  useEffect(() => {
    try {
      const userScopes = user?.scope?.split('#')?.map((n: string) => Number(n)) ?? [];
      setFlags({
        hasEmergencyRedZone: userScopes?.includes(SCOPE_LIST.emergency_red_zone),
        hasEmergencyYellowZone: userScopes?.includes(SCOPE_LIST.emergency_yellow_zone),
        hasEmergencyGreenZone: userScopes?.includes(SCOPE_LIST.emergency_green_zone),
        hasInpatient: userScopes?.includes(SCOPE_LIST.inpatient),
        hasOutpatient: userScopes?.includes(SCOPE_LIST.outpatient),
        hasTriage: userScopes?.includes(SCOPE_LIST.triage),
        hasPathology: userScopes?.includes(SCOPE_LIST.pathology),
        hasRadiology: userScopes?.includes(SCOPE_LIST.radiology),
        hasPharmacy: userScopes?.includes(SCOPE_LIST.pharmacy),
        hasReception: userScopes?.includes(SCOPE_LIST.reception),
      });
    } catch {
      // no-op
    }
  }, [user?.scope]);

  // NEW: helper to build a "show everything" section (used when no scopes available)
  const buildAllCards = useCallback((): SectionSpec[] => {
    const all: CardSpec[] = [
      {
        key: 'opd',
        heading: 'Outpatient Care',
        link: 'opd',
        paragraph: 'Manage patient visits, appointments, and same-day records',
        icon: StethoscopeIcon,
        color: 'opd',
      },
      {
        key: 'ipd',
        heading: 'Inpatient Services',
        link: 'inpatient',
        paragraph: 'Track beds, patient status, and care plans',
        icon: BedIcon,
        color: 'ipd',
      },
      {
        key: 'triage',
        heading: 'Patient Triage',
        link: 'triage',
        paragraph: 'Assess and prioritize patient needs quickly',
        icon: AlertTriangleIcon,
        color: 'triage',
      },
      {
        key: 'critical',
        heading: 'Critical Care',
        link: 'emergency-red',
        paragraph: 'Immediate protocols for high-priority patients',
        icon: ShieldAlertIcon,
        color: 'emergencyRed',
      },
      {
        key: 'urgent',
        heading: 'Urgent Care',
        link: 'emergency-yellow',
        paragraph: 'Time-sensitive monitoring and response',
        icon: ClockIcon,
        color: 'emergencyYellow',
      },
      {
        key: 'stable',
        heading: 'Stable Monitoring',
        link: 'emergency-green',
        paragraph: 'Track stable patients and routine updates',
        icon: CheckCircleIcon,
        color: 'emergencyGreen',
      },
      {
        key: 'lab',
        heading: 'Laboratory Services',
        link: 'pathology',
        paragraph: 'Access test results and diagnostic info',
        icon: MicroscopeIcon,
        color: 'pathology',
      },
      {
        key: 'imaging',
        heading: 'Medical Imaging',
        link: 'radiology',
        paragraph: 'Review scans and radiology reports',
        icon: ScanIcon,
        color: 'radiology',
      },
      {
        key: 'pharmacy',
        heading: 'Pharmacy Management',
        link: 'pharmacy',
        paragraph: 'Med orders, inventory, prescriptions',
        icon: PillIcon,
        color: 'pharmacy',
      },
      {
        key: 'patient-services',
        heading: 'Patient Services',
        link: 'reception',
        paragraph: 'Check-ins, scheduling, admin tasks',
        icon: UsersIcon,
        color: 'reception',
      },
    ];
    return [{ title: 'Quick Access', data: all }];
  }, []);

  const sectionsData: SectionSpec[] = useMemo(() => {
    const sections: SectionSpec[] = [];
    const anyTrue = Object.values(flags).some(Boolean);
    // If the user has no scopes (or scope not yet loaded), show everything so UI isn't blank.
    if (!anyTrue) {
      return buildAllCards(); // NEW: fallback so you see cards immediately
    }

    const patientCare: CardSpec[] = [];
    if (flags.hasOutpatient)
      patientCare.push({
        key: 'opd',
        heading: 'Outpatient Care',
        link: 'opd',
        paragraph: 'Manage patient visits, appointments, and treatment records for same-day care',
        icon: StethoscopeIcon,
        color: 'opd',
      });
    if (flags.hasInpatient)
      patientCare.push({
        key: 'ipd',
        heading: 'Inpatient Services',
        link: 'inpatient',
        paragraph: 'Track bed allocation, patient status, and care plans for admitted patients',
        icon: BedIcon,
        color: 'ipd',
      });
    if (flags.hasTriage)
      patientCare.push({
        key: 'triage',
        heading: 'Patient Triage',
        link: 'triage',
        paragraph: 'Assess and prioritize patient needs for efficient care allocation',
        icon: AlertTriangleIcon,
        color: 'triage',
      });
    if (patientCare.length) sections.push({ title: 'Patient Care', data: patientCare });

    const emergency: CardSpec[] = [];
    if (flags.hasEmergencyRedZone)
      emergency.push({
        key: 'critical',
        heading: 'Critical Care',
        link: 'emergency-red',
        paragraph: 'Immediate alerts and protocols for high-priority patient situations',
        icon: ShieldAlertIcon,
        color: 'emergencyRed',
      });
    if (flags.hasEmergencyYellowZone)
      emergency.push({
        key: 'urgent',
        heading: 'Urgent Care',
        link: 'emergency-yellow',
        paragraph: 'Monitor and respond to time-sensitive medical requirements',
        icon: ClockIcon,
        color: 'emergencyYellow',
      });
    if (flags.hasEmergencyGreenZone)
      emergency.push({
        key: 'stable',
        heading: 'Stable Monitoring',
        link: 'emergency-green',
        paragraph: 'Track stable patients and routine medical status updates',
        icon: CheckCircleIcon,
        color: 'emergencyGreen',
      });
    if (emergency.length) sections.push({ title: 'Emergency Services', data: emergency });

    const diagnostics: CardSpec[] = [];
    if (flags.hasPathology)
      diagnostics.push({
        key: 'lab',
        heading: 'Laboratory Services',
        link: 'pathology',
        paragraph: 'Access test results, lab reports, and diagnostic information',
        icon: MicroscopeIcon,
        color: 'pathology',
      });
    if (flags.hasRadiology)
      diagnostics.push({
        key: 'imaging',
        heading: 'Medical Imaging',
        link: 'radiology',
        paragraph: 'Review radiology scans, imaging reports, and diagnostic workflows',
        icon: ScanIcon,
        color: 'radiology',
      });
    if (diagnostics.length) sections.push({ title: 'Diagnostic Services', data: diagnostics });

    const support: CardSpec[] = [];
    if (flags.hasPharmacy)
      support.push({
        key: 'pharmacy',
        heading: 'Pharmacy Management',
        link: 'pharmacy',
        paragraph: 'Handle medication orders, inventory, and prescription tracking',
        icon: PillIcon,
        color: 'pharmacy',
      });
    if (flags.hasReception)
      support.push({
        key: 'patient-services',
        heading: 'Patient Services',
        link: 'reception',
        paragraph: 'Manage patient check-ins, scheduling, and administrative tasks',
        icon: UsersIcon,
        color: 'reception',
      });
    if (support.length) sections.push({ title: 'Support Services', data: support });

    return sections;
  }, [flags, buildAllCards]);

  const filteredSections: SectionSpec[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sectionsData;
    return sectionsData
      .map((sec) => ({
        title: sec.title,
        data: sec.data.filter(
          (it) => it.heading.toLowerCase().includes(q) || it.paragraph.toLowerCase().includes(q),
        ),
      }))
      .filter((sec) => sec.data.length > 0);
  }, [sectionsData, query]);

const clickNavigate = useCallback(
  (heading: string, link: string) => {
    let patientStatus = 1;
    let newRoleName = user?.roleName || user?.role?.toString();

    const headingLower = heading.toLowerCase();

    if (headingLower === 'outpatient care') {
      patientStatus = 1;
      newRoleName = 'opd';
    } else if (headingLower === 'inpatient services') {
      patientStatus = 2;
      newRoleName = 'ipd';
    }else if (
      headingLower === 'patient triage' 
    ) {
      patientStatus = 3;
      newRoleName = 'triage';
    }
     else if (
      headingLower === 'patient triage' ||
      headingLower === 'critical care' ||
      headingLower === 'urgent care' ||
      headingLower === 'stable monitoring'
    ) {
      patientStatus = 3;
      newRoleName = 'emergency';
    } else if (headingLower === 'laboratory services') {
      patientStatus = 4;
      newRoleName = 'pathology';
    } else if (headingLower === 'medical imaging') {
      patientStatus = 5;
      newRoleName = 'radiology';
    } else if (headingLower === 'pharmacy management') {
      patientStatus = 6;
      newRoleName = 'pharmacy';
    } else if (headingLower === 'patient services') {
      patientStatus = 7;
      newRoleName = 'reception';
    }
    try {
      const updatedUser = {
        ...user,
        roleName: newRoleName,
        patientStatus: patientStatus,
      };
      dispatch(currentUser(updatedUser));
      dispatch(updatePatientStatus(patientStatus));
      
    } catch (error) {
      
      (showError(error?.response?.data?.message || 'Login failed'));
    }
    if (user?.role === Role_NAME.admin) {
      navigation.navigate(`${link.toLowerCase()}/admin`);
    } else {
        switch (headingLower) {
          case 'outpatient care':
            navigation.navigate('DashboardOpd');
            break;

          case 'inpatient services':
            navigation.navigate('DashboardIpd');
            break;

          case 'patient triage':
            navigation.navigate('DashboardTriage');
            break;

          case 'critical care':
            navigation.navigate('EmergencyDashboard', { type: 'red' });
            break;

          case 'urgent care':
            navigation.navigate('EmergencyDashboard', { type: 'yellow' });
            break;

          case 'stable monitoring':
            navigation.navigate('EmergencyDashboard', { type: 'green' });
            break;

          case 'laboratory services':
            navigation.navigate('DashboardLab');
            break;

          case 'medical imaging':
            navigation.navigate('DashboardLab');
            break;

          case 'pharmacy management':
            navigation.navigate('DashboardPharma');
            break;

          case 'patient services':
            navigation.navigate('DashboardReception');
            break;

          default:
            navigation.navigate('DashboardOpd');
            break;
        }
      }
    },
    [navigation, user?.role, dispatch, user],
  );

  const listRef = useRef<SectionList<CardSpec> | null>(null);

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionSpec }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: CardSpec }) => (
      <WidgetCard
        spec={item}
        selected={selectedKey === item.key}
        onPress={() => {
          setSelectedKey(item.key);
          clickNavigate(item.heading, item.link);
        }}
        onArrowPress={() => {
          setSelectedKey(item.key);
          clickNavigate(item.heading, item.link);
        }}
      />
    ),
    [clickNavigate, selectedKey],
  );

  const keyExtractor = useCallback((item: CardSpec) => item.key, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Centralized access to all medical departments and patient care systems
        </Text>
        <TextInput
          placeholder="Search departments, services or features"
          placeholderTextColor="#93a1b3"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Content */}
      <View style={styles.listWrap}>
        {filteredSections.length > 0 ? (
          <SectionList
            ref={listRef}
            sections={filteredSections}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No results for "{query}". Try another term.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default Home;

/* ================== Styles ================== */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    paddingTop: Platform.select({ ios: 12, android: 8 }),
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#009688',
    lineHeight: 19,
    marginBottom: 8,
  },
  search: {
    width: '100%',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e8f0',
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionHeader: {
    paddingTop: 6,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#009688',
  },
  card: {
    position: 'relative',
    width: '100%',
    minHeight: 92,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(226,228,232,0.55)',
    backgroundColor: '#ffffff',
    shadowColor: '#0e1e3e',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    marginBottom: 10,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#16b097',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: 'rgba(16,176,151,0.03)',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardLeft: {
    width: 36,
    alignItems: 'center',
    marginRight: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8fbf6',
    borderWidth: 1,
    borderColor: '#d7f5ee',
  },
  cardRight: {
    flex: 1,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#009688',
    marginBottom: 3,
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 17,
    color: '#0f172a',
  },
  statusPill: {
    position: 'absolute',
    top: 10,
    right: 12,
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#eef5ff',
    color: '#3b5ccc',
    borderWidth: 1,
    borderColor: '#dfe9ff',
  },
  arrowButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyText: {
    color: '#6a7b90',
    fontSize: 14,
  },
  // card_emergencyRed: {
  //   backgroundColor: 'rgba(220,38,38,0.10)',
  //   borderColor: 'rgba(220,38,38,0.12)',
  // },
  // card_emergencyYellow: {
  //   backgroundColor: 'rgba(245,159,11,0.12)',
  //   borderColor: 'rgba(245,158,11,0.12)',
  // },
  // card_emergencyGreen: {
  //   backgroundColor: 'rgba(16,176,152,0.12)',
  //   borderColor: 'rgba(16,176,151,0.12)',
  // },
  // card_opd: {
  //   backgroundColor: 'rgba(102,204,29,0.10)',
  //   borderColor: 'rgba(193,124,5,0.12)',
  // },
  // card_ipd: {
  //   backgroundColor: 'rgba(102,204,29,0.10)',
  //   borderColor: 'rgba(193,124,5,0.12)',
  // },
  // card_triage: {
  //   backgroundColor: 'rgba(111,195,27,0.10)',
  //   borderColor: 'rgba(245,158,11,0.12)',
  // },
  // card_pathology: {
  //   backgroundColor: 'rgba(102,204,29,0.10)',
  //   borderColor: 'rgba(193,124,5,0.12)',
  // },
  // card_radiology: {
  //   backgroundColor: 'rgba(102,204,29,0.10)',
  //   borderColor: 'rgba(193,124,5,0.12)',
  // },
  // card_pharmacy: {
  //   backgroundColor: 'rgba(102,204,29,0.10)',
  //   borderColor: 'rgba(193,124,5,0.12)',
  // },
  // card_reception: {
  //   backgroundColor: 'rgba(102,204,29,0.10)',
  //   borderColor: 'rgba(193,124,5,0.12)',
  // },
});
