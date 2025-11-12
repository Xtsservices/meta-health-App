// import { Image } from '@react-pdf/renderer';
export interface departmentType {
  id: number;
  hospitaId?: number;
  name: string;
  description?: string;
  addedOn?: string;
  lastModified?: string;
  count: number;
}
export interface headNurseType {
  userId: number;
  hospitaId?: number;
  name: string;
  addedOn?: string;
  lastModified?: string;
  departmentID:number;
  scope:string;
}
export interface wardType {
  id: number;
  hospitaId?: number;
  name: string;
  description?: string;
  addedOn?: string;
  lastModified?: string;
  totalBeds: number;
  availableBeds: number;
  floor: string;
  room: string;
  price: number;
  Attendees: string;
  location: string;
  amenities: string[];
}

export interface transferTypes {
  internal: number;
  external: number;
}
export interface staffType {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  photo: string | null;
  pinCode: number | null;
  phoneNo: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  role: number | null;
  dob: string | null;
  gender: number | null;
  countryCode: string | null;
  departmentID?: number;
  addedOn: string | "";
  imageURL: string;
  scope: string;
  reportTo: number | null;
  image: string | null;
}

export interface PatientDoctor {
  patientDoctorID: number;
  patientTimeLineID: number;
  doctorID: number;
  purpose: string;
  active: boolean;
  category: "primary" | "secondary";
  firstName: string;
  lastName: string;
  department: string;
  assignedDate: string;
}

export interface hubType {
  id: number;
  hospitalID?: number;
  hubMacId: string;
  hubcode?: string;
  hubName?: string;
  hubCustomName?: string | null;
  hubAddress?: string | number;
  hubProtocolAddress?: string | number;
  addedOn: string;
  lastModified?: string;
  status?: string;
  online?: number;
}

export interface deviceType {
  id: number;
  hubID: string;
  deviceName?: string;
  hubName?: string;
  deviceAddress?: string;
  deviceCustomName?: string | null;
  status?: "online" | "offline";
  online?: number;
  macId?: string | null;
  code?: string;
  addedOn?: string;
  userId?: number;
  active?: number;
  invoiceNumber?: string;
  purchaseDate?: string;
}

export interface patientbasicDetailType {
  hospitalID: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  pID: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  pUHID: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  ptype: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  dob: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  gender: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  age: {
    value: string; 
    valid: boolean;
    showError: boolean;
    message: string;
  };
  weight: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  height: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  pName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  phoneNumber: {
    valid: boolean;
    value:string | number | null;
    showError: boolean;
    message: string;
  };

  email: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  address: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  city: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  state: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  pinCode: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  referredBy: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };

  departmentID: {
    valid: boolean;
    value: number | undefined;
    showError: boolean;
    message: string;
  };
  userID: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  wardID: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  insurance: {
    valid: boolean;
    value: 0 | 1;
    showError: boolean;
    message: string;
  };
  insuranceNumber: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  insuranceCompany: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
}

export interface patientOPDbasicDetailType {
  hospitalID: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  pID: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  pUHID: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  ptype: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  dob: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  gender: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  age: {
    value: string; 
    valid: boolean;
    showError: boolean;
    message: string;
  };
  weight: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  height: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  pName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  phoneNumber: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };

  email: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  address: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  city: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  state: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  pinCode: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  referredBy: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  department: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };

  departmentID: {
    valid: boolean;
    value: number | undefined;
    showError: boolean;
    message: string;
  };
  userID: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  wardID: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  insurance: {
    valid: boolean;
    value: 0 | 1;
    showError: boolean;
    message: string;
  };
  insuranceNumber: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  insuranceCompany: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  discount: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  reason: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  id: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
}

export interface prescriptionFormDataType {
  diet: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  advice: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  followUp: {
    valid: boolean;
    value: 0 | 1;
    showError: boolean;
    message: string;
  };
  followUpDate: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  medicine: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  medicineType: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  medicineTime: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  medicineDuration: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  medicineFrequency: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  medicineNotes: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  test: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  notes: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  diagnosis: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
}

export interface prescriptionDataType {
  dosageUnit: string;
  id?: number;
  hospitalID: number;
  timeLineID: number;
  userID: number;
  diet: string;
  advice: string;
  followUp: number;
  followUpDate: string;
  addedOn: string;
  medicine: string;
  medicineType: string;
  medicineTime: string;
  medicineDuration: string;
  medicineFrequency: string;
  medicineNotes: string;
  doseTiming: string;
  test: string;
  notes: string;
  diagnosis: string;
  meddosage: number;
  medicineStartDate: string;
  status: number;
}

export interface basicPatientSkeleton {
  hospitalID: number | null;
  pID: string;
  pUHID: number | null;
  ptype: number;
  dob: string | null;
  gender: string | null;
  age: string | null;
  weight: number | null;
  height: number | null;
  pName: string;
  phoneNumber: number | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  referredBy: string | null;
  category: number;
  userID: number;
  wardID: number | null;
  patientStartStatus: number;
  departmentID: number | undefined;
  insurance: 0 | 1;
  insuranceNumber: string;
  insuranceCompany: string;
}

export interface PatientType {
  patientid: number | null;
  contact: number | string | null;
  age: string | number | null;
  status: null;
  id: number | null;
  hospitalID: number | null;
  deviceID: number | null;
  pID: string;
  pUHID: number | null;
  category: number | null;
  ptype: number | null;
  dob: string | null;
  gender: number | null;
  weight: number | null;
  height: number | null;
  pName: string;
  phoneNumber: number | string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  referredBy: string | null;
  addedOn: string;
  lastModified: string | null;
  department?: string | null;
  imageURL?: string;
  startTime: string;
  endTime: string;
  appointmentDate?: string;
  doctorName?: string;
  firstName?: string;
  lastName?: string;
  dischargeType?: number;
  followUp?:number;
  followUpDate?: string | null;
  followUpStatus?: string | null;
  advice?: string | null;
  diet?: string | null;
  notificationCount?: number;
  patientTimeLineID?: number;
  wardID: number;
  wardName: string;
  insurance: 0 | 1;
  insuranceNumber: string;
  insuranceCompany: string;
  patientStartStatus?: number;
  patientEndStatus?: number;
  followUpAddedOn?: string;
  zone?: number;
  role?:string;
  approvedTime?:string;
}

type SymptomDetail = {
  symptom: string;
  duration: string; // This can be number as well, if you want to parse it later.
  symptomAddedOn: string; // Date-time string
  durationParameter: string; // Example: 'days', 'hours', etc.
};

export interface TimelineType {
  medicine: string[] | string | null;
  id: number | null;
  patientID: number | null;
  userID: number | null;
  patientStartStatus: number | null;
  patientEndStatus: number | null;
  startTime: string;
  endTime: string;
  dischargeType: number | null;
  diet: string | null;
  advice: string | null;
  followUp: number | null;
  followUpDate: string | null;
  icd: string | null;
  wardID: number | null;
  diagnosis?: string | null;
  prescription?: string | null;
  isRevisit ? :number;
  surgeryStatus? : string | null
  typeOfSurgery ? : string | null
  transferDetails?: { 
    toDoc: string;
    reason: string;
    toWard: string;
    fromDoc: string;
    fromWard: string;
    hospitalName: string | null;
    transferDate: string;
    transferType: number;
    transferToDepartment: number;
    transferFromDepartment: number;
  }[];
  doctorDetails?:{
    scope: string;
    active: number;
    purpose: string | null;
    category: string;
    doctorName: string;
    lastUpdated: string; 
    assignedDate: string; 
  };
  isFollowUp?:{
    followUp:number;
    followUpDate:string;
    patientStartStatus:number
  };
  externalTransferDetails?:{
    reason: string;
    fromDoc: string;
    fromWard: string;
    transferDate: string;  // or Date if you want to parse it into a Date object
    transferType: number;
    tohospitalName: string;
    fromhospitalName: string;
    transferFromDepartment: number}[];
  handshakeDetails?: { fromDoc: string; toDoc: string; assignedDate: string; scope?: string }[];
  operationTheatreDetails?: SurgeryDetail[];
  patientAddedOn: string;
  addedBy?:string;
  symptomsDetails?:SymptomDetail[];
  
}

export type SurgeryDetail = {
  id: number;
  scope: string;
  status: string;
  addedOn: string;
  approvedBy: string;
  patientType: string;
  surgeryType: string;
  approvedTime?: string | null;
  rejectReason?: string;
  scheduleTime: string;
  completedTime?: string | null;
  key?: number; 
  patientAddedon?: string; 
  rejectedTime?:string | null
};

export interface symptompstype {
  id: number | null;
  timeLineID: number | null;
  userID: number | null;
  symptom: string;
  duration?: string;
  durationParameter: string;
  addedOn: string;
  conceptID: number | null;
}
export interface selectedTestListtype {
  id: number | null;
  timeLineID: number | null;
  userID: number | null;
  test: string | null;
  addedOn: string;
}

export interface symptompsElement {
  id: number | null;
  concept_id: string;
  type_id: string;
  term: string;
}

export interface testType {
  id: number;
  timeLineID: number | null;
  userID: number | null;
  test: string;
  addedOn: string;
  loinc_num_: string;
  category: string;
  status: string;
  testNotes?: string;
}

export type selectedListType = {
  name: string;
  duration: string;
  durationParameter: string;
};

export interface MedicineType {
  id?: number | null;
  timeLineID: number | null;
  userID: number | null;
  doseUnit?: string | null;
  medicineType: number | null;
  medicineName: string;
  daysCount: number | null;
  doseCount: number | null;
  Frequency: number;
  medicationTime: string;
  doseTimings: string;
  notes?: string;

  isOther?: boolean;
  medicineList?: string[];
  test?: string;
  advice?: string;
  followUp?: number;
  followUpDate?: string;
  medicineStartDate?: string;
}

export interface MedicineReminderType {
  id: number | null;
  medicineType: number | null;
  Frequency: number | null;
  medicineName: string;
  userID: number | null;
  dosageTime: string;
  givenTime: string | null;
  doseStatus: number | null;
  firstName?: string;
  lastName?: string;
  note?: string;
  medicationTime?: string;
  day?: string | null;
}

export interface medicalHistoryFormType {
  patientID: number | null;
  userID: number | null;
  givenName: string;
  givenPhone: string;
  givenRelation: string;
  bloodGroup: string;
  bloodPressure: string;
  disease: string;
  foodAllergy: string;
  medicineAllergy: string;
  anaesthesia: string;
  meds: string;
  selfMeds: string;
  chestCondition: string;
  neurologicalDisorder: string;
  heartProblems: string;
  infections: string;
  infectionDates?: string; // JSON string containing infection dates
  mentalHealth: string;
  drugs: string;
  pregnant: string;
  hereditaryDisease: string;
  lumps: string;
  cancer: string;
  familyDisease: string;
}

export interface medicineChart {
  id: number | null;
  medicineName: string;
  givenTime: string;
}

export interface errorType {
  message: string;
  status?: string;
  display: boolean;
  severity: "error" | "success";
  loading: boolean;
  backdrop_loading: boolean;
}

export interface attachmentType {
  addedOn: string;
  fileName: string;
  fileURL: string;
  givenName: string;
  id: number;
  mimeType: string;
  timeLineID: number;
  userID: number;
  category: string | number;
}

export type searchType = {
  searchedList: string[];
  selectedList: string[];
  search: string;
  istrue: boolean;
};

export type vitalsType = {
  bp: string;
  bpTime: string;
  oxygenTime: string;
  temperatureTime: string;
  pulseTime: string;
  respiratoryRateTime: string;
  id: number;
  oxygen: number;
  pulse: number;
  temperature: number;
  respiratoryRate: number;
  userID: number;
  deviceTime?: number;
  device?: number;
  hrv: number;
  hrvTime: string;
  addedOn: string;
  givenTime?:string;
  heartRateVariability?:string;
  heartRate?:string;
  spo2?:string;
};

export type vitalsFormType = {
  userID: number;
  oxygen: number;
  pulse: number;
  temperature: number;
  // respiratoryRate: string;
  bpH: string;
  bpL: string;
  bpTime: string;
  oxygenTime: string;
  temperatureTime: string;
  pulseTime: string;
  // respiratoryRateTime: string;
};

export type vitalsFormType1 = {
  userID: number;
  oxygen: number;
  pulse: number;
  temperature: number;
  respiratoryRate: number;
  hrv: number;
  bpH: string;
  bpL: string;
  bpTime: string;
  oxygenTime: string;
  temperatureTime: string;
  hrvTime: string;
  pulseTime: string;
  respiratoryRateTime: string;
};

export type Alerttype = {
  id: number;
  timeLineID: number;
  vitalID: number;
  alertType: number;
  alertMessage: string;
  alertValue: number;
  addedOn: number;
};

export type vitalFunctionType = {
  pulse: {
    avgPulse: string;
    minPulse: number;
    maxPulse: number;
  };
  temperature: {
    avgTemperature: number;
    minTemperature: number;
    maxTemperature: number;
  };
  oxygen: {
    avgOxygen: string;
    minOxygen: number;
    maxOxygen: number;
  };
  bp: {
    avgBp: number;
    minBp: number;
    maxBp: number;
  };
  respiratoryRate?: {
    avgRespiratoryRate?: string;
    minRespiratoryRate?: number;
    maxRespiratoryRate?: number;
  };
  hrv?: {
    avgHRV?: number;
    minHRV?: number;
    maxHRV?: number;
  };
  [key: string]: { [prop: string]: string | number } | undefined;
};

export type AlertType = {
  id: number;
  patientName: string;
  doctorName: string;
  alertType: number;
  alertMessage: string;
  alertValue: string;
  addedOn: string;
  seen: 0 | 1;
  index: number;
  token: string;
  ward: string;
  patientID: number;
  datetime: string;
  hospitalID:number;
  state?:string;
  city?:string;
  nurseName?:string;
};

export type statusDictType = {
  0: string;
  1: string;
  2: string;
};

export type priorityDictType = {
  0: string;
  1: string;
  2: string;
};

export type commentType = {
  addedOn: string;
  comment: string;
  id: number;
  ticketID: number;
  userID: number;
  firstName: string;
  lastName: string;
  sentStatus: number;
};

export interface ManagmentTemplates {
  id: number;
  templateName: string;
  templateType: string;
  fileURL: string;
  hospitalID: number;
  userID: number;
  uploadedDate: string;
  fileName: string;
  category: string;
}
export interface TicketType {
  id: number;
  priority: keyof priorityDictType;
  hospitalName: string;
  subject: string;
  status: keyof statusDictType;
  type: string;
  firstName: string;
  lastName: string;
  assignedID: number;
  dueDate: string;
  assignedName: string;
  module: string;
}

export interface TransferFormDataType {
  transferType: {
    valid: boolean;
    message: string;
    value: number;
    showError: boolean;
    name: string;
  };
  wardID: {
    valid: boolean;
    message: string;
    value: number;
    showError: boolean;
    name: string;
  };
  departmentID: {
    valid: boolean;
    message: string;
    value: number;
    showError: boolean;
    name: string;
  };
  userID: {
    valid: boolean;
    message: string;
    value: number;
    showError: boolean;
    name: string;
  };
  reason: {
    valid: boolean;
    message: string;
    value: string;
    showError: boolean;
    name: string;
  };
  bpL: {
    valid: boolean;
    message: string;
    value: string;
    showError: boolean;
    name: string;
  };
  bpH: {
    valid: boolean;
    message: string;
    value: string;
    showError: boolean;
    name: string;
  };
  oxygen: {
    valid: boolean;
    message: string;
    value: number;
    showError: boolean;
    name: string;
  };
  temp: {
    valid: boolean;
    message: string;
    value: number;
    showError: boolean;
    name: string;
  };
  pulse: {
    valid: boolean;
    message: string;
    value: number;
    showError: boolean;
    name: string;
  };
  hospitalName: {
    valid: boolean;
    message: string;
    value: string;
    showError: boolean;
    name: string;
  };
  relativeName: {
    valid: boolean;
    message: string;
    value: string;
    showError: boolean;
    name: string;
  };
}

export type alertType = {
  id: number | null;
  timeLineID: number | null;
  userID: number | null;
  hospitalID: number | null;
  test: string;
  addedOn: string;
  loinc_num_: string;
  status: string;
  alertStatus: string;
  category: string;
  doctorID: number | null;
  doctor_firstName: string;
  doctor_lastName: string;
  pID: string;
  pName: string;
  patientID: number | null;
  ward_name: string;
  isViewed: boolean;
};

export type PatientCardData = {
  timeLineID: number;
  userID: number;
  status: string;
  patientID: number;
  pID: string;
  pName: string;
  ward_name: string;
  department_name: string;
  photo: string;
  phoneNumber: number;
  prescriptionURL?:string;
  id?:number;
  fileName?:string;
  ptype?:number
};

export type Attachment = {
  id: number;
  timeLineID: number;
  userID: number;
  fileName: string;
  givenName: string;
  mimeType: string;
  addedOn: string;
  category: string;
  patientID: number;
  testID: number;
  fileURL: string;
  test:string;
  testName?: string;
};

export type TestDetails = {
  loinc_num_: string;
  name: string;
  testPrice: number;
  gst: number;
  status:string;
};

export type PatientDetails = {
  addedOn: string;
  alertStatus: string;
  approved_status: string;
  category: string;
  completed_status: string | null;
  doctorID: number;
  doctor_firstName: string;
  doctor_lastName: string;
  hospitalID: number;
  id: number;
  isViewed: boolean;
  loinc_num_: string;
  pID: string;
  pName: string;
  patientID: 2097;
  status: string;
  test: string;
  timeLineID: number;
  userID: number;
  ward_name: string;
  gender?:number;
  dob?:string;
  city?:string;
  state?:string;
  patient_admissionDate?:string;
  imageURL?:string|null;
  attachments?: Attachment[];
  testsList?: TestDetails[];
  phoneNumber? : number 
  name? : string
  latestTestTime?: string;
};

export interface Bed {
  id: string;
  name: string;
  status: "available" | "occupied";
}

export interface Ward {
  id: string;
  name: string;
  beds: Bed[];
  details: WardDetails;
}

export interface WardDetails {
  rent: number;
  peopleAllowed: number;
  amenities: string[];
}

export interface Floor {
  id: string;
  name: string;
  wards: Ward[];
}

export interface patientinsuranceDetailType {
  submissionId: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  patientID: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  patientName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  patientMobileNumber: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  sponsorName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  sponsorMobileNum: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  estimationAmount: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  claimAmount: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
}

export interface patientregistrationDetailType {
  pID: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  ptype: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  dob: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  gender: {
    valid: boolean;
    value: number;
    showError: boolean;
    message: string;
  };

  referralName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  referralMobile: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };

  serviceType: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  amount: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  gst: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  totalAmount: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  paymentMethod: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  medicineName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  dosage: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  quantity: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  testType: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  testName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  sampleType: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  testDate: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  pName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  phoneNumber: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  address: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  country: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  city: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  state: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  userID: {
    valid: boolean;
    value: number | null | undefined;
    showError: boolean;
    message: string;
  };
  departmentID: {
    valid: boolean;
    value: number | null | undefined;
    showError: boolean;
    message: string;
  };
}

export interface doctorAppointmentDetailType {
  age: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  date: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };
  timeSlot: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };

  department: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };
  doctorName: {
    valid: boolean;
    value: number | null;
    showError: boolean;
    message: string;
  };

  services: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  gender: {
    valid: boolean;
    value: number;
    showError: boolean;
    message: string;
  };
  pName: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };
  mobileNumber: {
    valid: boolean;
    value: string | null;
    showError: boolean;
    message: string;
  };

  email: {
    valid: boolean;
    value: string;
    showError: boolean;
    message: string;
  };

  departmentID: {
    valid: boolean;
    value: number | null | undefined;
    showError: boolean;
    message: string;
  };
}

export interface RescheduleDataType {
  id: number;
  department: number | null;
  doctorName: number | null;
  services: string;
  pName: string;
  age: string;
  gender: number;
  mobileNumber: string | null;
  email: string;
}

export interface MedicineData {
  id: number;
  name: string;
  category: string;
  qty: number;
  hsn: string;
  price: number;
  gst: number;
  amount: number;
}

export interface TestData {
  testID: number;
  testName: string;
  charge: number;
  qty: number;
  price: number;
  gst: number;
  amount: number;
}

export interface ProcedureData {
  code: number;
  particulars: string;
  rate: number;
  units: number;
  price: number;
  gst: number;
  amount: number;
}

export interface PatientData {
  id: number;
  patientID: string;
  pName: string;
  dept: string;
  firstName: string;
  lastName: string;
  date: string;
  admissionDate: string;
  category: string;
  testList: TestData[];
  medicinesList: MedicineData[];
  procedures: ProcedureData[];
  patientTimeLineID: string;
  pType: string;
}

//pharmacy tax-invoice
export interface PharmacySaleMedicine {
  id: number;
  gst: string;
  hsn: string;
  name: string;
  used: number;
  email: string | null;
  addedOn: string;
  category: string;
  location: number | null;
  quantity: number;
  costPrice: number;
  expiryDate: string;
  hospitalID: number;
  isReordered: number;
  manufacturer: string;
  sellingPrice: number;
  lowStockValue: number;
  totalQuantity: string;
}

export interface PaymentDetail {
  online?: number;
  cash?: number;
  card?: number;
  timestamp?: string;
}

export interface DiscountDetails {
  [key: string]: number | string; // Define appropriately based on your data structure
}

export interface PharmacySaleTaxInvoice {
  id: number;
  hospitalID: number;
  medicinesList: PharmacySaleMedicine[];
  status: string;
  paymentDetails: PaymentDetail[];
  notes: string | null;
  addedOn: string;
  pIdNew: number;
  medGivenBy: number;
  pName: string;
  phoneNumber: string;
  fileName: string;
  prescriptionURL: string;
  discount?: DiscountDetails;
  updatedOn:string;
  city?: string;
}
interface Test {
  gst: number;
  name: string;
  testPrice: number;
  loinc_num_: string;
}

interface Discount {
  discount: number;
  discountReason: string;
  discountReasonID: string;
}

interface PaymentDetails {
  cash: number;
  cards: number;
  online: number;
  timestamp: string;  // ISO date string
}

export interface LabsWalkinPatientTest {
  id: number;
  hospitalID: number;
  userID: number;
  pName: string;
  phoneNumber: string;
  city: string;
  addedOn: string;  // ISO date string
  updatedOn:string;
  pID: string;
  pIdNew?: number;
  fileName: string;
  testsList: Test[];
  discount: Discount;
  paymentDetails: PaymentDetails;
  department: "Radiology" | "Pathology";  // Restrict to specific values
  prescriptionURL:string
  medicinesList?: PharmacyMedicineData[];
}


export interface PharmacyMedicineData {
  id: number;
  name: string;
  category: string;
  hsn: string;
  sellingPrice: number;
  quantity: number;
  qty?: number;
  Frequency?: string;
  daysCount?: string;
  medicineName?: string;
  medicineType?: string | number;
  updatedQuantity?: number;
  gst?: string | number;
  userID:number;
}

export interface PatientOrderCompletedProps {
  id: number;
  hospitalID: number;
  patientTimeLineID: number | null;
  location: number | null;
  departmemtType: number;
  doctorID: number | null;
  medicinesList: PharmacyMedicineData[];
  status: string;
  notes: null;
  addedOn: string;
  discount: object;
  firstName: string;
  lastName: string;
  pName: string;
  patientID: number;
}

export type Vital = {
  bpTime?: string | null;
  oxygenTime?: string | null;
  temperatureTime?: string | null;
  pulseTime?: string | null;
  respiratoryRateTime?: string | null;
};

export interface StateType {
  stateCode: number;
  state: string;
}

export interface DistrictType {
  districtCode: number;
  district: string;
  stateCode: number;
  state: string;
}

export interface CityType {
  cityCode: number;
  city: string;
  districtCode: number;
  district: string;
  stateCode: number;
  state: string;
}