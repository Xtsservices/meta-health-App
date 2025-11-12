import { Role_NAME } from "./role";

// const secretKey: string | undefined = import.meta.env.SECRET_KEY;

export const scopeLinks: Record<number, string> = {
  5001: "inpatient",
  5002: "opd",
  5003: "emergency-green",
  5004: "emergency-yellow",
  5005: "emergency-red",
  5006: "triage",
  5007: "ot",
  5008: "ot"
};

export const roleRoutes = {
  [Role_NAME.admin]: "/inpatient/admin",
  [Role_NAME.sAdmin]: "/sadmin",
  [Role_NAME.reception]: "/reception",
  [Role_NAME.customerCare]: "/customerCare",
  
};

// export const key = secretKey || "a1f0d31b6e4c2a8f79eacb10d1453e3f";