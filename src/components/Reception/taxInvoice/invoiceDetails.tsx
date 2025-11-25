// src/screens/billing/InvoiceDetailsMobile.tsx

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";

import { FONT_SIZE, FOOTER_HEIGHT, SPACING } from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { PatientData } from "./taxInvoiceTabs";
import { Download } from "lucide-react-native";
import InvoiceDownloadModal from "./invoiceDownload";

const FOOTER_H = FOOTER_HEIGHT || 70;

type RouteParams = {
  invoice: PatientData;
  source?: "billing" | "allTax";
};

const InvoiceDetailsMobile: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const { invoice, source }: RouteParams = route.params;
  const isBillingSource = source === "billing";
  const medsTotal = useMemo(() => {
    return (invoice.medicinesList || []).reduce(
      (sum, m) => sum + (m.amount * (m.qty || 1)),
      0
    );
  }, [invoice.medicinesList]);

  const testsTotal = useMemo(() => {
    return (invoice.testList || []).reduce(
      (sum, t) => sum + (t.amount ?? t.price),
      0
    );
  }, [invoice.testList]);

    const grandTotal = medsTotal + testsTotal;

  // 🔹 read only paidAmount from invoice
  const rawPaid = (invoice as any)?.paidAmount;

  const hasSplitAmounts =
    rawPaid !== undefined &&
    rawPaid !== null &&
    !isNaN(Number(rawPaid));

  const numericPaid = hasSplitAmounts ? Number(rawPaid) : 0;

  // 🔹 if paid is 0 → show full grandTotal as due
  const paidAmount = numericPaid > 0 ? numericPaid : 0;

  // 🔹 due = grandTotal - paid (or full grandTotal when paid is 0)
  const dueAmount =
    numericPaid > 0
      ? Math.max(0, grandTotal - numericPaid)
      : grandTotal;

  // 🔹 this is the amount sent to PaymentScreen
  const payableAmount = hasSplitAmounts ? dueAmount : grandTotal;

  const handlePayPress = () => {
    navigation.navigate("PaymentScreen", {
      amount: payableAmount,
      receptionData: invoice,
      department: invoice.dept,
      orderData: {
        patientID: invoice.patientID,
        ptype: invoice.pType,
      },
      user,
    });
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: COLORS.bg,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {/* Header with Download button */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: COLORS.text }]}>
            Invoice Details
          </Text>
          <Text style={[styles.subtitle, { color: COLORS.sub }]}>
            {invoice.pName} • {invoice.patientID}
          </Text>
        </View>
{!isBillingSource && (


        <TouchableOpacity
          style={styles.downloadChip}
          activeOpacity={0.85}
          onPress={() => setShowDownloadModal(true)}
        >
          <Download size={16} color="#fff" />
          <Text style={styles.downloadChipText}>PDF</Text>
        </TouchableOpacity>)}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: SPACING.md,
          paddingBottom: FOOTER_H + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient info card */}
        <View style={[styles.card, { backgroundColor: COLORS.card }]}>
          <Text style={styles.sectionTitle}>Patient Summary</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{invoice.pName}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Patient ID</Text>
            <Text style={styles.value}>{invoice.patientID}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>{invoice.dept}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{invoice.pType || "-"}</Text>
          </View>

          {(invoice.firstName || invoice.lastName) && (
            <View style={styles.row}>
              <Text style={styles.label}>Doctor</Text>
              <Text style={styles.value}>
                {`${invoice.firstName || ""} ${
                  invoice.lastName || ""
                }`.trim()}
              </Text>
            </View>
          )}

          {invoice.category && (
            <View style={styles.row}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.value}>{invoice.category}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Added On</Text>
            <Text style={styles.value}>
              {invoice.addedOn ? formatDateTime(invoice.addedOn) : "—"}
            </Text>
          </View>

          {invoice?.admissionDate ? (
            <View style={styles.row}>
              <Text style={styles.label}>Admission Date</Text>
              <Text style={styles.value}>
                {formatDateTime(invoice.admissionDate)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Medicines section */}
        {invoice?.medicinesList && invoice?.medicinesList.length > 0 && (
          <View style={[styles.card, { backgroundColor: COLORS.card }]}>
            <Text style={styles.sectionTitle}>
              Medicines ({invoice.medicinesList.length})
            </Text>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 2 }]}>Name</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                Qty
              </Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
                Amount
              </Text>
            </View>

            {invoice.medicinesList.map((m, idx) => (
              <View key={String(m.id) + idx} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdMain}>{m.name}</Text>
                  {m.hsn ? (
                    <Text style={styles.tdSub}>HSN: {m.hsn}</Text>
                  ) : null}
                  <Text style={styles.tdSub}>
                    Price: ₹{m.price.toFixed(2)} • GST: {m.gst}%{" "}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={styles.tdMain}>{m.qty}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.tdMain}>
                    ₹{(m.amount * (m.qty || 1)).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Medicines Total</Text>
              <Text style={styles.totalValue}>₹{medsTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Tests section */}
        {invoice.testList && invoice.testList.length > 0 && (
          <View style={[styles.card, { backgroundColor: COLORS.card }]}>
            <Text style={styles.sectionTitle}>
              Lab Tests ({invoice.testList.length})
            </Text>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 2 }]}>Test</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
                Amount
              </Text>
            </View>

            {invoice.testList.map((t, idx) => (
              <View key={String(t.testID) + idx} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdMain}>{t.testName}</Text>
                  <Text style={styles.tdSub}>
                    Price: ₹{t.price.toFixed(2)} • GST: {t.gst}%{" "}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.tdMain}>
                    ₹{(t.amount ?? t.price).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tests Total</Text>
              <Text style={styles.totalValue}>₹{testsTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Grand total */}
                {/* Grand total */}
        <View style={[styles.card, { backgroundColor: COLORS.card }]}>
          <Text style={styles.sectionTitle}>Grand Total</Text>

          {hasSplitAmounts ? (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>
                  ₹{grandTotal.toFixed(2)}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid Amount</Text>
                <Text style={styles.totalValue}>
                  ₹{paidAmount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Due Amount</Text>
                <Text style={styles.totalValue}>
                  ₹{payableAmount.toFixed(2)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {isBillingSource && "Payable"} Amount
              </Text>
              <Text style={styles.totalValue}>
                ₹{grandTotal.toFixed(2)}
              </Text>
            </View>
          )}
        </View>


        {/* Pay button for Billing source */}
        {isBillingSource && grandTotal > 0 && (
          <View style={styles.payButtonContainer}>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: COLORS.brand }]}
              onPress={handlePayPress}
              activeOpacity={0.85}
            >
              <Text style={styles.payButtonText}>
                Pay ₹{payableAmount.toFixed(2)}
              </Text>
            </TouchableOpacity>
            <Text style={styles.payHint}>
              You’ll be redirected to the secure payment screen.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Download PDF modal */}
      <InvoiceDownloadModal
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        invoice={invoice}
        grandTotal={grandTotal}
      />

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"billing"} brandColor={COLORS.brand} />
      </View>
    </View>
  );
};

export default InvoiceDetailsMobile;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
  },
  downloadChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: SPACING.sm,
  },
  downloadChipText: {
    color: "#fff",
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    marginLeft: 4,
  },
  scroll: {
    flex: 1,
  },
  card: {
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
  },
  value: {
    fontSize: FONT_SIZE.xs,
    color: "#111827",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
    marginBottom: 4,
  },
  th: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: "#4B5563",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tdMain: {
    fontSize: FONT_SIZE.xs,
    color: "#111827",
    fontWeight: "500",
  },
  tdSub: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
  },
  totalRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#111827",
  },
  totalValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.brandDark,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
  payButtonContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: "center",
  },
  payButton: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonText: {
    color: "#fff",
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  payHint: {
    marginTop: 6,
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
  },
});
