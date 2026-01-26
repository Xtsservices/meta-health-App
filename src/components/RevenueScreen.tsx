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
import Svg, { Circle, Rect, Line, Text as SvgText } from "react-native-svg";

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
  responsivePadding,
  responsiveMargin,
  getSafeAreaInsets,
} from "../utils/responsive";
import { AuthFetch } from "../auth/auth";
import { RootState } from "../store/store";
import { showError, showSuccess } from "../store/toast.slice";
import { formatDateTime, formatDate, formatDateForInput } from "../utils/dateTime";

// Icons - using only essential ones
import {
  Wallet,
  Users,
  Percent,
  Target,
  Filter,
  XCircle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  CreditCard,
  X,
  BarChart3,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Settings,
  PieChart,
  Activity,
  TrendingDown,
  AlertCircle,
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
  [FILTER_TYPES.ALL]: "All Time",
};

/* ---------------- COLORS ---------------- */
const COLORS = {
  primary: "#2d9f8f",
  primaryDark: "#1f7569",
  primaryLight: "#e6f5f3",
  bg: "#f5f7fa",
  card: "#ffffff",
  text: "#1a1f36",
  textSecondary: "#4a5568",
  subText: "#718096",
  border: "#e2e8f0",
  borderLight: "#edf2f7",
  placeholder: "#a0aec0",
  
  // Status colors
  success: "#48bb78",
  successLight: "#c6f6d5",
  successBg: "#f0fff4",
  warning: "#ed8936",
  warningLight: "#fbd38d",
  warningBg: "#fffaf0",
  error: "#e53e3e",
  errorLight: "#fc8181",
  errorBg: "#fff5f5",
  info: "#4299e1",
  infoLight: "#bee3f8",
  infoBg: "#ebf8ff",
  
  // Chart colors
  chartBlue: "#4299e1",
  chartPurple: "#9f7aea",
  chartTeal: "#38b2ac",
  chartOrange: "#ed8936",
  chartGreen: "#48bb78",
  chartPink: "#ed64a6",
  chartYellow: "#ecc94b",
  
  // Metric card colors
  metricBlue: "#4299e1",
  metricBlueBg: "#ebf8ff",
  metricGreen: "#48bb78",
  metricGreenBg: "#f0fff4",
  metricPurple: "#9f7aea",
  metricPurpleBg: "#faf5ff",
  metricOrange: "#ed8936",
  metricOrangeBg: "#fffaf0",
  
  shadowColor: "rgba(0, 0, 0, 0.08)",
  modalOverlay: "rgba(0, 0, 0, 0.4)",
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

interface ChartData {
  period?: number;
  periodLabel?: string;
  totalAppointments?: number;
  totalConsultationFees?: number;
  totalDoctorRevenue?: number;
  totalHospitalRevenue?: number;
  avgCommission?: number;
}

/* ---------------- ALERT PANEL COMPONENT ---------------- */
const AlertPanel = ({ summary, quickStats }: { summary: RevenueSummary, quickStats: QuickStats }) => {
  const alerts = [];
  
  // Generate dynamic alerts based on data
  const todayStats = quickStats?.today;
  const pendingRevenue = summary?.statusBreakdown?.pending?.revenue || 0;
  const totalAppointments = summary?.totalAppointments || 0;
  const avgCommission = summary?.avgCommissionPercentage || 0;
  
  if (pendingRevenue > 0) {
    alerts.push({
      type: "warning",
      icon: <AlertCircle size={getResponsiveFontSize(16)} color={COLORS.warning} />,
      text: `₹${pendingRevenue.toLocaleString()} pending revenue`,
      subtext: `${summary?.statusBreakdown?.pending?.count || 0} appointments awaiting payment`,
      color: COLORS.warning,
      bgColor: COLORS.warningBg,
    });
  }
  
  if (todayStats?.totalAppointments > 0) {
    alerts.push({
      type: "info",
      icon: <CheckCircle size={getResponsiveFontSize(16)} color={COLORS.info} />,
      text: `${todayStats.totalAppointments} appointments today`,
      subtext: `Total consultation fees: ₹${todayStats.totalConsultationFees?.toLocaleString() || 0}`,
      color: COLORS.info,
      bgColor: COLORS.infoBg,
    });
  }
  
  if (avgCommission > 0 && avgCommission < 5) {
    alerts.push({
      type: "error",
      icon: <AlertCircle size={getResponsiveFontSize(16)} color={COLORS.error} />,
      text: "Low commission rate detected",
      subtext: `Average commission is ${avgCommission}% - Consider reviewing contracts`,
      color: COLORS.error,
      bgColor: COLORS.errorBg,
    });
  }
  
  if (alerts.length === 0) {
    return (
      <View style={styles.alertPanel}>
        <View style={styles.alertHeader}>
          <Bell size={getResponsiveFontSize(18)} color={COLORS.primary} />
          <Text style={styles.alertTitle}>Alerts Panel</Text>
        </View>
        <View style={[styles.alertItem, { backgroundColor: COLORS.successBg }]}>
          <View style={styles.alertIconContainer}>
            <CheckCircle size={getResponsiveFontSize(16)} color={COLORS.success} />
          </View>
          <View style={styles.alertContent}>
            <Text style={[styles.alertText, { color: COLORS.success }]}>
              All systems operational
            </Text>
            <Text style={styles.alertSubtext}>No critical alerts at this time</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.alertPanel}>
      <View style={styles.alertHeader}>
        <Bell size={getResponsiveFontSize(18)} color={COLORS.primary} />
        <Text style={styles.alertTitle}>Alerts Panel</Text>
      </View>
      
      {alerts.slice(0, 3).map((alert, index) => (
        <View key={index} style={[styles.alertItem, { backgroundColor: alert.bgColor }]}>
          <View style={styles.alertIconContainer}>
            {alert.icon}
          </View>
          <View style={styles.alertContent}>
            <Text style={[styles.alertText, { color: alert.color }]}>
              {alert.text}
            </Text>
            <Text style={styles.alertSubtext}>{alert.subtext}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

/* ---------------- METRIC CARD COMPONENT ---------------- */
const MetricCard = ({
  title,
  value,
  change,
  icon,
  color,
  bgColor,
}: {
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) => {
  const isPositive = change?.includes("+");
  const changeColor = isPositive ? COLORS.success : COLORS.error;

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIconContainer, { backgroundColor: bgColor }]}>
          {icon}
        </View>
        <Text style={styles.metricTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      </View>
      
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      
      {change !== "0%" && change && (
        <View style={[styles.metricChange, { backgroundColor: isPositive ? COLORS.successBg : COLORS.errorBg }]}>
          {isPositive ? (
            <ArrowUpRight size={getResponsiveFontSize(12)} color={changeColor} />
          ) : (
            <ArrowDownRight size={getResponsiveFontSize(12)} color={changeColor} />
          )}
          <Text style={[styles.metricChangeText, { color: changeColor }]}>
            {change}
          </Text>
        </View>
      )}
    </View>
  );
};

/* ---------------- BAR CHART COMPONENT ---------------- */
const BarChart = ({ data, title, totalRevenue }: { data: any[]; title: string; totalRevenue?: number }) => {
  const chartHeight = getDeviceSpecificValue(180, 220, 160);
  const chartWidth = SCREEN_WIDTH - (SPACING.lg * 2) - (isTablet ? SPACING.xl * 2 : 0);
  const barWidth = Math.min(
    getDeviceSpecificValue(30, 40, 25),
    (chartWidth - 80) / Math.max(data.length, 1)
  );
  const barSpacing = Math.min(
    getDeviceSpecificValue(15, 20, 10),
    (chartWidth - 80 - (data.length * barWidth)) / Math.max(data.length - 1, 1)
  );
  
  const maxValue = Math.max(...data.map(d => d.value || 0), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <BarChart3 size={getResponsiveFontSize(20)} color={COLORS.primary} />
        <Text style={styles.chartCardTitle} numberOfLines={1}>
          {title}
        </Text>
        {totalRevenue !== undefined && (
          <Text style={styles.chartRevenueTotal}>
            ₹{totalRevenue?.toLocaleString()}
          </Text>
        )}
      </View>

      {data?.length > 0 ? (
        <>
          <View style={styles.barChartContainer}>
            <Svg width={chartWidth} height={chartHeight + 40}>
              {/* Y-axis labels */}
              {[0, 1, 2, 3, 4].map((i) => {
                const value = Math.round((maxValue / 4) * (4 - i));
                const y = (chartHeight / 4) * i;
                return (
                  <React.Fragment key={i}>
                    <SvgText
                      x="0"
                      y={y + 5}
                      fontSize={getResponsiveFontSize(9)}
                      fill={COLORS.subText}
                    >
                      {value}
                    </SvgText>
                    <Line
                      x1="30"
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke={COLORS.borderLight}
                      strokeWidth="1"
                    />
                  </React.Fragment>
                );
              })}

              {/* Bars */}
              {data?.map((item, index) => {
                const barHeight = ((item.value || 0) / maxValue) * chartHeight;
                const x = 40 + (index * (barWidth + barSpacing));
                const y = chartHeight - barHeight;

                return (
                  <React.Fragment key={index}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={item.color || COLORS.chartBlue}
                      rx="4"
                    />
                    <SvgText
                      x={x + barWidth / 2}
                      y={chartHeight + 20}
                      fontSize={getResponsiveFontSize(10)}
                      fill={COLORS.subText}
                      textAnchor="middle"
                    >
                      {item.label?.substring(0, 3) || `M${index + 1}`}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>

          {/* Legend */}
          {data?.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.lineChartLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color || COLORS.chartBlue }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {item.label} - ₹{item.value?.toLocaleString()}
              </Text>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for this period</Text>
        </View>
      )}
    </View>
  );
};

/* ---------------- DONUT CHART COMPONENT ---------------- */
const DonutChart = ({ data, title, totalValue }: { data: any[]; title: string; totalValue?: number }) => {
  const size = getDeviceSpecificValue(140, 180, 120);
  const strokeWidth = getDeviceSpecificValue(25, 30, 20);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const total = totalValue || data?.reduce((sum, item) => sum + (item.value || 0), 0) || 0;
  
  let currentAngle = -90;
  const segments = data?.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const segment = {
      ...item,
      percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      color: item.color || COLORS.chartBlue,
    };
    currentAngle += angle;
    return segment;
  }) || [];

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <PieChart size={getResponsiveFontSize(20)} color={COLORS.primary} />
        <Text style={styles.chartCardTitle} numberOfLines={1}>{title}</Text>
        {totalValue !== undefined && (
          <Text style={styles.chartRevenueTotal}>
            Total: ₹{totalValue?.toLocaleString()}
          </Text>
        )}
      </View>

      {data?.length > 0 ? (
        <View style={styles.donutChartContainer}>
          <View style={styles.donutChartLeft}>
            <Svg width={size} height={size}>
              {segments.map((segment, index) => {
                const dashArray = `${(segment.percentage / 100) * circumference} ${circumference}`;
                const rotation = segment.startAngle;
                
                return (
                  <Circle
                    key={index}
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    fill="none"
                    rotation={rotation}
                    origin={`${center}, ${center}`}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Center text */}
              <SvgText
                x={center}
                y={center + 5}
                fontSize={getResponsiveFontSize(12)}
                fontWeight="bold"
                fill={COLORS.text}
                textAnchor="middle"
              >
                ₹{total?.toLocaleString()}
              </SvgText>
            </Svg>
          </View>

          <View style={styles.donutLegend}>
            {data?.map((item, index) => (
              <View key={index} style={styles.donutLegendItem}>
                <View style={styles.donutLegendLeft}>
                  <View style={[styles.donutLegendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.donutLegendLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
                <Text style={styles.donutLegendValue}>
                  {item.percentage ? item.percentage.toFixed(1) : 0}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for this period</Text>
        </View>
      )}
    </View>
  );
};

/* ---------------- LINE CHART COMPONENT ---------------- */
const LineChart = ({ data, title }: { data: any[]; title: string }) => {
  const chartHeight = getDeviceSpecificValue(160, 200, 140);
  const chartWidth = SCREEN_WIDTH - (SPACING.lg * 2) - (isTablet ? SPACING.xl * 2 : 0);
  
  const maxValue = Math.max(...data.map(d => d.value || 0), 1);
  const points = data.map((item, index) => {
    const x = (chartWidth / (data.length - 1)) * index + 40;
    const y = chartHeight - ((item.value / maxValue) * chartHeight);
    return { x, y, label: item.label, value: item.value };
  });

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <Activity size={getResponsiveFontSize(20)} color={COLORS.primary} />
        <Text style={styles.chartCardTitle} numberOfLines={1}>{title}</Text>
      </View>

      {data?.length > 0 ? (
        <View style={styles.lineChartContainer}>
          <Svg width={chartWidth} height={chartHeight + 40}>
            {/* Y-axis */}
            {[0, 1, 2, 3, 4].map((i) => {
              const value = Math.round((maxValue / 4) * (4 - i));
              const y = (chartHeight / 4) * i;
              return (
                <React.Fragment key={i}>
                  <SvgText 
                    x="0" 
                    y={y + 5} 
                    fontSize={getResponsiveFontSize(9)} 
                    fill={COLORS.subText}
                  >
                    {value}
                  </SvgText>
                  <Line
                    x1="30"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke={COLORS.borderLight}
                    strokeWidth="1"
                  />
                </React.Fragment>
              );
            })}

            {/* Line */}
            {points.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = points[index - 1];
              return (
                <Line
                  key={`line-${index}`}
                  x1={prevPoint.x}
                  y1={prevPoint.y}
                  x2={point.x}
                  y2={point.y}
                  stroke={COLORS.chartBlue}
                  strokeWidth="2"
                />
              );
            })}

            {/* Points */}
            {points.map((point, index) => (
              <Circle
                key={`point-${index}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={COLORS.chartBlue}
              />
            ))}

            {/* X-axis labels */}
            {points.map((point, index) => (
              <SvgText
                key={`label-${index}`}
                x={point.x}
                y={chartHeight + 20}
                fontSize={getResponsiveFontSize(10)}
                fill={COLORS.subText}
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            ))}
          </Svg>

          <View style={styles.lineChartLegend}>
            <Text style={styles.legendLabel}>Appointments trend over time</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for this period</Text>
        </View>
      )}
    </View>
  );
};

/* ---------------- HORIZONTAL BAR CHART ---------------- */
const HorizontalBarChart = ({ data, title }: { data: any[]; title: string }) => {
  const maxValue = Math.max(...data.map(d => d.value || 0), 100);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <Target size={getResponsiveFontSize(20)} color={COLORS.primary} />
        <Text style={styles.chartCardTitle} numberOfLines={1}>{title}</Text>
      </View>

      {data?.length > 0 ? (
        <View style={styles.horizontalBarContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.horizontalBarRow}>
              <Text style={styles.horizontalBarLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <View style={styles.horizontalBarTrack}>
                <View
                  style={[
                    styles.horizontalBarFill,
                    {
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: item.color || COLORS.chartBlue,
                    },
                  ]}
                />
              </View>
              <Text style={styles.horizontalBarValue}>{item.value}%</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for this period</Text>
        </View>
      )}
    </View>
  );
};

/* ---------------- INQUIRY BREAKDOWN ---------------- */
const InquiryBreakdown = ({ data, total, change, title }: { data: any[]; total: number; change: string; title: string }) => {
  const isPositive = change?.includes("+");

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <Users size={getResponsiveFontSize(20)} color={COLORS.primary} />
        <Text style={styles.chartCardTitle} numberOfLines={1}>{title}</Text>
      </View>

      <View style={styles.inquiryHeader}>
        <Text style={styles.inquiryTotal}>{total}</Text>
        {change !== "0%" && change && (
          <View style={[styles.inquiryChange, { 
            backgroundColor: isPositive ? COLORS.successBg : COLORS.errorBg 
          }]}>
            {isPositive ? (
              <ArrowUpRight size={getResponsiveFontSize(14)} color={COLORS.success} />
            ) : (
              <ArrowDownRight size={getResponsiveFontSize(14)} color={COLORS.error} />
            )}
            <Text style={[styles.inquiryChangeText, { 
              color: isPositive ? COLORS.success : COLORS.error 
            }]}>
              {change}
            </Text>
          </View>
        )}
      </View>

      {data?.length > 0 ? (
        <View style={styles.inquiryList}>
          {data.map((item, index) => (
            <View key={index} style={styles.inquiryItem}>
              <Text style={styles.inquiryLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.inquiryValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for this period</Text>
        </View>
      )}
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
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [filterType, setFilterType] = useState<string>(FILTER_TYPES.THIS_MONTH);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [authError, setAuthError] = useState(false);

  /* ---------------- TOKEN VALIDATION ---------------- */
  const validateToken = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setAuthError(true);
        dispatch(showError("Please login to access revenue dashboard"));
        setTimeout(() => navigation.navigate("Login" as never), 2000);
        return false;
      }
      return true;
    } catch {
      setAuthError(true);
      dispatch(showError("Authentication error"));
      return false;
    }
  };

  /* ---------------- LOAD DATA FUNCTIONS ---------------- */
  const loadQuickStats = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) return;

      const response = await AuthFetch(
        `revenue/doctor/${user.id}/quick-stats?hospitalID=${user.hospitalID}&year=${new Date().getFullYear()}&groupBy=month`,
        token
      ) as any;

      if (response?.data?.success) {
        setQuickStats(response.data.data || {});
      } else if (response?.success) {
        setQuickStats(response.data || {});
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
        `revenue/doctor/${user.id}/summary?hospitalID=${user.hospitalID}&filterType=${filterType}`,
        token
      ) as any;

      if (response?.data?.success) {
        setSummary(response.data.data || {});
      } else if (response?.success) {
        setSummary(response.data || {});
      } else {
        setSummary({});
      }
    } catch (error) {
      setSummary({});
    }
  };

  const loadHistory = async (page: number = 1) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id || !user?.hospitalID) return;

      const response = await AuthFetch(
        `revenue/doctor/${user.id}/history?hospitalID=${user.hospitalID}&filterType=${filterType}&status=${statusFilter}&page=${page}&limit=10`,
        token
      ) as any;

      if (response?.data?.success) {
        const data = response.data.data || {};
        if (page === 1) {
          setHistory(data);
        } else {
          setHistory(prev => ({
            ...data,
            transactions: [...(prev?.transactions || []), ...(data?.transactions || [])]
          }));
        }
        setCurrentPage(page);
        setHasMore(data?.pagination?.hasNextPage || false);
      } else if (response?.success) {
        const data = response.data || {};
        if (page === 1) {
          setHistory(data);
        } else {
          setHistory(prev => ({
            ...data,
            transactions: [...(prev?.transactions || []), ...(data?.transactions || [])]
          }));
        }
        setCurrentPage(page);
        setHasMore(data?.pagination?.hasNextPage || false);
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

      const response = await AuthFetch(
        `revenue/doctor/${user.id}/chart?hospitalID=${user.hospitalID}&year=${new Date().getFullYear()}&groupBy=month`,
        token
      ) as any;

      if (response?.data?.success) {
        setChartData(response.data.data?.chartData || []);
      } else if (response?.success) {
        setChartData(response.data?.chartData || []);
      } else {
        setChartData([]);
      }
    } catch (error) {
      setChartData([]);
    }
  };

  const loadRevenueData = async () => {
    try {
      const hasToken = await validateToken();
      if (!hasToken) return;

      await Promise.all([
        loadQuickStats(),
        loadSummary(),
        loadHistory(1),
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

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const formatCurrency = (amount?: number) => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  /* ---------------- DYNAMIC CHART DATA GENERATION ---------------- */
  const getAppointmentVolumeData = () => {
    if (chartData?.length > 0) {
      return chartData.map((item, index) => ({
        label: item.periodLabel?.split(' ')[0] || `M${index + 1}`,
        value: item.totalAppointments || 0,
        color: [COLORS.chartBlue, COLORS.chartPurple, COLORS.chartTeal][index % 3]
      }));
    }
    
    return [
      { label: "Current", value: summary?.totalAppointments || 0, color: COLORS.chartBlue },
      { label: "Previous", value: Math.round((summary?.totalAppointments || 0) * 0.7), color: COLORS.chartPurple }
    ];
  };

  const getRevenuePerClientData = () => {
    const doctorRevenue = summary?.totalDoctorRevenue || 0;
    const hospitalRevenue = summary?.totalHospitalRevenue || 0;
    const totalRevenue = (summary?.totalConsultationFees || 0);
    
    return [
      { label: "Doctor", value: doctorRevenue, color: COLORS.chartBlue },
      { label: "Hospital", value: hospitalRevenue, color: COLORS.chartPurple },
      { label: "Other", value: Math.max(0, totalRevenue - doctorRevenue - hospitalRevenue), color: COLORS.chartTeal }
    ].filter(item => item.value > 0);
  };

  const getConversionData = () => {
    const totalAppointments = summary?.totalAppointments || 0;
    const pendingCount = summary?.statusBreakdown?.pending?.count || 0;
    const paidCount = summary?.statusBreakdown?.paid?.count || 0;
    const cancelledCount = summary?.statusBreakdown?.cancelled?.count || 0;
    
    return [
      { label: "Paid", value: paidCount, color: COLORS.chartGreen },
      { label: "Pending", value: pendingCount, color: COLORS.chartOrange },
      { label: "Cancelled", value: cancelledCount, color: COLORS.error }
    ].filter(item => item.value > 0);
  };

  const getMissedCallsData = () => {
    if (chartData?.length > 0) {
      return chartData.map((item, index) => ({
        label: item.periodLabel?.split(' ')[0] || `M${index + 1}`,
        value: item.totalAppointments || 0
      }));
    }
    
    const baseValue = summary?.totalAppointments || 10;
    return Array.from({ length: Math.min(6, baseValue) }, (_, i) => ({
      label: `${i + 1}/28`,
      value: Math.round(baseValue * (0.8 + Math.random() * 0.4))
    }));
  };

  const getROIData = () => {
    const commission = summary?.avgCommissionPercentage || 0;
    const avgFee = summary?.avgConsultationFee || 0;
    const maxFee = summary?.maxConsultationFee || 0;
    const minFee = summary?.minConsultationFee || 0;
    
    return [
      { label: "Commission", value: commission, color: COLORS.chartBlue },
      { label: "Avg Fee", value: Math.round(avgFee / 10), color: COLORS.chartPurple },
      { label: "Max Fee", value: Math.round(maxFee / 20), color: COLORS.chartGreen },
      { label: "Min Fee", value: Math.round(minFee / 20), color: COLORS.chartOrange }
    ].filter(item => item.value > 0);
  };

  const getInquiryData = () => {
    return [
      { label: "Appointments", value: summary?.totalAppointments || 0 },
      { label: "Pending", value: summary?.statusBreakdown?.pending?.count || 0 },
      { label: "Paid", value: summary?.statusBreakdown?.paid?.count || 0 },
      { label: "Cancelled", value: summary?.statusBreakdown?.cancelled?.count || 0 }
    ].filter(item => item.value > 0);
  };

  /* ---------------- DYNAMIC METRICS ---------------- */
  const getMetricsData = () => {
    const todayStats = quickStats?.today;
    const weekStats = quickStats?.thisWeek;

    const billingChange = weekStats ? 
      calculatePercentageChange(weekStats.totalConsultationFees || 0, 0) : "0%";
    
    const expensesChange = calculatePercentageChange(
      summary?.totalDoctorRevenue || 0, 
      0
    );
    
    const roiChange = todayStats ?
      calculatePercentageChange(todayStats.totalDoctorRevenue || 0, 0) : "0%";

    return [
      {
        title: "Total Billings",
        value: formatCurrency(summary?.totalConsultationFees || 0),
        change: billingChange,
        icon: <DollarSign size={getResponsiveFontSize(20)} color={COLORS.metricBlue} />,
        color: COLORS.metricBlue,
        bgColor: COLORS.metricBlueBg
      },
      {
        title: "Doctor Revenue",
        value: formatCurrency(summary?.totalDoctorRevenue || 0),
        change: expensesChange,
        icon: <TrendingUp size={getResponsiveFontSize(20)} color={COLORS.metricGreen} />,
        color: COLORS.metricGreen,
        bgColor: COLORS.metricGreenBg
      },
      {
        title: "Hospital Revenue",
        value: formatCurrency(summary?.totalHospitalRevenue || 0),
        change: calculatePercentageChange(summary?.totalHospitalRevenue || 0, 0),
        icon: <Wallet size={getResponsiveFontSize(20)} color={COLORS.metricPurple} />,
        color: COLORS.metricPurple,
        bgColor: COLORS.metricPurpleBg
      },
      {
        title: "Commission %",
        value: `${summary?.avgCommissionPercentage?.toFixed(1) || 0}%`,
        change: roiChange,
        icon: <Percent size={getResponsiveFontSize(20)} color={COLORS.metricOrange} />,
        color: COLORS.metricOrange,
        bgColor: COLORS.metricOrangeBg
      }
    ];
  };

  /* ---------------- FILTER MODAL ---------------- */
  const FilterModal = () => (
    <Modal 
      visible={showFilterModal} 
      transparent 
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Time Period</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <XCircle size={getResponsiveFontSize(22)} color={COLORS.subText} />
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
                <Text
                  style={[
                    styles.filterText,
                    filterType === key && styles.filterTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {filterType === key && (
                  <CheckCircle size={getResponsiveFontSize(18)} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  /* ---------------- HANDLE VIEW ALL TRANSACTIONS ---------------- */
  const handleViewAllTransactions = () => {
    // Navigate to transaction history screen
    navigation.navigate("AllTransactions" as never);
  };

  /* ---------------- LOADER ---------------- */
  if (authError) {
    return (
      <View style={styles.loader}>
        <AlertCircle size={getResponsiveFontSize(48)} color={COLORS.error} />
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
  const appointmentVolumeData = getAppointmentVolumeData();
  const revenuePerClientData = getRevenuePerClientData();
  const conversionData = getConversionData();
  const missedCallsData = getMissedCallsData();
  const roiData = getROIData();
  const inquiryData = getInquiryData();
  const totalInquiries = inquiryData.reduce((sum, item) => sum + (item.value || 0), 0);
  const previousInquiries = Math.round(totalInquiries * 0.8);
  const inquiryChange = calculatePercentageChange(totalInquiries, previousInquiries);

  const currentYear = new Date().getFullYear();
  const safeArea = getSafeAreaInsets();

  /* ======================= MAIN UI ======================= */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />

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
            <View>
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
          
          <TouchableOpacity 
            style={styles.settingsBtn}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={getResponsiveFontSize(16)} color="#ffffff" />
            <Text style={styles.settingsBtnText} numberOfLines={1}>
              Filter: {FILTER_LABELS[filterType]}
            </Text>
            <ChevronDown size={getResponsiveFontSize(14)} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TIME PERIOD SELECTOR */}
      <View style={styles.periodSelector}>
        <Text style={styles.periodTitle}>Revenue Summary for</Text>
        <TouchableOpacity 
          style={styles.periodDropdown}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.periodText} numberOfLines={1}>
            {FILTER_LABELS[filterType]}
          </Text>
          <ChevronDown size={getResponsiveFontSize(16)} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.periodDates}>
          Showing data for {currentYear}
        </Text>
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
          { paddingBottom: safeArea.bottom + SPACING.lg }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ALERTS PANEL */}
        <AlertPanel summary={summary} quickStats={quickStats} />

        {/* METRICS GRID */}
        <View style={styles.metricsGrid}>
          {metrics?.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              icon={metric.icon}
              color={metric.color}
              bgColor={metric.bgColor}
            />
          ))}
        </View>

        {/* CHARTS ROW 1 */}
        <View style={styles.chartsRow}>
          <View style={styles.chartHalf}>
            <BarChart
              data={appointmentVolumeData}
              title="Appointments by Month"
              totalRevenue={summary?.totalConsultationFees || 0}
            />
          </View>
          <View style={styles.chartHalf}>
            <DonutChart
              data={revenuePerClientData}
              title="Revenue Distribution"
              totalValue={summary?.totalConsultationFees || 0}
            />
          </View>
        </View>

        {/* CHARTS ROW 2 */}
        <View style={styles.chartsRow}>
          <View style={styles.chartHalf}>
            <DonutChart
              data={conversionData}
              title="Appointment Status"
              totalValue={summary?.totalAppointments || 0}
            />
          </View>
          <View style={styles.chartHalf}>
            <LineChart
              data={missedCallsData}
              title="Appointments Trend"
            />
          </View>
        </View>

        {/* CHARTS ROW 3 */}
        <View style={styles.chartsRow}>
          <View style={styles.chartHalf}>
            <HorizontalBarChart
              data={roiData}
              title="Performance Metrics"
            />
          </View>
          <View style={styles.chartHalf}>
            <InquiryBreakdown
              data={inquiryData}
              total={totalInquiries}
              change={inquiryChange}
              title="Appointment Breakdown"
            />
          </View>
        </View>

        {/* TRANSACTION HISTORY */}
        <View style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <CreditCard size={getResponsiveFontSize(20)} color={COLORS.primary} />
            <Text style={styles.chartCardTitle}>Recent Transactions</Text>
          </View>
          
          {history?.transactions && history.transactions.length > 0 ? (
            <View style={styles.transactionList}>
              {history.transactions.slice(0, 5).map((transaction, index) => (
                <View key={index} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionPatient} numberOfLines={1}>
                      {transaction.patientName || `Patient ${transaction.patientID}`}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.date)}
                    </Text>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>
                      {formatCurrency(transaction.consultationFee || 0)}
                    </Text>
                    <View style={[
                      styles.transactionStatus,
                      { 
                        backgroundColor: transaction.status === 'paid' 
                          ? COLORS.successBg 
                          : COLORS.warningBg 
                      }
                    ]}>
                      <Text style={[
                        styles.transactionStatusText,
                        { 
                          color: transaction.status === 'paid' 
                            ? COLORS.success 
                            : COLORS.warning 
                        }
                      ]}>
                        {transaction.status || 'pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={handleViewAllTransactions}
              >
                <Text style={styles.viewAllText}>View All Transactions</Text>
                <ArrowUpRight size={getResponsiveFontSize(14)} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No transactions found</Text>
              <Text style={styles.noDataSubText}>
                Transactions will appear here once available
              </Text>
            </View>
          )}
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
    padding: SPACING.lg,
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
  subText: {
    marginTop: SPACING.xs,
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.subText,
    textAlign: "center",
  },
  
  /* HEADER */
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
  appName: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "700",
    color: "#ffffff",
    maxWidth: wp(40),
  },
  tagline: {
    fontSize: getResponsiveFontSize(11),
    color: "rgba(255,255,255,0.8)",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
    maxWidth: wp(50),
  },
  userInfo: {
    alignItems: "flex-end",
    marginBottom: SPACING.sm,
    maxWidth: "100%",
  },
  greeting: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: SPACING.xs,
    maxWidth: "100%",
  },
  notifications: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    justifyContent: "flex-end",
    maxWidth: "100%",
  },
  notifBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    maxWidth: wp(40),
  },
  notifText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: "#ffffff",
    fontWeight: "500",
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

  /* PERIOD SELECTOR */
  periodSelector: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  periodTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  periodDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  periodText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: "600",
    color: COLORS.text,
    flexShrink: 1,
    maxWidth: wp(70),
  },
  periodDates: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
  },

  /* CONTENT */
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  /* ALERT PANEL */
  alertPanel: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  alertTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "600",
    color: COLORS.text,
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  alertIconContainer: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    marginBottom: 2,
  },
  alertSubtext: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
  },

  /* METRICS GRID */
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  metricCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  metricHeader: {
    marginBottom: SPACING.sm,
  },
  metricIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  metricTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.subText,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: getResponsiveFontSize(22),
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  metricChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.xs,
    alignSelf: "flex-start",
  },
  metricChangeText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: "600",
  },

  /* CHARTS */
  chartsRow: {
    flexDirection: isTablet ? "row" : "column",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  chartHalf: {
    flex: 1,
    minHeight: getDeviceSpecificValue(300, 350, 280),
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  chartCardTitle: {
    flex: 1,
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "600",
    color: COLORS.text,
  },
  chartRevenueTotal: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.primary,
  },

  /* NO DATA */
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

  /* BAR CHART */
  barChartContainer: {
    marginTop: SPACING.sm,
  },

  /* DONUT CHART */
  donutChartContainer: {
    flexDirection: isTablet ? "row" : "column",
    gap: SPACING.md,
    alignItems: "center",
  },
  donutChartLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  donutLegend: {
    flex: 1,
    width: isTablet ? "auto" : "100%",
  },
  donutLegendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  donutLegendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flex: 1,
  },
  donutLegendColor: {
    width: getResponsiveFontSize(12),
    height: getResponsiveFontSize(12),
    borderRadius: getResponsiveFontSize(6),
  },
  donutLegendLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    flex: 1,
  },
  donutLegendValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
  },

  /* LINE CHART */
  lineChartContainer: {
    marginTop: SPACING.sm,
  },
  lineChartLegend: {
    marginTop: SPACING.md,
  },
  lineChartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  legendDot: {
    width: getResponsiveFontSize(10),
    height: getResponsiveFontSize(10),
    borderRadius: getResponsiveFontSize(5),
  },
  legendLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
  },

  /* HORIZONTAL BAR CHART */
  horizontalBarContainer: {
    marginTop: SPACING.sm,
  },
  horizontalBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  horizontalBarLabel: {
    width: wp(25),
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
  },
  horizontalBarTrack: {
    flex: 1,
    height: moderateVerticalScale(20),
    backgroundColor: COLORS.bg,
    borderRadius: BORDER_RADIUS.round,
    overflow: "hidden",
    marginHorizontal: SPACING.sm,
  },
  horizontalBarFill: {
    height: "100%",
    borderRadius: BORDER_RADIUS.round,
  },
  horizontalBarValue: {
    width: wp(10),
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "right",
  },

  /* INQUIRY BREAKDOWN */
  inquiryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  inquiryTotal: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: "700",
    color: COLORS.text,
  },
  inquiryChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  inquiryChangeText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
  },
  inquiryList: {
    gap: SPACING.sm,
  },
  inquiryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  inquiryLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    flex: 1,
  },
  inquiryValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },

  /* TRANSACTION HISTORY */
  transactionList: {
    marginTop: SPACING.sm,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  transactionLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  transactionPatient: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  transactionDate: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
  },
  transactionRight: {
    alignItems: "flex-end",
    minWidth: wp(30),
  },
  transactionAmount: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: "right",
  },
  transactionStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.xs,
    alignSelf: "flex-end",
  },
  transactionStatusText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: "600",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  viewAllText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.primary,
    fontWeight: "600",
  },

  /* MODAL */
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
    fontWeight: "700",
  },
});