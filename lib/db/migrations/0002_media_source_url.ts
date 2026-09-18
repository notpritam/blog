export const name = '0002_media_source_url';
export const sql = `
ALTER TABLE media ADD COLUMN source_url TEXT;
CREATE INDEX media_source_url_idx ON media(source_url);
`;
