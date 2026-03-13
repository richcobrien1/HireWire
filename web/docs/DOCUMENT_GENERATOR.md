# HireWire Document Studio

Professional document generator with instant export to HTML, PDF, and plain text.

## Features

- **Live Preview**: See your resume as you edit the data
- **Multiple Export Formats**:
  - 📄 HTML (fully styled, ready to use)
  - 🖨️ PDF (via browser print dialog)
  - 📋 Copy formatted HTML to clipboard
  - 📝 Copy plain text (ATS-friendly)
- **Professional Styling**: Matches traditional resume formats
- **Print-Optimized**: Perfect margins and page breaks

## Usage

### 1. Access the Generator

```bash
cd apps/hirewire/web
npm run dev
```

Navigate to: `http://localhost:3000/docs/generator`

### 2. Update Your Resume Data

Edit `lib/data/resume-data.json` with your information:

```json
{
  "personalInfo": {
    "name": "Your Name",
    "emails": ["your@email.com"],
    ...
  },
  ...
}
```

### 3. Export Your Resume

**To PDF:**
1. Click "Print / Save as PDF"
2. In the print dialog, select "Save as PDF"
3. Choose destination and save

**To HTML:**
1. Click "Download HTML" for a standalone file
2. Or "Copy HTML" to paste into email/website

**To Plain Text:**
1. Click "Copy Plain Text" for ATS systems
2. Paste into application forms

## File Structure

```
web/
├── app/
│   └── docs/
│       └── generator/
│           └── page.tsx          # Main generator page
├── components/
│   └── resume/
│       └── ProfessionalResume.tsx # Resume template component
└── lib/
    └── data/
        └── resume-data.json      # Your resume data
```

## Customization

### Add New Templates

Create new components in `components/resume/`:

```tsx
export default function CreativeResume({ data }) {
  return (
    // Your custom design
  );
}
```

### Modify Styling

Edit `ProfessionalResume.tsx` Tailwind classes or add custom CSS.

### Add More Document Types

- Cover letters
- Portfolio pages
- LinkedIn profiles
- Business cards

## Tips

- **Keep data in JSON**: Easy to version control and update
- **Use print preview**: Verify formatting before exporting
- **Test in different browsers**: Chrome PDF export is most reliable
- **ATS optimization**: Plain text export removes all formatting

## Future Enhancements

- [ ] Multiple template selection
- [ ] Live editing interface
- [ ] Markdown export
- [ ] LaTeX export for academic CVs
- [ ] Cover letter generator
- [ ] LinkedIn profile formatter
