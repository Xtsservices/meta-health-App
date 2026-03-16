import React, { useCallback, useEffect, useMemo } from "react";
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
  FileText,
  Calendar,
  FlaskConical,
  ClipboardList,
  BookOpenText,
} from "lucide-react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";

import { RootState } from "../../store/store";
import { PatientType } from "../../utils/types";
import useOTConfig, {
  OTUserTypes,
  OTPatientStages,
} from "../../utils/otConfig";

import { AuthFetch } from "../../auth/auth";
import { showError } from "../../store/toast.slice";
import usePhysicalExaminationForm from "../../utils/usePhysicalExaminationForm";
import usePreOpStore from "../../utils/usePreOpForm";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../utils/colour";

// 🔹 OT form stores (same as web BasicTabs, adjust paths if needed)

// If you have these stores in RN, you can also import and populate them later:
// import usePatientFileStore from "../../store/formStore/ot/usePatientFileForm";
// import usePostOPStore from "../../store/formStore/ot/usePostOPForm";
// import useAnesthesiaForm from "../../store/formStore/ot/useAnesthesiaForm";

/** ----- Types ----- */
type TabKey =
  | "patientFile"
  | "physicalExamination"
  | "preOpRecord"
  | "consentForm"
  | "anesthesiaRecord"
  | "Schedule"
  | "postOpRecord";

type GridItem = {
  key: TabKey;
  label: string;
  Icon: React.ElementType;
};

type Props = {
  visibleKeys?: TabKey[];
  bottomInset?: number;
  routeMap?: Partial<Record<TabKey, string>>;
  brandColor?: string;
};

/** 2-column grid sizing */
const GUTTER = 12;
const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.floor((width - (16 + 16) - GUTTER) / 2);

const PatientTabsGrid: React.FC<Props> = ({
  visibleKeys,
  bottomInset = 0,
  routeMap,
  brandColor,
}) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const currentPatient = useSelector(
    (s: RootState) => s.currentPatient
  ) as any; // has patientTimeLineID etc

  const currentUser = useSelector(
    (s: RootState) => s.currentUser
  ) as any; // has token, hospitalID, roleName, etc
  const scheme = useColorScheme();


  // 🔹 OT config (same source as web)
  const { userType,  patientStage} = useOTConfig();
// const patientStage = currentPatient?.status.toUpperCase()
  // ---------- OT FORM STORES (same setters you used on web) ----------
  const {
    setMainFormFields,
    setExaminationFindingNotes,
    setGeneralPhysicalExamination,
    setMallampatiGrade,
    setRespiratory,
    setHepato,
    setCardioVascular,
    setNeuroMuscular,
    setRenal,
    setOthers,
    resetAll: resetPhysicalExaminationForm,
  } = usePhysicalExaminationForm();

  const {
    setNotes,
    setRiskConsent,
    setArrangeBlood,
    resetAll: resetPreOpStore,
  } = usePreOpStore();

 

  const defaultRoutes: Record<TabKey, string> = {
    patientFile: "PatientFile",
    physicalExamination: "PhysicalExamination",
    preOpRecord: "PreOpRecord",
    consentForm: "ConsentForm",
    anesthesiaRecord: "AnesthesiaRecord",
    Schedule: "Schedule",
    postOpRecord: "PostOpRecord",
  };

  const tiles: GridItem[] = useMemo(
    () => [
      { key: "patientFile", label: "Patient File", Icon: Activity },
      {
        key: "physicalExamination",
        label: "Physical Examination",
        Icon: FlaskConical,
      },
      { key: "preOpRecord", label: "Pre-Op Record", Icon: Heart },
      { key: "consentForm", label: "Consent Form", Icon: ClipboardList },
      {
        key: "anesthesiaRecord",
        label: "Anesthesia Record",
        Icon: BookOpenText,
      },
      { key: "Schedule", label: "Schedule", Icon: FileText },
      { key: "postOpRecord", label: "Post-Op Record", Icon: Calendar },
    ],
    []
  );

  // 🔹 Same visibility rules as web BasicTabs
  const allowedKeys = useMemo<TabKey[]>(() => {
    const base: TabKey[] = [
      "patientFile",
      "physicalExamination",
      "preOpRecord",
    ];

    const list: TabKey[] = [...base];

    const isSurgeon =
      (currentUser?.roleName || "").toUpperCase() === OTUserTypes.SURGEON;
    const isAnesthetist = userType === OTUserTypes.ANESTHETIST;

    const isSurgeonSchedulePending =
      isSurgeon && patientStage === OTPatientStages.APPROVED;
    const advancedVisible =
      (patientStage > OTPatientStages.APPROVED && isAnesthetist) ||
      (patientStage >= OTPatientStages.SCHEDULED && isSurgeon);


    if (isSurgeonSchedulePending) {
      list.push("Schedule");
    }

    if (advancedVisible) {
      list.push("consentForm", "anesthesiaRecord", "postOpRecord");
    }

    return list;
  }, [userType, patientStage, currentUser?.roleName]);

  const data = useMemo(() => {
    const byProp =
      visibleKeys && visibleKeys.length
        ? tiles.filter((t) => visibleKeys.includes(t.key))
        : tiles;
    return byProp.filter((t) => allowedKeys.includes(t.key));
  }, [tiles, visibleKeys, allowedKeys]);

  // 🔥🔥🔥 IMPORTANT: INITIAL OT DATA LOAD (same as web BasicTabs) 🔥🔥🔥
  useFocusEffect(
   useCallback(() => {
    
    const hospitalID = currentUser?.hospitalID;
    const timelineID = currentPatient?.patientTimeLineID;

    if (!hospitalID || !timelineID) return;

    let cancelled = false;
    const startedForPid = timelineID;

    // reset stores when patient changes
    resetPhysicalExaminationForm();
    resetPreOpStore();

    (async () => {
         const token = currentUser?.token ?? (await AsyncStorage.getItem("token"));
      try {
        const response = await AuthFetch(
          `ot/${hospitalID}/${startedForPid}/getOTData`,
          token
        );
        if (cancelled) return;
        if (startedForPid !== currentPatient?.patientTimeLineID) return;

        if (response?.status === "success" && "data" in response) {
          const root = response?.data?.data?.[0] || {};
          const physicalExaminationData = root?.physicalExamination;

          // ----- PHYSICAL EXAMINATION -----
          if (physicalExaminationData) {
            setRenal(physicalExaminationData.renal);
            setHepato(physicalExaminationData.hepato);
            setOthers(physicalExaminationData.others);
            setRespiratory(physicalExaminationData.respiratory);
            setNeuroMuscular(physicalExaminationData.neuroMuscular);
            setCardioVascular(physicalExaminationData.cardioVascular);
            setMainFormFields(physicalExaminationData.mainFormFields);
            setMallampatiGrade(physicalExaminationData.mallampatiGrade);
            setExaminationFindingNotes(
              physicalExaminationData.examinationFindingNotes
            );
            setGeneralPhysicalExamination(
              physicalExaminationData.generalphysicalExamination
            );
          }

          // ----- PRE-OP RECORD -----
          const preOPData = root.preopRecord;
          if (preOPData) {
            setNotes(preOPData?.notes);
            // replace, don't append
            usePreOpStore.setState({
              tests: Array.isArray(preOPData?.tests) ? preOPData?.tests : [],
               medications:
      preOPData?.medications && typeof preOPData.medications === "object"
        ? preOPData.medications
        : [], 
            });
            setRiskConsent(Boolean(preOPData?.riskConsent));
            setArrangeBlood(Boolean(preOPData?.arrangeBlood));
          } else {
            // avoid showing previous patient's state
            setRiskConsent(false);
            setArrangeBlood(false);
            usePreOpStore.setState({ tests: [] });
          }

          // 👉 if you also want to hydrate anesthesia/post-op/patient-file,
          // add similar blocks here using your other stores

        }
      } catch (err: any) {
        const msg = err?.message || "Failed to fetch OT data";
        dispatch(showError(msg));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
   
    currentUser?.hospitalID,
    currentPatient?.patientTimeLineID,
    resetPhysicalExaminationForm,
    resetPreOpStore,
    setRenal,
    setHepato,
    setOthers,
    setRespiratory,
    setNeuroMuscular,
    setCardioVascular,
    setMainFormFields,
    setMallampatiGrade,
    setExaminationFindingNotes,
    setGeneralPhysicalExamination,
    setNotes,
    setRiskConsent,
    setArrangeBlood,
    dispatch,
  ]))

  // ---------- Navigation only (NO data loading here) ----------
  const onPressTile = (item: GridItem) => {
    const routeName = routeMap?.[item.key] ?? defaultRoutes[item.key];
    if (routeName === "Schedule") {
      navigation.navigate("SurgerySchedule");
    } else if ((routeName === "ConsentForm")){
 navigation.navigate("ConsentForm");
    } else {
      navigation.navigate("OtInnerTabs", { tabName: routeName });
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<GridItem>) => {
    const Icon = item.Icon;
    return (
      <Pressable
        onPress={() => onPressTile(item)}
        android_ripple={{
          color: "#0ea5a733",
          borderless: false,
        }}
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
          <Text
            numberOfLines={2}
            ellipsizeMode="clip"
            style={[styles.cardTitle, { color: COLORS.text }]}
          >
            {item.label}
          </Text>
          <Text
            style={[styles.cardSub, { color: COLORS.sub }]}
            numberOfLines={1}
          >
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
    alignItems: "flex-start",
    minHeight: 72,
  },
  iconWrap: {
    width: 40,
    height: 40,
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
    flexWrap: "wrap",
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
