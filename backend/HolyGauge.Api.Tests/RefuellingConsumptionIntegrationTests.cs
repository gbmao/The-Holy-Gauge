using Microsoft.Data.SqlClient;
using System.Data;
using Xunit;

namespace backend.HolyGauge.Api.Tests;

public class RefuellingConsumptionIntegrationTests
{
    [SqlServerFact]
    public async Task SpConsumoMedio_UsesDistanceBetweenLatestEligibleFullTankRefuellings()
    {
        var connectionString = Environment.GetEnvironmentVariable(
            SqlServerFactAttribute.ConnectionStringEnvironmentVariable);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Set {SqlServerFactAttribute.ConnectionStringEnvironmentVariable} to an isolated SQL Server test database to run this integration test.");
        }

        var connectionStringBuilder = new SqlConnectionStringBuilder(connectionString);
        if (string.IsNullOrWhiteSpace(connectionStringBuilder.InitialCatalog)
            || !connectionStringBuilder.InitialCatalog.Contains("test", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"The database in {SqlServerFactAttribute.ConnectionStringEnvironmentVariable} must have 'test' in its name. The test inserts temporary rows and rolls them back.");
        }

        using var connection = new SqlConnection(connectionStringBuilder.ConnectionString);
        await connection.OpenAsync();
        using var transaction = connection.BeginTransaction();

        try
        {
            await InsertRefuellingAsync(connection, transaction, 100000, 11m, true, true, new DateTime(9998, 1, 1));
            await InsertRefuellingAsync(connection, transaction, 100370, 10.25m, true, true, new DateTime(9999, 1, 1));

            // These newer rows must not participate: they are not eligible full-tank readings.
            await InsertRefuellingAsync(connection, transaction, 200000, 5m, false, true, new DateTime(9999, 12, 1));
            await InsertRefuellingAsync(connection, transaction, 200000, 5m, true, false, new DateTime(9999, 11, 1));
            await InsertRefuellingAsync(connection, transaction, null, 4m, true, true, new DateTime(9999, 10, 1));
            await InsertRefuellingAsync(connection, transaction, 300000, 0m, true, true, new DateTime(9999, 9, 1));

            using var command = new SqlCommand("dbo.SP_CONSUMO_MEDIO", connection, transaction)
            {
                CommandType = CommandType.StoredProcedure
            };

            var result = await command.ExecuteScalarAsync();

            Assert.NotNull(result);
            Assert.Equal(370m / 10.25m, Convert.ToDecimal(result), precision: 6);
        }
        finally
        {
            await transaction.RollbackAsync();
        }
    }

    private static async Task InsertRefuellingAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        int? mileage,
        decimal liters,
        bool fullTank,
        bool active,
        DateTime occurredAt)
    {
        using var command = new SqlCommand(
            """
            INSERT INTO dbo.REFUELLING
                (Liters, Mileage, Bl_full_tank, Dh_refuelling, Cd_status)
            VALUES
                (@Liters, @Mileage, @FullTank, @OccurredAt, @Active);
            """,
            connection,
            transaction);

        var litersParameter = command.Parameters.Add("@Liters", SqlDbType.Decimal);
        litersParameter.Precision = 5;
        litersParameter.Scale = 2;
        litersParameter.Value = liters;

        command.Parameters.Add("@Mileage", SqlDbType.Int).Value = mileage ?? (object)DBNull.Value;
        command.Parameters.Add("@FullTank", SqlDbType.Bit).Value = fullTank;
        command.Parameters.Add("@OccurredAt", SqlDbType.DateTime).Value = occurredAt;
        command.Parameters.Add("@Active", SqlDbType.Bit).Value = active;

        await command.ExecuteNonQueryAsync();
    }
}

public sealed class SqlServerFactAttribute : FactAttribute
{
    public const string ConnectionStringEnvironmentVariable = "HOLYGAUGE_TEST_CONNECTION_STRING";

    public SqlServerFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable)))
        {
            Skip = $"Set {ConnectionStringEnvironmentVariable} to an isolated SQL Server test database to run this integration test.";
        }
    }
}
