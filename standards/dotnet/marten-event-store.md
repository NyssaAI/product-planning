> **📚 See Also**: For complete Marten/Wolverine implementation patterns, APIs, and code examples,
> see the **event-sourcing-implementation** Claude Code Skill.

## Marten Event Store Standards

### When to Use Marten
- **Use For**: Audit trails, event sourcing, temporal queries, event-driven architectures
- **Use EF Instead**: Simple CRUD, traditional relational models, simpler data access
- **Important**: Choose one; don't mix Marten and EF Core in same project

### Configuration
- **Connection**: Use PostgreSQL connection string from configuration
- **Event Types**: Register all event types in startup
- **Projections**: Configure inline projections for critical reads, async for others and flat projections that support UI data tables
- **Metadata**: Enable causation, correlation IDs for tracing
- **Schema**: Use AutoCreate.CreateOrUpdate in dev only

### Event Design
- **Immutable**: Events are immutable records
- **Past Tense**: Name events in past tense (e.g., UserRegistered)
- **Self-Contained**: Include all data needed to process the event
- **Business Language**: Use domain language, not technical terms
- **No Behavior**: Events are pure data; no methods

### Stream Management
- **One Aggregate Per Stream**: Each stream represents single aggregate root
- **Stream ID**: Use aggregate ID as stream ID (e.g., UserId)
- **StartStream**: Use for creating new streams
- **Append**: Use for adding events to existing streams
- **Version Checking**: Use optimistic concurrency to prevent conflicts

### Aggregates
- **Apply Methods**: Use `Apply()` methods to update state from events
- **No Public Setters**: State changes only via events
- **Validation in Commands**: Validate before creating events, not in Apply
- **Pure Functions**: Apply methods should be deterministic
- **Minimal State**: Only store state needed for business decisions

### Projections
- **Inline**: For critical reads needed immediately after write
- **Async**: For complex aggregations or cross-stream queries
- **Idempotency**: Design projections to be replayable
- **Separate Read Models**: Don't reuse write-side aggregates
- **Rebuild Capability**: Design to support full rebuild from events
- **Data Table Support**: Create flat projectins to support data tables to user interface needs.

### Sessions
- **LightweightSession**: Use for writes; better performance
- **QuerySession**: Use for read-only queries
- **OpenSession**: Use only when identity map needed

### CQRS Pattern
- **Write Side**: Use Marten events in command handlers
- **Read Side**: Use Marten projections in query handlers
- **Consistency**: Inline projections for immediate consistency, async for eventual

### Event Versioning
- **Upcasters**: Use EventUpcaster to transform old events to new versions
- **Backward Compatibility**: Plan for event schema evolution
- **Version Events**: Add version field when creating new event versions

---

## Complete Marten Configuration

### ASP.NET Core Integration

**Full Setup Example**:
📁 `examples/marten/configuration/ProgramSetup.cs` - Complete `Program.cs` configuration with events, projections, documents, and Wolverine integration

**Key Configuration Areas**:
- Database connection and schema management
- Event type registration
- Projection configuration (inline, async, live)
- Metadata tracking (causation, correlation IDs)
- Document database configuration
- Wolverine integration for aggregate handlers

### Dependency Injection Services

| Service | Lifetime | Purpose |
|---------|----------|---------|
| `IDocumentStore` | Singleton | Root configuration, schema management |
| `IDocumentSession` | Scoped | Read/write operations (unit of work) |
| `IQuerySession` | Scoped | Read-only queries (better performance) |
| `IMessageBus` | Scoped | Wolverine message publishing |

All scoped services are automatically disposed at end of HTTP request.

---

## Advanced Concurrency Control

### Optimistic Concurrency with FetchForWriting()

**Pattern**: Detect conflicts and fail fast when concurrent modifications occur.

**Complete Example**:
📁 `examples/marten/concurrency/OptimisticConcurrency.cs` - Shows `FetchForWriting()` with version checking, client-side versioning, and retry patterns

**How It Works**:
1. `FetchForWriting()` loads aggregate and captures current stream version
2. Business logic executes using loaded state
3. `Append()` with `expectedVersion` validates stream hasn't changed
4. `SaveChangesAsync()` commits or throws `ConcurrencyException`

### Client-Side Versioning Pattern

Include version in commands to enable optimistic concurrency from the UI:
- Client loads aggregate with version property
- User modifies aggregate
- Client sends version in update request
- Server validates version matches current stream version
- Returns 409 Conflict if another user modified it

### Decision Tree: Which Concurrency Pattern?

```
Do you need strict serialization
of ALL operations on this stream?
       │
       ├─YES─→ FetchForExclusiveWriting() (Pessimistic)
       │
       └─NO──→ Is contention expected to be low?
               │
               ├─YES─→ FetchForWriting() (Optimistic)
               │
               └─NO──→ Optimistic with exponential backoff retries
```

---

## Durable Outbox Pattern

### The Problem

Without the outbox pattern, database changes and message publishing can become inconsistent:
- Database commits but process crashes before message sent → lost message
- Message sent before database commits → subscriber reads stale data
- Database rolls back but message already sent → inconsistent state

### The Solution

**Complete Implementation**:
📁 `examples/marten/outbox/DurableOutbox.cs` - Shows durable outbox configuration, usage with cascading messages and `IMessageBus`, and crash recovery behavior

### How It Works

1. Handler executes (appends events, publishes messages)
2. Transaction commits (events + messages in single atomic write)
3. After commit, Wolverine delivers messages
4. On success, deletes from outbox

### Benefits

| Benefit | Description |
|---------|-------------|
| **Atomicity** | Events and messages commit together (all-or-nothing) |
| **Crash Recovery** | Wolverine reassigns undelivered messages |
| **No 2PC** | Single database transaction (no distributed transaction complexity) |
| **Exactly-Once*** | At-least-once delivery + idempotent handlers |
| **Multi-Tenancy** | Separate outbox per tenant database |

---

## Resiliency & Error Handling

### 4-Layer Strategy

**Complete Configuration**:
📁 `examples/marten/resiliency/ResiliencyConfiguration.cs` - Production-ready error handling with retry, circuit breaker, queue pause, and dead letter queue

**Layer 1: Retry with Exponential Backoff**
- For: Transient database errors, network hiccups
- Config: Retry with 50ms, 100ms, 250ms delays
- Example: Database deadlock → wait → retry

**Layer 2: Circuit Breaker**
- For: Cascading failures when external service is unhealthy
- Config: Open circuit if >25% fail in 1-minute window
- Behavior: Fail fast when circuit open, test after break duration

**Layer 3: Queue Pause and Requeue**
- For: External dependency temporarily unavailable
- Config: Pause queue for 5 minutes
- Behavior: Message returns to queue, retry after pause

**Layer 4: Dead Letter Queue**
- For: Permanent failures that won't succeed with retries
- Config: Discard invalid data, move permanent failures to DLQ
- Scenarios: Invalid data, business rule violations, schema mismatches

---

## Document Database Usage

### When to Use Documents vs Events

**Complete Examples**:
📁 `examples/marten/documents/DocumentDatabase.cs` - CRUD operations, LINQ querying, indexing, and combining documents with events

| Use Case | Use Document Storage | Use Event Sourcing |
|----------|---------------------|-------------------|
| **Reference data** | ✅ | ❌ |
| **Audit trails** | ❌ | ✅ |
| **Temporal queries** | ❌ | ✅ |
| **Simple CRUD** | ✅ | ❌ (overkill) |
| **Lookup tables** | ✅ | ❌ |

**Rule of Thumb**:
- **Events**: When you need "how we got here" (the journey)
- **Documents**: When you only need "where we are now" (the destination)

### Performance: Indexing

Create indexes on frequently queried fields:
- Single field indexes for WHERE clauses
- Composite indexes for multiple fields
- GIN indexes for full-text JSON search

**Query Performance**:
- ✅ Fast - uses index
- ❌ Slow - no index (add one!)

---

## Asynchronous Processing

### Background Job Pattern

**Complete Examples**:
📁 `examples/marten/async/BackgroundJobs.cs` - Background processing, message routing, queue configuration, and complete user registration workflow

**Benefits**:
- Improved HTTP request responsiveness
- Resource management (long-running tasks don't block request threads)
- Retry capability on failure
- Load balancing across application instances
- Durable processing (survives application restarts)

### Message Routing (Auto-Discovery)

Wolverine automatically routes messages to handlers:
- Handler in same application → Local queue
- Handler in different application → External endpoint
- No handler found → Error

### Queue Configuration

**Sequential vs Parallel**:
- **Sequential**: Guaranteed ordering (one at a time)
- **Parallel**: Higher throughput (multiple concurrent)

Configure queues with:
- `Sequential()` for ordered processing
- `MaximumParallelMessages(N)` for concurrent processing
- `UseDurableInbox()` for persistence
- `WolverineHandler(QueueName = "name")` to assign handlers

