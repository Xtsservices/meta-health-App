// src/screens/billing/InvoiceDownloadModal.tsx

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
   Platform,
} from "react-native";
import { X, Download } from "lucide-react-native";
import RNHTMLtoPDF from "react-native-html-to-pdf"; // v0.12.0
import { useDispatch } from "react-redux";

import { COLORS } from "../../../utils/colour";
import { FONT_SIZE, SPACING } from "../../../utils/responsive";
import { formatDateTime } from "../../../utils/dateTime";
import { PatientData } from "./taxInvoiceTabs";
import { showError, showSuccess } from "../../../store/toast.slice";

type Props = {
  visible: boolean;
  onClose: () => void;
  invoice: PatientData;
  grandTotal: number;
};

const InvoiceDownloadModal: React.FC<Props> = ({
  visible,
  onClose,
  invoice,
  grandTotal,
}) => {
  const dispatch = useDispatch();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const patientName = invoice.pName || "";
      const doctorName = `${invoice.firstName || ""} ${
        invoice.lastName || ""
      }`.trim();
      const dept = invoice.dept || "";
      const pType = invoice.pType || "";
      const patientID = invoice.patientID || "";
      const addedOn = invoice.addedOn ? formatDateTime(invoice.addedOn) : "";
      const admissionDate = invoice.admissionDate
        ? formatDateTime(invoice.admissionDate)
        : "";

      const medRows = (invoice.medicinesList || [])
        .map(
          (m) => `
          <tr>
            <td>${m.name || ""}</td>
            <td>${m.qty || 0}</td>
            <td>${m.hsn || ""}</td>
            <td>₹${(m.price || 0).toFixed(2)}</td>
            <td>${m.gst || 0}%</td>
            <td>₹${(m.amount * (m.qty || 1)).toFixed(2)}</td>
          </tr>`
        )
        .join("");

      const testRows = (invoice.testList || [])
        .map(
          (t) => `
          <tr>
            <td>${t.testName || ""}</td>
            <td>${t.loinc_num_ || ""}</td>
            <td>${t.category || ""}</td>
            <td>₹${(t.price || 0).toFixed(2)}</td>
            <td>${t.gst || 0}%</td>
            
          </tr>`
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Tax Invoice</title>
            <style>
              * { box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
                margin: 0;
                padding: 16px;
                font-size: 12px;
                color: #111827;
              }
              .header {
                text-align: center;
                margin-bottom: 16px;
              }
              .header h1 {
                margin: 0;
                font-size: 18px;
              }
              .header h2 {
                margin: 4px 0 0;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 1px;
              }
              .section {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 10px 12px;
                margin-bottom: 12px;
              }
              .section-title {
                font-weight: 700;
                margin-bottom: 6px;
                font-size: 13px;
              }
              .row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
              }
              .label {
                color: #6b7280;
                font-size: 11px;
              }
              .value {
                font-size: 11px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6px;
              }
              th, td {
                border: 1px solid #e5e7eb;
                padding: 4px 6px;
                font-size: 10px;
              }
              th {
                background: #f3f4f6;
                text-align: left;
              }
              .totals {
                display: flex;
                justify-content: flex-end;
                margin-top: 8px;
                font-size: 12px;
              }
              .grand-label {
                font-weight: 600;
                margin-right: 6px;
              }
              .grand-value {
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Tax Invoice</h1>
              <h2>Billing Summary</h2>
            </div>

            <div class="section">
              <div class="section-title">Patient Summary</div>
              <div class="row">
                <div class="label">Name</div>
                <div class="value">${patientName}</div>
              </div>
              <div class="row">
                <div class="label">Patient ID</div>
                <div class="value">${patientID}</div>
              </div>
              <div class="row">
                <div class="label">Department</div>
                <div class="value">${dept}</div>
              </div>
              <div class="row">
                <div class="label">Type</div>
                <div class="value">${pType}</div>
              </div>
              ${
                doctorName
                  ? `
              <div class="row">
                <div class="label">Doctor</div>
                <div class="value">${doctorName}</div>
              </div>`
                  : ""
              }
              ${
                addedOn
                  ? `
              <div class="row">
                <div class="label">Added On</div>
                <div class="value">${addedOn}</div>
              </div>`
                  : ""
              }
              ${
                admissionDate
                  ? `
              <div class="row">
                <div class="label">Admission Date</div>
                <div class="value">${admissionDate}</div>
              </div>`
                  : ""
              }
            </div>

            ${
              medRows
                ? `
            <div class="section">
              <div class="section-title">Medicines (${
                invoice.medicinesList?.length || 0
              })</div>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>HSN</th>
                    <th>Price</th>
                    <th>GST</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${medRows}
                </tbody>
              </table>
            </div>`
                : ""
            }

            ${
              testRows
                ? `
            <div class="section">
              <div class="section-title">Lab Tests (${
                invoice.testList?.length || 0
              })</div>
              <table>
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>LOINC</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>GST</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${testRows}
                </tbody>
              </table>
            </div>`
                : ""
            }

            <div class="section">
              <div class="section-title">Totals</div>
              <div class="totals">
                <span class="grand-label">Grand Total:</span>
                <span class="grand-value">₹${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </body>
        </html>
      `;

      const file = await RNHTMLtoPDF.convert({
        html,
        fileName: `Tax_Invoice_${patientID || "invoice"}`,
        directory: "Documents",
      });

            //    const file = await RNHTMLtoPDF.convert(options);

    if (file.filePath) {
      // ✅ Only show success with file location, don't try to open
      dispatch(
        showSuccess(
          `Invoice PDF saved successfully.\nLocation: ${file.filePath}`
        )
      );
      onClose();
    } else {
      dispatch(showError("Unable to generate invoice PDF."));
    }



    } catch (err) {
      dispatch(showError("Failed to generate invoice PDF."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.heading}>Download Tax Invoice</Text>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <X size={18} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 260 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.summaryLine}>
              Patient:{" "}
              <Text style={styles.summaryValue}>{invoice.pName}</Text>
            </Text>
            <Text style={styles.summaryLine}>
              Patient ID:{" "}
              <Text style={styles.summaryValue}>{invoice.patientID}</Text>
            </Text>
            {invoice.dept ? (
              <Text style={styles.summaryLine}>
                Department:{" "}
                <Text style={styles.summaryValue}>{invoice.dept}</Text>
              </Text>
            ) : null}
            {invoice.pType ? (
              <Text style={styles.summaryLine}>
                Type:{" "}
                <Text style={styles.summaryValue}>{invoice.pType}</Text>
              </Text>
            ) : null}
            {grandTotal > 0 && (
              <Text style={[styles.summaryLine, { marginTop: SPACING.sm }]}>
                Grand Total:{" "}
                <Text style={styles.summaryValue}>
                  ₹{grandTotal.toFixed(2)}
                </Text>
              </Text>
            )}
          </ScrollView>

          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
            <Pressable
              style={[
                styles.downloadBtn,
                downloading && { opacity: 0.6 },
              ]}
              disabled={downloading}
              onPress={handleDownload}
            >
              <Download size={18} color="#fff" />
              <Text style={styles.downloadText}>
                {downloading ? "Generating..." : "Download PDF"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default InvoiceDownloadModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  heading: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  iconBtn: {
    padding: 4,
  },
  summaryLine: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: 4,
  },
  summaryValue: {
    color: COLORS.text,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: SPACING.md,
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  downloadBtn: {
    flex: 2,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  downloadText: {
    color: "#fff",
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    marginLeft: 6,
  },
});
