import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react-native";

import { RootState } from "../../../store/store";
import { AuthFetch, AuthPost, AuthDelete } from "../../../auth/auth";
import { useReportStore } from "../../../store/zustandstore";
import Footer from "../../dashboard/footer";
import { showError, showSuccess } from "../../../store/toast.slice";
import { COLORS } from "../../../utils/colour";

type Attachment = {
  id: number;
  fileName: string;
  fileURL: string;
  mimeType?: string;
  category: number | string;
  addedOn: string;
};



const FOOTER_H = 64;

const TABS = [
  { key: "radiology", label: "Radiology" },
  { key: "pathology", label: "Pathology" },
  { key: "previousHistory", label: "Previous History" },
] as const;
type TabKey = typeof TABS[number]["key"];

const CATEGORY_CODES: Record<"radiology" | "pathology" | "previoushistory", number> = {
  radiology: 1,
  pathology: 2,
  previoushistory: 3,
};

function iconByMime(mime?: string) {
  if (!mime) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  if (mime.startsWith("audio/")) return Music;
  if (mime.startsWith("video/")) return Video;
  return ImageIcon;
}

function formatDate(d: string) {
  const date = new Date(d);
  if (isNaN(date as any)) return "—";
  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
type RouteParams = { ot: boolean };
export default function ReportsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
const dispatch = useDispatch()
  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);
  const isCustomerCare = (cp as any)?.isCustomerCare || false;
  const reception = (cp as any)?.isReception || false;

  const { reports, setReports } = useReportStore();

  const [activeTabKey, setActiveTabKey] = useState<TabKey>("radiology");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
      const isOt = route.params?.ot;
  const categoryMap = useMemo(() => {
    const fromCp = (cp as any)?.reportCategory;
    if (fromCp && typeof fromCp === "object") {
      const norm: Record<string, number> = { ...CATEGORY_CODES };
      Object.keys(fromCp).forEach((k) => {
        const key = k.toLowerCase().replace(/\s|_/g, "") as keyof typeof CATEGORY_CODES;
        const num = Number((fromCp as any)[k]);
        if (Number.isFinite(num)) (norm as any)[key] = num;
      });
      return norm;
    }
    return CATEGORY_CODES;
  }, [cp]);

  const activeCategoryValue =
    categoryMap[activeTabKey.toLowerCase() as "radiology" | "pathology" | "previoushistory"];

  const normalizeCategory = (cat: any): number => {
    if (typeof cat === "number" && Number.isFinite(cat)) return cat;
    if (typeof cat === "string") {
      const t = cat.trim();
      if (/^\d+$/.test(t)) return Number(t);
      const key = t.toLowerCase().replace(/\s|_/g, "") as keyof typeof CATEGORY_CODES;
      if ((categoryMap as any)[key] != null) return (categoryMap as any)[key];
    }
    if (cat && typeof cat === "object") {
      if (Number.isFinite((cat as any).id)) return Number((cat as any).id);
      if (Number.isFinite((cat as any).category)) return Number((cat as any).category);
      if (typeof (cat as any).name === "string") {
        const key = (cat as any).name.toLowerCase().replace(/\s|_/g, "") as keyof typeof CATEGORY_CODES;
        if ((categoryMap as any)[key] != null) return (categoryMap as any)[key];
      }
    }
    return -1;
  };

  const fetchReports = useCallback(async () => {
    if (!user?.hospitalID) return;
    const patientID = cp?.currentPatient?.id ?? cp?.id;
    if (!patientID) return;

    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    const url = `attachment/${user?.hospitalID}/all/${patientID}`;
    const res = await AuthFetch(url, token);
    if (res?.status === "success") {
      setReports(res?.data?.attachments);
    }
  }, [cp, setReports, user?.hospitalID, user?.token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReports().finally(() => setLoading(false));
    }, [fetchReports])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports().finally(() => setRefreshing(false));
  }, [fetchReports]);

  const filtered = useMemo(() => {
    const arr = Array.isArray(reports) ? reports : [];
    const safeTime = (d: any) => {
      const t = new Date(d || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    return arr
      .filter((r) => normalizeCategory((r as any).category) === activeCategoryValue)
      .sort((a, b) => safeTime((b as any).addedOn) - safeTime((a as any).addedOn));
  }, [reports, activeCategoryValue, categoryMap]);

  const onView = (url: string) => Linking.openURL(url).catch(() => {});
  const onDelete = async (id: number) => {
    Alert.alert("Delete report", "Are you sure you want to delete this report?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = user?.token ?? (await AsyncStorage.getItem("token"));
            const resp = await AuthDelete(`attachment/${user?.hospitalID}/${id}`, token); // adjust if needed
            if (resp?.status === "success") {
 dispatch(showSuccess("Report deleted successfully"));
            // Already removed from UI, but refetch to ensure sync
            fetchReports();
            } else {
              setReports((prev: any[]) => (prev || []).filter((r) => r.id !== id));
            }
          } catch (error: any) {
dispatch(showError(error?.message|| error?.status || "failed to delete report"))
          }
        },
      },
    ]);
  };

  const bottomPad = FOOTER_H + Math.max(16, insets.bottom);
  const fabBottom = FOOTER_H + Math.max(insets.bottom, 12) + 12;

  const renderHeaderTabs = () => (
    <View style={styles.header}>
      <View style={styles.tabsBar} accessibilityRole="tablist">
        {TABS.map((t) => {
          const active = activeTabKey === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActiveTabKey(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Attachment }) => {
    const Icon = iconByMime(item.mimeType);
    return (
      <View
        style={[
          styles.cardRow,
          {
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
            shadowColor: COLORS.rowShadow,
          },
        ]}
      >
        {/* Leading icon */}
        <View style={styles.rowIconWrap}>
          <Icon size={22} color={COLORS.tabActive} />
        </View>

        {/* Middle: title + meta */}
        <View style={styles.rowMiddle}>
          {/* WRAPS to next line (no ellipsis) */}
          <Text style={styles.fileTitle}>
            {item.fileName ? item.fileName : "—"}
          </Text>

          <View style={styles.metaLine}>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>
                {activeTabKey === "radiology"
                  ? "Radiology"
                  : activeTabKey === "pathology"
                  ? "Pathology"
                  : "Previous History"}
              </Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{formatDate(item.addedOn)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.rowActions}>
          <Pressable onPress={() => onView(item.fileURL)} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.dot}>View</Text>
            {/* <ExternalLink size={18} color={COLORS.text} /> */}
          </Pressable>
          {!isOt  &&!isCustomerCare && !reception && (
            <Pressable onPress={() => onDelete(item.id)} style={styles.iconBtn} hitSlop={8}>
              <Trash2 size={18} color={COLORS.danger} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: COLORS.bg }]}>
      {renderHeaderTabs()}

      <View style={styles.listWrap}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: COLORS.sub, fontWeight: "700" }}>
              No reports found in this category.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ padding: 12, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator
            scrollIndicatorInsets={{ bottom: bottomPad }}
            // smoother scroll
            scrollEventThrottle={16}
            decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
            initialNumToRender={12}
            windowSize={11}
            removeClippedSubviews={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.brand}
              />
            }
          />
        )}
      </View>

      {!isOt && !isCustomerCare && !reception && user?.roleName !== "reception" && cp.ptype != 21 && (
        <Pressable
          onPress={() =>
            navigation.navigate("AddReports" as never, {
              category: activeCategoryValue,
            } as never)
          }
          style={[
            styles.fab,
            {
              bottom: fabBottom,
              right: 16,
              backgroundColor: COLORS.brand,
            },
          ]}
        >
          <Plus size={22} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", marginLeft: 6 }}>Upload</Text>
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
  screen: { flex: 1 },

  // Header Tabs
  header: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  tabsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: COLORS.chip },
  tabActive: { backgroundColor: "#d1fae5" },
  tabText: { fontWeight: "800", color: COLORS.text, fontSize: 13 },
  tabTextActive: { color: COLORS.tabActive },

  // List container
  listWrap: { flex: 1 },

  // Row card — raised height + top-aligned content for multi-line titles
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 92, // ← increased card height
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    gap: 10,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  // IMPORTANT: minWidth:0 lets text wrap inside flex row
  rowMiddle: { flex: 1, minWidth: 0 },

  // WRAPS onto multiple lines, no ellipsis
  fileTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 20,
    flexWrap: "wrap",
  },

  metaLine: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap", // allow wrap if narrow
  },
  metaText: { fontSize: 12, fontWeight: "700", color: COLORS.sub },
  dot: { color: COLORS.sub, fontWeight: "900" },

  typePill: {
    backgroundColor: COLORS.pillBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typePillText: { color: COLORS.pillText, fontWeight: "800", fontSize: 11 },

  rowActions: { flexDirection: "row", gap: 10, marginLeft: 6 },

  iconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },

  // FAB
  fab: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  // Footer & nav shield
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
