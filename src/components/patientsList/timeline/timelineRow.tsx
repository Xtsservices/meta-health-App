import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";

type TimelineType = any; // use the same TimelineType as screen for simplicity

const COLORS = {
  card: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  chip: "#eef2f7",
  green: "#22c55e",
  rose: "#f43f5e",
  brand: "#14b8a6",
  tagHandshake: "#28A745",
};

// patientStatus mapping colors (kept from your web code)
const colorObj: Record<number, string> = {
  2: "#FFA07A", // inpatient
  1: "#7EC1D6", // outpatient
  3: "#98FB98", // emergency
  4: "#A094D9", // operationTheatre
  21: "#F59706", // discharged
};

function getDepartment(module?: number | null): string {
  switch (module) {
    case 1: return "OUTPATIENT";
    case 2: return "INPATIENT";
    case 3: return "EMERGENCY";
    default: return "Unknown Department";
  }
}

function format(date?: string | null) {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return String(date);
  }
}

// ==== tag resolver for OT ====
function getTagText(operationData: any): string {
  const { scope, status, approvedTime, rejectedTime } = operationData || {};
  if (scope == null && approvedTime == null && rejectedTime == null) return "SURGERY REQUESTED";
  if (scope === "anesthetic" && status === "rejected") return "SURGERY REJECTED";
  if (scope === "anesthetic" && (status === "approved" || status === "scheduled")) return "SURGERY APPROVED";
  if (scope === "surgon" && status === "scheduled") return "SURGERY SCHEDULED";
  return "N/A";
}

// ==== event ordering, mirrors your sortKeysByTimestamp ====
function sortKeysByTimestamp(obj: any) {
  const getEarliestTimestamp = (key: string) => {
    switch (key) {
      case "transferDetails": return obj[key]?.[0]?.transferDate;
      case "externalTransferDetails": return obj[key]?.[0]?.transferDate;
      case "handshakeDetails": return obj[key]?.[0]?.assignedDate;
      case "operationTheatreDetails": return obj[key]?.[0]?.addedOn;
      case "symptomsDetails": return obj[key]?.[0]?.symptomAddedOn;
      case "isFollowUp": return obj[key]?.followUpDate;
      case "diagnosis":
        return obj.diagnosis !== null ? obj.endTime : obj.symptomsDetails?.[0]?.symptomAddedOn;
      case "discharge":
        return obj.patientEndStatus === 21 ? obj.endTime : null;
      case "revisit":
        return obj.isRevisit === 1 ? obj.startTime : null;
      default:
        return null;
    }
  };

  const keysToSort = [
    "transferDetails",
    "externalTransferDetails",
    "handshakeDetails",
    "operationTheatreDetails",
    "diagnosis",
    "revisit",
    "discharge",
    "isFollowUp",
  ];

  const validKeys = keysToSort.filter((key) => {
    if (key === "discharge") return obj.patientEndStatus === 21;
    if (key === "revisit") return obj.isRevisit === 1;
    if (key === "diagnosis") return obj.diagnosis !== null || obj.symptomsDetails !== null;
    return obj[key] !== null && obj[key] !== undefined;
  });

  validKeys.sort((a, b) => {
    const timeA = new Date(getEarliestTimestamp(a) || 0).getTime();
    const timeB = new Date(getEarliestTimestamp(b) || 0).getTime();
    return timeA - timeB;
  });

  const finalKeys = validKeys.map((key) => {
    if (key === "diagnosis" && obj.diagnosis === null) return "symptomsDetails";
    return key;
  });

  return finalKeys;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

export default function TimelineRow({ timeline, index }: { timeline: TimelineType; index: number }) {
  const [diagHintVisible, setDiagHintVisible] = useState(false);

  const rows = useMemo(() => {
    type Row = {
      tagText: string;
      tagColor?: string;
      isHandshake?: boolean;
      when: string;
      infoBlocks: React.ReactNode[];
      actor?: string;
      clickable?: boolean;
    };

    const list: Row[] = [];

    // Initial admission row (index === 0)
    if (index === 0) {
      const startColor = (timeline?.patientStartStatus && colorObj[timeline?.patientStartStatus]) || "#ccc";
      const startText = getDepartment(timeline?.patientStartStatus ?? undefined);
      list.push({
        tagText: startText,
        tagColor: startColor,
        when: format(timeline?.patientAddedOn),
        infoBlocks: [
          <Pill key="addedby">Patient added by: {timeline?.addedBy ?? "N/A"}</Pill>,
        ],
      });
    }

    // Event rows by sorted keys
    const keys = sortKeysByTimestamp(timeline);
    keys.forEach((key) => {
      switch (key) {
        case "transferDetails":
          timeline?.transferDetails?.forEach((t: any, i: number) => {
            const sameDept = t?.transferFromDepartment === t?.transferToDepartment;
            const tagText = sameDept ? "Internal Transfer"
              : getDepartment(t?.transferToDepartment);
            const tagColor = sameDept ? "#A7D670" : colorObj[t?.transferToDepartment || 1];

            const docName = sameDept
              ? `Dr. ${timeline?.doctorDetails?.doctorName || "N/A"}`
              : (t?.fromDoc || "N/A");

            list.push({
              tagText,
              tagColor,
              when: format(t?.transferDate),
              infoBlocks: [
                <Pill key={`td-main-${i}`}>
                  {sameDept
                    ? `Patient transferred from ${t?.fromWard} to ${t?.toWard}`
                    : `Patient transferred from ${getDepartment(t?.transferFromDepartment)} to ${getDepartment(t?.transferToDepartment)}`}
                </Pill>,
                <Pill key={`td-doc-${i}`}>Transfer by: {docName}</Pill>,
              ],
              actor: docName,
            });
          });
          break;

        case "handshakeDetails":
          timeline?.handshakeDetails?.forEach((h: any, i: number) => {
            if (h?.scope === "doctor") {
              list.push({
                tagText: "Handshake",
                isHandshake: true,
                when: format(h?.assignedDate),
                infoBlocks: [
                  <Pill key={`hs-main-${i}`}>Patient was Referred to Dr. {h?.toDoc || "N/A"}</Pill>,
                  <Pill key={`hs-by-${i}`}>Transfer by: Dr. {h?.fromDoc || "N/A"}</Pill>,
                ],
                actor: `Dr. ${h?.fromDoc || "N/A"}`,
              });
            }
          });
          break;

        case "operationTheatreDetails":
          timeline?.operationTheatreDetails?.forEach((ot: any, i: number) => {
            const tagText = getTagText(ot);
            const when = ot?.scheduleTime || ot?.approvedTime || ot?.rejectedTime || ot?.addedOn;
            const blocks: React.ReactNode[] = [
              <Pill key={`ot-type-${i}`}>Type of Surgery: {ot?.surgeryType || "N/A"}</Pill>,
              <Pill key={`ot-urg-${i}`}>Surgery Urgency: {ot?.patientType || "N/A"}</Pill>,
            ];

            if (ot?.scope === "surgon") {
              blocks.push(<Pill key={`ot-stat-${i}`}>Surgery Status: {ot?.status || "N/A"}</Pill>);
              blocks.push(<Pill key={`ot-date-${i}`}>Date Of Surgery: {format(ot?.scheduleTime)}</Pill>);
              blocks.push(<Pill key={`ot-by-${i}`}>Scheduled By: {ot?.approvedBy || "N/A"}</Pill>);
            }

            if (ot?.status === "pending") {
              blocks.push(<Pill key={`ot-pend-${i}`}>Surgery Status: Pending</Pill>);
              blocks.push(<Pill key={`ot-req-${i}`}>Request Date: {format(ot?.addedOn)}</Pill>);
            }

            if (ot?.scope === "anesthetic") {
              if (ot?.status === "rejected") {
                blocks.push(<Pill key={`ot-r1-${i}`}>Surgery Status: Rejected</Pill>);
                blocks.push(<Pill key={`ot-r2-${i}`}>Rejection Reason: {ot?.rejectReason || "N/A"}</Pill>);
                blocks.push(<Pill key={`ot-r3-${i}`}>Rejected Date: {format(ot?.rejectedTime)}</Pill>);
                blocks.push(<Pill key={`ot-r4-${i}`}>Rejected By: {ot?.approvedBy || "N/A"}</Pill>);
              }
              if (ot?.status === "approved" || ot?.status === "scheduled") {
                blocks.push(<Pill key={`ot-a1-${i}`}>Surgery Status: Approved</Pill>);
                blocks.push(<Pill key={`ot-a2-${i}`}>Approved Date: {format(ot?.approvedTime)}</Pill>);
                blocks.push(<Pill key={`ot-a3-${i}`}>Approved By: {ot?.approvedBy || "N/A"}</Pill>);
              }
            }

            list.push({
              tagText,
              tagColor: "#A094D9",
              when: format(when),
              infoBlocks: blocks,
              actor: ot?.approvedBy || "N/A",
            });
          });
          break;

        case "diagnosis":
          list.push({
            tagText: timeline?.patientStartStatus
              ? getDepartment(timeline?.patientStartStatus)
              : "N/A",
            tagColor: colorObj[timeline?.patientStartStatus || 1],
            when: format(timeline?.endTime),
            infoBlocks: [
              <Pressable key="diag-press" onPress={() => setDiagHintVisible((v) => !v)}>
                <Text style={[styles.link]}>Diagnosis data is available</Text>
              </Pressable>,
              diagHintVisible ? (
                <Text key="diag-hint" style={styles.diagHint}>
                  (Hook this to navigate to your Diagnosis screen)
                </Text>
              ) : null,
            ],
            clickable: true,
            actor: timeline?.addedBy,
          });
          break;

        case "revisit":
          list.push({
            tagText: timeline?.patientStartStatus
              ? getDepartment(timeline?.patientStartStatus)
              : "Revisit",
            tagColor: colorObj[timeline?.patientStartStatus || 1],
            when: format(timeline?.startTime),
            infoBlocks: [
              <Pill key="rv-1">Revisit to: {getDepartment(timeline?.patientStartStatus)}</Pill>,
              <Pill key="rv-2">Revisited by: {timeline?.addedBy || "N/A"}</Pill>,
            ],
            actor: timeline?.addedBy,
          });
          break;

        case "isFollowUp":
          list.push({
            tagText: timeline?.isFollowUp
              ? getDepartment(timeline?.isFollowUp?.patientStartStatus)
              : "Follow Up",
            tagColor: colorObj[timeline?.patientStartStatus || 1],
            when: format(timeline?.isFollowUp?.followUpDate),
            infoBlocks: [
              <Pill key="fu-1">Follow Up by: {timeline?.addedBy || "N/A"}</Pill>,
            ],
            actor: timeline?.addedBy,
          });
          break;

        case "discharge":
          list.push({
            tagText: "Discharged",
            tagColor: colorObj[21],
            when: format(timeline?.endTime),
            infoBlocks: [
              <Pill key="dc-1">Patient Discharged</Pill>,
              <Pill key="dc-2">
                Discharged by: {timeline?.doctorDetails?.doctorName || "N/A"}
              </Pill>,
            ],
            actor: timeline?.doctorDetails?.doctorName,
          });
          break;

        case "externalTransferDetails":
          if (timeline?.externalTransferDetails?.length) {
            const x = timeline.externalTransferDetails[0];
            list.push({
              tagText: "External Transfer",
              tagColor: "#D792EE",
              when: format(x?.transferDate),
              infoBlocks: [
                <Pill key="ext-1">
                  Patient Transferred from {x?.fromhospitalName} to {x?.tohospitalName}
                </Pill>,
                <Pill key="ext-2">Transfer by: {x?.fromDoc}</Pill>,
              ],
              actor: x?.fromDoc,
            });
          }
          break;

        default:
          break;
      }
    });

    return list;
  }, [timeline, index, diagHintVisible]);

  return (
    <View style={[styles.card, { borderColor: COLORS.border }]}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableTitle}>Visit #{index + 1}</Text>
      </View>

      <View style={styles.table}>
        {/* Header */}
        <View style={styles.thead}>
          <Text style={[styles.th, { flex: 1.2 }]}>Tag</Text>
          <Text style={[styles.th, { flex: 2.4 }]}>Details</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>When</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>By / To</Text>
        </View>

        {/* Rows */}
        {rows.map((row, i) => (
          <View key={i} style={styles.tr}>
            {/* Tag */}
            <View style={[styles.td, { flex: 1.2 }]}>
              <View
                style={[
                  styles.tag,
                  row.isHandshake
                    ? styles.tagHandshake
                    : { backgroundColor: row.tagColor || COLORS.chip },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    row.isHandshake ? { color: COLORS.tagHandshake } : null,
                  ]}
                >
                  {row.tagText}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View style={[styles.td, { flex: 2.4 }]}>
              <View style={{ gap: 6 }}>{row.infoBlocks}</View>
            </View>

            {/* When */}
            <View style={[styles.td, { flex: 1.2 }]}>
              <Text style={styles.muted}>{row.when}</Text>
            </View>

            {/* By / To */}
            <View style={[styles.td, { flex: 1.2 }]}>
              <Text style={styles.muted}>{row.actor || "-"}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 12,
  },

  tableHeader: { marginBottom: 8 },
  tableTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text },

  table: { borderRadius: 12, overflow: "hidden" },
  thead: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#f1f5f9",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  th: { fontSize: 12, fontWeight: "900", color: COLORS.text },

  tr: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: "#fff",
  },
  td: { justifyContent: "center", paddingRight: 8 },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  tagText: { fontWeight: "900", fontSize: 12, color: COLORS.text },
  tagHandshake: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderStyle: "dotted",
    borderColor: COLORS.tagHandshake,
  },

  pill: {
    backgroundColor: COLORS.chip,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  pillText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },

  link: { color: COLORS.brand, fontWeight: "900", textDecorationLine: "underline" },
  diagHint: { marginTop: 4, color: COLORS.sub, fontWeight: "700", fontSize: 12 },

  muted: { color: COLORS.sub, fontWeight: "700", fontSize: 12 },
});
