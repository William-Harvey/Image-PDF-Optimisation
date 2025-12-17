# PDF Optimizer - User Guide

## What Does the PDF Optimizer Do?

The PDF Optimizer helps you **reduce PDF file sizes** while maintaining quality. It works by:

1. **Extracting all images** from your PDF (photos, logos, backgrounds, gradients)
2. **Compressing each image** individually using advanced algorithms
3. **Rebuilding the PDF** with optimized images while preserving all text and layout

**Result**: Smaller file sizes (often 50-80% reduction) without losing visual quality.

---

## How to Use the PDF Optimizer

### Step 1: Open a PDF

Choose one of these methods:

- **Upload**: Click "Choose File" and select a PDF
- **Drag & Drop**: Drag a PDF file onto the editor window
- **Right-click**: Right-click on a PDF link in your browser → "Edit with Simple Editor"

### Step 2: Wait for Extraction

The extension will automatically:

1. Extract all images from the PDF (progress shown in console)
2. Display them in a gallery view
3. Show the original PDF file size

**Why so many images?** You might see more images than you expected because PDFs contain:
- Photos and logos (obvious images)
- **Gradient backgrounds** (extracted as images)
- **Vector graphics** (Form XObjects - converted to images)
- **Decorative elements** (borders, shading regions)

This is normal! The optimizer extracts everything visual to compress it.

### Step 3: Choose Your Optimization Approach

You have two options:

#### Option A: Bulk Optimization (Recommended)

**Best for**: Quick optimization of entire PDFs

1. Use the **"Bulk Optimize All Images"** button at the top
2. Adjust the global quality slider (default: 92%)
3. Click "Apply to All"
4. Wait for all images to compress
5. Click "Download Optimized PDF"

**Tip**: Start with 92% quality. If file size is still too large, try 85-90%.

#### Option B: Individual Editing

**Best for**: Fine-tuning specific images or when you need different settings per image

1. Click on any image thumbnail to open the editor
2. Edit the image:
   - **Crop**: Select crop tool, choose aspect ratio (free, 1:1, 4:3, 16:9)
   - **Rotate**: 90° clockwise/counter-clockwise
   - **Flip**: Horizontal or vertical
   - **Resize**: Change dimensions (proportional or custom)
   - **Format**: Convert to JPG, PNG, or WEBP
   - **Quality**: Adjust compression slider
3. Click "Apply" to optimize
4. Repeat for other images as needed
5. When done with all images, click "Download Optimized PDF"

### Step 4: Compare Results

**Before saving**, use the comparison feature:

1. Click the **"eye" icon** (👁️) on any optimized image
2. View **side-by-side comparison**:
   - **Original** (left) vs **Optimized** (right)
   - File sizes and dimensions shown
   - **Zoom slider** to inspect quality
3. If quality loss is visible, increase the quality slider and re-optimize

**What to look for**:
- Text should remain sharp
- Photos should have no visible artifacts
- Gradients should be smooth (no banding)

### Step 5: Download

1. Click **"Download Optimized PDF"**
2. Choose a filename
3. Save to your computer

Your new PDF will have:
- ✅ All text preserved (100% intact)
- ✅ All images compressed
- ✅ Same layout and structure
- ✅ Smaller file size

---

## Understanding the Gallery View

Each image thumbnail shows:

- **Thumbnail preview**: Visual representation
- **Image name**: Format like `page-1-img_p0_1` (page number + image ID)
- **Original size**: File size before compression
- **Dimensions**: Width × Height in pixels
- **Status indicator**:
  - Grey = Not yet optimized
  - Green checkmark = Optimized
- **Actions**:
  - 👁️ **Compare**: View before/after
  - ✏️ **Edit**: Open image editor
  - ⚙️ **Optimize**: Quick compress (uses global quality setting)

---

## Tips for Best Results

### File Size Reduction

- **Target quality**: 85-92% is usually invisible to the eye
- **Large files**: If PDF is >10MB, use 80-85% quality
- **Photos**: Can handle more compression (75-85%)
- **Graphics/logos**: Need higher quality (90-95%)

### Quality vs Size Trade-off

| Quality Setting | File Size | When to Use |
|----------------|-----------|-------------|
| 95-100% | Largest | Print-quality documents |
| 90-95% | Large | Professional presentations |
| 85-90% | Medium | General use (recommended) |
| 75-85% | Small | Web sharing, email attachments |
| Below 75% | Smallest | Only if quality isn't critical |

### Format Selection

- **JPG**: Best for photos (lossy compression)
- **PNG**: Best for graphics with transparency or sharp edges
- **WEBP**: Best overall (modern format, smaller sizes)

The optimizer **auto-detects** which format to use based on transparency.

---

## Common Scenarios

### Scenario 1: Email Attachment Too Large

**Problem**: PDF is 15MB, email limit is 10MB

**Solution**:
1. Open PDF in optimizer
2. Bulk optimize at 80% quality
3. Download (should be ~3-5MB)
4. Attach to email

### Scenario 2: Professional Report

**Problem**: Need to maintain high quality for client presentation

**Solution**:
1. Open PDF in optimizer
2. Bulk optimize at 92-95% quality
3. Use compare feature to verify quality
4. Download

### Scenario 3: Mixed Content PDF

**Problem**: PDF has both photos and text/diagrams

**Solution**:
1. Open PDF in optimizer
2. Identify photos in gallery (larger file sizes)
3. Edit photos individually at 80-85%
4. Edit diagrams/logos at 90-95%
5. Download

---

## Keyboard Shortcuts

- **Ctrl/Cmd + Shift + E**: Open editor
- **Ctrl/Cmd + V**: Paste image (when editor is open)
- **Ctrl/Cmd + S**: Save current image (in editor mode)

---

## Understanding Extracted Images

### Why Do I See Gradient Backgrounds as Separate Images?

PDFs store visual content in different ways:

1. **XObject Images**: Standard images (photos, logos)
2. **Inline Images**: Small embedded images
3. **Form XObjects**: Vector graphics (icons, diagrams) - converted to images
4. **Shading Regions**: Gradients and fills - extracted as images

The optimizer extracts **all of these** to compress them. This is why you might see:

- A gradient header as one image
- A gradient sidebar as another image
- Background patterns as separate images

**This is intentional** - it allows maximum compression of all visual elements.

### What Happens to Text?

Text is **never extracted** or modified. The optimizer:
- Extracts images only
- Compresses them
- Rebuilds the PDF with original text intact

You can copy/paste text from the optimized PDF exactly as before.

---

## Troubleshooting

### Images Look Blurry After Optimization

**Fix**: Increase quality slider to 90-95% and re-optimize

### PDF Size Didn't Decrease Much

**Causes**:
- PDF is mostly text (already small)
- Images already compressed
- Using quality setting too high (95-100%)

**Fix**: Try lower quality (80-85%) or check if PDF is already optimized

### Some Images Missing

**Rare cases**: If images are:
- Embedded as external links (not stored in PDF)
- Using unsupported encoding

**Fix**: Try a different PDF viewer or contact support

### Download Button Not Working

**Cause**: Not all images optimized yet

**Fix**: Ensure all images show green checkmark or use bulk optimize

---

## Privacy & Security

- **All processing happens locally** in your browser
- **No uploads** to external servers
- **No data collection** or tracking
- **Safe to use** with confidential documents

---

## Browser Support

- Chrome 120+ (recommended)
- Edge 120+
- Requires modern browser with ES2022 support

---

## Need Help?

- **GitHub Issues**: https://github.com/William-Harvey/Image-PDF-Optimisation/issues
- **LinkedIn**: https://www.linkedin.com/in/williamharveyuk/

---

Made with ❤️ by William Harvey
