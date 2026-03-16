import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SPACING, FONT_SIZE, isTablet } from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

interface Test {
  testID?: number | string;
  testName?: string;
  testPrice?: number | null;
  gst?: number | null;
}

interface Discount {
  discount: number;
  discountReason?: string;
  discountReasonID?: string;
}

interface Patient {
  testsList?: Test[];
  discount?: Discount[] | null;
}

interface Props {
  data: Patient;
}

const IpdOpdInnerTable: React.FC<Props> = ({ data }) => {
  const subtotal = (data?.testsList ?? []).reduce((acc, item) => {
    const testPrice = item?.testPrice ?? 0;
    const gst = item?.gst ?? 0;
    return acc + testPrice + (testPrice * gst) / 100;
  }, 0);

  const discountPercentage = data?.discount?.[0]?.discount ?? 0;
  const finalTotal = subtotal - (subtotal * discountPercentage) / 100;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.hCell, styles.colSno]}>S.No</Text>
        <Text style={[styles.hCell, styles.colId]}>Test ID</Text>
        <Text style={[styles.hCell, styles.colName]}>Test Name</Text>
        <Text style={[styles.hCell, styles.colCharges]}>Charges</Text>
        <Text style={[styles.hCell, styles.colGst]}>GST</Text>
        <Text style={[styles.hCell, styles.colAmount]}>Amount</Text>
      </View>

      {(data?.testsList ?? []).map((t, i) => {
        const price = t?.testPrice ?? 0;
        const gst = t?.gst ?? 0;
        const gstAmount = (price * gst) / 100;
        const total = price + gstAmount;

        return (
          <View key={`${t?.testID}-${i}`} style={styles.row}>
            <Text style={[styles.cell, styles.colSno]}>{i + 1}</Text>
            <Text style={[styles.cell, styles.colId]}>{t?.testID ?? "-"}</Text>
            <Text style={[styles.cell, styles.colName]}>{t?.testName ?? "N/A"}</Text>
            <Text style={[styles.cell, styles.colCharges]}>₹{price.toFixed(2)}</Text>
            <Text style={[styles.cell, styles.colGst]}>₹{gstAmount.toFixed(2)}</Text>
            <Text style={[styles.cell, styles.colAmount]}>₹{total.toFixed(2)}</Text>
          </View>
        );
      })}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.brand,
  },
  hCell: {
    fontWeight: "700",
    fontSize: FONT_SIZE.xs,
    color: COLORS.buttonText,
    textAlign: "left",
    paddingHorizontal: SPACING.xs,
  },
  row: {
    flexDirection: "row",
    paddingVertical: SPACING.md,
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '20',
  },
  cell: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    paddingHorizontal: SPACING.xs,
    flexWrap: "wrap",
  },
  colSno: { 
    width: isTablet ? 50 : 40,
    textAlign: 'center'
  },
  colId: { 
    width: isTablet ? 100 : 80 
  },
  colName: { 
    flex: 1, 
    minWidth: isTablet ? 160 : 140 
  },
  colCharges: { 
    width: isTablet ? 100 : 90,
    textAlign: 'right'
  },
  colGst: { 
    width: isTablet ? 100 : 90,
    textAlign: 'right'
  },
  colAmount: { 
    width: isTablet ? 110 : 100,
    textAlign: 'right'
  },
  totalRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginRight: SPACING.md,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.success,
  },
});

export default IpdOpdInnerTable;