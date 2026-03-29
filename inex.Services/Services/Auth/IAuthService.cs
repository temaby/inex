using inex.Services.Models.Records.Auth;

namespace inex.Services.Services.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request);
    Task<AuthResult> LoginAsync(LoginRequest request);
    Task<AuthResult> RefreshAsync(string refreshToken);
    Task RevokeAsync(string refreshToken);
}
