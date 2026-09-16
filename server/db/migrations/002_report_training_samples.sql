ALTER TABLE damage_reports ADD COLUMN camera_scene_objects JSON NULL AFTER ai_confidence_notes;

CREATE TABLE damage_training_samples (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT UNSIGNED NOT NULL,
  report_photo_id BIGINT UNSIGNED NOT NULL,
  crop_type VARCHAR(120) NOT NULL,
  damage_type VARCHAR(120) NOT NULL,
  scene_objects JSON NULL,
  label_status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_training_sample_photo (report_photo_id),
  KEY idx_training_samples_status (label_status, crop_type, damage_type),
  FOREIGN KEY (report_id) REFERENCES damage_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (report_photo_id) REFERENCES report_photos(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
