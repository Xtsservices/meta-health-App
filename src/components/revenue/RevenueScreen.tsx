// screens/RevenueScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Rect, Line, Text as SvgText, Path } from "react-native-svg";

import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  getResponsiveFontSize,
  moderateScale,
  moderateVerticalScale,
  wp,
  hp,
  isTablet,
  isSmallDevice,
  getDeviceSpecificValue,
  getSafeAreaInsets,
  ICON_SIZE,
} from "../../utils/responsive";
import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { showError, showSuccess } from "../../store/toast.slice";
import { formatDateTime, formatDate } from "../../utils/dateTime";

// Icons
import {
  Wallet,
  Users,
  Percent,
  Target,
  Filter,
  XCircle,
  CheckCircle,
  CreditCard,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Activity,
  Banknote,
  Building,
  AlertCircle,
  X,
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  PieChart,
  TrendingDown,
  Circle as CircleIcon,
} from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import RevenueBarChartWithFilters from "./RevenueBarChartWithFilters";

/* ---------------- SIMPLIFIED FILTER TYPES ---------------- */
const FILTER_TYPES = {
  TODAY: "today",
  THIS_WEEK: "this_week",
  THIS_MONTH: "this_month",
  THIS_YEAR: "this_year",
};

const FILTER_LABELS = {
  [FILTER_TYPES.TODAY]: "Today",
  [FILTER_TYPES.THIS_WEEK]: " Week",
  [FILTER_TYPES.THIS_MONTH]: " Month",
  [FILTER_TYPES.THIS_YEAR]: " Year",
};

/* ---------------- REVENUE STATUS ---------------- */
const REVENUE_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
};

const REVENUE_STATUS_LABELS = {
  [REVENUE_STATUS.PENDING]: "Pending",
  [REVENUE_STATUS.PAID]: "Paid",
  [REVENUE_STATUS.CANCELLED]: "Cancelled",
};

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

const STATUS_COLORS = {
  pending: "#f59e0b",
  paid: "#10b981",
  cancelled: "#ef4444",
};

/* ---------------- TYPES ---------------- */
interface QuickStats {
  today?: any;
  thisWeek?: any;
  thisMonth?: any;
  thisYear?: any;
}

interface RevenueSummary {
  totalAppointments?: number;
  totalConsultationFees?: number;
  totalDoctorRevenue?: number;
  totalHospitalRevenue?: number;
  avgCommissionPercentage?: number;
  avgConsultationFee?: number;
  maxConsultationFee?: number;
  minConsultationFee?: number;
  statusBreakdown?: {
    paid?: { count?: number; revenue?: number };
    pending?: { count?: number; revenue?: number };
    cancelled?: { count?: number };
  };
  filterType?: string;
  dateRange?: any;
}

interface Transaction {
  id?: number;
  patientID?: number;
  patientTimelineID?: number;
  consultationFee?: number;
  commissionPercentage?: string;
  doctorRevenue?: string;
  hospitalRevenue?: string;
  status?: string;
  source?: string;
  revenueType?: string;
  date?: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  departmentName?: string;
  doctorFirstName?: string;
  doctorLastName?: string;
}

interface RevenueHistory {
  transactions?: Transaction[];
  pagination?: {
    currentPage?: number;
    totalPages?: number;
    totalRecords?: number;
    limit?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  filters?: {
    filterType?: string;
    status?: string;
    dateRange?: any;
  };
}

interface ChartDataItem {
  period?: number;
  periodLabel?: string;
  totalAppointments?: number;
  totalConsultationFees?: number;
  totalDoctorRevenue?: number;
  totalHospitalRevenue?: number;
  avgCommission?: number;
}

interface ChartData {
  chartData: ChartDataItem[];
  metadata?: {
    groupBy?: string;
    year?: number;
    month?: number;
  };
}

/* ---------------- FILTER INTERFACE ---------------- */
interface FilterState {
  filterType: string;
  status?: string;
}

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
const darkenColor = (hex: string, amount: number = 0.35): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - 255 * amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - 255 * amount);
  const b = Math.max(0, (num & 0x0000ff) - 255 * amount);

  return `rgb(${r},${g},${b})`;
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
                fill={darkenColor(data[0]?.color || COLORS.primary, 0.35)}

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
      )}
    </View>
  );
};

/* ---------------- BAR CHART COMPONENT ---------------- */
const RevenueBarChart = ({
  data,
  title,
  height = 200
}: {
  data: ChartDataItem[];
  title: string;
  height?: number;
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.chartCard, { height }]}>
        <View style={styles.chartCardHeader}>
          <BarChart3 size={20} color={COLORS.primary} />
          <Text style={styles.chartCardTitle}>{title}</Text>
        </View>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No chart data available</Text>
        </View>
      </View>
    );
  }

  // Find max value for scaling
  const maxAppointments = Math.max(
    ...data.map(d => d.totalAppointments || 0),
    1
  );

  const maxFees = Math.max(
    ...data.map(d => d.totalConsultationFees || 0),
    1
  );

const TOP_LABEL_SPACE = 24;
const BOTTOM_LABEL_SPACE = 30;

const chartHeight = height - TOP_LABEL_SPACE - BOTTOM_LABEL_SPACE;

  return (
    <View style={[styles.chartCard, { height }]}>
      <View style={styles.chartCardHeader}>
        <BarChart3 size={20} color={COLORS.primary} />
        <Text style={styles.chartCardTitle}>{title}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barChartScrollContainer}
      >
        <View
          style={{
            height: chartHeight,
            paddingHorizontal: SPACING.md,
            flexDirection: "row",
          }}
        >
          {/* Bars Container */}
          <View style={styles.barChartContainer}>
{data.map((item, index) => {
  const appointmentHeight =
    ((item.totalAppointments || 0) / maxAppointments) * (chartHeight - 40);

  const feeHeight =
    ((item.totalConsultationFees || 0) / maxFees) * (chartHeight - 40);

  return (
    <View
      key={index}
      style={styles.barGroupWrapper}
    >
<View style={styles.barGroupWrapper}>
  {/* VALUES */}
  <View style={styles.barValueRow}>
    <Text style={styles.barValueTop}>
      {item.totalAppointments || 0}
    </Text>
    <Text style={styles.barValueTop}>
      ₹{item.totalConsultationFees || 0}
    </Text>
  </View>

  {/* BARS */}
  <View style={styles.barPair}>
    {/* Appointments – Gradient */}
    <LinearGradient
      colors={["#14b8a6", "#3b82f6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[
        styles.bar,
        { height: appointmentHeight },
      ]}
    />

    {/* Fees – Solid */}
    <View
      style={[
        styles.bar,
        { height: feeHeight, backgroundColor: "#14b8a6" },
      ]}
    />
  </View>

  <Text style={styles.periodLabelBottom}>{item.periodLabel}</Text>
</View>
    </View>
  );
})}
          </View>

          {/* X-axis */}
          <View style={styles.xAxis} />
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.barChartLegend}>
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
  );
};

/* ---------------- SIMPLE BAR CHART COMPONENT ---------------- */
const SimpleBarChart = ({ data, title }: { data: any[]; title: string }) => {
  const maxValue = Math.max(...data?.map(d => d?.value || 0), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <BarChart3 size={20} color={COLORS.primary} />
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

/* ======================= MAIN SCREEN ======================= */
const RevenueScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats>({});
  const [summary, setSummary] = useState<RevenueSummary>({});
  const [history, setHistory] = useState<RevenueHistory>({});
  const [chartData, setChartData] = useState<ChartData>({ chartData: [] });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    filterType: FILTER_TYPES.THIS_MONTH,
  });

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const getChartGroupBy = (filterType: string) => {
    switch (filterType) {
      case FILTER_TYPES.TODAY:
        return "day";
      case FILTER_TYPES.THIS_WEEK:
        return "week";
      case FILTER_TYPES.THIS_MONTH:
        return "week";
      case FILTER_TYPES.THIS_YEAR:
        return "month";
      default:
        return "week";
    }
  };

  const getChartYear = () => {
    return new Date().getFullYear();
  };

  const getChartMonth = () => {
    return new Date().getMonth() + 1;
  };

  /* ---------------- LOAD DATA FUNCTIONS ---------------- */
  const loadQuickStats = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) return;

      const response = await AuthFetch(
        `revenue/doctor/${user?.id}/quick-stats?hospitalID=${user?.hospitalID}`,
        token
      ) as any;

      if (response?.data?.success || response?.status === 'success') {
        setQuickStats(response?.data?.data || response?.data || {});
      } else {
        setQuickStats({});
      }
    } catch (error) {
      setQuickStats({});
    }
  };

  const loadSummary = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) return;

      let url = `revenue/doctor/${user?.id}/summary?hospitalID=${user?.hospitalID}&filterType=${filters.filterType}`;

      if (filters.status) url += `&status=${filters.status}`;

      const response = await AuthFetch(url, token) as any;
      console.log("6^^^6",response)
      if (response?.data?.success || response?.status === 'success') {
        const data = response?.data?.data || response?.data || {};
        setSummary(data);
      } else {
        setSummary({});
      }
    } catch (error) {
      setSummary({});
    }
  };

  const loadHistory = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) return;

      let url = `revenue/doctor/${user?.id}/history?hospitalID=${user?.hospitalID}&filterType=${filters.filterType}&page=1&limit=5`;

      if (filters.status) url += `&status=${filters.status}`;

      const response = await AuthFetch(url, token) as any;
console.log("555",response)
      if (response?.data?.success || response?.status === 'success') {
        const data = response?.data?.data || response?.data || {};
        setHistory(data);
      } else {
        setHistory({});
      }
    } catch (error) {
      setHistory({});
    }
  };

  const loadChartData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) return;

      const groupBy = getChartGroupBy(filters.filterType);
      const year = getChartYear();
      const month = getChartMonth();

      let url = `revenue/doctor/${user?.id}/chart?hospitalID=${user?.hospitalID}&groupBy=${groupBy}`;

      if (filters.filterType === FILTER_TYPES.THIS_MONTH) {
        url += `&year=${year}&month=${month}`;
      } else if (filters.filterType === FILTER_TYPES.THIS_YEAR) {
        url += `&year=${year}`;
      }

      const response = await AuthFetch(url, token) as any;
      
      if (response?.data?.success || response?.status === 'success') {
        const data = response?.data?.data || response?.data || { chartData: [] };
        setChartData(data);
      } else {
        setChartData({ chartData: [] });
      }
    } catch (error) {
      setChartData({ chartData: [] });
    }
  };

  const loadRevenueData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setAuthError(true);
        dispatch(showError("Please login to access revenue dashboard"));
        setTimeout(() => {
          navigation.navigate("Login" as never);
        }, 1500);
        return;
      }

      await Promise.all([
        loadQuickStats(),
        loadSummary(),
        loadHistory(),
        loadChartData(),
      ]);
    } catch (error) {
      dispatch(showError("Failed to load revenue data"));
    }
  };

  /* ---------------- EFFECTS ---------------- */
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRevenueData().finally(() => setLoading(false));
    }, [filters])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRevenueData();
    setRefreshing(false);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getMetricsData = () => {
    const stats = quickStats?.[filters.filterType] || {};
    const titlePrefix = FILTER_LABELS[filters.filterType];

    return [
      {
        title: `${titlePrefix} Appointments`,
        value: stats?.totalAppointments || 0,
        icon: <Users size={ICON_SIZE.md} color="#2563EB" />,
        color: "#2563EB",
        bgColor: "#eff6ff",
        onPress: () => navigation.navigate("AppointmentsList" as never, {
          filter: filters.filterType
        } as never),
      },
      {
        title: `${titlePrefix} Billings`,
        value: formatCurrency(stats?.totalConsultationFees || 0),
        icon: <Banknote size={ICON_SIZE.md} color="#10B981" />,
        color: "#10B981",
        bgColor: "#ecfdf5",
        onPress: () => handleViewAllTransactions(),
      },
      {
        title: `${titlePrefix} Doctor Revenue`,
        value: formatCurrency(stats?.totalDoctorRevenue || 0),
        icon: <Wallet size={ICON_SIZE.md} color="#7C3AED" />,
        color: "#7C3AED",
        bgColor: "#f5f3ff",
      },
      {
        title: `${titlePrefix} Hospital Revenue`,
        value: formatCurrency(stats?.totalHospitalRevenue || 0),
        icon: <Building size={ICON_SIZE.md} color="#F59E0B" />,
        color: "#F59E0B",
        bgColor: "#fffbeb",
      },
    ];
  };

  const getSummaryBarData = () => {
    return [
      {
        label: "Appointments",
        value: summary?.totalAppointments || 0,
        color: COLORS.chartGreen,
      },
      {
        label: "Total Fees",
        value: summary?.totalConsultationFees || 0,
        prefix: "₹",
        color: COLORS.chartBlue,
      },
      {
        label: "Doctor Revenue",
        value: summary?.totalDoctorRevenue || 0,
        prefix: "₹",
        color: COLORS.chartTeal,
      },
      {
        label: "Hospital Revenue",
        value: summary?.totalHospitalRevenue || 0,
        prefix: "₹",
        color: COLORS.chartPurple,
      },
    ].filter(item => (item?.value || 0) > 0);
  };

  const getStatusBreakdownData = () => {
    const pendingCount = summary?.statusBreakdown?.pending?.count || 0;
    const paidCount = summary?.statusBreakdown?.paid?.count || 0;
    const cancelledCount = summary?.statusBreakdown?.cancelled?.count || 0;

    return [
      {
        label: "Pending",
        value: pendingCount,
        color: STATUS_COLORS.pending,
      },
      {
        label: "Paid",
        value: paidCount,
        color: STATUS_COLORS.paid,
      },
      {
        label: "Cancelled",
        value: cancelledCount,
        color: STATUS_COLORS.cancelled,
      },
    ].filter(item => item.value > 0);
  };

  const getPerformanceMetricsData = () => {
    const avgConsultationFee = summary?.avgConsultationFee || 0;
    const commissionPercentage = summary?.avgCommissionPercentage || 0;
    const maxConsultationFee = summary?.maxConsultationFee || 0
    const minConsultationFee = summary?.minConsultationFee || 0
    return [
      { label: "Avg Consultation Fee", value: Math.round(avgConsultationFee), color: COLORS.chartBlue, prefix: "₹" },
      { label: "Avg Commission %", value: commissionPercentage, color: COLORS.chartPurple, prefix: "" },
      { label: "Max Consultation Fee", value: maxConsultationFee, color: COLORS.primary, prefix: "" },
      { label: "Min Consultation Fee %", value: minConsultationFee, color: COLORS.chartPurple, prefix: "" },
    ]?.filter(item => (item?.value || 0) > 0);
  };

  const getAppointmentBreakdownData = () => {
    const pendingCount = summary?.statusBreakdown?.pending?.count || 0;
    const paidCount = summary?.statusBreakdown?.paid?.count || 0;
    const cancelledCount = summary?.statusBreakdown?.cancelled?.count || 0;

    return [
      { label: "Scheduled Appointments", value: pendingCount },
      { label: "Paid Appointments", value: paidCount },
      { label: "Cancelled Appointments", value: cancelledCount },
    ]?.filter(item => (item?.value || 0) > 0);
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
        filterType: FILTER_TYPES.THIS_MONTH,
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
              <Text style={styles.modalTitle}>Filter Revenue Data</Text>
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

  /* ---------------- HANDLE NAVIGATION ---------------- */
  const handleViewAllTransactions = () => {
    navigation.navigate("AllTransactions" as never, {
      filters
    } as never);
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
        <Text style={styles.loaderText}>Loading revenue dashboard...</Text>
      </View>
    );
  }

  const metrics = getMetricsData();
  const performanceMetricsData = getPerformanceMetricsData();
  const appointmentBreakdownData = getAppointmentBreakdownData();
  const safeArea = getSafeAreaInsets();
  const footerPadding = safeArea.bottom + SPACING.lg;
  const statusBreakdownData = getStatusBreakdownData();

  /* ======================= MAIN UI ======================= */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: safeArea.top + SPACING.sm }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Activity size={getResponsiveFontSize(24)} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.greeting} numberOfLines={1}>
                Dr. {user?.firstName} {user?.lastName}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <View style={styles.notifications}>
              <TouchableOpacity
                style={styles.notifLink}
                onPress={handleViewAllTransactions}
              >
                <Text style={styles.notifLinkText}>View all transactions</Text>
                <ArrowUpRight size={getResponsiveFontSize(12)} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

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
{/* FILTER SELECTION - Made Responsive */}
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

        {/* REVENUE OVERVIEW */}
        <View style={styles.revenueOverviewHeader}>
          <View>
            <Text style={styles.sectionTitle}>Appointment Status</Text>
            <Text style={styles.filterSubtitle}>
              {FILTER_LABELS[filters.filterType]}
              {filters.status && ` • ${REVENUE_STATUS_LABELS[filters.status]}`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.filterButtonOne, {
              minHeight: moderateScale(34),
              paddingHorizontal: moderateScale(16),
              paddingVertical: moderateScale(6),
            }]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.85}
          >
            <Filter size={getResponsiveFontSize(14)} color="#ffffff" />
            <Text style={[styles.filterButtonText, {
              fontSize: moderateScale(12),
            }]} numberOfLines={1}>
              Filter
            </Text>
            <ChevronDown size={getResponsiveFontSize(12)} color="#ffffff" />
          </TouchableOpacity>
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
            <Text style={styles.noDataText}>No appointment status data available</Text>
            <Text style={styles.noDataSubText}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        )}


{/* REVENUE TREND BAR CHART WITH SEPARATE FILTERS */}
<View style={styles.revenueOverviewHeader}>
  <View>
    <Text style={styles.sectionTitle}>Revenue Trend Analysis</Text>
    <Text style={styles.filterSubtitle}>
      Detailed breakdown with separate filters
    </Text>
  </View>
</View>

{/* Use the new component */}
<RevenueBarChartWithFilters />


        {/* Performance Metrics */}
        {performanceMetricsData.length > 0 && (
          <SimpleBarChart
            data={performanceMetricsData}
            title="Performance Metrics"
          />
        )}

        {/* RECENT TRANSACTIONS */}
        <View style={styles.transactionCard}>
          <View style={styles.transactionHeader}>
            <View style={styles.transactionTitleRow}>
              <CreditCard size={20} color={COLORS.primary} />
              <Text style={styles.transactionTitle}>Recent Transactions</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAllTransactions}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ArrowUpRight size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {history?.transactions && history?.transactions?.length > 0 ? (
            <View style={styles.transactionList}>
              {history?.transactions?.slice(0, 5)?.map((transaction, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.transactionItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.transactionItemLeft}>
                    <View style={[
                      styles.transactionStatusBadge,
                      { backgroundColor: transaction?.status === 'paid' ? COLORS.successBg : COLORS.warningBg }
                    ]}>
                      <Text style={[
                        styles.transactionStatusText,
                        { color: transaction?.status === 'paid' ? COLORS.success : COLORS.warning }
                      ]}>
                        {transaction?.revenueType == "appointment"?"Apt":""}
                      </Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionPatient} numberOfLines={1}>
                        {transaction?.patientName || `Patient ${transaction?.patientID}`}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(transaction?.date)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionItemRight}>
                    <Text style={styles.transactionAmount}>
                      {formatCurrency(transaction?.consultationFee || 0)}
                    </Text>
                    <Text style={styles.transactionFee}>
                      Fee: {transaction?.commissionPercentage || 0}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No transactions found</Text>
              <Text style={styles.noDataSubText}>
                Transactions will appear here once appointments are created
              </Text>
            </View>
          )}
        </View>

        {/* APPOINTMENT BREAKDOWN */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <Users size={20} color={COLORS.primary} />
            <Text style={styles.breakdownTitle}>Appointment Breakdown</Text>
          </View>

          {appointmentBreakdownData?.length > 0 ? (
            <View style={styles.breakdownList}>
              {appointmentBreakdownData?.map((item, index) => (
                <View key={index} style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>{item?.label}</Text>
                  <Text style={styles.breakdownValue}>{item?.value}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No appointment data</Text>
            </View>
          )}
        </View>

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

export default RevenueScreen;

/* ======================= STYLES ======================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
barChartContainer: {
  flexDirection: "row",
  alignItems: "flex-end",
  height: 200,
  paddingBottom: moderateScale(30),
  gap: moderateScale(10), // Gap between week groups
},
barGroupTight: {
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 0, // NO GAP - green and black touch each other
  marginBottom: moderateScale(8),
},
barWrapperTight: {
  alignItems: "flex-end",
},
barValueTop: {
  fontSize: 12,
  fontWeight: "600",
  color: COLORS.text,
  marginBottom: 4,
  textAlign: "center",
},
thickLine: {
  width: 12, // Thinner lines (was 18)
  borderRadius: 0, // Straight lines
  minHeight: 20,
    marginHorizontal: 0, // 🔥 CRITICAL

},
periodLabelBottom: {
  fontSize: 12,
  color: COLORS.text,
  fontWeight: "600",
  marginTop: 18,
  textAlign: "center",
},
barChartScrollContainer: {
  paddingRight: SPACING.xl,
  paddingLeft: SPACING.sm,
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
  barGradient: {
  width: 30,
  borderTopLeftRadius: 4,
  borderTopRightRadius: 4,
  // Gradient effect simulation with multiple backgrounds
  backgroundColor: '#7cb342', // Light green top
  borderBottomWidth: 0,
  shadowColor: '#4a90e2',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
barGradientDark: {
  width: 30,
  borderTopLeftRadius: 4,
  borderTopRightRadius: 4,
  backgroundColor: '#424242', // Dark gray
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

  // Filter styles (matching reference code)
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
  borderRadius: BORDER_RADIUS.round,
  backgroundColor: COLORS.card,
  borderWidth: 1,
  borderColor: COLORS.border,
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
  barGroupWrapper: {
  alignItems: "center",
},

barValueRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: 28, // 14 + 14
  marginBottom: 6,
},

barPair: {
  flexDirection: "row",
  alignItems: "flex-end",
},

bar: {
  width: 14,
  minHeight: 20,
},

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
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
    width: 120,
    marginLeft: SPACING.md,
  },
  statusLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
barTight: {
  width: 24, // Narrower bars (was 30)
  borderTopLeftRadius: 3,
  borderTopRightRadius: 3,
  minHeight: 20, // Minimum visible height
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
  
  barGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginRight: 40,
    gap: 12,
  },
  barWrapper: {
    alignItems: "center",
    marginBottom: 8,
  },
  barValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  periodLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    maxWidth: 80,
  },
  xAxis: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 8,
  },
  barChartLegend: {
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  transactionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
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
  breakdownCard: {
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
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  breakdownList: {
    gap: SPACING.sm,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
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
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  filterText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
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
  // Filter Selection Styles
  filterSelection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.borderLight,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 14,
    color: COLORS.subText,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  
});