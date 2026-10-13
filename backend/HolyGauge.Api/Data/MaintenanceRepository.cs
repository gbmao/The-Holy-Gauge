using System.Data;
using HolyGauge.Api.Models;
using Microsoft.Data.SqlClient;

namespace HolyGauge.Api.Data
{
    public class MaintenanceRepository : IMaintenanceRepository
    {
        private readonly string _connectionString;

        public MaintenanceRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        public async Task CreateMaintenanceAsync(Maintenance maintenance)
        {
            using var connection = new SqlConnection(_connectionString);

            using var command = new SqlCommand(
                "SP_CREATE_MAINTENANCE",
                connection
            );

            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.AddWithValue("@Description", maintenance.Description);
            command.Parameters.AddWithValue("@Date", maintenance.Date ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@Kilometers", maintenance.Kilometers ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@Cost", maintenance.Cost ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@NextKilometers", maintenance.NextKilometers ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@NextDate", maintenance.NextDate ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@Notes", maintenance.Notes ?? (object)DBNull.Value);

            await connection.OpenAsync();

            await command.ExecuteNonQueryAsync();
        }

        public async Task<List<Maintenance>> GetAllMaintenancesAsync()
        {
            var maintenances = new List<Maintenance>();

            using var connection = new SqlConnection(_connectionString);

            using var command = new SqlCommand(
                "SP_GET_ALL_MAINTENANCES",
                connection
            );

            command.CommandType = CommandType.StoredProcedure;

            await connection.OpenAsync();

            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var maintenance = new Maintenance
                {
                    Id = reader.GetInt32(reader.GetOrdinal("Id")),
                    Description = reader.GetString(reader.GetOrdinal("Description")),
                    Date = reader.IsDBNull(reader.GetOrdinal("Date")) ? null : reader.GetDateTime(reader.GetOrdinal("Date")),
                    Kilometers = reader.IsDBNull(reader.GetOrdinal("Kilometers")) ? null : reader.GetDecimal(reader.GetOrdinal("Kilometers")),
                    Cost = reader.IsDBNull(reader.GetOrdinal("Cost")) ? null : reader.GetDecimal(reader.GetOrdinal("Cost")),
                    NextKilometers = reader.IsDBNull(reader.GetOrdinal("NextKilometers")) ? null : reader.GetDecimal(reader.GetOrdinal("NextKilometers")),
                    NextDate = reader.IsDBNull(reader.GetOrdinal("NextDate")) ? null : reader.GetDateTime(reader.GetOrdinal("NextDate")),
                    Notes = reader.IsDBNull(reader.GetOrdinal("Notes")) ? null : reader.GetString(reader.GetOrdinal("Notes"))
                };

                maintenances.Add(maintenance);
            }

            return maintenances;
        }

    }
}
    
