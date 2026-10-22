using JuanGCarmona.Lighthouse.Example.Modules.Catalog;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace JuanGCarmona.Lighthouse.Example.Api;

public partial class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddCatalog();
        builder.Services.AddProblemDetails();
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options => builder.Configuration.GetSection("Authentication").Bind(options));
        builder.Services.AddAuthorization(options => options.AddPolicy("catalog.write",
            policy => policy.RequireAuthenticatedUser().RequireClaim("permission", "catalog.write")));
        var app = builder.Build();
        app.UseExceptionHandler();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapGet("/health", () => Results.Ok(new { status = "ready" }));
        app.MapCatalog();
        app.Run();
    }
}
