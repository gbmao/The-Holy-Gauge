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

var api = app.MapGroup("/api");

var refuellingApi = api.MapGroup("/refuelling").WithTags("Refuelling");
refuellingApi.MapPost("/",
    async (CreateRefuellingRequest request, RefuellingService service) =>
    {
        var refuelling = new Refuelling
        {
            Liters = request.Liters,
            BlAdditive = request.BlAdditive,
            Mileage = request.Mileage,
            BlFullTank = request.BlFullTank,
            GasPrice = request.GasPrice
        };

        await service.CreateAsync(refuelling);

        return Results.StatusCode(StatusCodes.Status201Created);
    });

refuellingApi.MapGet("/", async (RefuellingService service) =>
{
    var refuellings = await service.GetAllRefuellingsAsync();
    return Results.Ok(refuellings);
});

api.MapGet("/monthly-expense", async (int month, int year, RefuellingService service) =>
{
    var monthlyExpense = await service.GetMonthlyExpenseAsync(month, year);
    return Results.Ok(monthlyExpense);
});

api.MapGet("/average-consumption", async (RefuellingService service) =>
{
    var averageConsumption = await service.GetAverageConsumptionAsync();
    return Results.Ok(averageConsumption);
});

var maintenanceApi = api.MapGroup("/maintenance").WithTags("Maintenance");
maintenanceApi.MapPost("/",
    async (CreateMaintenanceRequest request, MaintenanceService service) =>
    {
        var maintenance = new Maintenance
        {
            Description = request.Description,
            Date = request.Date,
            Kilometers = request.Kilometers,
            Cost = request.Cost,
            NextKilometers = request.NextKilometers,
            NextDate = request.NextDate,
            Notes = request.Notes
        };

        await service.CreateMaintenanceAsync(maintenance);

        return Results.StatusCode(StatusCodes.Status201Created);
    });

maintenanceApi.MapGet("/", async (MaintenanceService service) =>
{
    var maintenances = await service.GetAllMaintenancesAsync();
    return Results.Ok(maintenances);
});

app.Run();
