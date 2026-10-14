namespace backend.HolyGauge.Api.Dto;

public sealed class CreateMaintenanceRequest
{
    public required string Description { get; init; }
    public DateTime? Date { get; init; }
    public int? Kilometers { get; init; }
    public decimal? Cost { get; init; }
    public int? NextKilometers { get; init; }
    public DateTime? NextDate { get; init; }
    public string? Notes { get; init; }
}
