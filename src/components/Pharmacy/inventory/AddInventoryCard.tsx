// components/Pharmacy/AddInventoryCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { COLORS } from "../../utils/colour";
import { SPACING, FONT_SIZE, responsiveWidth } from "../../utils/responsive";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FilterIcon,
} from "../../utils/SvgIcons";
import PharmacyExpensesInnerTable from "./PharmacyExpensesInnerTable";
import { formatDate2 } from "../../utils/dateTime";

// Types
interface ExpenseData {
  id: number;
  firstName: string;
  lastName: string;
  agencyName: string;
  contactNo: string;
  agentCode: number | null;
  manufacturer: string;
  addedOn: string;
  medicinesList: any[];
}

interface AddInventoryCardProps {
  data: ExpenseData[];
  setRenderData?: React.Dispatch<React.SetStateAction<boolean>>;
  setEditMEdId?: React.Dispatch<React.SetStateAction<number | null>>;
  setOpenDialog?: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddInventoryCard: React.FC<AddInventoryCardProps> = ({
  data,
  setRenderData,
  setEditMEdId,
  setOpenDialog,
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sortAgencyOrder, setSortingAgencyOrder] = useState<"asc" | "desc">("asc");
  const [sortManufacturer, setSortingManufacturer] = useState<"asc" | "desc">("asc");
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [showAgencyFilter, setShowAgencyFilter] = useState(false);
  const [showManufacturerFilter, setShowManufacturerFilter] = useState(false);

  // Get unique agencies and manufacturers
  const uniqueAgencies = Array.from(new Set(data?.map((item) => item.agencyName).filter(Boolean)));
  const uniqueManufacturers = Array.from(new Set(data?.map((item) => item.manufacturer).filter(Boolean)));

  // Filter data based on selections
  const filteredData = data.filter(item => {
    if (selectedAgency && item.agencyName !== selectedAgency) return false;
    if (selectedManufacturer && item.manufacturer !== selectedManufacturer) return false;
    return true;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    // Agency sort
    const agencyA = a.agencyName ?? "";
    const agencyB = b.agencyName ?? "";
    const agencyComparison = sortAgencyOrder === "asc" 
      ? agencyA.localeCompare(agencyB) 
      : agencyB.localeCompare(agencyA);

    if (agencyComparison !== 0) return agencyComparison;

    // Manufacturer sort
    const manufacturerA = a.manufacturer ?? "";
    const manufacturerB = b.manufacturer ?? "";
    return sortManufacturer === "asc"
      ? manufacturerA.localeCompare(manufacturerB)
      : manufacturerB.localeCompare(manufacturerA);
  });

  const handleRowClick = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const handleSortingAgency = () => {
    setSortingAgencyOrder(sortAgencyOrder === "asc" ? "desc" : "asc");
  };

  const handleSortingManufacturer = () => {
    setSortingManufacturer(sortManufacturer === "asc" ? "desc" : "asc");
  };

  const handleAgencySelect = (agency: string) => {
    setSelectedAgency(agency);
    setShowAgencyFilter(false);
  };

  const handleManufacturerSelect = (manufacturer: string) => {
    setSelectedManufacturer(manufacturer);
    setShowManufacturerFilter(false);
  };

  const handleResetAgencyFilter = () => {
    setSelectedAgency(null);
    setShowAgencyFilter(false);
  };

  const handleResetManufacturerFilter = () => {
    setSelectedManufacturer(null);
    setShowManufacturerFilter(false);
  };

  const TableHeader: React.FC<{
    title: string;
    sortOrder: "asc" | "desc";
    onSort: () => void;
    onFilter: () => void;
    hasFilter?: boolean;
  }> = ({ title, sortOrder, onSort, onFilter, hasFilter = false }) => (
    <TouchableOpacity 
      style={styles.tableHeaderCell}
      onPress={onSort}
    >
      <Text style={styles.tableHeaderText}>{title}</Text>
      <View style={styles.headerActions}>
        <View style={styles.sortIcons}>
          <ArrowUpIcon 
            size={16} 
            color={sortOrder === "asc" ? COLORS.buttonText : COLORS.sub} 
          />
          <ArrowDownIcon 
            size={16} 
            color={sortOrder === "desc" ? COLORS.buttonText : COLORS.sub} 
            style={styles.downIcon}
          />
        </View>
        {hasFilter && (
          <TouchableOpacity onPress={onFilter} style={styles.filterButton}>
            <FilterIcon size={14} color={COLORS.buttonText} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filter Modals */}
      {showAgencyFilter && (
        <View style={styles.filterModal}>
          <View style={styles.filterContent}>
            <Text style={styles.filterTitle}>Filter by Agency</Text>
            <ScrollView style={styles.filterList}>
              {uniqueAgencies.map((agency) => (
                <TouchableOpacity
                  key={agency}
                  style={[
                    styles.filterItem,
                    selectedAgency === agency && styles.selectedFilterItem
                  ]}
                  onPress={() => handleAgencySelect(agency)}
                >
                  <Text style={[
                    styles.filterItemText,
                    selectedAgency === agency && styles.selectedFilterItemText
                  ]}>
                    {agency}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={handleResetAgencyFilter}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeFilterButton}
                onPress={() => setShowAgencyFilter(false)}
              >
                <Text style={styles.closeFilterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showManufacturerFilter && (
        <View style={styles.filterModal}>
          <View style={styles.filterContent}>
            <Text style={styles.filterTitle}>Filter by Manufacturer</Text>
            <ScrollView style={styles.filterList}>
              {uniqueManufacturers.map((manufacturer) => (
                <TouchableOpacity
                  key={manufacturer}
                  style={[
                    styles.filterItem,
                    selectedManufacturer === manufacturer && styles.selectedFilterItem
                  ]}
                  onPress={() => handleManufacturerSelect(manufacturer)}
                >
                  <Text style={[
                    styles.filterItemText,
                    selectedManufacturer === manufacturer && styles.selectedFilterItemText
                  ]}>
                    {manufacturer}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={handleResetManufacturerFilter}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeFilterButton}
                onPress={() => setShowManufacturerFilter(false)}
              >
                <Text style={styles.closeFilterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Table */}
      <ScrollView horizontal style={styles.tableScroll}>
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.serialCell]}>
              <Text style={styles.tableHeaderText}>S.NO</Text>
            </View>
            <View style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderText}>User Name</Text>
            </View>
            <TableHeader
              title="Agency Name"
              sortOrder={sortAgencyOrder}
              onSort={handleSortingAgency}
              onFilter={() => setShowAgencyFilter(true)}
              hasFilter
            />
            <View style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderText}>Contact No</Text>
            </View>
            <View style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderText}>Agent Code</Text>
            </View>
            <TableHeader
              title="Manufacturer"
              sortOrder={sortManufacturer}
              onSort={handleSortingManufacturer}
              onFilter={() => setShowManufacturerFilter(true)}
              hasFilter
            />
            <View style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderText}>Expiry Date</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.actionCell]}>
              <Text style={styles.tableHeaderText}>Action</Text>
            </View>
          </View>

          {/* Table Body */}
          <View style={styles.tableBody}>
            {sortedData.length === 0 ? (
              <View style={styles.noData}>
                <Text style={styles.noDataText}>No New Alerts !!</Text>
              </View>
            ) : (
              sortedData.map((row, index) => (
                <View key={row.id}>
                  {/* Main Row */}
                  <TouchableOpacity
                    style={[
                      styles.tableRow,
                      { backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }
                    ]}
                    onPress={() => handleRowClick(index)}
                  >
                    <View style={[styles.tableCell, styles.serialCell]}>
                      <Text style={styles.cellText}>{index + 1}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellText}>
                        {row.firstName} {row.lastName}
                      </Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellText}>{row.agencyName}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellText}>{row.contactNo}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellText}>{row.agentCode}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellText}>{row.manufacturer}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellText}>{formatDate2(row.addedOn)}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.actionCell]}>
                      <TouchableOpacity style={styles.expandButton}>
                        {expandedRow === index ? (
                          <ChevronUpIcon size={20} color={COLORS.brand} />
                        ) : (
                          <ChevronDownIcon size={20} color={COLORS.brand} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Content */}
                  {expandedRow === index && (
                    <View style={styles.expandedContent}>
                      <PharmacyExpensesInnerTable
                        data={row.medicinesList}
                        isButton={false}
                        parentComponentName={"Inventory"}
                        setRenderData={setRenderData}
                        setEditMEdId={setEditMEdId}
                        setOpenDialog={setOpenDialog}
                      />
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableScroll: {
    flex: 1,
  },
  tableContainer: {
    minWidth: responsiveWidth(100),
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.brand,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    minWidth: 120,
    justifyContent: "space-between",
  },
  serialCell: {
    flex: 0.5,
    minWidth: 60,
  },
  actionCell: {
    flex: 0.5,
    minWidth: 80,
  },
  tableHeaderText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.buttonText,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  sortIcons: {
    alignItems: "center",
  },
  downIcon: {
    marginTop: -8,
  },
  filterButton: {
    padding: SPACING.xs,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    flex: 1,
    padding: SPACING.md,
    minWidth: 120,
    justifyContent: "center",
  },
  cellText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  expandButton: {
    padding: SPACING.xs,
  },
  expandedContent: {
    backgroundColor: COLORS.field,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  noData: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  noDataText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    textTransform: "uppercase",
  },
  filterModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  filterContent: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    width: "80%",
    maxHeight: "60%",
  },
  filterTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  filterList: {
    maxHeight: 200,
  },
  filterItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedFilterItem: {
    backgroundColor: COLORS.brandLight,
  },
  filterItemText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  selectedFilterItemText: {
    color: COLORS.brand,
    fontWeight: "600",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  resetButton: {
    flex: 1,
    padding: SPACING.sm,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 6,
    alignItems: "center",
  },
  resetButtonText: {
    color: COLORS.danger,
    fontWeight: "600",
  },
  closeFilterButton: {
    flex: 1,
    padding: SPACING.sm,
    backgroundColor: COLORS.brand,
    borderRadius: 6,
    alignItems: "center",
  },
  closeFilterButtonText: {
    color: COLORS.buttonText,
    fontWeight: "600",
  },
});

export default AddInventoryCard;