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
import { ChevronLeft, ChevronRight, Download } from "lucide-react-native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { RootState } from "../../../store/store";

const { width: W } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallScreen = W < 375;

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
  const user = useSelector((state: RootState) => state.currentUser);
  const [patientsData, setPatientsData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const getDepartmentName = (deptType: number) => {
    switch (deptType) {
      case 1: return "OPD";
      case 2: return "IPD";
      case 3: return "Emergency";
      default: return "Unknown";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return "Invalid Date";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        
        if (!user?.hospitalID || !token) {
          console.log("Missing hospitalID or token");
          return;
        }

        const formattedStartDate = startDate ? startDate.toISOString() : "";
        const formattedEndDate = endDate ? endDate.toISOString() : "";

        let apiPath = "";
        if (type === "medicine") {
          apiPath = `medicineInventoryPatientsOrder/${user.hospitalID}/${departmentType}/getMedicineInventoryPatientsOrderCompletedWithRegPatient?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
        } else {
          const department = user.roleName === 'radiology' ? 'Radiology' : 'Pathology';
          apiPath = `test/getOpdIpdTaxInvoiceData/${user.hospitalID}/${department}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
        }

        const response = await AuthFetch(apiPath, token);
        console.log("Tax Invoice API Response:", response);

        if (response?.data || response?.data?.message === "success") {
          const data = response?.data?.data || response;
          let filteredData = data;
          
          if (type !== "medicine") {
            filteredData = data.filter((each: any) => each.departmemtType === departmentType);
          }
          
          // Sort by date (newest first)
          const sortedData = filteredData.sort((a: Patient, b: Patient) => {
            return new Date(b.addedOn).getTime() - new Date(a.addedOn).getTime();
          });
          
          setPatientsData(sortedData);
        } else {
          console.log("No data found");
          setPatientsData([]);
        }
      } catch (error) {
        console.error("Error fetching tax invoice data:", error);
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

  const handleDownload = async (patient: Patient) => {
    // Implement PDF download functionality
    console.log("Download tax invoice for:", patient.pName);
    // You would integrate with your PDF generation service here
  };

  const calculateTotalAmount = (patient: Patient) => {
    if (type === "medicine" && patient.medicinesList) {
      return patient.medicinesList.reduce((total: number, medicine: any) => {
        const price = medicine.sellingPrice || 0;
        const gst = medicine.gst || 0;
        const quantity = medicine.updatedQuantity || 1;
        return total + (price * quantity * (1 + gst / 100));
      }, 0);
    } else if (patient.testsList) {
      return patient.testsList.reduce((total: number, test: Test) => {
        const price = test.testPrice || 0;
        const gst = test.gst || 0;
        return total + (price * (1 + gst / 100));
      }, 0);
    }
    return 0;
  };

  const handleChangePage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
      setExpandedRow(null);
    }
  };

  const handleChangeRowsPerPage = (value: string) => {
    setRowsPerPage(parseInt(value, 10));
    setPage(0);
    setExpandedRow(null);
  };

  const totalPages = Math.ceil(patientsData.length / rowsPerPage) || 1;
  const paginatedData = patientsData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading Tax Invoices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tableContainer}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 0.5 }]}>S.No</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Patient ID</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Patient Name</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Department</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Doctor Name</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Admission Date</Text>
          <Text style={[styles.headerCell, { flex: 0.8 }]}>Action</Text>
        </View>

        {/* Table Body */}
        <ScrollView style={styles.tableBody}>
          {paginatedData.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No New Tax Invoice !!</Text>
            </View>
          ) : (
            paginatedData.map((patient, index) => (
              <View key={patient.id}>
                {/* Main Row */}
                <TouchableOpacity
                  style={[
                    styles.tableRow,
                    expandedRow === patient.id && styles.expandedRow,
                  ]}
                  onPress={() => handleRowClick(patient.id)}
                >
                  <Text style={[styles.cell, { flex: 0.5 }]}>
                    {page * rowsPerPage + index + 1}
                  </Text>
                  <Text style={[styles.cell, { flex: 1 }]}>
                    {patient.patientID || patient.patientTimeLineID || "-"}
                  </Text>
                  <Text style={[styles.cell, { flex: 1.5 }]}>{patient.pName}</Text>
                  <Text style={[styles.cell, { flex: 1 }]}>
                    {getDepartmentName(patient.departmemtType)}
                  </Text>
                  <Text style={[styles.cell, { flex: 1.5 }]}>
                    {patient.firstName} {patient.lastName}
                  </Text>
                  <Text style={[styles.cell, { flex: 1 }]}>
                    {formatDate(patient.addedOn)}
                  </Text>
                  <View style={[styles.cell, { flex: 0.8, alignItems: 'center' }]}>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => handleDownload(patient)}
                    >
                      <Download size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {/* Expanded Details */}
                {expandedRow === patient.id && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.detailsTitle}>Test Details</Text>
                    
                    {/* Tests/Medicines List */}
                    <View style={styles.innerTableHeader}>
                      <Text style={[styles.innerHeaderCell, { flex: 0.5 }]}>S.No</Text>
                      <Text style={[styles.innerHeaderCell, { flex: 1 }]}>Item ID</Text>
                      <Text style={[styles.innerHeaderCell, { flex: 2 }]}>Item Name</Text>
                      <Text style={[styles.innerHeaderCell, { flex: 1 }]}>Charges</Text>
                      <Text style={[styles.innerHeaderCell, { flex: 1 }]}>GST</Text>
                      <Text style={[styles.innerHeaderCell, { flex: 1 }]}>Amount</Text>
                    </View>

                    <ScrollView style={styles.innerTableBody}>
                      {(type === "medicine" ? patient.medicinesList : patient.testsList)?.map((item: any, itemIndex: number) => {
                        const price = item.testPrice || item.sellingPrice || 0;
                        const gst = item.gst || 0;
                        const gstAmount = (price * gst) / 100;
                        const totalAmount = price + gstAmount;

                        return (
                          <View key={itemIndex} style={styles.innerTableRow}>
                            <Text style={[styles.innerCell, { flex: 0.5 }]}>{itemIndex + 1}</Text>
                            <Text style={[styles.innerCell, { flex: 1 }]}>
                              {item.testID || item.id || "-"}
                            </Text>
                            <Text style={[styles.innerCell, { flex: 2 }]}>
                              {item.testName || item.medicineName || item.name || "N/A"}
                            </Text>
                            <Text style={[styles.innerCell, { flex: 1 }]}>₹{price.toFixed(2)}</Text>
                            <Text style={[styles.innerCell, { flex: 1 }]}>₹{gstAmount.toFixed(2)}</Text>
                            <Text style={[styles.innerCell, { flex: 1 }]}>₹{totalAmount.toFixed(2)}</Text>
                          </View>
                        );
                      })}
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
        </ScrollView>
      </View>

      {/* Pagination */}
      {patientsData.length > 0 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            Showing {patientsData.length === 0 ? 0 : page * rowsPerPage + 1} to{" "}
            {Math.min((page + 1) * rowsPerPage, patientsData.length)} of {patientsData.length} entries
          </Text>
          
          <View style={styles.paginationControls}>
            <View style={styles.rowsPerPageContainer}>
              <Text style={styles.rowsPerPageText}>Show:</Text>
              <ScrollView horizontal style={styles.rowsPerPageSelect}>
                {[10, 15, 20].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.rowsPerPageOption,
                      rowsPerPage === option && styles.activeRowsPerPageOption,
                    ]}
                    onPress={() => handleChangeRowsPerPage(option.toString())}
                  >
                    <Text
                      style={[
                        styles.rowsPerPageOptionText,
                        rowsPerPage === option && styles.activeRowsPerPageOptionText,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.pageNavigation}>
              <TouchableOpacity
                style={[styles.navButton, page === 0 && styles.disabledNavButton]}
                onPress={() => handleChangePage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft size={20} color={page === 0 ? "#9ca3af" : "#374151"} />
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
                <ChevronRight size={20} color={page >= totalPages - 1 ? "#9ca3af" : "#374151"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#009688",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  tableBody: {
    maxHeight: 400,
  },
  noDataContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#9ca3af",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#b2caea",
  },
  expandedRow: {
    backgroundColor: "#d8e8fa",
  },
  cell: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  downloadButton: {
    backgroundColor: "#14b8a6",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedContent: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  innerTableHeader: {
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  innerHeaderCell: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  innerTableBody: {
    maxHeight: 200,
    marginBottom: 12,
  },
  innerTableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
  },
  innerCell: {
    fontSize: 12,
    color: "#374151",
    textAlign: "center",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  totalLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  paginationContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  paginationInfo: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 12,
  },
  paginationControls: {
    flexDirection: isTablet ? "row" : "column",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  rowsPerPageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowsPerPageText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  rowsPerPageSelect: {
    flexGrow: 0,
  },
  rowsPerPageOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    marginRight: 4,
  },
  activeRowsPerPageOption: {
    backgroundColor: "#14b8a6",
  },
  rowsPerPageOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  activeRowsPerPageOptionText: {
    color: "#ffffff",
  },
  pageNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navButton: {
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  disabledNavButton: {
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pageNumber: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  activePageNumber: {
    backgroundColor: "#14b8a6",
  },
  pageNumberText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  activePageNumberText: {
    color: "#ffffff",
  },
});

export default TaxInvoiceInPatient;