-- Cache permanent des previews vocales : aucune régénération Gemini après redémarrage.
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-previews', 'voice-previews', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read voice previews" ON storage.objects;
CREATE POLICY "Public can read voice previews"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-previews');

DROP POLICY IF EXISTS "Service role can manage voice previews" ON storage.objects;
CREATE POLICY "Service role can manage voice previews"
  ON storage.objects FOR ALL
  USING (bucket_id = 'voice-previews' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'voice-previews' AND auth.role() = 'service_role');
