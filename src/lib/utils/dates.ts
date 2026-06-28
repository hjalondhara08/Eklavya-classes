export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseDDMMYYYY(str: string): string {
  if (!str) return '';
  const parts = str.split('/');
  if (parts.length === 3) {
    let day = parseInt(parts[0].trim());
    let month = parseInt(parts[1].trim());
    const year = parseInt(parts[2].trim());
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && parts[2].trim().length === 4) {
      if (month < 1) month = 1;
      if (month > 12) month = 12;
      
      // Normalize days per month
      if (month === 2) {
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const maxDays = isLeap ? 29 : 28;
        if (day > maxDays) day = maxDays;
      } else if ([4, 6, 9, 11].includes(month)) {
        if (day > 30) day = 30;
      } else {
        if (day > 31) day = 31;
      }
      
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month).padStart(2, '0');
      return `${year}-${monthStr}-${dayStr}`;
    }
  }
  return str;
}

export function formatToDDMMYYYY(str: string): string {
  if (!str) return '';
  const datePart = str.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
}


export function formatMonthOnly(feeMonth: string): string {
  // feeMonth format: "YYYY-MM"
  const parts = feeMonth.split('-');
  if (parts.length !== 2) return feeMonth;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  if (isNaN(year) || isNaN(month)) return feeMonth;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatMonthNameOnly(feeMonth: string): string {
  // feeMonth format: "YYYY-MM"
  const parts = feeMonth.split('-');
  if (parts.length !== 2) return feeMonth;
  const month = parseInt(parts[1]);
  if (isNaN(month) || month < 1 || month > 12) return feeMonth;
  return MONTH_NAMES[month - 1];
}

export function getMonthsForYear(year: number): string[] {
  const months: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = m < 10 ? `0${m}` : `${m}`;
    months.push(`${year}-${monthStr}`);
  }
  return months;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
