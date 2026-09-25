// Only the Player imports the compiled Tailwind stylesheet — components tested in isolation
// (Hotspot, Tooltip, etc.) never pull it in on their own, so their rendered DOM would look
// unstyled. Import it here once for every browser test.
import "../app.css";
