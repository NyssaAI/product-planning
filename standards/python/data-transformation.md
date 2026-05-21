## Python Data Transformation Pattern

### Overview
The DataTransformationEngine provides a comprehensive set of transforms for converting raw imported data into properly typed values for database insertion.

### Transform Architecture

```python
class DataTransformationEngine:
    """Central engine for data transformations."""

    def __init__(self):
        self._transforms: Dict[str, Callable] = {}
        self._register_default_transforms()

    def transform(self, value: Any, transform_type: str,
                  params: Optional[Dict[str, Any]] = None) -> Any:
        if transform_type not in self._transforms:
            raise ValueError(f"Unknown transform: {transform_type}")
        return self._transforms[transform_type](value, params or {})
```

### Standard Transforms

#### Currency Transform
Converts currency strings to Decimal values.
```python
def _transform_currency(self, value: Any, params: Dict) -> Optional[Decimal]:
    """
    Convert currency string to Decimal.
    Handles: $, commas, parentheses for negative, whitespace.

    Params:
        default: Value to return if conversion fails
        precision: Decimal places (default: 2)
    """
    if value is None or str(value).strip() == '':
        return params.get('default')

    str_value = str(value).strip()

    # Remove currency symbols and commas
    str_value = re.sub(r'[$,\s]', '', str_value)

    # Handle parentheses for negative: (123.45) -> -123.45
    if str_value.startswith('(') and str_value.endswith(')'):
        str_value = '-' + str_value[1:-1]

    try:
        precision = params.get('precision', 2)
        quantize_str = '0.' + '0' * precision
        return Decimal(str_value).quantize(Decimal(quantize_str))
    except (InvalidOperation, ValueError):
        return params.get('default')
```

**Example Inputs/Outputs:**
| Input          | Output           |
|----------------|------------------|
| `"$1,234.56"`  | `Decimal(1234.56)` |
| `"(500.00)"`   | `Decimal(-500.00)` |
| `"1234"`       | `Decimal(1234.00)` |
| `""`           | `None`           |

#### Date Transform
Parses dates from various formats.
```python
def _transform_date(self, value: Any, params: Dict) -> Optional[date]:
    """
    Parse date from string.

    Params:
        formats: List of format strings to try (default: common formats)
        default: Value to return if parsing fails
    """
    if value is None or str(value).strip() == '':
        return params.get('default')

    formats = params.get('formats', [
        '%Y-%m-%d',      # 2024-01-15
        '%m/%d/%Y',      # 01/15/2024
        '%m-%d-%Y',      # 01-15-2024
        '%Y/%m/%d',      # 2024/01/15
        '%d-%b-%Y',      # 15-Jan-2024
        '%b %d, %Y',     # Jan 15, 2024
        '%d %B %Y',      # 15 January 2024
    ])

    str_value = str(value).strip()
    for fmt in formats:
        try:
            return datetime.strptime(str_value, fmt).date()
        except ValueError:
            continue

    return params.get('default')
```

#### Datetime Transform
Parses datetime values with timezone awareness.
```python
def _transform_datetime(self, value: Any, params: Dict) -> Optional[datetime]:
    """
    Parse datetime from string.

    Params:
        formats: List of format strings to try
        timezone: Target timezone (default: UTC)
        default: Value to return if parsing fails
    """
    if value is None or str(value).strip() == '':
        return params.get('default')

    formats = params.get('formats', [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%d %H:%M:%S.%f',
        '%m/%d/%Y %H:%M:%S',
        '%m/%d/%Y %I:%M:%S %p',
    ])

    str_value = str(value).strip()
    for fmt in formats:
        try:
            dt = datetime.strptime(str_value, fmt)
            if params.get('timezone'):
                # Apply timezone if specified
                import pytz
                tz = pytz.timezone(params['timezone'])
                dt = tz.localize(dt)
            return dt
        except ValueError:
            continue

    return params.get('default')
```

#### Timestamp Transform
Converts Unix timestamps to datetime.
```python
def _transform_timestamp(self, value: Any, params: Dict) -> Optional[datetime]:
    """
    Convert Unix timestamp to datetime.
    Auto-detects seconds vs milliseconds.

    Params:
        unit: 'seconds' or 'milliseconds' (auto-detected if not specified)
        default: Value to return if conversion fails
    """
    if value is None:
        return params.get('default')

    try:
        timestamp = float(value)

        # Auto-detect milliseconds (timestamps > year 2001 in millis)
        if params.get('unit') == 'milliseconds' or timestamp > 1e12:
            timestamp = timestamp / 1000

        return datetime.fromtimestamp(timestamp)
    except (ValueError, TypeError, OSError):
        return params.get('default')
```

#### UUID Transform
Parses or generates UUIDs.
```python
def _transform_uuid(self, value: Any, params: Dict) -> Optional[uuid.UUID]:
    """
    Parse UUID from string or generate new.

    Params:
        generate_if_empty: Generate new UUID if value is empty
        generate_on_error: Generate new UUID if parsing fails
        default: Value to return if conversion fails
    """
    if value is None or str(value).strip() == '':
        if params.get('generate_if_empty', False):
            return uuid.uuid4()
        return params.get('default')

    try:
        return uuid.UUID(str(value).strip())
    except ValueError:
        if params.get('generate_on_error', False):
            return uuid.uuid4()
        return params.get('default')
```

#### Boolean Transform
Converts various representations to boolean.
```python
def _transform_boolean(self, value: Any, params: Dict) -> Optional[bool]:
    """
    Convert various values to boolean.

    Params:
        true_values: List of strings that mean True
        false_values: List of strings that mean False
        default: Value to return if not recognized
    """
    if value is None:
        return params.get('default')

    true_values = params.get('true_values', [
        'true', 'yes', '1', 'y', 't', 'on', 'active', 'enabled'
    ])
    false_values = params.get('false_values', [
        'false', 'no', '0', 'n', 'f', 'off', 'inactive', 'disabled'
    ])

    str_value = str(value).strip().lower()
    if str_value in true_values:
        return True
    if str_value in false_values:
        return False
    return params.get('default')
```

#### Integer/Float Transforms
```python
def _transform_integer(self, value: Any, params: Dict) -> Optional[int]:
    """Convert to integer, handling float strings."""
    if value is None or str(value).strip() == '':
        return params.get('default')
    try:
        # Handle "123.0" -> 123
        return int(float(str(value).strip()))
    except (ValueError, TypeError):
        return params.get('default')

def _transform_float(self, value: Any, params: Dict) -> Optional[float]:
    """Convert to float."""
    if value is None or str(value).strip() == '':
        return params.get('default')
    try:
        return float(str(value).strip())
    except (ValueError, TypeError):
        return params.get('default')
```

#### String Transforms
```python
def _transform_uppercase(self, value: Any, params: Dict) -> Optional[str]:
    if value is None:
        return params.get('default')
    return str(value).upper()

def _transform_lowercase(self, value: Any, params: Dict) -> Optional[str]:
    if value is None:
        return params.get('default')
    return str(value).lower()

def _transform_trim(self, value: Any, params: Dict) -> Optional[str]:
    if value is None:
        return params.get('default')
    return str(value).strip()

def _transform_title_case(self, value: Any, params: Dict) -> Optional[str]:
    if value is None:
        return params.get('default')
    return str(value).title()
```

#### Special Transforms
```python
def _transform_extract_filename(self, value: Any, params: Dict) -> Optional[str]:
    """Extract filename from full path."""
    if value is None or str(value).strip() == '':
        return params.get('default')
    return Path(str(value)).name

def _transform_default_if_empty(self, value: Any, params: Dict) -> Any:
    """Return default value if input is empty."""
    if value is None or str(value).strip() == '':
        return params.get('default_value')
    return value

def _transform_map_value(self, value: Any, params: Dict) -> Any:
    """Map value using a lookup dictionary."""
    if value is None:
        return params.get('default')

    value_map = params.get('value_map', {})
    str_value = str(value).strip()

    if params.get('case_insensitive', True):
        str_value = str_value.lower()
        value_map = {k.lower(): v for k, v in value_map.items()}

    return value_map.get(str_value, params.get('default'))
```

### Transform Configuration in JSON

#### Column Mapping with Transform
```json
{
    "source_column": "payment_amount",
    "target_column": "amount",
    "transform": "currency",
    "transform_params": {
        "default": "0.00",
        "precision": 2
    }
}
```

#### Chained Transforms
```json
{
    "source_column": "customer_name",
    "target_column": "name",
    "transforms": [
        {"type": "trim"},
        {"type": "title_case"}
    ]
}
```

#### Value Mapping Transform
```json
{
    "source_column": "status_code",
    "target_column": "status",
    "transform": "map_value",
    "transform_params": {
        "value_map": {
            "A": "active",
            "I": "inactive",
            "P": "pending"
        },
        "default": "unknown",
        "case_insensitive": true
    }
}
```

### Custom Transform Registration
```python
def register_transform(self, name: str, func: Callable) -> None:
    """Register a custom transform function."""
    self._transforms[name] = func

# Usage
engine = DataTransformationEngine()
engine.register_transform('phone_format', lambda v, p: format_phone(v))
```

### Error Handling
```python
class TransformError(Exception):
    """Raised when a transform fails."""
    def __init__(self, column: str, value: Any, transform: str, message: str):
        self.column = column
        self.value = value
        self.transform = transform
        super().__init__(f"Transform '{transform}' failed on column '{column}': {message}")
```

### Best Practices

1. **Always handle None** - Every transform should handle None gracefully
2. **Provide defaults** - Support default_value parameter
3. **Be forgiving** - Try multiple formats before failing
4. **Document params** - Each transform should document its parameters
5. **Test edge cases** - Empty strings, whitespace, unusual formats
6. **Log failures** - Track transform errors for debugging
7. **Support chaining** - Allow multiple transforms on one column
