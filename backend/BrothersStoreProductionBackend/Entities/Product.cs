
namespace BrothersStoreApi.Entities;

public class Product{
public int Id{get;set;}
public string Name{get;set;}="";
public string Description{get;set;}="";
public decimal OriginalPrice{get;set;}
public decimal Price{get;set;}
public int Stock{get;set;}
public string CategoryName{get;set;}="";
public bool IsActive{get;set;}=true;
public string? PrimaryImageUrl{get;set;}
public string ImagesJson{get;set;}="[]";
public string VideosJson{get;set;}="[]";
}
