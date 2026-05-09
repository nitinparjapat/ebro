namespace BrothersStoreApi.Entities;

public class WebsiteVisit
{
public int Id{get;set;}
public string ClientKey{get;set;}="";
public string Path{get;set;}="";
public DateTime VisitDateUtc{get;set;}
public DateTime CreatedAt{get;set;}=DateTime.UtcNow;
}
