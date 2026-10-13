using HolyGauge.Api.Data;
using HolyGauge.Api.Models;

namespace HolyGauge.Api.Service
{
    public class MaintenanceService
    {
        private readonly IMaintenanceRepository _maintenanceRepository;

        public MaintenanceService(IMaintenanceRepository maintenanceRepository)
        {
            _maintenanceRepository = maintenanceRepository;
        }

        public async Task CreateMaintenanceAsync(Maintenance maintenance)
        {
            //ValidateMaintenance(maintenance);
            await _maintenanceRepository.CreateMaintenanceAsync(maintenance);
        }
    }
}