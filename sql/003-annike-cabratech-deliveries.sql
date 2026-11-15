-- Record the three deliveries reported as complete in the 15/11/2026 review.
-- The actual delivery dates and evidence were not provided.
WITH applied AS (
  INSERT INTO workspace_data_migrations (migration_key)
  VALUES ('annike-cabratech-reels-delivered-2026-11')
  ON CONFLICT DO NOTHING
  RETURNING migration_key
)
INSERT INTO workspace_records (collection, record_key, position, data)
SELECT 'tasks', task_id, last_position + reel, jsonb_build_object(
  'id', task_id,
  'startup_id', '1',
  'assigned_to', '4',
  'creator_id', '1',
  'source', 'gestao',
  'title', 'Entregar Reel ' || lpad(reel::text, 2, '0') || '/12 · CabraTech',
  'description', 'Entrega concluída conforme balanço de 15/11/2026. A data exata e a evidência da entrega não foram informadas.',
  'priority', 'media',
  'status', 'concluida',
  'checklist', '[]'::jsonb,
  'created_at', now()
)
FROM applied CROSS JOIN generate_series(1, 3) AS reels(reel)
CROSS JOIN LATERAL (SELECT 'annike-cabratech-2026-reel-' || reel AS task_id) AS ids
CROSS JOIN (SELECT coalesce(max(position), -1) AS last_position
            FROM workspace_records WHERE collection = 'tasks') AS positions
ON CONFLICT (collection, record_key) DO NOTHING;
