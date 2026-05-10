using System.ComponentModel.DataAnnotations;

namespace BrothersStoreApi.Entities;

public class PrepaidDiscountRule
{
    public int Id { get; set; }

    [Required]
    public int ProductId { get; set; }

    [Range(1, int.MaxValue)]
    public int MinQuantity { get; set; } = 1;

    public int? MaxQuantity { get; set; }

    public decimal DiscountPerItem { get; set; }

    public bool IsActive { get; set; } = true;
}

