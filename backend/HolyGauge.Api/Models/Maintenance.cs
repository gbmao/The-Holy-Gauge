namespace HolyGauge.Api.Models
{
    public class Maintenance
    {
        public int Id { get; set; }
        public required string Description { get; set; }
        public DateTime? Date { get; set; }
        public decimal? Kilometers { get; set; }
        public decimal? Cost { get; set; }
        public decimal? NextKilometers { get; set; }
        public DateTime? NextDate { get; set; }
        public string? Notes { get; set; }
        
    }
}