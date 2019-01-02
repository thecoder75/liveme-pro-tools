using System;
using Microsoft.AspNetCore.Blazor.Hosting;
using Microsoft.JSInterop;

namespace LMPT.Core.BlazorApp
{
    public class Program
    {
        [JSInvokable]
        public static bool HealthCheck() => true;

        [JSInvokable]
        public static void ShutDown() => Environment.Exit(0);

        public static void Main(string[] args)
        {
        }

    }
}
