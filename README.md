# Design Presentation to Quotation Converter

A single-page web application that helps ceramic and product design studios convert moodboard-style design presentations into printable quotations. The tool keeps the visual presentation cards and the commercial quotation table in sync so changes are reflected instantly.

## Features

- ✏️ **Interactive editor** – update project metadata, branding, and terms directly in the layout using editable fields.
- 🖼️ **Design card builder** – upload reference images, add descriptions, and arrange items with drag-and-drop.
- 📋 **Quotation generator** – maintain synchronized table rows with automatic subtotal, tax, and grand-total calculations.
- 🔄 **Two synchronized views** – toggle between a presentation grid and a structured quotation ready for procurement teams.
- 📄 **PDF export** – download presentation and quotation snapshots for client handoff.
- 💡 **Fully client-side** – no server dependencies; open the `index.html` file in any modern browser.

## Getting Started

1. Open `index.html` in a browser (double-click the file or use a lightweight static server such as `python -m http.server`).
2. Fill in the project settings panel with client and quotation details.
3. Add items by entering descriptions, dimensions, pricing, and uploading reference imagery.
4. Reorder cards in the presentation grid by dragging them; the quotation table updates accordingly.
5. Switch between the Presentation and Quotation views using the toggle button.
6. Export PDF snapshots of either view using the Download buttons.

## Customisation Tips

- Replace the branding block in the presentation view by editing the text directly (it is content-editable).
- Adjust signature labels, tax copy, or legal notes to match your organisation.
- Update the default tax calculation in `script.js` if you work with a different tax rate.
- Adapt styling in `styles.css` to align with your brand palette.

## Tech Stack

- HTML5, CSS (with modern layout primitives), and vanilla JavaScript.
- [`html2canvas`](https://html2canvas.hertzen.com/) & [`jsPDF`](https://github.com/parallax/jsPDF) for PDF exports (loaded from CDN).

## License

This project is provided as-is for internal studio workflows. Adapt and extend it to fit your quoting process.
