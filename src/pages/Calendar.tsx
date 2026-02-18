import { useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { ACTIVITY_TYPE_CONFIG } from '@/constants';
import { cn } from '@/utils';

export function Calendar() {
  const { activities } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
        <span className="font-bold">
          {format(currentMonth, 'yyyy年 M月')}
        </span>
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
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'aspect-square p-0.5 rounded text-xs relative',
                  isToday(day) && 'bg-garden-50 dark:bg-garden-900/20 ring-1 ring-garden-500',
                  weekday === 0 && 'text-red-500',
                  weekday === 6 && 'text-blue-500',
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
                      <span className="text-[8px] text-gray-400">+{dayActivities.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's activities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-bold mb-2">今日のアクティビティ</h3>
        {(() => {
          const todayActivities = getActivitiesForDay(new Date());
          if (todayActivities.length === 0) {
            return <p className="text-xs text-gray-400">記録なし</p>;
          }
          return (
            <div className="space-y-2">
              {todayActivities.map((a) => {
                const config = ACTIVITY_TYPE_CONFIG[a.activityType];
                return (
                  <div key={a.id} className="text-sm flex items-center gap-2">
                    <span>{config?.emoji}</span>
                    <span className="text-gray-500">{config?.label}</span>
                    {a.memo && (
                      <span className="text-gray-400 text-xs truncate">{a.memo}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
