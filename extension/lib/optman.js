class OptMan {
	constructor(storageName = 'options') {
		this.storageName = storageName;
	}

	init(setup) {
		this.setup = Object.assign({
			defaults: {},
			migrations: [],
		}, setup);

		chrome.runtime.onInstalled.addListener(reason => {
			console.info('Extension event:', reason);
			this.get((options = {}) => {
				console.info('Existing options:', options);
				if (this.setup.migrations.length > 0) {
					console.info('Running', this.setup.migrations.length, 'migrations');
					this.setup.migrations.forEach(migrate => migrate(options));
				}
				const newOptions = Object.assign(this.setup.defaults, options);
				this.set(newOptions);
			});
		});
	}

	get(callback) {
		const promise = new Promise(resolve => {
			chrome.storage.sync.get(this.storageName,
				keys => resolve(keys[this.storageName])
			);
		}).then(callback);

		if (!callback) {
			return promise;
		}
	}

	set(newOptions, callback) {
		const promise = new Promise(resolve => {
			chrome.storage.sync.set({
				[this.storageName]: newOptions,
			}, resolve);
		}).then(callback);

		if (!callback) {
			return promise;
		}
	}

	syncForm(form) {
		this.get(options => OptMan._applyToForm(options, form));
		form.addEventListener('input', e => this._handleFormUpdates(e));
		form.addEventListener('change', e => this._handleFormUpdates(e));
	}

	static _applyToForm(options, form) {
		Object.keys(options).forEach(name => {
			const els = form.querySelectorAll(`[name="${name}"]`);
			if (els.length > 0) {
				console.info('Set option', name, 'to', options[name]);
				switch (els[0].type) {
					case 'checkbox':
						els[0].checked = options[name];
						break;
					case 'radio': {
						const selected = Array.from(els)
						.filter(el => el.value === options[name]);
						if (selected.length > 0) {
							selected[0].checked = true;
						}
						break;
					}
					default:
						els[0].value = options[name];
						break;
				}
			} else {
				console.warn('Stored option {', name, ':', options[name], '} was not found on the page');
			}
		});
	}

	_handleFormUpdates(e) {
		const el = e.target;
		const name = el.name;
		let value = el.value;
		switch (el.type) {
			case 'checkbox':
				value = el.checked;
				break;
			default: break;
		}
		console.info('Saving option', el.name, 'to', value);
		this.set({
			[name]: value,
		});
	}
}

if (typeof exports === 'object') {
	exports.OptMan = OptMan;
}
