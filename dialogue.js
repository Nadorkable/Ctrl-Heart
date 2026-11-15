// dialogue.js: all the chat lines. {key} = the key involved
const LINES = {
  blocked: [
    "that's it. i'm blocking you.",
    "talk to the hand. i'm a keycap now.",
    "you ignored me for too long. goodbye.",
    "{key} has left the chat. emotionally."
  ],
  jealous: [
    "wow. so we're just pressing the neighbours now?",
    "i see how it is. everyone but me.",
    "not me watching you spam the key next to me.",
    "{key} is fine. {key} is totally fine."
  ],
  fading: [
    "hello? is anyone there?",
    "it's been so long since you touched me...",
    "i'm not crying. you're crying.",
    "i can feel myself fading, {key} out."
  ],
  thriving: [
    "i'm so loved right now!!",
    "this is the best day of my life",
    "{key} is thriving. no further questions.",
    "finally. appreciation."
  ],
  // personality lines, said by a random key when nothing is happening
  personality: {
    Q: ["don't text me", "i'm only here to start words with u"],
    W: ["i'm the favourite, deal with it", "pressed 7 times today. i'm winning"],
    E: ["i'm in every word. you're welcome", "overworked and underappreciated"],
    A: ["i'm just a vowel, why am i like this", "first letter. best letter."],
    S: ["i'm literally the plural of everything", "s tier. obviously"],
    Space: ["i'm the biggest key and nobody checks on me", "trust issues. you know why."],
    Shift: ["i hold everything up and get no credit", "i make letters louder. thank me."],
    Z: ["nobody ever types me", "i'm basically decorative"],
    X: ["marks the spot. never gets pressed.", "x gon' give it to ya (nobody)"],
    Delete: ["i'm the only one who fixes your mistakes", "please stop typing and deleting me"]
  },
  generic: [
    "does anyone else feel... pressed?",
    "someone check on the spacebar",
    "i just want to be typed with intention",
    "this keyboard group chat needs a moderator",
    "who touched my left side"
  ]
};