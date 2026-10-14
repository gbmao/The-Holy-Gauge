using backend.HolyGauge.Api.ExceptionHandling;
using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Service;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using Xunit;

namespace backend.HolyGauge.Api.Tests;

public class ValidationExceptionHandlerTests
{
    [Fact]
    public async Task NegativeLitersValidation_ReturnsBadRequestProblemDetails()
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

        var handler = new ValidationExceptionHandler();
        var context = new DefaultHttpContext();
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
    public async Task TryHandleAsync_WhenExceptionIsNotValidation_ReturnsFalse()
    {
        var handler = new ValidationExceptionHandler();
        var context = new DefaultHttpContext();

        var handled = await handler.TryHandleAsync(
            context,
            new InvalidOperationException("Unexpected failure."),
            CancellationToken.None);

        Assert.False(handled);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }
}
