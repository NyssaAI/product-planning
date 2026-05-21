## .NET Testing Standards

### Project Structure
- **Separate Projects**: Use `MyApp.UnitTests` and `MyApp.IntegrationTests`
- **Feature-Based**: Organize by use cases/features, not implementation structure
- **Scenario Naming**: Name test classes after scenarios (e.g., `UserRegistrationTests`)

### Unit vs Integration Tests
- **Unit Tests**: Test business logic in isolation; mock all dependencies; fast (<100ms)
- **Integration Tests**: Test components together; use real dependencies; slower
- **Unit Coverage**: High coverage of business logic (80%+ line coverage)
- **Integration Coverage**: Test complete workflows from API to database

### Testing Strategy
- **Write Minimal Tests During Development**: Focus on completing feature first
- **Test Only Core Flows**: Test critical paths and primary user workflows
- **Defer Edge Cases**: Address in dedicated testing phases, not during development
- **Test Behavior**: Focus on what code does, not how it does it

### xUnit Framework
- **Facts**: Use `[Fact]` for simple tests
- **Theories**: Use `[Theory]` with `[InlineData]` for parameterized tests
- **Class Fixtures**: Use `IClassFixture<T>` for expensive shared setup
- **Test Output**: Inject `ITestOutputHelper` for debugging

### FluentAssertions
- **Use FluentAssertions**: Always use for assertions; never xUnit's `Assert.*`
- **Readable Syntax**: Use `.Should()` methods
- **Result Testing**: Use `.IsSuccess`, `.IsFailure` for Result<T>
- **Better Errors**: FluentAssertions provides detailed error messages

### Mocking with Moq
- **Interface Mocking**: Mock interfaces, not concrete classes
- **Setup Methods**: Use `.Setup()` to configure mock behavior
- **Returns**: Use `.Returns()` or `.ReturnsAsync()`
- **Verify**: Use `.Verify()` to assert methods were called

### Testing Patterns
- **Arrange-Act-Assert**: Follow AAA pattern consistently
- **One Assertion**: Prefer one logical assertion per test
- **Builder Pattern**: Use for complex test data
- **Test Helpers**: Create helper classes for repeated operations

### Integration Testing
- **WebApplicationFactory**: Use for API integration tests
- **Test Database**: Use PostgreSQL test database or Docker
- **Transactional Tests**: Wrap in transactions; rollback for isolation
- **Seed Data**: Set up test data in setup; clean up in teardown

### Marten and Wolverine Testing (Event Sourcing)

**CRITICAL: Clear Separation of Concerns**

> **Integration Tests** → Test Wolverine endpoints (Commands and Queries) ONLY
> **Unit Tests** → Test Projections (Apply methods and projection logic) ONLY

This separation ensures:
- ✅ Integration tests verify end-to-end flows through Wolverine message bus
- ✅ Unit tests verify projection logic in isolation (fast, no infrastructure)
- ✅ Clear boundaries between infrastructure testing and domain testing

**Unit Tests (Projections)**
- **Test Apply Methods**: Verify aggregates correctly apply events to update state
- **Test Projection Classes**: Verify projections transform events into read models
- **No Infrastructure**: No database, no Marten, no Wolverine required
- **Extremely Fast**: Runs in milliseconds, pure function testing
- **Example**: `order.Apply(new OrderPlaced(...)); order.Status.Should().Be(OrderStatus.Placed);`

**Integration Tests (Wolverine Endpoints)**
- **Test Commands**: Verify commands create events and update projections via Wolverine
- **Test Queries**: Verify queries return correct data from projections via Wolverine
- **Real Infrastructure**: Use real PostgreSQL, Marten, and Wolverine message bus
- **End-to-End**: Verify complete workflow from command → event → projection → query
- **Example**: `var orderId = await bus.InvokeAsync<Guid>(new PlaceOrder(...)); var order = await session.LoadAsync<OrderSummary>(orderId);`

**What NOT to Do**
- ❌ Don't test projections in integration tests (unit test them)
- ❌ Don't test Wolverine infrastructure in unit tests (integration test it)
- ❌ Don't load event streams directly in integration tests (use queries)
- ❌ Don't use databases in unit tests (keep them pure)

For detailed examples, see: [Event Sourcing Standards - Testing Section](../backend/event-sourcing.md#testing-event-sourced-systems)

### Blazor Component Testing
- **bUnit**: Use bUnit library for component testing
- **Render Components**: Use `RenderComponent<T>()`
- **Find Elements**: Use `.Find()` or `.FindAll()`
- **Assert Markup**: Use `.MarkupMatches()`
- **Mock Services**: Mock injected services with DI

### Async Testing
- **Async Tests**: Mark test methods as `async Task`
- **Await Calls**: Always await async calls
- **No ConfigureAwait**: Not needed in test code
- **Timeout**: Use cancellation tokens to prevent hanging

### Test Data
- **AutoFixture**: Use for generating test data
- **Bogus**: Use for realistic fake data
- **Builder Pattern**: Use for complex test objects
- **Constants**: Define test constants as class constants
