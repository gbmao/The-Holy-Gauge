using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace backend.HolyGauge.Api.ExceptionHandling;

public sealed class ValidationExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not ArgumentException validationException)
            return false;

        const int badRequest = StatusCodes.Status400BadRequest;
        httpContext.Response.StatusCode = badRequest;
        httpContext.Response.ContentType = "application/problem+json";

        var problemDetails = new ProblemDetails
        {
            Status = badRequest,
            Title = "Validation failed",
            Detail = validationException.Message,
            Instance = httpContext.Request.Path.ToString()
        };

        await JsonSerializer.SerializeAsync(
            httpContext.Response.Body,
            problemDetails,
            new JsonSerializerOptions(JsonSerializerDefaults.Web),
            cancellationToken);
        return true;
    }
}
