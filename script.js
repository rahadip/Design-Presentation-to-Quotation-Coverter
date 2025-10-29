const itemForm = document.getElementById('item-form');
const projectForm = document.getElementById('project-form');
const designGrid = document.getElementById('design-grid');
const quotationBody = document.querySelector('#quotation-table tbody');
const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const grandTotalEl = document.getElementById('grand-total');
const currencyInput = document.getElementById('currency');
const projectNameInput = document.getElementById('project-name');
const clientNameInput = document.getElementById('client-name');
const quoteNumberInput = document.getElementById('quote-number');
const validUntilInput = document.getElementById('valid-until');
const presentationProject = document.getElementById('presentation-project');
const presentationClient = document.getElementById('presentation-client');
const quoteProject = document.getElementById('quote-project');
const quoteClient = document.getElementById('quote-client');
const quoteNumberDisplay = document.getElementById('quote-number-display');
const quoteValidity = document.getElementById('quote-validity');
const toggleViewBtn = document.getElementById('toggle-view');
const presentationView = document.getElementById('presentation-view');
const quotationView = document.getElementById('quotation-view');
const exportPresentationBtn = document.getElementById('export-presentation');
const exportQuotationBtn = document.getElementById('export-quotation');
const pdfInput = document.getElementById('pdf-upload');
const importPdfBtn = document.getElementById('import-pdf');
const importStatus = document.getElementById('import-status');

toggleViewBtn.textContent = 'Show Quotation';

let items = [];
let dragIndex = null;

// Fallback sources for loading the pdf.js runtime when the primary CDN is unavailable.
const pdfjsScriptSources = [
  './vendor/pdfjs/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
];

const pdfjsWorkerSources = [
  './vendor/pdfjs/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
];

let pdfjsLastSource = null;

const scriptLoadPromises = new Map();

const findScriptElement = (src) => {
  const scripts = document.getElementsByTagName('script');
  for (const script of scripts) {
    if (script.getAttribute('src') === src) return script;
    if (script.dataset.source === src) return script;
  }
  return null;
};

const recordScriptSource = (script, src) => {
  if (!script) return;
  script.dataset.source = src;
  if (src && !script.dataset.pdfjsSrc && /pdf/i.test(src)) {
    script.dataset.pdfjsSrc = src;
  }
};

const loadExternalScript = (src, options = {}) => {
  if (!src) return Promise.reject(new Error('No script source provided.'));

  if (scriptLoadPromises.has(src)) {
    return scriptLoadPromises.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const existing = findScriptElement(src);

    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    if (options.inlineContent) {
      const target = existing || document.createElement('script');
      recordScriptSource(target, src);
      target.type = 'text/javascript';
      target.textContent = `${options.inlineContent}
//# sourceURL=${src}`;
      target.dataset.loaded = 'true';
      if (!existing) {
        document.head.appendChild(target);
      }
      resolve();
      return;
    }

    const script = existing || document.createElement('script');
    recordScriptSource(script, src);
    script.src = src;
    script.async = false;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';

    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });

    script.addEventListener('error', () => {
      reject(new Error(`Failed to load script ${src}`));
    }, { once: true });

    if (!existing) {
      document.head.appendChild(script);
    }
  });

  const trackedPromise = promise.catch((error) => {
    scriptLoadPromises.delete(src);
    throw error;
  });

  scriptLoadPromises.set(src, trackedPromise);
  return trackedPromise;
};

const fetchScriptContent = async (src) => {
  if (!src) throw new Error('No script source provided.');
  try {
    const response = await fetch(src, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Failed to fetch script ${src}: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(`Unable to fetch script ${src}: ${error.message || error}`);
  }
};

const resolvePdfjsGlobal = () => window.pdfjsLib || window['pdfjs-dist/build/pdf'];

const isProbablyLocalSource = (src) => /^([./]|blob:|data:)/.test(src || '');

const pdfjsWorkerBlobUrls = new Set();

const releasePdfWorkerBlobs = () => {
  for (const url of pdfjsWorkerBlobUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to revoke worker blob URL', url, error);
    }
  }
  pdfjsWorkerBlobUrls.clear();
};

const derivePdfWorkerUrl = (scriptUrl) => {
  if (!scriptUrl) return '';

  try {
    const url = new URL(scriptUrl, window.location.href);
    url.hash = '';
    url.search = '';

    if (url.pathname.endsWith('.min.js')) {
      url.pathname = url.pathname.replace('.min.js', '.worker.min.js');
    } else if (url.pathname.endsWith('.js')) {
      url.pathname = url.pathname.replace('.js', '.worker.js');
    }

    return url.toString();
  } catch (error) {
    console.warn('Unable to derive worker URL from script source', scriptUrl, error);
  }

  return '';
};

const applyPdfWorkerSource = async (source) => {
  if (!window.pdfjsLib?.GlobalWorkerOptions) return;

  if (source) {
    pdfjsLastSource = source;
  }

  const candidates = [];
  const derived = derivePdfWorkerUrl(source);
  if (derived) candidates.push(derived);
  candidates.push(...pdfjsWorkerSources);

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  for (const candidate of uniqueCandidates) {
    if (isProbablyLocalSource(candidate)) {
      releasePdfWorkerBlobs();
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = candidate;
      return;
    }
  }

  for (const candidate of uniqueCandidates) {
    if (!candidate.startsWith('http')) continue;
    try {
      const content = await fetchScriptContent(candidate);
      const blob = new Blob([`${content}
//# sourceURL=${candidate}`], { type: 'text/javascript' });
      releasePdfWorkerBlobs();
      const blobUrl = URL.createObjectURL(blob);
      pdfjsWorkerBlobUrls.add(blobUrl);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = blobUrl;
      return;
    } catch (error) {
      console.warn('Unable to prepare PDF.js worker from source', candidate, error);
    }
  }

  if (uniqueCandidates.length) {
    releasePdfWorkerBlobs();
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = uniqueCandidates[0];
  }
};

let pdfjsLoadAttempt = null;

const ensurePdfjsLib = async () => {
  const existing = resolvePdfjsGlobal();
  if (existing) {
    window.pdfjsLib = existing;
    const inlineScript = document.querySelector('script[data-pdfjs-src]');
    const inlineSource =
      pdfjsLastSource ||
      inlineScript?.dataset.pdfjsSrc ||
      inlineScript?.getAttribute('data-pdfjs-src') ||
      inlineScript?.getAttribute('src') ||
      document.querySelector('script[src*"pdf"]')?.getAttribute('src') ||
      pdfjsScriptSources[0];
    await applyPdfWorkerSource(inlineSource);
    return window.pdfjsLib;
  }

  if (!pdfjsLoadAttempt) {
    pdfjsLoadAttempt = (async () => {
      const scriptHints = Array.from(
        document.querySelectorAll('script[data-pdfjs-src], script[src*"pdf"]'),
      )
        .map((script) => script.dataset.pdfjsSrc || script.getAttribute('data-pdfjs-src') || script.getAttribute('src'))
        .filter(Boolean);

      const sources = [...scriptHints, ...pdfjsScriptSources];
      const seen = new Set();
      const errors = [];

      for (const source of sources) {
        if (!source || seen.has(source)) continue;
        seen.add(source);

        try {
          await loadExternalScript(source);
        } catch (loadError) {
          errors.push({ source, error: loadError });
          console.warn('Unable to load PDF.js from source', source, loadError);
          try {
            const inlineContent = await fetchScriptContent(source);
            await loadExternalScript(source, { inlineContent });
          } catch (fetchError) {
            errors.push({ source, error: fetchError });
            console.warn('Unable to load PDF.js from source', source, fetchError);
            continue;
          }
        }

        const pdfjsGlobal = resolvePdfjsGlobal();
        if (pdfjsGlobal) {
          window.pdfjsLib = pdfjsGlobal;
          await applyPdfWorkerSource(source);
          return pdfjsGlobal;
        }
      }

      const error = new Error('PDF.js library could not be loaded.');
      error.code = 'PDFJS_MISSING';
      error.attempts = errors;
      throw error;
    })().finally(() => {
      pdfjsLoadAttempt = null;
    });
  }

  return pdfjsLoadAttempt;
};

const currencyFormatter = () => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: currencyInput.value || 'IDR',
  maximumFractionDigits: 2,
});

const readImageAsDataUrl = (file) => new Promise((resolve) => {
  if (!file) {
    resolve('');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => resolve(event.target.result);
  reader.readAsDataURL(file);
});

const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });

const updateImportStatus = (message, tone = 'muted') => {
  if (!importStatus) return;

  importStatus.textContent = message;
  importStatus.className = `hint hint-${tone}`;
};

const cleanLine = (line) => line.replace(/\s+/g, ' ').trim();

const parseValueFromLine = (line) => {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex >= 0) {
    const value = line.slice(separatorIndex + 1).trim();
    if (value) return value;
  }

  const dashIndex = line.indexOf('–');
  if (dashIndex >= 0) {
    const value = line.slice(dashIndex + 1).trim();
    if (value) return value;
  }

  const hyphenIndex = line.indexOf('-');
  if (hyphenIndex >= 0) {
    const value = line.slice(hyphenIndex + 1).trim();
    if (value) return value;
  }

  return line.trim();
};

const parseNumericValue = (value) => {
  if (!value) return Number.NaN;
  const cleaned = value.replace(/[^\d.,-]/g, '');
  if (!cleaned) return Number.NaN;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma > -1 && lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const findFieldValue = (lines, usedIndexes, keywords) => {
  for (let index = 0; index < lines.length; index += 1) {
    if (usedIndexes.has(index)) continue;
    const line = lines[index];
    const lower = line.toLowerCase();
    if (keywords.some((keyword) => lower.includes(keyword))) {
      usedIndexes.add(index);
      return parseValueFromLine(line);
    }
  }
  return '';
};

const extractItemsFromPdf = async (file) => {
  const pdfjsLib = await ensurePdfjsLib();
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const extracted = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const image = canvas.toDataURL('image/png');
    canvas.width = 0;
    canvas.height = 0;

    const textContent = await page.getTextContent();
    const lines = textContent.items.map((item) => cleanLine(item.str)).filter(Boolean);

    if (!lines.length) continue;

    const usedIndexes = new Set();

    let title = '';
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const lower = line.toLowerCase();
      if (
        lower.includes('size') ||
        lower.includes('dimension') ||
        lower.includes('colour') ||
        lower.includes('color') ||
        lower.includes('finish') ||
        lower.includes('glaze') ||
        lower.includes('qty') ||
        lower.includes('quantity') ||
        lower.includes('price')
      ) {
        continue;
      }

      if (/^\d+(\.\d+)?$/.test(line)) continue;

      title = line;
      usedIndexes.add(i);
      break;
    }

    if (!title) {
      title = `Item ${pageNumber}`;
    }

    const dimensions = findFieldValue(lines, usedIndexes, ['size', 'dimension']);
    const finish = findFieldValue(lines, usedIndexes, ['finish', 'color', 'colour', 'glaze']);
    const quantityRaw = findFieldValue(lines, usedIndexes, ['qty', 'quantity', 'pcs']);
    const priceRaw = findFieldValue(lines, usedIndexes, ['price', 'unit price', 'cost']);

    const quantityParsed = parseNumericValue(quantityRaw);
    const priceParsed = parseNumericValue(priceRaw);

    const description = lines
      .filter((line, index) => !usedIndexes.has(index))
      .filter((line) => line.length > 2)
      .slice(0, 6)
      .join(' ');

    extracted.push({
      title,
      description,
      dimensions,
      finish,
      quantity: Number.isFinite(quantityParsed) && quantityParsed > 0 ? Math.round(quantityParsed) : 1,
      price: Number.isFinite(priceParsed) && priceParsed >= 0 ? priceParsed : 0,
      image,
    });
  }

  return extracted;
};

const recalcTotals = () => {
  const formatter = currencyFormatter();
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const tax = subtotal * 0.11;
  const grandTotal = subtotal + tax;

  subtotalEl.textContent = formatter.format(subtotal || 0);
  taxEl.textContent = formatter.format(tax || 0);
  grandTotalEl.textContent = formatter.format(grandTotal || 0);
};

const bindEditableEvents = (item, card, row) => {
  const titleEl = card.querySelector('.card-title');
  const dimensionsEl = card.querySelector('.card-dimensions');
  const descriptionEl = card.querySelector('.card-description');
  const finishEl = card.querySelector('.card-finish');
  const rowName = row.querySelector('.row-name');
  const rowDescription = row.querySelector('.row-description');
  const rowDimensions = row.querySelector('.row-dimensions');
  const rowFinish = row.querySelector('.row-finish');
  const rowQty = row.querySelector('.row-qty');
  const rowPrice = row.querySelector('.row-price');
  const rowTotal = row.querySelector('.row-total');

  const formatter = () => currencyFormatter().format(item.quantity * item.price);

  const updateRowTotal = () => {
    rowTotal.textContent = formatter();
    recalcTotals();
  };

  titleEl.addEventListener('input', () => {
    item.title = titleEl.textContent.trim();
    rowName.textContent = item.title;
  });

  dimensionsEl.addEventListener('input', () => {
    item.dimensions = dimensionsEl.textContent.trim();
    rowDimensions.textContent = item.dimensions;
  });

  descriptionEl.addEventListener('input', () => {
    item.description = descriptionEl.textContent.trim();
    rowDescription.textContent = item.description;
  });

  finishEl.addEventListener('input', () => {
    item.finish = finishEl.textContent.trim();
    rowFinish.textContent = item.finish;
  });

  rowName.addEventListener('input', () => {
    item.title = rowName.textContent.trim();
    titleEl.textContent = item.title;
  });

  rowDescription.addEventListener('input', () => {
    item.description = rowDescription.textContent.trim();
    descriptionEl.textContent = item.description;
  });

  rowDimensions.addEventListener('input', () => {
    item.dimensions = rowDimensions.textContent.trim();
    dimensionsEl.textContent = item.dimensions;
  });

  rowFinish.addEventListener('input', () => {
    item.finish = rowFinish.textContent.trim();
    finishEl.textContent = item.finish;
  });

  rowQty.addEventListener('input', () => {
    item.quantity = Number(rowQty.value) || 0;
    updateRowTotal();
  });

  rowPrice.addEventListener('input', () => {
    item.price = Number(rowPrice.value) || 0;
    updateRowTotal();
  });

  rowQty.value = item.quantity;
  rowPrice.value = item.price;
  rowFinish.textContent = item.finish;
  rowName.textContent = item.title;
  rowDescription.textContent = item.description;
  rowDimensions.textContent = item.dimensions;
  finishEl.textContent = item.finish;
  rowTotal.textContent = formatter();
};

const render = () => {
  designGrid.innerHTML = '';
  quotationBody.innerHTML = '';

  items.forEach((item, index) => {
    const cardTemplate = document.getElementById('design-card-template');
    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const rowTemplate = document.getElementById('quotation-row-template');
    const row = rowTemplate.content.firstElementChild.cloneNode(true);

    card.dataset.index = index;
    row.dataset.index = index;

    card.querySelector('.card-title').textContent = item.title;
    card.querySelector('.card-dimensions').textContent = item.dimensions;
    card.querySelector('.card-finish').textContent = item.finish;
    card.querySelector('.card-description').textContent = item.description;
    card.querySelector('.design-card-image').style.backgroundImage = item.image
      ? `url(${item.image})`
      : 'linear-gradient(135deg, #f0f0f0, #d8d8d8)';

    row.querySelector('.thumb').style.backgroundImage = card.querySelector('.design-card-image').style.backgroundImage;
    row.querySelector('.row-index').textContent = index + 1;
    row.querySelector('.row-finish').textContent = item.finish;

    const deleteBtn = card.querySelector('.delete');
    deleteBtn.addEventListener('click', () => {
      items.splice(index, 1);
      render();
    });

    bindEditableEvents(item, card, row);

    designGrid.appendChild(card);
    quotationBody.appendChild(row);
  });

  attachDragHandlers();
  recalcTotals();
};

itemForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = document.getElementById('item-name').value.trim();
  if (!title) return;

  const qtyValue = Number(document.getElementById('item-qty').value);
  const priceValue = Number(document.getElementById('item-price').value);

  const newItem = {
    title,
    description: document.getElementById('item-description').value.trim(),
    dimensions: document.getElementById('item-dimensions').value.trim(),
    finish: document.getElementById('item-finish').value.trim(),
    quantity: Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 1,
    price: Number.isFinite(priceValue) && priceValue >= 0 ? priceValue : 0,
    image: await readImageAsDataUrl(document.getElementById('item-image').files[0]),
  };

  items.push(newItem);
  itemForm.reset();
  render();
});

projectForm.addEventListener('input', () => {
  const projectName = projectNameInput.value.trim() || 'Project Name';
  const clientName = clientNameInput.value.trim() || 'Client Name';
  presentationProject.textContent = projectName;
  presentationClient.textContent = clientName;
  quoteProject.textContent = projectName;
  quoteClient.textContent = clientName;
  quoteNumberDisplay.textContent = quoteNumberInput.value.trim() || '—';
  quoteValidity.textContent = validUntilInput.value ? new Date(validUntilInput.value).toLocaleDateString() : '—';
  recalcTotals();
});

currencyInput.addEventListener('input', recalcTotals);

const toggleView = () => {
  presentationView.classList.toggle('hidden');
  quotationView.classList.toggle('hidden');
  toggleViewBtn.textContent = quotationView.classList.contains('hidden')
    ? 'Show Quotation'
    : 'Show Presentation';
};

toggleViewBtn.addEventListener('click', toggleView);

const raf = () => new Promise((resolve) => requestAnimationFrame(resolve));

const downloadSection = async (element, filename) => {
  const wasHidden = element.classList.contains('hidden');

  if (wasHidden) {
    element.classList.remove('hidden');
  }

  try {
    await raf();
    await raf();

    const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFConstructor || typeof html2canvas !== 'function') {
      throw new Error('Export libraries not available');
    }

    const canvas = await html2canvas(element, {
      useCORS: true,
      backgroundColor: '#ffffff',
      scale: Math.min(window.devicePixelRatio || 1, 2),
    });

    const { width, height } = canvas;
    const orientation = width >= height ? 'landscape' : 'portrait';
    const pdf = new jsPDFConstructor({
      orientation,
      unit: 'pt',
      format: [width, height],
    });

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to export section', error);
    alert('Unable to download the quotation right now. Please try again.');
  } finally {
    if (wasHidden) {
      element.classList.add('hidden');
    }
  }
};

exportPresentationBtn.addEventListener('click', () => downloadSection(presentationView, 'presentation.pdf'));
exportQuotationBtn.addEventListener('click', () => downloadSection(quotationView, 'quotation.pdf'));

if (importPdfBtn) {
  updateImportStatus('Import a PDF presentation to populate items automatically.');

  importPdfBtn.addEventListener('click', async () => {
    if (!pdfInput?.files?.length) {
      updateImportStatus('Please choose a PDF file to import.', 'error');
      pdfInput?.focus();
      return;
    }

    const file = pdfInput.files[0];

    try {
      importPdfBtn.disabled = true;

      updateImportStatus('Loading PDF tools…', 'info');
      await ensurePdfjsLib();

      updateImportStatus('Reading PDF and extracting items…', 'info');

      const imported = await extractItemsFromPdf(file);

      if (!imported.length) {
        updateImportStatus(
          'No items were detected. Ensure the PDF contains selectable text and try again.',
          'warning',
        );
        return;
      }

      items = [...items, ...imported];
      render();

      updateImportStatus(
        `Imported ${imported.length} item${imported.length === 1 ? '' : 's'}. Adjust details as needed.`,
        'success',
      );
    } catch (error) {
      console.error('Failed to import PDF', error);

      if (error?.code === 'PDFJS_MISSING') {
        updateImportStatus(
          'Unable to load the PDF parser. Check your connection or add pdf.js files to vendor/pdfjs and try again.',
          'error',
        );
        return;
      }

      updateImportStatus('Unable to import that PDF. Please verify the file and try again.', 'error');
    } finally {
      importPdfBtn.disabled = false;
    }
  });
}

const handleDragStart = (event) => {
  const card = event.currentTarget;
  dragIndex = Number(card.dataset.index);
  card.classList.add('dragging');
};

const handleDragEnd = (event) => {
  event.currentTarget.classList.remove('dragging');
  dragIndex = null;
};

const handleDragOver = (event) => {
  event.preventDefault();
  const card = event.currentTarget;
  const targetIndex = Number(card.dataset.index);

  if (dragIndex === null || dragIndex === targetIndex) return;

  const draggedItem = items[dragIndex];
  items.splice(dragIndex, 1);
  items.splice(targetIndex, 0, draggedItem);
  dragIndex = targetIndex;
  render();
};

const attachDragHandlers = () => {
  const cards = designGrid.querySelectorAll('.design-card');
  cards.forEach((card) => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
  });
};

render();
