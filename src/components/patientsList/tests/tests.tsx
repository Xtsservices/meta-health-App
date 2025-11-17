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
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthDelete, AuthFetch } from "../../../auth/auth";
import { FileTextIcon, PlusIcon, Trash2Icon } from "../../../utils/SvgIcons";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import usePreOpForm from "../../../utils/usePreOpForm";

type RootState = any;
const selectUser = (s: RootState) => s.currentUser;
const selectCurrentPatient = (s: RootState) => s.currentPatient;

type TestRow = {
  id: number;
  test: string;
  loinc_num_: string;
  category: string;
  status: string;
  addedOn?: string | null;
  userID?: number | null;
  notes?: string | null;
  alertStatus?: string | null;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor: number = 0.5) => size + (scale(size) - size) * factor;

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  field: "#f8fafc",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  button: "#14b8a6",
  buttonText: "#ffffff",
  danger: "#ef4444",
  pill: "#eef2f7",
  placeholder: "#94a3b8",
};

const FOOTER_HEIGHT = moderateScale(70);

const cap = (s: string) => (s ? s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase() : "");

export default function TestsScreen() {
  const navigation = useNavigation<any>();
   const route = useRoute<any>();    
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const currentpatient = useSelector(selectCurrentPatient);
  const timeline = currentpatient?.patientTimeLineID;
  const [list, setList] = useState<TestRow[]>([]);
  const {
    tests
  } = usePreOpForm();
   const activetab =
    route.params?.currentTab 
const shouldShowPreOpTests = activetab === "PreOpRecord";
    let readOnly = false
    if ((shouldShowPreOpTests && user?.roleName === "surgeon") || activetab === "PatientFile"){

    readOnly = true;
  }else if (shouldShowPreOpTests && user?.roleName !== "surgeon"){
    readOnly = false
  }
  const [loading, setLoading] = useState(false);

    

  const load = useCallback(async () => {
    if (!currentpatient?.id) return;
    setLoading(true);
    if (shouldShowPreOpTests) {
  setList(tests || []);
  setLoading(false);
  return;
}
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(`test/${currentpatient.id}`, token);
      
      if (res?.data?.message === "success") {
        const rows: TestRow[] = (res?.data?.tests || [])?.map((t: any) => ({
          id: Number(t?.id),
          test: String(t?.test || ""),
          loinc_num_: t?.loinc_num_ || "",
          category: t?.category || "",
          status: t?.status || "",
          addedOn: t?.addedOn || null,
          userID: t?.userID ?? null,
          notes: t?.testNotes || null,
          alertStatus: t?.alertStatus || null,
        })) || [];
        rows?.sort((a, b) => new Date(b?.addedOn || 0)?.getTime() - new Date(a?.addedOn || 0)?.getTime());
        setList(rows);
      } else {
        setList([]);
      }
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [currentpatient?.id, user?.token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDelete = async (row: TestRow) => {
    if (row?.alertStatus && row?.alertStatus?.toLowerCase() !== "pending") {
      Alert.alert("Cannot Delete", "Cannot delete test that is already approved.");
      return;
    }

    if (!timeline || !row?.id) return;
    Alert.alert("Delete Test", "Are you sure you want to delete this test?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = user?.token ?? (await AsyncStorage.getItem("token"));
            const res = await AuthDelete(`test/${timeline}/${row.id}`, token);
            if (res?.data?.message === "success") {
              setList((prev) => prev?.filter((x) => x?.id !== row?.id) || []);
            }
          } catch {
            Alert.alert("Error", "Failed to delete test.");
          }
        },
      },
    ]);
  };

  const navigateToReports = () => {
    navigation.navigate("Reports");
  };

  const renderItem = ({ item, index }: { item: TestRow; index: number }) => (
    <View style={[styles.row, { borderColor: COLORS.border }]}>
      <View style={styles.rowLeft}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: COLORS.text }]}>
            {index + 1}. {cap(item?.test || "")}
          </Text>
          {item?.status === "completed" ? (
            <Pressable onPress={navigateToReports} style={styles.viewReportBtn}>
              <FileTextIcon size={moderateScale(16)} color={COLORS.brand} />
              <Text style={[styles.viewReportText, { color: COLORS.brand }]}>View Report</Text>
            </Pressable>
          ) : (
            <Text style={[styles.status, { color: COLORS.sub }]}>{item?.status}</Text>
          )}
        </View>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: COLORS.sub }]}>LOINC:</Text>
            <Text style={[styles.detailValue, { color: COLORS.text }]}>{item?.loinc_num_ || "N/A"}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: COLORS.sub }]}>Department:</Text>
            <Text style={[styles.detailValue, { color: COLORS.text }]}>{cap(item?.category || "")}</Text>
          </View>
        </View>

        {item?.notes && item?.notes?.trim() !== "" && (
          <View style={styles.notesContainer}>
            <Text style={[styles.notesLabel, { color: COLORS.sub }]}>Notes:</Text>
            <Text style={[styles.notesText, { color: COLORS.text }]}>{item?.notes}</Text>
          </View>
        )}

        <View style={styles.metaContainer}>
          <Text style={[styles.metaText, { color: COLORS.sub }]}>
            Added: {formatDateTime(item?.addedOn)}
          </Text>
          <Text style={[styles.metaText, { color: COLORS.sub }]}>
            Added By: {item?.userID || "N/A"}
          </Text>
        </View>
      </View>
      
      {(!item?.alertStatus || item?.alertStatus?.toLowerCase() === "pending") && (
        <Pressable onPress={() => onDelete(item)} style={styles.deleteBtn} hitSlop={8}>
          <Trash2Icon size={moderateScale(18)} color={COLORS.danger} />
        </Pressable>
      )}
    </View>
  );

  const empty = !loading && list?.length === 0;

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : empty ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: COLORS.sub }]}>No tests prescribed yet</Text>
          {!readOnly &&
          <Pressable
            style={[styles.cta, { backgroundColor: COLORS.button }]}
            onPress={() => navigation.navigate("AddTests" as never, {currentTab: activetab})}
          >
            <PlusIcon size={moderateScale(18)} color={COLORS.buttonText} />
            <Text style={[styles.ctaText, { color: COLORS.buttonText }]}>Add Test</Text>
          </Pressable>}
        </View>
      ) : (
        <>
          <FlatList
            data={list}
            keyExtractor={(it) => String(it?.id)}
            renderItem={renderItem}
            contentContainerStyle={{ 
              padding: moderateScale(16), 
              paddingBottom: FOOTER_HEIGHT + moderateScale(16) + insets.bottom 
            }}
            ItemSeparatorComponent={() => <View style={{ height: moderateScale(12) }} />}
            showsVerticalScrollIndicator={false}
          />
          {!readOnly && 
          <Pressable
            style={[styles.fab, { 
              backgroundColor: COLORS.button,
              bottom: FOOTER_HEIGHT + moderateScale(16) + insets.bottom 
            }]}
            onPress={() => navigation.navigate("AddTests" as never,  {currentTab: activetab})}
          >
            <PlusIcon size={moderateScale(20)} color={COLORS.buttonText} />
          </Pressable>}
        </>
      )}
      
      <View style={[styles.footerWrap, { 
        bottom: insets.bottom,
        height: FOOTER_HEIGHT,
      }]}>
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
    flex: 1 
  },
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    gap: moderateScale(14) 
  },
  emptyText: { 
    fontSize: moderateScale(14), 
    fontWeight: "600" 
  },

  row: {
    borderWidth: 1,
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    backgroundColor: COLORS.card,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(12),
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowLeft: { 
    flex: 1, 
    gap: moderateScale(8) 
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: moderateScale(4),
  },
  title: { 
    fontSize: moderateScale(15), 
    fontWeight: "800",
    flex: 1,
    marginRight: moderateScale(8),
  },
  
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  detailLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  detailValue: {
    fontSize: moderateScale(12),
    fontWeight: "700",
  },
  
  notesContainer: {
    marginTop: moderateScale(4),
  },
  notesLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    marginBottom: moderateScale(2),
  },
  notesText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    fontStyle: 'italic',
  },
  
  metaContainer: {
    marginTop: moderateScale(6),
    gap: moderateScale(2),
  },
  metaText: {
    fontSize: moderateScale(11),
    fontWeight: "500",
  },

  deleteBtn: { 
    paddingHorizontal: moderateScale(6), 
    paddingVertical: moderateScale(4), 
    alignSelf: "flex-start",
    marginTop: moderateScale(4),
  },

  viewReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    backgroundColor: `${COLORS.brand}15`,
    borderRadius: moderateScale(6),
  },
  viewReportText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
  },

  fab: {
    position: "absolute",
    right: moderateScale(16),
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  cta: {
    flexDirection: "row",
    gap: moderateScale(8),
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(999),
    alignItems: "center",
  },
  ctaText: { 
    fontWeight: "800", 
    fontSize: moderateScale(14) 
  },
  
  footerWrap: {
    left: 0,
    right: 0,
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