# OTM-emulator

## Project Goal

Provide an isolated development backend for Overtime Management.

## Emulated Services (Change port in firebase.json if needed)
- Auth (9099)
- Firestore (7000)
- Cloud Functions (5001)
- PubSub ()
- Emulator UI (4000, Immutable)


## Available Scripts

In the project directory, you can run:

### `firebase emulators:export {DIR NAME}`
Exports the current emulator data to {DIR NAME}

### `firebase emulators:start --import {DIR NAME}`

Starts firebase emulator with the data specified by {DIR NAME}



