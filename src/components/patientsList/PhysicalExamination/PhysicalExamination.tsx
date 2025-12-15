import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthDelete, AuthFetch } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { PlusIcon, Trash2Icon } from "../../../utils/SvgIcons";
import { 
  SPACING, 
  FONT_SIZE, 
  ICON_SIZE, 
  SCREEN_WIDTH, 
  SCREEN_HEIGHT,
  isTablet,
  isSmallDevice,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

const RESPONSIVE = {
  spacing: SPACING,
  fontSize: FONT_SIZE,
  icon: ICON_SIZE,
  screen: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  isTablet,
  isSmallDevice,
};

type RootState = any;
const selectUser = (s: RootState) => s.currentUser;
const selectCurrentPatient = (s: RootState) => s.currentPatient;

interface PhysicalExaminationData {
  id: number;
  general?: string;
  head?: string;
  ent?: string;
  neuroPsych?: string;
  neckSpine?: string;
  respiratory?: string;
  cardiac?: string;
  abdominal?: string;
  pelvis?: string;
  guRectal?: string;
  musculoskeletal?: string;
  skin?: string;
  patientTimeLineId?: number;
  userID?: number;
  createdAt?: string;
  updatedAt?: string;
  addedOn?: string;
}

const FOOTER_H = 70;

const SECTIONS = [
  { key: 'general', label: 'General' },
  { key: 'head', label: 'Head' },
  { key: 'ent', label: 'ENT' },
  { key: 'neuroPsych', label: 'Neuro/Psych' },
  { key: 'neckSpine', label: 'Neck/Spine' },
  { key: 'respiratory', label: 'Respiratory' },
  { key: 'cardiac', label: 'Cardiac' },
  { key: 'abdominal', label: 'Abdominal' },
  { key: 'pelvis', label: 'Pelvis' },
  { key: 'guRectal', label: 'GU/Rectal' },
  { key: 'musculoskeletal', label: 'Musculoskeletal' },
  { key: 'skin', label: 'Skin' },
];

export default function PhysicalExaminationScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const currentPatient = useSelector(selectCurrentPatient);
  const timeline = currentPatient?.patientTimeLineID;
  
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<PhysicalExaminationData[]>([]);

  const bottomPad = FOOTER_H + Math.max(insets.bottom, RESPONSIVE.spacing.md) + RESPONSIVE.spacing.md;

  const loadPhysicalExaminationData = useCallback(async () => {
    if (!timeline || !currentPatient?.id) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(
        `ot/${user?.hospitalID}/${timeline}/redzone/physicalExamination`, 
        token
      );
      
      let physicalExaminationData: PhysicalExaminationData[] = [];
      
      if ("data" in res && res?.data?.status === 200) {
        const payload = Array.isArray(res?.data)
          ? res.data 
          : Array.isArray(res?.data?.data) 
            ? res.data.data 
            : [];

        physicalExaminationData = payload?.map((item: any) => ({
          id: Number(item?.id),
          general: item?.physicalExaminationData?.general || "",
          head: item?.physicalExaminationData?.head || "",
          ent: item?.physicalExaminationData?.ent || "",
          neuroPsych: item?.physicalExaminationData?.neuroPsych || "",
          neckSpine: item?.physicalExaminationData?.neckSpine || "",
          respiratory: item?.physicalExaminationData?.respiratory || "",
          cardiac: item?.physicalExaminationData?.cardiac || "",
          abdominal: item?.physicalExaminationData?.abdominal || "",
          pelvis: item?.physicalExaminationData?.pelvis || "",
          guRectal: item?.physicalExaminationData?.guRectal || "",
          musculoskeletal: item?.physicalExaminationData?.musculoskeletal || "",
          skin: item?.physicalExaminationData?.skin || "",
          patientTimeLineId: item?.patientTimeLineId,
          userID: item?.userID,
          createdAt: item?.createdAt,
          updatedAt: item?.updatedAt,
          addedOn: item?.addedOn,
        })) ?? [];
        
        physicalExaminationData?.sort((a, b) => 
          new Date(b?.createdAt || b?.addedOn || 0).getTime() - 
          new Date(a?.createdAt || a?.addedOn || 0).getTime()
        );
        setList(physicalExaminationData);
      } else {
        setList([]);
      }
    } catch (error) {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [timeline, user?.token, user?.hospitalID, currentPatient?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPhysicalExaminationData();
    }, [loadPhysicalExaminationData])
  );

  const renderPhysicalExaminationItem = ({
    item,
    index,
  }: {
    item: PhysicalExaminationData;
    index: number;
  }) => (
    <View style={styles.card}>
      {/* Header row with serial number and title */}
      <View style={styles.cardHeader}>
        <View style={styles.serialContainer}>
          <Text style={styles.serialNumber}>
            {(index + 1).toString().padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Physical Examination
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.grid}>
          {SECTIONS?.map((section) => {
            const value = item[section.key as keyof PhysicalExaminationData];
            if (!value || typeof value !== "string" || !value.trim()) return null;

            return (
              <View key={section.key} style={styles.gridItem}>
                <Text style={styles.sectionTitle}>{section.label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            );
          })}
        </View>

        {/* Meta section now more subtle, like status row footer */}
        <View style={styles.metaSection}>
          <Text style={styles.metaLabel}>Recorded On</Text>
          <Text style={styles.metaText}>
            {formatDateTime(item.createdAt || item.addedOn) || "—"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <View style={styles.headerWrap}>
        <Text style={[styles.subHeader, { color: COLORS.sub }]}>
          Complete physical examination records for this patient
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPhysicalExaminationItem}
          ItemSeparatorComponent={() => (<View style={{ height: RESPONSIVE.spacing.sm }} />)}
          contentContainerStyle={{
            padding: RESPONSIVE.spacing.lg,
            paddingBottom: bottomPad,
          }}
          showsVerticalScrollIndicator
          scrollIndicatorInsets={{ bottom: bottomPad }}
          decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
          initialNumToRender={8}
          windowSize={11}
          removeClippedSubviews={false}
          ListEmptyComponent={
            <View style={[styles.center, { paddingTop: 40 }]}>
              <Text style={[styles.emptyText, { color: COLORS.sub }]}>
                No physical examination records found
              </Text>
              {user?.roleName !== "reception" &&  currentPatient.ptype != 21 && (
              <Pressable
                style={styles.cta}
                onPress={() => navigation.navigate("AddPhysicalExamination" as never)}
              >
                <PlusIcon size={RESPONSIVE.icon.sm} color={COLORS.buttonText} />
                <Text style={styles.ctaText}>Add Physical Examination</Text>
              </Pressable>)}
            </View>
          }
        />
      )}
{user?.roleName !== "reception" &&  currentPatient.ptype != 21 &&  (
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("AddPhysicalExamination" as never)}
      >
        <PlusIcon size={RESPONSIVE.icon.md} color={COLORS.buttonText} />
      </Pressable>
      )}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: {
    paddingHorizontal: RESPONSIVE.spacing.lg,
    paddingTop: RESPONSIVE.spacing.md,
  },
  subHeader: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "700",
    marginTop: RESPONSIVE.spacing.xs,
    fontStyle: "italic",
  },

  // === Card styles aligned with MedicineCard look ===
  card: {
    borderRadius: 14,
    padding: RESPONSIVE.spacing.md, // close to 14
    marginBottom: RESPONSIVE.spacing.sm,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: RESPONSIVE.spacing.sm,
  },
  serialContainer: {
    marginRight: RESPONSIVE.spacing.sm,
  },
  serialNumber: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: "800",
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: "#0f766e",
    minWidth: 24,
    textAlign: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  cardTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : RESPONSIVE.fontSize.md,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  deleteBtn: {
    padding: RESPONSIVE.spacing.xs,
    backgroundColor: `${COLORS.danger}10`,
    borderRadius: 6,
  },
  cardContent: {
    paddingTop: 2,
  },

  grid: {
    flexDirection: RESPONSIVE.isTablet ? "row" : "column",
    flexWrap: "wrap",
    gap: RESPONSIVE.spacing.sm,
  },
  gridItem: {
    flex: RESPONSIVE.isTablet ? 1 : 0,
    width: RESPONSIVE.isTablet ? "48%" : "100%",
    minWidth: RESPONSIVE.isTablet ? 200 : "100%",
    gap: RESPONSIVE.spacing.xs,
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : RESPONSIVE.fontSize.sm,
    fontWeight: "700",
    color: "#64748b",
  },
  value: {
    fontSize: SCREEN_WIDTH < 375 ? 13 : RESPONSIVE.fontSize.md,
    fontWeight: "500",
    color: "#0f172a",
    lineHeight: 20,
  },

  metaSection: {
    marginTop: RESPONSIVE.spacing.md,
    paddingTop: RESPONSIVE.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  metaText: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: "600",
    color: "#0f172a",
  },

  fab: {
    position: "absolute",
    right: RESPONSIVE.spacing.lg,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyText: {
    fontWeight: "600",
    fontSize: RESPONSIVE.fontSize.md,
    marginBottom: RESPONSIVE.spacing.lg,
    textAlign: "center",
  },
  cta: {
    flexDirection: "row",
    gap: RESPONSIVE.spacing.sm,
    paddingHorizontal: RESPONSIVE.spacing.xl,
    paddingVertical: RESPONSIVE.spacing.md,
    borderRadius: 24,
    backgroundColor: COLORS.button,
    alignItems: "center",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ctaText: {
    fontWeight: "700",
    fontSize: RESPONSIVE.fontSize.md,
    color: COLORS.buttonText,
  },
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});