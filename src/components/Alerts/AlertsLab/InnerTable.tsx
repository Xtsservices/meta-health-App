import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
} from "react-native";

// Utils
import { 
  SPACING, 
  FONT_SIZE,
  isTablet 
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";
import { useDispatch, useSelector } from "react-redux";
import { showError } from "../../../store/toast.slice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { UserIcon, ChevronDown } from "lucide-react-native";

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
  id: string | number;
  name?: string;
  medicineName?: string;
  medicineType?: string;
  hsn?: string;
  price?: number;
  sellingPrice?: number;
  gst?: number;
  qty?: number;
  updatedQuantity?: number;
  addedOn?: string;
  category?:string;

  Frequency?: number;
  daysCount?: number;
  nurseID?: number;
  nurseName?: string;

}

interface NurseType {
  id: number;
  firstName: string;
  lastName: string;
  phoneNo?: string;
}


interface InnerTableProps {
  patientID: string;
  patientTimeLineID: string;
  /** existing tests array (backward compat) */
  data: TestItem[];
  /** explicit lists from outer table (reception / billing) */
  testsList?: TestItem[];
  medicinesList?: MedicineItem[];
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
  nurseID?: string |number;
  orderId?: string | number;
  selectedNurse?: NurseType;
  onNurseSelect?: (orderId: string | number, nurse: NurseType) => void;
   grossAmount?: string;
  gstAmount?: string;
  totalAmount?: string;
  isPharmacyOrder?: string | boolean
  alertFrom?:  string | boolean | number
  patientData?: string | boolean | number
}

const InnerTable: React.FC<InnerTableProps> = ({
  patientID,
  patientTimeLineID,
  data = [],
  testsList,
  medicinesList,
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
  orderId,
  selectedNurse,
  onNurseSelect,
  
}) => {
  // 🔹 Normalized arrays
  const tests: TestItem[] = testsList ?? data ?? [];
  const meds: MedicineItem[] = medicinesList ?? [];
    const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);

  const [nurses, setNurses] = useState<NurseType[]>([]);
  const [nurseModalVisible, setNurseModalVisible] = useState(false);
    const isIpdOrEmergency = pType === 2 || pType === 3;
const orderNurse = selectedNurse || null;

const nurseLabel = orderNurse
  ? `${orderNurse.firstName} ${orderNurse.lastName}`
  : "Tap to select nurse";

  useEffect(() => {
    const fetchNurses = async () => {
     

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const response = await AuthFetch(
          `doctor/${user?.hospitalID}/getAllNurse`,
          token
        );
        if (
          response?.status === "success" && "data" in response &&
          Array.isArray(response?.data?.data)
        ) {
          setNurses(response.data.data);
        } else if ( response && "data" in response && Array.isArray(response?.data)) {
          setNurses(response.data);
        } else {
          dispatch(showError("No nurses found - invalid response structure"));
        }
      } catch (error) {
        dispatch(showError("Error fetching nurses"));
      }
    };

    fetchNurses();
  }, [isIpdOrEmergency, user?.hospitalID]);

  /* ------------------------------------------------------------------------ */
  /*                               Calculations                               */
  /* ------------------------------------------------------------------------ */

  const calculateTestTotal = (test: TestItem) => {
    const price = Number(test?.testPrice || 0);
    const gst = test?.gst !== undefined && test?.gst !== null
      ? Number(test.gst)
      : 0;
    const base = isNaN(price) ? 0 : price;
    const gstVal = isNaN(gst) ? 0 : gst;
    return base + (base * gstVal) / 100;
  };

  const calculateMedicineTotal = (med: MedicineItem) => {
    const unitPrice = Number(med.price ?? med.sellingPrice ?? 0);
    const gst = Number(med.gst ?? 0);
    const qty = Number(med.qty ?? med.updatedQuantity ?? 1);

    const safeUnit = isNaN(unitPrice) ? 0 : unitPrice;
    const safeQty = isNaN(qty) ? 1 : qty;
    const safeGst = isNaN(gst) ? 0 : gst;

    const baseTotal = safeUnit * safeQty;
    return baseTotal + (baseTotal * safeGst) / 100;
  };

  const calculateTestsGrandTotal = () => {
    return tests?.reduce((total, test) => total + calculateTestTotal(test), 0);
  };

  const calculateMedicinesGrandTotal = () => {
    return meds?.reduce(
      (total, med) => total + calculateMedicineTotal(med),
      0
    );
  };

  const calculateGrandTotal = () => {
    return calculateTestsGrandTotal() + calculateMedicinesGrandTotal();
  };

  /* ------------------------------------------------------------------------ */
  /*                            Billing Summary View                          */
  /* ------------------------------------------------------------------------ */

  const renderBillingSummary = () => {
    const testsTotal = calculateTestsGrandTotal();
    const medsTotal = calculateMedicinesGrandTotal();
    const grandTotal = testsTotal + medsTotal;
    const paid = parseFloat(paidAmount || "0") || 0;
    const due = parseFloat(dueAmount || "0") || 0;

    return (
      <View style={styles.billingSummary}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>

        <View style={styles.summaryGrid}>
          {testsTotal > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tests Total</Text>
              <Text style={styles.summaryValue}>₹{testsTotal.toFixed(2)}</Text>
            </View>
          )}

          {medsTotal > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Medicines Total</Text>
              <Text style={styles.summaryValue}>₹{medsTotal.toFixed(2)}</Text>
            </View>
          )}

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
            <Text
              style={[
                styles.summaryValue,
                due > 0 ? styles.dueAmount : styles.paidAmount,
              ]}
            >
              ₹{due.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /* ------------------------------------------------------------------------ */
  /*                             Render Test Card                             */
  /* ------------------------------------------------------------------------ */

  const renderTestCard = (test: TestItem, index: number) => (
    <View key={test?.id || `test-${index}`} style={styles.testCard}>
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
                <Text style={styles.detailValue}>
                  {test?.gst ?? 0}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Base Price:</Text>
                <Text style={styles.detailValue}>
                  ₹{test?.testPrice || 0}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total with GST:</Text>
                <Text style={styles.detailValue}>
                  ₹{calculateTestTotal(test).toFixed(2)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Date:</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(test?.addedOn || "")}
                </Text>
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

  /* ------------------------------------------------------------------------ */
  /*                          Render Medicine Card                            */
  /* ------------------------------------------------------------------------ */

  const renderMedicineCard = (med: MedicineItem, index: number) => {
  const name = med.name || med.medicineName || "Unnamed Medicine";

  // 🔹 safer quantity calculation
  const qtyFromFreqDays =
    med?.Frequency && med?.daysCount
      ? Number(med.Frequency) * Number(med.daysCount)
      : undefined;

  const qty =
    qtyFromFreqDays ??
    Number(med.qty ?? med.updatedQuantity ?? 1);

  const unitPrice = med.price ?? med.sellingPrice ?? 0;
  const gst = med.gst ?? 0;
  const lineTotal = calculateMedicineTotal(med);



    return (
      <View key={med?.id || `med-${index}`} style={styles.testCard}>
        <View style={styles.testHeader}>
          <View style={styles.medicineBadge}>
            <Text style={styles.medicineBadgeText}>
              Medicine {index + 1}
            </Text>
          </View>
          <Text style={styles.testId}>ID: {med?.id}</Text>
        </View>

        <View style={styles.testContent}>
          <Text style={styles.testName}>{name}</Text>

          <View style={styles.testDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>
                {med.category || "N/A"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>HSN Code:</Text>
              <Text style={styles.detailValue}>{med.hsn || "N/A"}</Text>
            </View>

            



            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity:</Text>
              <Text style={styles.detailValue}>{qty}</Text>
            </View>




            {labBilling && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Unit Price:</Text>
                  <Text style={styles.detailValue}>₹{unitPrice}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>GST:</Text>
                  <Text style={styles.detailValue}>{gst}%</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total with GST:</Text>
                  <Text style={styles.detailValue}>
                    ₹{lineTotal.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order Date:</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(med?.addedOn || "")}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  /* ------------------------------------------------------------------------ */
  /*                                  Render                                  */
  /* ------------------------------------------------------------------------ */

  const hasTests = tests?.length > 0;
  const hasMeds = meds?.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.departmentBadge}>
            <Text style={styles.departmentText}>{department}</Text>
          </View>
        </View>

        {isRejected && rejectedReason && (
          <View style={styles.overallRejection}>
            <Text style={styles.overallRejectionLabel}>
              Overall Rejection:
            </Text>
            <Text style={styles.overallRejectionReason}>
              {rejectedReason}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.testsContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        contentContainerStyle={[
          styles.testsContentContainer,
          !hasTests && !hasMeds && styles.emptyContent,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tests Section */}
        {hasTests && (
          <View>
            <Text style={styles.sectionHeader}>Test Details</Text>
            {tests.map((test, index) =>
              renderTestCard(test, index)
            )}
          </View>
        )}

        {/* Medicines Section */}
        {hasMeds && (
          <View>
            <Text style={styles.sectionHeader}>Medicine Details</Text>
            {meds.map((med, index) =>
              renderMedicineCard(med, index)
            )}
          </View>
        )}
{hasMeds && isIpdOrEmergency && (
  <View style={{ paddingHorizontal: SPACING.lg }}>
    <Text style={styles.sectionHeader}>Select Nurse : </Text>

    <TouchableOpacity
onPress={() => {
  if (!nurses.length) return;
  setNurseModalVisible(true);
}}

      disabled={!nurses.length}
      style={styles.nurseSelector}
    >
      <View
        style={[
          styles.nurseSelectorContent,
          !orderNurse && styles.nurseSelectorHighlighted,
        ]}
      >
        <UserIcon size={16} color={COLORS.brand} />
        <Text
          style={[
            styles.nurseValue,
            !orderNurse && styles.nursePlaceholder,
          ]}
        >
          {nurseLabel}
        </Text>
        <ChevronDown size={16} color={COLORS.brand} />
      </View>
    </TouchableOpacity>
  </View>
)}


        {/* Empty State */}
        {!hasTests && !hasMeds && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataIcon}>🔍</Text>
            <Text style={styles.noDataText}>
              No test or medicine details available
            </Text>
            <Text style={styles.noDataSubtext}>
              There are no records associated with this order.
            </Text>
          </View>
        )}
      </ScrollView>

      {labBilling && renderBillingSummary()}
            {nurseModalVisible && (
        <Modal
          visible={nurseModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setNurseModalVisible(false);
          }}
        >
          <View style={styles.nurseModalOverlay}>
            <View style={styles.nurseModal}>
              <Text style={styles.nurseModalTitle}>Select Nurse</Text>

              <ScrollView style={styles.nurseList}>
                {nurses.map((nurse) => {
                  const fullName = `${nurse.firstName} ${nurse.lastName}`.trim();
                  return (
                                       <TouchableOpacity
                      key={nurse.id}
                      style={styles.nurseItem}
                      onPress={() => {
                        if (onNurseSelect && orderId !== undefined && orderId !== null) {
                          onNurseSelect(orderId, nurse);
                        }

                        setNurseModalVisible(false);
                      }}
                    >

                      <Text style={styles.nurseName}>{fullName}</Text>
                      {nurse.phoneNo ? (
                        <Text style={styles.nursePhone}>{nurse.phoneNo}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

                {nurses.length === 0 && (
                  <Text style={styles.noNurseText}>
                    No nurses available. Please contact administrator.
                  </Text>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.nurseModalCancelButton}
                onPress={() => {
                  setNurseModalVisible(false);
                }}
              >
                <Text style={styles.nurseModalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // keep parent styling controlled by OuterTable
  },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  sectionHeader: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.sub,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  // Scroll area
  testsContainer: {
    maxHeight: 400,
  },
  testsContentContainer: {
    paddingBottom: SPACING.lg,
    flexGrow: 1,
  },
  emptyContent: {
    flexGrow: 1,
  },

  // Card style shared for tests & medicines
  testCard: {
    backgroundColor: "transparent",
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
  medicineBadge: {
    backgroundColor: COLORS.chipRR,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medicineBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.text,
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
    textAlign: "center",
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
    nurseInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
    nurseSelector: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  nurseSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.field,
    gap: 8,
  },
  nurseSelectorHighlighted: {
    borderColor: COLORS.brand,
    borderWidth: 2,
    backgroundColor: COLORS.brandLight,
  },
  nurseValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "500",
    flex: 1,
  },
  nursePlaceholder: {
    color: COLORS.brand,
    fontWeight: "600",
  },
  nurseModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  nurseModal: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  nurseModalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  nurseList: {
    maxHeight: 300,
    marginBottom: SPACING.md,
  },
  nurseItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  nurseName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  nursePhone: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: 2,
  },
  noNurseText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
    paddingVertical: SPACING.md,
  },
  nurseModalCancelButton: {
    alignSelf: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: COLORS.sub,
  },
  nurseModalCancelText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },


});

export default InnerTable;
