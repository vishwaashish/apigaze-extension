# APIGaze

A Chromium DevTools extension for inspecting Fetch and XHR requests with a beautiful JSON tree view.

Works on Chrome, Edge, Brave, Opera, and other Chromium-based browsers.

## Features

- **Real-time API inspection** - See all Fetch and XHR requests as they happen
- **JSON tree view** - Expandable/collapsible JSON with syntax highlighting and hover effects
- **Smart filtering** - Filter by HTTP method, status code range, and request type
- **Quick search** - Search across URLs, paths, methods, and status codes
- **Copy anywhere** - Copy values, objects, or property paths with right-click context menu
- **Export options** - Export to HAR, JSON, or Markdown formats
- **Privacy-focused** - Mask sensitive headers (Authorization, Cookie, etc.)
- **Global variables** - Store JSON values as global variables in the console
- **Persistent settings** - Your filters and preferences are saved locally

## Installation

### Load unpacked (for development)

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/apigaze-extension.git
   cd apigaze-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Open your browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`

5. Enable **Developer mode** (toggle in the top-right corner)

6. Click **Load unpacked** and select the `dist` folder from this repository

7. Open any webpage, then open DevTools (F12 or Cmd+Option+I)

8. Select the **APIGaze** tab in DevTools

9. Trigger Fetch or XHR requests on the page (or reload a site that calls an API)

### After rebuilding

After making changes and running `npm run build` again:
- Click the **Reload** button on the extension card in your browser's extensions page
- Close and reopen DevTools
- You do not need to "Load unpacked" again

## Usage

### Basic workflow

1. Open DevTools on any page (F12 or Cmd+Option+I)
2. Switch to the **APIGaze** panel
3. Trigger Fetch or XHR requests on your page
4. Click on any request to see details
5. Use filters and search to narrow down results

### JSON inspection

- Click on a request to expand it
- Use the **JSON** tab for tree view with expand/collapse
- Use the **RAW** tab for raw text
- Right-click on any node for context menu:
  - **Copy value** - Pretty-printed JSON
  - **Copy object** - Minified JSON
  - **Copy property path** - Path like `data.users[0].name`
  - **Store as global variable** - Stores as `window.temp1` in console

### Filtering

- **Type** - Filter by All, Fetch, or XHR
- **Status** - Filter by All, 2xx, 4xx, or 5xx
- **Method** - Filter by HTTP method (GET, POST, PUT, PATCH, DELETE)
- **Search** - Search URLs, paths, methods, and status codes

### Exporting

Click the **Export** dropdown to:
- **JSON** - Export all captured requests as JSON
- **HAR** - Export in HAR format
- **Markdown** - Export as Markdown documentation

### Keyboard shortcuts

- **Arrow Up/Down** - Navigate through requests
- **Enter** - Open/collapse selected request
- **Escape** - Close details or blur search input
- **Cmd/Ctrl + C** - Copy entire API when a request is focused

## Permissions

| Manifest key | Why |
| --- | --- |
| `devtools_page` | Required to add a DevTools panel and use `chrome.devtools.network` |
| `storage` | Saves mask, column visibility, and filter settings. API bodies are never persisted |
| `clipboardWrite` | Copies JSON / cURL / Markdown from the panel |

**No `host_permissions` and no `<all_urls>`** - This extension works entirely locally and does not access any external websites.

## Privacy

- Captured traffic stays in memory in the DevTools page
- Nothing is sent to an external server
- No analytics or telemetry
- API bodies are never persisted to storage
- Only settings (filters, preferences) are saved locally

## Browser Compatibility

Works on all Chromium-based browsers:
- Google Chrome
- Microsoft Edge
- Brave
- Opera
- Vivaldi
- And other Chromium-based browsers

## Browser limits

- Traffic is captured only while DevTools is open. Reload the page if requests happened earlier.
- Response bodies come from `chrome.devtools.network.Request.getContent()`
- Request bodies come from HAR `postData` when the browser includes them. Some POST bodies are omitted (encoded blobs). The panel shows that the body is unavailable.
- Binary / base64 bodies are not parsed as JSON.
- Bodies larger than 5 MB are truncated or skipped so the panel does not freeze.
- The in-memory list keeps the last 500 requests and is discarded when DevTools closes.

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Type check only
npm run build -- --noEmit
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
