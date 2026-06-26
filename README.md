# 🎵 Audio-Reactive Visualizer

A real-time 3D audio visualizer built with **Three.js**. A neon wireframe sphere
spins, glows, and **pulses to live microphone input** — your voice, claps, or any
music playing in the room drives its size in real time.

**▶️ Live demo:** https://audio-reactive-visualizer-six.vercel.app/

> Click **"start the mic"** and allow microphone access, then play some music.
> (Microphone access requires HTTPS — the live link above is served over HTTPS.)

<!-- Drop your recorded clip here for instant portfolio impact:
     1. Record a 15s GIF/MP4 of the sphere reacting to music
     2. Save it in this repo (e.g. /preview.gif)
     3. Uncomment the line below -->
<!-- ![demo](preview.gif) -->

---

## ✨ Features

- **Live audio reactivity** — the Web Audio API reads microphone volume each frame
  and scales the sphere to match the sound.
- **Neon bloom glow** — post-processing (`UnrealBloomPass`) turns the wireframe into
  glowing light tubes for a synthwave look.
- **Cyan → magenta gradient** — per-vertex coloring blends smoothly across the sphere.
- **Particle starfield** — a drifting cloud of points adds depth and atmosphere.
- **Graceful fallback** — gently pulses on its own (a sine-wave "fake beat") until the
  mic is granted, so it's never static on load.
- **Responsive** — adapts to any window size.

## 🛠️ Tech Stack

| Tool | Role |
|------|------|
| [Three.js](https://threejs.org/) | 3D rendering (WebGL) |
| Web Audio API | Live microphone analysis |
| `EffectComposer` + `UnrealBloomPass` | Post-processing glow |
| [Vite](https://vitejs.dev/) | Dev server + build tooling |
| Vercel | Hosting (HTTPS) |

## 🚀 Run it locally

```bash
git clone https://github.com/tike-1453/audio-reactive-visualizer.git
cd audio-reactive-visualizer
npm install
npm run dev
```

Then open the printed `localhost` URL and click **start the mic**.

## 🧠 How it works

1. **Render loop** — Three.js redraws ~60×/second via `requestAnimationFrame`.
2. **Audio analysis** — on click, the browser opens the mic; an `AnalyserNode` reads
   the loudness of each frame.
3. **Drive the size** — the average loudness (normalized to `0–1`) sets the sphere's
   scale, so louder sound = bigger sphere.
4. **Post-processing** — the frame is rendered, then run through a bloom pass for the
   glow before hitting the screen.

---

Built as a portfolio piece — one small step at a time.
