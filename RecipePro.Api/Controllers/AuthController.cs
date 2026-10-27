using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Auth;
using RecipePro.Api.Models;
using RecipePro.Api.Services.Auth;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly PasswordHasher<ApplicationUser> _hasher;

    public AuthController(
        AppDbContext db,
        JwtService jwt,
        PasswordHasher<ApplicationUser> hasher)
    {
        _db = db;
        _jwt = jwt;
        _hasher = hasher;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await _db.ApplicationUsers.AnyAsync(x => x.Email == email))
            return Conflict(new { message = "Email already registered." });

        var user = new ApplicationUser
        {
            Name = request.Name.Trim(),
            Email = email,
            Role = "User",
            IsActive = true
        };

        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        _db.ApplicationUsers.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Registration successful. You can now log in."
        });
    }

    [HttpPost("login")]

    public async Task<IActionResult> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await _db.ApplicationUsers
            .SingleOrDefaultAsync(x => x.Email == email);

        // Email does not exist.
        if (user == null)
        {
            return Unauthorized(new
            {
                message = "Email address is incorrect."
            });
        }

        // Account is inactive.
        if (!user.IsActive)
        {
            return Unauthorized(new
            {
                message = "Your account is inactive. Please contact the administrator."
            });
        }

        // Verify password.
        var result = _hasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.Password
        );

        // Password is incorrect.
        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new
            {
                message = "Password is incorrect."
            });
        }

        // Login successful.
        return Ok(new
        {
            token = _jwt.CreateToken(user),
            user = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Role
            }
        });
    }
}