import { useMemo } from 'react';
import { useTimetableStore } from '../store/useTimetableStore';
import { getSnapshot, sortActivities } from '../utils/schedule';

export const useSchedule = (now: Date) => {
  const activities = useTimetableStore(s => s.activities);
  const sorted = useMemo(() => sortActivities(activities), [activities]);
  const snapshot = useMemo(() => getSnapshot(sorted, now), [sorted, now]);
  return { activities: sorted, ...snapshot };
};
