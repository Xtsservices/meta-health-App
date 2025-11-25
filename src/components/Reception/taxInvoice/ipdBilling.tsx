import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";

import { COLORS } from "../../../utils/colour";
import { FONT_SIZE, responsiveWidth, SPACING } from "../../../utils/responsive";
import { formatDateTime } from "../../../utils/dateTime";
import { PatientData } from "./taxInvoiceTabs";

type Mode = "billing" | "allTax";

type Props = {
  mode: Mode;
  data: PatientData[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  startDate: Date | null;
  endDate: Date | null;
  departmentType: string | number;
  onDepartmentTypeChange: (value: string | number) => void;
};

const BILLING_DEPARTMENT_OPTIONS = [
  { value: "1", label: "OPD" },
  { value: "2", label: "IPD / Emergency" },
];

const TAX_DEPARTMENT_OPTIONS = [
  { value: "1", label: "OPD" },
  { value: "2", label: "IPD / Emergency" },
];

const BillingTaxInvoiceList: React.FC<Props> = ({
  mode,
  data,
  totalCount,
  loading,
  error,
  startDate,
  endDate,
  departmentType,
  onDepartmentTypeChange,
}) => {
  const navigation = useNavigation<any>();

  const deptOptions =
    mode === "billing" ? BILLING_DEPARTMENT_OPTIONS : TAX_DEPARTMENT_OPTIONS;

  const renderCard = ({ item }: { item: PatientData }) => {
    const totalTests = item.testList?.length ?? 0;
    const totalMeds = item.medicinesList?.length ?? 0;

    const sourceParam = mode === "billing" ? "billing" : "allTax";
    const itemsLabel = mode === "billing" ? "Items" : "Invoices";
    const ctaText =
      mode === "billing" ? "View Billing Details" : "View Invoice Details";

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: COLORS.card }]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("InvoiceDetails", {
            invoice: item,
            source: sourceParam,
          })
        }
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.patientName, { color: COLORS.text }]}>
              {item.pName}
            </Text>
            <Text style={[styles.patientId, { color: COLORS.sub }]}>
              ID: {item.patientID}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                styles.badge,
                {
                  backgroundColor:
                    mode === "billing" ? "#BFDBFE" : COLORS.brandSoft,
                },
              ]}
            >
              {item.dept}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Added On</Text>
          <Text style={styles.metaValue}>
            {item.addedOn ? formatDateTime(item.addedOn) : "—"}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{itemsLabel}</Text>
          <Text style={styles.metaValue}>
            {totalTests} tests • {totalMeds} medicines
          </Text>
        </View>

        <View style={styles.viewDetailsRow}>
          <Text style={styles.viewDetailsText}>{ctaText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter row with department picker + summary */}
      <View style={styles.filterRow}>
        {startDate && endDate && (
          <Text style={styles.summaryText}>
            Showing {data.length} of {totalCount} records
          </Text>
        )}

        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={departmentType}
            onValueChange={(v) => onDepartmentTypeChange(v)}
            style={styles.picker}
            dropdownIconColor={COLORS.text}
          >
            {deptOptions.map((opt) => (
              <Picker.Item
                key={String(opt.value)}
                label={opt.label}
                value={opt.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Error / Loading / List */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>
            {mode === "billing" ? "Loading billing data…" : "Loading invoices…"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: SPACING.xl,
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Records Found</Text>
              {startDate && endDate && (
                <Text style={styles.emptySub}>
                  Try adjusting your date range
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

export default BillingTaxInvoiceList;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: "column",
    marginBottom: SPACING.sm,
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
    fontWeight: "500",
  },
//   pickerWrap: {
//     width: responsiveWidth(46),
//     borderWidth: 1,
//     borderColor: "#d1d5db",
//     borderRadius: 999,
//     overflow: "hidden",
//     backgroundColor: "#fff",
//     // color: "black",
//   },

    pickerWrap: {
        width: responsiveWidth(90),
    borderWidth: 1.5,
     borderColor: COLORS.border,
     borderRadius: 12,
     overflow: "hidden",
     backgroundColor: "#f9fafb",
  },
  picker: {
    height: 55,
    width: "100%",
    color: "black"
  },
 
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  errorBox: {
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: FONT_SIZE.sm,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  card: {
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  patientName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  patientId: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: "#111827",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metaLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
  },
  metaValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    textAlign: "right",
  },
  viewDetailsRow: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  viewDetailsText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.brandDark,
  },
});
