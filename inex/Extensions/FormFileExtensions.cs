using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.IO;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Exceptions.Base;

namespace inex.Extensions;

public static class FormFileExtensions
{
    public static Stream ValidateAndOpenReadStream(this IFormFile file, int sizeMaxMb, IList<string> allowedExtensions)
    {
        if (file == null)
        {
            throw new InExException(new List<IMessage>() { new InExMessage(MessageCode.UploadFailed, MessageSeverity.Error, string.Format(InExMessage.GetText(MessageCode.UploadFailed)), true) });
        }

        if (file.Length > sizeMaxMb)
        {
            throw new InExException(new List<IMessage>() { new InExMessage(MessageCode.UploadFailed, MessageSeverity.Error, string.Format(InExMessage.GetText(MessageCode.UploadFailed)), true, sizeMaxMb.ToString()) });
        }

        string path = file.FileName.Replace("\"", string.Empty);
        string name = path.Contains("\\") ? path.Substring(path.LastIndexOf('\\')).Replace("\\", string.Empty) : path;
        string ext = path.Contains(".") ? path.Substring(path.LastIndexOf('.')) : path;

        if (!allowedExtensions.Contains(ext))
        {
            throw new InExException(new List<IMessage>() { new InExMessage(MessageCode.UploadFailed, MessageSeverity.Error, string.Format(InExMessage.GetText(MessageCode.UploadFailed)), true, string.Join(", ", allowedExtensions)) });
        }

        return file.OpenReadStream();
    }
}
