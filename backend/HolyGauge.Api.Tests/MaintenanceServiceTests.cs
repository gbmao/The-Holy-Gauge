using HolyGauge.Api.Service;
using Xunit;
using HolyGauge.Api.Models;

namespace HolyGauge.Api.Tests
{
    public class MaintenanceServiceTests
    {
        [Fact]
        public async Task CreateMaintenanceAsync_When_ValidMaintenance_CallsRepository()
        {
            // Arrange
            var repository = new FakeMaintenanceRepository();
            var service = new MaintenanceService(repository);

            var maintenance = new Maintenance
            {
                Description = "Oil Change",
                Cost = 50.0m,
                Date = DateTime.Now
            };

            // Act
            await service.CreateMaintenanceAsync(maintenance);

            // Assert
            Assert.True(repository.CreateWasCalled);
            Assert.Same(maintenance, repository.CreatedMaintenance);
        }

        [Fact]
        public async Task CreateMaintenanceAsync_When_MaintenanceIsNull_ThrowsArgumentNullException()
        {
            var repository = new FakeMaintenanceRepository();
            var service = new MaintenanceService(repository);

            var exception = await Assert.ThrowsAsync<ArgumentNullException>(
                () => service.CreateMaintenanceAsync(null!));

            Assert.Equal("maintenance", exception.ParamName);
            Assert.False(repository.CreateWasCalled);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("\t")]
        public async Task CreateMaintenanceAsync_When_DescriptionIsNullOrWhitespace_ThrowsArgumentException(string? description)
        {
            var repository = new FakeMaintenanceRepository();
            var service = new MaintenanceService(repository);
            var maintenance = new Maintenance { Description = description! };

            var exception = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateMaintenanceAsync(maintenance));

            Assert.Equal("Description", exception.ParamName);
            Assert.Contains("Description is required", exception.Message);
            Assert.False(repository.CreateWasCalled);
        }

        [Fact]
        public async Task GetAllMaintenancesAsync_WhenRepositoryReturnsMaintenances_ReturnsThem()
        {
            var repository = new FakeMaintenanceRepository
            {
                MaintenancesToReturn = new List<Maintenance>
                {
                    new() { Description = "Oil change", Cost = 50m },
                    new() { Description = "Brake pads", Cost = 120m }
                }
            };
            var service = new MaintenanceService(repository);

            var result = await service.GetAllMaintenancesAsync();

            Assert.Same(repository.MaintenancesToReturn, result);
            Assert.Equal(2, result.Count);
            Assert.Equal("Oil change", result[0].Description);
            Assert.Equal("Brake pads", result[1].Description);
            Assert.Equal(1, repository.GetAllMaintenancesAsyncCallCount);
        }

        [Fact]
        public async Task GetAllMaintenancesAsync_WhenThereAreNoMaintenances_ReturnsEmptyList()
        {
            var repository = new FakeMaintenanceRepository();
            var service = new MaintenanceService(repository);

            var result = await service.GetAllMaintenancesAsync();

            Assert.Empty(result);
            Assert.Equal(1, repository.GetAllMaintenancesAsyncCallCount);
        }
    }
}
