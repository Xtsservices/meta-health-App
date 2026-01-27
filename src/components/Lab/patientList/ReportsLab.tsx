import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  FlatList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';

// Icons
import {
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../../utils/SvgIcons";
import PatientProfileCard from "./PatientProfileCard";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import Footer from "../../dashboard/footer";
import { showError, showSuccess } from "../../../store/toast.slice";

// Utils
import { 
  SPACING, 
  FONT_SIZE, 
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
  isTablet 
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDate } from "../../../utils/dateTime";

const FOOTER_H = FOOTER_HEIGHT;
const SCREEN_WIDTH = Dimensions.get('window').width;

type Attachment = {
  id: number;
  fileName: string;
  fileURL: string;
  mimeType: string;
  addedOn: string;
  userID?: number;
  testID?: string | number;
  loincCode?: string;
  timeLineID?: number; 
  patientID?: number;
};

type PatientDetails = {
  id: number;
  patientID?: string;
  pID?: string;
  pName?: string;
  patientName?: string;
  phoneNumber?: string;
  phone?: string;
  ptype?: number;
  departmentName?: string;
  department_name?: string;
  dept?: string;
  doctorName?: string;
  doctor_firstName?: string;
  doctor_lastName?: string;
  alertTimestamp?: string;
  addedOn?: string;
  createdAt?: string;
  timestamp?: string;
  prescriptionURL?: string;
  fileName?: string;
  timeLineID?: number;
  isFromAlert?: boolean;
  photo?: string;
  age?: number;
  ward_name?: string;
  status?: string;
  patientStartStatus?: number;
  testsList?: any[];
  completedTime?: string;
  _completedTime?: string;
  updatedOn?: string;
  latestTestTime?: string;
  lastModified?: string;
  gender?: number;
  dob?: string;
  city?: string;
  state?: string;
  imageURL?: string;
  attachments?: any[];
  dischargeDate?: string;
  followUp?: string;
  follow_up?: string;
  followup?: string;
  FollowUp?: string;
};

const ReportsLab: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  
const { state } = route.params as any;
const { timeLineID, testID, walkinID, loincCode, patientData, tab, uploadedAttachments } = state; // Added uploadedAttachments
  

  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [completedPatientDetails, setCompletedPatientDetails] = useState<PatientDetails[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // For horizontal scroll arrows
  const flatListRef = useRef<FlatList>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Check authentication
  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        navigation.navigate("Login" as never);
        return false;
      }
      return true;
    } catch (error) {
      dispatch(showError("Authentication check failed"));
      return false;
    }
  };

  // Fetch completed patient details
  const fetchCompletedPatientDetails = async (token: string) => {
    try {
      let completedEndpoint;
      
      // DETERMINE PATIENT TYPE
      const isWalkinPatient = (timeLineID && patientData?.pID && !patientData?.patientID);      
      if (isWalkinPatient) {
        // Walk-in completed patient details
        completedEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${patientData?.id}/getWalkinReportsCompletedPatientDetails`;
      } 
      else {
        // Regular completed patient details
        completedEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getReportsCompletedPatientDetails`;
      }

      const completedResponse = await AuthFetch(completedEndpoint, token) as any;
      
      if (completedResponse?.data?.message === "success") {
        const patientList = completedResponse?.data?.patientList ?? [];
        setCompletedPatientDetails(patientList);
        
        let allFilteredAttachments: Attachment[] = [];
        
        patientList.forEach((patient: PatientDetails) => {
          const patientAttachments = patient?.attachments ?? [];
        const filtered = patientAttachments.filter(attachment => 
          attachment.testID === testID || attachment.loincCode === loincCode
        );
        allFilteredAttachments = [...allFilteredAttachments, ...filtered];
      });
              const sortedAttachments = allFilteredAttachments.sort(
          (a: Attachment, b: Attachment) => 
            new Date(b.addedOn).valueOf() - new Date(a.addedOn).valueOf()
        );
        
        setAttachments(sortedAttachments);
      } else {
        setCompletedPatientDetails([]);
        setAttachments([]);
      }
    } catch (error) {
      dispatch(showError('Error fetching completed patient details'));
      setCompletedPatientDetails([]);
      setAttachments([]);
    }
  };

  // Fetch patient details and reports
  useEffect(() => {
    const fetchData = async () => {
      try {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;

        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        
        if (!user?.hospitalID || !token) return;
      if (uploadedAttachments && uploadedAttachments.length > 0) {
        
      const filteredAttachments = uploadedAttachments
        ?.filter((attachment: Attachment) => {
          const matchesTest =
            attachment.testID === testID ||
            attachment.loincCode === loincCode;
          return matchesTest;
        })
        ?.map((attachment: Attachment) => ({
          ...attachment,
          addedOn: attachment.addedOn || new Date().toISOString(),
        }));

        
        setAttachments(filteredAttachments);
        
        // Also fetch patient details if needed
        if (patientData) {
          setPatientDetails(patientData);
        }
        
        setLoading(false);
        return; // Skip API fetch since we already have data
      }
        // Fetch patient details
        if (patientData) {
          setPatientDetails(patientData);
        } else if (timeLineID || walkinID) {
          let apiEndpoint;
          
          // DETERMINE PATIENT TYPE
          const isWalkinPatient = walkinID && (!timeLineID || timeLineID === walkinID);          
          if (isWalkinPatient) {
            // Walk-in patient details
            apiEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${walkinID}/getWalkinPatientDetails`;
          } else {
            // Regular patient details
            apiEndpoint = `test/${user?.roleName}/${user?.hospitalID}/${user?.id}/${timeLineID}/getPatientDetails`;
          }

          const response = await AuthFetch(apiEndpoint, token) as any;
          
          if (response?.data?.message === "success") {
            setPatientDetails(response?.data?.patientList?.[0] ?? null);
          }
        }

        // For completed tab, fetch completed patient details and reports
        if (tab === "completed") {
          await fetchCompletedPatientDetails(token);
        } else {
          // For normal tab, fetch attachments directly
          let attachmentsResponse;
          
          // DETERMINE PATIENT TYPE FOR ATTACHMENTS
          const isWalkinPatient = walkinID && loincCode && (!timeLineID || timeLineID === walkinID);
          
          if (isWalkinPatient) {
            // For walk-in patients - use walkinID directly
            attachmentsResponse = await AuthFetch(
              `attachment/${user?.hospitalID}/all/${walkinID}`,
              token
            );
          } else {
            // For regular patients - use patientID
            const patientIDToUse = patientData?.patientID ?? patientDetails?.patientID;
            if (patientIDToUse) {
              attachmentsResponse = await AuthFetch(
                `attachment/${user?.hospitalID}/all/${patientIDToUse}`,
                token
              ) as any;
            }
          }

          if (attachmentsResponse?.data?.message === "success") {
            // Filter attachments by testID
            const filteredAttachments = attachmentsResponse.data.attachments?.filter(
              (attachment: Attachment) => attachment.testID === testID
            ) ?? [];
            
            // Sort by date
            const sortedAttachments = filteredAttachments.sort(
              (a: Attachment, b: Attachment) => 
                new Date(b.addedOn).valueOf() - new Date(a.addedOn).valueOf()
            );
            setAttachments(sortedAttachments);
          } else {
            setAttachments([]);
          }
        }
      } catch (error) {
        dispatch(showError("Failed to fetch reports data"));
        setAttachments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, timeLineID, walkinID, patientData, loincCode, tab, testID,uploadedAttachments]);

  // Update arrow visibility based on scroll position
  useEffect(() => {
    if (allReports.length > 0 && contentWidth > 0) {
      const containerWidth = SCREEN_WIDTH - 32; // Account for padding
      const needsScrolling = contentWidth > containerWidth;
      
      if (needsScrolling) {
        setShowLeftArrow(scrollOffset > 0);
        setShowRightArrow(scrollOffset < contentWidth - containerWidth);
      } else {
        setShowLeftArrow(false);
        setShowRightArrow(false);
      }
    } else {
      setShowLeftArrow(false);
      setShowRightArrow(false);
    }
  }, [allReports, contentWidth, scrollOffset]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const layoutWidth = event.nativeEvent.layoutMeasurement.width;
    const contentWidth = event.nativeEvent.contentSize.width;
    
    setScrollOffset(contentOffsetX);
    setShowLeftArrow(contentOffsetX > 0);
    setShowRightArrow(contentOffsetX + layoutWidth < contentWidth - 1);
  };

  const handleContentSizeChange = (width: number) => {
    setContentWidth(width);
  };

  const scrollLeft = () => {
    if (flatListRef.current) {
      const newOffset = Math.max(0, scrollOffset - 200);
      flatListRef.current.scrollToOffset({
        offset: newOffset,
        animated: true,
      });
      setScrollOffset(newOffset);
    }
  };

  const scrollRight = () => {
    if (flatListRef.current && contentWidth > 0) {
      const containerWidth = SCREEN_WIDTH - 32;
      const maxOffset = Math.max(0, contentWidth - containerWidth);
      const newOffset = Math.min(maxOffset, scrollOffset + 200);
      flatListRef.current.scrollToOffset({
        offset: newOffset,
        animated: true,
      });
      setScrollOffset(newOffset);
    }
  };

  // Handle done button
  const handleDone = async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      
      let response;
      
      if (walkinID && loincCode) {
        // Walk-in test status update
        response = await AuthPost(
          `test/${user?.hospitalID}/${loincCode}/${walkinID}/walkinTestStatus`,
          { status: "completed" },
          token
        )as any;
      } else {
        // Regular test status update
        response = await AuthPost(
          `test/${user?.roleName}/${user?.hospitalID}/${testID}/testStatus`,
          { status: "completed" },
          token
        ) as any;
      }

      if (response?.data?.message === "success") {
        dispatch(showSuccess("Test marked as completed"));
        // Navigate back to patient list - patient should move to completed tab
        navigation.navigate("PatientListLab");
      } else {
        dispatch(showError("Failed to mark test as completed"));
      }
    } catch (error: any) {
      dispatch(showError(error?.message ?? "Failed to complete test"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReport = (fileURL: string) => {
    Linking.openURL(fileURL).catch(err => 
      dispatch(showError("Failed to open file"))
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") return "📄";
    if (mimeType?.startsWith('image/')) return "🖼️";
    if (mimeType?.startsWith('audio/')) return "🎵";
    if (mimeType?.startsWith('video/')) return "🎬";
    return "📎";
  };

  // Extract all reports from completed patient details for the reports section
const combineAttachments = (uploaded: Attachment[], fetched: Attachment[]): Attachment[] => {
  const combined = [...uploaded];
  
  // Add fetched attachments that aren't already in the list
  fetched.forEach(fetchedAtt => {
    if (!combined.some(uploadedAtt => uploadedAtt.id === fetchedAtt.id)) {
      combined.push(fetchedAtt);
    }
  });
  
  // Sort by date (newest first)
  return combined.sort(
    (a, b) => new Date(b.addedOn).valueOf() - new Date(a.addedOn).valueOf()
  );
};

// Update your getAllReports function
const getAllReports = () => {
  let reports: Attachment[] = [];
  
  if (tab === "completed") {
    // For completed tab: attachments are inside patientList array
    completedPatientDetails.forEach((patient: PatientDetails) => {
      const patientReports = patient?.attachments?.filter(attachment => 
        attachment.testID === testID || attachment.loincCode === loincCode
      ) ?? [];
      reports = [...reports, ...patientReports];
    });
  } else {
    // For normal tab: use the attachments state
    reports = attachments.filter(attachment => 
      attachment.testID === testID || attachment.loincCode === loincCode
    );
  }
  
  // If we have uploaded attachments, combine them
  if (uploadedAttachments && uploadedAttachments.length > 0) {
    const filteredUploaded = uploadedAttachments.filter(attachment => 
      attachment.testID === testID || attachment.loincCode === loincCode
    );
    
    // Combine and remove duplicates based on id
    const combined = [...reports];
    filteredUploaded.forEach(uploadedAtt => {
      if (!combined.some(existingAtt => existingAtt.id === uploadedAtt.id)) {
        combined.push(uploadedAtt);
      }
    });
    
    reports = combined;
  }
  
  // Sort by date (newest first)
  return reports.sort(
    (a, b) => new Date(b.addedOn).valueOf() - new Date(a.addedOn).valueOf()
  );
};
  const allReports = getAllReports();
  const renderReportItem = ({ item: attachment, index }: { item: Attachment; index: number }) => {
    return (
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <Text style={styles.reportTestName} numberOfLines={1}>
            {attachment?.fileName ?? "Test Report"}
          </Text>
        </View>
        
        <View style={styles.reportIcon}>
          <Text style={styles.reportIconText}>
            {getFileIcon(attachment.mimeType)}
          </Text>
        </View>
        
        <Text style={styles.reportFileName} numberOfLines={2}>
          {attachment.fileName}
        </Text>
        
        <Text style={styles.reportDate}>
          Added on: {formatDate(attachment.addedOn)}
        </Text>
        
        {attachment.userID && (
          <Text style={styles.reportAddedBy}>
            Added By: {attachment.userID}
          </Text>
        )}

        <TouchableOpacity
          style={styles.viewReportButton}
          onPress={() => handleViewReport(attachment.fileURL)}
        >
          <DownloadIcon size={16} color="#fff" />
          <Text style={styles.viewReportButtonText}>View Report</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 80 + FOOTER_H,
          flexGrow: 1 
        }}
      >
        {/* Patient Profile Card */}
        {patientDetails && (
          <View style={styles.section}>
            <PatientProfileCard
              patientDetails={patientDetails}
              completedDetails={completedPatientDetails}
              tab={tab}
            />
          </View>
        )}

        {/* Reports Section */}
        <View style={styles.section}>
          <View style={styles.reportsHeader}>
            <Text style={styles.sectionTitle}>
              {user?.roleName?.charAt(0)?.toUpperCase() + user?.roleName?.slice(1)} Reports
            </Text>
          </View>

          {allReports?.length > 0 ? (
            <View style={styles.horizontalScrollContainer}>
              {showLeftArrow && (
                <TouchableOpacity 
                  style={styles.scrollArrowLeft} 
                  onPress={scrollLeft} 
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ChevronLeftIcon size={24} color={COLORS.brand} />
                </TouchableOpacity>
              )}
              
              <FlatList
                ref={flatListRef}
                horizontal
                data={allReports}
                renderItem={renderReportItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reportsScrollContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={handleContentSizeChange}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={10}
                onMomentumScrollEnd={(event) => {
                  setScrollOffset(event.nativeEvent.contentOffset.x);
                }}
              />
              
              {showRightArrow && (
                    <TouchableOpacity
                      style={styles.scrollArrowRight} 
                      onPress={scrollRight} 
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ChevronRightIcon size={24} color={COLORS.brand} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noReportsContainer}>
              <Text style={styles.noReportsText}>No reports available</Text>
              <Text style={styles.noReportsSubtext}>
                {walkinID ? "Walk-in patient" : "Regular patient"} - {walkinID ?? timeLineID}
              </Text>
            </View>
          )}

          {/* Done Button */}
          {/* Only show Done button for normal tab, not for completed tab */}
          {tab !== "completed" && (
            <View style={styles.doneButtonContainer}>
              <TouchableOpacity 
                onPress={handleDone}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={[styles.doneButton, submitting && styles.doneButtonDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.doneButtonText}>Done</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: SPACING.md,
    marginTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  reportsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: isTablet ? FONT_SIZE.xl : FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  horizontalScrollContainer: {
    position: 'relative',
  },
  reportsScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: SPACING.md,
  },
  reportsGrid: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  reportCard: {
    width: responsiveWidth(40),
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reportHeader: {
    marginBottom: SPACING.sm,
  },
  reportTestName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "600",
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    alignSelf: "center",
  },
  reportIconText: {
    fontSize: 24,
  },
  reportFileName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  reportDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 4,
    textAlign: "center",
  },
  reportAddedBy: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  viewReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    gap: 6,
  },
  viewReportButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#fff",
  },
  noReportsContainer: {
    alignItems: "center",
    padding: SPACING.xl,
  },
  noReportsText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.sub,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  noReportsSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
  },
  doneButtonContainer: {
    marginTop: SPACING.lg,
    alignItems: "center",
  },
  doneButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    minWidth: responsiveWidth(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.6,
  },
  doneButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: "#fff",
  },
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
  scrollArrowLeft: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArrowRight: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReportsLab;