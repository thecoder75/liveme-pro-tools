using Newtonsoft.Json;

namespace LMPT.Core.BlazorApp.Models
{
    public class CountInfo
    {
        [JsonProperty("following_count")]
        
        public long FollowingCount { get; set; }

        [JsonProperty("follower_count")]
        
        public long FollowerCount { get; set; }

        [JsonProperty("black_count")]
        
        public long BlackCount { get; set; }

        [JsonProperty("video_count")]
        
        public long VideoCount { get; set; }

        [JsonProperty("live_count")]
        
        public long LiveCount { get; set; }

        [JsonProperty("replay_count")]
        
        public long ReplayCount { get; set; }

        [JsonProperty("ad_num")]
        
        public long AdNum { get; set; }

        [JsonProperty("friends_count")]
        
        public long FriendsCount { get; set; }
    }
}