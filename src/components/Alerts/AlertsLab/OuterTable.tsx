import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  TextInput,
  Modal,
  Image,
  Dimensions,
  Platform,
  FlatList,
  SafeAreaView,
  Alert,
} from "react-native";
import InnerTable from "./InnerTable";
import { AuthPost, AuthFetch } from "../../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector, useDispatch } from "react-redux";

// Utils
import {
  SPACING,
  FONT_SIZE,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";
import { UserIcon } from "lucide-react-native";
import { FilterIcon } from "../../../utils/SvgIcons";
import { showSuccess, showError } from "../../../store/toast.slice";
import { patientCategory } from "../../../utils/role";

const PAGE_SIZE = isTablet ? 15 : 10;

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
  onProceedToPay?: (order: any) => void;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  showFilter?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const PatientOuterTable: React.FC<PatientOuterTableProps> = ({
  title,
  data = [],
  isButton,
  isBilling,
  expandedPatientId,
  onPatientExpand,
  isRejectedTab = false,
  onProceedToPay,
  filter = "All",
  onFilterChange,
  showFilter = false,
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  onPageChange,
  alertFrom,
}) => {
  const dispatch = useDispatch();
  const [internalPageOneBased, setInternalPageOneBased] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [actionValues, setActionValues] = useState<{ [key: string]: string }>(
    {}
  );
  const [rejectReasons, setRejectReasons] = useState<{ [key: string]: string }>(
    {}
  );
  const [selectedRejectId, setSelectedRejectId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [departmentNames, setDepartmentNames] = useState<{
    [key: string]: string;
  }>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const user = useSelector((state: any) => state.currentUser);


  const isExternalPagination =
    typeof externalCurrentPage === "number" &&
    typeof externalTotalPages === "number" &&
    typeof onPageChange === "function";

  const totalItems = data?.length ?? 0;
  const internalTotalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPageOneBased = isExternalPagination
    ? (externalCurrentPage ?? 0) + 1
    : internalPageOneBased;
  const effectiveTotalPages = isExternalPagination
    ? externalTotalPages
    : internalTotalPages;

  // 👇 Reception context (role or alertFrom)
  const isReceptionUser =
    user?.roleName?.toLowerCase?.() === "reception" ||
    alertFrom?.toLowerCase?.() === "reception";

  const getPatientId = (order: any) =>
    order?.patientID || order?.patientId || order?.pID || order?.id;

  const getTimelineId = (order: any) =>
    order?.patientTimeLineID ||
    order?.timeLineID ||
    order?.timelineID ||
    order?.timeline_id ||
    order?.id;

  const pagedData = isExternalPagination
    ? data
    : data?.slice(
        (currentPageOneBased - 1) * PAGE_SIZE,
        currentPageOneBased * PAGE_SIZE
      ) ?? [];

  const filterOptions = [
    { label: "All Departments", value: "All" },
    { label: "Outpatient Care", value: "OPD" },
    { label: "Inpatient Services", value: "IPD" },
    { label: "Emergency", value: "Emergency" },
  ];

  useEffect(() => {
    let mounted = true;
    const fetchDepartmentNames = async () => {
      if (!data || data.length === 0) return;
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const deptIds = Array.from(
        new Set(data.map((p: any) => p?.departmentID).filter(Boolean))
      );
      const newDeptNames: { [key: string]: string } = {};

      await Promise.all(
        deptIds.map(async (departmentID) => {
          try {
            const departmentData = await AuthFetch(
              `department/singledpt/${departmentID}`,
              token
            );
            const departmentName =
              departmentData?.department?.[0]?.name ||
              departmentData?.data?.department?.[0]?.name ||
              departmentData?.name ||
              departmentData?.data?.name ||
              "Unknown Department";
            newDeptNames[departmentID] = departmentName;
          } catch (e) {
            // ignore individual failures
          }
        })
      );

      data?.forEach((patient: any) => {
        if (!patient?.departmentID) {
          const key =
            patient?.id || patient?.patientID || Math.random().toString();
          newDeptNames[key] =
            patient?.dept ||
            patient?.departmentName ||
            patient?.department_name ||
            "Unknown Department";
        }
      });

      if (mounted) setDepartmentNames((prev) => ({ ...prev, ...newDeptNames }));
    };
    fetchDepartmentNames();
    return () => {
      mounted = false;
    };
  }, [data]);

  const getDepartmentName = (patient: any) => {
    if (!patient) return "Unknown Department";
    const departmentID = patient?.departmentID;
    if (departmentID && departmentNames[departmentID])
      return departmentNames[departmentID];
    const key = patient?.id || patient?.patientID;
    if (key && departmentNames[key]) return departmentNames[key];
    return (
      patient?.dept ||
      patient?.departmentName ||
      patient?.department_name ||
      "Unknown Department"
    );
  };

  const handleRowClick = (id: string) => {
    const next = expandedRow === id ? null : id;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRow(next);
    if (onPatientExpand) onPatientExpand(next);
  };

  const handleFocus = (inputName: string) => setFocusedInput(inputName);
  const handleBlur = () => setFocusedInput(null);

  const goToPage = (pageIndexZeroBased: number) => {
    if (isExternalPagination) {
      const clamped = Math.max(
        0,
        Math.min(pageIndexZeroBased, effectiveTotalPages - 1)
      );
      onPageChange?.(clamped);
      setExpandedRow(null);
      if (onPatientExpand) onPatientExpand(null);
    } else {
      const oneBased = pageIndexZeroBased + 1;
      if (oneBased >= 1 && oneBased <= effectiveTotalPages) {
        setInternalPageOneBased(oneBased);
        setExpandedRow(null);
        if (onPatientExpand) onPatientExpand(null);
      }
    }
  };

  // 🔹 Amount helpers – include both tests & medicines (esp. for reception)
  const calculateTestsAmount = (order: any) => {
    const list = Array.isArray(order?.testsList) ? order.testsList : [];
    if (!list.length) return 0;

    return list.reduce((total: number, t: any) => {
      const price = Number(t?.testPrice ?? t?.price ?? 0);
      const gst =
        t?.gst !== undefined && t?.gst !== null
          ? Number(t.gst)
          : 18; // keep previous default
      const base = isNaN(price) ? 0 : price;
      const gstVal = isNaN(gst) ? 0 : gst;
      return total + base + (base * gstVal) / 100;
    }, 0);
  };

  const calculateMedicinesAmount = (order: any) => {
    const list = Array.isArray(order?.medicinesList)
      ? order.medicinesList
      : [];
    if (!list.length) return 0;

    return list.reduce((total: number, m: any) => {
      const price = Number(m?.sellingPrice ?? m?.price ?? 0);
      const gst = Number(m?.gst ?? 0);
      const base = isNaN(price) ? 0 : price;
      const gstVal = isNaN(gst) ? 0 : gst;
      return total + base + (base * gstVal) / 100;
    }, 0);
  };

  // 🔹 Final due amount uses tests + medicines
  const calculateDueAmount = (order: any) => {
    const testsTotal = calculateTestsAmount(order);
    const medsTotal = calculateMedicinesAmount(order);
    const paid = parseFloat(order?.paidAmount || "0") || 0;
    return Math.max(0, testsTotal + medsTotal - paid);
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "paid" || s === "accepted")
      return { backgroundColor: COLORS.chipRR, color: COLORS.success };
    if (s === "pending")
      return { backgroundColor: COLORS.chipTemp, color: COLORS.warning };
    if (s === "rejected")
      return { backgroundColor: COLORS.chipBP, color: COLORS.danger };
    return { backgroundColor: COLORS.pill, color: COLORS.sub };
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        return;
      }

      const order = data.find((d: any) => d?.id === orderId);
      if (!order) {
        dispatch(showError("Order not found"));
        return;
      }

      const patientID = getPatientId(order);
      const patientTimeLineID = getTimelineId(order);
      let res;

      if (isReceptionUser) {
        // 👇 Reception approve API – both tests & medicines are already in order
        let payload
        if (order?.testsList?.length > 0 && order?.medicinesList?.length > 0) {
         payload = {
          updateMedicines:true,
          updateTests: true,
        };
        }else if (order?.testsList?.length > 0 && (order?.medicinesList?.length === 0 || !order?.medicinesList)) {
          payload = {
          updateTests: true,
        };
        }else {
           payload = {
          updateMedicines: true,
        };
        }

        res = await AuthPost(
          `reception/${user?.hospitalID}/completed/${patientID}/${patientTimeLineID}/updateReceptionAlerts`,
          payload,
          token
        );
      } else {
        // 👇 Existing Lab approve API
        res = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/approved/${
            patientID || order?.id
          }`,
          {},
          token
        );
      }

      if (res?.status === "success") {
        setActionValues((prev) => ({ ...prev, [orderId]: "Accepted" }));
        dispatch(showSuccess("Order approved successfully"));
      } else {
        dispatch(
          showError(
            res?.data?.message || res?.message || "Failed to approve order"
          )
        );
      }
    } catch (e) {
      dispatch(showError("Failed to approve order"));
    }
  };


    const handleRejectOrder = async () => {
    const orderId = selectedRejectId;
    if (!orderId) return;
    const reason = (rejectReasons[orderId] || "").trim();
    if (!reason) {
      dispatch(showError("Please enter a rejection reason"));
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        return;
      }

      const order = data.find((d: any) => d?.id === orderId);
      if (!order) {
        dispatch(showError("Order not found"));
        return;
      }

      const patientID = getPatientId(order);
      const patientTimeLineID = getTimelineId(order);

      let res;

      if (isReceptionUser) {
        // 👇 Reception reject API
        let payload
        if (order?.testsList?.length > 0 && order?.medicinesList?.length > 0) {
         payload = {
          rejectReason: reason,
          updateMedicines : true,
          updateTests: true,
        };
        }else if (order?.testsList?.length > 0 && (order?.medicinesList?.length === 0 || !order?.medicinesList)) {
          payload = {
          rejectReason: reason,
          updateTests : true
        };
        }else {
           payload = {
          rejectReason: reason,
          updateMedicines: true,
        };}
        
        res = await AuthPost(
          `reception/${user?.hospitalID}/rejected/${patientID}/${patientTimeLineID}/updateReceptionAlerts`,
          payload,
          token
        );
      } else {
        // 👇 Existing Lab reject API
        res = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/rejected/${patientID || order?.id}`,
          { rejectReason: reason },
          token
        );
      }

      if ( res?.status === "success" ) {
        setActionValues((prev) => ({ ...prev, [orderId]: "Rejected" }));
        setSelectedRejectId(null);
        setRejectReasons((prev) => ({ ...prev, [orderId]: "" }));
        dispatch(showSuccess("Order rejected successfully"));
      } else {
        dispatch(
          showError(res?.message || res?.data?.message || "Failed to reject order")
        );
      }
    } catch (e) {
      dispatch(showError("Failed to reject order"));
    }
  };

  const shouldShowRejectButton = (patient: any) => patient?.ptype === 21;
  const renderPagination = () => {
    if (effectiveTotalPages <= 1) return null;

    const displayCurrent = isExternalPagination
      ? (externalCurrentPage ?? 0) + 1
      : internalPageOneBased;

    return (
      <View style={styles.paginationWrapper}>
        <View style={styles.paginationBar}>
          <TouchableOpacity
            onPress={() =>
              goToPage(
                (isExternalPagination
                  ? externalCurrentPage ?? 0
                  : internalPageOneBased - 1) - 1
              )
            }
            disabled={
              (isExternalPagination
                ? externalCurrentPage ?? 0
                : internalPageOneBased - 1) === 0
            }
            style={[
              styles.pageBtn,
              ((isExternalPagination
                ? externalCurrentPage ?? 0
                : internalPageOneBased - 1) === 0) && styles.pageBtnDisabled,
            ]}
          >
            <Text style={styles.paginationButtonText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfo}>
            Page {displayCurrent} of {effectiveTotalPages}
          </Text>

          <TouchableOpacity
            onPress={() =>
              goToPage(
                (isExternalPagination
                  ? externalCurrentPage ?? 0
                  : internalPageOneBased - 1) + 1
              )
            }
            disabled={
              (isExternalPagination
                ? externalCurrentPage ?? 0
                : internalPageOneBased - 1) >=
              effectiveTotalPages - 1
            }
            style={[
              styles.pageBtn,
              ((isExternalPagination
                ? externalCurrentPage ?? 0
                : internalPageOneBased - 1) >=
                effectiveTotalPages - 1) && styles.pageBtnDisabled,
            ]}
          >
            <Text style={styles.paginationButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPatientCard = (patient: any) => {
    const isExpanded =
      expandedRow === patient?.id ||
      expandedRow === (patient?.patientID ?? patient?.pID);
    const testsAmount = calculateTestsAmount(patient);
    const medicinesAmount = calculateMedicinesAmount(patient);
    const dueAmount = calculateDueAmount(patient);
    const currentAction = actionValues[patient?.id] || "Pending";
    const statusStyle = getStatusColor(currentAction);
    const departmentName = patient?.location || getDepartmentName(patient);

    return (
      <View
        key={patient?.id ?? patient?.patientID}
        style={[styles.patientCard]}
      >
        <TouchableOpacity
          style={[
            styles.patientCardHeader,
            isExpanded && styles.expandedCardHeader,
          ]}
          onPress={() => handleRowClick(patient?.id ?? patient?.patientID)}
          activeOpacity={0.7}
        >
          <View style={styles.patientMainInfo}>
            <View style={styles.patientHeader}>
              <View style={styles.patientIdentity}>
                <View style={styles.avatar}>
                  {patient?.photo ? (
                    <Image
                      source={{ uri: patient?.photo }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <UserIcon size={20} color={COLORS.sub} />
                  )}
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>
                    {patient?.pName ||
                      patient?.patientName ||
                      "Unknown Patient"}
                  </Text>
                  <Text style={styles.patientId}>
                    ID: {patient?.patientID || patient?.pID || "-"}
                  </Text>
                </View>
              </View>
              <View style={styles.arrowContainer}>
                <Text
                  style={[styles.arrow, isExpanded && styles.arrowExpanded]}
                >
                  {isExpanded ? "▲" : "▼"}
                </Text>
              </View>
            </View>

            <View style={styles.patientDetails}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Department</Text>
                <Text style={styles.detailValue}>{departmentName}</Text>
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Doctor</Text>
                <Text
                  style={styles.detailValue}
                  numberOfLines={1}
                >
                  {patient?.doctor_firstName && patient?.doctor_lastName
                    ? `${patient?.doctor_firstName} ${patient?.doctor_lastName}`
                    : patient?.firstName && patient?.lastName
                    ? `${patient?.firstName} ${patient?.lastName}`
                    : "Not Assigned"}
                </Text>
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Order Date</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(patient?.addedOn)}
                </Text>
              </View>
            </View>

            {/* 🔹 Billing summary – includes Tests + Medicines when available */}
            {isBilling && (
              <View style={styles.billingInfo}>
                <View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Due Amount:</Text>
                    <Text
                      style={[
                        styles.dueAmount,
                        dueAmount > 0 && styles.dueAmountHighlight,
                      ]}
                    >
                      ₹{dueAmount.toFixed(2)}
                    </Text>
                  </View>

                  {(testsAmount > 0 || medicinesAmount > 0) && (
                    <View style={styles.itemsSummaryRow}>
                      {testsAmount > 0 && (
                        <Text style={styles.summaryTag}>
                          Tests: ₹{testsAmount.toFixed(2)}
                        </Text>
                      )}
                      {medicinesAmount > 0 && (
                        <Text style={styles.summaryTag}>
                          Medicines: ₹{medicinesAmount.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusStyle.backgroundColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusStyle.color },
                    ]}
                  >
                    {dueAmount === 0 ? "Paid" : "Pending"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* 🔹 Summary row visible in expanded view as well */}
            {(testsAmount > 0 || medicinesAmount > 0) && (
              <View style={styles.itemsSummaryExpanded}>
                {testsAmount > 0 && (
                  <Text style={styles.summaryExpandedText}>
                    Tests Total: ₹{testsAmount.toFixed(2)}
                  </Text>
                )}
                {medicinesAmount > 0 && (
                  <Text style={styles.summaryExpandedText}>
                    Medicines Total: ₹{medicinesAmount.toFixed(2)}
                  </Text>
                )}
              </View>
            )}

            {isButton && !isRejectedTab && currentAction === "Pending" && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApproveOrder(patient?.id)}
                >
                  <Text style={styles.approveButtonText}>✓ Approve</Text>
                </TouchableOpacity>
                {
                shouldShowRejectButton(patient)  &&
                 (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => setSelectedRejectId(patient?.id)}
                  >
                    <Text style={styles.rejectButtonText}>✗ Reject</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isBilling && dueAmount > 0 && onProceedToPay && (
              <View style={styles.paymentActionContainer}>
                <TouchableOpacity
                  style={styles.proceedToPayButton}
                  onPress={() => onProceedToPay(patient)}
                >
                  <Text style={styles.proceedToPayText}>
                    Proceed to Pay - ₹{dueAmount.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 🔹 Pass both tests & medicines to InnerTable */}
            <InnerTable
              patientID={patient?.patientID}
              patientTimeLineID={patient?.timeLineID || patient?.id}
              data={patient?.testsList || []} // backward compatibility
              testsList={patient?.testsList || []}
              medicinesList={patient?.medicinesList || []}
              isButton={isButton}
              department={departmentName}
              pType={patient?.ptype}
              labBilling={isBilling}
              patientOrderPay={undefined}
              patientOrderOpd={undefined}
              paidAmount={patient?.paidAmount}
              dueAmount={dueAmount.toString()}
              isRejected={isRejectedTab}
              rejectedReason={patient?.rejectedReason}
            />
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>{title}</Text>
        {showFilter && onFilterChange && (
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: COLORS.card,
                borderColor:
                  filter !== "All" ? COLORS.brand : COLORS.border,
              },
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <FilterIcon
              size={16}
              color={filter !== "All" ? COLORS.brand : COLORS.sub}
            />
            <Text
              style={[
                styles.filterButtonText,
                { color: filter !== "All" ? COLORS.brand : COLORS.text },
              ]}
            >
              Filter
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.noDataContainer}>
      <Text style={styles.noDataIcon}>📋</Text>
      <Text style={styles.noDataText}>No Orders Available</Text>
      <Text style={styles.noDataSubtext}>
        There are no {title?.toLowerCase()} at the moment.
      </Text>
    </View>
  );

  const selectedRejectOrder =
    data.find((d: any) => d?.id === selectedRejectId) || null;

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={pagedData}
        keyExtractor={(item) =>
          String(item?.id ?? item?.patientID ?? Math.random().toString())
        }
        renderItem={({ item }) => renderPatientCard(item)}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderPagination}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        extraData={[
          expandedRow,
          departmentNames,
          selectedRejectId,
          internalPageOneBased,
          externalCurrentPage,
        ]}
        windowSize={21}
      />

      {/* Single Reject Dialog */}
      <Modal
        visible={!!selectedRejectId}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRejectId(null)}
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
                style={[
                  styles.reasonInput,
                  {
                    borderColor:
                      focusedInput === `reject-${selectedRejectId}`
                        ? COLORS.focus
                        : COLORS.danger,
                    backgroundColor: COLORS.field,
                  },
                ]}
                placeholder="Enter rejection reason..."
                placeholderTextColor={COLORS.placeholder}
                value={rejectReasons[selectedRejectId || ""] || ""}
                onChangeText={(text) =>
                  setRejectReasons((prev) => ({
                    ...prev,
                    [selectedRejectId || ""]: text,
                  }))
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() =>
                  handleFocus(`reject-${selectedRejectId}`)
                }
                onBlur={handleBlur}
              />
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={() => {
                  setSelectedRejectId(null);
                  setRejectReasons((prev) => ({
                    ...prev,
                    [selectedRejectId || ""]: "",
                  }));
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogButton,
                  styles.confirmRejectButton,
                ]}
                onPress={handleRejectOrder}
              >
                <Text style={styles.confirmRejectButtonText}>
                  Confirm Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        transparent
        visible={showFilterModal}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>
                Filter By Department
              </Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterOptions}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filter === option.value &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    onFilterChange?.(option.value);
                    setShowFilterModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filter === option.value &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filter === option.value && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    padding: SPACING.md,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: isTablet ? FONT_SIZE.lg : FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 44,
  },
  filterButtonText: { fontSize: FONT_SIZE.sm, fontWeight: "600" },
  listContent: { flexGrow: 1, paddingBottom: SPACING.md },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    maxHeight: Dimensions.get("window").height * 0.6,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  closeButtonText: { fontSize: 24, color: COLORS.sub },
  filterOptions: { padding: SPACING.lg },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: { backgroundColor: COLORS.brandLight },
  filterOptionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  filterOptionTextSelected: { color: COLORS.brand, fontWeight: "600" },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  patientCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  expandedCardHeader: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  patientCardHeader: { padding: SPACING.md, backgroundColor: COLORS.card },
  patientMainInfo: { flex: 1 },
  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  patientIdentity: { flexDirection: "row", alignItems: "center", flex: 1 },
  patientInfo: { flex: 1 },
  patientName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  patientId: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
  },
  arrowContainer: { padding: 4 },
  arrow: { fontSize: FONT_SIZE.md, color: COLORS.sub, fontWeight: "bold" },
  arrowExpanded: { color: COLORS.brand },
  patientDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  detailColumn: { flex: 1 },
  detailLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: "600",
  },
  billingInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  amountRow: { flexDirection: "row", alignItems: "center" },
  amountLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
    marginRight: SPACING.xs,
  },
  dueAmount: { fontSize: FONT_SIZE.md, fontWeight: "700", color: COLORS.success },
  dueAmountHighlight: { color: COLORS.danger },
  itemsSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  summaryTag: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    backgroundColor: COLORS.pillBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  itemsSummaryExpanded: {
    flexDirection: "column",
    gap: 2,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  summaryExpandedText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: "600" },
  expandedContent: {
    backgroundColor: COLORS.bg,
    paddingTop: SPACING.sm,
  },
  actionButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  approveButton: { backgroundColor: COLORS.success },
  rejectButton: { backgroundColor: COLORS.danger },
  approveButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  rejectButtonText: {
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
  dialogHeader: { marginBottom: SPACING.md },
  dialogTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.danger,
    marginBottom: SPACING.xs,
  },
  dialogSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  reasonInputContainer: { marginBottom: SPACING.md },
  reasonInput: {
    borderWidth: 2,
    borderRadius: 8,
    padding: SPACING.sm,
    minHeight: 100,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    textAlignVertical: "top",
  },
  dialogButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
  dialogButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: { backgroundColor: COLORS.sub },
  confirmRejectButton: { backgroundColor: COLORS.danger },
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
  noDataContainer: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  noDataIcon: { fontSize: 48, marginBottom: SPACING.md },
  noDataText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.sub,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  noDataSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.placeholder,
    textAlign: "center",
    fontStyle: "italic",
  },
  paymentActionContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  proceedToPayButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  proceedToPayText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  paginationWrapper: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pageBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.pillBg,
  },
  pageBtnDisabled: { backgroundColor: COLORS.pill },
  pageInfo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.text,
  },
  paginationButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.brand,
  },
});

export default PatientOuterTable;
