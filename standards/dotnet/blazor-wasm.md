## Blazor WebAssembly Standards

### Configuration
- **Program.cs**: Configure services and HttpClient in Program.cs
- **Base Address**: Configure HttpClient BaseAddress to API endpoint
- **Service Lifetime**: Use Singleton for WASM (no true Scoped in client)
- **Typed Clients**: Use typed HttpClient for different APIs

### HTTP and API Communication
- **HttpClient**: Register and inject HttpClient for API calls
- **JSON Serialization**: Use System.Text.Json; configure globally
- **Error Handling**: Handle HTTP errors gracefully (network, 401, 404, 500)
- **CORS**: Ensure backend API has proper CORS for WASM origin
- **Result Pattern**: Return Result<T> from API client methods

### Authentication & Authorization
- **AuthenticationStateProvider**: Use custom provider for JWT or OIDC
- **AuthorizeView**: Use for conditional rendering based on auth
- **AuthorizeRouteView**: Use for route-level authorization
- **Token Storage**: Store tokens in SessionStorage or LocalStorage
- **Token Refresh**: Implement token refresh before expiration

### State Management
- **No Server State**: State resets on page refresh
- **Local Storage**: Use localStorage/sessionStorage for persistent state
- **Application State**: Use singleton services for app-wide state
- **Memory Limitations**: Be mindful of browser memory constraints
- **Navigation**: Use NavigationManager for navigation and query params

### Performance
- **AOT Compilation**: Enable for production for better runtime performance
- **Trimming**: Enable IL trimming to reduce download size
- **Lazy Loading**: Use for assemblies not needed at startup
- **Compression**: Enable Brotli compression for WASM assets
- **Virtualize**: Use `<Virtualize>` for large data lists

### Security
- **Client Validation**: Never rely on client validation for security
- **Sensitive Data**: Never store sensitive data client-side
- **XSS Prevention**: Sanitize user input; Blazor provides built-in protection
- **API Keys**: Never embed API keys in WASM; use backend proxy
- **HTTPS Only**: Always deploy over HTTPS in production

### Deployment
- **Static Hosting**: Deploy to static hosting (Azure Static Web Apps, CDN)
- **Base Path**: Configure if not hosted at root
- **Cache Control**: Set proper cache headers for versioned assets
- **Fallback Route**: Configure server to return index.html for client routing
- **Environment Config**: Use appsettings.json for configuration
