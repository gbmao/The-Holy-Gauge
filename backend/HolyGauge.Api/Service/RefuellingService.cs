using backend.HolyGauge.Api.Data;
using backend.HolyGauge.Api.Models;
using backend.HolyGauge.Api.Dto;

namespace backend.HolyGauge.Api.Service
{
    public class RefuellingService
    {
        private readonly IRefuellingRepository _refuellingRepository;

        public RefuellingService(IRefuellingRepository refuellingRepository)
        {
            _refuellingRepository = refuellingRepository;
        }

        public async Task CreateAsync(Refuelling refuelling)
        {
            ValidatePositiveLitersAndZero(refuelling.Liters);
            ValidatePositiveGasPriceAndZero(refuelling.GasPrice);
            ValidatePositiveMileage(refuelling.Mileage);
            await _refuellingRepository.CreateAsync(refuelling);
        }

        public async Task<decimal> GetMonthlyExpenseAsync(int month, int year)
        {
            return await _refuellingRepository.GetMonthlyExpenseAsync(month, year);
        }

        public async Task<decimal> GetAverageConsumptionAsync()
        {
            return await _refuellingRepository.GetAverageConsumptionAsync();
        }
        public async Task<List<RefuellingHistoryDto>> GetAllRefuellingsAsync()
        {
            return await _refuellingRepository.GetAllRefuellingsAsync();
        }

        //Validation methods
        public bool ValidatePositiveLitersAndZero(decimal liters)
        {
            if(liters <= 0)
            {
                throw new ArgumentException("Liters must be greater than zero.");
            }
            return liters > 0;
        }

        public bool ValidatePositiveGasPriceAndZero(decimal? gasPrice)
        {
            if(gasPrice <= 0 || gasPrice == null)
            {
                throw new ArgumentException("Gas price must be greater than zero.");
            }
            return gasPrice > 0;
        }
        public bool ValidatePositiveMileage(decimal? mileage)
        {
            if(mileage <= 0 || mileage == null)
            {
                throw new ArgumentException("Mileage must be greater than zero.");
            }
            return mileage > 0;
        }

        public bool ValidateMileageHigherThanPrevious(decimal mileage, decimal previousMileage)
        {
            if(mileage < previousMileage)
            {
                throw new ArgumentException("Mileage must be higher than the previous mileage.");
            }
            return mileage >= previousMileage;
        }
    }
}