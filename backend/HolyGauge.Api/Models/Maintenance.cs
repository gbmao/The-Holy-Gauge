namespace backend.HolyGauge.Api.Models
{
    public class Maintenance
    {
        public int Id { get; set; }
        public required string Description { get; set; }
        public DateTime? Date { get; set; }
        public int? Kilometers { get; set; }
        public decimal? Cost { get; set; }
        public int? NextKilometers { get; set; }
        public DateTime? NextDate { get; set; }
        public string? Notes { get; set; }
        
    }
}
