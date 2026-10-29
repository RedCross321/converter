let currencies = [];

const state = {
  fromCurrency: null,
  toCurrency: null,
  activeSide: 'from',
  fromAmount: '0',
  toAmount: '0',
  selectingFor: null
};

const mainScreen     = document.getElementById('main-screen');
const selectScreen   = document.getElementById('select-screen');
const fromSelector   = document.getElementById('from-selector');
const toSelector     = document.getElementById('to-selector');
const fromField      = document.getElementById('from-field');
const toField        = document.getElementById('to-field');
const fromAmountEl   = document.getElementById('from-amount');
const toAmountEl     = document.getElementById('to-amount');
const fromCodeEl     = document.getElementById('from-code');
const fromNameEl     = document.getElementById('from-name');
const fromSymbolEl   = document.getElementById('from-symbol');
const toCodeEl       = document.getElementById('to-code');
const toNameEl       = document.getElementById('to-name');
const toSymbolEl     = document.getElementById('to-symbol');
const numpad         = document.querySelector('.numpad');
const backBtn        = document.getElementById('back-btn');
const searchInput    = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const currencyList   = document.getElementById('currency-list');

async function loadCurrencies() {
  try {
    const response = await fetch("https://www.cbr-xml-daily.ru/daily_json.js")
    const data = await response.json()
    currencies = Object.values(data['Valute'])
    currencies.push({
      CharCode: "RUB",
      ID: "R01014F",
      Name: "Российский рубль",
      Nominal: 1,
      NumCode: '643',
      Value: 1
    })
    state.fromCurrency = currencies.find(c => c.CharCode === "RUB")
    state.toCurrency = currencies.find(c => c.CharCode === "USD")
    updateMainUI()
  } catch (err) {
    console.log(err)
  }
}

function showMainScreen() {
  selectScreen.classList.remove('active');
  mainScreen.classList.add('active');
  state.selectingFor = null;
  searchInput.value = '';
  clearSearchBtn.hidden = true;
}

function showSelectScreen(side) {
  state.selectingFor = side;
  mainScreen.classList.remove('active');
  selectScreen.classList.add('active');
  renderCurrencyList(currencies);
  searchInput.focus();
}

function updateMainUI() {
  if (!state.fromCurrency || !state.toCurrency) return;

  fromCodeEl.textContent   = state.fromCurrency.CharCode;
  fromNameEl.textContent   = state.fromCurrency.Name;
  fromSymbolEl.textContent = state.fromCurrency.Symbol || state.fromCurrency.CharCode;
  fromAmountEl.value       = state.fromAmount;

  toCodeEl.textContent   = state.toCurrency.CharCode;
  toNameEl.textContent   = state.toCurrency.Name;
  toSymbolEl.textContent = state.toCurrency.Symbol || state.toCurrency.CharCode;
  toAmountEl.value       = state.toAmount;

  fromField.classList.toggle('active', state.activeSide === 'from');
  toField.classList.toggle('active', state.activeSide === 'to');
}

function renderCurrencyList(list) {
  currencyList.innerHTML = '';

  const selected = state.selectingFor === 'from'
    ? state.fromCurrency
    : state.toCurrency;

  list.forEach(currency => {
    const li = document.createElement('li');
    li.className = 'currency-item';

    if (selected && selected.CharCode === currency.CharCode) {
      li.classList.add('selected');
    }

    li.innerHTML = `
      <div class="item-info">
        <span class="item-code">${currency.CharCode}</span>
        <span class="item-name">${currency.Name}</span>
      </div>
      <span class="check">✓</span>
    `;

    li.addEventListener('click', () => selectCurrency(currency));
    currencyList.appendChild(li);
  });
}

function getActiveAmount() {
  return state.activeSide === 'from' ? state.fromAmount : state.toAmount;
}

function setActiveAmount(value) {
  if (state.activeSide === 'from') {
    state.fromAmount = value;
  } else {
    state.toAmount = value;
  }
}

function handleDigit(value) {
  let current = getActiveAmount();

  if (current === '0' && value !== ',') {
    current = value;
  } else {
    if (value === ',' && current.includes(',')) return;
    current += value;
  }

  setActiveAmount(current);
  recalculate();
  updateMainUI();
}

function handleAC() {
  setActiveAmount('0');
  recalculate();
  updateMainUI();
}

function handleBackspace() {
  let current = getActiveAmount();

  if (current.length <= 1) {
    current = '0';
  } else {
    current = current.slice(0, -1);
  }

  setActiveAmount(current);
  recalculate();
  updateMainUI();
}

function setActiveSide(side) {
  state.activeSide = side;
  updateMainUI();
}

function convert(amount, fromCurr, toCurr) {
  if (!fromCurr || !toCurr) return 0;

  const amountInRub = amount * (fromCurr.Value / fromCurr.Nominal);
  const result = amountInRub / (toCurr.Value / toCurr.Nominal);

  return result;
}

function recalculate() {
  if (!state.fromCurrency || !state.toCurrency) return;

  const parse = (str) => parseFloat(str.replace(',', '.')) || 0;

  if (state.activeSide === 'from') {
    const amount = parse(state.fromAmount);
    const result = convert(amount, state.fromCurrency, state.toCurrency);
    state.toAmount = formatNumber(result);
  } else {
    const amount = parse(state.toAmount);
    const result = convert(amount, state.toCurrency, state.fromCurrency);
    state.fromAmount = formatNumber(result);
  }
}

function formatNumber(num) {
  if (!isFinite(num)) return '0';
  return num.toFixed(4)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}

function selectCurrency(currency) {
  if (state.selectingFor === 'from') {
    state.fromCurrency = currency;
  } else {
    state.toCurrency = currency;
  }

  recalculate();
  showMainScreen();
  updateMainUI();
}

function filterCurrencies(query) {
  const q = query.toLowerCase().trim();
  if (!q) return currencies;

  return currencies.filter(c =>
    c.CharCode.toLowerCase().includes(q) ||
    c.Name.toLowerCase().includes(q)
  );
}

function onSearchChange(e) {
  const query = e.target.value;
  clearSearchBtn.hidden = query.length === 0;

  const filtered = filterCurrencies(query);
  renderCurrencyList(filtered);
}

function initEventListeners() {
  fromSelector.addEventListener('click', () => showSelectScreen('from'));
  toSelector.addEventListener('click', () => showSelectScreen('to'));
  backBtn.addEventListener('click', showMainScreen);

  fromField.addEventListener('click', () => setActiveSide('from'));
  toField.addEventListener('click', () => setActiveSide('to'));

  numpad.addEventListener('click', (e) => {
    const btn = e.target.closest('.numpad-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    const value  = btn.dataset.value;
    if (action === 'ac') handleAC();
    else if (action === 'backspace') handleBackspace();
    else if (value !== undefined) handleDigit(value);
  });

  searchInput.addEventListener('change', onSearchChange);
  searchInput.addEventListener('input', onSearchChange);

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.hidden = true;
    renderCurrencyList(currencies);
    searchInput.focus();
  });
}

function init() {
  initEventListeners();
  loadCurrencies();
}

init();
