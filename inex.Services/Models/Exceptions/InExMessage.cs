using System.Collections.Generic;
using inex.Services.Models.Exceptions.Base;

namespace inex.Services.Models.Exceptions;

public partial class InExMessage : IMessage
{
    #region Constructors

    static InExMessage()
    {
        #region General - 100            

        s_messageKeys.Add(MessageCode.DataInvalid, "api.general.data_invalid");
        s_messageKeys.Add(MessageCode.NotSupported, "api.general.not_supported");
        s_messageKeys.Add(MessageCode.UploadFailed, "api.general.upload_failed");
        s_messageKeys.Add(MessageCode.AccessDenied, "api.general.access_denied");
        s_messageKeys.Add(MessageCode.InternalError, "api.general.internal_error");
        s_messageKeys.Add(MessageCode.NotFound, "api.general.not_found");

        s_messages.Add("api.general.data_invalid", "");
        s_messages.Add("api.general.not_supported", "");
        s_messages.Add("api.general.upload_failed", "");
        s_messages.Add("api.general.access_denied", "");
        s_messages.Add("api.general.internal_error", "");
        s_messages.Add("api.general.not_found", "");

        #endregion
    }

    public InExMessage(MessageCode code, MessageSeverity severity, bool showInUI = true, string? data = null) : this(code, severity, GetText(code), showInUI, data)
    {
    }

    public InExMessage(MessageCode code, MessageSeverity severity, string message, bool showInUI = true, string? data = null)
    {
        Code = code;
        Severity = severity;
        Message = message;
        JSONData = data;
        ShowInUI = showInUI;
    }

    #endregion Constructors

    #region Public Interface

    public MessageCode Code { get; set; }
    public string MessageName => Code.ToString();
    public string Message { get; set; } = null!;
    public string? JSONData { get; set; }
    public MessageSeverity Severity { get; set; }
    public string SeverityName => Severity.ToString();
    public bool ShowInUI { get; set; }

    public static string GetText(MessageCode code)
    {
        if (!s_messageKeys.ContainsKey(code))
        {
            return "Unknown text";
        }

        return s_messages.ContainsKey(s_messageKeys[code]) ? s_messages[s_messageKeys[code]] : s_messageKeys[code];
    }

    #endregion Public Interface

    #region Private Fields

    private static IDictionary<MessageCode, string> s_messageKeys = new Dictionary<MessageCode, string>();
    private static IDictionary<string, string> s_messages = new Dictionary<string, string>();

    #endregion Private Fields
}