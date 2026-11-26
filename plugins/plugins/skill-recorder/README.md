# Skill Recorder 0.9.0

`skills/record-skill` is an independent Windows Skill. Copy the whole directory into a host's skill library, or install the plugin package. Its scripts provide screen capture, redacted input observations, video, action processing and keyframes. Nexts is optional; Claude Desktop and Electron are not dependencies.

Requirements: Windows x64, Windows PowerShell 5.1, Node.js 18+, and FFmpeg with libx264. No npm install, proprietary module import, fixed runtime cache or account is required.

```powershell
& ./skills/record-skill/scripts/record.ps1 -Diagnose
& ./skills/record-skill/scripts/record.ps1 -ListMonitors
& ./skills/record-skill/scripts/record.ps1 -Monitor 0 -Seconds 60
```

Record only on the user's request. The CLI prints its output directory and readiness/progress. command.json accepts pause, resume and stop with changing sequence numbers. Ctrl+C stops gracefully. Inspect video, action counts and keyframes before authoring. Ordinary input is parameterized; screen pixels remain visible. Dependency checks run before capture and errors are retained locally.

Nexts invokes the same engine after its chat consent card. Its toolbar, optional browser enrichment/review and conversation-bound authoring remain available. Existing recordings remain readable. Host integration changes require rebuilding/restarting Nexts.

The standalone Hub Skill lives at `skills/skills/record-skill`; this companion contains the same Skill and a root `scripts` entry point for the Nexts host. Keep both copies synchronized. From the Hub repository root, build the packages with `node scripts/package-skills.mjs --skill record-skill` and `node scripts/package-plugins.mjs --plugin skill-recorder`. These commands create local ZIPs; publishing to the online catalog is a separate action. Recorder source tests in the Nexts repository check redaction, pause boundaries, encoding, failure diagnostics and standalone startup without an old runtime cache, using generated images instead of private desktop recordings.
