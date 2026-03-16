using AutoMapper;
using System.Collections.Generic;
using System.Linq;
using inex.Data.Repositories.Base;
using inex.Services.Models.Records.Data;
using System;

namespace inex.Services.Services.Base;

public abstract class Service : IDisposable
{
    #region Constructors        

    public Service(IInExUnitOfWork uowInEx, IMapper mapper)
    {
        DbInEx = uowInEx;
        Mapper = mapper;
    }

    #endregion Constructors

    #region Public Interface

    #region Properties

    protected IMapper Mapper { get; }
    protected IInExUnitOfWork DbInEx { get; }

    #endregion Properties

    public ResponseDataExDTO<K, PaginationMetadataDTO> BuildPaginatedDataResponse<T, K>(IQueryable<T> items, int pageSize, int pageNumber)
    {
        int total = items.Count();

        PaginationMetadataDTO metadata = new PaginationMetadataDTO { TotalItems = total, PerPage = pageSize == 0 ? total : pageSize, CurrentPage = pageNumber == 0 ? 1 : pageNumber };
        if (metadata.PerPage < metadata.TotalItems)
        {
            items = items.Skip(metadata.SkippedItems).Take(metadata.PerPage);
        }

        return new ResponseDataExDTO<K, PaginationMetadataDTO>
        {
            Metadata = metadata,
            Data = Mapper.Map<IEnumerable<K>>(items)
        };
    }

    public ResponseDataExDTO<K, ReportMetadataDTO> BuildReportDataResponse<T, K>(IEnumerable<T> items, string name, string currency, DateTime? start = null, DateTime? end = null)
    {
        int total = items.Count();

        return new ResponseDataExDTO<K, ReportMetadataDTO>
        {
            Metadata = new ReportMetadataDTO { Name = name, Currency = currency, Start = start, End = end },
            Data = Mapper.Map<IEnumerable<K>>(items)
        };
    }

    public ResponseDataDTO<K> BuildDataResponse<T, K>(IEnumerable<T> items)
    {
        return new ResponseDataDTO<K>
        {
            Data = Mapper.Map<IEnumerable<K>>(items)
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