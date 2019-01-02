using System;
using LMPT.Core.BlazorApp.Services;
using LMPT.Core.BlazorApp.Shared;
using Microsoft.AspNetCore.Blazor.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace LMPT.Core.BlazorApp
{
    public class Startup
    {
        public static IServiceProvider ServiceProvider;
        
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSingleton<DataManagerService>();
            services.AddSingleton<LiveMeService>();
        }

        public void Configure(IBlazorApplicationBuilder app)
        {
            app.AddComponent<BookmarkFeed>("BookmarkFeed");
            
        }
    }
}
