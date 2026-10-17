/**
 * Maya's sample history for the demo workspace (spec §17): two weeks of learning Python.
 * Videos are real public YouTube videos (embeddable, checked 2026-10-17).
 * Articles are original text written for this prototype.
 * Times are Asia/Manila (+08:00).
 */

export const DEMO_WORKSPACE = "demo-maya";

export type SeedVideo = { videoId: string; title: string; creator: string; durationSeconds: number; language: string };

export const videos: SeedVideo[] = [
  { videoId: "UBZs0-gUZsU", title: "Python Tutorial #1: IDE & Hello World | Installing Python & Pycharm | print() | Tagalog", creator: "SDPT Solutions", durationSeconds: 817, language: "fil" },
  { videoId: "Js05B8Z1ivE", title: "Python Tutorial for Beginners - Learn the basics in 20 Min", creator: "Tech With Tim", durationSeconds: 1179, language: "en" },
  { videoId: "M-iZsW281CE", title: "Learn Python Basics in Just 20 Minutes!", creator: "Kenji Explains", durationSeconds: 1298, language: "en" },
  { videoId: "Ro_MScTDfU4", title: "Learn Python in Only 30 Minutes (Beginner Tutorial)", creator: "Indently", durationSeconds: 1842, language: "en" },
];

export type SeedArticle = {
  id: string;
  title: string;
  creator: string;
  language: string;
  summary: string;
  topics: string[];
  chunks: Array<{ heading?: string; text: string }>;
};

export const articles: SeedArticle[] = [
  {
    id: "web_input-returns-a-string",
    title: "Why input() Always Gives You a String (and How to Fix the TypeError)",
    creator: "Corvus sample article",
    language: "en",
    summary: "Explains why Python's input() returns text, why adding it to a number raises a TypeError, and how int() and float() convert it.",
    topics: ["python", "input()", "TypeError", "type conversion", "int()", "float()"],
    chunks: [
      {
        heading: "The surprise",
        text: "You ask the user for their age with age = input(\"Age: \"), type 20, and then try age + 1. Instead of 21, Python stops with: TypeError: can only concatenate str (not \"int\") to str. Nothing is wrong with your maths. The problem is what input() hands back.",
      },
      {
        heading: "input() always returns text",
        text: "Whatever the user types arrives as a string, even if it looks like a number. \"20\" in quotes is two characters, not the number twenty. The + operator joins strings together, so Python refuses to join the text \"20\" with the number 1. You can check this yourself with print(type(age)), which prints <class 'str'>.",
      },
      {
        heading: "Converting with int() and float()",
        text: "Wrap the input in a conversion function before doing maths: age = int(input(\"Age: \")). Use int() for whole numbers and float() for decimals such as prices or tip percentages: bill = float(input(\"Bill: \")). After converting, age + 1 gives 21 as expected.",
      },
      {
        heading: "When conversion fails",
        text: "If the user types something that is not a number, such as twenty, int() raises a ValueError. Beginners can ignore this at first; later you can catch it with try and except and ask again. The rule to remember: input() gives text, so convert before you calculate.",
      },
    ],
  },
  {
    id: "web_listahan-at-loop",
    title: "Listahan at Loop sa Python: Gabay para sa Baguhan",
    creator: "Corvus sample article",
    language: "fil",
    summary: "Ipinapaliwanag kung paano gumawa ng list sa Python, paano kunin ang laman nito gamit ang index na nagsisimula sa 0, at paano ito daanan gamit ang for loop at range().",
    topics: ["python", "list", "for loop", "range()", "index"],
    chunks: [
      {
        heading: "Ano ang list?",
        text: "Ang list ay lalagyan ng maraming value sa iisang variable. Gumagamit tayo ng square brackets: groceries = [\"bigas\", \"itlog\", \"gatas\"]. Puwedeng magkakaiba ang uri ng laman, pero kadalasan ay magkakapareho.",
      },
      {
        heading: "Index na nagsisimula sa zero",
        text: "Ang unang item ay nasa index 0, hindi 1. Kaya ang groceries[0] ay \"bigas\" at ang groceries[2] ay \"gatas\". Kapag ginamit mo ang groceries[3], magkakaroon ng IndexError dahil tatlo lang ang laman. Para malaman ang bilang ng item, gamitin ang len(groceries).",
      },
      {
        heading: "Pagdagdag gamit ang append()",
        text: "Para magdagdag sa dulo ng list, gamitin ang groceries.append(\"tinapay\"). Pagkatapos nito, apat na ang laman at ang len(groceries) ay magbabalik ng 4.",
      },
      {
        heading: "Pagdaan sa list gamit ang for loop",
        text: "Sa halip na isulat ang print nang paulit-ulit, gamitin ang for item in groceries: print(item). Kung gusto mong umulit ng tiyak na bilang, gamitin ang range(): for i in range(5) ay tatakbo nang limang beses, mula 0 hanggang 4. Tandaan na kailangan ng indentation ang laman ng loop.",
      },
    ],
  },
];

type SeedEvent =
  | { kind: "watched"; videoId: string; at: string }
  | { kind: "rewatched_span"; videoId: string; at: string; start: number; end: number }
  | { kind: "searched"; query: string; language: string; at: string }
  | { kind: "read"; articleId: string; at: string };

/** Chronological sample history. */
export const events: SeedEvent[] = [
  { kind: "searched", query: "paano mag install ng python", language: "fil", at: "2026-10-04T19:10:00+08:00" },
  { kind: "watched", videoId: "UBZs0-gUZsU", at: "2026-10-04T19:20:00+08:00" },
  { kind: "searched", query: "python print hello world", language: "en", at: "2026-10-05T20:05:00+08:00" },
  { kind: "watched", videoId: "Js05B8Z1ivE", at: "2026-10-07T21:00:00+08:00" },
  { kind: "searched", query: "python input returns string", language: "en", at: "2026-10-08T07:40:00+08:00" },
  { kind: "searched", query: "python TypeError can only concatenate str", language: "en", at: "2026-10-08T07:45:00+08:00" },
  { kind: "read", articleId: "web_input-returns-a-string", at: "2026-10-08T07:50:00+08:00" },
  { kind: "rewatched_span", videoId: "Js05B8Z1ivE", at: "2026-10-08T21:15:00+08:00", start: 591, end: 663 },
  { kind: "watched", videoId: "M-iZsW281CE", at: "2026-10-10T20:30:00+08:00" },
  { kind: "searched", query: "python TypeError can only concatenate str", language: "en", at: "2026-10-11T08:05:00+08:00" },
  { kind: "searched", query: "paano gumawa ng list sa python", language: "fil", at: "2026-10-12T07:35:00+08:00" },
  { kind: "read", articleId: "web_listahan-at-loop", at: "2026-10-12T07:42:00+08:00" },
  { kind: "searched", query: "python for loop range", language: "en", at: "2026-10-13T20:10:00+08:00" },
  { kind: "watched", videoId: "Ro_MScTDfU4", at: "2026-10-14T21:00:00+08:00" },
  { kind: "searched", query: "python TypeError can only concatenate str", language: "en", at: "2026-10-15T22:20:00+08:00" },
  { kind: "rewatched_span", videoId: "Js05B8Z1ivE", at: "2026-10-15T22:30:00+08:00", start: 591, end: 663 },
];
