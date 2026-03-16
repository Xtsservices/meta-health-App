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
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus, Trash2 } from "lucide-react-native";
import { AuthDelete, AuthFetch } from "../../../auth/auth";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../store/toast.slice";
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

const FOOTER_H = 70;

export default function PocusScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const currentPatient = useSelector(selectCurrentPatient);
  const timeline = currentPatient?.patientTimeLineID;
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<PocusData[]>([]);

  const bottomPad =
    FOOTER_H +
    Math.max(insets.bottom, RESPONSIVE.spacing.md) +
    RESPONSIVE.spacing.md;

  const loadPocusData = useCallback(async () => {
    if (!timeline || !currentPatient?.id) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(`pocus/${user.hospitalID}/${timeline}`, token);

          if ("data" in res && res?.data?.message === "success" && Array.isArray(res?.data?.pocus)) {
        const pocusData: PocusData[] =
          res?.data?.pocus?.map((item: any) => ({
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
          })) ?? [];

        pocusData.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        setList(pocusData);
      } else {
        setList([]);
      }
    } catch (error: any) {
      dispatch(
        showError(
          error?.response?.data?.message || "Failed to load POCUS records"
        )
      );
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [timeline, user?.token, user?.hospitalID, currentPatient?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPocusData();
    }, [loadPocusData])
  );

  const renderPocusItem = ({
    item,
    index,
  }: {
    item: PocusData;
    index: number;
  }) => (
    <View style={styles.card}>
      {/* Header row with serial number and title (same style as Physical Examination) */}
      <View style={styles.cardHeader}>
        <View style={styles.serialContainer}>
          <Text style={styles.serialNumber}>
            {(index + 1).toString().padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            POCUS Examination
          </Text>
{/* 
          {user?.roleName !== "reception" && (
            <Pressable
              style={styles.deleteBtn}
              onPress={() => onDelete(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={RESPONSIVE.icon.sm} color={COLORS.danger} />
            </Pressable>
          )} */}
        </View>
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
                  <Text style={styles.value}>
                    {item.leftPleuralEffusion || "-"}
                  </Text>
                </View>
                <View style={styles.subItem}>
                  <Text style={styles.label}>Right:</Text>
                  <Text style={styles.value}>
                    {item.rightPleuralEffusion || "-"}
                  </Text>
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
                  <Text style={styles.value}>
                    {item.leftPneumothorax || "-"}
                  </Text>
                </View>
                <View style={styles.subItem}>
                  <Text style={styles.label}>Right:</Text>
                  <Text style={styles.value}>
                    {item.rightPneumothorax || "-"}
                  </Text>
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

        {/* Meta section styled like Physical Examination
        <View style={styles.metaSection}>
          <Text style={styles.metaLabel}>Recorded On</Text>
          <Text style={styles.metaText}>
            {formatDateTime(item.createdAt) || "—"}
          </Text>
        </View> */}
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <View style={styles.headerWrap}>
        <Text style={[styles.subHeader, { color: COLORS.sub }]}>
          Point-of-care ultrasound (POCUS) records for this patient
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
          ItemSeparatorComponent={() => (
            <View style={{ height: RESPONSIVE.spacing.sm }} />
          )}
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
                No POCUS records found
              </Text>
              {user?.roleName !== "reception" &&  currentPatient.ptype != 21 &&  (
                <Pressable
                  style={styles.cta}
                  onPress={() =>
                    navigation.navigate("AddPocus" as never)
                  }
                >
                  <Plus
                    size={RESPONSIVE.icon.sm}
                    color={COLORS.buttonText}
                  />
                  <Text style={styles.ctaText}>Add POCUS Record</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {user?.roleName !== "reception" &&  currentPatient.ptype != 21 && (
        <Pressable
          style={styles.fab}
          onPress={() => navigation.navigate("AddPocus" as never)}
        >
          <Plus size={RESPONSIVE.icon.md} color={COLORS.buttonText} />
        </Pressable>
      )}

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
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

  // === Card styles aligned with PhysicalExamination / MedicineCard look ===
  card: {
    borderRadius: 14,
    padding: RESPONSIVE.spacing.md,
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

  subGrid: {
    gap: RESPONSIVE.spacing.xs,
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: RESPONSIVE.spacing.sm,
  },
  label: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontWeight: "600",
    color: COLORS.sub,
    minWidth: 45,
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
