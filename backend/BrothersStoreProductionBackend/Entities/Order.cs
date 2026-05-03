
namespace BrothersStoreApi.Entities;

public class Order{
public int Id{get;set;}
public string CustomerName{get;set;}="";
public string CustomerMobile{get;set;}="";
public string CustomerEmail{get;set;}="";
public string ShippingAddress{get;set;}="";
public string PaymentMethod{get;set;}="";
public string Status{get;set;}="OrderInitialized";
public string ConfirmedByAdminName{get;set;}="";
public string ConfirmedByAdminEmail{get;set;}="";
public DateTime? ConfirmedAt{get;set;}
public decimal TotalAmount{get;set;}
public DateTime CreatedAt{get;set;}=DateTime.UtcNow;
public List<OrderItem> Items{get;set;}=new();
}
