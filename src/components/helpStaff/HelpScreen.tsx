import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { Role_NAME, SCOPE_LIST } from "../../utils/role";
import { 
  PhoneIcon, 
  MailIcon, 
  FileTextIcon, 
  MessageCircleIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  ArrowLeftIcon 
} from "../../utils/SvgIcons";

// ---- Types ----
type Department = {
  id: string;
  name: string;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string | React.ReactNode;
  adminOnly?: boolean;
};

// ---- Main Component ----
const HelpScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);
  const [openFaq, setOpenFaq] = useState<string[]>([]);
  const [departmentData, setDepartmentData] = useState<Department[]>([]);

  // Get available scopes
  const availableScopes = user?.scope?.split?.("#")?.map?.(Number) || [];
  const filteredScopeList = Object.fromEntries(
    Object.entries(SCOPE_LIST)?.filter?.(([_, value]) => availableScopes?.includes?.(value)) || []
  );

  // FAQ Data
  const faqData: FAQItem[] = [
    {
      id: "1",
      question: "How do I create a new patient?",
      answer: 'To create a new patient, click on the "Add Patient".',
    },
    {
      id: "2",
      question: "How can I reset my password?",
      answer: 'Go to the profile page, enter "New Password" and "Confirm Password", then click on Update Changes.',
    },
    {
      id: "3",
      question: "How can I update my profile?",
      answer: 'On the profile page, "Upload Image" or update details, then click on Update Changes.',
    },
    {
      id: "4",
      question: "How Admin can add Staff?",
      answer: (
        <View style={styles.adminAnswer}>
          <Text style={styles.adminNote}>
            Note: <Text style={styles.normalWeight}>Upload staff details.</Text>
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              <Text style={styles.bulletLabel}>Roles:</Text>{" "}
              {Object.entries(Role_NAME)
                ?.filter?.(([key]) => !["sAdmin", "customerCare", "admin"]?.includes?.(key))
                ?.map?.(([key, value]) => `${key?.replace?.(/([A-Z])/g, " $1")} - ${value}`)
                ?.join?.(", ")}
            </Text>
            <Text style={styles.bulletItem}>
              <Text style={styles.bulletLabel}>Gender:</Text> Male: 1, Female: 2, Others: 3
            </Text>
            <Text style={styles.bulletItem}>
              <Text style={styles.bulletLabel}>Scopes:</Text>{" "}
              {Object.entries(filteredScopeList)
                ?.map?.(([key, value]) => `${key?.replace?.(/_/g, " ")} - ${value}`)
                ?.join?.(", ")}
            </Text>
            {departmentData?.length > 0 && (
              <Text style={styles.bulletItem}>
                <Text style={styles.bulletLabel}>Departments:</Text>{" "}
                {departmentData?.map?.((each, index) => (
                  <Text key={each.id}>
                    {each.name}: {each.id}
                    {index < departmentData?.length - 1 && ", "}
                  </Text>
                ))}
              </Text>
            )}
          </View>
        </View>
      ),
      adminOnly: true,
    },
  ];

  // Fetch department data
  useEffect(() => {
    const getAllDepartment = async () => {
      try {
        if (!user?.hospitalID || !user?.token) return;
        
        const response = await AuthFetch(`department/${user.hospitalID}`, user.token);
        if (response?.message === "success") {
          setDepartmentData(response?.departments || []);
        }
      } catch (error) {
        // Error handled silently
      }
    };

    if (user?.hospitalID) {
      getAllDepartment();
    }
  }, [user?.hospitalID, user?.token]);

  // Toggle FAQ
  const toggleFaq = (id: string) => {
    setOpenFaq(prev =>
      prev?.includes?.(id) ? prev?.filter?.(x => x !== id) : [...prev, id]
    );
  };

  // Handle contact actions
  const handleCall = () => {
    Linking.openURL("tel:+15550199");
  };

  const handleEmail = () => {
    Linking.openURL("mailto:support@metahealth.com");
  };

  // Filter FAQ based on user role
  const filteredFaqData = faqData?.filter?.(item => 
    !item.adminOnly || user?.role === "admin"
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Medical System Support Center</Text>
          <Text style={styles.heroSub}>
            Find answers to common questions about patient management, system navigation, and medical workflows
          </Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.features}>
          {/* Documentation Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, { backgroundColor: "rgba(20, 184, 166, 0.1)" }]}>
                <FileTextIcon size={24} color="#14b8a6" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>System Documentation</Text>
                <Text style={styles.cardText}>
                  Access comprehensive guides for patient management and system features
                </Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity 
                    style={styles.btnOutline}
                    onPress={() => {
                      navigation.navigate("DashboardInfoScreen" as never);
                    }}
                  >
                    <Text style={styles.btnOutlineText}>View Documentation</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Technical Support Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, { backgroundColor: "rgba(20, 184, 166, 0.1)" }]}>
                <MessageCircleIcon size={24} color="#14b8a6" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Technical Support</Text>
                <Text style={styles.cardText}>
                  Get assistance with system issues and technical problems
                </Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity 
                    style={styles.btnOutline}
                    onPress={() => {
                      navigation.navigate("TicketsScreen" as never);
                    }}
                  >
                    <Text style={styles.btnOutlineText}>Contact Support</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Card */}
        <View style={[styles.card, styles.contactCard]}>
          <Text style={styles.cardTitle}>Need Additional Assistance?</Text>
          <Text style={styles.cardText}>
            If you can't find the information you're looking for, our medical IT support team is here to help.
          </Text>
          <View style={styles.contactList}>
            <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
              <PhoneIcon size={16} color="#6b7280" />
              <Text style={styles.contactText}>Emergency: +1 (555) 0199</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
              <MailIcon size={16} color="#6b7280" />
              <Text style={styles.contactText}>support@metahealth.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <View style={styles.faqHeader}>
            <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
            <Text style={styles.faqSub}>
              Common questions about patient management and system operations
            </Text>
          </View>

          <View style={styles.faqList}>
            {filteredFaqData?.map?.(item => {
              const isOpen = openFaq?.includes?.(item.id);
              return (
                <View key={item.id} style={styles.faqItem}>
                  <TouchableOpacity 
                    style={styles.faqQuestion}
                    onPress={() => toggleFaq(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    {isOpen ? (
                      <ChevronUpIcon size={16} color="#6b7280" />
                    ) : (
                      <ChevronDownIcon size={16} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={styles.faqAnswer}>
                      {typeof item.answer === 'string' ? (
                        <Text style={styles.faqAnswerText}>{item.answer}</Text>
                      ) : (
                        item.answer
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;
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
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
  },
  hero: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
    paddingHorizontal: isSmallDevice ? 8 : 0,
  },
  heroTitle: {
    fontSize: isSmallDevice ? 20 : 22,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 28,
  },
  heroSub: {
    fontSize: isSmallDevice ? 13 : 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 680,
  },
  features: {
    gap: 16,
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    padding: 20,
    ...(isTablet ? { width: "48%" } : {}),
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnOutlineText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  contactCard: {
    marginBottom: 32,
  },
  contactList: {
    gap: 12,
    marginTop: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: "#6b7280",
  },
  faqSection: {
    marginBottom: 40,
  },
  faqHeader: {
    marginBottom: 24,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  faqSub: {
    fontSize: 13,
    color: "#6b7280",
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "transparent",
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  adminAnswer: {
    gap: 8,
  },
  adminNote: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  normalWeight: {
    fontWeight: "400",
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  bulletLabel: {
    fontWeight: "600",
    color: "#111827",
  },
});

// For tablet layout
if (isTablet) {
  Object.assign(styles, {
    features: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 24,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 16,
    },
    hero: {
      paddingHorizontal: 0,
    },
  });
}

export default HelpScreen;