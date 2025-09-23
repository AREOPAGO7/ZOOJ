// Helper functions for getting translated content based on language

// Helper function to get the correct quiz title based on language
export const getQuizTitle = (quiz: any, language: string): string => {
  if (!language) language = 'fr';
  
  console.log('🔍 getQuizTitle called with:', { 
    language, 
    name: quiz.name, 
    name_en: quiz.name_en, 
    name_ar: quiz.name_ar, 
    name_ma: quiz.name_ma 
  });
  
  let result: string;
  switch (language) {
    case 'en':
      result = quiz.name_en || quiz.title_en || quiz.name || quiz.title;
      break;
    case 'ar':
      result = quiz.name_ar || quiz.title_ar || quiz.name || quiz.title;
      break;
    case 'ma':
      result = quiz.name_ma || quiz.title_ma || quiz.name || quiz.title;
      break;
    case 'fr':
    default:
      result = quiz.name || quiz.title;
      break;
  }
  
  console.log('✅ getQuizTitle result:', result);
  return result;
};

// Helper function to get the correct question content based on language
export const getQuestionContent = (question: any, language: string): string => {
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return question.content_en || question.content;
    case 'ar':
      return question.content_ar || question.content;
    case 'ma':
      return question.content_ma || question.content;
    case 'fr':
    default:
      return question.content;
  }
};

// Helper function to get the correct theme name based on language
export const getThemeName = (theme: any, language: string): string => {
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return theme.name_en || theme.name;
    case 'ar':
      return theme.name_ar || theme.name;
    case 'ma':
      return theme.name_ma || theme.name;
    case 'fr':
    default:
      return theme.name;
  }
};
