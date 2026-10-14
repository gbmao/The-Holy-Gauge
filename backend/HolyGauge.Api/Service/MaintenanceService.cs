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
            ValidateMaintenance(maintenance);
            await _maintenanceRepository.CreateMaintenanceAsync(maintenance);
        }

        public async Task<List<Maintenance>> GetAllMaintenancesAsync()
        {
            return await _maintenanceRepository.GetAllMaintenancesAsync();
        }

        private void ValidateMaintenance(Maintenance maintenance)
        {
            if (maintenance == null)
                throw new ArgumentNullException(nameof(maintenance));

            if (string.IsNullOrWhiteSpace(maintenance.Description))
                throw new ArgumentException("Description is required", nameof(maintenance.Description));
        }
    }
}
