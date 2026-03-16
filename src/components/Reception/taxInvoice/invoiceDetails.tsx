// src/screens/billing/InvoiceDetailsMobile.tsx

import React, { useMemo, useState, useEffect } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

import { FONT_SIZE, FOOTER_HEIGHT, SPACING } from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { PatientData } from "./taxInvoiceTabs";
import { Download } from "lucide-react-native";
import InvoiceDownloadModal from "./invoiceDownload";
import { UserIcon } from "../../../utils/SvgIcons";
import { AuthFetch } from "../../../auth/auth";

const FOOTER_H = FOOTER_HEIGHT || 70;

type RouteParams = {
  invoice: PatientData;
  source?: "billing" | "allTax";
  nurses?: any[];
};

const InvoiceDetailsMobile: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [timelineId, setTimelineId] = useState<number | null>(null);
  const { invoice, source, nurses }: RouteParams = route.params;

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        
        const response = await AuthFetch(
          `patient/${user?.hospitalID}/patients/single/${invoice.patientID}`,
          token
        );      
        // Store the timeline ID if available
        if (response?.status === "success" && response?.data?.patient?.patientTimeLineID) {
          setTimelineId(response.data.patient.patientTimeLineID);
        }
        
      } catch (error) {
        console.error("Error fetching patient data:", error);
      }
    };

    if (invoice?.patientID && user?.hospitalID) {
      fetchPatientData();
    }
  }, [invoice?.patientID, user?.hospitalID, user?.token]);

  const getNurseName = (nurseId: number) => {
    const nurse = nurses?.find(n => n.id === nurseId);
    return nurse ? `${nurse.firstName} ${nurse.lastName}` : `Nurse #${nurseId}`;
  };
  
  const hasPrescription = Boolean(invoice?.prescriptionURL);
  const isIPD = invoice?.dept?.includes('IPD');
  const firstMedicine = invoice?.medicinesList?.[0];
  const nurseId = (firstMedicine as any)?.nurseID;
  const nurseName = nurseId ? getNurseName(nurseId) : null;
  const isBillingSource = source === "billing";
  const isReceptionUser = user?.roleName?.toLowerCase() === 'reception';
  const isPharmacyUser = user?.roleName?.toLowerCase() === 'pharmacy';
  const isLabUser = user?.roleName?.toLowerCase() === 'pathology';
  const isRadiologyUser = user?.roleName?.toLowerCase() === 'radiology';
  const isLabOrRadiology = isLabUser || isRadiologyUser;

  let displayTotal = 0;
  let numericPaid = 0;
  let numericDue = 0;

  // Check if this is a reception response structure
  const isReceptionResponse = invoice?.grand_totalAmount !== undefined;

  if (isReceptionResponse) {
    // For RECEPTION users - use API values directly
    displayTotal = Number(invoice.grand_totalAmount) || 0;
    numericPaid = Number(invoice.grand_paidAmount) || 0;
    numericDue = Number(invoice.grand_dueAmount) || 0;
  } else if (isLabOrRadiology) {
    // For lab/radiology users, use API values directly
    displayTotal = Number(invoice.totalAmount) || 0;
    numericPaid = Number(invoice.paidAmount) || 0;
    numericDue = Number(invoice.dueAmount) || 0;
  } else {
    // For pharmacy users in billing mode, always show total amount only
    if (isBillingSource && isPharmacyUser) {
      displayTotal = invoice.medicinesList?.reduce((sum, medicine) => sum + (medicine.amount || 0), 0) || 0;
      numericPaid = Number(invoice.paidAmount) || 0;
      numericDue = Math.max(0, displayTotal - numericPaid);
    } else {
      const medsBaseTotal = invoice.medicinesList?.reduce((sum, m: any) => 
        sum + Number(m.totalPrice || m.amount || 0), 0
      ) || 0;
      
      const medsGstTotal = invoice.medicinesList?.reduce((sum, m: any) => {
        const price = Number(m.totalPrice || 0);
        const gst = Number(m.gst || 0);
        return sum + (price * gst) / 100;
      }, 0) || 0;
      
      const medsGrandTotal = medsBaseTotal + medsGstTotal;
      const testsTotal = invoice.testList?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      displayTotal = medsGrandTotal + testsTotal;
      numericPaid = Number(invoice.paidAmount) || 0;
      numericDue = Math.max(0, displayTotal - numericPaid);
    }
  }

  const getCompletedDate = () => {
    if (!isPharmacyUser) {
      return null;
    }
    
    const completedDates = invoice.medicinesList
      ?.map(med => med?.completedOn)
      .filter(date => date) || [];
    
    if (completedDates.length === 0) {
      return null;
    }
    
    // Find the most recent completed date
    const sortedDates = completedDates.sort((a, b) => 
      Date.parse(b || "") - Date.parse(a || "")
    );
    
    return sortedDates[0];
  };

  const completedDate = getCompletedDate();
  const payableAmount = Math.max(0, displayTotal - numericPaid);

  const handlePayPress = () => {
    const payload: any = {
      amount: numericDue,
      department: invoice.dept,
      orderData: {
        patientID: invoice.patientID,
        ptype: invoice.pType,
        patientTimeLineID: timelineId,
      },
      user,
    };

    const role = user?.roleName?.toLowerCase();

    if (role === "pharmacy") {
      payload.pharmacyData = invoice;
      payload.type = "medicine"
    } else if (role === "lab" || role === "pathology") {
      payload.labData = invoice;
      payload.type = "lab"
    } else if (role === "radiology") {
      payload.radiologyData = invoice;
      payload.type = "radiology"
    } else {
      payload.receptionData = invoice;
    }

    navigation.navigate("PaymentScreen", payload);
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
            {isBillingSource ? 'Billing Details' : 'Invoice Details'}
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
          </TouchableOpacity>
        )}
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
            <Text style={styles.value}>{invoice.patientID || invoice.pIdNew}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Doctor</Text>
            <Text style={styles.value}>
              {`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Added On</Text>
            <Text style={styles.value}>
              {invoice.addedOn ? formatDateTime(invoice.addedOn) : "—"}
            </Text>
          </View>

          {isIPD && nurseName && (
            <View style={styles.row}>
              <View style={styles.labelWithIcon}>
                <UserIcon size={16} color={COLORS.brand} />
                <Text style={[styles.label, { color: '#14b8a6', fontWeight: '600', marginLeft: 4 }]}>
                  Medication Given By
                </Text>
              </View>
              <Text style={[styles.value, { color: '#14b8a6', fontWeight: '600' }]}>
                {nurseName}
              </Text>
            </View>
          )}

          {isPharmacyUser && completedDate && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: COLORS.success, fontWeight: '600' }]}>
                Completed On
              </Text>
              <Text style={[styles.value, { color: COLORS.success, fontWeight: '600' }]}>
                {formatDateTime(completedDate)}
              </Text>
            </View>
          )}
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
                    ₹{(m.finalPrice || m.amount).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Medicines Total</Text>
              <Text style={styles.totalValue}>
                ₹{(invoice.medicine_totalAmount || invoice.medicinesList?.reduce((sum, m: any) => sum + Number(m.finalPrice || m.amount || 0), 0) || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Tests section - MODIFIED for lab/radiology */}
        {invoice.testList && invoice.testList.length > 0 && (
          <View style={[styles.card, { backgroundColor: COLORS.card }]}>
            <Text style={styles.sectionTitle}>
              Lab Tests ({invoice.testList.length})
            </Text>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 2 }]}>Test</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                GST %
              </Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
                Amount
              </Text>
            </View>

            {invoice.testList.map((t: any, idx) => (
              <View key={String(t.testID) + idx} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdMain}>{t.testName}</Text>
                  <Text style={styles.tdSub}>
                    Base: ₹{t.baseAmount?.toFixed(2) || t.price?.toFixed(2) || "0.00"}
                    {t.gstAmount && ` • GST Amt: ₹${t.gstAmount.toFixed(2)}`}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={styles.tdMain}>
                    {t.gstPercentage?.toFixed(2) || t.gst?.toFixed(2) || "0"}%
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.tdMain}>
                    ₹{t.totalAmount?.toFixed(2) || t.amount?.toFixed(2) || "0.00"}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tests Total</Text>
              <Text style={styles.totalValue}>
                             ₹{(invoice.test_totalAmount || invoice.testList?.reduce((sum, t: any) => sum + Number(t.totalAmount || t.amount || 0), 0) || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Grand total */}
        <View style={[styles.card, { backgroundColor: COLORS.card }]}>
          <Text style={styles.sectionTitle}>
            {isBillingSource ? "Payment Summary" : "Invoice Total"}
          </Text>

          {isBillingSource && !hasPrescription ? (
            <>
              {/* Show breakdown for reception response */}
              {isReceptionResponse && (
                <>
                  {invoice.medicine_totalAmount !== undefined && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Medicines Total:</Text>
                      <Text style={styles.breakdownValue}>
                        ₹{Number(invoice.medicine_totalAmount || 0).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  
                  {invoice.test_totalAmount !== undefined && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Tests Total:</Text>
                      <Text style={styles.breakdownValue}>
                        ₹{Number(invoice.test_totalAmount || 0).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </>
              )}

      {/* Total Amount */}
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabel}>Total Amount:</Text>
        <Text style={styles.breakdownValue}>
          ₹{displayTotal.toFixed(2)}
        </Text>
      </View>

              {/* Show breakdown for lab/radiology */}
              {isLabOrRadiology && (
                <>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Total Base Amount:</Text>
                    <Text style={styles.breakdownValue}>
                      ₹{Number(invoice.totalBaseAmount || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Total GST Amount:</Text>
                    <Text style={styles.breakdownValue}>
                      ₹{Number(invoice.totalGstAmount || 0).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}

      {/* Payable Amount (what we intend to charge now) */}
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabel}>Payable Amount:</Text>
        <Text style={styles.breakdownValue}>
          ₹{payableAmount.toFixed(2)}
        </Text>
      </View>

              {/* Paid Amount */}
              {numericPaid > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Already Paid:</Text>
                  <Text style={[styles.breakdownValue, { color: COLORS.success }]}>
                    ₹{numericPaid.toFixed(2)}
                  </Text>
                </View>
              )}

      {/* Due Amount (outstanding) */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Due Amount:</Text>
        <Text
          style={[
            styles.totalValue,
            { color: numericDue > 0 ? COLORS.error : COLORS.success },
          ]}
        >
          ₹{numericDue.toFixed(2)}
        </Text>
      </View>
    </>
  ) : (
    // TAX INVOICE mode - Always show total amount
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Total Amount</Text>
      <Text style={styles.totalValue}>₹{displayTotal.toFixed(2)}</Text>
    </View>
  )}
</View>

        {/* Pay button for Billing source */}
        {isBillingSource && numericDue > 0 && !hasPrescription && (
  <View style={styles.payButtonContainer}>
    <TouchableOpacity
      style={[styles.payButton, { backgroundColor: COLORS.brand }]}
      onPress={handlePayPress}
      activeOpacity={0.85}
    >
      <Text style={styles.payButtonText}>
        Pay ₹{numericDue.toFixed(2)}
      </Text>
    </TouchableOpacity>
    <Text style={styles.payHint}>
      You'll be redirected to the secure payment screen.
    </Text>
  </View>
)}
      </ScrollView>

      {/* Download PDF modal */}
      <InvoiceDownloadModal
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        invoice={invoice}
        grandTotal={displayTotal}
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
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
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
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: FONT_SIZE.sm,
    color: "#6B7280",
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: FONT_SIZE.sm,
    color: "#374151",
    fontWeight: "500",
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