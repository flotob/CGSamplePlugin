html:
<div class="new__bg">
  <div class="hello__div">
    <svg class="hello__svg" viewBox="0 0 1230.94 414.57">
      <path d="M-293.58-104.62S-103.61-205.49-60-366.25c9.13-32.45,9-58.31,0-74-10.72-18.82-49.69-33.21-75.55,31.94-27.82,70.11-52.22,377.24-44.11,322.48s34-176.24,99.89-183.19c37.66-4,49.55,23.58,52.83,47.92a117.06,117.06,0,0,1-3,45.32c-7.17,27.28-20.47,97.67,33.51,96.86,66.93-1,131.91-53.89,159.55-84.49,31.1-36.17,31.1-70.64,19.27-90.25-16.74-29.92-69.47-33-92.79,16.73C62.78-179.86,98.7-93.8,159-81.63S302.7-99.55,393.3-269.92c29.86-58.16,52.85-114.71,46.14-150.08-7.44-39.21-59.74-54.5-92.87-8.7-47,65-61.78,266.62-34.74,308.53S416.62-58,481.52-130.31s133.2-188.56,146.54-256.23c14-71.15-56.94-94.64-88.4-47.32C500.53-375,467.58-229.49,503.3-127a73.73,73.73,0,0,0,23.43,33.67c25.49,20.23,55.1,16,77.46,6.32a111.25,111.25,0,0,0,30.44-19.87c37.73-34.23,29-36.71,64.58-127.53C724-284.3,785-298.63,821-259.13a71,71,0,0,1,13.69,22.56c17.68,46,6.81,80-6.81,107.89-12,24.62-34.56,42.72-61.45,47.91-23.06,4.45-48.37-.35-66.48-24.27a78.88,78.88,0,0,1-12.66-25.8c-14.75-51,4.14-88.76,11-101.41,6.18-11.39,37.26-69.61,103.42-42.24,55.71,23.05,100.66-23.31,100.66-23.31" transform="translate(311.08 476.02)" style="fill:none;stroke:#fff;stroke-linecap:round;stroke-miterlimit:10;stroke-width:35px" />
    </svg>
  </div>
</div>

css:
body {
  padding: 0;
  margin: 0;
}
.new__bg {
  height: 100%;
  min-height: 500px;
  background: linear-gradient(
      217deg,
      rgba(255, 159, 237),
      rgba(255, 0, 0, 0) 70.71%
    ),
    linear-gradient(127deg, rgba(118, 164, 255), rgba(0, 255, 0, 0) 65%),
    linear-gradient(336deg, rgba(255, 191, 138), rgba(0, 0, 255, 0) 70.71%);
  display: flex;
  justify-content: center;
}
.hello__div {
  display: flex;
  justify-content: center;
  flex-direction: column;
  margin: 0 auto;
  text-align: center;
  width: 100%;
  max-width: 600px;
}
.hello__svg {
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
  stroke-miterlimit: 10;
  stroke-width: 48px;
  stroke-dasharray: 5800px;
  stroke-dashoffset: 5800px;
  animation: anim__hello linear 5s forwards;
  width: 100%;

  display: flex;
  justify-content: center;
  flex-direction: column;
  margin: 0 auto;
  text-align: center;
}

@keyframes anim__hello {
  0% {
    stroke-dashoffset: 5800;
  }
  25% {
    stroke-dashoffset: 5800;
  }
  100% {
    stroke-dashoffset: 0;
  }
}


js:
const hello = document.querySelector(".hello__div");
setInterval(hello__function, 20000);
function hello__function() {
  hello.style.display = "none";
  setTimeout(function () {
    hello.style.display = "flex";
  }, 10);
}




dark mode variants:
Here’s a quick, ready-to-use dark-mode makeover that keeps the friendly “cotton-candy” vibe of your original blue-to-pink gradient, but shifts it into richer, low-light tones so white lettering still pops:

Purpose	Hex	RGB	Notes
Gradient start	#082B81	8  43 129	deep indigo picked by darkening the original pastel-blue stop
Mid-stop (optional)	#431774	67 23 116	binds the two ends; gives a subtle purple accent
Gradient end	#7D135F	125 19 95	dark magenta made by darkening the pastel-pink stop
Text / icon	#FFFFFF	255 255 255	pure white keeps maximum contrast
Shadow / subtle outline	#00000040	—	25 %-opacity black adds gentle lift if needed

Quick CSS snippet

/* Dark-mode banner */
.banner-dark {
  background: linear-gradient(
    90deg,
    #082B81 0%,
    #431774 50%,
    #7D135F 100%
  );
  color: #fff;                 /* <— keeps “hello” nice and bright */
  text-shadow: 0 2px 4px #00000040;
}

Why this works
	1.	Preserves the mood. Instead of literal color-negative inversion (which would give you muddy yellows and greens), we kept the same hues and simply lowered lightness in HSL space (~35 % of the original). That retains brand familiarity while embracing dark UI conventions.
	2.	High perceived contrast. Deep, saturated bases paired with pure white lettering maintain WCAG AA contrast (> 7:1 against #082B81 and #7D135F).
	3.	Smooth transition. Users toggling between light and dark themes see the same color family sliding between brightness levels, so it feels intentional rather than jarring.

⸻

Alternate palette ideas (if you’d like to experiment)

Palette	Start	End	Vibe
Muted Midnight	#132847	#4D1F46	slightly smokier, less saturated
Complement Flip	#CE8A00	#008E8A	uses opposite hues on the wheel for a playful neon look

Feel free to swap stops or tweak lightness to taste, but the primary set above should drop straight into a dark theme and look great.