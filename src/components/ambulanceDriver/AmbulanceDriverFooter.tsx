import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  LayoutDashboardIcon,
  SettingsIcon,
  ClockIcon,
  MapPinIcon,
} from '../../utils/SvgIcons';
import {
  ensureLocationPermission,
  startDriverTracking,
  startLocationTracking,
  stopLocationTracking,
} from '../../utils/locationUtils';
import { RootState } from '../../store/store';
import { useSelector, useDispatch } from 'react-redux';
import { showError } from '../../store/toast.slice';

const { width: W } = Dimensions.get('window');

// Delay used when initializing background tasks to allow app/socket to fully stabilize (ms)
const THROTTLE_TIME = 5000;

export type AmbulanceDriverTabKey =
  | 'dashboard'
  | 'activeTrip'
  | 'history'
  | 'settings';

type Props = {
  active?: AmbulanceDriverTabKey;
  brandColor?: string;
  onTabPress?: (tab: AmbulanceDriverTabKey) => void;
};

type ItemProps = {
  k: AmbulanceDriverTabKey;
  active: AmbulanceDriverTabKey;
  onPress: (k: AmbulanceDriverTabKey) => void;
};

const getTabLabel = (k: AmbulanceDriverTabKey): string => {
  const labels = {
    dashboard: 'Dashboard',
    activeTrip: 'Active Trip',
    history: 'History',
    settings: 'Settings',
  };
  return labels[k];
};

const getTabIcon = (k: AmbulanceDriverTabKey): React.ElementType => {
  const icons = {
    dashboard: LayoutDashboardIcon,
    activeTrip: MapPinIcon,
    history: ClockIcon,
    settings: SettingsIcon,
  };
  return icons[k];
};

const Item: React.FC<ItemProps> = ({ k, active, onPress }) => {
  const isActive = active === k;
  const label = getTabLabel(k);
  const IconComponent = getTabIcon(k);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(k)}
      activeOpacity={0.9}
      style={styles.tab}
    >
      <IconComponent size={22} color="#ffffff" />
      <Text
        style={[
          styles.tabText,
          isActive ? styles.tabTextActive : styles.tabTextInactive,
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.activeBar,
          isActive ? styles.activeBarVisible : styles.activeBarHidden,
        ]}
      />
    </TouchableOpacity>
  );
};

const AmbulanceDriverFooter: React.FC<Props> = ({
  active = 'dashboard',
  brandColor = '#14b8a6',
  onTabPress,
}) => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const dispatch = useDispatch();
  const trackingStartedRef = useRef(false);
  const insets = useSafeAreaInsets();
  
  console.log("Current user:", user);

  // 🔹 CLEANUP: Stop tracking when component unmounts (app closes or user logs out)
  React.useEffect(() => {
    return () => {
      if (trackingStartedRef.current) {
        console.log('🛑 Component unmounting - stopping background tracking');
        stopLocationTracking().catch(err => {
          console.error('Error stopping tracking on unmount:', err);
        });
        trackingStartedRef.current = false;
      }
    };
  }, []);

  // 🔹 START CONTINUOUS BACKGROUND LOCATION TRACKING
  useFocusEffect(
    React.useCallback(() => {
      const initBackgroundTracking = async () => {
        // Only start if user is logged in and is a driver
        if (!user?.id) {
          console.log('⚠️ No user ID found, skipping location tracking');
          return;
        }

        // Prevent multiple tracking instances
        if (trackingStartedRef.current) {
          console.log('⚠️ Tracking already started');
          return;
        }

        try {
          console.log('🔄 Initializing location tracking...');
          
          // Request location permissions first
          const granted = await ensureLocationPermission();
          if (!granted) {
            console.log('❌ Location permission not granted');
            dispatch(showError('Location permission is required to track ambulance location.'));
            return;
          }

          console.log('✅ Location permission granted');

          // Add a delay to ensure socket is ready and prevent native crash
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));

          console.log('🚀 Starting background location tracking...');

          


          // Start continuous background tracking
          const driverId = String(user.id); // Ensure it's a string
          const ambulanceID = String(user?.ambulance?.ambulanceID); // Ensure it's a string
          if(!ambulanceID && !driverId) {
            console.log('⚠️ No ambulance ID or driver ID found, skipping location tracking');
            return;
          }

          await startLocationTracking(driverId, ambulanceID);
          trackingStartedRef.current = true;
          
          console.log('✅ Background tracking started for driver:', driverId);
        } catch (error) {
          console.error('❌ Failed to start background tracking:', error);
          // Don't show alert for minor errors, just log
          console.log('⚠️ Will retry tracking on next app launch');
        }
      };

      // Small delay before starting to ensure app is fully initialized
      const timer = setTimeout(() => {
        initBackgroundTracking();
      }, THROTTLE_TIME);

      // Cleanup: DON'T stop tracking on screen blur - let it run in background!
      // Only stop when user explicitly goes offline
      return () => {
        clearTimeout(timer);
        // Removed: Don't stop tracking when screen loses focus
        console.log('📱 Screen lost focus but keeping background tracking active');
      };
    }, [user?.id, user?.ambulance?.ambulanceID])
  );

  const handleTabPress = (k: AmbulanceDriverTabKey) => {
    // Call custom handler if provided
    if (onTabPress) {
      onTabPress(k);
      return;
    }

    // Default navigation behavior
    switch (k) {
      case 'dashboard':
        navigation.navigate('AmbulanceDriverDashboard');
        break;
      case 'activeTrip':
        navigation.navigate('AmbulanceDriverActiveTrip');
        break;
      case 'history':
        navigation.navigate('AmbulanceDriverHistory');
        break;
      case 'settings':
        navigation.navigate('AmbulanceDriverSettings');
        break;
      default:
        break;
    }
  };

  return (
    <View style={[styles.footer, { backgroundColor: brandColor, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <Item k="dashboard" active={active} onPress={handleTabPress} />
      <Item k="activeTrip" active={active} onPress={handleTabPress} />
      <Item k="history" active={active} onPress={handleTabPress} />
      <Item k="settings" active={active} onPress={handleTabPress} />
    </View>
  );
};

export default AmbulanceDriverFooter;

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 0,
    width: W,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  tabText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  tabTextActive: {
    opacity: 1,
  },
  tabTextInactive: {
    opacity: 0.85,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    height: 3,
    width: '30%',
    borderRadius: 2,
  },
  activeBarVisible: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  activeBarHidden: {
    backgroundColor: 'transparent',
  },
});
