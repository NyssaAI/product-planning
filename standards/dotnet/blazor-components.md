## Blazor Component Standards

### Component Structure
- **Single Responsibility**: Each component has one clear purpose
- **Razor Files**: Use `.razor` files; `.razor.cs` code-behind for complex logic
- **Partial Classes**: Use code-behind pattern for complex components
- **PascalCase Naming**: Match filename to component name

### Component Design
- **Parameters**: Use `[Parameter]` for component inputs
- **EventCallbacks**: Use `EventCallback<T>` for parent-child communication
- **CascadingParameters**: Use for cross-component state (auth, theme)
- **RenderFragment**: Use for content projection and templating
- **Generic Components**: Use `@typeparam` for reusable generic components

### State Management
- **Local State**: Keep state as local as possible
- **StateHasChanged**: Call after non-UI-thread state changes
- **Immutable Parameters**: Don't modify parameters directly
- **Two-Way Binding**: Use `@bind` or `@bind-Value` with callback
- **State Services**: Use scoped services for shared session state

### Lifecycle Methods
- **OnInitialized**: Use for synchronous initialization
- **OnInitializedAsync**: Use for async initialization (API calls)
- **OnParametersSet**: React to parameter changes
- **OnAfterRender**: Use for JS interop after render
- **ShouldRender**: Override to optimize re-rendering
- **Dispose**: Implement IDisposable/IAsyncDisposable for cleanup

### Data Binding
- **One-Way Binding**: Use `@` syntax
- **Two-Way Binding**: Use `@bind` for form inputs
- **Event Binding**: Use `@onclick`, `@onchange`
- **Prevent Default**: Use `@onclick:preventDefault`
- **Stop Propagation**: Use `@onclick:stopPropagation`

### Performance
- **Virtualization**: Use `<Virtualize>` for large lists
- **Key Attribute**: Use `@key` for lists to optimize diff
- **Lazy Loading**: Implement for large components or routes
- **ShouldRender**: Override to prevent unnecessary re-renders
- **CSS Isolation**: Use `.razor.css` files for scoped styles

### Forms and Validation
- **EditForm**: Use `<EditForm>` for forms with validation
- **FluentValidation**: Use FluentValidation; do NOT use Data Annotations
- **Blazored.FluentValidation**: Use for Blazor integration
- **FluentValidationValidator**: Add inside `<EditForm>`
- **ValidationMessage**: Display field-level errors
- **ValidationSummary**: Display form-level errors

### JavaScript Interop
- **IJSRuntime**: Inject for calling JavaScript functions
- **InvokeAsync**: Use `InvokeAsync<T>` for JS calls
- **DotNetReference**: Use `DotNetObjectReference.Create()` for callbacks
- **Module Isolation**: Use JS modules for component-specific JS
- **Dispose References**: Always dispose DotNetObjectReference

### Error Handling
- **Error Boundaries**: Use `<ErrorBoundary>` to catch rendering errors
- **Try-Catch**: Wrap risky operations
- **User Feedback**: Show user-friendly error messages
- **Logging**: Log errors to console or external service

### Accessibility
- **Semantic HTML**: Use semantic elements (`<button>`, `<nav>`)
- **ARIA Attributes**: Add labels and roles where needed
- **Keyboard Navigation**: Ensure interactive elements are keyboard accessible
- **Focus Management**: Manage focus after navigation or modals
