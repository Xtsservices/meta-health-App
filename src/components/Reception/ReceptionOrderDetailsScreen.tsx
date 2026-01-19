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
import { showSuccess, showError, showWarning } from "../../store/toast.slice";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Utils
import {
  SPACING,
  FONT_SIZE,
  isTablet,
  isSmallDevice,
  FOOTER_HEIGHT,
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";
import { formatDate } from "../../utils/dateTime";
import { UserIcon, ArrowLeft, AlertCircle, ChevronDown } from "lucide-react-native";
import Footer from "../dashboard/footer";
import { RootStackParamList } from "../../navigation/navigationTypes";

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
  doctorName?: string;
  rejectedReason?: string;
  alertStatus?: string;
  status?: string;
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
  quantity?: number;
  updatedQuantity?: number;
  Frequency?: number;
  daysCount?: number;
  medId?: number;
  category?: string;
  nurseID?: number;
  datetime?: string;
  doctorName?: string;
  rejectReason?: string;
  rejectedOn?: string;
  rejectedBy?: number;
  status?: string;
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
  testsList?: TestItem[];
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

interface RouteParams {
  orderData: OrderData;
  patientID: string;
  patientTimeLineID: string;
  departmentName?: string;
  isRejectedTab?: boolean;
  doctorName?: string; 
  orderDate?: string; 
}

const medicineCategoryReverse: Record<number, string> = {
  1: "Tablet",
  2: "Capsule", 
  3: "Syrup",
  4: "Injection",
  5: "Ointment",
  6: "Drops"
};

const ReceptionOrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);
  const [nurseError, setNurseError] = useState("");
  const { orderData, patientID, patientTimeLineID, departmentName: passedDepartmentName ,isRejectedTab = false,doctorName: passedDoctorName,orderDate: passedOrderDate } = route.params as RouteParams;

  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [originalQuantities, setOriginalQuantities] = useState<{ [key: string]: number }>({});
  const [decreasedQuantities, setDecreasedQuantities] = useState<{ [key: string]: boolean }>({});
  const [reasons, setReasons] = useState<{ [key: string]: string }>({});
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [nurses, setNurses] = useState<NurseType[]>([]);
  const [selectedNurse, setSelectedNurse] = useState<NurseType | null>(null);
  const [showNurseModal, setShowNurseModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [currentMedicineId, setCurrentMedicineId] = useState<string | null>(null);
  const [currentOriginalQuantity, setCurrentOriginalQuantity] = useState<number>(0);
  const [tempReason, setTempReason] = useState("");

  // Check if there are any rejected medicines or tests
  const hasRejectedMedicines = orderData?.medicinesList?.some(med => (med.status === "rejected" && med.rejectReason) || (med.alertStatus === "rejected" && med.rejectedReason)) || false;
  const hasRejectedTests = orderData?.testsList?.some(test => (test.status === "rejected" && test.rejectedReason) || (test.alertStatus === "rejected" && test.rejectedReason)) || false;
  
  // Check if any item is rejected (either medicine or test)
  const hasRejectedItems = hasRejectedMedicines || hasRejectedTests;

  // Check if this is IPD/Emergency (needs nurse selection for medicines)
  const isIpdOrEmergency = orderData?.departmemtType === 2 || orderData?.departmemtType === 3 || orderData?.ptype === 2 || orderData?.ptype === 3;
  
  // Check if order has medicines
  const hasMedicines = orderData?.medicinesList && orderData.medicinesList.length > 0;
  
  // Check if order has tests
  const hasTests = orderData?.testsList && orderData.testsList.length > 0;
 
  // Initialize quantities from order data
  useEffect(() => {
    const initialQuantities: { [key: string]: number } = {};
    const initialOriginalQuantities: { [key: string]: number } = {};
    const initialDecreasedQuantities: { [key: string]: boolean } = {};
    
    orderData?.medicinesList?.forEach((medicine) => {
      const medId = medicine.medId?.toString() ?? medicine.id?.toString();
      const frequency = Number(medicine.Frequency) || 0;
      const days = Number(medicine.daysCount) || 0;
      
      if (medId) {
        // Use quantity from data, otherwise calculate from frequency * days
        const quantityFromData = medicine.quantity || (frequency * days);
        initialQuantities[medId] = quantityFromData;
        initialOriginalQuantities[medId] = quantityFromData; // Store original quantity
        
        // Mark as decreased if quantity is less than original (if we had original)
        initialDecreasedQuantities[medId] = false;
      }
    });
    
    setQuantities(initialQuantities);
    setOriginalQuantities(initialOriginalQuantities);
    setDecreasedQuantities(initialDecreasedQuantities);
  }, [orderData]);

  // Fetch nurses for IPD/Emergency orders with medicines
  useEffect(() => {
    const fetchNurses = async () => {
      if (!isIpdOrEmergency || !hasMedicines) return;

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const response = await AuthFetch(
          `doctor/${user.hospitalID}/getAllNurse`,
          token
        ) as any;

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
  }, [isIpdOrEmergency, hasMedicines, user.hospitalID]);


  const calculateTestTotal = (test: TestItem) => {
    const price = Number(test?.testPrice || 0);
    const gst = test?.gst !== undefined && test?.gst !== null
      ? Number(test.gst)
      : 18;
    const base = isNaN(price) ? 0 : price;
    const gstVal = isNaN(gst) ? 0 : gst;
    return base + (base * gstVal) / 100;
  };

  const calculateMedicineTotal = (medicine: MedicineItem) => {
    const medId = medicine.medId?.toString() ?? medicine.id?.toString();
    const quantity = medId ? quantities[medId] : medicine.quantity ?? 1;
    const unitPrice = medicine.sellingPrice ?? medicine.price ?? 0;
    const gst = medicine.gst ?? 18;
    
    const baseTotal = unitPrice * quantity;
    const gstAmount = (baseTotal * gst) / 100;
    return baseTotal + gstAmount;
  };

  const calculateTestsTotal = () => {
    return orderData?.testsList?.reduce((total, test) => {
      return total + calculateTestTotal(test);
    }, 0) || 0;
  };

  const calculateMedicinesTotal = () => {
    return orderData?.medicinesList?.reduce((total, medicine) => {
      return total + calculateMedicineTotal(medicine);
    }, 0) || 0;
  };

  const calculateOrderTotal = () => {
    return calculateTestsTotal() + calculateMedicinesTotal();
  };

  const handleApproveOrder = async () => {
    try {
      // Validate nurse selection for IPD/Emergency with medicines
      if (isIpdOrEmergency && hasMedicines && !selectedNurse) {
        setNurseError("Please select a nurse first for IPD/Emergency medicine orders");
        dispatch(showError("Please select a nurse first for IPD/Emergency medicine orders"));
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

      // Add updated quantities if any changes were made to medicines
      const hasQuantityChanges = Object.keys(quantities).some(medId => {
        const originalQty = originalQuantities[medId];
        return quantities[medId] !== originalQty;
      });

      if (hasQuantityChanges) {
        payload.updatedQuantities = quantities;
      }

      // Add reasons if any quantity was decreased
      if (Object.keys(reasons).length > 0) {
        payload.reasons = reasons;
      }

      // Determine which parts to update
      if (hasTests && hasMedicines) {
        payload.updateMedicines = true;
        payload.updateTests = true;
      } else if (hasTests && !hasMedicines) {
        payload.updateTests = true;
      } else if (!hasTests && hasMedicines) {
        payload.updateMedicines = true;
      }

      const response = await AuthPost(
        `reception/${user.hospitalID}/completed/${patientID}/${patientTimeLineID}/updateReceptionAlerts`,
        payload,
        token
      ) as any;

      if (response?.data?.status === 200 || response?.status === 200) {
        const successMessage = response?.data?.message || "Order approved successfully";
        dispatch(showSuccess(successMessage));
        navigation.navigate("AlertsLab", {
          refresh: true,
        });
      } else {
        const errorMessage =
          response?.data?.message ||
          response?.message ||
          "Failed to approve order";

        if (errorMessage === "Stock is low for selected medicines") {
          dispatch(showWarning(errorMessage));
        } else {
          dispatch(showError(errorMessage));
        }
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

      // Determine which parts to update
      let payload: any = { rejectReason };
      
      if (hasTests && hasMedicines) {
        payload.updateMedicines = true;
        payload.updateTests = true;
      } else if (hasTests && !hasMedicines) {
        payload.updateTests = true;
      } else if (!hasTests && hasMedicines) {
        payload.updateMedicines = true;
      }

      const response = await AuthPost(
        `reception/${user.hospitalID}/rejected/${patientID}/${patientTimeLineID}/updateReceptionAlerts`,
        payload,
        token
      ) as any;
      
      if (response?.data?.status === 200 || response?.status === 200) {
        dispatch(showSuccess("Order rejected successfully"));
        setShowRejectModal(false);
        setRejectReason("");
        navigation.navigate("AlertsLab", {
          refresh: true,
        });
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
    // If departmentName was passed from navigation, use it
    if (passedDepartmentName && passedDepartmentName !== "Unknown Department") {
      return passedDepartmentName;
    }
    
    // Otherwise fallback to the type-based logic
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
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
              </Text>
            </View>

<View style={styles.row}>
  <Text style={styles.label}>Doctor</Text>
  <Text style={styles.value}>
    {/* Use passed doctor name if available, otherwise fallback */}
    {passedDoctorName && passedDoctorName !== "Not Assigned"
      ? passedDoctorName
      : orderData?.doctor_firstName && orderData?.doctor_lastName
      ? `${orderData.doctor_firstName} ${orderData.doctor_lastName}`
      : orderData?.doctor_firstName ||
        orderData?.testsList?.[0]?.doctorName ||
        orderData?.medicinesList?.[0]?.doctorName ||
        "Not Assigned"}
  </Text>
</View>

<View style={styles.row}>
  <Text style={styles.label}>Order Date</Text>
  <Text style={styles.value}>
    {/* Use passed order date if available, otherwise fallback */}
    {passedOrderDate && passedOrderDate !== "-"
      ? passedOrderDate
      : formatDate(orderData?.addedOn)}
  </Text>
</View>
            
            {/* Nurse Information for IPD/Emergency with medicines */}
            {isIpdOrEmergency && hasMedicines && !hasRejectedItems && (
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
                      <UserIcon size={16} color={nurseError ? COLORS.danger : COLORS.brand} />
                      <Text style={[
                        styles.value,
                        !selectedNurse && styles.nursePlaceholder,
                        nurseError && styles.nurseErrorText
                      ]}>
                        {selectedNurse 
                          ? `${selectedNurse.firstName} ${selectedNurse.lastName}`
                          : " Tap to select nurse"
                        }
                      </Text>
                      <ChevronDown size={16} color={nurseError ? COLORS.danger : COLORS.brand} />
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
                    * Nurse selection is required for IPD/Emergency medicine orders
                  </Text>
                )}
              </View>
            )}
            
            {/* Rejection Reason Display */}
            {hasRejectedItems && (
              <View style={styles.rejectionSection}>
                <View style={styles.row}>
                  <Text style={styles.label}>Rejection Reason</Text>
                  <View style={styles.rejectionReasonContainer}>
                    <Text style={styles.rejectionReasonText}>
                      {orderData?.medicinesList?.find(med => med.rejectReason || med.rejectedReason)?.rejectReason || 
                       orderData?.medicinesList?.find(med => med.rejectReason || med.rejectedReason)?.rejectedReason ||
                       orderData?.testsList?.find(test => test.rejectedReason)?.rejectedReason || "n"}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Tests List */}
          {hasTests && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Tests ({orderData.testsList?.length})
              </Text>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { flex: 2 }]}>Test Name</Text>
              </View>

              {orderData.testsList?.map((test, index) => {
                const totalAmount = calculateTestTotal(test);
                
                return (
                  <View key={test.id || `test-${index}`} style={styles.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.tdMain}>
                        {test.test || test.testName || "Unnamed Test"}
                      </Text>
                      {test.hsn ? (
                        <Text style={styles.tdSub}>HSN: {test.hsn}</Text>
                      ) : null}
                      <Text style={styles.tdSub}>
                        • Lonic Code: {test.loinc_num_ || 0}
                      </Text>
                    </View>
                 
                  </View>
                );
              })}
            </View>
          )}

          {/* Medicines List */}
          {hasMedicines && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Medicines ({orderData.medicinesList?.length})
              </Text>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { flex: 2 }]}>Name</Text>
                <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                  Qty
                </Text>
              </View>

              {orderData.medicinesList?.map((medicine, index) => {
                const medId = (medicine.medId?.toString() ?? medicine.id?.toString());
                const currentQuantity = medId ? quantities[medId] : medicine.quantity || 1;
                const originalQuantity = medId ? originalQuantities[medId] : currentQuantity;
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
                        Price: ₹{medicine.sellingPrice || medicine.price || 0} 
                      </Text>
                      {decreasedQuantities[medId || ''] && (
                        <View style={styles.reasonContainer}>
                          <Text style={styles.reasonLabel}>Reason for decrease: {reasons[medId || '']}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <View style={styles.quantityControls}>
                        <View style={styles.quantityDisplay}>
                          <Text style={styles.quantityValue}>{currentQuantity}</Text>
                          {currentQuantity < originalQuantity && (
                            <Text style={styles.originalQuantityText}>
                              /{originalQuantity}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>

{/* Action Buttons - Fixed at bottom above footer */}
{!isRejectedTab && (
  <View style={styles.actionButtons}>
    <TouchableOpacity
      style={[styles.actionButton, styles.rejectButton]}
      onPress={() => setShowRejectModal(true)}
      disabled={isProcessing}
    >
      <Text style={styles.rejectButtonText}>
        {isProcessing ? "Processing..." : "✗ Reject Order"}
      </Text>
    </TouchableOpacity>
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
)}

        {/* Footer */}
        <View style={styles.footerWrap}>
          <Footer active={"reception"} brandColor={COLORS.brand} />
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
              Choose a nurse for this medicine order
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

      {/* Quantity Decrease Reason Modal */}
      <Modal
        visible={showReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowReasonModal(false);
          setTempReason("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reasonModal}>
            <Text style={styles.modalTitle}>Reason for Decreasing Quantity</Text>
            <Text style={styles.modalSubtitle}>
              You're decreasing quantity below the original order.
              Please provide a reason:
            </Text>
            
            {currentMedicineId && (
              <Text style={styles.quantityInfo}>
                Original Quantity: {currentOriginalQuantity} → New Quantity: {quantities[currentMedicineId] - 1}
              </Text>
            )}
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for decreasing quantity..."
              placeholderTextColor={COLORS.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={tempReason}
              onChangeText={setTempReason}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowReasonModal(false);
                  setTempReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                disabled={!tempReason.trim()}
              >
                <Text style={styles.confirmButtonText}>
                  Confirm Decrease
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRejectModal(false);
          setRejectReason("");
        }}
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
                disabled={isProcessing || !rejectReason.trim()}
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
    marginTop:SPACING.md
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xxl,
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
    paddingBottom: 160,
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
  rejectionSection: {
    marginTop: 8,
  },
  rejectionReasonContainer: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
    maxWidth: '70%',
  },
  rejectionReasonText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    fontWeight: "600",
    textAlign: 'right',
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
  reasonContainer: {
    marginTop: 4,
    padding: 4,
    backgroundColor: COLORS.warningLight,
    borderRadius: 4,
  },
  reasonLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.warning,
    fontWeight: "600",
    fontStyle:'italic'
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
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
  originalQuantityText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginLeft: 2,
    fontStyle: 'italic',
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
  reasonModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 500,
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
  quantityInfo: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: SPACING.md,
    backgroundColor: COLORS.brandLight,
    padding: SPACING.sm,
    borderRadius: 8,
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
    borderColor: COLORS.warning,
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
  confirmButton: {
    backgroundColor: COLORS.brand,
  },
  confirmRejectButton: {
    backgroundColor: COLORS.danger,
  },
  cancelButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  confirmButtonText: {
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

export default ReceptionOrderDetailsScreen;