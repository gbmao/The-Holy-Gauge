namespace  backend.HolyGauge.Api.Models;

    public class Refuelling
    {

        private int Id { get; set; }
        private decimal Liters { get; set; }
        private bool Bl_additive { get; set; }
        private int Mileage { get; set; }
        private bool Bl_fullTank { get; set; }
        private DateTime Dh_refuelling { get; set; }
        private decimal gas_price { get; set; }

    }




