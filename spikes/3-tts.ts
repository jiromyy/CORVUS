/**
 * Spike 3: can Gemini TTS voice a short recap in English and the second language?
 *   npm run spike:tts
 * Writes WAV files to spikes/out/ so you can listen to them.
 */
import { GoogleGenAI } from "@google/genai";
import { fail, pass, requireEnv, timed, writeOut } from "./_shared";

const SPIKE = "tts";
const env = requireEnv("GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION", "GEMINI_TTS_MODEL");

const samples = [
  { name: "tts-en.wav", text: "Here's your two-minute recap. This week you explored quantum error correction, starting with a lecture that compared it to a choir staying in tune." },
  // Default L2 is Japanese; replace with the team's chosen language.
  { name: "tts-l2.wav", text: process.env.SPIKE_L2_SENTENCE || "今週は量子誤り訂正について学びました。講義では合唱団の例えが使われました。" },
];

/** Wraps raw 16-bit PCM in a WAV header. Gemini TTS returns audio/L16 PCM. */
function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function main() {
  const ai = new GoogleGenAI({
    enterprise: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
  });
  const files: string[] = [];
  for (const sample of samples) {
    const res = await timed(sample.name, () =>
      ai.models.generateContent({
        model: env.GEMINI_TTS_MODEL,
        contents: [{ role: "user", parts: [{ text: `Read this warmly, like a short podcast intro: ${sample.text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
        },
      }),
    );
    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error(`No audio returned for ${sample.name}`);
    const mime = part.inlineData.mimeType ?? "";
    const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
    const pcm = Buffer.from(part.inlineData.data, "base64");
    const seconds = pcm.length / (rate * 2);
    const file = writeOut(sample.name, mime.includes("wav") ? pcm : pcmToWav(pcm, rate));
    console.log(`  ${sample.name}: ${mime}, ${seconds.toFixed(1)} s → ${file}`);
    files.push(file);
  }
  pass(SPIKE, `wrote ${files.length} files. Listen to both before marking this done.`);
}

main().catch((e) => fail(SPIKE, e, "Check GEMINI_TTS_MODEL is a TTS model available in this location."));
