
namespace BrothersStoreApi.Entities;

public class Review{
public int Id{get;set;}
public int ProductId{get;set;}
public string ProductTitle{get;set;}="";
public int Rating{get;set;}
public string Text{get;set;}="";
public string Status{get;set;}="Pending";
public string CustomerName{get;set;}="";
public string CustomerEmail{get;set;}="";
public DateTime CreatedAt{get;set;}=DateTime.UtcNow;
public DateTime? ApprovedAt{get;set;}
}
