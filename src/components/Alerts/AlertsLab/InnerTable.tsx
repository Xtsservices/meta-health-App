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

interface InnerTableProps {
  patientID: string;
  patientTimeLineID: string;
  data: TestItem[];
  isButton: boolean;
  department: string;
  pType: number;
  labBilling?: boolean;
  patientOrderPay?: string;
  patientOrderOpd?: string;
  paidAmount?: string;
  dueAmount?: string;
  isRejected?: boolean;
  rejectedReason?: string;
}

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
  isRejected = false,
  rejectedReason,
}) => {
  const calculateTestTotal = (test: TestItem) => {
    const price = test?.testPrice || 0;
    const gst = test?.gst || 18;
    return price + (price * gst) / 100;
  };

  const calculateGrandTotal = () => {
    return data?.reduce((total, test) => total + calculateTestTotal(test), 0);
  };

  const renderBillingSummary = () => {
    const grandTotal = calculateGrandTotal();
    const paid = parseFloat(paidAmount || "0");
    const due = parseFloat(dueAmount || "0");

    return (
      <View style={styles.billingSummary}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Gross Amount</Text>
            <Text style={styles.summaryValue}>₹{grandTotal.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Paid Amount</Text>
            <Text style={styles.summaryValue}>₹{paid.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Due Amount</Text>
            <Text style={[styles.summaryValue, due > 0 ? styles.dueAmount : styles.paidAmount]}>
              ₹{due.toFixed(2)}
            </Text>
          </View>
        </View>
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
                <Text style={styles.detailValue}>{test?.gst || 18}%</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.headerTitle}>Test Details</Text>
          <View style={styles.departmentBadge}>
            <Text style={styles.departmentText}>{department}</Text>
          </View>
        </View>
        {isRejected && rejectedReason && (
          <View style={styles.overallRejection}>
            <Text style={styles.overallRejectionLabel}>Overall Rejection:</Text>
            <Text style={styles.overallRejectionReason}>{rejectedReason}</Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.testsContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={data?.length === 0 && styles.emptyContent}
      >
        {data?.length > 0 ? (
          data?.map((test, index) => renderTestCard(test, index))
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
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    margin: SPACING.xs,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
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
  testsContainer: {
    maxHeight: 400,
  },
  emptyContent: {
    flexGrow: 1,
  },
  testCard: {
    backgroundColor: COLORS.card,
    margin: SPACING.sm,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    padding: SPACING.lg,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  summaryGrid: {
    gap: SPACING.sm,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  dueAmount: {
    color: COLORS.danger,
  },
  paidAmount: {
    color: COLORS.success,
  },
});

export default InnerTable;