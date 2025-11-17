// styles/DischargeStyles.ts
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor: number = 0.5) => size + (scale(size) - size) * factor;

export const RESPONSIVE = {
  screen: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  spacing: {
    xs: verticalScale(4),
    sm: verticalScale(8),
    md: verticalScale(12),
    lg: verticalScale(16),
    xl: verticalScale(20),
    xxl: verticalScale(24),
  },
  fontSize: {
    xs: moderateScale(10),
    sm: moderateScale(12),
    md: moderateScale(14),
    lg: moderateScale(16),
    xl: moderateScale(18),
    xxl: moderateScale(20),
  },
  borderRadius: {
    sm: moderateScale(4),
    md: moderateScale(8),
    lg: moderateScale(12),
    xl: moderateScale(16),
  },
  icon: {
    sm: moderateScale(16),
    md: moderateScale(20),
    lg: moderateScale(24),
    xl: moderateScale(28),
  },
  button: {
    sm: verticalScale(32),
    md: verticalScale(40),
    lg: verticalScale(48),
  },
};

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: RESPONSIVE.spacing.lg,
  },
  gridContainer: {
    flexDirection: SCREEN_WIDTH > 768 ? "row" : "column",
  },
  formColumn: {
    flex: 1,
  },
  imageColumn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: SCREEN_WIDTH > 768 ? RESPONSIVE.spacing.lg : 0,
    paddingTop: SCREEN_WIDTH > 768 ? 0 : RESPONSIVE.spacing.lg,
  },
  dischargeImage: {
    width: SCREEN_WIDTH > 768 ? 200 : 150,
    height: SCREEN_WIDTH > 768 ? 200 : 150,
  },
  formGroup: {
    marginBottom: RESPONSIVE.spacing.lg,
  },
  label: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "600",
    marginBottom: RESPONSIVE.spacing.sm,
  },
  sectionTitle: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontWeight: "bold",
    marginBottom: RESPONSIVE.spacing.md,
  },
// In your DischargeStyles.ts, REPLACE these styles:

pickerContainer: {
  borderWidth: 1,
  borderRadius: RESPONSIVE.borderRadius.md,
  // REMOVE: overflow: "hidden", // This causes text cutting
  // REMOVE: fixed height
  minHeight: RESPONSIVE.button.md, // Use minHeight instead of fixed height
  justifyContent: 'center', // Center the content vertically
},

picker: {
  // REMOVE: height: RESPONSIVE.button.md, // Don't use fixed height
  paddingVertical: 0, // Remove vertical padding that might cause issues
  margin: 0, // Remove any margins
},

// If you're on Android, you might need this additional style:
pickerItem: {
  fontSize: RESPONSIVE.fontSize.md, // Ensure proper font size
  height: RESPONSIVE.button.md, // Set height for individual items
},
  input: {
    borderWidth: 1,
    borderRadius: RESPONSIVE.borderRadius.md,
    padding: RESPONSIVE.spacing.md,
    fontSize: RESPONSIVE.fontSize.md,
  },
  disabledInput: {
    opacity: 0.7,
  },
  textArea: {
    minHeight: verticalScale(100),
    textAlignVertical: "top",
  },
  // Diet Dropdown Styles
  dietDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: RESPONSIVE.borderRadius.md,
    padding: RESPONSIVE.spacing.md,
    marginBottom: RESPONSIVE.spacing.sm,
  },
  dietDropdownText: {
    fontSize: RESPONSIVE.fontSize.md,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: RESPONSIVE.spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: RESPONSIVE.spacing.md,
    paddingVertical: RESPONSIVE.spacing.xs,
    borderRadius: RESPONSIVE.borderRadius.lg,
    marginRight: RESPONSIVE.spacing.sm,
    marginBottom: RESPONSIVE.spacing.sm,
  },
  chipText: {
    fontSize: RESPONSIVE.fontSize.sm,
    marginRight: RESPONSIVE.spacing.xs,
  },
  chipRemove: {
    padding: RESPONSIVE.spacing.xs,
  },
  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dropdownContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: RESPONSIVE.borderRadius.xl,
    borderTopRightRadius: RESPONSIVE.borderRadius.xl,
    maxHeight: "80%",
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: RESPONSIVE.spacing.xl,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontWeight: "bold",
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: RESPONSIVE.borderRadius.md,
    padding: RESPONSIVE.spacing.md,
    margin: RESPONSIVE.spacing.lg,
    fontSize: RESPONSIVE.fontSize.md,
  },
  dietList: {
    maxHeight: verticalScale(300),
  },
  dietItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: RESPONSIVE.spacing.lg,
    borderBottomWidth: 1,
  },
  dietItemText: {
    fontSize: RESPONSIVE.fontSize.md,
    flex: 1,
  },
  checkbox: {
    width: RESPONSIVE.icon.md,
    height: RESPONSIVE.icon.md,
    borderRadius: RESPONSIVE.borderRadius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "white",
    fontSize: RESPONSIVE.fontSize.xs,
    fontWeight: "bold",
  },
  dropdownActions: {
    flexDirection: "row",
    padding: RESPONSIVE.spacing.lg,
    borderTopWidth: 1,
  },
  dropdownButton: {
    flex: 1,
    paddingVertical: RESPONSIVE.spacing.md,
    borderRadius: RESPONSIVE.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: RESPONSIVE.spacing.sm,
  },
  dropdownButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: RESPONSIVE.fontSize.md,
  },
  row: {
    flexDirection: SCREEN_WIDTH > 480 ? "row" : "column",
  },
  halfWidth: {
    flex: 1,
    marginRight: SCREEN_WIDTH > 480 ? RESPONSIVE.spacing.md : 0,
    marginBottom: SCREEN_WIDTH > 480 ? 0 : RESPONSIVE.spacing.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: RESPONSIVE.spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: RESPONSIVE.spacing.lg,
    borderRadius: RESPONSIVE.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: RESPONSIVE.spacing.sm,
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: RESPONSIVE.fontSize.md,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: RESPONSIVE.fontSize.md,
  },
  // Footer Styles
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 70,
    justifyContent: "center",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  // Loading Styles
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: RESPONSIVE.spacing.xl,
  },
  loadingText: {
    marginTop: RESPONSIVE.spacing.md,
    fontSize: RESPONSIVE.fontSize.md,
  },
});