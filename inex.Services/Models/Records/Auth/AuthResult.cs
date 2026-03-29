namespace inex.Services.Models.Records.Auth;

/// <summary>
/// Internal result returned by AuthService to the controller.
/// The controller places RefreshToken in an httpOnly cookie and returns
/// only AccessToken + ExpiresIn to the client.
/// </summary>
public record AuthResult(string AccessToken, string RefreshToken, int ExpiresIn);
