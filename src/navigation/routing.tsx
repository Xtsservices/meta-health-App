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
        <Stack.Screen name="PatientProfile" component={patientProfile} options={{ title: "Patient Profile", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="Tabs" component={tabs} options={{ title: "Patient Profile", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="Symptoms" component={symptoms} options={{ title: "Symptoms", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="AddSymptoms" component={addSymptoms} options={{ title: "Add Symptoms", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="Vitals" component={vitals} options={{ title: "Vitals", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="AddVitals" component={addVitals} options={{ title: "Add Vitals", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="Reports" component={reports} options={{ title: "Reports", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="AddReports" component={addReports} options={{ title: "Add reports", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="Doctors" component={doctors} options={{ title: "Treating Doctors", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="AddDoctors" component={addDoctors} options={{ title: "Add Tresting Doctors", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="Timeline" component={timeline} options={{ title: "Timeline", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="TimelineRow" component={timelineRow} options={{ title: "TreatmentPlain", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="Prescription" component={prescription} options={{ title: "Prescription", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="AddMedicineTest" component={addMedicineTest} options={{ title: "Add Medicines & Tests", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="MedicalHistory" component={medicalHistory} options={{ title: "Medical History", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="EditMedicalHistory" component={editMedicalHistory} options={{ title: "Edit Medical History", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="MedicalHistoryForm" component={medicalHistoryForm} options={{ title: "Edit Medical History Form", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="TransferPatient" component={transferPatient} options={{ title: "Transfer Patient", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="EditPatientProfile" component={editPatientProfile} options={{ title: "Edit Patient Profile", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="DashboardLab" component={DashboardLab} />
        <Stack.Screen name="DashboardPharma" component={DashboardPharma} />
        <Stack.Screen name="DashboardReception" component={DashboardReception} />
        <Stack.Screen name="Management" component={Management} options={{ title: "Management", headerTitleAlign: "center", headerShown: true }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Routing;