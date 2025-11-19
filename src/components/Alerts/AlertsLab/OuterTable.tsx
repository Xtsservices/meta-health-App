import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Dimensions,
  Alert,
} from "react-native";
import InnerTable from "./InnerTable";
import { AuthPost } from "../../../auth/auth"; // CHANGED: Import AuthPost instead of AuthFetch
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector } from "react-redux";

const { width: W } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallScreen = W < 375;

interface PatientOuterTableProps {
  title: string;
  data: any[];
  isButton: boolean;
  patientOrderPay?: string;
  patientOrderOpd?: string;
  isBilling?: boolean;
  alertFrom?: string;
  expandedPatientId?: string | null;
  onPatientExpand?: (patientId: string | null) => void;
  isRejectedTab?: boolean;
}

const PatientOuterTable: React.FC<PatientOuterTableProps> = ({
  title,
  data,
  isButton,
  patientOrderPay,
  patientOrderOpd,
  isBilling,
  alertFrom,
  expandedPatientId,
  onPatientExpand,
  isRejectedTab = false,
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [actionValues, setActionValues] = useState<{ [key: string]: string }>({});
  const [rejectReasons, setRejectReasons] = useState<{ [key: string]: string }>({});
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
  const user = useSelector((state: any) => state.currentUser);

  const handleRowClick = (id: string) => {
    const newExpandedRow = expandedRow === id ? null : id;
    setExpandedRow(newExpandedRow);
    
    if (onPatientExpand) {
      onPatientExpand(newExpandedRow === id ? id : null);
    }
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const calculateDueAmount = (order: any) => {
    if (!order.testsList || order.testsList.length === 0) return 0;
    
    let totalAmount = 0;
    order.testsList.forEach((test: any) => {
      const price = test.testPrice || 0;
      const gst = test.gst || 18;
      totalAmount += price + (price * gst) / 100;
    });
    
    const paidAmount = parseFloat(order.paidAmount || "0");
    return Math.max(0, totalAmount - paidAmount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid Date";
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "completed" || statusLower === "paid" || statusLower === "accepted") {
      return { backgroundColor: "#10B981", color: "#065F46" };
    }
    if (statusLower === "pending") {
      return { backgroundColor: "#F59E0B", color: "#92400E" };
    }
    if (statusLower === "rejected") {
      return { backgroundColor: "#EF4444", color: "#991B1B" };
    }
    return { backgroundColor: "#6B7280", color: "#F9FAFB" };
  };

  const handleActionChange = async (id: string, value: string) => {
    if (value === "Accepted") {
      await handleApproveOrder(id);
    } else if (value === "Rejected") {
      setShowRejectDialog(id);
    } else {
      setActionValues(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const order = data.find(item => item.id === orderId);
      
      if (!order) {
        Alert.alert("Error", "Order not found");
        return;
      }

      // CHANGED: Use AuthPost instead of AuthFetch for POST request
      const response = await AuthPost(
        `test/${user.roleName}/${user.hospitalID}/approved/${order.patientTimeLineID || order.id}`,
        {}, // Empty body since no data needed for approval
        token
      );
      
      console.log("Approve response:", response);

      if (response?.message === "success" || response?.data?.message === "success") {
        setActionValues(prev => ({ ...prev, [orderId]: "Accepted" }));
        Alert.alert("Success", "Order approved successfully");
      } else {
        Alert.alert("Error", response?.message || "Failed to approve order");
      }
    } catch (error) {
      console.error("Error approving order:", error);
      Alert.alert("Error", "Failed to approve order");
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = rejectReasons[orderId];
    if (!reason || !reason.trim()) {
      Alert.alert("Error", "Please enter a rejection reason");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const order = data.find(item => item.id === orderId);
      
      if (!order) {
        Alert.alert("Error", "Order not found");
        return;
      }

      // CHANGED: Use AuthPost instead of AuthFetch for POST request
      const response = await AuthPost(
        `test/${user.roleName}/${user.hospitalID}/rejected/${order.patientTimeLineID || order.id}`,
        { rejectReason: reason }, // Body with rejection reason
        token
      );

      if (response?.message === "success" || response?.data?.message === "success") {
        setActionValues(prev => ({ ...prev, [orderId]: "Rejected" }));
        setShowRejectDialog(null);
        setRejectReasons(prev => ({ ...prev, [orderId]: "" }));
        Alert.alert("Success", "Order rejected successfully");
      } else {
        Alert.alert("Error", response?.message || "Failed to reject order");
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
      Alert.alert("Error", "Failed to reject order");
    }
  };

  const renderPatientCard = (patient: any, index: number) => {
    const isExpanded = expandedRow === patient.id;
    const dueAmount = calculateDueAmount(patient);
    const isHighlighted = expandedPatientId === patient.id;
    const currentAction = actionValues[patient.id] || "Pending";
    const statusStyle = getStatusColor(currentAction);

    return (
      <View key={patient.id} style={styles.patientCard}>
        <TouchableOpacity
          style={[
            styles.patientCardHeader,
            isExpanded && styles.expandedCardHeader,
            isHighlighted && styles.highlightedCard,
          ]}
          onPress={() => handleRowClick(patient.id)}
        >
          <View style={styles.patientBasicInfo}>
            <View style={styles.patientIdRow}>
              <Text style={styles.patientIndex}>#{index + 1}</Text>
              <Text style={styles.patientId}>ID: {patient.patientID || patient.pID || "-"}</Text>
            </View>
            <Text style={styles.patientName}>{patient.pName || patient.patientName || "-"}</Text>
            <Text style={styles.patientDepartment}>{patient.dept || "Unknown"}</Text>
          </View>

          <View style={styles.patientDetails}>
            <Text style={styles.doctorName}>
              Dr. {patient.doctor_firstName && patient.doctor_lastName 
                ? `${patient.doctor_firstName} ${patient.doctor_lastName}`
                : patient.firstName && patient.lastName
                ? `${patient.firstName} ${patient.lastName}`
                : "-"}
            </Text>
            <Text style={styles.date}>{formatDate(patient.addedOn)}</Text>
            
            {isBilling && (
              <View style={styles.billingInfo}>
                <Text style={styles.dueAmount}>Due: ₹{dueAmount.toFixed(2)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>
                    {dueAmount === 0 ? "Paid" : "Pending"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.cardActions}>
            {isButton && !isRejectedTab && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleActionChange(patient.id, "Accepted")}
                  disabled={currentAction === "Accepted"}
                >
                  <Text style={styles.approveButtonText}>
                    {currentAction === "Accepted" ? "Approved" : "Approve"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => setShowRejectDialog(patient.id)}
                  disabled={currentAction === "Rejected"}
                >
                  <Text style={styles.rejectButtonText}>
                    {currentAction === "Rejected" ? "Rejected" : "Reject"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={styles.expandButton}
              onPress={() => handleRowClick(patient.id)}
            >
              <Text style={styles.expandButtonText}>{isExpanded ? "▲" : "▼"}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <InnerTable
              patientID={patient.patientID}
              patientTimeLineID={patient.timeLineID || patient.id}
              data={patient.testsList || []}
              isButton={isButton}
              department={patient.dept || "Unknown"}
              pType={patient.ptype}
              labBilling={isBilling}
              patientOrderPay={patientOrderPay}
              patientOrderOpd={patientOrderOpd}
              paidAmount={patient.paidAmount}
              dueAmount={dueAmount.toString()}
              isRejected={isRejectedTab}
              rejectedReason={patient.rejectedReason}
            />
          </View>
        )}

        {/* Reject Dialog */}
        {showRejectDialog === patient.id && (
          <View style={styles.rejectDialog}>
            <Text style={styles.dialogTitle}>Rejection Reason</Text>
            <View style={styles.reasonInputContainer}>
              <Text style={styles.inputLabel}>Please specify the reason for rejection:</Text>
              <View style={styles.textInput}>
                <Text
                  style={styles.reasonText}
                  onPress={() => {
                    // In a real app, you'd use a proper TextInput component
                    Alert.prompt(
                      "Rejection Reason",
                      "Enter rejection reason:",
                      (text) => {
                        if (text) {
                          setRejectReasons(prev => ({ ...prev, [patient.id]: text }));
                        }
                      }
                    );
                  }}
                >
                  {rejectReasons[patient.id] || "Tap to enter reason..."}
                </Text>
              </View>
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={() => setShowRejectDialog(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.confirmButton]}
                onPress={() => handleRejectOrder(patient.id)}
              >
                <Text style={styles.confirmButtonText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, isBilling && styles.billingContainer]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Total: {data.length} orders</Text>
      </View>

      <ScrollView 
        style={styles.patientsContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
      >
        {data.length > 0 ? (
          data.map((patient, index) => renderPatientCard(patient, index))
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No orders found</Text>
            <Text style={styles.noDataSubtext}>
              There are no {title.toLowerCase()} at the moment.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  billingContainer: {
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  patientsContainer: {
    maxHeight: 600,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  patientCard: {
    margin: 8,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  patientCardHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  expandedCardHeader: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  highlightedCard: {
    backgroundColor: "#fff3cd",
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  patientBasicInfo: {
    flex: 1,
  },
  patientIdRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  patientIndex: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginRight: 8,
  },
  patientId: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  patientDepartment: {
    fontSize: 14,
    color: "#6b7280",
  },
  patientDetails: {
    flex: 1,
    alignItems: "flex-end",
  },
  doctorName: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  billingInfo: {
    alignItems: "flex-end",
  },
  dueAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardActions: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  approveButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  rejectButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  expandButton: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  expandButtonText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "bold",
  },
  expandedContent: {
    backgroundColor: "#f8fafc",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  rejectDialog: {
    padding: 16,
    backgroundColor: "#fef2f2",
    borderTopWidth: 1,
    borderTopColor: "#fecaca",
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 12,
  },
  reasonInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 6,
    padding: 12,
    minHeight: 40,
    justifyContent: "center",
  },
  reasonText: {
    fontSize: 14,
    color: "#374151",
  },
  dialogButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  dialogButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6b7280",
  },
  confirmButton: {
    backgroundColor: "#dc2626",
  },
  cancelButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  noDataContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default PatientOuterTable;