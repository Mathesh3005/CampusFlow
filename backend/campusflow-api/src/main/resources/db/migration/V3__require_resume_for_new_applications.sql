ALTER TABLE applications
    ADD CONSTRAINT chk_applications_resume_required
        CHECK (resume_id IS NOT NULL) NOT VALID;
