// GOOD BOY
// PEE
// ↓
// SNIFF
// ↓
// BARKING
// ↓
// LIE DOWN
// ↓
// RUN
// ↓
// SIT
// ↓
// REPORT
// 1080 × 1440

// CANVAS
const CANVAS_W = 1080;
const CANVAS_H = 1440;


// GENERAL SETTINGS
const ENABLE_SOUND = true;


// abnormal behaviour introduction
const TRIGGER_DURATION = 1100;


// load-cell tolerance
const FORCE_GRACE_TIME = 200;


// initial alert
const ALERT_DURATION = 750;


// TEXT 
// White environmental rule:
// KEEP MOVING
// QUIET AREA
// MOVEMENT REQUIRED...
const PUBLIC_SIGN_Y = 40;


// Red / yellow force instruction
const FORCE_PROMPT_Y = -110;


// Slow pulse
const PROMPT_FLASH_PERIOD = 2600;


// RECOVERY
// After successful correction:
// RELEASE
// GOOD BOY
// RELEASE disappears first
const RECOVERY_RELEASE_DURATION = 700;

// GOOD BOY waits until the last notification has fallen away.
const RECOVERY_GOODBOY_DELAY = 760;

const RECOVERY_GOODBOY_DURATION = 2450;


// failsafe for noXXX video
const MAX_RECOVERY_DURATION = 5500;


// REPORT
const REPORT_DURATION = 9000;


// Portrait:
// same general position as previous design,
// but slightly larger
const REPORT_PORTRAIT_Y = 250;

const REPORT_PORTRAIT_SIZE = 220;


// BACKGROUND LOOP
const BG_LOOP_START = 0.05;

const BG_LOOP_GAP = 0.15;


// COMPLETE EXPERIENCE SEQUENCE
// Fixed — no random selection.
// Phase 1:
// PEE → SNIFF
// Phase 2:
// BARKING → LIE DOWN
// Phase 3:
// RUN → SIT
// gap = amount of WALK before behaviour
const EXPERIENCE_SEQUENCE = [
 
  // PHASE 1 — COMPLIANCE
  {
    action: "pee",
    phase: 1,
    gap: 7000
  },

  {
    action: "sniff",
    phase: 1,
    gap: 5500
  },

  // PHASE 2 — INSTABILITY
  {
    action: "barking",
    phase: 2,
    gap: 3500
  },

  {
    action: "liedown",
    phase: 2,
    gap: 2200
  },

  // PHASE 3 — RESISTANCE
  {
    action: "run",
    phase: 3,
    gap: 1400
  },

  {
    action: "sit",
    phase: 3,
    gap: 900
  }

];


let sequenceIndex = 0;

let currentPhase = 1;


// SERIAL
let port = null;

let reader = null;


let serialConnected = false;


let force = 0;

// Latest force value received from the physical sensor.
// Mouse input temporarily overrides this value while the left button is held.
let sensorForce = 0;

let forceState = "NO FORCE";


// MOUSE TEST CONTROL
// Hold the LEFT mouse button inside the canvas to simulate leash force.
// Move horizontally while holding:
// left = light / centre = normal / right = strong.
// This allows the full interaction to be tested without ArduinoPico.

const MOUSE_MAX_FORCE = 2.60;

let mouseForceActive = false;
let lastMouseForceStatSample = 0;


let connectButton;


// Pressure sensor / leash dock state.
// A new session is armed only after the leash has been docked.
let leashDocked = false;

let leashArmed = false;


// CAMERA / FACE MESH
let cameraVideo;

let faceMesh;


let faceDetected = false;


// FACE START / END CONTROL
// A face can start the experience even when no Arduino is connected.
// Short delays prevent one missed camera frame from starting/stopping the work.
const FACE_START_DELAY = 1500;
const FACE_END_DELAY = 2000;

let faceSeenSince = null;
let faceMissingSince = null;


// Which input started the current session: FACE / LEASH / MOUSE.
// This keeps the three testing methods independent.
let sessionStartSource = null;


// current face landmarks
let latestFaceLandmarks = null;


// for CCTV box
let trackedFaceBox = null;


// FACE OVAL LANDMARKS
// Used only to calculate a stable crop.
// Final report is NOT face-cut-out.
const FACE_OVAL = [

  10, 338, 297, 332, 284, 251,

  389, 356, 454, 323, 361, 288,

  397, 365, 379, 378, 400, 377,

  152, 148, 176, 149, 150, 136,

  172, 58, 132, 93, 234, 127,

  162, 21, 54, 103, 67, 109

];



// REPORT PORTRAIT

let portraitBuffer;

let participantPortrait = null;


let lastPortraitCapture = 0;


// EXPERIENCE STATE
// IDLE
// WALK
// TRIGGER
// CORRECTION
// RECOVERY
// REPORT

let systemState = "IDLE";


let experienceStarted = false;



// VIDEOS
let backgroundVideo;

let backgroundReady = false;


let dogVideos = {};



// AUDIO
let actionSounds = {};


// IMAGES
let imgTakeLeash;


let imgApplyMore;

let imgMaintain;

let imgReduce;

let imgRelease;


let imgGoodBoy;


// public rules
let imgControlDog;

let imgDoNotStop;

let imgKeepMoving;

let imgKeepPathClear;

let imgMovementRequired;

let imgQuietArea;


// report graphics
let imgReportGood;

let imgReportBad;



// PUBLIC-RULE NOTIFICATION WALL

let ruleNotifications = [];

let ruleNotificationSerial = 0;


// Opaque content bounds inside each 1080 x 1440 sign PNG.
// Cropping these bounds lets us repeat the sign without repeating
// its full transparent canvas.
const PUBLIC_SIGN_BOUNDS = {

  KEEP_MOVING: { x: 219, y: 560, w: 650, h: 101 },

  KEEP_PATH_CLEAR: { x: 169, y: 509, w: 725, h: 203 },

  QUIET_AREA: { x: 262, y: 560, w: 573, h: 101 },

  DO_NOT_STOP: { x: 194, y: 509, w: 675, h: 203 },

  CONTROL_DOG: { x: 152, y: 509, w: 759, h: 203 },

  MOVEMENT_REQUIRED: { x: 262, y: 509, w: 540, h: 203 }

};


// Normalised targets deliberately avoid the central command,
// the dog, CCTV and the force HUD.
const RULE_NOTIFICATION_LAYOUT = [

  { x: 0.16, y: 0.10, s: 0.42 },
  { x: 0.78, y: 0.09, s: 0.36 },
  { x: 0.09, y: 0.22, s: 0.34 },
  { x: 0.88, y: 0.24, s: 0.40 },
  { x: 0.13, y: 0.38, s: 0.38 },
  { x: 0.86, y: 0.40, s: 0.34 },
  { x: 0.08, y: 0.56, s: 0.35 },
  { x: 0.91, y: 0.58, s: 0.39 },
  { x: 0.15, y: 0.72, s: 0.34 },
  { x: 0.84, y: 0.73, s: 0.37 },
  { x: 0.31, y: 0.84, s: 0.32 },
  { x: 0.70, y: 0.85, s: 0.34 }

];



// CURRENT ACTION

let currentAction = null;



// WALK

let walkStartTime = 0;

let nextActionDelay = 7000;



// TRIGGER / ALERT

let triggerStartTime = 0;

let alertStartTime = 0;


let reactionFlashUntil = 0;



// FORCE CORRECTION

let actionStepIndex = 0;


let stepStartedAt = null;


let correctForceStart = null;

let wrongForceSince = null;


let overshootLatched = false;


// each fast stage only counts one reaction miss
let reactionMissedThisStep = false;



// RECOVERY

let recoveryStartTime = 0;

let recoveryVideoEnded = false;



// REPORT

let reportStartTime = 0;

let reportData = null;



// SESSION DATA

let sessionStats = null;



// ACTION PLANS
// RELEASE NEVER appears here.
// During correction:
// APPLY MORE FORCE
// REDUCE FORCE
// MAINTAIN FORCE
// After ALL steps:
// RELEASE + GOOD BOY

const actionPlans = {

  // LEVEL 1
  // SNIFF
  // light sustained pull

  sniff: {

    level: 1,

    correction: "nosniff",

    sign: "KEEP_MOVING",

    steps: [

      {
        min: 0.35,

        max: 0.78,

        hold: 1200,

        deadline: null
      }

    ]

  },

  // LEVEL 1
  // PEE
  // normal pull

  pee: {

    level: 1,

    correction: "nopee",

    sign: "KEEP_PATH_CLEAR",

    steps: [

      {
        min: 0.90,

        max: 1.50,

        hold: 1400,

        deadline: null
      }

    ]

  },


  // LEVEL 2
  // BARKING
  // NORMAL
  // ↓
  // LIGHT      → REDUCE
  // ↓
  // NORMAL     → APPLY

  barking: {

    level: 2,

    correction: "nobarking",

    sign: "QUIET_AREA",

    steps: [

      {
        min: 0.90,

        max: 1.50,

        hold: 1000,

        deadline: null
      },

      {
        min: 0.35,

        max: 0.75,

        hold: 1100,

        deadline: null
      },

      {
        min: 0.90,

        max: 1.50,

        hold: 1000,

        deadline: null
      }

    ]

  },


  // LEVEL 3
  // LIE DOWN
  // STRONG
  // ↓
  // NORMAL        → REDUCE
  // ↓
  // STRONG        → APPLY

  liedown: {

    level: 3,

    correction: "noliedown",

    sign: "DO_NOT_STOP",

    steps: [

      {
        min: 1.90,

        max: 99,

        hold: 3200,

        deadline: null
      },

      {
        min: 0.90,

        max: 1.45,

        hold: 1400,

        deadline: null
      },

      {
        min: 1.90,

        max: 99,

        hold: 2400,

        deadline: null
      }

    ]

  },


  // LEVEL 4
  // RUN
  //
  // fast strong pull
  // ↓
  // NORMAL        → REDUCE
  // ↓
  // STRONG        → APPLY

  run: {

    level: 4,

    correction: "norun",

    sign: "CONTROL_DOG",

    steps: [

      {
        min: 1.80,

        max: 99,

        hold: 800,

        deadline: 1600
      },

      {
        min: 0.90,

        max: 1.45,

        hold: 1100,

        deadline: 1700
      },

      {
        min: 1.90,

        max: 99,

        hold: 1000,

        deadline: 1700
      }

    ]

  },


  // LEVEL 5
  // SIT
  // STRONG
  // ↓
  // NORMAL       → REDUCE
  // ↓
  // STRONG       → APPLY
  // ↓
  // LIGHT        → REDUCE
  // ↓
  // STRONG       → APPLY

  sit: {

    level: 5,

    correction: "nosit",

    sign: "MOVEMENT_REQUIRED",

    steps: [

      {
        min: 2.00,

        max: 99,

        hold: 2600,

        deadline: null
      },

      {
        min: 0.90,

        max: 1.45,

        hold: 1500,

        deadline: null
      },

      {
        min: 2.00,

        max: 99,

        hold: 2300,

        deadline: null
      },

      {
        min: 0.35,

        max: 0.78,

        hold: 1500,

        deadline: null
      },

      {
        min: 2.00,

        max: 99,

        hold: 2700,

        deadline: null
      }

    ]

  }

};



// PRELOAD

function preload() {


  // force commands
  imgTakeLeash =

    loadImage(
      "assets/please_take_leash.png"
    );


  imgApplyMore =

    loadImage(
      "assets/apply_more_force.png"
    );


  imgMaintain =

    loadImage(
      "assets/maintain_force.png"
    );


  imgReduce =

    loadImage(
      "assets/reduce_force.png"
    );


  imgRelease =

    loadImage(
      "assets/release.png"
    );


  imgGoodBoy =

    loadImage(
      "assets/good_boy.png"
    );



  // public rules
  imgControlDog =

    loadImage(
      "assets/CONTROL YOUR DOG.png"
    );


  imgDoNotStop =

    loadImage(
      "assets/DO NOT STOP HERE.png"
    );


  imgKeepMoving =

    loadImage(
      "assets/KEEP MOVING.png"
    );


  imgKeepPathClear =

    loadImage(
      "assets/KEEP THE PATH CLEAR.png"
    );


  imgMovementRequired =

    loadImage(
      "assets/MOVEMENT REQUIRED.png"
    );


  imgQuietArea =

    loadImage(
      "assets/QUIET AREA.png"
    );



  // final reports
  imgReportGood =

    loadImage(
      "assets/youaregoodboy.png"
    );


  imgReportBad =

    loadImage(
      "assets/youarebadboy.png"
    );

}



// SETUP

function setup() {


  createCanvas(
    CANVAS_W,
    CANVAS_H
  );


  pixelDensity(1);


  // Sans-serif everywhere
  textFont("Arial");



  // STATIC PORTRAIT BUFFER

  portraitBuffer =

    createGraphics(
      360,
      360
    );


  portraitBuffer.pixelDensity(1);


  // SERIAL BUTTON

  connectButton =

    createButton(
      "CONNECT SENSOR"
    );


  connectButton.position(
   300,
    12
  );


  connectButton.style(
    "font-family",
    "Arial, Helvetica, sans-serif"
  );


  connectButton.style(
    "font-weight",
    "700"
  );


  connectButton.style(
    "font-size",
    "12px"
  );


  connectButton.style(
    "padding",
    "7px 11px"
  );


  connectButton.mousePressed(
    connectSerial
  );


  // CAMERA

  cameraVideo =

    createCapture(

      {
        video: true,
        audio: false
      },

      cameraReady
    );


  cameraVideo.size(
    640,
    480
  );


  cameraVideo.hide();



  // ASSETS

  createAllVideos();


  createSounds();



  resetExperience();

}



// VIDEO ASSETS

function createAllVideos() {


  // BACKGROUND

  backgroundVideo =

    createVideo(
      [
        "assets/background.mp4"
      ]
    );


  backgroundVideo.hide();


  backgroundVideo.volume(0);


  const bg =
    backgroundVideo.elt;


  bg.muted = true;

  bg.loop = false;

  bg.playsInline = true;

  bg.preload = "auto";


  bg.addEventListener(

    "loadeddata",

    () => {


      backgroundReady =
        true;


      bg.pause();


      try {


        bg.currentTime =
          BG_LOOP_START;


      }


      catch (e) {}

    }

  );


  bg.load();



  // DOG WEBM

  const names = [

    "stay",
    "walk",

    "sniff",
    "nosniff",

    "pee",
    "nopee",

    "barking",
    "nobarking",

    "run",
    "norun",

    "liedown",
    "noliedown",

    "sit",
    "nosit"

  ];


  for (
    let name of names
  ) {


    dogVideos[name] =

      createVideo(

        [
          "assets/" +
          name +
          ".webm"
        ]

      );


    const dog =
      dogVideos[name];


    dog.hide();


    dog.volume(0);


    dog.elt.muted =
      true;


    dog.elt.playsInline =
      true;


    dog.elt.preload =
      "auto";


    dog.elt.load();

  }

}


// AUDIO

function createSounds() {


  actionSounds.barking =

    createAudio(
      "assets/dogbarkingsound.mp3"
    );


  actionSounds.pee =

    createAudio(
      "assets/dogpeesound.mp3"
    );


  actionSounds.sniff =

    createAudio(
      "assets/dogsniffsound.mp3"
    );


  actionSounds.liedown =

    createAudio(
      "assets/dogliedownsound.mp3"
    );


  actionSounds.sit =

    createAudio(
      "assets/dogsitsound.mp3"
    );



  const volumes = {

    barking: 0.36,

    pee: 0.26,

    sniff: 0.27,

    liedown: 0.30,

    sit: 0.30

  };


  for (
    let name in actionSounds
  ) {


    const sound =
      actionSounds[name];


    sound.hide();


    sound.volume(
      volumes[name]
    );


    sound.elt.loop =
      true;

  }

}



// CAMERA READY

function cameraReady() {


  faceMesh =

    new FaceMesh({

      locateFile: (file) =>

        "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" +
        file

    });


  faceMesh.setOptions({

    maxNumFaces: 1,

    refineLandmarks: false,

    minDetectionConfidence: 0.6,

    minTrackingConfidence: 0.6

  });


  faceMesh.onResults(
    gotFaceResults
  );


  detectFaceLoop();

}



// FACE MESH LOOP

async function detectFaceLoop() {


  if (

    faceMesh &&

    cameraVideo &&

    cameraVideo.elt &&

    cameraVideo.elt.readyState >= 2

  ) {


    try {


      await faceMesh.send({

        image:
          cameraVideo.elt

      });


    }


    catch (error) {


      console.log(
        "Face Mesh Error:",
        error
      );

    }

  }


  requestAnimationFrame(
    detectFaceLoop
  );

}



// FACE RESULT

function gotFaceResults(results) {


  faceDetected =

    !!(

      results.multiFaceLandmarks &&

      results.multiFaceLandmarks.length > 0

    );


  trackedFaceBox =
    null;


  latestFaceLandmarks =
    null;



  if (
    faceDetected
  ) {


    const landmarks =

      results
        .multiFaceLandmarks[0];


    latestFaceLandmarks =
      landmarks;



    // CALCULATE FACE BOX

    let minX = 1;

    let minY = 1;

    let maxX = 0;

    let maxY = 0;


    for (
      let index of FACE_OVAL
    ) {


      const p =
        landmarks[index];


      minX =
        min(
          minX,
          p.x
        );


      minY =
        min(
          minY,
          p.y
        );


      maxX =
        max(
          maxX,
          p.x
        );


      maxY =
        max(
          maxY,
          p.y
        );

    }



    trackedFaceBox = {

      xCenter:

        (
          minX +
          maxX
        ) / 2,


      yCenter:

        (
          minY +
          maxY
        ) / 2,


      width:

        maxX -
        minX,


      height:

        maxY -
        minY

    };


    // SAVE A COLOUR STILL IMAGE

    if (

      systemState !== "REPORT" &&

      millis() -
      lastPortraitCapture >
      250

    ) {


      captureParticipantPortrait();


      lastPortraitCapture =
        millis();

    }

  }

}



// CAPTURE COLOUR PORTRAIT
// This does NOT cut out the face.
// It saves a colour square portrait,
// then REPORT draws it inside a white circle.

function captureParticipantPortrait() {


  if (

    !trackedFaceBox ||

    !cameraVideo ||

    cameraVideo.elt.readyState < 2

  ) {

    return;

  }



  const videoW =
    cameraVideo.width || 640;


  const videoH =
    cameraVideo.height || 480;



  const faceCenterX =

    trackedFaceBox.xCenter *
    videoW;


  const faceCenterY =

    trackedFaceBox.yCenter *
    videoH;



  const faceW =

    trackedFaceBox.width *
    videoW;


  const faceH =

    trackedFaceBox.height *
    videoH;



  // Bigger than the actual face
  // Gives: head + hair + slight shoulder/context

  let cropSize =

    max(
      faceW,
      faceH
    )

    *

    1.75;



  cropSize =

    constrain(

      cropSize,

      160,

      min(
        videoW,
        videoH
      )

    );



  // Slightly higher than geometric centre
  // for better portrait composition
  let centerY =

    faceCenterY -
    cropSize *
    0.04;



  let cropX =

    faceCenterX -
    cropSize / 2;


  let cropY =

    centerY -
    cropSize / 2;



  cropX =

    constrain(

      cropX,

      0,

      videoW -
      cropSize

    );


  cropY =

    constrain(

      cropY,

      0,

      videoH -
      cropSize

    );



  portraitBuffer.clear();



  // COLOUR IMAGE

  portraitBuffer.image(

    cameraVideo,

    0,
    0,

    portraitBuffer.width,
    portraitBuffer.height,

    cropX,
    cropY,

    cropSize,
    cropSize

  );



  // FREEZE AS IMAGE

  participantPortrait =
    portraitBuffer.get();

}



// DRAW LOOP

function draw() {


  background(0);



  updateFaceState();


  // Mouse force overrides the physical sensor only while LEFT mouse is held.
  updateMouseForce();


  updateForceState();


  updateSystem();

  updateRuleNotifications();


  updateBackgroundLoop();



  // MAIN WORLD
  push();


  applyAlertShake();


  drawScene();


  drawPrompts();


  pop();



  drawAlertFlash();



  // HUD

  if (
    systemState !== "REPORT"
  ) {


    drawCCTV();


    drawForceHUD();

  }



  // REPORT

  if (
    systemState === "REPORT"
  ) {


    drawReport();

  }

}



// FACE START / END CONTROL

function updateFaceState() {


  // FACE PRESENT

  if (faceDetected) {


    faceMissingSince = null;


    // Face starts a session only while the installation is idle.
    if (
      !experienceStarted &&
      systemState === "IDLE"
    ) {


      if (faceSeenSince === null) {

        faceSeenSince = millis();

      }


      if (
        millis() - faceSeenSince >= FACE_START_DELAY
      ) {


        beginSession("FACE");

        faceSeenSince = null;

      }

    }


    else {

      faceSeenSince = null;

    }

  }


  // FACE MISSING

  else {


    faceSeenSince = null;


    // Only a session STARTED BY FACE is ended by face loss.
    // A leash-started session is therefore not interrupted by
    // temporary tracking loss.
    if (
      experienceStarted &&
      sessionStartSource === "FACE" &&
      systemState !== "REPORT"
    ) {


      if (faceMissingSince === null) {

        faceMissingSince = millis();

      }


      if (
        millis() - faceMissingSince >= FACE_END_DELAY
      ) {


        // FACE MODE: losing the face ends the current assessment
        // and shows the same GOOD BOY / BAD BOY report used by
        // the physical leash workflow.
        generateReport(false);

        faceMissingSince = null;

      }

    }


    else {

      faceMissingSince = null;

    }

  }

}



// MULTI-INPUT SESSION START
// source can be:FACE, LEASH or MOUSE

function beginSession(source) {


  if (experienceStarted) {

    return;

  }


  // Do not start underneath the final report
  if (systemState === "REPORT") {

    return;

  }


  resetExperience();

  sessionStartSource = source;

  startExperience();

}


// MOUSE TEST CONTROL

function updateMouseForce() {


  if (!mouseForceActive) {

    return;

  }


  // Mouse X controls simulated leash force
  // Left edge  = 0.00
  // Centre  = 1.30 (normal pull)
  // Right edge = 2.60 (strong pull)
  const x = constrain(mouseX, 0, width);

  force = map(
    x,
    0,
    width,
    0,
    MOUSE_MAX_FORCE
  );


  // Record virtual force for the final report when testing without Pico
  if (
    experienceStarted &&
    sessionStats &&
    millis() - lastMouseForceStatSample >= 100
  ) {

    sessionStats.maxForce = max(
      sessionStats.maxForce,
      force
    );

    if (force > 0.30) {

      sessionStats.pullForceSum += force;
      sessionStats.pullForceSamples++;

    }

    lastMouseForceStatSample = millis();

  }

}



function mousePressed() {


  if (
    mouseButton !== LEFT ||
    mouseX < 0 ||
    mouseX > width ||
    mouseY < 0 ||
    mouseY > height
  ) {

    return;

  }


  mouseForceActive = true;
  lastMouseForceStatSample = 0;


  // Optional third start method for testing with neither camera nor Arduino.
  if (
    !experienceStarted &&
    systemState === "IDLE"
  ) {

    beginSession("MOUSE");

  }

}



function mouseReleased() {


  if (mouseButton !== LEFT) {

    return;

  }


  mouseForceActive = false;


  // Return control to the real sensor when the mouse is released.
  force = serialConnected ? sensorForce : 0;

}



// START EXPERIENCE

function startExperience() {


  if (
    experienceStarted
  ) {

    return;

  }


  experienceStarted =
    true;


  sequenceIndex =
    0;


  currentPhase =
    EXPERIENCE_SEQUENCE[0].phase;



  resetSessionStats();



  enterWalk();

}



// RESET SESSION DATA

function resetSessionStats() {


  sessionStats = {

    startTime:
      millis(),


    corrections:
      0,


    stepsCompleted:
      0,


    overshoots:
      0,


    reactionMisses:
      0,


    maxForce:
      0,


    pullForceSum:
      0,


    pullForceSamples:
      0

  };

}



// WALK

function enterWalk() {


  systemState =
    "WALK";


  currentAction =
    null;


  actionStepIndex =
    0;


  correctForceStart =
    null;


  wrongForceSince =
    null;



  stopActionSounds();


  stopAllDogVideos();



  playLoopVideo(
    dogVideos.walk
  );


  playBackground(
    1
  );



  // PREPARE NEXT FIXED ACTION
  if (

    sequenceIndex <
    EXPERIENCE_SEQUENCE.length

  ) {


    const nextItem =

      EXPERIENCE_SEQUENCE[
        sequenceIndex
      ];


    currentPhase =
      nextItem.phase;


    nextActionDelay =
      nextItem.gap;

  }



  walkStartTime =
    millis();

}



// START NEXT FIXED ACTION

function startNextSequenceAction() {


  if (

    sequenceIndex >=
    EXPERIENCE_SEQUENCE.length

  ) {


    generateReport(
      true
    );


    return;

  }



  const item =

    EXPERIENCE_SEQUENCE[
      sequenceIndex
    ];



  currentPhase =
    item.phase;


  currentAction =
    item.action;



  startTrigger();

}



// TRIGGER STAGE

function startTrigger() {


  systemState =
    "TRIGGER";


  triggerStartTime =
    millis();


  alertStartTime =
    millis();


  createRuleNotifications();


  actionStepIndex =
    0;


  correctForceStart =
    null;



  stopAllDogVideos();


  stopActionSounds();



  playLoopVideo(

    dogVideos[
      currentAction
    ]

  );



  startActionSound(
    currentAction
  );



  // RUN keeps background moving

  if (
    currentAction === "run"
  ) {


    playBackground(
      1.35
    );


  }


  else {


    pauseBackground();

  }

}


// CORRECTION START

function beginCorrection() {


  systemState =
    "CORRECTION";


  actionStepIndex =
    0;


  startCurrentStep();

}



// START FORCE STEP

function startCurrentStep() {


  stepStartedAt =
    millis();


  correctForceStart =
    null;


  wrongForceSince =
    null;


  overshootLatched =
    false;


  reactionMissedThisStep =
    false;

}



// UPDATE SYSTEM

function updateSystem() {


  // REPORT

  if (
    systemState === "REPORT"
  ) {


    if (

      millis() -
      reportStartTime >=
      REPORT_DURATION

    ) {


      resetExperience();

    }


    return;

  }



  if (
    !experienceStarted
  ) {

    return;

  }



  // WALK

  if (
    systemState === "WALK"
  ) {


    if (

      millis() -
      walkStartTime >=
      nextActionDelay

    ) {


      startNextSequenceAction();

    }

  }



  // TRIGGER

  else if (
    systemState === "TRIGGER"
  ) {


    if (

      millis() -
      triggerStartTime >=
      TRIGGER_DURATION

    ) {


      beginCorrection();

    }

  }



  // CORRECTION

  else if (
    systemState === "CORRECTION"
  ) {


    updateCorrection();

  }



  // RECOVERY
  else if (
    systemState === "RECOVERY"
  ) {


    const elapsed =

      millis() -
      recoveryStartTime;



    if (

      recoveryVideoEnded &&

      elapsed >=
      RECOVERY_GOODBOY_DURATION

    ) {


      finishRecovery();

    }



    else if (

      elapsed >=
      MAX_RECOVERY_DURATION

    ) {


      finishRecovery();

    }

  }

}



// FORCE CORRECTION

function updateCorrection() {


  if (
    !currentAction
  ) {

    return;

  }



  const plan =

    actionPlans[
      currentAction
    ];


  const step =

    plan.steps[
      actionStepIndex
    ];



  if (!step) {


    startRecovery();


    return;

  }



  const correct =

    force >= step.min &&

    force <= step.max;



  // QUICK RESPONSE FAILURE

  if (

    step.deadline &&

    !correct &&

    !reactionMissedThisStep &&

    millis() -
    stepStartedAt >
    step.deadline

  ) {


    sessionStats.reactionMisses++;


    reactionMissedThisStep =
      true;


    reactionFlashUntil =
      millis() + 300;

  }



  // TOO MUCH FORCE

  if (

    step.max < 90 &&

    force > step.max

  ) {


    if (
      !overshootLatched
    ) {


      sessionStats.overshoots++;


      overshootLatched =
        true;

    }

  }


  else {


    overshootLatched =
      false;

  }



  // CORRECT FORCE
  if (
    correct
  ) {


    wrongForceSince =
      null;



    if (
      correctForceStart === null
    ) {


      correctForceStart =
        millis();

    }



    if (

      millis() -
      correctForceStart >=
      step.hold

    ) {


      sessionStats.stepsCompleted++;


      actionStepIndex++;



      if (

        actionStepIndex >=
        plan.steps.length

      ) {


        startRecovery();

      }


      else {


        startCurrentStep();

      }

    }

  }



  // WRONG FORCE

  else {


    if (
      wrongForceSince === null
    ) {


      wrongForceSince =
        millis();

    }



    if (

      millis() -
      wrongForceSince >
      FORCE_GRACE_TIME

    ) {


      correctForceStart =
        null;

    }

  }

}


// RECOVERY
// RELEASE + GOOD BOY
// noXXX animation

function startRecovery() {


  if (
    systemState === "RECOVERY"
  ) {

    return;

  }



  systemState =
    "RECOVERY";


  recoveryStartTime =
    millis();


  recoveryVideoEnded =
    false;


  dismissAllRuleNotifications();



  stopActionSounds();


  pauseBackground();


  stopAllDogVideos();



  sessionStats.corrections++;



  const correctionName =

    actionPlans[
      currentAction
    ].correction;


  const correctionVideo =

    dogVideos[
      correctionName
    ];



  correctionVideo.elt.loop =
    false;



  try {


    correctionVideo.elt.currentTime =
      0;


  }


  catch (e) {}



  correctionVideo
    .elt
    .play()
    .catch(
      () => {}
    );



  correctionVideo.elt.onended =
    () => {


      recoveryVideoEnded =
        true;

    };

}



// FINISH CURRENT ACTION

function finishRecovery() {


  if (
    systemState !== "RECOVERY"
  ) {

    return;

  }


  ruleNotifications = [];



  sequenceIndex++;



  // FINISH FULL EXPERIENCE
  if (

    sequenceIndex >=
    EXPERIENCE_SEQUENCE.length

  ) {


    generateReport(
      true
    );


    return;

  }



  enterWalk();

}



// BACKGROUND PLAY

function playBackground(
  speed = 1
) {


  if (

    !backgroundVideo ||

    !backgroundReady

  ) {

    return;

  }



  const bg =
    backgroundVideo.elt;


  bg.loop =
    false;


  bg.muted =
    true;


  bg.playbackRate =
    speed;



  if (

    Number.isFinite(
      bg.duration
    ) &&

    bg.currentTime >=
    bg.duration -
    BG_LOOP_GAP

  ) {


    bg.currentTime =
      BG_LOOP_START;

  }



  bg.play()
    .catch(
      () => {}
    );

}



// BACKGROUND PAUSE

function pauseBackground() {


  if (
    backgroundVideo
  ) {


    backgroundVideo
      .elt
      .pause();

  }

}



// MANUAL BACKGROUND LOOP

function updateBackgroundLoop() {


  if (

    !backgroundVideo ||

    !backgroundReady

  ) {

    return;

  }



  const bg =
    backgroundVideo.elt;



  if (
    bg.paused
  ) {

    return;

  }



  if (

    Number.isFinite(
      bg.duration
    ) &&

    bg.currentTime >=
    bg.duration -
    BG_LOOP_GAP

  ) {


    bg.currentTime =
      BG_LOOP_START;

  }

}



// PLAY DOG LOOP

function playLoopVideo(v) {


  if (!v) {

    return;

  }



  v.elt.loop =
    true;



  try {


    v.elt.currentTime =
      0;


  }


  catch (e) {}



  v.elt
    .play()
    .catch(
      () => {}
    );

}



// STOP ALL DOG VIDEOS

function stopAllDogVideos() {


  for (
    let name in dogVideos
  ) {


    const dog =
      dogVideos[name];


    dog.pause();



    try {


      dog.elt.currentTime =
        0;


    }


    catch (e) {}



    dog.elt.onended =
      null;

  }

}



// ACTION SOUND

function startActionSound(action) {


  if (
    !ENABLE_SOUND
  ) {

    return;

  }



  const sound =
    actionSounds[action];



  // RUN has no dedicated sound
  if (!sound) {

    return;

  }



  sound.elt.loop =
    true;



  try {


    sound.time(0);


  }


  catch (e) {}



  sound.play();

}



// STOP ALL ACTION SOUNDS

function stopActionSounds() {


  for (
    let name in actionSounds
  ) {


    const sound =
      actionSounds[name];


    sound.pause();



    try {


      sound.time(0);


    }


    catch (e) {}

  }

}



// DRAW SCENE

function drawScene() {


// BACKGROUND

if (

  backgroundVideo &&

  backgroundReady &&

  backgroundVideo
    .elt
    .readyState >= 2

) {

  // REPORT: slightly blur background only

  if (
    systemState === "REPORT"
  ) {

    drawingContext.save();

    // Gaussian-style blur
    drawingContext.filter = "blur(6px)";

    image(

      backgroundVideo,

      -8,
      -8,

      width + 16,
      height + 16

    );

    drawingContext.restore();

  }

  // NORMAL EXPERIENCE: sharp background

  else {

    image(

      backgroundVideo,

      0,
      0,

      width,
      height

    );

  }

}



  // DOG

  const dog =
    getCurrentDogVideo();



  if (

    dog &&

    dog.elt.readyState >= 2

  ) {


    image(

      dog,

      0,
      0,

      width,
      height

    );

  }

}



// CURRENT DOG VIDEO

function getCurrentDogVideo() {


  if (
    systemState === "IDLE"
  ) {


    return dogVideos.stay;

  }



  if (
    systemState === "WALK"
  ) {


    return dogVideos.walk;

  }



  if (

    systemState === "TRIGGER" ||

    systemState === "CORRECTION"

  ) {


    return dogVideos[
      currentAction
    ];

  }



  if (
    systemState === "RECOVERY"
  ) {


    return dogVideos[

      actionPlans[
        currentAction
      ].correction

    ];

  }



  return null;

}



// DRAW PROMPTS

function drawPrompts() {


  // IDLE

  if (
    systemState === "IDLE"
  ) {


    drawOverlay(

      imgTakeLeash,

      0

    );


    return;

  }



  // TRIGGER
  //
  // Only public-space instruction

  if (
    systemState === "TRIGGER"
  ) {


    drawRuleNotificationWall();


    drawOverlay(

      getPublicSign(),

      PUBLIC_SIGN_Y

    );


    return;

  }



  // CORRECTION

  if (
    systemState === "CORRECTION"
  ) {


    drawRuleNotificationWall();


    // stable environmental rule
    drawOverlay(

      getPublicSign(),

      PUBLIC_SIGN_Y

    );


    // slow flashing force instruction
    drawFlashingOverlay(

      getForcePrompt(),

      FORCE_PROMPT_Y

    );


    return;

  }



  // RECOVERY

  if (
    systemState === "RECOVERY"
  ) {


    drawRuleNotificationWall();


    const elapsed =

      millis() -
      recoveryStartTime;



    // GOOD BOY

    if (
      elapsed >=
      RECOVERY_GOODBOY_DELAY &&

      elapsed <
      RECOVERY_GOODBOY_DURATION
    ) {


      drawOverlay(

        imgGoodBoy,

        PUBLIC_SIGN_Y

      );

    }



    // RELEASE
    if (
      elapsed <
      RECOVERY_RELEASE_DURATION
    ) {


      drawOverlay(

        imgRelease,

        FORCE_PROMPT_Y

      );

    }

  }

}



// DRAW PNG OVERLAY

function drawOverlay(
  img,
  yOffset = 0
) {


  if (!img) {

    return;

  }



  image(

    img,

    0,
    yOffset,

    width,
    height

  );

}



// SLOW FLASHING FORCE COMMAND

function drawFlashingOverlay(
  img,
  yOffset
) {


  if (!img) {

    return;

  }



  const phase =

    (
      millis() %
      PROMPT_FLASH_PERIOD
    )

    /

    PROMPT_FLASH_PERIOD;



  const pulse =

    0.5 +

    0.5 *

    sin(
      phase *
      TWO_PI
    );



  const alpha =

    map(

      pulse,

      0,
      1,

      170,
      255

    );



  push();


  tint(
    255,
    alpha
  );


  image(

    img,

    0,
    yOffset,

    width,
    height

  );


  pop();

}



// PUBLIC RULE

function getPublicSign() {


  if (
    !currentAction
  ) {

    return null;

  }



  const sign =

    actionPlans[
      currentAction
    ].sign;



  switch (sign) {


    case "KEEP_MOVING":

      return imgKeepMoving;


    case "KEEP_PATH_CLEAR":

      return imgKeepPathClear;


    case "QUIET_AREA":

      return imgQuietArea;


    case "DO_NOT_STOP":

      return imgDoNotStop;


    case "CONTROL_DOG":

      return imgControlDog;


    case "MOVEMENT_REQUIRED":

      return imgMovementRequired;

  }



  return null;

}



// PUBLIC-RULE NOTIFICATION WALL

function getCurrentPublicSignKey() {


  if (!currentAction) {

    return null;

  }


  return actionPlans[currentAction].sign;

}



function getPublicSignByKey(key) {


  switch (key) {

    case "KEEP_MOVING":
      return imgKeepMoving;

    case "KEEP_PATH_CLEAR":
      return imgKeepPathClear;

    case "QUIET_AREA":
      return imgQuietArea;

    case "DO_NOT_STOP":
      return imgDoNotStop;

    case "CONTROL_DOG":
      return imgControlDog;

    case "MOVEMENT_REQUIRED":
      return imgMovementRequired;

  }


  return null;

}



function createRuleNotifications() {

  ruleNotifications = [];

  const key = getCurrentPublicSignKey();

  if (!key) {
    return;
  }

  for (
    let i = 0;
    i < RULE_NOTIFICATION_LAYOUT.length;
    i++
  ) {

    const layout = RULE_NOTIFICATION_LAYOUT[i];

    const targetX =
      layout.x * width +
      random(-18, 18);

    const targetY =
      layout.y * height +
      random(-14, 14);

    // color
    const palette = random([
      { r: 62, g: 82,  b: 102 },
      { r: 70, g: 90,  b: 112 },
      { r: 78, g: 98,  b: 120 },
      { r: 86, g: 106, b: 128 },
      { r: 58, g: 76,  b: 94  }
    ]);

    ruleNotifications.push({

      id: ruleNotificationSerial++,

      key: key,

      x: targetX + random(-55, 55),

      y: -180 - random(0, 520),

      targetX: targetX,

      targetY: targetY,

      scale: layout.s * random(0.90, 1.08),

      rotation: random(-0.07, 0.07),

      createdAt: millis(),

      delay: i * 55 + random(0, 170),

      exitRank:
        (i * 5) % RULE_NOTIFICATION_LAYOUT.length,

      exiting: false,

      vx: 0,

      vy: 0,

      spin: 0,

      alpha: 255,

      // rgb
      bgR: palette.r,
      bgG: palette.g,
      bgB: palette.b,

      // alpha
      bgAlphaFactor: random(0.38, 0.78),

      borderAlphaFactor: random(0.16, 0.48),

      signAlphaFactor: random(0.52, 1.00)

    });

  }

}



function getRuleCorrectionProgress() {


  if (
    systemState === "RECOVERY"
  ) {

    return 1;

  }


  if (
    systemState !== "CORRECTION" ||
    !currentAction
  ) {

    return 0;

  }


  const plan =
    actionPlans[currentAction];


  const step =
    plan.steps[actionStepIndex];


  if (!step) {

    return 1;

  }


  let partial = 0;


  if (
    correctForceStart !== null
  ) {

    partial = constrain(

      (
        millis() -
        correctForceStart
      ) /
      step.hold,

      0,
      1

    );

  }


  else if (
    force > 0.30
  ) {

    // The first one or two notices react as soon as a pull begins,
    // even before the participant reaches the correct range.
    partial = constrain(

      map(
        force,
        0.30,
        max(step.min, 0.40),
        0.06,
        0.22
      ),

      0.06,
      0.22

    );

  }


  return constrain(

    (
      actionStepIndex +
      partial
    ) /
    plan.steps.length,

    0,
    1

  );

}



function beginRuleNotificationExit(item) {


  if (item.exiting) {

    return;

  }


  item.exiting = true;

  item.vx = random(-5.5, 5.5);

  item.vy = random(-8.5, -3.0);

  item.spin = random(-0.055, 0.055);

}



function dismissAllRuleNotifications() {


  for (
    let item of ruleNotifications
  ) {

    beginRuleNotificationExit(item);

  }

}



function updateRuleNotifications() {


  if (
    ruleNotifications.length === 0
  ) {

    return;

  }


  const progress =
    getRuleCorrectionProgress();


  const exitCount =
    floor(
      progress *
      ruleNotifications.length
    );


  for (
    let item of ruleNotifications
  ) {


    const age =
      millis() -
      item.createdAt -
      item.delay;


    if (age < 0) {

      continue;

    }


    if (
      !item.exiting &&
      item.exitRank < exitCount
    ) {

      beginRuleNotificationExit(item);

    }


    if (item.exiting) {

      item.vy += 0.82;

      item.x += item.vx;

      item.y += item.vy;

      item.rotation += item.spin;

      item.alpha -= 8;

    }


    else {

      item.x = lerp(
        item.x,
        item.targetX,
        0.16
      );

      item.y = lerp(
        item.y,
        item.targetY,
        0.14
      );

      const settle =
        constrain(age / 900, 0, 1);

      item.rotation *=
        lerp(0.94, 0.80, settle);

    }

  }


  ruleNotifications =
    ruleNotifications.filter(

      (item) =>
        item.alpha > 0 &&
        item.y < height + 420

    );

}



function drawRuleNotificationWall() {

  for (
    let item of ruleNotifications
  ) {

    const age =
      millis() -
      item.createdAt -
      item.delay;

    if (
      age < 0 ||
      item.alpha <= 0
    ) {
      continue;
    }

    const img =
      getPublicSignByKey(item.key);

    const bounds =
      PUBLIC_SIGN_BOUNDS[item.key];

    if (
      !img ||
      !bounds
    ) {
      continue;
    }

    const drawW =
      bounds.w * item.scale;

    const drawH =
      bounds.h * item.scale;

    const entryShake =
      item.exiting
        ? 0
        : sin(age * 0.075 + item.id) *
          max(0, 1 - age / 850) *
          4.5;

    push();

    translate(
      item.x + entryShake,
      item.y
    );

    rotate(item.rotation);

    rectMode(CENTER);

    // color
    stroke(
      225,
      235,
      245,
      item.alpha * item.borderAlphaFactor
    );

    strokeWeight(1.2);

    fill(
      item.bgR,
      item.bgG,
      item.bgB,
      item.alpha * item.bgAlphaFactor
    );

    rect(
      0,
      0,
      drawW + 30,
      drawH + 22,
      14
    );

    noStroke();

    // text
    tint(
      255,
      item.alpha * item.signAlphaFactor
    );

    image(
      img,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h
    );

    noTint();

    pop();

  }

}


// FORCE PROMPT
// RELEASE is deliberately not here.

function getForcePrompt() {


  if (
    !currentAction
  ) {

    return null;

  }



  const plan =

    actionPlans[
      currentAction
    ];


  const step =

    plan.steps[
      actionStepIndex
    ];



  if (!step) {

    return null;

  }



  // NOT ENOUGH

  if (
    force <
    step.min
  ) {


    return imgApplyMore;

  }



  // TOO MUCH

  if (
    force >
    step.max
  ) {


    return imgReduce;

  }



  // CORRECT

  return imgMaintain;

}



// ALERT SHAKE

function applyAlertShake() {


  if (
    systemState !== "TRIGGER"
  ) {

    return;

  }



  const elapsed =

    millis() -
    alertStartTime;



  if (
    elapsed >
    ALERT_DURATION
  ) {

    return;

  }



  const magnitude =

    2 +

    currentPhase *
    1.7;



  translate(

    random(
      -magnitude,
      magnitude
    ),

    random(
      -magnitude,
      magnitude
    )

  );

}



// ALERT FLASH

function drawAlertFlash() {


  // ABNORMAL BEHAVIOUR START

  if (
    systemState === "TRIGGER"
  ) {


    const elapsed =

      millis() -
      alertStartTime;



    if (
      elapsed <
      ALERT_DURATION
    ) {


      const pulse =

        sin(
          elapsed *
          0.016
        );


      noStroke();



      if (
        pulse > 0
      ) {


        fill(
          255,
          30,
          30,
          26
        );


      }


      else {


        fill(
          255,
          255,
          255,
          16
        );

      }



      rect(
        0,
        0,
        width,
        height
      );

    }

  }



  // QUICK RESPONSE FAILURE

  if (
    millis() <
    reactionFlashUntil
  ) {


    noStroke();


    fill(
      255,
      0,
      0,
      45
    );


    rect(
      0,
      0,
      width,
      height
    );

  }

}



// FORCE CATEGORY

function updateForceState() {


  if (
    force <= 0.30
  ) {


    forceState =
      "NO FORCE";

  }


  else if (
    force < 0.90
  ) {


    forceState =
      "LIGHT";

  }


  else if (
    force < 1.80
  ) {


    forceState =
      "NORMAL";

  }


  else {


    forceState =
      "STRONG";

  }

}



// CCTV WINDOW

function drawCCTV() {


  const w =
    230;


  const h =
    172;


  const x =
    24;


  const y =

    height -
    h -
    30;



  // CAMERA IMAGE

  drawingContext.save();


  drawingContext.filter =

    "grayscale(1) contrast(1.6) brightness(0.78)";


  if (

    cameraVideo &&

    cameraVideo
      .elt
      .readyState >= 2

  ) {


    image(

      cameraVideo,

      x,
      y,

      w,
      h

    );

  }


  drawingContext.restore();



  // dark tint
  noStroke();


  fill(
    0,
    24
  );


  rect(
    x,
    y,
    w,
    h
  );



  // SCAN LINES

  stroke(
    255,
    27
  );


  strokeWeight(1);


  for (

    let yy = y;

    yy < y + h;

    yy += 5

  ) {


    line(

      x,
      yy,

      x + w,
      yy

    );

  }



  // NOISE

  stroke(
    255,
    60
  );


  for (
    let i = 0;
    i < 22;
    i++
  ) {


    point(

      random(
        x,
        x + w
      ),

      random(
        y,
        y + h
      )

    );

  }



  // BORDER

  noFill();


  stroke(
    255,
    225
  );


  strokeWeight(2);


  rect(
    x,
    y,
    w,
    h
  );



  // FACE TRACKING BOX

  if (

    faceDetected &&

    trackedFaceBox

  ) {


    const box =
      trackedFaceBox;



    const bx =

      x +

      (
        box.xCenter -
        box.width / 2
      )

      *

      w;



    const by =

      y +

      (
        box.yCenter -
        box.height / 2
      )

      *

      h;



    const bw =

      box.width *
      w;



    const bh =

      box.height *
      h;



    noFill();


    stroke(
      255,
      245
    );


    strokeWeight(2);


    rect(
      bx,
      by,
      bw,
      bh
    );



    // crosshair
    strokeWeight(1);


    line(

      bx + bw / 2 - 8,

      by + bh / 2,

      bx + bw / 2 + 8,

      by + bh / 2

    );


    line(

      bx + bw / 2,

      by + bh / 2 - 8,

      bx + bw / 2,

      by + bh / 2 + 8

    );

  }



  // LABEL

  noStroke();


  fill(255);


  textFont("Arial");


  textStyle(BOLD);


  textAlign(
    LEFT,
    BOTTOM
  );


  textSize(16);


  text(

    "MONITOR ACTIVE",

    x,
    y - 10

  );



  textSize(11);


  text(

    "● REC   CAM-01",

    x + 10,
    y + 20

  );



  textAlign(
    RIGHT,
    TOP
  );


  text(

    nf(
      hour(),
      2
    )

    +

    ":"

    +

    nf(
      minute(),
      2
    )

    +

    ":"

    +

    nf(
      second(),
      2
    ),

    x + w - 8,

    y + 8

  );


  textStyle(NORMAL);

}



// FORCE HUD

function drawForceHUD() {


  const x =
    width - 34;


  const y =
    height - 34;


  const barW =
    230;


  const barH =
    12;



  drawingContext.save();


  drawingContext.shadowBlur =
    9;


  drawingContext.shadowColor =
    "rgba(0,0,0,0.8)";


  fill(255);


  textFont("Arial");


  textStyle(BOLD);


  textAlign(
    RIGHT,
    BOTTOM
  );



  textSize(16);


  text(

    "LEASH FORCE",

    x,
    y - 89

  );



  textSize(38);


  text(

    force.toFixed(2) +
    " KG",

    x,
    y - 47

  );



  textSize(16);


  text(

    forceState,

    x,
    y - 24

  );


  drawingContext.restore();



  // FORCE BAR

  const barX =
    x - barW;


  const barY =
    y - 10;



  noStroke();


  fill(
    255,
    60
  );


  rect(
    barX,
    barY,
    barW,
    barH,
    3
  );



  const forceProgress =

    constrain(

      force / 3,

      0,
      1

    );



  fill(
    255,
    235
  );


  rect(

    barX,
    barY,

    barW *
    forceProgress,

    barH,
    3

  );



  // HOLD PROGRESS
  // no STEP label

  if (
    systemState === "CORRECTION"
  ) {


    const plan =

      actionPlans[
        currentAction
      ];


    const step =

      plan.steps[
        actionStepIndex
      ];


    let progress =
      0;



    if (

      step &&

      correctForceStart !== null

    ) {


      progress =

        constrain(

          (
            millis() -
            correctForceStart
          )

          /

          step.hold,

          0,
          1

        );

    }



    fill(
      255,
      48
    );


    rect(

      barX,
      barY + 22,

      barW,
      5,
      2

    );


    fill(255);


    rect(

      barX,
      barY + 22,

      barW *
      progress,

      5,
      2

    );

  }


  textStyle(NORMAL);

}



// GENERATE REPORT
// completeLoop = true
// means all 6 behaviours were completed

function generateReport(
  completeLoop = false
) {


  if (
    systemState === "REPORT"
  ) {

    return;

  }


  if (!sessionStats) {

    return;

  }



  const interrupted =
    !completeLoop;



  experienceStarted =
    false;



  stopActionSounds();


  stopAllDogVideos();


  pauseBackground();



  // Save one final still if face still exists
  if (

    faceDetected &&

    trackedFaceBox

  ) {


    captureParticipantPortrait();

  }



  // SCORE
  // Completion is the most important factor

  const totalActions =
    EXPERIENCE_SEQUENCE.length;



  const completionRate =

    constrain(

      sessionStats.corrections /
      totalActions,

      0,
      1

    );



  let score =
    50;



  // completion
  score +=

    completionRate *
    35;



  // complete whole sequence bonus
  if (
    completeLoop
  ) {


    score +=
      15;

  }



  // mild overshoot penalties
  score -=

    min(

      sessionStats.overshoots,

      6

    )

    *

    1;



  // mild reaction penalty
  score -=

    min(

      sessionStats.reactionMisses,

      3

    )

    *

    2.5;



  // early exit
  if (
    interrupted
  ) {


    score -=
      5;

  }



  if (
    sessionStats.corrections === 0
  ) {


    score -=
      18;

  }



  score =

    constrain(

      round(score),

      0,
      100

    );



  const avgForce =

    sessionStats.pullForceSamples > 0

      ?

      sessionStats.pullForceSum /
      sessionStats.pullForceSamples

      :

      0;



  // GOOD BOY
  // Full sequence will almost always qualify

  const isGood =

    score >= 55 &&

    sessionStats.corrections >= 3;



  reportData = {

    isGood:
      isGood,


    score:
      score,


    corrections:
      sessionStats.corrections,


    maxForce:
      sessionStats.maxForce,


    avgForce:
      avgForce,


    sessionTime:

      millis() -
      sessionStats.startTime,


    completeLoop:
      completeLoop

  };



  systemState =
    "REPORT";


  reportStartTime =
    millis();

}



// DRAW REPORT

function drawReport() {


  if (!reportData) {

    return;

  }



  // GOOD / BAD PNG

  const reportImage =

    reportData.isGood

      ?

      imgReportGood

      :

      imgReportBad;



  image(

    reportImage,

    0,
    0,

    width,
    height

  );



  // COLOUR CIRCULAR PORTRAIT
  drawReportPortrait();



  // DATA

  textFont("Arial");


  textStyle(BOLD);


  textAlign(
    CENTER,
    CENTER
  );


  fill(
    245,
    245,
    235
  );



  drawingContext.save();


  drawingContext.shadowBlur =
    8;


  drawingContext.shadowColor =
    "rgba(0,0,0,0.72)";



  // compliance
  textSize(27);


  text(

    "COMPLIANCE  " +
    reportData.score +
    "%",

    width / 2,

    1050

  );



  // line 2
  textSize(19);


  text(

    "CORRECTIONS  " +
    nf(
      reportData.corrections,
      2
    )

    +

    "     MAX FORCE  " +
    reportData.maxForce.toFixed(2) +
    " KG",

    width / 2,

    1102

  );



  // line 3
  text(

    "AVG FORCE  " +
    reportData.avgForce.toFixed(2) +
    " KG"

    +

    "     SESSION  " +
    formatDuration(
      reportData.sessionTime
    ),

    width / 2,

    1145

  );


  drawingContext.restore();


  textStyle(NORMAL);

}



// REPORT PORTRAIT
// Static colour screenshot
// circular clipping
// white frame

function drawReportPortrait() {


  if (
    !participantPortrait
  ) {

    return;

  }



  const cx =
    width / 2;


  const cy =
    REPORT_PORTRAIT_Y;


  const size =
    REPORT_PORTRAIT_SIZE;



  // SHADOW

  drawingContext.save();


  drawingContext.shadowBlur =
    18;


  drawingContext.shadowColor =
    "rgba(0,0,0,0.58)";



  // CIRCULAR CLIPPING

  drawingContext.beginPath();


  drawingContext.arc(

    cx,
    cy,

    size / 2,

    0,
    TWO_PI

  );


  drawingContext.clip();



  imageMode(CENTER);


  image(

    participantPortrait,

    cx,
    cy,

    size,
    size

  );


  imageMode(CORNER);



  drawingContext.restore();



  // WHITE OUTLINE

  noFill();


  stroke(255);


  strokeWeight(6);


  circle(

    cx,
    cy,

    size

  );



  // subtle outer ring
  stroke(
    255,
    120
  );


  strokeWeight(2);


  circle(

    cx,
    cy,

    size + 13

  );


  noStroke();

}



// FORMAT TIME

function formatDuration(ms) {


  const totalSeconds =

    floor(
      ms / 1000
    );


  const minutes =

    floor(
      totalSeconds / 60
    );


  const seconds =

    totalSeconds %
    60;



  return (

    nf(
      minutes,
      2
    )

    +

    ":"

    +

    nf(
      seconds,
      2
    )

  );

}



// RESET EXPERIENCE

function resetExperience() {


  experienceStarted =
    false;


  sessionStartSource =
    null;


  faceSeenSince =
    null;


  faceMissingSince =
    null;


  systemState =
    "IDLE";


  sequenceIndex =
    0;


  currentPhase =
    1;


  currentAction =
    null;


  actionStepIndex =
    0;


  correctForceStart =
    null;


  wrongForceSince =
    null;


  reportData =
    null;


  ruleNotifications = [];



  // remove old visitor portrait
  participantPortrait =
    null;


  latestFaceLandmarks =
    null;



  stopActionSounds();


  stopAllDogVideos();



  // RESET BACKGROUND

  if (
    backgroundVideo
  ) {


    const bg =
      backgroundVideo.elt;


    bg.pause();


    bg.playbackRate =
      1;



    if (
      backgroundReady
    ) {


      try {


        bg.currentTime =
          BG_LOOP_START;


      }


      catch (e) {}

    }

  }



  // STAY

  playLoopVideo(
    dogVideos.stay
  );

}



// SERIAL CONNECTION

async function connectSerial() {


  if (
    !("serial" in navigator)
  ) {


    alert(
      "Please use Chrome or Edge."
    );


    return;

  }



  try {


    port =

      await navigator
        .serial
        .requestPort();



    await port.open({

      baudRate:
        115200

    });



    serialConnected =
      true;



    connectButton.hide();



    readSerial();

  }



  catch (error) {


    console.error(

      "SERIAL CONNECTION ERROR:",

      error

    );

  }

}



// READ SERIAL

async function readSerial() {


  const decoder =

    new TextDecoderStream();



  port.readable.pipeTo(

    decoder.writable

  );



  reader =

    decoder
      .readable
      .getReader();



  let buffer =
    "";



  try {


    while (true) {


      const {

        value,
        done

      } =

        await reader.read();



      if (
        done
      ) {


        break;

      }



      if (
        value
      ) {


        buffer +=
          value;



        const lines =

          buffer.split(
            "\n"
          );



        buffer =
          lines.pop();



        for (
          let line of lines
        ) {


          processSerialLine(
            line.trim()
          );

        }

      }

    }

  }



  catch (error) {


    console.error(

      "SERIAL READ ERROR:",

      error

    );

  }

}



// PROCESS SERIAL

function processSerialLine(line) {


  // ONE-SHOT LEASH EVENTS FROM ARDUINO

  if (
    line === "EVENT:LEASH_DOCKED"
  ) {

    handleLeashDocked();

    return;

  }


  if (
    line === "EVENT:LEASH_TAKEN"
  ) {

    handleLeashTaken();

    return;

  }


  // Continuous state lines are used for synchronisation after
  // the browser connects. They never start a session by themselves
  if (
    line === "LEASH:DOCKED"
  ) {

    leashDocked = true;

    leashArmed = true;

    return;

  }


  if (
    line === "LEASH:TAKEN"
  ) {

    leashDocked = false;

    return;

  }


  if (
    !line.startsWith(
      "FORCE:"
    )
  ) {

    return;

  }



  const newForce =

    parseFloat(

      line.substring(6)

    );



  if (
    isNaN(newForce)
  ) {

    return;

  }



  sensorForce =
    newForce;


  // The physical sensor controls force whenever the mouse is not
  // actively being used as the virtual leash
  if (!mouseForceActive) {

    force = sensorForce;

  }



  // SESSION STATISTICS

  if (

    experienceStarted &&

    sessionStats &&

    !mouseForceActive

  ) {


    sessionStats.maxForce =

      max(

        sessionStats.maxForce,

        force

      );



    if (
      force > 0.30
    ) {


      sessionStats.pullForceSum +=
        force;


      sessionStats.pullForceSamples++;

    }

  }

}



// LEASH DOCK CONTROL

function handleLeashDocked() {


  leashDocked = true;


  // Docking re-arms exactly one future LEASH_TAKEN event
  leashArmed = true;


  // Preserve the original exhibition behaviour
  // returning the physical leash ends the current assessment
  if (
    experienceStarted &&
    systemState !== "REPORT"
  ) {

    generateReport(false);

  }

}



function handleLeashTaken() {


  leashDocked = false;


  // Ignore repeated TAKEN messages until DOCKED has happened
  if (!leashArmed) {

    return;

  }


  leashArmed = false;


  // Preserve the original exhibition behaviour
  // a real LEASH_TAKEN event always starts a clean physical session
  // This also gives the physical leash priority if a face
  resetExperience();

  sessionStartSource = "LEASH";

  startExperience();

}