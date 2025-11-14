import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  FlatList,
  ListRenderItemInfo,
  Dimensions,
} from "react-native";
import {
  Activity,
  Heart,
  Pill,
  FileText,
  Calendar,
  Users,
  FlaskConical,
  ClipboardList,
  BookOpenText,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { PatientType } from "../../utils/types";

/** ----- Types ----- */
type TabKey =
  | "symptoms"
  | "tests"
  | "vitals"
  | "treatment"
  | "medicalHistory"
  | "reports"
  | "timeline"
  | "doctors"
  | "previousPrescriptions"
  | "insurance"
  | "prescription"
  | "timeline"

type GridItem = {
  key: TabKey;
  label: string;
  Icon: React.ElementType;
  /** optional badge, description, etc. extend here if needed */
};

type Props = {
  /** Which tiles are visible; if omitted, all are shown */
  visibleKeys?: TabKey[];
  /** Extra bottom padding (e.g., if you have a fixed footer) */
  bottomInset?: number;
  /** Map tab keys to route names in your navigator (override defaults) */
  routeMap?: Partial<Record<TabKey, string>>;
  /** Brand color override (defaults to teal) */
  brandColor?: string;
};

/** 2-column grid sizing */
const GUTTER = 12;
const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.floor((width - (16 + 16) - GUTTER) / 2); // (screen - paddings - gutter) / 2

const PatientTabsGrid: React.FC<Props> = ({
  visibleKeys,
  bottomInset = 0,
  routeMap,
  brandColor,
}) => {
     const patientFromStore = useSelector((s: RootState) => s.currentPatient) as PatientType | undefined;
  const navigation = useNavigation<any>();
  const scheme = useColorScheme();
 

  const COLORS = useMemo(
    () => ({
      bg:  "#f8fafc",
      card:  "#ffffff",
      text: "#0f172a",
      sub:  "#475569",
      border: "#e2e8f0",
      brand: brandColor || "#14b8a6",
      brandDark: "#0f766e",
      hover:  "#f1f5f9",
      pill: "#eef2f7",
      shadow: "#000000",
    }),
    [ brandColor]
  );

  // Default route names; override via routeMap prop if your navigator uses different names
  const defaultRoutes: Record<TabKey, string> = {
    symptoms: "Symptoms",
    tests: "Tests",
    vitals: "Vitals",
    treatment: "TreatmentPlan",
    medicalHistory: "MedicalHistory",
    reports: "Reports",
    timeline: "Timeline",
    doctors: "Doctors",
    previousPrescriptions: "PreviousPrescriptions",
    insurance: "Insurance",
    prescription: "Prescription",

  };

  const tiles: GridItem[] = useMemo(
    () => [
      { key: "symptoms",               label: "Symptoms",               Icon: Activity },
      { key: "tests",                  label: "Tests",                  Icon: FlaskConical },
      { key: "vitals",                 label: "Vitals",                 Icon: Heart },
      { key: "treatment",              label: "Treatment Plan",         Icon: ClipboardList },
      { key: "medicalHistory",         label: "Medical History",        Icon: BookOpenText },
      { key: "reports",                label: "Reports",                Icon: FileText },
      { key: "timeline",               label: "Patient Timeline",       Icon: Calendar },
      { key: "doctors",                label: "Treating Doctors",       Icon: Users },
      { key: "previousPrescriptions",  label: "Previous Prescriptions", Icon: Pill },
      { key: "insurance",              label: "Insurance",              Icon: Pill },
      { key: "prescription",           label: "Prescription",              Icon: Pill },
    
    ],
    []
  );
// Decide which tabs to show based on patient start status (example rules)
const allowedKeys = useMemo<TabKey[]>(() => {
  // default: show everything
  const all: TabKey[] = [
    "symptoms","tests","vitals","treatment","medicalHistory",
    "reports","timeline","doctors","previousPrescriptions","insurance"
  ];

  const startStatus = Number(
    (patientFromStore as any)?.patientStartStatus ??
    0
  );

  // ✏️ Sample rules — tweak to your domain
  if (startStatus === 21) { // e.g., Revisit
    return ["symptoms","tests","vitals","treatment","reports","previousPrescriptions","doctors"];
  }
  if (startStatus === 1) { // e.g., New OPD
    return ["symptoms","vitals","prescription","medicalHistory","reports","timeline","doctors"];
  }else if (startStatus === 2) {
     return ["symptoms","tests","vitals","treatment","reports","previousPrescriptions","doctors","medicalHistory"];
  }
  // fallback -> show all
  return all;
}, [patientFromStore]);

  const data = useMemo(() => {
  const byProp = (visibleKeys && visibleKeys.length)
    ? tiles.filter(t => visibleKeys.includes(t.key))
    : tiles;
  // intersect with allowedKeys from store
  return byProp.filter(t => allowedKeys.includes(t.key));
}, [tiles, visibleKeys, allowedKeys]);

  const onPressTile = (item: GridItem) => {
    const routeName = routeMap?.[item.key] ?? defaultRoutes[item.key];

    navigation.navigate(routeName as never);
  };

  const renderItem = ({ item }: ListRenderItemInfo<GridItem>) => {
  const Icon = item.Icon;
  return (
    <Pressable
      onPress={() => onPressTile(item)}
      android_ripple={{ color: "#0ea5a733", borderless: false }}
      style={({ pressed }) => [
        styles.card,
        {
          width: CARD_WIDTH,
          backgroundColor: pressed ? COLORS.hover : COLORS.card,
          borderColor: COLORS.border,
          shadowColor: COLORS.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: COLORS.pill, borderColor: COLORS.border },
        
        ]}
      >
        <Icon size={20} color={COLORS.brand} />
      </View>

      <View style={styles.textCol}>
        <Text numberOfLines={2}          // ⬅️ allow up to 2 lines
  ellipsizeMode="clip"
     style={[styles.cardTitle, { color: COLORS.text }]}>
          {item.label}
        </Text>
        <Text    style={[styles.cardSub, { color: COLORS.sub }]} numberOfLines={1}>
          Tap to open
        </Text>
      </View>
    </Pressable>
  );
};


  const keyExtractor = (it: GridItem) => it.key;

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ gap: GUTTER, paddingHorizontal: 16 }}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: Math.max(16, bottomInset + 8),
          rowGap: GUTTER,
        }}
        showsVerticalScrollIndicator={false}
        // Smooth scroll defaults; keep scroll perf high
        removeClippedSubviews
        initialNumToRender={8}
        windowSize={10}
        maxToRenderPerBatch={8}
      />
    </View>
  );
};

export default PatientTabsGrid;

/** ---------- styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    elevation: 2,
    flexDirection: "row",      
    // alignItems: "center", 
    alignItems: "flex-start",   // ⬅️ allow multi-line text to grow downward
  // height: 92,               // ⬅️ remove fixed height
  minHeight: 72, 
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    marginRight: 12,   
  },
  textCol: {
  flex: 1,
  justifyContent: "center",
},
  cardTitle: {
  fontSize: 14,
  fontWeight: "800",
  lineHeight: 18,
  flexShrink: 1,  
  flexWrap: "wrap",            // ⬅️ enable wrapping inside fixed width
},
 cardSub: {
  marginTop: 2,
  fontSize: 12,
  fontWeight: "600",
  lineHeight: 16,
  flexShrink: 1,
  flexWrap: "wrap",     
},
});
