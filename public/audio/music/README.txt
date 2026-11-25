Background music (streamed, loops). Files of 1-10 MB are fine: they stream, they are not
decoded into memory, and they are not fetched until the first tap / click / key press.

Drop the track here with EXACTLY this name. Use .mp3 (plays in every browser).
.ogg is tried only as a second choice, so an .ogg-only file works in Chrome/Firefox but
NOT in Safari/iOS. A missing file is fine: the game logs one warning and stays silent.

  main.mp3     Looping background track

For a seamless loop, encode a loop-friendly file (MP3 adds a little silent padding at the
start/end; .ogg loops more cleanly if you only care about Chrome/Firefox).

Volume and level-transition ducking: src/config/AudioConfig.ts
M mutes/unmutes (saved across refreshes).
