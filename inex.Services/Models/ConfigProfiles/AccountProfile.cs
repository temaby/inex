using AutoMapper;
using inex.Data.Models;
using inex.Services.Models.Records.Account;

namespace inex.Services.Models.ConfigProfiles;

public class AccountProfile : Profile
{
    public AccountProfile()
    {
        CreateMap<AccountCreateDTO, Account>(MemberList.None)
            .ForMember(dest => dest.CurrencyId, opt => opt.MapFrom(src => src.CurrencyId))
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.IsEnabled, opt => opt.MapFrom(src => src.IsEnabled));

        CreateMap<AccountUpdateDTO, Account>(MemberList.None)
            .ForMember(dest => dest.CurrencyId, opt => opt.MapFrom(src => src.CurrencyId))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.IsEnabled, opt => opt.MapFrom(src => src.IsEnabled));

        CreateMap<Account, AccountDetailsDTO>(MemberList.None)
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Currency, opt => opt.MapFrom(src => src.Currency.Key))
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.IsEnabled, opt => opt.MapFrom(src => src.IsEnabled));

        CreateMap<Account, AccountListDetailsDTO>(MemberList.None)
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Currency, opt => opt.MapFrom(src => src.Currency.Key))
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.IsEnabled, opt => opt.MapFrom(src => src.IsEnabled));
    }
}