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
import { Edit2Icon } from "../../../utils/SvgIcons";

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

function extractTextAndDate(source?: string): { text: string; date: string } {
  if (!source || source.trim() === "" || source.toLowerCase() === "none") {
    return { text: "No", date: "" };
  }

  const raw = source.trim();

  const dateIndex = raw.toLowerCase().indexOf("date:");
  if (dateIndex !== -1) {
    const textPart = raw.slice(0, dateIndex).trim().replace(/[ ,;]+$/, "");
    const dateRaw = raw.slice(dateIndex + "date:".length).trim();
    let formattedDate = "";
    const parsed = new Date(dateRaw);
    if (!isNaN(parsed.getTime())) {
      formattedDate = formatDate(parsed);
    } else {
      // Fallback: just keep a trimmed part before "GMT"
      formattedDate = dateRaw.split("GMT")[0].trim();
    }

    return {
      text: textPart || "Yes",
      date: formattedDate,
    };
  }
  // Common patterns:
  // "Yes:15 Oct 2024"
  // "Breast cancer:2023"
  // "Lump in breast: 01 Jan 2025"
  // "Pregnant: 8 weeks, Due: 10 Sep 2025"
  // "No"

  // First, check if it's just "No" / "None"
  if (/^no$|^none$/i.test(raw)) {
    return { text: "No", date: "" };
  }

  // Try to find a date pattern anywhere in the string
  // Matches: 01 Dec 2025, 15 Oct 2024, 2023, 10/05/2024, etc.
  const dateRegex = /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})|(\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})/g;
  const datesFound = raw.match(dateRegex);

  // Extract the first valid date (prefer full date over year-only)
  let date = "";
  if (datesFound) {
    const fullDate = datesFound.find((d) => d.includes(" ")) || datesFound[0];
    date = fullDate.trim();
  }

  // Now extract the main text (remove date parts if needed for cleaner display)
  let text = raw;

  if (date) {
    // Remove the date from text if it's at the end or after colon
    text = raw
      .replace(/:\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/, "")   // "Yes: 01 Dec 2025" → "Yes"
      .replace(/:\s*\d{4}/, "")                             // "Cancer:2023" → "Cancer"
      .replace(/\s*,\s*(Due|Date)?:?.*$/i, "")              // Remove ", Due: 10 Sep 2025"
      .replace(dateRegex, "")                               // Remove any remaining dates
      .replace(/[:\-–—]\s*$/, "")                           // Clean trailing colon/dashes
      .trim();
  }

  // Final cleanup
  if (!text || text === "Yes" || text === "No") {
    text = text || (raw.toLowerCase().includes("no") || raw.toLowerCase().includes("none") ? "No" : "Yes");
  }

  // If text is still empty but we have raw, use cleaned raw
  if (!text && raw) {
    text = raw.split(/[:\-–—]/)[0].trim() || "Yes";
  }

  // Capitalize common answers
  if (text.toLowerCase() === "yes") text = "Yes";
  if (text.toLowerCase() === "no") text = "No";

  return { text: text || "Yes", date };
}

// Convert "...|1|days|..." → "...|1|day|" (and the opposite for >1)
function normalizeDurationUnits(raw: string): string {
  if (!raw) return raw;

  const parts = raw.split("|");
  if (parts.length < 2) return raw;

  const unitWords = ["day", "days", "month", "months", "year", "years"];
  const unitIndex = parts.findIndex((p) => unitWords.includes(p));

  if (unitIndex > 0) {
    const countIndex = unitIndex - 1;
    const count = parts[countIndex];
    let unit = parts[unitIndex];

    if (count === "1") {
      if (unit === "days") unit = "day";
      if (unit === "months") unit = "month";
      if (unit === "years") unit = "year";
    } else {
      if (unit === "day") unit = "days";
      if (unit === "month") unit = "months";
      if (unit === "year") unit = "years";
    }

    parts[unitIndex] = unit;
    return parts.join("|");
  }

  return raw;
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
        setMedicalHistory(response && "data" in response && response?.data?.medicalHistory);
      }
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : typeof error === "string"
          ? error
          : "Error fetching medical history";
      dispatch(showError(errorMessage ?? "Error fetching medical history"));
      
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
  const meds = listFrom(medicalHistory?.meds).map(normalizeDurationUnits);
  const selfMeds = listFrom(medicalHistory?.selfMeds).map(normalizeDurationUnits);
  const infections = listFrom(medicalHistory?.infections);
  const drugs = listFrom(medicalHistory?.drugs);

  /**
 * Parses strings like:
 * "Alcohol:01 Dec 2025, Tobacco:01 Dec 2025, Drugs:None"
 * "HIV:Positive 01 Dec 2025, Tuberculosis:Negative, Hepatitis C:None"
 * "Diabetes:01 Dec 2025, Hypertension:15 Mar 2024"
 *
 * Returns: { Alcohol: "01 Dec 2025", Tobacco: "01 Dec 2025", ... }
 */
const parseMedicalHistoryDates = (
  input: string | undefined | null
): Record<string, string> => {
  if (!input || typeof input !== "string") return {};

  const result: Record<string, string> = {};

  // Split by comma, then by colon
  const pairs = input.split(",").map((p) => p.trim());

  for (const pair of pairs) {
    if (!pair) continue;

    // Handle both "Key:Date" and "Key: Date" (with space)
    const firstColonIndex = pair.indexOf(":");
    if (firstColonIndex === -1) continue;

    const key = pair.substring(0, firstColonIndex).trim();
    const value = pair.substring(firstColonIndex + 1).trim();

    if (key) {
      // Store even if value is "None", "Negative", etc. — useful for display
      result[key] = value || "";
    }
  }

  return result;
};

 const drugDates     = parseMedicalHistoryDates(medicalHistory?.drugs);
const infectionDates = parseMedicalHistoryDates(medicalHistory?.infections);

  const hasTobacco =
    drugs.some((d) => d.includes("Tobacco")) || !!drugDates["Tobbaco"];
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

  const cancer = extractTextAndDate(medicalHistory?.cancer);
  const lumps = extractTextAndDate(medicalHistory?.lumps);
  const pregnant = extractTextAndDate(medicalHistory?.pregnant);
  const hereditary = listFrom(medicalHistory?.hereditaryDisease);

  const hasFatherDisease = hereditary.some(
    (item) =>
      item === heriditaryList[0] ||
      item.toLowerCase().startsWith(`${heriditaryList[0].toLowerCase()}:`)
  );
  const hasMotherDisease = hereditary.some(
    (item) =>
      item === heriditaryList[1] ||
      item.toLowerCase().startsWith(`${heriditaryList[1].toLowerCase()}:`)
  );
  const hasSiblingDisease = hereditary.some(
    (item) =>
      item === heriditaryList[2] ||
      item.toLowerCase().startsWith(`${heriditaryList[2].toLowerCase()}:`)
  );

// ✅ if familyDisease not present, fall back to hereditaryDisease ("Father:Diabetes" etc.)
  const familyDiseases = parseFamilyDiseases(
    medicalHistory?.familyDisease || medicalHistory?.hereditaryDisease
  );

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
              <Edit2Icon />
              
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
            label="Anaesthesia Allergies"
            value={
              medicalHistory?.anaesthesia
            }
          />
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
            // danger={!!hasHepB}
          />
          <InfoRowWithDate
            label="Hepatitis C"
            value={yesNo(hasHepC)}
            date={infectionDates[infectionList[2]]}
            // danger={!!hasHepC}
          />
          <InfoRowWithDate
            label="HIV"
            value={yesNo(hasHIV)}
            date={infectionDates[infectionList[0]]}
            // danger={!!hasHIV}
          />
        </SectionCard>

        {/* Addictions Section */}
        {patient.category !== 1 && (
          <SectionCard title="Substance Use">
            <InfoRowWithDate
              label="Tobacco"
              value={yesNo(hasTobacco)}
              date={drugDates["Tobacco"] || drugDates["Tobbaco"]}
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
    hasFatherDisease && styles.familyStatusYes,
  ]}
>
  {yesNo(hasFatherDisease)}
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
    hasMotherDisease && styles.familyStatusYes,
  ]}
>
  {yesNo(hasMotherDisease)}
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
    hasSiblingDisease && styles.familyStatusYes,
  ]}
>
  {yesNo(hasSiblingDisease)}
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