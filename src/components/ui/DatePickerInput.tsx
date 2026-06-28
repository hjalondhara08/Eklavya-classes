'use client';

import React, { useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { parseDDMMYYYY, formatToDDMMYYYY } from '@/lib/utils/dates';

interface DatePickerInputProps {
  value: string; // DD/MM/YYYY format
  onChange: (val: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export default function DatePickerInput({
  value,
  onChange,
  required = false,
  placeholder = 'DD/MM/YYYY',
  className = '',
  theme = 'light'
}: DatePickerInputProps) {
  const datePickerRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const { selectionStart, selectionEnd, value: val } = input;
      
      if (selectionStart === selectionEnd && selectionStart !== null) {
        // If cursor is right after a slash
        if (selectionStart > 0 && val[selectionStart - 1] === '/') {
          e.preventDefault();
          // Find the digit to delete (the one before the slash)
          const beforeSlashIndex = selectionStart - 2;
          if (beforeSlashIndex >= 0) {
            let newVal = val.slice(0, beforeSlashIndex) + '/' + val.slice(selectionStart);
            newVal = newVal.replace(/\/\/+/g, '/');
            onChange(newVal);
            
            const newPos = Math.max(0, selectionStart - 1);
            setTimeout(() => {
              input.setSelectionRange(newPos, newPos);
            }, 0);
          }
        }
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    let clean = val.replace(/[^0-9/]/g, '').slice(0, 10);
    
    // Auto insert slashes if typing numbers without them
    const activeElement = document.activeElement as HTMLInputElement;
    const isDeleting = activeElement && activeElement.selectionStart !== null && activeElement.selectionStart < val.length;
    
    if (!isDeleting) {
      const numbers = clean.replace(/\//g, '');
      if (numbers.length > 2 && !clean.includes('/')) {
        clean = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
      }
      const parts = clean.split('/');
      if (parts.length > 1 && parts[1].length > 2) {
        clean = `${parts[0]}/${parts[1].slice(0, 2)}/${parts[1].slice(2)}`;
      }
    }
    
    onChange(clean);
  };

  const isDark = theme === 'dark';

  // Strip conflicting horizontal paddings and alignment classes from className to enforce safe paddings
  const cleanedClassName = className
    ? className.replace(/\b(px-\S+|pr-\S+|pl-\S+|text-center)\b/g, '').trim()
    : '';

  const inputClasses = className
    ? `${cleanedClassName} pl-2.5 pr-9 text-left`
    : `w-full pl-3 pr-9 py-2 text-sm rounded-btn focus:outline-none transition-all ${
        isDark 
          ? 'bg-white/5 border border-white/10 text-white focus:border-[#D4AF37]' 
          : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-navy focus:bg-white'
      }`;

  return (
    <div className="relative w-full">
      <input
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        className={inputClasses}
      />
      <button
        type="button"
        onClick={() => {
          try {
            datePickerRef.current?.showPicker();
          } catch (err) {
            console.error('showPicker not supported', err);
          }
        }}
        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
          isDark ? 'text-slate-400 hover:text-[#D4AF37]' : 'text-slate-400 hover:text-navy'
        }`}
      >
        <CalendarIcon className="h-4 w-4" />
      </button>
      <input
        ref={datePickerRef}
        type="date"
        value={parseDDMMYYYY(value)}
        onChange={(e) => {
          if (e.target.value) {
            onChange(formatToDDMMYYYY(e.target.value));
          }
        }}
        className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
      />
    </div>
  );
}
