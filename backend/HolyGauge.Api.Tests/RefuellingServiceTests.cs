using Xunit;
using backend.HolyGauge.Api.Service;


namespace backend.HolyGauge.Api.Tests
{
    public class RefuellingServiceTests
    {
        [Fact]
        public void ValidatePositiveLitersAndZero_When_LitersAreNegative_ReturnsFalse()
        {
            // Arrange
            var service = new RefuellingService();
            decimal liters = -10.5m;

            // Act
            bool result = service.ValidatePositiveLitersAndZero(liters);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public void ValidatePositiveLitersAndZero_When_LitersAreZero_ReturnsFalse()
        {
            // Arrange
            var service = new RefuellingService();
            decimal liters = 0m;

            // Act
            bool result = service.ValidatePositiveLitersAndZero(liters);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public void ValidatePositiveGasPriceAndZero_When_GasPriceIsNegative_ReturnsFalse()
        {
            // Arrange
            var service = new RefuellingService();
            decimal gasPrice = -5.75m;

            // Act
            bool result = service.ValidatePositiveGasPriceAndZero(gasPrice);
            System.Console.WriteLine($"Gas Price: {gasPrice}, Result: {result}"); // Debugging line
            // Assert
            Assert.False(result);
        }
        [Fact]
        public void ValidatePositiveMileage_When_MileageIsNegative_ReturnsFalse()
        {
            // Arrange
            var service = new RefuellingService();
            decimal mileage = -1000m;

            // Act
            bool result = service.ValidatePositiveMileage(mileage);

            // Assert
            Assert.False(result);
        }
        [Fact]
        public void ValidateMileageHigherThanPrevious_When_MileageIsHigherThanPrevious_ReturnsTrue()
        {
            // Arrange
            var service = new RefuellingService();
            decimal mileage = 15000m; // Assuming last mileage was 10000m
            decimal previousMileage = 10000m;

            // Act
            bool result = service.ValidateMileageHigherThanPrevious(mileage, previousMileage);

            // Assert
            Assert.True(result);
        }
    }
}