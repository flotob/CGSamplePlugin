TL;DR for your Cursor Agent

Phase	Goal	Key Steps (high-level)
1 – quick & dirty	Show any YouTube clip via a plain <iframe> so you can demo “something plays”.	1) Accept videoId prop.2) Render <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=0&origin=${location.origin}" …/>.3) Expose width/height/full-screen props so designers can tweak sizes.
2 – proper player	Swap the iframe for the react-youtube component so you get formal event hooks, API control, autoplay, playlists, etc.	1) npm i react-youtube.2) Import YouTube and drop it in place of the iframe.3) Pass an opts object ({height, width, playerVars}) to fine-tune playback.4) Wire the event callbacks you care about (onReady, onPlay, onEnd …).

Below is the detailed play-by-play your Cursor Agent can follow.

⸻

0. Pick the package
	•	react-youtube is the mainstream, actively-downloaded React wrapper around the YouTube IFrame API (≈ 400 k installs/week; latest 10.1.0).  ￼
	•	Ignore youtube-react (largely unmaintained) unless you need a very slim bundle; and keep react-player in mind only if you want multi-provider support later.  ￼

⸻

1. Bootstrap the repo (one-time)

npx create-react-app youtube-embed-demo --template typescript   # or js if you prefer
cd youtube-embed-demo
git init && git add . && git commit -m "scaffold"

(No citation needed—general workflow.)

⸻

2. Phase 1 – quick iframe embed
	1.	Skeleton component

// src/components/IframeEmbed.tsx
export const IframeEmbed = ({
  videoId,
  title = 'YouTube video',
  width = '560',
  height = '315',
}: {
  videoId: string;
  title?: string;
  width?: string | number;
  height?: string | number;
}) => (
  <iframe
    width={width}
    height={height}
    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&origin=${window.location.origin}`}
    title={title}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
    style={{ border: 0 }}
  />
);


	2.	Usage

<IframeEmbed videoId="M7lc1UVf-VE" />


	3.	Why it works – The embed/VIDEO_ID URL with optional query params (autoplay=1, loop=1, playlist=…, etc.) is the simplest officially-supported path.  ￼
	4.	Limitations
	•	No programmatic control (pause, seek, etc.).
	•	Mobile autoplay restrictions still apply.
	•	No typed event callbacks.

⸻

3. Phase 2 – upgrade to react-youtube

3.1 Install & import

npm i react-youtube         # or yarn add / pnpm add

import YouTube, { YouTubeProps } from 'react-youtube';

￼

3.2 Drop-in component

export const YouTubePlayer = ({ videoId }: { videoId: string }) => {
  const opts: YouTubeProps['opts'] = {
    height: '390',
    width: '640',
    playerVars: {
      autoplay: 0,       // 1 to start immediately (may be blocked on mobile)
      controls: 1,       // hide native controls with 0
      mute: 0,
      rel: 0,            // hide “related videos” at end
      playsinline: 1,    // iOS Safari inline
      modestbranding: 1, // less intrusive YouTube logo
    },
  };

  const onPlayerReady: YouTubeProps['onReady'] = (e) => {
    // e.target is the YT.Player instance → you can call .pauseVideo(), .seekTo(), etc.
    console.log('duration', e.target.getDuration());
  };

  return <YouTube videoId={videoId} opts={opts} onReady={onPlayerReady} />;
};

The props map straight to the IFrame API; anything not in playerVars (e.g. CSS classes) sits at the top level.  ￼

3.3 Handling events you’ll likely need

Event	Typical use
onReady	Prefetch thumbnails, store player ref.
onPlay / onPause	Toggle UI overlays, analytics.
onEnd	Autoplay next video.
onStateChange	Granular player states (YouTube.PlayerState enum exposed).

3.4 Responsive layout tip

Wrap the player in a container that keeps a 16∶9 ratio:

.player-wrapper {
  position: relative;
  padding-top: 56.25%; /* 9/16 = 0.5625 */
}
.player-wrapper iframe {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

3.5 Server-side rendering gotcha (Next.js, Remix…)

react-youtube accesses window during mount. Guard with:

{typeof window !== 'undefined' && <YouTubePlayer videoId={…} />}

or use dynamic import { ssr: false } in Next.js.

⸻

4. Forward plan / extensibility
	•	Playlists & queues – Instead of a single videoId, pass opts.playerVars = { listType: 'playlist', list: 'PLAYLIST_ID' } to load full playlists.  ￼
	•	Captions & language – cc_lang_pref, cc_load_policy in playerVars.  ￼
	•	Custom controls – Use the YT.Player instance from onReady and hide default controls (controls: 0) to build your own UX.

⸻

5. Checklist for the Cursor Agent
	1.	Scaffold CRA/Next app if not already present.
	2.	Phase 1
	•	Create IframeEmbed.tsx per code above.
	•	Render it in App.tsx with any hard-coded videoId until data layer exists.
	3.	Phase 2
	•	npm i react-youtube.
	•	Replace iframe component with YouTubePlayer wrapper.
	•	Pass minimal opts first; iterate once designers decide on autoplay/branding.
	•	Expose onPlay, onPause, onEnd props to parent so analytics can hook in.
	4.	Testing – Verify: first render succeeds, autoplay obeys mobile policies, callbacks fire.
	5.	Commit & push so reviewers can pull, run npm start, and see both modes.

That’s it—your agent should be able to move from a trivial embed to a fully-controllable YouTube player without surprises.