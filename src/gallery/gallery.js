const appearance = document.querySelector('#theme');
appearance.value = document.documentElement.dataset.lhTheme;
appearance.addEventListener('change', () => {
  document.documentElement.dataset.lhTheme = appearance.value;
  try { localStorage.setItem('lighthouse.appearance', appearance.value); } catch { /* Page-local preference. */ }
});

const dialog = document.querySelector('#item-dialog');
const form = document.querySelector('#item-form');
const list = document.querySelector('#review-items');
const originalItems = list.cloneNode(true);
let opener;
for (const id of ['new-item', 'open-example']) {
  document.getElementById(id).addEventListener('click', (event) => {
    opener = event.currentTarget;
    form.reset();
    dialog.showModal();
  });
}
document.querySelector('#cancel-item').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener?.focus());
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = form.elements.title;
  if (!title.value.trim()) { title.setCustomValidity('Enter an item name.'); title.reportValidity(); return; }
  title.setCustomValidity('');
  const row = list.insertRow();
  row.insertCell().textContent = title.value.trim();
  row.insertCell().textContent = form.elements.area.value;
  const badge = document.createElement('span');
  badge.className = 'lh-badge';
  badge.textContent = 'Draft';
  row.insertCell().append(badge);
  document.querySelector('#result').textContent = `${list.rows.length} items. Added ${title.value.trim()}.`;
  dialog.close();
});
form.elements.title.addEventListener('input', () => form.elements.title.setCustomValidity(''));
document.querySelector('#reset-example').addEventListener('click', () => {
  list.replaceChildren(...Array.from(originalItems.children, (node) => node.cloneNode(true)));
  document.querySelector('#result').textContent = 'Example reset. 3 items.';
});
