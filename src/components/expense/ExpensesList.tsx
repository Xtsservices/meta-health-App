// components/expense/ExpensesListScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  Image,
  Linking,
  ActionSheetIOS,
} from 'react-native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  Filter, 
  Search, 
  Calendar, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  X,
  MoreVertical,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Building,
  User,
  CreditCard,
  ArrowUpDown,
  Tag,
  ExternalLink,
  File,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootState } from '../../store/store';
import { AuthFetch, AuthPatch, AuthDelete,  } from '../../auth/auth';
import { 
  moderateScale, 
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  ELEVATION,
  getResponsiveFontSize,
} from '../../utils/responsive';
import { COLORS } from '../../utils/colour';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 20;



const STATUS_OPTIONS = [
  { id: '', label: 'All Status' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'paid', label: 'Paid' },
  { id: 'cancelled', label: 'Cancelled' },
];

interface Filters {
  filterType: 'id' | 'number' | 'entity' | 'category' | 'dateRange' | 'status' | 'all';
  filterValue: string;
  entityType: string;
  entityId: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  status: string;
  expenseId: string;
  expenseNumber: string;
}

/* ---------------- ACTION SHEET FOR EDIT/DELETE ---------------- */
const showActionSheet = (
  expense: any,
  onEdit: () => void,
  onDelete: () => void,
  userPermissions: any
) => {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Edit', 'Delete'],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        if (buttonIndex === 1) {
          onEdit();
        } else if (buttonIndex === 2) {
          onDelete();
        }
      }
    );
  } else {
    Alert.alert(
      'Expense Options',
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: onEdit },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  }
};

/* ---------------- DELETE CONFIRMATION DIALOG ---------------- */
const showDeleteConfirmation = (
  expenseId: number,
  expenseNumber: string,
  onConfirm: () => void
) => {
  Alert.alert(
    'Delete Expense',
    `Are you sure you want to delete expense ${expenseNumber}? This action cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: onConfirm
      },
    ]
  );
};

/* ---------------- STATUS PILL COMPONENT ---------------- */
const StatusPill = ({ status }: { status?: string }) => {
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case 'approved': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'rejected': return COLORS.danger;
      case 'paid': return COLORS.info;
      case 'cancelled': return COLORS.sub;
      default: return COLORS.sub;
    }
  };

  const getStatusBgColor = () => {
    switch (status?.toLowerCase()) {
      case 'approved': return COLORS.successLight;
      case 'pending': return COLORS.warningLight;
      case 'rejected': return COLORS.errorLight;
      case 'paid': return COLORS.infoLight;
      case 'cancelled': return COLORS.border;
      default: return COLORS.border;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return <CheckCircle size={10} color="#fff" />;
      case 'pending': return <Clock size={10} color="#fff" />;
      case 'rejected': return <XCircle size={10} color="#fff" />;
      case 'paid': return <CheckCircle size={10} color="#fff" />;
      case 'cancelled': return <AlertCircle size={10} color="#fff" />;
      default: return <Clock size={10} color="#fff" />;
    }
  };

  return (
    <View style={[
      styles.statusPill,
      { backgroundColor: getStatusBgColor() }
    ]}>
      {getStatusIcon(status)}
      <Text style={[
        styles.statusText,
        { color: getStatusColor() }
      ]}>
        {status?.toUpperCase() || "UNKNOWN"}
      </Text>
    </View>
  );
};

/* ---------------- FILTER OPTION COMPONENT ---------------- */
const FilterOption = ({ 
  label, 
  value, 
  isActive, 
  onPress,
  icon: Icon,
  iconColor
}: { 
  label: string; 
  value: string; 
  isActive: boolean; 
  onPress: (value: string) => void;
  icon?: React.ComponentType<any>;
  iconColor?: string;
}) => (
  <TouchableOpacity
    style={[
      styles.filterOption,
      { backgroundColor: COLORS.card, borderColor: COLORS.border },
      isActive && styles.filterOptionActive,
    ]}
    onPress={() => onPress(value)}
    activeOpacity={0.7}
  >
    {Icon && <Icon size={14} color={isActive ? '#fff' : iconColor || COLORS.sub} style={styles.filterOptionIcon} />}
    <Text style={[
      styles.filterOptionText,
      { color: isActive ? '#fff' : COLORS.text },
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* ---------------- ATTACHMENT COMPONENT ---------------- */
const AttachmentItem = ({ attachment }: { attachment: any }) => {
  const [imageError, setImageError] = useState(false);
  
  const isImageFile = () => {
    return attachment?.mimeType?.startsWith("image/");
  };

  const getFileName = (fileName: string) => {
    if (!fileName) return 'Unnamed file';
    if (fileName.length > 20 && !fileName.includes('.')) {
      return `${fileName.substring(0, 8)}...`;
    }
    return fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName;
  };

  const handleOpenAttachment = async () => {
    const url = attachment?.fileURL || attachment?.url;
    if (!url) {
      Alert.alert("Error", "File URL not available");
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Error", "Cannot open this file type");
    }
  };

  const isImage = isImageFile(attachment?.fileName);
  const fileName = getFileName(attachment?.fileName);

  return (
    <TouchableOpacity 
      style={styles.attachmentItem}
      onPress={handleOpenAttachment}
      activeOpacity={0.7}
    >
      {isImage && !imageError ? (
        <View style={styles.imageAttachment}>
          <Image
            source={{ uri: attachment.url }}
            style={styles.attachmentImage}
            onError={() => setImageError(true)}
          />
          <View style={styles.imageOverlay}>
            <ImageIcon size={16} color="#fff" />
          </View>
        </View>
      ) : (
        <View style={styles.fileAttachment}>
          <File size={20} color={COLORS.primary} />
        </View>
      )}
      <Text style={styles.attachmentName} numberOfLines={1}>
        {fileName}
      </Text>
    </TouchableOpacity>
  );
};

/* ---------------- FILTER MODAL COMPONENT ---------------- */
const FilterModal = ({ 
  visible, 
  onClose, 
  filters,
  onApplyFilters,
  onResetFilters,
  categories
}: { 
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  onApplyFilters: (filters: Filters) => void;
  onResetFilters: () => void;
  categories: any[];
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      filterType: 'all',
      filterValue: '',
      entityType: '',
      entityId: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      status: '',
      expenseId: '',
      expenseNumber: '',
    };
    setLocalFilters(resetFilters);
    onResetFilters();
  };

  const handleFilterTypeChange = (type: string) => {
    setLocalFilters(prev => ({ 
      ...prev, 
      filterType: type as any,
      filterValue: '',
      entityType: '',
      entityId: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      status: '',
      expenseId: '',
      expenseNumber: '',
    }));
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setLocalFilters(prev => ({ ...prev, startDate: formatDateForInput(selectedDate) }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setLocalFilters(prev => ({ ...prev, endDate: formatDateForInput(selectedDate) }));
    }
  };

  const renderFilterInput = () => {
    switch (localFilters.filterType) {
      case 'id':
        return (
          <View style={styles.filterInputGroup}>
            <Text style={[styles.filterInputLabel, { color: COLORS.text }]}>
              Expense ID
            </Text>
            <TextInput
              style={[styles.filterInput, { backgroundColor: COLORS.bg, color: COLORS.text, borderColor: COLORS.border }]}
              placeholder="Enter expense ID"
              placeholderTextColor={COLORS.placeholder}
              value={localFilters.expenseId}
              onChangeText={(text) => setLocalFilters(prev => ({ ...prev, expenseId: text }))}
              keyboardType="numeric"
            />
          </View>
        );

      case 'number':
        return (
          <View style={styles.filterInputGroup}>
            <Text style={[styles.filterInputLabel, { color: COLORS.text }]}>
              Expense Number
            </Text>
            <TextInput
              style={[styles.filterInput, { backgroundColor: COLORS.bg, color: COLORS.text, borderColor: COLORS.border }]}
              placeholder="Enter expense number (e.g., EXP178-202601-003)"
              placeholderTextColor={COLORS.placeholder}
              value={localFilters.expenseNumber}
              onChangeText={(text) => setLocalFilters(prev => ({ ...prev, expenseNumber: text }))}
            />
          </View>
        );

      case 'entity':
        return (
          <>
            <View style={styles.filterInputGroup}>
              <Text style={[styles.filterInputLabel, { color: COLORS.text }]}>
                Entity Type
              </Text>
              <TextInput
                style={[styles.filterInput, { backgroundColor: COLORS.bg, color: COLORS.text, borderColor: COLORS.border }]}
                placeholder="Enter entity type (e.g., doctor, ward)"
                placeholderTextColor={COLORS.placeholder}
                value={localFilters.entityType}
                onChangeText={(text) => setLocalFilters(prev => ({ ...prev, entityType: text }))}
              />
            </View>
            <View style={styles.filterInputGroup}>
              <Text style={[styles.filterInputLabel, { color: COLORS.text }]}>
                Entity ID
              </Text>
              <TextInput
                style={[styles.filterInput, { backgroundColor: COLORS.bg, color: COLORS.text, borderColor: COLORS.border }]}
                placeholder="Enter entity ID"
                placeholderTextColor={COLORS.placeholder}
                value={localFilters.entityId}
                onChangeText={(text) => setLocalFilters(prev => ({ ...prev, entityId: text }))}
                keyboardType="numeric"
              />
            </View>
          </>
        );

      case 'category':
        return (
          <View style={styles.filterInputGroup}>
            <Text style={[styles.filterInputLabel, { color: COLORS.text }]}>
              Select Category
            </Text>
            <View style={styles.categoryOptions}>
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  { backgroundColor: COLORS.bg, borderColor: COLORS.border },
                  localFilters.categoryId === '' && styles.categoryOptionActive
                ]}
                onPress={() => setLocalFilters(prev => ({ ...prev, categoryId: '' }))}
              >
                <Text style={[
                  styles.categoryOptionText,
                  { color: localFilters.categoryId === '' ? '#fff' : COLORS.text }
                ]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    { backgroundColor: COLORS.bg, borderColor: COLORS.border },
                    localFilters.categoryId === category.id.toString() && styles.categoryOptionActive
                  ]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, categoryId: category.id.toString() }))}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    { color: localFilters.categoryId === category.id.toString() ? '#fff' : COLORS.text }
                  ]}>
                    {category.categoryName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'dateRange':
        return (
          <>
            <View style={styles.filterInputGroup}>
              <Text style={[styles.filterInputLabel, { color: COLORS.text }]}>
                Start Date
              </Text>
              <TouchableOpacity
                style={[styles.dateInputWrapper, { borderColor: COLORS.border }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Calendar size={16} color={COLORS.sub} style={styles.dateIcon} />
                <Text style={[styles.dateInputText, { color: localFilters.startDate ? COLORS.text : COLORS.placeholder }]}>
                  {localFilters.startDate || 'Select start date'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterInputGroup}>
              <Text style={[styles.filterInputLabel, { color: COLORS.text }]}>
                End Date
              </Text>
              <TouchableOpacity
                style={[styles.dateInputWrapper, { borderColor: COLORS.border }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Calendar size={16} color={COLORS.sub} style={styles.dateIcon} />
                <Text style={[styles.dateInputText, { color: localFilters.endDate ? COLORS.text : COLORS.placeholder }]}>
                  {localFilters.endDate || 'Select end date'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 'status':
        return (
          <View style={styles.filterInputGroup}>
            <Text style={[styles.filterInputLabel, { color: COLORS.text }]}>
              Select Status
            </Text>
            <View style={styles.statusOptions}>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status.id}
                  style={[
                    styles.statusOption,
                    { backgroundColor: COLORS.bg, borderColor: COLORS.border },
                    localFilters.status === status.id && styles.statusOptionActive
                  ]}
                  onPress={() => setLocalFilters(prev => ({ ...prev, status: status.id }))}
                >
                  <Text style={[
                    styles.statusOptionText,
                    { color: localFilters.status === status.id ? '#fff' : COLORS.text }
                  ]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.filterModalOverlay}>
        <View style={[styles.filterModalContent, { backgroundColor: COLORS.card }]}>
          <View style={styles.filterModalHeader}>
            <Text style={[styles.filterModalTitle, { color: COLORS.text }]}>
              🔍 Filter Expenses
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.filterScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {/* Filter Type Selection */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                Filter By
              </Text>
              <View style={styles.filterTypeOptions}>
                <FilterOption
                  label="All Expenses"
                  value="all"
                  isActive={localFilters.filterType === 'all'}
                  onPress={handleFilterTypeChange}
                  icon={FileText}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="By ID"
                  value="id"
                  isActive={localFilters.filterType === 'id'}
                  onPress={handleFilterTypeChange}
                  icon={FileText}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="By Number"
                  value="number"
                  isActive={localFilters.filterType === 'number'}
                  onPress={handleFilterTypeChange}
                  icon={FileText}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="By Entity"
                  value="entity"
                  isActive={localFilters.filterType === 'entity'}
                  onPress={handleFilterTypeChange}
                  icon={User}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="By Category"
                  value="category"
                  isActive={localFilters.filterType === 'category'}
                  onPress={handleFilterTypeChange}
                  icon={Tag}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="By Date Range"
                  value="dateRange"
                  isActive={localFilters.filterType === 'dateRange'}
                  onPress={handleFilterTypeChange}
                  icon={Calendar}
                  iconColor={COLORS.brand}
                />
                <FilterOption
                  label="By Status"
                  value="status"
                  isActive={localFilters.filterType === 'status'}
                  onPress={handleFilterTypeChange}
                  icon={CheckCircle}
                  iconColor={COLORS.brand}
                />
              </View>
            </View>

            {/* Filter Input Section */}
            {localFilters.filterType !== 'all' && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: COLORS.text }]}>
                  {localFilters.filterType === 'id' && 'Expense ID'}
                  {localFilters.filterType === 'number' && 'Expense Number'}
                  {localFilters.filterType === 'entity' && 'Entity Details'}
                  {localFilters.filterType === 'category' && 'Category'}
                  {localFilters.filterType === 'dateRange' && 'Date Range'}
                  {localFilters.filterType === 'status' && 'Status'}
                </Text>
                {renderFilterInput()}
              </View>
            )}
          </ScrollView>

          <View style={styles.filterModalButtons}>
            <TouchableOpacity
              style={[styles.filterModalButton, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={[styles.resetButtonText, { color: COLORS.danger }]}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterModalButton, { backgroundColor: COLORS.brand }]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={localFilters.startDate ? new Date(localFilters.startDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={localFilters.endDate ? new Date(localFilters.endDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
        />
      )}
    </Modal>
  );
};

/* ======================= EXPENSES LIST SCREEN ======================= */
const ExpensesListScreen = ({ 
  categories, 
  userPermissions 
}: { 
  categories: any[];
  userPermissions: any;
}) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [processingDelete, setProcessingDelete] = useState<number | null>(null);
  
  const [filters, setFilters] = useState<Filters>({
    filterType: 'all',
    filterValue: '',
    entityType: '',
    entityId: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    status: '',
    expenseId: '',
    expenseNumber: '',
  });

  const user = useSelector((state: RootState) => state.currentUser);
  const flatRef = useRef<FlatList<any>>(null);

  const formatCurrency = (amount?: number | string) => {
    if (!amount) return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatDateSimple = (date: Date | string | null, formatStr: string = 'DD/MM/YYYY'): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

// In ExpensesListScreen.tsx, update the handleEditExpense function:
const handleEditExpense = (expense: any) => {
  // Navigate to CreateExpenseScreen with edit mode and expense data
  navigation.navigate('CreateExpense' as never, { 
    mode: 'edit',
    expenseId: expense.id,
    expenseData: expense 
  });
};

  /* ---------------- DELETE EXPENSE FUNCTION ---------------- */
  const handleDeleteExpense = async (expenseId: number, expenseNumber: string) => {
    try {
      setProcessingDelete(expenseId);
      const token = await AsyncStorage.getItem('token');
      
      if (!token || !user?.hospitalID) {
        Alert.alert('Error', 'Authentication required');
        setProcessingDelete(null);
        return;
      }

      const url = `expense/${expenseId}/hospital/${user.hospitalID}`;
      console.log('Deleting expense URL:', url);
      
      const response = await AuthDelete(url, token) as any;
      console.log('Delete response:', response);

      if (response?.status === 'success' || response?.message === 'success') {
        Alert.alert('Success', 'Expense deleted successfully');
        
        // Remove deleted expense from local state
        setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
        setTotalRecords(prev => prev - 1);
        
        // If this was the only expense, refresh the list
        if (expenses.length === 1) {
          loadExpenses(1);
        }
      } else {
        Alert.alert('Error', response?.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Delete expense error:', error);
      Alert.alert('Error', 'Failed to delete expense. Please try again.');
    } finally {
      setProcessingDelete(null);
    }
  };

  /* ---------------- UPDATE EXPENSE FUNCTION ---------------- */
  const handleUpdateExpense = async (expenseId: number, updateData: any) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token || !user?.hospitalID) {
        Alert.alert('Error', 'Authentication required');
        return false;
      }

      const url = `expense/${expenseId}/hospital/${user.hospitalID}`;
      console.log('Updating expense URL:', url);
      console.log('Update data:', updateData);
      
      const response = await AuthPatch(url, updateData, token) as any;
      console.log('Update response:', response);

      if (response?.status === 'success' || response?.message === 'success') {
        Alert.alert('Success', 'Expense updated successfully');
        
        // Update expense in local state
        setExpenses(prev => prev.map(exp => 
          exp.id === expenseId ? { ...exp, ...updateData } : exp
        ));
        
        return true;
      } else {
        Alert.alert('Error', response?.message || 'Failed to update expense');
        return false;
      }
    } catch (error) {
      console.error('Update expense error:', error);
      Alert.alert('Error', 'Failed to update expense. Please try again.');
      return false;
    }
  };

  const getFilterDescription = () => {
    switch (filters.filterType) {
      case 'id':
        return `Expense ID: ${filters.expenseId}`;
      case 'number':
        return `Expense Number: ${filters.expenseNumber}`;
      case 'entity':
        return `Entity: ${filters.entityType} (ID: ${filters.entityId})`;
      case 'category':
        const category = categories.find(cat => cat.id.toString() === filters.categoryId);
        return `Category: ${category?.categoryName || 'All'}`;
      case 'dateRange':
        return `Date Range: ${filters.startDate} to ${filters.endDate}`;
      case 'status':
        const statusOption = STATUS_OPTIONS.find(s => s.id === filters.status);
        return `Status: ${statusOption?.label || 'All'}`;
      case 'all':
        return 'All Expenses';
      default:
        return '';
    }
  };

  const buildApiUrl = (page: number) => {
    const token = AsyncStorage.getItem('token');
    if (!token || !user?.hospitalID) return '';
    
    let baseUrl = `expense/hospital/${user.hospitalID}`;
    let queryParams = `?page=${page}&limit=${PAGE_SIZE}`;
    
    switch (filters.filterType) {
      case 'id':
        if (filters.expenseId) {
          return `expense/${filters.expenseId}/hospital/${user.hospitalID}`;
        }
        break;
        
      case 'number':
        if (filters.expenseNumber) {
          return `expense/number/${filters.expenseNumber}/hospital/${user.hospitalID}`;
        }
        break;
        
      case 'entity':
        if (filters.entityType && filters.entityId) {
          return `expense/hospital/${user.hospitalID}/entity/${filters.entityType}/${filters.entityId}${queryParams}`;
        }
        break;
        
      case 'category':
        if (filters.categoryId) {
          return `expense/hospital/${user.hospitalID}/category/${filters.categoryId}`;
        }
        break;
        
      case 'dateRange':
        if (filters.startDate && filters.endDate) {
          return `expense/hospital/${user.hospitalID}/daterange?startDate=${filters.startDate}&endDate=${filters.endDate}`;
        }
        break;
        
      case 'status':
        if (filters.status) {
          return `expense/hospital/${user.hospitalID}/status/${filters.status}`;
        }
        break;
    }
    
    // Default: All expenses with pagination
    return `${baseUrl}${queryParams}`;
  };

  const loadExpenses = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.hospitalID) {
        setLoading(false);
        return;
      }

      const url = buildApiUrl(page);
      if (!url) {
        setExpenses([]);
        setTotalRecords(0);
        setHasMore(false);
        setLoading(false);
        return;
      }

      console.log('Loading expenses from URL:', url);
      const response = await AuthFetch(url, token) as any;
      console.log('API Response:', response);
      
      if (response?.data?.expenses) {
        // LIST response (default / filters)
        const expensesData = response.data.expenses;
        const totalCount = response.data.count ?? expensesData.length;

        setExpenses(page === 1 ? expensesData : prev => [...prev, ...expensesData]);
        setTotalRecords(totalCount);
        setHasMore(page < Math.ceil(totalCount / PAGE_SIZE));
        setCurrentPage(page);

      } else if (response?.data?.expense) {
        // SINGLE expense (ID / Number filter)
        setExpenses([response.data.expense]);
        setTotalRecords(1);
        setHasMore(false);
        setCurrentPage(1);

      } else {
        setExpenses([]);
        setTotalRecords(0);
        setHasMore(false);
      }

    } catch (error) {
      console.error('Failed to load expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
      setExpenses([]);
      setTotalRecords(0);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExpenses(1);
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses(1);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses(1);
  };

  const loadMore = () => {
    if (hasMore && !loading && filters.filterType !== 'id' && filters.filterType !== 'number') {
      loadExpenses(currentPage + 1);
    }
  };

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setFilters({
      filterType: 'all',
      filterValue: '',
      entityType: '',
      entityId: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      status: '',
      expenseId: '',
      expenseNumber: '',
    });
    setShowFilterModal(false);
  };
const handleExportExpenses = async () => {
  if (!expenses.length) {
    Alert.alert('No data', 'There are no expenses to export');
    return;
  }

  try {
    const headers = [
      'Expense Number',
      'Expense Date',
      'Category',
      'Entity Type',
      'Entity Name',
      'Payee',
      'Amount',
      'Payment Method',
      'Status',
      'Description',
    ];

    const rows = expenses.map((e) => [
      e.expenseNumber || `EXP-${String(e.id).padStart(4, '0')}`,
      e.expenseDate ? formatDateSimple(e.expenseDate) : '',
      e.categoryName || '',
      e.entityType || '',
      e.entityName || '',
      e.payeeName || '',
      e.amount || 0,
      e.paymentMethod || '',
      e.status || '',
      e.description || '',
    ]);

    const csvContent =
      [headers, ...rows]
        .map(row =>
          row.map(cell =>
            `"${String(cell).replace(/"/g, '""')}"`
          ).join(',')
        )
        .join('\n');

    const fileName = `expenses_${Date.now()}.csv`;
    const filePath =
      Platform.OS === 'android'
        ? `${RNFS.DownloadDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    await RNFS.writeFile(filePath, csvContent, 'utf8');

    await Share.open({
      url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
      type: 'text/csv',
      filename: fileName,
      failOnCancel: false,
    });

  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Export failed', 'Could not export expenses');
  }
};

  const handleApprove = async (expenseId: number) => {
    if (!userPermissions.canApprove) {
      Alert.alert('Permission Denied', 'You do not have permission to approve expenses');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await AuthPatch(
        `expense/${expenseId}/approve`,
        { approvedBy: user?.id },
        token
      ) as any;

      if (response?.status === 'success') {
        Alert.alert('Success', 'Expense approved successfully');
        loadExpenses(1);
      } else {
        Alert.alert('Error', response?.message || 'Failed to approve expense');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to approve expense');
    }
  };

  const handleReject = async (expenseId: number) => {
    if (!userPermissions.canApprove) {
      Alert.alert('Permission Denied', 'You do not have permission to reject expenses');
      return;
    }

    Alert.prompt(
      'Rejection Reason',
      'Please enter the reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason) => {
            if (!reason) {
              Alert.alert('Error', 'Rejection reason is required');
              return;
            }

            try {
              const token = await AsyncStorage.getItem('token');
              const response = await AuthPatch(
                `expense/${expenseId}/reject`,
                { 
                  rejectedBy: user?.id, 
                  rejectionReason: reason 
                },
                token
              ) as any;

              if (response?.status === 'success') {
                Alert.alert('Success', 'Expense rejected successfully');
                loadExpenses(1);
              } else {
                Alert.alert('Error', response?.message || 'Failed to reject expense');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reject expense');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleMarkPaid = async (expenseId: number) => {
    if (!userPermissions.canApprove) {
      Alert.alert('Permission Denied', 'You do not have permission to mark expenses as paid');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await AuthPatch(
        `expense/${expenseId}/mark-paid`,
        { paidBy: user?.id },
        token
      ) as any;

      if (response?.status === 'success') {
        Alert.alert('Success', 'Expense marked as paid successfully');
        loadExpenses(1);
      } else {
        Alert.alert('Error', response?.message || 'Failed to mark expense as paid');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to mark expense as paid');
    }
  };

  const hasActiveFilters = filters.filterType !== 'all';

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && filters.filterType !== 'id' && filters.filterType !== 'number') {
      setCurrentPage(page);
      loadExpenses(page);
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

const renderHeader = () => (
  <View style={styles.header}>
    <View style={styles.headerRow}>
      
      {/* LEFT: Scrollable Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickFiltersContainer}
        contentContainerStyle={styles.quickFiltersContent}
      >
        <TouchableOpacity
          style={[styles.quickFilterButton, { backgroundColor: COLORS.card }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={14} color={COLORS.brand} />
          <Text style={[styles.quickFilterText, { color: COLORS.text }]}>
            Filter By
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            {
              backgroundColor: hasActiveFilters ? COLORS.brandLight : COLORS.card,
            },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text
            style={[
              styles.quickFilterText,
              {
                color: hasActiveFilters ? COLORS.brand : COLORS.text,
              },
            ]}
            numberOfLines={1}
          >
            {getFilterDescription()}
          </Text>
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity
            onPress={handleResetFilters}
            style={styles.clearAllButton}
          >
            <Text style={styles.clearAllText}>Clear Filter</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* RIGHT: Export Button (fixed) */}
      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleExportExpenses}
      >
        <Download size={16} color={COLORS.brand} />
        <Text style={styles.exportText}>Export</Text>
      </TouchableOpacity>

    </View>
  </View>
);


  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <FileText size={48} color={COLORS.sub} />
      <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No Expenses Found</Text>
      <Text style={[styles.emptySub, { color: COLORS.sub }]}>
        {hasActiveFilters
          ? 'Try adjusting your filter criteria.'
          : 'No expenses available.'}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity style={[styles.clearEmptyButton, { backgroundColor: COLORS.brand }]} onPress={handleResetFilters}>
          <Text style={styles.clearEmptyButtonText}>Clear Filter</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderExpenseItem = ({ item }: { item: any }) => {
    console.log("765456546youuu",item)
    const paddedId = String(item?.id ?? '').padStart(4, '0');
    const payeeName = item?.payeeName || 'Unknown Payee';
    const categoryName = item?.categoryName || 'Uncategorized';
    const expenseDate = formatDateSimple(item?.expenseDate);
    const entityType = item?.entityType || 'Unknown';
    const entityName = item?.entityName || 'N/A';
    const expenseNumber = item?.expenseNumber || `EXP-${paddedId}`;
    const attachments = item?.attachments || [];
    const hasAttachments = attachments && attachments.length > 0;
    const isProcessingDelete = processingDelete === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.card,
          { backgroundColor: COLORS.card, borderColor: COLORS.border },
        ]}
        onPress={() => {
          navigation.navigate('ExpenseDetail' as never, { expenseId: item.id });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.transactionIdContainer}>
            <Text style={[styles.transactionId, { color: COLORS.text }]}>
              {expenseNumber}
            </Text>
            <Text style={[styles.entityType, { color: COLORS.sub }]}>
              {entityType.toUpperCase()} 
            </Text>
          </View>
          <View style={styles.headerBadges}>
            <StatusPill status={item?.status} />
            {hasAttachments && (
              <View style={[styles.attachmentBadge, { backgroundColor: COLORS.infoLight }]}>
                <Paperclip size={10} color={COLORS.info} />
                <Text style={[styles.attachmentBadgeText, { color: COLORS.info }]}>
                  {attachments.length}
                </Text>
              </View>
            )}
            
            {/* Edit/Delete Menu Button */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={(e) => {
                e.stopPropagation();
                showActionSheet(
                  item,
                  () => handleEditExpense(item),
                  () => showDeleteConfirmation(
                    item.id,
                    expenseNumber,
                    () => handleDeleteExpense(item.id, expenseNumber)
                  ),
                  userPermissions
                );
              }}
              disabled={isProcessingDelete}
            >
              {isProcessingDelete ? (
                <ActivityIndicator size="small" color={COLORS.sub} />
              ) : (
                <MoreVertical size={18} color={COLORS.sub} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <User size={14} color={COLORS.sub} />
              <Text style={[styles.infoLabel, { color: COLORS.text }]}>Payee:</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]} numberOfLines={1}>
                {payeeName}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Tag size={14} color={COLORS.sub} />
              <Text style={[styles.infoLabel, { color: COLORS.text }]}>Category:</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]} numberOfLines={1}>
                {categoryName}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Calendar size={14} color={COLORS.sub} />
              <Text style={[styles.infoLabel, { color: COLORS.text }]}>Date:</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]}>
                {expenseDate}
              </Text>
            </View>
          </View>

          {/* Attachments Section */}
          {hasAttachments && (
            <View style={styles.attachmentsSection}>
              <View style={styles.attachmentsHeader}>
                <Paperclip size={14} color={COLORS.sub} />
                <Text style={[styles.attachmentsTitle, { color: COLORS.text }]}>
                  Attachments ({attachments.length})
                </Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.attachmentsContainer}
                contentContainerStyle={styles.attachmentsContent}
              >
                {attachments.map((attachment: any, index: number) => (
                  <AttachmentItem key={index} attachment={attachment} />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.financialSection}>
            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={[styles.financialLabel, { color: COLORS.sub }]}>Amount</Text>
                <Text style={[styles.financialValue, { color: COLORS.text }]}>
                  {formatCurrency(item?.amount)}
                </Text>
              </View>
              <View style={styles.financialItem}>
                <Text style={[styles.financialLabel, { color: COLORS.sub }]}>Payment</Text>
                <Text style={[styles.financialValue, { color: COLORS.text }]}>
                  {item?.paymentMethod || 'N/A'}
                </Text>
              </View>
            </View>
            
            {item?.description && (
              <Text style={[styles.description, { color: COLORS.sub }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            
            {/* Action buttons based on permissions */}
            <View style={styles.actionButtons}>
              {item?.status === 'pending' && userPermissions.canApprove && (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: COLORS.successLight }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleApprove(item.id);
                    }}
                  >
                    <CheckCircle size={14} color={COLORS.success} />
                    <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: COLORS.errorLight }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleReject(item.id);
                    }}
                  >
                    <XCircle size={14} color={COLORS.error} />
                    <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {item?.status === 'approved' && userPermissions.canApprove && (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: COLORS.infoLight }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleMarkPaid(item.id);
                  }}
                >
                  <CheckCircle size={14} color={COLORS.info} />
                  <Text style={[styles.actionButtonText, { color: COLORS.info }]}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1 || filters.filterType === 'id' || filters.filterType === 'number') return null;

    return (
      <View style={[styles.pagination, { borderTopColor: COLORS.border }]}>
        <Text style={[styles.resultsText, { color: COLORS.text }]}>
          Results: {totalRecords} expenses
        </Text>

        <View style={styles.pageControls}>
          <Text style={[styles.pageInfo, { color: COLORS.text }]}>
            Page {currentPage} of {totalPages}
          </Text>

          <View style={styles.pageButtons}>
            <TouchableOpacity
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={[styles.pageBtn, { backgroundColor: COLORS.card }, currentPage === 1 && styles.pageBtnDisabled]}
            >
              <ChevronLeft size={18} color={currentPage === 1 ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={[styles.pageBtn, { backgroundColor: COLORS.card }, currentPage === totalPages && styles.pageBtnDisabled]}
            >
              <ChevronRight size={18} color={currentPage === totalPages ? COLORS.sub : COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading && expenses.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={[styles.loadingText, { color: COLORS.sub }]}>
            Loading expenses…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {renderHeader()}

      <FlatList
        ref={flatRef}
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExpenseItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderPagination}
        showsVerticalScrollIndicator={false}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        categories={categories}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickFiltersContainer: {
    marginTop: 8,
  },
  quickFiltersContent: {
    gap: 8,
    paddingRight: 20,
  },
  quickFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 200,
  },
  quickFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllButton: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  clearAllText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterScroll: {
    padding: 20,
  },
  filterScrollContent: {
    paddingBottom: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.text,
  },
  filterTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterOptionIcon: {
    marginRight: 6,
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterInputGroup: {
    marginBottom: 16,
  },
  filterInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

exportButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 8,
  marginLeft: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.card,
},

exportText: {
  fontSize: 12,
  fontWeight: '600',
  color: COLORS.brand,
},

  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateInputText: {
    flex: 1,
    fontSize: 14,
    includeFontPadding: false,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryOptionActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusOptionActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  exportBtn: {
    marginLeft: 6,
    backgroundColor: COLORS.card,
  },
  filterModalButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  filterModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionIdContainer: {
    flex: 1,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  entityType: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  menuButton: {
    padding: 4,
    marginLeft: 4,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  attachmentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    gap: 12,
  },
  infoSection: {
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  attachmentsSection: {
    gap: 8,
  },
  attachmentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentsTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentsContainer: {
    marginHorizontal: -2,
  },
  attachmentsContent: {
    gap: 8,
    paddingRight: 16,
  },
  attachmentItem: {
    width: 80,
    alignItems: 'center',
    gap: 4,
  },
  imageAttachment: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.border,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileAttachment: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentName: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  financialSection: {
    gap: 8,
    marginTop: 4,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialItem: {
    alignItems: 'center',
    flex: 1,
  },
  financialLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  financialValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  clearEmptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearEmptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '600',
  },
  pageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
});

export default ExpensesListScreen;