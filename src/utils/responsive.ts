import { Dimensions, ScaledSize } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Device detection
const isTablet = SCREEN_WIDTH >= 768;
const isSmallDevice = SCREEN_HEIGHT < 700;
const isExtraSmallDevice = SCREEN_WIDTH < 375;

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

export { 
  SCREEN_WIDTH, 
  SCREEN_HEIGHT, 
  isTablet, 
  isSmallDevice, 
  isExtraSmallDevice,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
  GRID
};