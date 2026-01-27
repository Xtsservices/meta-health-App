import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import {
  SCREEN_WIDTH,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  getResponsiveFontSize,
  moderateScale,
  responsiveWidth,
  getDeviceSpecificValue,
} from "../../utils/responsive";
import RevenueScreen from "./RevenueScreen";
import CentralRevenueScreen from "./CentralRevenueScreen";

const TABS = [
  { key: "doctor", label: "Doctor Revenue" },
  { key: "central", label: "Central Revenue" },
];

const RevenueTabNavigator = () => {
  const [activeTab, setActiveTab] = useState<string>("doctor");
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const scrollToTab = (tabIndex: number) => {
    const tabWidth = responsiveWidth(100) / TABS.length;
    const scrollX = tabIndex * tabWidth;
    
    Animated.spring(slideAnim, {
      toValue: scrollX,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: tabIndex * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const handleTabPress = (tabKey: string, index: number) => {
    setActiveTab(tabKey);
    scrollToTab(index);
  };

  const handleSwipe = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    const newTab = TABS[currentIndex]?.key;
    
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
      const tabWidth = responsiveWidth(100) / TABS.length;
      slideAnim.setValue(currentIndex * tabWidth);
    }
  };

  const TabButton = ({ 
    label, 
    isActive, 
    onPress,
    index 
  }: { 
    label: string; 
    isActive: boolean; 
    onPress: () => void;
    index: number;
  }) => (
    <TouchableOpacity
      style={[styles.tab, isActive && styles.activeTab]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tabContent}>
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Revenue Dashboard</Text>
      </View>

      {/* Tab Navigation with Slider */}
      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
          {TABS.map((tab, index) => (
            <TabButton
              key={tab.key}
              label={tab.label}
              isActive={activeTab === tab.key}
              onPress={() => handleTabPress(tab.key, index)}
              index={index}
            />
          ))}
        </View>
        
        {/* Animated Slider */}
        <Animated.View 
          style={[
            styles.slider,
            {
              transform: [{
                translateX: slideAnim
              }],
              width: responsiveWidth(100) / TABS.length - moderateScale(16),
            }
          ]}
        />
      </View>
      
      {/* Swipeable Content Area */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.contentScrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <RevenueScreen />
        </View>
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <CentralRevenueScreen />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: getDeviceSpecificValue(SPACING.lg, SPACING.xl, SPACING.md),
    paddingBottom: SPACING.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xl),
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.lg,
    padding: moderateScale(2),
  },
  tab: {
    flex: 1,
    // paddingVertical: getDeviceSpecificValue(SPACING.md, SPACING.lg, SPACING.sm),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    minHeight: moderateScale(40),
  },
  activeTab: {
    backgroundColor: '#14b8a6',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(4),
  },
  tabText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  slider: {
    position: 'absolute',
    bottom: moderateScale(6),
    height: moderateScale(3),
    backgroundColor: '#14b8a6',
    borderRadius: BORDER_RADIUS.xs,
    marginHorizontal: moderateScale(2),
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
  },
});

export default RevenueTabNavigator;