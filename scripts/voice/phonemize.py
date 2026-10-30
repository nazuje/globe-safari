"""Turns Slovenian text into IPA with Homebrew's espeak-ng. Reads a JSON list of
strings on stdin and writes the matching list to stdout. README.md says why this
doesn't use Piper's own phonemizer."""

import json
import os
import sys

from phonemizer.backend.espeak.wrapper import EspeakWrapper

EspeakWrapper.set_library(os.environ.get("ESPEAK_LIBRARY", "/opt/homebrew/lib/libespeak-ng.dylib"))

from phonemizer.backend import EspeakBackend  # noqa: E402  The library has to be set first.
from phonemizer.separator import Separator  # noqa: E402

backend = EspeakBackend("sl", preserve_punctuation=True, with_stress=True, language_switch="remove-flags")
separator = Separator(phone="", word=" ", syllable="")

# One at a time, because phonemize() silently drops blank items from a list.
chunks = json.load(sys.stdin)
ipa = [backend.phonemize([chunk], separator=separator, strip=True)[0] for chunk in chunks]
json.dump(ipa, sys.stdout, ensure_ascii=False)
