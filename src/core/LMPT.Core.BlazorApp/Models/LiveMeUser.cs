using System.Collections.Generic;
using Newtonsoft.Json;

namespace LMPT.Core.BlazorApp.Models
{
    public class LiveMeUser
    {
        [JsonProperty("time")]
        
        public long Time { get; set; }

        [JsonProperty("user_info")]
        public Dictionary<string, string> UserInfo { get; set; }

        [JsonProperty("following_list")]
        public object[] FollowingList { get; set; }

        [JsonProperty("follower_list")]
        public object[] FollowerList { get; set; }

        [JsonProperty("video_list")]
        public object[] VideoList { get; set; }

        [JsonProperty("count_info")]
        public CountInfo CountInfo { get; set; }
    }
}