using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Dto;

namespace backend.HolyGauge.Api.Data
{
    public interface IRefuellingRepository
    {
        Task CreateAsync(Refuelling refuelling);
        Task<decimal> GetMonthlyExpenseAsync(int month, int year);
        Task<decimal> GetAverageConsumptionAsync();
        Task<List<RefuellingHistoryDto>> GetAllRefuellingsAsync();
    }
}