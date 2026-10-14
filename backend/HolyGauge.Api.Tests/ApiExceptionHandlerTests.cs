using backend.HolyGauge.Api.ExceptionHandling;
using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using Xunit;

namespace backend.HolyGauge.Api.Tests;

public class ApiExceptionHandlerTests
{
    [Fact]
    public async Task NegativeLitersValidation_Returns400AndLogsWarning()
    {
        var repository = new FakeRefuellingRepository();
        var service = new RefuellingService(repository);
        var validationException = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(new Refuelling
            {
                Liters = -1m,
                Mileage = 100,
                GasPrice = 5m
            }));

        var logger = new CapturingLogger<ApiExceptionHandler>();
        var handler = new ApiExceptionHandler(logger);
        var context = new DefaultHttpContext();
        context.Request.Method = "POST";
        context.Request.Path = "/api/refuelling";
        await using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        var handled = await handler.TryHandleAsync(
            context,
            validationException,
            CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
        Assert.StartsWith("application/problem+json", context.Response.ContentType);
        Assert.Equal(LogLevel.Warning, logger.Level);
        Assert.Same(validationException, logger.Exception);

        responseBody.Position = 0;
        using var problemDetails = await JsonDocument.ParseAsync(responseBody);
        var root = problemDetails.RootElement;

        Assert.Equal(StatusCodes.Status400BadRequest, root.GetProperty("status").GetInt32());
        Assert.Equal("Validation failed", root.GetProperty("title").GetString());
        Assert.Equal("Liters must be greater than zero.", root.GetProperty("detail").GetString());
        Assert.Equal("/api/refuelling", root.GetProperty("instance").GetString());
        Assert.Equal(0, repository.CreateAsyncCallCount);
    }

    [Fact]
    public async Task UnexpectedException_ReturnsClean500AndLogsError()
    {
        var logger = new CapturingLogger<ApiExceptionHandler>();
        var handler = new ApiExceptionHandler(logger);
        var context = new DefaultHttpContext();
        context.Request.Method = "GET";
        context.Request.Path = "/api/maintenance";
        await using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;
        var databaseException = new InvalidOperationException(
            "Database unavailable; connection credential is sensitive.");

        var handled = await handler.TryHandleAsync(
            context,
            databaseException,
            CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.StartsWith("application/problem+json", context.Response.ContentType);
        Assert.Equal(LogLevel.Error, logger.Level);
        Assert.Same(databaseException, logger.Exception);
        Assert.Contains("GET /api/maintenance", logger.Message);

        responseBody.Position = 0;
        using var problemDetails = await JsonDocument.ParseAsync(responseBody);
        var root = problemDetails.RootElement;

        Assert.Equal(StatusCodes.Status500InternalServerError, root.GetProperty("status").GetInt32());
        Assert.Equal("Internal server error", root.GetProperty("title").GetString());
        Assert.Equal(
            "An unexpected error occurred while processing the request.",
            root.GetProperty("detail").GetString());
        Assert.DoesNotContain("credential", await ReadResponseBodyAsync(responseBody));
    }

    private static async Task<string> ReadResponseBodyAsync(Stream responseBody)
    {
        responseBody.Position = 0;
        using var reader = new StreamReader(responseBody, leaveOpen: true);
        return await reader.ReadToEndAsync();
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public LogLevel? Level { get; private set; }
        public Exception? Exception { get; private set; }
        public string? Message { get; private set; }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Level = logLevel;
            Exception = exception;
            Message = formatter(state, exception);
        }
    }
}
