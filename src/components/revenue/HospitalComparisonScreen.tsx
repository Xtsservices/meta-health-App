import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Path } from "react-native-svg";
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Building,
  Users,
  DollarSign,
  Percent,
  Target,
  BarChart3,
  Award,
  Star,
  Medal,
  ChevronRight,
} from "lucide-react-native";

import { AuthFetch } from "../../auth/auth";
import { RootState } from "../../store/store";
import { showError } from "../../store/toast.slice";
import { formatDate } from "../../utils/dateTime";
import { COLORS } from "../../utils/colour";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* ---------------- TYPES ---------------- */
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

interface RouteParams {
  filterType?: string;
  data?: any;
}

/* ---------------- PIE CHART COMPONENT ---------------- */
const ComparisonPieChart = ({ data, size = 200 }) => {
  const total = data?.reduce((s, d) => s + (d?.value || 0), 0) || 1;
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

  const colors = [
    COLORS.chartTeal,
    COLORS.chartBlue,
    COLORS.chartPurple,
    COLORS.chartGreen,
    COLORS.chartOrange,
    COLORS.chartPink,
    COLORS.chartIndigo,
  ];

  return (
    <Svg width={size} height={size}>
      {(() => {
        let a = 0;
        return data?.map((d, i) => {
          const slice = ((d.value || 0) / total) * 360;
          const p = arc(a, a + slice);
          a += slice;

          return (
            <Path
              key={i}
              d={p}
              fill={colors[i % colors.length]}
            />
          );
        });
      })()}
    </Svg>
  );
};

/* ======================= HOSPITAL COMPARISON SCREEN ======================= */
const HospitalComparisonScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const params = route.params as RouteParams;
  const user = useSelector((s: RootState) => s.currentUser);
  
  const [loading, setLoading] = useState(!params?.data);
  const [comparisonData, setComparisonData] = useState<any>(params?.data);
  const [filterType, setFilterType] = useState<string>(params?.filterType || "this_month");

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const formatCurrency = (amount?: number) => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getFilterLabel = (type: string) => {
    const labels: Record<string, string> = {
      "today": "Today",
      "yesterday": "Yesterday",
      "this_week": "This Week",
      "last_week": "Last Week",
      "this_month": "This Month",
      "last_month": "Last Month",
      "this_year": "This Year",
      "last_year": "Last Year",
      "all": "All Time",
    };
    return labels[type] || type.replace("_", " ").toUpperCase();
  };

  /* ---------------- LOAD DATA ---------------- */
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
      }
    } catch (error) {
      console.error("Comparison error:", error);
      dispatch(showError("Failed to load comparison data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!params?.data) {
      loadComparisonData();
    }
  }, [filterType]);

  /* ---------------- RENDER FUNCTIONS ---------------- */
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Hospital Comparison
          </Text>
          <Text style={styles.headerSubtitle}>
            {getFilterLabel(filterType)} • {comparisonData?.summary?.totalHospitals || 0} hospitals
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSummary = () => {
    const summary = comparisonData?.summary;
    if (!summary) return null;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Building size={20} color={COLORS.brand} />
              <Text style={styles.summaryValue}>{summary.totalHospitals}</Text>
              <Text style={styles.summaryLabel}>Hospitals</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <Users size={20} color={COLORS.success} />
              <Text style={styles.summaryValue}>{summary.totalAppointments}</Text>
              <Text style={styles.summaryLabel}>Appointments</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <DollarSign size={20} color={COLORS.warning} />
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.totalRevenue)}
              </Text>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderPieChart = () => {
    const hospitals = comparisonData?.hospitals || [];
    if (hospitals.length === 0) return null;

    const pieData = hospitals.map((h: HospitalComparison) => ({
      label: h.hospitalName,
      value: h.totalDoctorRevenue || 0,
    }));

    const topHospitals = hospitals.slice(0, 3);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <BarChart3 size={20} color={COLORS.brand} />
          <Text style={styles.chartTitle}>Revenue Distribution</Text>
        </View>
        
        <View style={styles.chartContent}>
          <View style={styles.pieContainer}>
            <ComparisonPieChart data={pieData} size={180} />
          </View>
          
          <View style={styles.chartLegend}>
            <Text style={styles.legendTitle}>Top Performers</Text>
            {topHospitals.map((hospital: HospitalComparison, index: number) => (
              <View key={hospital.hospitalID} style={styles.legendItem}>
                <View style={styles.legendRow}>
                  <View style={[
                    styles.legendDot,
                    { backgroundColor: [
                      COLORS.chartTeal,
                      COLORS.chartBlue,
                      COLORS.chartPurple
                    ][index] }
                  ]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {hospital.hospitalName}
                  </Text>
                </View>
                <Text style={styles.legendValue}>
                  {formatCurrency(hospital.totalDoctorRevenue)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderComparisonTable = () => {
    const hospitals = comparisonData?.hospitals || [];
    if (hospitals.length === 0) return null;

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Hospital Performance Details</Text>
          <Text style={styles.tableSubtitle}>Sorted by Revenue</Text>
        </View>
        
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tableScroll}
        >
          <View>
            {/* Header Row */}
            <View style={styles.tableRowHeader}>
              <View style={[styles.tableCell, styles.rankCell]}>
                <Text style={styles.tableHeaderText}>Rank</Text>
              </View>
              <View style={[styles.tableCell, styles.nameCell]}>
                <Text style={styles.tableHeaderText}>Hospital</Text>
              </View>
              <View style={[styles.tableCell, styles.metricCell]}>
                <Text style={styles.tableHeaderText}>Revenue</Text>
              </View>
              <View style={[styles.tableCell, styles.metricCell]}>
                <Text style={styles.tableHeaderText}>Appointments</Text>
              </View>
              <View style={[styles.tableCell, styles.metricCell]}>
                <Text style={styles.tableHeaderText}>Avg Fee</Text>
              </View>
              <View style={[styles.tableCell, styles.metricCell]}>
                <Text style={styles.tableHeaderText}>Commission</Text>
              </View>
              <View style={[styles.tableCell, styles.statusCell]}>
                <Text style={styles.tableHeaderText}>Status</Text>
              </View>
            </View>
            
            {/* Data Rows */}
            {hospitals.map((hospital: HospitalComparison, index: number) => (
              <TouchableOpacity 
                key={hospital.hospitalID}
                style={[
                  styles.tableRow,
                  index % 2 === 0 && { backgroundColor: COLORS.bg }
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.tableCell, styles.rankCell]}>
                  <View style={[
                    styles.rankBadge,
                    index === 0 && { backgroundColor: COLORS.chartYellow },
                    index === 1 && { backgroundColor: COLORS.chartBlue },
                    index === 2 && { backgroundColor: COLORS.chartGreen },
                    index > 2 && { backgroundColor: COLORS.border },
                  ]}>
                    <Text style={[
                      styles.rankText,
                      index < 3 && { color: "#fff" }
                    ]}>
                      #{index + 1}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.tableCell, styles.nameCell]}>
                  <Text style={styles.hospitalName} numberOfLines={1}>
                    {hospital.hospitalName}
                  </Text>
                  <Text style={styles.hospitalCity} numberOfLines={1}>
                    {hospital.city}
                  </Text>
                </View>
                
                <View style={[styles.tableCell, styles.metricCell]}>
                  <Text style={styles.metricValue}>
                    {formatCurrency(hospital.totalDoctorRevenue)}
                  </Text>
                  <Text style={styles.metricSub}>
                    {hospital.revenuePercentage}%
                  </Text>
                </View>
                
                <View style={[styles.tableCell, styles.metricCell]}>
                  <Text style={styles.metricValue}>
                    {hospital.totalAppointments}
                  </Text>
                  <Text style={styles.metricSub}>
                    {hospital.avgFeePerAppointment?.toFixed(0)} avg
                  </Text>
                </View>
                
                <View style={[styles.tableCell, styles.metricCell]}>
                  <Text style={styles.metricValue}>
                    {formatCurrency(hospital.avgFeePerAppointment)}
                  </Text>
                  <Text style={styles.metricSub}>
                    per appointment
                  </Text>
                </View>
                
                <View style={[styles.tableCell, styles.metricCell]}>
                  <Text style={styles.metricValue}>
                    {hospital.avgCommission?.toFixed(1)}%
                  </Text>
                  <Text style={styles.metricSub}>
                    average
                  </Text>
                </View>
                
                <View style={[styles.tableCell, styles.statusCell]}>
                  <View style={styles.statusContainer}>
                    <View style={styles.statusItem}>
                      <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                      <Text style={styles.statusCount}>
                        {hospital.statusBreakdown.paid.count}
                      </Text>
                    </View>
                    <View style={styles.statusItem}>
                      <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
                      <Text style={styles.statusCount}>
                        {hospital.statusBreakdown.pending.count}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderPerformanceMetrics = () => {
    const hospitals = comparisonData?.hospitals || [];
    if (hospitals.length === 0) return null;

    // Find top performers
    const topByRevenue = [...hospitals].sort((a, b) => 
      (b.totalDoctorRevenue || 0) - (a.totalDoctorRevenue || 0)
    )[0];

    const topByAppointments = [...hospitals].sort((a, b) => 
      (b.totalAppointments || 0) - (a.totalAppointments || 0)
    )[0];

    const topByCommission = [...hospitals].sort((a, b) => 
      (b.avgCommission || 0) - (a.avgCommission || 0)
    )[0];

    return (
      <View style={styles.metricsContainer}>
        <View style={styles.metricsHeader}>
          <Award size={20} color={COLORS.brand} />
          <Text style={styles.metricsTitle}>Top Performers</Text>
        </View>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: COLORS.successLight }]}>
              <TrendingUp size={24} color={COLORS.success} />
            </View>
            <Text style={styles.metricCardTitle}>Highest Revenue</Text>
            <Text style={styles.metricCardValue} numberOfLines={1}>
              {topByRevenue?.hospitalName}
            </Text>
            <Text style={styles.metricCardSub}>
              {formatCurrency(topByRevenue?.totalDoctorRevenue)}
            </Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: COLORS.infoLight }]}>
              <Users size={24} color={COLORS.info} />
            </View>
            <Text style={styles.metricCardTitle}>Most Appointments</Text>
            <Text style={styles.metricCardValue} numberOfLines={1}>
              {topByAppointments?.hospitalName}
            </Text>
            <Text style={styles.metricCardSub}>
              {topByAppointments?.totalAppointments} appointments
            </Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: COLORS.warningLight }]}>
              <Percent size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.metricCardTitle}>Highest Commission</Text>
            <Text style={styles.metricCardValue} numberOfLines={1}>
              {topByCommission?.hospitalName}
            </Text>
            <Text style={styles.metricCardSub}>
              {topByCommission?.avgCommission?.toFixed(1)}% average
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => {
    const filters = ["today", "this_week", "this_month", "this_year", "all"];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              { backgroundColor: COLORS.card, borderColor: COLORS.border },
              filterType === filter && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }
            ]}
            onPress={() => setFilterType(filter)}
          >
            <Text style={[
              styles.filterButtonText,
              { color: COLORS.text },
              filterType === filter && { color: "#fff" }
            ]}>
              {getFilterLabel(filter)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  /* ---------------- MAIN RENDER ---------------- */
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loaderText}>Loading comparison data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {renderHeader()}
      
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderFilters()}
        {renderSummary()}
        {renderPieChart()}
        {renderPerformanceMetrics()}
        {renderComparisonTable()}
        
        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Data as of {formatDate(new Date().toISOString())} • 
            Total revenue shown is doctor revenue only
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HospitalComparisonScreen;

/* ======================= STYLES ======================= */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
    padding: 20,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
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
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "500",
  },
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 8,
  },
  chartContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  pieContainer: {
    flex: 1,
    alignItems: "center",
  },
  chartLegend: {
    flex: 1,
    marginLeft: 16,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
    flex: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  metricsContainer: {
    marginBottom: 16,
  },
  metricsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
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
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
    textAlign: "center",
  },
  metricCardValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
    textAlign: "center",
  },
  metricCardSub: {
    fontSize: 11,
    color: COLORS.sub,
    textAlign: "center",
  },
  tableContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  tableHeader: {
    marginBottom: 12,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  tableSubtitle: {
    fontSize: 12,
    color: COLORS.sub,
  },
  tableScroll: {
    maxHeight: 400,
  },
  tableRowHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.brandLight,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  rankCell: {
    width: 60,
  },
  nameCell: {
    width: 120,
  },
  metricCell: {
    width: 100,
  },
  statusCell: {
    width: 80,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.brand,
    textAlign: "center",
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
  },
  hospitalName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  hospitalCity: {
    fontSize: 11,
    color: COLORS.sub,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    color: COLORS.sub,
    textAlign: "center",
  },
  statusContainer: {
    gap: 4,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusCount: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "600",
  },
  footerNote: {
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.sub,
    textAlign: "center",
  },
});