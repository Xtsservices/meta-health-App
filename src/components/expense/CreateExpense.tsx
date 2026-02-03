// components/expense/CreateExpenseScreen.tsx
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActionSheetIOS,
  KeyboardAvoidingView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  Smartphone, 
  CreditCard, 
  X, 
  Upload, 
  Image as ImageIcon,
  Trash2,
  Camera,
  File,
  Hash,
  TrendingUp,
  ChevronLeft,
  Search,
  Building,
  Stethoscope,
  Package,
  Microscope,
  Bed,
  Scissors,
  Hospital,
  AlertCircle,
  CheckCircle,
  Clock,
  Save,
  ArrowLeft,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootState } from '../../store/store';
import { AuthFetch, UploadFiles, UpdateFiles } from '../../auth/auth';
import { showError, showSuccess } from '../../store/toast.slice';
import { 
  moderateScale, 
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  ELEVATION,
  getResponsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from '../../utils/responsive';

// Import validation utilities
import { 
  validateForm, 
  validateField, 
  ValidationRules 
} from '../../utils/validation';
import { COLORS } from '../../utils/colour';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'upi', label: 'UPI' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'online', label: 'Online Payment' },
];

const ENTITY_TYPES = [
  { 
    id: 'doctor', 
    label: 'Doctor (Personal)', 
    icon: Stethoscope,
    description: 'Expense for individual doctor'
  },
  { 
    id: 'pharmacy', 
    label: 'Pharmacy Department', 
    icon: Package,
    description: 'Expense for pharmacy department'
  },
  { 
    id: 'lab', 
    label: 'Lab Department', 
    icon: Microscope,
    description: 'Expense for laboratory department'
  },
  { 
    id: 'department', 
    label: 'Department', 
    icon: Building,
    description: 'Expense for OPD/IPD department'
  },
  { 
    id: 'ward', 
    label: 'Ward', 
    icon: Bed,
    description: 'Expense for hospital ward'
  },
  { 
    id: 'hospital', 
    label: 'Hospital General', 
    icon: Hospital,
    description: 'General hospital expense'
  },
];

// OPD/IPD Department Sub-types
const DEPARTMENT_SUB_TYPES = [
  { id: 'ipd', label: 'IPD (Inpatient Department)' },
  { id: 'opd', label: 'OPD (Outpatient Department)' },
  { id: 'emergency', label: 'Emergency Department' },
  { id: 'triage', label: 'Triage Area' },
];

// Expense form validation rules
const expenseFormValidationRules: ValidationRules = {
  categoryID: [
    {
      required: true,
      message: "Please select expense category"
    }
  ],
  entityType: [
    {
      required: true,
      message: "Please select 'What is this expense for?'"
    }
  ],
  entityID: [
    {
      required: true,
      message: "Please select the specific entity"
    }
  ],
  amount: [
    {
      required: true,
      message: "Please enter valid amount"
    },
    {
      pattern: /^\d+(\.\d{1,2})?$/,
      message: "Please enter a valid amount (e.g., 100 or 100.50)"
    },
    {
      custom: (value) => parseFloat(value) > 0,
      message: "Amount must be greater than 0"
    },
    {
      custom: (value) => parseFloat(value) <= 99999999.99,
      message: "Amount cannot exceed ₹99,999,999.99"
    }
  ],
  payeeName: [
    {
      required: true,
      message: "Please enter payee name"
    },
    {
      minLength: 2,
      message: "Payee name must be at least 2 characters long"
    },
    {
      maxLength: 100,
      message: "Payee name cannot exceed 100 characters"
    },
    {
      pattern: /^[a-zA-Z\s.'-]+$/,
      message: "Payee name can only contain letters, spaces, periods, apostrophes and hyphens"
    }
  ],
  payeeContact: [
    {
      pattern: /^$|^[6-9]\d{9}$/,
      message: "Please enter a valid 10-digit mobile number starting with 6-9"
    },
    {
      maxLength: 10,
      message: "Mobile number must be 10 digits"
    }
  ],
  transactionID: [
    {
      maxLength: 50,
      message: "Transaction ID cannot exceed 50 characters"
    },
    {
      pattern: /^[a-zA-Z0-9\s\-_]*$/,
      message: "Transaction ID can only contain letters, numbers, spaces, hyphens and underscores"
    }
  ],
  description: [
    {
      required: true,
      message: "Please enter description"
    },
    {
      minLength: 5,
      message: "Description must be at least 5 characters long"
    },
    {
      maxLength: 500,
      message: "Description cannot exceed 500 characters"
    },
    {
      pattern: /^[a-zA-Z0-9\s.,!?'"()\-_&@#$%*+/:;]*$/,
      message: "Description contains invalid characters"
    }
  ],
  remarks: [
    {
      maxLength: 500,
      message: "Remarks cannot exceed 500 characters"
    },
    {
      pattern: /^[a-zA-Z0-9\s.,!?'"()\-_&@#$%*+/:;]*$/,
      message: "Remarks contains invalid characters"
    }
  ],
  expenseDate: [
    {
      required: true,
      message: "Please select expense date"
    },
    {
      custom: (value) => {
        if (!value) return false;
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        return selectedDate <= today;
      },
      message: "Expense date cannot be in the future"
    },
    {
      custom: (value) => {
        if (!value) return false;
        const selectedDate = new Date(value);
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 1); // 1 year ago
        return selectedDate >= minDate;
      },
      message: "Expense date cannot be older than 1 year"
    }
  ],
  billingDate: [
    {
      custom: (value, expenseDate) => {
        if (!value) return true; // Optional field
        const billingDate = new Date(value);
        const expDate = new Date(expenseDate);
        expDate.setHours(0, 0, 0, 0);
        billingDate.setHours(0, 0, 0, 0);
        return billingDate <= expDate;
      },
      message: "Billing date cannot be after expense date"
    }
  ]
};

const formatDateSimple = (date: Date | string | null, formatStr: string = 'DD/MM/YYYY'): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  if (formatStr === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  }
  
  if (formatStr === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  
  return `${day}/${month}/${year}`;
};

interface Attachment {
  uri: string;
  type: string;
  name: string;
  size?: number;
  id: string;
}
interface CreateExpenseScreenProps {
  categories?: Category[];
  userPermissions?: any;
  mode?: 'create' | 'edit';
  expenseData?: any;
  onExpenseCreated?: () => void;
}

interface Entity {
  id: string | number;
  name?: string;
  doctorName?: string;
  pharmacyName?: string;
  labName?: string;
  departmentName?: string;
  wardName?: string;
  operationTheatreName?: string;
  specialization?: string;
  [key: string]: any;
}

interface AnalyticsSummary {
  entityType: string;
  entityID: number;
  categoryName: string;
  totalTransactions: number;
  totalAmount: string;
}

interface Category {
  id: number;
  hospitalID: number;
  categoryName: string;
  categoryType: string;
  description: string;
  isActive: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface Ward {
  id: number | string;
  name: string;
}

interface OperationTheatre {
  id: number | string;
  name: string;
}

interface RouteParams {
  expenseId?: string;
  expenseData?: any;
  mode?: 'create' | 'edit';
}

// ========== MEMOIZED COMPONENTS (MOVED OUTSIDE) ==========

interface InputFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  editable?: boolean;
  error?: string;
  onBlur?: () => void;
  maxLength?: number;
}

const InputField = memo(({ 
  label, 
  value, 
  placeholder, 
  onChangeText, 
  multiline = false,
  keyboardType = 'default',
  editable = true,
  error,
  onBlur,
  maxLength,
}: InputFieldProps) => {
  const inputRef = useRef<TextInput>(null);
  
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          multiline && { height: responsiveHeight(15), textAlignVertical: 'top' },
          !editable && styles.inputDisabled,
          error && styles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType}
        editable={editable}
        onBlur={onBlur}
        maxLength={maxLength}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  showId?: boolean;
  idValue?: string;
  icon?: any;
  editable?: boolean;
  error?: string;
}

const SelectField = memo(({ 
  label, 
  value, 
  placeholder, 
  onPress,
  showId = false,
  idValue = '',
  icon: Icon,
  editable = true,
  error,
}: SelectFieldProps) => (
  <View style={styles.block}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity 
      style={[
        styles.select, 
        !editable && styles.inputDisabled,
        error && styles.selectError
      ]} 
      onPress={onPress}
      disabled={!editable}
    >
      {Icon && <Icon size={16} color={COLORS.sub} style={styles.selectIcon} />}
      <Text style={styles.selectText} numberOfLines={1} ellipsizeMode="tail">
        {value || placeholder}
      </Text>
    </TouchableOpacity>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
));

const CategoryModal = memo(({ 
  visible, 
  onClose, 
  categories, 
  formData, 
  setFormData, 
  setSelectedCategory 
}: any) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View 
      style={styles.modalOverlay}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Category</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={COLORS.sub} />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
        >
          {categories.length === 0 ? (
            <View style={styles.emptyEntityState}>
              <FileText size={48} color={COLORS.sub} />
              <Text style={styles.emptyEntityText}>No categories found</Text>
              <Text style={styles.emptyEntitySubText}>
                Please contact admin to add expense categories
              </Text>
            </View>
          ) : (
            categories.map((category: Category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.modalOption,
                  formData.categoryID === category.id.toString() && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setFormData((prev: any) => ({ ...prev, categoryID: category.id.toString() }));
                  setSelectedCategory(category);
                  onClose();
                }}
              >
                <View>
                  <Text style={[
                    styles.modalOptionText,
                    formData.categoryID === category.id.toString() && styles.modalOptionTextSelected
                  ]}>
                    {category.categoryName}
                  </Text>
                  <Text style={styles.categoryTypeText}>
                    {category.categoryType}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

const EntityModal = memo(({ 
  visible, 
  onClose, 
  formData, 
  handleEntityTypeSelect,
  isEditMode
}: any) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View 
      style={styles.modalOverlay}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>What is this expense for?</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={COLORS.sub} />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
        >
          {ENTITY_TYPES.map((entity) => {
            const Icon = entity.icon;
            return (
              <TouchableOpacity
                key={entity.id}
                style={[
                  styles.entityOption,
                  formData.entityType === entity.id && styles.entityOptionSelected,
                  isEditMode && styles.optionDisabled
                ]}
                onPress={() => {
                  if (isEditMode) return;
                  handleEntityTypeSelect(entity.id);
                  onClose();
                }}
                disabled={isEditMode}
              >
                <View style={styles.entityOptionIcon}>
                  <Icon size={24} color={formData.entityType === entity.id ? COLORS.brand : COLORS.sub} />
                </View>
                <View style={styles.entityOptionContent}>
                  <Text style={[
                    styles.entityOptionTitle,
                    formData.entityType === entity.id && styles.entityOptionTitleSelected,
                    isEditMode && styles.optionTextDisabled
                  ]}>
                    {entity.label}
                    {isEditMode && formData.entityType === entity.id && ' (Cannot be changed)'}
                  </Text>
                  <Text style={[styles.entityOptionDescription, isEditMode && styles.optionTextDisabled]}>
                    {entity.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

const PaymentMethodModal = memo(({ 
  visible, 
  onClose, 
  formData, 
  setFormData 
}: any) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View 
      style={styles.modalOverlay}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Payment Method</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={COLORS.sub} />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
        >
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.modalOption,
                formData.paymentMethod === method.id && styles.modalOptionSelected
              ]}
              onPress={() => {
                setFormData((prev: any) => ({ ...prev, paymentMethod: method.id }));
                onClose();
              }}
            >
              <Text style={[
                styles.modalOptionText,
                formData.paymentMethod === method.id && styles.modalOptionTextSelected
              ]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

const DepartmentSubTypeModal = memo(({ 
  visible, 
  onClose, 
  formData, 
  setFormData,
  isEditMode
}: any) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View 
      style={styles.modalOverlay}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Department Type</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={COLORS.sub} />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
        >
          {DEPARTMENT_SUB_TYPES.map((subType) => (
            <TouchableOpacity
              key={subType.id}
              style={[
                styles.modalOption,
                formData.departmentSubType === subType.id && styles.modalOptionSelected,
                isEditMode && styles.optionDisabled
              ]}
              onPress={() => {
                if (isEditMode) return;
                setFormData((prev: any) => ({ 
                  ...prev, 
                  departmentSubType: subType.id,
                  entityID: `${prev.entityID}_${subType.id}` // Combine department ID with sub-type
                }));
                onClose();
              }}
              disabled={isEditMode}
            >
              <Text style={[
                styles.modalOptionText,
                formData.departmentSubType === subType.id && styles.modalOptionTextSelected,
                isEditMode && styles.optionTextDisabled
              ]}>
                {subType.label}
                {isEditMode && formData.departmentSubType === subType.id && ' (Cannot be changed)'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

// ========== MAIN COMPONENT ==========

const CreateExpenseScreen = ({ 
  categories: propCategories = [], 
  userPermissions = {},
  mode = 'create',
  expenseData: propExpenseData,
  onExpenseCreated 
}: CreateExpenseScreenProps) => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  const dispatch = useDispatch();
  
  // Use mode from props if available, otherwise from params
  const isEditMode = mode === 'edit' || params?.mode === 'edit';
  const expenseId = params?.expenseId;
  const existingExpenseData = params?.expenseData;

  // Use categories from props
  const [categories, setCategories] = useState<Category[]>(propCategories || []);
  
  // Determine which data source to use
  const expenseDataToUse = propExpenseData || existingExpenseData;
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [formData, setFormData] = useState({
    categoryID: '',
    entityType: '',
    entityID: '',
    expenseDate: new Date(),
    billingDate: null as Date | null,
    amount: '',
    paymentMethod: 'cash',
    transactionID: '',
    payeeName: '',
    payeeContact: '',
    description: '',
    remarks: '',
    departmentSubType: '', 
  });

  // Validation errors state
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  // Track touched fields for better UX
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [showBillingDatePicker, setShowBillingDatePicker] = useState(false);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEntitySelectionModal, setShowEntitySelectionModal] = useState(false);
  const [showDepartmentSubTypeModal, setShowDepartmentSubTypeModal] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [entityAnalytics, setEntityAnalytics] = useState<AnalyticsSummary[]>([]);
  
  // For search in entity selection
  const [entitySearch, setEntitySearch] = useState('');
  
  // For wards
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [wardSearch, setWardSearch] = useState('');
  
  // For operation theatres
  const [operationTheatres, setOperationTheatres] = useState<OperationTheatre[]>([]);
  const [otLoading, setOtLoading] = useState(false);
  const [otSearch, setOtSearch] = useState('');

  const selectedFileNames = useRef<Set<string>>(new Set());
  const user = useSelector((state: RootState) => state.currentUser);

  // Helper function to validate a specific field
  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const fieldRules = expenseFormValidationRules[fieldName as keyof ValidationRules];
    if (!fieldRules) return null;

    for (const rule of fieldRules) {
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

      if (value && rule.custom) {
        if (fieldName === 'billingDate') {
          // For billing date, pass expenseDate as second parameter
          if (!rule.custom(value, formData.expenseDate)) {
            return rule.message;
          }
        } else if (!rule.custom(value)) {
          return rule.message;
        }
      }
    }
    return null;
  }, [formData.expenseDate]);

  // Helper function to validate entire form
  const validateForm = useCallback((): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Validate all fields
    Object.keys(expenseFormValidationRules).forEach(field => {
      const value = formData[field as keyof typeof formData];
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    // Additional validation for entity selection
    if (!formData.entityType) {
      newErrors.entityType = "Please select 'What is this expense for?'";
    }
    
    if (!formData.entityID) {
      newErrors.entityID = "Please select the specific entity";
    }
    if (formData.entityType === 'department' && formData.departmentSubType && !formData.entityID.includes('_')) {
      newErrors.entityID = "Please select department sub-type";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  // Validate a field when it loses focus (onBlur)
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const value = formData[fieldName as keyof typeof formData];
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
  }, [formData, validateField]);

  // Handle input change with validation
  const handleInputChange = useCallback((fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
    
    // Validate immediately for certain fields
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
    }
  }, [errors, touched, validateField]);

  // Format amount to always have 2 decimal places
  const handleAmountChange = useCallback((text: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += '.' + parts.slice(1).join('').substring(0, 2);
    }
    
    handleInputChange('amount', formatted);
  }, [handleInputChange]);

  // Format payee contact (mobile number)
  const handlePayeeContactChange = useCallback((text: string) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 10 digits
    const formatted = cleaned.substring(0, 10);
    
    handleInputChange('payeeContact', formatted);
  }, [handleInputChange]);

  // Format payee name (only letters, spaces, and common punctuation)
  const handlePayeeNameChange = useCallback((text: string) => {
    // Allow letters, spaces, apostrophes, hyphens, and periods
    const cleaned = text.replace(/[^a-zA-Z\s.'-]/g, '');
    
    handleInputChange('payeeName', cleaned);
  }, [handleInputChange]);

  // Format transaction ID (alphanumeric with some special chars)
  const handleTransactionIDChange = useCallback((text: string) => {
    // Allow alphanumeric, spaces, hyphens, underscores
    const cleaned = text.replace(/[^a-zA-Z0-9\s\-_]/g, '');
    
    handleInputChange('transactionID', cleaned);
  }, [handleInputChange]);

  // Helper function to check if entity is auto-selected
  const isAutoSelectedEntity = useCallback((entityType: string): boolean => {
    const autoSelectTypes = ['doctor', 'pharmacy', 'lab', 'hospital'];
    const isDepartmentAuto = entityType === 'department' && user?.departmentID;
    
    return autoSelectTypes.includes(entityType) || isDepartmentAuto;
  }, [user?.departmentID]);

  // Helper function to get auto-selected entity ID based on entity type
  const getAutoSelectedEntityId = useCallback((entityType: string): string | null => {
    switch (entityType) {
      case 'doctor':
        return user?.id?.toString() || null;
      case 'pharmacy':
        return user?.hospitalID?.toString() || null;
      case 'lab':
        return user?.hospitalID?.toString() || null;
      case 'department':
        return user?.departmentID?.toString() || null;
      case 'hospital':
        return user?.hospitalID?.toString() || null;
      default:
        return null;
    }
  }, [user?.id, user?.hospitalID, user?.departmentID]);

  // Helper function to get auto-selected entity name
  const getAutoSelectedEntityName = useCallback((entityType: string, departmentSubType?: string): string => {
    switch (entityType) {
      case 'doctor':
        return user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || `Doctor (ID: ${user?.id})`;
      case 'pharmacy':
        return 'Pharmacy Department';
      case 'lab':
        return 'Lab Department';
      case 'department':
        const baseName = user?.departmentName || 'Department';
        if (departmentSubType) {
          const subType = DEPARTMENT_SUB_TYPES.find(st => st.id === departmentSubType);
          return `${baseName} - ${subType?.label || departmentSubType}`;
        }
        return baseName;
      case 'hospital':
        return 'Hospital General';
      default:
        return `Entity ${formData.entityID}`;
    }
  }, [user, formData.entityID]);

  // Load categories and prefill data if in edit mode
  useEffect(() => {
    loadCategories();
    
    if (isEditMode && existingExpenseData) {
      prefillFormData(existingExpenseData);
    }
  }, [isEditMode, existingExpenseData]);

  // Update validation rules for billing date based on expense date
  useEffect(() => {
    // Update billing date validation dynamically
    if (expenseFormValidationRules.billingDate) {
      const billingRules = expenseFormValidationRules.billingDate;
      // The custom validator is already defined to use expenseDate
      // No need to update it dynamically
    }
  }, [formData.expenseDate]);

// Add this useEffect to handle incoming expense data
useEffect(() => {
  // If we have expense data from props (when editing from list)
  if (propExpenseData) {
    console.log('Received expense data from props:', propExpenseData);
    prefillFormData(propExpenseData);
  }
  // If we have expense data from route params (when navigating directly)
  else if (isEditMode && existingExpenseData) {
    console.log('Received expense data from route:', existingExpenseData);
    prefillFormData(existingExpenseData);
  }
}, [propExpenseData, isEditMode, existingExpenseData]);

// Update the prefillFormData function
const prefillFormData = useCallback((expenseData: any) => {
  if (!expenseData) return;
  
  // Reset form first
  setFormData({
    categoryID: '',
    entityType: '',
    entityID: '',
    expenseDate: new Date(),
    billingDate: null,
    amount: '',
    paymentMethod: 'cash',
    transactionID: '',
    payeeName: '',
    payeeContact: '',
    description: '',
    remarks: '',
    departmentSubType: '',
  });
  let departmentSubType = '';
  let entityId = expenseData.entityID?.toString() || expenseData.entityId?.toString() || '';
  
  if (expenseData.entityType === 'department' && entityId.includes('_')) {
    const parts = entityId.split('_');
    if (parts.length > 1) {
      entityId = parts[0]; // Get the base department ID
      departmentSubType = parts.slice(1).join('_'); // Get the sub-type
    }
  }
  
  // Then set the new data
  setFormData({
    categoryID: expenseData.categoryID?.toString() || expenseData.categoryId?.toString() || '',
      entityType: expenseData.entityType || '',
      entityID: expenseData.entityID?.toString() || expenseData.entityId?.toString() || '',
      expenseDate: expenseData.expenseDate ? new Date(expenseData.expenseDate) : new Date(),
      billingDate: expenseData.billingDate ? new Date(expenseData.billingDate) : null,
      amount: expenseData.amount?.toString() || '',
      paymentMethod: expenseData.paymentMethod || 'cash',
      transactionID: expenseData.transactionID || expenseData.transactionId || '',
      payeeName: expenseData.payeeName || '',
      payeeContact: expenseData.payeeContact || '',
      description: expenseData.description || '',
      remarks: expenseData.remarks || '',
      departmentSubType: departmentSubType || expenseData.departmentSubType || '',
    });

    // Load existing attachments
    if (expenseData.attachments && Array.isArray(expenseData.attachments)) {
      setExistingAttachments(expenseData.attachments);
    }

    // Load selected category
  const categoryId = expenseData.categoryID || expenseData.categoryId;
  if (categoryId) {
    // First check in the current categories state
    const existingCategory = categories.find(cat => cat.id.toString() === categoryId.toString());
    if (existingCategory) {
      setSelectedCategory(existingCategory);
    } else {
      // If not found, try to find it in the propCategories
      const propCategory = propCategories?.find(cat => cat.id.toString() === categoryId.toString());
      if (propCategory) {
        setSelectedCategory(propCategory);
      } else {
        // If still not found, create a temporary category object
        setSelectedCategory({
          id: Number(categoryId),
          categoryName: expenseData.categoryName || `Category ${categoryId}`,
          categoryType: expenseData.categoryType || 'general',
          description: '',
          hospitalID: user?.hospitalID || 0,
          isActive: 1,
          createdBy: user?.id || 0,
          createdAt: '',
          updatedAt: ''
        });
      }
    }
  }

    // Load selected entity
    const entityType = expenseData.entityType;
    
    if (entityType && entityId) {
      // Check if it's an auto-selected entity type
      if (isAutoSelectedEntity(entityType)) {
        const entityName = getAutoSelectedEntityName(entityType, departmentSubType);
        setSelectedEntity({
          id: entityId,
          name: entityName,
        });
      } else {
          // For non-auto-selected entities
            const entity = {
              id: entityId,
              name: expenseData.entityName || expenseData.departmentName || expenseData.wardName || `Entity ${entityId}`,
              ...expenseData
            };
            setSelectedEntity(entity);
          
          loadEntities(entityType);
      }
    }
  }, [categories, propCategories, user, isAutoSelectedEntity, getAutoSelectedEntityName]);

  const loadCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID) return;

      const response = await AuthFetch(`expense/categories/hospital/${user.hospitalID}`, token) as any;
      
      if ((response?.status === 'success' || response?.message === 'success') && response?.data?.categories) {
        setCategories(response.data.categories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      dispatch(showError('Failed to load expense categories'));
      setCategories([]);
    }
  };

  const loadEntities = async (entityType: string) => {
    try {
      setLoadingEntities(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID) return;

      let endpoint = '';
      let autoSelectEntityId = null;
      let autoSelectEntityName = '';
      
      switch (entityType) {
        case 'doctor':
          // For doctor, use current user's ID directly
          autoSelectEntityId = user.id?.toString();
          autoSelectEntityName = getAutoSelectedEntityName('doctor');
          break;
        case 'pharmacy':
          // For pharmacy, use hospital ID directly
          autoSelectEntityId = user.hospitalID.toString();
          autoSelectEntityName = 'Pharmacy Department';
          break;
        case 'lab':
          // For lab, use hospital ID directly
          autoSelectEntityId = user.hospitalID.toString();
          autoSelectEntityName = 'Lab Department';
          break;
        case 'department':
          // For department, use user's departmentID if available
          if (user?.departmentID) {
            autoSelectEntityId = user.departmentID.toString();
            autoSelectEntityName = user.departmentName || 'Department';
            setShowDepartmentSubTypeModal(true);
          } else {
            // Fallback to loading departments for selection
            endpoint = `department/hospital/${user.hospitalID}`;
          }
          break;
        case 'ward':
          await loadWards();
          setLoadingEntities(false);
          return;
        case 'hospital':
          // For hospital general, use current hospital
          autoSelectEntityId = user.hospitalID.toString();
          autoSelectEntityName = 'Hospital General';
          break;
        default:
          setLoadingEntities(false);
          return;
      }

      // Handle auto-selected entities
      if (autoSelectEntityId) {
        setFormData(prev => ({ 
          ...prev, 
          entityID: autoSelectEntityId 
        }));
        setSelectedEntity({
          id: autoSelectEntityId,
          name: autoSelectEntityName,
        });
        
        // Clear entity errors
        setErrors(prev => ({ ...prev, entityID: '' }));
        
        // Fetch analytics for auto-selected entities in create mode
        if (!isEditMode && entityType !== 'department') {
          fetchEntityAnalytics(autoSelectEntityId, entityType);
        }
        
        setLoadingEntities(false);
        return;
      }

      // Only fetch entities for types that need selection
      if (endpoint) {
        const response = await AuthFetch(endpoint, token) as any;
        let entitiesData: any[] = [];

        if (response?.status === 'success' || response?.data || response?.message === 'success') {
          if (entityType === 'doctor') {
            entitiesData = response.data?.users || response.users || [];
            const transformedEntities: Entity[] = entitiesData.map((entity: any) => ({
              id: entity.id || entity.userID,
              name: `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.name || `Doctor ${entity.id}`,
              specialization: entity.specialization,
              ...entity
            }));
            setEntities(transformedEntities);
          } else {
            entitiesData = response.data || response.departments || [];
            const transformedEntities: Entity[] = entitiesData.map((entity: any) => ({
              id: entity.id || entity.departmentID,
              name: entity.name || entity.departmentName,
              ...entity
            }));
            setEntities(transformedEntities);
          }
        } else {
          setEntities([]);
        }
      }
    } catch (error) {
      console.error('Failed to load entities:', error);
      dispatch(showError('Failed to load entities'));
      setEntities([]);
    } finally {
      setLoadingEntities(false);
    }
  };

  const loadWards = async () => {
    try {
      setWardsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID) return;

      const response = await AuthFetch(`ward/${user.hospitalID}`, token) as any;
      
      if (response?.status === 'success' && response?.data?.wards) {
        setWards(response.data.wards);
      } else {
        setWards([]);
      }
    } catch (error) {
      console.error('Failed to load wards:', error);
      dispatch(showError('Failed to load wards'));
      setWards([]);
    } finally {
      setWardsLoading(false);
    }
  };

  const fetchEntityAnalytics = async (entityId: string, entityType: string) => {
    try {
      setLoadingAnalytics(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID) return;

      // Calculate date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const params = new URLSearchParams({
        entityType: entityType,
        entityID: entityId,
        startDate: formatDateSimple(startDate, 'YYYY-MM-DD'),
        endDate: formatDateSimple(endDate, 'YYYY-MM-DD')
      });

      const url = `expense/analytics/entity-category/hospital/${user.hospitalID}?${params}`;
      const response = await AuthFetch(url, token) as any;

      if (response?.message === 'success' || response?.status === 'success') {
        setEntityAnalytics(response.summary || []);
        
        if (response.summary && response.summary.length > 0) {
          const summary = response.summary[0];
          const matchedCategory = categories.find(
            cat => cat.categoryName === summary.categoryName
          );
          
          if (matchedCategory && !isEditMode) {
            setFormData(prev => ({
              ...prev,
              categoryID: matchedCategory.id.toString()
            }));
            setSelectedCategory(matchedCategory);
            
            // Clear category error if auto-selected
            setErrors(prev => ({ ...prev, categoryID: '' }));
            
            dispatch(showSuccess(
              `Found ${summary.totalTransactions} previous expense(s) for this entity. Category "${summary.categoryName}" auto-selected.`
            ));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      dispatch(showError('Failed to fetch analytics'));
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleDateChange = useCallback((event: any, selectedDate: Date | undefined, field: 'expenseDate' | 'billingDate') => {
    if (field === 'expenseDate') {
      setShowExpenseDatePicker(false);
    } else {
      setShowBillingDatePicker(false);
    }
    
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        [field]: selectedDate
      }));
      
      // Validate date after selection
      setTimeout(() => {
        handleFieldBlur(field);
      }, 100);
    }
  }, [handleFieldBlur]);

  // Handle entity type selection
  const handleEntityTypeSelect = useCallback((entityType: string) => {
    // Clear previous selections
    setFormData(prev => ({ 
      ...prev, 
      entityType,
      entityID: '',
      departmentSubType: '',
    }));
    setSelectedEntity(null);
    setEntityAnalytics([]);
    setShowEntityModal(false);
    
    // Clear entity errors
    setErrors(prev => ({ ...prev, entityType: '', entityID: '' }));
    
    // Get auto-selected entity ID if applicable
    const autoSelectEntityId = getAutoSelectedEntityId(entityType);
    
    if (autoSelectEntityId) {
      // Set the auto-selected entity
      setFormData(prev => ({ 
        ...prev, 
        entityID: autoSelectEntityId 
      }));
      setSelectedEntity({
        id: autoSelectEntityId,
        name: getAutoSelectedEntityName(entityType),
      });

    // For department type with auto-select, show sub-type modal
    if (entityType === 'department' && autoSelectEntityId) {
      setShowDepartmentSubTypeModal(true);
    } else if (!isEditMode && entityType !== 'department') {
        fetchEntityAnalytics(autoSelectEntityId, entityType);
      }
    } else {
      // Load entities for types that need selection
    if (entityType === 'ward') {
      loadWards();
    }
      
      if (entityType === 'department' && !user?.departmentID) {
        loadEntities(entityType);
      }
    }
  }, []);

  const generateFileId = useCallback((name: string, size?: number): string => {
    return `${name}_${size || 0}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const isFileAlreadySelected = useCallback((fileName: string, fileSize?: number): boolean => {
    return attachments.some(file => 
      file.name === fileName && file.size === fileSize
    );
  }, [attachments]);

  const addFile = useCallback((file: Omit<Attachment, 'id'>): boolean => {
    if (isFileAlreadySelected(file.name, file.size)) {
      dispatch(showError(`File "${file.name}" is already selected`));
      return false;
    }
    
    const newFile: Attachment = {
      ...file,
      id: generateFileId(file.name, file.size)
    };
    
    setAttachments(prev => [...prev, newFile]);
    selectedFileNames.current.add(file.name);
    return true;
  }, [isFileAlreadySelected, generateFileId, dispatch]);

  const addMultipleFiles = useCallback((newFiles: Omit<Attachment, 'id'>[]): void => {
    const uniqueFiles: Attachment[] = [];
    const duplicates: string[] = [];
    
    newFiles.forEach(file => {
      if (isFileAlreadySelected(file.name, file.size)) {
        duplicates.push(file.name);
      } else {
        uniqueFiles.push({
          ...file,
          id: generateFileId(file.name, file.size)
        });
        selectedFileNames.current.add(file.name);
      }
    });
    
    if (uniqueFiles.length > 0) {
      setAttachments(prev => [...prev, ...uniqueFiles]);
    }
    
    if (duplicates.length > 0) {
      const duplicateMsg = duplicates.length === 1 
        ? `"${duplicates[0]}" is already selected`
        : `${duplicates.length} files were already selected`;
      dispatch(showError(duplicateMsg));
    }
  }, [isFileAlreadySelected, generateFileId, dispatch]);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs access to your camera to take photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      dispatch(showError('Camera permission error'));
      return false;
    }
  };

  const openCamera = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        dispatch(showError('Camera permission denied'));
        return;
      }

      const res = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (!res.didCancel && res.assets?.length) {
        const file = res.assets[0];
        const fileName = file.fileName || `expense_photo_${Date.now()}.jpg`;
        
        addFile({
          uri: file.uri!,
          name: fileName,
          type: file.type || 'image/jpeg',
          size: file.fileSize,
        });
      }
    } catch (err) {
      dispatch(showError('Failed to capture image'));
    }
  };

  const openGallery = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 10,
      });

      if (!res.didCancel && res.assets?.length) {
        const newFiles = res.assets.map((file) => ({
          uri: file.uri!,
          name: file.fileName || `expense_file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: file.type || 'application/octet-stream',
          size: file.fileSize,
        }));
        
        addMultipleFiles(newFiles);
      }
    } catch (err) {
      dispatch(showError('Failed to select images from gallery'));
    }
  };

  const pickDocuments = async () => {
    try {
      const results = await pick({
        allowMultiSelection: true,
        type: [types.allFiles],
      });

      const mapped: Omit<Attachment, 'id'>[] = await Promise.all(
        results.map(async (file): Promise<Omit<Attachment, 'id'>> => {
          let uri = file.uri;

          if (Platform.OS === 'android' && uri.startsWith('content://')) {
            const dest = `${RNFS.DocumentDirectoryPath}/${file.name}`;
            await RNFS.copyFile(uri, dest).catch(() => null);
            uri = 'file://' + dest;
          }

          return {
            uri,
            name: file.name ?? `expense_doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: file.type || 'application/octet-stream',
            size: file.size as number | undefined,
          };
        })
      );

      addMultipleFiles(mapped);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelled')) {
        dispatch(showError(error.message || 'Failed to pick documents'));
      } else if (!String(error).includes('cancelled')) {
        dispatch(showError(String(error) || 'Failed to pick documents'));
      }
    }
  };

  // Show upload options modal/action sheet
  const showUploadOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Camera', 'Gallery', 'Files'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openGallery();
          } else if (buttonIndex === 3) {
            pickDocuments();
          }
        }
      );
    } else {
      // For Android, show a modal
      Alert.alert(
        'Select File',
        'Choose an option to select files',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Camera', onPress: openCamera },
          { text: 'Gallery', onPress: openGallery },
          { text: 'Files', onPress: pickDocuments },
        ]
      );
    }
  };

  const removeAttachment = useCallback((id: string) => {
    const attachment = attachments.find(a => a.id === id);
    if (attachment) {
      selectedFileNames.current.delete(attachment.name);
    }
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, [attachments]);

  const removeExistingAttachment = useCallback((attachmentId: string) => {
    Alert.alert(
      'Remove Attachment',
      'Are you sure you want to remove this attachment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
          }
        }
      ]
    );
  }, []);

  const clearAllAttachments = useCallback(() => {
    if (attachments.length === 0 && existingAttachments.length === 0) return;
    
    Alert.alert(
      'Clear All Files',
      `Are you sure you want to remove all ${attachments.length + existingAttachments.length} selected files?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setAttachments([]);
            setExistingAttachments([]);
            selectedFileNames.current.clear();
          }
        }
      ]
    );
  }, [attachments, existingAttachments]);

  const handleSubmit = async () => {
    try {
      // Mark all fields as touched
      const allTouched: {[key: string]: boolean} = {};
      Object.keys(formData).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      
      // Validate form
      const isValid = validateForm();
      
      if (!isValid) {
        // Find first error to show alert
        const firstErrorField = Object.keys(errors).find(key => errors[key]);
        if (firstErrorField) {
          dispatch(showError(errors[firstErrorField]));
        } else {
          dispatch(showError('Please fill all required fields correctly'));
        }
        return;
      }
      
      if (isEditMode && expenseId) {
        await handleUpdateExpense();
      } else {
        await handleCreateExpense();
      }
    } catch (error) {
      console.error('Submit error:', error);
      dispatch(showError('Something went wrong. Please try again.'));
    }
  };

  const handleCreateExpense = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID) {
        dispatch(showError('Authentication required'));
        setLoading(false);
        return;
      }

      // Prepare form data
      const form = new FormData();

      // Append all required fields
      form.append('categoryID', formData.categoryID);
      form.append('entityType', formData.entityType);
      form.append('entityID', formData.entityID);
      form.append('expenseDate', formatDateSimple(formData.expenseDate, 'YYYY-MM-DD'));
      form.append('amount', formData.amount);
      form.append('paymentMethod', formData.paymentMethod);
      form.append('payeeName', formData.payeeName);
      form.append('payeeContact', formData.payeeContact || '');
      form.append('description', formData.description);
      form.append('remarks', formData.remarks || '');
      form.append('transactionID', formData.transactionID || '');
      
      // Optional fields
      if (formData.billingDate) {
        form.append('billingDate', formatDateSimple(formData.billingDate, 'YYYY-MM-DD'));
      }
      
      // Add department sub-type if exists
      if (formData.departmentSubType) {
        form.append('departmentSubType', formData.departmentSubType);
      }

      // Append attachments
      attachments.forEach(file => {
        form.append('attachments', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);
      });

      console.log('Creating expense with data:', {
        categoryID: formData.categoryID,
        entityType: formData.entityType,
        entityID: formData.entityID,
        departmentSubType: formData.departmentSubType,
        expenseDate: formatDateSimple(formData.expenseDate, 'YYYY-MM-DD'),
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        payeeName: formData.payeeName,
        description: formData.description,
        attachmentCount: attachments.length
      });

      const response = await UploadFiles(
        `expense/hospital/${user.hospitalID}`,
        form,
        token
      ) as any;

if (response?.status === 'success' || response?.message === 'success') {
  dispatch(showSuccess('Expense created successfully'));
  resetForm();

  onExpenseCreated?.(); // ✅ THIS IS THE KEY
}else {
        dispatch(showError(response?.message || 'Failed to create expense'));
      }

    } catch (err: any) {
      console.error('Create Expense Error:', err);
      dispatch(showError(err.message || 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExpense = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID || !expenseId) {
        dispatch(showError('Authentication required'));
        setLoading(false);
        return;
      }

      // Prepare update data
      const updateData = {
        categoryID: parseInt(formData.categoryID),
        expenseDate: formatDateSimple(formData.expenseDate, 'YYYY-MM-DD'),
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        payeeName: formData.payeeName,
        payeeContact: formData.payeeContact || '',
        description: formData.description,
        remarks: formData.remarks || '',
        transactionID: formData.transactionID || '',
        billingDate: formData.billingDate ? formatDateSimple(formData.billingDate, 'YYYY-MM-DD') : null,
      };

      console.log('Updating expense with data:', updateData);

      const form = new FormData();

      // append normal fields
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          form.append(key, String(value));
        }
      });

      // ✅ send existing attachment IDs
      existingAttachments.forEach(att => {
        form.append('existingAttachmentIds[]', att.id);
      });

      // ✅ DO NOT append new files in edit mode (attachments cannot be edited)
      // attachments.forEach(file => {
      //   form.append('attachments', {
      //     uri: file.uri,
      //     type: file.type,
      //     name: file.name,
      //   } as any);
      // });

      // Use UpdateFiles for updating existing expense
      const response = await UpdateFiles(
        `expense/${expenseId}/hospital/${user.hospitalID}`,
        form,
        token
      ) as any;

      console.log('Update Expense Response:', response);
      
if (response?.status === 'success' || response?.message === 'success') {
  dispatch(showSuccess('Expense updated successfully'));

  onExpenseCreated?.(); // ✅ SAME FOR EDIT
} else {
        dispatch(showError(response?.message || 'Failed to update expense'));
      }

    } catch (err: any) {
      console.error('Update Expense Error:', err);
      dispatch(showError(err.message || 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = useCallback(() => {
    setFormData({
      categoryID: '',
      entityType: '',
      entityID: '',
      expenseDate: new Date(),
      billingDate: null,
      amount: '',
      paymentMethod: 'cash',
      transactionID: '',
      payeeName: '',
      payeeContact: '',
      description: '',
      remarks: '',
      departmentSubType: '',
    });
    setSelectedCategory(null);
    setSelectedEntity(null);
    setAttachments([]);
    setExistingAttachments([]);
    setEntityAnalytics([]);
    selectedFileNames.current.clear();
    setErrors({});
    setTouched({});
  }, []);

  const getFileIcon = useCallback((fileType: string) => {
    if (fileType.includes('image')) return <ImageIcon size={20} color={COLORS.text} />;
    if (fileType.includes('pdf')) return <File size={20} color={COLORS.text} />;
    return <File size={20} color={COLORS.text} />;
  }, []);

  const getEntityIcon = useCallback((entityType: string) => {
    const entity = ENTITY_TYPES.find(e => e.id === entityType);
    return entity?.icon || Building;
  }, []);

  const getEntityDisplayName = useCallback(() => {
    if (!selectedEntity) return '';
    
    switch (formData.entityType) {
      case 'doctor':
        return selectedEntity.name || `Doctor ${selectedEntity.id}`;
      case 'ward':
        return selectedEntity.wardName || selectedEntity.name || `Ward ${selectedEntity.id}`;
      case 'department':
        const baseName = selectedEntity.departmentName || selectedEntity.name || `Department ${selectedEntity.id}`;
        if (formData.departmentSubType) {
          const subType = DEPARTMENT_SUB_TYPES.find(st => st.id === formData.departmentSubType);
          return `${baseName} - ${subType?.label || formData.departmentSubType}`;
        }
        return baseName;
      default:
        return selectedEntity.name || selectedEntity.departmentName || selectedEntity.pharmacyName || selectedEntity.labName || `Entity ${selectedEntity.id}`;
    }
  }, [selectedEntity, formData.entityType, formData.departmentSubType]);

  // EntitySelectionModal Component (needs to stay inside due to local state dependencies)
  const EntitySelectionModal = memo(() => {
    const renderEntityList = () => {
      if (formData.entityType === 'ward') {
        return (
          <>
            {wardsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={COLORS.brand} />
                <Text style={styles.modalLoadingText}>Loading wards...</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search wards..."
                  placeholderTextColor={COLORS.placeholder}
                  value={wardSearch}
                  onChangeText={setWardSearch}
                />
                <ScrollView 
                  style={styles.modalScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {wards
                    .filter(ward => 
                      ward.name.toLowerCase().includes(wardSearch.toLowerCase())
                    )
                    .map((ward) => (
                      <TouchableOpacity
                        key={ward.id}
                        style={[
                          styles.modalOption,
                          formData.entityID === ward.id.toString() && styles.modalOptionSelected,
                          isEditMode && styles.optionDisabled
                        ]}
                        onPress={() => {
                          if (isEditMode) return;
                          const entityId = ward.id.toString();
                          setFormData(prev => ({ 
                            ...prev, 
                            entityID: entityId 
                          }));
                          setSelectedEntity({
                            id: ward.id,
                            wardName: ward.name,
                            name: ward.name
                          });
                          setShowEntitySelectionModal(false);
                          // Clear entityID error
                          setErrors(prev => ({ ...prev, entityID: '' }));
                          if (!isEditMode) {
                            fetchEntityAnalytics(entityId, 'ward');
                          }
                        }}
                        disabled={isEditMode}
                      >
                        <View style={styles.wardOption}>
                          <Text style={[
                            styles.modalOptionText,
                            formData.entityID === ward.id.toString() && styles.modalOptionTextSelected,
                            isEditMode && styles.optionTextDisabled
                          ]}>
                            {ward.name}
                            {isEditMode && formData.entityID === ward.id.toString() && ' (Cannot be changed)'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  }
                </ScrollView>
              </>
            )}
          </>
        );
      }

      // For department when user doesn't have departmentID
      if (formData.entityType === 'department') {
        return (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="Search departments..."
              placeholderTextColor={COLORS.placeholder}
              value={entitySearch}
              onChangeText={setEntitySearch}
            />
            <ScrollView 
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {loadingEntities ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={COLORS.brand} />
                  <Text style={styles.modalLoadingText}>Loading departments...</Text>
                </View>
              ) : entities.length === 0 ? (
                <View style={styles.emptyEntityState}>
                  <Building size={48} color={COLORS.sub} />
                  <Text style={styles.emptyEntityText}>No departments found</Text>
                  <Text style={styles.emptyEntitySubText}>
                    Please contact admin to add departments
                  </Text>
                </View>
              ) : (
                entities
                  .filter(entity => 
                    entity.name?.toLowerCase().includes(entitySearch.toLowerCase())
                  )
                  .map((entity) => {
                    const EntityIcon = getEntityIcon(formData.entityType);
                    return (
                      <TouchableOpacity
                        key={entity.id}
                        style={[
                          styles.modalOption,
                          formData.entityID === entity.id.toString() && styles.modalOptionSelected,
                          isEditMode && styles.optionDisabled
                        ]}
                        onPress={() => {
                          if (isEditMode) return;
                          setFormData(prev => ({ 
                            ...prev, 
                            entityID: entity.id.toString() 
                          }));
                          setSelectedEntity(entity);
                          setShowEntitySelectionModal(false);
                          // Show department sub-type modal after selecting department
                          setShowDepartmentSubTypeModal(true);
                          // Clear entityID error
                          setErrors(prev => ({ ...prev, entityID: '' }));
                        }}
                        disabled={isEditMode}
                      >
                        <View style={styles.wardOption}>
                          <EntityIcon size={20} color={formData.entityID === entity.id.toString() ? COLORS.brand : COLORS.text} />
                          <View style={styles.entityDetails}>
                            <Text style={[
                              styles.modalOptionText,
                              formData.entityID === entity.id.toString() && styles.modalOptionTextSelected,
                              isEditMode && styles.optionTextDisabled
                            ]}>
                              {entity.name || `Entity ${entity.id}`}
                              {isEditMode && formData.entityID === entity.id.toString() && ' (Cannot be changed)'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
              )}
            </ScrollView>
          </>
        );
      }

      return null;
    };

    return (
      <Modal
        visible={showEntitySelectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEntitySelectionModal(false)}
      >
        <View 
          style={styles.modalOverlay}
          pointerEvents={showEntitySelectionModal ? 'auto' : 'none'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {ENTITY_TYPES.find(e => e.id === formData.entityType)?.label || 'Entity'}
              </Text>
              <TouchableOpacity onPress={() => setShowEntitySelectionModal(false)}>
                <X size={24} color={COLORS.sub} />
              </TouchableOpacity>
            </View>
            {renderEntityList()}
          </View>
        </View>
      </Modal>
    );
  });

  const renderAnalyticsSection = () => {
    if (!entityAnalytics.length || !formData.entityID || isEditMode) return null;

    return (
      <View style={styles.analyticsSection}>
        <View style={styles.analyticsHeader}>
          <TrendingUp size={20} color={COLORS.brand} />
          <Text style={styles.analyticsTitle}>Previous Expenses for this Entity</Text>
        </View>
        
        {entityAnalytics.map((summary, index) => (
          <View key={index} style={styles.analyticsCard}>
            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Category:</Text>
              <Text style={styles.analyticsValue}>{summary.categoryName}</Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Total Transactions:</Text>
              <Text style={styles.analyticsValue}>{summary.totalTransactions}</Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Total Amount:</Text>
              <Text style={[styles.analyticsValue, styles.amountText]}>
                ₹{summary.totalAmount}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.autoFillButton}
              onPress={() => {
                const matchedCategory = categories.find(
                  cat => cat.categoryName === summary.categoryName
                );
                if (matchedCategory) {
                  setFormData(prev => ({
                    ...prev,
                    categoryID: matchedCategory.id.toString()
                  }));
                  setSelectedCategory(matchedCategory);
                  // Clear category error
                  setErrors(prev => ({ ...prev, categoryID: '' }));
                  dispatch(showSuccess(`Category "${summary.categoryName}" auto-filled`));
                }
              }}
            >
              <Text style={styles.autoFillButtonText}>Auto-fill this Category</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        <Text style={styles.analyticsNote}>
          Based on expenses from last 30 days
        </Text>
      </View>
    );
  };

  const renderFileList = () => {
    const allFiles = [
      ...existingAttachments.map(att => ({
        id: att.id,
        name: att.fileName || att.name || 'Attachment',
        type: att.mimeType || 'application/octet-stream',
        size: att.fileSize,
        isExisting: true,
        url: att.fileURL || att.url,
      })),
      ...attachments.map(att => ({
        ...att,
        isExisting: false,
      }))
    ];

    if (allFiles.length === 0) return null;

    return (
      <View style={styles.fileList}>
        {allFiles.map((file) => (
          <View key={file.id} style={styles.fileCard}>
            <View style={styles.fileInfo}>
              <View style={styles.fileIcon}>
                {getFileIcon(file.type)}
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                  {isEditMode && file.isExisting && ' (Existing - Cannot be removed)'}
                  {isEditMode && !file.isExisting && ' (New - Will be added)'}
                </Text>
                <Text style={styles.fileSize}>
                  {file.size ? `(${Math.round(file.size / 1024)} KB)` : ''}
                  {!isEditMode && file.isExisting && <Text style={styles.existingTag}> • Existing</Text>}
                </Text>
              </View>
            </View>
            {(!isEditMode || !file.isExisting) && (
              <TouchableOpacity 
                onPress={() => {
                  if (file.isExisting) {
                    removeExistingAttachment(file.id);
                  } else {
                    removeAttachment(file.id);
                  }
                }}
                style={styles.deleteButton}
              >
                <Trash2 size={16} color={COLORS.error}/>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderDepartmentSubTypeField = () => {
    if (formData.entityType !== 'department') return null;
    
    const selectedSubType = DEPARTMENT_SUB_TYPES.find(st => st.id === formData.departmentSubType);
    
    return (
      <SelectField
        label="Department Type *"
        value={selectedSubType?.label || ''}
        placeholder="Select department type (IPD/OPD/Emergency/Triage)"
        onPress={() => setShowDepartmentSubTypeModal(true)}
        icon={Building}
        editable={!isEditMode}
        error={formData.entityType === 'department' && !formData.departmentSubType ? "Please select department type" : ''}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Card */}
          <View style={styles.card}>

            {/* Category Selection */}
            <SelectField
              label="Expense Category *"
              value={selectedCategory?.categoryName || ''}
              placeholder="Select category"
              onPress={() => setShowCategoryModal(true)}
              icon={FileText}
              error={errors.categoryID}
            />

            {/* Step 1: What is this expense for? */}
            <SelectField
              label="What is this expense for? *"
              value={ENTITY_TYPES.find(e => e.id === formData.entityType)?.label || ''}
              placeholder="Select expense type"
              onPress={() => setShowEntityModal(true)}
              icon={getEntityIcon(formData.entityType)}
              editable={!isEditMode}
              error={errors.entityType}
            />

            {/* Step 2: Show auto-selected entity info OR selection field */}
            {(formData.entityType && isAutoSelectedEntity(formData.entityType)) ? (
              <View style={styles.autoSelectedEntity}>
                <Text style={styles.label}>
                  {ENTITY_TYPES.find(e => e.id === formData.entityType)?.label} *
                </Text>
                <View style={styles.autoSelectedInfo}>
                  <User size={20} color={COLORS.brand} style={styles.autoSelectedIcon} />
                  <Text style={styles.autoSelectedText}>
                    {getAutoSelectedEntityName(formData.entityType, formData.departmentSubType)}
                  </Text>
                </View>
                <Text style={styles.autoSelectedNote}>
                  Auto-selected based on your profile
                  {isEditMode && ' (Cannot be changed)'}
                </Text>
              </View>
            ) : formData.entityType && ['ward'].includes(formData.entityType) ? (
              <SelectField
                label={`Select ${ENTITY_TYPES.find(e => e.id === formData.entityType)?.label || 'Entity'} *`}
                value={getEntityDisplayName()}
                placeholder={`Select ${ENTITY_TYPES.find(e => e.id === formData.entityType)?.label?.toLowerCase() || 'entity'}`}
                onPress={() => setShowEntitySelectionModal(true)}
                showId={true}
                idValue={formData.entityID || ''}
                icon={getEntityIcon(formData.entityType)}
                editable={!isEditMode}
                error={errors.entityID}
              />
            ) : null}

            {/* For department type with auto-select, show sub-type field */}
            {formData.entityType === 'department' && user?.departmentID && (
              renderDepartmentSubTypeField()
            )}

            {/* ANALYTICS SECTION - Shows previous expenses (only in create mode) */}
            {renderAnalyticsSection()}

            {/* Dates */}
            <View style={styles.row}>
              <View style={styles.col}>
                <View style={styles.block}>
                  <Text style={styles.label}>Expense Date *</Text>
                  <TouchableOpacity 
                    style={[
                      styles.dateButton,
                      errors.expenseDate && styles.dateButtonError
                    ]}
                    onPress={() => setShowExpenseDatePicker(true)}
                  >
                    <Calendar size={16} color={COLORS.sub} style={styles.dateIcon} />
                    <Text style={styles.dateText}>
                      {formatDateSimple(formData.expenseDate, 'DD/MM/YYYY')}
                    </Text>
                  </TouchableOpacity>
                  {showExpenseDatePicker && (
                    <DateTimePicker
                      value={formData.expenseDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => handleDateChange(event, date, 'expenseDate')}
                    />
                  )}
                  {errors.expenseDate && <Text style={styles.errorText}>{errors.expenseDate}</Text>}
                </View>
              </View>
              
              <View style={styles.col}>
                <View style={styles.block}>
                  <Text style={styles.label}>Billing Date (Optional)</Text>
                  <TouchableOpacity 
                    style={[
                      styles.dateButton,
                      errors.billingDate && styles.dateButtonError
                    ]}
                    onPress={() => setShowBillingDatePicker(true)}
                  >
                    <Calendar size={16} color={COLORS.sub} style={styles.dateIcon} />
                    <Text style={styles.dateText}>
                      {formData.billingDate ? formatDateSimple(formData.billingDate, 'DD/MM/YYYY') : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  {showBillingDatePicker && (
                    <DateTimePicker
                      value={formData.billingDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => handleDateChange(event, date, 'billingDate')}
                    />
                  )}
                  {errors.billingDate && <Text style={styles.errorText}>{errors.billingDate}</Text>}
                </View>
              </View>
            </View>

            {/* Amount & Payment Method */}
            <View style={styles.row}>
              <View style={styles.col}>
                <InputField
                  label="Amount (₹) *"
                  value={formData.amount}
                  placeholder="Enter amount"
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  error={errors.amount}
                  onBlur={() => handleFieldBlur('amount')}
                  maxLength={15}
                />
              </View>
              <View style={styles.col}>
                <SelectField
                  label="Payment Method *"
                  value={PAYMENT_METHODS.find(p => p.id === formData.paymentMethod)?.label || ''}
                  placeholder="Select method"
                  onPress={() => setShowPaymentModal(true)}
                  icon={CreditCard}
                />
              </View>
            </View>

            {/* Transaction ID */}
            <InputField
              label="Transaction ID (Optional)"
              value={formData.transactionID}
              placeholder="Enter transaction ID"
              onChangeText={handleTransactionIDChange}
              error={errors.transactionID}
              onBlur={() => handleFieldBlur('transactionID')}
              maxLength={50}
            />

            {/* Payee Details */}
            <InputField
              label="Payee Name *"
              value={formData.payeeName}
              placeholder="Enter payee name"
              onChangeText={handlePayeeNameChange}
              error={errors.payeeName}
              onBlur={() => handleFieldBlur('payeeName')}
              maxLength={100}
            />

            <InputField
              label="Payee Contact (Optional)"
              value={formData.payeeContact}
              placeholder="Enter contact number"
              onChangeText={handlePayeeContactChange}
              keyboardType="phone-pad"
              error={errors.payeeContact}
              onBlur={() => handleFieldBlur('payeeContact')}
              maxLength={10}
            />

            {/* Description & Remarks */}
            <InputField
              label="Description *"
              value={formData.description}
              placeholder="Enter expense description"
              onChangeText={(text: string) => handleInputChange('description', text)}
              multiline
              error={errors.description}
              onBlur={() => handleFieldBlur('description')}
              maxLength={500}
            />

            <InputField
              label="Remarks (Optional)"
              value={formData.remarks}
              placeholder="Any additional remarks"
              onChangeText={(text: string) => handleInputChange('remarks', text)}
              multiline
              error={errors.remarks}
              onBlur={() => handleFieldBlur('remarks')}
              maxLength={500}
            />

            {/* Attachments Section */}
            <View style={styles.block}>
              <View style={styles.attachmentHeader}>
                <Text style={styles.label}>
                  Attachments {isEditMode ? '(Cannot be edited)' : '(Optional)'}
                </Text>
                {(!isEditMode && (attachments.length > 0 || existingAttachments.length > 0)) && (
                  <TouchableOpacity onPress={clearAllAttachments}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Single Upload Button - Disabled in edit mode */}
              {!isEditMode ? (
                <TouchableOpacity style={styles.uploadButton} onPress={showUploadOptions}>
                  <Upload size={20} color="#fff" />
                  <Text style={styles.uploadButtonText}>Select Files</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.uploadButton, styles.uploadButtonDisabled]}>
                  <Upload size={20} color={COLORS.sub} />
                  <Text style={[styles.uploadButtonText, styles.uploadButtonTextDisabled]}>
                    Attachments cannot be edited
                  </Text>
                </View>
              )}

              {/* Selected Files List */}
              {(attachments.length === 0 && existingAttachments.length === 0) ? (
                <View style={styles.emptyState}>
                  <Upload size={48} color={COLORS.sub} />
                  <Text style={styles.emptyStateText}>
                    {isEditMode ? 'Existing attachments (if any) are shown above' : 'No files selected'}
                  </Text>
                  <Text style={styles.emptyStateSubText}>
                    {isEditMode ? 'Attachments cannot be modified in edit mode' : 'Tap "Select Files" to choose files to upload'}
                  </Text>
                </View>
              ) : (
                <>
                  {renderFileList()}
                  <Text style={styles.selectedCountText}>
                    {attachments.length + existingAttachments.length} file{(attachments.length + existingAttachments.length) !== 1 ? 's' : ''} selected
                    {existingAttachments.length > 0 && ` (${existingAttachments.length} existing)`}
                    {isEditMode && ' - Existing attachments cannot be removed'}
                  </Text>
                </>
              )}
              
              <Text style={styles.attachmentHint}>
                Supports PDF, JPG, PNG (Max 5MB each)
                {isEditMode && ' - Attachments are read-only in edit mode'}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={styles.submitButtonContent}>
                  {isEditMode ? <Save size={20} color="#ffffff" /> : null}
                  <Text style={styles.submitText}>
                    {isEditMode ? 'Update Expense' : 'Create Expense'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.formNote}>
              * Required fields. Expense will be submitted for admin approval.
              {isEditMode && '\nNote: Entity type, entity, and attachments cannot be changed after creation.'}
            </Text>
          </View>
        </ScrollView>

        {/* Modals */}
        <CategoryModal 
          visible={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          categories={categories}
          formData={formData}
          setFormData={setFormData}
          setSelectedCategory={setSelectedCategory}
        />
        <EntityModal 
          visible={showEntityModal}
          onClose={() => setShowEntityModal(false)}
          formData={formData}
          handleEntityTypeSelect={handleEntityTypeSelect}
          isEditMode={isEditMode}
        />
        <EntitySelectionModal />
        <PaymentMethodModal 
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          formData={formData}
          setFormData={setFormData}
        />
        <DepartmentSubTypeModal
          visible={showDepartmentSubTypeModal}
          onClose={() => setShowDepartmentSubTypeModal(false)}
          formData={formData}
          setFormData={setFormData}
          isEditMode={isEditMode}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: SPACING.xs,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  col: {
    flex: 1,
    paddingHorizontal: SPACING.xs,
  },
  block: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '600',
    color: COLORS.sub,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.text,
    backgroundColor: '#f9fafb',
    height: responsiveHeight(6),
  },
  inputDisabled: {
    backgroundColor: '#e5e7eb',
    color: COLORS.sub,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  select: {
    height: responsiveHeight(6),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  selectIcon: {
    marginRight: SPACING.sm,
  },
  selectText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  errorText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.error,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  dateButton: {
    height: responsiveHeight(6),
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.md,
    borderColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButtonError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  idText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    marginLeft: SPACING.xs,
  },
  autoSelectedEntity: {
    marginBottom: SPACING.md,
  },
  autoSelectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.brandLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  autoSelectedIcon: {
    marginRight: SPACING.sm,
  },
  autoSelectedText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    fontWeight: '600',
  },
  autoSelectedNote: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  entityIdDisplay: {
    backgroundColor: COLORS.brandLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  entityIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  entityIdLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.brand,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  entityIdValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
  analyticsLoader: {
    marginLeft: SPACING.sm,
  },
  entityIdNote: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    fontStyle: 'italic',
  },
  entityDetails: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  entitySpecialization: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    marginTop: 2,
    fontStyle: 'italic',
  },
  emptyEntityState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyEntityText: {
    color: COLORS.text,
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyEntitySubText: {
    color: COLORS.sub,
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  analyticsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  analyticsTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  analyticsCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  analyticsLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    fontWeight: '500',
  },
  analyticsValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.text,
    fontWeight: '600',
  },
  amountText: {
    color: COLORS.success,
    fontWeight: '700',
  },
  autoFillButton: {
    backgroundColor: COLORS.brand,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  autoFillButtonText: {
    color: '#ffffff',
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: '600',
  },
  analyticsNote: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  clearAllText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.error,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: COLORS.brand,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  uploadButtonDisabled: {
    backgroundColor: '#e5e7eb',
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  uploadButtonText: {
    color: '#fff',
    marginLeft: SPACING.sm,
    fontWeight: '600',
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
  },
  uploadButtonTextDisabled: {
    color: COLORS.sub,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#f8fafc',
    marginBottom: SPACING.md,
  },
  emptyStateText: {
    color: COLORS.text,
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyStateSubText: {
    color: COLORS.sub,
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  fileList: {
    marginBottom: SPACING.md,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#f1f5f9',
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    marginRight: SPACING.md,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: COLORS.text,
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '500',
  },
  fileSize: {
    color: COLORS.sub,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    marginTop: 2,
  },
  existingTag: {
    color: COLORS.brand,
    fontWeight: '600',
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  dateIcon: {
    marginRight: SPACING.sm,
  },
  dateText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  selectedCountText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  attachmentHint: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  submitButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.brand,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: SPACING.xs,
    elevation: 4,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.sub,
    opacity: 0.6,
  },
  submitText: {
    color: '#ffffff',
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: '700',
  },
  formNote: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
  },
  modalScroll: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: '700',
    color: COLORS.text,
  },
  modalOption: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.brandLight,
  },
  modalOptionText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.text,
    fontWeight: '600',
  },
  modalOptionTextSelected: {
    color: COLORS.brand,
    fontWeight: '700',
  },
  categoryTypeText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
    marginTop: SPACING.xs,
  },
  entityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  entityOptionSelected: {
    backgroundColor: COLORS.brandLight,
  },
  entityOptionIcon: {
    marginRight: SPACING.md,
  },
  entityOptionContent: {
    flex: 1,
  },
  entityOptionTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  entityOptionTitleSelected: {
    color: COLORS.brand,
    fontWeight: '700',
  },
  entityOptionDescription: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.sub,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionTextDisabled: {
    color: COLORS.sub,
  },
  wardOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    backgroundColor: '#f8fafc',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  modalLoading: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.sub,
    marginTop: SPACING.sm,
  },
});

export default CreateExpenseScreen;