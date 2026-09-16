CREATE TABLE staff_review_seen_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  staff_user_id BIGINT UNSIGNED NOT NULL,
  item_type VARCHAR(30) NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_seen_item (staff_user_id, item_type, item_id),
  KEY idx_staff_seen_lookup (staff_user_id, item_type),
  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE
);
