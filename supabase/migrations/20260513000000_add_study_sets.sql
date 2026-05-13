CREATE TABLE IF NOT EXISTS public.study_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Set',
  cards JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study sets"   ON public.study_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study sets" ON public.study_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sets" ON public.study_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study sets" ON public.study_sets FOR DELETE USING (auth.uid() = user_id);
