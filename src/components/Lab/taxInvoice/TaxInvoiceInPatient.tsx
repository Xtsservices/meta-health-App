import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react-native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Utils
import { 
  SPACING, 
  FONT_SIZE, 
  ICON_SIZE,
  isTablet,
  FOOTER_HEIGHT,
  SCREEN_HEIGHT,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDate, formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { showError } from "../../../store/toast.slice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Test {
  testID: number;
  testName: string;
  testPrice: number | null;
  gst: number | null;
}

interface Discount {
  discount: number;
  discountReason: string;
  discountReasonID: string;
}

interface Patient {
  id: number;
  patientID: number;
  pName: string;
  firstName: string;
  lastName: string;
  addedOn: string;
  updatedOn: string;
  lastUpdatedOn: string;
  departmemtType: number;
  hospitalID: number;
  category: string;
  discount: Discount[] | null;
  testsList: Test[];
  patientTimeLineID?: number;
  medicinesList?: any[];
}

interface TaxInvoiceInPatientProps {
  title: string;
  departmentType: number;
  type: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
}

const TaxInvoiceInPatient: React.FC<TaxInvoiceInPatientProps> = ({
  departmentType,
  type,
  startDate,
  endDate,
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  const [patientsData, setPatientsData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const getDepartmentName = (deptType: number) => {
    switch (deptType) {
      case 1: return "OPD";
      case 2: return "IPD";
      case 3: return "Emergency";
      default: return "Unknown";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        
        if (!user?.hospitalID || !token) {
          dispatch(showError("Not authorized. Please login again."));
          return;
        }

        const formattedStartDate = startDate ? startDate.toISOString() : "";
        const formattedEndDate = endDate ? endDate.toISOString() : "";

        let apiPath = "";
        if (type === "medicine") {
          apiPath = `medicineInventoryPatientsOrder/${user.hospitalID}/${departmentType}/getMedicineInventoryPatientsOrderCompletedWithRegPatient?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
        } else {
          const department = user?.roleName === 'radiology' ? 'Radiology' : 'Pathology';
          apiPath = `test/getOpdIpdTaxInvoiceData/${user?.hospitalID}/${department}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
        }

        const response = await AuthFetch(apiPath, token);

        if (response?.data || response?.data?.message === "success") {
          const data = response?.data?.data || response;
          let filteredData = data;
          
          if (type !== "medicine") {
            filteredData = data?.filter((each: any) => each?.departmemtType === departmentType) ?? [];
          }
          
          // Sort by date (newest first)
          const sortedData = filteredData?.sort((a: Patient, b: Patient) => {
            return new Date(b?.addedOn ?? 0).getTime() - new Date(a?.addedOn ?? 0).getTime();
          }) ?? [];
          
          setPatientsData(sortedData);
        } else {
          setPatientsData([]);
        }
      } catch (error) {
        dispatch(showError("Failed to load tax invoice data"));
        setPatientsData([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.hospitalID) {
      fetchData();
    }
  }, [user?.hospitalID, user?.roleName, departmentType, type, startDate, endDate]);

  const handleRowClick = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const calculateTotalAmount = (patient: Patient) => {
    if (type === "medicine" && patient?.medicinesList) {
      return patient?.medicinesList?.reduce((total: number, medicine: any) => {
        const price = medicine?.sellingPrice ?? 0;
        const gst = medicine?.gst ?? 0;
        const quantity = medicine?.updatedQuantity ?? 1;
        return total + (price * quantity * (1 + gst / 100));
      }, 0) ?? 0;
    } else if (patient?.testsList) {
      return patient?.testsList?.reduce((total: number, test: Test) => {
        const price = test?.testPrice ?? 0;
        const gst = test?.gst ?? 0;
        return total + (price * (1 + gst / 100));
      }, 0) ?? 0;
    }
    return 0;
  };

  const handleChangePage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
      setExpandedRow(null);
    }
  };

  const totalPages = Math.ceil(patientsData?.length / rowsPerPage) || 1;
  const paginatedData = patientsData?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) ?? [];

  // Calculate table width based on screen size
  const tableWidth = Math.max(SCREEN_WIDTH - SPACING.md * 2, 800);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>Loading Tax Invoices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Table Container with Horizontal Scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.horizontalScrollView}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          <View style={[styles.tableWrapper, { width: tableWidth }]}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.snoCell]}>S.No</Text>
              <Text style={[styles.headerCell, styles.pidCell]}>Patient ID</Text>
              <Text style={[styles.headerCell, styles.nameCell]}>Patient Name</Text>
              <Text style={[styles.headerCell, styles.deptCell]}>Department</Text>
              <Text style={[styles.headerCell, styles.doctorCell]}>Doctor Name</Text>
              <Text style={[styles.headerCell, styles.dateCell]}>Admission Date</Text>
              <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
            </View>

            {/* Table Body */}
            <View style={styles.tableBody}>
              {paginatedData?.length === 0 ? (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No Tax Invoices Found</Text>
                  <Text style={styles.noDataSubtext}>
                    {startDate && endDate 
                      ? `No invoices found between ${formatDate(startDate?.toISOString())} and ${formatDate(endDate?.toISOString())}`
                      : "No invoices available for the selected period"
                    }
                  </Text>
                </View>
              ) : (
                paginatedData?.map((patient, index) => (
                  <View key={patient?.id} style={styles.rowContainer}>
                    {/* Main Row */}
                    <TouchableOpacity
                      style={[
                        styles.tableRow,
                        expandedRow === patient?.id && styles.expandedRow,
                      ]}
                      onPress={() => handleRowClick(patient?.id)}
                    >
                      <Text style={[styles.cell, styles.snoCell]}>
                        {page * rowsPerPage + index + 1}
                      </Text>
                      <Text style={[styles.cell, styles.pidCell]}>
                        {patient?.patientID || patient?.patientTimeLineID || "-"}
                      </Text>
                      <Text style={[styles.cell, styles.nameCell]} numberOfLines={1} ellipsizeMode="tail">
                        {patient?.pName}
                      </Text>
                      <Text style={[styles.cell, styles.deptCell]}>
                        {getDepartmentName(patient?.departmemtType)}
                      </Text>
                      <Text style={[styles.cell, styles.doctorCell]} numberOfLines={1} ellipsizeMode="tail">
                        {patient?.firstName} {patient?.lastName}
                      </Text>
                      <Text style={[styles.cell, styles.dateCell]}>
                        {formatDate(patient?.addedOn)}
                      </Text>
                      <View style={[styles.cell, styles.actionCell]}>
                        {expandedRow === patient?.id ? (
                          <ChevronUp size={ICON_SIZE.sm} color={COLORS.brand} />
                        ) : (
                          <ChevronDown size={ICON_SIZE.sm} color={COLORS.brand} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Details */}
                    {expandedRow === patient?.id && (
                      <View style={styles.expandedContent}>
                        <View style={styles.detailsHeader}>
                          <Text style={styles.detailsTitle}>
                            {type === "medicine" ? "Medicine Details" : "Test Details"}
                          </Text>
                          <Text style={styles.patientInfo}>
                            Patient: {patient?.pName} | ID: {patient?.patientID || patient?.patientTimeLineID || "-"}
                          </Text>
                        </View>
                        
                        {/* Inner Table with Horizontal Scroll */}
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={true}
                          style={styles.innerHorizontalScroll}
                        >
                          <View style={styles.innerTableContainer}>
                            {/* Items List */}
                            <View style={styles.innerTableHeader}>
                              <Text style={[styles.innerHeaderCell, styles.innerSnoCell]}>#</Text>
                              <Text style={[styles.innerHeaderCell, styles.innerIdCell]}>Item ID</Text>
                              <Text style={[styles.innerHeaderCell, styles.innerNameCell]}>Item Name</Text>
                              <Text style={[styles.innerHeaderCell, styles.innerChargeCell]}>Charges</Text>
                              <Text style={[styles.innerHeaderCell, styles.innerGstCell]}>GST</Text>
                              <Text style={[styles.innerHeaderCell, styles.innerAmountCell]}>Amount</Text>
                            </View>

                            <View style={styles.innerTableBody}>
                              {(type === "medicine" ? patient?.medicinesList : patient?.testsList)?.map((item: any, itemIndex: number) => {
                                const price = item?.testPrice || item?.sellingPrice || 0;
                                const gst = item?.gst || 0;
                                const gstAmount = (price * gst) / 100;
                                const totalAmount = price + gstAmount;

                                return (
                                  <View key={itemIndex} style={styles.innerTableRow}>
                                    <Text style={[styles.innerCell, styles.innerSnoCell]}>{itemIndex + 1}</Text>
                                    <Text style={[styles.innerCell, styles.innerIdCell]} numberOfLines={1} ellipsizeMode="tail">
                                      {item?.testID || item?.id || "-"}
                                    </Text>
                                    <Text style={[styles.innerCell, styles.innerNameCell]} numberOfLines={2} ellipsizeMode="tail">
                                      {item?.testName || item?.medicineName || item?.name || "N/A"}
                                    </Text>
                                    <Text style={[styles.innerCell, styles.innerChargeCell]}>₹{price.toFixed(2)}</Text>
                                    <Text style={[styles.innerCell, styles.innerGstCell]}>₹{gstAmount.toFixed(2)}</Text>
                                    <Text style={[styles.innerCell, styles.innerAmountCell]}>₹{totalAmount.toFixed(2)}</Text>
                                  </View>
                                );
                              }) ?? []}
                            </View>
                          </View>
                        </ScrollView>

                        {/* Total Amount */}
                        <View style={styles.totalContainer}>
                          <Text style={styles.totalLabel}>Total Amount:</Text>
                          <Text style={styles.totalAmount}>
                            ₹{calculateTotalAmount(patient).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>

        {/* Pagination */}
        {patientsData?.length > 0 && (
          <View style={styles.paginationContainer}>
            <Text style={styles.paginationInfo}>
              Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, patientsData?.length)} of {patientsData?.length} entries
            </Text>
            
            <View style={styles.paginationControls}>
              <View style={styles.pageNavigation}>
                <TouchableOpacity
                  style={[styles.navButton, page === 0 && styles.disabledNavButton]}
                  onPress={() => handleChangePage(page - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft size={ICON_SIZE.sm} color={page === 0 ? COLORS.placeholder : COLORS.brand} />
                </TouchableOpacity>

                <View style={styles.pageNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <TouchableOpacity
                        key={pageNum}
                        style={[
                          styles.pageNumber,
                          page === pageNum && styles.activePageNumber,
                        ]}
                        onPress={() => handleChangePage(pageNum)}
                      >
                        <Text
                          style={[
                            styles.pageNumberText,
                            page === pageNum && styles.activePageNumberText,
                          ]}
                        >
                          {pageNum + 1}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    page >= totalPages - 1 && styles.disabledNavButton,
                  ]}
                  onPress={() => handleChangePage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight size={ICON_SIZE.sm} color={page >= totalPages - 1 ? COLORS.placeholder : COLORS.brand} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor={COLORS.brand} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: FOOTER_HEIGHT + SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },

  // Horizontal Scroll for Main Table
  horizontalScrollView: {
    flex: 1,
  },
  horizontalScrollContent: {
    paddingHorizontal: SPACING.md,
  },

  // Table Styles
  tableWrapper: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginTop: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    minWidth: 800,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.brand,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    minWidth: 800,
  },
  headerCell: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.buttonText,
    textAlign: "center",
    paddingHorizontal: SPACING.xs,
  },
  // Column width definitions - Fixed widths for proper alignment
  snoCell: { width: 60 },
  pidCell: { width: 100 },
  nameCell: { width: 150 },
  deptCell: { width: 100 },
  doctorCell: { width: 150 },
  dateCell: { width: 120 },
  actionCell: { width: 60 },

  tableBody: {
    minWidth: 800,
  },
  noDataContainer: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    minHeight: 200,
    minWidth: 800,
  },
  noDataText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.sub,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  noDataSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.placeholder,
    textAlign: 'center',
    lineHeight: 20,
  },
  rowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minWidth: 800,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
    backgroundColor: COLORS.card,
    minHeight: 60,
    minWidth: 800,
  },
  expandedRow: {
    backgroundColor: COLORS.field,
  },
  cell: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "500",
    paddingHorizontal: SPACING.xs,
  },

  // Expanded Content Styles
  expandedContent: {
    backgroundColor: COLORS.field,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailsHeader: {
    marginBottom: SPACING.md,
  },
  detailsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  patientInfo: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
  },
  
  // Inner Table Horizontal Scroll
  innerHorizontalScroll: {
    marginBottom: SPACING.md,
  },
  innerTableContainer: {
    minWidth: 600,
  },
  
  // Inner Table Styles
  innerTableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.brandDark,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 6,
    marginBottom: SPACING.sm,
    minWidth: 600,
  },
  innerHeaderCell: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.buttonText,
    textAlign: "center",
    paddingHorizontal: SPACING.xs,
  },
  // Inner table column widths - Fixed widths
  innerSnoCell: { width: 40 },
  innerIdCell: { width: 80 },
  innerNameCell: { width: 200 },
  innerChargeCell: { width: 90 },
  innerGstCell: { width: 90 },
  innerAmountCell: { width: 100 },

  innerTableBody: {
    minWidth: 600,
  },
  innerTableRow: {
    flexDirection: "row",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 4,
    marginBottom: 2,
    minHeight: 44,
    minWidth: 600,
  },
  innerCell: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "500",
    paddingHorizontal: SPACING.xs,
  },
  
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.success,
  },

  // Pagination Styles
  paginationContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paginationInfo: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: SPACING.md,
    fontWeight: "500",
  },
  paginationControls: {
    flexDirection: isTablet ? "row" : "column",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  pageNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  navButton: {
    padding: SPACING.sm,
    backgroundColor: COLORS.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledNavButton: {
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  pageNumber: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.field,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePageNumber: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  pageNumberText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "500",
    textAlign: 'center',
  },
  activePageNumberText: {
    color: COLORS.buttonText,
    fontWeight: "600",
  },

  // Footer Styles
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default TaxInvoiceInPatient;