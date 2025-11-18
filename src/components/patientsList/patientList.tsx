// src/screens/opd/OpdPreviousPatients.tsx

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
  Image,
  Dimensions,
  ScrollView,
  Modal,
  useColorScheme,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { debounce, DEBOUNCE_DELAY } from "../../utils/debounce";
import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { patientStatus, zoneType } from "../../utils/role";

// Icons
import {
  User as UserIcon,
  Search as SearchIcon,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  UserPlus,
  Filter,
  X,
} from "lucide-react-native";
import { PatientType, wardType } from "../../utils/types";
import Footer from "../dashboard/footer";
import useOTConfig, { OTPatientStages } from "../../utils/otConfig";
import { showError } from "../../store/toast.slice";
import { formatageFromDOB } from "../../utils/age";
import { formatDate } from "../../utils/dateTime";
import { COLORS } from "../../utils/colour";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_SIZE = 10;

interface FullSurgeryData {
  id: number;
  patientTimeLineID: number;
  hospitalID: number;
  status: string;
  approvedTime: string;
  patientType: string;
  surgeryType: string;
  rejectReason: string;
  physicalExamination?: any;
  preopRecord?: any;
  consentForm?: any;
  anesthesiaRecord?: any;
  postopRecord?: any;
  scheduleTime: string | null;
  completedTime: string | null;
}

interface SurgeryData {
  status: string;
  approvedTime: string;
  hospitalID: number;
  patientType: string;
  surgeryType: string;
  rejectReason: string;
}
const FOOTER_H = 70;

// --- Colors (static, used everywhere) ---


// --- Small helper ---
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
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const user = useSelector((s: RootState) => s.currentUser);
const { screenType, userType, setPatientStage } = useOTConfig();
  const zone = (route.params as any)?.zone;
  const [allPatients, setAllPatients] = useState<PatientType[]>([]);
  const [wardList, setWardList] = useState<wardType[]>([]);
  const [filterValue, setFilterValue] = useState<number>(0);
  const [wardFilter, setWardFilter] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const flatRef = useRef<FlatList<PatientType>>(null);
  const [surgeryData, setSurgeryData] = useState<{ [key: number]: SurgeryData[] }>({});
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [selectedSurgeryData, setSelectedSurgeryData] = useState<SurgeryData[]>([]);
  const [selectedPatientName, setSelectedPatientName] = useState("");

  const bottomPad = FOOTER_H + insets.bottom + 24;
const isOt = user?.roleName === "surgeon" || user?.roleName === "anesthesist"
  const fetchPatients = useCallback(async () => {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    if (!user?.hospitalID || !token) return;

    try {
      setLoading(true);
      let url = "";
if (user?.roleName !== "surgeon" && user?.roleName !== "anesthesia"){
if (user?.patientStatus === 1) {
        if (user?.role === 2003) {
          url = `patient/${user.hospitalID}/patients/nurseopdprevious/${patientStatus.outpatient}?role=${user?.role}&userID=${user?.id}`;
        } else {
          url = `patient/${user.hospitalID}/patients/opdprevious/${patientStatus.outpatient}?role=${user?.role}&userID=${user?.id}`;
        }
      } else if (user?.patientStatus === 2) {
        if (user?.role === 2003) {
          url = `patient/${user.hospitalID}/nurseIpdpatients/${patientStatus.inpatient}?role=${user?.role}&userID=${user?.id}`;
        } else {
          url = `patient/${user.hospitalID}/patients/2?role=${user?.role}&userID=${user?.id}`;
        }
      } else if (user?.patientStatus === 3) {
        if (user?.role === 2003) {
          url = `patient/${user.hospitalID}/patients/nurseActive/${patientStatus.emergency}?role=${user?.role}&userID=${user?.id}&zone=${zone}`;
        } else {
          url = `patient/${user.hospitalID}/patients/${patientStatus.emergency}?zone=${zone}&userID=${user?.id}`;
        }
      } else {
        if (user?.role === 2003) {
          url = `patient/${user.hospitalID}/patients/nurseopdprevious/${patientStatus.outpatient}?role=${user?.role}&userID=${user?.id}`;
        } else {
          url = `patient/${user.hospitalID}/patients/opdprevious/${patientStatus.outpatient}?role=${user?.role}&userID=${user?.id}`;
        }
      }
}else{
  url = `ot/${user?.hospitalID}/${user?.id}/getPatient/${user?.roleName.toLowerCase()}/${screenType.toLowerCase()}`
}
      
console.log(url, "oturl")
      const response = await AuthFetch(url, token);
console.log(response, "surgery response")
      if (response?.status === "success") {
        const patients: PatientType[] = Array.isArray(response?.data?.patients)
          ? response.data.patients
          : [];

        const normalizedPatients = patients.map((pat: any) => ({
          ...pat,
          doctorName: pat?.doctor?.name || pat?.doctorName || "Not Assigned",
        }));

        const seen = new Set<string | number>();
        const uniq = normalizedPatients.filter((p) => {
          const key = p.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setAllPatients(uniq);
      } else {
        setAllPatients([]);
      }
    } catch (e) {
      setAllPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.token, user?.id, user?.role, user?.patientStatus, zone]);

  const [fetchTrigger, setFetchTrigger] = useState(0);

  const debouncedFetchRef = useRef(
    debounce(() => {
      fetchPatients();
    }, DEBOUNCE_DELAY)
  );

  useEffect(() => {
    debouncedFetchRef.current();
  }, [fetchTrigger]);

  useEffect(() => {
    return () => {
      debouncedFetchRef.current.cancel();
    };
  }, []);

  const triggerFetch = () => {
    setFetchTrigger(prev => prev + 1);
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    triggerFetch();
  };

  const handleFilterChange = (value: number) => {
    setFilterValue(value);
    triggerFetch();
  };

  const handleWardFilterChange = (value: number) => {
    setWardFilter(value);
    triggerFetch();
  };

  const fetchWards = useCallback(async () => {
    if (user?.patientStatus !== 2 && user?.patientStatus !== 3) return;

    const token = await AsyncStorage.getItem("token");
    if (!user?.hospitalID || !token) return;

    try {
      const response = await AuthFetch(`ward/${user.hospitalID}`, token);
      if (response?.status === "success") {
        setWardList(response?.data?.wards || []);
      }
    } catch (e) {
      setWardList([]);
    }
  }, [user?.hospitalID, user?.token, user?.patientStatus]);

  const fetchSurgeryData = useCallback(async (patient: PatientType) => {
    if (!patient?.patientTimeLineID || !patient?.hospitalID) return;

    const token11 = await AsyncStorage.getItem("token");
    if (!token11) return;

    try {
      const response = await AuthFetch(
        `ot/${patient.hospitalID}/${patient.patientTimeLineID}/getOTData`,
        token11
      );

      if (response?.status === "success") {
        let surgeryArray: FullSurgeryData[] = [];

        if (Array.isArray(response.data?.data)) {
          surgeryArray = response.data.data;
        } else if (Array.isArray(response.data)) {
          surgeryArray = response.data;
        }

        const formattedData: SurgeryData[] = surgeryArray.map((item: FullSurgeryData) => ({
          status: item.status || "",
          approvedTime: item.approvedTime ? (item.approvedTime) : "N/A",
          hospitalID: item.hospitalID,
          patientType: item.patientType || "",
          surgeryType: item.surgeryType || "",
          rejectReason: item.rejectReason || "N/A",
        }));

        setSurgeryData(prev => ({
          ...prev,
          [patient?.id]: formattedData
        }));
      }
    } catch (error) {
      dispatch(showError(e?.response?.data?.message || 'Failed to load patients'));
    }
  }, []);

  const debouncedSurgeryFetchRef = useRef(
    debounce((patients: PatientType[]) => {
      patients.forEach(patient => {
        if (patient.patientTimeLineID && patient.hospitalID) {
          fetchSurgeryData(patient);
        }
      });
    }, 1000)
  );

  useEffect(() => {
    if (allPatients.length > 0) {
      debouncedSurgeryFetchRef.current(allPatients);
    }
  }, [allPatients]);

  useEffect(() => {
    return () => {
      debouncedSurgeryFetchRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    fetchPatients();
    if (user?.patientStatus === 2 || user?.patientStatus === 3) {
      fetchWards();
    }
  }, [fetchPatients, fetchWards, user?.patientStatus]);

  const filteredAndSearched = useMemo(() => {
    let base: PatientType[] = allPatients;

    if (user?.patientStatus === 1) {
      if (filterValue === 2) {
        base = base.filter((p) => p.ptype === 21);
      } else if (filterValue === 0) {
        base = base.filter((p) => p.ptype === 1);
      } else if (filterValue === 1) {
        base = base.filter((p) => p.ptype !== 1 && p.ptype !== 21);
      }
    } else if (user?.patientStatus === 2) {
      if (filterValue === 2) {
        base = base.filter((p) => p.ptype === 21);
      } else if (filterValue === 0) {
        base = base.filter((p) => p.ptype === 2);
      } else if (filterValue === 1) {
        base = base.filter((p) => p.ptype !== 2 && p.ptype !== 21);
      }
      if (wardFilter > 0) {
        base = base.filter((p) => p.wardID === wardFilter);
      }
    } else if (user?.patientStatus === 3) {
      if (filterValue === 2) {
        base = base.filter((p) => p.ptype === 21);
      } else if (filterValue === 0) {
        base = base.filter((p) => p.ptype === 3);
      } else if (filterValue === 1) {
        base = base.filter((p) => p.ptype !== 3 && p.ptype !== 21);
      }
      if (wardFilter > 0) {
        base = base.filter((p) => p.wardID === wardFilter);
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      base = base.filter((p) => {
        const name = (p?.pName ?? "").toLowerCase();
        const mobile = (p?.phoneNumber ?? p?.mobile ?? p?.contact ?? "").toString();
        const id = (p?.patientid ?? p?.id ?? "").toString().toLowerCase();
        const doctor = (p?.doctorName ?? "").toLowerCase();
        return name.includes(term) || mobile.includes(term) || id.includes(term) || doctor.includes(term);
      });
    }

    return base.sort((a, b) => new Date(b.startTime).valueOf() - new Date(a.startTime).valueOf());
  }, [allPatients, filterValue, wardFilter, search, user?.patientStatus, zone]);

  const totalPages = Math.ceil(filteredAndSearched.length / PAGE_SIZE);
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSearched.slice(start, start + PAGE_SIZE);
  }, [filteredAndSearched, currentPage]);
console.log(pagedData, "complete patients list")
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, wardFilter, search]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleNotificationClick = (patient: PatientType) => {
    navigation.navigate("NotificationScreen", {
      timelineID: patient.patientTimeLineID,
      patientName: patient.pName || "Unknown Patient",
      patientId: patient.id
    });
  };

  const handleAddPatient = () => {
    if (user?.patientStatus === 2) {
      navigation.navigate("AddPatient");
    }
  };

  const getAddButtonText = () => {
    if (user?.patientStatus === 2) return "Admit Patient";
    // For other statuses, return empty string so no button shows
    return "";
  };

  const clearAllFilters = () => {
    setFilterValue(0);
    setWardFilter(0);
    setSearch("");
  };

  const handleSurgeryWarningClick = (patient: PatientType) => {
    const patientSurgeries = surgeryData[patient.id] || [];
    const rejectedSurgeries = patientSurgeries.filter(item =>
      item.status?.toLowerCase() === "rejected"
    );

    if (rejectedSurgeries.length > 0) {
      setSelectedSurgeryData(rejectedSurgeries);
      setSelectedPatientName(patient.pName || "Unknown Patient");
      setRejectDialogVisible(true);
    }
  };

 

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const hasActiveFilters = filterValue !== 0 || wardFilter !== 0 || search !== "";

  const getFilterLabels = () => {
    if (user?.patientStatus === 1) {
      return [
        { label: "Active Patients", value: 0 },
        { label: "Follow Up Patients", value: 1 },
        { label: "Previous Patients", value: 2 }
      ];
    } else if (user?.patientStatus === 2) {
      return [
        { label: "Active Inpatients", value: 0 },
        { label: "Follow-up", value: 1 },
        { label: "Previous Inpatients", value: 2 }
      ];
    } else if (user?.patientStatus === 3) {
      return [
        { label: "Active Emergency", value: 0 },
        { label: "Follow-up", value: 1 },
        { label: "Previous Emergency", value: 2 }
      ];
    } else {
      return [
        { label: "Active Patients", value: 0 },
        { label: "Follow Up Patients", value: 1 },
        { label: "Previous Patients", value: 2 }
      ];
    }
  };

  const getZoneName = () => {
    if (zone === zoneType.red) return "Critical Care (Red Zone)";
    if (zone === zoneType.yellow) return "Urgent Care (Yellow Zone)";
    if (zone === zoneType.green) return "Stable Monitoring (Green Zone)";
    return "";
  };

  // ---- header with search + filter ----
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.searchWrap, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
        <SearchIcon size={18} color={COLORS.sub} />
        <TextInput
          placeholder="Search by name, mobile, ID, or doctor"
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={handleSearchChange}
          style={[styles.searchInput, { color: COLORS.text }]}
        />
        {search !== "" && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <X size={16} color={COLORS.sub} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionButtons}>
        {/* Ward Filter - ONLY for IPD (status 2) */}
        {user?.patientStatus === 2 && (
          <View style={[styles.wardFilterContainer, { backgroundColor: COLORS.card, borderColor: wardFilter !== 0 ? COLORS.brand : COLORS.border }]}>
            <View style={styles.wardFilterIcon}>
              <Filter size={14} color={wardFilter !== 0 ? COLORS.brand : COLORS.sub} />
            </View>
            <View style={styles.wardPickerWrapper}>
              <Picker
                selectedValue={wardFilter}
                onValueChange={handleWardFilterChange}
                style={[styles.wardPicker, { color: COLORS.text }]}
                dropdownIconColor={COLORS.brand}
              >
                <Picker.Item label="All Wards" value={0} />
                {wardList.map((ward) => (
                  <Picker.Item
                    key={ward.id}
                    label={capitalizeFirstLetter(ward.name)}
                    value={ward.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Patient Status Filter - DIRECTLY VISIBLE for OPD (status 1) */}
        {user?.patientStatus === 1 && (
          <View style={[styles.wardFilterContainer, { backgroundColor: COLORS.card, borderColor: filterValue !== 0 ? COLORS.brand : COLORS.border }]}>
            <View style={styles.wardFilterIcon}>
              <Filter size={14} color={filterValue !== 0 ? COLORS.brand : COLORS.sub} />
            </View>
            <View style={styles.wardPickerWrapper}>
              <Picker
                selectedValue={filterValue}
                onValueChange={handleFilterChange}
                style={[styles.wardPicker, { color: COLORS.text }]}
                dropdownIconColor={COLORS.brand}
              >
                {getFilterLabels().map((item) => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Only show Add button for IPD (status 2) */}
        {user?.patientStatus === 2 && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: COLORS.brand }]}
            onPress={handleAddPatient}
          >
            <UserPlus size={16} color="#fff" />
            <Text style={styles.addButtonText}>{getAddButtonText()}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={[styles.filtersContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
      <View style={styles.filtersHeader}>
        <Text style={[styles.filtersTitle, { color: COLORS.text }]}>Filters</Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearButton}>
            <Text style={[styles.clearButtonText, { color: COLORS.danger }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
        {(user?.patientStatus === 1 || user?.patientStatus === 2 || user?.patientStatus === 3) && (
          <View style={[styles.filterWrap, { borderColor: COLORS.border }]}>
            <Text style={[styles.filterLabel, { color: COLORS.text }]}>Patient Status</Text>
            <View style={[styles.pickerWrap, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>              <Picker
              selectedValue={filterValue}
              onValueChange={handleFilterChange}
              style={[styles.picker, { color: COLORS.text }]}
              dropdownIconColor={COLORS.sub}
            >
              {getFilterLabels().map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No Patients Found</Text>
      <Text style={[styles.emptySub, { color: COLORS.sub }]}>
        {search || filterValue !== 0 || wardFilter !== 0
          ? "Try adjusting filters or search terms."
          : user?.patientStatus === 1
            ? "No patients available in the outpatient department."
            : user?.patientStatus === 2
              ? "No patients available in the inpatient department."
              : user?.patientStatus === 3
                ? `No patients available in ${getZoneName().toLowerCase()}.`
                : "No patients available."}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity style={[styles.clearEmptyButton, { backgroundColor: COLORS.brand }]} onPress={clearAllFilters}>
          <Text style={styles.clearEmptyButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleView = (patient :any) => {
const patientStatusKey =
            patient.status.toUpperCase() as keyof typeof OTPatientStages;
          setPatientStage(OTPatientStages[patientStatusKey]);
        
 navigation.navigate("PatientProfile", { id: patient.id });
  }

  const renderItem = ({ item }: { item: PatientType }) => {
    console.log(item, "patient details ", item?.approvedTime)
    const paddedId = String(item?.id ?? "").padStart(4, "0");
    const name = item?.pName || "—";
    const doctor = item?.doctorName || "—";
    const phone = (item?.phoneNumber ?? item?.mobile ?? item?.contact ?? "—").toString();
    const age = getAgeLabel(item?.dob);
    const hasNotification = item.notificationCount && item.notificationCount > 0;
    const wardName = (user?.patientStatus === 2 || user?.patientStatus === 3) ? wardList.find(w => w.id === item.wardID)?.name || "—" : "—";
const approvedDate = formatDate(item?.approvedTime)
    const patientSurgeries = surgeryData[item.id] || [];
    const hasRejectedSurgery = patientSurgeries.some(surgery =>
      surgery.status?.toLowerCase() === "rejected"
    );

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.card,
          { backgroundColor: COLORS.card, borderColor: COLORS.border },
        ]}
        onPress={() => navigation.navigate("PatientDetails", { patientId: item.id })}
      >
        <View style={styles.cardRow}>
          <View
            style={[
              styles.avatar,
              { borderColor: COLORS.border, backgroundColor: COLORS.bg },
            ]}
          >
            {item?.imageURL ? (
              <Image
                source={{ uri: item.imageURL }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 40,
                }}
              />
            ) : (
              <UserIcon size={28} color={COLORS.sub} />
            )}
          </View>

          <View style={styles.meta}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: COLORS.text }]} numberOfLines={1}>
                {name}
              </Text>

              <View style={styles.rightIconsContainer}>

               
                {hasRejectedSurgery && (
                  <TouchableOpacity
                    style={styles.warningButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleSurgeryWarningClick(item);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.warningIcon}>⚠️</Text>
                  </TouchableOpacity>
                )}

                {hasNotification && (
                  <TouchableOpacity
                    style={styles.bellButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(item);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.bellWrapper}>
                      <Bell size={22} color={COLORS.danger} />
                      {item.notificationCount && item.notificationCount > 1 && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationCount}>
                            {item.notificationCount > 9 ? '9+' : item.notificationCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={[styles.sub, { color: COLORS.sub }]} numberOfLines={1}>
              {isOt && 
   `Approved Date: ${approvedDate}`
}
              {(user?.patientStatus === 2 || user?.patientStatus === 3) && `• Ward: ${capitalizeFirstLetter(wardName)}`}
              
            </Text>

            <View style={styles.infoRow}>
              <Text
                style={[styles.sub, { color: COLORS.sub }]}
                numberOfLines={1}
              >
                ID: {paddedId}
              </Text>
              <Text style={[styles.dot, { color: COLORS.sub }]}>•</Text>
              <Text style={[styles.badge, { color: COLORS.brand }]}>
                Age: {age}
              </Text>
              {item.deviceID && (user?.patientStatus === 2 || user?.patientStatus === 3) && (
                <>
                  <Text style={[styles.dot, { color: COLORS.sub }]}>•</Text>
                  <Text style={[styles.deviceBadge, { color: COLORS.brand }]}>Device</Text>
                </>
              )}
            </View>

            <Text
              style={[styles.sub, { color: COLORS.sub }]}
              numberOfLines={1}
            >
              Dr: {doctor}
            </Text>
            <Text
              style={[styles.sub, { color: COLORS.sub }]}
              numberOfLines={1}
            >
              Phone: {phone}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.viewBtn, { borderColor: COLORS.border }]}
             onPress={() =>  handleView(item)}
            // onPress={(e) => {
            //   e.stopPropagation();
            //   navigation.navigate("PatientProfile", { id: item.id });
            // }}
          >
            <Eye size={16} color={COLORS.text} />
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
          Results: {filteredAndSearched.length} patients
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
              <ChevronLeft size={18} color={currentPage === 1 ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={[styles.pageBtn, { backgroundColor: COLORS.card }, currentPage === totalPages && styles.pageBtnDisabled]}
            >
              <ChevronRight size={18} color={currentPage === totalPages ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderRejectDialog = () => (
    <Modal
      visible={rejectDialogVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setRejectDialogVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: COLORS.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>⚠️ Surgery Rejected</Text>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.patientNameText, { color: COLORS.text }]}>
              Patient: {selectedPatientName}
            </Text>

            {selectedSurgeryData.map((surgery, index) => (
              <View key={index} style={styles.surgeryDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: COLORS.text }]}>Hospital ID:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.text }]}>{surgery.hospitalID}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: COLORS.text }]}>Patient Type:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.text }]}>{surgery.patientType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: COLORS.text }]}>Surgery Type:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.text }]}>{surgery.surgeryType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: COLORS.text }]}>Reject Reason:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.text }]}>{surgery.rejectReason}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: COLORS.text }]}>Status:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.danger }]}>{surgery.status}</Text>
                </View>

                {index < selectedSurgeryData.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: COLORS.border }]} />
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: COLORS.brand }]}
              onPress={() => setRejectDialogVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
console.log(pagedData, "complet epatiens list")
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {renderHeader()}
        {showFilters && user?.patientStatus === 1 && renderFilters()}
        \

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.brand} />
            <Text
              style={[styles.loadingText, { color: COLORS.sub }]}
            >
              Loading patients…
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={pagedData}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: bottomPad },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderPagination}
            scrollIndicatorInsets={{ bottom: bottomPad }}
          />
        )}
      </KeyboardAvoidingView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}

      {renderRejectDialog()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  zoneIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  zoneIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchWrap: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    includeFontPadding: false,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  wardFilterContainer: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    justifyContent: "flex-start",
    flex: 1,
  },
  wardFilterIcon: {
    marginRight: 8,
  },
  wardPickerWrapper: {
    flex: 1,
  },
  wardPicker: {
    flex: 1,
    height: 52,
    marginLeft: 2,
    marginRight: -16,
    marginTop: Platform.OS === "android" ? -4 : 0,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 48,
    flex: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    height: 48,
    flex: 1,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  filtersContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 150,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  pickerWrap: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  picker: {
    flex: 1,
    height: 52,
    marginLeft: 2,
    marginRight: -16,
    marginTop: Platform.OS === "android" ? -4 : 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
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
  },
  meta: {
    flex: 1,
    minHeight: 60,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  rightIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: -80
  },
  warningButton: {
    padding: 4,
  },
  warningIcon: {
    fontSize: 18,
  },
  bellButton: {
    padding: 4,
  },
  bellWrapper: {
    position: 'relative',
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  sub: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    marginTop: 2,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  dot: { fontSize: 12 },
  badge: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "700"
  },
  deviceBadge: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    fontWeight: "700",
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    marginLeft: 8,
    marginTop: 50
  },
  viewBtnText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: "700"
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700"
  },
  emptySub: {
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  clearEmptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearEmptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
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
    fontWeight: "600"
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
    opacity: 0.4
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    maxHeight: 500,
    padding: 20,
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  surgeryDetails: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OpdPreviousPatients;
