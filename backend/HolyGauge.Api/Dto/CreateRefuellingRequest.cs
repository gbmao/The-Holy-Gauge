namespace backend.HolyGauge.Api.Dto;

public sealed class CreateRefuellingRequest
{
    public decimal Liters { get; init; }
    public bool? BlAdditive { get; init; }
    public int? Mileage { get; init; }
    public bool? BlFullTank { get; init; }
    public decimal? GasPrice { get; init; }
}
