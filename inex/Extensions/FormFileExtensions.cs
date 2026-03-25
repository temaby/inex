using inex.Services.Exceptions;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.IO;

namespace inex.Extensions;

public static class FormFileExtensions
{
    public static Stream ValidateAndOpenReadStream(this IFormFile file, int sizeMaxMb, IList<string> allowedExtensions)
    {
        if (file == null)
        {
            throw new UploadFailedException("No file was provided.");
        }

        if (file.Length > sizeMaxMb)
        {
            throw new UploadFailedException($"File size exceeds the maximum allowed size of {sizeMaxMb} MB.");
        }

        string path = file.FileName.Replace("\"", string.Empty);
        string ext = path.Contains(".") ? path.Substring(path.LastIndexOf('.')) : path;

        if (!allowedExtensions.Contains(ext))
        {
            throw new UploadFailedException($"File extension '{ext}' is not allowed. Allowed extensions: {string.Join(", ", allowedExtensions)}.");
        }

        return file.OpenReadStream();
    }
}
