using JuanGCarmona.Lighthouse.Cqrs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace JuanGCarmona.Lighthouse.Example.Modules.Catalog.Features.Entries;

internal static class GetEntry
{
    internal static void Map(IEndpointRouteBuilder routes) => routes
        .MapGet("/api/entries/{id:guid}", async (Guid id, IQueryHandler<Query, Response?> handler, CancellationToken token) =>
        {
            var value = await handler.Handle(new Query(id), token);
            return value is null ? Results.NotFound() : Results.Ok(value);
        })
        .RequireAuthorization();

    internal sealed record Query(Guid Id);
    internal sealed record Response(Guid Id, string Name);

    internal sealed class Handler(EntryStore store) : IQueryHandler<Query, Response?>
    {
        public Task<Response?> Handle(Query query, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var value = store.Find(query.Id);
            return Task.FromResult(value is null ? null : new Response(value.Id, value.Name));
        }
    }
}
