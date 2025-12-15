// utils/addPatientFormHelper.ts

import { patientOPDbasicDetailType } from "./types";

export type Category = "1" | "2" | "3";

export const genderList = [
  { value: "Male", key: 1 },
  { value: "Female", key: 2 },
  { value: "Others", key: 3 },
];

export const getValidationMessage = (
  inputValue: number,
  category: string,
  type: "weight" | "height"
): string | undefined => {
  if (type === "weight") {
    if (category === "3" && inputValue > 300) return "Weight should be less than or equal to 300 kgs";
    if (category === "2" && inputValue > 175) return "Weight should be less than or equal to  kgs";
    if (category === "1" && inputValue > 8) return "Weight should be less than or equal to 8 kgs";
  } else if (type === "height") {
    if (category === "3" && inputValue > 305) return "Height should be less than or equal to 305 cms";
    if (category === "2" && inputValue > 255) return "Height should be less than or equal to 255 cms";
    if (category === "1" && inputValue > 255) return "Height should be less than or equal to 255 cms";
  }
  return undefined;
};

export const getMaxValue = (
  category: Category,
  type: "weight" | "height"
): number => {
  const values = {
    "3": { weight: 300, height: 305 },
    "2": { weight: 175, height: 200 },
    "1": { weight: 8, height: 60 },
  };
  return values[category]?.[type];
};

export const getUniqueId = () => {
  const now = new Date();
  const value = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}${String(
    now.getHours()
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds()
  ).padStart(2, "0")}`;
  return value;
};

export const getPhoneValidationMessage = (raw: string): string | undefined => {
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "Mobile number is required";
  if (digits.length !== 10) return "Mobile number must be exactly 10 digits";
  if (!/^[6-9]/.test(digits)) return "Mobile number must start with 6, 7, 8, or 9";

  return undefined;
};

// utils/addPatientFormHelper.ts
export const getEmailValidationMessage = (value: string): string | undefined => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;

  // Standard email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(trimmed)) {
    return "Enter a valid Email ID";
  }

  // Optional: Check for common TLDs (more permissive)
  const commonTLDs = [
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 
    'in', 'co.in', 'org.in', 'net.in', 'gov.in', 
    'uk', 'co.uk', 'org.uk', 'au', 'ca', 'de', 'fr', 'jp'
  ];

  const domain = trimmed.split('@')[1];
  if (!domain) return "Invalid email domain";
  
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  
  // Allow common TLDs
  if (!commonTLDs.includes(tld)) {
    return `Please use a common email domain (.com, .org, .in, etc.)`;
  }

  return undefined;
};

// ---------------- NEW VALIDATION HELPERS BELOW ----------------

type PatientField = {
  value: any;
  valid: boolean;
  showError: boolean;
  message: string;
};

const FIELD_LABELS: Partial<Record<keyof patientOPDbasicDetailType, string>> = {
  pName: "Patient Name",
  phoneNumber: "Mobile Number",
  address: "Address",
  state: "State",
  city: "City",
  pinCode: "PIN Code",
  pUHID: "UHID",
  weight: "Weight (kg)",
  height: "Height (cm)",
  email: "Email",
  dob: "Date of Birth",
  gender: "Gender",
  departmentID: "Department",
  userID: "Doctor",
  wardID: "Ward",
};

export interface AddPatientValidationResult {
  isValid: boolean;
  updatedForm: patientOPDbasicDetailType;
  errorMessage?: string;
}

/**
 * Central validation for AddPatientForm
 * - Checks all mandatory fields
 * - Validates UHID, department, doctor, ward (for IPD)
 * - Validates weight / height ranges
 * - Returns updated form + aggregated error message
 */
export const validateAddPatientForm = (
  formData: patientOPDbasicDetailType,
  category: Category | string,
  userPatientStatus?: number | string | null
): AddPatientValidationResult => {
  let valid = true;
  const updated: patientOPDbasicDetailType = { ...formData };

  const errorFields: string[] = [];

  const addFieldLabel = (key: keyof patientOPDbasicDetailType) => {
    const label = FIELD_LABELS[key] || String(key);
    if (!errorFields.includes(label)) {
      errorFields.push(label);
    }
  };

  const isInpatient = Number(userPatientStatus ?? 0) === 2;

  // --- UHID strict check ---
  if (
    !formData.pUHID.value ||
    String(formData.pUHID.value).replace(/-/g, "").length !== 14
  ) {
    updated.pUHID = {
      ...(updated.pUHID as PatientField),
      valid: false,
      showError: true,
      message: updated.pUHID.message || "UHID must be 14 digits",
    };
    addFieldLabel("pUHID");
    valid = false;
  }

  // --- Department required ---
  if (!formData.departmentID.value) {
    updated.departmentID = {
      ...(updated.departmentID as PatientField),
      valid: false,
      showError: true,
      message: updated.departmentID.message || "Please select a department",
    };
    addFieldLabel("departmentID");
    valid = false;
  }

  // --- Doctor ALWAYS required ---
  if (!formData.userID.value) {
    updated.userID = {
      ...(updated.userID as PatientField),
      valid: false,
      showError: true,
      message: updated.userID.message || "Please select a doctor",
    };
    addFieldLabel("userID");
    valid = false;
  }

  // --- Ward required ONLY for inpatients ---
  if (isInpatient && !formData.wardID.value) {
    updated.wardID = {
      ...(updated.wardID as PatientField),
      valid: false,
      showError: true,
      message: updated.wardID.message || "Please select a ward",
    };
    addFieldLabel("wardID");
    valid = false;
  }

  // ⭐ All starred text fields (including new ones)
  const requiredKeys: (keyof patientOPDbasicDetailType)[] = [
    "pName",
    "phoneNumber",
    "address",
    "state",
    "city",
    "pinCode",
    "pUHID",
    "weight",
    "height",
    "dob",
    "gender",
  ];

  requiredKeys.forEach((key) => {
    const field = formData[key] as PatientField;

    const isEmpty =
      field.value === null ||
      field.value === "" ||
      // special case: gender not selected (-1 / 0)
      (key === "gender" && (field.value === -1 || field.value === 0));

    if (isEmpty) {
      (updated as any)[key] = {
        ...field,
        valid: false,
        showError: true,
        message: field.message || "Required",
      } as PatientField;
      addFieldLabel(key);
      valid = false;
    }
  });

  (Object.keys(formData) as (keyof patientOPDbasicDetailType)[]).forEach(
    (key) => {
      const field = formData[key] as PatientField;

      if (!field.valid && field.value !== null && field.value !== "") {
        (updated as any)[key] = {
          ...field,
          showError: true,
        } as PatientField;
      if (key !== "email") {
        addFieldLabel(key);
      }
      valid = false;
      }
    }
  );


  // ⚖️ Weight validation
  const w = Number(formData.weight.value);
  const weightError = getValidationMessage(w, String(category), "weight");
  if (weightError) {
    updated.weight = {
      ...updated.weight,
      valid: false,
      showError: true,
      message: weightError,
    };
    addFieldLabel("weight");
    valid = false;
  }

  // 📏 Height validation
  const h = Number(formData.height.value);
  const heightError = getValidationMessage(h, String(category), "height");
  if (heightError) {
    updated.height = {
      ...updated.height,
      valid: false,
      showError: true,
      message: heightError,
    };
    addFieldLabel("height");
    valid = false;
  }

  // 🚨 FINAL MESSAGE: exact field names
  let errorMessage: string | undefined;
  if (!valid && errorFields.length > 0) {
    const uniqueFields = Array.from(new Set(errorFields));
    errorMessage =
      uniqueFields.length === 1
        ? `${uniqueFields[0]} is required .`
        : `${uniqueFields.join(", ")} are required .`;
  }

  return {
    isValid: valid,
    updatedForm: updated,
    errorMessage,
  };
};
