using JuanGCarmona.Lighthouse.Cqrs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace JuanGCarmona.Lighthouse.Example.Modules.Catalog.Features.Entries;

internal static class CreateEntry
{
    internal static void Map(IEndpointRouteBuilder routes) => routes
        .MapPost("/api/entries", async (Request request, ICommandHandler<Command, Outcome> handler, CancellationToken token) =>
        {
            var outcome = await handler.Handle(new Command(request.Name), token);
            return outcome.Value is { } value
                ? Results.Created($"/api/entries/{value.Id}", value)
                : Results.ValidationProblem(outcome.Errors);
        })
        .RequireAuthorization("catalog.write");

    internal sealed record Request(string? Name);
    internal sealed record Response(Guid Id, string Name);
    internal sealed record Command(string? Name);
    internal sealed record Outcome(Response? Value, Dictionary<string, string[]> Errors);

    internal static class Validator
    {
        internal static Dictionary<string, string[]> Validate(Command command)
        {
            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(command.Name) || command.Name.Trim().Length > 80)
                errors["name"] = ["Use a name between 1 and 80 characters."];
            return errors;
        }
    }

    internal sealed class Handler(EntryStore store) : ICommandHandler<Command, Outcome>
    {
        public Task<Outcome> Handle(Command command, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var errors = Validator.Validate(command);
            if (errors.Count > 0) return Task.FromResult(new Outcome(null, errors));
            var entry = store.Add(command.Name!.Trim());
            return Task.FromResult(new Outcome(new Response(entry.Id, entry.Name), errors));
        }
    }
}
