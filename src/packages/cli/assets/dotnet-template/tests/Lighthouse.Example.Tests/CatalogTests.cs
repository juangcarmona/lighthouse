using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using JuanGCarmona.Lighthouse.Example.Api;
using JuanGCarmona.Lighthouse.Example.Modules.Catalog;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace JuanGCarmona.Lighthouse.Tests;

public class CatalogTests : IClassFixture<CatalogApplication>
{
    private readonly CatalogApplication application;
    public CatalogTests(CatalogApplication application) => this.application = application;

    [Fact]
    public async Task AnonymousWriteIsUnauthorized()
    {
        using var client = application.CreateClient();
        var response = await client.PostAsJsonAsync("/api/entries", new { name = "Socket" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedReaderCannotWrite()
    {
        using var client = application.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Identity", "reader");
        var response = await client.PostAsJsonAsync("/api/entries", new { name = "Socket" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task InvalidCommandReturnsValidationProblem(string? name)
    {
        using var client = Writer();
        var response = await client.PostAsJsonAsync("/api/entries", new { name });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("name", await response.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task CommandThenQueryReturnsTheCreatedResource()
    {
        using var client = Writer();
        var response = await client.PostAsJsonAsync("/api/entries", new { name = "  Socket  " });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
        var entry = await client.GetFromJsonAsync<EntryResponse>(response.Headers.Location);
        Assert.NotNull(entry);
        Assert.Equal("Socket", entry.Name);
        Assert.NotEqual(Guid.Empty, entry.Id);
    }

    [Fact]
    public async Task UnknownResourceReturnsNotFound()
    {
        using var client = Writer();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/entries/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public void CompiledModuleDoesNotExposeHandlersOrReferenceASiblingImplementation()
    {
        var assembly = typeof(CatalogModule).Assembly;
        Assert.DoesNotContain(assembly.GetExportedTypes(), type => type.GetInterfaces()
            .Any(i => i.Namespace == "JuanGCarmona.Lighthouse.Cqrs"));
        Assert.DoesNotContain(assembly.GetReferencedAssemblies(), reference =>
            reference.Name!.StartsWith("JuanGCarmona.Lighthouse.Example.Modules.", StringComparison.Ordinal)
            && !reference.Name.EndsWith(".Contracts", StringComparison.Ordinal));
    }

    private HttpClient Writer()
    {
        var client = application.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Identity", "writer");
        return client;
    }

    private sealed record EntryResponse(Guid Id, string Name);
}

public sealed class CatalogApplication : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(services =>
        services.AddAuthentication("test-only").AddScheme<AuthenticationSchemeOptions, TestIdentity>("test-only", _ => { }));
}

public sealed class TestIdentity(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identity = Request.Headers["X-Test-Identity"].ToString();
        if (identity is not ("writer" or "reader")) return Task.FromResult(AuthenticateResult.NoResult());
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, identity) };
        if (identity == "writer") claims.Add(new Claim("permission", "catalog.write"));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name)));
    }
}
