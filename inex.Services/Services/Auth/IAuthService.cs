using inex.Services.Models.Records.Auth;

namespace inex.Services.Services.Auth;

public interface IAuthService
{
    Task<TokenResponse> RegisterAsync(RegisterRequest request);
    Task<TokenResponse> LoginAsync(LoginRequest request);
    Task<TokenResponse> RefreshAsync(string refreshToken);
    Task RevokeAsync(string refreshToken);
}
