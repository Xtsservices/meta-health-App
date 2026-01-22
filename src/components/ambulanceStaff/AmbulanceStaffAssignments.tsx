import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { showError } from '../../store/toast.slice';
import { AuthFetch } from '../../auth/auth';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE } from '../../utils/responsive';
import { CalendarIcon, ClockIcon, MapPinIcon, UserIcon } from '../../utils/SvgIcons';
import AmbulanceStaffFooter from './AmbulanceStaffFooter';

type Assignment = {
  id: number;
  date: string;
  time: string;
  patientName: string;
  location: string;
  type: 'scheduled' | 'completed' | 'cancelled';
  priority: string;
  notes?: string;
};

const AmbulanceStaffAssignments: React.FC = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  const fetchAssignments = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      const token = user?.token;
      if (!token) {
        dispatch(showError('Authentication token not found'));
        return;
      }

      // Replace with your actual API endpoint
      const response = await AuthFetch('ambulance/staff/assignments', token);
      
      if (response?.status === 'success') {
        const data = 'data' in response ? response.data : [];
        setAssignments(data);
      } else {
        const message = 'message' in response ? response.message : 'Failed to fetch assignments';
        dispatch(showError(message));
      }
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      dispatch(showError(error?.message || 'Failed to fetch assignments'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAssignments();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments(true);
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'scheduled':
        return COLORS.brand;
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return COLORS.danger;
      default:
        return COLORS.sub;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'emergency':
        return COLORS.danger;
      case 'urgent':
        return '#F9A825';
      default:
        return COLORS.brand;
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (selectedFilter === 'all') return true;
    return assignment.type === selectedFilter;
  });

  const renderFilterButton = (filter: 'all' | 'scheduled' | 'completed', label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === filter && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAssignmentCard = ({ item }: { item: Assignment }) => (
    <TouchableOpacity style={styles.assignmentCard} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <CalendarIcon size={16} color={COLORS.brand} />
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.type) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.type) }]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <ClockIcon size={18} color={COLORS.sub} />
          <Text style={styles.infoText}>{item.time}</Text>
        </View>

        <View style={styles.infoRow}>
          <UserIcon size={18} color={COLORS.sub} />
          <Text style={styles.infoText}>{item.patientName}</Text>
        </View>

        <View style={styles.infoRow}>
          <MapPinIcon size={18} color={COLORS.sub} />
          <Text style={styles.infoText} numberOfLines={2}>
            {item.location}
          </Text>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <CalendarIcon size={64} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No Assignments</Text>
      <Text style={styles.emptySubtitle}>
        You don't have any {selectedFilter !== 'all' ? selectedFilter : ''} assignments at the moment
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
        <AmbulanceStaffFooter />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Assignments</Text>
        <Text style={styles.headerSubtitle}>View your scheduled trips</Text>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('scheduled', 'Scheduled')}
        {renderFilterButton('completed', 'Completed')}
      </View>

      <FlatList
        data={filteredAssignments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAssignmentCard}
        contentContainerStyle={[
          styles.listContent,
          filteredAssignments.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.brand]}
            tintColor={COLORS.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <AmbulanceStaffFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
  },
  header: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.sub,
    textAlign: 'center',
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  cardContent: {
    gap: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  notesContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.sub,
    marginBottom: 4,
  },
  notesText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default AmbulanceStaffAssignments;
