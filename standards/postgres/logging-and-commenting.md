# PostgreSQL Logging and Commenting Standards

## Overview
Comprehensive logging and commenting enable debugging, performance monitoring, and maintenance. Follow these standards for all PostgreSQL functions and scripts.

---

## Function Header Comments

### Comprehensive Block Comment
Every function MUST begin with a detailed header comment:

```sql
/* ========================================================================================================

This function will get or create participant records and update the calling function on the ids of the records
it found or created. It also creates person_protected records for PII and enrollments linking participants to programs.

Objective: Update the participant_id, participant_entity_id, person_id, and enrollment_id in the staging table that calls it by:
    1. Looking to participants (and entities) that already exist and returning those ids
    2. Creating the participants (and entities) that do not exist and returning those ids
    3. Creating person_protected records for PII data
    4. Creating enrollments linking participants to programs
    5. Tracking the count of records it processes, how many were found, created and errored

DESTINATION FIELDS
    public.entities
        entity_id                 UUID NOT NULL PK
        entity_type               text NOT NULL,
        source_system             text NOT NULL,
        source_primary_key        text NOT NULL,
        import_file               text NOT NULL,

    public.person_protected
        person_id                 uuid NOT NULL PK,
        entity_id                 uuid NOT NULL,
        first_name_encrypted      bytea,
        last_name_encrypted       bytea,

    public.participants
        participant_id            uuid NOT NULL PK,
        entity_id                 uuid NOT NULL,
        person_id                 uuid NOT NULL,

STEP-BY-STEP PROCESS:
    1. INITIALIZE
    2. VALIDATE INPUT
    3. EXTRACT AND NORMALIZE STAGING DATA
    4. MATCH EXISTING PARTICIPANTS
    5. CREATE NEW PERSON_PROTECTED and PARTICIPANTS
    6. CREATE ENROLLMENTS
    7. UPDATE Staging with Resolved Ids
    8. UPDATE Staging Error Messages
    9. RETURN METRICS
    10. ERROR HANDLING

COLUMN MAPPING USAGE:
   - Pass column names as JSONB mapping
   - Use empty string ("") for columns that don't exist in source table
   - REQUIRED FIELDS (must not be empty):
     * participant_primary_key - Used as unique identifier for the participant (e.g., client_id)
     * first_name - Required for person_protected record
     * last_name - Required for person_protected record
   - RECOMMENDED FIELDS:
     * staging_id - Needed to update source records with resolved IDs
     * start_date - For enrollment record (defaults to current date if empty)

   NOTE: Only processes rows that have resolved programs

Example:
  note: the json format is: temp_table_column_name, source_table_column_name

   SELECT * FROM import.f_resolve_participants(
       'payroll_register',
       'arborsoft',
       'ARBORSOFT',
       '123e4567-e89b-12d3-a456-426614174000'::uuid,
       '{
           "staging_id": "staging_id",
           "participant_primary_key": "client_id",
           "first_name": "parsed_participant_first_name",
           "last_name": "parsed_participant_last_name",
           "start_date": "parsed_effective_date"
       }'::jsonb
   );

======================================================================================================== */
```

### Header Comment Sections (Required)

1. **Purpose Statement**: Brief description of what the function does
2. **Objective**: Numbered list of specific goals
3. **Destination Fields**: Target table schemas with field types
4. **Step-by-Step Process**: Numbered outline matching code sections
5. **Column Mapping Usage**: Parameter documentation with examples
6. **Usage Example**: Executable SQL showing function call

---

## Progress Logging with RAISE NOTICE

### Section Headers
Use clear visual separators with RAISE NOTICE:

```sql
RAISE NOTICE '';
RAISE NOTICE '  ------------------------  Step 4: RESOLVE PARTICIPANTS   ------------------------';
```

### Debug Logging
Prefix debug messages consistently:

```sql
RAISE NOTICE '    → Debug: Processed % rows into temp table', v_processed;
RAISE NOTICE '    → Debug: Found % unique participants', v_unique_participants;
RAISE NOTICE '    → Debug: Found % unique enrollments', v_unique_enrollments;
RAISE NOTICE '    → Debug: After matching, found % existing participants', v_found;
RAISE NOTICE '    → Debug: % records still need participants created', (SELECT COUNT(*) FROM temp_participant_work WHERE resolved_participant_id IS NULL);
```

### Warning Messages
Use WARNING prefix for issues:

```sql
RAISE NOTICE '  4 - WARNING: % records failed to resolve', v_errors;
RAISE NOTICE '  X - WARNING: Metric invariant violation! processed (%) != succeeded (%) + errored (%)',
             v_processed, v_rows_succeeded, v_errors;
```

### Completion Messages
Log completion with metrics:

```sql
RAISE NOTICE '    → Debug: Created % new participants', v_created;
RAISE NOTICE '    → Debug: Updated % staging rows with resolved IDs', v_rows_succeeded;
RAISE NOTICE '    → Debug: Updated % rows to ERROR status', v_temp_count;
```

---

## Inline Comments

### Section Markers
Mark each major step with horizontal rules:

```sql
-----------------------------------------------------------------------------------------------------------
-- 1. INITIALIZE
-----------------------------------------------------------------------------------------------------------
-- Suppress NOTICE for DROP TABLE IF EXISTS
SET LOCAL client_min_messages = WARNING;
DROP TABLE IF EXISTS temp_participant_work;
SET LOCAL client_min_messages = NOTICE;

CREATE TEMP TABLE temp_participant_work (
    ...
) ON COMMIT DROP;
```

### Subsection Markers
Use single-line comments for subsections:

```sql
-- 5a. First create person_protected entities
INSERT INTO public.entities (...)
...

-- 5b. Create person_protected records
WITH persons_to_create AS (...)
INSERT INTO public.person_protected (...)
...

-- 5c. Create participant entities
INSERT INTO public.entities (...)
...

-- 5d. Create participant records
WITH participants_to_create AS (...)
INSERT INTO public.participants (...)
...
```

### Explain Complex Logic
Add inline explanations for non-obvious operations:

```sql
-- Count total rows staged (before we started processing)
EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE batch_id = %L AND import_status = ''IN_PROCESS''',
               p_source_schema, p_source_table, p_batch_id) INTO v_staged;

-- Count rows already resolved (skipped)
EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE batch_id = %L AND import_status = ''IN_PROCESS'' AND resolved_program_id IS NOT NULL',
               p_source_schema, p_source_table, p_batch_id) INTO v_skipped;
```

---

## Metric Logging Pattern

### Track All Key Metrics
```sql
-- Add row-level metrics
RAISE NOTICE '';
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'rows_staged', v_staged);
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'rows_skipped', v_skipped);
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'rows_processed', v_processed);
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'rows_succeeded', v_rows_succeeded);
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'rows_errored', v_errors);

-- Add entity-level metrics
RAISE NOTICE '';
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'uniq_entities_in_batch', v_unique_participants);
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'entities_found_in_public', v_found);
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'entities_added', v_created);
PERFORM audit.f_add_metric(p_batch_id, v_step_name, v_entity_type, 'entities_missed', CASE WHEN v_errors = 0 THEN 0 ELSE v_unique_participants - v_created END);
```

### Validate Metric Invariants
```sql
-- Validate primary invariant: processed = succeeded + errored
IF (v_rows_succeeded + v_errors) <> v_processed THEN
    RAISE NOTICE '  4 - WARNING: Metric invariant violation! processed (%) != succeeded (%) + errored (%)',
                 v_processed, v_rows_succeeded, v_errors;
END IF;

-- Validate secondary invariant: staged = processed + skipped
IF (v_processed + v_skipped) <> v_staged THEN
    RAISE NOTICE '  4 - WARNING: Metric invariant violation! staged (%) != processed (%) + skipped (%)',
                 v_staged, v_processed, v_skipped;
END IF;

-- Validate entity-level invariant: unique = found + added + missed
IF (v_found + v_created + (v_unique_participants - v_found - v_created)) <> v_unique_participants THEN
    RAISE NOTICE '  4 - WARNING: Entity invariant violation! unique participants (%) != found (%) + added (%) + missed (%)',
                 v_unique_participants, v_found, v_created, (v_unique_participants - v_found - v_created);
END IF;
```

---

## Error Handling and Logging

### Exception Blocks
```sql
EXCEPTION WHEN OTHERS THEN
    -- Log error and return metrics
    RAISE NOTICE 'Error in f_resolve_participants: %', SQLERRM;

    -- Mark all unresolved records as errors
    BEGIN
        EXECUTE format('
            UPDATE %I.%I
            SET import_status = ''ERROR'',
                error_message = ''Participant resolution failed: %s''
            WHERE batch_id = %L
              AND resolved_participant_id IS NULL
              AND resolved_program_id IS NOT NULL
              AND import_status != ''ERROR''',
            p_source_schema,
            p_source_table,
            REPLACE(SQLERRM, '''', ''''''),  -- Escape single quotes in error message
            p_batch_id
        );
    EXCEPTION WHEN OTHERS THEN
        -- If we can't update staging, at least log it
        RAISE NOTICE 'Could not update staging table with error: %', SQLERRM;
    END;

    RETURN QUERY
    SELECT v_processed, v_found, v_created, v_enrollments, v_errors;
END;
```

---

## Best Practices Summary

1. **Comprehensive Headers**: Include purpose, objective, schemas, steps, usage examples
2. **Section Headers**: Use RAISE NOTICE with visual separators for major steps
3. **Debug Logging**: Prefix with "→ Debug:" and include metric values
4. **Warning Logging**: Prefix with "WARNING:" for issues and invariant violations
5. **Horizontal Rules**: Use `---...---` separators for major sections
6. **Subsection Comments**: Use single-line comments (--) for subsections (e.g., "5a. First create...")
7. **Metric Tracking**: Log all metrics with audit.f_add_metric()
8. **Invariant Validation**: Verify metric math and log violations
9. **Error Context**: Include SQLERRM in error messages for debugging
10. **Consistent Prefixes**: p_ for parameters, v_ for variables in logs
