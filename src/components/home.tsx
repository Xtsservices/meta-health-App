
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
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
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";

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
} from "../utils/SvgIcons";

import { Role_NAME, SCOPE_LIST } from "../utils/role";
import { RootState, currentUser, updatePatientStatus } from "../store/store";
import { showError } from "../store/toast.slice";

type CardColor =
  | "emergencyRed"
  | "emergencyYellow"
  | "emergencyGreen"
  | "opd"
  | "ipd"
  | "triage"
  | "pathology"
  | "radiology"
  | "pharmacy"
  | "reception";

type CardSpec = {
  key: string;
  heading: string;
  link: string;
  paragraph: string;
  icon: React.ElementType;
  color: CardColor;
  status?: string;
};

type SectionSpec = {
  title: string;
  data: CardSpec[];
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;

/* --------- STATIC COLOR STYLE MAP (no re-creation per render) --------- */

const COLOR_STYLE_MAP: Record<CardColor, keyof typeof stylesColor> = {
  emergencyRed: "card_emergencyRed",
  emergencyYellow: "card_emergencyYellow",
  emergencyGreen: "card_emergencyGreen",
  opd: "card_opd",
  ipd: "card_ipd",
  triage: "card_triage",
  pathology: "card_pathology",
  radiology: "card_radiology",
  pharmacy: "card_pharmacy",
  reception: "card_reception",
};

/* Separate style sheet only for color variants to avoid bundling all in one */
const stylesColor = StyleSheet.create({
  card_emergencyRed: {
    backgroundColor: "rgba(220,38,38,0.10)",
   
  },
  card_emergencyYellow: {
    backgroundColor: "rgba(245,159,11,0.12)",
    
  },
  card_emergencyGreen: {
    backgroundColor: "rgba(16,176,152,0.12)",
    borderColor: "rgba(16,176,151,0.12)",
  },
  card_opd: {
    backgroundColor: "rgba(102,204,29,0.10)",
    borderColor: "rgba(193,124,5,0.12)",
  },
  card_ipd: {
    backgroundColor: "rgba(102,204,29,0.10)",
    borderColor: "rgba(193,124,5,0.12)",
  },
  card_triage: {
    backgroundColor: "rgba(111,195,27,0.10)",
    borderColor: "rgba(245,158,11,0.12)",
  },
  card_pathology: {
    backgroundColor: "rgba(102,204,29,0.10)",
    borderColor: "rgba(193,124,5,0.12)",
  },
  card_radiology: {
    backgroundColor: "rgba(102,204,29,0.10)",
    borderColor: "rgba(193,124,5,0.12)",
  },
  card_pharmacy: {
    backgroundColor: "rgba(102,204,29,0.10)",
    borderColor: "rgba(193,124,5,0.12)",
  },
  card_reception: {
    backgroundColor: "rgba(102,204,29,0.10)",
    borderColor: "rgba(193,124,5,0.12)",
  },
});

/* ---------- Card Component ---------- */
type WidgetCardProps = {
  spec: CardSpec;
  selected: boolean;
  onPress: () => void;
  onArrowPress: () => void;
};

const WidgetCardBase: React.FC<WidgetCardProps> = ({
  spec,
  selected,
  onPress,
  onArrowPress,
}) => {
  const IconComp = spec.icon as any;
  const colorStyles = stylesColor[COLOR_STYLE_MAP[spec.color]];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        colorStyles,
        selected && styles.cardSelected,
      ]}
    >
      {!!spec.status && <Text style={styles.statusPill}>{spec.status}</Text>}

      <View style={styles.cardBody}>
        <View style={styles.cardLeft}>
          <View style={styles.iconWrap}>
            <IconComp size={18} color="#16b097" />
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

      <TouchableOpacity
        onPress={onArrowPress}
        style={styles.arrowButton}
        hitSlop={styles.arrowHitSlop as any}
      />
    </TouchableOpacity>
  );
};

/** Memoized card – only re-renders when selected/spec change */
const WidgetCard = memo(
  WidgetCardBase,
  (prev, next) =>
    prev.selected === next.selected &&
    prev.spec.key === next.spec.key &&
    prev.onPress === next.onPress &&
    prev.onArrowPress === next.onArrowPress
);

/* ---------- Main Screen ---------- */
const Home: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const [query, setQuery] = useState("");
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
      const userScopes =
        user?.scope?.split("#")?.map((n: string) => Number(n)) ?? [];
      setFlags({
        hasEmergencyRedZone: userScopes?.includes(
          SCOPE_LIST.emergency_red_zone
        ),
        hasEmergencyYellowZone: userScopes?.includes(
          SCOPE_LIST.emergency_yellow_zone
        ),
        hasEmergencyGreenZone: userScopes?.includes(
          SCOPE_LIST.emergency_green_zone
        ),
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

  // Fallback: show everything if no scopes set so screen is not blank
  const buildAllCards = useCallback((): SectionSpec[] => {
    const all: CardSpec[] = [
      {
        key: "opd",
        heading: "Outpatient Care",
        link: "opd",
        paragraph:
          "Manage patient visits, appointments, and same-day records",
        icon: StethoscopeIcon,
        color: "opd",
      },
      {
        key: "ipd",
        heading: "Inpatient Services",
        link: "inpatient",
        paragraph: "Track beds, patient status, and care plans",
        icon: BedIcon,
        color: "ipd",
      },
      {
        key: "triage",
        heading: "Patient Triage",
        link: "triage",
        paragraph: "Assess and prioritize patient needs quickly",
        icon: AlertTriangleIcon,
        color: "triage",
      },
      {
        key: "critical",
        heading: "Critical Care",
        link: "emergency-red",
        paragraph: "Immediate protocols for high-priority patients",
        icon: ShieldAlertIcon,
        color: "emergencyRed",
      },
      {
        key: "urgent",
        heading: "Urgent Care",
        link: "emergency-yellow",
        paragraph: "Time-sensitive monitoring and response",
        icon: ClockIcon,
        color: "emergencyYellow",
      },
      {
        key: "stable",
        heading: "Stable Monitoring",
        link: "emergency-green",
        paragraph: "Track stable patients and routine updates",
        icon: CheckCircleIcon,
        color: "emergencyGreen",
      },
      {
        key: "lab",
        heading: "Laboratory Services",
        link: "pathology",
        paragraph: "Access test results and diagnostic info",
        icon: MicroscopeIcon,
        color: "pathology",
      },
      {
        key: "imaging",
        heading: "Medical Imaging",
        link: "radiology",
        paragraph: "Review scans and radiology reports",
        icon: ScanIcon,
        color: "radiology",
      },
      {
        key: "pharmacy",
        heading: "Pharmacy Management",
        link: "pharmacy",
        paragraph: "Med orders, inventory, prescriptions",
        icon: PillIcon,
        color: "pharmacy",
      },
      {
        key: "patient-services",
        heading: "Patient Services",
        link: "reception",
        paragraph: "Check-ins, scheduling, admin tasks",
        icon: UsersIcon,
        color: "reception",
      },
    ];
    return [{ title: "Quick Access", data: all }];
  }, []);

  const sectionsData: SectionSpec[] = useMemo(() => {
    const sections: SectionSpec[] = [];
    const anyTrue = Object.values(flags).some(Boolean);

    if (!anyTrue) {
      return buildAllCards();
    }

    const patientCare: CardSpec[] = [];
    if (flags.hasOutpatient)
      patientCare.push({
        key: "opd",
        heading: "Outpatient Care",
        link: "opd",
        paragraph:
          "Manage patient visits, appointments, and treatment records for same-day care",
        icon: StethoscopeIcon,
        color: "opd",
      });
    if (flags.hasInpatient)
      patientCare.push({
        key: "ipd",
        heading: "Inpatient Services",
        link: "inpatient",
        paragraph:
          "Track bed allocation, patient status, and care plans for admitted patients",
        icon: BedIcon,
        color: "ipd",
      });
    if (flags.hasTriage)
      patientCare.push({
        key: "triage",
        heading: "Patient Triage",
        link: "triage",
        paragraph:
          "Assess and prioritize patient needs for efficient care allocation",
        icon: AlertTriangleIcon,
        color: "triage",
      });
    if (patientCare.length)
      sections.push({ title: "Patient Care", data: patientCare });

    const emergency: CardSpec[] = [];
    if (flags.hasEmergencyRedZone)
      emergency.push({
        key: "critical",
        heading: "Critical Care",
        link: "emergency-red",
        paragraph:
          "Immediate alerts and protocols for high-priority patient situations",
        icon: ShieldAlertIcon,
        color: "emergencyRed",
      });
    if (flags.hasEmergencyYellowZone)
      emergency.push({
        key: "urgent",
        heading: "Urgent Care",
        link: "emergency-yellow",
        paragraph:
          "Monitor and respond to time-sensitive medical requirements",
        icon: ClockIcon,
        color: "emergencyYellow",
      });
    if (flags.hasEmergencyGreenZone)
      emergency.push({
        key: "stable",
        heading: "Stable Monitoring",
        link: "emergency-green",
        paragraph:
          "Track stable patients and routine medical status updates",
        icon: CheckCircleIcon,
        color: "emergencyGreen",
      });
    if (emergency.length)
      sections.push({ title: "Emergency Services", data: emergency });

    const diagnostics: CardSpec[] = [];
    if (flags.hasPathology)
      diagnostics.push({
        key: "lab",
        heading: "Laboratory Services",
        link: "pathology",
        paragraph:
          "Access test results, lab reports, and diagnostic information",
        icon: MicroscopeIcon,
        color: "pathology",
      });
    if (flags.hasRadiology)
      diagnostics.push({
        key: "imaging",
        heading: "Medical Imaging",
        link: "radiology",
        paragraph:
          "Review radiology scans, imaging reports, and diagnostic workflows",
        icon: ScanIcon,
        color: "radiology",
      });
    if (diagnostics.length)
      sections.push({ title: "Diagnostic Services", data: diagnostics });

    const support: CardSpec[] = [];
    if (flags.hasPharmacy)
      support.push({
        key: "pharmacy",
        heading: "Pharmacy Management",
        link: "pharmacy",
        paragraph:
          "Handle medication orders, inventory, and prescription tracking",
        icon: PillIcon,
        color: "pharmacy",
      });
    if (flags.hasReception)
      support.push({
        key: "patient-services",
        heading: "Patient Services",
        link: "reception",
        paragraph:
          "Manage patient check-ins, scheduling, and administrative tasks",
        icon: UsersIcon,
        color: "reception",
      });
    if (support.length)
      sections.push({ title: "Support Services", data: support });

    return sections;
  }, [flags, buildAllCards]);

  const filteredSections: SectionSpec[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sectionsData;
    return sectionsData
      .map((sec) => ({
        title: sec.title,
        data: sec.data.filter(
          (it) =>
            it.heading.toLowerCase().includes(q) ||
            it.paragraph.toLowerCase().includes(q)
        ),
      }))
      .filter((sec) => sec.data.length > 0);
  }, [sectionsData, query]);

  /* ------------- Navigation & state update (optimized) ------------- */

  const clickNavigate = useCallback(
    (heading: string, link: string) => {
      let patientStatus = 1;
      let newRoleName: string | number | undefined =
        user?.roleName || user?.role?.toString();
      let emergencyType = "";

      const headingLower = heading.toLowerCase();

      if (headingLower === "outpatient care") {
        patientStatus = 1;
        newRoleName = "opd";
      } else if (headingLower === "inpatient services") {
        patientStatus = 2;
        newRoleName = "ipd";
      } else if (headingLower === "patient triage") {
        patientStatus = 3;
        newRoleName = "triage";
      } else if (
        headingLower === "critical care" ||
        headingLower === "urgent care" ||
        headingLower === "stable monitoring"
      ) {
        patientStatus = 3;
        newRoleName = "emergency";
        if (headingLower === "critical care") {
          emergencyType = "red";
        } else if (headingLower === "urgent care") {
          emergencyType = "yellow";
        } else {
          emergencyType = "green";
        }
      } else if (headingLower === "laboratory services") {
        patientStatus = 4;
        newRoleName = "pathology";
      } else if (headingLower === "medical imaging") {
        patientStatus = 5;
        newRoleName = "radiology";
      } else if (headingLower === "pharmacy management") {
        patientStatus = 6;
        newRoleName = "pharmacy";
      } else if (headingLower === "patient services") {
        patientStatus = 7;
        newRoleName = "reception";
      }

      try {
        const currentRoleName = user?.roleName;
        const currentStatus = (user as any)?.patientStatus;
        const currentEmergency = (user as any)?.emergencyType;

        const needUserUpdate =
          currentRoleName !== newRoleName ||
          currentStatus !== patientStatus ||
          currentEmergency !== emergencyType;

        if (needUserUpdate) {
          const updatedUser = {
            ...user,
            roleName: newRoleName,
            patientStatus: patientStatus,
            emergencyType: emergencyType,
          };
          dispatch(currentUser(updatedUser));
        }

        if (currentStatus !== patientStatus) {
          dispatch(updatePatientStatus(patientStatus));
        }
      } catch (error: any) {
        showError(
          error?.response?.data?.message || "Login failed"
        );
      }

      if (user?.role === Role_NAME.admin) {
        navigation.navigate(`${link.toLowerCase()}/admin` as never);
      } else {
        switch (headingLower) {
          case "outpatient care":
            navigation.navigate("DashboardOpd" as never);
            break;
          case "inpatient services":
            navigation.navigate("DashboardIpd" as never);
            break;
          case "patient triage":
            navigation.navigate("DashboardTriage" as never);
            break;
          case "critical care":
            navigation.navigate("EmergencyDashboard" as never, {
              type: "red",
            } as never);
            break;
          case "urgent care":
            navigation.navigate("EmergencyDashboard" as never, {
              type: "yellow",
            } as never);
            break;
          case "stable monitoring":
            navigation.navigate("EmergencyDashboard" as never, {
              type: "green",
            } as never);
            break;
          case "laboratory services":
            navigation.navigate("DashboardLab" as never);
            break;
          case "medical imaging":
            navigation.navigate("DashboardLab" as never);
            break;
          case "pharmacy management":
            navigation.navigate("DashboardPharma" as never);
            break;
          case "patient services":
            navigation.navigate("DashboardReception" as never);
            break;
          default:
            navigation.navigate("DashboardOpd" as never);
            break;
        }
      }
    },
    [navigation, dispatch, user]
  );

  const listRef = useRef<SectionList<CardSpec> | null>(null);

  const handleCardPress = useCallback(
    (spec: CardSpec) => {
      setSelectedKey(spec.key);
      clickNavigate(spec.heading, spec.link);
    },
    [clickNavigate]
  );
  const renderSectionHeader = useCallback(
    ({ section }: any) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: CardSpec }) => (
      <WidgetCard
        spec={item}
        selected={selectedKey === item.key}
        onPress={() => handleCardPress(item)}
        onArrowPress={() => handleCardPress(item)}
      />
    ),
    [selectedKey, handleCardPress]
  );

  const keyExtractor = useCallback((item: CardSpec) => item.key, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Centralized access to all medical departments and patient
          care systems
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
            decelerationRate={Platform.OS === "ios" ? "fast" : 0.98}
            // PERF TUNING
            initialNumToRender={isTablet ? 10 : 6}
            maxToRenderPerBatch={isTablet ? 12 : 8}
            windowSize={7}
            removeClippedSubviews={true}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              No results for "{query}". Try another term.
            </Text>
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
    backgroundColor: "#fff",
  },
  headerRow: {
    paddingTop: Platform.select({ ios: 12, android: 8 }),
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#009688",
    lineHeight: 19,
    marginBottom: 8,
  },
  search: {
    width: "100%",
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e1e8f0",
    backgroundColor: "#ffffff",
    color: "#0f172a",
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
    fontWeight: "700",
    color: "#009688",
  },
 card: {
    position: "relative",
    width: "100%",
    minHeight: 92,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 0,              // no border
    backgroundColor: "transparent", // let color style provide bg
    shadowColor: "transparent",  // no grey halo
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,                // no Android shadow
    marginBottom: 10,
    overflow: "hidden",          // clean rounded edges
  },

  cardSelected: {
    borderWidth: 2,
    borderColor: "#16b097",      // only visible in selected state
    backgroundColor: "rgba(16,176,151,0.03)",
  },

  cardBody: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardLeft: {
    width: 36,
    alignItems: "center",
    marginRight: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8fbf6",
    borderWidth: 1,
    borderColor: "#d7f5ee",
  },
  cardRight: {
    flex: 1,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#009688",
    marginBottom: 3,
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 17,
    color: "#0f172a",
  },
  statusPill: {
    position: "absolute",
    top: 10,
    right: 12,
    fontSize: 11,
    fontWeight: "600",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#eef5ff",
    color: "#3b5ccc",
    borderWidth: 1,
    borderColor: "#dfe9ff",
  },
  arrowButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  arrowHitSlop: {
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyText: {
    color: "#6a7b90",
    fontSize: 14,
  },
});
