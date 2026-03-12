import {mkdirSync, copyFileSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import process from "node:process";

const root = process.cwd();
const publicDir = path.join(root, "public", "remotion");
const tmpDir = path.join(root, ".tmp", "remotion");
const artifactsDemoDir = path.join(root, "artifacts", "demo");
const docsDemoDir = path.join(root, "docs", "demo");

mkdirSync(publicDir, {recursive: true});
mkdirSync(tmpDir, {recursive: true});
mkdirSync(artifactsDemoDir, {recursive: true});
mkdirSync(docsDemoDir, {recursive: true});

const copyPairs = [
  ["artifacts/screenshots/reliefsignal-board.jpg", "reliefsignal-board.jpg"],
  ["artifacts/screenshots/reliefsignal-full.jpg", "reliefsignal-full.jpg"],
  ["artifacts/screenshots/reliefsignal-hero.jpg", "reliefsignal-hero.jpg"],
  ["artifacts/screenshots/reliefsignal-thumbnail.jpg", "reliefsignal-thumbnail.jpg"],
  ["app/icon.svg", "reliefsignal-icon.svg"],
];

for (const [from, to] of copyPairs) {
  copyFileSync(path.join(root, from), path.join(publicDir, to));
}

const narrationTxt = path.join(root, "remotion", "narration.txt");
const narrationAiff = path.join(tmpDir, "narration.aiff");
const narrationSourceMp3 = path.join(tmpDir, "narration-source.mp3");
const narrationMp3 = path.join(publicDir, "narration.mp3");
const renderedVideo = path.join(tmpDir, "rendered-video.mp4");
const outputVideo = path.join(artifactsDemoDir, "reliefsignal-demo.mp4");
const docsVideo = path.join(docsDemoDir, "reliefsignal-demo.mp4");
const narrationText = readFileSync(narrationTxt, "utf8").trim();
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || "";
const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || "";

const assertBinary = (name) => {
  const result = spawnSync("which", [name], {encoding: "utf8"});
  if (result.status !== 0) {
    throw new Error(`Required binary not found in PATH: ${name}`);
  }
};

assertBinary("say");
assertBinary("ffmpeg");
assertBinary("ffprobe");

const probeDurationSeconds = (filePath) => {
  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      filePath,
    ],
    {encoding: "utf8"},
  );
  if (probe.status !== 0) {
    throw new Error(`Failed to measure media duration for ${filePath}.`);
  }
  const duration = Number(probe.stdout.trim());
  if (!Number.isFinite(duration)) {
    throw new Error(`Invalid media duration for ${filePath}.`);
  }
  return duration;
};

const maxNarrationSeconds = 149.5;
const transcodeNarration = (inputPath) => {
  const narrationSourceDurationSeconds = probeDurationSeconds(inputPath);
  const narrationTempo =
    narrationSourceDurationSeconds > maxNarrationSeconds
      ? narrationSourceDurationSeconds / maxNarrationSeconds
      : 1;

  const ffmpegResult = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputPath,
      ...(narrationTempo > 1 ? ["-filter:a", `atempo=${narrationTempo.toFixed(4)}`] : []),
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "2",
      narrationMp3,
    ],
    {stdio: "inherit"},
  );
  if (ffmpegResult.status !== 0) {
    throw new Error("Failed to normalize narration audio.");
  }

  return {
    narrationSourceDurationSeconds,
    narrationTempo,
  };
};

let narrationProvider = "say";
let narrationSourcePath = narrationAiff;

if (elevenLabsApiKey || elevenLabsVoiceId) {
  if (!elevenLabsApiKey || !elevenLabsVoiceId) {
    throw new Error("Both ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required.");
  }
  narrationProvider = "elevenlabs";
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": elevenLabsApiKey,
    },
    body: JSON.stringify({
      text: narrationText,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed with ${response.status}: ${await response.text()}`);
  }
  writeFileSync(narrationSourceMp3, Buffer.from(await response.arrayBuffer()));
  narrationSourcePath = narrationSourceMp3;
} else {
  const sayResult = spawnSync(
    "say",
    ["-v", "Samantha", "-r", "172", "-f", narrationTxt, "-o", narrationAiff],
    {stdio: "inherit"},
  );
  if (sayResult.status !== 0) {
    throw new Error("Failed to generate narration audio with `say`.");
  }
}

const {narrationSourceDurationSeconds, narrationTempo} = transcodeNarration(narrationSourcePath);

const narrationDurationSeconds = probeDurationSeconds(narrationMp3);
if (narrationDurationSeconds > 150) {
  throw new Error(
    `Narration is too long for the 150-second composition (${narrationDurationSeconds.toFixed(2)}s).`,
  );
}

const renderResult = spawnSync(
  "npx",
  [
    "remotion",
    "render",
    "remotion/index.ts",
    "ReliefSignalDemo",
    renderedVideo,
    "--codec=h264",
    "--audio-codec=aac",
    "--crf=18",
  ],
  {stdio: "inherit"},
);
if (renderResult.status !== 0) {
  throw new Error("Remotion render failed.");
}

const sanitizeResult = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    renderedVideo,
    "-map_metadata",
    "-1",
    "-metadata",
    "comment=",
    "-metadata",
    "encoder=",
    "-movflags",
    "+faststart",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    outputVideo,
  ],
  {stdio: "inherit"},
);
if (sanitizeResult.status !== 0) {
  throw new Error("Failed to sanitize final demo video metadata.");
}

copyFileSync(outputVideo, docsVideo);

const ffprobe = spawnSync(
  "ffmpeg",
  ["-i", outputVideo, "-f", "null", "-"],
  {encoding: "utf8"},
);

const narrationPreview = readFileSync(narrationTxt, "utf8")
  .split("\n")
  .filter(Boolean)
  .slice(0, 2)
  .join(" ");

console.log(
  JSON.stringify(
    {
      ok: true,
      outputVideo,
      docsVideo,
      narrationMp3,
      narrationProvider,
      elevenLabsVoiceId: elevenLabsVoiceId || null,
      narrationSourceDurationSeconds,
      narrationDurationSeconds,
      narrationTempo,
      narrationPreview,
      ffmpegSummary: ffprobe.stderr.split("\n").slice(-20),
    },
    null,
    2,
  ),
);
