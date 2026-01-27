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
import Svg, { Circle, Path } from "react-native-svg";

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
  Hospital,
  PieChart,
  TrendingDown,
  DollarSign,
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

const GROUP_BY_OPTIONS = {
  HOSPITAL: "hospital",
  MONTH: "month",
  DATE: "date",
  SOURCE: "source",
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

const GROUP_BY_LABELS = {
  [GROUP_BY_OPTIONS.HOSPITAL]: "By Hospital",
  [GROUP_BY_OPTIONS.MONTH]: "By Month",
  [GROUP_BY_OPTIONS.DATE]: "By Date",
  [GROUP_BY_OPTIONS.SOURCE]: "By Source",
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
  chartOrange: "#f97316",
  chartIndigo: "#6366f1",
  
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

/* ---------------- TYPES ---------------- */
interface SummaryData {
  totalAppointments?: number;
  totalHospitals?: number;
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
}

interface HospitalBreakdown {
  hospitalID: number;
  hospitalName: string;
  city: string;
  appointments: number;
  totalFees: number;
  doctorRevenue: number;
  hospitalRevenue: number;
  avgCommission: number;
  paidCount: number;
  pendingCount: number;
}

interface DashboardData {
  summary: SummaryData;
  breakdown: HospitalBreakdown[];
  filters: {
    filterType: string;
    groupBy: string;
    dateRange: any;
    hospitalIDs: string;
  };
}

interface HospitalComparison {
  hospitalID: number;
  hospitalName: string;
  city: string;
  address: string;
  totalAppointments: number;
  totalConsultationFees: number;
  totalDoctorRevenue: number;
  totalHospitalRevenue: number;
  avgCommission: number;
  avgFeePerAppointment: number;
  lastAppointmentDate: string;
  revenuePercentage: string;
  statusBreakdown: {
    paid: { count: number; revenue: number };
    pending: { count: number; revenue: number };
  };
}

interface ComparisonData {
  hospitals: HospitalComparison[];
  summary: {
    totalHospitals: number;
    totalRevenue: number;
    totalAppointments: number;
  };
  filters: {
    filterType: string;
    dateRange: any;
  };
}

interface Transaction {
  id: number;
  hospital: {
    id: number;
    name: string;
    city: string;
  };
  patient: {
    id: number;
    name: string;
    mobile: string;
  };
  consultationFee: number;
  commissionPercentage: number;
  doctorRevenue: number;
  hospitalRevenue: number;
  status: string;
  source: string;
  revenueType: string;
  date: string;
  createdAt: string;
}

interface TransactionHistory {
  transactions: Transaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    filterType: string;
    status: string;
    source: string;
    sortBy: string;
    sortOrder: string;
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

/* ---------------- HOSPITAL PERFORMANCE CHART ---------------- */
const HospitalPerformanceChart = ({ data }: { data: HospitalBreakdown[] }) => {
  const maxRevenue = Math.max(...data?.map(h => h.doctorRevenue || 0), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <Building size={20} color={COLORS.primary} />
        <Text style={styles.chartCardTitle}>Hospital Performance</Text>
      </View>

      {data?.length > 0 ? (
        <View style={styles.hospitalChartContainer}>
          {data?.map((hospital, index) => {
            const revenuePercent = ((hospital.doctorRevenue || 0) / maxRevenue) * 100;
            const colorIndex = index % 6;
            const colors = [
              COLORS.chartTeal,
              COLORS.chartBlue,
              COLORS.chartPurple,
              COLORS.chartGreen,
              COLORS.chartOrange,
              COLORS.chartPink,
            ];

            return (
              <View key={hospital.hospitalID} style={styles.hospitalRow}>
                <View style={styles.hospitalInfo}>
                  <Text style={styles.hospitalName} numberOfLines={1}>
                    {hospital.hospitalName}
                  </Text>
                  <Text style={styles.hospitalCity} numberOfLines={1}>
                    {hospital.city}
                  </Text>
                </View>
                
                <View style={styles.hospitalStats}>
                  <View style={styles.revenueBarContainer}>
                    <View style={styles.revenueBarTrack}>
                      <View
                        style={[
                          styles.revenueBarFill,
                          {
                            width: `${revenuePercent}%`,
                            backgroundColor: colors[colorIndex],
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.revenueValue}>
                      ₹{(hospital.doctorRevenue || 0)?.toLocaleString()}
                    </Text>
                  </View>
                  
                  <View style={styles.hospitalMetrics}>
                    <View style={styles.metricBadge}>
                      <Users size={12} color={COLORS.subText} />
                      <Text style={styles.metricBadgeText}>
                        {hospital.appointments}
                      </Text>
                    </View>
                    <View style={styles.metricBadge}>
                      <Percent size={12} color={COLORS.subText} />
                      <Text style={styles.metricBadgeText}>
                        {hospital.avgCommission?.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No hospital data available</Text>
        </View>
      )}
    </View>
  );
};

/* ---------------- 3D PIE CHART COMPONENT ---------------- */
const RevenuePieChart = ({ data, size = 220, depth = 18 }) => {
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
const RevenueLegend = ({ data }: { data: any[] }) => {
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
              {item?.prefix || "₹"}
              {(item?.value || 0)?.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

/* ======================= MAIN SCREEN ======================= */
const CentralRevenueScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.currentUser);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [filterType, setFilterType] = useState<string>(FILTER_TYPES.THIS_MONTH);
  const [groupBy, setGroupBy] = useState<string>(GROUP_BY_OPTIONS.HOSPITAL);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [authError, setAuthError] = useState(false);

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const formatCurrency = (amount?: number) => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  /* ---------------- LOAD DATA FUNCTIONS ---------------- */
  const loadDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id) {
        setAuthError(true);
        return;
      }

      const response = await AuthFetch(
        `revenue/central/dashboard/${user.id}?filterType=${filterType}&groupBy=${groupBy}`,
        token
      ) as any;

      if (response?.data?.success || response?.success) {
        const data = response?.data?.data || response?.data;
        setDashboardData(data);
      } else {
        setDashboardData(null);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
      setDashboardData(null);
    }
  };

  const loadComparisonData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user?.id) return;

      const response = await AuthFetch(
        `revenue/central/comparison/${user.id}?filterType=${filterType}`,
        token
      ) as any;

      if (response?.data?.success || response?.success) {
        const data = response?.data?.data || response?.data;
        setComparisonData(data);
      } else {
        setComparisonData(null);
      }
    } catch (error) {
      console.error("Comparison error:", error);
      setComparisonData(null);
    }
  };

  const loadAllData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setAuthError(true);
        dispatch(showError("Please login to access central dashboard"));
        setTimeout(() => {
          navigation.navigate("Login" as never);
        }, 1500);
        return;
      }

      await Promise.all([
        loadDashboardData(),
        loadComparisonData(),
      ]);
    } catch (error) {
      dispatch(showError("Failed to load revenue data"));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- EFFECTS ---------------- */
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAllData().finally(() => setLoading(false));
    }, [filterType, groupBy])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  /* ---------------- DATA PROCESSING ---------------- */
  const getMetricsData = () => {
    const summary = dashboardData?.summary || {};
    
    return [
      {
        title: "Total Hospitals",
        value: summary?.totalHospitals || 0,
        icon: <Hospital size={ICON_SIZE.md} color="#2563EB" />,
        color: "#2563EB",
        bgColor: "#eff6ff",
        onPress: () => navigation.navigate("HospitalsList" as never),
      },
      {
        title: "Total Appointments",
        value: summary?.totalAppointments || 0,
        icon: <Users size={ICON_SIZE.md} color="#10B981" />,
        color: "#10B981",
        bgColor: "#ecfdf5",
        onPress: () => navigation.navigate("AllTransactions" as never, { 
          filterType,
          source: "central"
        } as never),
      },
      {
        title: "Doctor Revenue",
        value: formatCurrency(summary?.totalDoctorRevenue || 0),
        icon: <Wallet size={ICON_SIZE.md} color="#7C3AED" />,
        color: "#7C3AED",
        bgColor: "#f5f3ff",
      },
      {
        title: "Hospital Revenue",
        value: formatCurrency(summary?.totalHospitalRevenue || 0),
        icon: <Building size={ICON_SIZE.md} color="#F59E0B" />,
        color: "#F59E0B",
        bgColor: "#fffbeb",
      },
    ];
  };

  const getSummaryBarData = () => {
    const summary = dashboardData?.summary || {};
    
    return [
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
        label: "Avg Commission",
        value: summary?.avgCommissionPercentage || 0,
        suffix: "%",
        color: COLORS.chartGreen,
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
    const summary = dashboardData?.summary || {};
    
    return [
      {
        label: "Total Fees",
        value: summary?.totalConsultationFees || 0,
        color: COLORS.chartBlue,
        prefix: "₹",
      },
      {
        label: "Doctor Rev",
        value: summary?.totalDoctorRevenue || 0,
        color: COLORS.chartTeal,
        prefix: "₹",
      },
      {
        label: "Hospital Rev",
        value: summary?.totalHospitalRevenue || 0,
        color: COLORS.chartPurple,
        prefix: "₹",
      },
      {
        label: "Appointments",
        value: summary?.totalAppointments || 0,
        color: COLORS.chartGreen,
      },
    ]?.filter(i => (i?.value || 0) > 0);
  };

  const getHospitalComparisonData = () => {
    if (!comparisonData?.hospitals?.length) return [];
    
    return comparisonData.hospitals.map(hospital => ({
      label: hospital.hospitalName,
      value: hospital.totalDoctorRevenue || 0,
      color: COLORS.chartTeal,
      prefix: "₹",
    }));
  };

  const getStatusBreakdownData = () => {
    const breakdown = dashboardData?.summary?.statusBreakdown;
    
    return [
      {
        label: "Paid Appointments",
        value: breakdown?.paid?.count || 0,
        color: COLORS.success,
      },
      {
        label: "Pending Appointments",
        value: breakdown?.pending?.count || 0,
        color: COLORS.warning,
      },
      {
        label: "Cancelled Appointments",
        value: breakdown?.cancelled?.count || 0,
        color: COLORS.error,
      },
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
            <Text style={styles.modalTitle}>Filter Options</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={22} color={COLORS.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.filterScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Time Period Section */}
            <Text style={styles.filterSectionTitle}>Time Period</Text>
            {Object.entries(FILTER_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterRow,
                  filterType === key && styles.filterRowActive,
                ]}
                onPress={() => {
                  setFilterType(key);
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

            {/* Group By Section */}
            <Text style={styles.filterSectionTitle}>Group By</Text>
            {Object.entries(GROUP_BY_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterRow,
                  groupBy === key && styles.filterRowActive,
                ]}
                onPress={() => {
                  setGroupBy(key);
                }}
              >
                <View style={styles.filterRowContent}>
                  <PieChart size={18} color={groupBy === key ? COLORS.primary : COLORS.subText} />
                  <Text
                    style={[
                      styles.filterText,
                      groupBy === key && styles.filterTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
                {groupBy === key && (
                  <CheckCircle size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowFilterModal(false);
                loadAllData();
              }}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  /* ---------------- HANDLE NAVIGATION ---------------- */
  const handleViewAllTransactions = () => {
    navigation.navigate("CentralTransactions" as never, { 
      filterType,
      groupBy 
    } as never);
  };

  const handleViewHospitalComparison = () => {
    navigation.navigate("HospitalComparison" as never, { 
      filterType,
      data: comparisonData 
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
        <Text style={styles.loaderText}>Loading central dashboard...</Text>
      </View>
    );
  }

  const metrics = getMetricsData();
  const summaryBarData = getSummaryBarData();
  const revenueBreakdownData = getRevenueBreakdownData();
  const hospitalComparisonData = getHospitalComparisonData();
  const statusBreakdownData = getStatusBreakdownData();
  const safeArea = getSafeAreaInsets();
  const footerPadding = safeArea.bottom + SPACING.lg;

  /* ======================= MAIN UI ======================= */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: safeArea.top + SPACING.sm }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Building size={getResponsiveFontSize(24)} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.greeting} numberOfLines={1}>
                Central Revenue Dashboard
              </Text>
              <Text style={styles.role} numberOfLines={1}>
                Admin
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
              {FILTER_LABELS[filterType]} • {GROUP_BY_LABELS[groupBy]}
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

        {/* SUMMARY SECTION */}
        <Text style={styles.sectionTitle}>Revenue Summary</Text>
        <SimpleBarChart
          title="Key Metrics"
          data={summaryBarData}
        />

        {/* REVENUE BREAKDOWN */}
        <Text style={styles.sectionTitle}>Revenue Distribution</Text>
        {revenueBreakdownData.length > 0 ? (
          <View style={styles.revenueOverview}>
            <View style={{ width: isTablet ? 300 : 240 }}>
              <RevenuePieChart
                data={revenueBreakdownData}
                size={isTablet ? 280 : moderateScale(220)}
              />
            </View>
            <RevenueLegend
              data={revenueBreakdownData} 
            />
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No revenue data available</Text>
          </View>
        )}

        {/* HOSPITAL PERFORMANCE */}
        {dashboardData?.breakdown && dashboardData.breakdown.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hospital Performance</Text>
              <TouchableOpacity 
                style={styles.viewAllLink}
                onPress={() => navigation.navigate("HospitalBreakdown" as never, {
                  breakdown: dashboardData.breakdown,
                  filterType,
                })}
              >
                <Text style={styles.viewAllLinkText}>View Details</Text>
                <ArrowUpRight size={14} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <HospitalPerformanceChart data={dashboardData.breakdown} />
          </>
        )}

        {/* HOSPITAL COMPARISON */}
        {hospitalComparisonData.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hospital Comparison</Text>
              <TouchableOpacity 
                style={styles.viewAllLink}
                onPress={handleViewHospitalComparison}
              >
                <Text style={styles.viewAllLinkText}>Compare All</Text>
                <ArrowUpRight size={14} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <TrendingUp size={20} color={COLORS.primary} />
                <Text style={styles.chartCardTitle}>Top Performing Hospitals</Text>
              </View>
              
              <View style={styles.comparisonContainer}>
                {comparisonData?.hospitals?.slice(0, 3).map((hospital, index) => (
                  <TouchableOpacity 
                    key={hospital.hospitalID} 
                    style={styles.comparisonCard}
                    activeOpacity={0.7}
                  >
                    <View style={styles.comparisonHeader}>
                      <View style={[
                        styles.rankBadge,
                        { backgroundColor: index === 0 ? COLORS.chartYellow : 
                          index === 1 ? COLORS.chartBlue : COLORS.chartGreen }
                      ]}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.hospitalTitle}>
                        <Text style={styles.comparisonHospitalName} numberOfLines={1}>
                          {hospital.hospitalName}
                        </Text>
                        <Text style={styles.comparisonCity} numberOfLines={1}>
                          {hospital.city}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.comparisonStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Revenue</Text>
                        <Text style={styles.statValue}>
                          {formatCurrency(hospital.totalDoctorRevenue)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Appointments</Text>
                        <Text style={styles.statValue}>
                          {hospital.totalAppointments}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Commission</Text>
                        <Text style={styles.statValue}>
                          {hospital.avgCommission?.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.comparisonFooter}>
                      <View style={[
                        styles.statusIndicator,
                        { backgroundColor: hospital.statusBreakdown.pending.count > 0 ? 
                          COLORS.warningLight : COLORS.successLight }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: hospital.statusBreakdown.pending.count > 0 ? 
                            COLORS.warning : COLORS.success }
                        ]}>
                          {hospital.statusBreakdown.paid.count} paid • {hospital.statusBreakdown.pending.count} pending
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* STATUS BREAKDOWN */}
        {statusBreakdownData.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Appointment Status</Text>
            <View style={styles.chartCard}>
              <View style={styles.statusContainer}>
                {statusBreakdownData.map((item, index) => (
                  <View key={index} style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                    <View style={styles.statusContent}>
                      <Text style={styles.statusLabel}>{item.label}</Text>
                      <Text style={styles.statusValue}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleViewAllTransactions}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.infoBg }]}>
              <CreditCard size={24} color={COLORS.info} />
            </View>
            <Text style={styles.actionTitle}>View Transactions</Text>
            <Text style={styles.actionSubtitle}>All hospitals, all sources</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleViewHospitalComparison}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.successBg }]}>
              <TrendingUp size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionTitle}>Compare Hospitals</Text>
            <Text style={styles.actionSubtitle}>Performance analysis</Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER NOTE */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Data updated in real-time • Grouped by: {GROUP_BY_LABELS[groupBy]} • 
            Last refreshed: {formatDateTime(new Date().toISOString())}
          </Text>
        </View>
      </ScrollView>

      {/* MODALS */}
      <FilterModal />
    </View>
  );
};

export default CentralRevenueScreen;

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
  role: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
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
  sectionTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  viewAllLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
  },
  viewAllLinkText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.primary,
    fontWeight: "600",
  },
  revenueOverview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
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
  hospitalChartContainer: {
    marginTop: SPACING.sm,
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  hospitalInfo: {
    width: moderateScale(100),
  },
  hospitalName: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: moderateScale(2),
  },
  hospitalCity: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
  },
  hospitalStats: {
    flex: 1,
  },
  revenueBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(6),
  },
  revenueBarTrack: {
    flex: 1,
    height: moderateScale(12),
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    overflow: "hidden",
    marginRight: SPACING.sm,
  },
  revenueBarFill: {
    height: "100%",
    borderRadius: BORDER_RADIUS.sm,
  },
  revenueValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "600",
    color: COLORS.text,
    minWidth: moderateScale(70),
    textAlign: "right",
  },
  hospitalMetrics: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  metricBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: BORDER_RADIUS.xs,
  },
  metricBadgeText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
    fontWeight: "500",
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
  comparisonContainer: {
    gap: SPACING.md,
  },
  comparisonCard: {
    backgroundColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  rankBadge: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "700",
    color: "#ffffff",
  },
  hospitalTitle: {
    flex: 1,
  },
  comparisonHospitalName: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: moderateScale(2),
  },
  comparisonCity: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
  },
  comparisonStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
    marginBottom: moderateScale(2),
  },
  statValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "700",
    color: COLORS.text,
  },
  comparisonFooter: {
    marginTop: SPACING.xs,
  },
  statusIndicator: {
    alignSelf: "flex-start",
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: BORDER_RADIUS.xs,
  },
  statusText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: "600",
  },
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: moderateScale(120),
  },
  statusDot: {
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    marginRight: SPACING.sm,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    marginBottom: moderateScale(2),
  },
  statusValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: "700",
    color: COLORS.text,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
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
  actionIcon: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  actionTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: moderateScale(4),
  },
  actionSubtitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
    textAlign: "center",
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
  },
  noDataText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.subText,
    textAlign: "center",
    marginBottom: SPACING.xs,
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
  filterSectionTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    opacity: 0.7,
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
  applyButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  applyButtonText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: "#ffffff",
    fontWeight: "600",
  },
});