import translations from './translations.json';

export const formatDateForTodo = (date: Date, language: string): string => {
  const days = translations[language]?.notifications?.time?.days || [];
  const months = translations[language]?.notifications?.time?.months || [];
  
  // If no translations available, fallback to English
  if (!days.length || !months.length) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  
  const dayName = days[date.getDay()] || '';
  const monthName = months[date.getMonth()] || '';
  const day = date.getDate();
  const year = date.getFullYear();
  
  // Format based on language
  switch (language) {
    case 'ar':
    case 'ma':
      return `${dayName} ${day} ${monthName} ${year}`;
    case 'en':
      return `${dayName}, ${monthName} ${day}, ${year}`;
    case 'fr':
    default:
      return `${dayName} ${day} ${monthName} ${year}`;
  }
};

export const formatTimeForTodo = (time: Date, language: string): string => {
  // Use 24-hour format for Arabic languages, 12-hour for others
  const use24Hour = language === 'ar' || language === 'ma';
  
  return time.toLocaleTimeString(language === 'ar' ? 'ar-SA' : language === 'ma' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  });
};
