using backend.HolyGauge.Api.Data;
using backend.HolyGauge.Api.Dto;
using backend.HolyGauge.Api.Models;

namespace backend.HolyGauge.Api.Tests;

public sealed class FakeRefuellingRepository : IRefuellingRepository
{
    public int CreateAsyncCallCount { get; private set; }

    public Refuelling? CreatedRefuelling { get; private set; }

    public decimal AverageConsumptionToReturn { get; set; }

    public int GetAverageConsumptionCallCount { get; private set; }

    public Task CreateAsync(Refuelling refuelling)
    {
        CreateAsyncCallCount++;
        CreatedRefuelling = refuelling;
        return Task.CompletedTask;
    }

    public Task<decimal> GetMonthlyExpenseAsync(int month, int year) =>
        Task.FromResult(0m);

    public Task<decimal> GetAverageConsumptionAsync()
    {
        GetAverageConsumptionCallCount++;
        return Task.FromResult(AverageConsumptionToReturn);
    }

    public Task<List<RefuellingHistoryDto>> GetAllRefuellingsAsync() =>
        Task.FromResult(new List<RefuellingHistoryDto>());
}
