// components/dashboard/pieChart.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions,
  ActivityIndicator,
  Animated,
  ScrollView
} from 'react-native';
import { PieChart as RNPieChart } from 'react-native-chart-kit';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthFetch } from '../../auth/auth';

interface PieChartProps {
  selectedWardDataFilter: string;
}

interface ChartData {
  name: string;
  value: number;
  patients: number;
  color: string;
}

interface ApiResponse {
  ward: string;
  percentage: number;
}

const PieChart: React.FC<PieChartProps> = ({ selectedWardDataFilter }) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 96;
  const chartHeight = 220;
  const getData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) {
        setError("Authentication required");
        return;
      }

      const responseWard = await AuthFetch(
        `ward/${user.hospitalID}/distributionForStaff/${selectedWardDataFilter}?role=${user.role}&userID=${user.id}`,
        token
      );

      if (responseWard?.status === "success" && responseWard.data?.summary) {
        const formattedData = responseWard.data.summary.map((res: ApiResponse, index: number) => {
          const patientsCount = Math.round(res.percentage);
          return {
            name: res.ward,
            value: Number(res.percentage),
            patients: patientsCount,
            color: `hsl(${((index * 360) / responseWard.data.summary.length) % 360}, 90%, 65%)`,
          };
        });
        setData(formattedData);
        
        // Start animation when data loads
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          })
        ]).start();
      } else {
        setData([]);
        setError("No data available");
      }
    } catch (error) {
      setError("Failed to load data");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

useEffect(() => {
  fadeAnim.setValue(0);
  scaleAnim.setValue(0.8);
  getData();
}, [selectedWardDataFilter]);

  // Format ward names for better display
  const formatWardName = (name: string): string => {
    if (!name) return '';
    return name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Prepare data for react-native-chart-kit
  const chartData = data?.map(item => ({
    name: formatWardName(item.name),
    population: item.value,
    color: item.color,
    legendFontColor: '#64748b',
    legendFontSize: 10
  }));

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  // No Data Component
  const NoDataMessage = () => (
    <Animated.View 
      style={[
        styles.noDataContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <Text style={styles.noDataIcon}>📊</Text>
      <Text style={styles.noDataTitle}>No Ward Data</Text>
      <Text style={styles.noDataText}>
        No occupancy data available for selected period.
      </Text>
    </Animated.View>
  );

  // Loading Component
  const LoadingMessage = () => (
    <View style={styles.noDataContainer}>
      <ActivityIndicator size="large" color="#14b8a6" />
      <Text style={styles.noDataTitle}>Loading Data...</Text>
    </View>
  );

  // Error Component
  const ErrorMessage = () => (
    <View style={styles.noDataContainer}>
      <Text style={styles.noDataIcon}>⚠️</Text>
      <Text style={styles.noDataTitle}>Error Loading Data</Text>
      <Text style={styles.noDataText}>{error}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.chartCard}>
        <LoadingMessage />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.chartCard}>
        <ErrorMessage />
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.chartCard}>
        <NoDataMessage />
      </View>
    );
  }

  // Show only first 5 legend items in scrollable area
  const displayedLegends = data.slice(0, 5);

  return (
    <Animated.View 
      style={[
        styles.chartCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {/* Chart Container */}
      <View style={[styles.chartContainer, { paddingLeft: 105 }]}>
        <RNPieChart
          data={chartData}
          width={chartWidth}
          height={180}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
          absolute={false}
          hasLegend={false}
        />
        <View style={styles.centerCircle}>
          <Text style={styles.centerText}></Text>
        </View>
      </View>

      {/* Legend Container - FIXED: Now shows only 5 items and scrollable */}
      <View style={styles.legendContainer}>
        <View style={styles.legendHeader}>
          <Text style={styles.legendTitle}>Ward Distribution</Text>
          {data.length > 5 && (
            <Text style={styles.legendCount}>
              {data.length} total
            </Text>
          )}
        </View>
        
        {displayedLegends.length === 0 ? (
          <Text style={styles.noLegendsText}>No ward data available</Text>
        ) : (
          <View style={styles.scrollLegendContainer}>
            <ScrollView 
              style={styles.legendScrollView}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {displayedLegends?.map((ward, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={styles.legendLeft}>
                    <View 
                      style={[
                        styles.legendColor, 
                        { backgroundColor: ward.color }
                      ]} 
                    />
                    <Text style={styles.legendName} numberOfLines={1}>
                      {formatWardName(ward.name)}
                    </Text>
                  </View>
                  <View style={styles.legendRight}>
                    <Text style={styles.legendValue}>
                      {ward.value}%
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {/* Show indicator if there are more than 5 wards */}
            {data.length > 5 && (
              <View style={styles.moreIndicator}>
                <Text style={styles.moreText}>
                  Scroll to see all {data.length} wards
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    height: 180,
    position: 'relative',
  },
  centerCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    zIndex: 1,
  },
  centerText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '300',
  },
  legendContainer: {
    gap: 8,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  legendCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollLegendContainer: {
    maxHeight: 200, // Fixed height for scrollable area
  },
  legendScrollView: {
    flexGrow: 0, // Prevent expanding
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  legendRight: {
    marginLeft: 8,
  },
  legendValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  noLegendsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 16,
  },
  moreIndicator: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  moreText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  // Existing styles
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PieChart;