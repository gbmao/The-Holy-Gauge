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

        connection.Open();

        var result = command.ExecuteScalar();

        return result != null ? Convert.ToDecimal(result) : 0;
    }
}