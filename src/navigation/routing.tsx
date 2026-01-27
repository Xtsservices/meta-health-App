// Routing.tsx
import React from 'react';
import { HeaderBackButton } from '@react-navigation/elements';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigationTypes';
import splashScreen from '../components/splashScreen';
import login from '../components/login';
import home from '../components/home';
import dashboardOpd from '../components/OPD/dashboard';
import DashboardIpd from '../components/IPD/DashboardIpd';
import selectCategory from '../components/addPatient/selectCategory';
import addPatientForm from '../components/addPatient/addPatientForm';
import patientList from '../components/patientsList/patientList';
import patientProfile from '../components/patientsList/patientProfile';
import tabs from '../components/patientsList/tabs';
import symptoms from '../components/patientsList/symptoms/symptoms';
import addSymptoms from '../components/patientsList/symptoms/addSymptoms';
import vitals from '../components/patientsList/vitals/vitals';
import addVitals from '../components/patientsList/vitals/addVitals';
import reports from '../components/patientsList/reports/reports';
import doctors from '../components/patientsList/doctors/doctors';
import addDoctors from '../components/patientsList/doctors/addDoctors';
import timeline from '../components/patientsList/timeline/timeline';
import timelineRow from '../components/patientsList/timeline/timelineRow';
import prescription from '../components/patientsList/prescription/prescription';
import addMedicineTest from '../components/patientsList/prescription/addMedicineTest';
import medicalHistory from '../components/patientsList/medicalHistory/medicalHistory';
import editMedicalHistory from '../components/patientsList/medicalHistory/editMedicalHistory';
import transferPatient from '../components/patientsList/transferPatient';
import editPatientProfile from '../components/patientsList/patientEdit/editPatientProfile';
import medicalHistoryForm from '../components/patientsList/medicalHistory/medicalHistoryForm';
import addReports from '../components/patientsList/reports/addReports';
import appointmentsList from '../components/OPD/appointmentsList';
import dischargeSummaryDownload from '../components/patientsList/dischargeSummaryDownload';
import Management from '../components/Management/Management';
import SlotsManagement from '../components/Management/SlotsManagement/SlotsManagement';
import HelpScreen from '../components/helpStaff/HelpScreen';
import DashboardInfoScreen from '../components/helpStaff/DashboardInfo';
import TicketsScreen from '../components/helpStaff/TicketsScreen';
import NewTicketScreen from '../components/helpStaff/NewTicketScreen';
import MyTasks from '../pages/nurseDashboard/MyTasks';
import DashboardLab from '../components/Lab/DashboardLab';
import DashboardPharma from '../components/Pharmacy/DashboardPharma';
import DashboardReception from '../components/Reception/DashboardReception';
import EmergencyDashboard from '../components/Emergency/EmergencyDashboard';
import otDashboard from '../components/OT/otDashboard';
import otInnerTabs from '../components/OT/otInnerTabs';
import initialDetails from '../components/OT/physicalExamination/initialDetails';
import GeneralPhysicalExaminationMobile from '../components/OT/physicalExamination/generalPhysicalExamination';
import generalPhysicalExamination from '../components/OT/physicalExamination/generalPhysicalExamination';
import respiratory from '../components/OT/physicalExamination/respiratory';
import hepato from '../components/OT/physicalExamination/hepato';
import cardioVascular from '../components/OT/physicalExamination/cardioVascular';
import neuro from '../components/OT/physicalExamination/neuro';
import others from '../components/OT/physicalExamination/others';
import renal from '../components/OT/physicalExamination/renal';
import examinationFindingNotes from '../components/OT/physicalExamination/examinationFindingNotes';
import mallampati from '../components/OT/physicalExamination/mallampati';
import preOpControllers from '../components/OT/preOp/preOpControllers';
import surgerySchedule from '../components/OT/surgerySchedule';
import schedule from '../components/OT/schedule';
import dashboardAlerts from '../components/OT/dashboardAlerts';
import anesthesiaRecord from '../components/OT/anesthesiaRecord/anesthesiaRecord';
import breathing from '../components/OT/anesthesiaRecord/breathing';
import monitors from '../components/OT/anesthesiaRecord/monitors';
import NotificationScreen from '../components/Notification/NotificationScreen';
import TestsScreen from '../components/patientsList/tests/tests';
import AddTestsScreen from '../components/patientsList/tests/addTest';
import TreatmentPlanScreen from '../components/patientsList/treatmentplan/TreatmentPlanScreen';
import PreviousPrescriptions from '../components/patientsList/PreviousPrescriptions/PreviousPrescriptions';
import HandshakePatientScreen from '../components/patientsList/HandshakePatientScreen';
import RequestSurgeryScreen from '../components/patientsList/RequestSurgery';
import AlertsScreen from '../components/Alerts/AlertsIpd/AlertsScreen';
import DischargeScreen from '../components/discharge/DischargeScreen';
import PatientRevisitScreen from '../components/patientsList/PatientRevisit/PatientRevisitScreen';
import PocusScreen from '../components/patientsList/pocus/Pocus';
import AddPocusScreen from '../components/patientsList/pocus/AddPocus';
import PhysicalExaminationScreen from '../components/patientsList/PhysicalExamination/PhysicalExamination';
import AddPhysicalExaminationScreen from '../components/patientsList/PhysicalExamination/AddPhysicalExamination';
import AddMedicineScreen from '../components/patientsList/treatmentplan/AddMedicineScreen';
import MedicationTimelineScreen from '../components/patientsList/treatmentplan/MedicationTimelineScreen';
import DischargedPatientsIPD from '../components/IPD/DischargedPatientsIPD';
import dashboard from '../components/Triage/dashboard';
import addTriageIssue from '../components/Triage/addTriageIssue';
import triageDialog from '../components/Triage/triageDialog';
import triageFormContext from '../components/Triage/context/triageFormContext';

import triageABCDScreen from '../components/Triage/triageABCDScreen';
import triageGCSForm from '../components/Triage/triageGCSForm';
import triageType from '../components/Triage/triageType';
import traumaForm from '../components/Triage/traumaForm';
import nontraumaForm from '../components/Triage/nontraumaForm';
import triageZone from '../components/Triage/triageZone';

import consentForm from '../components/OT/consentForm';
import postOpNotes from '../components/OT/postOpNotes';
import wardManagement from '../components/Reception/wardManagement';
import AppointmentTabsMobile from '../components/Reception/appointments.tsx/appointmentTabs';
import appointmentForm from '../components/Reception/appointments.tsx/appointmentForm';
import appointmentList from '../components/Reception/appointments.tsx/appointmentList';
import receptionPatientsList from '../components/Reception/receptionPatientsList';
import DoctorManagementMobile from '../components/Reception/doctorManagement/doctorManagement';
import DoctorSlotsScreen from '../components/Reception/doctorManagement/doctorSlots';
import PatientDetailsLab from '../components/Lab/patientList/PatientDetailsLab';
import PatientListLab from '../components/Lab/patientList/PatientListLab';
import UploadTest from '../components/Lab/patientList/UploadTest';
import TestCard from '../components/Lab/patientList/TestCard';
import AlertsLab from '../components/Alerts/AlertsLab/AlertsLab';
import SaleComp from '../components/Lab/walkIn/SaleComp';
import PaymentScreen from '../components/Lab/walkIn/PaymentScreen';
import TestPricing from '../components/Lab/testPrice/TestPricing';
import AddTestPricing from '../components/Lab/testPrice/AddTestPricing';
import BillingLab from '../components/Lab/billing/BillingLab';
import TaxInvoiceTabs from '../components/Lab/taxInvoice/TaxInvoiceTabs';
import TaxInvoiceInPatient from '../components/Lab/taxInvoice/TaxInvoiceInPatient';
import TaxInvoiceWalkIn from '../components/Lab/taxInvoice/TaxInvoiceWalkIn';
import ReportsLab from '../components/Lab/patientList/ReportsLab';
import taxInvoiceTabs from '../components/Reception/taxInvoice/taxInvoiceTabs';
import invoiceDetails from '../components/Reception/taxInvoice/invoiceDetails';
import PharmacyExpenses from '../components/Pharmacy/orderPlacement/PharmacyExpenses';
import InStock from '../components/Pharmacy/InStock/InStock';

import AddInventory from '../components/Pharmacy/inventory/AddInventory';
import InventoryDetails from '../components/Pharmacy/inventory/InventoryDetails';
import AddInventoryItemScreen from '../components/Pharmacy/inventory/AddInventoryItem';
import PharmacyOrderDetailsScreen from '../components/Pharmacy/PharmacyOrderDetailsScreen';
import doctorProfile from '../components/dashboard/doctorProfile';
import RegisterAmbulance from '../components/ambulance/registerAmbulance';
import AmbulanceAdminDashboard from '../components/ambulance/AmbulanceAdminDashboard';
import AmbulanceList from '../components/ambulance/AmbulanceList';
import AmbulanceLocation from '../components/ambulance/AmbulanceLocation';
import AmbulanceSettings from '../components/ambulance/AmbulanceSettings';
import AmbulanceForm from '../components/ambulance/AmbulanceForm';
import AmbulanceDetails from '../components/ambulance/AmbulanceDetails';
import Drivers from '../components/ambulance/Drivers';
import AddDriver from '../components/ambulance/AddDriver';
// import addReports from "../components/patientsList/reports/addReports";

import AmbulanceDriverDashboard from '../components/ambulanceDriver/AmbulanceDriverDashboard';
import AmbulanceDriverActiveTrip from '../components/ambulanceDriver/AmbulanceDriverActiveTrip';
import AmbulanceDriverSettings from '../components/ambulanceDriver/AmbulanceDriverSettings';
import AmbulanceDriverHistory from '../components/ambulanceDriver/AmbulanceDriverHistory';
import AmbulanceStaffDashboard from '../components/ambulanceStaff/AmbulanceStaffDashboard';
import AmbulanceStaffAddVitals from '../components/ambulanceStaff/AmbulanceStaffAddVitals';
import AmbulanceStaffActiveTrip from '../components/ambulanceStaff/AmbulanceStaffActiveTrip';
import AmbulanceStaffAssignments from '../components/ambulanceStaff/AmbulanceStaffAssignments';
import AmbulanceStaffSettings from '../components/ambulanceStaff/AmbulanceStaffSettings';
import OrderDetailScreen from '../components/Pharmacy/orderPlacement/OrderDetailScreen';
import ReceptionOrderDetailsScreen from '../components/Reception/ReceptionOrderDetailsScreen';
import OrderExpenseDialog from '../components/Pharmacy/orderPlacement/OrderExpenseDialog';
import LandingPage from '../components/LandingPage';
import ServicesScreen from '../components/ServicesScreen';
import HospitalRegistrationScreen from '../components/registation/Hospital';
import BloodBankRegistrationScreen from '../components/registation/BloodBank';
import LabRegistrationScreen from '../components/registation/Lab';
import DoctorRegistrationScreen from '../components/registation/Doctor';
import PharmacyRegistrationScreen from '../components/registation/Pharmacy';
import HospitalProfileForm from '../components/registation/HospitalProfileForm';
import DiagnosticProfileForm from '../components/registation/DiagnosticProfileForm';
import PharmacyProfileForm from '../components/registation/PharmacyProfileForm';
import NurseDashboard from '../components/nurse/nursedashboard';
import NursePatientsList from '../components/nurse/patientList/NursePatientsList';
import nurseAlerts from '../components/nurse/alerts/nurseAlerts';
import NurseAlerts from '../components/nurse/alerts/nurseAlerts';
import NurseManagement from '../components/nurse/management/NurseManagement';
import nurseProfile from '../components/nurse/nurseProfile';
import AddShiftScreen from '../components/nurse/management/AddShiftScreen';
import AddLeaveScreen from '../components/nurse/management/AddLeaveScreen';
import EditShiftScreen from '../components/nurse/management/EditShiftScreen';
import PatientListScreen from '../components/cardList/PatientListScreen';
import PharmacyPatientListScreen from '../components/cardList/PharmacyPatientList';
import IPDPatientListScreen from '../components/cardList/IPDPatientList';
import OtPatientList from '../components/cardList/OtPatientList';
import ApprovedRejectedList from '../components/cardList/ApprovedRejectedList';
import OPDTriagePatientListScreen from '../components/cardList/PatientListScreen';
import AddDoctorLeave from '../components/Management/LeaveManagement/AddDoctorLeave';
import RevenueScreen from '../components/RevenueScreen';
import AllTransactionsScreen from '../components/AllTransactionsScreen';
import CommissionAndFeeScreen from '../components/CommissionAndFeeScreen/CommissionAndFeeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Routing = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="Splash"
          component={splashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={login}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="LandingPage" 
        component={LandingPage} />

<Stack.Screen 
  name="Services" 
  component={ServicesScreen}
  options={{  
    title: 'Services',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
/>

<Stack.Screen 
  name="HospitalRegistration" 
  component={HospitalRegistrationScreen}
  options={{ 
    title: 'Hospital Registration',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
/>

<Stack.Screen 
  name="DoctorRegistration" 
  component={DoctorRegistrationScreen}
  options={{ 
    title: 'Doctor Registration',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
/>

<Stack.Screen 
  name="PharmacyRegistration" 
  component={PharmacyRegistrationScreen}
  options={{ 
    title: 'Pharmacy Registration',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
/>

<Stack.Screen 
  name="LabRegistration" 
  component={LabRegistrationScreen}
  options={{ 
    title: 'Lab Registration',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
/>

<Stack.Screen 
  name="BloodBankRegistration" 
  component={BloodBankRegistrationScreen}
  options={{ 
    title: 'Blood Bank Registration',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
/>
<Stack.Screen 
  name="HospitalProfileForm" 
  component={HospitalProfileForm}
  options={{ 
    title: 'Hospital Profile',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
/>

<Stack.Screen 
  name="DiagnosticProfileForm" 
  component={DiagnosticProfileForm}
  options={{ 
    title: 'Diagnostic Profile',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
/>

<Stack.Screen 
  name="PharmacyProfileForm" 
  component={PharmacyProfileForm}
  options={{ 
    title: 'Pharmacy Profile',
    headerTitleAlign: 'center',
    headerShown: true,
  }} 
        />
        <Stack.Screen
          name="Home"
          component={home}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="DashboardOpd"
          component={dashboardOpd}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DashboardIpd"
          component={DashboardIpd}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddPatient"
          component={selectCategory}
          options={{
            title: 'Add Patient',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddPatientForm"
          component={addPatientForm}
          options={{
            title: 'Add Patient Form',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PatientList"
          component={patientList}
          options={{
            title: 'Patients List',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PatientProfile"
          component={patientProfile}
          options={{
            title: 'Patient Profile',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Tabs"
          component={tabs}
          options={{
            title: 'Patient Profile',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Symptoms"
          component={symptoms}
          options={{
            title: 'Symptoms',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddSymptoms"
          component={addSymptoms}
          options={{
            title: 'Add Symptoms',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Vitals"
          component={vitals}
          options={{
            title: 'Vitals',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddVitals"
          component={addVitals}
          options={{
            title: 'Add Vitals',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Reports"
          component={reports}
          options={{
            title: 'Reports',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddReports"
          component={addReports}
          options={{
            title: 'Add reports',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Doctors"
          component={doctors}
          options={{
            title: 'Treating Doctors',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddDoctors"
          component={addDoctors}
          options={{
            title: 'Add Treating Doctor',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Timeline"
          component={timeline}
          options={{
            title: 'Timeline',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TimelineRow"
          component={timelineRow}
          options={{
            title: 'TreatmentPlain',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Prescription"
          component={prescription}
          options={{
            title: 'Prescription',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddMedicineTest"
          component={addMedicineTest}
          options={{
            title: 'Add Medicines & Tests',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddMedicineScreen"
          component={AddMedicineScreen}
          options={{
            title: 'Add Medicines',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="MedicalHistory"
          component={medicalHistory}
          options={{
            title: 'Medical History',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="EditMedicalHistory"
          component={editMedicalHistory}
          options={{
            title: 'Edit Medical History',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="MedicalHistoryForm"
          component={medicalHistoryForm}
          options={{
            title: 'Edit Medical History Form',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TransferPatient"
          component={transferPatient}
          options={{
            title: 'Transfer Patient',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="EditPatientProfile"
          component={editPatientProfile}
          options={{
            title: 'Edit Patient Profile',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AppointmentsList"
          component={appointmentsList}
          options={{
            title: 'Appointments List',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="DischargeSummaryDownload"
          component={dischargeSummaryDownload}
          options={{
            title: 'Discharge Summary',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen name="DashboardLab" component={DashboardLab} />
        <Stack.Screen name="DashboardPharma" component={DashboardPharma} />
        <Stack.Screen
          name="DashboardReception"
          component={DashboardReception}
        />
        <Stack.Screen
          name="Management"
          component={Management}
          options={{
            title: 'Management',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="MedicationTimelineScreen"
          component={MedicationTimelineScreen}
          options={{
            title: 'Medication Timeline',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="SlotsManagement"
          component={SlotsManagement}
          options={{
            title: 'Slots Management',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />

        {/* Help & Support Screens */}
        <Stack.Screen
          name="HelpScreen"
          component={HelpScreen}
          options={{
            title: 'Help & Support',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="DashboardInfoScreen"
          component={DashboardInfoScreen}
          options={{
            title: 'Dashboard Documentation',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TicketsScreen"
          component={TicketsScreen}
          options={{
            title: 'Support Tickets',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="NewTicketScreen"
          component={NewTicketScreen}
          options={{
            title: 'Create New Ticket',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="MyTasks"
          component={MyTasks}
          options={{
            title: 'MyTasks',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="EmergencyDashboard"
          component={EmergencyDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OtDashboard"
          component={otDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DashboardAlerts"
          component={dashboardAlerts}
          options={{
            title: 'Surgery Alerts',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="OtInnerTabs"
          component={otInnerTabs}
           options={{
            title: 'Surgery Details',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="InitialDetails"
          component={initialDetails}
          options={{
            title: 'Initial Details',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="GeneralPhysicalExamination"
          component={generalPhysicalExamination}
          options={{
            title: 'General Physical Examination',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Respiratory"
          component={respiratory}
          options={{
            title: 'Respiratory',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Hepato"
          component={hepato}
          options={{
            title: 'Hepato',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="CardioVascular"
          component={cardioVascular}
          options={{
            title: 'Cardio Vascular',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Neuro"
          component={neuro}
          options={{
            title: 'Neuro',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Renal"
          component={renal}
          options={{
            title: 'Renal',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Others"
          component={others}
          options={{
            title: 'Others',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="ExaminationFindingNotes"
          component={examinationFindingNotes}
          options={{
            title: 'Examination Finding Notes',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Mallampati"
          component={mallampati}
          options={{
            title: 'Mallampati Grade',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PreopControllers"
          component={preOpControllers}
          options={{
            title: 'Pre-op Controllers',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="SurgerySchedule"
          component={surgerySchedule}
          options={{
            title: 'Surgery Schedule',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Schedule"
          component={schedule}
          options={{
            title: 'Schedule',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AnesthesiaRecordForm"
          component={anesthesiaRecord}
          options={{
            title: 'Anesthesia Record',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Breathing"
          component={breathing}
          options={{
            title: 'Breathing',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Monitors"
          component={monitors}
          options={{
            title: 'Monitors',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="ConsentForm"
          component={consentForm}
          options={{
            title: 'Consent Form',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PostOpRecordNotes"
          component={postOpNotes}
          options={{
            title: 'Post-Op Record Notes',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="DischargedPatientsIPD"
          component={DischargedPatientsIPD}
          options={{
            title: 'Discharged Patients',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="NotificationScreen"
          component={NotificationScreen}
          options={({ route }) => ({
            title: (route?.params as any)?.title ?? 'Notification',
            headerTitleAlign: 'center',
            headerShown: true,
          })}
        />
        <Stack.Screen
          name="Tests"
          component={TestsScreen}
          options={{
            title: 'Tests',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddTests"
          component={AddTestsScreen}
          options={{
            title: 'Add Tests',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
<Stack.Screen
  name="TreatmentPlan"
  component={TreatmentPlanScreen}
  options={({ route }: any) => ({
    title: route.params?.currentTab === 'PreOpRecord' 
      ? 'Pre-Op Medications' 
      : route.params?.currentTab === 'PostOpRecord'
      ? 'Post-Op Medications'
      : route.params?.currentTab === 'PatientFile'
      ? 'Medications' // For Patient File tab
      : route.params?.currentTab === 'AnesthesiaRecord'
      ? 'Anesthesia Medications' // If needed
      : 'Treatment Plan', // Default fallback
    headerTitleAlign: 'center',
    headerShown: true,
  })}
/>
        <Stack.Screen
          name="PreviousPrescriptions"
          component={PreviousPrescriptions}
          options={{
            title: 'Previous Prescriptions',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="HandshakePatientScreen"
          component={HandshakePatientScreen}
          options={{
            title: 'Handshake Patient',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="RequestSurgeryScreen"
          component={RequestSurgeryScreen}
          options={{
            title: 'Request Surgery',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AlertsScreen"
          component={AlertsScreen}
          options={{
            title: 'Alerts',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="DischargeScreen"
          component={DischargeScreen}
          options={{
            title: 'Discharge',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PatientRevisitScreen"
          component={PatientRevisitScreen}
          options={{
            title: 'Patient Revisit',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Pocus"
          component={PocusScreen}
          options={{
            title: 'Pocus',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddPocus"
          component={AddPocusScreen}
          options={{
            title: 'Add Pocus',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PhysicalExamination"
          component={PhysicalExaminationScreen}
          options={{
            title: 'Physical Examination',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddPhysicalExamination"
          component={AddPhysicalExaminationScreen}
          options={{
            title: 'Add Physical Examination',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="WardManagement"
          component={wardManagement}
          options={{
            title: 'Ward Management',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AppointmentTab"
          component={AppointmentTabsMobile}
          options={{
            title: 'Appointments',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AppointmentForm"
          component={appointmentForm}
          options={{
            title: 'Appointments',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AppointmentList"
          component={appointmentList}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReceptionPatientsList"
          component={receptionPatientsList}
          options={{
            title: 'Patients List',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="DoctorManagement"
          component={DoctorManagementMobile}
          options={{
            title: 'Doctor management',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="DoctorSlots"
          component={DoctorSlotsScreen}
          options={{
            title: 'Doctor slots',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="DashboardTriage"
          component={dashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddTriageIssue"
          component={addTriageIssue}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TriageDialog"
          component={triageDialog}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TriageFormContext"
          component={triageFormContext}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TriageABCD"
          component={triageABCDScreen}
          options={{
            title: 'Triage ABCD',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TriageGCSForm"
          component={triageGCSForm}
          options={{
            title: 'Triage GCS Form',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TriageType"
          component={triageType}
          options={{
            title: 'Triage Type',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TriageTrauma"
          component={traumaForm}
          options={{
            title: 'Triage Trauma',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TriageNonTrauma"
          component={nontraumaForm}
          options={{
            title: 'Triage Trauma',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TriageZoneForm"
          component={triageZone}
          options={{
            title: 'Triage Zone',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />

        {/* labs */}
        <Stack.Screen
          name="PatientListLab"
          component={PatientListLab}
          options={{
            title: 'Patient List',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PatientDetailsLab"
          component={PatientDetailsLab}
          options={{
            title: 'Patient Details',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="UploadTest"
          component={UploadTest}
          options={{
            title: 'Upload Test Results',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TestCard"
          component={TestCard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AlertsLab"
          component={AlertsLab}
          options={{
            title: 'Alerts',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="SaleComp"
          component={SaleComp}
          options={{
            title: 'Walk-In',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PaymentScreen"
          component={PaymentScreen}
          options={{
            title: 'Payment',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TestPricing"
          component={TestPricing}
          options={{
            title: 'Test Price',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddTestPricing"
          component={AddTestPricing}
          options={{
            title: 'Add Test Price',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="BillingLab"
          component={BillingLab}
          options={{
            title: 'Billing',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
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
          options={{
            title: 'Laboratory Tax Invoice',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TaxInvoiceRadio"
          component={TaxInvoiceTabs}
          options={{
            title: 'Radiology Tax Invoice',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TaxInvoiceInPatient"
          component={TaxInvoiceInPatient}
          options={{
            title: 'In-Patient Tax Invoice',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TaxInvoiceWalkIn"
          component={TaxInvoiceWalkIn}
          options={{
            title: 'Walk-In Tax Invoice',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="ReportsLab"
          component={ReportsLab}
          options={{
            title: 'Reports',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="TaxInvoiceTabs"
          component={taxInvoiceTabs}
          options={({ navigation, route }) => ({
            headerShown: true,
            headerTitleAlign: "center",
            title:
      route.params?.mode === "billing"
        ? "Billing"
        : "Tax Invoice",

    headerLeft: () => (
      <HeaderBackButton
        onPress={() => {
          const userRole = route.params?.userRole;


          if (userRole === "pathology") {
            navigation.reset({
              index: 0,
              routes: [{ name: "DashboardLab" }],
            });
          } else if (userRole === "pharmacy") {
            navigation.reset({
              index: 0,
              routes: [{ name: "DashboardPharma" }],
            });
          } else if (userRole === "reception") {
            navigation.reset({
              index: 0,
              routes: [{ name: "DashboardReception" }],
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: "Home" }],
            });
          }
        }}
      />
    ),
          })}
        />
        <Stack.Screen
          name="InvoiceDetails"
          component={invoiceDetails}
          options={{
            title: 'Details',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />

        {/* pharmacy */}
        <Stack.Screen
          name="PharmacyExpenses"
          component={PharmacyExpenses}
          options={{
            title: 'Order Placement',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="InStock"
          component={InStock}
          options={{
            title: 'In-Stock',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddInventory"
          component={AddInventory}
          options={{
            title: 'Inventory',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="InventoryDetail"
          component={InventoryDetails}
          options={{
            title: 'Inventory-Details',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AddInventoryItem"
          component={AddInventoryItemScreen}
          options={{
            title: 'Add-Inventory',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="PharmacyOrderDetails"
          component={PharmacyOrderDetailsScreen}
          options={{
            title: 'Pharmacy Order Details',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="DoctorProfile"
          component={doctorProfile}
          options={{
            title: 'Doctor Profile',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen 
          name="OrderExpenseDialog" 
          component={OrderExpenseDialog}
          options={{
            title: "Create New Order",
            headerShown: true, // or customize as needed
          }}
        />
        <Stack.Screen
          name="RegisterAmbulance"
          component={RegisterAmbulance}
          options={{
            title: 'Register Ambulance',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AmbulanceAdminDashboard"
          component={AmbulanceAdminDashboard}
          options={{
            title: 'Ambulance Dashboard',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AmbulanceList"
          component={AmbulanceList}
          options={{
            title: 'Ambulance List',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AmbulanceLocation"
          component={AmbulanceLocation}
          options={{
            title: 'Ambulance Location',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AmbulanceSettings"
          component={AmbulanceSettings}
          options={{
            title: 'Settings',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Drivers"
          component={Drivers}
          options={{
            title: 'Drivers Management',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AddDriver"
          component={AddDriver}
          options={{
            title: 'Add Staff',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AmbulanceForm"
          component={AmbulanceForm}
          options={{
            title: 'Register Ambulance',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="AmbulanceDetails"
          component={AmbulanceDetails}
          options={{
            headerShown: true,
            title: 'Ambulance Details',
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen
          name="AmbulanceDriverDashboard"
          component={AmbulanceDriverDashboard}
          options={{
            title: 'Driver Dashboard',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AmbulanceDriverActiveTrip"
          component={AmbulanceDriverActiveTrip}
          options={{
            title: 'Active Trip',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AmbulanceDriverHistory"
          component={AmbulanceDriverHistory}
          options={{
            title: 'Trip History',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AmbulanceDriverSettings"
          component={AmbulanceDriverSettings}
          options={{
            title: 'Settings',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AmbulanceStaffDashboard"
          component={AmbulanceStaffDashboard}
          options={{
            title: 'Ambulance Staff',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="OrderDetailScreen" 
          component={OrderDetailScreen}
          options={{
            title: 'Order Details',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="AmbulanceStaffAddVitals"
          component={AmbulanceStaffAddVitals}
          options={{
            title: 'Add Vitals',
            headerTitleAlign: 'center',
            headerShown: true,
          }}
        />
        
        <Stack.Screen
          name="AmbulanceStaffActiveTrip"
          component={AmbulanceStaffActiveTrip}
          options={{
            title: 'Active Trip',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AmbulanceStaffAssignments"
          component={AmbulanceStaffAssignments}
          options={{
            title: 'Assignments',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AmbulanceStaffSettings"
          component={AmbulanceStaffSettings}
          options={{
            title: 'Settings',
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="ReceptionOrderDetails" 
          component={ReceptionOrderDetailsScreen} 
          options={{ headerShown: false }}
        />

        {/* nurse*/}
        <Stack.Screen name="NurseDashboard" component={NurseDashboard} />
        <Stack.Screen name="nursePatientList" component={NursePatientsList}
        options={{
        title: 'Patient List',
        headerTitleAlign: 'center',
        headerShown: true,
        }}/>
        <Stack.Screen 
          name="NurseAlerts" 
          component={NurseAlerts}
          options={{
        title: 'Alerts',
        headerTitleAlign: 'center',
        headerShown: true,
        }}/>
        <Stack.Screen 
          name="NurseManagement" 
          component={NurseManagement}
                    options={{
        title: 'Management',
        headerTitleAlign: 'center',
        headerShown: true,
        }}/>
     <Stack.Screen name="nurseProfile" 
     component={nurseProfile}
         options={{
        title: 'Profile',
        headerTitleAlign: 'center',
        headerShown: true,
        }}/>
  <Stack.Screen 
        name="AddShift" 
        component={AddShiftScreen}
        options={{
        title: 'Add Shift',
        headerTitleAlign: 'center',
        headerShown: true,
        }}
      />
      <Stack.Screen 
  name="AddLeave" 
  component={AddLeaveScreen}
   options={{
        title: 'Add Leave',
        headerTitleAlign: 'center',
        headerShown: true,}}
/>
<Stack.Screen 
  name="EditShift" 
  component={EditShiftScreen} 
   options={{
        title: 'Edit Shift',
        headerTitleAlign: 'center',
        headerShown: true,}}
      />
      <Stack.Screen 
        name="PatientListScreen" 
        component={PatientListScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="IPDPatientListScreen" 
        component={IPDPatientListScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PharmacyPatientListScreen" 
        component={PharmacyPatientListScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OtPatientList" 
        component={OtPatientList} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ApprovedRejectedList" 
        component={ApprovedRejectedList} 
      />
      <Stack.Screen 
        name="OPDTriagePatientList" 
        component={OPDTriagePatientListScreen} 
      />     
<Stack.Screen 
  name="AddDoctorLeave" 
  component={AddDoctorLeave} 
  options={{ 
        headerTitleAlign: 'center',
        headerShown: true,
    title: 'Add Doctor Leave'
  }} 
/>
<Stack.Screen 
  name="RevenueScreen" 
  component={RevenueScreen} 
  options={{ 
        headerTitleAlign: 'center',
        headerShown: true,
    title: 'Revenue'
  }} 
/>
<Stack.Screen 
  name="AllTransactions" 
  component={AllTransactionsScreen} 
  options={{ title: 'All Transactions' }}
/><Stack.Screen 
  name="CommissionAndFee" 
  component={CommissionAndFeeScreen} 
  options={{ 
        headerTitleAlign: 'center',
        headerShown: true,
    title: 'Commission & Fee'
  }} 
/>

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Routing;
