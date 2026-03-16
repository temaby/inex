using AutoMapper;
using inex.Data.Models;
using inex.Services.Models.Records.Budget;
using System.Linq;

namespace inex.Services.Models.ConfigProfiles;

public class BudgetProfile : Profile
{
    public BudgetProfile()
    {
        CreateMap<BudgetCreateDTO, Budget>(MemberList.None)
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.Year, opt => opt.MapFrom(src => src.Year))
            .ForMember(dest => dest.Month, opt => opt.MapFrom(src => src.Month))
            .ForMember(dest => dest.Value, opt => opt.MapFrom(src => src.Value));

        CreateMap<BudgetUpdateDTO, Budget>(MemberList.None)
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.Year, opt => opt.MapFrom(src => src.Year))
            .ForMember(dest => dest.Month, opt => opt.MapFrom(src => src.Month))
            .ForMember(dest => dest.Value, opt => opt.MapFrom(src => src.Value));

        CreateMap<Budget, BudgetDetailsDTO>()
            .ForMember(dest => dest.CategoryIds, opt => opt.MapFrom(src => src.BudgetCategories.Select(i => i.CategoryId).ToList()));
    }
}