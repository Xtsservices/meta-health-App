// utils/responsive.ts
import { Dimensions, ScaledSize, Platform, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Device detection
const isTablet = SCREEN_WIDTH >= 768;
const isSmallDevice = SCREEN_HEIGHT < 700;
const isExtraSmallDevice = SCREEN_WIDTH < 375;
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

// Based on standard iPhone 6-8 screen width (375px)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 667;

// Moderate scale function for responsive sizing
const moderateScale = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / guidelineBaseWidth;
  return Math.ceil(size + (scale - 1) * size * factor);
};

// Moderate vertical scale for height-based scaling
const moderateVerticalScale = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_HEIGHT / guidelineBaseHeight;
  return Math.ceil(size + (scale - 1) * size * factor);
};

// Calculate responsive values directly
const SPACING = {
  xs: Math.max(8, SCREEN_WIDTH * 0.02),   // ~8-12px
  sm: Math.max(12, SCREEN_WIDTH * 0.035), // ~12-16px  
  md: Math.max(16, SCREEN_WIDTH * 0.045), // ~16-20px
  lg: Math.max(20, SCREEN_WIDTH * 0.055), // ~20-24px
  xl: Math.max(24, SCREEN_WIDTH * 0.065), // ~24-28px
  xxl: Math.max(32, SCREEN_WIDTH * 0.08), // ~32-40px
};

const FONT_SIZE = {
  xs: Math.max(10, SCREEN_WIDTH * 0.028),
  sm: Math.max(12, SCREEN_WIDTH * 0.032),
  md: Math.max(14, SCREEN_WIDTH * 0.036),
  lg: Math.max(16, SCREEN_WIDTH * 0.04),
  xl: Math.max(18, SCREEN_WIDTH * 0.044),
  xxl: Math.max(20, SCREEN_WIDTH * 0.048),
};

const ICON_SIZE = {
  sm: Math.max(16, SCREEN_WIDTH * 0.04),
  md: Math.max(20, SCREEN_WIDTH * 0.05),
  lg: Math.max(24, SCREEN_WIDTH * 0.06),
};

const FOOTER_HEIGHT = Math.max(60, SCREEN_HEIGHT * 0.08);

// Responsive width and height calculations
const responsiveWidth = (percentage: number) => SCREEN_WIDTH * (percentage / 100);
const responsiveHeight = (percentage: number) => SCREEN_HEIGHT * (percentage / 100);

// Grid calculations
const GRID = {
  column: isTablet ? responsiveWidth(45) : responsiveWidth(90),
  gap: isTablet ? SPACING.lg : SPACING.md,
};

// Border radius
const BORDER_RADIUS = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  round: moderateScale(999),
};

// Elevation/shadows (for Android/iOS compatibility)
const ELEVATION = {
  none: 0,
  xs: 1,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
};

// Platform-specific adjustments
const getPlatformValue = (iosValue: number, androidValue: number): number => {
  return isIOS ? iosValue : androidValue;
};

// Line height calculator based on font size
const lineHeightMultiplier = (fontSize: number, multiplier: number = 1.4): number => {
  return Math.round(fontSize * multiplier);
};

// Scale font with line height
const fontWithLineHeight = (size: number, multiplier: number = 1.4) => ({
  fontSize: moderateScale(size),
  lineHeight: lineHeightMultiplier(moderateScale(size), multiplier),
});

// Responsive font size calculation
const responsiveFontSize = (fontSize: number): number => {
  const baseScreenWidth = 375; // iPhone 6/7/8 width
  const scale = SCREEN_WIDTH / baseScreenWidth;
  const scaledFontSize = fontSize * scale;
  
  // Apply minimum and maximum font size constraints
  const minFontSize = fontSize * 0.8;
  const maxFontSize = fontSize * 1.2;
  
  return Math.max(minFontSize, Math.min(scaledFontSize, maxFontSize));
};

// Scale functions from react-native-size-matters pattern
const scale = (size: number): number => {
  const scaleWidth = SCREEN_WIDTH / guidelineBaseWidth;
  return Math.ceil(size * scaleWidth);
};

const verticalScale = (size: number): number => {
  const scaleHeight = SCREEN_HEIGHT / guidelineBaseHeight;
  return Math.ceil(size * scaleHeight);
};

// Horizontal scale (similar to moderateScale but without factor)
const horizontalScale = (size: number): number => {
  return scale(size);
};

// Percentage-based dimensions (from react-native-responsive-screen pattern)
const widthPercentageToDP = (widthPercent: number | string): number => {
  // Parse string percentage input and convert to number
  const elemWidth = typeof widthPercent === "number" 
    ? widthPercent 
    : parseFloat(widthPercent);
  
  // Use PixelRatio.roundToNearestPixel to avoid blurry dimensions
  return PixelRatio.roundToNearestPixel(SCREEN_WIDTH * elemWidth / 100);
};

const heightPercentageToDP = (heightPercent: number | string): number => {
  // Parse string percentage input and convert to number
  const elemHeight = typeof heightPercent === "number" 
    ? heightPercent 
    : parseFloat(heightPercent);
  
  // Use PixelRatio.roundToNearestPixel to avoid blurry dimensions
  return PixelRatio.roundToNearestPixel(SCREEN_HEIGHT * elemHeight / 100);
};

// Shorter aliases for percentage functions
const wp = widthPercentageToDP;
const hp = heightPercentageToDP;

// Screen orientation detection
const isPortrait = (): boolean => {
  const dim = Dimensions.get('screen');
  return dim.height >= dim.width;
};

const isLandscape = (): boolean => {
  const dim = Dimensions.get('screen');
  return dim.width >= dim.height;
};

// Dynamic spacing based on screen size
const dynamicSpacing = (baseSize: number, multiplier: number = 1): number => {
  const ratio = SCREEN_HEIGHT / SCREEN_WIDTH;
  const scaleFactor = ratio > 1.8 ? 1.1 : 1; // Taller screens get slightly more spacing
  return moderateScale(baseSize * multiplier) * scaleFactor;
};

// Viewport units (vw/vh-like behavior)
const vw = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

const vh = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Aspect ratio calculator
const aspectRatio = (width: number, height: number): number => {
  return width / height;
};

// Device-specific adjustments
const getDeviceSpecificValue = (
  phoneValue: number, 
  tabletValue: number, 
  smallPhoneValue?: number
): number => {
  if (isExtraSmallDevice && smallPhoneValue !== undefined) {
    return smallPhoneValue;
  }
  return isTablet ? tabletValue : phoneValue;
};

// Get responsive font size with device-specific adjustments
const getResponsiveFontSize = (
  size: number,
  options?: {
    min?: number;
    max?: number;
    factor?: number;
  }
): number => {
  const { min = size * 0.8, max = size * 1.2, factor = 0.5 } = options || {};
  const responsiveSize = moderateScale(size, factor);
  return Math.max(min, Math.min(responsiveSize, max));
};

// Calculate responsive padding/margin
const responsivePadding = (
  top: number,
  right?: number,
  bottom?: number,
  left?: number
) => {
  if (right === undefined && bottom === undefined && left === undefined) {
    const value = moderateScale(top);
    return {
      paddingTop: value,
      paddingRight: value,
      paddingBottom: value,
      paddingLeft: value,
    };
  }
  
  if (right !== undefined && bottom === undefined && left === undefined) {
    return {
      paddingTop: moderateScale(top),
      paddingRight: moderateScale(right),
      paddingBottom: moderateScale(top),
      paddingLeft: moderateScale(right),
    };
  }
  
  if (right !== undefined && bottom !== undefined && left === undefined) {
    return {
      paddingTop: moderateScale(top),
      paddingRight: moderateScale(right),
      paddingBottom: moderateScale(bottom),
      paddingLeft: moderateScale(right),
    };
  }
  
  return {
    paddingTop: moderateScale(top),
    paddingRight: moderateScale(right || 0),
    paddingBottom: moderateScale(bottom || top),
    paddingLeft: moderateScale(left || right || 0),
  };
};

// Calculate responsive margin
const responsiveMargin = (
  top: number,
  right?: number,
  bottom?: number,
  left?: number
) => {
  if (right === undefined && bottom === undefined && left === undefined) {
    const value = moderateScale(top);
    return {
      marginTop: value,
      marginRight: value,
      marginBottom: value,
      marginLeft: value,
    };
  }
  
  if (right !== undefined && bottom === undefined && left === undefined) {
    return {
      marginTop: moderateScale(top),
      marginRight: moderateScale(right),
      marginBottom: moderateScale(top),
      marginLeft: moderateScale(right),
    };
  }
  
  if (right !== undefined && bottom !== undefined && left === undefined) {
    return {
      marginTop: moderateScale(top),
      marginRight: moderateScale(right),
      marginBottom: moderateScale(bottom),
      marginLeft: moderateScale(right),
    };
  }
  
  return {
    marginTop: moderateScale(top),
    marginRight: moderateScale(right || 0),
    marginBottom: moderateScale(bottom || top),
    marginLeft: moderateScale(left || right || 0),
  };
};

// Check for notch devices
const hasNotch = (): boolean => {
  return (
    Platform.OS === 'ios' &&
    !Platform.isPad &&
    !Platform.isTV &&
    (SCREEN_HEIGHT === 780 ||
      SCREEN_WIDTH === 780 ||
      SCREEN_HEIGHT === 812 ||
      SCREEN_WIDTH === 812 ||
      SCREEN_HEIGHT === 844 ||
      SCREEN_WIDTH === 844 ||
      SCREEN_HEIGHT === 852 ||
      SCREEN_WIDTH === 852 ||
      SCREEN_HEIGHT === 896 ||
      SCREEN_WIDTH === 896 ||
      SCREEN_HEIGHT === 926 ||
      SCREEN_WIDTH === 926 ||
      SCREEN_HEIGHT === 932 ||
      SCREEN_WIDTH === 932)
  );
};

// Check for dynamic island devices
const hasDynamicIsland = (): boolean => {
  return (
    Platform.OS === 'ios' &&
    !Platform.isPad &&
    !Platform.isTV &&
    (SCREEN_HEIGHT === 852 ||
      SCREEN_WIDTH === 852 ||
      SCREEN_HEIGHT === 932 ||
      SCREEN_WIDTH === 932)
  );
};

// Get safe area insets for different devices
const getSafeAreaInsets = () => {
  const baseInsets = {
    top: hasNotch() || hasDynamicIsland() ? 44 : 20,
    bottom: hasNotch() || hasDynamicIsland() ? 34 : 0,
    left: 0,
    right: 0,
  };
  
  return baseInsets;
};

export { 
  SCREEN_WIDTH, 
  SCREEN_HEIGHT, 
  isTablet, 
  isSmallDevice, 
  isExtraSmallDevice,
  isIOS,
  isAndroid,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT,
  BORDER_RADIUS,
  ELEVATION,
  responsiveWidth,
  responsiveHeight,
  moderateScale,
  moderateVerticalScale,
  fontWithLineHeight,
  getPlatformValue,
  GRID,
  
  // New exports
  responsiveFontSize,
  scale,
  verticalScale,
  horizontalScale,
  widthPercentageToDP,
  heightPercentageToDP,
  wp,
  hp,
  isPortrait,
  isLandscape,
  dynamicSpacing,
  vw,
  vh,
  aspectRatio,
  getDeviceSpecificValue,
  getResponsiveFontSize,
  responsivePadding,
  responsiveMargin,
  hasNotch,
  hasDynamicIsland,
  getSafeAreaInsets
};