Got it. I’ll research all available options—API-free, unofficial, and official—for fetching YouTube metadata (thumbnail, title, channel info, views, etc.) using just the video URL. I’ll also look into frontend and backend approaches suitable for your Railway-hosted Next.js app, how to play videos with `react-youtube`, how to track user watch progress, and how to support admin-controlled start/end cropping of videos.

I’ll get back to you with clear implementation options and recommendations shortly.


# Implementing YouTube Preview Card, Playback Tracking, and Clipping in Next.js

## 1. Fetching YouTube Video Metadata (Without API Key if Possible)

**Goal:** Given a YouTube URL, retrieve the video’s thumbnail, title, channel name, channel avatar, view count, etc., preferably without using an API key.

### **Front-End Approaches (No API Key Required):**

* **YouTube oEmbed & Open Graph:** YouTube provides an oEmbed endpoint that returns basic video info in JSON. For example, a GET to `https://www.youtube.com/oembed?url=<VIDEO_URL>&format=json` yields the title, author (channel) name, thumbnail URL, and embed HTML. This can be fetched client-side or server-side. On Next.js, you’d likely call this from the backend (to avoid CORS issues) and return the JSON to your front-end. **Pros:** No API key needed, simple JSON response. **Cons:** Limited data – you get title, author\_name (channel name), thumbnail, etc., **but not** view count or channel avatar. For example, oEmbed returns:

  ```json
  {
    "title": "Foo Fighters - The Sky Is A Neighborhood (Official Music Video)",
    "author_name": "foofightersVEVO",
    "author_url": "https://www.youtube.com/user/foofightersVEVO",
    "thumbnail_url": "https://i.ytimg.com/vi/TRqiFPpw2fY/hqdefault.jpg",
    "provider_name": "YouTube",
    "html": "<iframe ...></iframe>"
    // ...other fields
  }
  ```

  You could also perform an HTTP GET for the video page and parse Open Graph `<meta>` tags (which include title, description, and thumbnail). However, YouTube’s page doesn’t expose view count or channel avatar in OG tags, so you’d still be missing those.

* **Unofficial YouTube APIs (No key, server-side):** For richer metadata, consider using a backend NPM library that taps into YouTube’s internal APIs or scrapes the video page:

  * **`ytdl-core` (Node.js library):** Commonly used for video downloading, it can also fetch metadata. Using `ytdl.getBasicInfo(videoUrl)` or `ytdl.getInfo`, you can get a JSON containing title, description, length, view count, upload date, channel name, and even the channel’s avatar URL. For example, `info.videoDetails` includes fields like `title`, `viewCount`, `ownerChannelName` (channel title), etc., and `info.videoDetails.author` may include the channel name and avatar URL. (Keep in mind that libraries like ytdl-core rely on YouTube’s internal data structures and may need updates if YouTube changes things.)

  ```js
  import ytdl from 'ytdl-core';
  const info = await ytdl.getBasicInfo('https://www.youtube.com/watch?v=VIDEO_ID');
  const details = info.videoDetails;
  console.log(details.title, details.viewCount, details.ownerChannelName);
  console.log(details.author?.name, details.author?.avatar);
  /* details.author.avatar might provide the channel's logo URL */
  ```

  * **`youtubei` or **YouTube.js**:** This is a client for YouTube’s private “InnerTube” API. It can retrieve video info without an official API key. For example, using `youtubei` you can do:

    ```js
    const { Client } = require('youtubei');
    const youtube = new Client();
    const video = await youtube.getVideo('VIDEO_ID');
    console.log(video.title, video.channel.name, video.viewCount);
    console.log(video.channel.thumbnails[0].url); // channel avatar
    ```

    This approach gives you structured data (views, likes, channel info, etc.) similar to the official API. **Pros:** No key, fairly comprehensive data. **Cons:** Must run on the backend (Node), and you’re relying on unofficial APIs (maintenance risk if YouTube changes its internal API).

  * **`yt-dlp` or other scrapers:** In a Node backend, you could even call a tool like `yt-dlp` via a child process to fetch JSON metadata. For instance, `yt-dlp -J <URL>` returns detailed info including view count, like count, channel id, etc. This is very robust in getting data, but introducing a Python dependency or heavy process in a web app is usually overkill. It’s an option if you needed exhaustive data as a one-off or batch job, but less so for real-time user requests.

**Trade-offs:** A pure front-end solution is limited – you can get title and thumbnail easily via oEmbed/OG, but not view counts or channel avatars due to CORS and data availability. For a **believable YouTube-style card**, the missing pieces are view count and channel avatar. To get those without an API key, the **best approach is a lightweight backend call** (Next.js API route or getServerSideProps) using an unofficial library (like `ytdl-core` or `youtubei`). This avoids API quotas and gives you the needed data. The downside is potential maintenance: if the unofficial method breaks, you’ll need to update the library.

### **Using the Official YouTube Data API (With Key, plus Caching):**

The official API is reliable and returns everything you need, at the cost of requiring an API key and abiding by quota limits. You can call it from your backend when a user submits a URL:

* Use the **Videos API** to get video details and stats. For example, call:
  `GET https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id={VIDEO_ID}&key={YOUR_API_KEY}`
  This returns JSON with the video’s title, description, thumbnails, channel ID/title (from the `snippet`), and viewCount (from `statistics`). It does **not** include the channel’s avatar, but it gives you the channel ID.
* Then use the **Channels API** to get the channel’s info (especially the avatar). For example:
  `GET https://www.googleapis.com/youtube/v3/channels?part=snippet&id={CHANNEL_ID}&key={API_KEY}`
  The channel snippet contains `thumbnails` (default, medium, high) which are the channel profile images.

By combining these two calls, you have all data (title, thumbnails, channel name, channel avatar, view count, etc.). **Recommendation:** Implement this in a Next.js API route and **cache the results** in memory or your database. Caching is important because it reduces latency and prevents hitting quota limits if the same video is requested multiple times. For instance, you might store the metadata in a PostgreSQL table or an in-memory cache (with an expiry) keyed by video ID. On Railway (or any server environment), ensure the cache is external or persistent if you scale to multiple instances (a simple approach is to cache in Postgres or Redis).

**Trade-offs:** The official API is very reliable and **future-proof** (YouTube’s Data API is stable), but you have a quota (e.g., 10,000 units/day by default). Each video details request is 1 unit, and each channel details request is another 1 unit, so 2 units per video lookup – that’s fine for moderate usage. If your app might fetch lots of unique videos, caching results (and perhaps using a background job to pre-fetch popular ones) will help. In summary:

* *Unofficial (no key, e.g. ytdl-core)* – **Pros:** Simple, no quota, one-call get everything. **Cons:** Relies on scraping, update risk if it breaks, slightly slower (hundreds of ms per call).
* *Official API* – **Pros:** Reliable long-term, guaranteed data (views, etc.). **Cons:** Requires API key management, quota limits (mitigated by caching on backend), and slightly more implementation work (two requests instead of one).

**Preferred Approach:** Given the requirements, a good solution is to use a backend API route. On form submission, send the YouTube URL to a Next.js API endpoint. That endpoint can first try to fetch via the **YouTube Data API** (for stability), and fall back to an unofficial method if needed (or vice-versa). In practice, using the official API with caching is sustainable – for example, cache the video metadata in Postgres along with a timestamp. If a video is requested again, use the cached data (and maybe refresh it in the background if it’s older than a day). This way, you get accurate view counts without hitting the API frequently. If you prefer not to use a key at all, then using `ytdl-core` on the backend for each new video (and caching those results as well) is a solid alternative.

## 2. Embedding Video Playback and Tracking Watch Progress

**Goal:** Embed the YouTube video in the app (so users can play it) and track which portions each user watched, ultimately calculating the percentage watched.

**Embedding the Video:** The easiest method in React/Next is to use the **`react-youtube`** package, which is a thin React wrapper around the YouTube IFrame Player API. This lets you drop a `<YouTube>` component into your JSX. Example:

```jsx
import YouTube from 'react-youtube';

function VideoPlayer({ videoId }) {
  const playerRef = useRef(null);
  const opts = { 
    height: '390', width: '640',
    playerVars: { /* e.g., disable related videos */ rel: 0 }
  };

  return (
    <YouTube 
      videoId={videoId}
      opts={opts}
      onReady={e => { playerRef.current = e.target; }}
      onStateChange={onPlayerStateChange}
    />
  );
}
```

This will render an embedded YouTube player. The `onReady` gives you access to the player instance (`e.target`), which you can store (e.g., in a ref or state) to call methods like `getCurrentTime()` and `getDuration()`. The `onStateChange` event is key for tracking playback – it fires whenever the video is played, paused, or ended (among other states).

**Tracking Watch Time:** To track watch progress, you can leverage the YouTube IFrame API events. Specifically:

1. **Detect when playback starts/pauses:** In `onStateChange`, check for `event.data === YT.PlayerState.PLAYING` (video started or resumed) and `event.data === YT.PlayerState.PAUSED` or `ENDED`. When the video starts playing, you’ll start a timer (e.g., using `setInterval`) that periodically checks the current play time. When the video is paused or ends, stop that timer.

2. **Mark watched seconds:** Each second (or every few seconds), record the current time. A common approach is to use an array or Set to mark each second that the user has actually watched. For example, create an array `watched[]` of length equal to the video’s duration (in seconds), initialized to false. Every second, mark `watched[Math.floor(currentTime)] = true`. This approach ensures that even if a user skips around, you only count seconds they actually viewed. (A Set of seconds can also work: add `Math.floor(time)` to a `watchedSeconds` set every second.) This technique is illustrated in a Stack Overflow example, where on each interval tick the code marks the watched second in an array.

3. **Compute percentage watched:** After the video ends (or periodically), you can calculate the percentage of the video watched by the user. If you used an array of booleans, for example, you’d count how many entries are true and divide by the total duration in seconds. If using a Set, the size of the set divided by total seconds gives the fraction watched. For instance, if the video is 200 seconds long and the user’s watchedSeconds set contains 150 unique seconds, then they watched 75%.

**Sample Implementation:**

```jsx
const watchedSeconds = useRef(new Set());
let watchInterval;

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    // Start tracking when video is playing
    watchInterval = setInterval(() => {
      const currentTime = Math.floor(playerRef.current.getCurrentTime());
      watchedSeconds.current.add(currentTime);
    }, 1000);
  } 
  else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    clearInterval(watchInterval);
    // If video ended, compute percentage:
    if (event.data === YT.PlayerState.ENDED) {
      const totalSeconds = Math.floor(playerRef.current.getDuration());
      const watchedCount = watchedSeconds.current.size;
      const percentWatched = ((watchedCount / totalSeconds) * 100).toFixed(2);
      console.log(`User watched ${percentWatched}% of the video`);
      // Here you can send this data to backend or store it
    }
  }
}
```

This will accumulate all seconds the user actually viewed. It’s important to **not** count time when the video is paused or buffering – by clearing the interval on pause, we ensure only active watching time is recorded. (The YouTube API also has a state for buffering; you might treat it like pause for tracking purposes.)

**Data Storage per Session:** Once you have the watch data for a user, decide where to keep it:

* **In-Memory (Frontend):** If you just need it for immediate use (e.g., to show “You’ve watched 50%”), you can keep it in a React state or context. This will reset if the page is reloaded, which might be fine for a single session.
* **Browser Storage:** To persist across page reloads for that user on the same device, you can use `localStorage` or `sessionStorage`. For example, after video end, store `localStorage.setItem(videoId + "_progress", percentWatched)`. This could be read later to e.g. show a progress bar if the user revisits that video.
* **Backend Database:** For longer-term or cross-device tracking (like Netflix/YouTube resume feature), you’ll want to save progress on the server associated with the user. Since you have Postgres available, you could have a table for video\_watch\_progress with columns for userId, videoId, and percentWatched (or even the list of watched seconds if you need detailed analytics). When the interval updates or when the video ends, you’d call an API route to save the progress to DB. This allows a logged-in user to resume on another device. Keep in mind that storing every watched second might be overkill; usually storing the furthest timestamp or percentage is enough for resume functionality.

If users are not authenticated, you could store progress in a session cookie or in-memory by session ID. However, an easier approach is to use localStorage for anonymous users (so progress stays in their browser). Note that **localStorage is per browser** – it won’t sync to another device. For cross-device sync, a backend store tied to a login is needed.

**Performance:** Checking the time every second is not expensive, and the YouTube player API calls (`getCurrentTime()`) are lightweight. Even on long videos, a Set of a few thousand entries (seconds) is fine. Just be sure to clear the interval to avoid memory leaks if the component unmounts or the user navigates away mid-video.

## 3. Admin Interface for Video Clipping (Selecting Start/End Timestamps)

**Goal:** Provide an interface for an admin user to choose a specific segment of the video (start time and end time), and then ensure normal users can only play that portion. Essentially, the admin “clips” the video to a certain range.

### **Building the Admin Clipping UI:**

You can use the same `react-youtube` player for the admin interface, but with additional controls to select the range:

1. **Admin loads the video in a player:** Use the full video (no start/end restrictions on the admin’s player). Alongside the player, provide UI controls to set the start and end. This could be as simple as two buttons: “Set Start” and “Set End”, which record the current playback time. For more precision, you might also show an input field where the admin can adjust the second timestamp or a slider timeline.

2. **Marking start and end:** When the admin clicks “Set Start”, call `playerRef.current.getCurrentTime()` to get the current time (in seconds) and save that as the clip’s start. Do the same for “Set End”. You might display the chosen times (perhaps convert to mm\:ss format for clarity). For example:

   ```jsx
   const [clipStart, setClipStart] = useState(0);
   const [clipEnd, setClipEnd] = useState(0);
   // ... inside render, assuming playerRef and YouTube component are set up
   <button onClick={() => setClipStart(Math.floor(playerRef.current.getCurrentTime()))}>
     Mark Start
   </button>
   <button onClick={() => setClipEnd(Math.floor(playerRef.current.getCurrentTime()))}>
     Mark End
   </button>
   <div>Selected segment: {clipStart}s to {clipEnd}s</div>
   ```

   The admin can play or scrub through the video to find the right points. You might implement a small workflow (e.g., the admin plays, pauses at desired start, clicks “Mark Start”, then seeks to desired end point, clicks “Mark End”).

3. **Saving the clip info:** Once the admin is satisfied, you’ll need to save these times for use by the frontend when regular users watch. This likely means sending the video ID and chosen `start`/`end` to your backend (an API route) and storing it in Postgres. For example, you might have a table `video_clips` with columns: video\_id, start\_seconds, end\_seconds, created\_by, etc. Only admins would be allowed to create/update these. The Next.js API route would authenticate the admin, then insert/update the clip times in the DB.

### **Enforcing the Clip for Users:**

When a normal user views the video, you should load the YouTube player such that it only plays the specified segment:

* **YouTube Player Vars:** The YouTube embed/player supports URL parameters for start and end times. In an `<iframe>` embed URL, you can add `?start=<seconds>&end=<seconds>` to define the playable range. For example:
  `https://www.youtube.com/embed/VIDEO_ID?start=30&end=90`
  will start at 30s and stop playback at 90s. The `react-youtube` component allows you to pass these via the `opts.playerVars`. So, for the user-facing component, you’d do:

  ```jsx
  <YouTube 
    videoId={videoId}
    opts={{ playerVars: { start: clipStart, end: clipEnd } }} 
    // ... other props
  />
  ```

  If you set these playerVars, the embedded player will automatically seek to `start` when loaded, and **auto-stop at `end`** (the video will behave as if it ended at that point).

* **Restricting controls:** By default, the user could still scrub backward before the start or see the timeline for the whole video. There are a couple of additional tweaks you can consider:

  * **Disable controls** (`playerVars: { controls: 0 }`): This removes the seek bar and pause/play controls, effectively preventing the user from seeking outside the allowed range. However, this also means the user can’t pause or adjust volume via the player UI (they could still right-click or use keyboard shortcuts, though). This may or may not be desirable. YouTube’s embed will still show the channel avatar and video title overlay at the start/pause (YouTube’s behavior after 2018), but with no controls the user just watches the clip passively.
  * **Leave controls enabled:** If you leave the seek bar, the user might attempt to drag outside the \[start, end] range. YouTube’s player will not let them go past the `end` time (if they try, the video will just stop at end), but it *might* allow seeking before the start time (e.g., dragging to 0). In practice, if you set a `start`, the player loads at that point and users typically won’t have buffered video before it. But to be safe, you can intercept if needed: in an `onStateChange`, if you detect `player.getCurrentTime()` is less than `clipStart` (meaning somehow they rewound), you can immediately seek back to `clipStart`. This is rarely an issue, but it’s a safeguard.

* **Load the clip times for the user:** When rendering the page for a video, your app should fetch the clip info from the database. For example, in `getServerSideProps` or an API call when the component mounts, retrieve `{ start, end }` for that videoId. If found, pass those into the player. (If a video has no clip defined, you just wouldn’t include an end time.)

**Admin UI considerations:** You could make the admin clipping interface more advanced by showing a visual timeline or allowing the admin to input timecodes manually. But the basic approach above (play and mark) is often sufficient. Once the clip is saved, you might also provide the admin a preview – e.g., reload the player with those `playerVars` to verify it starts/stops correctly.

**Trade-offs:** This approach (using YouTube’s embed parameters) is simple and leverages YouTube’s player to do the heavy lifting of clipping. The alternative would be downloading the video and creating a new clipped video file, but that would be far more complex (and against YouTube’s terms for content use, plus you’d have to host the video yourself on S3). Using embed with start/end is **lightweight and legal**. One thing to note is that when the video ends at the `end` point, the player might show the “related videos” screen or a replay button. Since `rel=0` now shows related videos from the same channel, you might want to keep `rel=0` to minimize unrelated content, or set ` modestbranding: 1` (though YouTube’s branding requirements limit how much you can hide). These are minor details, but the main point is that the user cannot play beyond the intended segment.

**Summary of Clipping Implementation:**

* Use `react-youtube` for the admin to select start/end times of a video.
* Store those times in Postgres via a backend API call.
* For users, load the stored times and initialize the YouTube player with `start` and `end` parameters to restrict playback to that segment. The YouTube player will automatically stop at the end time, effectively clipping the video for the viewer.

By following these steps, you’ll achieve a seamless experience: users submit a URL and see a YouTube-like preview card (thumbnail, title, channel name+avatar, view count), can play the video embed and your app tracks their watch progress, and if you’ve clipped the video, they’ll only be able to watch the portion you’ve specified. All of this can be done within your Next.js app with a mix of front-end and back-end logic as described.

**Sources:**

* YouTube oEmbed API returns title, author (channel) name, and thumbnail without an API key.
* Unofficial libraries (e.g. ytdl-core) can retrieve video title, view count, and channel info (including avatar URL) directly from YouTube without OAuth.
* Example of using YouTube IFrame API events to mark watched seconds in an array every second.
* Note on storing progress: localStorage is device-specific; for true session persistence use a server-side store (e.g., DB).
* YouTube embed URL supports `start` and `end` parameters to define a playback segment, and the player will stop at the `end` time automatically.
