// screens/RevenueBarChartWithFilters.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

import {
  SCREEN_WIDTH,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  getResponsiveFontSize,
  moderateScale,
} from "../../utils/responsive";
import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";

// Icons
import {
  BarChart3,
  Filter,
  X,
  ChevronDown,
  AlertCircle,
  Calendar,
} from "lucide-react-native";

/* ---------------- COLORS ---------------- */
const COLORS = {
  primary: "#14b8a6",
  primaryDark: "#0f766e",
  primaryLight: "#ccfbf1",
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  textSecondary: "#475569",
  subText: "#64748b",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  placeholder: "#94a3b8",
  
  success: "#10b981",
  successLight: "#d1fae5",
  successBg: "#ecfdf5",
  warning: "#f59e0b",
  warningLight: "#fde68a",
  warningBg: "#fffbeb",
  error: "#ef4444",
  errorLight: "#fecaca",
  errorBg: "#fef2f2",
  info: "#3b82f6",
  infoLight: "#dbeafe",
  infoBg: "#eff6ff",
  
  chartTeal: "#14b8a6",
  chartPurple: "#a855f7",
  chartBlue: "#3b82f6",
  chartRed: "#ef4444",
  chartGreen: "#10b981",
  chartYellow: "#f59e0b",
  chartPink: "#ec4899",
  chartOrange: "#f97316",
  
  shadowColor: "rgba(0, 0, 0, 0.05)",
  modalOverlay: "rgba(0, 0, 0, 0.5)",
};

/* ---------------- TYPES ---------------- */
interface BarChartDataItem {
  period?: number;
  periodLabel?: string;
  totalAppointments?: number;
  totalConsultationFees?: number;
  totalDoctorRevenue?: number;
  totalHospitalRevenue?: number;
  avgCommission?: number;
}

interface BarChartData {
  chartData: BarChartDataItem[];
  metadata?: {
    groupBy?: string;
    year?: number;
    month?: number;
  };
}

interface BarChartFilters {
  year: number;
  month?: number;
  groupBy: "day" | "week" | "month" | "year";
  doctorProfileID?: number;
  hospitalID: number;
  doctorID: number;
}

/* ---------------- FILTER CONSTANTS ---------------- */
const GROUP_BY_OPTIONS = [
  { label: "Daily", value: "day" },
  { label: "Weekly", value: "week" },
  { label: "Monthly", value: "month" },
  { label: "Yearly", value: "year" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 5 + i);

const MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

/* ---------------- FILTER OPTION COMPONENT ---------------- */
const FilterOption = ({ 
  label, 
  value, 
  isActive, 
  onPress,
  icon: Icon,
  iconColor
}: { 
  label: string; 
  value: any; 
  isActive: boolean; 
  onPress: (value: any) => void;
  icon?: React.ComponentType<any>;
  iconColor?: string;
}) => (
  <TouchableOpacity
    style={[
      styles.filterOption,
      isActive && styles.filterOptionActive,
    ]}
    onPress={() => onPress(value)}
    activeOpacity={0.7}
  >
    {Icon && <Icon size={14} color={isActive ? '#fff' : iconColor || COLORS.subText} style={styles.filterOptionIcon} />}
    <Text style={[
      styles.filterOptionText,
      isActive && styles.filterOptionTextActive,
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* ---------------- FILTER MODAL COMPONENT ---------------- */
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: BarChartFilters) => void;
  onResetFilters: () => void;
  initialFilters: BarChartFilters;
}

const FilterModalComponent: React.FC<FilterModalProps> = React.memo(({
  visible,
  onClose,
  onApplyFilters,
  onResetFilters,
  initialFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<BarChartFilters>(initialFilters);
  
  // Update local filters when modal opens with new initialFilters
  useEffect(() => {
    if (visible) {
      setLocalFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  const isMonthEnabled = localFilters.groupBy === "day" || localFilters.groupBy === "week";
  const isYearEnabled = localFilters.groupBy !== "year";

  const updateLocalFilter = (key: keyof BarChartFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApply = () => {
    console.log("Applying filters:", localFilters);
    onApplyFilters(localFilters);
  };

  const handleReset = () => {
    onResetFilters();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.filterModalOverlay}>
        <View style={[styles.filterModalContent, { backgroundColor: COLORS.card }]}>
          <View style={styles.filterModalHeader}>
            <Text style={[styles.filterModalTitle, { color: COLORS.text }]}>
              📊 Chart Filters
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.filterScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* GROUP BY FILTER */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Group By
              </Text>
              <View style={styles.filterOptions}>
                {GROUP_BY_OPTIONS.map((option) => (
                  <FilterOption
                    key={option.value}
                    label={option.label}
                    value={option.value}
                    isActive={localFilters.groupBy === option.value}
                    onPress={(value) => updateLocalFilter("groupBy", value)}
                    icon={Calendar}
                    iconColor={COLORS.primary}
                  />
                ))}
              </View>
            </View>

            {/* YEAR FILTER */}
            {isYearEnabled && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                  Year
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.yearScrollContainer}
                >
                  {YEARS.map((year) => (
                    <FilterOption
                      key={year}
                      label={year.toString()}
                      value={year}
                      isActive={localFilters.year === year}
                      onPress={(value) => updateLocalFilter("year", value)}
                      icon={Calendar}
                      iconColor={COLORS.primary}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* MONTH FILTER */}
            {isMonthEnabled && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                  Month
                </Text>
                <View style={styles.monthGrid}>
                  {MONTHS.map((month) => (
                    <FilterOption
                      key={month.value}
                      label={month.label.substring(0, 3)}
                      value={month.value}
                      isActive={localFilters.month === month.value}
                      onPress={(value) => updateLocalFilter("month", value)}
                      iconColor={COLORS.primary}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.filterModalButtons}>
            <TouchableOpacity
              style={[styles.filterModalButton, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={[styles.resetButtonText, { color: COLORS.error }]}>
                Reset All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterModalButton, { backgroundColor: COLORS.primary }]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

/* ---------------- MAIN COMPONENT ---------------- */
const RevenueBarChartWithFilters: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<BarChartData>({ chartData: [] });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default filter state
  const [filters, setFilters] = useState<BarChartFilters>({
    year: CURRENT_YEAR,
    month: new Date().getMonth() + 1,
    groupBy: "month",
    hospitalID: user?.hospitalID || 0,
    doctorID: user?.id || 0,
    doctorProfileID: user?.doctorProfileID,
  });

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const getPeriodLabel = (item: BarChartDataItem, groupBy: string) => {
    if (!item.periodLabel) {
      switch (groupBy) {
        case "day":
          return `Day ${item.period}`;
        case "week":
          return `Week ${item.period}`;
        case "month":
          return MONTHS.find(m => m.value === item.period)?.label || `Month ${item.period}`;
        case "year":
          return `${item.period}`;
        default:
          return `Period ${item.period}`;
      }
    }
    return item.periodLabel;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  /* ---------------- LOAD CHART DATA ---------------- */
  const loadChartData = async (chartFilters: BarChartFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) {
        setError("Authentication required");
        return;
      }

      // Build query parameters according to schema
      const params = new URLSearchParams({
        year: chartFilters.year.toString(),
        groupBy: chartFilters.groupBy,
        hospitalID: chartFilters.hospitalID.toString(),
        doctorID: chartFilters.doctorID.toString(),
      });

      if (chartFilters.month) {
        params.append("month", chartFilters.month.toString());
      }
      
      if (chartFilters.doctorProfileID) {
        params.append("doctorProfileID", chartFilters.doctorProfileID.toString());
      }

      const url = `revenue/doctor/${user.id}/chart?${params.toString()}`;
      const response = await AuthFetch(url, token) as any;

      if (response?.data?.success || response?.status === 'success') {
        const data = response?.data?.data || response?.data || { chartData: [] };
        setChartData(data);
      } else {
        setChartData({ chartData: [] });
        setError("No chart data available");
      }
    } catch (err) {
      console.error("Error loading bar chart data:", err);
      setChartData({ chartData: [] });
      setError("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- EFFECTS ---------------- */
  useFocusEffect(
    useCallback(() => {
      loadChartData(filters);
    }, [filters])
  );

  useEffect(() => {
    loadChartData(filters);
  }, [filters]);

  /* ---------------- FILTER HANDLERS ---------------- */
  const handleApplyFilters = (newFilters: BarChartFilters) => {
    console.log("Applying new filters:", newFilters);
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    console.log("Resetting filters to default");
    const defaultFilters: BarChartFilters = {
      year: CURRENT_YEAR,
      month: new Date().getMonth() + 1,
      groupBy: "month",
      hospitalID: user?.hospitalID || 0,
      doctorID: user?.id || 0,
      doctorProfileID: user?.doctorProfileID,
    };
    setFilters(defaultFilters);
    setShowFilterModal(false);
  };

  /* ---------------- RENDER CHART ---------------- */
  const renderChart = () => {
    const data = chartData?.chartData || [];
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading chart data...</Text>
        </View>
      );
    }

    if (error || data.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={32} color={COLORS.error} />
          <Text style={styles.errorText}>
            {error || "No chart data available"}
          </Text>
          <Text style={styles.errorSubText}>
            Try adjusting your filters
          </Text>
        </View>
      );
    }

    // Find max values for scaling
    const maxAppointments = Math.max(
      ...data.map(d => d.totalAppointments || 0),
      1
    );
    const maxFees = Math.max(
      ...data.map(d => d.totalConsultationFees || 0),
      1
    );

    const CHART_HEIGHT = 280;
    const TOP_LABEL_SPACE = 30;
    const BOTTOM_LABEL_SPACE = 30;
    const chartHeight = CHART_HEIGHT - TOP_LABEL_SPACE - BOTTOM_LABEL_SPACE;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScrollContainer}
      >
        <View style={{ height: chartHeight, paddingHorizontal: SPACING.md }}>
          {/* Bars Container */}
          <View style={styles.barChartContainer}>
            {data.map((item, index) => {
              const appointmentHeight =
                ((item.totalAppointments || 0) / maxAppointments) * (chartHeight - 40);
              
              const feeHeight =
                ((item.totalConsultationFees || 0) / maxFees) * (chartHeight - 40);

              return (
                <View key={index} style={styles.barGroupWrapper}>
                  {/* VALUES */}
                  <View style={styles.barValueRow}>
                    <Text style={styles.barValueTop}>
                      {item.totalAppointments || 0}
                    </Text>
                    <Text style={styles.barValueTop}>
                      ₹{(item.totalConsultationFees || 0).toLocaleString()}
                    </Text>
                  </View>

                  {/* BARS */}
                  <View style={styles.barPair}>
                    {/* Appointments Bar - Gradient */}
                    <LinearGradient
                      colors={["#3b82f6", "#14b8a6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[styles.bar, { height: appointmentHeight }]}
                    />

                    {/* Fees Bar - Solid */}
                    <View
                      style={[
                        styles.bar,
                        { 
                          height: feeHeight, 
                          backgroundColor: "#10b981",
                          marginLeft: 2,
                        }
                      ]}
                    />
                  </View>

                  {/* PERIOD LABEL */}
                  <Text style={styles.periodLabel}>
                    {getPeriodLabel(item, filters.groupBy)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* X-axis */}
          <View style={styles.xAxis} />
        </View>
      </ScrollView>
    );
  };

  /* ---------------- FILTER SUMMARY ---------------- */
  const getFilterSummary = () => {
    const parts: string[] = [];
    
    // Group By
    const groupByLabel = GROUP_BY_OPTIONS.find(g => g.value === filters.groupBy)?.label || filters.groupBy;
    parts.push(`Group: ${groupByLabel}`);
    
    // Year (always shown)
    parts.push(`Year: ${filters.year}`);
    
    // Month (if applicable)
    if (filters.month && (filters.groupBy === "day" || filters.groupBy === "week")) {
      const monthLabel = MONTHS.find(m => m.value === filters.month)?.label || `Month ${filters.month}`;
      parts.push(`Month: ${monthLabel}`);
    }
    
    return parts.join(" • ");
  };

  // Memoize the FilterModal to prevent unnecessary re-renders
  const FilterModal = useMemo(() => (
    <FilterModalComponent
      visible={showFilterModal}
      onClose={() => setShowFilterModal(false)}
      onApplyFilters={handleApplyFilters}
      onResetFilters={handleResetFilters}
      initialFilters={filters}
    />
  ), [showFilterModal, filters]);

  /* ---------------- MAIN RENDER ---------------- */
  return (
    <View style={styles.container}>
      {/* HEADER - Made Responsive */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BarChart3 size={20} color={COLORS.primary} />
          <Text style={styles.title}>Revenue Trend</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, {
            minHeight: moderateScale(34),
            paddingHorizontal: moderateScale(12),
            paddingVertical: moderateScale(6),
          }]}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.85}
        >
          <Filter size={16} color="#ffffff" />
          <Text style={[styles.filterButtonText, {
            fontSize: moderateScale(12),
          }]}>Filter</Text>
          <ChevronDown size={12} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* FILTER SUMMARY */}
      <View style={styles.filterSummary}>
        <Text style={styles.filterSummaryText} numberOfLines={2}>
          {getFilterSummary()}
        </Text>
      </View>

      {/* CHART */}
      <View style={styles.chartCard}>
        {renderChart()}
        
        {/* LEGEND */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Appointments</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Consultation Fees</Text>
          </View>
        </View>
      </View>

      {/* STATS SUMMARY */}
      {chartData?.chartData && chartData.chartData.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Appointments</Text>
            <Text style={styles.statValue}>
              {chartData.chartData.reduce((sum, item) => sum + (item.totalAppointments || 0), 0)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Fees</Text>
            <Text style={styles.statValue}>
              {formatCurrency(
                chartData.chartData.reduce((sum, item) => sum + (item.totalConsultationFees || 0), 0)
              )}
            </Text>
          </View>
        </View>
      )}

      {/* FILTER MODAL */}
      {FilterModal}
    </View>
  );
};

export default RevenueBarChartWithFilters;

/* ======================= STYLES ======================= */
const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  filterButtonText: {
    fontWeight: "600",
    color: "#ffffff",
  },
  filterSummary: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterSummaryText: {
    fontSize: 12,
    color: COLORS.subText,
    textAlign: "center",
  },
  chartCard: {
    padding: SPACING.md,
  },
  chartScrollContainer: {
    paddingRight: SPACING.xl,
  },
  barChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 200,
    paddingBottom: 30,
    gap: 10,
  },
  barGroupWrapper: {
    alignItems: "center",
  },
  barValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 28,
    marginBottom: 6,
  },
  barValueTop: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  barPair: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  bar: {
    width: 14,
    minHeight: 20,
    borderRadius: 2,
  },
  periodLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 18,
    textAlign: "center",
    maxWidth: 60,
  },
  xAxis: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING.md,
    gap: SPACING.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: SPACING.xs,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.subText,
  },
  statsContainer: {
    flexDirection: "row",
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.subText,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
  },
  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.subText,
  },
  errorContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  errorSubText: {
    fontSize: 14,
    color: COLORS.subText,
    textAlign: "center",
  },
  // Filter Modal Styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterScroll: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.text,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionIcon: {
    marginRight: 6,
  },
  filterOptionText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  yearScrollContainer: {
    gap: 8,
    paddingRight: 20,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterModalButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  filterModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});