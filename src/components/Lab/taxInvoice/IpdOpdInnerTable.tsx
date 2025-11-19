import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";

const { width: W } = Dimensions.get("window");
const isTablet = W >= 768;

interface Test {
  testID: number;
  testName: string;
  testPrice: number | null;
  gst: number | null;
}

interface Discount {
  discount: number;
  discountReason: string;
  discountReasonID: string;
}

interface Patient {
  patientID: number;
  pName: string;
  firstName: string;
  lastName: string;
  addedOn: string;
  departmemtType: number;
  hospitalID: number;
  category: string;
  discount: Discount[] | null;
  testsList: Test[];
}

interface IpdInnerTableProps {
  data: Patient;
  taxInvoice?: string;
  type?: string;
}

const IpdOpdInnerTable: React.FC<IpdInnerTableProps> = ({
  data,
}) => {
  const calculateTotalAmount = () => {
    const subtotal = data.testsList.reduce((acc, item) => {
      const testPrice = item.testPrice || 0;
      const gst = item.gst || 0;
      return acc + testPrice + (testPrice * gst) / 100;
    }, 0);

    const discountPercentage = data.discount?.[0]?.discount ?? 0;
    const finalTotal = subtotal - (subtotal * discountPercentage) / 100;

    return finalTotal;
  };

  return (
    <View style={styles.container}>
      {/* Inner Table Header */}
      <View style={styles.innerTableHeader}>
        <Text style={[styles.innerHeaderCell, { flex: 0.5 }]}>S.No</Text>
        <Text style={[styles.innerHeaderCell, { flex: 1 }]}>Test ID</Text>
        <Text style={[styles.innerHeaderCell, { flex: 2 }]}>Test Name</Text>
        <Text style={[styles.innerHeaderCell, { flex: 1 }]}>Charges</Text>
        <Text style={[styles.innerHeaderCell, { flex: 1 }]}>GST</Text>
        <Text style={[styles.innerHeaderCell, { flex: 1 }]}>Amount</Text>
      </View>

      {/* Inner Table Body */}
      <ScrollView style={styles.innerTableBody}>
        {data.testsList?.map((item, index) => {
          const testPrice = item.testPrice || 0;
          const gst = item.gst || 0;
          const gstAmount = (testPrice * gst) / 100;
          const totalAmount = testPrice + gstAmount;

          return (
            <View key={index} style={styles.innerTableRow}>
              <Text style={[styles.innerCell, { flex: 0.5 }]}>{index + 1}</Text>
              <Text style={[styles.innerCell, { flex: 1 }]}>{item.testID}</Text>
              <Text style={[styles.innerCell, { flex: 2 }]}>{item.testName}</Text>
              <Text style={[styles.innerCell, { flex: 1 }]}>₹{testPrice.toFixed(2)}</Text>
              <Text style={[styles.innerCell, { flex: 1 }]}>₹{gstAmount.toFixed(2)}</Text>
              <Text style={[styles.innerCell, { flex: 1 }]}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Total Amount */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Amount:</Text>
        <Text style={styles.totalAmount}>₹{calculateTotalAmount().toFixed(2)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  innerTableHeader: {
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  innerHeaderCell: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  innerTableBody: {
    maxHeight: 200,
  },
  innerTableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
  },
  innerCell: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
  },
  totalLabel: {
    fontSize: 16,
    color: "#6b7280",
    marginRight: 12,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
});

export default IpdOpdInnerTable;