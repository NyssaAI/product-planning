# Domain-Driven Design (DDD) Standards

### Core Principles
- **Ubiquitous Language**: Use business terminology consistently in code, discussions, and documentation
- **Bounded Contexts**: Define clear boundaries for different domains within the system
- **Domain Model Focus**: Place business logic in the domain model, not in services or controllers
- **Strategic Design**: Align software structure with business domains
- **Tactical Patterns**: Use building blocks (entities, value objects, aggregates) consistently

### Bounded Contexts
- **Single Responsibility**: Each bounded context handles one subdomain
- **Explicit Boundaries**: Define context boundaries in documentation and folder structure
- **Independent Models**: Each context can have its own model of shared concepts
- **Avoid Sharing**: Don't share domain models across contexts; use DTOs or integration events

### Entities
- **Identity**: Entities have unique identity that persists over time
- **Equality**: Compare by ID, not by properties
- **Mutable State**: Entities can change state over time
- **Business Methods**: Include behavior that enforces business rules
- **No Public Setters**: State changes through methods, not property setters
- **Private Constructors**: Use factory methods or builders for complex creation

### Value Objects
- **No Identity**: Defined entirely by their attributes
- **Immutable**: Once created, cannot be changed
- **Equality by Value**: Compare all properties for equality
- **Side-Effect Free**: Methods don't modify state; return new instances
- **Self-Validating**: Validate in constructor; invalid value objects cannot exist
- **Use Record Types**: C# records are ideal for value objects
- **Small and Focused**: Represent a single concept (Money, Email, Address)

### Aggregates
- **Consistency Boundary**: Enforce invariants within aggregate boundaries
- **Single Root**: Access internal entities only through aggregate root
- **Transaction Boundary**: One transaction per aggregate modification
- **Small Aggregates**: Keep aggregates small; large aggregates indicate poor boundaries
- **Reference by ID**: Aggregates reference other aggregates by ID, not direct references
- **Load Fully**: Always load entire aggregate; no lazy loading of aggregate members
- **Eventual Consistency**: Use domain events for inter-aggregate consistency

### Aggregate Roots
- **Entry Point**: Only way to access and modify aggregate
- **Enforce Invariants**: Validate aggregate-specific business rules (cross-aggregate rules belong in domain services)
- **Coordinate Changes**: Manage changes to internal entities and value objects
- **Emit Domain Events**: Create events after validation passes in command methods
- **No Public Collections**: Return read-only collections
- **Version History**: All apply methods increment the version number and the last updated date to track version history
- **Two-Phase Validation**: Phase 1: Validate command structure (FluentValidation), Phase 2: Validate business rules (aggregate state)

**Encapsulation Requirements (Critical):**
- **Read-Only Outside Domain**: Aggregates are read-only outside the domain assembly
- **Factory Methods INTERNAL**: Static factory methods must be `internal` - force usage through domain services
- **Command Methods INTERNAL**: All mutation methods must be `internal` - force usage through domain services
- **Apply Methods INTERNAL**: Apply methods must be `internal` - only called by Marten during event replay
- **Apply Methods Pure**: Apply methods contain NO validation - only pure state mutation
- **Private Setters**: All properties use `private set` - state changes only via Apply methods
- **Private Constructor**: Parameterless constructor for Marten must be `private`

**Invariant Separation:**
- **Aggregate Invariants**: Rules that only depend on the aggregate's own state (e.g., "name cannot be empty")
- **Cross-Aggregate Invariants**: Rules that require data from other aggregates (e.g., "name must be unique") - these belong in domain services

### Domain Events
- **Past Tense**: Name events in past tense (e.g., OrderPlaced, UserRegistered)
- **Business Events**: Represent significant business occurrences
- **Immutable**: Events cannot be changed after creation (use C# records with init-only properties)
- **Timestamped**: Include timestamp and relevant metadata
- **Self-Contained**: Include all data needed by consumers
- **Use Records**: Implement as immutable C# records
- **Historical Facts**: Events represent things that happened - they are never invalid
- **No Validation**: Events are immutable facts created after validation passes - do not validate events

### Command Objects
- **Encapsulate Intent**: Commands represent user intent to perform an operation
- **Use Records**: Implement as immutable C# records
- **Embedded Validators**: Include nested Validator class using FluentValidation
- **Three Validation Methods**: Provide `bool IsValid()`, `ValidationResult Validate()`, and `void ThrowIfNotValid()`
- **Static Validator Instance**: Use private static readonly field for validator instance
- **Structure Validation Only**: Validators check command structure (required fields, formats, ranges)
- **No Business Rules**: Don't validate business rules in validators - aggregate methods handle that
- **Clear Names**: Use descriptive names reflecting business intent (AddOrganizationalUnitCommand)

**Example:**
```csharp
public record AddOrganizationalUnitCommand
{
    public required Guid OuId { get; init; }
    public required OrganizationPath ParentPath { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required string CreatedBy { get; init; }

    private static readonly Validator _validator = new();

    public bool IsValid() => _validator.Validate(this).IsValid;
    public ValidationResult Validate() => _validator.Validate(this);
    public void ThrowIfNotValid() => _validator.ValidateAndThrow(this);

    public class Validator : AbstractValidator<AddOrganizationalUnitCommand>
    {
        public Validator()
        {
            RuleFor(x => x.OuId).NotEmpty();
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.CreatedBy).NotEmpty();
        }
    }
}
```

### Domain Services
- **Stateless**: No instance state; all data passed as parameters
- **Gatekeepers for Aggregates**: All aggregate mutations flow through domain services
- **Cross-Aggregate Invariants**: Validate rules that span multiple aggregates (e.g., uniqueness checks)
- **Authorization**: Check user permissions before allowing operations
- **Query Services as Parameters**: Use `IQueryService` interfaces passed as parameters (not injected)
- **Return Result<T>**: Return `Result<T>` or `Result` to indicate success/failure
- **Named by Business Operations**: Use ubiquitous language in naming (e.g., `OrganizationFactory`, `RoleManagementService`)

**Domain Service Responsibilities:**
1. **Validate Authorization**: Check `executingUser` has required permissions
2. **Validate Cross-Aggregate Rules**: Use query services to check rules spanning aggregates
3. **Delegate to Aggregate**: Call aggregate's internal methods for mutation
4. **Return Result**: Return success with aggregate or failure with errors

**Domain Service Flow:**
```
Application Layer
  ↓ calls domain service with (user, command, queryService)
Domain Service (stateless)
  ↓ validates authorization (IPermissionEvaluator)
  ↓ validates cross-aggregate rules (IQueryService)
  ↓ calls aggregate's INTERNAL method
Aggregate
  ↓ validates aggregate-specific invariants
  ↓ creates event + applies it
Domain Service
  ↓ returns Result<Aggregate>
```

**Query Service Pattern:**
- Domain services depend on query service **interfaces** defined in domain
- Application layer **implements** query service interfaces
- Query services passed as **parameters** (not constructor injection)
- Keeps domain services testable with mock query services

### Factories
- **Domain Service Pattern**: Factories are domain services that create aggregates
- **Encapsulate Creation Rules**: Validate cross-aggregate rules before creation (e.g., name uniqueness)
- **Return Result<Aggregate>**: Return `Result<T>` to indicate success/failure
- **Delegate to Aggregate**: Call aggregate's internal `Create` factory method after validation
- **Authorization Check**: Verify user has permission to create the aggregate
- **Named by Domain**: Use domain language (e.g., `OrganizationFactory`, `RoleFactory`)

**Factory Pattern:**
```csharp
public sealed class OrganizationFactory : IOrganizationFactory
{
    private readonly IPermissionEvaluator _permissionEvaluator;

    public Result<OrganizationAggregate> CreateOrganization(
        UserContext? executingUser,
        CreateOrganizationCommand command,
        IOrganizationQueryService queryService)  // Passed as parameter
    {
        // 1. Validate authorization
        if (executingUser is null)
            return Result<OrganizationAggregate>.Failure(...);

        // 2. Validate cross-aggregate rules
        if (queryService.RootNameExists(command.Name))
            return Result<OrganizationAggregate>.Failure(...);

        // 3. Delegate to aggregate's INTERNAL factory method
        var aggregate = OrganizationAggregate.Create(command, executingUser);

        return Result<OrganizationAggregate>.Success(aggregate);
    }
}
```

### Application Services
- **Orchestration Only**: Coordinate domain operations, don't contain business logic
- **Transaction Boundaries**: Define transaction boundaries
- **Use Case per Method**: One method per use case or user action
- **DTOs**: Accept and return DTOs, not domain objects
- **Stateless**: No instance state between calls
- **Thin Layer**: Delegate to domain model for all business logic
- **Error Handling**: Convert domain exceptions to application responses

### Domain Model vs Persistence Model
- **Separate Models**: Domain model differs from database schema when needed
- **No ORM Annotations**: Keep domain model free of persistence concerns
- **Mapping Layer**: Use explicit mapping between domain and persistence models
- **Rich Domain Model**: Domain model has behavior and enforces rules
- **Anemic Persistence Model**: Persistence model can be simple DTOs
- **Aggregate Boundaries**: Persist entire aggregates, not individual entities

### Invariants and Validation
- **Always Valid**: Domain objects always in valid state
- **Constructor Validation**: Validate in constructors; throw if invalid (for value objects)
- **Guard Clauses**: Use guard clauses at method entry points
- **Clear Error Messages**: Use domain language in validation messages

**Invariant Ownership:**

| Invariant Type       | Owner                | Example                                      |
|----------------------|----------------------|----------------------------------------------|
| **Command Structure** | Command Validator    | "Name is required", "Max length 200"         |
| **Aggregate-Only**   | Aggregate            | "Cannot remove root OU", "Status transition" |
| **Cross-Aggregate**  | Domain Service       | "Name must be unique", "Parent must exist"   |
| **Authorization**    | Domain Service       | "User must have create permission"           |

**Two-Phase Validation Pattern:**
1. **Phase 1 (Command Structure)**: FluentValidation in command's nested Validator class
2. **Phase 2 (Business Rules)**: Aggregate validates its own invariants, domain service validates cross-aggregate rules

### Specifications Pattern
- **Business Rules as Objects**: Encapsulate complex business rules
- **Reusable**: Compose and reuse specifications
- **Expressive**: Name specifications using ubiquitous language
- **Testable**: Easy to test business rules in isolation
- **Combine**: Support AND, OR, NOT combinations
- **Query Building**: Use for building repository queries

### Layering and Dependencies
- **Domain Layer**: Core business logic; no dependencies on other layers
- **Application Layer**: Orchestration; depends on domain layer
- **Infrastructure Layer**: Technical concerns; implements domain interfaces
- **Dependency Direction**: All dependencies point inward toward domain
- **Interfaces in Domain**: Define abstractions in domain, implement in infrastructure
- **No Leakage**: Infrastructure concerns never leak into domain

### Testing DDD Code
- **Unit Test Aggregates**: Test business logic in aggregates independently
- **Test Invariants**: Verify invariants cannot be violated
- **Test Domain Events**: Verify events are raised correctly
- **Mock Repositories**: Use test doubles for repositories
- **Integration Tests**: Test repository implementations separately
- **Behavior Focus**: Test behavior, not implementation details

### Common Pitfalls to Avoid
- **Anemic Domain Model**: Avoid models with only getters/setters and no behavior
- **Large Aggregates**: Don't make aggregates too large; split into smaller ones
- **Shared Entities**: Don't share entity classes across bounded contexts
- **Generic Repositories**: Avoid overly generic repositories; make them specific
- **ORM Driven Design**: Don't let ORM dictate domain model structure
- **Missing Boundaries**: Define and enforce aggregate boundaries
- **Logic in Services**: Keep business logic in domain model, not application services
- **Public Setters**: Avoid public property setters; use methods to change state
