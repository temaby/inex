using inex.Data.Models;

namespace inex.Services.Services.Auth;

public interface ITokenService
{
    string GenerateAccessToken(AppUser user);
    string GenerateRefreshToken();
}
