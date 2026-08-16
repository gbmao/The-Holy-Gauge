namespace  backend.HolyGauge.Api.Models;

    public class Refuelling
    {
        public Refuelling(int id,int vehicleId, DateTime date, double amount, double pricePerUnit, int odometerReading)
        {
            Id = id;
            VehicleId = vehicleId;
            Date = date;
            Amount = amount;
            PricePerUnit = pricePerUnit;
            OdometerReading = odometerReading;
        }

        public int Id { get; set; }
        public int VehicleId { get; set; }
        public DateTime Date { get; set; }
        public double Amount { get; set; }
        public double PricePerUnit { get; set; }
        public int OdometerReading { get; set; }
    }




