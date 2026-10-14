using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Dto;
using Microsoft.Data.SqlClient;
using backend.HolyGauge.Api.Data;
using backend.HolyGauge.Api.ExceptionHandling;
using backend.HolyGauge.Api.Service;

var builder = WebApplication.CreateBuilder(args);
var connectionString =
    builder.Configuration.GetConnectionString("HolyGaugeDatabase");
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins);
        }

        policy
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddScoped<IRefuellingRepository, RefuellingRepository>();
builder.Services.AddScoped<RefuellingService>();
builder.Services.AddScoped<IMaintenanceRepository, MaintenanceRepository>();
builder.Services.AddScoped<MaintenanceService>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors("Frontend");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.MapGet("/db-check", async () =>
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        return Results.Ok("Conectado ao banco!");
    });
}

app.UseHttpsRedirection();

app.MapPost("/api/refuelling",
    async (Refuelling refuelling, RefuellingService service) =>
{
    await service.CreateAsync(refuelling);

    return Results.Ok();
});

app.MapGet("/api/monthly-expense", async (int month, int year, RefuellingService service) =>
{
    var monthlyExpense = await service.GetMonthlyExpenseAsync(month, year);

    return Results.Ok(monthlyExpense);
});

app.MapGet("/api/average-consumption", async (RefuellingService service) =>
{
    var averageConsumption = await service.GetAverageConsumptionAsync();

    return Results.Ok(averageConsumption);
});

app.MapGet("/api", async (RefuellingService service) =>
{
    var getAllrefuelling = await service.GetAllRefuellingsAsync();
    
    return Results.Ok(getAllrefuelling);

});

app.MapPost("/api/maintenance",
    async (Maintenance maintenance, MaintenanceService service) =>
{
    await service.CreateMaintenanceAsync(maintenance);

    return Results.Ok();
});

app.MapGet("/api/maintenance", async (MaintenanceService service) =>
{
    var getAllMaintenance = await service.GetAllMaintenancesAsync();
    
    return Results.Ok(getAllMaintenance);

});

app.Run();
