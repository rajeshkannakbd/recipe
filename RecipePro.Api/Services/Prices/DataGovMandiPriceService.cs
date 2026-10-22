using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace RecipePro.Api.Services.Prices;

public sealed class DataGovMandiPriceService : IMandiPriceService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DataGovMandiPriceService> _logger;

    public DataGovMandiPriceService(
        HttpClient httpClient,
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<DataGovMandiPriceService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _cache = cache;
        _logger = logger;
        // Prevent a stalled external API from holding recipe calculations
        // open indefinitely. Timeouts are handled as a missing mandi price.
        _httpClient.Timeout = TimeSpan.FromSeconds(8);
    }

    public async Task<MandiPriceResult?> GetPriceAsync(
        string ingredientName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(ingredientName))
        {
            return null;
        }

        string commodity = MapCommodity(ingredientName);
        string cacheKey = $"mandi-price:tn:{commodity.ToLowerInvariant()}";

        return await _cache.GetOrCreateAsync(
            cacheKey,
            async entry =>
            {
                MandiPriceResult? result = await FetchPriceAsync(
                    commodity,
                    cancellationToken);

                // Successful prices can be cached longer; missing market
                // data is retried sooner because new arrivals may be posted.
                entry.AbsoluteExpirationRelativeToNow = result is null
                    ? TimeSpan.FromMinutes(5)
                    : TimeSpan.FromHours(2);

                return result;
            });
    }

    private async Task<MandiPriceResult?> FetchPriceAsync(
        string commodity,
        CancellationToken cancellationToken)
    {
        string? apiKey = _configuration["DataGov:ApiKey"];
        string? resourceId = _configuration["DataGov:ResourceId"];

        if (string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(resourceId))
        {
            throw new InvalidOperationException(
                "Data.gov.in configuration is missing. Configure " +
                "DataGov:ApiKey and DataGov:ResourceId.");
        }

        string url =
            $"https://api.data.gov.in/resource/{Uri.EscapeDataString(resourceId)}" +
            $"?api-key={Uri.EscapeDataString(apiKey)}" +
            "&format=json&limit=100" +
            $"&filters[state]={Uri.EscapeDataString("Tamil Nadu")}" +
            $"&filters[commodity]={Uri.EscapeDataString(commodity)}";

        try
        {
            using HttpResponseMessage response = await _httpClient.GetAsync(
                url,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Data.gov.in returned HTTP {StatusCode} for commodity {Commodity}.",
                    (int)response.StatusCode,
                    commodity);

                return null;
            }

            await using Stream stream =
                await response.Content.ReadAsStreamAsync(cancellationToken);

            using JsonDocument document = await JsonDocument.ParseAsync(
                stream,
                cancellationToken: cancellationToken);

            if (!TryGetPropertyIgnoreCase(
                    document.RootElement,
                    "records",
                    out JsonElement records) ||
                records.ValueKind != JsonValueKind.Array)
            {
                _logger.LogWarning(
                    "Data.gov.in response did not contain a records array for {Commodity}.",
                    commodity);

                return null;
            }

            var candidates = new List<(MandiPriceResult Result, DateTime Date)>();

            foreach (JsonElement record in records.EnumerateArray())
            {
                string state = ReadText(record, "state");
                string recordCommodity = ReadText(record, "commodity");
                string market = ReadText(record, "market");
                string district = ReadText(record, "district");
                string arrivalDate = ReadText(record, "arrival_date");
                string modalPriceText = ReadText(record, "modal_price");

                if (!string.IsNullOrWhiteSpace(state) &&
                    !state.Equals(
                        "Tamil Nadu",
                        StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!recordCommodity.Equals(
                        commodity,
                        StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!decimal.TryParse(
                        modalPriceText,
                        NumberStyles.Number,
                        CultureInfo.InvariantCulture,
                        out decimal modalPrice) ||
                    modalPrice <= 0m)
                {
                    continue;
                }

                if (!TryParseArrivalDate(arrivalDate, out DateTime parsedDate))
                {
                    continue;
                }

                // Mandi modal prices are commonly quoted in ₹ per quintal.
                // 1 quintal = 100 kg, so divide by 100 to get ₹ per kg.
                decimal pricePerKg = Math.Round(
                    modalPrice / 100m,
                    2,
                    MidpointRounding.AwayFromZero);

                candidates.Add((
                    new MandiPriceResult(
                        recordCommodity,
                        pricePerKg,
                        market,
                        district,
                        arrivalDate),
                    parsedDate));
            }

            return candidates
                .OrderByDescending(x => x.Date)
                .Select(x => x.Result)
                .FirstOrDefault();
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                "Data.gov.in request timed out for commodity {Commodity}.",
                commodity);

            return null;
        }
        catch (OperationCanceledException)
        {
            // Preserve cancellation initiated by the API caller.
            throw;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(
                ex,
                "Could not reach Data.gov.in for commodity {Commodity}.",
                commodity);

            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(
                ex,
                "Data.gov.in returned invalid JSON for commodity {Commodity}.",
                commodity);

            return null;
        }
    }

    private static bool TryParseArrivalDate(
        string value,
        out DateTime date)
    {
        string[] formats =
        {
            "dd/MM/yyyy",
            "d/M/yyyy",
            "yyyy-MM-dd",
            "dd-MM-yyyy",
            "d-M-yyyy",
            "yyyy/MM/dd"
        };

        return DateTime.TryParseExact(
                   value,
                   formats,
                   CultureInfo.InvariantCulture,
                   DateTimeStyles.None,
                   out date)
               || DateTime.TryParse(
                   value,
                   CultureInfo.InvariantCulture,
                   DateTimeStyles.None,
                   out date);
    }

    private static string ReadText(
        JsonElement element,
        string propertyName)
    {
        if (!TryGetPropertyIgnoreCase(
                element,
                propertyName,
                out JsonElement value))
        {
            return string.Empty;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? string.Empty,
            JsonValueKind.Number => value.ToString(),
            _ => string.Empty
        };
    }

    private static bool TryGetPropertyIgnoreCase(
        JsonElement element,
        string propertyName,
        out JsonElement value)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (JsonProperty property in element.EnumerateObject())
            {
                if (property.Name.Equals(
                        propertyName,
                        StringComparison.OrdinalIgnoreCase))
                {
                    value = property.Value;
                    return true;
                }
            }
        }

        value = default;
        return false;
    }

    private static string NormalizeIngredientName(string value)
    {
        return string.Join(
            " ",
            value.Trim().ToLowerInvariant()
                .Replace("_", " ")
                .Replace("-", " ")
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static string MapCommodity(string ingredientName)
    {
        string name = ingredientName.Trim();

        string normalized = NormalizeIngredientName(name);

        return normalized switch
        {
            "onion" or "onions" => "Onion",
            "tomato" or "tomatoes" => "Tomato",
            "potato" or "potatoes" => "Potato",
            "brinjal" or "eggplant" or "aubergine" => "Brinjal",
            "green chilli" or "green chilies" or "green chillies" or
                "green chilly" or "green pepper" => "Green Chilli",
            "red chilli" or "red chilies" or "red chillies" or
                "red chilly" or "dry chilli" or "dried red chilli" or
                "dry red chilli" or "chilli red" => "Chilli Red",
            "turmeric" or "turmeric root" or "fresh turmeric" => "Turmeric",
            "garlic" or "garlic cloves" => "Garlic",
            "ginger" or "green ginger" or "fresh ginger" => "Ginger(Green)",
            "coriander" or "coriander seed" or "coriander seeds" => "Coriander",
            "coriander leaves" or "cilantro" => "Coriander(Leaves)",
            "basmati rice" or "rice" => "Rice",
            "black pepper" or "peppercorn" or "peppercorns" => "Black Pepper",
            "lemon" or "lemons" => "Lemon",
            _ => name
        };
    }
}
