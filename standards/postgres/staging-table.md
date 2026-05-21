# PostgreSQL Staging Table Pattern

## Overview
Staging tables are the foundation of reliable data pipelines. This standard defines production-grade staging table patterns including file-based deduplication, row hashing, and change detection strategies for PostgreSQL-based data pipelines.

---

## Core Principle: File Name + Row Hash Uniqueness

### Uniqueness Guarantee Pattern

**Rule**: The combination of `import_file` + `row_hash` MUST be unique to prevent duplicate data imports.

```sql
-- REQUIRED: Unique constraint on file + row hash
CREATE UNIQUE INDEX uq_staging_file_row_hash ON staging.table_name (import_file, row_hash);
```

**Why this works**:
1. **Same file imported twice**: Duplicate `import_file` + identical `row_hash` → constraint violation → duplicate prevented
2. **Same data from different files**: Different `import_file` but identical `row_hash` → allowed (legitimate duplicate from different source)
3. **Different data from same file**: Same `import_file` but different `row_hash` → allowed (normal case)

---

## Hash Column Types and Usage

### 1. row_hash - Business Key Hash (REQUIRED)

**Purpose**: Detect duplicate records based on business-meaningful columns (natural key).

**Includes**: Only columns that uniquely identify the business entity
**Excludes**: Timestamps, audit fields, surrogate keys, transactional data

```sql
-- Example: Participant record
row_hash = MD5(
    source_system ||
    source_participant_id ||
    participant_first_name ||
    participant_last_name ||
    participant_dob
)

-- Example: Payment record
row_hash = MD5(
    source_system ||
    check_number ||
    check_date ||
    vendor_id ||
    amount
)
```

**Python Implementation**:
```python
import hashlib
from typing import List, Dict, Any

def compute_row_hash(row: Dict[str, Any], key_columns: List[str]) -> str:
    """
    Compute MD5 hash of business key columns.

    Args:
        row: Dictionary of column values
        key_columns: List of column names to include in hash

    Returns:
        32-character hexadecimal MD5 hash
    """
    # Concatenate key column values, converting to string and handling nulls
    hash_input = ''.join([
        str(row.get(col, '')).strip()
        for col in key_columns
    ])

    # Compute MD5 hash
    return hashlib.md5(hash_input.encode('utf-8')).hexdigest()

# Example usage
row = {
    'source_system': 'ARBORSOFT',
    'participant_id': 'P12345',
    'first_name': 'John',
    'last_name': 'Doe',
    'dob': '1980-01-15',
    'check_amount': 1250.00  # Excluded from hash
}

key_columns = ['source_system', 'participant_id', 'first_name', 'last_name', 'dob']
row_hash = compute_row_hash(row, key_columns)
# Result: 'a7f3b2c1d4e5f6a8b9c0d1e2f3a4b5c6'
```

**PostgreSQL Implementation**:
```sql
-- Add computed column or trigger
CREATE OR REPLACE FUNCTION staging.compute_row_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.row_hash := MD5(
        COALESCE(NEW.source_system, '') ||
        COALESCE(NEW.source_participant_id, '') ||
        COALESCE(NEW.participant_first_name, '') ||
        COALESCE(NEW.participant_last_name, '') ||
        COALESCE(NEW.participant_dob::TEXT, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_row_hash
    BEFORE INSERT OR UPDATE ON staging.participants
    FOR EACH ROW
    EXECUTE FUNCTION staging.compute_row_hash();

-- Document the function and trigger
COMMENT ON FUNCTION staging.compute_row_hash() IS
    'Automatically computes MD5 hash of business key columns before insert/update. Ensures row_hash is always current and prevents manual hash computation errors.';

COMMENT ON TRIGGER trg_compute_row_hash ON staging.participants IS
    'Automatically populates row_hash column on insert/update. Fires before row is written to ensure hash is included in uniqueness constraint check.';
```

### 2. full_row_hash - Complete Data Hash (RECOMMENDED)

**Purpose**: Detect if ANY column has changed (for incremental loads and change detection).
**Includes**: ALL data columns except metadata (staging_id, batch_id, created_at, etc.)
**Excludes**: Only system-generated metadata

```sql
full_row_hash = MD5(
    source_participant_id ||
    participant_first_name ||
    participant_last_name ||
    participant_dob ||
    address_line_1 ||
    address_line_2 ||
    city ||
    state ||
    postal_code ||
    email ||
    phone ||
    enrollment_date ||
    termination_date ||
    status
)
```

**Usage**:
```sql
-- Detect changed records by comparing to previous load
WITH previous_load AS (
    SELECT source_participant_id, full_row_hash
    FROM staging.participants
    WHERE batch_id = '123e4567-e89b-12d3-a456-426614174000'  -- Previous batch
)
SELECT
    curr.*,
    CASE
        WHEN prev.source_participant_id IS NULL THEN 'INSERT'
        WHEN curr.full_row_hash != prev.full_row_hash THEN 'UPDATE'
        ELSE 'UNCHANGED'
    END as change_type
FROM staging.participants curr
LEFT JOIN previous_load prev
    ON curr.source_participant_id = prev.source_participant_id
WHERE curr.batch_id = 'current-batch-id';
```

### 3. source_key_hash - Natural Key Hash (OPTIONAL)

**Purpose**: Fast lookups when joining on multi-column natural keys.
**Includes**: Source system identifier + source primary key only

```sql
source_key_hash = MD5(source_system || source_participant_id)
```

**Usage**:
```sql
-- Fast lookup by natural key using single-column index
CREATE INDEX idx_staging_source_key_hash
    ON staging.participants(source_key_hash);

-- Query
SELECT * FROM staging.participants
WHERE source_key_hash = MD5('ARBORSOFT' || 'P12345');
```
---

## Standard Staging Table Template

### Complete Table Definition

```sql
CREATE TABLE staging.{table_name} (
    -- ============================================================================
    -- IDENTITY AND TRACKING
    -- ============================================================================
    staging_id              BIGSERIAL,        

    -- ============================================================================
    -- SOURCE TRACKING (REQUIRED)
    -- ============================================================================
    import_file             TEXT NOT NULL,  -- Full filename with timestamp and UUID
    import_date             DATE NOT NULL,  -- Partition key (YYYY-MM-DD of import)
    source_row_number       INTEGER NOT NULL,  -- Line number in source file
    source_system           TEXT NOT NULL,     -- Source system identifier

    -- ============================================================================
    -- HASH COLUMNS (REQUIRED FOR DEDUPLICATION)
    -- ============================================================================
    row_hash                TEXT NOT NULL,  -- MD5 of business key columns
    full_row_hash           TEXT,           -- MD5 of ALL data columns (optional but recommended)

    -- ============================================================================
    -- SOURCE DATA COLUMNS (APPLICATION-SPECIFIC)
    -- ============================================================================
    -- Add your source columns here
    -- Example:
    -- participant_id          TEXT,
    -- participant_first_name  TEXT,
    -- participant_last_name   TEXT,
    -- check_amount            DECIMAL(10,2),
    -- check_date              DATE,
    -- ...

    -- ============================================================================
    -- PRIMARY KEY (includes partition key)
    -- ============================================================================
    PRIMARY KEY (staging_id)
)

-- ============================================================================
-- REQUIRED UNIQUE CONSTRAINT: File + Row Hash
-- ============================================================================
CREATE UNIQUE INDEX uq_{table_name}_file_row_hash ON staging.{table_name} (import_file, row_hash);

-- ============================================================================
-- REQUIRED INDEXES
-- ============================================================================
CREATE INDEX idx_{table_name}_batch_id ON staging.{table_name}(batch_id);
CREATE INDEX idx_{table_name}_row_hash ON staging.{table_name}(row_hash);

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================
COMMENT ON TABLE staging.{table_name} IS 'Staging table for {description}. Includes raw data from source file.';
COMMENT ON COLUMN staging.{table_name}.row_hash IS 'MD5 hash of business key columns for deduplication';
```

---
