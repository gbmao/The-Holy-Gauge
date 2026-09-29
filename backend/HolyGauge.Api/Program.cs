using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Dto;    
using Microsoft.Data.SqlClient;
using backend.HolyGauge.Api.Data;

var builder = WebApplication.CreateBuilder(args);
var connectionString =
    builder.Configuration.GetConnectionString("HolyGaugeDatabase");



//move this to a service layer in the future
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://127.0.0.1:5500")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddScoped<RefuellingRepository>();

var app = builder.Build();

app.UseCors("Frontend");




// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();


app.MapGet("/", () => "Hello World!");

app.MapPost("/api/refuelling",
    async (Refuelling refuelling, RefuellingRepository repository) =>
{
    await repository.CreateAsync(refuelling);

    return Results.Ok();
});

app.MapGet("/api/monthly-expense", async (int month, int year, RefuellingRepository repository) =>
{
    var monthlyExpense = await repository.GetMonthlyExpenseAsync(month, year);

    return Results.Ok(monthlyExpense);
});

app.MapGet("/api/average-consumption", async (RefuellingRepository repository) =>
{
    var averageConsumption = await repository.GetAverageConsumptionAsync();

    return Results.Ok(averageConsumption);
});

app.MapGet("/api", async (RefuellingRepository repository) =>
{
    var getAllrefuelling = await repository.GetAllRefuellingsAsync();
    
    return Results.Ok(getAllrefuelling);

});


//teste do DB
app.MapGet("/db-check", async () =>
{
    await using var connection = new SqlConnection(connectionString);

    await connection.OpenAsync();

    return "Conectado ao banco!";
});


app.Run();
