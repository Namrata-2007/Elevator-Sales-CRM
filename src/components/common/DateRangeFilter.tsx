import React from 'react';
import { Calendar, X } from 'lucide-react';

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_30_days'
  | 'this_quarter'
  | 'custom';

export interface DateRangeValue {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computePresetDates(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = toLocalIsoDate(now);

  switch (preset) {
    case 'all':
      return { startDate: '', endDate: '' };

    case 'today':
      return { startDate: todayStr, endDate: todayStr };

    case 'this_week': {
      // Monday as start of business week
      const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      return {
        startDate: toLocalIsoDate(monday),
        endDate: toLocalIsoDate(sunday),
      };
    }

    case 'this_month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: toLocalIsoDate(firstDay),
        endDate: toLocalIsoDate(lastDay),
      };
    }

    case 'last_30_days': {
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      return {
        startDate: toLocalIsoDate(thirtyDaysAgo),
        endDate: todayStr,
      };
    }

    case 'this_quarter': {
      const quarterIndex = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarterIndex * 3, 1);
      const lastDay = new Date(now.getFullYear(), quarterIndex * 3 + 3, 0);
      return {
        startDate: toLocalIsoDate(firstDay),
        endDate: toLocalIsoDate(lastDay),
      };
    }

    case 'custom':
    default:
      return { startDate: '', endDate: '' };
  }
}

const PRESET_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'custom', label: 'Custom Range' },
];

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  label?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  label = 'Period',
}) => {
  const handlePresetClick = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      const fallbackStart = value.startDate || computePresetDates('this_month').startDate;
      const fallbackEnd = value.endDate || toLocalIsoDate(new Date());
      onChange({
        preset: 'custom',
        startDate: fallbackStart,
        endDate: fallbackEnd,
      });
      return;
    }

    const { startDate, endDate } = computePresetDates(preset);
    onChange({ preset, startDate, endDate });
  };

  const handleStartDateChange = (nextStart: string) => {
    const adjustedEnd =
      value.endDate && nextStart && nextStart > value.endDate ? nextStart : value.endDate;
    onChange({
      preset: 'custom',
      startDate: nextStart,
      endDate: adjustedEnd,
    });
  };

  const handleEndDateChange = (nextEnd: string) => {
    const adjustedStart =
      value.startDate && nextEnd && nextEnd < value.startDate ? nextEnd : value.startDate;
    onChange({
      preset: 'custom',
      startDate: adjustedStart,
      endDate: nextEnd,
    });
  };

  const isFiltered = value.preset !== 'all' || Boolean(value.startDate || value.endDate);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap text-xs pt-2 border-t border-slate-100">
      <div className="flex items-center gap-1.5 text-slate-500 font-medium shrink-0">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <span>{label}:</span>
      </div>

      {/* Segmented Period Selector */}
      <div
        role="group"
        aria-label={`${label} time range`}
        className="inline-flex items-center flex-wrap gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/80"
      >
        {PRESET_OPTIONS.map((opt) => {
          const active = value.preset === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePresetClick(opt.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers */}
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-slate-600">
            <span className="font-medium">From</span>
            <input
              type="date"
              value={value.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
          <span className="text-slate-400" aria-hidden="true">
            –
          </span>
          <label className="flex items-center gap-1.5 text-slate-600">
            <span className="font-medium">To</span>
            <input
              type="date"
              value={value.endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
        </div>
      )}

      {/* Active Range Summary & Reset */}
      {isFiltered && (
        <div className="flex items-center gap-2 sm:ml-auto text-slate-500">
          {value.startDate && value.endDate && value.preset !== 'custom' && (
            <span className="font-mono text-[11px] text-slate-500">
              {value.startDate === value.endDate
                ? value.startDate
                : `${value.startDate} to ${value.endDate}`}
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange({ preset: 'all', startDate: '', endDate: '' })}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset dates</span>
          </button>
        </div>
      )}
    </div>
  );
};
