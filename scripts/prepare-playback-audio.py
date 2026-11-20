"""Export the two-street prototype's playback clips from the downloaded recordings."""
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "assets" / "audio"
PLAYBACK = AUDIO / "playback"
SECONDS = {
    "soft_rain": 20, "wet_pavement_footsteps": 6, "passing_car": 7,
    "cafe_chatter": 5, "milk_steamer": 4, "door_opening": 3,
    "children_laughter": 5, "page_turn": 3, "door_latch": 3,
    "door_chime": 5, "household_murmur": 6,
}


def export(source, destination, cue, duration):
    rate = "32000"
    options = ["-ac", "2" if cue == "soft_rain" else "1", "-ar", rate]
    if cue == "soft_rain" and duration >= 20.25:
        # Blend the quarter-second after the cut into the introduction to close the loop.
        options += ["-filter_complex", (
            "[0:a]asplit=3[body][tail][intro];"
            "[body]atrim=start=0.25:end=20,asetpts=PTS-STARTPTS[b];"
            "[tail]atrim=start=20:end=20.25,asetpts=PTS-STARTPTS[t];"
            "[intro]atrim=end=0.25,asetpts=PTS-STARTPTS[i];"
            "[t][i]acrossfade=d=0.25[seam];[b][seam]concat=n=2:v=0:a=1[out]"
        ), "-map", "[out]"]
        edits = "20-second stereo excerpt with a quarter-second loop crossfade."
    else:
        limit = min(SECONDS[cue], duration)
        options += ["-t", str(limit), "-af",
                    f"afade=d=0.035,afade=t=out:st={max(0, limit - .18):.3f}:d=0.18"]
        edits = f"First {limit:g} seconds with short edge fades."
    subprocess.run([
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        *options, "-map_metadata", "-1", "-c:a", "libmp3lame",
        "-b:a", "96k" if cue == "soft_rain" else "64k", str(destination),
    ], check=True)
    return edits + " Encoded as MP3 at 32 kHz."


def main():
    manifest = json.loads((AUDIO / "manifest.json").read_text())
    catalogue = json.loads((ROOT / "sound-catalog.json").read_text())
    missing = {(cue["id"], take["id"]) for cue in catalogue["cues"] for take in cue["takes"]
               if take.get("replacementRequired") is True and take.get("availability") == "missing"}
    PLAYBACK.mkdir(exist_ok=True)
    groups = []
    for group in manifest["cues"]:
        cue = group["id"]
        if cue not in SECONDS:
            continue
        takes = []
        for take in group["takes"]:
            source = ROOT / take["path"]
            if (cue, take["id"]) in missing or not source.is_file():
                continue
            destination = PLAYBACK / f"{source.stem}.mp3"
            duration = take.get("durationSeconds") or SECONDS[cue]
            edits = export(source, destination, cue, duration)
            takes.append({
                "id": take["id"],
                "path": destination.relative_to(ROOT).as_posix(),
                "originalPath": take["path"],
                "creator": take["creator"],
                "sourceUrl": take["sourceUrl"],
                "license": take["license"],
                "edits": edits,
            })
        if takes:
            groups.append({"id": cue, "takes": takes})
    (PLAYBACK / "manifest.json").write_text(json.dumps({"version": 1, "cues": groups}, indent=2) + "\n")


if __name__ == "__main__":
    main()
