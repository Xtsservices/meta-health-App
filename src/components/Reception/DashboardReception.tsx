import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Easing,
  Image,
  Pressable,
  StatusBar,
  Platform,
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
  X,
} from 'lucide-react-native';
import { PieChart } from 'react-native-chart-kit';

import { RootState } from '../../store/store';
import { AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Footer from '../dashboard/footer';
import { useNavigation } from '@react-navigation/native';
import Notes from '../dashboard/Notes';

// Import responsive utils and colors
import { 
  SPACING, 
  FONT_SIZE,
  FOOTER_HEIGHT,
  ICON_SIZE,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  responsiveWidth,
  responsiveHeight 
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";

interface DeptCount {
  department: string;
  count: number;
}

interface DashboardStats {
  thisMonth: number;
  thisYear: number;
}

interface SidebarItem {
  key: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  variant?: "default" | "danger" | "muted";
  isAlert?: boolean;
  alertCount?: number;
}

const FOOTER_H = FOOTER_HEIGHT;
const brandColor = COLORS.brand;

/* -------------------------- Confirm Dialog -------------------------- */
const ConfirmDialog: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}> = ({ visible, title, message, onCancel, onConfirm, confirmText = "Logout" }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMsg}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onCancel} style={[styles.modalBtn, styles.modalBtnGhost]}>
              <Text style={[styles.modalBtnText, { color: COLORS.brand }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.modalBtn, styles.modalBtnDanger]}>
              <Text style={[styles.modalBtnText, { color: COLORS.buttonText }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------------- Header -------------------------- */
const HeaderBar: React.FC<{ title: string; onMenu: () => void }> = ({ title, onMenu }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <TouchableOpacity 
          onPress={onMenu} 
          style={styles.menuBtn} 
          accessibilityLabel="Open menu"
          hitSlop={{ 
            top: SPACING.xs, 
            bottom: SPACING.xs, 
            left: SPACING.xs, 
            right: SPACING.xs 
          }}
        >
          <MenuIcon size={ICON_SIZE.lg} color={COLORS.buttonText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* -------------------------- Stat Card -------------------------- */
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}> = ({ title, value, icon: Icon, color }) => {
  const cardWidth = isTablet 
    ? (responsiveWidth(100) - SPACING.md * 2 - SPACING.xs) / 2
    : responsiveWidth(100) - SPACING.md * 2;

  return (
    <View style={[styles.card, { backgroundColor: COLORS.card, width: cardWidth }]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
      <View style={styles.iconWrap}>
        <Icon size={ICON_SIZE.md} color={color} />
      </View>
    </View>
  );
};

/* -------------------------- Filter Select -------------------------- */
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
        <ChevronDown size={isSmallDevice ? 14 : 16} color={COLORS.sub} />
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

/* -------------------------- Chart Card -------------------------- */
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
            <Icon size={isSmallDevice ? 18 : 20} color={iconColor} />
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

/* -------------------------- Bar Chart -------------------------- */
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
              const h = Math.max(2, (val / max) * (isSmallDevice ? 100 : 130));
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
                {d.department.length > (isSmallDevice ? 6 : 8) ? 
                  d.department.substring(0, isSmallDevice ? 6 : 8) + '...' : d.department}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

/* -------------------------- Pie Chart -------------------------- */
const PieChartComponent: React.FC<{
  data: Array<{ name: string; value: number }>;
  loading: boolean;
}> = ({ data, loading }) => {
  const PIE_COLORS = [COLORS.brand, COLORS.danger, COLORS.warning, COLORS.success, COLORS.info, COLORS.primaryDark, COLORS.gradientStart, COLORS.brandDark];
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
    legendFontColor: COLORS.sub,
    legendFontSize: 10
  })) ?? [];

  const chartConfig = {
    backgroundColor: COLORS.card,
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.card,
    decimalPlaces: 0,
    color: () => COLORS.text,
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
        <ActivityIndicator size="small" color={COLORS.brand} />
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
          width={responsiveWidth(90)}
          height={isSmallDevice ? 160 : 180}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[isSmallDevice ? 60 : 65, 0]} 
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

/* -------------------------- Spider Chart -------------------------- */
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
        <ActivityIndicator size="small" color={COLORS.success} />
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
            const radius = isSmallDevice ? 60 : 70;
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

/* -------------------------- Sidebar Button -------------------------- */
const SidebarButton: React.FC<{
  item: SidebarItem;
  isActive?: boolean;
  onPress: () => void;
}> = ({ item, isActive = false, onPress }) => {
  const Icon = item.icon;
  const color = item.variant === "danger" ? COLORS.danger : 
                item.variant === "muted" ? COLORS.sub : 
                isActive ? COLORS.brand : COLORS.text;

  return (
    <TouchableOpacity
      style={[
        styles.sidebarButton,
        isActive && styles.sidebarButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.buttonContent}>
        <Icon size={20} color={color} />
        <Text style={[styles.buttonText, { color }]}>{item.label}</Text>
        {item.isAlert && item.alertCount !== undefined && item.alertCount > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>{item.alertCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

/* -------------------------- Avatar -------------------------- */
const Avatar: React.FC<{ name?: string; uri?: string; size?: number }> = ({
  name = "",
  uri,
  size = 46,
}) => {
  const initial = (name || "").trim().charAt(0).toUpperCase() || "U";
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
};

/* -------------------------- Sidebar -------------------------- */
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string;
  onProfile: () => void;
  items: SidebarItem[];
  bottomItems: SidebarItem[];
  width?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  userName,
  userImage,
  onProfile,
  items,
  bottomItems,
  width = Math.min(320, responsiveWidth(82)),
}) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const slide = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <Animated.View style={[styles.sidebarContainer, { width, transform: [{ translateX: slide }] }]}>
        
        {/* Header */}
        <View style={styles.sidebarHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>

          {/* User Profile Section */}
          <TouchableOpacity style={styles.userProfileSection} onPress={onProfile}>
            <Avatar name={userName} uri={userImage} size={50} />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName || "User"}
              </Text>
              <Text style={styles.userMetaId}>
                Meta Health ID: {user?.id || "N/A"}
              </Text>
              <Text style={styles.userDepartment}>
                Reception
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation Sections */}
        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          
          {/* Overview Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            {items?.filter(item => ["dash", "alerts"].includes(item.key)).map((item) => (
              <SidebarButton
                key={item.key}
                item={item}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              />
            ))}
          </View>

          {/* Patient Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Management</Text>
            {items?.filter(item => ["patients", "records", "appointments"].includes(item.key)).map((item) => (
              <SidebarButton
                key={item.key}
                item={item}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              />
            ))}
          </View>

          {/* Operations Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operations</Text>
            {items?.filter(item => ["taxinvoice", "Ward", "doctor", "billing"].includes(item.key)).map((item) => (
              <SidebarButton
                key={item.key}
                item={item}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              />
            ))}
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            {items?.filter(item => item.key === "help").map((item) => (
              <SidebarButton
                key={item.key}
                item={item}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              />
            ))}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {bottomItems.map((item) => (
            <TouchableOpacity 
              key={item.key}
              style={[
                styles.bottomButton,
                item.variant === "danger" ? styles.logoutButton : styles.modulesButton
              ]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <item.icon size={20} color={item.variant === "danger" ? COLORS.danger : COLORS.brand} />
              <Text style={[
                styles.bottomButtonText,
                { color: item.variant === "danger" ? COLORS.danger : COLORS.brand }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

/* -------------------------- Main Dashboard -------------------------- */
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
    if (!user?.hospitalID) return null;

    const isMonthly = month && month !== '';
    const filterType = isMonthly ? 'month' : 'year';

    const queryParams = new URLSearchParams({
      filter: filterType,
      filterYear: year,
      ptype: String(ptype),
    });
    if (isMonthly) queryParams.append('filterMonth', month);

    const url = `patient/${user.hospitalID}/patientsCount/byDepartment?${queryParams.toString()}`;
    const token = await AsyncStorage.getItem('token');

    try {
      const response = await AuthFetch(url, token);
      return response;
    } catch (err) {
      return null;
    }
  };

  const fetchStats = async () => {
    if (!user?.hospitalID) return;

    setStatsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const monthlyData = await fetchData(1, String(currentYear), String(currentMonth).padStart(2, '0'));
      const yearlyData = await fetchData(1, String(currentYear));
      
      const monthlyCounts =  monthlyData?.data ? extractCounts(monthlyData) : [];
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
      onPress: () => go("AddPatient") 
    },
    { 
      key: "alerts", 
      label: "Alerts", 
      icon: BellRing, 
      onPress: () => go("AlertsLab") 
    },
    {
  key: "taxinvoice",
  label: "Tax Invoice",
  icon: Receipt,
  onPress: () => navigation.navigate("TaxInvoiceTabs", { mode: "allTax" }),
},
{
  key: "billing",
  label: "Billing",
  icon: Receipt,
  onPress: () => navigation.navigate("TaxInvoiceTabs", { mode: "billing" }),
},

    { 
      key: "records", 
      label: "Patient List", 
      icon: FileText, 
      onPress: () => go("ReceptionPatientsList") 
    },
    { 
      key: "appointments", 
      label: "Appointments", 
      icon: Calendar, 
      onPress: () => go("AppointmentTab") 
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
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} backgroundColor={COLORS.brand} />
      <HeaderBar title="Hospital Overview" onMenu={() => setMenuOpen(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.containerContent, { paddingBottom: FOOTER_H + insets.bottom + SPACING.md }]}
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

        {/* Stats Container - Two cards side by side */}
        <View style={styles.statsContainer}>
          <View style={styles.topRow}>
            <StatCard
              title="This Month"
              value={statsLoading ? '...' : stats.thisMonth}
              icon={Users}
              color={COLORS.brand}
            />
            <StatCard
              title="This Year"
              value={statsLoading ? '...' : stats.thisYear}
              icon={UserPlus}
              color={COLORS.success}
            />
          </View>
        </View>

        <ChartCard 
          title="Emergency Statistics" 
          icon={Activity} 
          iconColor={COLORS.danger}
          onYearChange={setEmergencyYear}
          onMonthChange={setEmergencyMonth}
          selectedYear={emergencyYear}
          selectedMonth={emergencyMonth}
        >
          <BarChartComponent 
            data={emergencyChartData}
            loading={emergencyLoading}
            color={COLORS.primaryDark}
          />
        </ChartCard>

        <View style={styles.notesSection}>
          <Notes />
        </View>

        <ChartCard 
          title="Out Patient (OPD)" 
          icon={Heart} 
          iconColor={COLORS.info}
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
          iconColor={COLORS.success}
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
        <Footer active={"dashboard"} brandColor={COLORS.brand} />
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

      <ConfirmDialog
        visible={confirmVisible}
        title="Confirm Logout"
        message="Are you sure you want to logout? This will clear your saved session."
        onCancel={() => setConfirmVisible(false)}
        onConfirm={confirmLogout}
        confirmText="Logout"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  containerContent: { 
    padding: SPACING.sm, 
    gap: SPACING.sm 
  },

  header: {
    height: Platform.OS === 'ios' 
      ? (isExtraSmallDevice ? 90 : isSmallDevice ? 100 : 110)
      : (isExtraSmallDevice ? 70 : isSmallDevice ? 80 : 90),
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.brand,
    paddingTop: Platform.OS === 'ios' 
      ? (isExtraSmallDevice ? 30 : 40) 
      : (isExtraSmallDevice ? 15 : 20),
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
  },
  headerTitle: { 
    fontSize: FONT_SIZE.xxl,
    fontWeight: "700", 
    color: COLORS.buttonText,
    flex: 1,
    textAlign: 'center',
    marginRight: SPACING.md,
  },
  menuBtn: {
    width: ICON_SIZE.lg + SPACING.xs,
    height: ICON_SIZE.lg + SPACING.xs,
    borderRadius: SPACING.xs,
    alignItems: "center",
    justifyContent: "center",
    position: 'absolute',
    right: 0,
  },

  welcomeSection: {
    marginBottom: SPACING.sm,
  },
  welcomeTitle: {
    fontSize: isSmallDevice ? FONT_SIZE.lg : FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    fontSize: isSmallDevice ? FONT_SIZE.sm : FONT_SIZE.md,
    color: COLORS.sub,
  },

  statsContainer: {
    gap: SPACING.sm,
  },
  topRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.sm,
    borderRadius: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: isExtraSmallDevice ? 70 : 80,
  },
  cardContent: {
    flex: 1,
  },
  iconWrap: {
    width: ICON_SIZE.lg + SPACING.xs,
    height: ICON_SIZE.lg + SPACING.xs,
    borderRadius: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brandLight,
    marginLeft: SPACING.xs,
  },
  cardTitle: { 
    color: COLORS.text, 
    fontSize: FONT_SIZE.xs, 
    opacity: 0.75, 
    marginBottom: 4 
  },
  cardValue: { 
    color: COLORS.text, 
    fontSize: FONT_SIZE.lg, 
    fontWeight: "700" 
  },

  notesSection: {
    marginTop: SPACING.sm,
  },

  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
    padding: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chartHeader: {
    flexDirection: responsiveWidth(100) < 375 ? "column" : "row",
    justifyContent: "space-between",
    alignItems: responsiveWidth(100) < 375 ? "flex-start" : "center",
    marginBottom: SPACING.sm,
    gap: responsiveWidth(100) < 375 ? SPACING.xs : 0,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  chartIcon: {
    width: isSmallDevice ? 28 : 32,
    height: isSmallDevice ? 28 : 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: isSmallDevice ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text,
  },
  chartContainer: {
    minHeight: isSmallDevice ? 150 : 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.pill,
    borderRadius: SPACING.xs,
    padding: 4,
    gap: SPACING.xs,
  },
  filterSelectContainer: {
    position: 'relative',
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: isSmallDevice ? 80 : 90,
  },
  filterSelectText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    marginTop: SPACING.xs,
    maxHeight: 150,
    minWidth: 120,
  },
  filterDropdownScroll: {
    maxHeight: 150,
  },
  filterOption: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterOptionLast: {
    borderBottomWidth: 0,
  },
  filterOptionText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
  },
  filterOptionTextSelected: {
    color: COLORS.brand,
    fontWeight: '600',
  },

  barChartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  barChartContainer: { 
    flexDirection: "row", 
    gap: SPACING.xs 
  },
  yAxis: { 
    justifyContent: "space-between", 
    height: isSmallDevice ? 120 : 150, 
    paddingVertical: 2 
  },
  yAxisLabel: { 
    color: COLORS.sub, 
    fontSize: FONT_SIZE.xs, 
    width: isSmallDevice ? 25 : 30, 
    textAlign: "right" 
  },
  chartArea: { 
    flex: 1 
  },
  weekRow: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    justifyContent: "space-between", 
    height: isSmallDevice ? 100 : 130, 
    paddingHorizontal: SPACING.xs 
  },
  weekCol: { 
    alignItems: "center", 
    justifyContent: "flex-end", 
    flex: 1, 
    maxWidth: isSmallDevice ? 40 : 50 
  },
  weekBar: { 
    width: "60%", 
    borderTopLeftRadius: 8, 
    borderTopRightRadius: 8, 
    minHeight: 2 
  },
  barValueText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  xAxisLine: { 
    height: 1, 
    backgroundColor: COLORS.border, 
    marginHorizontal: SPACING.xs 
  },
  xAxisLabels: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingHorizontal: SPACING.xs, 
    paddingTop: SPACING.xs 
  },
  xAxisLabel: { 
    color: COLORS.sub, 
    fontSize: FONT_SIZE.xs, 
    flex: 1, 
    textAlign: "center", 
    maxWidth: isSmallDevice ? 40 : 50 
  },

  pieChartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    shadowColor: COLORS.shadow,
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
    marginBottom: SPACING.md,
    height: isSmallDevice ? 160 : 180,
    position: 'relative',
  },
  pieCenterCircle: {
    position: 'absolute',
    width: isSmallDevice ? 60 : 80,
    height: isSmallDevice ? 60 : 80,
    borderRadius: isSmallDevice ? 30 : 40,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 1,
  },
  pieCenterText: {
    fontSize: isSmallDevice ? FONT_SIZE.sm : FONT_SIZE.lg,
    color: COLORS.placeholder,
    fontWeight: '300',
  },
  pieLegendContainer: {
    gap: SPACING.xs,
  },
  pieLegendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  pieLegendTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  pieLegendCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: '500',
  },
  pieScrollLegendContainer: {
    maxHeight: isSmallDevice ? 150 : 200,
  },
  pieLegendScrollView: {
    flexGrow: 0,
  },
  pieLegendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  pieLegendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pieLegendColor: {
    width: isSmallDevice ? 10 : 12,
    height: isSmallDevice ? 10 : 12,
    borderRadius: isSmallDevice ? 5 : 6,
    marginRight: SPACING.sm,
  },
  pieLegendName: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  pieLegendRight: {
    marginLeft: SPACING.xs,
    alignItems: 'flex-end',
  },
  pieLegendValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: '600',
  },
  pieLegendPercentage: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  pieNoLegendsText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  pieMoreIndicator: {
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pieMoreText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.placeholder,
    fontStyle: 'italic',
  },

  spiderContainer: {
    width: '100%',
    height: isSmallDevice ? 250 : 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spiderContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spiderGrid: {
    width: isSmallDevice ? 160 : 200,
    height: isSmallDevice ? 160 : 200,
    position: 'relative',
  },
  spiderCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 100,
    borderStyle: 'dashed',
  },
  spiderLine: {
    position: 'absolute',
    width: isSmallDevice ? 60 : 70,
    height: 1,
    backgroundColor: COLORS.success,
    opacity: 0.6,
    transformOrigin: 'left center',
  },
  spiderPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  spiderLabel: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -25 }, { translateY: -10 }],
    minWidth: isSmallDevice ? 50 : 60,
  },
  spiderLabelText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  spiderValueText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.success,
    fontWeight: '600',
    textAlign: 'center',
  },

  noDataText: {
    textAlign: "center",
    color: COLORS.sub,
    fontSize: FONT_SIZE.sm,
    paddingVertical: isSmallDevice ? 15 : 20,
  },
  moreItemsText: {
    textAlign: "center",
    color: COLORS.sub,
    fontSize: FONT_SIZE.xs,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
  },
  modalCard: {
    width: responsiveWidth(85),
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
    padding: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalTitle: { 
    fontSize: FONT_SIZE.lg, 
    fontWeight: "800", 
    color: COLORS.text 
  },
  modalMsg: { 
    fontSize: FONT_SIZE.sm, 
    color: COLORS.text, 
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.xs,
    minWidth: responsiveWidth(20),
    alignItems: 'center',
  },
  modalBtnGhost: {
    backgroundColor: COLORS.brandLight,
  },
  modalBtnDanger: {
    backgroundColor: COLORS.brand,
  },
  modalBtnText: {
    fontWeight: "700",
    fontSize: FONT_SIZE.sm,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    zIndex: 10,
    elevation: 6,
  },

  // Sidebar Styles
  sidebarContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: SPACING.md,
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
  },
  sidebarHeader: {
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: -SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.pill,
  },
  userProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 50,
  },
  userInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  userMetaId: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand,
    fontWeight: "600",
  },
  sidebarContent: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.sub,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sidebarButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  sidebarButtonActive: {
    backgroundColor: COLORS.brandLight,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  buttonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    flex: 1,
  },
  alertBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  alertText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
  },
  bottomActions: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
  },
  modulesButton: {
    backgroundColor: COLORS.brandLight,
  },
  logoutButton: {
    backgroundColor: COLORS.chipBP,
  },
  bottomButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  avatar: {
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
  },
});

export default DashboardReception;