#!/bin/sh
# Once per machine: a Python environment and the voice model, both gitignored.
set -eu
cd "$(dirname "$0")"

# Pinned to one upload of the voice, so everyone generates from the same model.
REVISION=5041a7a49ae5b3a0f30e6837769eb03fdbb231bd
BASE="https://huggingface.co/rhasspy/piper-voices/resolve/$REVISION/sl/sl_SI/artur/medium"
MODEL=sl_SI-artur-medium.onnx

need() {
  command -v "$1" >/dev/null || { echo "Missing $1. Install it with: brew install $2" >&2; exit 1; }
}
need uv uv
need ffmpeg ffmpeg
need espeak-ng espeak-ng

uv venv --python 3.12 --allow-existing .venv
uv pip install --python .venv/bin/python -r requirements.txt

mkdir -p model
for file in "$MODEL" "$MODEL.json"; do
  [ -f "model/$file" ] || curl -fL --progress-bar -o "model/$file" "$BASE/$file"
done

# A cut-off download would otherwise fail much later, in a confusing way.
(cd model && shasum -a 256 -c <<SUMS
9222ed93ef425524ad4be0b083369af8ea8db18455576a6016b154192f4ed38c  $MODEL
741283430f1fa2be5c61717c6f1fe795a7b9f537491927340dd12f90f3b3cc04  $MODEL.json
SUMS
)
echo "Ready. Generate clips with: npm run voice"
