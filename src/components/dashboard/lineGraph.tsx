// import React, { useMemo, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Dimensions,
// } from "react-native";
// import { ChevronLeft, ChevronRight } from "lucide-react-native";

// type XY = { x: number | string; y: number };

// interface Props {
//   actualData: XY[];
//   scheduledData: XY[];
//   year: string;
//   month: string; // "0" = All
//   onYearChange: (y: string) => void;
//   onMonthChange: (m: string) => void;
// }

// const { width: W } = Dimensions.get("window");

// const BarChartActualScheduled: React.FC<Props> = ({
//   actualData,
//   scheduledData,
//   year,
//   month,
//   onYearChange,
//   onMonthChange,
// }) => {
//   const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

//   const monthNames = [
//     "All",
//     "Jan",
//     "Feb",
//     "Mar",
//     "Apr",
//     "May",
//     "Jun",
//     "Jul",
//     "Aug",
//     "Sep",
//     "Oct",
//     "Nov",
//     "Dec",
//   ];

//   // Unify labels in display order
//   const labels = useMemo(() => {
//     const a = actualData?.map((d) => String(d.x)) ?? [];
//     const s = scheduledData?.map((d) => String(d.x)) ?? [];
//     const merged = Array.from(new Set([...a, ...s]));
//     const allNumeric = merged.every((l) => /^\d+$/.test(l));
//     return allNumeric ? merged.map(Number).sort((x, y) => x - y).map(String) : merged;
//   }, [actualData, scheduledData]);

//   const maxY = useMemo(() => {
//     const a = actualData?.map((d) => Number(d.y) || 0) ?? [];
//     const s = scheduledData?.map((d) => Number(d.y) || 0) ?? [];
//     const m = Math.max(1, ...a, ...s);
//     return Math.ceil(m * 1.1);
//   }, [actualData, scheduledData]);

//   const totalActual = useMemo(
//     () => (actualData || []).reduce((acc, d) => acc + (Number(d.y) || 0), 0),
//     [actualData]
//   );
//   const totalScheduled = useMemo(
//     () => (scheduledData || []).reduce((acc, d) => acc + (Number(d.y) || 0), 0),
//     [scheduledData]
//   );

//   // Map label->value series aligned to labels
//   const series = (arr: XY[]) =>
//     labels.map((l) => {
//       const f = arr.find((d) => String(d.x) === l);
//       return Number(f?.y ?? 0);
//     });

//   const aVals = series(actualData);
//   const sVals = series(scheduledData);

//   const handleYear = (dir: 1 | -1) => onYearChange(String(Number(year) + dir));
//   const handleMonth = (dir: 1 | -1) => {
//     const m = Number(month);
//     if (m === 0 && dir === -1) return onMonthChange("12");
//     const next = m + dir;
//     if (next < 0) onMonthChange("12");
//     else if (next > 12) onMonthChange("0");
//     else onMonthChange(String(next));
//   };

//   const barWidth = 20;
//   const barGap = 4;
//   const groupWidth = barWidth * 2 + barGap;
//   const groupGap = 24;
//   const totalWidth = labels.length * (groupWidth + groupGap);

//   return (
//     <View style={styles.card}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Text style={styles.title}>Actual vs Scheduled</Text>
//       </View>

//       {/* Controls */}
//       <View style={styles.controlsRow}>
//         <View style={styles.pill}>
//           <Text style={styles.pillLabel}>Year</Text>
//           <TouchableOpacity onPress={() => handleYear(-1)} style={styles.pillBtn}>
//             <ChevronLeft size={14} color="#64748B" />
//           </TouchableOpacity>
//           <Text style={styles.pillValue}>{year}</Text>
//           <TouchableOpacity onPress={() => handleYear(1)} style={styles.pillBtn}>
//             <ChevronRight size={14} color="#64748B" />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.pill}>
//           <Text style={styles.pillLabel}>Month</Text>
//           <TouchableOpacity onPress={() => handleMonth(-1)} style={styles.pillBtn}>
//             <ChevronLeft size={14} color="#64748B" />
//           </TouchableOpacity>
//           <Text style={styles.pillValue}>
//             {monthNames[Number(month)] ?? String(month)}
//           </Text>
//           <TouchableOpacity onPress={() => handleMonth(1)} style={styles.pillBtn}>
//             <ChevronRight size={14} color="#64748B" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Summary Cards */}
//       <View style={styles.summaryRow}>
//         <View style={[styles.summaryCard, { backgroundColor: "#EFF6FF" }]}>
//           <View style={styles.summaryHeader}>
//             <View style={[styles.summaryDot, { backgroundColor: "#3B82F6" }]} />
//             <Text style={styles.summaryLabel}>Actual</Text>
//           </View>
//           <Text style={styles.summaryValue}>{totalActual}</Text>
//         </View>

//         <View style={[styles.summaryCard, { backgroundColor: "#ECFDF5" }]}>
//           <View style={styles.summaryHeader}>
//             <View style={[styles.summaryDot, { backgroundColor: "#10B981" }]} />
//             <Text style={styles.summaryLabel}>Scheduled</Text>
//           </View>
//           <Text style={styles.summaryValue}>{totalScheduled}</Text>
//         </View>

//         <View style={[styles.summaryCard, { backgroundColor: "#F8FAFC" }]}>
//           <Text style={styles.summaryLabel}>Difference</Text>
//           <Text
//             style={[
//               styles.summaryValue,
//               {
//                 color:
//                   totalActual - totalScheduled > 0
//                     ? "#10B981"
//                     : totalActual - totalScheduled < 0
//                     ? "#EF4444"
//                     : "#64748B",
//               },
//             ]}
//           >
//             {totalActual - totalScheduled > 0 ? "+" : ""}
//             {totalActual - totalScheduled}
//           </Text>
//         </View>
//       </View>

//       {/* Chart */}
//       <View style={styles.chartContainer}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{ paddingHorizontal: 16 }}
//         >
//           <View style={[styles.chartContent, { width: Math.max(W - 32, totalWidth) }]}>
//             {/* Grid lines */}
//             <View style={styles.gridContainer}>
//               {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
//                 <View key={i} style={[styles.gridLine, { bottom: `${ratio * 100}%` }]}>
//                   <Text style={styles.gridLabel}>{Math.round(maxY * ratio)}</Text>
//                   <View style={styles.gridDash} />
//                 </View>
//               ))}
//             </View>

//             {/* Bars */}
//             <View style={styles.barsContainer}>
//               {labels.map((label, idx) => {
//                 const actual = aVals[idx] || 0;
//                 const scheduled = sVals[idx] || 0;
//                 const actualHeight = (actual / maxY) * 100;
//                 const scheduledHeight = (scheduled / maxY) * 100;
//                 const isSelected = selectedIdx === idx;

//                 return (
//                   <TouchableOpacity
//                     key={idx}
//                     activeOpacity={0.7}
//                     onPress={() => setSelectedIdx(isSelected ? null : idx)}
//                     style={[
//                       styles.barGroup,
//                       { width: groupWidth, marginRight: idx < labels.length - 1 ? groupGap : 0 },
//                     ]}
//                   >
//                     {/* Actual bar */}
//                     <View style={styles.barColumn}>
//                       <View
//                         style={[
//                           styles.bar,
//                           {
//                             height: `${actualHeight}%`,
//                             backgroundColor: isSelected ? "#2563EB" : "#3B82F6",
//                             width: barWidth,
//                           },
//                         ]}
//                       >
//                         {isSelected && (
//                           <View style={styles.valueLabel}>
//                             <Text style={styles.valueLabelText}>{actual}</Text>
//                           </View>
//                         )}
//                       </View>
//                     </View>

//                     {/* Scheduled bar */}
//                     <View style={styles.barColumn}>
//                       <View
//                         style={[
//                           styles.bar,
//                           {
//                             height: `${scheduledHeight}%`,
//                             backgroundColor: isSelected ? "#059669" : "#10B981",
//                             width: barWidth,
//                           },
//                         ]}
//                       >
//                         {isSelected && (
//                           <View style={styles.valueLabel}>
//                             <Text style={styles.valueLabelText}>{scheduled}</Text>
//                           </View>
//                         )}
//                       </View>
//                     </View>

//                     {/* X-axis label */}
//                     <Text style={styles.xAxisLabel}>{label}</Text>
//                   </TouchableOpacity>
//                 );
//               })}
//             </View>
//           </View>
//         </ScrollView>
//       </View>

//       {/* Legend */}
//       <View style={styles.legendRow}>
//         <View style={styles.legendItem}>
//           <View style={[styles.legendBox, { backgroundColor: "#3B82F6" }]} />
//           <Text style={styles.legendText}>Actual</Text>
//         </View>
//         <View style={styles.legendItem}>
//           <View style={[styles.legendBox, { backgroundColor: "#10B981" }]} />
//           <Text style={styles.legendText}>Scheduled</Text>
//         </View>
//         <Text style={styles.legendHint}>Tap bars to see values</Text>
//       </View>
//     </View>
//   );
// };

// export default BarChartActualScheduled;

// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 12,
//     padding: 16,
//     gap: 16,
//     shadowColor: "#000",
//     shadowOpacity: 0.06,
//     shadowRadius: 10,
//     shadowOffset: { width: 0, height: 2 },
//     elevation: 3,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//   },

//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   title: {
//     color: "#0F172A",
//     fontSize: 18,
//     fontWeight: "700",
//     letterSpacing: -0.3,
//   },

//   controlsRow: {
//     flexDirection: "row",
//     gap: 8,
//     flexWrap: "wrap",
//   },
//   pill: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#F8FAFC",
//     borderRadius: 8,
//     paddingHorizontal: 8,
//     height: 36,
//     gap: 4,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//   },
//   pillLabel: {
//     color: "#64748B",
//     fontSize: 11,
//     fontWeight: "600",
//     textTransform: "uppercase",
//   },
//   pillBtn: {
//     padding: 4,
//   },
//   pillValue: {
//     color: "#0F172A",
//     fontSize: 14,
//     fontWeight: "700",
//     minWidth: 32,
//     textAlign: "center",
//   },

//   summaryRow: {
//     flexDirection: "row",
//     gap: 8,
//   },
//   summaryCard: {
//     flex: 1,
//     padding: 12,
//     borderRadius: 8,
//     gap: 6,
//   },
//   summaryHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   summaryDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//   },
//   summaryLabel: {
//     color: "#64748B",
//     fontSize: 11,
//     fontWeight: "600",
//   },
//   summaryValue: {
//     color: "#0F172A",
//     fontSize: 20,
//     fontWeight: "700",
//     letterSpacing: -0.5,
//   },

//   chartContainer: {
//     height: 220,
//     marginHorizontal: -16,
//   },
//   chartContent: {
//     height: 200,
//     position: "relative",
//   },

//   gridContainer: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     top: 0,
//     bottom: 30,
//   },
//   gridLine: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   gridLabel: {
//     color: "#94A3B8",
//     fontSize: 10,
//     width: 30,
//     textAlign: "right",
//   },
//   gridDash: {
//     flex: 1,
//     height: 1,
//     backgroundColor: "#E2E8F0",
//     marginLeft: 8,
//   },

//   barsContainer: {
//     flexDirection: "row",
//     alignItems: "flex-end",
//     height: 170,
//     paddingLeft: 42,
//   },
//   barGroup: {
//     flexDirection: "row",
//     alignItems: "flex-end",
//     height: "100%",
//     gap: 4,
//   },
//   barColumn: {
//     flex: 1,
//     justifyContent: "flex-end",
//     alignItems: "center",
//   },
//   bar: {
//     borderRadius: 4,
//     position: "relative",
//     minHeight: 2,
//   },
//   valueLabel: {
//     position: "absolute",
//     top: -24,
//     backgroundColor: "#0F172A",
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 4,
//     alignSelf: "center",
//   },
//   valueLabelText: {
//     color: "#FFFFFF",
//     fontSize: 10,
//     fontWeight: "700",
//   },
//   xAxisLabel: {
//     position: "absolute",
//     bottom: -22,
//     left: 0,
//     right: 0,
//     textAlign: "center",
//     color: "#64748B",
//     fontSize: 10,
//     fontWeight: "600",
//   },

//   legendRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 16,
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: "#F1F5F9",
//   },
//   legendItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   legendBox: {
//     width: 12,
//     height: 12,
//     borderRadius: 2,
//   },
//   legendText: {
//     color: "#475569",
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   legendHint: {
//     color: "#94A3B8",
//     fontSize: 11,
//     fontStyle: "italic",
//     marginLeft: "auto",
//   },
// });

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

type XY = { x: number | string; y: number };

interface Props {
  actualData: XY[];
  scheduledData: XY[];
  year: string;
  month: string; // "0" = All
  onYearChange: (y: string) => void;
  onMonthChange: (m: string) => void;
}

const { width: W } = Dimensions.get("window");

function daysInMonth(yearNum: number, monthNum1to12: number) {
  return new Date(yearNum, monthNum1to12, 0).getDate(); // month is 1..12
}

const BarChartActualScheduled: React.FC<Props> = ({
  actualData,
  scheduledData,
  year,
  month,
  onYearChange,
  onMonthChange,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const monthNames = [
    "All",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Build label set
  const labels = useMemo(() => {
    const yNum = Number(year);
    const mNum = Number(month);
    // If a specific month is chosen, render every date of that month (1..N)
    if (!Number.isNaN(yNum) && !Number.isNaN(mNum) && mNum >= 1 && mNum <= 12) {
      const dim = daysInMonth(yNum, mNum);
      return Array.from({ length: dim }, (_, i) => String(i + 1));
    }

    // Otherwise keep previous behavior (union of labels, numeric sort if applicable)
    const a = actualData?.map((d) => String(d.x)) ?? [];
    const s = scheduledData?.map((d) => String(d.x)) ?? [];
    const merged = Array.from(new Set([...a, ...s]));
    const allNumeric = merged.every((l) => /^\d+$/.test(l));
    return allNumeric ? merged.map(Number).sort((x, y2) => x - y2).map(String) : merged;
  }, [actualData, scheduledData, month, year]);

  const maxY = useMemo(() => {
    const a = actualData?.map((d) => Number(d.y) || 0) ?? [];
    const s = scheduledData?.map((d) => Number(d.y) || 0) ?? [];
    const m = Math.max(1, ...a, ...s);
    return Math.ceil(m * 1.1);
  }, [actualData, scheduledData]);

  const totalActual = useMemo(
    () => (actualData || []).reduce((acc, d) => acc + (Number(d.y) || 0), 0),
    [actualData]
  );
  const totalScheduled = useMemo(
    () => (scheduledData || []).reduce((acc, d) => acc + (Number(d.y) || 0), 0),
    [scheduledData]
  );

  // Align data to labels
  const series = (arr: XY[]) =>
    labels.map((l) => {
      const f = arr.find((d) => String(d.x) === l);
      return Number(f?.y ?? 0);
    });

  const aVals = series(actualData);
  const sVals = series(scheduledData);

  const handleYear = (dir: 1 | -1) => onYearChange(String(Number(year) + dir));
  const handleMonth = (dir: 1 | -1) => {
    const m = Number(month);
    if (m === 0 && dir === -1) return onMonthChange("12");
    const next = m + dir;
    if (next < 0) onMonthChange("12");
    else if (next > 12) onMonthChange("0");
    else onMonthChange(String(next));
  };

  // Keep original spacing calculations
  const barWidth = 20;
  const barGap = 4;
  const groupWidth = barWidth * 2 + barGap;
  const groupGap = 24;
  const totalWidth = labels.length * (groupWidth + groupGap);

  // Chart geometry
  const chartHeight = 170;
  const leftPad = 42; // matches barsContainer paddingLeft
  const getY = (val: number) => {
    const ratio = Math.max(0, Math.min(1, val / maxY));
    return chartHeight - ratio * chartHeight;
  };
  const getX = (idx: number) => leftPad + idx * (groupWidth + groupGap) + groupWidth / 2;

  // Segment renderer (no extra libs)
  const Segment = ({
    x1,
    y1,
    x2,
    y2,
    color,
    thickness = 2,
  }: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    thickness?: number;
  }) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const angle = Math.atan2(dy, dx);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return (
      <View
        style={{
          position: "absolute",
          left: mx - len / 2,
          top: my - thickness / 2,
          width: len,
          height: thickness,
          backgroundColor: color,
          transform: [{ rotateZ: `${angle}rad` }],
          borderRadius: thickness,
        }}
      />
    );
  };

  const colorActual = "#3B82F6";
  const colorActualSel = "#2563EB";
  const colorSched = "#10B981";
  const colorSchedSel = "#059669";

  // Helper: does this index have any data?
  const hasDataAt = (idx: number) => (aVals[idx] || 0) > 0 || (sVals[idx] || 0) > 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Patient Visit Trends</Text>
        <Text style={styles.subTitle}>Daily visits vs scheduled appointments</Text>

      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Year</Text>
          <TouchableOpacity onPress={() => handleYear(-1)} style={styles.pillBtn}>
            <ChevronLeft size={14} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.pillValue}>{year}</Text>
          <TouchableOpacity onPress={() => handleYear(1)} style={styles.pillBtn}>
            <ChevronRight size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Month</Text>
          <TouchableOpacity onPress={() => handleMonth(-1)} style={styles.pillBtn}>
            <ChevronLeft size={14} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.pillValue}>
            {monthNames[Number(month)] ?? String(month)}
          </Text>
          <TouchableOpacity onPress={() => handleMonth(1)} style={styles.pillBtn}>
            <ChevronRight size={14} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: "#EFF6FF" }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryDot, { backgroundColor: "#3B82F6" }]} />
            <Text style={styles.summaryLabel}>Actual</Text>
          </View>
          <Text style={styles.summaryValue}>{totalActual}</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: "#ECFDF5" }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.summaryLabel}>Scheduled</Text>
          </View>
          <Text style={styles.summaryValue}>{totalScheduled}</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <View style={[styles.chartContent, { width: Math.max(W - 32, totalWidth) }]}>
            {/* Grid lines */}
            <View style={styles.gridContainer}>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <View key={i} style={[styles.gridLine, { bottom: `${ratio * 100}%` }]}>
                  <Text style={styles.gridLabel}>{Math.round(maxY * ratio)}</Text>
                  <View style={styles.gridDash} />
                </View>
              ))}
            </View>

            {/* Lines + Points overlay */}
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 30,
                top: 0,
              }}
            >
              {/* Actual segments */}
              {labels.map((_, i) => {
                if (i === 0) return null;
                const x1 = getX(i - 1);
                const x2 = getX(i);
                const y1 = getY(aVals[i - 1] || 0);
                const y2 = getY(aVals[i] || 0);
                return (
                  <Segment
                    key={`a-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    color={colorActual}
                    thickness={2}
                  />
                );
              })}

              {/* Scheduled segments */}
              {labels.map((_, i) => {
                if (i === 0) return null;
                const x1 = getX(i - 1);
                const x2 = getX(i);
                const y1 = getY(sVals[i - 1] || 0);
                const y2 = getY(sVals[i] || 0);
                return (
                  <Segment
                    key={`s-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    color={colorSched}
                    thickness={2}
                  />
                );
              })}

              {/* Points, tap zones, value chips */}
              {labels.map((_, idx) => {
                const ax = getX(idx);
                const ay = getY(aVals[idx] || 0);
                const sx = getX(idx);
                const sy = getY(sVals[idx] || 0);
                const isSelected = selectedIdx === idx;
                const hasData = hasDataAt(idx);

                return (
                  <View key={`pt-${idx}`}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => hasData && setSelectedIdx(isSelected ? null : idx)}
                      style={{
                        position: "absolute",
                        left: ax - groupWidth / 2,
                        bottom: 0,
                        width: groupWidth,
                        height: chartHeight,
                      }}
                    />

                    {aVals[idx] > 0 && (
                      <View
                        style={{
                          position: "absolute",
                          left: ax - 4,
                          top: ay - 4,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: isSelected ? colorActualSel : colorActual,
                        }}
                      />
                    )}

                    {sVals[idx] > 0 && (
                      <View
                        style={{
                          position: "absolute",
                          left: sx - 4,
                          top: sy - 4,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: isSelected ? colorSchedSel : colorSched,
                        }}
                      />
                    )}

                    {isSelected && hasData && (
                      <>
                        {aVals[idx] > 0 && (
                          <View
                            style={[
                              styles.valueLabel,
                              { left: ax - 18, top: ay - 32, position: "absolute", zIndex: 5 },
                            ]}
                          >
                            <Text style={styles.valueLabelText}>{aVals[idx]}</Text>
                          </View>
                        )}
                        {sVals[idx] > 0 && (
                          <View
                            style={[
                              styles.valueLabel,
                              { left: sx - 18, top: sy - 32, position: "absolute", zIndex: 5 },
                            ]}
                          >
                            <Text style={styles.valueLabelText}>{sVals[idx]}</Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                );
              })}
            </View>

            {/* ✅ Dedicated X-axis label layer fixed to the bottom */}
            <View style={styles.xAxisLayer}>
              {labels.map((label, idx) => {
                const ax = getX(idx);
                return (
                  <Text
                    key={`xl-${idx}`}
                    style={[
                      styles.xAxisLabel,
                      { position: "absolute", left: ax - 20, width: 40, textAlign: "center", top: 8 },
                    ]}
                  >
                    {label}
                  </Text>
                );
              })}
            </View>

            {/* Spacer (kept from original) */}
            <View style={[styles.barsContainer, { paddingLeft: leftPad }]} />
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.legendText}>Actual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: "#10B981" }]} />
          <Text style={styles.legendText}>Scheduled</Text>
        </View>
        {/* <Text style={styles.legendHint}>Tap points to see values</Text> */}
      </View>
    </View>
  );
};

export default BarChartActualScheduled;

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

  header: {
    flexDirection: "column",
    justifyContent: "space-between",
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subTitle: {
color: "#7a87a4ff",
    fontSize: 18,
    fontWeight: "400",
    
  },

  controlsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  pillBtn: {
    padding: 4,
  },
  pillValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    minWidth: 32,
    textAlign: "center",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  chartContainer: {
    height: 220,
    marginHorizontal: -16,
  },
  chartContent: {
    height: 200,
    position: "relative",
  },

  gridContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 30, // reserve a 30px band for X-axis labels
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  gridLabel: {
    color: "#94A3B8",
    fontSize: 10,
    width: 30,
    textAlign: "right",
  },
  gridDash: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
    marginLeft: 8,
  },

  // Spacer container retained from original
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 170,
    paddingLeft: 42,
  },

  // Bottom X-axis label layer
  xAxisLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
  },

  valueLabel: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "center",
  },
  valueLabelText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  xAxisLabel: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
  },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  legendHint: {
    color: "#94A3B8",
    fontSize: 11,
    fontStyle: "italic",
    marginLeft: "auto",
  },
});
