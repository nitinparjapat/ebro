
using Microsoft.EntityFrameworkCore;
using BrothersStoreApi.Entities;

namespace BrothersStoreApi.Data;

public class AppDbContext:DbContext{

public AppDbContext(DbContextOptions<AppDbContext> options):base(options){}

public DbSet<Product> Products=>Set<Product>();
public DbSet<CartItem> CartItems=>Set<CartItem>();
public DbSet<WishlistItem> Wishlist=>Set<WishlistItem>();
public DbSet<Order> Orders=>Set<Order>();
public DbSet<OrderItem> OrderItems=>Set<OrderItem>();
public DbSet<Review> Reviews=>Set<Review>();
public DbSet<Address> Addresses=>Set<Address>();
public DbSet<User> Users=>Set<User>();
public DbSet<WebsiteVisit> WebsiteVisits=>Set<WebsiteVisit>();
public DbSet<PrepaidDiscountRule> PrepaidDiscountRules=>Set<PrepaidDiscountRule>();

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
base.OnModelCreating(modelBuilder);

 modelBuilder.Entity<Product>().Property(p=>p.OriginalPrice).HasPrecision(18,2);
 modelBuilder.Entity<Product>().Property(p=>p.Price).HasPrecision(18,2);
 modelBuilder.Entity<Product>().HasIndex(product=>product.IsActive);
 modelBuilder.Entity<Product>().HasIndex(product=>product.CategoryName);
  modelBuilder.Entity<Order>().Property(o=>o.TotalAmount).HasPrecision(18,2);
  modelBuilder.Entity<OrderItem>().Property(o=>o.Price).HasPrecision(18,2);
 modelBuilder.Entity<Review>().HasIndex(review=>new { review.ProductId, review.Status, review.ApprovedAt });
  modelBuilder.Entity<WebsiteVisit>().HasIndex(visit=>new { visit.ClientKey, visit.VisitDateUtc });
  modelBuilder.Entity<PrepaidDiscountRule>().Property(rule=>rule.DiscountPerItem).HasPrecision(18,2);
 }

}
