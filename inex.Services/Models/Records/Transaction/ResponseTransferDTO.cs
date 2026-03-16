using inex.Services.Models.Records.Base;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace inex.Services.Models.Records.Transaction;

public record ResponseTransferDTO : ResponseDTO
{
    public int FromId { get; set; }
    public int ToId { get; set; }
}