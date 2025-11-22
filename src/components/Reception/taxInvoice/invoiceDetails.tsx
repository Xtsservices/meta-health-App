// src/screens/billing/InvoiceDetailsMobile.tsx

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT_SIZE, FOOTER_HEIGHT, SPACING } from "../../../utils/responsive";
import { PatientData } from "./allTaxInvoice";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";


const FOOTER_H = FOOTER_HEIGHT || 70;

type RouteParams = {
  invoice: PatientData;
  source?: "billing" | "allTax";
};

const InvoiceDetailsMobile: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { invoice, source }: RouteParams = route.params;

  const medsTotal = useMemo(() => {
    return (invoice.medicinesList || []).reduce(
      (sum, m) => sum + ( m.amount * (m.qty || 1)),
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
console.log(invoice, "pressenr invoice details")
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: COLORS.bg, paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      {/* Simple header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: COLORS.text }]}>
          Invoice Details
        </Text>
        <Text style={[styles.subtitle, { color: COLORS.sub }]}>
          {invoice.pName} • {invoice.patientID}
        </Text>
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

            {invoice?.medicinesList?.map((m, idx) => (
              <View key={String(m.id) + idx} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdMain}>{m.name}</Text>
                  {m.hsn ? (
                    <Text style={styles.tdSub}>HSN: {m.hsn}</Text>
                  ) : null}
                  <Text style={styles.tdSub}>
                    Price: ₹{m.price.toFixed(2)} • GST: {m.gst}%
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={styles.tdMain}>{m.qty}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.tdMain}>
                    ₹{( m.amount * (m.qty || 1)).toFixed(2)}
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
                    LOINC: {t.loinc_num_ || "N/A"}
                  </Text>
                  <Text style={styles.tdSub}>
                    Category: {t.category || "—"}
                  </Text>
                  <Text style={styles.tdSub}>
                    Price: ₹{t.price.toFixed(2)} • GST: {t.gst}%
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
        <View style={[styles.card, { backgroundColor: COLORS.card }]}>
          <Text style={styles.sectionTitle}>Grand Total</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Payable Amount</Text>
            <Text style={styles.totalValue}>
              ₹{grandTotal.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

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
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
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
});
