import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { MONTH_OPTIONS, YEAR_OPTIONS } from '../../utils/yearMonth';

export type SurgeryDataItem = {
  SurgeryType: string;
  PatientCount: number;
};

export type SurgeryChartProps = {
  data: SurgeryDataItem[];
  year: string;
  month: string;
  onYearChange: (y: string) => void;
  onMonthChange: (m: string) => void;
};

const SurgeryChart: React.FC<SurgeryChartProps> = ({
  data,
  year,
  month,
  onYearChange,
  onMonthChange,
}) => {
  // Transform API data and generate colors
  const { chartData, colors } = React.useMemo(() => {
    const chartData = data.map(item => ({
      x: item.SurgeryType,
      y: item.PatientCount,
    }));
    
    const colors = chartData.map((item, idx) => {
      const hue = chartData.length ? (idx * (360 / chartData.length)) % 360 : 0;
      return `hsl(${hue}, 90%, 65%)`;
    });
    
    return { chartData, colors };
  }, [data]);

  // Calculate total for percentages
  const total = React.useMemo(
    () => data.reduce((sum, item) => sum + item.PatientCount, 0),
    [data]
  );

  // Calculate pie chart segments
  const pieSegments = React.useMemo(() => {
    if (total === 0) return [];
    
    let currentAngle = 0;
    return chartData.map((item, index) => {
      const percentage = item.y / total;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      return {
        ...item,
        percentage,
        startAngle,
        angle,
        color: colors[index],
      };
    });
  }, [chartData, total, colors]);

  // Chart dimensions
  const screenWidth = Dimensions.get('window').width;
  const chartSize = Math.min(screenWidth - 120, 150);
  const radius = chartSize / 2;
  const innerRadius = radius * 0.5;

  const formatLabel = (label: string): string =>
    label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const createArcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(radius, radius, radius, startAngle);
    const end = polarToCartesian(radius, radius, radius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M',
      start.x,
      start.y,
      'A',
      radius,
      radius,
      0,
      largeArcFlag,
      1,
      end.x,
      end.y,
      'L',
      radius,
      radius,
      'Z',
    ].join(' ');
  };

  if (!data || data.length === 0) {
    return (
      <View style={styles.chartCard}>
        {/* Header with filters even when no data, for consistency */}
        <View style={styles.header}>
          <Text style={styles.title}>Surgery Distribution</Text>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterBox}>
            <Picker
              selectedValue={year}
              mode="dialog"
              style={styles.filterPicker}
              dropdownIconColor="#0f172a"
              onValueChange={val => onYearChange(String(val))}
            >
              {YEAR_OPTIONS.map(y => (
                <Picker.Item key={y} label={y} value={y} />
              ))}
            </Picker>
          </View>

          <View style={styles.filterBox}>
            <Picker
              selectedValue={month}
              mode="dialog"
              style={styles.filterPicker}
              dropdownIconColor="#0f172a"
              onValueChange={val => onMonthChange(String(val))}
            >
              {MONTH_OPTIONS.map(m => (
                <Picker.Item key={m.value} label={m.label} value={m.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>📊</Text>
          <Text style={styles.noDataTitle}>No Surgery Data</Text>
          <Text style={styles.noDataText}>
            No surgery data available for selected period.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chartCard}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Surgery Distribution</Text>
        <Text style={styles.subtitle}>Total Procedures: {total}</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={styles.filterBox}>
          <Picker
            selectedValue={year}
            mode="dialog"
            style={styles.filterPicker}
            dropdownIconColor="#0f172a"
            onValueChange={val => onYearChange(String(val))}
          >
            {YEAR_OPTIONS.map(y => (
              <Picker.Item key={y} label={y} value={y} />
            ))}
          </Picker>
        </View>

        <View style={styles.filterBox}>
          <Picker
            selectedValue={month}
            mode="dialog"
            style={styles.filterPicker}
            dropdownIconColor="#0f172a"
            onValueChange={val => onMonthChange(String(val))}
          >
            {MONTH_OPTIONS.map(m => (
              <Picker.Item key={m.value} label={m.label} value={m.value} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Chart Container */}
      <View style={styles.chartWrapper}>
        <View style={styles.chartContainer}>
          <Svg width={chartSize} height={chartSize}>
            {/* Background circle */}
            <Circle
              cx={radius}
              cy={radius}
              r={radius}
              fill="#f8f9fa"
              stroke="#e9ecef"
              strokeWidth={1}
            />

            {/* Pie segments */}
            {pieSegments.map((segment, index) => (
              <Path
                key={index}
                d={createArcPath(
                  segment.startAngle,
                  segment.startAngle + segment.angle
                )}
                fill={segment.color}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}

            {/* Inner circle for donut effect */}
            <Circle cx={radius} cy={radius} r={innerRadius} fill="#ffffff" />
          </Svg>

          {/* Center text overlay */}
          <View
            style={[
              styles.centerCircle,
              {
                width: innerRadius * 1.8,
                height: innerRadius * 1.8,
              },
            ]}
          >
            <Text style={styles.centerTextTotal}>{total}</Text>
            <Text style={styles.centerTextLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Surgery Types</Text>

        <ScrollView
          style={styles.legendScrollView}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {data.map((item, index) => {
            const percentage =
              total > 0
                ? ((item.PatientCount / total) * 100).toFixed(1)
                : '0';
            const color = colors[index];

            return (
              <View
                key={`${item.SurgeryType}-${index}`}
                style={styles.legendItem}
              >
                <View style={styles.legendLeft}>
                  <View
                    style={[styles.legendColor, { backgroundColor: color }]}
                  />
                  <Text
                    style={styles.legendName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formatLabel(item.SurgeryType)}
                  </Text>
                </View>

                <View style={styles.legendRight}>
                  <Text style={styles.legendValue}>{item.PatientCount}</Text>
                  <Text style={styles.legendPercentage}>({percentage}%)</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    padding: 10,
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  // Filters row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
    marginBottom: 10,
  },
  filterBox: {
  flex: 1,
  minWidth: 80,
  height: 44,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: "#CBD5E1",
  flexDirection: "row",
  alignItems: "center",
  overflow: "hidden",
  backgroundColor: "#ffffff",
  justifyContent: "center",
  paddingHorizontal: 8,
},
  filterPicker: {
  flex: 1,
  height: 44,
  fontSize: 14,
  color: "#0f172a",
  marginLeft: 4,
  ...Platform.select({
    android: {
        marginVertical: 0,
        marginTop: 0,
    },
    ios: {
      marginTop: 0,
    },
  }),
},

  chartWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    position: 'absolute',
    borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  centerTextTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  centerTextLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: -1,
  },

  legendContainer: {
    flex: 1,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textAlign: 'center',
  },
  legendScrollView: {
    maxHeight: 120,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendName: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 45,
  },
  legendValue: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
    marginRight: 4,
  },
  legendPercentage: {
    fontSize: 9,
    color: '#64748b',
  },

  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  noDataIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  noDataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default SurgeryChart;
