using System;
using System.Diagnostics;
using Microsoft.AspNetCore.Blazor.Hosting;
using Microsoft.JSInterop;

namespace LMPT.Core.BlazorApp
{
    public class Program
    {

        [JSInvokable]
        public static bool HealthCheck() => true;

        [JSInvokable]
        public static string GetVersion(){
            System.Reflection.Assembly assembly = System.Reflection.Assembly.GetExecutingAssembly();
            FileVersionInfo fvi = FileVersionInfo.GetVersionInfo(assembly.Location);
            string version = fvi.FileVersion;
            return version;
        }

        [JSInvokable]
        public static void ShutDown() => Environment.Exit(0);

        public static void Main(string[] args)
        {
        }

    }
}
