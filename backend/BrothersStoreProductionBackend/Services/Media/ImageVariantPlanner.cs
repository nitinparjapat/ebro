namespace BrothersStoreApi.Services.Media;

public static class ImageVariantPlanner
{
    public static readonly int[] Widths = [320, 640, 960, 1280];

    public static int PickWidth(int? requestedWidth)
    {
        if (!requestedWidth.HasValue || requestedWidth.Value <= 0)
        {
            return 640;
        }

        var desired = requestedWidth.Value;
        foreach (var width in Widths)
        {
            if (width >= desired)
            {
                return width;
            }
        }

        return Widths[^1];
    }
}

