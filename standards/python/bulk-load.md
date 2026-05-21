## Python Bulk Load Pattern

### Overview
Python bulk load tooling provides JSON-driven configuration for importing data from files to PostgreSQL staging tables with comprehensive transformation, validation, and error handling capabilities.

### Core Architecture

```
┌─────────────────────┐
│ ImportConfiguration │
│ (JSON Config)       │
└─────────┬───────────┘
          │
          v
┌─────────────────────┐     ┌─────────────────────┐
│ FileDiscoveryEngine │────>│ CSV/JSON Files      │
└─────────┬───────────┘     └─────────────────────┘
          │
          v
┌─────────────────────┐
│ DataTransformation  │
│ Engine              │
└─────────┬───────────┘
          │
          v
┌─────────────────────┐     ┌─────────────────────┐
│ DatabaseManager     │────>│ PostgreSQL          │
│ (Bulk Insert)       │     │ (Staging Tables)    │
└─────────────────────┘     └─────────────────────┘
          │
          v
┌─────────────────────┐
│ PerformanceMonitor  │
└─────────────────────┘
```

### JSON Configuration Structure

#### Root Configuration
```json
{
    "source_system": "VENDOR_A",
    "environment": "production",
    "default_transforms": {
        "trim_strings": true,
        "null_empty_strings": true,
        "date_formats": ["%Y-%m-%d", "%m/%d/%Y"]
    },
    "tables": [...]
}
```

#### Table Configuration
```json
{
    "table_name": "participants_staging",
    "schema_name": "staging",
    "file_patterns": ["*participants*.csv", "*members*.csv"],
    "csv_options": {
        "delimiter": ",",
        "quotechar": "\"",
        "encoding": "utf-8",
        "has_header": true,
        "skip_rows": 0
    },
    "batch_size": 5000,
    "error_threshold": 0.05,
    "filters": {
        "status": ["active", "pending"],
        "exclude_test_records": true
    },
    "column_mappings": [...]
}
```

#### Column Mapping Configuration
```json
{
    "source_column": "external_id",
    "target_column": "source_primary_key",
    "transform": null,
    "transform_params": {},
    "default_value": null,
    "is_required": true
}
```

### File Discovery Pattern

#### Configuration
```json
{
    "file_patterns": [
        "*participants*.csv",
        "*members*.csv",
        "exports/**/*.csv"
    ],
    "case_insensitive": true,
    "recursive": false
}
```

#### Implementation
```python
class FileDiscoveryEngine:
    def __init__(self, base_directory: Path):
        self.base_directory = base_directory

    def discover_files(self, patterns: List[str],
                       case_insensitive: bool = True) -> List[Path]:
        discovered: Set[Path] = set()
        for pattern in patterns:
            matches = self._match_pattern(pattern, case_insensitive)
            discovered.update(matches)
        return sorted(discovered, key=lambda p: p.stat().st_mtime, reverse=True)

    def get_latest_file(self, patterns: List[str]) -> Optional[Path]:
        files = self.discover_files(patterns)
        return files[0] if files else None
```

### CSV Processing Pattern

#### Smart Header Detection
```python
def detect_headers(self, file_path: Path, config: TableConfig) -> List[str]:
    """Detect headers from CSV or use configured fallback."""
    with open(file_path, 'r', encoding=config.csv_encoding) as f:
        reader = csv.reader(f)
        first_row = next(reader, None)

        if first_row and self._looks_like_header(first_row):
            return [h.strip().lower() for h in first_row]

        # Fallback to configured headers
        if config.fallback_headers:
            return config.fallback_headers

        raise ValueError(f"Cannot determine headers for {file_path}")

def _looks_like_header(self, row: List[str]) -> bool:
    """Heuristic: headers are usually non-numeric strings."""
    non_numeric_count = sum(1 for cell in row if not self._is_numeric(cell))
    return non_numeric_count / len(row) > 0.5
```

#### Batch Processing
```python
def process_file(self, file_path: Path, config: TableConfig,
                 batch_id: UUID) -> ProcessingResult:
    headers = self.detect_headers(file_path, config)
    batches_processed = 0
    total_records = 0
    error_records = 0

    with open(file_path, 'r', encoding=config.csv_encoding) as f:
        reader = csv.DictReader(f, fieldnames=headers)
        if config.has_header:
            next(reader)  # Skip header row

        batch = []
        for row_num, row in enumerate(reader, start=1):
            try:
                transformed = self._transform_row(row, config, file_path.name)
                transformed['batch_id'] = str(batch_id)
                transformed['source_row_number'] = row_num
                batch.append(transformed)

                if len(batch) >= config.batch_size:
                    self._insert_batch(batch, config)
                    batches_processed += 1
                    total_records += len(batch)
                    batch = []

            except TransformError as e:
                error_records += 1
                self._log_row_error(batch_id, row_num, str(e))

        # Final batch
        if batch:
            self._insert_batch(batch, config)
            total_records += len(batch)

    return ProcessingResult(
        file_path=file_path,
        total_records=total_records,
        error_records=error_records,
        batches_processed=batches_processed
    )
```

### Database Operations

#### Connection Management
```python
class DatabaseManager:
    def __init__(self, connection_string: Optional[str] = None):
        self.connection_string = connection_string or self._get_connection_string()
        self._pool: Optional[pool.ThreadedConnectionPool] = None

    def _get_connection_string(self) -> str:
        """Build from environment variables."""
        return (
            f"host={os.getenv('DB_HOST', 'localhost')} "
            f"port={os.getenv('DB_PORT', '5432')} "
            f"dbname={os.getenv('DB_NAME')} "
            f"user={os.getenv('DB_USER')} "
            f"password={os.getenv('DB_PASSWORD')}"
        )

    @contextmanager
    def get_connection(self) -> Generator:
        conn = self._pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)
```

#### Bulk Insert with execute_values
```python
def bulk_insert(self, schema: str, table: str,
                columns: List[str], rows: List[tuple],
                batch_size: int = 1000) -> int:
    """High-performance bulk insert using psycopg2.extras.execute_values."""
    total_inserted = 0

    with self.get_connection() as conn:
        with conn.cursor() as cur:
            insert_sql = sql.SQL(
                "INSERT INTO {}.{} ({}) VALUES %s"
            ).format(
                sql.Identifier(schema),
                sql.Identifier(table),
                sql.SQL(', ').join(map(sql.Identifier, columns))
            )

            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                execute_values(cur, insert_sql, batch)
                total_inserted += len(batch)

    return total_inserted
```

### Error Handling Patterns

#### Batch-Level Recovery
```python
def process_with_recovery(self, file_path: Path, config: TableConfig,
                          batch_id: UUID) -> ProcessingResult:
    """Process file with batch-level error recovery."""
    try:
        return self.process_file(file_path, config, batch_id)
    except BatchInsertError as e:
        # Fall back to row-by-row insertion
        return self._process_row_by_row(file_path, config, batch_id, e.failed_batch)
```

#### Record-Level Error Tracking
```python
def _process_row_by_row(self, file_path: Path, config: TableConfig,
                        batch_id: UUID, failed_batch: List[Dict]) -> int:
    """Insert records one at a time, tracking individual failures."""
    succeeded = 0
    for row in failed_batch:
        try:
            self._insert_single_row(row, config)
            succeeded += 1
        except Exception as e:
            self._log_row_error(
                batch_id=batch_id,
                row_number=row.get('source_row_number'),
                error_message=str(e),
                row_data=row
            )
    return succeeded
```

### Performance Monitoring

#### Metrics Tracked
| Metric               | Description                          |
|----------------------|--------------------------------------|
| records_per_second   | Throughput rate                      |
| batch_duration_ms    | Time per batch insert                |
| total_duration_sec   | Total processing time                |
| error_rate           | Percentage of failed records         |
| memory_usage_mb      | Peak memory during processing        |

#### Implementation
```python
@dataclass
class BatchMetrics:
    batch_number: int
    records_processed: int
    records_succeeded: int
    records_failed: int
    start_time: datetime
    end_time: Optional[datetime] = None

    @property
    def duration_seconds(self) -> float:
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return 0.0

    @property
    def records_per_second(self) -> float:
        if self.duration_seconds > 0:
            return self.records_processed / self.duration_seconds
        return 0.0
```

### Environment Configuration

#### Required Environment Variables
| Variable       | Description              | Default     |
|----------------|--------------------------|-------------|
| DB_HOST        | PostgreSQL host          | localhost   |
| DB_PORT        | PostgreSQL port          | 5432        |
| DB_NAME        | Database name            | (required)  |
| DB_USER        | Database user            | (required)  |
| DB_PASSWORD    | Database password        | (required)  |
| LOG_LEVEL      | Logging level            | INFO        |
| DATA_DIR       | Data file directory      | ./data      |

#### Example .env File
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=import_user
DB_PASSWORD=secure_password
LOG_LEVEL=INFO
DATA_DIR=/data/imports
```

### Best Practices

1. **Use connection pooling** - Initialize pool once, reuse connections
2. **Batch inserts** - Use execute_values for bulk performance
3. **Track source file** - Store filename on every record
4. **Include row numbers** - Store original row number for debugging
5. **Validate before insert** - Catch errors early
6. **Log progress** - Report progress for long-running imports
7. **Support idempotency** - Allow re-running failed batches
8. **Clean up** - Close connections and pools properly
