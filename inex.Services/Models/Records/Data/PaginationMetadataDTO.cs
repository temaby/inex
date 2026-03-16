using System;

namespace inex.Services.Models.Records.Data;

public record PaginationMetadataDTO
{
    public int TotalItems { get; init; }
    public int PerPage { get; init; }
    public int CurrentPage { get; init; }

    public int SkippedItems => PerPage * (CurrentPage - 1);
    public int TotalPages => (TotalItems == 0 || PerPage == 0) ? 0 : (int)Math.Ceiling((double)TotalItems / PerPage);
}