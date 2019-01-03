using System;
using Newtonsoft.Json;

namespace LMPT.Core.BlazorApp.Models
{
    public class Bookmark
    {
        [JsonProperty("uid")]
        public string Uid { get; set; }

        [JsonProperty("shortid")]
        public long Shortid { get; set; }

        [JsonProperty("signature")]
        public string Signature { get; set; }

        [JsonProperty("sex")]
        public string Sex { get; set; }

        [JsonProperty("face")]
        public Uri Face { get; set; }

        [JsonProperty("nickname")]
        public string Nickname { get; set; }

        [JsonProperty("counts")]
        public Counts Counts { get; set; }

        [JsonProperty("last_viewed")]
        public long LastViewed { get; set; }

        [JsonProperty("newest_replay")]
        public long NewestReplay { get; set; }
    }
}