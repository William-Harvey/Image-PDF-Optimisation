# Simple Image/PDF Editor

A professional Chrome extension for editing images and optimizing PDFs directly in your browser. Features advanced compression, cropping, rotation, resizing, and format conversion.

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/chrome-extension-orange.svg)

## Features

### Image Editing
- **Crop**: Free or fixed aspect ratios (1:1, 4:3, 16:9)
- **Rotate & Flip**: 90° rotations and horizontal/vertical flipping
- **Resize**: Proportional or custom dimensions
- **Format Conversion**: Convert between JPG, PNG, and WEBP
- **Quality Adjustment**: Fine-tune compression (lossy/lossless)
- **Comparison View**: Side-by-side original vs edited preview
- **Undo**: Revert changes with bounded history stack

### PDF Optimization
- **Extract Images**: Pull images from PDFs or render full pages
- **Bulk Optimization**: Apply compression to all images at once
- **Individual Editing**: Edit each image separately in gallery view
- **Text Preservation**: Rebuild PDFs while keeping original text
- **Smart Compression**: Auto-detect transparency for format selection
- **Preview Modal**: Interactive before/after comparison

### User Experience
- **Multiple Input Methods**: Upload, drag & drop, paste (Ctrl+V), or right-click on web images
- **Dark/Light Themes**: System preference detection with manual override
- **Keyboard Shortcuts**:
  - `Ctrl+Shift+E` / `Cmd+Shift+E` - Open editor
  - `Ctrl+V` / `Cmd+V` - Paste image
  - `Ctrl+S` / `Cmd+S` - Save image
- **Accessibility**: Screen reader support, ARIA labels, keyboard navigation
- **Collapsible Sections**: Organize UI by hiding/showing control panels

## Installation

### From Chrome Web Store
*(Link to be added once published)*

### Development Install
1. Clone this repository:
   ```bash
   git clone https://github.com/William-Harvey/Image-PDF-Optimisation.git
   cd "Image-PDF-Optimisation"
   ```

2. Install dependencies (optional, for linting/formatting):
   ```bash
   npm install
   ```

3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the project directory

## Development

### Project Structure
```
/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js           # Service worker
├── editor.html             # Main editor UI
├── editor.js               # Application logic (2,758 lines)
├── editor.css              # Comprehensive styling
├── config.js               # Configuration constants
├── utils.js                # Validation & helper functions
├── memory.js               # Memory management utilities
├── pdf-init.js             # PDF.js initialization
├── images/                 # Extension icons
└── Third-party libraries:
    ├── cropper.min.js      # Image cropping (Cropper.js v1.4.3)
    ├── jspdf.umd.min.js    # PDF generation
    ├── pdf.mjs / pdf.worker.mjs  # PDF rendering (PDF.js)
    ├── pdf-lib.min.js      # PDF manipulation
    └── browser-image-compression.js  # Advanced compression
```

### Scripts
```bash
# Lint code
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changes
npm run format:check

# Validate (format + lint)
npm run validate
```

### Code Quality

#### ESLint Rules
- No `var` declarations (use `const`/`let`)
- Strict equality (`===`)
- No `alert()` (use custom notifications)
- No magic numbers (use config constants)
- Require `await` in async functions

#### Prettier Configuration
- Single quotes
- 2-space indentation
- Semicolons required
- 100-character line width
- Trailing commas (ES5)

### Memory Management

The extension includes robust memory management to prevent leaks:

```javascript
// HistoryManager - bounded undo stack (max 10 items)
const historyManager = new HistoryManager();

// Automatic cleanup on page unload
setupUnloadCleanup(state);

// Manual cleanup
disposeCanvas(canvas);
disposeCropper(cropper);
cleanupPdfImages(pdfImages);
```

### Configuration

All constants centralized in `config.js`:

```javascript
import { CONFIG, FILE, UI, COMPRESSION } from './config.js';

// Example: File size limit
FILE.MAX_SIZE_BYTES // 50 MB

// Example: UI timing
UI.DEBOUNCE_DELAY_MS // 250ms
UI.NOTIFICATION_DURATION_MS // 3000ms

// Example: Compression defaults
COMPRESSION.DEFAULT_QUALITY // 0.92
```

## Browser Compatibility

- **Chrome**: 120+ (Manifest V3)
- **Edge**: 120+
- **Requires**:
  - ES2022 support
  - Module imports (`type="module"`)
  - `createImageBitmap` API
  - Chrome Extension APIs: `storage`, `contextMenus`

## Security

### Content Security Policy
```json
"script-src 'self'; object-src 'self'"
```

### Input Validation
- File size limits (50 MB)
- MIME type checking
- Filename sanitization (prevents path traversal, XSS)
- URL validation (HTTP/HTTPS/data only)

### Memory Safety
- Bounded history stack (10 items max)
- Automatic canvas disposal
- Object URL revocation
- No eval() or innerHTML with user data

## Performance Optimizations

1. **Debounced Quality Slider**: Prevents excessive recalculations (250ms)
2. **Sampled Transparency Check**: Checks every 10th pixel instead of all
3. **Hardware Acceleration**: Canvas-based image manipulation
4. **Progressive Loading**: Loading indicators with progress bars
5. **Bounded Memory**: Limited history stack, automatic cleanup

## Known Issues

- **Cropper.js Version**: Using v1.4.3 (2018, outdated). Consider upgrading to modern alternative.
- **Web Workers Disabled**: CSP restrictions prevent `browser-image-compression` from using workers.
- **Large PDFs**: Memory-intensive for PDFs with 50+ high-resolution images.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned improvements:

- [ ] Replace Cropper.js with modern library (Croppie/Croppr.js)
- [ ] Implement proper state management
- [ ] Split editor.js into modules (currently 2,758 lines)
- [ ] Add unit tests (Jest/Vitest)
- [ ] Set up build system (Vite)
- [ ] Migrate to TypeScript
- [ ] Add E2E tests (Playwright)

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run linter and formatter (`npm run validate`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Commit Message Convention

```
type(scope): description

Examples:
- feat(editor): add new crop aspect ratio
- fix(pdf): resolve memory leak in bulk optimization
- refactor(utils): extract validation logic
- docs(readme): update installation instructions
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Author

**William Harvey**

- LinkedIn: [williamharveyuk](https://www.linkedin.com/in/williamharveyuk/)
- GitHub: [@William-Harvey](https://github.com/William-Harvey)

## Acknowledgments

- **Cropper.js** by Chen Fengyuan
- **PDF.js** by Mozilla Foundation
- **jsPDF** by James Hall
- **pdf-lib** by Andrew Dillon
- **browser-image-compression** by Dongsoo Han

## Support

For issues or feature requests:
- Open an issue on [GitHub](https://github.com/William-Harvey/Image-PDF-Optimisation/issues)
- Connect on [LinkedIn](https://www.linkedin.com/in/williamharveyuk/)

---

Made with ❤️ by William Harvey
