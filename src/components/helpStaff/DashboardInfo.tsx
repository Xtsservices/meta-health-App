import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";


const sectionsData = [
  {
    id: 1,
    heading: "Total Patient Card",
    paragraph: "Provides a comprehensive count of all patients currently admitted across various wards in the hospital. Quickly view the total number of inpatients and monitor ward-specific patient distribution.",
  },
  {
    id: 2,
    heading: "Active Patient Card",
    paragraph: "Displays the count of patients currently receiving active treatment, including those undergoing procedures or receiving care in various wards. Stay informed about ongoing cases in real time",
  },
  {
    id: 3,
    heading: "Discharge Patient Card",
    paragraph: "Shows the total count of patients recently discharged, along with key details like discharge dates, treatment summaries, and follow-up plans. Easily track completed cases for smooth post-care coordination.",
  },
  {
    id: 4,
    heading: "Month Patient Card",
    paragraph: "Displays the total number of patients managed during the current month, including admissions, active treatments, and discharges. Track visits across modules such as Triage, Emergency (Red, Yellow, Green), Pathology, and Radiology. Analyze monthly hospital performance and module-specific trends with ease",
  },
  {
    id: 5,
    heading: "Year Patient Card",
    paragraph: "Shows the total number of patients managed throughout the year, including admissions, active treatments, and discharges. Additionally, track visits across modules such as Triage, Emergency (Red, Yellow, Green), Pathology, and Radiology for the current year. Analyze hospital performance and module-specific trends effortlessly.",
  },
  {
    id: 6,
    heading: "Patient Visit By Ward Card (Pie Chart)",
    paragraph: "Visualize patient visits across different wards using an interactive pie chart. The chart categorizes visits by week, month, and year, helping you easily identify the busiest wards and analyze trends over time.",
  },
];

const DashboardInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeSection, setActiveSection] = useState<number>(0);

  const scrollToSection = useCallback((index: number) => {
    setActiveSection(index);
    const sectionHeight = 250; 
    const offset = index * sectionHeight;
    scrollViewRef.current?.scrollTo?.({ y: offset, animated: true });
  }, []);

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const sectionHeight = 250;
    const currentSection = Math.floor(offsetY / sectionHeight);
    setActiveSection(Math.max(0, Math.min(currentSection, sectionsData?.length - 1)));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.content}>
        {/* Sidebar Navigation */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {sectionsData?.map?.((section, index) => (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.sidebarItem,
                  activeSection === index && styles.sidebarItemActive,
                ]}
                onPress={() => scrollToSection(index)}
              >
                <Text
                  style={[
                    styles.sidebarText,
                    activeSection === index && styles.sidebarTextActive,
                  ]}
                >
                  {section.heading}
                </Text>
                {activeSection === index && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {sectionsData?.map?.((section, index) => (
              <View key={section.id} style={styles.section}>
                <View style={styles.sectionContent}>
                  <View style={styles.textContent}>
                    <Text style={styles.sectionHeading}>{section.heading}</Text>
                    <Text style={styles.sectionParagraph}>{section.paragraph}</Text>
                  </View>
                  <Image
                    source={section.imageUrl}
                    style={styles.sectionImage}
                    resizeMode="cover"
                  />
                </View>
                {index < sectionsData?.length - 1 && <View style={styles.sectionDivider} />}
              </View>
            ))}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get("window");
const isTablet = width >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 32,
  },
  content: {
    flex: 1,
    flexDirection: isTablet ? "row" : "column",
  },
  sidebar: {
    width: isTablet ? "30%" : "100%",
    maxWidth: isTablet ? 300 : "100%",
    backgroundColor: "#f8f9fa",
    borderRightWidth: isTablet ? 1 : 0,
    borderRightColor: "#e0e0e0",
    paddingVertical: 16,
  },
  sidebarItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    position: "relative",
  },
  sidebarItemActive: {
    backgroundColor: "#fff",
    borderLeftColor: "#14b8a6",
  },
  sidebarText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  sidebarTextActive: {
    color: "#111827",
    fontWeight: "600",
  },
  activeIndicator: {
    position: "absolute",
    right: 8,
    top: "50%",
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#14b8a6",
  },
  mainContent: {
    flex: 1,
  },
  section: {
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  sectionContent: {
    flexDirection: isTablet ? "row" : "column",
    alignItems: isTablet ? "flex-start" : "center",
    gap: 20,
  },
  textContent: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
    textAlign: isTablet ? "left" : "center",
  },
  sectionParagraph: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    textAlign: isTablet ? "left" : "center",
  },
  sectionImage: {
    width: isTablet ? 200 : 150,
    height: isTablet ? 150 : 112,
    borderRadius: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default DashboardInfoScreen;