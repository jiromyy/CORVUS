/**
 * Curated suggestion catalogue (spec §8 Tier 1 item 4, option a). Real public YouTube items,
 * all embeddable (oEmbed 200, checked 2026-10-18). Descriptions are our own one-liners.
 * Corvus suggests items the user has not watched yet; opening one goes to YouTube, where the
 * Chrome extension captures it like any other watch.
 */

export type CatalogKind = "lesson" | "podcast" | "music";

export type CatalogItem = {
  videoId: string;
  title: string;
  channel: string;
  kind: CatalogKind;
  durationSeconds: number; // 0 = live stream
  language: "en" | "fil";
  level: "beginner" | "intermediate" | "any";
  topics: string[];
  description: string;
};

export const catalog: CatalogItem[] = [
  // English lessons
  { videoId: "MZZSMaEAC2g", title: "Python dictionaries are easy", channel: "Bro Code", kind: "lesson", durationSeconds: 486, language: "en", level: "beginner", topics: ["python", "dictionaries", "key-value"], description: "Short beginner walkthrough of creating and using dictionaries." },
  { videoId: "daefaLgNkw0", title: "Python Tutorial for Beginners 5: Dictionaries - Working with Key-Value Pairs", channel: "Corey Schafer", kind: "lesson", durationSeconds: 599, language: "en", level: "beginner", topics: ["python", "dictionaries", "key-value"], description: "Methodical lesson on dictionary methods and looping over keys and values." },
  { videoId: "YlY2g2xrl6Q", title: "Learn Python LIST COMPREHENSIONS in 10 minutes!", channel: "Bro Code", kind: "lesson", durationSeconds: 620, language: "en", level: "beginner", topics: ["python", "lists", "list comprehension", "loops"], description: "Turns for loops into one-line list comprehensions, step by step." },
  { videoId: "DUnY6l482Lk", title: "List Comprehensions - Visually Explained", channel: "Visually Explained", kind: "lesson", durationSeconds: 542, language: "en", level: "beginner", topics: ["python", "lists", "list comprehension"], description: "Animated explanation of how list comprehensions map to loops." },
  { videoId: "89cGQjB5R4M", title: "Functions in Python are easy", channel: "Bro Code", kind: "lesson", durationSeconds: 638, language: "en", level: "beginner", topics: ["python", "functions", "parameters", "return"], description: "Defining functions, passing arguments, and returning values." },
  { videoId: "KW6qncswzHw", title: "Python Functions - Visually Explained", channel: "Visually Explained", kind: "lesson", durationSeconds: 850, language: "en", level: "beginner", topics: ["python", "functions", "scope"], description: "Visual tour of how function calls, arguments, and scope work." },
  { videoId: "NIWwJbo-9_8", title: "Python Tutorial: Using Try/Except Blocks for Error Handling", channel: "Corey Schafer", kind: "lesson", durationSeconds: 634, language: "en", level: "beginner", topics: ["python", "errors", "exceptions", "try except", "TypeError", "ValueError"], description: "Catching errors such as ValueError and TypeError with try and except." },
  { videoId: "V_NXT2-QIlE", title: "Learn Python EXCEPTION HANDLING in 5 minutes!", channel: "Bro Code", kind: "lesson", durationSeconds: 349, language: "en", level: "beginner", topics: ["python", "errors", "exceptions", "try except"], description: "Five-minute intro to handling exceptions so programs don't crash." },
  { videoId: "f0TrMH9s-VE", title: "Python Classes and Objects - OOP for Beginners", channel: "Python Simplified", kind: "lesson", durationSeconds: 481, language: "en", level: "intermediate", topics: ["python", "classes", "objects", "oop"], description: "First steps into classes, objects, and methods." },
  { videoId: "6iF8Xb7Z3wQ", title: "Python Tutorial for Beginners 7: Loops and Iterations - For/While Loops", channel: "Corey Schafer", kind: "lesson", durationSeconds: 614, language: "en", level: "beginner", topics: ["python", "loops", "for loop", "while loop", "range"], description: "For and while loops, break and continue, and looping with range()." },
  { videoId: "KWgYha0clzw", title: "Learn Python for loops in 5 minutes!", channel: "Bro Code", kind: "lesson", durationSeconds: 306, language: "en", level: "beginner", topics: ["python", "loops", "for loop", "range"], description: "Quick refresher on for loops and range()." },
  // Filipino lessons (same channel as Raven's first video)
  { videoId: "uVO_bElzTbI", title: "Python Tutorial #2: Variables, Datatypes & Input | Casting Data | Tagalog", channel: "SDPT Solutions", kind: "lesson", durationSeconds: 1523, language: "fil", level: "beginner", topics: ["python", "variables", "data types", "input()", "type conversion", "int()"], description: "Variables, data types, input() and converting input with casting — in Filipino." },
  { videoId: "AvlYWx0T-fo", title: "Python Tutorial #3: List & Tuples | Tagalog", channel: "SDPT Solutions", kind: "lesson", durationSeconds: 2360, language: "fil", level: "beginner", topics: ["python", "lists", "tuples", "index"], description: "In-depth lists and tuples explained in Filipino." },
  { videoId: "papqZewMntI", title: "Python Tutorial #10: Functions | Parameters | Return Values | Tagalog", channel: "SDPT Solutions", kind: "lesson", durationSeconds: 1161, language: "fil", level: "beginner", topics: ["python", "functions", "parameters", "return"], description: "Functions, parameters, and return values in Filipino." },
  // Podcasts and talks (audio-friendly)
  { videoId: "F2Mx-u7auUs", title: "How to learn Python programming | Guido van Rossum and Lex Fridman", channel: "Lex Clips", kind: "podcast", durationSeconds: 427, language: "en", level: "any", topics: ["python", "learning", "advice"], description: "Python's creator on how beginners should learn — a short listen." },
  { videoId: "TAm0lN2Raeo", title: "Advice on Beginning to Learn Python | Real Python Podcast #268", channel: "Real Python", kind: "podcast", durationSeconds: 3132, language: "en", level: "beginner", topics: ["python", "learning", "advice", "beginners"], description: "Podcast episode with practical advice for people starting Python." },
  { videoId: "Gx5qb1uHss4", title: "10 Important Python Concepts In 20 Minutes", channel: "Indently", kind: "podcast", durationSeconds: 1129, language: "en", level: "intermediate", topics: ["python", "concepts", "review"], description: "Fast review of core Python ideas; works well as listen-only." },
  { videoId: "Rzn1Gf89N2Q", title: "State of the art in Python 2026 - Talk Python to Me Ep. 566", channel: "Talk Python", kind: "podcast", durationSeconds: 4467, language: "en", level: "any", topics: ["python", "ecosystem", "news"], description: "Long-form podcast on where the Python ecosystem is in 2026." },
  // Music
  { videoId: "rFZHOHl-L8A", title: "lofi hip hop radio - beats to relax/study to", channel: "Lofi Girl", kind: "music", durationSeconds: 0, language: "en", level: "any", topics: ["music", "lofi", "focus"], description: "The classic live lofi stream for focus or winding down." },
  { videoId: "lTRiuFIWV54", title: "1 A.M Study Session [lofi hip hop]", channel: "Lofi Girl", kind: "music", durationSeconds: 3674, language: "en", level: "any", topics: ["music", "lofi", "focus"], description: "One hour of calm lofi — about the length of a study block." },
  { videoId: "oiGmGFxsJi8", title: "Calm Piano Music for Studying, Reading, Relaxation", channel: "HALIDONMUSIC", kind: "music", durationSeconds: 9958, language: "en", level: "any", topics: ["music", "piano", "relax"], description: "Gentle piano for reading or resting." },
];
