import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthPost, AuthFetch } from "../../auth/auth";
import { showSuccess, showError } from "../../store/toast.slice";

// Utils
import {
  SPACING,
  FONT_SIZE,
  isTablet,
  isSmallDevice,
  FOOTER_HEIGHT,
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";
import { formatDateTime } from "../../utils/dateTime";
import { UserIcon, ArrowLeft, AlertCircle } from "lucide-react-native";
import Footer from "../dashboard/footer";

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
  medId?: number;
  category?: string;
  nurseID?: number;
  datetime?: string;
}

interface OrderData {
  id: string;
  patientID?: string;
  pID?: string;
  pName?: string;
  doctor_firstName?: string;
  doctor_lastName?: string;
  addedOn?: string;
  location?: string;
  departmemtType?: number;
  ptype?: number;
  medicinesList?: MedicineItem[];
  paidAmount?: string;
  nurseID?: number;
}

interface NurseType {
  id: number;
  firstName: string;
  lastName: string;
  phoneNo: string;
  departmentID: number;
}

const medicineCategoryReverse: Record<number, string> = {
  1: "Tablet",
  2: "Capsule", 
  3: "Syrup",
  4: "Injection",
  5: "Ointment",
  6: "Drops"
};

const PharmacyOrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);
  const [nurseError, setNurseError] = useState("");
  const { orderData, patientID, patientTimeLineID } = route.params as {
    orderData: OrderData;
    patientID: string;
    patientTimeLineID: string;
  };

  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [nurses, setNurses] = useState<NurseType[]>([]);
  const [selectedNurse, setSelectedNurse] = useState<NurseType | null>(null);
  const [showNurseModal, setShowNurseModal] = useState(false);

  // Check if this is IPD/Emergency (needs nurse selection)
  const isIpdOrEmergency = orderData?.departmemtType === 2 || orderData?.departmemtType === 3 || orderData?.ptype === 2 || orderData?.ptype === 3;

  // Initialize quantities from order data
  useEffect(() => {
    const initialQuantities: { [key: string]: number } = {};
    
    orderData?.medicinesList?.forEach((medicine) => {
      const medId = medicine.medId ?? medicine.id;
      const frequency = Number(medicine.Frequency) || 0;
      const days = Number(medicine.daysCount) || 0;
      
      if (medId) {
        initialQuantities[medId.toString()] = frequency * days;
      }
    });
    
    setQuantities(initialQuantities);
  }, [orderData]);

  // Fetch nurses for IPD/Emergency orders
  useEffect(() => {
    const fetchNurses = async () => {
      if (!isIpdOrEmergency) return;

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const response = await AuthFetch(
          `doctor/${user.hospitalID}/getAllNurse`,
          token
        );

        // Fix: Check the correct response structure
        if (response?.status === "success" && Array.isArray(response?.data?.data)) {
          setNurses(response.data.data);
        } else if (Array.isArray(response?.data)) {
          // Alternative structure
          setNurses(response.data);
        } else {
          dispatch(showError("No nurses found - invalid response structure"));
        }
      } catch (error) {
        dispatch(showError("Error fetching nurses"));
      }
    };

    fetchNurses();
  }, [isIpdOrEmergency, user.hospitalID]);

  const handleDecrement = (medId: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      setQuantities(prev => ({
        ...prev,
        [medId]: currentQuantity - 1
      }));
    }
  };

  const handleIncrement = (medId: string, currentQuantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [medId]: currentQuantity + 1
    }));
  };

  const calculateMedicineTotal = (medicine: MedicineItem) => {
    const medId = medicine.medId ?? medicine.id;
    const quantity = medId ? quantities[medId.toString()] : medicine.qty ?? 1;
    const unitPrice = medicine.sellingPrice ?? medicine.price ?? 0;
    const gst = medicine.gst ?? 18;
    
    const baseTotal = unitPrice * quantity;
    const gstAmount = (baseTotal * gst) / 100;
    return baseTotal + gstAmount;
  };

  const calculateOrderTotal = () => {
    return orderData?.medicinesList?.reduce((total, medicine) => {
      return total + calculateMedicineTotal(medicine);
    }, 0) || 0;
  };

  const handleApproveOrder = async () => {
    try {
      // Validate nurse selection for IPD/Emergency
      if (isIpdOrEmergency && !selectedNurse) {
        setNurseError("Please select a nurse first for IPD/Emergency orders");
        dispatch(showError("Please select a nurse first for IPD/Emergency orders"));
        return;
      }

      setNurseError("");
      setIsProcessing(true);
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        return;
      }
      // Prepare payload
      const payload: any = {
        nurseID: selectedNurse?.id || null
      };

      // Add updated quantities if any changes were made
      const hasQuantityChanges = Object.keys(quantities).some(medId => {
        const medicine = orderData.medicinesList?.find(m => 
          (m.medId ?? m.id).toString() === medId
        );
        if (!medicine) return false;
        
        const initialQuantity = (medicine.Frequency || 0) * (medicine.daysCount || 0);
        return quantities[medId] !== initialQuantity;
      });

      if (hasQuantityChanges) {
        payload.updatedQuantities = quantities;
      }
      const response = await AuthPost(
        `medicineInventoryPatientsOrder/${user.hospitalID}/completed/${patientTimeLineID}/updatePatientOrderStatus`,
        payload,
        token
      );
      if (response?.data?.status === 201 || response?.status === 201 || response?.data?.status === 200) {
        const successMessage = response?.data?.message || "Order approved successfully";
      dispatch(showSuccess(successMessage));
        navigation.goBack();
      } else {
        const errorMessage = response?.data?.message || response?.message || "Failed to approve order";
        dispatch(showError(errorMessage));
      }
    } catch (error: any) {
      dispatch(showError(error?.response?.data?.message || "Failed to approve order"));
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
      if (response?.data?.status === 200 || response?.data?.status === 201 || response?.data?.status === 200) {
        dispatch(showSuccess("Order rejected successfully"));
        setShowRejectModal(false);
        setRejectReason("");
        navigation.goBack();
      } else {
        const errorMessage = response?.data?.message || response?.message || "Failed to reject order";
        dispatch(showError(errorMessage));
      }
    } catch (error: any) {
      dispatch(showError(error?.response?.data?.message || "Failed to reject order"));
    } finally {
      setIsProcessing(false);
    }
  };

  const getDepartmentName = (deptType?: number) => {
    switch (deptType) {
      case 1: return "OPD";
      case 2: return "IPD";
      case 3: return "Emergency";
      default: return "Unknown Department";
    }
  };

  const getNurseName = (nurseID?: number) => {
    if (!nurseID) return "Not assigned";
    const nurse = nurses.find(n => n.id === nurseID);
    return nurse ? `${nurse.firstName} ${nurse.lastName}` : `Nurse #${nurseID}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.brand} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Order Details</Text>
          <Text style={styles.subtitle}>
            {orderData?.pName} • {orderData?.patientID || orderData?.pID}
          </Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Patient Information Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Patient Summary</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{orderData?.pName || "Unknown Patient"}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Patient ID</Text>
              <Text style={styles.value}>
                {orderData?.patientID || orderData?.pID || "-"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Department</Text>
              <Text style={styles.value}>
                {getDepartmentName(orderData?.departmemtType || orderData?.ptype)}
                {isIpdOrEmergency && " (IPD/Emergency)"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Doctor</Text>
              <Text style={styles.value}>
                {orderData?.firstName && orderData?.lastName
                  ? `${orderData.firstName} ${orderData.lastName}`
                  : "Not Assigned"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Order Date</Text>
              <Text style={styles.value}>
                {formatDateTime(orderData?.addedOn)}
              </Text>
            </View>
            
            {/* Nurse Information for IPD/Emergency */}
            
              <View style={styles.nurseSection}>
                <View style={styles.row}>
                  <Text style={styles.label}>Nurse</Text>
                  <TouchableOpacity 
                    onPress={() => setShowNurseModal(true)}
                    style={styles.nurseSelector}
                  >
                    <View style={[
                      styles.nurseSelectorContent,
                      !selectedNurse && styles.nurseSelectorHighlighted,
                      nurseError && styles.nurseSelectorError
                    ]}>
                      <Text style={[
                        styles.value,
                        !selectedNurse && styles.nursePlaceholder,
                        nurseError && styles.nurseErrorText
                      ]}>
                        {selectedNurse 
                          ? `${selectedNurse.firstName} ${selectedNurse.lastName}`
                          : "Tap to select nurse"
                        }
                      </Text>
                      <UserIcon size={16} color={nurseError ? COLORS.danger : COLORS.brand} />
                    </View>
                  </TouchableOpacity>
                </View>
                {nurseError ? (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={14} color={COLORS.danger} />
                    <Text style={styles.errorText}>{nurseError}</Text>
                  </View>
                ) : (
                  <Text style={styles.nurseHelpText}>
                    * Nurse selection is required 
                  </Text>
                )}
              </View>
           
          </View>

          {/* Medicines List */}
          {orderData?.medicinesList && orderData.medicinesList.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Medicines ({orderData.medicinesList.length})
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

              {orderData.medicinesList.map((medicine, index) => {
                const medId = (medicine.medId ?? medicine.id).toString();
                const currentQuantity = quantities[medId] || medicine.qty || 1;
                const totalAmount = calculateMedicineTotal(medicine);
                
                return (
                  <View key={medicine.id} style={styles.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.tdMain}>
                        {medicine.medicineName || medicine.name || "Unnamed Medicine"}
                      </Text>
                      <Text style={styles.tdSub}>
                        Type: {medicineCategoryReverse[Number(medicine.medicineType)] || medicine.category || "N/A"}
                      </Text>
                      {medicine.hsn ? (
                        <Text style={styles.tdSub}>HSN: {medicine.hsn}</Text>
                      ) : null}
                      <Text style={styles.tdSub}>
                        Price: ₹{medicine.sellingPrice || medicine.price || 0} • GST: {medicine.gst || 18}%
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleDecrement(medId, currentQuantity)}
                        >
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>{currentQuantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleIncrement(medId, currentQuantity)}
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={styles.tdMain}>
                        ₹{totalAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Medicines Total</Text>
                <Text style={styles.totalValue}>
                  ₹{calculateOrderTotal().toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Order Summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>
                ₹{calculateOrderTotal().toFixed(2)}
              </Text>
            </View>
            {orderData?.paidAmount && parseFloat(orderData.paidAmount) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid Amount:</Text>
                <Text style={styles.totalValue}>
                  ₹{parseFloat(orderData.paidAmount).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons - Fixed at bottom above footer */}
        <View style={styles.actionButtons}>
          {getDepartmentName(orderData?.departmemtType || orderData?.ptype) === "OPD" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => setShowRejectModal(true)}
            disabled={isProcessing}
          >
            <Text style={styles.rejectButtonText}>
              {isProcessing ? "Processing..." : "✗ Reject Order"}
            </Text>
          </TouchableOpacity>)}
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApproveOrder}
            disabled={isProcessing}
          >
            <Text style={styles.approveButtonText}>
              {isProcessing ? "Processing..." : "✓ Approve Order"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerWrap}>
          <Footer active={"pharmacy"} brandColor={COLORS.brand} />
        </View>
      </View>

      {/* Nurse Selection Modal */}
      <Modal
        visible={showNurseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNurseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.nurseModal}>
            <Text style={styles.modalTitle}>Select Nurse</Text>
            <Text style={styles.modalSubtitle}>
              Choose a nurse for this order
            </Text>
            
            <ScrollView style={styles.nurseList}>
              {nurses.map((nurse) => (
                <TouchableOpacity
                  key={nurse.id}
                  style={[
                    styles.nurseItem,
                    selectedNurse?.id === nurse.id && styles.selectedNurseItem
                  ]}
                  onPress={() => {
                    setSelectedNurse(nurse);
                    setNurseError("");
                    setShowNurseModal(false);
                  }}
                >
                  <Text style={styles.nurseName}>
                    {nurse.firstName} {nurse.lastName}
                  </Text>
                  <Text style={styles.nursePhone}>{nurse.phoneNo}</Text>
                </TouchableOpacity>
              ))}
              
              {nurses.length === 0 && (
                <Text style={styles.noNursesText}>
                  No nurses available. Please contact administrator.
                </Text>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowNurseModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModal}>
            <Text style={styles.modalTitle}>Reject Order</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejection
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor={COLORS.placeholder}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton]}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  headerPlaceholder: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 160, // Increased padding to ensure content doesn't hide behind buttons
  },
  card: {
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.card,
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
    marginBottom: 12,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
  },
  value: {
    fontSize: FONT_SIZE.xs,
    color: "#111827",
    fontWeight: "500",
  },
  nurseSection: {
    marginTop: 8,
  },
  nurseSelector: {
    marginTop: 4,
  },
  nurseSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.field,
  },
  nurseSelectorHighlighted: {
    borderColor: COLORS.brand,
    borderWidth: 2,
    backgroundColor: COLORS.brandLight,
  },
  nurseSelectorError: {
    borderColor: COLORS.danger,
    borderWidth: 2,
    backgroundColor: COLORS.dangerLight,
  },
  nursePlaceholder: {
    color: COLORS.brand,
    fontWeight: "600",
    marginRight: 8,
  },
  nurseErrorText: {
    color: COLORS.danger,
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    marginLeft: 4,
    fontWeight: "500",
  },
  nurseHelpText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: 4,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 6,
    marginBottom: 6,
  },
  th: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: "#4B5563",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tdMain: {
    fontSize: FONT_SIZE.xs,
    color: "#111827",
    fontWeight: "500",
    marginBottom: 2,
  },
  tdSub: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
    marginBottom: 1,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  quantityValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    minWidth: 30,
    textAlign: "center",
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
    bottom: 0,
    height: FOOTER_HEIGHT,
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  actionButtons: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    bottom: FOOTER_HEIGHT + 12,
    flexDirection: "row",
    gap: SPACING.sm,
    zIndex: 10,
    backgroundColor: COLORS.bg,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  approveButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  nurseModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  rejectModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  nurseList: {
    maxHeight: 300,
    marginBottom: SPACING.md,
  },
  nurseItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedNurseItem: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 8,
  },
  nurseName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  nursePhone: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  noNursesText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
    fontStyle: "italic",
    padding: SPACING.md,
  },
  reasonInput: {
    borderWidth: 2,
    borderColor: COLORS.danger,
    borderRadius: 8,
    padding: SPACING.sm,
    minHeight: 100,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    textAlignVertical: "top",
    backgroundColor: COLORS.field,
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
  modalButton: {
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

export default PharmacyOrderDetailsScreen;