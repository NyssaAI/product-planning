## Entity Framework Core Standards

### DbContext Configuration
- **Scoped Lifetime**: Register DbContext with Scoped lifetime in DI
- **OnModelCreating**: Configure entity mappings using Fluent API
- **Separate Configurations**: Use `IEntityTypeConfiguration<T>` for complex entities
- **Connection Strings**: Store connection strings in configuration, not code
- **Async Operations**: Use async methods (ToListAsync, FirstOrDefaultAsync, etc.)

### Entity Design
- **POCOs**: Use Plain Old CLR Objects
- **Navigation Properties**: Define navigation properties for relationships
- **Required Properties**: Mark required properties with `[Required]` or Fluent API
- **Value Objects**: Use owned entity types for value objects
- **Audit Fields**: Include CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
- **Soft Deletes**: Implement with IsDeleted flag and query filters

### Migrations
- **Code-First**: Use code-first approach with migrations
- **Descriptive Names**: Use descriptive migration names (e.g., `AddUserEmailIndex`)
- **Reversible**: Ensure migrations are reversible when possible
- **Seed Data**: Use `HasData()` for required seed data
- **Idempotent Scripts**: Generate idempotent SQL scripts for production

### Querying
- **IQueryable**: Use IQueryable<T> for deferred execution
- **AsNoTracking**: Use `.AsNoTracking()` for read-only queries
- **Eager Loading**: Use `.Include()` to avoid N+1 queries
- **Projection**: Use `.Select()` to project only needed properties into DTOs
- **Filter Early**: Filter as early as possible in the query chain
- **Avoid Client Evaluation**: Ensure queries translate to SQL

### Relationships
- **Foreign Keys**: Always define foreign key properties explicitly
- **One-to-Many**: Configure using `.HasMany()` and `.WithOne()`
- **Many-to-Many**: Use skip navigation with join entity (EF Core 5+)
- **Cascade Delete**: Configure cascade delete behavior explicitly

### Performance
- **Query Splitting**: Use `.AsSplitQuery()` for queries with multiple includes
- **Compiled Queries**: Use for frequently-executed queries
- **Bulk Operations**: Use EF Core bulk extensions for bulk inserts/updates
- **Indexes**: Add indexes for frequently-queried columns

### Transactions
- **SaveChanges**: Call `SaveChangesAsync()` to persist changes
- **Transactions**: Use `Database.BeginTransactionAsync()` for multi-step operations
- **Unit of Work**: DbContext implements Unit of Work pattern; one context per request
