-- Ajouter le champ alarmable à la table calendar_events
-- Exécutez ce script dans votre Supabase SQL Editor

-- Ajouter la colonne alarmable
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS alarmable BOOLEAN DEFAULT TRUE;

-- Mettre à jour les événements existants pour qu'ils soient alarmables par défaut
UPDATE calendar_events 
SET alarmable = TRUE 
WHERE alarmable IS NULL;

-- Vérifier que la colonne a été ajoutée
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'calendar_events' 
AND column_name = 'alarmable';

-- Afficher quelques exemples d'événements avec le nouveau champ
SELECT 
  id,
  title,
  event_date,
  alarmable,
  created_at
FROM calendar_events 
LIMIT 5;
