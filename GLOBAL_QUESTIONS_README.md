# 🌍 Global Questions System

This system allows you to create questions that are available to all users, and when a couple answers them, it creates a personalized instance for that couple.

## How It Works

### 1. **Global Questions (couple_id = NULL)**
- Questions with `couple_id = NULL` are available to ALL users
- They appear in everyone's question list
- When a user answers a global question, it creates a couple-specific record

### 2. **Couple-Specific Questions (couple_id = specific_couple_id)**
- Created automatically when a couple answers a global question
- Only visible to that specific couple
- The global question becomes hidden for that couple

### 3. **Question Flow**
```
Global Question (couple_id: NULL) 
    ↓
User Answers
    ↓
Creates Couple-Specific Record (couple_id: user_couple_id)
    ↓
Global Question Hidden for This Couple
    ↓
Couple Can Chat After Both Partners Answer
```

## Database Schema

```sql
-- Global question (available to all users)
INSERT INTO daily_questions (question_id, couple_id, scheduled_for) 
VALUES ('question-uuid', NULL, '2024-01-15');

-- Couple-specific question (created when couple answers)
INSERT INTO daily_questions (question_id, couple_id, scheduled_for) 
VALUES ('question-uuid', 'couple-uuid', '2024-01-15');
```

## How to Use

### 1. **Insert a Global Question**

#### Option A: Using the Script
```bash
# List available questions
node scripts/insert-global-question.js --list

# Insert global question for today
node scripts/insert-global-question.js <question_id>

# Insert global question for specific date
node scripts/insert-global-question.js <question_id> 2024-01-15
```

#### Option B: Direct Database Insert
```sql
INSERT INTO daily_questions (question_id, couple_id, scheduled_for) 
VALUES ('your-question-uuid', NULL, '2024-01-15');
```

### 2. **What Happens Next**

1. **All users see the global question** in their questions list
2. **When a couple answers** the global question:
   - A new `daily_questions` record is created with their `couple_id`
   - The global question (NULL couple_id) becomes hidden for that couple
   - They can now chat after both partners answer

### 3. **Benefits**

- ✅ **Efficient**: One global question serves all users
- ✅ **Personalized**: Each couple gets their own instance when they engage
- ✅ **Scalable**: Easy to manage questions for multiple couples
- ✅ **Clean**: No duplicate questions in the database

## Example Workflow

### Day 1: Create Global Question
```bash
node scripts/insert-global-question.js 123e4567-e89b-12d3-a456-426614174000
```

### Day 2: Couple A Answers
- Couple A sees the global question
- Couple A answers → Creates couple-specific record
- Global question hidden for Couple A
- Couple A can chat after both partners answer

### Day 3: Couple B Answers
- Couple B still sees the global question
- Couple B answers → Creates their own couple-specific record
- Global question hidden for Couple B
- Couple B can chat after both partners answer

## Technical Details

### Frontend Changes
- `questions.tsx` now fetches both global and couple-specific questions
- Global questions are marked with `isGlobal: true`
- UI shows "🌍 Question globale" indicator for global questions

### Backend Logic
- When answering a global question, creates new `daily_questions` record
- Automatically handles the transition from global to couple-specific
- Maintains all existing functionality (chat, status tracking, etc.)

## Troubleshooting

### Question Not Appearing
- Check if `couple_id` is NULL in `daily_questions` table
- Verify `scheduled_for` date matches today
- Ensure the question exists in the `questions` table

### Duplicate Questions
- Global questions should have `couple_id = NULL`
- Couple-specific questions should have `couple_id = couple_uuid`
- Never mix these two types

### Chat Not Working
- Both partners must answer the same question
- Check if the `daily_question_id` matches between answers
- Verify the couple-specific record was created correctly
