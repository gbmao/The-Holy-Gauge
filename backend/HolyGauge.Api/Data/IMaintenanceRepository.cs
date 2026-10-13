using HolyGauge.Api.Models;

namespace HolyGauge.Api.Data
{
    public interface IMaintenanceRepository
    {
         Task  CreateMaintenanceAsync(Maintenance maintenance);
    }
}