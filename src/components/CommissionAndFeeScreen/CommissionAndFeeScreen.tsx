// screens/CommissionAndFeeScreen.tsx
import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  moderateScale, 
  responsiveWidth,
  SCREEN_WIDTH,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  getResponsiveFontSize,
  getDeviceSpecificValue
} from '../../utils/responsive';
import CommissionScreen from '../CommissionAndFeeScreen/CommissionScreen';
import ConsultationFeeScreen from '../CommissionAndFeeScreen/ConsultationFeeScreen';

const TABS = [
  { key: 'commission', label: 'Commission' },
  { key: 'fee', label: 'Consultation Fee' },
];

const CommissionAndFeeScreen = () => {
  const [activeTab, setActiveTab] = useState<string>('commission');
  const [screenFocused, setScreenFocused] = useState<boolean>(false);
  const [forceReloadKey, setForceReloadKey] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Use focus effect to track when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('CommissionAndFeeScreen focused');
      setScreenFocused(true);
      
      // Trigger a reload when screen comes into focus
      setForceReloadKey(prev => prev + 1);
      
      // Cleanup when screen loses focus
      return () => {
        console.log('CommissionAndFeeScreen unfocused');
        setScreenFocused(false);
      };
    }, [])
  );

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
      <>
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
          onScrollEndDrag={handleSwipe}
          onMomentumScrollEnd={handleSwipe}
          style={styles.contentScrollView}
        >
          <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            <CommissionScreen key={`commission-${forceReloadKey}`} />
          </View>
          <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            <ConsultationFeeScreen key={`fee-${forceReloadKey}`} />
          </View>
        </ScrollView>
      </>
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
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xl),
    fontWeight: '800',
    color: '#0f172a',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  unauthorizedText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: '#64748b',
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(FONT_SIZE.md) * 1.5,
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.lg,
    padding: moderateScale(2),
  },
  tab: {
    flex: 1,
    paddingVertical: getDeviceSpecificValue(SPACING.xs, SPACING.md, SPACING.sm),
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
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
  page: {
    flex: 1,
  },
});

export default CommissionAndFeeScreen;