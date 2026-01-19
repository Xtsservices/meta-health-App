// src/screens/patients/HospitalReceptionPatientListMobile.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Dimensions,
  useColorScheme,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import {
  Search as SearchIcon,
  UserRound,
  Phone,
  Eye,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import Footer from "../dashboard/footer";

import {
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";
import { formatageFromDOB } from "../../utils/age";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_SIZE = 10;
const FOOTER_H = FOOTER_HEIGHT || 70;

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type Ward = {
  id: number;
  name: string;
};

type Patient = {
  id: string;
  pName: string;
  phoneNumber?: string;
  wardName?: string;
  wardID?: number | string | null;
  department?: string;
  doctorName?: string;
  dischargeType?: number | null;
  zone?: number | null;
  dob?: string | null;
  age?: string | number | null;
  photo?: string | null;
  patientStartStatus?: number | null;
};

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

const getPatientTypeLabel = (filter: number): string => {
  switch (filter) {
    case 1:
      return "OPD";
    case 2:
      return "IPD";
    case 3:
      return "Emergency";
    case 4:
      return "Discharge";
    default:
      return "Patients";
  }
};

const getZoneLabel = (zone?: number | null): string => {
  if (zone === 1) return "Critical";
  if (zone === 2) return "Urgent";
  if (zone === 3) return "Stable";
  return "—";
};

const getZoneBadgeColor = (zone?: number | null): string => {
  if (zone === 1) return "#dc2626"; // red
  if (zone === 2) return "#f97316"; // orange
  if (zone === 3) return "#16a34a"; // green
  return COLORS.chip;
};

const buildDateQuery = (year: string, month: string) => {
  if (month === "0" || !year) return "";
  const mm = String(Number(month)).padStart(2, "0");
  return `?date=${year}-${mm}-15`;
};

const getAgeLabel = (p: Patient): string => {
  const raw = p?.age;
  if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
    return String(raw);
  }
  if (p?.dob) {
    try {
      return formatageFromDOB(p.dob);
    } catch {
      return "—";
    }
  }
  return "—";
};

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

const HospitalReceptionPatientListMobile: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchResults, setSearchResults] = useState<Patient[] | null>(null); // 🔍 API search results
  const [wards, setWards] = useState<Ward[]>([]);
  const [filter, setFilter] = useState<number>(2); // 2 = IPD default
  const [wardID, setWardID] = useState<number>(0);
  const [year, setYear] = useState<string>(String(currentYear));
  const [month, setMonth] = useState<string>(currentMonth);
  const [search, setSearch] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);

  const typeLabel = getPatientTypeLabel(filter);

  const pickerTextColor =  "#111827";
  const filterBoxBg =  COLORS.card;

  /* ------------------------------ Fetch Wards ------------------------------ */

  const fetchWards = async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const res = await AuthFetch(`ward/${user?.hospitalID}`, token);

      if (res?.status === "success" && "data" in res && Array.isArray(res?.data?.wards)) {
        setWards(res.data.wards);
      } else if (Array.isArray(res)) {
        setWards(res as Ward[]);
      } else {
        setWards([]);
      }
    } catch {
      setWards([]);
    }
  };

  /* ---------------------------- Fetch Patients ----------------------------- */

  const fetchPatients = async () => {
    if (!user?.hospitalID) return;
    try {
      setLoading(true);
      setError(null);

      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!token) {
        setError("Authentication missing");
        setPatients([]);
        return;
      }

      let patientType: number;
      switch (filter) {
        case 1:
          patientType = 1; // OPD
          break;
        case 2:
          patientType = 2; // IPD
          break;
        case 3:
          patientType = 3; // EMERGENCY
          break;
        case 4:
          patientType = 21; // Discharged
          break;
        default:
          patientType = 2;
      }

      const dateQuery = buildDateQuery(year, month);
      const url = `patient/${user?.hospitalID}/receptionpatients/${patientType}${dateQuery}`;

      const res = await AuthFetch(url, token);

      let list: Patient[] = [];
      if (res?.status === "success" && "data" in res && Array.isArray(res?.data?.patients)) {
        list = res?.data?.patients;
      } else if (Array.isArray(res)) {
        list = res;
      } else {
        list = [];
      }

      // Ward filter (disabled in OPD case, but keep same logic as web)
      if (wardID && wardID !== 0 && filter !== 1) {
        list = list.filter((p: any) => {
          const pid = p.wardID ?? p.wardId;
          return pid && Number(pid) === Number(wardID);
        });
      }

      setPatients(list);
    } catch (e: any) {
      setPatients([]);
      setError(
        typeof e?.message === "string" ? e.message : "Failed to fetch patients"
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- Fetch Search API ---------------------------- */
  // Uses the same API as your web Searchpatient component:
  // GET patient/{hospitalID}/search?mobile={search}
  useEffect(() => {
    const mobile = search.trim();
    if (!mobile) {
      setSearchResults(null); // back to normal list when search cleared
      return;
    }

    // optional: avoid API spam for 1–2 digits
    if (mobile.length < 1) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        if (!token || !user?.hospitalID) return;

        const res = await AuthFetch(
          `patient/${user?.hospitalID}/search?mobile=${mobile}`,
          token
        );

        let list: Patient[] = [];
        if (res?.status === "success" && "data" in res && Array.isArray(res?.data?.patients)) {
          list = res.data.patients;
        } else if (Array.isArray(res)) {
          list = res;
        }
        const searchValue = mobile;
        list = list.filter((p: Patient) =>
          p.phoneNumber?.startsWith(searchValue)
        );

        if (!cancelled) {
          setSearchResults(list);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [search, user?.token, user?.hospitalID]);

  /* ----------------------------- Effects ----------------------------------- */

  useEffect(() => {
    fetchWards();
  }, [user?.hospitalID, user?.token]);

  // prevent ward filter when OPD
  useEffect(() => {
    if (filter === 1 && wardID !== 0) setWardID(0);
  }, [filter, wardID]);

  // fetch patients whenever filters change (base list)
  useEffect(() => {
    if (!user) return;
    setPatients([]);
    setPage(1);
    fetchPatients();
  }, [user?.token, user?.hospitalID, filter, wardID, year, month]);

  // reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  /* -------------------------- Derived Data ------------------------------- */

  // If there is a search string, use searchResults (from API),
  // otherwise use the normal patients list.
  const filteredPatients = useMemo(() => {
    const mobile = search.trim();
    if (mobile) {
      return searchResults ?? [];
    }
    return patients;
  }, [patients, searchResults, search]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredPatients.length / PAGE_SIZE)
  );

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  const pagePatients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [filteredPatients, page]);

  /* ----------------------------- Handlers ---------------------------------- */

  const handlePrev = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNext = () => {
    if (page < pageCount) setPage((p) => p + 1);
  };

  const handleCardPress = (p: Patient) => {
    if (!p?.id) return;
    navigation.navigate("PatientProfile", {
      id: p.id,
      filterType: filter,
      zone: p.zone,
      dischargeType: p.dischargeType,
      patientStartStatus: p.patientStartStatus,
      wardName: p.wardName,
    });
  };

  const handleViewPress = (p: Patient) => {
    if (!p?.id) return;
    navigation.navigate("PatientProfile", { id: p.id, reception: true, wardName: p.wardName,  });
  };

  /* ------------------------------ UI Blocks -------------------------------- */

  const bottomPad = FOOTER_H + insets.bottom + 24;

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search */}
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: filterBoxBg,
            borderColor: COLORS.border,
          },
        ]}
      >
        <SearchIcon size={18} color={COLORS.sub} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          keyboardType="number-pad"
          maxLength={10}
          textContentType="telephoneNumber"
          placeholder="Search by mobile number"
          placeholderTextColor={COLORS.placeholder}
          style={[
            styles.searchInput,
            {
              color: COLORS.text,
            }
          ]}
        />
      </View>

      {/* Filters Row */}
      <View style={styles.actionRow}>
        {/* Type Picker */}
        <View
          style={[
            styles.filterBox,
            {
              backgroundColor: filterBoxBg,
              borderColor: filter !== 2 ? COLORS.brand : COLORS.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterLabel,
              {
                color: COLORS.text,
              },
            ]}
          >
            Type
          </Text>
          <View style={styles.pickerOuter}>
            <Picker
              mode="dialog"
              selectedValue={filter}
              onValueChange={(val) => setFilter(Number(val))}
              style={[
                styles.picker,
                {
                  color: pickerTextColor,
                },
              ]}
              dropdownIconColor={pickerTextColor}
            >
              <Picker.Item label="IPD" value={2} />
              <Picker.Item label="OPD" value={1} />
              <Picker.Item label="Emergency" value={3} />
              <Picker.Item label="Discharge" value={4} />
            </Picker>
          </View>
        </View>

        {/* Ward Picker (disabled for OPD) */}
        <View
          style={[
            styles.filterBox,
            {
              backgroundColor: filterBoxBg,
              borderColor:
                filter === 1 || wardID === 0 ? COLORS.border : COLORS.brand,
              opacity: filter === 1 ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.filterLabel,
              {
                color: COLORS.text,
              },
            ]}
          >
            Ward
          </Text>
          <View style={styles.pickerOuter}>
            <Picker
              enabled={filter !== 1}
              mode="dialog"
              selectedValue={wardID}
              onValueChange={(val) => setWardID(Number(val))}
              style={[
                styles.picker,
                { color: pickerTextColor },
              ]}
              dropdownIconColor={filter === 1 ? COLORS.sub : pickerTextColor}
            >
              <Picker.Item label="All Wards" value={0} />
              {wards.map((w) => (
                <Picker.Item key={w.id} label={w.name} value={w.id} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Year / Month Row */}
      <View style={styles.actionRow}>
        <View
          style={[
            styles.filterBox,
            {
              backgroundColor: filterBoxBg,
              borderColor: COLORS.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterLabel,
              {
                color: COLORS.text,
              },
            ]}
          >
            Year
          </Text>
          <View style={styles.pickerOuter}>
            <Picker
              mode="dialog"
              selectedValue={year}
              onValueChange={(val) => setYear(String(val))}
              style={[
                styles.picker,
                { color: pickerTextColor },
              ]}
              dropdownIconColor={pickerTextColor}
            >
              {Array.from(
                { length: currentYear - 1950 + 1 },
                (_, i) => currentYear - i
              ).map((y) => (
                <Picker.Item
                  key={y}
                  label={String(y)}
                  value={String(y)}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View
          style={[
            styles.filterBox,
            {
              backgroundColor: filterBoxBg,
              borderColor: COLORS.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterLabel,
              {
                color: COLORS.text,
              },
            ]}
          >
            Month
          </Text>
          <View style={styles.pickerOuter}>
            <Picker
              mode="dialog"
              selectedValue={month}
              onValueChange={(val) => setMonth(String(val))}
              style={[
                styles.picker,
                { color: pickerTextColor },
              ]}
              dropdownIconColor={pickerTextColor}
            >
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((m, idx) => (
                <Picker.Item
                  key={m}
                  label={m}
                  value={String(idx + 1)}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Count pill */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: COLORS.sub }]}>
          {filteredPatients.length} {typeLabel} result
          {filteredPatients.length === 1 ? "" : "s"}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text
        style={[
          styles.emptyTitle,
          { color: COLORS.text },
        ]}
      >
        No patients to show
      </Text>
      <Text
        style={[
          styles.emptySub,
          { color: COLORS.sub },
        ]}
      >
        Try changing filters or search criteria.
      </Text>
    </View>
  );

  const renderPagination = () => {
    if (filteredPatients.length <= PAGE_SIZE) return null;

    return (
      <View
        style={[
          styles.pagination,
          { borderTopColor: COLORS.border },
        ]}
      >
        <Text
          style={[
            styles.resultsText,
            { color: COLORS.text },
          ]}
        >
          Results: {filteredPatients.length}
        </Text>

        <View style={styles.pageControls}>
          <Text
            style={[
              styles.pageInfo,
              { color: COLORS.text },
            ]}
          >
            Page {page} of {pageCount}
          </Text>

          <View style={styles.pageButtons}>
            <TouchableOpacity
              onPress={handlePrev}
              disabled={page === 1}
              style={[
                styles.pageBtn,
                { backgroundColor: COLORS.card },
                page === 1 && styles.pageBtnDisabled,
              ]}
            >
              <Text
                style={{
                  color:
                    page === 1 ? COLORS.sub : COLORS.text,
                }}
              >
                {"<"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              disabled={page === pageCount}
              style={[
                styles.pageBtn,
                { backgroundColor: COLORS.card },
                page === pageCount && styles.pageBtnDisabled,
              ]}
            >
              <Text
                style={{
                  color:
                    page === pageCount
                      ? COLORS.sub
                      : COLORS.text,
                }}
              >
                {">"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderCard = (p: Patient) => {
    const age = getAgeLabel(p);
    const phone = p.phoneNumber || "—";
    const ward = p.wardName || "—";
    const doctor = p.doctorName || "—";
    const dept = p.department || "—";
    const zoneLabel = filter === 3 ? getZoneLabel(p.zone) : undefined;
    const zoneColor = filter === 3 ? getZoneBadgeColor(p.zone) : undefined;

    let dischargeLabel: string | undefined;
    if (filter === 4) {
      if (p.dischargeType === 1) dischargeLabel = "Planned";
      else if (p.dischargeType === 2) dischargeLabel = "Against Medical Advice";
      else if (p.dischargeType === 3) dischargeLabel = "LAMA";
      else dischargeLabel = "—";
    }

    return (
      <TouchableOpacity
        key={p.id}
        activeOpacity={0.9}
        style={[
          styles.card,
          {
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
          },
        ]}
        onPress={() => handleCardPress(p)}
      >
        <View style={styles.cardRow}>
          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              {
                borderColor: COLORS.border,
                backgroundColor: COLORS.bg,
              },
            ]}
          >
            {p.photo ? (
              <Image
                source={{ uri: p.photo }}
                style={styles.avatarImg}
              />
            ) : (
              <UserRound size={24} color={COLORS.sub} />
            )}
          </View>

          {/* Meta (middle) */}
          <View style={styles.meta}>
            {/* Name */}
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  { color: COLORS.text },
                ]}
              >
                {p.pName || "—"}
              </Text>
            </View>

            {/* ID + Age + Zone/Discharge badges */}
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.subText,
                  { color: COLORS.sub },
                ]}
              >
                ID: {p.id}
              </Text>
              <Text
                style={[
                  styles.dot,
                  { color: COLORS.sub },
                ]}
              >
                •
              </Text>
              <Text
                style={[
                  styles.badge,
                  { color: COLORS.brand },
                ]}
              >
                Age: {age}
              </Text>

              {filter === 3 && zoneLabel && (
                <>
                  <Text
                    style={[
                      styles.dot,
                      { color: COLORS.sub },
                    ]}
                  >
                    •
                  </Text>
                  <View
                    style={[
                      styles.zoneBadge,
                      { backgroundColor: zoneColor },
                    ]}
                  >
                    <Text style={styles.zoneBadgeText}>
                      {zoneLabel}
                    </Text>
                  </View>
                </>
              )}

             
            </View>

            {/* Doctor */}
            {filter !== 4 && (
              <Text
                style={[
                  styles.subText,
                  { color: COLORS.sub },
                ]}
              >
                Dr: {doctor}
              </Text>
            )}

            {/* Phone */}
            <View style={styles.infoRow}>
              
              <Text
                style={[
                  styles.subText,
                  { color: COLORS.sub },
                ]}
              >
                Phone: {phone}
              </Text>
            </View>

            {/* Dept + Ward */}
            <View style={styles.infoRow}>
              {filter !== 4 && (
                <>
                  <Text
                    style={[
                      styles.subText,
                      { color: COLORS.sub },
                    ]}
                  >
                    Dept: {dept}
                  </Text>
                  <Text
                    style={[
                      styles.dot,
                      { color: COLORS.sub },
                    ]}
                  >
                    •
                  </Text>
                </>
              )}
              <Text
                style={[
                  styles.subText,
                  { color: COLORS.sub },
                ]}
              >
                Ward: {ward}
              </Text>
            </View>
          </View>

          {/* Right column: Type tag on top, View button below */}
          <View style={styles.rightColumn}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: COLORS.brandSoft },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: COLORS.brandDark },
                ]}
              >
                {typeLabel}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.viewBtn,
                { borderColor: COLORS.border },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleViewPress(p);
              }}
            >
              <Eye size={16} color={COLORS.text} />
              <Text
                style={[
                  styles.viewBtnText,
                  { color: COLORS.text },
                ]}
              >
                View
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* -------------------------------------------------------------------------- */

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: COLORS.bg,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator
                size="small"
                color={COLORS.brand}
              />
              <Text
                style={[
                  styles.loadingText,
                  { color: COLORS.sub },
                ]}
              >
                Loading patients…
              </Text>
            </View>
          ) : error ? (
            <View style={styles.loadingWrap}>
              <Text
                style={[
                  styles.loadingText,
                  { color: COLORS.error },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : filteredPatients.length === 0 ? (
            renderEmpty()
          ) : (
            <>
              <View style={styles.cardsList}>
                {pagePatients.map(renderCard)}
              </View>
              {renderPagination()}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer fixed */}
      <View
        style={[
          styles.footerWrap,
          { bottom: insets.bottom },
        ]}
      >
        <Footer active={"patients"} brandColor={COLORS.brand} />
      </View>
    </SafeAreaView>
  );
};

export default HospitalReceptionPatientListMobile;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },

  /* Header + filters */
  header: {
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  searchWrap: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    includeFontPadding: false,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterBox: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  pickerOuter: {
    height: 40,
    justifyContent: "center",
  },
  picker: {
    width: "100%",
    height: 60,
  },
  countRow: {
    marginTop: 2,
    marginBottom: 2,
  },
  countText: {
    fontSize: 12,
  },

  /* Empty */
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  emptyImage: {
    width: responsiveWidth(40),
    height: responsiveHeight(20),
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  /* Loading */
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },

  /* Cards */
  cardsList: {
    marginTop: SPACING.sm,
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
    alignItems: "flex-start",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 4,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  meta: {
    flex: 1,
    minHeight: 60,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: "700",
  },

  rightColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 8,
  },

  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.5,
    borderRadius: SPACING.lg,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
    flexWrap: "wrap",
  },
  subText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    lineHeight: 16,
  },
  dot: {
    fontSize: 12,
  },
  badge: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "700",
  },
  zoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  zoneBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },

  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: "flex-end",
  },
  viewBtnText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "700",
  },

  /* Pagination */
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    marginTop: 4,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pageControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: "600",
  },
  pageButtons: {
    flexDirection: "row",
    gap: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },

  /* Footer */
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
});
