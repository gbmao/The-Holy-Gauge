using HolyGauge.Api.Data;
using HolyGauge.Api.Models;

namespace HolyGauge.Api.Tests
{
    public class FakeMaintenanceRepository : IMaintenanceRepository
    {
        public bool CreateWasCalled { get; private set; }

        public Maintenance? CreatedMaintenance { get; private set; }

        public Task CreateMaintenanceAsync(Maintenance maintenance)
        {
            CreateWasCalled = true;
            CreatedMaintenance = maintenance;

            return Task.CompletedTask;
        }
    }

}