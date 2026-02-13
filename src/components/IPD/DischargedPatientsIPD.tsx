// components/IPD/DischargedPatientsIPD.tsx
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
  Dimensions,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { patientStatus } from "../../utils/role";
import { PatientType, wardType } from "../../utils/types"; 
import { formatDate } from "../../utils/dateTime";
import { formatageFromDOB } from "../../utils/age";
import { 
  UserIcon, 
  SearchIcon, 
  EyeIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  BellIcon,
  FilterIcon,
} from "../../utils/SvgIcons";
import Footer from "../dashboard/footer";
import { COLORS } from "../../utils/colour";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor: number = 0.5) => size + (scale(size) - size) * factor;

const PAGE_SIZE = 10;
const FOOTER_H = 70;
// Compare dates for sorting (newest discharge first)
function compareDates(a: PatientType, b: PatientType) {
  return new Date(b?.endTime ?? 0).valueOf() - new Date(a?.endTime ?? 0).valueOf();
}

const DischargedPatientsIPD: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const user = useSelector((s: RootState) => s.currentUser);

  const [allPatients, setAllPatients] = useState<PatientType[]>([]);
  const [wardList, setWardList] = useState<wardType[]>([]);
  const [wardFilter, setWardFilter] = useState<number>(0);
  const [deviceFilter, setDeviceFilter] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const flatRef = useRef<FlatList<PatientType>>(null);

  // Fetch discharged patients data
const fetchDischargedPatients = useCallback(async () => {
  const token = user?.token ?? (await AsyncStorage.getItem("token"));
  if (!user?.hospitalID || !token) return;

  try {
    setLoading(true);
    const url = `patient/${user?.hospitalID}/patients/${patientStatus.discharged}?userID=${user?.id}&role=${user?.role}`;

    // Type the response as 'any' to avoid TypeScript errors
    const response = await AuthFetch(url, token) as any;

    // Check success in multiple ways
    if (
      response?.data?.message === "success" ||
      response?.status === "success" ||
      response?.message === "success"
    ) {
      // Extract patients from multiple possible locations
      const patients: PatientType[] = 
        Array.isArray(response?.data?.patients)
          ? response?.data?.patients
          : Array.isArray(response?.patients)
          ? response?.patients
          : Array.isArray(response?.data)
          ? response?.data
          : [];
      
      // Normalize doctor name and ensure data consistency
      const normalizedPatients = patients.map((pat: any) => ({
        ...pat,
        doctorName: pat?.doctor?.name || pat?.doctorName || "Not Assigned",
        ptype: patientStatus.discharged,
      })) ?? [];
      
      const filteredPatients = normalizedPatients.filter((p: any) => p?.category !== 2) ?? [];

      const seen = new Set<string | number>();
      const uniq = filteredPatients.filter((p: any) => {
        const key = p?.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }) ?? [];
      
      setAllPatients(uniq.sort(compareDates) ?? []);
    } else {
      setAllPatients([]);
    }
  } catch (e) {
    setAllPatients([]);
  } finally {
    setLoading(false);
  }
}, [user?.hospitalID, user?.token, user?.id, user?.role]);

  // Fetch ward data
const fetchWards = useCallback(async () => {
  const token = user?.token ?? (await AsyncStorage.getItem("token"));
  if (!user?.hospitalID || !token) return;

  try {
    const response = await AuthFetch(`ward/${user?.hospitalID}`, token) as any; // Add 'as any'
    
    if (response?.status === "success") {
      setWardList(response?.data?.wards ?? []);
    }
  } catch (e) {
    setWardList([]);
  }
}, [user?.hospitalID, user?.token]);

  useEffect(() => {
    fetchDischargedPatients();
    fetchWards();
  }, [fetchDischargedPatients, fetchWards]);

  // Filter and search logic for discharged patients
  const filteredAndSearched = useMemo(() => {
    let base: PatientType[] = allPatients ?? [];

    // Ward filter
    if (wardFilter > 0) {
      base = base?.filter((p) => p?.wardID === wardFilter) ?? [];
    }

    // Device filter
    if (deviceFilter === 1) {
      base = base?.filter((p) => p?.deviceID != null) ?? [];
    } else if (deviceFilter === 2) {
      base = base?.filter((p) => p?.deviceID == null) ?? [];
    }

    // Search filter
    if (search?.trim()) {
      const term = search?.toLowerCase()?.trim();
      base = base?.filter((p) => {
        const name = (p?.pName ?? "")?.toLowerCase();
        const mobile = (p?.phoneNumber ?? p?.mobile ?? p?.contact ?? "")?.toString();
        const id = (p?.patientid ?? p?.id ?? "")?.toString()?.toLowerCase();
        const doctor = (p?.doctorName ?? "")?.toLowerCase();
        return name?.includes(term) || mobile?.includes(term) || id?.includes(term) || doctor?.includes(term);
      }) ?? [];
    }

    return base;
  }, [allPatients, wardFilter, deviceFilter, search]);

  // Pagination
  const totalPages = Math.ceil((filteredAndSearched?.length ?? 0) / PAGE_SIZE);
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSearched?.slice(start, start + PAGE_SIZE) ?? [];
  }, [filteredAndSearched, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [wardFilter, deviceFilter, search]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  // Handle notification bell click
  const handleNotificationClick = (patient: PatientType) => {
    navigation.navigate("NotificationScreen", {
      timelineID: patient?.patientTimeLineID,
      patientName: patient?.pName || "Unknown Patient",
      patientId: patient?.id
    });
  };

  // Handle admit patient
  const handleAdmitPatient = () => {
    navigation.navigate("AddPatientIPD");
  };

  // Capitalize first letter utility
  const capitalizeFirstLetter = (str: string) => {
    return str?.charAt(0)?.toUpperCase() + str?.slice(1)?.toLowerCase();
  };

  // Header component
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: COLORS.bg }]}>


      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
        <SearchIcon size={moderateScale(18)} color={COLORS.sub} />
        <TextInput
          placeholder="Search by name , mobile or ID"
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: COLORS.text }]}
        />
      </View>

      {/* Ward Filter */}
      {/* <View style={styles.actionButtons}>
        <View style={[styles.wardFilterContainer, { 
          backgroundColor: COLORS.card, 
          borderColor: wardFilter !== 0 ? COLORS.brand : COLORS.border 
        }]}>
          <View style={styles.wardFilterIcon}>
            <FilterIcon size={14} color={wardFilter !== 0 ? COLORS.brand : COLORS.sub} />
          </View>
          <View style={styles.wardPickerWrapper}>
            <Picker
              selectedValue={wardFilter}
              onValueChange={(v) => setWardFilter(Number(v))}
              style={[styles.wardPicker, { color: COLORS.text }]}
              dropdownIconColor={COLORS.brand}
            >
              <Picker.Item label="All Wards" value={0} />
              {wardList?.map((ward) => (
                <Picker.Item
                  key={ward?.id}
                  label={capitalizeFirstLetter(ward?.name ?? "")}
                  value={ward?.id}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View> */}
    </View>
  );

  const renderFilters = () => (
    <View style={[styles.filtersContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
        {/* Device Filter */}
        <View style={[styles.filterWrap, { borderColor: COLORS.border }]}>
          <Text style={[styles.filterLabel, { color: COLORS.text }]}>Device</Text>
          <View style={[styles.pickerWrap, { backgroundColor: COLORS.bg, borderColor: COLORS.border }]}>
            <Picker
              selectedValue={deviceFilter}
              onValueChange={(v) => setDeviceFilter(Number(v))}
              style={[styles.picker, { color: COLORS.text }]}
              dropdownIconColor={COLORS.sub}
            >
              <Picker.Item label="All Patients" value={0} />
              <Picker.Item label="With Device" value={1} />
              <Picker.Item label="Without Device" value={2} />
            </Picker>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyImageContainer}>
        <Text style={[styles.emptyTitle, { color: COLORS.text }]}>
          No Discharged Patients Found
        </Text>
        <Text style={[styles.emptySub, { color: COLORS.sub }]}>
          {search || wardFilter !== 0 || deviceFilter !== 0 
            ? "Try adjusting filters or search terms." 
            : "No discharged patients found in the system."}
        </Text>
      </View>
    </View>
  );
  const calculateAgeFromDOB = (dob?: string, age?: string | number): string => {
  if (dob) {
    const birthDate = new Date(dob);
    const today = new Date();

    if (!isNaN(birthDate.getTime())) {
      const diffTime = today.getTime() - birthDate.getTime();
      const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // 🔹 Less than 1 month → show days
      if (totalDays < 30) {
        return `${totalDays} day${totalDays !== 1 ? "s" : ""}`;
      }

      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();

      if (today.getDate() < birthDate.getDate()) {
        months--;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      // 🔹 If years exist → show only years
      if (years > 0) {
        return `${years} year${years !== 1 ? "s" : ""}`;
      }

      // 🔹 Only months
      if (months > 0) {
        return `${months} month${months !== 1 ? "s" : ""}`;
      }
    }
  }

  // 🔹 DOB missing → fallback to age (years only)
  if (age) {
    const ageNum = parseInt(String(age), 10);
    if (!isNaN(ageNum)) {
      return `${ageNum} year${ageNum !== 1 ? "s" : ""}`;
    }
  }

  return "—";
};

  const renderItem = ({ item }: { item: PatientType }) => {
    const paddedId = String(item?.id ?? "")?.padStart(4, "0");
    const name = item?.pName || "—";
    const doctor = item?.doctorName || "—";
    const phone = (item?.phoneNumber ?? item?.mobile ?? item?.contact ?? "—")?.toString();
    const age = calculateAgeFromDOB(item?.dob, item?.age);
    const hasNotification = item?.notificationCount && item?.notificationCount > 0;
    const wardName = wardList?.find(w => w?.id === item?.wardID)?.name || "—";
    const dischargeDate = item?.endTime ? formatDate(item?.endTime) : "—";
    const imageUrl = item?.imageURL || (item as any)?.photo || null;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
        onPress={() => navigation.navigate("PatientProfile", { 
          patientId: item?.id,
          fromDischargeList: true
        })}
      >
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { borderColor: COLORS.border, backgroundColor: COLORS.bg }]}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 40,
                }}
              />
            ) : (
            <UserIcon size={moderateScale(24)} color={COLORS.sub} />
            )}
          </View>

          <View style={styles.meta}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: COLORS.text }]} numberOfLines={1}>
                {name}
              </Text>
              {hasNotification && (
                <TouchableOpacity
                  style={styles.bellButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleNotificationClick(item);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.bellContainer}>
                    <BellIcon size={moderateScale(20)} color="#ef4444" />
                    {item?.notificationCount && item?.notificationCount > 1 && (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationCount}>
                          {item?.notificationCount > 9 ? '9+' : item?.notificationCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              ID: {paddedId}
            </Text>

            <View style={styles.infoRow}>
              <Text style={[styles.badge, { color: COLORS.brand }]}>Age: {age}</Text>
              {item?.deviceID && (
                <>
                  <Text style={[styles.dot, { color: COLORS.sub }]}>•</Text>
                  <Text style={[styles.deviceBadge, { color: COLORS.brand }]}>Device</Text>
                </>
              )}
            </View>

            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              Phone: {phone}
            </Text>

            {/* Discharge Date */}
            <View style={styles.dischargeRow}>
              <Text style={[styles.dischargeLabel, { color: COLORS.sub }]}>
                Discharged: 
              </Text>
              <Text style={[styles.dischargeDate, { color: COLORS.danger }]}>
                {dischargeDate}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.viewBtn, { borderColor: COLORS.border }]}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("PatientProfile", { 
                id: item?.id,
                fromDischargeList: true
              });
            }}
          >
            <EyeIcon size={moderateScale(18)} color={COLORS.text} />
            <Text style={[styles.viewBtnText, { color: COLORS.text }]}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <View style={[styles.pagination, { borderTopColor: COLORS.border }]}>
        <Text style={[styles.resultsText, { color: COLORS.text }]}>
          Results: {filteredAndSearched?.length} patients
        </Text>

        <View style={styles.pageControls}>
          <Text style={[styles.pageInfo, { color: COLORS.text }]}>
            Page {currentPage} of {totalPages}
          </Text>

          <View style={styles.pageButtons}>
            <TouchableOpacity
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={[styles.pageBtn, { backgroundColor: COLORS.card }, currentPage === 1 && styles.pageBtnDisabled]}
            >
              <ChevronLeftIcon size={moderateScale(18)} color={currentPage === 1 ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={[styles.pageBtn, { backgroundColor: COLORS.card }, currentPage === totalPages && styles.pageBtnDisabled]}
            >
              <ChevronRightIcon size={moderateScale(18)} color={currentPage === totalPages ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg, paddingBottom: Math.max(insets.bottom, verticalScale(12)) }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        {renderHeader()}

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Content */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.brand} />
            <Text style={[styles.loadingText, { color: COLORS.sub }]}>Loading discharged patients…</Text>
          </View>
        ) : (
          <>
           <FlatList
              ref={flatRef}
              data={pagedData}
              keyExtractor={(it) => String(it?.id)}
              renderItem={renderItem}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: FOOTER_H + insets.bottom + 24 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListFooterComponent={renderPagination} // Add pagination as footer
              scrollIndicatorInsets={{ bottom: FOOTER_H + insets.bottom + 24 }}
            />
            {renderPagination()}
          </>
        )}
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"discharge"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { 
    flex: 1 
  },
  header: { 
    paddingHorizontal: moderateScale(16), 
    paddingTop: verticalScale(8), 
    paddingBottom: verticalScale(12),
    gap: verticalScale(12),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
  },
  backButton: {
    padding: moderateScale(4),
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    flex: 1,
  },
  searchWrap: {
    height: verticalScale(48),
    borderWidth: 1.5,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { 
    flex: 1, 
    marginLeft: moderateScale(10), 
    fontSize: moderateScale(15),
    includeFontPadding: false,
  },
  actionButtons: {
    flexDirection: "row",
    gap: moderateScale(12),
    alignItems: "center",
  },
  wardFilterContainer: {
    height: verticalScale(64),
    borderWidth: 1.5,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(2),
    paddingVertical: 0,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    justifyContent: "flex-start",
    flex: 1,
    minWidth: moderateScale(40),
  },
  wardFilterIcon: {
    marginRight: moderateScale(1),
  },
  wardPickerWrapper: {
    flex: 1,
  },
  wardPicker: {
    flex: 1,
    height: verticalScale(52),
    marginLeft: moderateScale(2),
    marginRight: moderateScale(-16),
    marginTop: Platform.OS === "android" ? moderateScale(-4) : 0,
  },
  filtersContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: verticalScale(12),
  },
  filtersContent: {
    paddingHorizontal: moderateScale(16),
    gap: moderateScale(12),
  },
  filterWrap: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(8),
    borderWidth: 1,
    borderRadius: moderateScale(8),
    minWidth: moderateScale(150),
  },
  filterLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    marginBottom: verticalScale(6),
  },
  pickerWrap: {
    height: verticalScale(52),
    borderWidth: 1.5,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(8),
    paddingVertical: 0,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  picker: {
    flex: 1,
    height: verticalScale(52),
    marginLeft: moderateScale(2),
    marginRight: moderateScale(-16),
    marginTop: Platform.OS === "android" ? moderateScale(-4) : 0,
  },
  listContent: { 
    paddingHorizontal: moderateScale(16), 
    paddingBottom: verticalScale(20),
    paddingTop: verticalScale(8),
  },
  card: {
    borderRadius: moderateScale(14),
    padding: moderateScale(14),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(6),
    elevation: 2,
  },
  cardRow: { 
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: moderateScale(12),
    overflow: 'hidden',
  },
  meta: { 
    flex: 1,
    minHeight: verticalScale(80),
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(4),
  },
  name: { 
    fontSize: moderateScale(16), 
    fontWeight: "700",
    flex: 1,
    marginRight: moderateScale(8),
  },
  bellButton: {
    padding: moderateScale(4),
  },
  bellContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: "absolute",
    top: verticalScale(-6),
    right: verticalScale(-6),
    backgroundColor: "#ef4444",
    borderRadius: moderateScale(10),
    minWidth: moderateScale(20),
    height: moderateScale(20),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationCount: {
    color: "#fff",
    fontSize: moderateScale(10),
    fontWeight: "700",
  },
  sub: { 
    fontSize: moderateScale(13), 
    marginTop: verticalScale(2),
    lineHeight: moderateScale(16),
  },
  infoRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: verticalScale(6), 
    gap: moderateScale(6),
    flexWrap: 'wrap',
  },
  dot: { 
    fontSize: moderateScale(12) 
  },
  badge: { 
    fontSize: moderateScale(13), 
    fontWeight: "700" 
  },
  deviceBadge: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    paddingHorizontal: moderateScale(6),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(4),
  },
  dischargeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(6),
    gap: moderateScale(6),
  },
  dischargeLabel: {
    fontSize: moderateScale(12),
  },
  dischargeDate: {
    fontSize: moderateScale(12),
    fontWeight: "700",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    marginLeft: moderateScale(8),
  },
  viewBtnText: { 
    fontSize: moderateScale(13), 
    fontWeight: "700" 
  },
  emptyWrap: { 
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(60),
  },
  emptyImageContainer: {
    alignItems: "center",
    paddingHorizontal: moderateScale(20),
  },
  emptyImage: {
    width: moderateScale(150),
    height: moderateScale(150),
    borderRadius: moderateScale(75),
    marginBottom: verticalScale(16),
  },
  emptyTitle: { 
    fontSize: moderateScale(17), 
    fontWeight: "700",
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  emptySub: { 
    fontSize: moderateScale(14), 
    textAlign: "center",
    lineHeight: moderateScale(20),
  },
  loadingWrap: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  loadingText: { 
    marginTop: verticalScale(12), 
    fontSize: moderateScale(15) 
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: verticalScale(16),
    paddingHorizontal: moderateScale(16),
    borderTopWidth: 1,
  },
  resultsText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  pageControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
  },
  pageInfo: { 
    fontSize: moderateScale(14), 
    fontWeight: "600" 
  },
  pageButtons: {
    flexDirection: "row",
    gap: moderateScale(8),
  },
  pageBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageBtnDisabled: { 
    opacity: 0.4 
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: verticalScale(70),
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

export default DischargedPatientsIPD;