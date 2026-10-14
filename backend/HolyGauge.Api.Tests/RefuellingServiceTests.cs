using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Service;
using Xunit;

namespace backend.HolyGauge.Api.Tests;

public class RefuellingServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenRefuellingIsValid_PassesItToRepository()
    {
        var repository = new FakeRefuellingRepository();
        var service = new RefuellingService(repository);
        var refuelling = new Refuelling
        {
            Liters = 10.5m,
            Mileage = 100,
            GasPrice = 5m,
            BlAdditive = true,
            BlFullTank = true
        };

        await service.CreateAsync(refuelling);

        Assert.Equal(1, repository.CreateAsyncCallCount);
        Assert.Same(refuelling, repository.CreatedRefuelling);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    public async Task CreateAsync_WhenLitersAreNotPositive_DoesNotCallRepository(decimal liters)
    {
        var repository = new FakeRefuellingRepository();
        var service = new RefuellingService(repository);
        var refuelling = new Refuelling { Liters = liters, Mileage = 100, GasPrice = 5m };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(refuelling));

        Assert.Equal(0, repository.CreateAsyncCallCount);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    public async Task CreateAsync_WhenGasPriceIsNotPositive_DoesNotCallRepository(decimal gasPrice)
    {
        var repository = new FakeRefuellingRepository();
        var service = new RefuellingService(repository);
        var refuelling = new Refuelling { Liters = 10m, Mileage = 100, GasPrice = gasPrice };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(refuelling));

        Assert.Equal(0, repository.CreateAsyncCallCount);
    }

    [Fact]
    public async Task CreateAsync_WhenGasPriceIsNull_DoesNotCallRepository()
    {
        var repository = new FakeRefuellingRepository();
        var service = new RefuellingService(repository);
        var refuelling = new Refuelling { Liters = 10m, Mileage = 100, GasPrice = null };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(refuelling));

        Assert.Equal(0, repository.CreateAsyncCallCount);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    public async Task CreateAsync_WhenMileageIsNotPositive_DoesNotCallRepository(int mileage)
    {
        var repository = new FakeRefuellingRepository();
        var service = new RefuellingService(repository);
        var refuelling = new Refuelling { Liters = 10m, Mileage = mileage, GasPrice = 5m };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(refuelling));

        Assert.Equal(0, repository.CreateAsyncCallCount);
    }

    [Fact]
    public async Task CreateAsync_WhenMileageIsNull_DoesNotCallRepository()
    {
        var repository = new FakeRefuellingRepository();
        var service = new RefuellingService(repository);
        var refuelling = new Refuelling { Liters = 10m, Mileage = null, GasPrice = 5m };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(refuelling));

        Assert.Equal(0, repository.CreateAsyncCallCount);
    }

    [Fact]
    public async Task GetAverageConsumptionAsync_ReturnsRepositoryValue()
    {
        var repository = new FakeRefuellingRepository { AverageConsumptionToReturn = 36.1m };
        var service = new RefuellingService(repository);

        var result = await service.GetAverageConsumptionAsync();

        Assert.Equal(36.1m, result);
        Assert.Equal(1, repository.GetAverageConsumptionCallCount);
    }
}
