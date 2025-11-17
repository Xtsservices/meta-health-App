import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  FlatList,
  ListRenderItemInfo,
  Dimensions,
  Modal,
  TextInput,
} from "react-native";
import {
  Activity,
  Heart,
  FileText,
  Calendar,
  FlaskConical,
  ClipboardList,
  BookOpenText,
  Pill,
} from "lucide-react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootState } from "../../store/store";
import { PatientType } from "../../utils/types";
import usePhysicalExaminationForm from "../../utils/usePhysicalExaminationForm";
import usePreOpForm from "../../utils/usePreOpForm";
import { AuthPost } from "../../auth/auth";
import { showError, showSuccess } from "../../store/toast.slice";
import Footer from "../dashboard/footer";
import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
import useAnesthesiaForm from "../../utils/useAnesthesiaRecordForm";
import usePostOPStore from "../../utils/usePostopForm";

/** ----- Types ----- */
type SectionKey =
  // Patient File
  | "Symptoms"
  | "Vitals"
  | "TreatmentPlan"
  | "MedicalHistory"
  | "Reports"
  // Physical Examination
  | "InitialDetails"
  | "ExaminationFindingNotes"
  | "GeneralPhysicalExamination"
  | "Mallampati"
  | "Respiratory"
  | "Hepato"
  | "CardioVascular"
  | "Neuro"
  | "Renal"
  | "Others"
  // Pre-Op
  | "PreopControllers"
  | "Tests"
  | "TreatmentPlan"
//   AnesthesiarecordForm
|"AnesthesiaRecordForm"
|"Breathing"
|"Monitors"
// Post-op 
|"PostOpRecordNotes"
|"Tests"
|"TreatmentPlan"





type GridItem = {
  key: SectionKey;
  label: string;
  Icon: React.ElementType;
};

type Props = {
  visibleKeys?: SectionKey[];
  bottomInset?: number;
  routeMap?: Partial<Record<SectionKey, string>>;
  brandColor?: string;
};

/** 2-column grid sizing */
const GUTTER = 12;
const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.floor((width - (16 + 16) - GUTTER) / 2);

type RouteParams = { tabName: string };

const PatientTabsGrid: React.FC<Props> = ({
  visibleKeys,
  bottomInset = 0,
  routeMap,
  brandColor,
}) => {
  const patientFromStore = useSelector(
    (s: RootState) => s.currentPatient as PatientType | undefined
  );
  const timelineId = patientFromStore?.patientTimeLineID;

  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const activeTab = route.params?.tabName;
  const user = useSelector((s: RootState) => s.currentUser);

  const COLORS = useMemo(
    () => ({
      bg: "#f8fafc",
      card: "#ffffff",
      text: "#0f172a",
      sub: "#475569",
      border: "#e2e8f0",
      brand: brandColor || "#14b8a6",
      brandDark: "#0f766e",
      hover: "#f1f5f9",
      pill: "#eef2f7",
      shadow: "#000000",
    }),
    [brandColor]
  );

  /** Build tiles depending on tabName coming from route */
  const tiles: GridItem[] = useMemo(() => {
    switch (activeTab) {
      case "PatientFile":
        return [
          { key: "Symptoms", label: "Symptoms", Icon: Activity },
          { key: "Vitals", label: "Vitals", Icon: Heart },
          { key: "TreatmentPlan", label: "Medications", Icon: Pill },
          {
            key: "MedicalHistory",
            label: "Medical Examination History",
            Icon: BookOpenText,
          },
          { key: "Reports", label: "Test Reports", Icon: ClipboardList },
        ];

      case "PhysicalExamination":
        return [
          {
            key: "InitialDetails",
            label: "Main Form Fields",
            Icon: ClipboardList,
          },
          {
            key: "ExaminationFindingNotes",
            label: "Examination Finding Notes",
            Icon: FileText,
          },
          {
            key: "GeneralPhysicalExamination",
            label: "General Physical Examination",
            Icon: Activity,
          },
          {
            key: "Mallampati",
            label: "Mallampati Grade",
            Icon: Heart,
          },
          { key: "Respiratory", label: "Respiratory", Icon: Activity },
          { key: "Hepato", label: "Hepato", Icon: FlaskConical },
          { key: "CardioVascular", label: "Cardio Vascular", Icon: Heart },
          { key: "Neuro", label: "Neuro Muscular", Icon: Activity },
          { key: "Renal", label: "Renal", Icon: FlaskConical },
          { key: "Others", label: "Others", Icon: BookOpenText },
        ];

      case "PreOpRecord":
        return [
          {
            key: "PreopControllers",
            label: "Pre-Op Controllers",
            Icon: ClipboardList,
          },
          { key: "Tests", label: "Tests", Icon: FlaskConical },
          { key: "TreatmentPlan", label: "Medications", Icon: Pill },
        ];
case "AnesthesiaRecord":
    return [
        {
            key: "AnesthesiaRecordForm",
            label: "Anesthesia RecordForm",
            Icon: ClipboardList,
          },
          { key: "Breathing", label: "Breathing", Icon: FlaskConical },
          { key: "Monitors", label: "Monitering", Icon: Pill },
    ]

    case "PostOpRecord":
        return [
            {
            key: "PostOpRecordNotes",
            label: "Post-Op Records",
            Icon: ClipboardList,
          },
          { key: "Tests", label: "Tests", Icon: FlaskConical },
          { key: "TreatmentPlan", label: "Medications", Icon: Pill },
        
        ]
      default:
        return [];
    }
  }, [activeTab]);

  /** Optional external filter */
  const data = useMemo(() => {
    if (visibleKeys && visibleKeys.length) {
      return tiles.filter((t) => visibleKeys.includes(t.key));
    }
    return tiles;
  }, [tiles, visibleKeys]);

  const onPressTile = (item: GridItem) => {
    const routeName = routeMap?.[item.key];
    if (routeName) {
      navigation.navigate(routeName as never, {currentTab: activeTab});
    } else {
      navigation.navigate(item.key as never, { ot: true, currentTab: activeTab } as never);
    }
  };

  // ---- Physical Examination store ----
  const {
    mainFormFields,
    examinationFindingNotes,
    generalphysicalExamination,
    mallampatiGrade,
    respiratory,
    hepato,
    cardioVascular,
    neuroMuscular,
    renal,
    others,
  } = usePhysicalExaminationForm();

  
  const {anesthesiaRecordForm,
      breathingForm,
      monitors,} = useAnesthesiaForm()

  // ---- Pre-Op store ----
  const { notes, arrangeBlood, riskConsent, tests, medications } =
    usePreOpForm();

    const { tests: postTests, medications: postMeds, notes: postNotes, selectedType } = usePostOPStore();


  // ====== PHYSICAL EXAMINATION POST ======
  const postPhysicalExamination = async () => {
    const physicalExaminationData = {
      mainFormFields,
      examinationFindingNotes,
      generalphysicalExamination,
      mallampatiGrade,
      respiratory,
      hepato,
      cardioVascular,
      neuroMuscular,
      renal,
      others,
    };

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));

      const response = await AuthPost(
        `ot/${user?.hospitalID}/${timelineId}/physicalExamination`,
        { physicalExaminationData },
        token
      );

      if (response.status === "success") {
        dispatch(showSuccess("Physical examination updated successfully"));
        navigation.navigate("OtTabs" as never);
      } else {
        dispatch(showError("Physical Examination Failed"));
      }
    } catch (err: any) {
      dispatch(
        showError(
          err?.message || err?.status || "Physical Examination Failed"
        )
      );
    }
  };

  // ====== PRE-OP APPROVE / REJECT ======
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const preOpSubmit = useCallback(
    async (status: "approved" | "rejected", reason?: string) => {
      const trimmedReason = reason?.trim() ?? "";

      if (status === "rejected" && !trimmedReason) {
        return dispatch(showError("Please Enter reason"));
      }

      const preopRecordData = {
        notes,
        tests,
        medications,
        arrangeBlood,
        riskConsent,
      };

      try {
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        const response = await AuthPost(
          `ot/${user?.hospitalID}/${timelineId}/${user?.id}/preopRecord`,
          {
            preopRecordData,
            status,
            rejectReason: trimmedReason,
          },
          token
        );

        if (response.status === "success") {
          dispatch(showSuccess("Pre-op record updated successfully"));
          setRejectModalVisible(false);
          setRejectReason("");
          navigation.navigate("OtTabs" as never);
        } else {
          dispatch(showError("Pre-op Record Failed"));
        }
      } catch (err: any) {
        dispatch(
          showError(err?.message || err?.status || "Pre-op Record Failed")
        );
      }
    },
    [
      notes,
      tests,
      medications,
      arrangeBlood,
      riskConsent,
      user?.hospitalID,
      user?.id,
      timelineId,
      navigation,
      dispatch,
    ]
  );

 const postopSubmit = useCallback(
  async () => {

    const postopRecordData = {
      notes: postNotes,
      tests: postTests,
      medications: postMeds,
      selectedType,
    };

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const response = await AuthPost(
        `ot/${user?.hospitalID}/${timelineId}/postopRecord`,
        { postopRecordData },
        token
      );


      if (response.status === "success") {
        dispatch(showSuccess("Post-op record updated successfully"));
        navigation.navigate("OtTabs" as never);
      } else {
        dispatch(showError("Post-op Record Failed"));
      }
    } catch (err: any) {
      dispatch(showError(err?.message || "Post-op Record Failed"));
    }
  },
  [postNotes, postTests, postMeds, selectedType, user?.hospitalID, timelineId]
);



 const anesthesiaRecordSubmit = useCallback(
  async () => {
    const anesthesiaRecordData = {
      anesthesiaRecordForm,
      breathingForm,
      monitors,
    };

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const response = await AuthPost(
        `ot/${user?.hospitalID}/${timelineId}/anesthesiaRecord`,
        { anesthesiaRecordData },
        token
      );
      if (response.status === "success" ) {
        dispatch(showSuccess("Anesthesia record updated successfully"));
        navigation.navigate("OtTabs" as never);
      } else {
        dispatch(showError("Anesthesia record update failed"));
      }
    } catch (err: any) {
      dispatch(
        showError(
          err?.message || err?.status || "Anesthesia record update failed"
        )
      );
    }
  },
  [
    anesthesiaRecordForm,
    breathingForm,
    monitors,
    user?.hospitalID,
    timelineId,
    navigation,
    dispatch,
  ]
);


  // ====== Save for Physical Exam only (debounced) ======
  const handleSave = () => {
    if (activeTab === "PhysicalExamination") {
      postPhysicalExamination();
    }else if (activeTab === "AnesthesiaRecord"){
        anesthesiaRecordSubmit()
    }else if (activeTab === "PostOpRecord"){
        postopSubmit()
    }
  };

  const debouncedSubmit = useCallback(debounce(handleSave, DEBOUNCE_DELAY), [
    handleSave,
  ]);

  const renderItem = ({ item }: ListRenderItemInfo<GridItem>) => {
    const Icon = item.Icon;
    return (
      <Pressable
        onPress={() => onPressTile(item)}
        android_ripple={{
          color: isDark ? "#0f766e33" : "#0ea5a733",
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

  const renderFooter = () => {
    // ---- Pre-Op tab: show Approve + Reject ----
    if (activeTab === "PreOpRecord") {
      return (
        <View style={styles.saveContainer}>
          <View style={styles.preopBtnRow}>
            <Pressable
              onPress={() => setRejectModalVisible(true)}
              style={({ pressed }) => [
                styles.preopRejectBtn,
                {
                  borderColor: COLORS.brand,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.preopRejectText,
                  { color: COLORS.brand },
                ]}
              >
                Reject
              </Text>
            </Pressable>

            <Pressable
              onPress={() => preOpSubmit("approved")}
              style={({ pressed }) => [
                styles.preopApproveBtn,
                {
                  backgroundColor: COLORS.brand,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.preopApproveText}>Approve</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // ---- Other tabs: show Save ----
    return (
      <View style={styles.saveContainer}>
        <Pressable
          onPress={debouncedSubmit}
          style={({ pressed }) => [
            styles.formNavButton,
            {
              backgroundColor: COLORS.brand,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.formNavButtonTextPrimary}>Save</Text>
        </Pressable>
      </View>
    );
  };

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
          paddingBottom: Math.max(16, bottomInset + 120), // extra for footer/buttons
          rowGap: GUTTER,
        }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={8}
        windowSize={10}
        maxToRenderPerBatch={8}
        ListFooterComponent={renderFooter}
      />

      {/* Reject Reason Modal */}
      <Modal
        transparent
        visible={rejectModalVisible}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reason for Rejection</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              placeholder="Enter reason"
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectReason("");
                }}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonOutline,
                  {
                    borderColor: COLORS.brand,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: COLORS.brand },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={() => preOpSubmit("rejected", rejectReason)}
                style={({ pressed }) => [
                  styles.modalButton,
                  {
                    backgroundColor: COLORS.brand,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: "#ffffff" },
                  ]}
                >
                  Submit
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom app footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"dashboard"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}
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

  // Save / Approve / Reject buttons
  saveContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  formNavButton: {
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  formNavButtonTextPrimary: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },

  preopBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  preopRejectBtn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  preopRejectText: {
    fontSize: 15,
    fontWeight: "700",
  },
  preopApproveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  preopApproveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Bottom Footer
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    zIndex: 10,
    elevation: 6,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    zIndex: 9,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "88%",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#0f172a",
  },
  modalInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonOutline: {
    borderWidth: 1.5,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
