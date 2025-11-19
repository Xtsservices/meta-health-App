// Routing.tsx
import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from "./navigationTypes";
import splashScreen from "../components/splashScreen";
import login from "../components/login";
import home from "../components/home";
import dashboardOpd from "../components/OPD/dashboard";
import DashboardIpd from "../components/IPD/DashboardIpd";
import selectCategory from "../components/addPatient/selectCategory";
import addPatientForm from "../components/addPatient/addPatientForm";
import patientList from "../components/patientsList/patientList";
import patientProfile from "../components/patientsList/patientProfile";
import tabs from "../components/patientsList/tabs";
import symptoms from "../components/patientsList/symptoms/symptoms";
import addSymptoms from "../components/patientsList/symptoms/addSymptoms";
import vitals from "../components/patientsList/vitals/vitals";
import addVitals from "../components/patientsList/vitals/addVitals";
import reports from "../components/patientsList/reports/reports";
import doctors from "../components/patientsList/doctors/doctors";
import addDoctors from "../components/patientsList/doctors/addDoctors";
import timeline from "../components/patientsList/timeline/timeline";
import timelineRow from "../components/patientsList/timeline/timelineRow";
import prescription from "../components/patientsList/prescription/prescription";
import addMedicineTest from "../components/patientsList/prescription/addMedicineTest";
import medicalHistory from "../components/patientsList/medicalHistory/medicalHistory";
import editMedicalHistory from "../components/patientsList/medicalHistory/editMedicalHistory";
import transferPatient from "../components/patientsList/transferPatient";
import editPatientProfile from "../components/patientsList/patientEdit/editPatientProfile";
import medicalHistoryForm from "../components/patientsList/medicalHistory/medicalHistoryForm";
import addReports from "../components/patientsList/reports/addReports";
import appointmentsList from "../components/OPD/appointmentsList";
import dischargeSummaryDownload from "../components/patientsList/dischargeSummaryDownload";
import Management from "../components/Management/Management";
import SlotsManagement from "../components/Management/SlotsManagement/SlotsManagement";
import HelpScreen from "../components/helpStaff/HelpScreen";
import DashboardInfoScreen from "../components/helpStaff/DashboardInfo";
import TicketsScreen from "../components/helpStaff/TicketsScreen";
import NewTicketScreen from "../components/helpStaff/NewTicketScreen";
import MyTasks from "../pages/nurseDashboard/MyTasks";
import DashboardLab from "../components/Lab/DashboardLab";
import DashboardPharma from "../components/Pharmacy/DashboardPharma";
import DashboardReception from "../components/Reception/DashboardReception";
import EmergencyDashboard from "../components/Emergency/EmergencyDashboard";
import otDashboard from "../components/OT/otDashboard";
import otInnerTabs from "../components/OT/otInnerTabs";
import initialDetails from "../components/OT/physicalExamination/initialDetails";
import GeneralPhysicalExaminationMobile from "../components/OT/physicalExamination/generalPhysicalExamination";
import generalPhysicalExamination from "../components/OT/physicalExamination/generalPhysicalExamination";
import respiratory from "../components/OT/physicalExamination/respiratory";
import hepato from "../components/OT/physicalExamination/hepato";
import cardioVascular from "../components/OT/physicalExamination/cardioVascular";
import neuro from "../components/OT/physicalExamination/neuro";
import others from "../components/OT/physicalExamination/others";
import renal from "../components/OT/physicalExamination/renal";
import examinationFindingNotes from "../components/OT/physicalExamination/examinationFindingNotes";
import mallampati from "../components/OT/physicalExamination/mallampati";
import preOpControllers from "../components/OT/preOp/preOpControllers";
import surgerySchedule from "../components/OT/surgerySchedule";
import schedule from "../components/OT/schedule";
import dashboardAlerts from "../components/OT/dashboardAlerts";
import anesthesiaRecord from "../components/OT/anesthesiaRecord/anesthesiaRecord";
import breathing from "../components/OT/anesthesiaRecord/breathing";
import monitors from "../components/OT/anesthesiaRecord/monitors";
import NotificationScreen from "../components/Notification/NotificationScreen";
import TestsScreen from "../components/patientsList/tests/tests";
import AddTestsScreen from "../components/patientsList/tests/addTest";
import TreatmentPlanScreen from "../components/patientsList/treatmentplan/TreatmentPlanScreen";
import PreviousPrescriptions from "../components/patientsList/PreviousPrescriptions/PreviousPrescriptions";
import HandshakePatientScreen from "../components/patientsList/HandshakePatientScreen";
import RequestSurgeryScreen from "../components/patientsList/RequestSurgery";
import AlertsScreen from "../components/Alerts/AlertsIpd/AlertsScreen";
import DischargeScreen from "../components/discharge/DischargeScreen";
import PatientRevisitScreen from "../components/patientsList/PatientRevisit/PatientRevisitScreen";
import PocusScreen from "../components/patientsList/pocus/Pocus";
import AddPocusScreen from "../components/patientsList/pocus/AddPocus";
import PhysicalExaminationScreen from "../components/patientsList/PhysicalExamination/PhysicalExamination";
import AddPhysicalExaminationScreen from "../components/patientsList/PhysicalExamination/AddPhysicalExamination";
import AddMedicineScreen from "../components/patientsList/treatmentplan/AddMedicineScreen";
import MedicationTimelineScreen from "../components/patientsList/treatmentplan/MedicationTimelineScreen";
import DischargedPatientsIPD from "../components/IPD/DischargedPatientsIPD";
import consentForm from "../components/OT/consentForm";
import postOpNotes from "../components/OT/postOpNotes";
import PatientDetailsLab from "../components/Lab/patientList/PatientDetailsLab";
import PatientListLab from "../components/Lab/patientList/PatientListLab";
import UploadTest from "../components/Lab/patientList/UploadTest";
import TestCard from "../components/Lab/patientList/TestCard";
import AlertsLab from "../components/Alerts/AlertsLab/AlertsLab";
import SaleComp from "../components/Lab/walkIn/SaleComp";
import PaymentMethodDialog from "../components/Lab/walkIn/PaymentMethodDialog";
import PaymentScreen from "../components/Lab/walkIn/PaymentScreen";
import TestPricing from "../components/Lab/testPrice/TestPricing";
import AddTestPricing from "../components/Lab/testPrice/AddTestPricing";
import BillingLab from "../components/Lab/billing/BillingLab";
import TaxInvoiceTabs from "../components/Lab/taxInvoice/TaxInvoiceTabs";
import TaxInvoiceInPatient from "../components/Lab/taxInvoice/TaxInvoiceInPatient";
import TaxInvoiceWalkIn from "../components/Lab/taxInvoice/TaxInvoiceWalkIn";
import ReportsLab from "../components/Lab/patientList/ReportsLab";
// import addReports from "../components/patientsList/reports/addReports";



const Stack = createNativeStackNavigator<RootStackParamList>();

const Routing = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={splashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={login} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={home} options={{ headerShown: true }} />
        <Stack.Screen name="DashboardOpd" component={dashboardOpd} options={{ headerShown: false }} />
        <Stack.Screen name="DashboardIpd" component={DashboardIpd} options={{ headerShown: false }} />
        <Stack.Screen name="AddPatient" component={selectCategory} options={{ title: "Add Patient", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddPatientForm" component={addPatientForm} options={{ title: "Add Patient Form", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="PatientList" component={patientList} options={{ title: "Patients List", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="PatientProfile" component={patientProfile} options={{ title: "Patient Profile", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="Tabs" component={tabs} options={{ title: "Patient Profile", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="Symptoms" component={symptoms} options={{ title: "Symptoms", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddSymptoms" component={addSymptoms} options={{ title: "Add Symptoms", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="Vitals" component={vitals} options={{ title: "Vitals", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddVitals" component={addVitals} options={{ title: "Add Vitals", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="Reports" component={reports} options={{ title: "Reports", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddReports" component={addReports} options={{ title: "Add reports", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="Doctors" component={doctors} options={{ title: "Treating Doctors", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddDoctors" component={addDoctors} options={{ title: "Add Tresting Doctors", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="Timeline" component={timeline} options={{ title: "Timeline", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="TimelineRow" component={timelineRow} options={{ title: "TreatmentPlain", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="Prescription" component={prescription} options={{ title: "Prescription", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddMedicineTest" component={addMedicineTest} options={{ title: "Add Medicines & Tests", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddMedicineScreen" component={AddMedicineScreen} options={{ title: "Add Medicines", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="MedicalHistory" component={medicalHistory} options={{ title: "Medical History", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="EditMedicalHistory" component={editMedicalHistory} options={{ title: "Edit Medical History", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="MedicalHistoryForm" component={medicalHistoryForm} options={{ title: "Edit Medical History Form", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="TransferPatient" component={transferPatient} options={{ title: "Transfer Patient", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="EditPatientProfile" component={editPatientProfile} options={{ title: "Edit Patient Profile", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AppointmentsList" component={appointmentsList} options={{ title: "Appointments List", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="DischargeSummaryDownload" component={dischargeSummaryDownload} options={{ title: "Discharge Summary", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="DashboardLab" component={DashboardLab} />
        <Stack.Screen name="DashboardPharma" component={DashboardPharma} />
        <Stack.Screen name="DashboardReception" component={DashboardReception} />
        <Stack.Screen name="Management" component={Management} options={{ title: "Management", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen
          name="MedicationTimelineScreen"
          component={MedicationTimelineScreen}
          options={{ title: "Medication Timeline", headerTitleAlign: "center", headerShown: true }} 
        />
        <Stack.Screen
          name="SlotsManagement"
          component={SlotsManagement}
          options={{
            title: "Slots Management",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />

        {/* Help & Support Screens */}
        <Stack.Screen
          name="HelpScreen"
          component={HelpScreen}
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="DashboardInfoScreen"
          component={DashboardInfoScreen}
          options={{
            title: "Dashboard Documentation",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="TicketsScreen"
          component={TicketsScreen}
          options={{
            title: "Support Tickets",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="NewTicketScreen"
          component={NewTicketScreen}
          options={{
            title: "Create New Ticket",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="MyTasks"
          component={MyTasks}
          options={{
            title: "MyTasks",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="EmergencyDashboard"
          component={EmergencyDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="OtDashboard" component={otDashboard} options={{headerShown: false }} />
        <Stack.Screen name="DashboardAlerts" component={dashboardAlerts} options={{ title: "Surgery Alerts", headerTitleAlign: "center", headerShown: true }} />
       
        <Stack.Screen name="OtInnerTabs" component={otInnerTabs} options={{headerShown: true }} />
        <Stack.Screen name="InitialDetails" component={initialDetails} options={{ title: "Initial Details", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="GeneralPhysicalExamination" component={generalPhysicalExamination} options={{ title: "General Physical Examination", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Respiratory" component={respiratory} options={{ title: "Respiratory", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Hepato" component={hepato} options={{ title: "Hepato", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="CardioVascular" component={cardioVascular} options={{ title: "Cardio Vascular", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Neuro" component={neuro} options={{ title: "Neuro", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Renal" component={renal} options={{ title: "Renal", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Others" component={others} options={{ title: "Others", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="ExaminationFindingNotes" component={examinationFindingNotes} options={{ title: "Examination FindinfNotes", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Mallampati" component={mallampati} options={{ title: "Mallampati Grade", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="PreopControllers" component={preOpControllers} options={{ title: "Pre-op Controllers", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="SurgerySchedule" component={surgerySchedule} options={{ title: "Surgery Schedules", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Schedule" component={schedule} options={{ title: "Schedules", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="AnesthesiaRecordForm" component={anesthesiaRecord} options={{ title: "Anesthesia Record", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Breathing" component={breathing} options={{ title: "Breathing", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="Monitors" component={monitors} options={{ title: "Monitors", headerTitleAlign: "center", headerShown: true }}  />
       
        <Stack.Screen name="ConsentForm" component={consentForm} options={{ title: "Consent Form", headerTitleAlign: "center", headerShown: true }}  />
        <Stack.Screen name="PostOpRecordNotes" component={postOpNotes} options={{ title: "Post-Op Record Notes", headerTitleAlign: "center", headerShown: true }}  />

        <Stack.Screen 
          name="DischargedPatientsIPD" 
          component={DischargedPatientsIPD}
          options={{ title: "Discharged Patients", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen name="NotificationScreen" component={NotificationScreen} options={{ title: "Notification", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="Tests" component={TestsScreen} options={{ title: "Tests", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddTests" component={AddTestsScreen} options={{ title: "Add Tests", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen
          name="TreatmentPlan"
          component={TreatmentPlanScreen}
          options={{ title: "Treatment Plan", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen
          name="PreviousPrescriptions"
          component={PreviousPrescriptions}
          options={{ title: "Previous Prescriptions", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen name="HandshakePatientScreen" component={HandshakePatientScreen} options={{ title: "Handshake Patient", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="RequestSurgeryScreen" component={RequestSurgeryScreen} options={{ title: "Request Surgery", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen
          name="AlertsScreen"
          component={AlertsScreen}
          options={{ title: "Alerts", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen
          name="DischargeScreen"
          component={DischargeScreen}
          options={{ title: "Discharge Screen", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen
          name="PatientRevisitScreen"
          component={PatientRevisitScreen}
          options={{ title: "Patient Revisit", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen
          name="Pocus"
          component={PocusScreen}
          options={{ title: "Pocus", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen
          name="AddPocus"
          component={AddPocusScreen}
          options={{ title: "Add Pocus", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen
          name="PhysicalExamination"
          component={PhysicalExaminationScreen}
          options={{ title: "Physical Examination", headerTitleAlign: "center", headerShown: true }}
        />
        <Stack.Screen
          name="AddPhysicalExamination"
          component={AddPhysicalExaminationScreen}
          options={{ title: "Add Physical Examination", headerTitleAlign: "center", headerShown: true }}
        />


         {/* labs */}
          <Stack.Screen 
            name="PatientListLab" 
            component={PatientListLab}
            options={{ title: "Patient List", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="PatientDetailsLab" 
            component={PatientDetailsLab}
            options={{ title: "Patient Details", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="UploadTest" 
            component={UploadTest}
            options={{ title: "Upload Test Results", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="TestCard" 
            component={TestCard}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AlertsLab" 
            component={AlertsLab}
            options={{ title: "Alerts", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="SaleComp" 
            component={SaleComp}
            options={{ title: "Walk-In", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="PaymentMethodDialog" 
            component={PaymentMethodDialog}
            options={{ title: "Walk-In", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="PaymentScreen" 
            component={PaymentScreen}
            options={{ title: 'Payment' }}
          />
          <Stack.Screen 
            name="TestPricing" 
            component={TestPricing}
            options={{ title: "Test Price", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="AddTestPricing" 
            component={AddTestPricing}
            options={{ title: "Add Test Price", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="BillingLab" 
            component={BillingLab}
            options={{ title: "Billing", headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="BillingRadio" 
            component={BillingLab} // Same component, different title
            options={{ title: 'Radiology Billing' }}
          />
           {/* Tax Invoice*/}
          <Stack.Screen 
            name="TaxInvoiceLab" 
            component={TaxInvoiceTabs}
            options={{ title: 'Laboratory Tax Invoice', headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="TaxInvoiceRadio" 
            component={TaxInvoiceTabs}
            options={{ title: 'Radiology Tax Invoice', headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="TaxInvoiceInPatient" 
            component={TaxInvoiceInPatient}
            options={{ title: 'In-Patient Tax Invoice', headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen 
            name="TaxInvoiceWalkIn" 
            component={TaxInvoiceWalkIn}
            options={{ title: 'Walk-In Tax Invoice', headerTitleAlign: "center", headerShown: true }}
          />
          <Stack.Screen name="ReportsLab" 
          component={ReportsLab}
          options={{ title: 'Reports', headerTitleAlign: "center", headerShown: true }}
          />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Routing;