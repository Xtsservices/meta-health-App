// components/dashboard/pieChart.tsx
import React, { useCallback, useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  Animated,
  ScrollView,
  AccessibilityInfo,
} from "react-native";
import Svg, { G, Path, Circle } from "react-native-svg";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import { useFocusEffect } from "@react-navigation/native";

// Responsive utilities
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  responsiveHeight,
} from "../../utils/responsive";

interface PieChartProps {
  selectedWardDataFilter: string;
}

interface ChartData {
  name: string;
  value: number; // percentage
  patients: number;
  color: string;
}

interface ApiResponse {
  ward: string;
  percentage: number;
}

/* ---------- SVG helpers ---------- */
const deg2rad = (d: number) => (d * Math.PI) / 180;

function polarToCartesian(centerX: number, centerY: number, radius: number, angleDeg: number) {
  const angleRad = deg2rad(angleDeg - 90); // 0 deg at top
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  // ensure angles are within 0..360
  let start = polarToCartesian(cx, cy, radius, endAngle);
  let end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

/* ---------- Component ---------- */
const PieChart: React.FC<PieChartProps> = ({ selectedWardDataFilter }) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Responsive sizing (from your utils)
  // Chart area width uses most of screen width minus paddings from your card/container
  const containerHorizontalPadding = SPACING.sm * 2; // aligns with card padding
  const chartMaxWidth = SCREEN_WIDTH - containerHorizontalPadding;
  const chartSize = Math.min(Math.max(240, Math.round(chartMaxWidth - 40)), Math.round(responsiveHeight(28))); // bounded size
  const outerRadius = chartSize / 2;
  const donutThickness = Math.max(20, Math.round(chartSize * 0.22));
  const innerRadius = Math.max(outerRadius - donutThickness, 12);
  const centerSize = Math.max(56, Math.round(innerRadius * 1.2)); // center overlay size

  // compute total patients for center text
  const totalPatients = data.reduce((s, d) => s + (d.patients || 0), 0);

  const getData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) {
        setError("Authentication required");
        setData([]);
        return;
      }

      const responseWard = await AuthFetch(
        `ward/${user.hospitalID}/distributionForStaff/${selectedWardDataFilter}?role=${user.role}&userID=${user.id}`,
        token
      );

      if (responseWard?.status === "success" && responseWard.data?.summary) {
        const summary: ApiResponse[] = responseWard.data.summary;
        const formatted: ChartData[] = summary.map((res, idx) => ({
          name: res.ward,
          value: Number(res.percentage),
          patients: Math.round(res.percentage), // original approach
          color: `hsl(${((idx * 360) / Math.max(1, summary.length)) % 360}, 90%, 65%)`,
        }));

        setData(formatted);

        // animate
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.95);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();

        AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
          if (enabled) {
            AccessibilityInfo.announceForAccessibility(`${formatted.length} wards loaded.`);
          }
        });
      } else {
        setData([]);
        setError("No data available");
      }
    } catch (err) {
      setError("Failed to load data");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.hospitalID,
    user?.token,
    selectedWardDataFilter,
    user?.role,
    user?.id,
    fadeAnim,
    scaleAnim,
  ]);

  // fetch on focus
  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      getData();
    }, [getData, fadeAnim, scaleAnim])
  );

  const formatWardName = (n: string) =>
    n ? n.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "";

  // prepare data for drawing
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 100;
  let accAngle = 0;

  // UI states
  const NoData = () => (
    <Animated.View style={[styles.noDataContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.noDataIcon}>📊</Text>
      <Text style={styles.noDataTitle}>No Ward Data</Text>
      <Text style={styles.noDataText}>No occupancy data available for selected period.</Text>
    </Animated.View>
  );
  const Loading = () => (
    <View style={styles.noDataContainer}>
      <ActivityIndicator size="large" color="#14b8a6" />
      <Text style={styles.noDataTitle}>Loading Data...</Text>
    </View>
  );
  const ErrorBox = () => (
    <View style={styles.noDataContainer}>
      <Text style={styles.noDataIcon}>⚠️</Text>
      <Text style={styles.noDataTitle}>Error Loading Data</Text>
      <Text style={styles.noDataText}>{error}</Text>
    </View>
  );

  if (isLoading) return <View style={styles.chartCard}><Loading /></View>;
  if (error) return <View style={styles.chartCard}><ErrorBox /></View>;
  if (!data || data.length === 0) return <View style={styles.chartCard}><NoData /></View>;

  const displayedLegends = data.slice(0, 5);

  return (
    <Animated.View style={[styles.chartCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* Chart area (centered) */}
      <View style={styles.chartWrapper}>
        <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
          <G>
            {/* Optional background ring (subtle) */}
            <Circle
              cx={chartSize / 2}
              cy={chartSize / 2}
              r={outerRadius - donutThickness / 2}
              fill="transparent"
              stroke="#ffffff"
              strokeWidth={donutThickness}
            />

            {/* slices drawn as stroked arcs */}
            {data.map((slice, idx) => {
              const startAngle = accAngle;
              const sweep = (slice.value / total) * 360;
              const endAngle = startAngle + sweep;
              const path = describeArc(chartSize / 2, chartSize / 2, outerRadius - donutThickness / 2, startAngle, endAngle);
              accAngle += sweep;
              return (
                <Path
                  key={`slice-${idx}`}
                  d={path}
                  stroke={slice.color}
                  strokeWidth={donutThickness}
                  strokeLinecap="butt"
                  fill="none"
                />
              );
            })}

            {/* center hole */}
            <Circle
              cx={chartSize / 2}
              cy={chartSize / 2}
              r={innerRadius - 1}
              fill="#fff"
              stroke="#f1f5f9"
              strokeWidth={1}
            />
          </G>
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendHeader}>
          <Text style={styles.legendTitle}>Ward Distribution</Text>
          {data.length > 5 && <Text style={styles.legendCount}>{data.length} total</Text>}
        </View>

        <View style={styles.scrollLegendContainer}>
          <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
            {displayedLegends.map((ward, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendColor, { backgroundColor: ward.color }]} />
                  <Text style={styles.legendName} numberOfLines={1}>
                    {formatWardName(ward.name)}
                  </Text>
                </View>
                <View style={styles.legendRight}>
                  <Text style={styles.legendValue}>{ward.value}%</Text>
                  <Text style={styles.legendPatients}>({ward.patients})</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {data.length > 5 && (
            <View style={styles.moreIndicator}>
              <Text style={styles.moreText}>Scroll to see all {data.length} wards</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  chartWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
  },
  centerOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    zIndex: 3,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  centerTitle: {
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 2,
  },
  centerValue: {
    color: "#14b8a6",
    fontWeight: "700",
  },
  centerSubtitle: {
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },

  legendContainer: {
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  legendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  legendTitle: {
    fontSize: Math.max(13, FONT_SIZE.md),
    fontWeight: "600",
    color: "#374151",
  },
  legendCount: {
    fontSize: Math.max(11, FONT_SIZE.xs),
    color: "#64748b",
    fontWeight: "500",
  },
  scrollLegendContainer: {
    maxHeight: Math.round(responsiveHeight(24)),
  },
  legendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  legendColor: {
    width: Math.max(10, Math.round(ICON_SIZE.sm * 0.8)),
    height: Math.max(10, Math.round(ICON_SIZE.sm * 0.8)),
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  legendName: {
    fontSize: Math.max(12, FONT_SIZE.sm),
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  legendRight: {
    marginLeft: SPACING.xs,
    alignItems: "flex-end",
  },
  legendValue: {
    fontSize: Math.max(12, FONT_SIZE.sm),
    color: "#111827",
    fontWeight: "600",
  },
  legendPatients: {
    fontSize: Math.max(11, FONT_SIZE.xs),
    color: "#64748b",
    marginTop: 2,
  },

  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
  },
  noDataIcon: {
    fontSize: Math.max(28, FONT_SIZE.xl),
    marginBottom: SPACING.xs,
  },
  noDataTitle: {
    fontSize: Math.max(14, FONT_SIZE.md),
    fontWeight: "600",
    color: "#374151",
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  noDataText: {
    fontSize: Math.max(12, FONT_SIZE.sm),
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  moreIndicator: {
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  moreText: {
    fontSize: Math.max(10, FONT_SIZE.xs),
    color: "#94a3b8",
    fontStyle: "italic",
  },
});

export default PieChart;
