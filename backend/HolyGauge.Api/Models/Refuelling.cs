namespace  backend.HolyGauge.Api.Models;

    public class Refuelling
    {

        public int Id { get; set; }
        public decimal Liters { get; set; }
        public bool? BlAdditive { get; set; }
        public int? Mileage { get; set; }
        public bool? BlFullTank { get; set; }
        public DateTime Dh_refuelling { get; set; }
        public decimal? GasPrice { get; set; }

    }




