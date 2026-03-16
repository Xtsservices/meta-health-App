import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";

interface Item { day?: string; label?: string; count?: number; value?: number; }
interface Props { data: Item[]; }

const { width: W } = Dimensions.get("window");

const WeeklyBarChart: React.FC<Props> = ({ data }) => {
  const max = useMemo(
    () => Math.max(1, ...(data?.map(d => Number(d.count ?? d.value ?? 0)) || [1])),
    [data]
  );
  const safe = (n: any) => Number(n) || 0;

  // Y-axis labels (unchanged)
  const yAxisLabels = useMemo(() => {
    const step = max / 4;
    return [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => Math.round(v));
  }, [max]);

  // 👇 Only change: fixed X-axis labels
  const baseWeeks = ["W1", "W2", "W3", "W4"];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Weekly Performance </Text>
      <Text style={styles.subHeading}>This month overview </Text>

      
      {!data?.length ? (
        <Text style={styles.noDataText}>No weekly data</Text>
      ) : (
        <View style={styles.chartContainer}>
          {/* Y-axis labels (as-is) */}
          <View style={styles.yAxis}>
            {yAxisLabels.map((label, i) => (
              <Text key={i} style={styles.yAxisLabel}>{label}</Text>
            ))}
          </View>

          {/* Chart area with bars and X-axis */}
          <View style={styles.chartArea}>
            {/* Bars (as-is, from your data) */}
            <View style={styles.weekRow}>
              {data.map((d, i) => {
                const label = d?.day ?? d?.label ?? `D${i + 1}`;
                const val = safe(d?.count ?? d?.value);
                const h = Math.max(2, (val / max) * 130);
                return (
                  <View key={`${label}-${i}`} style={styles.weekCol}>
                    <View style={[styles.weekBar, { height: h }]} />
                  </View>
                );
              })}
            </View>

            {/* X-axis line */}
            <View style={styles.xAxisLine} />

            {/* X-axis labels (always W1..W4) */}
            <View style={styles.xAxisLabels}>
              {baseWeeks.map((w, i) => (
                <Text key={`label-${i}`} numberOfLines={1} style={styles.xAxisLabel}>
                  {w}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default WeeklyBarChart;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: { color: "black", fontSize: 16, fontWeight: "700" },
  subHeading: {color: "#6B7280", fontSize: 16, fontWeight: "400"},
  chartContainer: { flexDirection: "row", gap: 8 },
  yAxis: { justifyContent: "space-between", height: 150, paddingVertical: 2 },
  yAxisLabel: { color: "#6B7280", fontSize: 10, width: 30, textAlign: "right" },
  chartArea: { flex: 1 },
  weekRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 130, paddingHorizontal: 6 },
  weekCol: { alignItems: "center", justifyContent: "flex-end", flex: 1, maxWidth: 50 },
  weekBar: { width: "60%", backgroundColor: "#3B82F6", borderTopLeftRadius: 8, borderTopRightRadius: 8, minHeight: 2 },
  xAxisLine: { height: 1, backgroundColor: "#E5E7EB", marginHorizontal: 6 },
  xAxisLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingTop: 4 },
  xAxisLabel: { color: "#6B7280", fontSize: 10, flex: 1, textAlign: "center", maxWidth: 50 },
  noDataText: { color: "#9FB2D9", fontSize: 12, paddingVertical: 12, textAlign: "center" },
});
