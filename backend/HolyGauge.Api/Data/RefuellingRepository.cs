using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Dto;
using Microsoft.Data.SqlClient;
using System.Data;
using backend.HolyGauge.Api.Data;

namespace backend.HolyGauge.Api.Data;
public class RefuellingRepository : IRefuellingRepository
{
    private readonly string _connectionString;

    public RefuellingRepository(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("HolyGaugeDatabase")!;
    }

    public async Task CreateAsync(Refuelling refuelling)
    {
        using var connection = new SqlConnection(_connectionString);

        using var command = new SqlCommand(
            "SP_CREATE_REFUELLING",
            connection
        );

        command.CommandType = CommandType.StoredProcedure;

        // Explicit SQL metadata avoids type/precision inference from the current value.
        var litersParameter = command.Parameters.Add("@Liters", SqlDbType.Decimal);
        litersParameter.Precision = 5;
        litersParameter.Scale = 2;
        litersParameter.Value = refuelling.Liters;

        command.Parameters.Add("@Bl_Additive", SqlDbType.Bit).Value =
            (object?)refuelling.BlAdditive ?? DBNull.Value;
        command.Parameters.Add("@Mileage", SqlDbType.Int).Value =
            (object?)refuelling.Mileage ?? DBNull.Value;
        command.Parameters.Add("@Bl_Full_Tank", SqlDbType.Bit).Value =
            (object?)refuelling.BlFullTank ?? DBNull.Value;

        var gasPriceParameter = command.Parameters.Add("@Gas_Price", SqlDbType.Decimal);
        gasPriceParameter.Precision = 6;
        gasPriceParameter.Scale = 3;
        gasPriceParameter.Value = (object?)refuelling.GasPrice ?? DBNull.Value;

        await connection.OpenAsync();

        await command.ExecuteNonQueryAsync();
    }

    public async Task<decimal> GetMonthlyExpenseAsync(int month, int year)
    {
        using var connection = new SqlConnection(_connectionString);

        using var command = new SqlCommand(
            "SP_GASTO_MENSAL",
            connection
        );

        command.CommandType = CommandType.StoredProcedure;

        command.Parameters.Add("@MES", SqlDbType.Int).Value = month;
        command.Parameters.Add("@ANO", SqlDbType.Int).Value = year;

        await connection.OpenAsync();

        var result = await command.ExecuteScalarAsync();

        return result != null ? Convert.ToDecimal(result) : 0;
    }

    public async Task<decimal> GetAverageConsumptionAsync()
    {
        using var connection = new SqlConnection(_connectionString);

        using var command = new SqlCommand(
            "SP_CONSUMO_MEDIO",
            connection
        );

        command.CommandType = CommandType.StoredProcedure;

        await connection.OpenAsync();

        var result = await command.ExecuteScalarAsync();

        return result != null ? Convert.ToDecimal(result) : 0;
    }

    public async Task<List<RefuellingHistoryDto>> GetAllRefuellingsAsync()
    {
        var refuellings = new List<RefuellingHistoryDto>();

        using var connection = new SqlConnection(_connectionString);

        using var command = new SqlCommand(
            "SP_GET_ALL_REFUELLINGS",
            connection
        );

        command.CommandType = CommandType.StoredProcedure;

        await connection.OpenAsync();

        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            refuellings.Add(new RefuellingHistoryDto
            {
                Id = reader.GetInt32(reader.GetOrdinal("Id")),
                OccurredAt = reader.GetDateTime(reader.GetOrdinal("OccurredAt")),
                Liters = reader.GetDecimal(reader.GetOrdinal("Liters")),
                Total = reader.GetDecimal(reader.GetOrdinal("Total")),
                Odometer = reader.GetInt32(reader.GetOrdinal("Mileage"))
            });
        }

        return refuellings;
    }
}
