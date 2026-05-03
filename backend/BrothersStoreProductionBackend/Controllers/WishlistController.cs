
using Microsoft.AspNetCore.Mvc;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/wishlist")]
public class WishlistController:ControllerBase{

private readonly AppDbContext db;

public WishlistController(AppDbContext d){db=d;}

[HttpGet]
public IActionResult Get(){return Ok(db.Wishlist.ToList());}

[HttpPost("items")]
public async Task<IActionResult> Add(WishlistItem item){
db.Wishlist.Add(item);
await db.SaveChangesAsync();
return Ok(item);
}
}
