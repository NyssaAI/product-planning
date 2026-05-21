# Event Sourcing Standards

### Core Principles
- **Events as Source of Truth**: State is derived from a sequence of events, not stored directly
- **Immutable Events**: Events are permanent historical facts that cannot be changed
- **Command-Event Distinction**: Commands represent intent (can fail), events represent facts (already happened)
- **CQRS**: Separate write operations (commands) from read operations (queries)
- **Event Store**: Append-only storage for all domain events
- **Projections**: Transform events into queryable read models

### 🔒 CRITICAL: Event Creation Standard

**All domain events MUST be created exclusively within the Core assembly by aggregates. Application layer SHALL NOT create events directly.**

#### Command Objects with Embedded Validators Pattern

**Every aggregate command method MUST:**
1. Accept a **command object** (not individual parameters)
2. Command object contains a nested **Validator** class using FluentValidation
3. Follow **two-phase validation**: (1) Command structure, (2) Business rules
4. Create event only after ALL validation passes
5. Apply event using INTERNAL Apply method
6. Events are now immutable facts

#### Required Command Object Pattern

```csharp
/// <summary>
/// Command to perform business operation.
/// Contains all parameters, embedded validator, and validation helper methods.
/// </summary>
public record PerformOperationCommand
{
    private static readonly Validator _validator = new();

    public Guid EntityId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string CreatedBy { get; init; } = string.Empty;

    /// <summary>
    /// Returns true if the command is valid, false otherwise.
    /// </summary>
    public bool IsValid()
    {
        return _validator.Validate(this).IsValid;
    }

    /// <summary>
    /// Returns the full validation result with detailed error information.
    /// </summary>
    public ValidationResult Validate()
    {
        return _validator.Validate(this);
    }

    /// <summary>
    /// Validates the command and throws ValidationException if invalid.
    /// </summary>
    public void ThrowIfNotValid()
    {
        _validator.ValidateAndThrow(this);
    }

    /// <summary>
    /// Validates command structure (nulls, lengths, formats).
    /// Does NOT validate business rules - that happens in the aggregate.
    /// </summary>
    public class Validator : AbstractValidator<PerformOperationCommand>
    {
        public Validator()
        {
            RuleFor(x => x.EntityId)
                .NotEmpty()
                .WithMessage("Entity ID is required.");

            RuleFor(x => x.Name)
                .NotEmpty()
                .WithMessage("Name is required.")
                .MaximumLength(200)
                .WithMessage("Name cannot exceed 200 characters.");

            RuleFor(x => x.CreatedBy)
                .NotEmpty()
                .WithMessage("CreatedBy is required.");
        }
    }
}
```

#### Required Aggregate Command Method Pattern

**Every aggregate command method MUST follow this pattern:**

```csharp
/// <summary>
/// Performs business operation with two-phase validation.
/// </summary>
public void PerformOperation(PerformOperationCommand command)
{
    // PHASE 1: Validate command structure (nulls, lengths, formats)
    var validator = new PerformOperationCommand.Validator();
    validator.ValidateAndThrow(command);

    // PHASE 2: Validate business rules using aggregate state
    if (/* business rule check fails */)
        throw new DomainException("Business rule violated");

    // All validations passed - create event (now an immutable fact)
    var @event = new OperationPerformedEvent(
        Id,
        command.EntityId,
        command.Name,
        command.Description,
        command.CreatedBy);

    // Apply event to mutate state (internal method, pure mutation)
    Apply(@event);
}
```

#### Application Layer Responsibilities

**MUST:**
- Create command objects with all required parameters
- Call aggregate command methods (passing command objects)
- Load aggregates from event store
- Persist aggregates to event store

**MUST NOT:**
- Create events directly: `var event = new OperationPerformedEvent(...)` ❌
- Call Apply() directly (Apply is INTERNAL and only for Marten event replay) ❌
- Pass individual parameters instead of command objects ❌
- Skip command validation ❌

#### Enforcement

- **Compile-time**: INTERNAL Apply methods prevent application layer from calling them
- **Code Review**: Verify command objects with embedded validators
- **Code Review**: Verify two-phase validation in all command methods
- **Code Review**: Verify Application layer only calls command methods with command objects

**Example:**

```csharp
// Command object with embedded validator
public record RenameRoleCommand
{
    public string NewName { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string RenamedBy { get; init; } = string.Empty;

    public class Validator : AbstractValidator<RenameRoleCommand>
    {
        public Validator()
        {
            RuleFor(x => x.NewName)
                .NotEmpty()
                .WithMessage("New name is required.")
                .MaximumLength(200);

            RuleFor(x => x.RenamedBy)
                .NotEmpty()
                .WithMessage("RenamedBy is required.");
        }
    }
}

// ✅ CORRECT: Aggregate command method with two-phase validation
public class RoleAggregate : AggregateRoot<Guid>
{
    public void Rename(RenameRoleCommand command)
    {
        // PHASE 1: Validate command structure
        var validator = new RenameRoleCommand.Validator();
        validator.ValidateAndThrow(command);

        // PHASE 2: Validate business rules using aggregate state
        if (IsDeleted)
            throw new DomainException("Cannot rename deleted role");

        // All validations passed - create event
        var @event = new RoleRenamedEvent(
            Id,
            command.NewName,
            command.Description,
            command.RenamedBy,
            DateTimeOffset.UtcNow);

        // Apply event (INTERNAL method)
        Apply(@event);
    }

    // INTERNAL: Only Marten calls this during replay
    internal void Apply(RoleRenamedEvent @event)
    {
        // Pure state mutation - no validation
        Name = @event.NewName;
        Description = @event.Description;
        UpdatedAt = @event.RenamedAt;
        Version++;
    }
}

// ✅ CORRECT: Application layer creates command and calls aggregate method
public class RenameRoleHandler
{
    public async Task<Guid> Handle(RenameRoleCommand command)
    {
        // Load aggregate from event store
        var role = await _session.Events.AggregateStreamAsync<RoleAggregate>(command.RoleId);

        // Call command method with command object
        role.Rename(command);

        // Persist events
        await _session.SaveChangesAsync();

        return role.Id;
    }
}

// ❌ WRONG: Application layer creating events
var @event = new RoleRenamedEvent(...);  // Bypasses validation!
role.Apply(@event);  // Apply is INTERNAL - won't compile!

// ❌ WRONG: Passing individual parameters instead of command object
role.Rename("NewName", "Description", "user@example.com");  // Won't compile!
```

#### Complex Events with Domain Services

For events requiring cross-aggregate validation, use domain services with **internal constructors**:

```csharp
// Event with internal constructor
public sealed record OrganizationalUnitMovedEvent : IDomainEvent
{
    internal OrganizationalUnitMovedEvent(...) { }  // Only domain services can create

    public Guid OrganizationalUnitId { get; init; }
    public Guid NewParentId { get; init; }
    // ... properties remain public
}

// Domain service creates event
public interface IOrganizationalUnitService
{
    Result<OrganizationalUnitMovedEvent> CreateMoveEvent(
        OrganizationalUnitAggregate ou, Guid newParentId, string newParentPath, string movedBy);
}

// Aggregate command method uses domain service
public Result<OrganizationalUnitMovedEvent> Move(
    Guid newParentId, string newParentPath, string movedBy, IOrganizationalUnitService ouService)
{
    // VALIDATE via domain service
    var eventResult = ouService.CreateMoveEvent(this, newParentId, newParentPath, movedBy);
    if (eventResult.IsFailure) return eventResult;

    var @event = eventResult.Value;

    // APPLY
    var applyResult = Apply(@event);
    if (applyResult.IsFailure) return Result<OrganizationalUnitMovedEvent>.Failure(applyResult.Error);

    // ADD TO DOMAIN EVENTS
    AddDomainEvent(@event);

    return Result<OrganizationalUnitMovedEvent>.Success(@event);
}
```

### Event Sourcing Approach

**This codebase follows PURE event sourcing** where:
1. Commands are validated with **two-phase validation** (structure + business rules)
2. Events are created only after ALL validation passes
3. Apply methods are **INTERNAL** and contain ZERO validation
4. Apply methods are pure state mutations that NEVER throw

#### Production Pattern (Two-Phase Validation)

```csharp
// Command object with embedded validator
public record AddOrganizationalUnitCommand
{
    public Guid OuId { get; init; }
    public OrganizationPath ParentPath { get; init; } = null!;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string CreatedBy { get; init; } = string.Empty;

    public class Validator : AbstractValidator<AddOrganizationalUnitCommand>
    {
        public Validator()
        {
            RuleFor(x => x.OuId).NotEmpty();
            RuleFor(x => x.ParentPath).NotNull();
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.CreatedBy).NotEmpty();
        }
    }
}

// Command method - two-phase validation BEFORE creating event
public void AddOrganizationalUnit(AddOrganizationalUnitCommand command)
{
    // PHASE 1: Validate command structure (nulls, lengths, formats)
    var validator = new AddOrganizationalUnitCommand.Validator();
    validator.ValidateAndThrow(command);

    // PHASE 2: Validate business rules using aggregate state
    var parent = FindOrganizationalUnitByPath(command.ParentPath);
    if (parent == null)
        throw new DomainException($"Parent not found: {command.ParentPath}");

    if (!IsNameUniqueInSiblings(command.ParentPath, command.Name))
        throw new DomainException($"Name '{command.Name}' already exists");

    // All validations passed - create event (now immutable fact)
    var @event = new OrganizationalUnitAddedEvent(
        Id,
        command.OuId,
        command.ParentPath,
        command.Name,
        command.Description,
        command.CreatedBy);

    // Apply event (internal method, pure state mutation)
    Apply(@event);
}

// Apply method - INTERNAL, ZERO validation, pure state mutation
internal void Apply(OrganizationalUnitAddedEvent @event)
{
    // NO validation - events are historical facts
    // Non-null assertion (!) is safe because event already validated
    var parent = FindOrganizationalUnitByPath(@event.ParentPath)!;
    var newPath = @event.ParentPath.CreateOrgUnit(@event.Name);

    var newOU = new OrganizationalUnit
    {
        Name = @event.Name,
        Path = newPath,
        Description = @event.Description
    };
    parent.SubOrganizationalUnits.Add(newOU);

    UpdatedAt = @event.CreatedAt;
    Version++;
}
```

**Why This Approach:**
- ✅ True event sourcing - events are immutable facts
- ✅ Fastest replay - zero validation overhead, never throws
- ✅ Apply methods are pure state mutations (easiest to test)
- ✅ Clear validation separation - command structure vs business rules
- ✅ Events can ONLY be created after validation passes
- ✅ Internal Apply prevents misuse from application layer
- ✅ Two-phase validation is explicit and maintainable
- ✅ Throws exceptions instead of Result monad (simpler, idiomatic C#)

### Event Design

**Naming Conventions**
- Always use **past tense**: `OrderPlaced`, `UserRegistered`, `PaymentProcessed` (see: `OrganizationCreatedEvent`, `OrganizationalUnitAddedEvent`)
- Never present tense: ~~`PlaceOrder`~~, ~~`RegisterUser`~~
- Be **specific**: `IncidentPrioritised` not `IncidentUpdated` (see: `OrganizationDetailsChangedEvent` vs generic "OrganizationUpdated")
- Use **domain language**: `MonsterSlayed` not `ExperienceIncreased`

**Event Structure**
- Define as **immutable C# records** inheriting from `IDomainEvent`
- Include only **essential data** needed to represent the fact
- No computed or derived values
- Include enough context to understand the event standalone
- Use strongly-typed properties (avoid dictionaries)
- **Events do NOT need validators** - validation happens in commands before event creation

### 🔒 CRITICAL: Record Syntax Standard

**ALWAYS use class-style notation for records with `{ get; init; }` properties.**

Never use primary constructor syntax. This ensures:
- Consistent, readable property declarations
- Clear default value handling
- Easy JSON serialization/deserialization
- Marten event store compatibility

```csharp
// ✅ CORRECT: Class-style notation with init properties
public sealed record UserCreatedEvent : AuditableDomainEvent
{
    public Guid UserId { get; init; }
    public string UserName { get; init; } = default!;
    public string Email { get; init; } = default!;
    public Guid HomeOrganizationId { get; init; }
}

// ❌ WRONG: Primary constructor syntax
public sealed record UserCreatedEvent(
    Guid UserId,
    string UserName,
    string Email,
    Guid HomeOrganizationId
) : AuditableDomainEvent;

// ❌ WRONG: Get-only properties with explicit constructor
public sealed record UserCreatedEvent : AuditableDomainEvent
{
    public Guid UserId { get; }
    public string UserName { get; }

    public UserCreatedEvent(Guid userId, string userName)
    {
        UserId = userId;
        UserName = userName;
    }
}
```

**Property Default Values:**

| Type | Pattern | Example |
|------|---------|---------|
| Value types (Guid, int, bool, enum) | No default needed | `public Guid Id { get; init; }` |
| Non-nullable reference types | `= default!;` | `public string Name { get; init; } = default!;` |
| Nullable reference types | No default needed | `public string? Notes { get; init; }` |
| Collections | Explicit empty | `public OrderLine[] Items { get; init; } = Array.Empty<OrderLine>();` |

```csharp
// ✅ Complete example with correct defaults
public sealed record OrderPlacedEvent : AuditableDomainEvent
{
    // Value types - no default needed
    public Guid OrderId { get; init; }
    public decimal TotalAmount { get; init; }
    public bool IsPriority { get; init; }

    // Reference types - use default!
    public string CustomerName { get; init; } = default!;

    // Nullable - no default needed
    public string? Notes { get; init; }

    // Collections - explicit empty default
    public OrderLine[] Items { get; init; } = Array.Empty<OrderLine>();
}
```

**Full Event Example:**
```csharp
// ✅ Good: Immutable, past tense, essential data, class-style notation
public sealed record OrderPlaced : IDomainEvent
{
    public Guid OrderId { get; init; }
    public Guid CustomerId { get; init; }
    public OrderLine[] Items { get; init; } = Array.Empty<OrderLine>();
    public decimal TotalAmount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string CreatedBy { get; init; } = default!;
}

// ❌ Bad: Mutable, present tense, computed values
public class PlaceOrder  // This is a COMMAND not an EVENT!
{
    public Guid OrderId { get; set; }
    public decimal Tax { get; set; }  // Computed!
    public decimal GrandTotal { get; set; }  // Computed!
}
```

**Why Events Don't Need Validators:**
- Events are created ONLY by aggregates/domain services after validation
- Commands are validated BEFORE creating events
- Events represent facts that have already been validated
- Event creation is protected by internal constructors (complex events) or command method validation (simple events)

**Event Registration**
- Explicitly register event types with Marten
- Group related events together
- Document event schemas

```csharp
opts.Events.AddEventType(typeof(OrderPlaced));
opts.Events.AddEventType(typeof(OrderPaid));
opts.Events.AddEventType(typeof(OrderShipped));
```

### Command Design

**Naming Conventions**
- Use **imperative mood** with "Command" suffix: `PlaceOrderCommand`, `ShipOrderCommand`, `RegisterUserCommand`
- Represent user intent or action
- Can fail based on validation or business rules

**Command Structure**
- Define as **immutable C# records**
- Include all data needed to execute the command
- Nest **Validator class** using FluentValidation (validates structure, not business rules)
- Use **init-only properties** for immutability
- Include **three validation helper methods**:
  - `bool IsValid()` - Quick boolean check
  - `ValidationResult Validate()` - Full validation result with errors
  - `void ThrowIfNotValid()` - Throws ValidationException if invalid
- Cache validator instance with `private static readonly Validator _validator = new()`

```csharp
/// <summary>
/// Command to place a new order.
/// Contains embedded validator and validation helper methods.
/// </summary>
public record PlaceOrderCommand
{
    private static readonly Validator _validator = new();

    public Guid CustomerId { get; init; }
    public OrderLine[] Items { get; init; } = Array.Empty<OrderLine>();
    public string PlacedBy { get; init; } = string.Empty;

    /// <summary>
    /// Returns true if the command is valid, false otherwise.
    /// </summary>
    public bool IsValid()
    {
        return _validator.Validate(this).IsValid;
    }

    /// <summary>
    /// Returns the full validation result with detailed error information.
    /// </summary>
    public ValidationResult Validate()
    {
        return _validator.Validate(this);
    }

    /// <summary>
    /// Validates the command and throws ValidationException if invalid.
    /// </summary>
    public void ThrowIfNotValid()
    {
        _validator.ValidateAndThrow(this);
    }

    /// <summary>
    /// Validates command structure (nulls, lengths, required fields).
    /// Does NOT validate business rules - that happens in the aggregate.
    /// </summary>
    public class Validator : AbstractValidator<PlaceOrderCommand>
    {
        public Validator()
        {
            RuleFor(x => x.CustomerId)
                .NotEmpty()
                .WithMessage("Customer ID is required.");

            RuleFor(x => x.Items)
                .NotEmpty()
                .WithMessage("Order must have at least one item.");

            RuleFor(x => x.Items)
                .Must(items => items.All(i => i.Quantity > 0))
                .When(x => x.Items != null && x.Items.Length > 0)
                .WithMessage("All items must have quantity greater than 0.");

            RuleFor(x => x.PlacedBy)
                .NotEmpty()
                .WithMessage("PlacedBy is required.");
        }
    }
}

// Aggregate can use any of the three validation methods
public void PlaceOrder(PlaceOrderCommand command)
{
    // Option 1: Throw if invalid (most common)
    command.ThrowIfNotValid();

    // Option 2: Check boolean (for conditional logic)
    if (!command.IsValid())
        throw new DomainException("Invalid command");

    // Option 3: Get detailed errors (for custom handling)
    var result = command.Validate();
    if (!result.IsValid)
        throw new DomainException(string.Join(", ", result.Errors));

    // Phase 2: Validate business rules
    // ... business logic here ...

    // Create and apply event
    var @event = new OrderPlacedEvent(...);
    Apply(@event);
}
```

### Critical Rule: Two-Phase Validation Strategy

**Commands are validated in TWO phases BEFORE creating events. Events do NOT have validators.**

#### Phase 1: Command Structure Validation
- Use FluentValidation with nested Validator class
- Validates nulls, lengths, required fields, formats
- Does NOT validate business rules
- Throws `ValidationException` if fails

#### Phase 2: Business Rules Validation
- Uses aggregate state to validate business invariants
- Validates uniqueness, existence, state transitions, etc.
- Happens AFTER command structure validation passes
- Throws `DomainException` if fails

**✅ Commands MUST Be Validated**
- Commands represent intent and can be rejected
- Phase 1: Validate structure (FluentValidation)
- Phase 2: Validate business rules (aggregate state)
- Throw exceptions for validation failures

**❌ Events Do NOT Have Validators**
- Events are facts that have already been validated (both phases)
- Events are created ONLY by aggregates after ALL validation passes
- Apply methods do NOT validate events - they only mutate state
- Events represent historical facts and cannot be rejected

```csharp
// Command object with embedded validator (Phase 1)
public record PlaceOrderCommand
{
    public Guid CustomerId { get; init; }
    public OrderLine[] Items { get; init; } = Array.Empty<OrderLine>();
    public string PlacedBy { get; init; } = string.Empty;

    public class Validator : AbstractValidator<PlaceOrderCommand>
    {
        public Validator()
        {
            RuleFor(x => x.CustomerId).NotEmpty();
            RuleFor(x => x.Items).NotEmpty();
            RuleFor(x => x.Items)
                .Must(items => items.All(i => i.Quantity > 0))
                .When(x => x.Items != null && x.Items.Length > 0);
            RuleFor(x => x.PlacedBy).NotEmpty();
        }
    }
}

// ✅ Correct: Two-phase validation in aggregate command method
public void PlaceOrder(PlaceOrderCommand command)
{
    // PHASE 1: Validate command structure
    var validator = new PlaceOrderCommand.Validator();
    validator.ValidateAndThrow(command);

    // PHASE 2: Validate business rules using aggregate state
    if (Status != OrderStatus.Draft)
        throw new DomainException("Order must be in draft status to place");

    if (command.Items.Sum(i => i.Price * i.Quantity) > _creditLimit)
        throw new DomainException("Order exceeds customer credit limit");

    // All validations passed - create event (now immutable fact)
    var @event = new OrderPlacedEvent(
        Id,
        command.CustomerId,
        command.Items,
        command.Items.Sum(i => i.Price * i.Quantity),
        command.PlacedBy,
        DateTimeOffset.UtcNow);

    // Apply event (internal method, pure mutation)
    Apply(@event);
}

// ✅ Correct: Apply event WITHOUT validation (Pure State Mutation)
internal void Apply(OrderPlacedEvent @event)
{
    // NO validation - event already passed both phases
    // Pure state mutation using event data
    Id = @event.OrderId;
    CustomerId = @event.CustomerId;
    Items = @event.Items.ToList();
    TotalAmount = @event.TotalAmount;
    Status = OrderStatus.Placed;
    PlacedAt = @event.PlacedAt;
    PlacedBy = @event.PlacedBy;
    UpdatedAt = @event.PlacedAt;
    Version++;
}
```

**Why Two-Phase Validation:**
- ✅ Clear separation between structural and business validation
- ✅ FluentValidation errors are different from business rule errors
- ✅ Easy to test each phase independently
- ✅ Command structure validated once, business rules may vary by state
- ✅ Validation happens in command methods BEFORE event creation
- ✅ Events are facts that represent something already validated
- ✅ Apply methods are pure state mutations during replay
- ✅ Faster replay - zero validation overhead, never throws
- ✅ True event sourcing - events are immutable historical facts

### Aggregate Design

**Structure**
- **Public getters, private setters** for encapsulation
- **Parameterless private constructor** required by Marten
- **INTERNAL factory methods** - force usage through domain services
- **INTERNAL command methods** - force usage through domain services
- **INTERNAL Apply methods** for all events (one per event type)
- **Apply methods are void** (no Result monad, never throw)
- **Apply methods do NOT validate** - pure state mutation only
- **No public setters** - state changes only via Apply
- **Computed properties** for derived state

**Encapsulation Rationale:**
- Aggregates are **read-only outside the domain assembly**
- All mutations flow through **domain services** which validate:
  - Authorization (does user have permission?)
  - Cross-aggregate rules (is name unique?)
- Aggregates validate only their **own invariants**
- This separation ensures clear responsibility and testability

```csharp
public class Order : AggregateRoot<Guid>
{
    // ════════════════════════════════════════════════════════════
    // Properties - Public getters, private setters
    // ════════════════════════════════════════════════════════════

    public Guid CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public List<OrderLine> Items { get; private set; } = new();
    public decimal TotalAmount { get; private set; }
    public DateTimeOffset? PlacedAt { get; private set; }
    public string PlacedBy { get; private set; } = string.Empty;

    // Computed properties (not persisted)
    public bool IsPending => Status == OrderStatus.Placed;
    public int ItemCount => Items.Count;

    // ════════════════════════════════════════════════════════════
    // Constructors
    // ════════════════════════════════════════════════════════════

    // Parameterless constructor for Marten (private)
    private Order() : base() { }

    // ════════════════════════════════════════════════════════════
    // INTERNAL Factory Method (Called by Domain Service)
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Creates a new order with two-phase validation.
    /// Internal: Force usage through OrderFactory domain service.
    /// </summary>
    internal static Order Create(CreateOrderCommand command, UserContext? executingUser)
    {
        // Phase 1: Validate command structure
        command.ThrowIfNotValid();

        // Phase 2: Validate business rules (aggregate-specific only)
        // Cross-aggregate rules validated by domain service

        var @event = new OrderCreatedEvent(...);
        var order = new Order();
        order.Apply(@event);
        return order;
    }

    // ════════════════════════════════════════════════════════════
    // INTERNAL Command Methods (Called by Domain Service)
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Places an order with two-phase validation.
    /// Internal: Force usage through domain service.
    /// </summary>
    internal void PlaceOrder(PlaceOrderCommand command, UserContext? executingUser)
    {
        // PHASE 1: Validate command structure
        var validator = new PlaceOrderCommand.Validator();
        validator.ValidateAndThrow(command);

        // PHASE 2: Validate business rules
        if (Status != OrderStatus.Draft)
            throw new DomainException("Order must be in draft status");

        if (command.Items.Sum(i => i.Price * i.Quantity) == 0)
            throw new DomainException("Order total must be greater than zero");

        // All validations passed - create event
        var @event = new OrderPlacedEvent(
            Id,
            command.CustomerId,
            command.Items,
            command.Items.Sum(i => i.Price * i.Quantity),
            command.PlacedBy,
            DateTimeOffset.UtcNow);

        // Apply event (internal method)
        Apply(@event);
    }

    internal void PayOrder(PayOrderCommand command, UserContext? executingUser)
    {
        // Validation...
        var @event = new OrderPaidEvent(Id, command.PaidBy, DateTimeOffset.UtcNow);
        Apply(@event);
    }

    internal void ShipOrder(ShipOrderCommand command, UserContext? executingUser)
    {
        // Validation...
        var @event = new OrderShippedEvent(Id, command.ShippedBy, DateTimeOffset.UtcNow);
        Apply(@event);
    }

    // ════════════════════════════════════════════════════════════
    // INTERNAL Apply Methods (Pure State Mutation)
    // ════════════════════════════════════════════════════════════
    //
    // CRITICAL: Apply methods are INTERNAL and NEVER throw
    // - Only Marten calls these during event replay
    // - NO validation - events already validated
    // - Pure state mutation based on event data
    // - Safe to replay at any time
    //
    // ════════════════════════════════════════════════════════════

    /// <summary>
    /// Applies OrderPlacedEvent to reconstitute aggregate state.
    /// Pure state mutation - no validation, never throws.
    /// </summary>
    internal void Apply(OrderPlacedEvent @event)
    {
        // Pure state mutation - no validation
        Id = @event.OrderId;
        CustomerId = @event.CustomerId;
        Items = @event.Items.ToList();
        TotalAmount = @event.TotalAmount;
        Status = OrderStatus.Placed;
        PlacedAt = @event.PlacedAt;
        PlacedBy = @event.PlacedBy;
        UpdatedAt = @event.PlacedAt;
        Version++;
    }

    internal void Apply(OrderPaidEvent @event)
    {
        // Pure state mutation
        Status = OrderStatus.Paid;
        UpdatedAt = @event.PaidAt;
        Version++;
    }

    internal void Apply(OrderShippedEvent @event)
    {
        // Pure state mutation
        Status = OrderStatus.Shipped;
        UpdatedAt = @event.ShippedAt;
        Version++;
    }
}
```

**Aggregate Principles**
- One aggregate per stream
- Enforce invariants within aggregate boundary
- Reference other aggregates by ID only (no direct references)
- Keep aggregates small and focused
- Load entire aggregate (no lazy loading)
- Transaction boundary = one aggregate

### Event Streams

**Stream Identity**
- Use Guid as stream identifier
- Stream ID = Aggregate ID
- One stream per aggregate instance

**Stream Operations**
- **StartStream<T>()**: Create new stream with initial event(s)
- **Append()**: Add event to existing stream
- **AppendExclusive()**: Add with exclusive lock
- **AggregateStreamAsync<T>()**: Rebuild aggregate from events

```csharp
// Start new stream
var streamId = _session.Events.StartStream<Order>(
    new OrderPlaced(...)
).Id;

// Append to existing stream
_session.Events.Append(orderId, new OrderPaid(...));

// Load aggregate
var order = await _session.Events.AggregateStreamAsync<Order>(orderId);
```

**Concurrency Control**
- Use **optimistic concurrency** with expected version
- Use **AppendExclusive()** for critical operations
- Handle ConcurrencyException appropriately

```csharp
// Optimistic concurrency
_session.Events.Append(orderId,
    expectedVersion: 3,
    new OrderShipped(...)
);

// Exclusive lock
await _session.Events.AppendExclusive(orderId,
    new PaymentProcessed(...)
);
```

### CQRS Pattern

**Write Side (Commands)**
- Accept commands via API endpoints
- Validate commands (structure + business rules)
- Create and append events
- Optimized for consistency

**Read Side (Queries)**
- Query projections, not event streams
- Use IQuerySession for read-only operations
- Optimized for query performance
- Can be eventually consistent

```
┌─────────────┐
│  Commands   │  Write side
├─────────────┤
│   Events    │  Event store
├─────────────┤
│ Projections │  Read models
├─────────────┤
│   Queries   │  Read side
└─────────────┘
```

### Projection Strategies

**Inline Projections**
- Updated **synchronously** when events are saved
- Same transaction as event storage
- **Strongly consistent** with write side
- Use for critical read models

```csharp
public class OrderSummaryProjection : SingleStreamProjection<OrderSummary>
{
    public static OrderSummary Create(IEvent<OrderPlaced> placed) =>
        new OrderSummary
        {
            Id = placed.StreamId,
            CustomerId = placed.Data.CustomerId,
            Status = OrderStatus.Placed
        };

    public OrderSummary Apply(OrderPaid paid, OrderSummary current) =>
        current with { Status = OrderStatus.Paid };
}

// Register inline
opts.Projections.Add<OrderSummaryProjection>(ProjectionLifecycle.Inline);
```

**Async Projections**
- Updated **in background** by async daemon
- **Eventually consistent**
- Use for complex aggregations or cross-stream views
- Better performance for write operations

```csharp
public class CustomerDashboardProjection : MultiStreamProjection<CustomerDashboard, Guid>
{
    public CustomerDashboardProjection()
    {
        Identity<OrderPlaced>(e => e.CustomerId);
        Identity<OrderShipped>(e => e.CustomerId);
    }

    public void Apply(CustomerDashboard dashboard, OrderPlaced placed)
    {
        dashboard.TotalOrders++;
        dashboard.TotalSpent += placed.TotalAmount;
    }
}

// Register async
opts.Projections.Add<CustomerDashboardProjection>(ProjectionLifecycle.Async);
```

**Live Aggregations**
- Rebuild from events on-demand
- No persistence
- Always current
- Use when reads are infrequent

```csharp
opts.Projections.Snapshot<Order>(SnapshotLifecycle.Live);

// Rebuild every time
var order = await _session.Events.AggregateStreamAsync<Order>(orderId);
```

### Wolverine Handler Patterns

**Aggregate Handlers**
- Use **[AggregateHandler]** attribute
- Pure functions returning events
- Wolverine handles infrastructure (load, save, etc.)

```csharp
public static class OrderHandlers
{
    // Create new aggregate
    [AggregateHandler]
    public static OrderPlaced Handle(PlaceOrder command)
    {
        command.ThrowIfNotValid();

        return new OrderPlaced(
            Guid.NewGuid(),
            command.CustomerId,
            command.Items,
            command.Items.Sum(i => i.Price * i.Quantity),
            DateTimeOffset.UtcNow
        );
    }

    // Update existing aggregate
    [AggregateHandler]
    public static IEnumerable<object> Handle(ShipOrder command, Order order)
    {
        command.ThrowIfNotValid();

        // Business rule validation
        if (order.Status != OrderStatus.Paid)
        {
            throw new InvalidOperationException(
                "Order must be paid before shipping"
            );
        }

        yield return new OrderShipped(
            command.TrackingNumber,
            command.Carrier,
            DateTimeOffset.UtcNow
        );
    }
}
```

**Query Handlers**
```csharp
public static class OrderQueries
{
    public static async Task<OrderSummary?> Handle(
        GetOrder query,
        IQuerySession session)
    {
        return await session.LoadAsync<OrderSummary>(query.OrderId);
    }

    public static async Task<List<OrderSummary>> Handle(
        GetCustomerOrders query,
        IQuerySession session)
    {
        return await session
            .Query<OrderSummary>()
            .Where(o => o.CustomerId == query.CustomerId)
            .OrderByDescending(o => o.PlacedAt)
            .ToListAsync();
    }
}
```

### Result Pattern at API Boundary

**Use Result Pattern in Controllers/Endpoints Only**
- Provides structured responses to clients
- Convert exceptions to appropriate HTTP responses
- Keep handlers and domain using exceptions

```csharp
public class ApiResult<T>
{
    public bool IsSuccess { get; set; }
    public T? Data { get; set; }
    public string[] Errors { get; set; } = Array.Empty<string>();

    public static ApiResult<T> Success(T data) =>
        new() { IsSuccess = true, Data = data };

    public static ApiResult<T> Failure(params string[] errors) =>
        new() { IsSuccess = false, Errors = errors };

    public static ApiResult<T> ValidationFailure(ValidationResult validation) =>
        new()
        {
            IsSuccess = false,
            Errors = validation.Errors.Select(e => e.ErrorMessage).ToArray()
        };
}

// Controller usage
[HttpPost]
public async Task<IActionResult> PlaceOrder(PlaceOrder command)
{
    var validation = command.IsValid();
    if (!validation.IsValid)
    {
        return BadRequest(ApiResult<Guid>.ValidationFailure(validation));
    }

    try
    {
        var orderId = await _messageBus.InvokeAsync<Guid>(command);
        return Ok(ApiResult<Guid>.Success(orderId));
    }
    catch (InvalidOperationException ex)
    {
        return BadRequest(ApiResult<Guid>.Failure(ex.Message));
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error placing order");
        return StatusCode(500,
            ApiResult<Guid>.Failure("An unexpected error occurred"));
    }
}
```

**Response Format**
```json
// Success
{
  "isSuccess": true,
  "data": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "errors": []
}

// Validation failure
{
  "isSuccess": false,
  "data": null,
  "errors": [
    "Customer is required",
    "Order must have at least one item"
  ]
}

// Business rule failure
{
  "isSuccess": false,
  "data": null,
  "errors": [
    "Order must be paid before shipping"
  ]
}
```

### Schema Evolution

**Event Versioning Strategies**
- **Weak Schema**: Add optional fields, never remove
- **Event Versioning**: Create V2 events, use upcasters
- **Multiple Handlers**: Handle both old and new versions

```csharp
// V1: Simple event
public record OrderPlacedV1(Guid OrderId, decimal Total);

// V2: Enhanced event
public record OrderPlacedV2(
    Guid OrderId,
    Guid CustomerId,  // New field
    decimal Total
);

// Upcaster
public class OrderPlacedUpcaster
{
    public OrderPlacedV2 Upcast(OrderPlacedV1 old)
    {
        return new OrderPlacedV2(
            old.OrderId,
            Guid.Empty,  // Default for missing data
            old.Total
        );
    }
}

// Handle both versions in Apply
public void Apply(OrderPlacedV1 e) { /* ... */ }
public void Apply(OrderPlacedV2 e) { /* ... */ }
```

### Testing Event-Sourced Systems

**Testing Strategy**

Event-sourced systems with Wolverine have a clear separation of concerns that must be reflected in your testing strategy:

> **Unit Tests** → Test Projection Apply methods (NO infrastructure, call command methods)
> **Integration Tests** → Test Wolverine Commands/Queries (WITH infrastructure, use IMessageBus)

#### Unit Test Pattern (Projections)

**Production Example** from `test/DevJoy.Rbac.Core.Tests/Organization/OrganizationalUnitEventTests.cs`:

```csharp
public class OrganizationalUnitEventTests
{
    // Simple helper used 5+ times
    private static OrganizationAggregate CreateTestOrganization(string name = "test_organization")
    {
        var createEvent = new OrganizationCreatedEvent
        {
            OrganizationId = Guid.NewGuid(),
            Name = name,
            Description = "Test Description",
            CreatedBy = "test-user",
            CreatedAt = DateTimeOffset.UtcNow
        };

        return OrganizationAggregate.Create(createEvent);
    }

    [Fact]
    public void AddOrganizationalUnit_ToRootLevel_ShouldAddSuccessfully()
    {
        // Arrange
        var org = CreateTestOrganization();
        var ouId = Guid.NewGuid();
        var parentPath = org.Path;

        // Act - Call COMMAND METHOD (not Apply directly)
        org.AddOrganizationalUnit(ouId, parentPath, "Engineering", "Engineering Department", "test-user");

        // Assert
        org.SubOrganizationalUnits.Should().HaveCount(1);
        var ou = org.SubOrganizationalUnits.First();
        ou.Name.Should().Be("Engineering");
        ou.Path.Value.Should().Be($"{parentPath.Value}.engineering");
        org.Version.Should().Be(2);
    }
}
```

**Key Points:**
- ✅ Call command methods (`AddOrganizationalUnit`), NOT `Apply` directly
- ✅ Command method creates event and calls Apply internally
- ✅ NO database, NO Marten infrastructure (pure functions)
- ✅ Fast execution (microseconds)
- ✅ Single helper method used 5+ times
- ✅ AAA structure with clear comments
- ✅ FluentAssertions for readability

#### Integration Test Pattern (Wolverine)

**Production Example** from `test/DevJoy.Rbac.IntegrationTests/Organization/Commands/CreateOrganizationTests.cs`:

```csharp
[Collection("Marten")]  // Shares MartenFixture across tests
public class CreateOrganizationTests
{
    private readonly MartenFixture _fixture;

    public CreateOrganizationTests(MartenFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateOrganization_with_valid_command_succeeds()
    {
        // Arrange - Command record with named parameters
        var createCommand = new CreateOrganizationCommand(
            Name: "Test Org",
            Description: "A test organization",
            CreatedBy: "tester@example.com"
        );

        // Act - Send command through Wolverine message bus
        var createdEvent = await _fixture.Bus.InvokeAsync<OrganizationCreatedEvent>(createCommand);

        // Assert - Query via Wolverine to verify projection
        var query = new GetOrganizationByIdQuery(createdEvent.OrganizationId);
        var organization = await _fixture.Bus.InvokeAsync<OrganizationDto?>(query);

        organization.Should().NotBeNull();
        organization!.Id.Should().Be(createdEvent.OrganizationId);
        organization.Name.Should().Be("Test Org");
        organization.Description.Should().Be("A test organization");
        organization.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateOrganization_with_empty_name_throws_validation_exception()
    {
        // Arrange
        var createCommand = new CreateOrganizationCommand(
            Name: "",
            Description: "Valid description",
            CreatedBy: "tester@example.com"
        );

        // Act & Assert - Test FluentValidation failure
        var exception = await Should.ThrowAsync<FluentValidation.ValidationException>(
            async () => await _fixture.Bus.InvokeAsync<OrganizationCreatedEvent>(createCommand)
        );

        exception.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Organization name is required");
    }
}
```

**Key Points:**
- ✅ Use Wolverine `IMessageBus.InvokeAsync<T>()` for commands and queries
- ✅ Commands return events (`OrganizationCreatedEvent`)
- ✅ Queries return DTOs (`OrganizationDto`)
- ✅ WITH real PostgreSQL via Testcontainers
- ✅ WITH Marten + Wolverine infrastructure
- ✅ Test complete workflow: command → event → projection → query
- ✅ Test FluentValidation failures
- ✅ Use `[Collection("Marten")]` for fixture sharing

**MartenFixture Example:**

```csharp
public class MartenFixture : IAsyncLifetime
{
    public IServiceProvider Services { get; private set; } = null!;
    public IMessageBus Bus { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        var services = new ServiceCollection();

        // Configure Marten with Testcontainers
        services.AddMarten(opts =>
        {
            opts.Connection("YOUR_TESTCONTAINER_CONNECTION_STRING");
            opts.DatabaseSchemaName = "test";

            // Register events
            opts.Events.AddEventType<OrganizationCreatedEvent>();
            // ... register all events

            // Register projections
            opts.Projections.Add<OrganizationSummaryProjection>(ProjectionLifecycle.Inline);
        })
        .IntegrateWithWolverine();

        services.AddWolverine(opts =>
        {
            opts.Discovery.IncludeAssembly(typeof(CreateOrganizationCommand).Assembly);
        });

        Services = services.BuildServiceProvider();
        Bus = Services.GetRequiredService<IMessageBus>();

        // Clean database before tests
        await using var store = Services.GetRequiredService<IDocumentStore>();
        await store.Advanced.Clean.DeleteAllDocumentsAsync();
        await store.Advanced.Clean.DeleteAllEventDataAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;
}

[CollectionDefinition("Marten")]
public class MartenCollection : ICollectionFixture<MartenFixture> { }
```

#### Testing Comparison

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| **What to test** | Apply methods, projection logic | Wolverine commands/queries, end-to-end flows |
| **How to test** | Call command methods on aggregate | Use `IMessageBus.InvokeAsync<T>()` |
| **Infrastructure** | NONE (no database) | PostgreSQL + Marten + Wolverine |
| **Speed** | Microseconds | Milliseconds |
| **Assertions** | State changes, version, timestamps | Query results, validation errors |
| **Location** | `DevJoy.Rbac.Core.Tests` | `DevJoy.Rbac.IntegrationTests` |

This separation ensures:
- ✅ Integration tests verify end-to-end flows through Wolverine message bus
- ✅ Unit tests verify projection logic in isolation (fast, no infrastructure)
- ✅ Clear separation of concerns
- ✅ Fast feedback loop (unit tests run in microseconds)
- ✅ Clear boundaries between infrastructure testing and domain testing
- ✅ Tests remain maintainable as system grows

**❌ DO NOT:**
- Test projections in integration tests (unit test them instead)
- Test Wolverine infrastructure in unit tests (integration test it instead)
- Mix concerns by testing both in the same test

---

#### Unit Tests: Projections and Apply Methods

**Purpose:** Verify that projections correctly transform events into read models.

**What to Test:**
- Apply methods correctly update aggregate state
- Projection logic correctly builds read models from events
- Computed properties derive correct values
- Edge cases in projection logic

**Characteristics:**
- ⚡ Extremely fast (no database, no infrastructure)
- 🔒 Isolated (pure function testing)
- 📝 Simple (just call Apply and assert state)

```csharp
// ✅ CORRECT: Unit test for projection logic
[Fact]
public void Apply_OrderPlaced_sets_status_to_placed()
{
    // Arrange
    var order = new Order();
    var @event = new OrderPlaced(
        Guid.NewGuid(),
        Guid.NewGuid(),
        new[] { new OrderLine("Product", 1, 100m) },
        100m,
        DateTimeOffset.UtcNow
    );

    // Act
    order.Apply(@event);

    // Assert
    order.Status.Should().Be(OrderStatus.Placed);
    order.Items.Should().HaveCount(1);
    order.TotalAmount.Should().Be(100m);
}

[Fact]
public void Apply_OrderPaid_changes_status_to_paid()
{
    // Arrange
    var order = new Order();
    order.Apply(new OrderPlaced(...));

    // Act
    order.Apply(new OrderPaid(DateTimeOffset.UtcNow));

    // Assert
    order.Status.Should().Be(OrderStatus.Paid);
}

[Fact]
public void IsPending_returns_true_when_status_is_placed()
{
    // Arrange
    var order = new Order();
    order.Apply(new OrderPlaced(...));

    // Assert
    order.IsPending.Should().BeTrue();
}
```

**Unit Testing Projection Classes**
```csharp
// ✅ CORRECT: Unit test for projection class
[Fact]
public void OrderSummaryProjection_Create_maps_event_correctly()
{
    // Arrange
    var streamId = Guid.NewGuid();
    var placed = new Event<OrderPlaced>
    {
        StreamId = streamId,
        Data = new OrderPlaced(...)
    };

    // Act
    var summary = OrderSummaryProjection.Create(placed);

    // Assert
    summary.Id.Should().Be(streamId);
    summary.Status.Should().Be(OrderStatus.Placed);
}

[Fact]
public void OrderSummaryProjection_Apply_updates_status()
{
    // Arrange
    var current = new OrderSummary { Status = OrderStatus.Placed };
    var paid = new OrderPaid(DateTimeOffset.UtcNow);

    // Act
    var updated = OrderSummaryProjection.Apply(paid, current);

    // Assert
    updated.Status.Should().Be(OrderStatus.Paid);
}
```

---

#### Integration Tests: Wolverine Commands and Queries

**Purpose:** Verify end-to-end workflows through Wolverine message bus with real Marten event store.

**What to Test:**
- Commands create correct events in event store
- Events are persisted to database
- Projections are updated (inline projections)
- Queries return correct data from projections
- Concurrency control works
- Business rules are enforced in handlers

**Characteristics:**
- 🐌 Slower (database required)
- 🌐 End-to-end (real infrastructure)
- 📊 Complete (verifies entire flow)

```csharp
// ✅ CORRECT: Integration test for Wolverine endpoints
public class OrderIntegrationTests : IClassFixture<MartenFixture>
{
    private readonly MartenFixture _fixture;

    public OrderIntegrationTests(MartenFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task PlaceOrder_command_creates_event_and_updates_projection()
    {
        // Arrange
        var command = new PlaceOrder(
            CustomerId: Guid.NewGuid(),
            Items: new[] { new OrderLine("Product", 1, 100m) }
        );

        // Act - Test Wolverine command handler
        var orderId = await _fixture.Bus.InvokeAsync<Guid>(command);

        // Assert - Verify event was created
        await using var session = _fixture.Store.QuerySession();

        // ✅ Query the projection (NOT the event stream)
        var summary = await session.LoadAsync<OrderSummary>(orderId);

        summary.Should().NotBeNull();
        summary!.Status.Should().Be(OrderStatus.Placed);
        summary.CustomerId.Should().Be(command.CustomerId);
    }

    [Fact]
    public async Task GetOrder_query_returns_order_summary()
    {
        // Arrange - Create order via command
        var placeOrder = new PlaceOrder(...);
        var orderId = await _fixture.Bus.InvokeAsync<Guid>(placeOrder);

        // Act - Test Wolverine query handler
        var query = new GetOrder(orderId);
        var result = await _fixture.Bus.InvokeAsync<OrderSummary?>(query);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(orderId);
    }

    [Fact]
    public async Task ShipOrder_enforces_business_rule_order_must_be_paid()
    {
        // Arrange - Create unpaid order
        var placeOrder = new PlaceOrder(...);
        var orderId = await _fixture.Bus.InvokeAsync<Guid>(placeOrder);
        // Note: NOT paid

        // Act & Assert - Business rule should be enforced
        var shipCommand = new ShipOrder(orderId, "TRACK123", "UPS");

        await Should.ThrowAsync<InvalidOperationException>(async () =>
            await _fixture.Bus.InvokeAsync(shipCommand)
        );
    }

    [Fact]
    public async Task Complete_order_workflow_from_place_to_ship()
    {
        // Arrange & Act - Full workflow through Wolverine
        var customerId = Guid.NewGuid();

        // Place order
        var placeOrder = new PlaceOrder(customerId, new[] { new OrderLine("Product", 1, 100m) });
        var orderId = await _fixture.Bus.InvokeAsync<Guid>(placeOrder);

        // Pay order
        var payOrder = new PayOrder(orderId, 100m);
        await _fixture.Bus.InvokeAsync(payOrder);

        // Ship order
        var shipOrder = new ShipOrder(orderId, "TRACK123", "UPS");
        await _fixture.Bus.InvokeAsync(shipOrder);

        // Assert - Verify final state via query
        var query = new GetOrder(orderId);
        var result = await _fixture.Bus.InvokeAsync<OrderSummary?>(query);

        result.Should().NotBeNull();
        result!.Status.Should().Be(OrderStatus.Shipped);
    }
}
```

**❌ WRONG: Don't test projections in integration tests**
```csharp
// ❌ WRONG: Testing Apply method with database
[Fact]
public async Task Apply_OrderPlaced_updates_database()  // NO! Use unit test
{
    await using var session = _store.LightweightSession();
    var order = new Order();
    order.Apply(new OrderPlaced(...));
    // This should be a UNIT test, not integration
}

// ❌ WRONG: Loading events directly instead of using queries
[Fact]
public async Task Can_load_order_from_event_stream()  // NO! Test queries instead
{
    await using var session = _store.QuerySession();
    var order = await session.Events.AggregateStreamAsync<Order>(orderId);
    // Should test queries that return projections, not event stream loading
}
```

---

#### Given-When-Then Pattern (Unit Tests)

For testing handler business logic in isolation using historical state:

```csharp
// ✅ CORRECT: Unit test with Given-When-Then (no database)
[Fact]
public void Cannot_ship_unpaid_order()
{
    // Given - Build historical state
    var order = new Order();
    order.Apply(new OrderPlaced(
        Guid.NewGuid(),
        Guid.NewGuid(),
        new[] { new OrderLine("Product", 1, 100m) },
        100m,
        DateTimeOffset.UtcNow
    ));
    // Note: Order is placed but NOT paid

    // When - Execute command handler
    var command = new ShipOrder(order.Id, "TRACK123", "UPS");

    // Then - Should enforce business rule
    Should.Throw<InvalidOperationException>(() =>
        OrderHandlers.Handle(command, order).ToList()
    );
}

[Fact]
public void Can_ship_paid_order()
{
    // Given - Build complete historical state
    var order = new Order();
    order.Apply(new OrderPlaced(...));
    order.Apply(new OrderPaid(DateTimeOffset.UtcNow));  // Paid!

    // When
    var command = new ShipOrder(order.Id, "TRACK123", "UPS");

    // Then
    var events = OrderHandlers.Handle(command, order).ToList();

    events.Should().ContainSingle();
    events[0].Should().BeOfType<OrderShipped>();
}
```

---

#### Testing Summary

| Test Type | What to Test | Infrastructure | Speed | Focus |
|-----------|--------------|----------------|-------|-------|
| **Unit Tests** | Projections, Apply methods, computed properties | None | ⚡ Extremely fast | Domain logic |
| **Integration Tests** | Commands, Queries, end-to-end workflows | Marten + Wolverine | 🐌 Slower | Infrastructure + domain |

**Key Principle:** If it's a projection transformation (event → state), unit test it. If it's a Wolverine endpoint (command/query), integration test it.

### Anti-Patterns to Avoid

1. **Creating Events in Application Layer** - Events MUST only be created by aggregates, never by application layer
2. **Passing Individual Parameters Instead of Commands** - Use command objects, not individual parameters
3. **Skipping Command Object Validators** - All command objects MUST have embedded Validator class
4. **Public Apply Methods** - Apply methods MUST be internal, only Marten should call them
5. **Calling Apply() from Application Layer** - Apply is INTERNAL for event replay only, call command methods
6. **Adding Validators to Events** - Events are facts, validation happens in commands before event creation
7. **Validating Events in Apply Methods** - Apply methods should only mutate state, NEVER validate or throw
8. **Single-Phase Validation** - MUST use two-phase validation (structure + business rules)
9. **Result Monad in Apply Methods** - Apply methods are void and NEVER throw exceptions
10. **Computed Values in Events** - Store raw data, compute later
11. **Generic Event Names** - Use specific domain language (past tense)
12. **Querying Events Directly** - Use projections instead
13. **Deleting Events** - Use compensating events
14. **Fat Events** - Include only essential data
15. **Business Logic in Projections** - Keep projections as transformations
16. **Large Aggregates** - Split into smaller boundaries
17. **Cross-Aggregate Transactions** - Use sagas or eventual consistency
18. **Public Setters on Aggregates** - State changes only via internal Apply methods
19. **Returning Tuples with Aggregate and Event** - The aggregate CONTAINS its domain events via `AddDomainEvent()`. Never return `(Aggregate, Event)` tuples - callers access events through `aggregate.DomainEvents`

### 🔒 CRITICAL: No Tuple Returns for Aggregates and Events

**Aggregates contain their own domain events. NEVER return tuple of (Aggregate, Event).**

The aggregate stores domain events internally via `AddDomainEvent(@event)`. Callers access events through the aggregate's `DomainEvents` property.

```csharp
// ❌ WRONG: Returning tuple of aggregate and event
public Result<(OrganizationAggregate Aggregate, OrganizationCreatedEvent Event)> CreateOrganization(...)
{
    var @event = new OrganizationCreatedEvent(...);
    var aggregate = OrganizationAggregate.Create(@event);
    return Result<(OrganizationAggregate, OrganizationCreatedEvent)>.Success((aggregate, @event));
}

// ✅ CORRECT: Return only the aggregate - events are accessible via DomainEvents
public Result<OrganizationAggregate> CreateOrganization(...)
{
    var @event = new OrganizationCreatedEvent(...);
    var aggregate = OrganizationAggregate.Create(@event);
    return Result<OrganizationAggregate>.Success(aggregate);
}

// Caller accesses events from aggregate
var result = service.CreateOrganization(command);
var aggregate = result.Value;
var events = aggregate.DomainEvents;  // Contains OrganizationCreatedEvent
var createdEvent = events.OfType<OrganizationCreatedEvent>().First();
```

**Why This Matters:**
- ✅ Single source of truth - aggregate owns its events
- ✅ Prevents duplicate event references
- ✅ Simpler API - fewer things to track
- ✅ Consistent with DDD aggregate pattern
- ✅ Events are automatically cleared after persistence

### When to Use Event Sourcing

**✅ Ideal Use Cases**
- Audit-heavy systems (financial, healthcare, legal)
- Complex workflows and state machines
- Temporal queries ("state at time X")
- Domain-driven design with rich domain models
- Event-driven microservices
- Analytics and reporting needs

**❌ Not Ideal For**
- Simple CRUD applications
- High-throughput simple data (logging, metrics)
- Teams unfamiliar with patterns (steep learning curve)
- Real-time cross-aggregate consistency requirements

---

## Vertical Slice Architecture

### Core Principle

Rather than organizing code by technical layers (Controllers, Services, Repositories, Models), **vertical slice architecture organizes code by business feature or command**. Every piece of code related to a specific operation lives together in one place.

> "Every single bit of code related to handling this operation in our system is in one file that we can read top to bottom." — Jeremy D. Miller

### File Organization Pattern

**Single-File Feature Approach**: For straightforward operations, group all related code in one file named after the command or request model.

**What Goes in a Vertical Slice File**:
1. Command/Request definition
2. Validator (nested as inner class)
3. Response model
4. Endpoint/Handler logic
5. Related middleware (pre-processing)

### Complete Examples

**Full Vertical Slice Implementation**:
📁 `examples/event-sourcing/vertical-slice/CategoriseIncident.cs` - Complete feature in one file with command, validator, handler, endpoint, and tests

**Creating New Event Streams**:
📁 `examples/event-sourcing/vertical-slice/LogIncident.cs` - Shows how to start a new event stream with validation

### Architectural Benefits

| Benefit | Description |
|---------|-------------|
| **Cohesion** | Related code stays together rather than scattered across projects/folders |
| **Readability** | Single cause-and-effect chain visible without jumping between files |
| **Testability** | Pure functions in handlers remain easily unit-testable |
| **Clarity** | Codebase structure communicates business capabilities directly |
| **Velocity** | Changes isolated to single file reduce merge conflicts |
| **Discoverability** | New developers find everything related to a feature in one place |

### When to Deviate from Single-File Pattern

Break up the single file when:
- Handler logic exceeds ~200 lines
- Multiple related commands share significant logic
- Complex domain logic deserves its own file
- Code reuse across features is needed
- File exceeds ~400 lines
- Readability suffers from too many nested classes

---

## Pure Function Testing (A-Frame Model)

### Philosophy

Wolverine and Marten coordinate infrastructure concerns while business logic remains as **pure functions** that are trivial to test. This is called the "A-Frame" model:

```
Infrastructure (Wolverine/Marten) → Business Logic (Pure Functions) ← Infrastructure
```

The framework handles:
- Loading aggregates from event streams
- Saving events to the database
- Publishing messages to queues
- Transaction management
- Error handling and retries

Your code handles:
- Pure business decisions
- Returning events and messages
- Validating commands

### Testing Patterns

**Cascading Messages Pattern**:
📁 `examples/event-sourcing/testing/PureFunctionTests.cs` - Shows pure function testing with `OutgoingMessages`, compound handler decomposition, and comparison with traditional mocking approaches

**Given-When-Then Pattern**:
📁 `examples/event-sourcing/testing/GivenWhenThenTests.cs` - Behavior-driven testing by building up historical state with events

### Key Benefits

- ✅ No mocking required
- ✅ Tests run in microseconds
- ✅ No database, no message bus, no infrastructure
- ✅ Pure input → output testing
- ✅ Wolverine handles publishing in real execution

**Comparison**:
- Traditional: 25+ lines, 3 mocks, setup complexity, brittle
- Pure function: 5 lines, no mocks, simple assertions, robust

---

## Live Projections Deep Dive

Live projections rebuild aggregate state from events **on every query**. No persistence, always current, but requires event replay.

### Use Cases

| Scenario | When to Use Live Projections |
|----------|------------------------------|
| **Infrequent Reads** | Aggregate queried rarely, rebuilding on-demand is acceptable |
| **Always Current** | Must see absolutely latest state (no eventual consistency lag) |
| **Manageable Event Count** | Stream has <1000 events (rebuild is fast) |
| **Complex Projections** | Projection logic is expensive to maintain as persistent view |
| **Development/Testing** | Rapid iteration without rebuilding async projections |

### Implementation Patterns

**Mutable Class Pattern**:
📁 `examples/event-sourcing/projections/MutableProjection.cs` - Constructor handles first event, Apply methods mutate state for subsequent events

**Immutable Record Pattern**:
📁 `examples/event-sourcing/projections/ImmutableProjection.cs` - Functional programming style with `SingleStreamProjection<T>` and record syntax

### Performance Considerations

| Event Count | Rebuild Time | Recommendation |
|-------------|--------------|----------------|
| < 100 | < 10ms | Live aggregation perfect |
| 100-1000 | 10-100ms | Live aggregation acceptable |
| 1000-5000 | 100-500ms | Consider snapshots |
| > 5000 | > 500ms | Use inline/async projections instead |

### Comparison: Live vs Inline vs Async

| Aspect | Live | Inline | Async |
|--------|------|--------|-------|
| **Read Latency** | High (rebuild) | Low (pre-built) | Low (pre-built) |
| **Write Latency** | Low | Medium (sync update) | Low (deferred) |
| **Consistency** | Immediate | Immediate | Eventual |
| **Storage** | None | Database table | Database table |
| **Maintenance** | None | Low | Medium |
| **Best For** | Infrequent reads | Critical reads | Complex aggregations |

