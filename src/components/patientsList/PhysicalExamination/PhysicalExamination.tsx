import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  button: "#14b8a6",
  buttonText: "#ffffff",
  danger: "#ef4444",
};

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

  const bottomPad = FOOTER_H + Math.max(insets.bottom, 12) + 12;

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
      
      if (res?.data?.status === 200) {
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

  const onDelete = async (item: PhysicalExaminationData) => {
    if (!timeline || !item?.id) return;
    
    Alert.alert("Delete Physical Examination", "Are you sure you want to delete this physical examination record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = user?.token ?? (await AsyncStorage.getItem("token"));
            const res = await AuthDelete(
              `ot/${user?.hospitalID}/${timeline}/redzone/physicalExamination/${item.id}`, 
              token
            );
            
            if (res?.message === "success" || res?.status === 200) {
              setList((prev) => prev?.filter((x) => x.id !== item.id) ?? []);
            }
          } catch {
            Alert.alert("Error", "Failed to delete physical examination record.");
          }
        },
      },
    ]);
  };

  const renderPhysicalExaminationItem = ({ item }: { item: PhysicalExaminationData }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Physical Examination #{item.id}</Text>
        <Pressable
          style={styles.deleteBtn}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2Icon size={18} color={COLORS.danger} />
        </Pressable>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.grid}>
          {SECTIONS?.map((section) => {
            const value = item[section.key as keyof PhysicalExaminationData];
            if (!value || typeof value !== 'string' || !value.trim()) return null;
            
            return (
              <View key={section.key} style={styles.gridItem}>
                <Text style={styles.sectionTitle}>{section.label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.metaSection}>
          <Text style={styles.metaText}>Added by: User #{item.userID}</Text>
          <Text style={styles.metaText}>
            {formatDateTime(item.createdAt || item.addedOn)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <View style={styles.headerWrap}>
        <Text style={[styles.headerText, { color: COLORS.text }]}>Physical Examination</Text>
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
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator
          scrollIndicatorInsets={{ bottom: bottomPad }}
          decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
          initialNumToRender={8}
          windowSize={11}
          removeClippedSubviews={false}
          ListEmptyComponent={
            <View style={[styles.center, { paddingTop: 40 }]}>
              <Text style={{ color: COLORS.sub, fontWeight: "600", marginBottom: 16 }}>
                No physical examination records found
              </Text>
              <Pressable
                style={styles.cta}
                onPress={() => navigation.navigate("AddPhysicalExamination" as never)}
              >
                <PlusIcon size={18} color={COLORS.buttonText} />
                <Text style={styles.ctaText}>Add Physical Examination</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("AddPhysicalExamination" as never)}
      >
        <PlusIcon size={20} color={COLORS.buttonText} />
      </Pressable>
      
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
    paddingHorizontal: 16, 
    paddingTop: 12,
  },
  headerText: { 
    fontSize: 16, 
    fontWeight: "900",
  },
  subHeader: { 
    fontSize: 12, 
    fontWeight: "700", 
    marginTop: 2,
  },

  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    flex: 1,
  },
  cardContent: {
    padding: 16,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridItem: {
    width: SCREEN_WIDTH < 400 ? '100%' : 'calc(50% - 6px)',
    minWidth: SCREEN_WIDTH < 400 ? '100%' : 160,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    lineHeight: 20,
  },

  metaSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.sub,
  },

  deleteBtn: { 
    padding: 6,
  },

  fab: {
    position: "absolute",
    right: 16,
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

  cta: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    fontSize: 14,
    color: COLORS.buttonText,
  },

  footerWrap: {
    position: "absolute",
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