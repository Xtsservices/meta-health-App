import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import {
  SPACING,
  FONT_SIZE,
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

// Import SVG Icons
import {
  PackageIcon,
  BuildingIcon,
  PhoneIcon,
  EmailIcon,
  CalendarIcon,
  UserIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PillIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BoxIcon,
  IndianRupeeIcon,
} from "../../../utils/SvgIcons";
import Footer from "../../dashboard/footer";
import { formatDate, formatTime } from "../../../utils/dateTime";

const FOOTER_H = FOOTER_HEIGHT || 70;

interface InventoryDetailRouteProps {
  InventoryDetail: {
    inventoryData: any;
  };
}

const InventoryDetails: React.FC = () => {
  const route = useRoute<RouteProp<InventoryDetailRouteProps, "InventoryDetail">>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { inventoryData } = route.params;
  const user = useSelector((state: RootState) => state.currentUser);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedItems(next);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" };
      case "Low Stock":
        return { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" };
      case "Expired":
        return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
      default:
        return { bg: "#e5e7eb", color: "#374151", border: "#d1d5db" };
    }
  };

  const getItemStatus = (row: any) => {
    const now = new Date();
    if (row?.expiryDate) {
      const exp = new Date(row.expiryDate);
      if (!isNaN(exp.getTime()) && exp < now) return "Expired";
    }
    const low = row?.lowStockValue ?? 10;
    if ((row?.quantity ?? 0) < low) return "Low Stock";
    return "Active";
  };

  // Calculate inventory statistics
  const inventoryStats = useMemo(() => {
    const items = inventoryData?.medicinesList || [];
    let totalValue = 0;
    let lowStockCount = 0;
    let expiredCount = 0;
    let activeCount = 0;

    items?.forEach((item: any) => {
      const cp = Number(item?.costPrice ?? 0);
      const g = Number(item?.gst ?? 0);
      const q = Number(item?.quantity ?? 0);
      totalValue += cp * q * (1 + g / 100);

      const status = getItemStatus(item);
      if (status === "Low Stock") lowStockCount++;
      else if (status === "Expired") expiredCount++;
      else activeCount++;
    });

    return { totalValue, lowStockCount, expiredCount, activeCount, totalItems: items?.length ?? 0 };
  }, [inventoryData]);

  const renderMedicineItem = ({ item }: { item: any }) => {
    const status = getItemStatus(item);
    const statusColors = getStatusColor(status);
    const isExpanded = expandedItems.has(item?.id);

    const costPrice = Number(item?.costPrice ?? 0);
    const gst = Number(item?.gst ?? 0);
    const qty = Number(item?.quantity ?? 0);
    const sellingPrice = Number(item?.sellingPrice ?? 0);
    const totalValue = (costPrice * qty * (1 + gst / 100)).toFixed(2);
    const profit = ((sellingPrice - costPrice) * qty).toFixed(2);

    return (
      <View style={styles.medicineCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleExpand(item?.id)}
        >
          {/* Header */}
          <View style={styles.medicineHeader}>
            <View style={styles.medicineIcon}>
              <PillIcon size={22} color={COLORS.brand} />
            </View>
            <View style={styles.medicineMeta}>
              <Text style={styles.medicineName} numberOfLines={1}>
                {item?.name ?? "Unknown"}
              </Text>
              <View style={styles.medicineSubInfo}>
                <Text style={styles.medicineId}>
                  MED{String(item?.id ?? 0).padStart(3, "0")}
                </Text>
                <View style={styles.dot} />
                <Text style={styles.medicineCategory}>{item?.category ?? "N/A"}</Text>
              </View>
            </View>
            <View style={styles.medicineRight}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusColors.bg,
                    borderWidth: 1,
                    borderColor: statusColors.border,
                  },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColors.color }]}>
                  {status}
                </Text>
              </View>
              {isExpanded ? (
                <ChevronUpIcon size={20} color="#9CA3AF" />
              ) : (
                <ChevronDownIcon size={20} color="#9CA3AF" />
              )}
            </View>
          </View>

          {/* Quick Grid */}
          <View style={styles.quickGrid}>
            <View style={styles.gridItem}>
              <View style={styles.gridIcon}>
                <BoxIcon size={14} color="#6B7280" />
              </View>
              <Text style={styles.gridLabel}>Quantity</Text>
              <Text style={styles.gridValue}>{qty}</Text>
            </View>
            <View style={styles.gridDivider} />
            <View style={styles.gridItem}>
              <View style={styles.gridIcon}>
                <IndianRupeeIcon size={14} color="#6B7280" />
              </View>
              <Text style={styles.gridLabel}>Unit Price</Text>
              <Text style={styles.gridValue}>₹{costPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.gridDivider} />
            <View style={styles.gridItem}>
              <View style={styles.gridIcon}>
                <TrendingUpIcon size={14} color={COLORS.brand} />
              </View>
              <Text style={styles.gridLabel}>Total</Text>
              <Text style={[styles.gridValue, { color: COLORS.brandDark, fontWeight: "700" }]}>
                ₹{totalValue}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {/* Stock Details */}
            <View style={styles.detailBlock}>
              <Text style={styles.blockTitle}>Stock Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Stock</Text>
                <Text style={styles.detailValue}>{qty} Units</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Min Stock Level</Text>
                <Text style={styles.detailValue}>{item?.lowStockValue ?? 100} Units</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Max Stock Level</Text>
                <Text style={styles.detailValue}>1000 Units</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stock Status</Text>
                <View
                  style={[
                    styles.miniStatusBadge,
                    { backgroundColor: statusColors.bg, borderColor: statusColors.border },
                  ]}
                >
                  <Text style={[styles.miniStatusText, { color: statusColors.color }]}>
                    {status}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pricing Details */}
            <View style={styles.detailBlock}>
              <Text style={styles.blockTitle}>Pricing Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cost Price</Text>
                <Text style={styles.detailValue}>₹{costPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Selling Price</Text>
                <Text style={styles.detailValue}>₹{sellingPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>GST</Text>
                <Text style={styles.detailValue}>{gst}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Unit Profit</Text>
                <Text style={[styles.detailValue, { color: "#059669", fontWeight: "600" }]}>
                  ₹{(sellingPrice - costPrice).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.detailRow, { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb" }]}>
                <Text style={[styles.detailLabel, { fontWeight: "600", color: "#111827" }]}>Total Value</Text>
                <Text style={[styles.detailValue, { fontWeight: "700", color: COLORS.brandDark, fontSize: FONT_SIZE.sm }]}>
                  ₹{totalValue}
                </Text>
              </View>
            </View>

            {/* Batch Information */}
            <View style={styles.detailBlock}>
              <Text style={styles.blockTitle}>Batch Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Batch/HSN Code</Text>
                <Text style={styles.detailValue}>{item?.hsn ?? "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expiry Date</Text>
                <Text style={styles.detailValue}>
                  {item?.expiryDate ? formatDate(item.expiryDate) : "N/A"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Manufacturer</Text>
                <Text style={[styles.detailValue, { maxWidth: "60%" }]} numberOfLines={2}>
                  {inventoryData?.manufacturer ?? "N/A"}
                </Text>
              </View>
            </View>

            {/* Storage Warning */}
            <View style={styles.storageWarning}>
              <AlertTriangleIcon size={16} color="#f59e0b" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.storageTitle}>Storage Conditions</Text>
                <Text style={styles.storageText}>
                  Store at room temperature (15-30°C), protect from moisture and direct sunlight
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: COLORS.bg,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: COLORS.text }]}>Inventory Details</Text>
          <Text style={[styles.subtitle, { color: COLORS.sub }]}>
            {inventoryData?.agencyName ?? "Agency"} • {inventoryData?.manufacturer ?? "Manufacturer"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: SPACING.md,
          paddingBottom: FOOTER_H + 24,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* Supplier Card */}
        <View style={[styles.card, { backgroundColor: COLORS.card }]}>
          <View style={styles.cardHeader}>
            <BuildingIcon size={20} color={COLORS.brand} />
            <Text style={styles.sectionTitle}>Supplier Information</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Agency Name</Text>
            <Text style={styles.value}>{inventoryData?.agencyName ?? "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Manufacturer</Text>
            <Text style={styles.value}>{inventoryData?.manufacturer ?? "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Agent Code</Text>
            <Text style={styles.value}>{inventoryData?.agentCode ?? "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact Number</Text>
            <Text style={styles.value}>{inventoryData?.contactNo ?? "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email Address</Text>
            <Text style={[styles.value, { maxWidth: "60%" }]} numberOfLines={1}>
              {inventoryData?.email ?? "N/A"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Added By</Text>
            <Text style={styles.value}>
              {inventoryData?.firstName ?? ""} {inventoryData?.lastName ?? ""}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Added On</Text>
            <Text style={styles.value}>
              {inventoryData?.addedOn ? formatDate(inventoryData.addedOn) : "N/A"}
            </Text>
          </View>
        </View>

        {/* Medicines List */}
        <View style={[styles.card, { backgroundColor: COLORS.card }]}>
          <View style={styles.cardHeader}>
            <PillIcon size={20} color={COLORS.brand} />
            <Text style={styles.sectionTitle}>
              Medicines ({inventoryData?.medicinesList?.length ?? 0})
            </Text>
          </View>

          {inventoryData?.medicinesList?.length > 0 ? (
            <FlatList
              data={inventoryData.medicinesList}
              renderItem={renderMedicineItem}
              keyExtractor={(item) => String(item?.id ?? Math.random())}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <PackageIcon size={44} color="#D1D5DB" />
                  </View>
                  <Text style={styles.emptyText}>No medicines found</Text>
                  <Text style={styles.emptySubtext}>Add medicines to see them here</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <PackageIcon size={44} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyText}>No medicines found</Text>
              <Text style={styles.emptySubtext}>Add medicines to see them here</Text>
            </View>
          )}

          {inventoryData?.medicinesList?.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Inventory Value</Text>
              <Text style={styles.totalValue}>₹{inventoryStats.totalValue.toFixed(2)}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"inventory"} brandColor={COLORS.brand} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
  },
  scroll: {
    flex: 1,
  },

  /* Cards */
  card: {
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
    flex: 1,
  },
  value: {
    fontSize: FONT_SIZE.xs,
    color: "#111827",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },

  /* Medicine Cards */
  medicineCard: {
    backgroundColor: "#FFFFFF",
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  medicineHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  medicineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0fdfa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  medicineMeta: {
    flex: 1,
  },
  medicineName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  medicineSubInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  medicineId: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 6,
  },
  medicineCategory: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
  },
  medicineRight: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniStatusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },

  /* Quick Grid */
  quickGrid: {
    flexDirection: "row",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  gridItem: {
    flex: 1,
    alignItems: "center",
  },
  gridIcon: {
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: FONT_SIZE.xs - 1,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  gridValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#111827",
  },
  gridDivider: {
    width: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 8,
  },

  /* Expanded Section */
  expandedSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  detailBlock: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  blockTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
    flex: 1,
  },
  detailValue: {
    fontSize: FONT_SIZE.xs,
    color: "#111827",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },

  /* Storage Warning */
  storageWarning: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    padding: SPACING.sm + 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  storageTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 3,
  },
  storageText: {
    fontSize: FONT_SIZE.xs,
    color: "#92400e",
    lineHeight: 16,
  },

  /* Total Row */
  totalRow: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
  },
  totalLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: "#111827",
  },
  totalValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.brandDark,
  },

  /* Empty State */
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xl + SPACING.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.xs,
    color: "#9CA3AF",
  },

  /* Footer */
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
});

export default InventoryDetails;