import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { showError, showSuccess } from '../../store/toast.slice';
import { AuthPost } from '../../auth/auth';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE } from '../../utils/responsive';

type VitalsForm = {
  temperature: string;
  pulse: string;
  oxygen: string;
  respiratoryRate: string;
  bpSystolic: string;
  bpDiastolic: string;
};

const AmbulanceStaffAddVitals: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);
  
  const params = route.params as any;
  const patientId = params?.patientId;
  const patientName = params?.patientName || 'Patient';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<VitalsForm>({
    temperature: '',
    pulse: '',
    oxygen: '',
    respiratoryRate: '',
    bpSystolic: '',
    bpDiastolic: '',
  });

  const updateField = (field: keyof VitalsForm, value: string) => {
    // Allow only numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({ ...prev, [field]: numericValue }));
  };

  const validateForm = (): boolean => {
    // At least one vital should be filled
    const hasAnyVital = Object.values(formData).some(value => value.trim() !== '');
    
    if (!hasAnyVital) {
      dispatch(showError('Please enter at least one vital sign'));
      return false;
    }

    // Validate ranges if values are provided
    if (formData.temperature && (parseFloat(formData.temperature) < 20 || parseFloat(formData.temperature) > 45)) {
      dispatch(showError('Temperature should be between 20-45°C'));
      return false;
    }

    if (formData.pulse && (parseFloat(formData.pulse) < 30 || parseFloat(formData.pulse) > 220)) {
      dispatch(showError('Pulse should be between 30-220 bpm'));
      return false;
    }

    if (formData.oxygen && (parseFloat(formData.oxygen) < 50 || parseFloat(formData.oxygen) > 100)) {
      dispatch(showError('Oxygen saturation should be between 50-100%'));
      return false;
    }

    if (formData.respiratoryRate && (parseFloat(formData.respiratoryRate) < 1 || parseFloat(formData.respiratoryRate) > 60)) {
      dispatch(showError('Respiratory rate should be between 1-60 breaths/min'));
      return false;
    }

    if (formData.bpSystolic && (parseFloat(formData.bpSystolic) < 30 || parseFloat(formData.bpSystolic) > 250)) {
      dispatch(showError('Systolic BP should be between 30-250 mmHg'));
      return false;
    }

    if (formData.bpDiastolic && (parseFloat(formData.bpDiastolic) < 30 || parseFloat(formData.bpDiastolic) > 150)) {
      dispatch(showError('Diastolic BP should be between 30-150 mmHg'));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = user?.token;
      if (!token) {
        dispatch(showError('Authentication token not found'));
        return;
      }

      const vitalsData: any = {
        patientId,
        recordedBy: user?.id,
        recordedAt: new Date().toISOString(),
      };

      if (formData.temperature) vitalsData.temperature = parseFloat(formData.temperature);
      if (formData.pulse) vitalsData.pulse = parseInt(formData.pulse, 10);
      if (formData.oxygen) vitalsData.oxygenSaturation = parseFloat(formData.oxygen);
      if (formData.respiratoryRate) vitalsData.respiratoryRate = parseInt(formData.respiratoryRate, 10);
      if (formData.bpSystolic) vitalsData.bloodPressureSystolic = parseInt(formData.bpSystolic, 10);
      if (formData.bpDiastolic) vitalsData.bloodPressureDiastolic = parseInt(formData.bpDiastolic, 10);

      // Replace with your actual API endpoint
      const response = await AuthPost('vitals/add', vitalsData, token);

      if (response?.status === 'success') {
        dispatch(showSuccess('Vitals added successfully'));
        navigation.goBack();
      } else {
        const message = 'message' in response ? response.message : 'Failed to add vitals';
        dispatch(showError(message));
      }
    } catch (error: any) {
      console.error('Error adding vitals:', error);
      dispatch(showError(error?.message || 'Failed to add vitals'));
    } finally {
      setLoading(false);
    }
  };

  const renderVitalInput = (
    label: string,
    field: keyof VitalsForm,
    unit: string,
    placeholder: string
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={formData[field]}
          onChangeText={(value) => updateField(field, value)}
          placeholder={placeholder}
          placeholderTextColor={COLORS.sub}
          keyboardType="decimal-pad"
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.patientName}>{patientName}</Text>
          <Text style={styles.subtitle}>Record Vital Signs</Text>
        </View>

        {/* Vitals Form */}
        <View style={styles.form}>
          {renderVitalInput('Temperature', 'temperature', '°C', 'e.g., 37.5')}
          {renderVitalInput('Heart Rate', 'pulse', 'bpm', 'e.g., 72')}
          {renderVitalInput('Oxygen Saturation', 'oxygen', '%', 'e.g., 98')}
          {renderVitalInput('Respiratory Rate', 'respiratoryRate', '/min', 'e.g., 16')}
          {renderVitalInput('Systolic BP', 'bpSystolic', 'mmHg', 'e.g., 120')}
          {renderVitalInput('Diastolic BP', 'bpDiastolic', 'mmHg', 'e.g., 80')}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Save Vitals</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  patientName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  form: {
    gap: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  unit: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.sub,
    marginLeft: SPACING.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AmbulanceStaffAddVitals;
