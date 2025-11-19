import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

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
    const price = test.testPrice || 0;
    const gst = test.gst || 18;
    return price + (price * gst) / 100;
  };

  const calculateGrandTotal = () => {
    return data.reduce((total, test) => total + calculateTestTotal(test), 0);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "N/A";
    }
  };

  const renderBillingSummary = () => {
    const grandTotal = calculateGrandTotal();
    const paid = parseFloat(paidAmount || "0");
    const due = parseFloat(dueAmount || "0");

    return (
      <View style={styles.billingSummary}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Gross Amount:</Text>
          <Text style={styles.summaryValue}>₹{grandTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Paid Amount:</Text>
          <Text style={styles.summaryValue}>₹{paid.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Due Amount:</Text>
          <Text style={[styles.summaryValue, due > 0 ? styles.dueAmount : styles.paidAmount]}>
            ₹{due.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  const renderTestCard = (test: TestItem, index: number) => (
    <View key={test.id} style={styles.testCard}>
      <View style={styles.testHeader}>
        <Text style={styles.testNumber}>Test {index + 1}</Text>
        <Text style={styles.testId}>ID: {test.id}</Text>
      </View>
      
      <View style={styles.testDetails}>
        <Text style={styles.testName}>
          {test.test || test.testName || "N/A"}
        </Text>
        
        <View style={styles.testInfoRow}>
          <Text style={styles.testInfoLabel}>HSN Code:</Text>
          <Text style={styles.testInfoValue}>{test.hsn || "1236"}</Text>
        </View>
        
        {test.loinc_num_ && (
          <View style={styles.testInfoRow}>
            <Text style={styles.testInfoLabel}>LOINC Code:</Text>
            <Text style={styles.testInfoValue}>{test.loinc_num_}</Text>
          </View>
        )}
        
        {labBilling && (
          <>
            <View style={styles.testInfoRow}>
              <Text style={styles.testInfoLabel}>GST:</Text>
              <Text style={styles.testInfoValue}>{test.gst || 18}%</Text>
            </View>
            <View style={styles.testInfoRow}>
              <Text style={styles.testInfoLabel}>Price:</Text>
              <Text style={styles.testInfoValue}>₹{test.testPrice || 0}</Text>
            </View>
            <View style={styles.testInfoRow}>
              <Text style={styles.testInfoLabel}>Total:</Text>
              <Text style={styles.testInfoValue}>₹{calculateTestTotal(test).toFixed(2)}</Text>
            </View>
            <View style={styles.testInfoRow}>
              <Text style={styles.testInfoLabel}>Date:</Text>
              <Text style={styles.testInfoValue}>{formatDate(test.addedOn || "")}</Text>
            </View>
          </>
        )}
        
        {isRejected && test.reason && (
          <View style={styles.rejectionSection}>
            <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
            <Text style={styles.rejectionReason}>{test.reason}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Test Details</Text>
        <Text style={styles.headerSubtitle}>Department: {department}</Text>
        {isRejected && rejectedReason && (
          <Text style={styles.rejectedHeader}>
            Overall Rejection: {rejectedReason}
          </Text>
        )}
      </View>

      <ScrollView style={styles.testsContainer} showsVerticalScrollIndicator={false}>
        {data.length > 0 ? (
          data.map((test, index) => renderTestCard(test, index))
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No test details available</Text>
          </View>
        )}
      </ScrollView>

      {labBilling && renderBillingSummary()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  rejectedHeader: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
    fontStyle: "italic",
  },
  testsContainer: {
    maxHeight: 400,
    padding: 8,
  },
  testCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  testHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  testNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  testId: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  testDetails: {
    gap: 6,
  },
  testName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  testInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  testInfoLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  testInfoValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  rejectionSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  rejectionLabel: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
    marginBottom: 2,
  },
  rejectionReason: {
    fontSize: 12,
    color: "#b91c1c",
    fontStyle: "italic",
  },
  noDataContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  billingSummary: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  dueAmount: {
    color: "#ef4444",
  },
  paidAmount: {
    color: "#059669",
  },
});

export default InnerTable;