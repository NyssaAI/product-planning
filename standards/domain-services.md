# Domain Service Standards

## Core Philosophy
Domain services are **stateless gatekeepers** that protect the integrity of the domain. They are the **only entry point** for aggregate mutations, enforcing authorization and cross-aggregate rules *before* delegating to aggregate roots.

**Key Principle:** Aggregates are read-only outside the domain assembly. All mutations flow through domain services.

## Invariant Separation

Domain services and aggregates have distinct responsibilities for validation:

| Invariant Type       | Owner              | Example                                       |
|----------------------|--------------------|-----------------------------------------------|
| **Command Structure** | Command Validator  | "Name is required", "Max length 200"          |
| **Authorization**    | Domain Service     | "User must have create permission"            |
| **Cross-Aggregate**  | Domain Service     | "Name must be unique", "Parent must exist"    |
| **Aggregate-Only**   | Aggregate          | "Cannot remove root OU", "Status transition"  |

**Why This Separation:**
- **Domain services** can use query services to check rules spanning multiple aggregates
- **Aggregates** only know about their own state - they can't check uniqueness across all aggregates
- **Clear responsibility** makes both easier to test and maintain

## Key Patterns

### 1. Explicit Authorization Context
**Every** domain service method must explicitly accept the executing user's authorization context.

- **Rule:** First parameter should be `UserContext? executingUser`
- **Reasoning:** Keeps the domain pure, testable, and agnostic of hosting environment

**Incorrect:**
```csharp
void ChangeScope(ChangeScopeCommand command, RoleAggregate role);
// Issue: Where is the user? How do we know if they can do this?
```

**Correct:**
```csharp
Result ChangeScope(UserContext? executingUser, ChangeScopeCommand command, IRoleQueryService queryService);
// Clear intent: "User X is attempting to execute Command Y"
```

### 2. Query Services as Parameters
Domain services receive query services **as parameters**, not via constructor injection.

- **Pattern:** Pass `IQueryService` interfaces as method parameters
- **Reasoning:**
  - Keeps domain services stateless
  - Application layer implements query service interfaces
  - Easy to mock in unit tests

```csharp
public Result<OrganizationAggregate> CreateOrganization(
    UserContext? executingUser,
    CreateOrganizationCommand command,
    IOrganizationQueryService queryService)  // Passed as parameter
{
    // Use queryService to validate cross-aggregate rules
    if (queryService.RootNameExists(command.Name))
        return Result<OrganizationAggregate>.Failure(...);

    // ...
}
```

### 3. Domain Service Flow

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
Application Layer
  ↓ saves aggregate via Marten session
```

### 4. Aggregate Methods are INTERNAL
Domain services call aggregate's **internal** methods. This enforces that:
- Aggregates cannot be mutated directly from application layer
- All mutations go through domain service validation first
- Encapsulation is enforced at the assembly level

```csharp
// In OrganizationAggregate:
internal static OrganizationAggregate Create(CreateOrganizationCommand command, UserContext? executingUser)
{
    // Called only by OrganizationFactory domain service
}

internal OrganizationActivatedEvent? Activate(ActivateOrganizationCommand command, UserContext? executingUser)
{
    // Called only by domain service after authorization check
}
```

### 5. Method Signature Standards
- **Return Types:** Use `Result` or `Result<T>` to indicate success/failure explicitly
- **Parameters:**
    1. `UserContext? executingUser` (The actor)
    2. `CommandType command` (The intent)
    3. `IQueryService queryService` (For cross-aggregate lookups)
    4. (Optional) Aggregate if modifying existing aggregate

## Domain Service Types

### Factories (Creation)
Factories are domain services that create new aggregates.

```csharp
public sealed class OrganizationFactory : IOrganizationFactory
{
    private readonly IPermissionEvaluator _permissionEvaluator;

    public Result<OrganizationAggregate> CreateOrganization(
        UserContext? executingUser,
        CreateOrganizationCommand command,
        IOrganizationQueryService queryService)
    {
        // 1. Validate authorization
        if (executingUser is null)
            return Result<OrganizationAggregate>.Failure(Errors.UserRequired);

        var demand = new PermissionDemand(RbacPermissions.OrganizationsCreate, executingUser.HomeOrgPath);
        if (!_permissionEvaluator.HasPermission(executingUser, demand).IsSuccess)
            return Result<OrganizationAggregate>.Failure(Errors.Unauthorized);

        // 2. Validate cross-aggregate rules
        if (queryService.RootNameExists(command.Name))
            return Result<OrganizationAggregate>.Failure(Errors.DuplicateName);

        // 3. Delegate to aggregate's INTERNAL factory method
        var aggregate = OrganizationAggregate.Create(command, executingUser);

        return Result<OrganizationAggregate>.Success(aggregate);
    }
}
```

### Management Services (Modification)
Management services handle mutations to existing aggregates.

```csharp
public sealed class RoleManagementService : IRoleManagementService
{
    private readonly IPermissionEvaluator _permissionEvaluator;

    public Result ChangeScope(
        UserContext? executingUser,
        ChangeScopeCommand command,
        RoleAggregate role,
        IRoleQueryService queryService)
    {
        // 1. Validate authorization
        if (executingUser is null)
            return Result.Failure(Errors.UserRequired);

        var demand = new PermissionDemand(RbacPermissions.RolesEdit, role.ScopePath);
        if (!_permissionEvaluator.HasPermission(executingUser, demand).IsSuccess)
            return Result.Failure(Errors.Unauthorized);

        // 2. Validate cross-aggregate rules
        var targetScope = queryService.GetScope(command.NewScopePath);
        if (targetScope is null)
            return Result.Failure(Errors.ScopeNotFound);

        // 3. Delegate to aggregate's INTERNAL method
        // Aggregate validates its own invariants (e.g., cannot change scope of system role)
        role.ChangeScope(command, executingUser);

        return Result.Success();
    }
}
```

## Testing Domain Services

Domain services are easy to unit test because:
- They are stateless
- Query services are passed as parameters (easy to mock)
- Aggregates can be created in test state

```csharp
[Fact]
public void CreateOrganization_with_duplicate_name_returns_failure()
{
    // Arrange
    var mockPermissionEvaluator = new Mock<IPermissionEvaluator>();
    mockPermissionEvaluator.Setup(x => x.HasPermission(It.IsAny<UserContext>(), It.IsAny<PermissionDemand>()))
        .Returns(Result.Success());

    var mockQueryService = new Mock<IOrganizationQueryService>();
    mockQueryService.Setup(x => x.RootNameExists("existing_name")).Returns(true);  // Name exists

    var factory = new OrganizationFactory(mockPermissionEvaluator.Object);
    var command = new CreateOrganizationCommand { Name = "existing_name", ... };
    var user = CreateTestUser();

    // Act
    var result = factory.CreateOrganization(user, command, mockQueryService.Object);

    // Assert
    result.IsSuccess.Should().BeFalse();
    result.Errors.Should().Contain(e => e.Code == "DuplicateName");
}
```

## Anti-Patterns to Avoid

1. **Public Aggregate Methods**: Never make aggregate mutation methods public - use internal
2. **Injecting Query Services**: Pass query services as parameters, not via constructor
3. **Business Logic in Application Layer**: Keep it in domain services or aggregates
4. **Direct Aggregate Calls**: Application layer should never call aggregate methods directly
5. **Missing Authorization**: Every domain service method must check permissions
6. **Cross-Aggregate Logic in Aggregates**: Aggregates shouldn't know about other aggregates
