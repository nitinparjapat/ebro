using Microsoft.Extensions.Caching.Memory;

namespace BrothersStoreApi.Services.Caching;

public static class ProductCacheKeys
{
    public static string BuildList(int page, int pageSize, bool includeInactive) =>
        $"products:list:{page}:{pageSize}:{includeInactive}";

    public static string BuildDetail(int productId) =>
        $"products:detail:{productId}";

    public static void Invalidate(IMemoryCache cache, int productId)
    {
        cache.Remove(BuildDetail(productId));
        cache.Remove(BuildList(1, 50, false));
        cache.Remove(BuildList(1, 50, true));
    }
}
