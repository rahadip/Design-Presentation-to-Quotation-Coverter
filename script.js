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

toggleViewBtn.textContent = 'Show Quotation';

let items = [];
let dragIndex = null;

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
