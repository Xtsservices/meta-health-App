// src/screens/opd/AppointmentListScreen.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye } from "lucide-react-native";

import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { PatientType } from "../../utils/types";
import { patientStatus } from "../../utils/role";
import Footer from "../dashboard/footer";
import { formatageFromDOB } from "../../utils/age";
import { formatDate } from "../../utils/dateTime";

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  border: "#e2e8f0",
  brand: "#14b8a6",
  chipBg: "#e0f7f4",
  chipActiveBg: "#14b8a6",
  chipActiveText: "#ffffff",
};

const FOOTER_H = 70;
const PAGE_SIZE = 10;

type FilterType = "All" | "Custom";

const AppointmentListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);

  const [patients, setPatients] = useState<PatientType[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientType[]>([]);

  const [filterType, setFilterType] = useState<FilterType>("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [loading, setLoading] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [page, setPage] = useState(1);

  const fetchOnce = useRef(true);

  // bottom padding so last item + pagination stay above footer + nav
  const bottomPad = FOOTER_H + insets.bottom + 24;

  // --- API calls ---
  const getRecentData = useCallback(async () => {
    if (!user?.hospitalID || !user?.id) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(
        `patient/${user?.hospitalID}/patients/recent/${patientStatus?.outpatient}?userID=${user?.id}&role=${user?.role}`,
        token
      );
      if (res?.status === "success") {
        const list: PatientType[] = res?.data?.patients ?? [];
        setPatients(list);
        if (filterType === "All" && !startDate && !endDate) {
          setFilteredPatients(list);
        }
      } else {
        setPatients([]);
        setFilteredPatients([]);
      }
    } catch (e) {    
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.id, user?.role, filterType, startDate, endDate]);

  const getNurseAddedData = useCallback(async () => {
    if (!user?.hospitalID || !user?.id) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(
        `patient/${user.hospitalID}/patients/nurseRecent/${patientStatus.outpatient}?userID=${user.id}&role={user.role}`,
        token
      );
      if (res?.status === "success") {
        const list: PatientType[] = res?.data?.patients ?? [];
        setPatients(list);
        if (filterType === "All" && !startDate && !endDate) {
          setFilteredPatients(list);
        }
      } else {
        setPatients([]);
        setFilteredPatients([]);
      }
    } catch (e) {
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.id, user?.role, filterType, startDate, endDate]);

  // initial fetch – nurse vs others
  useFocusEffect(
    useCallback(() => {
      if (user && fetchOnce.current) {
        fetchOnce.current = false;
        if (user.role === 2003) {
          getNurseAddedData();
        } else {
          getRecentData();
        }
      }
    }, [user?.role, getRecentData, getNurseAddedData])
  );

  // refetch if user changes
  useEffect(() => {
    if (user && user?.id) {
      if (user.role === 2003) {
        getNurseAddedData();
      } else {
        getRecentData();
      }
    }
  }, [user?.id, user?.role, getRecentData, getNurseAddedData]);

  // --- Date range filtering ---
  useEffect(() => {
    if (filterType === "All" || (!startDate && !endDate)) {
      setFilteredPatients(patients);
      setPage(1);
      return;
    }

    let start: Date | null = null;
    let end: Date | null = null;

    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    const filtered = patients.filter((p: any) => {
      let patientDate: Date | null = null;

      if (p.appointmentDate) {
        patientDate = new Date(p.appointmentDate);
      } else if (p.startTime) {
        patientDate = new Date(p.startTime);
      } else if (p.lastModified) {
        patientDate = new Date(p.lastModified);
      } else if (p.addedOn) {
        patientDate = new Date(p.addedOn);
      }

      if (!patientDate || Number.isNaN(patientDate.getTime())) return true;

      if (start && patientDate < start) return false;
      if (end && patientDate > end) return false;
      return true;
    });

    setFilteredPatients(filtered);
    setPage(1); // reset to first page on filter change
  }, [patients, startDate, endDate, filterType]);

  // --- View handler ---
  const handleView = useCallback(
    async (id?: number) => {
      if (!id || !user?.hospitalID) return;
      try {
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        const res = await AuthFetch(
          `patient/${user.hospitalID}/patients/isviewchange/${id}`,
          token
        );
        if (res?.status === "success") {
          navigation.navigate("PatientProfile" as never, { id: id } as never);
        }
      } catch (e) {
        console.error("Error navigating to patient:", e);
      }
    },
    [user?.hospitalID, navigation]
  );

  // --- Date picker callbacks ---
  const onStartChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowStartPicker(false);
    if (event.type !== "set" || !selectedDate) return;
    const iso = selectedDate.toISOString().slice(0, 10);
    setFilterType("Custom");
    setStartDate(iso);
    if (endDate && new Date(endDate) < selectedDate) {
      setEndDate("");
    }
  };

  const onEndChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEndPicker(false);
    if (event.type !== "set" || !selectedDate) return;
    if (startDate && selectedDate < new Date(startDate)) {
      return;
    }
    const iso = selectedDate.toISOString().slice(0, 10);
    setFilterType("Custom");
    setEndDate(iso);
  };

  // --- Sorting + Pagination ---
  const sortedData = useMemo(() => {
    const arr = [...filteredPatients];
    arr.sort((a: any, b: any) => {
      const aDate =
        (a.appointmentDate && new Date(a.appointmentDate)) ||
        (a.startTime && new Date(a.startTime)) ||
        (a.lastModified && new Date(a.lastModified)) ||
        (a.addedOn && new Date(a.addedOn)) ||
        new Date(0);
      const bDate =
        (b.appointmentDate && new Date(b.appointmentDate)) ||
        (b.startTime && new Date(b.startTime)) ||
        (b.lastModified && new Date(b.lastModified)) ||
        (b.addedOn && new Date(b.addedOn)) ||
        new Date(0);
      return bDate.getTime() - aDate.getTime(); // latest first
    });
    return arr;
  }, [filteredPatients]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));

  const pageData = useMemo(() => {
    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    return sortedData.slice(startIdx, endIdx);
  }, [sortedData, page]);

  const goPrev = () => {
    setPage((p) => (p > 1 ? p - 1 : p));
  };

  const goNext = () => {
    setPage((p) => (p < totalPages ? p + 1 : p));
  };

  const renderItem = ({ item }: { item: PatientType }) => {
    const anyItem: any = item;

    const age =
      formatageFromDOB(anyItem?.dob) !== "-"
        ? formatageFromDOB(anyItem?.dob)
        : anyItem?.age;

    const appointmentLabel = formatDate(anyItem.appointmentDate);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{anyItem.pName ?? "-"}</Text>
            <Text style={styles.subText}>ID: {item.id}</Text>
          </View>
          <View style={styles.ageBadge}>
            <Text style={styles.ageText}>{age}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Doctor</Text>
          <Text style={styles.value}>{anyItem.doctorName || "-"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{anyItem.phoneNumber || "-"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Appointment</Text>
          <Text style={styles.value}>{appointmentLabel}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        <View style={styles.cardFooterRow}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => handleView(item.id as number)}
          >
            <View style={styles.viewContent}>
              <View style={styles.viewIconCircle}>
                <Eye size={16} color={COLORS.brand} />
              </View>
              <Text style={styles.viewText}>View</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    if (sortedData.length === 0) return null;

    return (
      <View style={styles.paginationWrapper}>
        <View style={styles.paginationBar}>
          <TouchableOpacity
            style={[
              styles.pageBtn,
              page === 1 && styles.pageBtnDisabled,
            ]}
            disabled={page === 1}
            onPress={goPrev}
          >
            <Text
              style={[
                styles.pageBtnText,
                page === 1 && styles.pageBtnTextDisabled,
              ]}
            >
              Prev
            </Text>
          </TouchableOpacity>

          <Text style={styles.pageInfo}>
            Page {page} of {totalPages}
          </Text>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              page === totalPages && styles.pageBtnDisabled,
            ]}
            disabled={page === totalPages}
            onPress={goNext}
          >
            <Text
              style={[
                styles.pageBtnText,
                page === totalPages && styles.pageBtnTextDisabled,
              ]}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Appointments</Text>
        <Text style={styles.headerSub}>
          View and filter latest OPD appointments
        </Text>

        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === "All" && styles.filterChipActive,
            ]}
            onPress={() => {
              setFilterType("All");
              setStartDate("");
              setEndDate("");
              setFilteredPatients(patients);
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === "All" && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <View style={styles.dateGroup}>
            <TouchableOpacity
              style={styles.dateChip}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateChip}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* DATE PICKERS */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate ? new Date(startDate) : new Date()}
          mode="date"
          display={Platform.OS === "android" ? "spinner" : "default"}
          maximumDate={endDate ? new Date(endDate) : new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={onStartChange}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate ? new Date(endDate) : new Date()}
          mode="date"
          display={Platform.OS === "android" ? "spinner" : "default"}
          maximumDate={new Date()}
          minimumDate={startDate ? new Date(startDate) : new Date(1900, 0, 1)}
          onChange={onEndChange}
        />
      )}

      {/* LIST + PAGINATION */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : sortedData.length === 0 ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Text style={styles.emptyTitle}>No appointments found</Text>
          <Text style={styles.emptySub}>
            Try changing the date range or check back later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pageData}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: bottomPad,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator
          scrollIndicatorInsets={{ bottom: bottomPad }}
          decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
          initialNumToRender={10}
          windowSize={11}
          removeClippedSubviews={false}
          ListFooterComponent={renderPagination}
        />
      )}

      {/* FOOTER pinned above nav buttons */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor={COLORS.brand} />
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

export default AppointmentListScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 2,
    fontWeight: "600",
  },

  filtersRow: {
    marginTop: 12,
  },

  filterChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.chipBg,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.chipActiveBg,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.brand,
  },
  filterChipTextActive: {
    color: COLORS.chipActiveText,
  },

  dateGroup: {
    flexDirection: "row",
    gap: 8,
  },
  dateChip: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#ffffff",
  },
  dateLabel: {
    fontSize: 11,
    color: COLORS.sub,
    marginBottom: 2,
    fontWeight: "600",
  },
  dateValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "700",
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  subText: {
    fontSize: 11,
    color: COLORS.sub,
    marginTop: 2,
  },
  ageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  ageText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "600",
  },
  value: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },

  cardFooterRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  viewContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0f2fe",
  },
  viewText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.brand,
  },

  // pagination at end of list (no absolute)
  paginationWrapper: {
    paddingVertical: 12,
  },
  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ecfeff",
  },
  pageBtnDisabled: {
    backgroundColor: "#f1f5f9",
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.brand,
  },
  pageBtnTextDisabled: {
    color: "#9ca3af",
  },
  pageInfo: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
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

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.sub,
  },
  emptySub: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.sub,
    textAlign: "center",
  },
});
