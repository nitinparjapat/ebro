
using Microsoft.AspNetCore.Mvc;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/users/me")]
public class UsersController:ControllerBase{

private readonly AppDbContext db;

public UsersController(AppDbContext d){db=d;}

[HttpGet("addresses")]
public IActionResult GetAddresses(){
return Ok(db.Addresses.ToList());
}

[HttpPost("addresses")]
public async Task<IActionResult> Add(Address a){
db.Addresses.Add(a);
await db.SaveChangesAsync();
return Ok(a);
}
}
