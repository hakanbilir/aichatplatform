-- Conversation title FTS
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "titleTsv" tsvector;

UPDATE "Conversation"
SET "titleTsv" = to_tsvector('simple', coalesce("title", ''));

CREATE INDEX IF NOT EXISTS conversation_title_tsv_idx
  ON "Conversation" USING GIN ("titleTsv");

CREATE OR REPLACE FUNCTION conversation_title_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW."titleTsv" := to_tsvector('simple', coalesce(NEW."title", ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_title_tsv_update
  BEFORE INSERT OR UPDATE OF "title"
  ON "Conversation"
  FOR EACH ROW EXECUTE FUNCTION conversation_title_tsv_trigger();

-- Message content FTS
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "contentTsv" tsvector;

UPDATE "Message"
SET "contentTsv" = to_tsvector('simple', coalesce("content", ''));

CREATE INDEX IF NOT EXISTS message_content_tsv_idx
  ON "Message" USING GIN ("contentTsv");

CREATE OR REPLACE FUNCTION message_content_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW."contentTsv" := to_tsvector('simple', coalesce(NEW."content", ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_content_tsv_update
  BEFORE INSERT OR UPDATE OF "content"
  ON "Message"
  FOR EACH ROW EXECUTE FUNCTION message_content_tsv_trigger();

