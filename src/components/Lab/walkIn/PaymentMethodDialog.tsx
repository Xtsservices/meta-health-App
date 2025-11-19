// PaymentMethodDialog.tsx - COMPREHENSIVE VERSION
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthPost } from "../../../auth/auth";

const { width: W } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallScreen = W < 375;

type PaymentMethod = "cards" | "online" | "cash";

interface PaymentMethodDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (paymentDetails: Record<PaymentMethod, number>) => void;
  amount: number;
  selectedTests: any[];
  formData: any;
  files: any[];
  discount: number;
  discountReason: string;
  discountReasonID: string;
  department: string;
  user: any;
}

interface PaymentAmounts {
  cards: number;
  online: number;
  cash: number;
}

const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
  visible,
  onClose,
  onSubmit,
  amount,
  selectedTests,
  formData,
  files,
  discount,
  discountReason,
  discountReasonID,
  department,
  user,
}) => {
  const navigation = useNavigation();
  
  const [selectedMethods, setSelectedMethods] = useState<Set<PaymentMethod>>(new Set());
  const [enteredAmount, setEnteredAmount] = useState<PaymentAmounts>({
    cards: 0,
    online: 0,
    cash: 0,
  });

  const [dueAmount, setDueAmount] = useState(amount);
  const [paidAmount, setPaidAmount] = useState(0);
  const [totalDue, setTotalDue] = useState(amount);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedMethods(new Set());
      setEnteredAmount({ cards: 0, online: 0, cash: 0 });
      setDueAmount(amount);
      setPaidAmount(0);
      setTotalDue(amount);
    }
  }, [visible, amount]);

  // Update amounts when entered amounts change
  useEffect(() => {
    const totalPaid = Object.values(enteredAmount).reduce((sum, amt) => sum + amt, 0);
    setPaidAmount(totalPaid);
    setTotalDue(amount - totalPaid);
  }, [enteredAmount, amount]);

  const handleCheckboxChange = (method: PaymentMethod) => {
    const newSelectedMethods = new Set(selectedMethods);
    if (newSelectedMethods.has(method)) {
      newSelectedMethods.delete(method);
      setEnteredAmount(prev => ({ ...prev, [method]: 0 }));
    } else {
      newSelectedMethods.add(method);
    }
    setSelectedMethods(newSelectedMethods);
  };

  const handleAmountChange = (method: PaymentMethod, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;

    setEnteredAmount(prev => ({
      ...prev,
      [method]: numValue
    }));
  };

  const isSubmitEnabled = () => {
    const totalEnteredAmount = Object.values(enteredAmount).reduce((sum, amt) => sum + amt, 0);
    return selectedMethods.size > 0 && totalEnteredAmount > 0 && Math.abs(totalEnteredAmount - amount) < 0.01;
  };

  const handleSubmit = async () => {
    if (!isSubmitEnabled()) {
      Alert.alert("Error", "Please ensure the paid amount matches the total due amount.");
      return;
    }

    const paymentDetails = Array.from(selectedMethods).reduce((acc, method) => {
      acc[method] = enteredAmount[method];
      return acc;
    }, {} as Record<PaymentMethod, number>);

    // Add timestamp
    const paymentDataWithTime = {
      ...paymentDetails,
      timestamp: new Date().toISOString(),
    };

    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        Alert.alert("Error", "Authentication failed");
        return;
      }

      const labsPath = `tests/walkinPatients/${department}`;
      const formDataToSend = new FormData();

      // Append first file
      if (files.length > 0) {
        const file = files[0];
        const uploadUri = Platform.OS === "ios" && file.uri?.startsWith("file://") ? file.uri : file.uri;

        formDataToSend.append("files", {
          uri: uploadUri,
          type: file.mimeType || file.type || "application/octet-stream",
          name: file.name || `file_${Date.now()}`,
        } as any);
      }

      formDataToSend.append("testsList", JSON.stringify(selectedTests));
      formDataToSend.append("patientData", JSON.stringify(formData));
      formDataToSend.append("userID", user.id?.toString() ?? "");
      formDataToSend.append("department", department);
      formDataToSend.append("paymentMethod", JSON.stringify(paymentDataWithTime));
      formDataToSend.append("paymentAmount", amount.toString());
      formDataToSend.append("discount", JSON.stringify({ discount, discountReason, discountReasonID }));

      const response = await AuthPost(`medicineInventoryPatients/${user.hospitalID}/${labsPath}`, formDataToSend, token);
      console.log("reslabpay",response)
      if (response?.data?.status === 200 || response.message === "success") {
        Alert.alert("Success", "Patient and test order added successfully");
        onSubmit(paymentDataWithTime);
        onClose();
        
        // Navigate back to previous screen
        navigation.goBack();
      } else {
        Alert.alert("Error", response.message || "Failed to add order");
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      Alert.alert("Error", error?.response?.data?.message || "Failed to add order");
    }
  };

  const PaymentMethodRow = ({ method, label, icon }: { method: PaymentMethod; label: string; icon: string }) => (
    <View style={styles.paymentMethodRow}>
      <View style={styles.paymentMethodHeader}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleCheckboxChange(method)}
        >
          <View style={[
            styles.checkbox,
            selectedMethods.has(method) && styles.checkboxSelected
          ]}>
            {selectedMethods.has(method) && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.paymentMethodLabel}>{label}</Text>
        </TouchableOpacity>

        {selectedMethods.has(method) && (
          <View style={styles.amountInputContainer}>
            <Text style={styles.amountLabel}>Enter Amount:</Text>
            <TextInput
              style={styles.amountInput}
              value={enteredAmount[method] === 0 ? "" : enteredAmount[method].toString()}
              onChangeText={(value) => handleAmountChange(method, value)}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        )}
      </View>

      <View style={styles.paymentIcons}>
        <Text style={styles.paymentIcon}>{icon}</Text>
      </View>

      <View style={styles.separator} />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Payment Received Through</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeIcon}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Payment Image */}
            <View style={styles.paymentImageContainer}>
              <Text style={styles.paymentImage}>💰</Text>
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentMethodsContainer}>
              <Text style={styles.sectionTitle}>Select Payment Method</Text>

              <PaymentMethodRow 
                method="cards" 
                label="Credit or Debit Cards" 
                icon="💳"
              />
              
              <PaymentMethodRow 
                method="online" 
                label="Online Payment" 
                icon="🌐"
              />
              
              <PaymentMethodRow 
                method="cash" 
                label="Cash" 
                icon="💵"
              />
            </View>

            {/* Amount Summary */}
            <View style={styles.amountSummary}>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Due Amount</Text>
                <View style={styles.amountValueContainer}>
                  <Text style={styles.rsSymbol}>Rs.</Text>
                  <Text style={styles.amountValue}>{dueAmount.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Paid Amount</Text>
                <View style={styles.amountValueContainer}>
                  <Text style={styles.rsSymbol}>Rs.</Text>
                  <Text style={styles.amountValue}>{paidAmount.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Total Due</Text>
                <View style={styles.amountValueContainer}>
                  <Text style={styles.rsSymbol}>Rs.</Text>
                  <Text style={[styles.amountValue, totalDue > 0 ? styles.amountDue : styles.amountZero]}>
                    {totalDue.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, !isSubmitEnabled() && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isSubmitEnabled()}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    position: "relative",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1977F3",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeIcon: {
    fontSize: 20,
    color: "#374151",
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 20,
  },
  paymentImageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  paymentImage: {
    fontSize: 80,
  },
  paymentMethodsContainer: {
    backgroundColor: "#F5F8FF",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  paymentMethodRow: {
    marginBottom: 8,
  },
  paymentMethodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#007bff",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#007bff",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  amountInputContainer: {
    alignItems: "flex-end",
  },
  amountLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  amountInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
    width: 120,
    textAlign: "center",
    fontSize: 14,
  },
  paymentIcons: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  paymentIcon: {
    fontSize: 20,
  },
  separator: {
    height: 1,
    backgroundColor: "#B2CAEA",
    marginVertical: 12,
  },
  amountSummary: {
    backgroundColor: "#F5F8FF",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    height: 35,
  },
  amountValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    minWidth: 150,
  },
  rsSymbol: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginRight: 8,
  },
  amountValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  amountDue: {
    color: "#ef4444",
  },
  amountZero: {
    color: "#059669",
  },
  submitButton: {
    backgroundColor: "#F59706",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default PaymentMethodDialog;