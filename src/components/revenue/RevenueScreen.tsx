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
} from "lucide-react-native";

/* ---------------- FILTER TYPES ---------------- */
const FILTER_TYPES = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  THIS_WEEK: "this_week",
  LAST_WEEK: "last_week",
  THIS_MONTH: "this_month",
  LAST_MONTH: "last_month",
  THIS_YEAR: "this_year",
  LAST_YEAR: "last_year",
  CUSTOM: "custom",
  ALL: "all",
};

const FILTER_LABELS = {
  [FILTER_TYPES.TODAY]: "Today",
  [FILTER_TYPES.YESTERDAY]: "Yesterday",
  [FILTER_TYPES.THIS_WEEK]: "This Week",
  [FILTER_TYPES.LAST_WEEK]: "Last Week",
  [FILTER_TYPES.THIS_MONTH]: "This Month",
  [FILTER_TYPES.LAST_MONTH]: "Last Month",
  [FILTER_TYPES.THIS_YEAR]: "This Year",
  [FILTER_TYPES.LAST_YEAR]: "Last Year",
  [FILTER_TYPES.CUSTOM]: "Custom Date",
  [FILTER_TYPES.ALL]: "All Time",
};

const darkenColor = (hex: string, amount: number = 0.2): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - 255 * amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - 255 * amount);
  const b = Math.max(0, (num & 0x0000ff) - 255 * amount);

  return `rgb(${r},${g},${b})`;
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

const REVENUE_COLORS = {
  totalFees: "#f59e0b",
  doctorRevenue: "#14b8a6",
  hospitalRevenue: "#8b5cf6",
  appointments: "#22c55e",
};

/* ---------------- TYPES ---------------- */
interface QuickStats {
  today?: any;
  thisWeek?: any;
  thisMonth?: any;
  thisYear?: any;
  lastMonth?: any;
  lastWeek?: any;
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
    month?: number;
    year?: number;
  };
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

/* ---------------- HORIZONTAL BAR CHART COMPONENT ---------------- */
const HorizontalBarChart = ({ data, title }: { data: any[]; title: string }) => {
  const maxValue = Math.max(...data?.map(d => d?.value || 0), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <Target size={20} color={COLORS.primary} />
        <Text style={styles.chartCardTitle} numberOfLines={1}>{title}</Text>
      </View>

      {data?.length > 0 ? (
        <View style={styles.horizontalBarContainer}>
          {data?.map((item, index) => (
            <View key={index} style={styles.horizontalBarRow}>
              <Text style={styles.horizontalBarLabel} numberOfLines={1}>
                {item?.label}
              </Text>
              <View style={styles.horizontalBarWrapper}>
                <View style={styles.horizontalBarTrack}>
                  <View
                    style={[
                      styles.horizontalBarFill,
                      {
                        width: `${((item?.value || 0) / maxValue) * 100}%`,
                        backgroundColor: item?.color || COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.horizontalBarValue}>{item?.value}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      )}
    </View>
  );
};

/* ---------------- 3D PIE CHART COMPONENT ---------------- */
const Bent3DPie = ({ data, size = 220, depth = 18 }) => {
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

  return (
  <Svg width={size} height={size + depth} style={{ marginTop: moderateScale(10) }}>

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
                fill={darkenColor(d.color || COLORS.primary, 0.35)}
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
);
};

/* ---------------- REVENUE LEGEND COMPONENT ---------------- */
const RevenueLegendRight = ({ data }: { data: any[] }) => {
  return (
    <View style={{ marginLeft: moderateScale(20) }}>
      {data?.map((item, index) => (
        <View key={index} style={styles.legendRow}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: item?.color },
            ]}
          />
          <View style={{ marginLeft: moderateScale(10) }}>
            <Text style={styles.legendLabel}>
              {item?.label}
            </Text>
            <Text style={styles.legendValue}>
              {item?.label === "Appointments"
                ? item?.value
                : `₹${(item?.value || 0)?.toLocaleString("en-IN")}`}
            </Text>
          </View>
        </View>
      ))}
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
  const [filterType, setFilterType] = useState<string>(FILTER_TYPES.THIS_MONTH);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [authError, setAuthError] = useState(false);

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const getChartGroupBy = (filter: string) => {
    switch (filter) {
      case FILTER_TYPES.TODAY:
      case FILTER_TYPES.YESTERDAY:
        return "hour";
      case FILTER_TYPES.THIS_WEEK:
      case FILTER_TYPES.LAST_WEEK:
        return "day";
      case FILTER_TYPES.THIS_MONTH:
      case FILTER_TYPES.LAST_MONTH:
        return "week";
      case FILTER_TYPES.THIS_YEAR:
      case FILTER_TYPES.LAST_YEAR:
        return "month";
      default:
        return "month";
    }
  };

  const getChartYear = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case FILTER_TYPES.LAST_YEAR:
        return now.getFullYear() - 1;
      default:
        return now.getFullYear();
    }
  };

  const getChartMonth = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case FILTER_TYPES.LAST_MONTH:
        return now.getMonth(); // Previous month
      default:
        return now.getMonth() + 1; // Current month
    }
  };

  /* ---------------- LOAD DATA FUNCTIONS ---------------- */
  const loadQuickStats = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) return;

      const response = await AuthFetch(
        `revenue/doctor/${user?.id}/quick-stats?hospitalID=${user?.hospitalID}&filterType=${filterType}`,
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

      const response = await AuthFetch(
        `revenue/doctor/${user?.id}/summary?hospitalID=${user?.hospitalID}&filterType=${filterType}`,
        token
      ) as any;
      
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

      const response = await AuthFetch(
        `revenue/doctor/${user?.id}/history?hospitalID=${user?.hospitalID}&filterType=${filterType}&page=1&limit=5`,
        token
      ) as any;

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

      const groupBy = getChartGroupBy(filterType);
      const year = getChartYear(filterType);
      const month = getChartMonth(filterType);

      let url = `revenue/doctor/${user?.id}/chart?hospitalID=${user?.hospitalID}&groupBy=${groupBy}`;
      
      // Add year and month based on filter
      if (filterType === FILTER_TYPES.THIS_MONTH || filterType === FILTER_TYPES.LAST_MONTH) {
        url += `&year=${year}&month=${month}`;
      } else if (filterType === FILTER_TYPES.THIS_YEAR || filterType === FILTER_TYPES.LAST_YEAR) {
        url += `&year=${year}`;
      } else {
        // For week/day filters, use current date range
        url += `&filterType=${filterType}`;
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
    }, [filterType, statusFilter])
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

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const getMetricsData = () => {
    // Get stats based on current filter
    let stats = {};
    switch (filterType) {
      case FILTER_TYPES.TODAY:
        stats = quickStats?.today || {};
        break;
      case FILTER_TYPES.THIS_WEEK:
        stats = quickStats?.thisWeek || {};
        break;
      case FILTER_TYPES.THIS_MONTH:
        stats = quickStats?.thisMonth || {};
        break;
      case FILTER_TYPES.THIS_YEAR:
        stats = quickStats?.thisYear || {};
        break;
      case FILTER_TYPES.YESTERDAY:
        stats = quickStats?.yesterday || {};
        break;
      case FILTER_TYPES.LAST_WEEK:
        stats = quickStats?.lastWeek || {};
        break;
      case FILTER_TYPES.LAST_MONTH:
        stats = quickStats?.lastMonth || {};
        break;
      case FILTER_TYPES.LAST_YEAR:
        stats = quickStats?.lastYear || {};
        break;
      default:
        stats = summary || {};
    }

    return [
      {
        title: filterType === FILTER_TYPES.TODAY ? "Today's Appointments" : "Appointments",
        value: stats?.totalAppointments || summary?.totalAppointments || 0,
        icon: <Users size={ICON_SIZE.md} color="#2563EB" />,
        color: "#2563EB",
        bgColor: "#eff6ff",
        onPress: () => navigation.navigate("AppointmentsList" as never, { 
          filter: filterType 
        } as never),
      },
      {
        title: filterType === FILTER_TYPES.TODAY ? "Today's Billings" : "Total Billings",
        value: formatCurrency(stats?.totalConsultationFees || summary?.totalConsultationFees || 0),
        icon: <Banknote size={ICON_SIZE.md} color="#10B981" />,
        color: "#10B981",
        bgColor: "#ecfdf5",
        onPress: () => handleViewAllTransactions(),
      },
      {
        title: "Doctor Revenue",
        value: formatCurrency(stats?.totalDoctorRevenue || summary?.totalDoctorRevenue || 0),
        icon: <Wallet size={ICON_SIZE.md} color="#7C3AED" />,
        color: "#7C3AED",
        bgColor: "#f5f3ff",
        onPress: () => {
          // Add specific navigation if needed
        },
      },
      {
        title: "Hospital Revenue",
        value: formatCurrency(stats?.totalHospitalRevenue || summary?.totalHospitalRevenue || 0),
        icon: <Building size={ICON_SIZE.md} color="#F59E0B" />,
        color: "#F59E0B",
        bgColor: "#fffbeb",
        onPress: () => {
          // Add specific navigation if needed
        },
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
      {
        label: "Avg Fee",
        value: Math.round(summary?.avgConsultationFee || 0),
        prefix: "₹",
        color: COLORS.chartOrange,
      },
    ];
  };

  const getRevenueBreakdownData = () => {
    return [
      {
        label: "Total Fees",
        value: summary?.totalConsultationFees || 0,
        color: REVENUE_COLORS.totalFees,
      },
      {
        label: "Doctor ",
        value: summary?.totalDoctorRevenue || 0,
        color: REVENUE_COLORS.doctorRevenue,
      },
      {
        label: "Hospital",
        value: summary?.totalHospitalRevenue || 0,
        color: REVENUE_COLORS.hospitalRevenue,
      },
      {
        label: "Appointments",
        value: summary?.totalAppointments || 0,
        color: REVENUE_COLORS.appointments,
      },
    ]?.filter(i => (i?.value || 0) > 0);
  };

  const getPerformanceMetricsData = () => {
    const avgConsultationFee = summary?.avgConsultationFee || 0;
    const maxConsultationFee = summary?.maxConsultationFee || 0;
    const minConsultationFee = summary?.minConsultationFee || 0;
    const commissionPercentage = summary?.avgCommissionPercentage || 0;
    
    return [
      { label: "Avg Fee", value: Math.round(avgConsultationFee), color: COLORS.chartBlue },
      { label: "Max Fee", value: maxConsultationFee, color: COLORS.chartGreen },
      { label: "Min Fee", value: minConsultationFee, color: COLORS.chartOrange },
      { label: "Commission %", value: commissionPercentage, color: COLORS.chartPurple }
    ]?.filter(item => (item?.value || 0) > 0);
  };

  const getAppointmentBreakdownData = () => {
    const pendingCount = summary?.statusBreakdown?.pending?.count || 0;
    const paidCount = summary?.statusBreakdown?.paid?.count || 0;
    const cancelledCount = summary?.statusBreakdown?.cancelled?.count || 0;
    
    return [
      { label: "Pending Appointments", value: pendingCount },
      { label: "Paid Appointments", value: paidCount },
      { label: "Cancelled Appointments", value: cancelledCount },
      { label: "Total Appointments", value: summary?.totalAppointments || 0 }
    ]?.filter(item => (item?.value || 0) > 0);
  };

  /* ---------------- FILTER MODAL ---------------- */
  const FilterModal = () => (
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
            <Text style={styles.modalTitle}>Select Time Period</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={22} color={COLORS.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.filterScroll}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(FILTER_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterRow,
                  filterType === key && styles.filterRowActive,
                ]}
                onPress={() => {
                  setFilterType(key);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.filterRowContent}>
                  <Calendar size={18} color={filterType === key ? COLORS.primary : COLORS.subText} />
                  <Text
                    style={[
                      styles.filterText,
                      filterType === key && styles.filterTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
                {filterType === key && (
                  <CheckCircle size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  /* ---------------- HANDLE NAVIGATION ---------------- */
  const handleViewAllTransactions = () => {
    navigation.navigate("AllTransactions" as never, { 
      filterType, 
      statusFilter 
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
  const revenueBreakdownData = getRevenueBreakdownData();

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
        {/* FILTER ROW */}
        <View style={styles.filterRowTop}>
          <TouchableOpacity 
            style={styles.settingsBtn}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.85}
          >
            <Filter size={getResponsiveFontSize(16)} color="#ffffff" />
            <Text style={styles.settingsBtnText} numberOfLines={1}>
              Filter: {FILTER_LABELS[filterType]}
            </Text>
            <ChevronDown size={getResponsiveFontSize(14)} color="#ffffff" />
          </TouchableOpacity>
        </View>

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

        {/* CHARTS SECTION */}
        <Text style={styles.sectionTitle}>Revenue Analytics</Text>
        <SimpleBarChart
          title="Summary Metrics"
          data={getSummaryBarData()}
        />

        <Text style={styles.sectionTitle}>Revenue Overview</Text>
      {revenueBreakdownData.length > 0 ? (
        <View style={styles.revenueOverview}>
          <View style={{ width: isTablet ? 300 : 240 }}>
            <Bent3DPie
              data={revenueBreakdownData}
              size={isTablet ? 280 : moderateScale(220)}
            />
          </View>
          <RevenueLegendRight
            data={revenueBreakdownData} 
          />
        </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No revenue data available</Text>
            <Text style={styles.noDataSubText}>
              Revenue breakdown will appear once transactions are recorded
            </Text>
          </View>
        )}

        {/* Performance Metrics */}
        <HorizontalBarChart
          data={performanceMetricsData}
          title="Performance Metrics"
        />

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
                        {"Active"}
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
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.textSecondary,
    opacity: 0.75,
    marginBottom: moderateScale(4),
    fontWeight: "500",
  },
  metricValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: "700",
    color: COLORS.text,
  },
  metricIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
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
    fontSize: getResponsiveFontSize(16),
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
  subText: {
    marginTop: SPACING.xs,
    fontSize: getResponsiveFontSize(14),
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
    minHeight: getDeviceSpecificValue(100, 120, 90),
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
    maxWidth: wp(50),
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  logo: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: SPACING.xs,
    maxWidth: wp(40),
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
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.primary,
    fontWeight: "600",
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    maxWidth: wp(60),
  },
  settingsBtnText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: "#ffffff",
    fontWeight: "600",
    flexShrink: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  filterRowTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: SPACING.md,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  revenueOverview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
    marginTop: SPACING.lg, 
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
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
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
    marginBottom: moderateScale(6),
  },
  metricLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    fontWeight: "500",
  },
  metricNumber: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "700",
    color: COLORS.text,
  },
  metricBarTrack: {
    height: moderateScale(10),
    backgroundColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.sm,
    overflow: "hidden",
  },
  metricBarFill: {
    height: "100%",
    borderRadius: BORDER_RADIUS.sm,
  },
  horizontalBarContainer: {
    marginTop: SPACING.sm,
  },
  horizontalBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  horizontalBarLabel: {
    width: moderateScale(100),
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
  },
  horizontalBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  horizontalBarTrack: {
    flex: 1,
    height: moderateScale(20),
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.round,
    overflow: "hidden",
    marginRight: SPACING.sm,
  },
  horizontalBarFill: {
    height: "100%",
    borderRadius: BORDER_RADIUS.round,
  },
  horizontalBarValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
    minWidth: moderateScale(40),
    textAlign: "right",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(14),
  },
  legendDot: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
  },
  legendLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
  },
  legendValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
    marginTop: moderateScale(2),
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
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "600",
    color: COLORS.text,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
  },
  viewAllText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
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
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(3),
    borderRadius: BORDER_RADIUS.xs,
    marginRight: SPACING.sm,
  },
  transactionStatusText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: "700",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionPatient: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: moderateScale(2),
  },
  transactionDate: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
  },
  transactionItemRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: moderateScale(2),
  },
  transactionFee: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  noDataText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.subText,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  noDataSubText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.placeholder,
    textAlign: "center",
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
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
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
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
  },
  breakdownValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
  },
  footerNote: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  footerText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
    textAlign: "center",
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
    maxHeight: SCREEN_HEIGHT * 0.7,
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
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: "700",
    color: COLORS.text,
  },
  filterScroll: {
    padding: SPACING.lg,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
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
  filterRowActive: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.sm,
  },
  filterText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.text,
    flex: 1,
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});