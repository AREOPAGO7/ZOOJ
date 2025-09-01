/**
 * Utilitaires pour la gestion des dates sans décalage de fuseau horaire
 */

/**
 * Convertit une Date en format YYYY-MM-DD en respectant le fuseau horaire local
 * Évite le problème de décalage d'un jour causé par toISOString()
 */
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convertit une Date en format HH:MM:SS en respectant le fuseau horaire local
 */
export const toLocalTimeString = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * Crée une Date à partir d'une chaîne YYYY-MM-DD en respectant le fuseau horaire local
 */
export const fromLocalDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  // Créer la date en heure locale (pas UTC)
  return new Date(year, month - 1, day)
}

/**
 * Crée une Date à partir d'une chaîne HH:MM:SS en respectant le fuseau horaire local
 */
export const fromLocalTimeString = (timeString: string): Date => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, seconds, 0)
  return date
}

/**
 * Combine une date et une heure en une seule Date
 */
export const combineDateAndTime = (date: Date, time: Date): Date => {
  const combined = new Date(date)
  combined.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0)
  return combined
}

/**
 * Vérifie si une date est aujourd'hui
 */
export const isToday = (date: Date): boolean => {
  const today = new Date()
  return toLocalDateString(date) === toLocalDateString(today)
}

/**
 * Vérifie si une date est demain
 */
export const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toLocalDateString(date) === toLocalDateString(tomorrow)
}

/**
 * Formate une date pour l'affichage en français
 */
export const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formate une heure pour l'affichage
 */
export const formatTimeForDisplay = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
