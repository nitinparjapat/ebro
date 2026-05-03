
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

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
base.OnModelCreating(modelBuilder);

modelBuilder.Entity<Product>().Property(p=>p.Price).HasPrecision(18,2);
modelBuilder.Entity<Order>().Property(o=>o.TotalAmount).HasPrecision(18,2);
modelBuilder.Entity<OrderItem>().Property(o=>o.Price).HasPrecision(18,2);
}

}
