import { Alert } from "react-native";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export const validateField = (value: any, rules: ValidationRule[]): string | null => {
  for (const rule of rules) {
    if (rule.required && (!value || value.toString().trim() === "")) {
      return rule.message;
    }

    if (value && rule.minLength && value.toString().length < rule.minLength) {
      return rule.message;
    }

    if (value && rule.maxLength && value.toString().length > rule.maxLength) {
      return rule.message;
    }

    if (value && rule.pattern && !rule.pattern.test(value.toString())) {
      return rule.message;
    }

    if (value && rule.custom && !rule.custom(value)) {
      return rule.message;
    }
  }
  return null;
};

export const validateForm = (data: any, rules: ValidationRules): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};

  Object.keys(rules).forEach(field => {
    const error = validateField(data[field], rules[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Sale Form Validation Rules
export const saleFormValidationRules: ValidationRules = {
  name: [
    {
      required: true,
      message: "Please enter patient name"
    },
    {
      minLength: 2,
      message: "Name must be at least 2 characters long"
    },
    {
      pattern: /^[a-zA-Z\s]*$/,
      message: "Name can only contain letters and spaces"
    }
  ],
  city: [
    {
      required: true,
      message: "Please enter city"
    },
    {
      minLength: 2,
      message: "City must be at least 2 characters long"
    }
  ],
  mobileNumber: [
    {
      required: true,
      message: "Please enter mobile number"
    },
    {
      pattern: /^[6-9]\d{9}$/,
      message: "Please enter a valid 10-digit mobile number"
    }
  ],
  discount: [
    {
      custom: (value) => value === '' || (Number(value) >= 0 && Number(value) <= 100),
      message: "Discount must be between 0 and 100%"
    }
  ]
};

export const showValidationAlert = (errors: { [key: string]: string }) => {
  const firstError = Object.values(errors)[0];
  if (firstError) {
    Alert.alert("Validation Error", firstError);
  }
};