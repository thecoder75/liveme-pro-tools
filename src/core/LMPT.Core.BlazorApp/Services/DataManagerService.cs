using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LMPT.Core.BlazorApp.Models;

namespace LMPT.Core.BlazorApp.Services
{
    public class DataManagerService
    {
        public async Task<List<Bookmark>> GetAllBookmarks()
        {
            return await JsInteropHelper
                .CallAndGetArray<Bookmark>("DataManager.getAllBookmarks");
        }

        public async Task UpdateBookmark(Bookmark bookmark)
        {
            await JsInteropHelper.CallAndGet<object>("DataManager.updateBookmark", bookmark);
                
        }
    }
}
