-- Create roadmap_features table
CREATE TABLE public.roadmap_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'under-consideration' CHECK (status IN ('under-consideration', 'planned', 'in-progress', 'shipped', 'unlikely')),
  vote_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roadmap_votes table
CREATE TABLE public.roadmap_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES public.roadmap_features(id) ON DELETE CASCADE,
  voter_identifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(feature_id, voter_identifier)
);

-- Enable Row Level Security
ALTER TABLE public.roadmap_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roadmap_features (completely public)
CREATE POLICY "Anyone can view roadmap features"
  ON public.roadmap_features
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create roadmap features"
  ON public.roadmap_features
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update roadmap features"
  ON public.roadmap_features
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete roadmap features"
  ON public.roadmap_features
  FOR DELETE
  USING (true);

-- RLS Policies for roadmap_votes (public with constraints)
CREATE POLICY "Anyone can view votes"
  ON public.roadmap_votes
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can vote"
  ON public.roadmap_votes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can unvote"
  ON public.roadmap_votes
  FOR DELETE
  USING (true);

-- Trigger to auto-update vote_count
CREATE OR REPLACE FUNCTION public.update_roadmap_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.roadmap_features
    SET vote_count = vote_count + 1
    WHERE id = NEW.feature_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.roadmap_features
    SET vote_count = vote_count - 1
    WHERE id = OLD.feature_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_vote_count
AFTER INSERT OR DELETE ON public.roadmap_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_roadmap_vote_count();

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_roadmap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_roadmap_updated_at
BEFORE UPDATE ON public.roadmap_features
FOR EACH ROW
EXECUTE FUNCTION public.update_roadmap_updated_at();

-- Create indexes for performance
CREATE INDEX idx_roadmap_features_status ON public.roadmap_features(status);
CREATE INDEX idx_roadmap_features_vote_count ON public.roadmap_features(vote_count DESC);
CREATE INDEX idx_roadmap_features_created_at ON public.roadmap_features(created_at DESC);
CREATE INDEX idx_roadmap_votes_feature_id ON public.roadmap_votes(feature_id);
CREATE INDEX idx_roadmap_votes_voter_identifier ON public.roadmap_votes(voter_identifier);