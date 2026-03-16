import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  LayoutDashboardIcon, 
  ActivityIcon, 
  CalendarIcon, 
  SettingsIcon 
} from '../../utils/SvgIcons';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE } from '../../utils/responsive';

type FooterItem = {
  key: string;
  label: string;
  icon: React.ElementType;
  route: string;
};

const footerItems: FooterItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboardIcon,
    route: 'AmbulanceStaffDashboard',
  },
  {
    key: 'activeTrip',
    label: 'Active Trip',
    icon: ActivityIcon,
    route: 'AmbulanceStaffActiveTrip',
  },
  {
    key: 'assignments',
    label: 'Assignments',
    icon: CalendarIcon,
    route: 'AmbulanceStaffAssignments',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    route: 'AmbulanceStaffSettings',
  },
];

const AmbulanceStaffFooter: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const currentRoute = route.name;

  const handleNavigate = (routeName: string) => {
    if (currentRoute !== routeName) {
      (navigation as any).navigate(routeName);
    }
  };

  const renderFooterItem = (item: FooterItem) => {
    const isActive = currentRoute === item.route;
    const IconComponent = item.icon;

    return (
      <TouchableOpacity
        key={item.key}
        style={styles.footerItem}
        onPress={() => handleNavigate(item.route)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          <IconComponent
            size={24}
            color={isActive ? COLORS.brand : COLORS.sub}
          />
        </View>
        <Text style={[styles.footerLabel, isActive && styles.footerLabelActive]}>
          {item.label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.footer}>
        {footerItems.map(renderFooterItem)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    backgroundColor: '#fff',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  footerLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    textAlign: 'center',
    fontWeight: '500',
  },
  footerLabelActive: {
    color: COLORS.brand,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 3,
    backgroundColor: COLORS.brand,
    borderRadius: 2,
  },
});

export default AmbulanceStaffFooter;
