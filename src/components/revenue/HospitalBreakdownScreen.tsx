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
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ChevronLeft,
  Building,
  Users,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react-native";

import { formatDate } from "../../utils/dateTime";
import { COLORS } from "../../utils/colour";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* ---------------- TYPES ---------------- */
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

interface RouteParams {
  breakdown: HospitalBreakdown[];
  filterType?: string;
}

/* ======================= HOSPITAL BREAKDOWN SCREEN ======================= */
const HospitalBreakdownScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const params = route.params as RouteParams;
  
  const [loading, setLoading] = useState(false);
  const breakdown = params?.breakdown || [];

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

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

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
            Hospital Breakdown
          </Text>
          <Text style={styles.headerSubtitle}>
            {getFilterLabel(params?.filterType || "this_month")} • {breakdown.length} hospitals
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSummary = () => {
    const totalAppointments = breakdown.reduce((sum, h) => sum + (h.appointments || 0), 0);
    const totalDoctorRevenue = breakdown.reduce((sum, h) => sum + (h.doctorRevenue || 0), 0);
    const totalHospitalRevenue = breakdown.reduce((sum, h) => sum + (h.hospitalRevenue || 0), 0);
    const avgCommission = breakdown.reduce((sum, h) => sum + (h.avgCommission || 0), 0) / breakdown.length;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Overall Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.successLight }]}>
                <Users size={20} color={COLORS.success} />
              </View>
              <Text style={styles.summaryValue}>{totalAppointments}</Text>
              <Text style={styles.summaryLabel}>Total Appointments</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.infoLight }]}>
                <DollarSign size={20} color={COLORS.info} />
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(totalDoctorRevenue)}
              </Text>
              <Text style={styles.summaryLabel}>Doctor Revenue</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.warningLight }]}>
                <Building size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(totalHospitalRevenue)}
              </Text>
              <Text style={styles.summaryLabel}>Hospital Revenue</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.brandLight }]}>
                <Percent size={20} color={COLORS.brand} />
              </View>
              <Text style={styles.summaryValue}>
                {avgCommission.toFixed(1)}%
              </Text>
              <Text style={styles.summaryLabel}>Avg Commission</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderHospitalCard = (hospital: HospitalBreakdown, index: number) => {
    const isTopPerformer = index < 3;
    
    return (
      <TouchableOpacity 
        key={hospital.hospitalID}
        style={[
          styles.hospitalCard,
          isTopPerformer && { borderColor: COLORS.brand, borderWidth: 2 }
        ]}
        activeOpacity={0.8}
      >
        {isTopPerformer && (
          <View style={[
            styles.topBadge,
            index === 0 && { backgroundColor: COLORS.chartYellow },
            index === 1 && { backgroundColor: COLORS.chartBlue },
            index === 2 && { backgroundColor: COLORS.chartGreen },
          ]}>
            <Text style={styles.topBadgeText}>TOP {index + 1}</Text>
          </View>
        )}
        
        <View style={styles.hospitalHeader}>
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName} numberOfLines={1}>
              {hospital.hospitalName}
            </Text>
            <View style={styles.hospitalLocation}>
              <MapPin size={12} color={COLORS.sub} />
              <Text style={styles.hospitalCity} numberOfLines={1}>
                {hospital.city}
              </Text>
            </View>
          </View>
          
          <View style={styles.hospitalRank}>
            <Text style={styles.rankText}>#{index + 1}</Text>
          </View>
        </View>
        
        <View style={styles.hospitalStats}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Appointments</Text>
              <Text style={styles.statValue}>{hospital.appointments}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Commission</Text>
              <Text style={styles.statValue}>{hospital.avgCommission.toFixed(1)}%</Text>
            </View>
          </View>
          
          <View style={styles.revenueRow}>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Doctor Revenue</Text>
              <Text style={[styles.revenueValue, { color: COLORS.success }]}>
                {formatCurrency(hospital.doctorRevenue)}
              </Text>
            </View>
            
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Hospital Revenue</Text>
              <Text style={[styles.revenueValue, { color: COLORS.brand }]}>
                {formatCurrency(hospital.hospitalRevenue)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.hospitalFooter}>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.statusText}>Paid: {hospital.paidCount}</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.statusText}>Pending: {hospital.pendingCount}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHospitalList = () => (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Hospital Performance</Text>
        <Text style={styles.listSubtitle}>
          Sorted by doctor revenue • {breakdown.length} hospitals
        </Text>
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.listScroll}
      >
        {breakdown.map((hospital, index) => renderHospitalCard(hospital, index))}
      </ScrollView>
    </View>
  );

  /* ---------------- MAIN RENDER ---------------- */
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loaderText}>Loading breakdown...</Text>
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
        {renderSummary()}
        {renderHospitalList()}
        
        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Performance data for {getFilterLabel(params?.filterType || "this_month")} • 
            Updated: {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HospitalBreakdownScreen;

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
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryItem: {
    width: (SCREEN_WIDTH - 32 - 32 - 12) / 2,
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.sub,
    textAlign: "center",
  },
  listContainer: {
    marginBottom: 16,
  },
  listHeader: {
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 12,
    color: COLORS.sub,
  },
  listScroll: {
    maxHeight: 600,
  },
  hospitalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  topBadge: {
    position: "absolute",
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  hospitalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  hospitalLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hospitalCity: {
    fontSize: 12,
    color: COLORS.sub,
  },
  hospitalRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  hospitalStats: {
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.sub,
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  revenueRow: {
    flexDirection: "row",
    gap: 12,
  },
  revenueItem: {
    flex: 1,
    alignItems: "center",
  },
  revenueLabel: {
    fontSize: 11,
    color: COLORS.sub,
    marginBottom: 4,
    textAlign: "center",
  },
  revenueValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  hospitalFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
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