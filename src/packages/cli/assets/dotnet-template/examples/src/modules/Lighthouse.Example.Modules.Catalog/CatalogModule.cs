using JuanGCarmona.Lighthouse.Cqrs;
using JuanGCarmona.Lighthouse.Example.Modules.Catalog.Features.Entries;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace JuanGCarmona.Lighthouse.Example.Modules.Catalog;

public static class CatalogModule
{
    public static IServiceCollection AddCatalog(this IServiceCollection services)
    {
        services.AddSingleton<EntryStore>();
        services.AddScoped<ICommandHandler<CreateEntry.Command, CreateEntry.Outcome>, CreateEntry.Handler>();
        services.AddScoped<IQueryHandler<GetEntry.Query, GetEntry.Response?>, GetEntry.Handler>();
        return services;
    }

    public static IEndpointRouteBuilder MapCatalog(this IEndpointRouteBuilder endpoints)
    {
        CreateEntry.Map(endpoints);
        GetEntry.Map(endpoints);
        return endpoints;
    }
}
