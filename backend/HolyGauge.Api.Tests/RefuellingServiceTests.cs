using Xunit;
using backend.HolyGauge.Api.Data;
using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Service;


namespace backend.HolyGauge.Api.Tests
{
    public class RefuellingServiceTests
    {


        [Fact]
        public void ValidatePositiveGasPriceAndZero_When_GasPriceIsPositive_ReturnsTrue()
        {
            // Arrange
            var service = new RefuellingService(new FakeRefuellingRepository());
            decimal gasPrice = 5.75m;

            // Act
            bool result = service.ValidatePositiveGasPriceAndZero(gasPrice);
            System.Console.WriteLine($"Gas Price: {gasPrice}, Result: {result}"); // Debugging line
            // Assert
            Assert.True(result);
        }
        [Fact]
        public void ValidatePositiveMileage_When_MileageIsPositive_ReturnsTrue()
        {
            // Arrange
            var service = new RefuellingService(new FakeRefuellingRepository());
            decimal mileage = 1000m;

            // Act
            bool result = service.ValidatePositiveMileage(mileage);

            // Assert
            Assert.True(result);
        }
        [Fact]
        public void ValidateMileageHigherThanPrevious_When_MileageIsHigherThanPrevious_ReturnsTrue()
        {
            // Arrange
            var service = new RefuellingService(new FakeRefuellingRepository());
            decimal mileage = 15000m; // Assuming last mileage was 10000m
            decimal previousMileage = 10000m;

            // Act
            bool result = service.ValidateMileageHigherThanPrevious(mileage, previousMileage);

            // Assert
            Assert.True(result);
        }
        [Fact]
        public void ValidatePositiveLitersAndZero_When_LitersAreNegative_ReturnsException()
        {
            // Arrange
            var service = new RefuellingService(new FakeRefuellingRepository());
            decimal liters = -10.5m;

            // Act & Assert
            Assert.Throws<ArgumentException>(() => service.ValidatePositiveLitersAndZero(liters));
        }

        [Fact]
        public async Task CreateAsync_When_LitersAreNegative_ThrowsArgumentException()
        {
            var repository = new FakeRefuellingRepository();
            var service = new RefuellingService(repository);
            var refuelling = new Refuelling
            {
                Liters = -10.5m,
                Mileage = 100,
                GasPrice = 5m
            };

            await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(refuelling));
        }

        [Fact]
        public async Task CreateAsync_When_LitersAreNegative_DoesNotCallRepository()
        {
            var repository = new FakeRefuellingRepository();
            var service = new RefuellingService(repository);
            var refuelling = new Refuelling
            {
                Liters = -10.5m,
                Mileage = 100,
                GasPrice = 5m
            };

            await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(refuelling));

            Assert.Equal(0, repository.CreateAsyncCallCount);
        }

        [Fact]
        public async Task CreateAsync_When_LitersArePositive_CallsRepository()
        {
            var repository = new FakeRefuellingRepository();
            var service = new RefuellingService(repository);
            var refuelling = new Refuelling
            {
                Liters = 10.5m,
                Mileage = 100,
                GasPrice = 5m
            };

            await service.CreateAsync(refuelling);

            Assert.Equal(1, repository.CreateAsyncCallCount);
        }

        [Fact]
        public void ValidatePositiveGasPriceAndZero_When_GasPriceIsNegative_ThrowsArgumentException()
        {
            var service = new RefuellingService(new FakeRefuellingRepository());

            Assert.Throws<ArgumentException>(() => service.ValidatePositiveGasPriceAndZero(-1m));
        }

        [Fact]
        public void ValidatePositiveGasPriceAndZero_When_GasPriceIsZero_ThrowsArgumentException()
        {
            var service = new RefuellingService(new FakeRefuellingRepository());

            Assert.Throws<ArgumentException>(() => service.ValidatePositiveGasPriceAndZero(0m));
        }

        [Fact]
        public void ValidatePositiveGasPriceAndZero_When_GasPriceIsNull_ThrowsArgumentException()
        {
            var service = new RefuellingService(new FakeRefuellingRepository());

            Assert.Throws<ArgumentException>(() => service.ValidatePositiveGasPriceAndZero(null));
        }

        [Fact]
        public void ValidatePositiveMileage_When_MileageIsNegative_ThrowsArgumentException()
        {
            var service = new RefuellingService(new FakeRefuellingRepository());

            Assert.Throws<ArgumentException>(() => service.ValidatePositiveMileage(-1m));
        }

        [Fact]
        public void ValidatePositiveMileage_When_MileageIsZero_ThrowsArgumentException()
        {
            var service = new RefuellingService(new FakeRefuellingRepository());

            Assert.Throws<ArgumentException>(() => service.ValidatePositiveMileage(0m));
        }

        [Fact]
        public void ValidatePositiveMileage_When_MileageIsNull_ThrowsArgumentException()
        {
            var service = new RefuellingService(new FakeRefuellingRepository());

            Assert.Throws<ArgumentException>(() => service.ValidatePositiveMileage(null));
        }
    }
}
