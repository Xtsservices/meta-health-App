import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
  Animated,
} from "react-native";
import {
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  responsiveWidth,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

// Icons
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  PackageIcon,
  AlertTriangleIcon,
  XIcon,
  RupeeIcon,
  CalendarIcon,
  PillIcon,
} from "../../../utils/SvgIcons";
import { formatDate } from "../../../utils/dateTime";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SelectedMedicineData {
  id: number;
  name: string;
  category: string;
  quantity: number;
  hsn?: string;
  costPrice: number;
  sellingPrice: number;
  gst: number;
  expiryDate?: string;
  manufacturer?: string;
  addedOn?: string;
  batchNumber?: string;
}

interface InnerTableProps {
  data: SelectedMedicineData[];
  isButton?: boolean;
  parentComponentName: string;
  setRenderData?: React.Dispatch<React.SetStateAction<boolean>>;
  setEditMedId?: React.Dispatch<React.SetStateAction<number | null>>;
}

const PharmacyExpensesInnerTable: React.FC<InnerTableProps> = ({
  data,
  parentComponentName,
  setRenderData,
  setEditMedId,
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);
  const [animations] = useState(new Map());

  // Status colors
  const getStatusColors = (status: string) => {
    switch (status) {
      case "Expired":
        return '#ef4444';
      case "Low Stock":
        return '#f59e0b';
      case "Active":
        return '#10b981';
      default:
        return COLORS.sub;
    }
  };

  // Priority: Expired > Low Stock > Active
  const getItemStatus = (row: SelectedMedicineData) => {
    if (row?.expiryDate) {
      const expiry = new Date(row.expiryDate);
      const now = new Date();
      if (!isNaN(expiry.getTime()) && expiry < now) return "Expired";
    }
    if (typeof row?.quantity === "number" && row?.quantity <= 10) return "Low Stock";
    return "Active";
  };

  const getAnimation = (id: number) => {
    if (!animations.has(id)) {
      animations.set(id, new Animated.Value(0));
    }
    return animations.get(id);
  };

  const handleExpandClick = (id: number) => {
    const wasExpanded = expandedRow === id;
    const animation = getAnimation(id);

    if (wasExpanded) {
      // Collapse
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setExpandedRow(null));
    } else {
      // Expand
      if (expandedRow !== null) {
        const previousAnimation = getAnimation(expandedRow);
        Animated.timing(previousAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setExpandedRow(id);
          Animated.timing(animation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }).start();
        });
      } else {
        setExpandedRow(id);
        Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  const handleEditMedicine = (id: number) => {
    if (setEditMedId && setRenderData) {
      setEditMedId(id);
      setRenderData(true);
    }
  };

  const handleDeleteMedicine = (id: number) => {
    setSelectedMedicineId(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    // hook into your deletion flow here (API call etc.)
    setDeleteModalVisible(false);
    setSelectedMedicineId(null);
    if (setRenderData) setRenderData(true);
  };

  const formatCurrency = (value: number) => {
    return `₹${(value || 0).toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {data?.length === 0 ? (
        <View style={styles.noData}>
          <PillIcon size={32} color={COLORS.border} />
          <Text style={styles.noDataText}>No medicines in this order</Text>
        </View>
      ) : (
        data?.map((row) => {
          const status = getItemStatus(row);
          const statusColor = getStatusColors(status);
          const isExpanded = expandedRow === row?.id;
          const animation = getAnimation(row?.id);

          const totalValue = (row?.costPrice * row?.quantity) || 0;
          const gstAmount = (totalValue * (row?.gst || 0)) / 100;
          const totalWithGst = totalValue + gstAmount;

          return (
            <Animated.View 
              key={String(row?.id)} 
              style={[
                styles.medicineCard,
                {
                  transform: [{
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.02]
                    })
                  }]
                }
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.left}>
                  <View style={styles.iconWrap}>
                    <PillIcon size={18} color={COLORS.buttonText} />
                  </View>

                  <View style={styles.titleWrap}>
                    <Text numberOfLines={1} style={styles.nameText}>
                      {row?.name}
                    </Text>
                    <View style={styles.idCategoryRow}>
                      <Text style={styles.idText}>ID: MED{String(row?.id).padStart(3, "0")}</Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.categoryText}>{row?.category || "Uncategorized"}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.right}>
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>{row?.quantity} pcs</Text>
                  </View>

                  {/* <Pressable
                    onPress={() => handleExpandClick(row?.id)}
                    hitSlop={8}
                    accessibilityLabel={isExpanded ? "Collapse details" : "Expand details"}
                    style={styles.expandButton}
                  >
                    {isExpanded ? (
                      <ChevronUpIcon size={20} color={COLORS.brand} />
                    ) : (
                      <ChevronDownIcon size={20} color={COLORS.brand} />
                    )}
                  </Pressable> */}
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.costSection}>
                  {/* <RupeeIcon size={12} color={COLORS.sub} /> */}
                  {/* <Text style={styles.costText}>{formatCurrency(row?.costPrice)}</Text> */}
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              </View>

              <Animated.View 
                style={[
                  styles.expanded,
                  {
                    opacity: animation,
                    height: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200]
                    })
                  }
                ]}
              >
                <View style={styles.expandedContent}>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>HSN / Batch</Text>
                      <Text style={styles.detailValue}>{row?.hsn || row?.batchNumber || "-"}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Expiry Date</Text>
                      <View style={styles.dateRow}>
                        <CalendarIcon size={12} color={COLORS.sub} />
                        <Text style={styles.detailValue}>{formatDate(row?.expiryDate || "")}</Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>GST Rate</Text>
                      <Text style={styles.detailValue}>{row?.gst || 0}%</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Selling Price</Text>
                      <Text style={styles.detailValue}>{formatCurrency(row?.sellingPrice)}</Text>
                    </View>
                  </View>

                  <View style={styles.calculationSection}>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Base Value:</Text>
                      <Text style={styles.calcValue}>{formatCurrency(totalValue)}</Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>GST ({row?.gst || 0}%):</Text>
                      <Text style={styles.calcValue}>{formatCurrency(gstAmount)}</Text>
                    </View>
                    <View style={[styles.calcRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total Value:</Text>
                      <Text style={styles.totalValue}>{formatCurrency(totalWithGst)}</Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryAction]}
                      onPress={() => handleEditMedicine(row?.id)}
                      accessibilityLabel={`Edit medicine ${row?.name}`}
                    >
                      <EditIcon size={14} color={COLORS.buttonText} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryAction]}
                      onPress={() => {
                        /* update stock handler */
                      }}
                      accessibilityLabel={`Update stock for ${row?.name}`}
                    >
                      <PackageIcon size={14} color={COLORS.brand} />
                      <Text style={[styles.actionText, styles.secondaryActionText]}>Update Stock</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.dangerAction]}
                      onPress={() => handleDeleteMedicine(row?.id)}
                      accessibilityLabel={`Delete medicine ${row?.name}`}
                    >
                      <XIcon size={14} color={COLORS.danger} />
                      <Text style={[styles.actionText, styles.dangerActionText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>
          );
        })
      )}

      {/* Delete Modal */}
      <Modal
        transparent
        visible={deleteModalVisible}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <AlertTriangleIcon size={44} color={COLORS.warning} />
            </View>
            <Text style={styles.modalTitle}>Delete Medicine</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this medicine? This action cannot be undone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancel} 
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalDelete} 
                onPress={confirmDelete}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
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
    width: "100%",
    gap: SPACING.xs,
  },
  medicineCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  left: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: SPACING.xs,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.xs,
  },
  titleWrap: {
    flex: 1,
  },
  nameText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  idCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  idText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  dot: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  categoryText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand,
    fontWeight: "500",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  quantityBadge: {
    backgroundColor: COLORS.chip,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 15,
  },
  quantityText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.brand,
  },
  expandButton: {
    padding: SPACING.xs / 1.2,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
  },
  costSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  costText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: "center",
  },
  statusText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.buttonText,
  },
  expanded: {
    overflow: 'hidden',
  },
  expandedContent: {
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  detailItem: {
    width: '48%',
  },
  detailLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: 2,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calculationSection: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 8,
    padding: SPACING.sm,
    gap: 4,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calcLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  calcValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 4,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  totalValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.brand,
  },
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs / 2,
  },
  primaryAction: {
    backgroundColor: COLORS.brand,
  },
  secondaryAction: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  dangerAction: {
    borderWidth: 1.5,
    borderColor: COLORS.dangerLight,
    backgroundColor: COLORS.dangerLight,
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.buttonText,
  },
  secondaryActionText: {
    color: COLORS.brand,
  },
  dangerActionText: {
    color: COLORS.danger,
  },
  noData: {
    padding: SPACING.lg,
    alignItems: "center",
    gap: SPACING.sm,
  },
  noDataText: {
    color: COLORS.sub,
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIcon: {
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  modalMessage: {
    color: COLORS.sub,
    textAlign: "center",
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    width: "100%",
  },
  modalCancel: {
    flex: 1,
    padding: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancelText: {
    color: COLORS.sub,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  modalDelete: {
    flex: 1,
    padding: SPACING.sm,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    alignItems: "center",
  },
  modalDeleteText: {
    color: COLORS.buttonText,
    fontWeight: "800",
    fontSize: FONT_SIZE.sm,
  },
});

export default PharmacyExpensesInnerTable;