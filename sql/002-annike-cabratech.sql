-- Apply once, including on an existing installation.
CREATE TABLE IF NOT EXISTS workspace_data_migrations (
  migration_key text PRIMARY KEY
);

WITH applied AS (
  INSERT INTO workspace_data_migrations (migration_key)
  VALUES ('annike-cabratech-reels-2026-10')
  ON CONFLICT DO NOTHING
  RETURNING migration_key
),
schedule(reel, due_date) AS (
  VALUES (4, '2026-11-15'), (5, '2026-11-19'), (6, '2026-11-26'),
         (7, '2026-12-03'), (8, '2026-12-10'), (9, '2026-12-17'),
         (10, '2026-12-24'), (11, '2026-12-31'), (12, '2027-01-07')
)
INSERT INTO workspace_records (collection, record_key, position, data)
SELECT 'tasks', task_id, last_position + reel - 3, jsonb_build_object(
  'id', task_id,
  'startup_id', '1',
  'assigned_to', '4',
  'creator_id', '1',
  'source', 'gestao',
  'title', 'Entregar Reel ' || lpad(reel::text, 2, '0') || '/12 · CabraTech',
  'description', CASE WHEN reel = 4
    THEN 'Entrega em atraso no balanço de 15/11/2026. Dos quatro Reels previstos no primeiro mês, três foram postados.'
    ELSE 'Entrega semanal do contrato de 12 Reels iniciado em 15/10/2026.'
  END || ' Anexe o link ou arquivo do Reel como evidência da entrega.',
  'priority', CASE WHEN reel = 4 THEN 'urgente' ELSE 'media' END,
  'status', 'pendente',
  'planned_date', due_date,
  'due_date', due_date,
  'checklist', '[]'::jsonb,
  'created_at', now()
)
FROM applied CROSS JOIN schedule
CROSS JOIN LATERAL (SELECT 'annike-cabratech-2026-reel-' || reel AS task_id) AS ids
CROSS JOIN (SELECT coalesce(max(position), -1) AS last_position
            FROM workspace_records WHERE collection = 'tasks') AS positions
ON CONFLICT (collection, record_key) DO NOTHING;
