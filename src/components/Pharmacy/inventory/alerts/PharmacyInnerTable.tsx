import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthPost, AuthFetch } from "../../../../auth/auth";

// Utils
import { 
  SPACING, 
  FONT_SIZE,
  isTablet 
} from "../../../../utils/responsive";
import { COLORS } from "../../../../utils/colour";
import { formatDateTime } from "../../../../utils/dateTime";
import { showSuccess, showError } from "../../../../store/toast.slice";

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
  Frequency?: number;
  daysCount?: number;
  addedOn?: string;
  reason?: string;
  medId?: number;
}

interface InnerTableProps {
  patientID: string;
  patientTimeLineID: string;
  /** existing data array (backward compat) */
  data: MedicineItem[];
  /** explicit lists from outer table */
  medicinesList?: MedicineItem[];
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

const PharmacyInnerTable: React.FC<InnerTableProps> = ({
  patientID,
  patientTimeLineID,
  data = [],
  medicinesList,
  isButton,
  department,
  pType,
  labBilling,
  patientOrderPay,
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
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);
  
  // 🔹 Normalized arrays
  const meds: MedicineItem[] = medicinesList ?? data ?? [];
  
  // State for quantity management
  const [quantities, setQuantities] = useState<{ [key: string | number]: number }>({});
  const [reasons, setReasons] = useState<{ [key: string]: string }>({});
  const [decreasedQuantities, setDecreasedQuantities] = useState<{ [key: number]: boolean }>({});
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState<any>(null);
  const [nurses, setNurses] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize quantities from data
  useEffect(() => {
    const initialQuantities: { [key: string | number]: number } = {};
    
    meds.forEach((med) => {
      const medId = med.medId ?? med.id ?? null;
      const frequency = Number(med.Frequency) || 0;
      const days = Number(med.daysCount) || 0;
      
      if (medId !== null) {
        initialQuantities[medId] = frequency * days;
      }
    });
    
    setQuantities(initialQuantities);
  }, [meds]);

  // Fetch nurses for IPD/Emergency patients
  useEffect(() => {
    const fetchNurses = async () => {
      if ((pType === 2 || pType === 3) && isButton) {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) return;

          const response = await AuthFetch(
            `doctor/${user.hospitalID}/getAllNurse`,
            token
          );
          
          if (response?.data?.message === "success") {
            setNurses(response?.data?.data || []);
          }
        } catch (error) {
          dispatch(showError("Error fetching nurses"));
        }
      }
    };

    fetchNurses();
  }, [pType, isButton, user.hospitalID]);

  /* ------------------------------------------------------------------------ */
  /*                               Calculations                               */
  /* ------------------------------------------------------------------------ */

  const calculateMedicineTotal = (med: MedicineItem) => {
    const unitPrice = Number(med.price ?? med.sellingPrice ?? 0);
    const gst = Number(med.gst ?? 0);
    const medId = med.medId ?? med.id;
    const qty = quantities[medId] ?? med.qty ?? med.updatedQuantity ?? 1;

    const safeUnit = isNaN(unitPrice) ? 0 : unitPrice;
    const safeQty = isNaN(qty) ? 1 : qty;
    const safeGst = isNaN(gst) ? 0 : gst;

    const baseTotal = safeUnit * safeQty;
    return baseTotal + (baseTotal * safeGst) / 100;
  };

  const calculateMedicinesGrandTotal = () => {
    return meds?.reduce(
      (total, med) => total + calculateMedicineTotal(med),
      0
    );
  };

  /* ------------------------------------------------------------------------ */
  /*                            Quantity Handlers                            */
  /* ------------------------------------------------------------------------ */

  const handleDecrement = (id: number, currentQuantity: number) => {
    if (currentQuantity > 1) {
      setQuantities((prev) => {
        const updatedQuantities = { ...prev, [id]: currentQuantity - 1 };

        const medicine = meds.find((med) => (med.medId ?? med.id) === id);
        if (medicine && "Frequency" in medicine && "daysCount" in medicine) {
          const initialQuantity = medicine.Frequency * medicine.daysCount;
          setDecreasedQuantities((prevDecreased) => ({
            ...prevDecreased,
            [id]: updatedQuantities[id] < initialQuantity,
          }));
        }
        return updatedQuantities;
      });
    }
  };

  const handleIncrement = (id: number, currentQuantity: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: currentQuantity + 1,
    }));
  };

  const handleReasonChange = (medicineId: number, value: string) => {
    setReasons((prev) => ({ ...prev, [medicineId]: value }));
  };

  /* ------------------------------------------------------------------------ */
  /*                            Action Handlers                               */
  /* ------------------------------------------------------------------------ */

  const handleApproveOrder = async () => {
    try {
      setIsProcessing(true);
      
      // For IPD/Emergency patients, nurse selection is required
      if ((pType === 2 || pType === 3) && !selectedNurse) {
        dispatch(showError("Please select a nurse for IPD/Emergency patients"));
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        return;
      }

      const payload: any = {};

      // Check if quantities were changed
      const hasQuantityChanges = Object.keys(quantities).some((id) => {
        const medicine = meds.find((med) => (med.medId ?? med.id) === Number(id));
        return medicine && quantities[id] !== medicine.Frequency * medicine.daysCount;
      });

      if (hasQuantityChanges) {
        payload.updatedQuantities = quantities;
      }

      // Include reasons if any quantity was decreased
      if (Object.keys(reasons).length > 0) {
        payload.reasons = reasons;
      }

      // Include nurse ID for IPD/Emergency
      if (selectedNurse) {
        payload.nurseID = selectedNurse.id;
      }

      const response = await AuthPost(
        `medicineInventoryPatientsOrder/${user.hospitalID}/completed/${patientTimeLineID}/updatePatientOrderStatus`,
        payload,
        token
      );

      if (response?.data?.status === 200 || response.status === 201) {
        let successMsg = "Order approved successfully";

        if (response?.datra?.message?.includes("No medicine updates required") || 
            response?.data?.message?.includes("Stock levels are sufficient")) {
          successMsg = "Approved – Stock already sufficient";
        } else if (response?.data?.message) {
          successMsg = response?.data?.message;
        }

        dispatch(showSuccess(successMsg));
        
        // Navigate back after success
        setTimeout(() => {
          // You might want to add navigation logic here
        }, 1000);
      } else {
        dispatch(showError(response?.data?.message || "Failed to approve order"));
      }
    } catch (error: any) {
      dispatch(showError(error.response?.data?.message || "Failed to approve order"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectReason.trim()) {
      dispatch(showError("Please enter a rejection reason"));
      return;
    }

    try {
      setIsProcessing(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        return;
      }

      const response = await AuthPost(
        `medicineInventoryPatientsOrder/${user.hospitalID}/rejected/${patientTimeLineID}/updatePatientOrderStatus`,
        { rejectReason },
        token
      );

      if (response?.data?.status === 200 || response.status === 201) {
        dispatch(showSuccess("Order rejected successfully"));
        setShowRejectModal(false);
        setRejectReason("");
        
        // Navigate back after success
        setTimeout(() => {
          // You might want to add navigation logic here
        }, 1000);
      } else {
        dispatch(showError(response?.data?.message || "Failed to reject order"));
      }
    } catch (error: any) {
      dispatch(showError(error.response?.data?.message || "Failed to reject order"));
    } finally {
      setIsProcessing(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                            Billing Summary View                          */
  /* ------------------------------------------------------------------------ */

  const renderBillingSummary = () => {
    const medsTotal = calculateMedicinesGrandTotal();
    const paid = parseFloat(paidAmount || "0") || 0;
    const due = parseFloat(dueAmount || "0") || medsTotal - paid;

    return (
      <View style={styles.billingSummary}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Medicines Total</Text>
            <Text style={styles.summaryValue}>₹{medsTotal.toFixed(2)}</Text>
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
              ₹{Math.max(0, due).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMedicineTakenBy = (nurseID?: number, datetime?: string) => {
    if (!nurseID) return null;

    const nurse = nurses.find((n) => n.id === nurseID);

    return (
      <View style={styles.medicineTakenContainer}>
        <View style={styles.medicineTakenContent}>
          <Text style={styles.medicineTakenText}>
            Medication Taken by <Text style={styles.nurseName}>
              {nurse ? `Nurse ${nurse.firstName} ${nurse.lastName}` : `Nurse #${nurseID}`}
            </Text>
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

  /* ------------------------------------------------------------------------ */
  /*                          Render Medicine Card                            */
  /* ------------------------------------------------------------------------ */

  const renderMedicineCard = (med: MedicineItem, index: number) => {
    const medId = med.medId ?? med.id;
    const name = med.name || med.medicineName || "Unnamed Medicine";
    const initialQty = med.Frequency && med.daysCount ? med.Frequency * med.daysCount : med.qty ?? 1;
    const currentQty = quantities[medId] ?? initialQty;
    const unitPrice = med.price ?? med.sellingPrice ?? 0;
    const gst = med.gst ?? 0;
    const lineTotal = calculateMedicineTotal(med);
    const showQuantityControls = isButton && !isRejected && alertFrom === "Pharmacy";

    return (
      <View key={medId || `med-${index}`} style={styles.medicineCard}>
        <View style={styles.medicineHeader}>
          <View style={styles.medicineBadge}>
            <Text style={styles.medicineBadgeText}>
              Medicine {index + 1}
            </Text>
          </View>
          <Text style={styles.medicineId}>ID: {medId}</Text>
        </View>

        <View style={styles.medicineContent}>
          <Text style={styles.medicineName}>{name}</Text>

          <View style={styles.medicineDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>
                {medicineCategoryReverse[Number(med.medicineType)] || med.medicineType || "N/A"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>HSN Code:</Text>
              <Text style={styles.detailValue}>{med.hsn || "N/A"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity:</Text>
              {showQuantityControls ? (
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleDecrement(Number(medId), currentQty)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityDisplay}>{currentQty}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleIncrement(Number(medId), currentQty)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.detailValue}>{currentQty}</Text>
              )}
            </View>

            {labBilling && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Unit Price:</Text>
                  <Text style={styles.detailValue}>₹{unitPrice.toFixed(2)}</Text>
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

          {/* Reason Input for Decreased Quantity */}
          {decreasedQuantities[Number(medId)] && (
            <View style={styles.reasonInputContainer}>
              <Text style={styles.reasonLabel}>Reason for quantity reduction:</Text>
              <TextInput
                style={styles.reasonInput}
                value={reasons[Number(medId)] || ""}
                onChangeText={(text) => handleReasonChange(Number(medId), text)}
                placeholder="Enter reason for reducing quantity..."
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {isRejected && med?.reason && (
            <View style={styles.rejectionSection}>
              <Text style={styles.rejectionLabel}>Rejection Reason</Text>
              <Text style={styles.rejectionReason}>{med?.reason}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  /* ------------------------------------------------------------------------ */
  /*                            Action Buttons                                */
  /* ------------------------------------------------------------------------ */

  const renderActionButtons = () => {
    if (!isButton || isRejected) return null;

    return (
      <View style={styles.actionButtonsContainer}>
        {/* Nurse Selection for IPD/Emergency */}
        {(pType === 2 || pType === 3) && (
          <View style={styles.nurseSelectionContainer}>
            <Text style={styles.nurseLabel}>Select Nurse:</Text>
            <ScrollView horizontal style={styles.nurseScrollView}>
              {nurses.map((nurse) => (
                <TouchableOpacity
                  key={nurse.id}
                  style={[
                    styles.nurseButton,
                    selectedNurse?.id === nurse.id && styles.nurseButtonSelected,
                  ]}
                  onPress={() => setSelectedNurse(nurse)}
                >
                  <Text
                    style={[
                      styles.nurseButtonText,
                      selectedNurse?.id === nurse.id && styles.nurseButtonTextSelected,
                    ]}
                  >
                    {nurse.firstName} {nurse.lastName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonsRow}>
          {/* Reject Button - Show for OPD patients */}
          {(pType === 1 || pType === 21) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setShowRejectModal(true)}
              disabled={isProcessing}
            >
              <Text style={styles.rejectButtonText}>
                {isProcessing ? "Processing..." : "Reject"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Approve Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApproveOrder}
            disabled={isProcessing}
          >
            <Text style={styles.approveButtonText}>
              {isProcessing ? "Processing..." : "Approve"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ------------------------------------------------------------------------ */
  /*                                  Render                                  */
  /* ------------------------------------------------------------------------ */

  const hasMeds = meds?.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.headerTitle}>Pharmacy Order Details</Text>
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
        style={styles.medicinesContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        contentContainerStyle={[
          styles.medicinesContentContainer,
          !hasMeds && styles.emptyContent,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Medicines Section */}
        {hasMeds && (
          <View>
            <Text style={styles.sectionHeader}>Medicine Details</Text>
            {meds.map((med, index) => renderMedicineCard(med, index))}
          </View>
        )}

        {/* Medicine Taken By Section */}
        {nurseID && renderMedicineTakenBy(nurseID, patientData?.addedOn)}

        {/* Empty State */}
        {!hasMeds && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataIcon}>🔍</Text>
            <Text style={styles.noDataText}>
              No medicine details available
            </Text>
            <Text style={styles.noDataSubtext}>
              There are no medicine records associated with this order.
            </Text>
          </View>
        )}
      </ScrollView>

      {labBilling && renderBillingSummary()}

      {renderActionButtons()}

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectDialog}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Reject Order</Text>
              <Text style={styles.dialogSubtitle}>
                Please provide a reason for rejection
              </Text>
            </View>
            <View style={styles.reasonInputContainer}>
              <TextInput
                style={styles.rejectReasonInput}
                placeholder="Enter rejection reason..."
                placeholderTextColor={COLORS.placeholder}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.confirmRejectButton]}
                onPress={handleRejectOrder}
                disabled={isProcessing}
              >
                <Text style={styles.confirmRejectButtonText}>
                  {isProcessing ? "Processing..." : "Confirm Reject"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  medicinesContainer: {
    maxHeight: 400,
  },
  medicinesContentContainer: {
    paddingBottom: SPACING.lg,
    flexGrow: 1,
  },
  emptyContent: {
    flexGrow: 1,
  },
  medicineCard: {
    backgroundColor: "transparent",
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
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.md,
    fontWeight: "bold",
  },
  quantityDisplay: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    minWidth: 30,
    textAlign: "center",
  },
  reasonInputContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasonLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
    marginBottom: SPACING.xs,
  },
  reasonInput: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.sm,
    minHeight: 60,
    textAlignVertical: "top",
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
    padding: SPACING.md,
    backgroundColor: COLORS.card,
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
    paddingHorizontal: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  dueAmount: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  paidAmount: {
    color: COLORS.success,
    fontWeight: '700',
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
  actionButtonsContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nurseSelectionContainer: {
    marginBottom: SPACING.md,
  },
  nurseLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  nurseScrollView: {
    flexGrow: 0,
  },
  nurseButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nurseButtonSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  nurseButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  nurseButtonTextSelected: {
    color: COLORS.buttonText,
    fontWeight: "600",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  approveButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  rejectButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  rejectDialog: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 500,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogHeader: {
    marginBottom: SPACING.md,
  },
  dialogTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.danger,
    marginBottom: SPACING.xs,
  },
  dialogSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  rejectReasonInput: {
    borderWidth: 2,
    borderColor: COLORS.danger,
    borderRadius: 8,
    padding: SPACING.sm,
    minHeight: 100,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    textAlignVertical: "top",
    backgroundColor: COLORS.field,
  },
  dialogButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  dialogButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.sub,
  },
  confirmRejectButton: {
    backgroundColor: COLORS.danger,
  },
  cancelButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  confirmRejectButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
});

export default PharmacyInnerTable;