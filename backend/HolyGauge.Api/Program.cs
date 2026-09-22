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


var getAllrefuelling = getAllRefuelling();





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

app.MapGet("/api/monthly-expense", (int month, int year, RefuellingRepository repository) =>
{
    var monthlyExpense = repository.GetMonthlyExpense(month, year);

    return Results.Ok(monthlyExpense);
});


app.MapGet("/api", () =>
{
    
    return getAllrefuelling;

});


//teste do DB
app.MapGet("/db-check", async () =>
{
    await using var connection = new SqlConnection(connectionString);

    await connection.OpenAsync();

    return "Conectado ao banco!";
});


app.Run();

    // just for mocking purposes, this will be replaced with a database call in the future
    Array getAllRefuelling()
    {
        List<RefuellingHistoryDto> refuellings = new List<RefuellingHistoryDto>();
        


        for (int i = 0; i < 10; i++)
        {
            refuellings.Add(new RefuellingHistoryDto
            {
                Id = i,
                OccurredAt = DateTime.Now.AddDays(-i),
                Liters = i * 10,
                Total = (decimal)(i * 10 * 1.5),
                Odometer = 10000 + (i * 100)
            }); 

        }

        return refuellings.ToArray();
    }