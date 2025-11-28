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
  ChevronDownIcon,
  ChevronUpIcon,
  PackageIcon,
  UserIcon,
  PhoneIcon,
  EmailIcon,
  CalendarIcon,
  RupeeIcon,
} from "../../../utils/SvgIcons";
import PharmacyExpensesInnerTable from "./PharmacyExpensesInnerTable";

interface ExpenseData {
  id: number;
  agencyName: string;
  email: string;
  contactNo: string;
  agentCode: number | string;
  manufacturer: string;
  addedOn: string;
  medicinesList: any[];
  totalValue?: number;
  status?: string;
}

interface PharmacyExpensesCardProps {
  data: ExpenseData[];
}

const PharmacyExpensesCard: React.FC<PharmacyExpensesCardProps> = ({ data }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [animation] = useState(new Animated.Value(0));

  const handleToggleExpand = (id: number) => {
    if (expandedId === id) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setExpandedId(null));
    } else {
      setExpandedId(id);
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

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

    const isExpanded = expandedId === item.id;
    const statusColors = getStatusColors(item.status || "processing");

    return (
      <View key={item.id} style={styles.card}>
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
            
            <TouchableOpacity 
              onPress={() => handleToggleExpand(item.id)} 
              style={styles.expandBtn}
            >
              {isExpanded ? (
                <ChevronUpIcon size={20} color={COLORS.brand} />
              ) : (
                <ChevronDownIcon size={20} color={COLORS.brand} />
              )}
            </TouchableOpacity>
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
                <Text style={styles.infoLabel}>Total Value</Text>
              </View>
              <Text style={[styles.infoValue, styles.totalValue]}>
                {formatCurrency(item.totalValue || 0)}
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

        {/* Expanded Section */}
        {isExpanded && (
          <Animated.View 
            style={[
              styles.expandedSection,
              {
                opacity: animation,
                transform: [{
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.expandedContent}>
              {item.email && (
                <View style={styles.emailSection}>
                  <EmailIcon size={14} color={COLORS.sub} />
                  <Text style={styles.emailText} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              )}
              
              <View style={styles.medicinesSection}>
                <Text style={styles.medicinesTitle}>Medicines Ordered</Text>
                <PharmacyExpensesInnerTable
                  data={item.medicinesList || []}
                  isButton={false}
                  parentComponentName={"Order"}
                />
              </View>
            </View>
          </Animated.View>
        )}
      </View>
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
  expandBtn: {
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
  expandedSection: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  expandedContent: {
    gap: SPACING.md,
  },
  emailSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: SPACING.sm,
    backgroundColor: COLORS.brandLight,
    borderRadius: 8,
  },
  emailText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand,
    fontWeight: "500",
    flex: 1,
  },
  medicinesSection: {
    gap: SPACING.sm,
  },
  medicinesTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
});

export default PharmacyExpensesCard;