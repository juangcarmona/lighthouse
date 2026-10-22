var builder = DistributedApplication.CreateBuilder(args);
builder.AddProject<Projects.Lighthouse_Example_Api>("api");
builder.Build().Run();
