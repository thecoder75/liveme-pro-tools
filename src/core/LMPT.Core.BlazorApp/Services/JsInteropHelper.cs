using Newtonsoft.Json;
using Microsoft.JSInterop;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;

namespace LMPT.Core.BlazorApp
{
    public static class JsInteropHelper
    {
        public static async Task<List<T>> CallAndGetArray<T>(string function, params object[] parameter)
        {
            var res = await JSRuntime.Current.InvokeAsync<object[]>(
                function, parameter);

            return res.Select(o =>
            {
                var json = JsonConvert.SerializeObject(o);
                return JsonConvert.DeserializeObject<T>(json);
            }).ToList();
        }

        public static async Task<T> CallAndGet<T>(string function, params object[] parameter)
        {
            var res = await JSRuntime.Current.InvokeAsync<object>(
                function, parameter);

            var json = JsonConvert.SerializeObject(res);
            return JsonConvert.DeserializeObject<T>(json);
        }
    }
}