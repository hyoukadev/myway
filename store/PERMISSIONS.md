# myway — Permissions justification

Stores require a justification for each permission your extension requests. myway requests the
same minimal set of permissions as its upstream project (Vimium), each needed for core
functionality. None of these permissions give myway access to your data beyond what is required
to provide keyboard navigation.

| Permission | Why it's needed |
|---|---|
| `tabs` | Switch, close, move, mute, pin, and duplicate tabs; focus a specific tab. |
| `bookmarks` | Open and search bookmarks via the Vomnibar. |
| `history` | Search browser history via the Vomnibar. |
| `storage` | Save your key mappings, exclusions, and options locally. |
| `sessions` | Restore recently-closed tabs. |
| `notifications` | Show a one-time notification when myway is upgraded to a new major version (can be disabled). |
| `scripting` | Inject myway's content scripts and your custom link-hint CSS into pages. Required under Manifest V3. |
| `favicon` (Chromium only) | Show favicons next to bookmarks/history in the Vomnibar. Not requested in the Firefox build. |
| `webNavigation` | Detect URL changes and re-check whether myway is enabled on a frame. |
| `search` | The Vomnibar can launch your browser's default search. |
| `clipboardRead` / `clipboardWrite` (Firefox only) | The "copy current URL" / "open copied URL" commands. Chromium grants these without explicit permission. |
| host permission `<all_urls>` | myway must run on all pages to provide keyboard navigation. It does **not** read page content for any purpose other than enabling keyboard shortcuts in that tab. |

If you have questions about a specific permission, see [`PRIVACY.md`](./PRIVACY.md) or contact the
developer.
