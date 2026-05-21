## PostgreSQL Audit and Metrics Pattern

### Overview
The audit schema provides comprehensive tracking of import batches, processing steps, and metrics. This enables debugging, performance analysis, and data lineage tracking.

### Schema Setup
```sql
CREATE SCHEMA IF NOT EXISTS audit;
COMMENT ON SCHEMA audit IS 'Audit logging, import tracking, and metrics';
```

### Core Audit Tables

#### Import Batches
Tracks each import job from start to completion.
```sql
CREATE TABLE audit.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source identification
    source_system TEXT NOT NULL REFERENCES config.source_system_lookup(value),
    source_filename TEXT,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending'
        REFERENCES config.import_status_lookup(value),
    error_message TEXT,

    -- Optional metadata
    triggered_by TEXT,
    configuration JSONB
);

CREATE INDEX idx_import_batches_source ON audit.import_batches(source_system);
CREATE INDEX idx_import_batches_status ON audit.import_batches(status);
CREATE INDEX idx_import_batches_started ON audit.import_batches(started_at);
```

#### Import Steps
Logs each step within a batch for debugging and traceability.
```sql
CREATE TABLE audit.import_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES audit.import_batches(id),

    -- Step identification
    step_name TEXT NOT NULL,
    message TEXT,

    -- Timing
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER
);

CREATE INDEX idx_import_steps_batch ON audit.import_steps(batch_id);
CREATE INDEX idx_import_steps_step ON audit.import_steps(step_name);
```

#### Import Metrics
Stores quantitative metrics for each batch.
```sql
CREATE TABLE audit.import_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES audit.import_batches(id),

    -- Metric data
    metric_name TEXT NOT NULL REFERENCES config.metrics_lookup(value),
    metric_value NUMERIC NOT NULL,

    -- Timing
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_metrics_batch ON audit.import_metrics(batch_id);
CREATE INDEX idx_import_metrics_name ON audit.import_metrics(metric_name);
```

### Audit Helper Functions

#### Start Batch
```sql
CREATE OR REPLACE FUNCTION audit.f_start_batch(
    p_source_system TEXT,
    p_source_filename TEXT DEFAULT NULL,
    p_triggered_by TEXT DEFAULT NULL,
    p_configuration JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch_id UUID;
BEGIN
    -- Validate source system
    IF NOT EXISTS (SELECT 1 FROM config.source_system_lookup WHERE value = p_source_system AND is_active = TRUE) THEN
        RAISE EXCEPTION 'Invalid source system: %', p_source_system;
    END IF;

    INSERT INTO audit.import_batches (
        source_system,
        source_filename,
        status,
        triggered_by,
        configuration
    )
    VALUES (
        p_source_system,
        p_source_filename,
        'processing',
        p_triggered_by,
        p_configuration
    )
    RETURNING id INTO v_batch_id;

    -- Log initial step
    PERFORM audit.f_log_import_step(v_batch_id, 'BATCH_STARTED', 'Import batch initiated');

    RETURN v_batch_id;
END;
$$;
```

#### Complete Batch
```sql
CREATE OR REPLACE FUNCTION audit.f_complete_batch(
    p_batch_id UUID,
    p_status TEXT DEFAULT 'completed',
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate status
    IF NOT EXISTS (SELECT 1 FROM config.import_status_lookup WHERE value = p_status) THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    UPDATE audit.import_batches
    SET completed_at = NOW(),
        status = p_status,
        error_message = p_error_message
    WHERE id = p_batch_id;

    -- Log completion step
    PERFORM audit.f_log_import_step(p_batch_id, 'BATCH_COMPLETED',
        COALESCE(p_error_message, format('Batch completed with status: %s', p_status)));
END;
$$;
```

#### Log Import Step
```sql
CREATE OR REPLACE FUNCTION audit.f_log_import_step(
    p_batch_id UUID,
    p_step_name TEXT,
    p_message TEXT DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit.import_steps (
        batch_id,
        step_name,
        message,
        duration_ms
    )
    VALUES (
        p_batch_id,
        p_step_name,
        p_message,
        p_duration_ms
    );
END;
$$;
```

#### Add Metric
```sql
CREATE OR REPLACE FUNCTION audit.f_add_metric(
    p_batch_id UUID,
    p_metric_name TEXT,
    p_metric_value NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate metric name
    IF NOT EXISTS (SELECT 1 FROM config.metrics_lookup WHERE value = p_metric_name) THEN
        RAISE EXCEPTION 'Invalid metric name: %', p_metric_name;
    END IF;

    INSERT INTO audit.import_metrics (
        batch_id,
        metric_name,
        metric_value
    )
    VALUES (
        p_batch_id,
        p_metric_name,
        p_metric_value
    );
END;
$$;
```

### Standard Metrics

#### Required Metrics
Every resolve function must log these metrics:
| Metric Name       | Description                          | Type  |
|-------------------|--------------------------------------|-------|
| rows_staged       | Records loaded into staging          | count |
| rows_processed    | Records processed by resolve         | count |
| rows_succeeded    | Records successfully resolved        | count |
| rows_errored      | Records with errors                  | count |
| entities_found    | Existing entities matched            | count |
| entities_added    | New entities created                 | count |

#### Optional Metrics
| Metric Name             | Description                    | Type     |
|-------------------------|--------------------------------|----------|
| processing_duration_ms  | Total processing time          | duration |
| validation_errors       | Validation error count         | count |
| transform_errors        | Transformation error count     | count |
| file_size_bytes         | Source file size               | count |

### Metric Invariants

#### Basic Invariants
```sql
-- processed = succeeded + errored
-- This MUST always be true
IF v_rows_processed <> (v_rows_succeeded + v_rows_errored) THEN
    RAISE EXCEPTION 'Invariant violation: processed (%) <> succeeded (%) + errored (%)',
        v_rows_processed, v_rows_succeeded, v_rows_errored;
END IF;

-- succeeded = found + created (for entity resolution)
IF v_rows_succeeded <> (v_entities_found + v_entities_added) THEN
    RAISE EXCEPTION 'Invariant violation: succeeded (%) <> found (%) + created (%)',
        v_rows_succeeded, v_entities_found, v_entities_added;
END IF;
```

#### Validation Function
```sql
CREATE OR REPLACE FUNCTION audit.f_validate_batch_metrics(
    p_batch_id UUID
) RETURNS TABLE (
    invariant_name TEXT,
    is_valid BOOLEAN,
    details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_staged NUMERIC;
    v_processed NUMERIC;
    v_succeeded NUMERIC;
    v_errored NUMERIC;
    v_found NUMERIC;
    v_added NUMERIC;
BEGIN
    -- Get metrics
    SELECT metric_value INTO v_staged FROM audit.import_metrics WHERE batch_id = p_batch_id AND metric_name = 'rows_staged';
    SELECT metric_value INTO v_processed FROM audit.import_metrics WHERE batch_id = p_batch_id AND metric_name = 'rows_processed';
    SELECT metric_value INTO v_succeeded FROM audit.import_metrics WHERE batch_id = p_batch_id AND metric_name = 'rows_succeeded';
    SELECT metric_value INTO v_errored FROM audit.import_metrics WHERE batch_id = p_batch_id AND metric_name = 'rows_errored';
    SELECT metric_value INTO v_found FROM audit.import_metrics WHERE batch_id = p_batch_id AND metric_name = 'entities_found';
    SELECT metric_value INTO v_added FROM audit.import_metrics WHERE batch_id = p_batch_id AND metric_name = 'entities_added';

    -- Check invariants
    RETURN QUERY SELECT
        'processed_equals_succeeded_plus_errored'::TEXT,
        (v_processed = v_succeeded + v_errored),
        format('processed=%s, succeeded=%s, errored=%s', v_processed, v_succeeded, v_errored);

    RETURN QUERY SELECT
        'succeeded_equals_found_plus_added'::TEXT,
        (v_succeeded = v_found + v_added),
        format('succeeded=%s, found=%s, added=%s', v_succeeded, v_found, v_added);

    RETURN QUERY SELECT
        'staged_gte_processed'::TEXT,
        (v_staged >= v_processed),
        format('staged=%s, processed=%s', v_staged, v_processed);
END;
$$;
```

### Query Patterns

#### Batch Summary
```sql
SELECT
    b.id,
    b.source_system,
    b.source_filename,
    b.status,
    b.started_at,
    b.completed_at,
    EXTRACT(EPOCH FROM (b.completed_at - b.started_at)) AS duration_seconds,
    (SELECT metric_value FROM audit.import_metrics m WHERE m.batch_id = b.id AND m.metric_name = 'rows_processed') AS rows_processed,
    (SELECT metric_value FROM audit.import_metrics m WHERE m.batch_id = b.id AND m.metric_name = 'rows_errored') AS rows_errored
FROM audit.import_batches b
WHERE b.started_at >= NOW() - INTERVAL '7 days'
ORDER BY b.started_at DESC;
```

#### Step Timeline
```sql
SELECT
    step_name,
    message,
    logged_at,
    duration_ms,
    logged_at - LAG(logged_at) OVER (ORDER BY logged_at) AS time_since_previous
FROM audit.import_steps
WHERE batch_id = 'your-batch-uuid'
ORDER BY logged_at;
```

#### Error Analysis
```sql
SELECT
    b.source_system,
    COUNT(*) AS total_batches,
    SUM(CASE WHEN b.status = 'failed' THEN 1 ELSE 0 END) AS failed_batches,
    SUM(CASE WHEN b.status = 'completed_with_errors' THEN 1 ELSE 0 END) AS partial_failures,
    AVG(m.metric_value) FILTER (WHERE m.metric_name = 'rows_errored') AS avg_errors
FROM audit.import_batches b
LEFT JOIN audit.import_metrics m ON m.batch_id = b.id
WHERE b.started_at >= NOW() - INTERVAL '30 days'
GROUP BY b.source_system;
```

### Best Practices

1. **Always log step transitions** - Use f_log_import_step at each phase
2. **Log metrics incrementally** - Don't wait until the end
3. **Validate invariants** - Check metric consistency before completion
4. **Include duration** - Track timing for performance analysis
5. **Store configuration** - Keep JSONB of import settings for debugging
6. **Retain history** - Don't delete audit records, archive if needed
