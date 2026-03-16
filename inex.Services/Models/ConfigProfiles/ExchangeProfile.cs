using AutoMapper;
using inex.Data.Models;
using inex.Services.Models.Records.ExchangeRate;

namespace inex.Services.Models.ConfigProfiles;

public class ExchangeProfile : Profile
{
    public ExchangeProfile()
    {
        CreateMap<ExchangeRate, ExchangeRateDTO>(MemberList.None)
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Date, opt => opt.MapFrom(src => src.Created))
            .ForMember(dest => dest.Rate, opt => opt.MapFrom(src => src.Rate))
            .ForMember(dest => dest.CurrencyFrom, opt => opt.MapFrom(src => src.FromCode))
            .ForMember(dest => dest.CurrencyTo, opt => opt.MapFrom(src => src.ToCode))
            .ForMember(dest => dest.IsTemporary, opt => opt.MapFrom(src => src.IsTemporary));
    }
}