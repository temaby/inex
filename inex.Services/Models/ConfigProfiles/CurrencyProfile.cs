using AutoMapper;
using inex.Data.Models;
using inex.Services.Models.Records.Base;

namespace inex.Services.Models.ConfigProfiles;

public class CurrencyProfile : Profile
{
    public CurrencyProfile()
    {
        CreateMap<Currency, NamedDTO>(MemberList.None)
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name));
    }
}