# Instagram Agent for Nexts

Imported from https://github.com/Jakeschincariol/instagram-agent-skill at commit `d03c56bb598be770c60b201f94237e5d1a4268a6` (upstream 1.0.0), under the MIT license. See LICENSE and README.upstream.md.

Includes all 13 ig-* skills, six Python utilities, scoring data, and the voice template. Install as one plugin from the Nexts plugin catalog. Start with ig-reel, ig-plan, or ig-profile.

## Runtime

Python 3 is needed for the local utilities; they use the standard library. Resolve script paths from their skill folder, not the current working directory. On Windows use python or py -3 when python3 is unavailable. Research may additionally use available browsing tools or an optional yt-dlp installation; no account connection is bundled. English scoring heuristics are preserved from upstream.

User voice, plans, swipe files, and logs live in ~/.nexts/instagram/. Start with templates/voice.md. This port changes the Claude data paths and adds per-skill Nexts runtime guidance; scoring logic is unchanged. Content is drafted locally and posted or sent manually by the user.
