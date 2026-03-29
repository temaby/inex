namespace inex.Services.Models.Records.Auth;

/// <param name="AccessToken">JWT access token.</param>
/// <param name="ExpiresIn">Seconds until access token expires (standard OAuth2 field).</param>
public record TokenResponse(string AccessToken, int ExpiresIn);
