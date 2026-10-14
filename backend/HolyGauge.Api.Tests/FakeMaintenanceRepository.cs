using backend.HolyGauge.Api.Data;
using backend.HolyGauge.Api.Models;

namespace backend.HolyGauge.Api.Tests
{
    public class FakeMaintenanceRepository : IMaintenanceRepository
    {
        public bool CreateWasCalled { get; private set; }

        public Maintenance? CreatedMaintenance { get; private set; }

        public List<Maintenance> MaintenancesToReturn { get; set; } = new();

        public int GetAllMaintenancesAsyncCallCount { get; private set; }

        public Task CreateMaintenanceAsync(Maintenance maintenance)
        {
            CreateWasCalled = true;
            CreatedMaintenance = maintenance;

            return Task.CompletedTask;
        }

        public Task<List<Maintenance>> GetAllMaintenancesAsync()
        {
            GetAllMaintenancesAsyncCallCount++;
            return Task.FromResult(MaintenancesToReturn);
        }
    }

}
