import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { patientStatus } from "../../utils/role";

// Icons
import { User as UserIcon, Search as SearchIcon, Eye, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native";
import { PatientType } from "../../utils/types";
import Footer from "../dashboard/footer";

const PAGE_SIZE = 10;

function getAgeLabel(dob?: string): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  if (years >= 2) return `${years}y`;
  let months = years * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months--;
  if (months <= 0) {
    const days = Math.max(
      0,
      Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    );
    return `${days}d`;
  }
  return `${months}m`;
}

const OpdPreviousPatients: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const user = useSelector((s: RootState) => s.currentUser);

  const [allPatients, setAllPatients] = useState<PatientType[]>([]);
  const [filterValue, setFilterValue] = useState<number>(0); // 0=Active, 1=Follow-up, 2=Previous
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const flatRef = useRef<FlatList<PatientType>>(null);

  const totalPages = Math.ceil(
    allPatients.filter(p => {
      if (filterValue === 2) return p.ptype === 21;
      if (filterValue === 0) return p.ptype === 1;
      return p.ptype !== 1 && p.ptype !== 21;
    }).length / PAGE_SIZE
  );

  const removeDuplicates = useCallback((patients: PatientType[]) => {
    const seen = new Set<string | number>();
    return patients.filter((p) => {
      const key = p.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const fetchNurseData = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    const url = `patient/${user?.hospitalID}/patients/nurseopdprevious/1?userID=${user?.id}&role=${user?.role}`;
    const response = await AuthFetch(url, token);
    if (response?.status === "success") {
      setAllPatients(removeDuplicates(response?.data?.patients || []));
    }
  }, [user?.token, user?.hospitalID, user?.id, user?.role, removeDuplicates]);

  const fetchAllPatients = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    const url = `patient/${user?.hospitalID}/patients/opdprevious/${patientStatus.outpatient}?userID=${user?.id}&role=${user?.role}`;
    const response = await AuthFetch(url, token);
    if (response?.status === "success") {
      setAllPatients(removeDuplicates(response?.data?.patients || []));
    }
  }, [user?.hospitalID, user?.id, user?.role, removeDuplicates]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (user?.role === 2003) {
          await fetchNurseData();
        } else {
          await fetchAllPatients();
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchNurseData, fetchAllPatients]);

  // Filtered + Searched + Paginated
  const filteredAndSearched = useMemo(() => {
    let base: PatientType[] = [];
    if (filterValue === 2) {
      base = allPatients.filter((p) => p.ptype === 21);
    } else if (filterValue === 0) {
      base = allPatients.filter((p) => p.ptype === 1);
    } else {
      base = allPatients.filter((p) => p.ptype !== 1 && p.ptype !== 21);
    }

    if (!search.trim()) return base;

    const term = search.toLowerCase().trim();
    return base.filter((patient) => {
      const name = patient?.pName?.toLowerCase() || "";
      const mobile = (patient?.phoneNumber ?? patient?.mobile ?? patient?.contact ?? "").toString();
      const patientId = (patient?.patientid ?? "").toString().toLowerCase();
      return name.includes(term) || mobile.includes(term) || patientId.includes(term);
    });
  }, [allPatients, filterValue, search]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredAndSearched.slice(start, end);
  }, [filteredAndSearched, currentPage]);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, search]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.controlsColumn}>
        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
          <SearchIcon size={18} color={COLORS.sub} />
          <TextInput
            placeholder="Search by name, mobile, ID"
            placeholderTextColor={COLORS.placeholder}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: COLORS.text }]}
          />
        </View>

        {/* Filter */}
        <View style={[styles.pickerWrap, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
          <ChevronDown size={16} color={COLORS.sub} />
          <Picker
            selectedValue={filterValue}
            onValueChange={(v) => setFilterValue(Number(v))}
            style={[styles.picker, { color: COLORS.text }]}
            dropdownIconColor={COLORS.sub}
          >
            <Picker.Item label="Active Patients" value={0} />
            <Picker.Item label="Follow Up Patients" value={1} />
            <Picker.Item label="Previous Patients" value={2} />
          </Picker>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No Patients Found</Text>
      <Text style={[styles.emptySub, { color: COLORS.sub }]}>Try adjusting filters or search terms.</Text>
    </View>
  );

  const renderItem = ({ item }: { item: PatientType }) => {
    const paddedId = String(item?.id ?? "").padStart(4, "0");
    const name = item?.pName || "—";
    const doctor = item?.doctorName || "—";
    const phone = (item?.phoneNumber ?? item?.mobile ?? item?.contact ?? "—").toString();
    const age = getAgeLabel(item?.dob);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
        onPress={() => navigation.navigate("PatientDetails", { patientId: item.id })}
      >
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { borderColor: COLORS.border, backgroundColor: COLORS.bg }]}>
            <UserIcon size={24} color={COLORS.sub} />
          </View>

          <View style={styles.meta}>
            <Text style={[styles.name, { color: COLORS.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              ID: {paddedId}
            </Text>

            <View style={styles.infoRow}>
              <Text style={[styles.badge, { color: COLORS.brand }]}>Age: {age}</Text>
              <Text style={[styles.dot, { color: COLORS.sub }]}>•</Text>
              <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
                Dr: {doctor}
              </Text>
            </View>

            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              Phone: {phone}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.viewBtn, { borderColor: COLORS.border }]}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("PatientProfile", { id: item.id });
            }}
          >
            <Eye size={18} color={COLORS.text} />
            <Text style={[styles.viewBtnText, { color: COLORS.text }]}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
        >
          <ChevronLeft size={18} color={currentPage === 1 ? COLORS.sub : COLORS.text} />
        </TouchableOpacity>

        <Text style={[styles.pageInfo, { color: COLORS.text }]}>
          Page {currentPage} of {totalPages}
        </Text>

        <TouchableOpacity
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
        >
          <ChevronRight size={18} color={currentPage === totalPages ? COLORS.sub : COLORS.text} />
        </TouchableOpacity>
      </View>
    );
  };

  const COLORS = useMemo(() => ({
    bg: isDark ? "#0f172a" : "#f8fafc",
    card: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f1f5f9" : "#0f172a",
    sub: isDark ? "#94a3b8" : "#475569",
    border: isDark ? "#334155" : "#e2e8f0",
    brand: "#14b8a6",
    placeholder: isDark ? "#64748b" : "#94a3b8",
  }), [isDark]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {renderHeader()}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.brand} />
            <Text style={[styles.loadingText, { color: COLORS.sub }]}>Loading patients…</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatRef}
              data={pagedData}
              keyExtractor={(it) => String(it.id)}
              renderItem={renderItem}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
            {renderPagination()}
          </>
        )}
      </KeyboardAvoidingView>
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  controlsColumn: {
    gap: 10,
  },
  searchWrap: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },

  pickerWrap: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  picker: {
    flex: 1,
    height: 48,
    marginLeft: 8,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  dot: {
    fontSize: 12,
  },
  badge: {
    fontSize: 13,
    fontWeight: "700",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 14, marginTop: 6 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 15 },

  // Pagination
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 70,
    justifyContent: "center",
    // Footer itself should render full width
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});

export default OpdPreviousPatients;