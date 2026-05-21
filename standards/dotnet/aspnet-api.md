## ASP.NET Core API Standards

### API Architecture
- **MCP/JsonRPC First**: Prefer MCP and JsonRPC for application APIs
- **REST for Auth**: Use REST only for authentication, health checks, webhooks
- **Feature Folders**: Organize by feature/domain, not technical layer
- **Vertical Slices**: Each feature should be self-contained

### MCP Server Pattern
- **Feature-Based Servers**: Create MCP servers by feature domain
- **Tool Registration**: Register MCP tools mapping to business operations
- **Type Safety**: Use strongly-typed request/response DTOs
- **Result Types**: Return `Result<T>` from tool implementations

### FastEndpoints (for REST)
- **No Controllers**: Use FastEndpoints instead of ASP.NET Core controllers
- **Feature Folders**: Place endpoints with their feature code
- **One Endpoint Per File**: Each endpoint is a separate class
- **Minimal Boilerplate**: Leverage FastEndpoints conventions
- **Validation**: Use built-in FastEndpoints validation with FluentValidation

### Request/Response Handling
- **DTOs**: Use Data Transfer Objects; never expose domain entities
- **Records**: Use C# records for request/response types
- **Validation**: Use FluentValidation for all input validation
- **Result Types**: Return `Result<T>` from service layer
- **Status Codes**: Return appropriate HTTP status codes (200, 201, 204, 400, 401, 404, 409, 500)
- **Problem Details**: Use RFC 7807 Problem Details for error responses

### Middleware
- **Exception Handling**: Use global exception handling middleware
- **Authentication**: Configure JWT Bearer or OIDC (WorkOS)
- **CORS**: Configure CORS policy explicitly; don't use `AllowAny` in production
- **Request Logging**: Use Serilog with structured logging
- **Rate Limiting**: Implement for public endpoints
- **Response Compression**: Enable Brotli/Gzip compression

### Security
- **Authentication**: Require authentication by default; explicitly allow anonymous
- **Authorization**: Use policy-based authorization
- **Input Validation**: Always validate and sanitize user input
- **HTTPS Only**: Enforce HTTPS in production; use HSTS
- **Anti-CSRF**: Enable anti-forgery tokens for state-changing REST operations

### Performance
- **Response Compression**: Enable for large payloads
- **Response Caching**: Use for cacheable GET requests
- **Pagination**: Always paginate large collections
- **AsNoTracking**: Use for read-only EF queries
