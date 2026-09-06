#include "HX711.h"

// GOOD BOY
// Raspberry Pi Pico
// HX711 Load Cell + Leash Dock Pressure Sensor
// HX711 PINS

const int HX711_DOUT = 2;
const int HX711_SCK  = 3;

// PRESSURE SENSOR

// GP26 / ADC0
const int PRESSURE_PIN = 26;


// HX711

HX711 scale;


// Tested
const float CALIBRATION_FACTOR = 205000.0;


// HX711 star
long zeroValue = 0;


// Tension filtering
float filteredForce = 0;


// PRESSURE SENSOR SETTINGS

// No pressure:  0–30
// With pressure:  180–246
// tow-hysteresis


// low take
const int LEASH_TAKEN_THRESHOLD = 60;


// high dock
const int LEASH_DOCKED_THRESHOLD = 60;


// interval
const unsigned long TAKEN_CONFIRM_TIME = 400;


// interval
const unsigned long DOCKED_CONFIRM_TIME = 500;


// LEASH STATE

bool leashDocked = true;


// State change begins
unsigned long leashChangeStart = 0;


// Is it awaiting confirmation
bool waitingForStateChange = false;


// OUTPUT TIMER

unsigned long lastOutputTime = 0;


// Output once every 100 ms
const unsigned long OUTPUT_INTERVAL = 100;



// SETUP

void setup() {

  Serial.begin(115200);


  delay(2000);


  Serial.println("GOOD BOY SENSOR SYSTEM");
  Serial.println("----------------------");


  // HX711

  scale.begin(
    HX711_DOUT,
    HX711_SCK
  );


  Serial.println("HX711 starting...");


  // WAIT FOR HX711

  if (
    !scale.wait_ready_timeout(3000)
  ) {

    Serial.println("ERROR: HX711 NOT FOUND");

  }

  else {

    Serial.println("HX711 READY");


    // TARE
    // do not pull the dog leash when starting

    Serial.println("TARING... DO NOT PULL");


    zeroValue =
      scale.read_average(20);


    Serial.print("ZERO:");
    Serial.println(zeroValue);


    Serial.println("TARE COMPLETE");

  }


  // PRESSURE SENSOR

  pinMode(
    PRESSURE_PIN,
    INPUT
  );


  delay(300);


  int initialPressure =
    readPressure();


  // INITIAL LEASH STATE

  if (
    initialPressure >= LEASH_DOCKED_THRESHOLD
  ) {

    leashDocked = true;

  }

  else {

    leashDocked = false;

  }


  Serial.print("INITIAL PRESSURE:");
  Serial.println(initialPressure);


  Serial.print("INITIAL LEASH:");

  if (
    leashDocked
  ) {

    Serial.println("DOCKED");

  }

  else {

    Serial.println("TAKEN");

  }


  Serial.println("----------------------");
}



// LOOP

void loop() {


  // READ LOAD CELL

  float kg =
    readForceKG();


  // READ PRESSURE SENSOR
  int pressure =
    readPressure();


  // UPDATE LEASH STATE

  updateLeashState(
    pressure
  );


  // SERIAL OUTPUT

  if (

    millis() -
    lastOutputTime >=
    OUTPUT_INTERVAL

  ) {

    lastOutputTime =
      millis();


    // IMPORTANT
    // FORCE:0.74

    Serial.print("FORCE:");

    Serial.println(
      kg,
      2
    );


    // Pressure sensor

    Serial.print("PRESSURE:");

    Serial.println(
      pressure
    );


    // Dog leash status

    Serial.print("LEASH:");

    if (
      leashDocked
    ) {

      Serial.println("DOCKED");

    }

    else {

      Serial.println("TAKEN");

    }

  }


  delay(5);
}



// READ LOAD CELL

float readForceKG() {


  // HX711 NOT READY

  if (
    !scale.wait_ready_timeout(50)
  ) {

    return 0;

  }


  // READ RAW

  long raw =

    scale.read_average(3);


  long forceRaw =

    raw -
    zeroValue;


  // SMOOTHING
  // 75% previous
  // 25% new

  filteredForce =

    filteredForce *
    0.75

    +

    forceRaw *
    0.25;


  // DEAD ZONE
  // Stablize

  if (
    abs(filteredForce) < 3000
  ) {

    filteredForce = 0;

  }


  // CONVERT TO KG

  float kg =

    filteredForce /
    CALIBRATION_FACTOR;


  // NO NEGATIVE FORCE

  if (
    kg < 0
  ) {

    kg = 0;

  }


  return kg;
}



// READ PRESSURE SENSOR
// Average several readings
// helps reduce ADC noise

int readPressure() {


  long total = 0;


  const int samples = 8;


  for (
    int i = 0;
    i < samples;
    i++
  ) {

    total +=

      analogRead(
        PRESSURE_PIN
      );


    delayMicroseconds(300);
  }


  return

    total /
    samples;
}



// LEASH STATE MACHINE

void updateLeashState(
  int pressure
) {


  // CURRENTLY DOCKED
  // Waiting for user to take leash

  if (
    leashDocked
  ) {


    // Pressure becomes low

    if (
      pressure <
      LEASH_TAKEN_THRESHOLD
    ) {


      if (
        !waitingForStateChange
      ) {

        waitingForStateChange =
          true;


        leashChangeStart =
          millis();

      }


      // Low pressure stayed for 400ms

      if (

        millis() -
        leashChangeStart >=
        TAKEN_CONFIRM_TIME

      ) {


        leashDocked =
          false;


        waitingForStateChange =
          false;


        // immediate event message
        Serial.println(
          "EVENT:LEASH_TAKEN"
        );

      }

    }


    // Pressure returned
    // cancel timer

    else {


      waitingForStateChange =
        false;

    }

  }



  // CURRENTLY TAKEN
  // Waiting for leash to be returned

  else {


    // Pressure becomes high

    if (
      pressure >
      LEASH_DOCKED_THRESHOLD
    ) {


      if (
        !waitingForStateChange
      ) {


        waitingForStateChange =
          true;


        leashChangeStart =
          millis();

      }


      // High pressure stayed for 500ms

      if (

        millis() -
        leashChangeStart >=
        DOCKED_CONFIRM_TIME

      ) {


        leashDocked =
          true;


        waitingForStateChange =
          false;


        Serial.println(
          "EVENT:LEASH_DOCKED"
        );

      }

    }


    // Pressure dropped again
    // cancel timer

    else {


      waitingForStateChange =
        false;

    }

  }

}