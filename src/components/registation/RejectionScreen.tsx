import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, X } from 'lucide-react-native';
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  BORDER_RADIUS,
  responsiveHeight,
  moderateScale,
  moderateVerticalScale,
  fontWithLineHeight,
  wp,
  hp,
  getResponsiveFontSize,
  responsivePadding,
  responsiveMargin,
  getSafeAreaInsets
} from '../../utils/responsive'; // Adjust the import path as needed

const RejectionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { orgType, rejectReason } = route.params || {};
  const safeAreaInsets = getSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* 🔴 TOP RED SECTION */}
      <LinearGradient
        colors={['#ff5f5f', 'rgb(238, 61, 61)']}
        style={[
          styles.topSection,
          {
            paddingTop: safeAreaInsets.top + moderateScale(10),
            height: responsiveHeight(isSmallDevice ? 50 : 55),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={moderateScale(22)} color="#fff" />
        </TouchableOpacity>

        <View style={styles.centerContent}>
          <View style={styles.iconWrapper}>
            <X size={moderateScale(isTablet ? 70 : 56)} color="#fff" strokeWidth={3} />
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>Failed</Text>
          </View>

          <Text style={styles.title}>
            Oops! Something went{'\n'}wrong here
          </Text>
        </View>
      </LinearGradient>

      {/* ⚪ BOTTOM WHITE SECTION */}
      <View style={[
        styles.bottomSection,
        responsivePadding(SPACING.md, SPACING.lg, 0, SPACING.lg)
      ]}>
        <Text style={styles.description}>
          Your {orgType || 'application'} was Rejected.
        </Text>

        <View style={styles.reasonBox}>
          <Text style={styles.reasonTitle}>Reason:</Text>
          <Text style={styles.reasonText}>
            {rejectReason || 'No specific reason provided'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.retryText}>Please try again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RejectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* 🔴 TOP SECTION */
  topSection: {
    borderBottomLeftRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
  },

  backButton: {
    position: 'absolute',
    top: moderateScale(getSafeAreaInsets().top + 5),
    left: SPACING.sm,
    zIndex: 10,
    padding: moderateScale(8),
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: moderateVerticalScale(-20),
  },

  iconWrapper: {
    marginBottom: moderateScale(12),
  },

  badge: {
    backgroundColor: '#fff',
    paddingHorizontal: moderateScale(18),
    paddingVertical: moderateScale(4),
    borderRadius: BORDER_RADIUS.round,
    marginBottom: moderateScale(12),
    ...(isSmallDevice && {
      paddingHorizontal: moderateScale(14),
      paddingVertical: moderateScale(3),
    }),
  },

  badgeText: {
    color: '#e60000',
    fontWeight: '600',
    fontSize: moderateScale(12),
    lineHeight: moderateScale(16),
    letterSpacing: 0.3,
  },

  title: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: moderateScale(18),
    lineHeight: moderateScale(24),
    ...(isSmallDevice && {
      fontSize: moderateScale(16),
      lineHeight: moderateScale(22),
    }),
    ...(isTablet && {
      fontSize: moderateScale(20),
      lineHeight: moderateScale(28),
    }),
  },

  /* ⚪ BOTTOM SECTION */
  bottomSection: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },

  description: {
    color: '#444',
    textAlign: 'center',
    marginBottom: moderateScale(16),
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
    ...(isSmallDevice && {
      fontSize: moderateScale(13),
      lineHeight: moderateScale(18),
    }),
  },

  reasonBox: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    padding: moderateScale(14),
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: moderateScale(24),
    ...(isTablet && {
      width: wp(60),
      padding: moderateScale(16),
    }),
    ...(isExtraSmallDevice && {
      padding: moderateScale(12),
    }),
  },

  reasonTitle: {
    fontWeight: '600',
    marginBottom: moderateScale(4),
    color: '#e60000',
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
    ...(isSmallDevice && {
      fontSize: moderateScale(12),
      lineHeight: moderateScale(16),
    }),
  },

  reasonText: {
    color: '#333',
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
    ...(isSmallDevice && {
      fontSize: moderateScale(12),
      lineHeight: moderateScale(16),
    }),
  },

  retryButton: {
    width: isTablet ? wp(40) : '90%',
    backgroundColor: '#e60000',
    paddingVertical: moderateVerticalScale(12),
    borderRadius: BORDER_RADIUS.round,
    alignItems: 'center',
    alignSelf: 'center',
    ...(isExtraSmallDevice && {
      paddingVertical: moderateVerticalScale(10),
      width: '95%',
    }),
    ...(isTablet && {
      paddingVertical: moderateVerticalScale(14),
    }),
  },

  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
    letterSpacing: 0.3,
    ...(isSmallDevice && {
      fontSize: moderateScale(13),
      lineHeight: moderateScale(18),
    }),
  },
});