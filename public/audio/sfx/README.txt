Sound effects (short clips, decoded into memory, low-latency, overlapping).

Drop files here with EXACTLY these names. Use .mp3 (plays in every browser).
.ogg is tried only as a second choice, so an .ogg-only file works in Chrome/Firefox but
NOT in Safari/iOS. Missing files are fine: the game logs one warning and stays silent.

  lidar.mp3    LIDAR pulse fired (only when a pulse really starts)
  bump.mp3     Player hits a cave wall (throttled; ignores slow grazing contact)
  torch.mp3    Torch pickup (light grows)
  anti.mp3     Anti pickup (light shrinks)
  sentry.mp3   Sentry pickup
  switch.mp3   Switch pressed (opens the exit gate)
  exit.mp3     Reached the exit

Volumes and throttle times: src/config/AudioConfig.ts
Press ` in game to see audio status (which SFX failed to load).
