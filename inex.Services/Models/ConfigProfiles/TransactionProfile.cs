using AutoMapper;
using inex.Data.Models;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Models.ConfigProfiles;

public class TransactionProfile : Profile
{
    public TransactionProfile()
    {
        CreateMap<TransactionCreateDTO, Transaction>(MemberList.None)
            .ForMember(dest => dest.AccountId, opt => opt.MapFrom(src => src.AccountId))
            .ForMember(dest => dest.CategoryId, opt => opt.MapFrom(src => src.CategoryId))
            .ForMember(dest => dest.Value, opt => opt.MapFrom(src => src.Amount))
            .ForMember(dest => dest.Comment, opt => opt.MapFrom(src => src.Comment))
            .ForMember(dest => dest.Created, opt => opt.MapFrom(src => src.Created));

        CreateMap<TransferCreateDTO, TransferFromCreateDTO>(MemberList.None)
            .ForMember(dest => dest.AccountFromId, opt => opt.MapFrom(src => src.AccountFromId))
            .ForMember(dest => dest.AmountFrom, opt => opt.MapFrom(src => src.AmountFrom))
            .ForMember(dest => dest.Comment, opt => opt.MapFrom(src => src.Comment))
            .ForMember(dest => dest.Created, opt => opt.MapFrom(src => src.Created));

        CreateMap<TransferFromCreateDTO, Transaction>(MemberList.None)
            .ForMember(dest => dest.AccountId, opt => opt.MapFrom(src => src.AccountFromId))
            .ForMember(dest => dest.Value, opt => opt.MapFrom(src => src.AmountFrom))
            .ForMember(dest => dest.Comment, opt => opt.MapFrom(src => src.Comment))
            .ForMember(dest => dest.Created, opt => opt.MapFrom(src => src.Created));

        CreateMap<TransferCreateDTO, TransferToCreateDTO>(MemberList.None)
            .ForMember(dest => dest.AccountToId, opt => opt.MapFrom(src => src.AccountToId))
            .ForMember(dest => dest.AmountTo, opt => opt.MapFrom(src => src.AmountTo))
            .ForMember(dest => dest.Comment, opt => opt.MapFrom(src => src.Comment))
            .ForMember(dest => dest.Created, opt => opt.MapFrom(src => src.Created));

        CreateMap<TransferToCreateDTO, Transaction>(MemberList.None)
            .ForMember(dest => dest.AccountId, opt => opt.MapFrom(src => src.AccountToId))
            .ForMember(dest => dest.Value, opt => opt.MapFrom(src => src.AmountTo))
            .ForMember(dest => dest.Comment, opt => opt.MapFrom(src => src.Comment))
            .ForMember(dest => dest.Created, opt => opt.MapFrom(src => src.Created));

        CreateMap<TransactionUpdateDTO, Transaction>(MemberList.None)
            .ForMember(dest => dest.AccountId, opt => opt.MapFrom(src => src.AccountId))
            .ForMember(dest => dest.CategoryId, opt => opt.MapFrom(src => src.CategoryId))
            .ForMember(dest => dest.Value, opt => opt.MapFrom(src => src.Amount))
            .ForMember(dest => dest.Comment, opt => opt.MapFrom(src => src.Comment))
            .ForMember(dest => dest.Created, opt => opt.MapFrom(src => src.Created));

        CreateMap<Transaction, TransactionDetailsDTO>(MemberList.None)
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.AccountId, opt => opt.MapFrom(src => src.AccountId))
            .ForMember(dest => dest.CategoryId, opt => opt.MapFrom(src => src.CategoryId))
            .ForMember(dest => dest.Amount, opt => opt.MapFrom(src => src.Value))
            .ForMember(dest => dest.Comment, opt => opt.MapFrom(src => src.Comment))
            .ForMember(dest => dest.Created, opt => opt.MapFrom(src => src.Created))
            .ForMember(dest => dest.AccountCurrency, opt => opt.MapFrom(src => src.Account.Currency));
    }
}