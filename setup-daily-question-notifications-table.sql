-- Create daily_question_notifications table
CREATE TABLE IF NOT EXISTS public.daily_question_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    daily_question_id UUID NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    question_content TEXT NOT NULL,
    scheduled_for DATE NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_question_notifications_user_id ON public.daily_question_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_question_notifications_couple_id ON public.daily_question_notifications(couple_id);
CREATE INDEX IF NOT EXISTS idx_daily_question_notifications_daily_question_id ON public.daily_question_notifications(daily_question_id);
CREATE INDEX IF NOT EXISTS idx_daily_question_notifications_is_read ON public.daily_question_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_daily_question_notifications_created_at ON public.daily_question_notifications(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_daily_question_notifications_updated_at
    BEFORE UPDATE ON public.daily_question_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.daily_question_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own daily question notifications" ON public.daily_question_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily question notifications" ON public.daily_question_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily question notifications" ON public.daily_question_notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to create daily question notifications
CREATE OR REPLACE FUNCTION public.create_daily_question_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_question_content TEXT;
    v_user1_id UUID;
    v_user2_id UUID;
BEGIN
    -- Get the content of the question
    SELECT content INTO v_question_content
    FROM public.questions
    WHERE id = NEW.question_id;

    -- Get the user IDs from the couple
    SELECT user1_id, user2_id INTO v_user1_id, v_user2_id
    FROM public.couples
    WHERE id = NEW.couple_id;

    -- Insert notification for user1
    IF v_user1_id IS NOT NULL AND v_question_content IS NOT NULL THEN
        INSERT INTO public.daily_question_notifications (
            user_id,
            couple_id,
            daily_question_id,
            question_id,
            question_content,
            scheduled_for
        ) VALUES (
            v_user1_id,
            NEW.couple_id,
            NEW.id,
            NEW.question_id,
            v_question_content,
            NEW.scheduled_for
        );
    END IF;

    -- Insert notification for user2
    IF v_user2_id IS NOT NULL AND v_question_content IS NOT NULL THEN
        INSERT INTO public.daily_question_notifications (
            user_id,
            couple_id,
            daily_question_id,
            question_id,
            question_content,
            scheduled_for
        ) VALUES (
            v_user2_id,
            NEW.couple_id,
            NEW.id,
            NEW.question_id,
            v_question_content,
            NEW.scheduled_for
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new daily_question is inserted
CREATE OR REPLACE TRIGGER trg_new_daily_question_notification
    AFTER INSERT ON public.daily_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.create_daily_question_notifications();
