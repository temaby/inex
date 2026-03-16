using System;

namespace inex.Services.Extensions;

public static class StringExtensions
{
    public static bool Contains(this string source, string toCheck, bool ignoreCase)
    {
        if (ignoreCase)
        {
            return source.IndexOf(toCheck, StringComparison.OrdinalIgnoreCase) >= 0;
        }

        return source.Contains(toCheck);
    }
}
