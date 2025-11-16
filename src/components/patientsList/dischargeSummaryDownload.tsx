import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { X, Download } from "lucide-react-native";
import RNHTMLtoPDF from "react-native-html-to-pdf"; // for v0.12.0

import { showError } from "../../store/toast.slice";
import { useDispatch } from "react-redux";

type SectionKey =
  | "patientInfo"
  | "symptoms"
  | "vitals"
  | "vitalAlerts"
  | "medicalHistory"
  | "previousMedications"
  | "tests"
  | "reminders";

type Props = {
  visible: boolean;
  onClose: () => void;
  colors: any;
  patient?: any;
  vitalAlert: any[];
  reminder: any[];
  medicalHistory: any        
  previousMedHistoryList: any[]; 
  symptoms: any[];
  vitalFunction: any;            
  tests: any[];
};

const sectionsList: { key: SectionKey; label: string }[] = [
  { key: "patientInfo", label: "Patient Info" },
  { key: "symptoms", label: "Symptoms" },
  { key: "vitals", label: "Vitals Snapshot" },
  { key: "vitalAlerts", label: "Vital Alerts" },
  { key: "medicalHistory", label: "Medical History" },
  { key: "previousMedications", label: "Previous Medications" },
  { key: "tests", label: "Tests Summary" },
  { key: "reminders", label: "Medication Reminders" },
];

const DischargeSummarySheet: React.FC<Props> = ({
  visible,
  onClose,
  colors,
  patient,
  vitalAlert,
  reminder,
  medicalHistory,
  previousMedHistoryList,
  symptoms,
  vitalFunction,
  tests,
}) => {
  const [selected, setSelected] = useState<SectionKey[]>(
    sectionsList.map((s) => s.key) // select all by default
  );
  const dispatch = useDispatch();
  const [creating, setCreating] = useState(false);
  const genderText = useMemo(() => {
    if (!patient?.gender) return "—";
    return patient.gender === 1 ? "Male" : "Female";
  }, [patient?.gender]);

  const ageText = useMemo(() => {
    if (!patient?.dob) return "";
    const d = new Date(patient.dob);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
    if (y >= 2) return `${y}y`;
    let months = y * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months--;
    if (months <= 0) {
      const days = Math.max(
        0,
        Math.floor((now.getTime() - d.getTime()) / 86400000)
      );
      return `${days}d`;
    }
    return `${months}m`;
  }, [patient?.dob]);

  const dobText = useMemo(() => {
    if (!patient?.dob) return "—";
    const date = new Date(patient.dob);
    if (isNaN(date.getTime())) return "—";
    const day = date.getDate();
    const monthNames = [
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
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }, [patient?.dob]);

  const doctorText = useMemo(() => {
    if (patient?.doctorName) {
      const d = patient.doctorName;
      return `Dr. ${d.slice(0, 1).toUpperCase()}${d.slice(1).toLowerCase()}`;
    }
    if (patient?.firstName) {
      const f = patient.firstName;
      const l = patient?.lastName || "";
      return `Dr. ${f.slice(0, 1).toUpperCase()}${f
        .slice(1)
        .toLowerCase()} ${l}`;
    }
    return "—";
  }, [patient?.doctorName, patient?.firstName, patient?.lastName]);

  const toggleSection = (key: SectionKey) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const buildHtml = () => {
    const safe = (v: any) =>
      v === null || v === undefined || v === "" ? "-" : String(v);

    const fmtDate = (val?: string) => {
      if (!val) return "-";
      const d = new Date(val);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleString();
    };

    // ------------- PATIENT INFO -------------
    const patientInfoHtml = selected.includes("patientInfo")
      ? `
      <div class="section">
        <h2>Patient Information</h2>
        <table>
          <tr><th>UHID</th><td>${safe(patient?.pUHID)}</td></tr>
          <tr><th>Name</th><td>${safe(patient?.pName)}</td></tr>
          <tr><th>Gender / Age</th><td>${safe(
            genderText
          )} ${ageText ? `, ${ageText}` : ""}</td></tr>
          <tr><th>DOB</th><td>${dobText}</td></tr>
          <tr><th>Doctor</th><td>${safe(doctorText)}</td></tr>
          <tr><th>Department</th><td>${safe(patient?.department)}</td></tr>
          <tr><th>Phone</th><td>${safe(patient?.phoneNumber)}</td></tr>
          <tr><th>Address</th><td>${safe(
            `${patient?.address || ""}, ${patient?.city || ""}, ${
              patient?.state || ""
            } - ${patient?.pinCode || ""}`
          )}</td></tr>
        </table>
      </div>`
      : "";

    // ------------- SYMPTOMS -------------
    const symptomsHtml = selected.includes("symptoms")
      ? `
      <div class="section">
        <h2>Symptoms</h2>
        ${
          symptoms && symptoms.length
            ? `<ul>${symptoms
                .map((s: any) => `<li>${safe(s?.symptom || s?.name)}</li>`)
                .join("")}</ul>`
            : `<p class="muted">No symptoms recorded.</p>`
        }
      </div>`
      : "";

    // ------------- VITALS SNAPSHOT -------------
    const vf = vitalFunction || {};
    const vitalsRows: string[] = [];

    if (vf.pulse) {
      vitalsRows.push(
        `<tr><th>Pulse (bpm)</th><td>Avg: ${safe(
          vf.pulse.avgPulse
        )}, Min: ${safe(vf.pulse.minPulse)}, Max: ${safe(
          vf.pulse.maxPulse
        )}</td></tr>`
      );
    }
    if (vf.oxygen) {
      vitalsRows.push(
        `<tr><th>Oxygen Saturation (%)</th><td>Avg: ${safe(
          vf.oxygen.avgOxygen
        )}, Min: ${safe(vf.oxygen.minOxygen)}, Max: ${safe(
          vf.oxygen.maxOxygen
        )}</td></tr>`
      );
    }
    if (vf.temperature) {
      vitalsRows.push(
        `<tr><th>Temperature (°C)</th><td>Avg: ${safe(
          vf.temperature.avgTemperature
        )}, Min: ${safe(vf.temperature.minTemperature)}, Max: ${safe(
          vf.temperature.maxTemperature
        )}</td></tr>`
      );
    }
    if (vf.bp) {
      vitalsRows.push(
        `<tr><th>Blood Pressure</th><td>Avg: ${safe(
          vf.bp.avgBp
        )}, Min: ${safe(vf.bp.minBp)}, Max: ${safe(vf.bp.maxBp)}</td></tr>`
      );
    }
    if (vf.respiratoryRate) {
      vitalsRows.push(
        `<tr><th>Respiratory Rate</th><td>Avg: ${safe(
          vf.respiratoryRate.avgRespiratoryRate
        )}, Min: ${safe(
          vf.respiratoryRate.minRespiratoryRate
        )}, Max: ${safe(
          vf.respiratoryRate.maxRespiratoryRate
        )}</td></tr>`
      );
    }
    if (vf.hrv) {
      vitalsRows.push(
        `<tr><th>Heart Rate Variability (HRV)</th><td>Avg: ${safe(
          vf.hrv.avgHRV
        )}, Min: ${safe(vf.hrv.minHRV)}, Max: ${safe(
          vf.hrv.maxHRV
        )}</td></tr>`
      );
    }

    const vitalsHtml = selected.includes("vitals")
      ? `
      <div class="section">
        <h2>Vitals Snapshot</h2>
        ${
          vitalsRows.length
            ? `<table>${vitalsRows.join("")}</table>`
            : `<p class="muted">No vitals recorded.</p>`
        }
      </div>`
      : "";

    // ------------- VITAL ALERTS -------------
    const vitalAlertsHtml = selected.includes("vitalAlerts")
      ? `
      <div class="section">
        <h2>Vital Alerts</h2>
        ${
          vitalAlert && vitalAlert.length
            ? `
          <table>
            <tr><th>Time</th><th>Message</th></tr>
            ${vitalAlert
              .map(
                (a: any) =>
                  `<tr><td>${fmtDate(a?.addedOn || a?.time)}</td><td>${safe(
                    a?.message || a?.alert || a?.note
                  )}</td></tr>`
              )
              .join("")}
          </table>`
            : `<p class="muted">No alerts recorded.</p>`
        }
      </div>`
      : "";

    // ------------- MEDICAL HISTORY (from medicalHistory[0]) -------------
    const medObj =
      Array.isArray(medicalHistory) && medicalHistory.length
        ? medicalHistory
        : null;

    const medHistoryRows: string[] = [];
    if (medicalHistory) {
      const addRow = (label: string, value: any) => {
        if (value !== null && value !== undefined && String(value).trim()) {
          medHistoryRows.push(
            `<tr><th>${label}</th><td>${safe(value)}</td></tr>`
          );
        }
      };

      addRow("Blood Group", medicalHistory.bloodGroup);
      addRow("Blood Pressure", medicalHistory.bloodPressure);
      addRow("Heart Problems", medicalHistory.heartProblems);
      addRow("Cancer", medicalHistory.cancer);
      addRow("Infections", medicalHistory.infections);
      addRow("Chronic Disease", medicalHistory.disease);
      addRow("Hereditary Diseases", medicalHistory.hereditaryDisease);
      addRow("Food Allergy", medicalHistory.foodAllergy);
      addRow("Medicine Allergy", medicalHistory.medicineAllergy);
      addRow("Neurological Disorder", medicalHistory.neurologicalDisorder);
      addRow("Mental Health", medicalHistory.mentalHealth);
      addRow("Lumps / Swellings", medicalHistory.lumps);
      addRow("Anaesthesia History", medicalHistory.anaesthesia);
      addRow("Pregnancy History", medicalHistory.pregnant);
      addRow("Family Disease", medicalHistory.familyDisease);
    }

    const medHistoryHtml = selected.includes("medicalHistory")
      ? `
      <div class="section">
        <h2>Medical History</h2>
        ${
          medHistoryRows.length
            ? `<table>${medHistoryRows.join("")}</table>`
            : `<p class="muted">No medical history recorded.</p>`
        }
      </div>`
      : "";

    // ------------- PREVIOUS MEDICATIONS -------------
    const previousMedRows: string[] = [];

    if (previousMedHistoryList && previousMedHistoryList.length) {
      // If you have structured meds list, keep old table:
      previousMedHistoryList.forEach((m: any) => {
        previousMedRows.push(`
          <tr>
            <td>${safe(m?.medicineName || m?.name)}</td>
            <td>${safe(m?.dosage)}</td>
            <td>${safe(m?.duration)}</td>
          </tr>
        `);
      });
    } else if (medicalHistory) {
      // Fallback to combined fields from medicalHistory[0]
      if (medicalHistory.meds) {
        previousMedRows.push(
          `<tr><td colspan="3"><b>Regular Medications</b>: ${safe(
            medicalHistory.meds
          )}</td></tr>`
        );
      }
      if (medicalHistory.selfMeds) {
        previousMedRows.push(
          `<tr><td colspan="3"><b>Self Medications</b>: ${safe(
            medicalHistory.selfMeds
          )}</td></tr>`
        );
      }
    }

    const previousMedHtml = selected.includes("previousMedications")
      ? `
      <div class="section">
        <h2>Previous Medications</h2>
        ${
          previousMedRows.length
            ? `
          <table>
            <tr><th>Medicine</th><th>Dosage</th><th>Duration / Notes</th></tr>
            ${previousMedRows.join("")}
          </table>`
            : `<p class="muted">No previous medication history.</p>`
        }
      </div>`
      : "";

    // ------------- TESTS -------------
    const testsHtml = selected.includes("tests")
      ? `
      <div class="section">
        <h2>Tests Summary</h2>
        ${
          tests && tests.length
            ? `
          <table>
            <tr><th>Test</th><th>Category</th><th>Status</th></tr>
            ${tests
              .map(
                (t: any) => `
                <tr>
                  <td>${safe(t?.testName || t?.name)}</td>
                  <td>${safe(t?.category)}</td>
                  <td>${safe(t?.status || t?.resultStatus)}</td>
                </tr>`
              )
              .join("")}
          </table>`
            : `<p class="muted">No tests recorded.</p>`
        }
      </div>`
      : "";

    // ------------- REMINDERS -------------
    const remindersHtml = selected.includes("reminders")
      ? `
      <div class="section">
        <h2>Medication Reminders</h2>
        ${
          reminder && reminder.length
            ? `
          <table>
            <tr><th>Time</th><th>Medicine</th><th>Note</th></tr>
            ${reminder
              .map(
                (r: any) => `
                <tr>
                  <td>${fmtDate(r?.dosageTime)}</td>
                  <td>${safe(r?.medicineName || r?.name)}</td>
                  <td>${safe(r?.note)}</td>
                </tr>`
              )
              .join("")}
          </table>`
            : `<p class="muted">No reminders configured.</p>`
        }
      </div>`
      : "";

    // ------------- FINAL HTML -------------
    const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", sans-serif;
            padding: 16px;
            color: #0f172a;
            font-size: 12px;
          }
          h1 {
            font-size: 20px;
            margin-bottom: 4px;
          }
          h2 {
            font-size: 14px;
            margin: 16px 0 6px;
          }
          .muted {
            color: #6b7280;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 4px 6px;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
          }
          .section {
            margin-bottom: 12px;
          }
          .meta {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <h1>Discharge Summary</h1>
        <div class="meta">
          Generated on: ${new Date().toLocaleString()}<br/>
          Hospital UHID: ${safe(patient?.pUHID)}
        </div>
        ${patientInfoHtml}
        ${symptomsHtml}
        ${vitalsHtml}
        ${vitalAlertsHtml}
        ${medHistoryHtml}
        ${previousMedHtml}
        ${testsHtml}
        ${remindersHtml}
      </body>
    </html>
    `;

    return html;
  };

  const handleDownload = async () => {
    if (!selected.length) {
      Alert.alert("Select Sections", "Please select at least one section.");
      return;
    }
    if (!patient) {
      Alert.alert("No Patient", "Patient data is not loaded.");
      return;
    }

    setCreating(true);

    try {
      const html = buildHtml();
      const fileName = `discharge_${patient?.pUHID || patient?.id || "summary"}`;

      const options = {
        html,
        fileName,
        directory: "Documents",
        base64: false,
      };

      const file = await RNHTMLtoPDF.convert(options);

      if (!file?.filePath) {
        Alert.alert("Error", "Failed to generate PDF.");
        return;
      }

      const path = file.filePath;
      const url = path.startsWith("file://") ? path : `file://${path}`;

      Alert.alert("PDF Saved", `Saved to:\n${path}`, [
        {
          text: "Open",
          onPress: () => {
            Linking.openURL(url).catch(() => {
              Alert.alert("Error", "Unable to open PDF on this device.");
            });
          },
        },
        { text: "OK", style: "cancel" },
      ]);

      onClose();
    } catch (error: any) {
      dispatch(showError(error?.message || "Failed to generate PDF"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.overlay} onPress={onClose} />
      <View
        style={[
          sheetStyles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            sheetStyles.sheetHeader,
            { borderBottomColor: colors.border },
          ]}
        >
          <Text
            style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}
          >
            Discharge Summary
          </Text>
          <Pressable onPress={onClose} hitSlop={6}>
            <X size={18} color={colors.sub} />
          </Pressable>
        </View>

        <ScrollView
          style={{ maxHeight: 360 }}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
        >
          <Text style={{ color: colors.sub, marginBottom: 8, fontSize: 12 }}>
            Select which sections to include in the summary.
          </Text>

          {sectionsList.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => toggleSection(s.key)}
              style={[
                styles.pillBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: selected.includes(s.key)
                    ? colors.button
                    : colors.pill,
                  marginBottom: 8,
                },
              ]}
            >
              <Text
                style={{
                  color: selected.includes(s.key)
                    ? colors.buttonText
                    : colors.text,
                  fontWeight: "700",
                }}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 12,
            paddingBottom: 10,
            paddingTop: 4,
          }}
        >
          <Pressable
            onPress={onClose}
            style={[
              styles.sheetBtn,
              { backgroundColor: colors.pill, flex: 1 },
            ]}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDownload}
            disabled={creating}
            style={[
              styles.sheetBtn,
              {
                backgroundColor: colors.button,
                opacity: creating ? 0.7 : 1,
                flex: 1.2,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              },
            ]}
          >
            <Download size={16} color={colors.buttonText} />
            <Text style={{ color: colors.buttonText, fontWeight: "700" }}>
              {creating ? "Creating..." : "Download PDF"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  sheetBtn: {
    borderRadius: 12,
    paddingVertical: 12,
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
  },
  sheetHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default DischargeSummarySheet;
