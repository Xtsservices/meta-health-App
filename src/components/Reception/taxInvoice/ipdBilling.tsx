import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Linking
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";

import { COLORS } from "../../../utils/colour";
import { FONT_SIZE, responsiveWidth, SPACING } from "../../../utils/responsive";
import { formatDateTime } from "../../../utils/dateTime";
import { PatientData } from "./taxInvoiceTabs";
import { UserIcon } from "../../../utils/SvgIcons";
import { ExternalLinkIcon } from "../../../utils/SvgIcons";
import { showError } from "../../../store/toast.slice";
import { useDispatch } from "react-redux";

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
  userDepartment?: string;
  nurses?: any[]; 
};

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
  userDepartment = "reception",
  nurses = [],
}) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  
  const isPharmacy = userDepartment === 'pharmacy';
  const isLab = userDepartment === 'pathology';
  const isRadiology = userDepartment === 'radiology';
  const isReception = userDepartment === 'reception' || (!isPharmacy && !isLab && !isRadiology);
  
  const getDepartmentOptions = () => {
    const isBilling = mode === 'billing';

    if (isPharmacy) {
      if (isBilling) {
        return [
          { value: "2", label: "IPD" },
          { value: "1", label: "OPD" },
          { value: "3", label: "Walk-in" },
          { value: "4", label: "Rejected" },
        ];
      } else {
        return [
          { value: "2", label: "IPD" },
          { value: "1", label: "OPD" },
          { value: "3", label: "Walk-in" },
        ];
      }
    } else if (isLab || isRadiology) {
      if (isBilling) {
        return [
          { value: "1", label: "OPD" },
          { value: "2", label: "IPD" },
        ];
      } else {
        return [
          { value: "2", label: "IPD " },
          { value: "1", label: "OPD" },
          { value: "3", label: "Walk-in" },
        ];
      }
    } else {
      // Reception
      if (isBilling) {
        return [
          { value: "1", label: "OPD" },
          { value: "2", label: "IPD / Emergency" },
        ];
      } else {
        return [
          { value: "all", label: "All Departments" },
          { value: "1", label: "OPD" },
          { value: "2", label: "IPD / Emergency" },
        ];
      }
    }
  };

  const deptOptions = getDepartmentOptions();
  const getNurseName = (nurseId: number) => {
    const nurse = nurses.find(n => n.id === nurseId);
    return nurse ? `${nurse.firstName} ${nurse.lastName}` : `Nurse #${nurseId}`;
  };

  const sortedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => {
      const dateA = Date.parse(a.addedOn || "") || 0;
      const dateB = Date.parse(b.addedOn || "") || 0;
      return dateB - dateA;
    });
  }, [data]);

  const renderCard = ({ item }: { item: PatientData }) => {
    const rejectedMedicines = item.medicinesList?.filter(med => 
      med?.status === "rejected" && med?.rejectReason
    ) || [];
    const hasRejectedMedicine = rejectedMedicines.length > 0;
    const firstRejection = rejectedMedicines[0]; 
    const totalTests = item.testList?.length ?? 0;
    const totalMeds = item.medicinesList?.length ?? 0;
    const itemIsPharmacy = item.type === 'medicine' || isPharmacy;
    const itemIsLab = item.type === 'lab' || isLab || isRadiology;

    const isIPD = item.dept?.includes('IPD');
    const firstMedicine = item.medicinesList?.[0];
    const nurseId = firstMedicine?.nurseID;
    const nurseName = nurseId ? getNurseName(nurseId) : null;

    const sourceParam = mode === "billing" ? "billing" : "allTax";
    const itemsLabel = mode === "billing" ? "Items" : "Invoices";
    const ctaText = mode === "billing" ? "View Billing Details" : "View Invoice Details";

    const getCompletedDate = () => {
      if (!isPharmacy || !item.dept?.toLowerCase().includes('ipd')) {
        return null;
      }
      
      const completedDates = item.medicinesList
        ?.map(med => med.completedOn)
        .filter(date => date) || [];
      
      if (completedDates.length === 0) {
        return null;
      }
      
      const sortedDates = completedDates.sort((a, b) => 
        Date.parse(b || "") - Date.parse(a || "")
      );
      
      return sortedDates[0];
    };

    const testLabel = totalTests <= 1 ? "test" : "tests";
    const medLabel  = totalMeds <= 1  ? "med"  : "meds";
    const completedDate = getCompletedDate();

const calculateAmounts = () => {
  // For RECEPTION users in ALL TAX mode - use grand totals from API
  if (isReception && mode === "allTax") {
    // Use the grand totals from the API response
    const totalAmount = Number(item.totalAmount) || 0;
    const paidAmount = Number(item.paidAmount) || 0;
    const dueAmount = Number(item.dueAmount) || 0;
    
    return { total: totalAmount, dueAmount, paidAmount };
  }
  
  // For RECEPTION users in BILLING mode - use reception response structure
  if (isReception && mode === "billing") {
    const totalAmount = Number(item.grand_totalAmount) || 0;
    const paidAmount = Number(item.grand_paidAmount) || 0;
    const dueAmount = Number(item.grand_dueAmount) || 0;
    
    return { total: totalAmount, dueAmount, paidAmount };
  }
  
  // For PHARMACY IPD cases in BILLING mode, show due and paid amounts
  const isPharmacyIPD = isPharmacy && item.dept?.toLowerCase().includes('ipd');
  
  if (isPharmacyIPD && mode === "billing") {
    const dueAmount = Number(item.dueAmount) || 0;
    const paidAmount = Number(item.paidAmount) || 0;
    const totalAmount = Number(item.totalAmount) || dueAmount + paidAmount;
    return { total: totalAmount, dueAmount, paidAmount };
  }
  
  // For PHARMACY users in BILLING mode, always show total amount only
  if (isPharmacy && mode === "billing") {
    const total = item.medicinesList?.reduce((sum, medicine) => 
      sum + Number(medicine.finalPrice || medicine.amount || 0), 0) || 0;
    return { total, dueAmount: 0, paidAmount: 0 };
  }
  
  // For LAB/RADIOLOGY users in BILLING mode, use API values directly
  if ((isLab || isRadiology) && mode === "billing") {
    const totalAmount = Number(item.totalAmount) || 0;
    const paidAmount = Number(item.paidAmount) || 0;
    const dueAmount = Number(item.dueAmount) || 0;
    return { total: totalAmount, dueAmount, paidAmount };
  }
  
  // For BILLING mode and non-reception users, use dueAmount from API
  if (mode === "billing" && !isReception) {
    const dueAmount = Number(item.dueAmount) || 0;
    const paidAmount = Number(item.paidAmount) || 0;
    const totalAmount = Number(item.totalAmount) || dueAmount + paidAmount;
    return { total: totalAmount, dueAmount, paidAmount };
  }
  
  let total = 0;
  
  if (itemIsPharmacy) {
    total = item.medicinesList?.reduce((sum, medicine) => 
      sum + Number(medicine.finalPrice || medicine.amount || 0), 0) || 0;
  } else {
    total = item.testList?.reduce((sum, test) => 
      sum + Number(test.totalAmount || test.amount || 0), 0) || 0;
  }
  
  const paidAmount = Number(item.paidAmount || 0);
  const dueAmount = Math.max(0, total - paidAmount);
  
  return { total, dueAmount, paidAmount };
};

    const { total, dueAmount, paidAmount } = calculateAmounts();

    // Show due amount only in BILLING mode for non-reception users
const showDueAmount = 
  (mode === "billing" && !isReception && !isPharmacy) ||  
  (isPharmacy && mode === "billing" && item.pType?.toLowerCase().includes('inpatient')) ||
  (isReception && mode === "allTax"); // Show due amount for reception tax invoices

// For reception in allTax mode, display the total amount (since they're completed invoices)
const displayAmount = 
  (isLab || isRadiology) && mode === "billing" ? dueAmount : 
  showDueAmount ? dueAmount : total;

const amountLabel = 
  (isLab || isRadiology) && mode === "billing" ? "Due Amount" : 
  showDueAmount ? "Due Amount" : 
  (isReception && mode === "allTax") ? "Total Amount" : "Total Amount";
    const handlePrescriptionPress = () => {
      if (item.prescriptionURL) {
        Linking.openURL(item.prescriptionURL)
          .catch(err => {
            dispatch(showError("Failed to open prescription URL"));
          });
      }
    };

    // Format admission/added date
    const formatDisplayDate = () => {
      if (item.admissionDate) {
        return formatDateTime(item.admissionDate);
      } else if (item.addedOn) {
        return formatDateTime(item.addedOn);
      }
      return "—";
    };

    // Get doctor name for display
    const getDoctorName = () => {
      if (item.doctorName) {
        return item.doctorName;
      } else if (item.firstName || item.lastName) {
        return `${item.firstName || ""} ${item.lastName || ""}`.trim();
      }
      return "";
    };

    const doctorName = getDoctorName();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: COLORS.card }]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("InvoiceDetails", {
            invoice: item,
            source: sourceParam,
            department: userDepartment,
            nurses: nurses,
          })
        }
      >
        {/* Rejection Banner */}
        {hasRejectedMedicine && (
          <View style={styles.rejectionBanner}>
            <Text style={styles.rejectionText}>
              ❌ Rejected: {firstRejection?.rejectReason}
            </Text>
            {firstRejection?.rejectedOn && (
              <Text style={styles.rejectionDate}>
                On: {formatDateTime(firstRejection?.rejectedOn)}
              </Text>
            )}
          </View>
        )}
        
        {/* Card Header */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.patientName, { color: COLORS.text }]}>
              {item?.pName}
            </Text>
            <Text style={[styles.patientId, { color: COLORS.sub }]}>
              ID: {item?.pIdNew || item?.patientID}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                styles.badge,
                {
                  backgroundColor: mode === "billing" ? "#BFDBFE" : COLORS.brandSoft,
                },
              ]}
            >
              {item.dept}
            </Text>
            {item.orderID && (
              <Text style={styles.orderId}>
                Order: {item.orderID}
              </Text>
            )}
          </View>
        </View>

        {/* Prescription Section */}
        {item.prescriptionURL && (
          <View style={styles.prescriptionSection}>
            <View style={styles.prescriptionHeader}>
              <Text style={styles.prescriptionLabel}>Prescription Available</Text>
            </View>
            <TouchableOpacity 
              style={styles.prescriptionButton}
              onPress={handlePrescriptionPress}
              activeOpacity={0.8}
            >
              <ExternalLinkIcon size={16} color="#ffffff" />
              <Text style={styles.prescriptionButtonText}>Open Prescription</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Doctor Information */}
        {doctorName && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Doctor</Text>
            <Text style={styles.metaValue}>
              {doctorName}
            </Text>
          </View>
        )}

        {/* Location/Category */}
        {item.location && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={styles.metaValue}>
              {item.location}
            </Text>
          </View>
        )}

        {/* Date Information */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>
            {isReception ? "Added on" : isPharmacy ? "Order Date" : "Admission Date"}
          </Text>
          <Text style={styles.metaValue}>
            {formatDisplayDate()}
          </Text>
        </View>

        {/* Completed Date for Pharmacy IPD */}
        {isPharmacy && item.dept?.toLowerCase().includes('ipd') && completedDate && (
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: COLORS.success }]}>Completed On</Text>
            <Text style={[styles.metaValue, { color: COLORS.success, fontWeight: '600' }]}>
              {formatDateTime(completedDate)}
            </Text>
          </View>
        )}

        {/* Items Count */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{itemsLabel}</Text>
          <Text style={styles.metaValue}>
            {isPharmacy 
              ? `${totalMeds} ${medLabel}`
              : isReception 
                ? `${totalTests} ${testLabel} ${totalMeds} ${medLabel}`
                : `${totalTests} ${testLabel}`
            }
          </Text>
        </View>

        {/* Amount */}
        {!isReception && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{amountLabel}</Text>
            <Text style={[
              styles.totalAmount, 
              showDueAmount && dueAmount > 0 && { color: COLORS.error }
            ]}>
              ₹{displayAmount.toFixed(2)}
            </Text>
          </View>
        )}
      
        {/* Paid Amount (only in billing mode with actual paid amount) */}
        {mode === "billing" && !isReception && paidAmount > 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Paid Amount</Text>
            <Text style={[styles.metaValue, { color: COLORS.success }]}>
              ₹{paidAmount.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Nurse Information for IPD */}
        {isIPD && nurseName && (
          <View style={styles.metaRow}>
            <View style={styles.labelWithIcon}>
              <UserIcon size={14} color={COLORS.brand} />
              <Text style={[styles.metaLabel, { marginLeft: 4 }]}>
                Medication Given By
              </Text>
            </View>
            <Text style={[styles.metaValue, { color: '#000000', fontWeight: '600' }]}>
              {nurseName}
            </Text>
          </View>
        )}

        {/* View Details CTA */}
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
          data={sortedData}
          keyExtractor={(item) => `${item.id}-${item.patientID}-${item.orderID || ''}`}
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
                  Try adjusting your date range or department filter
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
    marginBottom: 4,
  },
  orderId: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
    fontStyle: "italic",
  },
  prescriptionSection: {
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ccfbf1',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prescriptionLabel: {
    fontSize: FONT_SIZE.sm,
    color: '#0f766e',
    fontWeight: '600',
  },
  prescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  prescriptionButtonText: {
    fontSize: FONT_SIZE.sm,
    color: '#ffffff',
    fontWeight: '600',
  },
  rejectionBanner: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  rejectionText: {
    fontSize: FONT_SIZE.sm,
    color: '#991b1b',
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionDate: {
    fontSize: FONT_SIZE.xs,
    color: '#dc2626',
    fontStyle: 'italic',
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
    lineHeight: 16,
  },
  totalAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.success,
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
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});