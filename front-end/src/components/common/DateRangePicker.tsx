import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import 'react-day-picker/dist/style.css';

interface DateRangePickerProps {
  dateFrom?: string; // 'YYYY-MM-DD'
  dateTo?: string;   // 'YYYY-MM-DD'
  onChange: (from: string | undefined, to: string | undefined) => void;
  placeholder?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateFrom,
  dateTo,
  onChange,
  placeholder = 'Select date range',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert string → Date for DayPicker
  const range: DateRange = {
    from: dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined,
    to:   dateTo   ? new Date(dateTo   + 'T00:00:00') : undefined,
  };

  const handleSelect = (selected: DateRange | undefined) => {
    if (!selected) {
      onChange(undefined, undefined);
      return;
    }
    const from = selected.from ? format(selected.from, 'yyyy-MM-dd') : undefined;
    const to   = selected.to   ? format(selected.to,   'yyyy-MM-dd') : undefined;
    onChange(from, to);
    // Close only when both ends are picked
    if (selected.from && selected.to) setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined, undefined);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayText = (() => {
    if (dateFrom && dateTo) {
      const f = format(new Date(dateFrom + 'T00:00:00'), 'd MMM yyyy');
      const t = format(new Date(dateTo   + 'T00:00:00'), 'd MMM yyyy');
      return `${f} → ${t}`;
    }
    if (dateFrom) return `From ${format(new Date(dateFrom + 'T00:00:00'), 'd MMM yyyy')}`;
    return null;
  })();

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors
          ${open ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-300 hover:border-gray-400'}
          ${displayText ? 'text-gray-900' : 'text-gray-400'} bg-white`}
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          {displayText || placeholder}
        </span>
        {displayText && (
          <X
            className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors"
            onClick={handleClear}
          />
        )}
      </button>

      {/* Calendar popup */}
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 left-0">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
            showOutsideDays
            styles={{
              months: { display: 'flex', gap: '1rem' },
            }}
            modifiersClassNames={{
              selected: 'rdp-selected',
              range_start: 'rdp-range_start',
              range_end: 'rdp-range_end',
              range_middle: 'rdp-range_middle',
            }}
          />
          {/* Footer hint */}
          <div className="border-t border-gray-100 pt-2 mt-1 flex items-center justify-between px-1">
            <span className="text-xs text-gray-400">
              {!range.from ? 'Click a start date' : !range.to ? 'Click an end date' : `${format(range.from,'d MMM')} → ${format(range.to,'d MMM yyyy')}`}
            </span>
            {(range.from || range.to) && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
