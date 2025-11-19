import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MoreVertical,
  Edit3,
  User as UserIcon,
  Download,
  X,
  CalendarDays,
  UserPlus2,
  FlipHorizontal2,
} from "lucide-react-native";
import { AuthFetch } from "../../auth/auth";
import Footer from "../dashboard/footer";
import Tabs from "./tabs";
import { useDispatch } from "react-redux";
import { currentPatient as setCurrentPatientAction } from "../../store/store";
import TransferPatient from "./transferPatient";
import OtTabs from "../OT/otTabs";
import DischargeSummaryDownload from "./dischargeSummaryDownload";
import AddTriageIssue from "../Triage/addTriageIssue";
import { Edit2Icon } from "../../utils/SvgIcons";
import { COLORS } from "../../utils/colour";
// ---- types ----
type RootState = any;
type testType = {
  id?: number | string;
  name?: string;
  category?: "radiology" | "pathology" | "1" | "2" | string;
  fileURL?: string;
  fileName?: string;
  mimeType?: string;
};
type Reminder = { dosageTime: string };
type PatientType = {
  id: number;
  pUHID?: string;
  pName?: string;
  imageURL?: string;
  gender?: number;
  dob?: string;
  doctorName?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  followUpStatus?: number;
  followUpDate?: string;
  ptype?: number;
  patientStartStatus?: number;
  patientEndStatus?: number;
};
type TimelineType = { id: number; patientID: number; patientEndStatus?: number };
type RouteParams = { 
  id: string; 
  staffRole?: string; 
  reception?: boolean;
  fromDischargeList?: boolean;
};

const followUpStatus = { active: 1 };

// ---- zustand shims (replace with your real store if available) ----
function usePrintInPatientStore() {
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [reminder, setReminder] = useState<Reminder[]>([]);
  const [vitalAlert, setVitalAlert] = useState<any[]>([]);
  const [medicalHistory, setMedicineHistory] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [vitalFunction, setVitalFunction] = useState<any>({});
  return {
    symptoms,
    setSymptoms,
    reminder,
    setReminder,
    vitalAlert,
    setVitalAlert,
    medicalHistory,
    setMedicineHistory,
    reports,
    setReports,
    vitalFunction,
    setVitalFunction,
  };
}

// ---- helpers ----
function getAge(dobStr?: string) {
  if (!dobStr) return "";
  const d = new Date(dobStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  if (y >= 2) return `${y}y`;
  let months = y * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months--;
  if (months <= 0) {
    const days = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
    return `${days}d`;
  }
  return `${months}m`;
}
function formatDOB(dob?: string) {
  if (!dob) return "—";
  const date = new Date(dob);
  if (isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}
function compareDates(a: Reminder, b: Reminder) {
  return new Date(a.dosageTime).valueOf() - new Date(b.dosageTime).valueOf();
}

const FOOTER_HEIGHT = 64; // visual height of Footer area

const PatientProfileOPD: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();

 

  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);
  const patientFromStore = useSelector((s: RootState) => s.currentPatient) as PatientType | undefined;
  const timelineFromStore: TimelineType | undefined = undefined; // no timeline in store; initialize locally
  const [currentPatient, setCurrentPatient] = useState<PatientType | undefined>(patientFromStore);
  const [timeline, setTimeline] = useState<TimelineType | undefined>(timelineFromStore);
  const [loading, setLoading] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [openRevisit, setOpenRevisit] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printSelectOptions, setPrintSelectOptions] = useState<string[]>([]);
  const [openDischargeSheet, setOpenDischargeSheet] = useState(false);


  const [previousMedHistoryList, setPreviousMedHistoryList] = useState<any[]>([]);
  const [selectedTestList, setSelectedTestList] = useState<testType[]>([]);
  const [isPrintingReports, setIsPrintingReports] = useState(false);

  const {
    setSymptoms,
    setReminder,
    setVitalAlert,
    setMedicineHistory,
    setVitalFunction,
    vitalAlert,
    reminder,
    medicalHistory,
    symptoms,
    reports,
    setReports,
    vitalFunction,
  } = usePrintInPatientStore();

  const id = route.params?.id;
  const staffRole = route.params?.staffRole ?? "";
  const isReceptionView = !!route.params?.reception;
  const fromDischargeList = !!route.params?.fromDischargeList;

  // Get patient start status
  const startStatus = currentPatient?.patientStartStatus ?? 0;
  const endStatus = currentPatient?.patientEndStatus ?? 0;

  // Check if patient is discharged
  const isDischargedPatient = fromDischargeList || endStatus === 21;
  const isSurgeonOrAnesthetist = user?.roleName === "surgeon" || user?.roleName === "anesthetist";

  const fetchPatientAndTimeline = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const resp = await AuthFetch(`patient/${user?.hospitalID}/patients/single/${id}`, token);
      if (resp?.status === "success" && resp?.data?.patient) {
         dispatch(setCurrentPatientAction(resp.data.patient));
        setCurrentPatient(resp?.data?.patient);
        const timeLine = await AuthFetch(`patientTimeLine/${resp?.data?.patient.id}`, token);
        if (timeLine?.status === "success" && timeLine?.data?.patientTimeLine) {
          setTimeline(timeLine?.data?.patientTimeLine);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    if (!timeline?.patientID) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(`attachment/${user?.hospitalID}/all/${timeline.patientID}`, token);
      if (res?.status === "success" && res?.data?.attachments) {
        setReports(res?.data?.attachments);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPrintData = async () => {
  if (!timeline?.id || !currentPatient?.id) return;
  setLoading(true);
  try {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));

    const remindersRes = await AuthFetch(
      `medicine/${timeline.id}/reminders/all`,
      token
    );
    if (remindersRes?.status === "success") {
      setReminder((remindersRes?.data?.reminders || []).sort(compareDates));
    }

    const alertsRes = await AuthFetch(
      `alerts/hospital/${user?.hospitalID}/vitalAlerts/${currentPatient?.id}`,
      token
    );
    if (alertsRes?.status === "success") {
      setVitalAlert(alertsRes?.data?.alerts || []);
    }

    const symptomsRes = await AuthFetch(
      `symptom/${currentPatient.id}`,
      token
    );
    if (symptomsRes?.status === "success") {
      setSymptoms(symptomsRes?.data?.symptoms || []);
    }

    const prevMedRes = await AuthFetch(
      `medicine/${timeline.id}/previous/allmedlist`,
      token
    );
    if (prevMedRes?.status === "success") {
      setPreviousMedHistoryList(prevMedRes?.data?.previousMedList || []);
    }

    const testsRes = await AuthFetch(
      `test/${currentPatient.id}`,
      token
    );
    if (testsRes?.status === "success") {
      setSelectedTestList(testsRes.data?.tests || []);
    }

    const medHistRes = await AuthFetch(
      `history/${user?.hospitalID}/patient/${currentPatient.id}`,
      token
    );
    if (medHistRes?.status === "success") {
      setMedicineHistory(medHistRes.data?.medicalHistory || []);
    }

    const vitFuncRes = await AuthFetch(
      `vitals/${user?.hospitalID}/functions/${currentPatient.id}`,
      token
    );
    if (vitFuncRes?.status === "success") {
      setVitalFunction(vitFuncRes?.data || {});
    }

    // ✅ now open the Discharge Summary options sheet
    setOpenDischargeSheet(true);
    setPrintSelectOptions([]);
  } finally {
    setLoading(false);
  }
};


  const handlePrintClick = async () => {
  if (printSelectOptions.includes("tests")) {
    setIsPrintingReports(true);
    await loadReportData();
    setIsPrintingReports(false);
    setPrintOpen(true);
  } else if (printSelectOptions.includes("generalInfo")) {
    await loadPrintData(); // now opens DischargeSummarySheet
  }
};


  const updateTheSelectedPrintOptions = async (opts: string[], shouldPrint: boolean) => {
    setPrintSelectOptions(opts);
    if (shouldPrint) {
      const filtered = (reports || []).filter((r: any) => {
        if (opts.includes("Radiology") && (r.category === "radiology" || r.category === "1")) return true;
        if (opts.includes("Pathology") && (r.category === "pathology" || r.category === "2")) return true;
        return false;
      });
      if (filtered.length === 0) {
        Alert.alert("No reports", "No matching reports found.");
        setPrintOpen(false);
        setPrintSelectOptions([]);
        return;
      }
      try {
         filtered.forEach((item: any) => {
      if (item.fileURL) {
        Linking.openURL(item.fileURL).catch((err) => {
        });
      }
    });

        // Alert.alert("Downloads", `Queued ${filtered.length} report(s) for download.`);
      } finally {
        setPrintOpen(false);
        setPrintSelectOptions([]);
      }
    }
  };

  const openReportFromMenu = async (type: "generalInfo" | "tests") => {
    setPrintSelectOptions([type]);
    setMenuOpen(false);
  };

  // Handle patient revisit
  const handlePatientRevisit = () => {
    setOpenRevisit(true);
  };

  useFocusEffect(
    useCallback(() => {
    fetchPatientAndTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]))

  useEffect(() => {
    if (printSelectOptions.length > 0) handlePrintClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printSelectOptions.join(",")]);

  const followUpChip =
    Number(currentPatient?.followUpStatus || 0) === followUpStatus.active
      ? new Date(currentPatient?.followUpDate || "").toLocaleDateString("en-GB")
      : "";

  const genderText = currentPatient?.gender === 1 ? "Male" : "Female";
  const ageText = currentPatient?.dob ? getAge(currentPatient?.dob) : "";
  const doctorText = (() => {
    if (currentPatient?.doctorName) {
      const d = currentPatient.doctorName;
      return `Dr. ${d.slice(0, 1).toUpperCase()}${d.slice(1).toLowerCase()}`;
    }
    if (currentPatient?.firstName) {
      const f = currentPatient.firstName;
      const l = currentPatient?.lastName || "";
      return `Dr. ${f.slice(0, 1).toUpperCase()}${f.slice(1).toLowerCase()} ${l}`;
    }
    return "—";
  })();

  // Get menu items based on patient status
  const getMenuItems = () => {
  // Hide Request Surgery and Transfer Patient for surgeon and anesthetist
  
  // For surgeon and anesthetist, only show reports regardless of patient status
  if (isSurgeonOrAnesthetist) {
    return [
     
     {
        label: "Handshake Patient",
        onPress: () => {
          setMenuOpen(false);
          navigation.navigate("HandshakePatientScreen", {
            patientID: currentPatient?.id,
            timelineID: timeline?.id,
          });
        },
        disabled: false,
      },
       { label: "Discharge Summary", onPress: () => openReportFromMenu("generalInfo") },
      { label: "Test Reports", onPress: () => openReportFromMenu("tests") },
    ];
  }

  if (isDischargedPatient) {
    // For discharged patients - only show reports
    return [
      { label: "Discharge Summary", onPress: () => openReportFromMenu("generalInfo") },
      { label: "Test Reports", onPress: () => openReportFromMenu("tests") },
    ];
  }

  const baseItems = [
    { label: "Discharge Summary", onPress: () => openReportFromMenu("generalInfo") },
    { label: "Test Reports", onPress: () => openReportFromMenu("tests") },
  
  ];

  // For start status 1: Transfer Patient + Discharge Summary + Test Reports
  if (startStatus === 1) {
    return [
      {
        label: "Transfer Patient",
        onPress: () => {
          if (staffRole !== "nurse") {
            setMenuOpen(false);
            navigation.navigate("TransferPatient", {
              hospitalID: user?.hospitalID,
              patientID: currentPatient?.id,
              timeline,
            });
          }
        },
        disabled: staffRole === "nurse",
      },
      ...baseItems,
    ];
  }

  if (startStatus !== 1) {
    return [
      {
        label: "Transfer Patient",
        onPress: () => {
          if (staffRole !== "nurse") {
            setMenuOpen(false);
            navigation.navigate("TransferPatient", {
              hospitalID: user?.hospitalID,
              patientID: currentPatient?.id,
              timeline,
            });
          }
        },
        disabled: staffRole === "nurse",
      },
      {
        label: "Request Surgery",
        onPress: () => {
          setMenuOpen(false);
          navigation.navigate("RequestSurgeryScreen", {
            timelineID: timeline?.id,
          });
        },
        disabled: false,
      },
      {
        label: "Handshake Patient",
        onPress: () => {
          setMenuOpen(false);
          navigation.navigate("HandshakePatientScreen", {
            patientID: currentPatient?.id,
            timelineID: timeline?.id,
          });
        },
        disabled: false,
      },
      ...baseItems,
    ];
  }

  return [
    currentPatient?.ptype !== 21
      ? {
          label: "Transfer Patient",
          onPress: () => {
            if (staffRole !== "nurse") {
              setMenuOpen(false);
              navigation.navigate("TransferPatient", {
                hospitalID: user?.hospitalID,
                patientID: currentPatient?.id,
                timeline,
              });
            }
          },
          disabled: staffRole === "nurse",
        }
      : {
          label: "Patient Revisit",
          onPress: () => {
            setOpenRevisit(true);
            setMenuOpen(false);
          },
        },
    ...baseItems,
  ];
};

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="always"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // add space so nothing is covered by the fixed footer
          contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + insets.bottom + 24 }}
        >
          {/* Profile Card (icons moved to top-right inside card) */}
          <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            {/* top-right actions */}
            {user?.roleName !== "triage" && 
            <View style={styles.cardActions}>
              {!isDischargedPatient  && (
                <TouchableOpacity
                  onPress={() => !isReceptionView && navigation.navigate("EditPatientProfile" as never, { id } as never)}
                  disabled={isReceptionView}
                  style={[
                    styles.iconBtnSmall,
                    { borderColor: COLORS.border, backgroundColor: COLORS.card2, opacity: isReceptionView ? 0.5 : 1 },
                  ]}
                >
                  <Edit2Icon size={16} color={COLORS.text} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setMenuOpen(true)}
                disabled={isReceptionView}
                style={[
                  styles.iconBtnSmall,
                  { borderColor: COLORS.border, backgroundColor: COLORS.card2, opacity: isReceptionView ? 0.5 : 1 },
                ]}
              >
                <MoreVertical size={16} color={COLORS.text} />
              </TouchableOpacity>
            </View>}

            {/* left side avatar + name */}
            <View style={styles.row}>
              <View style={[styles.avatar, { borderColor: COLORS.border }]}>
                {currentPatient?.imageURL ? (
                  <Image source={{ uri: currentPatient.imageURL }} style={{ width: "100%", height: "100%", borderRadius: 40 }} />
                ) : (
                  <UserIcon size={28} color={COLORS.sub} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: COLORS.text }]}>
                  {(currentPatient?.pName || "").toUpperCase()}
                </Text>
                <Text style={[styles.sub, { color: COLORS.sub }]}>UHID: {currentPatient?.pUHID || "-"}</Text>

                <View style={styles.badgesRow}>
                  {!!followUpChip && (
                    <View style={[styles.badge, { backgroundColor: COLORS.warn + "22", borderColor: COLORS.warn }]}>
                      <CalendarDays size={14} color={COLORS.warn} />
                      <Text style={[styles.badgeText, { color: COLORS.warn }]}>Follow Up Due</Text>
                    </View>
                  )}
                  
                  {/* Discharged Status Badge */}
                  {isDischargedPatient &&  (
                    <View style={[styles.badge, { backgroundColor: "#ef444422", borderColor: "#ef4444" }]}>
                      <Text style={[styles.badgeText, { color: "#ef4444" }]}>
                        Discharged
                      </Text>
                    </View>
                  )}
                  
                  {/* Start Status Badge */}
                  {!isDischargedPatient && startStatus > 0 && (
                    <View style={[styles.badge, { backgroundColor: COLORS.brand + "22", borderColor: COLORS.brand }]}>
                      <Text style={[styles.badgeText, { color: COLORS.brand }]}>
                        Status: {startStatus}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* middle demographics */}
            <View style={[styles.infoGrid]}>
              <View style={styles.infoItem}>
                <Text style={[styles.fieldValue, { color: COLORS.text }]}>
                  {genderText}{ageText ? `, ${ageText}` : ""}
                </Text>
                <Text style={[styles.fieldHint, { color: COLORS.sub }]}>DOB: {formatDOB(currentPatient?.dob)}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={[styles.fieldValue, { color: COLORS.text }]}>{doctorText}</Text>
                <Text style={[styles.fieldHint, { color: COLORS.sub }]}>{currentPatient?.department || "—"}</Text>
              </View>
            </View>

            {/* Action Buttons for Discharged Patients */}
            {isDischargedPatient && (
              <View style={styles.dischargedActionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: COLORS.warn }]}
                  onPress={() => navigation.navigate("PatientRevisitScreen", { 
                    patientId: currentPatient?.id,
                    patientData: currentPatient
                  })}
                >
                  <Text style={[styles.actionButtonText, { color: COLORS.buttonText }]}>
                    Patient Revisit
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Discharge Button - Only for startStatus 2 (active patients) */}
            {!isDischargedPatient && !timeline?.patientEndStatus && startStatus === 2 && !isSurgeonOrAnesthetist && (
              <View style={styles.dischargeButtonContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("DischargeScreen", { 
                    patientId: currentPatient?.id,
                    patientData: currentPatient,
                    timelineData: timeline,
                    hospitalID: user?.hospitalID
                  })}
                  disabled={isReceptionView}
                  style={[
                    styles.dischargeButton,
                    { 
                      backgroundColor: isReceptionView ? COLORS.sub : COLORS.dischargeButton,
                      opacity: isReceptionView ? 0.5 : 1
                    }
                  ]}
                >
                  <Text style={[styles.dischargeButtonText, { color: COLORS.dischargeButtonText }]}>
                    Discharge
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
         {user?.roleName === "triage" ? (
  <AddTriageIssue />
) : (
  <>
    {(user?.roleName === "surgeon" || user?.roleName === "anesthetist") ? <OtTabs /> : <Tabs />}
  </>
)}
          
        </ScrollView>

        {/* Loading overlay */}
        {loading && (
          <View style={[styles.loadingOverlay, { backgroundColor: COLORS.overlay }]}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Footer (fixed) */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

      {/* 3-dots Menu (bottom sheet style) */}
      <BottomSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        colors={COLORS}
        items={getMenuItems()}
      />

 <DischargeSummaryDownload
  visible={openDischargeSheet}
  onClose={() => setOpenDischargeSheet(false)}
  colors={COLORS}
  patient={currentPatient}
  vitalAlert={vitalAlert}
  reminder={reminder}
  medicalHistory={medicalHistory}
  previousMedHistoryList={previousMedHistoryList}
  symptoms={symptoms}
  vitalFunction={vitalFunction}
  tests={selectedTestList}
/>

      {/* Revisit Sheet */}
      <ActionSheet title="Patient Revisit" visible={openRevisit} onClose={() => setOpenRevisit(false)} colors={COLORS}>
        <Text style={{ color: COLORS.sub, marginBottom: 8 }}>
          (Form placeholder) Provide revisit date/time and remarks.
        </Text>
        <TextInput
          placeholder="Revisit Date (YYYY-MM-DD)"
          placeholderTextColor={COLORS.sub}
          style={[styles.input, { backgroundColor: COLORS.field, color: COLORS.fieldText, borderColor: COLORS.border }]}
        />
        <TextInput
          placeholder="Remarks"
          placeholderTextColor={COLORS.sub}
          style={[styles.input, { backgroundColor: COLORS.field, color: COLORS.fieldText, borderColor: COLORS.border, height: 90 }]}
          multiline
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <Pressable onPress={() => setOpenRevisit(false)} style={[styles.sheetBtn, { backgroundColor: COLORS.pill }]}>
            <Text style={{ color: COLORS.text, fontWeight: "700" }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert("Revisit", "Revisit scheduled (mock).");
              setOpenRevisit(false);
            }}
            style={[styles.sheetBtn, { backgroundColor: COLORS.button }]}
          >
            <Text style={{ color: COLORS.buttonText, fontWeight: "700" }}>Save</Text>
          </Pressable>
        </View>
      </ActionSheet>

      {/* Print chooser (Radiology/Pathology) */}
      <ActionSheet title="Test Reports" visible={printOpen} onClose={() => setPrintOpen(false)} colors={COLORS}>
        <Text style={{ color: COLORS.sub, marginBottom: 12 }}>Pick report categories to download/print.</Text>
        <TogglePill
          label="Radiology"
          active={printSelectOptions.includes("Radiology")}
          onToggle={() =>
            setPrintSelectOptions((prev) =>
              prev.includes("Radiology") ? prev.filter((x) => x !== "Radiology") : [...prev, "Radiology"]
            )
          }
          colors={COLORS}
        />
        <TogglePill
          label="Pathology"
          active={printSelectOptions.includes("Pathology")}
          onToggle={() =>
            setPrintSelectOptions((prev) =>
              prev.includes("Pathology") ? prev.filter((x) => x !== "Pathology") : [...prev, "Pathology"]
            )
          }
          colors={COLORS}
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Pressable onPress={() => setPrintOpen(false)} style={[styles.sheetBtn, { backgroundColor: COLORS.pill }]}>
            <Text style={{ color: COLORS.text, fontWeight: "700" }}>Close</Text>
          </Pressable>
          <Pressable
            onPress={() => updateTheSelectedPrintOptions(printSelectOptions, true)}
            style={[styles.sheetBtn, { backgroundColor: COLORS.button, opacity: printSelectOptions.length ? 1 : 0.5 }]}
            disabled={!printSelectOptions.length}
          >
            <Text style={{ color: COLORS.buttonText, fontWeight: "700" }}>Download</Text>
          </Pressable>
        </View>
      </ActionSheet>
    </View>
  );
};

// ---------- small presentational components ----------
const BottomSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  items: ({ label?: string; onPress?: () => void; disabled?: boolean })[];
  colors: any;
}> = ({ visible, onClose, items, colors }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={sheetStyles.overlay} onPress={onClose} />
      <View style={[sheetStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {items.map((it, idx) => (
          <Pressable
            key={idx}
            onPress={() => {
              if (!it.disabled && it.onPress) it.onPress();
            }}
            style={({ pressed }) => [sheetStyles.item, { opacity: it.disabled ? 0.45 : pressed ? 0.8 : 1 }]}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
};

const ActionSheet: React.FC<{
  title: string;
  visible: boolean;
  onClose: () => void;
  colors: any;
  children: React.ReactNode;
}> = ({ title, visible, onClose, colors, children }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={sheetStyles.overlay} onPress={onClose} />
      <View style={[sheetStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[sheetStyles.sheetHeader, { borderBottomColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={6}>
            <X size={18} color={colors.sub} />
          </Pressable>
        </View>
        <View style={{ padding: 12 }}>{children}</View>
      </View>
    </Modal>
  );
};

const TogglePill: React.FC<{ label: string; active: boolean; onToggle: () => void; colors: any }> = ({
  label,
  active,
  onToggle,
  colors,
}) => {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.pillBtn,
        {
          backgroundColor: active ? colors.button : colors.pill,
          borderColor: colors.border,
          marginBottom: 8,
          justifyContent: "center",
        },
      ]}
    >
      <Text style={{ color: active ? colors.buttonText : colors.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
};

// ---------- styles ----------
const styles = StyleSheet.create({
  safe: { flex: 1 },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },

  // absolute action area inside card (top-right)
  cardActions: {
    position: "absolute",
    right: 10,
    top: 10,
    flexDirection: "row",
    gap: 8,
    zIndex: 2,
  },
  iconBtnSmall: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },

  row: { flexDirection: "row", alignItems: "center" },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },

  name: { fontSize: 18, fontWeight: "800" },
  sub: { fontSize: 13, marginTop: 2 },

  badgesRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, fontWeight: "800" },

  infoGrid: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  infoItem: { flex: 1 },
  fieldValue: { fontSize: 16, fontWeight: "800" },
  fieldHint: { fontSize: 12, marginTop: 4 },

  tabHeader: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabTitle: { fontSize: 15, fontWeight: "800" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },

  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
  },

  sheetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
  },

  // footer
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  // Discharge button styles
  dischargeButtonContainer: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  dischargeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dischargeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Discharged patient action buttons
  dischargedActionsContainer: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    minWidth: '30%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingBottom: 8,
  },
  sheetHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  item: { paddingHorizontal: 16, paddingVertical: 14 },
});

export default PatientProfileOPD;