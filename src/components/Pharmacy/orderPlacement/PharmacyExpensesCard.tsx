import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  SPACING,
  FONT_SIZE,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import LinearGradient from 'react-native-linear-gradient';

// Icons
import {
  PackageIcon,
  UserIcon,
  PhoneIcon,
  EmailIcon,
  CalendarIcon,
  RupeeIcon,
  ChevronRightIcon,
} from "../../../utils/SvgIcons";

interface ExpenseData {
  id: number;
  agencyName?: string;
  email?: string;
  contactNo?: string | number;
  agentCode?: number | string;
  manufacturer?: string;
  addedOn?: string;
  medicinesList?: any[];
  totalValue?: number;
  status?: string;
}

interface PharmacyExpensesCardProps {
  data: ExpenseData[];
  onCardPress?: (item: ExpenseData) => void;
}

const PharmacyExpensesCard: React.FC<PharmacyExpensesCardProps> = ({ data, onCardPress }) => {
  const [animation] = useState(new Animated.Value(0));

  const getStatusColors = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return ['#10b981', '#059669'];
      case "pending":
        return ['#f59e0b', '#d97706'];
      case "processing":
        return ['#3b82f6', '#2563eb'];
      case "delivered":
        return ['#8b5cf6', '#7c3aed'];
      default:
        return [COLORS.brand, COLORS.brandDark];
    }
  };

  const getStatusText = (status: string) => {
    return status?.charAt(0)?.toUpperCase() + status?.slice(1) || "Processing";
  };

  const formatCurrency = (value: number) => {
    return `₹${(value || 0).toLocaleString()}`;
  };

  const renderCard = (item: ExpenseData) => {
    console.log("itemm",item)
    const medicinesCount = Array.isArray(item.medicinesList) ? item.medicinesList.length : 0;
    const date = item.addedOn ? new Date(item.addedOn).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : "-";
    
    const time = item.addedOn ? new Date(item.addedOn).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }) : "-";

    const statusColors = getStatusColors(item.status || "processing");

    return (
      <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.9} onPress={() => onCardPress && onCardPress(item)}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.agencyInfo}>
              <View style={styles.iconWrap}>
                <PackageIcon size={20} color={COLORS.brand} />
              </View>
              <View style={styles.titleSection}>
                <Text style={styles.agencyName} numberOfLines={1}>
                  {item.agencyName || "-"}
                </Text>
                <Text style={styles.manufacturer} numberOfLines={1}>
                  {item.manufacturer || "No manufacturer"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <LinearGradient
              colors={statusColors}
              style={styles.statusBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.statusText}>
                {getStatusText(item.status || "processing")}
              </Text>
            </LinearGradient>
            
            <View style={styles.chevronBtn}>
              <ChevronRightIcon size={20} color={COLORS.brand} />
            </View>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <UserIcon size={14} color={COLORS.sub} />
                <Text style={styles.infoLabel}>Agent Code</Text>
              </View>
              <Text style={styles.infoValue}>{item.agentCode ?? "—"}</Text>
            </View>

            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <PhoneIcon size={14} color={COLORS.sub} />
                <Text style={styles.infoLabel}>Contact</Text>
              </View>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.contactNo || "—"}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <PackageIcon size={14} color={COLORS.sub} />
                <Text style={styles.infoLabel}>Items</Text>
              </View>
              <Text style={styles.infoValue}>
                {medicinesCount} {medicinesCount === 1 ? "item" : "items"}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <RupeeIcon size={14} color={COLORS.sub} />
                <Text style={styles.infoLabel}>Manufacturer</Text>
              </View>
              <Text style={[styles.infoValue, styles.totalValue]}>
                {formatCurrency(item?.manufacturer || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.dateSection}>
            <CalendarIcon size={14} color={COLORS.sub} />
            <Text style={styles.dateText}>
              {date} at {time}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {data.map((item) => renderCard(item))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flex: 1,
  },
  agencyInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  titleSection: {
    flex: 1,
  },
  agencyName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  manufacturer: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  chevronBtn: {
    padding: SPACING.xs,
    borderRadius: 8,
    backgroundColor: COLORS.brandLight,
  },
  cardBody: {
    gap: SPACING.md,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  infoBlock: {
    flex: 1,
    minWidth: "45%",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  totalValue: {
    color: COLORS.brand,
    fontWeight: "700",
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
});

export default PharmacyExpensesCard;