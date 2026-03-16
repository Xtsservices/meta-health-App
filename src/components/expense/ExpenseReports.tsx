// components/expense/ExpenseReportsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  BarChart,
  PieChart,
} from 'react-native-chart-kit';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Users,
  Building,
  Package,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ChevronDown,
  X,
  AlertCircle,
  CreditCard,
  ArrowUpRight,
  XCircle,
  CheckCircle,
  Clock,
  Activity,
  Wallet,
  Percent,
  Target,
} from 'lucide-react-native';

import { RootState } from '../../store/store';
import { AuthFetch } from '../../auth/auth';
import {
  moderateScale,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  ELEVATION,
  getResponsiveFontSize,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  moderateVerticalScale,
  wp,
  hp,
  isTablet,
  isSmallDevice,
  getDeviceSpecificValue,
  getSafeAreaInsets,
  ICON_SIZE,
} from '../../utils/responsive';
import { showError, showSuccess } from '../../store/toast.slice';
import { formatDateTime, formatDate } from '../../utils/dateTime';

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

  metricBlue: "#3b82f6",
  metricBlueBg: "#eff6ff",
  metricGreen: "#10b981",
  metricGreenBg: "#ecfdf5",
  metricPurple: "#8b5cf6",
  metricPurpleBg: "#f5f3ff",
  metricOrange: "#f97316",
  metricOrangeBg: "#fff7ed",

  shadowColor: "rgba(0, 0, 0, 0.05)",
  modalOverlay: "rgba(0, 0, 0, 0.3)",
};

/* ---------------- FILTER TYPES ---------------- */
const FILTER_TYPES = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
};

const FILTER_LABELS = {
  [FILTER_TYPES.TODAY]: 'Today',
  [FILTER_TYPES.WEEK]: 'Week',
  [FILTER_TYPES.MONTH]: ' Month',
  [FILTER_TYPES.YEAR]: 'This Year',
};

/* ---------------- STATUS COLORS ---------------- */
const STATUS_COLORS = {
  pending: "#f59e0b",
  paid: "#10b981",
  approved: "#3b82f6",
  rejected: "#ef4444",
  cancelled: "#64748b",
};

/* ---------------- METRIC CARD COMPONENT ---------------- */
const MetricCard = ({
  title,
  value,
  icon,
  color,
  bgColor,
  onPress,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onPress?: () => void;
}) => {
  const CardContent = (
    <View style={[styles.metricCard, { backgroundColor: "#ffffff" }]}>
      <View style={styles.metricContent}>
        <View style={styles.metricTextContainer}>
          <Text style={styles.metricTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <View style={[styles.metricIconContainer, { backgroundColor: bgColor }]}>
          {icon}
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={{ flex: 1 }}
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

/* ---------------- STATUS PIE CHART COMPONENT ---------------- */
const StatusPieChart = ({
  data,
  size = 220,
  depth = 18,
  showLegend = true
}: {
  data: any[];
  size?: number;
  depth?: number;
  showLegend?: boolean;
}) => {
  const total = data?.reduce((s, d) => s + (d?.value || 0), 0) || 1;

  const isSingleFullSlice =
    data.length === 1 && (data[0]?.value || 0) === total;

  const radius = size / 2;
  const cx = size / 2;
  const cy = size / 2;

  const polar = (a: number) => {
    const r = ((a - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(r),
      y: cy + radius * Math.sin(r),
    };
  };

  const arc = (start: number, end: number) => {
    const s = polar(end);
    const e = polar(start);
    const large = end - start > 180 ? 1 : 0;

    return `
      M ${cx} ${cy}
      L ${s.x} ${s.y}
      A ${radius} ${radius} 0 ${large} 0 ${e.x} ${e.y}
      Z
    `;
  };

  const darkenColor = (hex: string, amount: number = 0.35): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - 255 * amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - 255 * amount);
    const b = Math.max(0, (num & 0x0000ff) - 255 * amount);
    return `rgb(${r},${g},${b})`;
  };

  const svgHeight = size * 0.75 + depth + 20;

  return (
    <View style={styles.pieChartContainer}>
      <Svg
        width={size}
        height={svgHeight}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* DEPTH */}
        {isSingleFullSlice
          ? Array.from({ length: depth }).map((_, z) => (
              <Circle
                key={`d-${z}`}
                cx={cx}
                cy={cy + z}
                r={radius}
                fill={darkenColor(data[0]?.color || COLORS.primary, 0.35)}
                transform="scale(1 0.6)"
                origin={`${cx} ${cy}`}
              />
            ))
          : Array.from({ length: depth }).map((_, z) => {
              let a = 0;
              return data.map((d, i) => {
                const slice = ((d.value || 0) / total) * 360;
                const p = arc(a, a + slice);
                a += slice;

                return (
                  <Path
                    key={`d-${z}-${i}`}
                    d={p}
                    fill={darkenColor(d?.color || COLORS.primary, 0.35)}
                    transform={`translate(0 ${z}) scale(1 0.6)`}
                    origin={`${cx} ${cy}`}
                  />
                );
              });
            })}

        {/* TOP */}
        {isSingleFullSlice ? (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={data[0]?.color || COLORS.primary}
            transform="scale(1 0.6)"
            origin={`${cx} ${cy}`}
          />
        ) : (
          (() => {
            let a = 0;
            return data.map((d, i) => {
              const slice = ((d.value || 0) / total) * 360;
              const p = arc(a, a + slice);
              a += slice;

              return (
                <Path
                  key={`t-${i}`}
                  d={p}
                  fill={d.color || COLORS.primary}
                  transform="scale(1 0.6)"
                  origin={`${cx} ${cy}`}
                />
              );
            });
          })()
        )}
      </Svg>

{showLegend && (
  <View style={{ width: "100%", paddingHorizontal: SPACING.md }}>
    <View style={styles.statusLegendContainer}>
          {data?.map((item, index) => (
            <View key={index} style={styles.statusLegendRow}>
              <View
                style={[
                  styles.statusLegendDot,
                  { backgroundColor: item?.color },
                ]}
              />
              <View style={styles.statusLegendTextContainer}>
                <Text style={styles.statusLegendLabel}>
                  {item?.label}
                </Text>
                <Text style={styles.statusLegendValue}>
                  {item?.value} ({((item?.value / total) * 100).toFixed(1)}%)
                </Text>
              </View>
            </View>
          ))}
    </View>
  </View>
)}
    </View>
  );
};

/* ---------------- SIMPLE BAR CHART COMPONENT ---------------- */
const SimpleBarChart = ({ data, title }: { data: any[]; title: string }) => {
  const maxValue = Math.max(...data?.map(d => d?.value || 0), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <BarChartIcon size={20} color={COLORS.primary} />
        <Text style={styles.chartCardTitle}>{title}</Text>
      </View>

      {data?.map((item, index) => {
        const widthPercent = ((item?.value || 0) / maxValue) * 100;

        return (
          <View key={index} style={styles.metricRow}>
            <View style={styles.metricRowTop}>
              <Text style={styles.metricLabel}>{item?.label}</Text>
              <Text style={styles.metricNumber}>
                {item?.prefix || ""}
                {(item?.value || 0)?.toLocaleString()}
              </Text>
            </View>

            <View style={styles.metricBarTrack}>
              <View
                style={[
                  styles.metricBarFill,
                  {
                    width: `${widthPercent}%`,
                    backgroundColor: item?.color || COLORS.primary,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

/* ---------------- MAIN SCREEN ---------------- */
const ExpenseReportsScreen = ({
  categories,
  userPermissions
}: {
  categories: any[];
  userPermissions: any;
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    filterType: FILTER_TYPES.MONTH,
  });

  const [reportData, setReportData] = useState({
    summary: {
      totalAmount: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
      expenseCount: 0,
      averageExpense: 0,
    },
    categoryDistribution: [] as any[],
    monthlyTrend: {
      labels: [] as string[],
      data: [] as number[],
    },
    statusDistribution: {
      labels: ['Pending', 'Approved', 'Paid', 'Rejected', 'Cancelled'],
      data: [0, 0, 0, 0, 0],
      colors: [COLORS.warning, COLORS.info, COLORS.success, COLORS.error, COLORS.subText],
    },
    topExpenses: [] as any[],
  });

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (filters.filterType) {
      case FILTER_TYPES.TODAY:
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case FILTER_TYPES.WEEK:
        startDate.setDate(now.getDate() - 7);
        endDate.setHours(23, 59, 59, 999);
        break;
      case FILTER_TYPES.MONTH:
        startDate.setMonth(now.getMonth() - 1);
        startDate.setDate(1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case FILTER_TYPES.QUARTER:
        startDate.setMonth(now.getMonth() - 3);
        startDate.setDate(1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case FILTER_TYPES.YEAR:
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setMonth(0);
        startDate.setDate(1);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
        startDate.setDate(1);
        endDate.setHours(23, 59, 59, 999);
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  /* ---------------- DATA LOADING FUNCTIONS ---------------- */
  const loadReportData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID) {
        setAuthError(true);
        return;
      }

      const dateRange = getDateRange();
      const url = `expense/hospital/${user.hospitalID}/daterange?startDate=${dateRange.start}&endDate=${dateRange.end}`;
      
      const response = await AuthFetch(url, token) as any;

      if (response?.status === 'success' || response?.message === 'success') {
        const expenses = response?.data?.expenses || response?.expenses || [];
        processReportData(expenses);
      } else {
        dispatch(showError('Failed to load report data'));
        processReportData([]);
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
      dispatch(showError('Failed to load report data'));
      processReportData([]);
    }
  };

  const processReportData = (expenses: any[]) => {
    // Calculate summary
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const pendingAmount = expenses
      .filter(exp => exp.status === 'pending')
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const approvedAmount = expenses
      .filter(exp => exp.status === 'approved')
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const paidAmount = expenses
      .filter(exp => exp.status === 'paid')
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    
    // Calculate category distribution
    const categoryMap = new Map();
    expenses.forEach(exp => {
      const categoryName = exp.categoryName || 'Unknown';
      const amount = parseFloat(exp.amount || 0);
      if (categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, categoryMap.get(categoryName) + amount);
      } else {
        categoryMap.set(categoryName, amount);
      }
    });

    // Sort categories by amount (descending) and take top 5
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const chartColors = [COLORS.chartTeal, COLORS.chartBlue, COLORS.chartPurple, COLORS.chartOrange, COLORS.chartGreen];
    
    const categoryDistribution = sortedCategories.map(([name, amount], index) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      amount,
      color: chartColors[index % chartColors.length],
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    }));

    // Calculate monthly trend (last 6 months)
    const monthlyData = new Map();
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      last6Months.push(monthKey);
      monthlyData.set(monthKey, 0);
    }

    expenses.forEach(exp => {
      const expDate = new Date(exp.expenseDate);
      const monthKey = expDate.toLocaleString('default', { month: 'short' });
      if (monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, monthlyData.get(monthKey) + parseFloat(exp.amount || 0));
      }
    });

    // Calculate status distribution
    const statusCounts = {
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      cancelled: 0,
    };

    expenses.forEach(exp => {
      const status = exp.status?.toLowerCase();
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
    });

    // Get top 5 expenses by amount
    const topExpenses = [...expenses]
      .sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0))
      .slice(0, 5)
      .map(exp => ({
        id: exp.id,
        description: exp.description || 'No description',
        amount: parseFloat(exp.amount || 0),
        date: exp.expenseDate,
        expenseNumber: exp.expenseNumber,
        categoryName: exp.categoryName || 'Unknown',
        status: exp.status,
      }));

    setReportData({
      summary: {
        totalAmount,
        pendingAmount,
        approvedAmount,
        paidAmount,
        expenseCount: expenses.length,
        averageExpense: expenses.length > 0 ? totalAmount / expenses.length : 0,
      },
      categoryDistribution,
      monthlyTrend: {
        labels: last6Months,
        data: last6Months.map(month => monthlyData.get(month) || 0),
      },
      statusDistribution: {
        labels: ['Pending', 'Approved', 'Paid', 'Rejected', 'Cancelled'],
        data: [
          statusCounts.pending,
          statusCounts.approved,
          statusCounts.paid,
          statusCounts.rejected,
          statusCounts.cancelled,
        ],
        colors: [COLORS.warning, COLORS.info, COLORS.success, COLORS.error, COLORS.subText],
      },
      topExpenses,
    });
  };

  /* ---------------- EFFECTS ---------------- */
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReportData().finally(() => setLoading(false));
    }, [filters])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  /* ---------------- FORMATTING FUNCTIONS ---------------- */
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getMetricsData = () => {
    const titlePrefix = FILTER_LABELS[filters.filterType];

    return [
      {
        title: `${titlePrefix} Total`,
        value: formatCurrency(reportData.summary.totalAmount),
        icon: <DollarSign size={ICON_SIZE.md} color="#2563EB" />,
        color: "#2563EB",
        bgColor: "#eff6ff",
      },
      {
        title: `${titlePrefix} Pending`,
        value: formatCurrency(reportData.summary.pendingAmount),
        icon: <Calendar size={ICON_SIZE.md} color="#F59E0B" />,
        color: "#F59E0B",
        bgColor: "#fffbeb",
      },
      {
        title: `${titlePrefix} Paid`,
        value: formatCurrency(reportData.summary.paidAmount),
        icon: <CheckCircle size={ICON_SIZE.md} color="#10B981" />,
        color: "#10B981",
        bgColor: "#ecfdf5",
      },
      {
        title: 'Total Expenses',
        value: reportData.summary.expenseCount.toLocaleString('en-IN'),
        icon: <Package size={ICON_SIZE.md} color="#7C3AED" />,
        color: "#7C3AED",
        bgColor: "#f5f3ff",
      },
    ];
  };

  const getStatusBreakdownData = () => {
    return [
      {
        label: "Pending",
        value: reportData.statusDistribution.data[0],
        color: STATUS_COLORS.pending,
      },
      {
        label: "Approved",
        value: reportData.statusDistribution.data[1],
        color: STATUS_COLORS.approved,
      },
      {
        label: "Paid",
        value: reportData.statusDistribution.data[2],
        color: STATUS_COLORS.paid,
      },
      {
        label: "Rejected",
        value: reportData.statusDistribution.data[3],
        color: STATUS_COLORS.rejected,
      },
      {
        label: "Cancelled",
        value: reportData.statusDistribution.data[4],
        color: STATUS_COLORS.cancelled,
      },
    ].filter(item => item.value > 0);
  };

  const getCategoryBreakdownData = () => {
    return reportData.categoryDistribution.map((item, index) => ({
      label: item.name,
      value: item.amount,
      prefix: "₹",
      color: item.color,
    }));
  };

  const getPerformanceMetricsData = () => {
    const avgExpense = reportData.summary.averageExpense;
    const maxExpense = reportData.topExpenses[0]?.amount || 0;
    const minExpense = reportData.topExpenses[reportData.topExpenses.length - 1]?.amount || 0;
    const pendingPercentage = reportData.summary.expenseCount > 0 
      ? (reportData.summary.pendingAmount / reportData.summary.totalAmount) * 100 
      : 0;

    return [
      { 
        label: "Average Expense", 
        value: Math.round(avgExpense), 
        color: COLORS.chartBlue, 
        prefix: "₹" 
      },
      { 
        label: "Pending %", 
        value: pendingPercentage.toFixed(1), 
        color: COLORS.chartOrange, 
        prefix: "" 
      },
      { 
        label: "Max Expense", 
        value: maxExpense, 
        color: COLORS.primary, 
        prefix: "₹" 
      },
      { 
        label: "Min Expense", 
        value: minExpense, 
        color: COLORS.chartPurple, 
        prefix: "₹" 
      },
    ].filter(item => (item?.value || 0) > 0);
  };

  /* ---------------- FILTER MODAL ---------------- */
  const FilterModal = () => {
    const [localFilters, setLocalFilters] = useState(filters);

    const handleApplyFilters = () => {
      setFilters(localFilters);
      setShowFilterModal(false);
    };

    const handleResetFilters = () => {
      setLocalFilters({
        filterType: FILTER_TYPES.MONTH,
      });
    };

    return (
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Expense Reports</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={22} color={COLORS.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* TIME PERIOD FILTER */}
              <View style={styles.plainFilterList}>
                {Object.entries(FILTER_LABELS).map(([key, label]) => {
                  const selected = localFilters.filterType === key;

                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.plainFilterItem}
                      onPress={() =>
                        setLocalFilters(prev => ({ ...prev, filterType: key }))
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.plainFilterText,
                          selected && styles.plainFilterTextSelected,
                        ]}
                      >
                        {label.trim()}
                      </Text>

                      {selected && <View style={styles.plainDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* APPLY BUTTON */}
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>

              {/* RESET BUTTON */}
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetFilters}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  /* ---------------- HANDLE EXPORT ---------------- */
  const handleExportReport = async () => {
    try {
      const dateRange = getDateRange();
      
      // Create a simple CSV report
      let csvContent = "Expense Report\n";
      csvContent += `Time Period: ${FILTER_LABELS[filters.filterType]}\n`;
      csvContent += `Date Range: ${dateRange.start} to ${dateRange.end}\n\n`;
      csvContent += "Summary:\n";
      csvContent += `Total Amount: ${formatCurrency(reportData.summary.totalAmount)}\n`;
      csvContent += `Pending Amount: ${formatCurrency(reportData.summary.pendingAmount)}\n`;
      csvContent += `Approved Amount: ${formatCurrency(reportData.summary.approvedAmount)}\n`;
      csvContent += `Paid Amount: ${formatCurrency(reportData.summary.paidAmount)}\n`;
      csvContent += `Total Expenses: ${reportData.summary.expenseCount}\n\n`;
      
      // Show success message
      dispatch(showSuccess('Report generated successfully'));
      
      // In a real app, you would save this to a file or send it to an API
      console.log("Report Content:\n", csvContent);
      
    } catch (error) {
      console.error('Failed to export report:', error);
      dispatch(showError('Failed to export report'));
    }
  };

  /* ---------------- LOADER AND ERROR STATES ---------------- */
  if (authError) {
    return (
      <View style={styles.loader}>
        <AlertCircle size={48} color={COLORS.error} />
        <Text style={styles.loaderText}>Please login to continue</Text>
        <Text style={styles.subText}>Redirecting to login...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading expense analytics...</Text>
      </View>
    );
  }

  const safeArea = getSafeAreaInsets();
  const footerPadding = safeArea.bottom + SPACING.lg;
  const metrics = getMetricsData();
  const statusBreakdownData = getStatusBreakdownData();
  const categoryBreakdownData = getCategoryBreakdownData();
  const performanceMetricsData = getPerformanceMetricsData();

  /* ======================= MAIN UI ======================= */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />


      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerPadding }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* FILTER SELECTION */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterButton,
                filters.filterType === key && styles.filterButtonActive,
                {
                  minHeight: moderateScale(34),
                  paddingHorizontal: moderateScale(16),
                  paddingVertical: moderateScale(6),
                }
              ]}
              onPress={() => setFilters(prev => ({ ...prev, filterType: key }))}
            >
              <Text style={[
                styles.filterButtonText,
                filters.filterType === key && styles.filterButtonTextActive,
                {
                  fontSize: moderateScale(12),
                }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* METRICS GRID */}
        <View style={styles.metricsGrid}>
          {metrics?.map((metric, index) => (
            <View key={index} style={{
              width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2
            }}>
              <TouchableOpacity
                onPress={metric.onPress}
                activeOpacity={0.85}
              >
                <MetricCard
                  title={metric.title}
                  value={metric.value}
                  icon={metric.icon}
                  color={metric.color}
                  bgColor={metric.bgColor}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* EXPENSE STATUS OVERVIEW */}
        <View style={styles.revenueOverviewHeader}>
          <View>
            <Text style={styles.sectionTitle}>Expense Status</Text>
            <Text style={styles.filterSubtitle}>
              {FILTER_LABELS[filters.filterType]}
            </Text>
          </View>
        </View>

        {/* STATUS BREAKDOWN PIE CHART */}
        {statusBreakdownData.length > 0 ? (
          <View style={styles.statusPieChartContainer}>
            <StatusPieChart
              data={statusBreakdownData}
              size={isTablet ? 280 : moderateScale(220)}
            />
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No expense status data available</Text>
            <Text style={styles.noDataSubText}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        )}

        {/* CATEGORY DISTRIBUTION */}
        {categoryBreakdownData.length > 0 && (
          <SimpleBarChart
            data={categoryBreakdownData}
            title="Category Distribution"
          />
        )}

        {/* PERFORMANCE METRICS */}
        {/* {performanceMetricsData.length > 0 && (
          <SimpleBarChart
            data={performanceMetricsData}
            title="Performance Metrics"
          />
        )} */}

        {/* TOP EXPENSES */}
        <View style={styles.transactionCard}>
          <View style={styles.transactionHeader}>
            <View style={styles.transactionTitleRow}>
              <TrendingUp size={20} color={COLORS.primary} />
              <Text style={styles.transactionTitle}>Top 5 Expenses</Text>
            </View>
            <Text style={styles.transactionSubtitle}>
              Highest amount expenses
            </Text>
          </View>

          {reportData.topExpenses.length > 0 ? (
            <View style={styles.transactionList}>
              {reportData.topExpenses.map((expense, index) => (
                <TouchableOpacity
                  key={expense.id}
                  style={styles.transactionItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.transactionItemLeft}>
                    <View style={[
                      styles.transactionStatusBadge,
                      { 
                        backgroundColor: expense?.status === 'paid' 
                          ? COLORS.successBg 
                          : expense?.status === 'approved'
                          ? COLORS.infoBg
                          : COLORS.warningBg
                      }
                    ]}>
                      <Text style={[
                        styles.transactionStatusText,
                        { 
                          color: expense?.status === 'paid' 
                            ? COLORS.success 
                            : expense?.status === 'approved'
                            ? COLORS.info
                            : COLORS.warning
                        }
                      ]}>
                        {expense?.status?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionPatient} numberOfLines={1}>
                        {expense.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(expense.date)} • {expense.categoryName}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionItemRight}>
                    <Text style={styles.transactionAmount}>
                      {formatCurrency(expense.amount)}
                    </Text>
                    <Text style={styles.transactionFee}>
                      {expense.expenseNumber}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No expenses found</Text>
              <Text style={styles.noDataSubText}>
                Expenses will appear here once created
              </Text>
            </View>
          )}
        </View>

        {/* MONTHLY TREND CHART */}
        {/* <View style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <BarChartIcon size={20} color={COLORS.primary} />
            <Text style={styles.chartCardTitle}>Monthly Trend</Text>
          </View>
          
          {reportData.monthlyTrend.data.length > 0 ? (
            <BarChart
              data={{
                labels: reportData.monthlyTrend.labels,
                datasets: [{
                  data: reportData.monthlyTrend.data
                }]
              }}
              width={SCREEN_WIDTH - SPACING.lg * 2}
              height={220}
              chartConfig={{
                backgroundGradientFrom: COLORS.card,
                backgroundGradientTo: COLORS.card,
                color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
                strokeWidth: 2,
                barPercentage: 0.6,
                useShadowColorFromDataset: false,
                decimalPlaces: 0,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: getResponsiveFontSize(FONT_SIZE.xs),
                  fontFamily: 'System',
                },
                propsForVerticalLabels: {
                  fontSize: getResponsiveFontSize(FONT_SIZE.xs),
                },
                propsForHorizontalLabels: {
                  fontSize: getResponsiveFontSize(FONT_SIZE.xs),
                },
              }}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
              withInnerLines={false}
              yAxisLabel="₹"
              yAxisSuffix=""
              segments={5}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No trend data available</Text>
            </View>
          )}
        </View> */}

        {/* FOOTER NOTE */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Data updated in real-time • Last refreshed: {formatDateTime(new Date().toISOString())}
          </Text>
          <Text style={styles.footerSubText}>
            Using filter: {FILTER_LABELS[filters.filterType]}
          </Text>
        </View>
      </ScrollView>

      {/* MODALS */}
      <FilterModal />
    </View>
  );
};

export default ExpenseReportsScreen;

/* ======================= STYLES ======================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  metricCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: "#ffffff",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: isSmallDevice ? 70 : 80,
  },
  metricContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  metricTextContainer: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  metricTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.75,
    marginBottom: 4,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
    padding: SPACING.lg,
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
  subText: {
    marginTop: SPACING.xs,
    fontSize: 14,
    color: COLORS.subText,
    textAlign: "center",
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 100,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
    maxWidth: 200,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: SPACING.xs,
    maxWidth: 150,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  userInfo: {
    alignItems: "flex-end",
    marginBottom: SPACING.sm,
    maxWidth: "100%",
  },
  notifications: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    justifyContent: "flex-end",
    maxWidth: "100%",
  },
  notifLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  notifLinkText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  filtersContainer: {
    marginBottom: SPACING.md,
  },
  filtersContent: {
    gap: SPACING.xs,
    paddingRight: SPACING.lg,
  },
  filterButton: {
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonOne: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontWeight: "600",
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  revenueOverviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  filterSubtitle: {
    fontSize: 12,
    color: COLORS.subText,
    marginTop: SPACING.xs,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
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
  chartCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  chartCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginLeft: SPACING.xs,
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  metricRow: {
    marginBottom: SPACING.md,
  },
  metricRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  metricBarTrack: {
    height: 10,
    backgroundColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.sm,
    overflow: "hidden",
  },
  metricBarFill: {
    height: "100%",
    borderRadius: BORDER_RADIUS.sm,
  },
  pieChartContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
  },
  statusPieChartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: "center",
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
statusLegendContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  width: "100%",
  marginTop: SPACING.md,
},
statusLegendRow: {
  flexDirection: "row",
  alignItems: "center",
  width: "48%",     // 👈 two items per row
  marginBottom: 16,
},
  statusLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  statusLegendTextContainer: {
    flex: 1,
  },
  statusLegendLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  statusLegendValue: {
    fontSize: 12,
    color: COLORS.subText,
  },
  transactionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
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
  transactionHeader: {
    marginBottom: SPACING.md,
  },
  transactionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  transactionSubtitle: {
    fontSize: 12,
    color: COLORS.subText,
  },
  transactionList: {
    gap: SPACING.sm,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  transactionItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.sm,
  },
  transactionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.xs,
    marginRight: SPACING.sm,
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionPatient: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.subText,
  },
  transactionItemRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  transactionFee: {
    fontSize: 12,
    color: COLORS.subText,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.bg,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.sm,
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.subText,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  noDataSubText: {
    fontSize: 14,
    color: COLORS.placeholder,
    textAlign: "center",
    maxWidth: 300,
  },
  footerNote: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.subText,
    textAlign: "center",
  },
  footerSubText: {
    fontSize: 12,
    color: COLORS.placeholder,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  filterScroll: {
    padding: SPACING.lg,
  },
  plainFilterList: {
    marginTop: SPACING.md,
  },
  plainFilterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  plainFilterText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "400",
  },
  plainFilterTextSelected: {
    fontWeight: "700",
  },
  plainDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.text,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  applyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  resetButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
});