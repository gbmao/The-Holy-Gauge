namespace backend.HolyGauge.Api.Service
{
    public class RefuellingService
    {
        public bool ValidatePositiveLitersAndZero(decimal liters)
        {
            return liters > 0;
        }

        public bool ValidatePositiveGasPriceAndZero(decimal gasPrice)
        {
            return gasPrice > 0;
        }
        public bool ValidatePositiveMileage(decimal mileage)
        {
            return mileage > 0;
        }

        public bool ValidateMileageHigherThanPrevious(decimal mileage, decimal previousMileage)
        {
            return mileage >= previousMileage;
        }
    }
}