using AutoMapper;
using CsvHelper;
using CsvHelper.Configuration;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using inex.Data.Repositories.Base;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services.Base;

namespace inex.Services.Services;

public class CSVService : Service, ICSVService
{
    #region Constructors

    public CSVService(IInExUnitOfWork uowInEx, IMapper mapper) : base(uowInEx, mapper)
    {

    }

    #endregion Constructors

    public IEnumerable<TransactionFenturyCSVRecordDTO> ParseFenturyCSVTransactions(Stream stream, string delimiter)
    {
        using (StreamReader sr = new StreamReader(stream))
        {
            CsvConfiguration config = new CsvConfiguration(CultureInfo.CurrentCulture) { IgnoreBlankLines = true, DetectDelimiter = true };
            var csv = new CsvReader(sr, config);
            csv.Context.RegisterClassMap<TransactionFenturyCSVRecordDTOMap>();
            return csv.GetRecords<TransactionFenturyCSVRecordDTO>().ToList();
        }
    }

    private sealed class TransactionFenturyCSVRecordDTOMap : ClassMap<TransactionFenturyCSVRecordDTO>
    {
        public TransactionFenturyCSVRecordDTOMap()
        {
            Map(m => m.Date).Name("date");
            Map(m => m.Category).Name("category");
            Map(m => m.Account).Name("account");
            Map(m => m.Amount).Name("amount").Convert(row => decimal.Parse(row.Row.GetField("amount").Replace(",", "."))); ;
            Map(m => m.Currency).Name("currency");
            Map(m => m.Status).Name("status");
            Map(m => m.Tags).Name("tags");
            Map(m => m.Description).Name("description");
        }
    }
}