using backend.HolyGauge.Api.Models;

namespace backend.HolyGauge.Api.Data
{
    public interface IMaintenanceRepository
    {
         Task  CreateMaintenanceAsync(Maintenance maintenance);

         Task<List<Maintenance>> GetAllMaintenancesAsync();
    }
}
