using System.Collections.Concurrent;

namespace JuanGCarmona.Lighthouse.Example.Modules.Catalog.Features.Entries;

internal sealed record Entry(Guid Id, string Name);

internal sealed class EntryStore
{
    private readonly ConcurrentDictionary<Guid, Entry> entries = new();
    internal Entry Add(string name)
    {
        var entry = new Entry(Guid.CreateVersion7(), name);
        entries[entry.Id] = entry;
        return entry;
    }
    internal Entry? Find(Guid id) => entries.GetValueOrDefault(id);
}
