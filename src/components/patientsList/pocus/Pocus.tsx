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
import { useSelector,useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus, Trash2 } from "lucide-react-native";
import { AuthDelete, AuthFetch } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../store/toast.slice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RootState = any;
const selectUser = (s: RootState) => s.currentUser;
const selectCurrentPatient = (s: RootState) => s.currentPatient;
const dispatch = useDispatch();
interface PocusData {
  id: number;
  abdomen?: string;
  abg?: string;
  cxr?: string;
  ecg?: string;
  heart?: string;
  ivc?: string;
  leftPleuralEffusion?: string;
  leftPneumothorax?: string;
  rightPleuralEffusion?: string;
  rightPneumothorax?: string;
  patientTimeLineId?: number;
  userID?: number;
  createdAt?: string;
  updatedAt?: string;
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

export default function PocusScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const currentPatient = useSelector(selectCurrentPatient);
  const timeline = currentPatient?.patientTimeLineID;
  
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<PocusData[]>([]);

  const bottomPad = FOOTER_H + Math.max(insets.bottom, 12) + 12;

  const loadPocusData = useCallback(async () => {
    if (!timeline || !currentPatient?.id) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await AuthFetch(`pocus/${user.hospitalID}/${timeline}`, token);
      if (res?.data?.message === "success" && Array.isArray(res?.data?.pocus)) {
        const pocusData: PocusData[] = res?.data?.pocus?.map((item: any) => ({
          id: Number(item?.id),
          abdomen: item?.abdomen || "",
          abg: item?.abg || "",
          cxr: item?.cxr || "",
          ecg: item?.ecg || "",
          heart: item?.heart || "",
          ivc: item?.ivc || "",
          leftPleuralEffusion: item?.leftPleuralEffusion || "",
          leftPneumothorax: item?.leftPneumothorax || "",
          rightPleuralEffusion: item?.rightPleuralEffusion || "",
          rightPneumothorax: item?.rightPneumothorax || "",
          patientTimeLineId: item?.patientTimeLineId,
          userID: item?.userID,
          createdAt: item?.createdAt,
          updatedAt: item?.updatedAt,
        }));
        
        pocusData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setList(pocusData);
      } else {
        setList([]);
      }
    } catch (error) {
      dispatch(showError(error?.response?.data?.message || 'Failed to load POCUS records'));
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [timeline, user?.hospitalID, currentPatient?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPocusData();
    }, [loadPocusData])
  );

  const onDelete = async (item: PocusData) => {
    if (!timeline?.id || !item?.id) return;
    
    Alert.alert("Delete POCUS", "Are you sure you want to delete this POCUS record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = user?.token ?? (await AsyncStorage.getItem("token"));
            const res = await AuthDelete(`pocus/${timeline}/${item.id}`, token);
            
            if (res?.data?.message === "success") {
              setList((prev) => prev.filter((x) => x.id !== item.id));
            }
          } catch {
            Alert.alert("Error", "Failed to delete POCUS record.");
          }
        },
      },
    ]);
  };

  const renderPocusItem = ({ item }: { item: PocusData }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>POCUS Record #{item.id}</Text>
        <Pressable
          style={styles.deleteBtn}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={18} color={COLORS.danger} />
        </Pressable>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.grid}>
          {/* Pleural Effusion Section */}
          {(item.leftPleuralEffusion || item.rightPleuralEffusion) && (
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Pleural Effusion</Text>
              <View style={styles.subGrid}>
                <View style={styles.subItem}>
                  <Text style={styles.label}>Left:</Text>
                  <Text style={styles.value}>{item.leftPleuralEffusion || "-"}</Text>
                </View>
                <View style={styles.subItem}>
                  <Text style={styles.label}>Right:</Text>
                  <Text style={styles.value}>{item.rightPleuralEffusion || "-"}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Pneumothorax Section */}
          {(item.leftPneumothorax || item.rightPneumothorax) && (
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Pneumothorax</Text>
              <View style={styles.subGrid}>
                <View style={styles.subItem}>
                  <Text style={styles.label}>Left:</Text>
                  <Text style={styles.value}>{item.leftPneumothorax || "-"}</Text>
                </View>
                <View style={styles.subItem}>
                  <Text style={styles.label}>Right:</Text>
                  <Text style={styles.value}>{item.rightPneumothorax || "-"}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Heart Section */}
          {item.heart && (
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Heart</Text>
              <Text style={styles.value}>{item.heart}</Text>
            </View>
          )}

          {/* Abdomen Section */}
          {item.abdomen && (
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Abdomen</Text>
              <Text style={styles.value}>{item.abdomen}</Text>
            </View>
          )}

          {/* IVC */}
          {item.ivc && (
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>IVC</Text>
              <Text style={styles.value}>{item.ivc}</Text>
            </View>
          )}

          {/* ABG */}
          {item.abg && (
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>ABG</Text>
              <Text style={styles.value}>{item.abg}</Text>
            </View>
          )}

          {/* CXR */}
          {item.cxr && (
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>CXR</Text>
              <Text style={styles.value}>{item.cxr}</Text>
            </View>
          )}

          {/* ECG */}
          {item.ecg && (
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>ECG</Text>
              <Text style={styles.value}>{item.ecg}</Text>
            </View>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.metaSection}>
          <Text style={styles.metaText}>Added by: User #{item.userID}</Text>
          <Text style={styles.metaText}>{formatDateTime(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <View style={styles.headerWrap}>
        <Text style={[styles.headerText, { color: COLORS.text }]}>POCUS Records</Text>
        <Text style={[styles.subHeader, { color: COLORS.sub }]}>
          Point-of-care ultrasound examination results
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
          renderItem={renderPocusItem}
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
                No POCUS records found
              </Text>
              <Pressable
                style={styles.cta}
                onPress={() => navigation.navigate("AddPocus" as never)}
              >
                <Plus size={18} color={COLORS.buttonText} />
                <Text style={styles.ctaText}>Add POCUS Record</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("AddPocus" as never)}
      >
        <Plus size={20} color={COLORS.buttonText} />
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
  safe: { flex: 1 },
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
    gap: 6,
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

  subGrid: {
    gap: 4,
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.sub,
    minWidth: 45,
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