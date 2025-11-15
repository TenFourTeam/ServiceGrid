-- Rename pages tables to notes tables
ALTER TABLE sg_pages RENAME TO sg_notes;
ALTER TABLE sg_page_versions RENAME TO sg_note_versions;
ALTER TABLE sg_page_collaborators RENAME TO sg_note_collaborators;

-- Rename columns that reference pages
ALTER TABLE sg_notes RENAME COLUMN parent_page_id TO parent_note_id;
ALTER TABLE sg_note_versions RENAME COLUMN page_id TO note_id;
ALTER TABLE sg_note_collaborators RENAME COLUMN page_id TO note_id;
ALTER TABLE sg_media RENAME COLUMN page_id TO note_id;

-- Rename indexes
ALTER INDEX idx_sg_pages_business RENAME TO idx_sg_notes_business;
ALTER INDEX idx_sg_pages_job RENAME TO idx_sg_notes_job;
ALTER INDEX idx_sg_pages_created_by RENAME TO idx_sg_notes_created_by;
ALTER INDEX idx_sg_pages_parent RENAME TO idx_sg_notes_parent;
ALTER INDEX idx_sg_page_versions_page RENAME TO idx_sg_note_versions_note;
ALTER INDEX idx_sg_page_collaborators_page RENAME TO idx_sg_note_collaborators_note;
ALTER INDEX idx_sg_page_collaborators_user RENAME TO idx_sg_note_collaborators_user;
ALTER INDEX idx_sg_media_page RENAME TO idx_sg_media_note;