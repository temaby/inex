using System.Collections.Generic;
using System.IO;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Services.Base;

public interface ICSVService
{
    IEnumerable<TransactionFenturyCSVRecordDTO> ParseFenturyCSVTransactions(Stream stream, string delimiter);
}