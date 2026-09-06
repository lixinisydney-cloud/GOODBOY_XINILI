# GOOD BOY
**XINI LI**  
MA Computational Arts  
Goldsmiths, University of London  
2026

## Project Overview
GOOD BOY is an interactive installation exploring how systems shape bodily behaviour through space.

Participants appear to train a virtual dog, but the installation simultaneously observes, measures and evaluates the participant. The final system combines a physical dog leash, force sensing, browser-based interaction, CCTV-style face tracking and Blender-rendered animation.

## Main Technologies
- p5.js
- Web Serial API
- Raspberry Pi Pico
- Load Cell + HX711 amplifier
- Pressure sensor / leash dock sensor
- MediaPipe Face Mesh
- Blender animation and video assets
- HTML / JavaScript / CSS

## Three Start / Test Methods
The current testing version supports **three input methods at the same time**.

### 1. Physical leash / pressure sensor
When the Pico sends:
```text
EVENT:LEASH_TAKEN
```
the experience starts.

When the Pico sends:
```text
EVENT:LEASH_DOCKED
```
the current assessment ends and the final report is shown. A real `LEASH_TAKEN` event always starts a fresh physical-leash session, so the original exhibition interaction keeps priority over fallback face/mouse testing.

### 2. Face detection
MediaPipe Face Mesh can also start the work without Arduino/Pico.

- Face visible for approximately **1.5 seconds** → start
- Face missing for approximately **2 seconds** → end the assessment and show the **GOOD BOY / BAD BOY report**

Face loss only ends a session that was started by face detection, so it does not interrupt a physical leash session. The report remains visible for the normal report duration before the system returns to IDLE.

### 3. Mouse test mode
The whole interaction can also be tested with a mouse.

- Click/hold the **left mouse button inside the canvas** to start a mouse-test session if the work is idle.
- Keep holding the left button to simulate leash force.
- Move the mouse horizontally while holding:

```text
LEFT SIDE       = light force
CENTRE          = normal force
RIGHT SIDE      = strong force
```

The exact simulated value is shown by the existing **LEASH FORCE** HUD.

Releasing the mouse returns the force to 0 when no physical sensor is connected. If a Pico is connected, control returns to the real sensor value.

This makes it possible to test the complete force-based interaction without Arduino hardware.


### Input priority / compatibility
The three methods coexist in the same sketch:
- **Physical leash** keeps the original exhibition behaviour and has priority when real `LEASH_TAKEN` / `LEASH_DOCKED` events arrive.
- **Face detection** is a hardware-free fallback start/end method.
- **Mouse input** can simulate force during either a face-started or mouse-started session, and can also start a test session from IDLE.

This means the same build can be used both for the final hardware installation and for testing on a laptop without Arduino/Pico.

## Interaction Flow
```text
IDLE
  ↓
WALK
  ↓
TRIGGER
  ↓
CORRECTION
  ↓
RECOVERY
  ↓
REPORT
```

Final behaviour sequence:
```text
PEE
↓
SNIFF
↓
BARKING
↓
LIE DOWN
↓
RUN
↓
SIT
↓
FINAL REPORT
```

During correction, the participant responds to instructions such as:
- APPLY MORE FORCE
- REDUCE FORCE
- MAINTAIN FORCE
- RELEASE

## Force Ranges
The interaction uses several approximate force bands:
```text
NO FORCE    0.00–0.30
LIGHT       approximately 0.35–0.78
NORMAL      approximately 0.90–1.50
STRONG      approximately 1.80+
```

With mouse test mode, move horizontally while holding the left mouse button until the HUD enters the required range, then keep the mouse held there for the required duration.

## Project Structure
```text
GOODBOY_XINILI/
│
├── README.md
├── index.html
├── sketch.js
├── style.css
├── p5.js
├── p5.sound.min.js
│
└── assets/
    ├── background video
    ├── dog animation videos
    ├── interface graphics
    ├── report graphics
    └── audio files
```

### `index.html`
Loads p5.js, MediaPipe Face Mesh and the main sketch.

### `sketch.js`
Contains the main interaction system, including:

- media loading
- Web Serial communication
- leash taken / docked events
- face detection and CCTV tracking
- mouse testing input
- interaction state machine
- force correction logic
- visual prompts
- session statistics
- GOOD BOY / BAD BOY report
- experience reset

### `style.css`
Controls browser and canvas layout.

### `assets/`
Contains Blender-rendered dog animations, background videos, interface images and sound assets.

## Running the Project
1. Open the project through a local web server, for example **VS Code Live Server**.
2. Use **Google Chrome** or **Microsoft Edge**.
3. Allow camera access if you want to use face detection / CCTV.
4. If using the physical installation, connect the Raspberry Pi Pico by USB.
5. Click **CONNECT SENSOR** and select the Pico serial port.
6. Start using either the physical leash, face detection or mouse test mode.

Do not rely on opening `index.html` directly through `file://`, because browser camera and Web Serial behaviour may be restricted.

## Serial Data Format
The browser recognises serial messages including:
```text
FORCE:1.23
EVENT:LEASH_TAKEN
EVENT:LEASH_DOCKED
LEASH:TAKEN
LEASH:DOCKED
```

`FORCE` provides continuous physical pulling-force data.

`EVENT:LEASH_TAKEN` and `EVENT:LEASH_DOCKED` are one-shot interaction events.

The continuous `LEASH:TAKEN` / `LEASH:DOCKED` lines are used for state synchronisation.

## Author
XINI LI  
MA Computational Arts  
Goldsmiths, University of London
