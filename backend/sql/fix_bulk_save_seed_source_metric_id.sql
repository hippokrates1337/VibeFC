-- =============================================================================
-- Fix: SEED node sourceMetricId cleared after "Save forecast"
-- Cause: bulk_save_forecast_graph assigns new UUIDs to every node but stored
--        attributes verbatim. SEED.sourceMetricId still pointed at the *client*
--        METRIC id; after reload that id is not in the graph, so
--        cleanOrphanedReferences() stripped it. Edges were already remapped via id_map.
-- Run in Supabase SQL Editor (replaces bulk_save_forecast_graph).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bulk_save_forecast_graph(
  p_forecast_id UUID,
  p_forecast_data JSONB,
  p_nodes_data JSONB,
  p_edges_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_forecast RECORD;
  id_map JSONB := '{}'::JSONB;
  node JSONB;
  new_id UUID;
  edge JSONB;
  sid TEXT;
  tid TEXT;
  v_nodes JSONB;
  v_edges JSONB;
  attrs JSONB;
  v_start date;
  v_end date;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.forecasts WHERE id = p_forecast_id) THEN
    RAISE EXCEPTION 'Forecast not found: %', p_forecast_id;
  END IF;

  SELECT forecast_start_date, forecast_end_date INTO v_start, v_end FROM public.forecasts WHERE id = p_forecast_id;

  v_start := COALESCE(
    (NULLIF(trim(p_forecast_data->>'forecastStartDate'), ''))::date,
    v_start
  );
  v_end := COALESCE(
    (NULLIF(trim(p_forecast_data->>'forecastEndDate'), ''))::date,
    v_end
  );

  UPDATE public.forecasts SET
    name = COALESCE(p_forecast_data->>'name', name),
    forecast_start_date = v_start,
    forecast_end_date = v_end,
    forecast_start_month = to_char(v_start, 'MM-YYYY'),
    forecast_end_month = to_char(v_end, 'MM-YYYY'),
    actual_start_month = COALESCE(NULLIF(p_forecast_data->>'actualStartMonth', ''), actual_start_month),
    actual_end_month = COALESCE(NULLIF(p_forecast_data->>'actualEndMonth', ''), actual_end_month),
    updated_at = NOW()
  WHERE id = p_forecast_id;

  DELETE FROM public.forecast_edges WHERE forecast_id = p_forecast_id;
  DELETE FROM public.forecast_nodes WHERE forecast_id = p_forecast_id;

  -- Phase 1: map every client node id -> new DB id (same as before, without insert)
  FOR node IN SELECT * FROM jsonb_array_elements(COALESCE(p_nodes_data, '[]'::jsonb))
  LOOP
    new_id := gen_random_uuid();
    id_map := id_map || jsonb_build_object(node->>'clientId', to_jsonb(new_id::text));
  END LOOP;

  -- Phase 2: insert with SEED attributes rewritten to reference new METRIC ids
  FOR node IN SELECT * FROM jsonb_array_elements(COALESCE(p_nodes_data, '[]'::jsonb))
  LOOP
    new_id := (id_map->>(node->>'clientId'))::uuid;
    attrs := COALESCE(node->'attributes', '{}'::jsonb);

    IF (node->>'kind') = 'SEED'
       AND attrs ? 'sourceMetricId'
       AND (attrs->>'sourceMetricId') IS NOT NULL
       AND (attrs->>'sourceMetricId') <> ''
       AND id_map ? (attrs->>'sourceMetricId')
    THEN
      attrs := jsonb_set(
        attrs,
        '{sourceMetricId}',
        to_jsonb(id_map->>(attrs->>'sourceMetricId'))
      );
    ELSIF (node->>'kind') = 'OPERATOR' AND attrs ? 'inputOrder' THEN
      attrs := jsonb_set(
        attrs,
        '{inputOrder}',
        (
          SELECT COALESCE(
            jsonb_agg(
              CASE WHEN id_map ? e THEN to_jsonb(id_map->>e) ELSE to_jsonb(e) END
              ORDER BY ord
            ),
            '[]'::jsonb
          )
          FROM jsonb_array_elements_text(attrs->'inputOrder') WITH ORDINALITY AS t(e, ord)
        )
      );
    END IF;

    INSERT INTO public.forecast_nodes (id, forecast_id, kind, attributes, position, created_at, updated_at)
    VALUES (
      new_id,
      p_forecast_id,
      (node->>'kind')::forecast_node_kind_enum,
      attrs,
      COALESCE(node->'position', '{"x": 0, "y": 0}'::jsonb),
      NOW(),
      NOW()
    );
  END LOOP;

  FOR edge IN SELECT * FROM jsonb_array_elements(COALESCE(p_edges_data, '[]'::jsonb))
  LOOP
    sid := id_map->>(edge->>'sourceClientId');
    tid := id_map->>(edge->>'targetClientId');
    IF sid IS NULL OR tid IS NULL THEN
      RAISE EXCEPTION 'Invalid edge client reference: % -> %', edge->>'sourceClientId', edge->>'targetClientId';
    END IF;
    INSERT INTO public.forecast_edges (id, forecast_id, source_node_id, target_node_id, created_at)
    VALUES (
      gen_random_uuid(),
      p_forecast_id,
      sid::uuid,
      tid::uuid,
      NOW()
    );
  END LOOP;

  SELECT * INTO v_forecast FROM public.forecasts WHERE id = p_forecast_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fn.id,
      'forecastId', fn.forecast_id,
      'kind', fn.kind,
      'attributes', fn.attributes,
      'position', fn.position,
      'createdAt', to_char(fn.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'updatedAt', to_char(fn.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  ), '[]'::jsonb) INTO v_nodes
  FROM public.forecast_nodes fn
  WHERE fn.forecast_id = p_forecast_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fe.id,
      'forecastId', fe.forecast_id,
      'sourceNodeId', fe.source_node_id,
      'targetNodeId', fe.target_node_id,
      'createdAt', to_char(fe.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  ), '[]'::jsonb) INTO v_edges
  FROM public.forecast_edges fe
  WHERE fe.forecast_id = p_forecast_id;

  RETURN jsonb_build_object(
    'id', v_forecast.id,
    'name', v_forecast.name,
    'forecastStartDate', v_forecast.forecast_start_date::text,
    'forecastEndDate', v_forecast.forecast_end_date::text,
    'organizationId', v_forecast.organization_id,
    'userId', v_forecast.user_id,
    'createdAt', to_char(v_forecast.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(v_forecast.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'forecastStartMonth', v_forecast.forecast_start_month,
    'forecastEndMonth', v_forecast.forecast_end_month,
    'actualStartMonth', v_forecast.actual_start_month,
    'actualEndMonth', v_forecast.actual_end_month,
    'nodes', v_nodes,
    'edges', v_edges
  );
END;
$$;
