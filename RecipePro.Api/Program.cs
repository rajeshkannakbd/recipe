using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RecipePro.Api.Data;
using RecipePro.Api.Models;
using RecipePro.Api.Services.Auth;
using RecipePro.Api.Services.Category;
using RecipePro.Api.Services.Ingredient;
using RecipePro.Api.Services.Recipe;
using RecipePro.Api.Configuration;
using RecipePro.Api.Services.Images;
using RecipePro.Api.Services.Prices;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing database connection.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)));

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Missing JWT key.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("JWT key must be at least 32 bytes.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtKey)),
                ClockSkew = TimeSpan.FromSeconds(30)
            };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<PasswordHasher<ApplicationUser>>();

builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IIngredientService, IngredientService>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<IMandiPriceService,DataGovMandiPriceService>();

builder.Services.AddScoped<IRecipeService, RecipeService>();

builder.Services
    .AddOptions<CloudinarySettings>()
    .Bind(builder.Configuration.GetSection("CloudinarySettings"))
    .Validate(
        settings =>
            !string.IsNullOrWhiteSpace(settings.CloudName) &&
            !string.IsNullOrWhiteSpace(settings.ApiKey) &&
            !string.IsNullOrWhiteSpace(settings.ApiSecret),
        "Cloudinary settings are missing.")
    .ValidateOnStart();

builder.Services.AddSingleton<IImageService>(serviceProvider =>
{
    var settings = serviceProvider
        .GetRequiredService<
            Microsoft.Extensions.Options.IOptions<CloudinarySettings>>()
        .Value;

    return new CloudinaryImageService(settings);
});

var app = builder.Build();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();