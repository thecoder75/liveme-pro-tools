using Newtonsoft.Json;

namespace LMPT.Core.BlazorApp.Models
{
    public class Counts
    {
        [JsonProperty("replays")]
        public long Replays { get; set; }

        [JsonProperty("friends")]
        public long Friends { get; set; }

        [JsonProperty("followers")]
        public long Followers { get; set; }

        [JsonProperty("followings")]
        public long Followings { get; set; }

        [JsonProperty("changed")]
        public bool Changed { get; set; }
    }
}