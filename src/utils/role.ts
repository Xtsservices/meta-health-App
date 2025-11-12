// import { priorityDictType, statusDictType, transferTypes } from "../types";

export type Role_list_Type = {
  10007: string;
  8888:string;
  9999: string;
  4001: string;
  2003: string;
  1003: string;
  3001: string;
  6001: string;
  2002:string;
  4000:string;
};
export type SCOPE_LIST_Type = {
  inpatient: number;
  outpatient: number;
  emergency_green_zone: number;
  emergency_yellow_zone: number;
  emergency_red_zone: number;
  triage: number;
  surgeon: number;
  anesthetist: number;
  pathology: number;
  radiology: number;
  pharmacy: number;
  reception: number;
};
export const Role_list: Role_list_Type = {
  10007: "sAdmin",
  8888:"customerCare",
  9999: "admin",
  4001: "doctor",
  2003: "nurse",
  1003: "staff",
  3001: "management",
  6001: "reception",
  2002:"headNurse",
  4000:"hod"
};
export const Role_NAME = {
  sAdmin: 10007,
  customerCare:8888,
  admin: 9999,
  management: 3001,
  doctor: 4001,
  nurse: 2003,
  staff: 1003,
  reception: 6001,
  headNurse:2002,
  hod:4000
};

export const SCOPE_LIST: SCOPE_LIST_Type = {
  inpatient: 5001,
  outpatient: 5002,
  emergency_green_zone: 5003,
  emergency_yellow_zone: 5004,
  emergency_red_zone: 5005,
  triage: 5006,
  surgeon: 5007,
  anesthetist: 5008,
  pathology: 5009,
  radiology: 5010,
  pharmacy: 5011,
  reception: 5012,
};

export const patientCategory = {
  neonate: 1,
  child: 2,
  adult: 3,
};

export const patientStatus = {
  outpatient: 1,
  inpatient: 2,
  emergency: 3,
  operationTheatre: 4,
  discharged: 21,
};

export const zoneType = {
  red: 1,
  yellow: 2,
  green: 3,
};

export const zoneList = {
  1: "red",
  2: "yellow",
  3: "green",
};

// export const transferType: transferTypes = {
//   internal: 1,
//   external: 2,
// };

// export const priorityDict: priorityDictType = {
//   0: "Low",
//   1: "Medium",
//   2: "High",
// };

// export const statusDict: statusDictType = {
//   0: "Open",
//   1: "Paused",
//   2: "Closed",
// };

export const followUpStatus = {
  active: 1,
  end: 2,
};

export const reportCategory = {
  radiology: 1,
  pathology: 2,
  previous_history: 3,
  
};

export const ticketStatus = {
  Open: 0,
  Paused: 1,
  Closed: 2,
};

export const ticketForObj = {
  self: 1,
  other: 2,
};

export const tickeCloseStatus = {
  success: 1,
  fail: 2,
};

export const durationParameterObj = {
  week: "week",
  days: "days",
  month: "month",
  year: "year",
  hour: "hour",
};
