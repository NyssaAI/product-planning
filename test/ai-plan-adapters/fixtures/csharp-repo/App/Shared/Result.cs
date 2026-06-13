namespace MyApp.Shared;

public class Result<T>
{
    public static Result<T> Ok(T value) => new Result<T>();
}
