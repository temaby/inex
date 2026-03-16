namespace inex.Services.Models.Exceptions.Base;

public interface IMessage
{
    MessageCode Code { get; set; }
    string MessageName { get; }
    string Message { get; set; }
    string? JSONData { get; set; }
    MessageSeverity Severity { get; set; }
    string SeverityName { get; }
    bool ShowInUI { get; }
}