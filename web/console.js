(() => {

CodeMirror.keyMap.sublime['Shift-Ctrl-Enter'] = null;

var codemirror = CodeMirror(el => {
	el.id = 'console-input';
	$('.console-wrap').appendChild(el);
}, {
	placeholder: 'Shift + Enter to submit',
	lineNumbers: true,
	lineWrapping: true,
	indentUnit: 4,
	tabSize: 4,
	indentWithTabs: true,
	inputStyle: 'textarea',
	viewportMargin: Infinity,
	keyMap: 'sublime'
});

var hintWorker = null;

function hint() {
	return new Promise((resolve, _reject) => {
		if (typeof program == 'undefined') return;

		const cursor = codemirror.getCursor();
		var str = codemirror.getRange({line:0,ch:0}, cursor);
		var keyword = str.match(/[a-z0-9_]*$/i);
		if (!keyword) return;
		keyword = keyword[0];

		if (hintWorker) hintWorker.terminate();
		hintWorker = new Worker('hintWorker.js');
		hintWorker.postMessage([keyword, searchDatabase]);
		hintWorker.onmessage = e => {
			resolve({
				list: e.data.map(({name, match}) => ({
					text: name,
					render($el, self, data) {
						var $span = document.createElement('span');
						$span.innerHTML = name.split('').map((e, i) => {
							return match.includes(i) ? `<b>${e}</b>` : e;
						}).join('');
						$el.appendChild($span);
					}
				})),
				from: codemirror.posFromIndex(codemirror.indexFromPos(cursor) - keyword.length),
				to: cursor
			})
		};
	});
}

codemirror.on('inputRead', function (editor, event) {
	CodeMirror.showHint(codemirror, hint, {
		completeSingle: false,
		extraKeys: {
			'Shift-Tab': (cm, handle) => {
				handle.moveFocus(-1);
			},
			Tab(cm, handle) {
				handle.moveFocus(1);
			}
		}
	});
});

function htmlify(v, o) {
	var {input, noescape, error} = o || {};

	var $tr = document.createElement('tr');
	$tr.innerHTML =  `<td>${input ? '&gt;' : '&lt;'}</td><td>${noescape ? v : escapeHtml(v)}</td>`;
	if (error) {
		$tr.classList.add('error');
	}

	$('#console-display').appendChild($tr);
	$('#console-display-wrap').scrollTop = $('#console-display-wrap').scrollHeight;
}

$('#console-input').addEventListener('keydown', evt => {
	if (evt.key == 'Enter') {
		// submit
		if (evt.shiftKey) {
			evt.preventDefault();

			var v = codemirror.getValue();

			if (!v.trim()) return;

			htmlify(v.trim(), {input: true});

			if (typeof program == 'undefined') {
				$('#console-input').value = '';
				return htmlify('Error: program is not defined', {error: true});
			}

			try {
				var parsed = evalParser.parse(v);
			} catch (e) {
				htmlify(`Parse error: ${e.message}\n    at (<repl>:${e.location.start.line}:${e.location.start.column})`, {error: true});
				if (!evt.ctrlKey) codemirror.setValue('');
				return;
			}

			try {
				htmlify(ktx(program.evaluate(parsed).toTeXString(true, true)), {
					noescape: true
				});
			} catch (e) {
				console.error(e);
				htmlify(e, {error: true});
			} finally {
				if (!evt.ctrlKey) codemirror.setValue('');
			}

			return;
		}
	}

	// clear console
	if (evt.ctrlKey && evt.key == 'l') {
		evt.preventDefault();
		$('#console-display').innerHTML = '';
		htmlify('Console was cleared');
	}
});

function toggleConsole() {
	var hidden = $('.console-wrap-wrap').style.display == 'none';
	$('.console-wrap-wrap').style.display = hidden ? 'flex' : 'none';

	if (hidden) {
		codemirror.focus();
		codemirror.refresh();
	}
}

$('#button-show-console').addEventListener('click', () => {
	toggleConsole();
});

hotkeys('c', (evt, handler) => {
	evt.preventDefault();
	toggleConsole();
});

})();