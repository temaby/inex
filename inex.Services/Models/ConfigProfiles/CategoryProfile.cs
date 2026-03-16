using AutoMapper;
using inex.Data.Models;
using inex.Services.Models.Records.Category;

namespace inex.Services.Models.ConfigProfiles;

public class CategoryProfile : Profile
{
    public CategoryProfile()
    {
        CreateMap<CategoryCreateDTO, Category>(MemberList.None)
            .ForMember(dest => dest.ParentCategoryId, opt => opt.MapFrom(src => src.ParentId))
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.IsEnabled, opt => opt.MapFrom(src => src.IsEnabled))
            .ForMember(dest => dest.IsSystem, opt => opt.MapFrom(src => src.IsSystem))
            .ForMember(dest => dest.SystemCode, opt => opt.MapFrom(src => src.SystemCode));

        CreateMap<CategoryUpdateDTO, Category>(MemberList.None)
            .ForMember(dest => dest.ParentCategoryId, opt => opt.Ignore())
            .ForMember(dest => dest.Key, opt => opt.Ignore())
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.IsEnabled, opt => opt.MapFrom(src => src.IsEnabled))
            .ForMember(dest => dest.IsSystem, opt => opt.Ignore())
            .ForMember(dest => dest.SystemCode, opt => opt.Ignore());

        CreateMap<Category, CategoryDetailsDTO>(MemberList.None)
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.ParentId, opt => opt.MapFrom(src => src.ParentCategoryId))
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.IsEnabled, opt => opt.MapFrom(src => src.IsEnabled))
            .ForMember(dest => dest.IsSystem, opt => opt.MapFrom(src => src.IsSystem))
            .ForMember(dest => dest.SystemCode, opt => opt.MapFrom(src => src.SystemCode));

        CreateMap<CategoryDetailsDTO, CategoryListDetailsDTO>(MemberList.None)
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.ParentId, opt => opt.MapFrom(src => src.ParentId))
            .ForMember(dest => dest.Key, opt => opt.MapFrom(src => src.Key))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
            .ForMember(dest => dest.IsEnabled, opt => opt.MapFrom(src => src.IsEnabled))
            .ForMember(dest => dest.IsSystem, opt => opt.MapFrom(src => src.IsSystem))
            .ForMember(dest => dest.SystemCode, opt => opt.MapFrom(src => src.SystemCode));
    }
}