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
 ChevronLeft,
  ChevronRight,
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
  DollarSign,
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
  responsiveHeight,
  SCREEN_WIDTH,
  SCREEN_HEIGHT
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";
import { MONTH_OPTIONS } from '../../utils/yearMonth';
import Svg, { Circle, Line, Polygon, Text as SvgText, TSpan } from "react-native-svg";
import { CommissionIcon } from '../../utils/SvgIcons';

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
    ? (responsiveWidth(100) - SPACING.md * 3) / 2
    : (responsiveWidth(100) - SPACING.md * 3) / 2;

  return (
    <View style={[styles.card, { backgroundColor: COLORS.card, width: cardWidth }]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
      <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
        <Icon size={ICON_SIZE.md} color={color} />
      </View>
    </View>
  );
};

/* -------------------------- Filter Select -------------------------- */
// const FilterSelect: React.FC<{
//   value: string;
//   options: Array<{ value: string; label: string }>;
//   onValueChange: (value: string) => void;
//   compact?: boolean;
// }> = ({ value, options, onValueChange, compact = false }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const dropdownRef = useRef<View>(null);

//   const selectedOption = options.find(opt => opt.value === value) || options[0];

//   useEffect(() => {
//     const closeDropdown = () => setIsOpen(false);
//     if (isOpen) {
//       // Add a small delay to ensure the dropdown is rendered
//       setTimeout(() => {
//         dropdownRef.current?.measure((x, y, width, height, pageX, pageY) => {
//           // This ensures the dropdown stays within screen bounds
//         });
//       }, 100);
//     }
//   }, [isOpen]);

//   return (
//     <View style={styles.filterSelectContainer} ref={dropdownRef}>
//       <TouchableOpacity 
//         style={[styles.filterSelect,compact && styles.filterSelectCompact]}
//         onPress={() => setIsOpen(!isOpen)}
//         activeOpacity={0.7}
//       >
//         <Text style={[
//           styles.filterSelectText,
//           compact && styles.filterSelectTextCompact
//         ]} numberOfLines={1}>
//           {selectedOption.label}
//         </Text>
//         <ChevronDown 
//           size={compact ? 12 : (isSmallDevice ? 14 : 16)} 
//           color={COLORS.sub} 
//         />
//       </TouchableOpacity>

//       {isOpen && (
//         <View style={[
//           styles.filterDropdown,
//           compact && styles.filterDropdownCompact
//         ]}>
//           <ScrollView 
//             style={compact ? styles.filterDropdownScrollCompact : styles.filterDropdownScroll} 
//             nestedScrollEnabled
//             showsVerticalScrollIndicator={true}
//           >
//             {options.map((option, index) => (
//               <TouchableOpacity
//                 key={option.value}
//                 style={[
//                   styles.filterOption,
//                   compact && styles.filterOptionCompact,
//                   index === options.length - 1 && styles.filterOptionLast
//                 ]}
//                 onPress={() => {
//                   onValueChange(option.value);
//                   setIsOpen(false);
//                 }}
//               >
//                 <Text style={[
//                   styles.filterOptionText,
//                   compact && styles.filterOptionTextCompact,
//                   value === option.value && styles.filterOptionTextSelected
//                 ]} numberOfLines={1}>
//                   {option.label}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         </View>
//       )}
//     </View>
//   );
// };


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
  const showFilters = onYearChange || onMonthChange;
  const isCompactMode = SCREEN_WIDTH < 375;

  // YEAR
  const fallbackYear = new Date().getFullYear().toString();
  const currentYear = selectedYear || fallbackYear;

  // MONTH ('' | '1'..'12')
  const currentMonthValue = selectedMonth ?? "";
  const monthIndex =
    MONTH_OPTIONS.findIndex(m => m.value === currentMonthValue) ?? 0;
  const safeMonthIndex = monthIndex >= 0 ? monthIndex : 0;
  const currentMonthLabel = MONTH_OPTIONS[safeMonthIndex]?.label ?? "All";

  const handleYearChange = (dir: 1 | -1) => {
    if (!onYearChange) return;

    // Optional: keep within YEAR_OPTIONS if you want, otherwise just +/- 1
    const yearNum = Number(currentYear || fallbackYear);
    const next = yearNum + dir;
    onYearChange(String(next));
  };

  const handleMonthChange = (dir: 1 | -1) => {
    if (!onMonthChange) return;

    const len = MONTH_OPTIONS.length; // 13 (All + 12 months)
    let idx = safeMonthIndex;

    idx += dir;         // move left/right
    if (idx < 0) idx = len - 1;    // wrap: All <- Dec
    if (idx >= len) idx = 0;       // wrap: Dec -> All

    const nextOpt = MONTH_OPTIONS[idx];
    onMonthChange(nextOpt.value);  // value: "" | "1".."12"
  };

  return (
    <View style={styles.chartCard}>
      <View
        style={[
          styles.chartHeader,
          isCompactMode && styles.chartHeaderCompact,
        ]}
      >
        {/* LEFT: Icon + Title */}
        <View style={styles.chartTitleContainer}>
          <View
            style={[
              styles.chartIcon,
              { backgroundColor: `${iconColor}20` },
            ]}
          >
            <Icon size={isSmallDevice ? 18 : 20} color={iconColor} />
          </View>
          <Text
            style={[
              styles.chartTitle,
              isCompactMode && styles.chartTitleCompact,
            ]}
          >
            {title}
          </Text>
        </View>

        {/* RIGHT: Year / Month pills */}
        {showFilters && (
          <View
            style={[
              styles.chartPillsRow,
              isCompactMode && styles.chartPillsRowCompact,
            ]}
          >
            {onYearChange && (
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Year</Text>
                <TouchableOpacity
                  onPress={() => handleYearChange(-1)}
                  style={styles.pillBtn}
                >
                  <ChevronLeft size={12} color={COLORS.sub} />
                </TouchableOpacity>
                <Text style={styles.pillValue}>{currentYear}</Text>
                <TouchableOpacity
                  onPress={() => handleYearChange(1)}
                  style={styles.pillBtn}
                >
                  <ChevronRight size={12} color={COLORS.sub} />
                </TouchableOpacity>
              </View>
            )}

            {onMonthChange && (
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Month</Text>
                <TouchableOpacity
                  onPress={() => handleMonthChange(-1)}
                  style={styles.pillBtn}
                >
                  <ChevronLeft size={12} color={COLORS.sub} />
                </TouchableOpacity>
                <Text style={styles.pillValue}>{currentMonthLabel}</Text>
                <TouchableOpacity
                  onPress={() => handleMonthChange(1)}
                  style={styles.pillBtn}
                >
                  <ChevronRight size={12} color={COLORS.sub} />
                </TouchableOpacity>
              </View>
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

  // Calculate optimal bar spacing and width
  const availableWidth = SCREEN_WIDTH - SPACING.md * 4 - 40; // Account for padding and y-axis
  const barCount = Math.min(data.length, 6); // Show max 6 bars
  const barSpacing = SPACING.xs;
  const barWidth = Math.max(12, (availableWidth - (barSpacing * (barCount - 1))) / barCount);
  const chartHeight = isSmallDevice ? 140 : 160;

  return (
    <View style={styles.barChartCard}>
      <View style={styles.barChartContainer}>
        <View style={[styles.yAxis, { height: chartHeight }]}>
          {yAxisLabels.map((label, i) => (
            <Text key={i} style={styles.yAxisLabel}>{label}</Text>
          ))}
        </View>

        <View style={styles.chartArea}>
          <View style={[styles.barsContainer, { height: chartHeight }]}>
            {data.slice(0, 6).map((d, i) => {
              const val = Number(d.patientCount);
              const barHeight = Math.max(8, (val / max) * (chartHeight - 40));
              return (
                <View key={i} style={[styles.barColumn, { width: barWidth }]}>
                  <View style={[styles.bar, { 
                    height: barHeight, 
                    backgroundColor: color,
                  }]} />
                  <Text style={styles.barValueText}>{val}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.xAxisLine} />

          <View style={styles.xAxisLabels}>
            {data.slice(0, 6).map((d, i) => (
    <View
      key={i}  style={[
                styles.xAxisLabelWrap,
                { width: barWidth }
      ]}
    >
      <Text
        style={styles.xAxisLabelRotated}
        numberOfLines={2}
      >
        {d.department}
              </Text>
              </View>
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
  const pieChartSize = isSmallDevice ? 160 : 180;
  const centerSize = isSmallDevice ? 60 : 80;

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
      <View style={[styles.pieChartWrapper, { height: pieChartSize }]}>
      <View style={styles.pieChartContainer}>
        <PieChart
          data={chartData}
          width={responsiveWidth(90)}
          height={pieChartSize}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[pieChartSize / 2, 0]} 
          absolute={false}
          hasLegend={false}
        />
          {/* <View style={[styles.pieCenterCircle, { 
            width: centerSize, 
            height: centerSize, 
            borderRadius: centerSize / 2 
          }]}>
            <Text style={styles.pieCenterText}></Text>
          </View> */}
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

  if (loading) {
    return <ActivityIndicator color={COLORS.success} />;
  }

  if (!data?.length) {
    return <Text style={styles.noDataText}>No data available</Text>;
  }

const size = isSmallDevice ? 260 : 300;
const viewBoxSize = size + 120; // 👈 extra padding
const center = viewBoxSize / 2;
  const maxValue = Math.max(...data.map(d => d.wardPatients), 1);
  const radius = center - 100;
  const levels = 5;
  const angleStep = (2 * Math.PI) / data.length;

  const getPoint = (value: number, index: number) => {
    const r = (value / maxValue) * radius;
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = data
    .map((d, i) => {
      const p = getPoint(d.wardPatients, i);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <View style={{ alignItems: "center" }}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      >

        {/* Grid circles */}
        {[...Array(levels)].map((_, i) => (
          <Circle
            key={i}
            cx={center}
            cy={center}
            r={(radius / levels) * (i + 1)}
            stroke={COLORS.border}
            strokeDasharray="4,4"
            fill="none"
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <Line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke={COLORS.border}
            />
          );
        })}

        {/* Radar area */}
        <Polygon
          points={polygonPoints}
          fill="rgba(76, 175, 80, 0.35)"
          stroke={COLORS.success}
          strokeWidth={2}
        />

        {/* Points */}
        {data.map((d, i) => {
          const p = getPoint(d.wardPatients, i);
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={COLORS.success}
            />
          );
        })}

{/* Labels */}
{data.map((d, i) => {
  const angle = i * angleStep - Math.PI / 2;

  const BASE_OFFSET = 42;
  const isBottom = angle > Math.PI / 2 - 0.4 && angle < Math.PI / 2 + 0.4;

  const x =
    center + (radius + BASE_OFFSET) * Math.cos(angle);

  const y =
    center + (radius + BASE_OFFSET) * Math.sin(angle) +
    (isBottom ? 10 : 0); // push bottom labels down

  // Alignment by side
  let anchor: "start" | "middle" | "end" = "middle";
  if (Math.cos(angle) > 0.35) anchor = "start";
  if (Math.cos(angle) < -0.35) anchor = "end";

  // 🔥 Split label into lines (max 2 lines)
  const words = d.department.split(" ");
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");

  return (
    <SvgText
      key={i}
      x={x}
      y={y}
      fontSize="10"
      fill={COLORS.text}
      textAnchor={anchor}
    >
      <TSpan x={x} dy="0">{line1}</TSpan>
      {line2 !== "" && (
        <TSpan x={x} dy="12">{line2}</TSpan>
      )}
    </SvgText>
  );
})}


      </Svg>

      <Text style={{ marginTop: 8, color: COLORS.success, fontWeight: "600" }}>
        Ward Patients
      </Text>
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
            {items?.filter(item => ["patients", "records", "appointments","commission","revenue"].includes(item.key)).map((item) => (
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
  const userImg = user?.avatarUrl || user?.profileImage ||user?.imageURL;

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
        ?.sort((a: DeptCount, b: DeptCount) => b.count - a.count) ?? [];
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
        ?.sort((a: DeptCount, b: DeptCount) => b.count - a.count) ?? [];
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
      
      const monthlyCounts = monthlyData && 'data' in monthlyData && monthlyData.data ? extractCounts(monthlyData) : [];
      const yearlyCounts = yearlyData && 'data' in yearlyData && yearlyData.data ? extractCounts(yearlyData) : [];
      
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
        { key: "revenue", label: "Revenue", icon: DollarSign, onPress: () => go("RevenueTabNavigator") }, // Added Revenue tab      

        { key: 'commission',label: 'Commission & Fee',icon: CommissionIcon,onPress: () => navigation.navigate('CommissionAndFee')},
    
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
            {insets.bottom > 0 && (
             <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
           )}

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        userName={userName}
        userImage={userImg}
        onProfile={() => {
          setMenuOpen(false);
          navigation.navigate("DoctorProfile" as never);
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
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems:  "flex-start" ,
    marginBottom: SPACING.sm,
    gap: SCREEN_WIDTH < 375 ? SPACING.xs : 10,
  },
  chartHeaderCompact: {
    gap: SPACING.xs,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
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
    flexShrink: 1,
  },
  chartTitleCompact: {
    fontSize: FONT_SIZE.md,
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
    alignSelf: SCREEN_WIDTH < 375 ? 'stretch' : 'flex-start',
  },
  filterGroupCompact: {
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  filterSelectContainer: {
    position: 'relative',
    zIndex: 100,
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
    maxWidth: SCREEN_WIDTH < 375 ? responsiveWidth(40) : 120,
  },
  filterSelectCompact: {
    minWidth: 70,
    maxWidth: SCREEN_WIDTH < 375 ? responsiveWidth(42) : 90,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
  },
  filterSelectText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  filterSelectTextCompact: {
    fontSize: FONT_SIZE.xs - 1,
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
  filterDropdownCompact: {
    minWidth: 100,
    right: 0,
    left: 'auto',
  },
  filterDropdownScroll: {
    maxHeight: 150,
  },
  filterDropdownScrollCompact: {
    maxHeight: 120,
  },
  filterOption: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterOptionCompact: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  filterOptionLast: {
    borderBottomWidth: 0,
  },
  filterOptionText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
  },
  filterOptionTextCompact: {
    fontSize: FONT_SIZE.xs - 1,
  },
  filterOptionTextSelected: {
    color: COLORS.brand,
    fontWeight: '600',
  },

  // Improved Bar Chart Styles
  barChartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  barChartContainer: { 
    flexDirection: "row", 
    gap: SPACING.sm 
  },
  yAxis: { 
    justifyContent: "space-between", 
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
  barsContainer: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xs,
  },
  barColumn: { 
    alignItems: "center", 
    justifyContent: "flex-end",
  },
  bar: { 
    borderTopLeftRadius: 6, 
    borderTopRightRadius: 6, 
    minHeight: 8,
    width: '80%',
    alignSelf: 'center',
  },
  barValueText: {
    fontSize: FONT_SIZE.xs - 1,
    color: COLORS.text,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  xAxisLine: { 
    height: 1, 
    backgroundColor: COLORS.border, 
    marginHorizontal: SPACING.xs,
    marginTop: SPACING.sm,
  },
  xAxisLabels: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingHorizontal: SPACING.xs, 
    paddingTop: SPACING.xs 
  },
  xAxisLabel: { 
    color: COLORS.sub, 
    fontSize: FONT_SIZE.xs - 1, 
    textAlign: "center",
    flexShrink: 1,
  },

  // Improved Pie Chart Styles
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
  xAxisLabelWrap: {
  alignItems: "flex-start",
  justifyContent: "flex-start",
},

xAxisLabelRotated: {
  color: COLORS.sub,
  fontSize: FONT_SIZE.xs - 1,
  transform: [{ rotate: "-35deg" }], // 👈 slant
  textAlign: "left",
  width: 80, // 👈 allows long names
},

  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pieCenterCircle: {
    position: 'absolute',
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
    minWidth: isSmallDevice ? 40 : 50,
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
    position:"absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    zIndex: 10,
    elevation: 6,
  },
    navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    zIndex: 9,
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
    chartPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  chartPillsRowCompact: {
    alignSelf: "stretch",
    justifyContent: "flex-start",
    marginTop: SPACING.xs,
    flexWrap: "wrap",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.pill,
    borderRadius: 8,
    paddingHorizontal: SPACING.xs,
    height: 32,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillLabel: {
    color: COLORS.sub,
    fontSize: FONT_SIZE.xs - 1,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  pillBtn: {
    padding: 4,
  },
  pillValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    minWidth: 32,
    textAlign: "center",
  },

});

export default DashboardReception;