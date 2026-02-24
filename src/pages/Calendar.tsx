import { useState } from 'react';
import { Link } from 'react-router-dom';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, isToday, isSameDay } from '@/utils/date-imports';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { ACTIVITY_TYPE_CONFIG } from '@/constants';
import { cn, formatDate } from '@/utils';

export function Calendar() {
  const { activities, planters } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startWeekday = getDay(monthStart); // 0=Sun

  const prevMonth = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const getActivitiesForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return activities.filter((a) => a.activityDate === dateStr);
  };

  const selectedActivities = getActivitiesForDay(selectedDate);

  // 月内のアクティビティ数を計算（カレンダー下の月サマリー用）
  const monthActivityCount = activities.filter((a) => {
    if (!a.activityDate) return false;
    const d = new Date(a.activityDate);
    return d >= monthStart && d <= monthEnd;
  }).length;

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">📅 カレンダー</h1>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <button
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <span className="font-bold">
            {format(currentMonth, 'yyyy年 M月')}
          </span>
          <span className="ml-2 text-xs text-gray-500">{monthActivityCount}件の作業</span>
        </div>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
          {weekdays.map((w, i) => (
            <div
              key={w}
              className={cn(
                'py-1',
                i === 0 && 'text-red-500',
                i === 6 && 'text-blue-500',
              )}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Empty cells for offset */}
          {Array.from({ length: startWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const dayActivities = getActivitiesForDay(day);
            const weekday = getDay(day);
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'aspect-square p-0.5 rounded text-xs relative transition-colors',
                  isToday(day) && !isSelected && 'bg-garden-50 dark:bg-garden-900/20 ring-1 ring-garden-500',
                  isSelected && 'bg-garden-500 text-white ring-2 ring-garden-600',
                  !isSelected && !isToday(day) && 'hover:bg-gray-50 dark:hover:bg-gray-700',
                  weekday === 0 && !isSelected && 'text-red-500',
                  weekday === 6 && !isSelected && 'text-blue-500',
                )}
              >
                <div className="text-center text-[10px]">{format(day, 'd')}</div>
                {dayActivities.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0 mt-0.5">
                    {dayActivities.slice(0, 3).map((a) => {
                      const config = ACTIVITY_TYPE_CONFIG[a.activityType];
                      return (
                        <span key={a.id} className="text-[8px] leading-none">
                          {config?.emoji}
                        </span>
                      );
                    })}
                    {dayActivities.length > 3 && (
                      <span className={cn('text-[8px]', isSelected ? 'text-white/80' : 'text-gray-400')}>
                        +{dayActivities.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">
            {formatDate(format(selectedDate, 'yyyy-MM-dd'), 'M月d日(E)')}のアクティビティ
          </h3>
          <Link
            to={`/activities/new?date=${format(selectedDate, 'yyyy-MM-dd')}`}
            className="flex items-center gap-1 text-xs text-garden-600 dark:text-garden-400 hover:underline"
          >
            <PlusCircle size={12} /> 記録する
          </Link>
        </div>
        {selectedActivities.length === 0 ? (
          <p className="text-xs text-gray-400">記録なし</p>
        ) : (
          <div className="space-y-2">
            {selectedActivities.map((a) => {
              const config = ACTIVITY_TYPE_CONFIG[a.activityType];
              const planter = planters.find((p) => p.id === a.planterId);
              return (
                <Link
                  key={a.id}
                  to={`/planters/${a.planterId}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span
                    className={cn(
                      'text-lg w-8 h-8 flex items-center justify-center rounded-full',
                      config.color,
                    )}
                  >
                    {config?.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{config?.label}</span>
                      {a.quantity != null && a.quantity > 0 && (
                        <span className="text-gray-500 text-xs">{a.quantity}{a.unit}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {planter && <span>{planter.name} ({planter.cropName})</span>}
                      {a.userName && <span>by {a.userName}</span>}
                    </div>
                    {a.memo && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{a.memo}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
