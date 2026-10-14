namespace backend.HolyGauge.Api.Models;

    public class Refuelling
    {

        public int Id { get; set; }
        public decimal Liters { get; set; }
        public bool? BlAdditive { get; set; }
        public int? Mileage { get; set; }
        public bool? BlFullTank { get; set; }
        public DateTime OccurredAt { get; set; }
        public decimal? GasPrice { get; set; }

    }




