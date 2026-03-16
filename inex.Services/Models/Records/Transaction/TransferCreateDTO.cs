using System;
using System.Text.Json.Serialization;

namespace inex.Services.Models.Records.Transaction;

    public record TransferCreateDTO
    {
        [JsonIgnore]
        public int CategoryId { get; init; }

        public int AccountFromId { get; init; }
        public int AccountToId { get; init; }
        public DateTime Created { get; init; }
        public decimal AmountFrom { get; init; }
        public decimal AmountTo { get; init; }
        public string? Comment { get; init; }
    }