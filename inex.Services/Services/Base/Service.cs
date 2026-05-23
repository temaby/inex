using System;
using System.Collections.Generic;
using System.Linq;
using inex.Data.Repositories.Base;
using inex.Services.Models.Records.Data;

namespace inex.Services.Services.Base;

public abstract class Service : IDisposable
{
    #region Constructors

    public Service(IInExUnitOfWork uowInEx)
    {
        DbInEx = uowInEx;
    }

    #endregion Constructors

    #region Public Interface

    #region Properties

    protected IInExUnitOfWork DbInEx { get; }

    #endregion Properties

    public PagedResponse<K, PaginationMetadata> BuildPaginatedDataResponse<T, K>(IQueryable<T> items, int pageSize, int pageNumber, Func<T, K> map)
    {
        int total = items.Count();

        PaginationMetadata metadata = new PaginationMetadata { TotalItems = total, PerPage = pageSize == 0 ? total : pageSize, CurrentPage = pageNumber == 0 ? 1 : pageNumber };
        if (metadata.PerPage < metadata.TotalItems)
        {
            items = items.Skip(metadata.SkippedItems).Take(metadata.PerPage);
        }

        return new PagedResponse<K, PaginationMetadata>
        {
            Metadata = metadata,
            Data = items.Select(map)
        };
    }

    public PagedResponse<K, ReportMetadata> BuildReportDataResponse<T, K>(IEnumerable<T> items, string name, string currency, Func<T, K> map, DateTime? start = null, DateTime? end = null)
    {
        return new PagedResponse<K, ReportMetadata>
        {
            Metadata = new ReportMetadata { Name = name, Currency = currency, Start = start, End = end },
            Data = items.Select(map)
        };
    }

    public ListResponse<K> BuildDataResponse<T, K>(IEnumerable<T> items, Func<T, K> map)
    {
        return new ListResponse<K>
        {
            Data = items.Select(map)
        };
    }

    public void Dispose()
    {
        DbInEx?.Dispose();
    }

    #endregion Public Interface

    #region Private Methods

    protected const int c_batchSize = 250;

    #endregion Private Methods
}
