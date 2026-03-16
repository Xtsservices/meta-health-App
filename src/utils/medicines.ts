export type medicineCategoryType = {
  capsules: number;
  syrups: number;
  tablets: number;
  injections: number;
  ivLine: number;
  Tubing: number;
  Topical: number;
  Drops: number;
  Spray: number;
  Ventilator: number;
};

export const medicineCategory: medicineCategoryType = {
  capsules: 1,
  syrups: 2,
  tablets: 3,
  injections: 4,
  ivLine: 5,
  Tubing: 6,
  Topical: 7,
  Drops: 8,
  Spray: 9,
  Ventilator: 10,
};

export type MedicineList = {
  Frequency: number;
  daysCount: number;
  id: number;
  name: string;
  category: string;
  hsn: string;
  sellingPrice?: number;
  quantity: number;
  medid?: string;
  medicineName?: string;
  dose?: string;
  price?: number;
  amount?: number;
  gst?: number;
  costPrice?: number;
  medId?: number;
  datetime?: string;
  updatedQuantity?: number;
  takenFromInventoryID?: number;
  medicineType?: number;
  userID?: number;
  nurseID?: number;
  reason?:string;
};

export type PharmacyOrder = {
  id: number;
  hospitalID: number;
  patientTimeLineID: number;
  location: number;
  departmemtType: number;
  doctorID: number;
  medicinesList: MedicineList[];
  status: string;
  paymentDetails: null;
  notes: string;
  addedOn: string;
  pName: string;
  patientID: string;
  firstName: string;
  lastName: string;
  pID: number;
  pIdNew?: number;
  phoneNumber?: number;
  rejectReason?: string;
  totalAmount?: string;
  paidAmount?: string;
  dueAmount?: string;
  createdAt?: string;
  departmentType?: number | string;
};

export type SelectedMedicineData = {
  id:number;
  name: string;
  category: string;
  hsn: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  location: string;
  expiryDate: string;
  gst:number;
};

export type ExpenseData = {
  lastName?: string;
  firstName?: string;
  id: number;
  addedOn: string;
  agencyName: string;
  agentCode: number;
  contactNo: string;
  location: string;
  email: string;
  manufactureID: number;
  manufacturer: string;
  orderDate: string;
  dueDate: string;
  medicinesList: SelectedMedicineData[];
  PaymentDetails: string;
  status: string;
  gst: number;
  code?: number | string;
};

// export type Medicine = {
//   id: number;
//   name: string;
//   frequency: number;
//   daysCount: number;
//   medid: string;

//   category: string;
//   dose: string;
//   quantity: number;
//   hsn: string;
//   price: number;

//   amount: number;
// }

export type Test = {
  testID: string;
  testName: string;
  charge: number;
  qty: number;
  price: number;
  gst: number;
  amount: number;
};

export type OpdIpdData = {
  id: number;
  patientID: string;
  pName: string;
  dept: string;
  firstName: string;
  lastName: string;
  category: string;
  addedOn: string;
  pType: 1 | 2;
  departmemtType: 1 | 2 | 3;
  medicinesList?: MedicineList[];
  testsList?: Test[];
  patientTimeLineID: number;
  pID?: number;
  paidAmount?:string;
  dueAmount?:string;
  totalAmount?:string;
  timeLineID: number;
};

export type DischargeOrder = {
  id: number;
  patientID: string;
  pName: string;
  dept: string;
  firstName: string;
  lastName: string;
  date: string;
  action: string;
  addedOn: string;
  pID?: number;
  paidAmount?:string; 
  totalAmount?:string;
  ptype?: number;
  category?: string;
};


export type LabTestOrder = {
  id: number;
  timeLineID: number;
  userID: number;
  hospitalID: number;
  alertStatus: string;
  isViewed: number;
  approved_status: string | null;
  completed_status: string | null;
  pIDNew: number | null;
  patientID: number;
  rejectedReason?:string;
  pID: string;
  pName: string;
  doctorID: number;
  doctor_firstName: string;
  doctor_lastName: string;
  ward_name: string;
  ptype: number;
  addedOn:string;
  departmentID:number;
  paidAmount?:string;
  dueAmount?:string;
  testsList: AlertTestList[];
};

export type AlertTestList = {
  id:number;
  userID:number;
  test: string;
  addedOn: string;
  loinc_num_: string;
  status: string;
  category: string;
  testID?:number;
  testPrice?:number;
  gst?:number;
  hsn?: number| string;
  datetime?: string;
  alertStatus?: string;
};
