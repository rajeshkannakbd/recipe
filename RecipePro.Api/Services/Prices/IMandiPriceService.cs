namespace RecipePro.Api.Services.Prices;

public sealed record MandiPriceResult(
    string Commodity,
    decimal PricePerKg,
    string Market,
    string District,
    string ArrivalDate);

public interface IMandiPriceService
{
    Task<MandiPriceResult?> GetPriceAsync(
        string ingredientName,
        CancellationToken cancellationToken = default);
}
