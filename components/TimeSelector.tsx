import React, { useEffect, useState } from 'react';

interface TimeSelectorProps {
  value: string; // HH:mm (24h)
  onChange: (value: string) => void;
  format: '12h' | '24h';
  className?: string;
  required?: boolean;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({ value, onChange, format, className, required }) => {
  // If 24h, use native input for simplicity and best mobile experience
  // or consistent styling.
  // Note: Native input type="time" depends on OS locale, so it might show 12h even if we want 24h, or vice versa.
  // However, for 12h "selectors", user typically wants explicit AM/PM dropdowns.
  
  if (format === '24h') {
      return (
          <input 
              type="time" 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              className={className} 
              required={required}
          />
      );
  }

  // 12h Logic
  // Ensure value is valid HH:mm
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);
  const [isPm, setIsPm] = useState(false);

  useEffect(() => {
      if (!value) return;
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
          setHours(h);
          setMinutes(m);
          setIsPm(h >= 12);
      }
  }, [value]);

  const updateTime = (newH: number, newM: number, newPm: boolean) => {
      let h24 = newH; // 1-12
      
      // Convert 12h to 24h
      if (newPm && h24 < 12) h24 = h24 + 12;
      if (!newPm && h24 === 12) h24 = 0;
      
      const hh = h24.toString().padStart(2, '0');
      const mm = newM.toString().padStart(2, '0');
      onChange(`${hh}:${mm}`);
  };

  const currentDisplayHour = () => {
      let h = hours % 12;
      if (h === 0) h = 12;
      return h;
  };

  // Extract base classes from passed className to maintain consistency (rounded, border, etc)
  const selectBaseClass = "block rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm p-2 border bg-white text-gray-900 dark:text-white sm:text-sm focus:border-teal-500 focus:ring-teal-500";
  
  // Apply the passed className (which includes mt-1) to the wrapper to align with the label
  return (
      <div className={`flex gap-2 w-full ${className || ''}`}>
          {/* Hour Select */}
          <select 
             className={`${selectBaseClass} flex-1 min-w-[60px]`}
             value={currentDisplayHour()}
             onChange={(e) => updateTime(Number(e.target.value), minutes, isPm)}
          >
             {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                 <option key={h} value={h}>{h}</option>
             ))}
          </select>
          
          <span className="self-center font-bold text-gray-500 text-lg">:</span>
          
           {/* Minute Select - 00-59 */}
           <select 
             className={`${selectBaseClass} flex-1 min-w-[70px]`}
             value={minutes}
             onChange={(e) => updateTime(currentDisplayHour(), Number(e.target.value), isPm)}
          >
             {Array.from({length: 60}, (_, i) => i).map(m => (
                 <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
             ))}
          </select>

          {/* AM/PM */}
          <select 
             className={`${selectBaseClass} w-20 ml-1`}
             value={isPm ? 'PM' : 'AM'}
             onChange={(e) => updateTime(currentDisplayHour(), minutes, e.target.value === 'PM')}
          >
             <option value="AM">AM</option>
             <option value="PM">PM</option>
          </select>
      </div>
  );
};
