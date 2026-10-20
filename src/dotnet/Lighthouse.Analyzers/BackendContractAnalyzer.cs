using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace JuanGCarmona.Lighthouse.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class BackendContractAnalyzer : DiagnosticAnalyzer
{
    private static readonly DiagnosticDescriptor HandlerContract = new(
        "LH1001", "Keep CQRS handlers internal and sealed",
        "Handler '{0}' must be declared internal sealed", "Lighthouse.Architecture",
        DiagnosticSeverity.Error, isEnabledByDefault: true,
        description: "A module exposes its API and contracts; handlers remain implementation details.");

    private static readonly DiagnosticDescriptor ModuleReference = new(
        "LH1002", "Use contracts across module boundaries",
        "Module '{0}' references implementation assembly '{1}'; depend on its Contracts assembly",
        "Lighthouse.Architecture", DiagnosticSeverity.Error, isEnabledByDefault: true,
        description: "Cross-module dependencies must terminate at a separately named Contracts assembly.",
        customTags: new[] { WellKnownDiagnosticTags.CompilationEnd });

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(HandlerContract, ModuleReference);

    public override void Initialize(AnalysisContext context)
    {
        context.EnableConcurrentExecution();
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.RegisterCompilationStartAction(start =>
        {
            if (!start.Options.AnalyzerConfigOptionsProvider.GlobalOptions.TryGetValue(
                "build_property.LighthouseModule", out var enabled)
                || !string.Equals(enabled, "true", StringComparison.OrdinalIgnoreCase))
                return;

            start.RegisterSymbolAction(CheckHandler, SymbolKind.NamedType);
            start.RegisterCompilationEndAction(CheckDependencies);
        });
    }

    private static void CheckHandler(SymbolAnalysisContext context)
    {
        var type = (INamedTypeSymbol)context.Symbol;
        if (type.TypeKind != TypeKind.Class || !type.AllInterfaces.Any(IsHandler)) return;
        if (type.DeclaredAccessibility == Accessibility.Internal && type.IsSealed) return;
        var location = type.Locations.FirstOrDefault(x => x.IsInSource);
        if (location is not null)
            context.ReportDiagnostic(Diagnostic.Create(HandlerContract, location, type.Name));
    }

    private static bool IsHandler(INamedTypeSymbol contract) =>
        contract.ContainingNamespace.ToDisplayString() == "JuanGCarmona.Lighthouse.Cqrs"
        && contract.Arity == 2
        && (contract.Name == "ICommandHandler" || contract.Name == "IQueryHandler");

    private static void CheckDependencies(CompilationAnalysisContext context)
    {
        var name = context.Compilation.AssemblyName;
        const string separator = ".Modules.";
        var boundary = name?.IndexOf(separator, StringComparison.Ordinal) ?? -1;
        if (name is null || boundary < 0 || name.EndsWith(".Contracts", StringComparison.Ordinal)) return;
        var family = name.Substring(0, boundary + separator.Length);
        foreach (var dependency in context.Compilation.SourceModule.ReferencedAssemblySymbols)
        {
            if (dependency.Name.StartsWith(family, StringComparison.Ordinal)
                && dependency.Name != name
                && !dependency.Name.EndsWith(".Contracts", StringComparison.Ordinal))
                context.ReportDiagnostic(Diagnostic.Create(ModuleReference, Location.None, name, dependency.Name));
        }
    }
}
