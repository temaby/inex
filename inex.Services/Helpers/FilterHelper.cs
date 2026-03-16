using inex.Services.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;

namespace inex.Services.Helpers;

public static class FilterHelper
{
    public static IDictionary<string, string> ParseFilter(string? filterStr, IEnumerable<string> fields)
    {
        IDictionary<string, string> search = new Dictionary<string, string>();

        if (!string.IsNullOrEmpty(filterStr))
        {
            string[] filters = filterStr.Split(";".ToCharArray(), StringSplitOptions.RemoveEmptyEntries);
            foreach (string filter in filters)
            {
                string[] parts = filter.Split(":".ToCharArray(), StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    string value = parts[1];

                    foreach (string key in parts[0].Split(",".ToCharArray()))
                    {
                        if (fields.Any(i => i.Contains(key, true)))
                        {
                            search.Add(key.ToLower(), value);
                        }
                    }
                }
            }
        }

        return search;
    }

    public static DateTime GetDateTimeFromFilter(IDictionary<string, string> filters, string key, DateTime? defaultValue = null)
    {
        DateTime value = defaultValue ?? DateTime.MinValue;
        if (filters.Keys.Contains(key.ToLower()))
        {
            DateTime.TryParse(filters[key.ToLower()], out value);
        }
        return value;
    }

    public static int GetIntFromFilter(IDictionary<string, string> filters, string key, int defaultValue = -1)
    {
        int value = defaultValue;
        if (filters.Keys.Contains(key.ToLower()))
        {
            int.TryParse(filters[key.ToLower()], out value);
        }
        return value;
    }

    public static IEnumerable<int> GetIntArrayFromFilter(IDictionary<string, string> filters, string key)
    {
        IList<int> result = new List<int>();
        if (filters.Keys.Contains(key.ToLower()))
        {
            int value = -1;
            string[] values = filters[key.ToLower()].Replace(" ", "").Split(",".ToCharArray(), StringSplitOptions.RemoveEmptyEntries);
            foreach (string item in values)
            {
                if (int.TryParse(item, out value))
                {
                    result.Add(value);
                }
            }
        }
        return result;
    }

    public static string GetStringFromFilter(IDictionary<string, string> filters, string key, string? spaceholder = null)
    {
        string result = string.Empty;
        if (filters.Keys.Contains(key.ToLower()))
        {
            result = string.IsNullOrEmpty(spaceholder) ? filters[key.ToLower()] : filters[key.ToLower()].Replace(spaceholder, " ");
        }
        return result;
    }

    public static IEnumerable<string> GetStringArrayFromFilter(IDictionary<string, string> filters, string key, string? spaceholder = null)
    {
        IList<string> result = new List<string>();
        if (filters.Keys.Contains(key.ToLower()))
        {
            string[] values = string.IsNullOrEmpty(spaceholder) ? filters[key.ToLower()].Split(",".ToCharArray(), StringSplitOptions.RemoveEmptyEntries) : filters[key.ToLower()].Replace(spaceholder, " ").Split(",".ToCharArray(), StringSplitOptions.RemoveEmptyEntries);
            foreach (string item in values)
            {
                if (!string.IsNullOrEmpty(item))
                {
                    result.Add(item);
                }
            }
        }
        return result;
    }

    public static bool? GetBooleanFromFilter(IDictionary<string, string> filters, string key)
    {
        bool? result = null;
        if (filters.Keys.Contains(key.ToLower()))
        {
            bool temp = false;
            result = bool.TryParse(filters[key.ToLower()], out temp) ? (bool?)temp : null;
        }
        return result;
    }
}