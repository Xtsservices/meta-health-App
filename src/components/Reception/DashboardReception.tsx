import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  Heart,
  Stethoscope,
  Calendar,
  Users,
  UserPlus,
  ChevronDown,
  Menu as MenuIcon,
  LayoutDashboard,
  FileText,
  HelpCircle,
  LogOut,
  Grid,
  BellRing,
  Receipt,
  Bed,
} from 'lucide-react-native';
import { PieChart } from 'react-native-chart-kit';

import { RootState } from '../../store/store';
import { AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Footer from '../dashboard/footer';
import Sidebar, { SidebarItem } from '../Sidebar/sidebarReception';
import { useNavigation } from '@react-navigation/native';
import Notes from '../dashboard/Notes';

interface DeptCount {
  department: string;
  count: number;
}

interface DashboardStats {
  thisMonth: number;
  thisYear: number;
}

const { width: W, height: H } = Dimensions.get('window');
const isSmallScreen = W < 375;
const isLargeScreen = W > 414;

const HeaderBar: React.FC<{ title: string; onMenu: () => void }> = ({ title, onMenu }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn}>
        <MenuIcon size={isSmallScreen ? 24 : 30} color="#ffffffff" />
      </TouchableOpacity>
    </View>
  );
};

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}> = ({ title, value, icon: Icon, color }) => (
  <View style={[styles.statCard, { backgroundColor: `${color}15` }]}>
    <View style={styles.statContent}>
      <View style={styles.statInfo}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={[styles.statIcon, { backgroundColor: `${color}30` }]}>
        <Icon size={isSmallScreen ? 24 : 28} color={color} />
      </View>
    </View>
  </View>
);

const FilterSelect: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}> = ({ value, options, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <View style={styles.filterSelectContainer}>
      <TouchableOpacity 
        style={styles.filterSelect}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.filterSelectText}>{selectedOption.label}</Text>
        <ChevronDown size={isSmallScreen ? 14 : 16} color="#6b7280" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.filterDropdown}>
          <ScrollView style={styles.filterDropdownScroll} nestedScrollEnabled>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  index === options.length - 1 && styles.filterOptionLast
                ]}
                onPress={() => {
                  onValueChange(option.value);
                  setIsOpen(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  value === option.value && styles.filterOptionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const ChartCard: React.FC<{ 
  title: string; 
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  onYearChange?: (year: string) => void;
  onMonthChange?: (month: string) => void;
  selectedYear?: string;
  selectedMonth?: string;
}> = ({ 
  title, 
  icon: Icon, 
  iconColor, 
  children, 
  onYearChange, 
  onMonthChange, 
  selectedYear, 
  selectedMonth 
}) => {
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2015;
    return Array.from({ length: currentYear - startYear + 1 }, (_, i) => ({
      value: String(currentYear - i),
      label: String(currentYear - i)
    }));
  }, []);

  const monthOptions = useMemo(() => [
    { value: '', label: 'All Months' },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
    })),
  ], []);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleContainer}>
          <View style={[styles.chartIcon, { backgroundColor: `${iconColor}20` }]}>
            <Icon size={isSmallScreen ? 18 : 20} color={iconColor} />
          </View>
          <Text style={styles.chartTitle}>{title}</Text>
        </View>
        
        {(onYearChange || onMonthChange) && (
          <View style={styles.filterGroup}>
            {onYearChange && (
              <FilterSelect
                value={selectedYear || new Date().getFullYear().toString()}
                options={yearOptions}
                onValueChange={onYearChange}
              />
            )}
            {onMonthChange && (
              <FilterSelect
                value={selectedMonth || ''}
                options={monthOptions}
                onValueChange={onMonthChange}
              />
            )}
          </View>
        )}
      </View>
      {children}
    </View>
  );
};

const BarChartComponent: React.FC<{
  data: Array<{ department: string; patientCount: number }>;
  loading: boolean;
  color: string;
}> = ({ data, loading, color }) => {
  const max = useMemo(
    () => Math.max(1, ...(data?.map(d => Number(d.patientCount ?? 0)) || [1])),
    [data]
  );

  const yAxisLabels = useMemo(() => {
    const step = max / 4;
    return [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => Math.round(v));
  }, [max]);

  if (loading) {
    return (
      <View style={styles.chartContainer}>
        <ActivityIndicator size="small" color={color} />
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.barChartCard}>
      <View style={styles.barChartContainer}>
        <View style={styles.yAxis}>
          {yAxisLabels.map((label, i) => (
            <Text key={i} style={styles.yAxisLabel}>{label}</Text>
          ))}
        </View>

        <View style={styles.chartArea}>
          <View style={styles.weekRow}>
            {data.slice(0, 6).map((d, i) => {
              const val = Number(d.patientCount);
              const h = Math.max(2, (val / max) * (isSmallScreen ? 100 : 130));
              return (
                <View key={i} style={styles.weekCol}>
                  <View style={[styles.weekBar, { height: h, backgroundColor: color }]} />
                  <Text style={styles.barValueText}>{val}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.xAxisLine} />

          <View style={styles.xAxisLabels}>
            {data.slice(0, 6).map((d, i) => (
              <Text key={i} numberOfLines={1} style={styles.xAxisLabel}>
                {d.department.length > (isSmallScreen ? 6 : 8) ? 
                  d.department.substring(0, isSmallScreen ? 6 : 8) + '...' : d.department}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const PieChartComponent: React.FC<{
  data: Array<{ name: string; value: number }>;
  loading: boolean;
}> = ({ data, loading }) => {
  const PIE_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#0D9488', '#6366F1', '#14B8A6'];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  const chartData = data?.map((item, index) => ({
    name: item.name,
    population: item.value,
    color: PIE_COLORS[index % PIE_COLORS.length],
    legendFontColor: '#64748b',
    legendFontSize: 10
  })) ?? [];

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: () => `rgba(0, 0, 0, 1)`,
    style: {
      borderRadius: 16,
    },
  };

  useEffect(() => {
    if (data?.length > 0 && !loading) {
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
    }
  }, [data, loading]);

  if (loading) {
    return (
      <View style={styles.chartContainer}>
        <ActivityIndicator size="small" color="#8b5cf6" />
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const displayedLegends = data.slice(0, 5);

  return (
    <Animated.View 
      style={[
        styles.pieChartCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={styles.pieChartContainer}>
        <PieChart
          data={chartData}
          width={W - (isSmallScreen ? 64 : 96)}
          height={isSmallScreen ? 160 : 180}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[isSmallScreen ? 60 : 65, 0]} 
          absolute={false}
          hasLegend={false}
        />
        <View style={styles.pieCenterCircle}>
          <Text style={styles.pieCenterText}></Text>
        </View>
      </View>

      <View style={styles.pieLegendContainer}>
        <View style={styles.pieLegendHeader}>
          <Text style={styles.pieLegendTitle}>Department Distribution</Text>
          {data.length > 5 && (
            <Text style={styles.pieLegendCount}>
              {data.length} total
            </Text>
          )}
        </View>
        
        {displayedLegends.length === 0 ? (
          <Text style={styles.pieNoLegendsText}>No department data available</Text>
        ) : (
          <View style={styles.pieScrollLegendContainer}>
            <ScrollView 
              style={styles.pieLegendScrollView}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {displayedLegends?.map((department, index) => (
                <View key={index} style={styles.pieLegendItem}>
                  <View style={styles.pieLegendLeft}>
                    <View 
                      style={[
                        styles.pieLegendColor, 
                        { backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }
                      ]} 
                    />
                    <Text style={styles.pieLegendName} numberOfLines={1}>
                      {department.name}
                    </Text>
                  </View>
                  <View style={styles.pieLegendRight}>
                    <Text style={styles.pieLegendValue}>
                      {department.value}
                    </Text>
                    <Text style={styles.pieLegendPercentage}>
                      ({total > 0 ? ((department.value / total) * 100).toFixed(1) : '0'}%)
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {data.length > 5 && (
              <View style={styles.pieMoreIndicator}>
                <Text style={styles.pieMoreText}>
                  Scroll to see all {data.length} departments
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const SpiderChartComponent: React.FC<{
  data: Array<{ department: string; wardPatients: number }>;
  loading: boolean;
}> = ({ data, loading }) => {
  const maxValue = useMemo(() => 
    Math.max(...data?.map(item => item.wardPatients) ?? [1]),
    [data]
  );

  if (loading) {
    return (
      <View style={styles.chartContainer}>
        <ActivityIndicator size="small" color="#10b981" />
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.spiderContainer}>
      <View style={styles.spiderContent}>
        <View style={styles.spiderGrid}>
          {data.slice(0, 8).map((item, index) => {
            const angle = (index * 2 * Math.PI) / Math.max(data.length, 1);
            const radius = isSmallScreen ? 60 : 70;
            const valueRadius = (item.wardPatients / maxValue) * radius;
            const x = 100 + Math.cos(angle) * valueRadius;
            const y = 100 + Math.sin(angle) * valueRadius;
            
            return (
              <View key={index}>
                <View 
                  style={[
                    styles.spiderLine,
                    {
                      transform: [
                        { rotate: `${angle}rad` },
                        { scaleX: valueRadius / radius }
                      ],
                      left: 100,
                      top: 100,
                    }
                  ]} 
                />
                <View 
                  style={[
                    styles.spiderPoint,
                    { left: x - 4, top: y - 4 }
                  ]} 
                />
                <View 
                  style={[
                    styles.spiderLabel,
                    { 
                      left: 100 + Math.cos(angle) * (radius + 25),
                      top: 100 + Math.sin(angle) * (radius + 25)
                    }
                  ]}
                >
                  <Text style={styles.spiderLabelText} numberOfLines={1}>
                    {item.department}
                  </Text>
                  <Text style={styles.spiderValueText}>{item.wardPatients}</Text>
                </View>
              </View>
            );
          })}
          
          <View style={[styles.spiderCircle, { width: 40, height: 40, top: 80, left: 80 }]} />
          <View style={[styles.spiderCircle, { width: 80, height: 80, top: 60, left: 60 }]} />
          <View style={[styles.spiderCircle, { width: 120, height: 120, top: 40, left: 40 }]} />
          <View style={[styles.spiderCircle, { width: 160, height: 160, top: 20, left: 20 }]} />
        </View>
      </View>
      
      {data.length > 8 && (
        <Text style={styles.moreItemsText}>+{data.length - 8} more departments</Text>
      )}
    </View>
  );
};

const DashboardReception: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl ?? user?.profileImage;

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [opdYear, setOpdYear] = useState(String(new Date().getFullYear()));
  const [opdMonth, setOpdMonth] = useState('');
  const [ipdYear, setIpdYear] = useState(String(new Date().getFullYear()));
  const [ipdMonth, setIpdMonth] = useState('');
  const [emergencyYear, setEmergencyYear] = useState(String(new Date().getFullYear()));
  const [emergencyMonth, setEmergencyMonth] = useState('');

  const [opdData, setOpdData] = useState<DeptCount[]>([]);
  const [ipdData, setIpdData] = useState<DeptCount[]>([]);
  const [emergencyData, setEmergencyData] = useState<DeptCount[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ thisMonth: 0, thisYear: 0 });

  const [opdLoading, setOpdLoading] = useState(true);
  const [ipdLoading, setIpdLoading] = useState(true);
  const [emergencyLoading, setEmergencyLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const FOOTER_HEIGHT = isSmallScreen ? 60 : 70;

  const extractCounts = (res: any): DeptCount[] => {
    if (!res?.data) return [];

    if (Array.isArray(res.data.departmentCounts)) {
      return res.data.departmentCounts
        ?.map((item: any) => ({
          department: (item.departmentName ?? '')
            .trim()
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' '),
          count: Number(item.visit_count ?? 0),
        }))
        ?.filter((item: DeptCount) => item.count > 0)
        ?.sort((a, b) => b.count - a.count) ?? [];
    }

    if (Array.isArray(res.data)) {
      return res.data
        ?.map((item: any) => ({
          department: (item.departmentName ?? item.department ?? 'Unknown')
            .trim()
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' '),
          count: Number(item.visit_count ?? item.count ?? 0),
        }))
        ?.filter((d: DeptCount) => d.count > 0)
        ?.sort((a, b) => b.count - a.sort) ?? [];
    }

    return [];
  };

  const fetchData = async (ptype: 1 | 2 | 3, year: string, month: string = '') => {
    if (!user?.hospitalID || !user?.token) return null;

    const isMonthly = month && month !== '';
    const filterType = isMonthly ? 'month' : 'year';

    const queryParams = new URLSearchParams({
      filter: filterType,
      filterYear: year,
      ptype: String(ptype),
    });
    if (isMonthly) queryParams.append('filterMonth', month);

    const url = `patient/${user.hospitalID}/patientsCount/byDepartment?${queryParams.toString()}`;
    const token = user.token ?? (await AsyncStorage.getItem('token'));

    try {
      const response = await AuthFetch(url, token);
      return response;
    } catch (err) {
      return null;
    }
  };

  const fetchStats = async () => {
    if (!user?.hospitalID || !user?.token) return;

    setStatsLoading(true);
    try {
      const token = user.token ?? (await AsyncStorage.getItem('token'));
      
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const monthlyData = await fetchData(1, String(currentYear), String(currentMonth).padStart(2, '0'));
      const yearlyData = await fetchData(1, String(currentYear));
      
      const monthlyCounts = monthlyData?.data ? extractCounts(monthlyData) : [];
      const yearlyCounts = yearlyData?.data ? extractCounts(yearlyData) : [];
      
      const thisMonthTotal = monthlyCounts.reduce((sum, item) => sum + item.count, 0);
      const thisYearTotal = yearlyCounts.reduce((sum, item) => sum + item.count, 0);

      setStats({
        thisMonth: thisMonthTotal,
        thisYear: thisYearTotal,
      });
    } catch {
      setStats({
        thisMonth: 156,
        thisYear: 1245,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    const loadOpdData = async () => {
      setOpdLoading(true);
      const res = await fetchData(1, opdYear, opdMonth);
      const counts = extractCounts(res);
      setOpdData(counts);
      setOpdLoading(false);
    };
    loadOpdData();
  }, [user, opdYear, opdMonth]);

  useEffect(() => {
    const loadIpdData = async () => {
      setIpdLoading(true);
      const res = await fetchData(2, ipdYear, ipdMonth);
      const counts = extractCounts(res);
      setIpdData(counts);
      setIpdLoading(false);
    };
    loadIpdData();
  }, [user, ipdYear, ipdMonth]);

  useEffect(() => {
    const loadEmergencyData = async () => {
      setEmergencyLoading(true);
      const res = await fetchData(3, emergencyYear, emergencyMonth);
      const counts = extractCounts(res);
      setEmergencyData(counts);
      setEmergencyLoading(false);
    };
    loadEmergencyData();
  }, [user, emergencyYear, emergencyMonth]);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const emergencyChartData = emergencyData?.map(d => ({ 
    department: d.department, 
    patientCount: d.count 
  }));

  const opdChartData = opdData?.map(d => ({ 
    name: d.department, 
    value: d.count 
  }));

  const ipdChartData = ipdData?.map(d => ({ 
    department: d.department, 
    wardPatients: d.count 
  }));

  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  const onLogoutPress = () => setConfirmVisible(true);
  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userID"]);
    } catch {
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

const sidebarItems: SidebarItem[] = [
  { 
    key: "dash", 
    label: "Dashboard", 
    icon: LayoutDashboard, 
    onPress: () => go("DashboardReception") 
  },
  { 
    key: "patients", 
    label: "Add Patient", 
    icon: Users, 
    onPress: () => go("PatientRegistration") 
  },
  { 
    key: "alerts", 
    label: "Alerts", 
    icon: BellRing, 
    onPress: () => go("alerts") 
  },
  { 
    key: "taxinvoice", 
    label: "Tax Invoice", 
    icon: Receipt, 
    onPress: () => go("Appointments") 
  },
  { 
    key: "records", 
    label: "Patient List", 
    icon: FileText, 
    onPress: () => go("PatientRecords") 
  },
  { 
    key: "appointments", 
    label: "Appointments", 
    icon: Calendar, 
    onPress: () => go("Appointments") 
  },
  { 
    key: "Ward", 
    label: "Ward Management", 
    icon: Bed, 
    onPress: () => go("WardManagement") 
  },
  { 
    key: "doctor", 
    label: "Doctor Management", 
    icon: Stethoscope, 
    onPress: () => go("DoctorManagement") 
  },
];

  const bottomItems: SidebarItem[] = [
    { 
      key: "modules", 
      label: "Go to Modules", 
      icon: Grid, 
      onPress: () => go("Home") 
    },
    { 
      key: "help", 
      label: "Help", 
      icon: HelpCircle, 
      onPress: () => go("HelpScreen") 
    },
    { 
      key: "logout", 
      label: "Logout", 
      icon: LogOut, 
      onPress: onLogoutPress, 
      variant: "danger" 
    },
  ];

  return (
    <View style={styles.safeArea}>
      <HeaderBar title="Hospital Overview" onMenu={() => setMenuOpen(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.containerContent, { paddingBottom: FOOTER_HEIGHT + insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Welcome, {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Real-time patient statistics
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="This Month"
            value={statsLoading ? '...' : stats.thisMonth}
            icon={Users}
            color="#14b8a6"
          />
          <StatCard
            title="This Year"
            value={statsLoading ? '...' : stats.thisYear}
            icon={UserPlus}
            color="#10b981"
          />
        </View>

        <ChartCard 
          title="Emergency Statistics" 
          icon={Activity} 
          iconColor="#ef4444"
          onYearChange={setEmergencyYear}
          onMonthChange={setEmergencyMonth}
          selectedYear={emergencyYear}
          selectedMonth={emergencyMonth}
        >
          <BarChartComponent 
            data={emergencyChartData}
            loading={emergencyLoading}
            color="#0D9488"
          />
        </ChartCard>

        <View style={styles.notesSection}>
          <Notes />
        </View>

        <ChartCard 
          title="Out Patient (OPD)" 
          icon={Heart} 
          iconColor="#8b5cf6"
          onYearChange={setOpdYear}
          onMonthChange={setOpdMonth}
          selectedYear={opdYear}
          selectedMonth={opdMonth}
        >
          <PieChartComponent 
            data={opdChartData}
            loading={opdLoading}
          />
        </ChartCard>

        <ChartCard 
          title="In Patient (IPD)" 
          icon={Stethoscope} 
          iconColor="#10b981"
          onYearChange={setIpdYear}
          onMonthChange={setIpdMonth}
          selectedYear={ipdYear}
          selectedMonth={ipdMonth}
        >
          <SpiderChartComponent 
            data={ipdChartData}
            loading={ipdLoading}
          />
        </ChartCard>
      </ScrollView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"dashboard"} brandColor="#14b8a6" />
      </View>

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        userName={userName}
        userImage={userImg}
        onProfile={() => {
          setMenuOpen(false);
          navigation.navigate("Profile" as never);
        }}
        items={sidebarItems}
        bottomItems={bottomItems}
      />

      <Modal transparent visible={confirmVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMsg}>
              Are you sure you want to logout? This will clear your saved session.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setConfirmVisible(false)} 
                style={[styles.modalBtn, styles.modalBtnGhost]}
              >
                <Text style={[styles.modalBtnText, { color: "#1C7C6B" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmLogout} 
                style={[styles.modalBtn, styles.modalBtnDanger]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  containerContent: { 
    padding: isSmallScreen ? 12 : 16, 
    gap: isSmallScreen ? 12 : 16 
  },

  header: {
    height: isSmallScreen ? 80 : 100,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#14b8a6",
  },
  headerTitle: { 
    fontSize: isSmallScreen ? 20 : 24, 
    fontWeight: "700", 
    color: "#fdfdfdff" 
  },
  menuBtn: {
    width: isSmallScreen ? 34 : 38,
    height: isSmallScreen ? 34 : 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  welcomeSection: {
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#64748b',
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: isSmallScreen ? 8 : 12,
    justifyContent: "space-between"
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    width: (W - (isSmallScreen ? 12 * 2 : 16 * 2) - (isSmallScreen ? 8 : 12)) / 2,
  },
  statContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  statIcon: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    justifyContent: "center",
    alignItems: "center",
  },

  notesSection: {
    marginTop: 8,
  },

  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartIcon: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  chartContainer: {
    minHeight: isSmallScreen ? 150 : 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterGroup: {
    flexDirection: 'row',
    gap: isSmallScreen ? 6 : 8,
  },
  filterSelectContainer: {
    position: 'relative',
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: isSmallScreen ? 80 : 90,
  },
  filterSelectText: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#374151',
    fontWeight: '500',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    marginTop: 4,
    maxHeight: 150,
    minWidth: 120,
  },
  filterDropdownScroll: {
    maxHeight: 150,
  },
  filterOption: {
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterOptionLast: {
    borderBottomWidth: 0,
  },
  filterOptionText: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#374151',
  },
  filterOptionTextSelected: {
    color: '#14b8a6',
    fontWeight: '600',
  },

  barChartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 16,
    gap: isSmallScreen ? 12 : 16,
  },
  barChartContainer: { 
    flexDirection: "row", 
    gap: isSmallScreen ? 6 : 8 
  },
  yAxis: { 
    justifyContent: "space-between", 
    height: isSmallScreen ? 120 : 150, 
    paddingVertical: 2 
  },
  yAxisLabel: { 
    color: "#6B7280", 
    fontSize: isSmallScreen ? 9 : 10, 
    width: isSmallScreen ? 25 : 30, 
    textAlign: "right" 
  },
  chartArea: { 
    flex: 1 
  },
  weekRow: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    justifyContent: "space-between", 
    height: isSmallScreen ? 100 : 130, 
    paddingHorizontal: 6 
  },
  weekCol: { 
    alignItems: "center", 
    justifyContent: "flex-end", 
    flex: 1, 
    maxWidth: isSmallScreen ? 40 : 50 
  },
  weekBar: { 
    width: "60%", 
    borderTopLeftRadius: 8, 
    borderTopRightRadius: 8, 
    minHeight: 2 
  },
  barValueText: {
    fontSize: isSmallScreen ? 9 : 10,
    color: '#374151',
    marginTop: 4,
    fontWeight: '600',
  },
  xAxisLine: { 
    height: 1, 
    backgroundColor: "#E5E7EB", 
    marginHorizontal: 6 
  },
  xAxisLabels: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingHorizontal: 6, 
    paddingTop: 4 
  },
  xAxisLabel: { 
    color: "#6B7280", 
    fontSize: isSmallScreen ? 9 : 10, 
    flex: 1, 
    textAlign: "center", 
    maxWidth: isSmallScreen ? 40 : 50 
  },

  pieChartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: isSmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
    height: isSmallScreen ? 160 : 180,
    position: 'relative',
  },
  pieCenterCircle: {
    position: 'absolute',
    width: isSmallScreen ? 60 : 80,
    height: isSmallScreen ? 60 : 80,
    borderRadius: isSmallScreen ? 30 : 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    zIndex: 1,
  },
  pieCenterText: {
    fontSize: isSmallScreen ? 14 : 18,
    color: '#94a3b8',
    fontWeight: '300',
  },
  pieLegendContainer: {
    gap: isSmallScreen ? 6 : 8,
  },
  pieLegendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 6 : 8,
  },
  pieLegendTitle: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: '#374151',
  },
  pieLegendCount: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#64748b',
    fontWeight: '500',
  },
  pieScrollLegendContainer: {
    maxHeight: isSmallScreen ? 150 : 200,
  },
  pieLegendScrollView: {
    flexGrow: 0,
  },
  pieLegendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 6 : 8,
  },
  pieLegendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pieLegendColor: {
    width: isSmallScreen ? 10 : 12,
    height: isSmallScreen ? 10 : 12,
    borderRadius: isSmallScreen ? 5 : 6,
    marginRight: isSmallScreen ? 8 : 12,
  },
  pieLegendName: {
    fontSize: isSmallScreen ? 11 : 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  pieLegendRight: {
    marginLeft: isSmallScreen ? 6 : 8,
    alignItems: 'flex-end',
  },
  pieLegendValue: {
    fontSize: isSmallScreen ? 11 : 13,
    color: '#111827',
    fontWeight: '600',
  },
  pieLegendPercentage: {
    fontSize: isSmallScreen ? 9 : 11,
    color: '#64748b',
  },
  pieNoLegendsText: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: isSmallScreen ? 12 : 16,
  },
  pieMoreIndicator: {
    paddingTop: isSmallScreen ? 6 : 8,
    paddingBottom: isSmallScreen ? 2 : 4,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pieMoreText: {
    fontSize: isSmallScreen ? 9 : 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  spiderContainer: {
    width: '100%',
    height: isSmallScreen ? 250 : 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spiderContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spiderGrid: {
    width: isSmallScreen ? 160 : 200,
    height: isSmallScreen ? 160 : 200,
    position: 'relative',
  },
  spiderCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 100,
    borderStyle: 'dashed',
  },
  spiderLine: {
    position: 'absolute',
    width: isSmallScreen ? 60 : 70,
    height: 1,
    backgroundColor: '#10b981',
    opacity: 0.6,
    transformOrigin: 'left center',
  },
  spiderPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  spiderLabel: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -25 }, { translateY: -10 }],
    minWidth: isSmallScreen ? 50 : 60,
  },
  spiderLabelText: {
    fontSize: isSmallScreen ? 9 : 10,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
  spiderValueText: {
    fontSize: isSmallScreen ? 8 : 9,
    color: '#10b981',
    fontWeight: '600',
    textAlign: 'center',
  },

  noDataText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: isSmallScreen ? 12 : 14,
    paddingVertical: isSmallScreen ? 15 : 20,
  },
  moreItemsText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: isSmallScreen ? 10 : 12,
    fontStyle: 'italic',
    marginTop: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: isSmallScreen ? 16 : 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: isSmallScreen ? 320 : 380,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: isSmallScreen ? 12 : 16,
  },
  modalTitle: { 
    fontSize: isSmallScreen ? 15 : 17, 
    fontWeight: "800", 
    color: "#0b1220" 
  },
  modalMsg: { 
    fontSize: isSmallScreen ? 12 : 14, 
    color: "#334155", 
    marginTop: 6 
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: isSmallScreen ? 8 : 10,
    marginTop: isSmallScreen ? 12 : 16,
  },
  modalBtn: {
    paddingHorizontal: isSmallScreen ? 12 : 14,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: 10,
  },
  modalBtnGhost: {
    backgroundColor: "#ecfeff",
  },
  modalBtnDanger: {
    backgroundColor: "#ef4444",
  },
  modalBtnText: {
    fontWeight: "700",
    fontSize: isSmallScreen ? 12 : 14,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    zIndex: 10,
    elevation: 6,
  },
});

export default DashboardReception;