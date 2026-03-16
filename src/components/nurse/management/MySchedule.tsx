import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootState } from '../../../store/store';
import { AuthFetch } from '../../../auth/auth';
import { showError } from '../../../store/toast.slice';

const { width } = Dimensions.get('window');

/* ================= TYPES ================= */

interface ShiftEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  shiftType: string;
  department: string;
  ward: string;
  isLeave: boolean;
  leaveType?: string;
}

interface LeavesCount {
  totalLeaves: number;
  approvedLeaves: number;
  pendingLeaves: number;
}

/* ================= COMPONENT ================= */

const MyScheduleScreen: React.FC = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);

  const scrollRef = useRef<ScrollView>(null);

  const [events, setEvents] = useState<ShiftEvent[]>([]);
  const [leavesCount, setLeavesCount] = useState<LeavesCount>({
    totalLeaves: 0,
    approvedLeaves: 0,
    pendingLeaves: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchSchedule();
    fetchLeavesCount();
  }, []);

  const fetchSchedule = async () => {
    const token = await AsyncStorage.getItem('token');
    try {
      setLoading(true);
      const res = await AuthFetch(
        `nurse/getmyshiftschedule/${user?.hospitalID}`,
        token
      ) as any;

      if (res?.data?.message !== 'success') {
        dispatch(showError('Failed to fetch schedule'));
        return;
      }

      const raw = res.data.data || [];
      const formatted: ShiftEvent[] = [];

      raw.forEach((r: any) => {
        if (r.leaveFrom && r.leaveTo) {
          const s = new Date(r.leaveFrom);
          const e = new Date(r.leaveTo);
          s.setHours(0, 0, 0, 0);
          e.setHours(23, 59, 59, 999);

          formatted.push({
            id: `leave-${r.id}`,
            title: r.leaveType || 'Leave',
            start: s,
            end: e,
            shiftType: 'leave',
            department: '',
            ward: '',
            isLeave: true,
            leaveType: r.leaveType,
          });
        }

        if (r.fromDate && r.shiftTimings) {
          const start = new Date(r.fromDate);
          const end = new Date(r.toDate || r.fromDate);

          const [st, et] = r.shiftTimings.split(' - ');
          const parse = (t: string) => {
            let [time, mod] = t.split(' ');
            let [h, m] = time.split(':').map(Number);
            if (mod === 'PM' && h < 12) h += 12;
            if (mod === 'AM' && h === 12) h = 0;
            return { h, m };
          };

          const ps = parse(st);
          const pe = parse(et);
          start.setHours(ps.h, ps.m, 0);
          end.setHours(pe.h, pe.m, 0);

          formatted.push({
            id: `shift-${r.id}`,
            title: 'Shift',
            start,
            end,
            shiftType: r.scope === 2 ? 'OPD' : 'IPD',
            department: r.departmentName || '',
            ward: r.wardName || '',
            isLeave: false,
          });
        }
      });

      setEvents(formatted);
    } catch {
      dispatch(showError('Failed to fetch schedule'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLeavesCount = async () => {
    const token = await AsyncStorage.getItem('token');
    try {
      const res = await AuthFetch(
        `nurse/getstaffleavesCount/${user?.hospitalID}`,
        token
      ) as any;
      if (res?.data?.message === 'success') {
        setLeavesCount(res.data.data);
      }
    } catch {
      dispatch(showError('Failed to fetch leave stats'));
    }
  };

  /* ================= HELPERS ================= */

  const monthDates = () => {
    const y = selectedMonth.getFullYear();
    const m = selectedMonth.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const hasEvent = (d: Date) =>
    events.some(e => d >= e.start && d <= e.end);

  const eventsForDate = () =>
    events.filter(e => selectedDate >= e.start && selectedDate <= e.end);

  /* ================= UI ================= */

  return (
    <ScrollView ref={scrollRef} style={styles.container}>
      {/* STATS */}
      <View style={styles.statsRow}>
        <StatCard label="Total Leaves" value={leavesCount.totalLeaves} />
        <StatCard label="Pending" value={leavesCount.pendingLeaves} />
        <StatCard label="Approved" value={leavesCount.approvedLeaves} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#14b8a6" />
      ) : (
        <>
          {/* CALENDAR */}
          <View style={styles.calendar}>
            <View style={styles.calHeader}>
              <TouchableOpacity
                onPress={() =>
                  setSelectedMonth(
                    new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1))
                  )
                }
              >
                <Text style={styles.nav}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.month}>
                {selectedMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setSelectedMonth(
                    new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1))
                  )
                }
              >
                <Text style={styles.nav}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <Text key={d} style={styles.week}>{d}</Text>
              ))}
            </View>

            <View style={styles.dateGrid}>
              {monthDates().map((d, i) => {
                const isCurrent = d.getMonth() === selectedMonth.getMonth();
                const isSelected =
                  d.toDateString() === selectedDate.toDateString();

                return (
                  <TouchableOpacity
                    key={i}
                    disabled={!isCurrent}
                    style={[
                      styles.dateCell,
                      isSelected && styles.selected,
                    ]}
                    onPress={() => {
                      setSelectedDate(d);
                      setTimeout(() => {
                        scrollRef.current?.scrollToEnd({ animated: true });
                      }, 200);
                    }}
                  >
                    <Text
                      style={[
                        styles.dateText,
                        !isCurrent && styles.muted,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                    {hasEvent(d) && <View style={styles.dot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SCHEDULE LIST */}
          <View style={styles.schedule}>
            <Text style={styles.scheduleTitle}>
              Schedule for {selectedDate.toDateString()}
            </Text>

            {eventsForDate().length === 0 ? (
              <Text style={styles.empty}>No shifts or leaves</Text>
            ) : (
              eventsForDate().map(e => (
                <View
                  key={e.id}
                  style={[
                    styles.event,
                    e.isLeave
                      ? styles.leave
                      : e.shiftType === 'OPD'
                      ? styles.opd
                      : styles.ipd,
                  ]}
                >
                  <Text style={styles.eventTitle}>
                    {e.isLeave ? e.leaveType : `${e.shiftType} Shift`}
                  </Text>
                  {!e.isLeave && (
                    <Text style={styles.eventSub}>
                      {e.department} • {e.ward}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default MyScheduleScreen;

/* ================= SMALL COMPONENT ================= */

const StatCard = ({ label, value }: any) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#14b8a6',
    borderRadius: 12,
    padding: 14,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f766e',
  },
  statLabel: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },

  calendar: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nav: { fontSize: 20, color: '#475569' },
  month: { fontSize: 16, fontWeight: '600' },

  weekRow: { flexDirection: 'row', marginTop: 8 },
  week: { flex: 1, textAlign: 'center', fontSize: 12, color: '#64748b' },

  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  dateCell: {
    width: (width - 64) / 7,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateText: { fontSize: 14, color: '#1f2937' },
  muted: { color: '#cbd5e1' },
  selected: { backgroundColor: '#14b8a6', borderRadius: 10 },
  selectedText: { color: '#fff', fontWeight: '600' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#14b8a6',
    marginTop: 2,
  },

  schedule: {
    backgroundColor: '#fff',
    marginTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  scheduleTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },

  event: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  leave: { borderLeftColor: '#ef4444' },
  opd: { borderLeftColor: '#3b82f6' },
  ipd: { borderLeftColor: '#0d9488' },
  eventTitle: { fontSize: 15, fontWeight: '600' },
  eventSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
});
