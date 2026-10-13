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
    }
}