# 🌍 Global Questions System

This system allows you to create questions that are available to all users, and when a couple answers them, it creates a personalized instance for that couple.

## How It Works

### 1. **Global Questions (couple_id = NULL)**
- Questions with `couple_id = NULL` are available to ALL users
- They appear in everyone's question list as a complete history
- When a user answers a global question, it creates a couple-specific record
- Questions you've already answered are hidden from the global list
- Only unanswered questions show "📅 Question du jour" (Today's Question)

### 2. **Couple-Specific Questions (couple_id = specific_couple_id)**
- Created automatically when a couple answers a global question
- Only visible to that specific couple
- Show "✅ Question répondue" (Answered Question) indicator
- **Remain visible for chat access and history**
- The global question becomes hidden from the global list

### 3. **Question Flow**
```
Global Question (couple_id: NULL) 
    ↓
Available to ALL users (shows as "📅 Question du jour")
    ↓
User Answers → Creates Couple-Specific Record
    ↓
Global Question Hidden from Global List
Couple-Specific Question Shows "✅ Question répondue"
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

1. **All users see global questions they haven't answered yet** in their questions list
2. **Questions show different statuses**:
   - "📅 Question du jour" for unanswered global questions
   - "✅ Question répondue" for answered couple-specific questions
3. **When a couple answers** a global question:
   - A new `daily_questions` record is created with their `couple_id`
   - The global question becomes hidden from the global list
   - The couple-specific question remains visible for chat access
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
- Global question hidden from global list
- Couple-specific question shows "✅ Question répondue"
- Couple A can chat after both partners answer

### Day 3: Couple B Answers
- Couple B still sees the global question
- Couple B answers → Creates their own couple-specific record
- Global question hidden from global list
- Couple-specific question shows "✅ Question répondue"
- Couple B can chat after both partners answer

### Day 4: New User Joins
- New user sees global questions they haven't answered yet
- All questions show "📅 Question du jour"
- Questions already answered by other couples are hidden

### Day 5: Accessing Chat History
- Couple A can see all their answered questions with "✅ Question répondue"
- They can access chats for any answered question
- Complete history is preserved and accessible

## Technical Details

### Frontend Changes
- `questions.tsx` now fetches both global and couple-specific questions
- Global questions are marked with `isGlobal: true`
- Clean UI with blue borders for answered questions (no extra text indicators)
- Relative date formatting (hier, 2 semaines, etc.)
- Answered global questions are hidden from the global list
- Couple-specific questions remain visible for chat access and history

### Backend Logic
- When answering a global question, creates new `daily_questions` record
- Automatically handles the transition from global to couple-specific
- Maintains all existing functionality (chat, status tracking, etc.)

## Troubleshooting

### Question Not Appearing
- Check if `couple_id` is NULL in `daily_questions` table
- Verify the question exists in the `questions` table
- **Note**: Global questions you've already answered are hidden from the global list
- **Note**: Couple-specific questions remain visible for chat access

### Duplicate Questions
- Global questions should have `couple_id = NULL`
- Couple-specific questions should have `couple_id = couple_uuid`
- Never mix these two types

### Chat Not Working
- Both partners must answer the same question
- Check if the `daily_question_id` matches between answers
- Verify the couple-specific record was created correctly
