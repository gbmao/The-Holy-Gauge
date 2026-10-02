using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Dto;
using Microsoft.Data.SqlClient;
using System.Data;

namespace backend.HolyGauge.Api.Data;
public class RefuellingRepository
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

        command.Parameters.AddWithValue("@Liters", refuelling.Liters);
        command.Parameters.AddWithValue("@Bl_Additive", refuelling.BlAdditive ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@Mileage", refuelling.Mileage ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@Bl_Full_Tank", refuelling.BlFullTank ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@Gas_Price", refuelling.GasPrice ?? (object)DBNull.Value);

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

        command.Parameters.AddWithValue("@MES", month);
        command.Parameters.AddWithValue("@ANO", year);

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