import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { formatDate } from "../../../utils/dateTime";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { medicalHistoryFormType } from "../../../utils/types";
import { AuthFetch } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import Footer from "../../dashboard/footer";
import { heriditaryList, infectionList } from "../../../utils/list";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showError } from "../../../store/toast.slice";

// Icon component
const EditIcon = () => (
  <View
    style={{
      width: 16,
      height: 16,
      backgroundColor: "#fff",
      borderRadius: 2,
    }}
  />
);

// Utility functions
function listFrom(val?: string): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function yesNo(flag: boolean | string | undefined): string {
  if (typeof flag === "string") {
    const v = flag.trim().toLowerCase();
    if (v === "yes" || v === "true" || v === "1") return "Yes";
    if (v === "no" || v === "false" || v === "0") return "No";
  }
  return flag ? "Yes" : "No";
}

function splitValueAndDate(source?: string): { text: string; date: string } {
  if (!source) return { text: "", date: "" };
  const parts = source.split(",");
  const text = parts[0]?.trim() || "";
  const dateRaw = parts
    .find((p) => p.includes("Date:"))
    ?.replace("Date:", "")
    .trim();
  const date =
    dateRaw && !isNaN(Date.parse(dateRaw)) ? formatDate(new Date(dateRaw)) : "";
  return { text, date };
}

function parseHealthCondition(source?: string): { text: string; date: string } {
  if (!source) return { text: "", date: "" };
  if (source.includes(":")) {
    const [answer, dateStr] = source.split(":").map((s) => s.trim());
    if (answer && dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return { text: answer, date: formatDate(date) };
      }
    }
  }
  return { text: source.trim(), date: "" };
}

function parseInfections(infectionsString?: string): { [key: string]: string } {
  if (!infectionsString) return {};
  const infectionData: { [key: string]: string } = {};
  const parts = infectionsString.split(",").map((p) => p.trim());
  parts.forEach((part) => {
    if (part.includes(":")) {
      const [infectionName, dateStr] = part.split(":").map((s) => s.trim());
      if (infectionName && dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          infectionData[infectionName] = formatDate(date);
        }
      }
    }
  });
  return infectionData;
}

function parseFamilyDiseases(
  familyDiseaseString?: string
): { [key: string]: string } {
  if (!familyDiseaseString) return {};
  const familyData: { [key: string]: string } = {};
  const pairs = familyDiseaseString.split(",").map((p) => p.trim());
  pairs.forEach((pair) => {
    if (pair.includes(":")) {
      const [member, disease] = pair.split(":").map((s) => s.trim());
      if (member && disease) {
        familyData[member.toLowerCase()] = disease;
      }
    }
  });
  return familyData;
}
type RouteParams = { ot: boolean };
// Main Component
const MedicalHistory: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
        const isOt = route.params?.ot;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const patient = useSelector((s: RootState) => s.currentPatient);
  const user = useSelector((s: RootState) => s.currentUser);
const dispatch = useDispatch()
  const [medicalHistory, setMedicalHistory] =
    useState<medicalHistoryFormType>();
  const [loading, setLoading] = useState(true);
  const getMedicalHistoryApi = useRef(true);

  const getMedicalHistory = useCallback(async () => {
    if (!patient?.id) return;
    try {
      setLoading(true);
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const response = await AuthFetch(
        `history/${user?.hospitalID}/patient/${patient?.id}`,
        token
      );
      if (response.status === "success") {
        setMedicalHistory(response?.data?.medicalHistory);
      }
    } catch (error) {
      dispatch(showError(error?.message || error || "Error fetching medical history"))
      
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, patient?.id]);

  useEffect(() => {
    if (patient?.id && getMedicalHistoryApi?.current) {
      getMedicalHistoryApi.current = false;
      getMedicalHistory();
    }
  }, [patient, user, getMedicalHistory]);

  // Derived data
  const diseases = listFrom(medicalHistory?.disease);
  const foodAllergy = listFrom(medicalHistory?.foodAllergy);
  const medicineAllergy = listFrom(medicalHistory?.medicineAllergy);
  const meds = listFrom(medicalHistory?.meds);
  const selfMeds = listFrom(medicalHistory?.selfMeds);
  const infections = listFrom(medicalHistory?.infections);
  const drugs = listFrom(medicalHistory?.drugs);

  const infectionDates = parseInfections(medicalHistory?.infections);
  const drugDates = parseInfections(medicalHistory?.drugs);

  const hasTobacco =
    drugs.some((d) => d.includes("Tobbaco")) || !!drugDates["Tobbaco"];
  const hasDrugs =
    drugs.some((d) => d.includes("Drugs")) || !!drugDates["Drugs"];
  const hasAlcohol =
    drugs.some((d) => d.includes("Alcohol")) || !!drugDates["Alcohol"];
  const hasHepB =
    infections.some((inf) => inf.includes(infectionList[1])) ||
    infectionDates[infectionList[1]];
  const hasHepC =
    infections.some((inf) => inf.includes(infectionList[2])) ||
    infectionDates[infectionList[2]];
  const hasHIV =
    infections.some((inf) => inf.includes(infectionList[0])) ||
    infectionDates[infectionList[0]];

  const cancer = splitValueAndDate(medicalHistory?.cancer);
  const lumps = splitValueAndDate(medicalHistory?.lumps);
  const pregnant = splitValueAndDate(medicalHistory?.pregnant);
  const hereditary = listFrom(medicalHistory?.hereditaryDisease);

  const familyDiseases = parseFamilyDiseases(medicalHistory?.familyDisease);
  const familyDateRaw = medicalHistory?.hereditaryDisease
    ?.split(",")
    .find((i) => i.includes("Date:"))
    ?.replace("Date:", "")
    .trim();
  const familyDate =
    familyDateRaw && !isNaN(Date.parse(familyDateRaw))
      ? formatDate(new Date(familyDateRaw))
      : "";

  const neurologicalDisorder = parseHealthCondition(
    medicalHistory?.neurologicalDisorder
  );
  const mentalHealth = parseHealthCondition(medicalHistory?.mentalHealth);
  const chestCondition = parseHealthCondition(medicalHistory?.chestCondition);
  const heartProblems = parseHealthCondition(medicalHistory?.heartProblems);

  // Helper Components
  const InfoRow = ({
    label,
    value,
    highlight = false,
  }: {
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
  }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {typeof value === "string" ? (
        <Text
          style={[
            styles.infoValue,
            highlight && styles.infoValueHighlight,
          ]}
          numberOfLines={0}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );

  const InfoRowWithDate = ({
    label,
    value,
    date,
    danger = false,
  }: {
    label: string;
    value: string;
    date?: string;
    danger?: boolean;
  }) => (
    <View style={styles.infoRowDate}>
      <View style={styles.infoRowDateLeft}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[
            styles.infoValue,
            danger && styles.dangerValue,
          ]}
        >
          {value}
        </Text>
      </View>
      {date && <Text style={styles.dateText}>{date}</Text>}
    </View>
  );

  const PillList = ({ items }: { items: string[] }) => (
    <View style={styles.pillContainer}>
      {items.map((item, index) => (
        <View key={index} style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={0}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );

  const SectionCard = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const handleEdit = () => {
    navigation.navigate("EditMedicalHistory" as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading Medical History...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Medical History</Text>
          {!isOt && patient.ptype !== 21 && user?.roleName !== "reception" &&(
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <EditIcon />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Section */}
        <SectionCard title="Patient Information">
          <InfoRow
            label="Given By"
            value={
              medicalHistory?.givenName
                ? medicalHistory.givenName[0].toUpperCase() +
                  medicalHistory.givenName.slice(1)
                : "—"
            }
            highlight
          />
          <InfoRow
            label="Relation"
            value={medicalHistory?.givenRelation || "—"}
          />
          <InfoRow label="Phone" value={medicalHistory?.givenPhone || "—"} />
          <View style={styles.divider} />
          <InfoRow
            label="Blood Group"
            value={medicalHistory?.bloodGroup || "—"}
            highlight
          />
          <InfoRow
            label="Blood Pressure"
            value={medicalHistory?.bloodPressure || "—"}
          />
        </SectionCard>

        {/* Conditions Section */}
        <SectionCard title="Surgeries & Known Conditions">
          {diseases.length > 0 ? (
            <PillList items={diseases} />
          ) : (
            <Text style={styles.emptyText}>No conditions recorded</Text>
          )}
        </SectionCard>

        {/* Allergies Section */}
        <SectionCard title="Allergies">
          <InfoRow
            label="Food Allergies"
            value={
              foodAllergy.length > 0 ? (
                <PillList items={foodAllergy} />
              ) : (
                <Text style={styles.emptyText}>None</Text>
              )
            }
          />
          <InfoRow
            label="Medicine Allergies"
            value={
              medicineAllergy.length > 0 ? (
                <PillList items={medicineAllergy} />
              ) : (
                <Text style={styles.emptyText}>None</Text>
              )
            }
          />
        </SectionCard>

        {/* Medications Section */}
        <SectionCard title="Current Medications">
          <InfoRow
            label="Prescribed"
            value={
              meds.length > 0 ? (
                <PillList items={meds} />
              ) : (
                <Text style={styles.emptyText}>None</Text>
              )
            }
          />
          <InfoRow
            label="Self-Prescribed"
            value={
              selfMeds.length > 0 ? (
                <PillList items={selfMeds} />
              ) : (
                <Text style={styles.emptyText}>None</Text>
              )
            }
          />
        </SectionCard>

        {/* Infections Section */}
        <SectionCard title="Infectious Diseases">
          <InfoRowWithDate
            label="Hepatitis B"
            value={yesNo(hasHepB)}
            date={infectionDates[infectionList[1]]}
            danger={!!hasHepB}
          />
          <InfoRowWithDate
            label="Hepatitis C"
            value={yesNo(hasHepC)}
            date={infectionDates[infectionList[2]]}
            danger={!!hasHepC}
          />
          <InfoRowWithDate
            label="HIV"
            value={yesNo(hasHIV)}
            date={infectionDates[infectionList[0]]}
            danger={!!hasHIV}
          />
        </SectionCard>

        {/* Addictions Section */}
        {patient.category !== 1 && (
          <SectionCard title="Substance Use">
            <InfoRowWithDate
              label="Tobacco"
              value={yesNo(hasTobacco)}
              date={drugDates["Tobbaco"]}
            />
            <InfoRowWithDate
              label="Drugs"
              value={yesNo(hasDrugs)}
              date={drugDates["Drugs"]}
            />
            <InfoRowWithDate
              label="Alcohol"
              value={yesNo(hasAlcohol)}
              date={drugDates["Alcohol"]}
            />
          </SectionCard>
        )}

        {/* Cancer/Lumps/Pregnancy Section */}
        <SectionCard title="Oncology & Reproductive Health">
          <InfoRowWithDate
            label="Cancer History"
            value={cancer.text || "—"}
            date={cancer.date}
          />
          <InfoRowWithDate
            label="Lumps/Masses"
            value={lumps.text || "—"}
            date={lumps.date}
          />
          {patient.gender === 2 && (
            <InfoRowWithDate
              label="Pregnancy Status"
              value={pregnant.text || "—"}
              date={pregnant.date}
            />
          )}
        </SectionCard>

        {/* Other Health Conditions Section */}
        <SectionCard title="Other Health Conditions">
          <InfoRowWithDate
            label="Neurological Disorder"
            value={neurologicalDisorder.text || "—"}
            date={neurologicalDisorder.date}
          />
          <InfoRowWithDate
            label="Mental Health"
            value={mentalHealth.text || "—"}
            date={mentalHealth.date}
          />
          <InfoRowWithDate
            label="Chest Condition"
            value={chestCondition.text || "—"}
            date={chestCondition.date}
          />
          <InfoRowWithDate
            label="Heart Problems"
            value={heartProblems.text || "—"}
            date={heartProblems.date}
          />
        </SectionCard>

        {/* Family History Section */}
        <SectionCard title="Family Medical History">
          <View style={styles.familyMember}>
            <View style={styles.familyHeader}>
              <Text style={styles.familyTitle}>Father</Text>
              <Text
                style={[
                  styles.familyStatus,
                  hereditary.includes(heriditaryList[0]) && styles.familyStatusYes,
                ]}
              >
                {yesNo(hereditary.includes(heriditaryList[0]))}
              </Text>
            </View>
            {(familyDiseases.father || familyDiseases.Father) && (
              <Text style={styles.familyDisease} numberOfLines={0}>
                {familyDiseases.father || familyDiseases.Father}
              </Text>
            )}
            {familyDate && <Text style={styles.familyDate}>{familyDate}</Text>}
          </View>

          <View style={styles.divider} />

          <View style={styles.familyMember}>
            <View style={styles.familyHeader}>
              <Text style={styles.familyTitle}>Mother</Text>
              <Text
                style={[
                  styles.familyStatus,
                  hereditary.includes(heriditaryList[1]) && styles.familyStatusYes,
                ]}
              >
                {yesNo(hereditary.includes(heriditaryList[1]))}
              </Text>
            </View>
            {(familyDiseases.mother || familyDiseases.Mother) && (
              <Text style={styles.familyDisease} numberOfLines={0}>
                {familyDiseases.mother || familyDiseases.Mother}
              </Text>
            )}
            {familyDate && <Text style={styles.familyDate}>{familyDate}</Text>}
          </View>

          <View style={styles.divider} />

          <View style={styles.familyMember}>
            <View style={styles.familyHeader}>
              <Text style={styles.familyTitle}>Siblings</Text>
              <Text
                style={[
                  styles.familyStatus,
                  hereditary.includes(heriditaryList[2]) && styles.familyStatusYes,
                ]}
              >
                {yesNo(hereditary.includes(heriditaryList[2]))}
              </Text>
            </View>
            {(familyDiseases.siblings ||
              familyDiseases.Siblings ||
              familyDiseases.sibling ||
              familyDiseases.Sibling) && (
              <Text style={styles.familyDisease} numberOfLines={0}>
                {familyDiseases.siblings ||
                  familyDiseases.Siblings ||
                  familyDiseases.sibling ||
                  familyDiseases.Sibling}
              </Text>
            )}
            {familyDate && <Text style={styles.familyDate}>{familyDate}</Text>}
          </View>
        </SectionCard>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active="patients" brandColor="#14b8a6" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#14b8a6",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  sectionContent: {
    gap: 12,
  },
  infoRow: {
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: "#1e293b",
    lineHeight: 22,
  },
  infoValueHighlight: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  infoRowDate: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoRowDateLeft: {
    flex: 1,
    marginRight: 12,
  },
  dateText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  dangerValue: {
    color: "#dc2626",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  pill: {
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#99f6e4",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f766e",
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  familyMember: {
    paddingVertical: 4,
  },
  familyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  familyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  familyStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  familyStatusYes: {
    color: "#0f766e",
    backgroundColor: "#f0fdfa",
  },
  familyDisease: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginTop: 2,
  },
  familyDate: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default MedicalHistory;