// screens/ExpenseManagementScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store/store';
import { 
  moderateScale, 
  responsiveWidth,
  SCREEN_WIDTH,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  getResponsiveFontSize,
  getDeviceSpecificValue,
  SCREEN_HEIGHT,
  hasNotch,
  getSafeAreaInsets
} from '../../utils/responsive';
import CreateExpenseScreen from './CreateExpense';
import ExpensesListScreen from './ExpensesList';
import ExpenseReportsScreen from './ExpenseReports';
import { AuthFetch } from '../../auth/auth';

const TABS = [
  { key: 'create', label: 'Create Expense' },
  { key: 'list', label: 'Expenses List' },
  { key: 'reports', label: 'Reports' },
];

const ExpenseManagementScreen = () => {
  const [activeTab, setActiveTab] = useState<string>('create');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState({
    canCreate: true,
    canApprove: false,
    canViewAll: false,
    canEdit: false,
    canDelete: false,
  });
  
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);

  useEffect(() => {
    loadCategories();
    checkUserPermissions();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID) return;

      const response = await AuthFetch(
        `expense/hospital/${user.hospitalID}/categories`,
        token
      ) as any;
      
      if (response?.status === 'success' && response.data) {
        setCategories(response.data);
      } else if (response?.categories) {
        setCategories(response.categories);
      } else {
        // Fallback to default categories
        setCategories([
          { id: 1, name: 'Medical Supplies', categoryType: 'medical_supplies' },
          { id: 2, name: 'Lab Equipment', categoryType: 'lab_equipment' },
          { id: 3, name: 'Pharmacy Inventory', categoryType: 'pharmacy' },
          { id: 4, name: 'Staff Salary', categoryType: 'salary' },
          { id: 5, name: 'Utilities', categoryType: 'utilities' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load expense categories');
      // Fallback to default categories
      setCategories([
        { id: 1, name: 'Medical Supplies', categoryType: 'medical_supplies' },
        { id: 2, name: 'Lab Equipment', categoryType: 'lab_equipment' },
        { id: 3, name: 'Pharmacy Inventory', categoryType: 'pharmacy' },
        { id: 4, name: 'Staff Salary', categoryType: 'salary' },
        { id: 5, name: 'Utilities', categoryType: 'utilities' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const checkUserPermissions = () => {
    if (!user) return;
    
const userRole =
  typeof user?.role === 'string'
    ? user.role.toLowerCase()
    : typeof user?.role?.name === 'string'
    ? user.role.name.toLowerCase()
    : '';

    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    const isDoctor = userRole === 'doctor';
    const isFinance = userRole === 'finance' || userRole === 'accountant';
    const isManager = userRole === 'manager';
    
    setUserPermissions({
      canCreate: isDoctor || isAdmin || isFinance || isManager,
      canApprove: isAdmin || isFinance,
      canViewAll: isAdmin || isFinance || isManager,
      canEdit: isAdmin || isFinance,
      canDelete: isAdmin,
    });
  };

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

  const safeAreaInsets = getSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading expense management...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"}
        backgroundColor="#14b8a6"
      />
    
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
      >
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <CreateExpenseScreen 
            categories={categories}
            userPermissions={userPermissions}
            onExpenseCreated={() => {
              // Refresh list when expense is created
              setActiveTab('list');
              scrollToTab(1);
            }}
          />
        </View>
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <ExpensesListScreen 
            categories={categories}
            userPermissions={userPermissions}
          />
        </View>
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <ExpenseReportsScreen 
            categories={categories}
            userPermissions={userPermissions}
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: '#64748b',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xl),
    fontWeight: '800',
    color: '#ffffff',
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
    paddingVertical: getDeviceSpecificValue(SPACING.md, SPACING.lg, SPACING.sm),
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

export default ExpenseManagementScreen;