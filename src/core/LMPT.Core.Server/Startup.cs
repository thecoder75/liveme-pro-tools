using System;
using System.IO;
using System.Linq;
using System.Net.Mime;
using System.Reflection;
using Microsoft.AspNetCore.Blazor.Server;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;

namespace LMPT.Core.Server
{
    public class Startup
    {
        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
            // Adds the Server-Side Blazor services, and those registered by the app project's startup.
            services.AddServerSideBlazor<global::LMPT.Core.BlazorApp.Startup>();
            

            services.AddResponseCompression(options =>
            {
                options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
                {
                    MediaTypeNames.Application.Octet,
                    WasmMediaTypeNames.Application.Wasm,
                });
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            app.UseResponseCompression();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            // Use component registrations and static files from the app project.
            var binFolder = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
            Console.WriteLine(binFolder);

            app.UseStaticFiles();
            app.UseStaticFiles(new StaticFileOptions()
            {
                FileProvider = new PhysicalFileProvider(Path.Combine(binFolder, @"../../../../../electron/app")),
                RequestPath = new PathString("")
            });
            
            app.UseSignalR(route => route.MapHub<BlazorHub>(BlazorHub.DefaultPath, o =>
            {
                o.ApplicationMaxBufferSize = 131072; // larger size
                o.TransportMaxBufferSize = 131072; // larger size
            }));
            app.UseBlazor<global::LMPT.Core.BlazorApp.Startup>();
            // app.UseServerSideBlazor<global::LMPT.Core.BlazorApp.Startup>();

        }
    }
}
