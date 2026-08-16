namespace backend.HolyGauge.Api.Dto;

public class RefuellingHistoryDto
{
    public int Id { get; set; }
    public DateTime OccurredAt { get; set; }
    public decimal Liters { get; set; }
    public decimal Total { get; set; }
    public int Odometer { get; set; }
}


    