import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const modelId = "Xenova/whisper-base.en";
const destination = resolve("android-models", ...modelId.split("/"));
const files = [
  "config.json",
  "generation_config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "onnx/decoder_model_merged_q4.onnx",
  "onnx/encoder_model_q4.onnx",
];

const obsoleteFiles = [
  "onnx/decoder_model_merged_q4f16.onnx",
  "onnx/encoder_model_q4f16.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
  "onnx/encoder_model_quantized.onnx",
];

for (const file of files) {
  const target = resolve(destination, file);
  await mkdir(dirname(target), { recursive: true });
  const response = await fetch(`https://huggingface.co/${modelId}/resolve/main/${file}`);
  if (!response.ok || !response.body) {
    throw new Error(`Unable to download ${file}: ${response.status} ${response.statusText}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
  const downloaded = await stat(target);
  console.log(`${file}: ${(downloaded.size / 1024 / 1024).toFixed(1)} MB`);
}

await Promise.all(
  obsoleteFiles.map((file) => rm(resolve(destination, file), { force: true })),
);
