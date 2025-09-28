import { notificationService } from './notificationService';
import { supabase } from './supabase';
import translations from './translations.json';

// Helper function to get translated notification messages
const getNotificationMessage = (itemType: 'event' | 'souvenir' | 'todo', itemTitle: string, language: string = 'fr'): { title: string; message: string } => {
  const langTranslations = translations[language as keyof typeof translations] || translations.fr;
  
  switch (itemType) {
    case 'event':
      return {
        title: langTranslations.notifications.messages.newEvent,
        message: langTranslations.notifications.messages.partnerCreatedEvent.replace('{itemTitle}', itemTitle)
      };
    case 'souvenir':
      return {
        title: langTranslations.notifications.messages.newSouvenir,
        message: langTranslations.notifications.messages.partnerAddedSouvenir.replace('{itemTitle}', itemTitle)
      };
    case 'todo':
      return {
        title: langTranslations.notifications.messages.newTodo,
        message: langTranslations.notifications.messages.partnerCreatedTodo.replace('{itemTitle}', itemTitle)
      };
    default:
      return {
        title: 'Nouvel élément',
        message: `Votre partenaire a ajouté un nouvel élément: "${itemTitle}"`
      };
  }
};

export interface CalendarItemNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'event' | 'souvenir' | 'todo';
  data: {
    item_id: string;
    item_type: 'event' | 'souvenir' | 'todo';
    couple_id: string;
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  is_deleted: boolean;
  created_at: string;
}

export const calendarNotificationService = {
  // Create notification when a calendar item is created
  async createCalendarItemNotification(
    itemType: 'event' | 'souvenir' | 'todo',
    itemTitle: string,
    itemId: string,
    coupleId: string,
    creatorId: string,
    language: string = 'fr'
  ): Promise<{ data: CalendarItemNotification | null; error: any }> {
    try {
      // Get the couple data to find the partner
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .single();

      if (coupleError || !coupleData) {
        return { data: null, error: coupleError };
      }

      // Find the partner (the one who didn't create the item)
      const partnerId = coupleData.user1_id === creatorId ? coupleData.user2_id : coupleData.user1_id;

      if (!partnerId) {
        return { data: null, error: 'Partner not found' };
      }

      // Create appropriate notification based on item type
      const { title, message } = getNotificationMessage(itemType, itemTitle, language);
      let type: 'event' | 'daily_question' | 'quiz_invite' | 'general' | 'couple_update';

      switch (itemType) {
        case 'event':
          type = 'event';
          break;
        case 'souvenir':
        case 'todo':
          type = 'couple_update';
          break;
        default:
          return { data: null, error: 'Invalid item type' };
      }

      // Create the notification
      const notificationData = {
        user_id: partnerId,
        title,
        message,
        type,
        data: {
          item_id: itemId,
          item_type: itemType,
          couple_id: coupleId
        },
        priority: 'normal' as const
      };

      const result = await notificationService.createNotification(notificationData);
      return result;

    } catch (error) {
      console.error('Error creating calendar item notification:', error);
      return { data: null, error };
    }
  },

  // Create notification when a calendar item is updated
  async createCalendarItemUpdateNotification(
    itemType: 'event' | 'souvenir' | 'todo',
    itemTitle: string,
    itemId: string,
    coupleId: string,
    updaterId: string
  ): Promise<{ data: CalendarItemNotification | null; error: any }> {
    try {
      // Get the couple data to find the partner
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .single();

      if (coupleError || !coupleData) {
        return { data: null, error: coupleError };
      }

      // Find the partner (the one who didn't update the item)
      const partnerId = coupleData.user1_id === updaterId ? coupleData.user2_id : coupleData.user1_id;

      if (!partnerId) {
        return { data: null, error: 'Partner not found' };
      }

      // Create appropriate notification based on item type
      let title: string;
      let message: string;
      let type: 'event' | 'daily_question' | 'quiz_invite' | 'general' | 'couple_update';

      switch (itemType) {
        case 'event':
          title = 'Événement modifié';
          message = `Votre partenaire a modifié l'événement: "${itemTitle}"`;
          type = 'event';
          break;
        case 'souvenir':
          title = 'Souvenir modifié';
          message = `Votre partenaire a modifié le souvenir: "${itemTitle}"`;
          type = 'couple_update';
          break;
        case 'todo':
          title = 'Tâche modifiée';
          message = `Votre partenaire a modifié la tâche: "${itemTitle}"`;
          type = 'couple_update';
          break;
        default:
          return { data: null, error: 'Invalid item type' };
      }

      // Create the notification
      const notificationData = {
        user_id: partnerId,
        title,
        message,
        type,
        data: {
          item_id: itemId,
          item_type: itemType,
          couple_id: coupleId
        },
        priority: 'normal' as const
      };

      const result = await notificationService.createNotification(notificationData);
      return result;

    } catch (error) {
      console.error('Error creating calendar item update notification:', error);
      return { data: null, error };
    }
  }
};
