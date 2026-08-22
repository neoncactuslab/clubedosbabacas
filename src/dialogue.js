// Tocador de diálogo genérico, reutilizável por qualquer fase.
// dialogueTree = { start: 'id', nodes: { id: { speaker, text, next? , choices?: [{label, next?}] } } }
// vars = objeto de variáveis para interpolação, ex: { name: 'Fulano' }

export function interpolate(text, vars) {
  return text.replace(/\{(\w+)\}/g, function (_, key) {
    return vars[key] != null ? vars[key] : '';
  });
}

export function runDialogue(tree, vars, ui, onComplete) {
  let currentId = tree.start;

  function render() {
    const node = tree.nodes[currentId];
    ui.box.classList.add('show');
    ui.speaker.textContent = interpolate(node.speaker, vars);
    ui.text.textContent = interpolate(node.text, vars);
    ui.choices.innerHTML = '';

    if (node.choices && node.choices.length) {
      ui.continueBtn.style.display = 'none';
      node.choices.forEach(function (choice) {
        const btn = document.createElement('button');
        btn.className = 'dialogue-choice';
        btn.textContent = choice.label;
        btn.addEventListener('click', function () { advance(choice.next); });
        ui.choices.appendChild(btn);
      });
    } else {
      ui.continueBtn.style.display = '';
      ui.continueBtn.onclick = function () { advance(node.next); };
    }
  }

  function advance(nextId) {
    if (nextId) {
      currentId = nextId;
      render();
    } else {
      ui.box.classList.remove('show');
      onComplete();
    }
  }

  render();
}
