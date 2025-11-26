import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

// Utils
import { 
  SPACING, 
  FONT_SIZE,
  isTablet 
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";

interface TestItem {
  id: string;
  test?: string;
  testName?: string;
  hsn?: string;
  testPrice?: number;
  gst?: number;
  addedOn?: string;
  loinc_num_?: string;
  reason?: string;
}

interface MedicineItem {
  id: string;
  medicineName?: string;
  name?: string;
  takenFromInventoryID?: string;
  medicineType?: number;
  category?: string;
  updatedQuantity?: number;
  quantity?: number;
  hsn?: string;
  sellingPrice?: number;
  price?: number;
  gst?: number;
  datetime?: string;
  userID?: number;
  reason?: string;
  Frequency?: number;
  daysCount?: number;
  medId?: number;
}

interface InnerTableProps {
  patientID: string;
  patientTimeLineID: string;
  data: TestItem[] | MedicineItem[];
  isButton: boolean;
  department: string;
  pType: number;
  labBilling?: boolean;
  patientOrderPay?: string;
  patientOrderOpd?: string;
  paidAmount?: string;
  dueAmount?: string;
  grossAmount?: string;
  gstAmount?: string;
  totalAmount?: string;
  isRejected?: boolean;
  rejectedReason?: string;
  sale?: string;
  isRejectReason?: string;
  isPharmacyOrder?: boolean;
  alertFrom?: string;
  patientData?: any;
  nurseID?: number;
}

const medicineCategoryReverse: Record<number, string> = {
  1: "Tablet",
  2: "Capsule", 
  3: "Syrup",
  4: "Injection",
  5: "Ointment",
  6: "Drops"
};

const InnerTable: React.FC<InnerTableProps> = ({
  patientID,
  patientTimeLineID,
  data = [],
  isButton,
  department,
  pType,
  labBilling,
  patientOrderPay,
  patientOrderOpd,
  paidAmount,
  dueAmount,
  grossAmount,
  gstAmount,
  totalAmount,
  isRejected = false,
  rejectedReason,
  sale,
  isRejectReason,
  isPharmacyOrder = false,
  alertFrom,
  patientData,
  nurseID,
}) => {
  const isPharmacy = isPharmacyOrder || department?.includes("Pharmacy") || alertFrom === "Pharmacy";

  // Group medicines by datetime for pharmacy orders
  const groupMedicinesByDateTime = (medicines: MedicineItem[]) => {
    const grouped: Record<string, MedicineItem[]> = {};
    
    medicines.forEach((medicine) => {
      if (!medicine.datetime) return;
      
      const key = medicine.datetime.substring(0, 19);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(medicine);
    });
    
    return grouped;
  };

  const groupedMedicines = isPharmacy ? groupMedicinesByDateTime(data as MedicineItem[]) : {};

  const calculateTestTotal = (test: TestItem) => {
    const price = test?.testPrice || 0;
    const gst = test?.gst ?? 18;
    return price + (price * gst) / 100;
  };

  const calculateMedicineTotal = (medicine: MedicineItem) => {
    const price = medicine?.sellingPrice || medicine?.price || 0;
    const quantity = medicine?.updatedQuantity || medicine?.quantity || 1;
    const gst = medicine?.gst ?? 18;
    const baseAmount = price * quantity;
    return baseAmount + (baseAmount * gst) / 100;
  };

  const renderBillingSummary = () => {
    const gross = parseFloat(grossAmount || "0");
    const gst = parseFloat(gstAmount || "0");
    const total = parseFloat(totalAmount || "0");
    const paid = parseFloat(paidAmount || "0");
    const due = parseFloat(dueAmount || "0");

    return (
      <View style={styles.billingSummary}>
        <View style={styles.summaryHeader}>
        
        <Text style={styles.summaryTitle}>Payment</Text>
        <View style={[styles.statusPill, due > 0 ? styles.pendingPill : styles.paidPill]}>
          <Text style={styles.statusPillText}>
            {due > 0 ? 'DUE' : 'PAID'}
          </Text>
        </View>
      </View>
      
      <View style={styles.compactGrid}>
        <View style={styles.compactRow}>
          <Text style={styles.compactLabel}>Gross</Text>
          <Text style={styles.compactValue}>₹{gross.toFixed(2)}</Text>
        </View>
        <View style={styles.compactRow}>
          <Text style={styles.compactLabel}>GST</Text>
          <Text style={styles.compactValue}>₹{gst.toFixed(2)}</Text>
        </View>
        <View style={styles.compactRow}>
          <Text style={styles.compactLabel}>Total</Text>
          <Text style={styles.compactValue}>₹{total.toFixed(2)}</Text>
        </View>
        <View style={styles.compactRow}>
          <Text style={styles.compactLabel}>Paid</Text>
            <Text style={styles.compactValue}>₹{paid.toFixed(2)}</Text>
          </View>

          <View style={[styles.compactRow, styles.dueRow]}>
            <Text style={styles.compactLabel}>Due</Text>
            <Text style={[styles.compactValue, due > 0 ? styles.dueHighlight : styles.paidHighlight]}>
              ₹{due.toFixed(2)}
            </Text>
          </View>
        </View>
    </View>
  );
};

  const renderMedicineTakenBy = (nurseID?: number, datetime?: string) => {
    if (!nurseID) return null;

    return (
      <View style={styles.medicineTakenContainer}>
        <View style={styles.medicineTakenContent}>
          <Text style={styles.medicineTakenText}>
            Medication Taken by <Text style={styles.nurseName}>Nurse #{nurseID}</Text>
          </Text>
          <View style={styles.acceptedBadge}>
            <Text style={styles.acceptedText}>Accepted</Text>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>
        {datetime && (
          <Text style={styles.medicineDate}>
            {formatDateTime(datetime)}
          </Text>
        )}
      </View>
    );
  };

  const renderTestCard = (test: TestItem, index: number) => (
    <View key={test?.id} style={styles.testCard}>
      <View style={styles.testHeader}>
        <View style={styles.testBadge}>
          <Text style={styles.testBadgeText}>Test {index + 1}</Text>
        </View>
        <Text style={styles.testId}>ID: {test?.id}</Text>
      </View>
      
      <View style={styles.testContent}>
        <Text style={styles.testName}>
          {test?.test || test?.testName || "Unnamed Test"}
        </Text>
        
        <View style={styles.testDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>HSN Code:</Text>
            <Text style={styles.detailValue}>{test?.hsn || "1236"}</Text>
          </View>
          
          {test?.loinc_num_ && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>LOINC Code:</Text>
              <Text style={styles.detailValue}>{test?.loinc_num_}</Text>
            </View>
          )}
          
          {labBilling && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>GST:</Text>
                <Text style={styles.detailValue}>{test?.gst ?? 18}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Base Price:</Text>
                <Text style={styles.detailValue}>₹{test?.testPrice || 0}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total with GST:</Text>
                <Text style={styles.detailValue}>₹{calculateTestTotal(test).toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Date:</Text>
                <Text style={styles.detailValue}>{formatDateTime(test?.addedOn || "")}</Text>
              </View>
            </>
          )}
        </View>
        
        {isRejected && test?.reason && (
          <View style={styles.rejectionSection}>
            <Text style={styles.rejectionLabel}>Rejection Reason</Text>
            <Text style={styles.rejectionReason}>{test?.reason}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderMedicineCard = (medicine: MedicineItem, index: number) => (
    <View key={medicine?.id} style={styles.medicineCard}>
      <View style={styles.medicineHeader}>
        <View style={styles.medicineBadge}>
          <Text style={styles.medicineBadgeText}>Med {index + 1}</Text>
        </View>
        <Text style={styles.medicineId}>ID: {medicine?.takenFromInventoryID || medicine?.id}</Text>
      </View>
      
      <View style={styles.medicineContent}>
        <Text style={styles.medicineName}>
          {medicine?.medicineName || medicine?.name || "Unnamed Medicine"}
        </Text>
        
        <View style={styles.medicineDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>
              {medicine?.medicineType ? medicineCategoryReverse[medicine.medicineType] : medicine?.category || "Unknown"}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{medicine?.updatedQuantity || medicine?.quantity || 1}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>HSN Code:</Text>
            <Text style={styles.detailValue}>{medicine?.hsn || "N/A"}</Text>
          </View>
          
          {labBilling && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price:</Text>
                <Text style={styles.detailValue}>₹{medicine?.sellingPrice || medicine?.price || 0}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>GST:</Text>
                <Text style={styles.detailValue}>{medicine?.gst || 18}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={styles.detailValue}>₹{calculateMedicineTotal(medicine).toFixed(2)}</Text>
              </View>
              {medicine?.datetime && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order Date:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(medicine.datetime)}</Text>
                </View>
              )}
            </>
          )}
        </View>
        
        {isRejected && medicine?.reason && (
          <View style={styles.rejectionSection}>
            <Text style={styles.rejectionLabel}>Rejection Reason</Text>
            <Text style={styles.rejectionReason}>{medicine?.reason}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderGroupedMedicines = () => {
    return Object.entries(groupedMedicines).map(([datetime, medicines]) => (
      <View key={datetime} style={styles.medicineGroup}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>
            Order Date: {formatDateTime(datetime)}
          </Text>
        </View>
        
        {medicines.map((medicine, index) => renderMedicineCard(medicine, index))}
        
        {/* Show medicine taken by for IPD pharmacy orders */}
        {(pType === 2) && renderMedicineTakenBy(nurseID, datetime)}
      </View>
    ));
  };

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.headerTitle}>
            {isPharmacy ? "Medicine Details" : "Test Details"}
          </Text>
        </View>
        {isRejected && rejectedReason && (
          <View style={styles.overallRejection}>
            <Text style={styles.overallRejectionLabel}>Overall Rejection:</Text>
            <Text style={styles.overallRejectionReason}>{rejectedReason}</Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.contentContainer} 
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        contentContainerStyle={[styles.scrollContent, data?.length === 0 && styles.emptyContent]}
        keyboardShouldPersistTaps="handled"
      >
        {isPharmacy ? (
          Object.keys(groupedMedicines).length > 0 ? (
            renderGroupedMedicines()
          ) : data?.length > 0 ? (
            (data as MedicineItem[]).map((medicine, index) => renderMedicineCard(medicine, index))
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>🔍</Text>
              <Text style={styles.noDataText}>No medicine details available</Text>
              <Text style={styles.noDataSubtext}>
                There are no medicines associated with this order.
              </Text>
            </View>
          )
        ) : data?.length > 0 ? (
          (data as TestItem[]).map((test, index) => renderTestCard(test, index))
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataIcon}>🔍</Text>
            <Text style={styles.noDataText}>No test details available</Text>
            <Text style={styles.noDataSubtext}>
              There are no tests associated with this order.
            </Text>
          </View>
        )}
      </ScrollView>

      {labBilling && renderBillingSummary()}
    </View>
  );
};

const styles = StyleSheet.create({
  // container: {
  //   backgroundColor: COLORS.card,
  //   borderRadius: 16,
  //   margin: SPACING.xs,
  //   shadowColor: COLORS.shadow,
  //   shadowOffset: { width: 0, height: 4 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 12,
  //   elevation: 5,
  //   overflow: 'hidden',
  // },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: isTablet ? FONT_SIZE.lg : FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  departmentBadge: {
    backgroundColor: COLORS.chipHR,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  departmentText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.info,
  },
  overallRejection: {
    backgroundColor: COLORS.chipBP,
    padding: SPACING.sm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  overallRejectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.danger,
    marginBottom: SPACING.xs,
  },
  overallRejectionReason: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Scroll area for tests
  testsContainer: {
    maxHeight: 400,
  },
  // ensures scroll content grows and allows scrolling even with few items
  testsContentContainer: {
    paddingBottom: SPACING.lg,
    flexGrow: 1,
  },

  emptyContent: {
    flexGrow: 1,
  },

  // TEST CARD: made transparent / borderless so it doesn't create a second "box" visual
  testCard: {
    backgroundColor: 'transparent', // removed inner card background to avoid double-box look
    margin: SPACING.sm,
    borderRadius: 12,
    padding: SPACING.md,
  },
  testHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
  },
  testBadge: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  testBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.buttonText,
  },
  testId: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
  },
  testContent: {
    gap: SPACING.sm,
  },
  testName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 22,
  },
  testDetails: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  medicineCard: {
    backgroundColor: 'transparent',
    margin: SPACING.sm,
    borderRadius: 12,
    padding: SPACING.md,
  },
  medicineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
  },
  medicineBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medicineBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.buttonText,
  },
  medicineId: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
  },
  medicineContent: {
    gap: SPACING.sm,
  },
  medicineName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 22,
  },
  medicineDetails: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  rejectionSection: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.chipBP,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  rejectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    fontWeight: "600",
    marginBottom: 4,
  },
  rejectionReason: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  noDataContainer: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  noDataText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  noDataSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.placeholder,
    textAlign: "center",
    fontStyle: "italic",
  },
  billingSummary: {
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  summaryTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.text,
  },
  statusPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingPill: {
    backgroundColor: COLORS.chipBP,
  },
  paidPill: {
    backgroundColor: COLORS.chipRR,
  },
  statusPillText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.buttonText,
  },
  compactGrid: {
    gap: 2,
  },
  compactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 1,
  },
  compactLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
  },
  compactValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.text,
  },
  dueRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 4,
    marginTop: 2,
  },
  dueHighlight: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  paidHighlight: {
    color: COLORS.success,
    fontWeight: '700',
  },
  summaryGrid: {
    gap: SPACING.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  summaryItem: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.text,
  },
  dueRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  dueAmount: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  paidAmount: {
    color: COLORS.success,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.chipBg,
    marginLeft: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
  },
  dueStatus: {
    color: COLORS.danger,
  },
  paidStatus: {
    color: COLORS.success,
  },
  medicineGroup: {
    marginBottom: SPACING.lg,
  },
  groupHeader: {
    padding: SPACING.md,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  medicineTakenContainer: {
    backgroundColor: '#BFFDC5',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#077D13',
  },
  medicineTakenContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicineTakenText: {
    fontSize: FONT_SIZE.sm,
    color: '#077D13',
  },
  nurseName: {
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  acceptedText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: '#077D13',
  },
  checkmark: {
    fontSize: FONT_SIZE.md,
    color: '#17D329',
    fontWeight: 'bold',
  },
  medicineDate: {
    fontSize: FONT_SIZE.xs,
    color: '#077D13',
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  
});

export default InnerTable;