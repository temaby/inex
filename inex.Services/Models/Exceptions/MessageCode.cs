namespace inex.Services.Models.Exceptions;

public enum MessageCode
{
    OK = 1,

    // General
    DataInvalid = 101,
    NotSupported,
    UploadFailed,
    AccessDenied,
    InternalError,
    NotFound
}