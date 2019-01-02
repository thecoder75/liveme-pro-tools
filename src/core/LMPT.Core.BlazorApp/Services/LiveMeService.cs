using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LMPT.Core.BlazorApp.Models;

namespace LMPT.Core.BlazorApp.Services
{
    public class LiveMeService
    {
        
        public async Task<LiveMeUser> GetUserInfo(string uid)
        {
            return await JsInteropHelper.CallAndGet<LiveMeUser>("LiveMe.getUserInfo", uid);
        }
    }
}
