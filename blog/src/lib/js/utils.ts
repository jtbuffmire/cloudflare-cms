export function formatDate(date: string | Date | number): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = { 
    timeZone: 'UTC', 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  };
  return d.toLocaleDateString(undefined, options);
} 