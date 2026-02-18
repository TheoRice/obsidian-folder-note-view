import { Plugin, TFolder, TFile } from "obsidian";

export default class FolderNoteViewPlugin extends Plugin {
	private styleEl: HTMLStyleElement | null = null;
	private observer: MutationObserver | null = null;
	private updateTimeout: number | null = null;

	async onload() {
		// Initial setup
		this.app.workspace.onLayoutReady(() => {
			this.updateFolderNotesUI();
			this.setupObserver();
		});

		// Re-apply when files change
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				// Auto-create folder note when a new folder is created
				if (file instanceof TFolder) {
					this.createFolderNote(file);
				}
				this.debouncedUpdate();
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", () => this.debouncedUpdate())
		);
		this.registerEvent(
			this.app.vault.on("rename", () => this.debouncedUpdate())
		);
	}

	/**
	 * Debounced update to avoid rapid successive updates
	 */
	private debouncedUpdate(): void {
		if (this.updateTimeout) {
			window.clearTimeout(this.updateTimeout);
		}
		this.updateTimeout = window.setTimeout(() => {
			this.updateFolderNotesUI();
			this.updateTimeout = null;
		}, 100);
	}

	onunload() {
		if (this.updateTimeout) {
			window.clearTimeout(this.updateTimeout);
			this.updateTimeout = null;
		}
		if (this.styleEl) {
			this.styleEl.remove();
			this.styleEl = null;
		}
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		// Remove all our markers
		document.querySelectorAll("[data-folder-note-handled]").forEach((el) => {
			el.removeAttribute("data-folder-note-handled");
		});
	}

	/**
	 * Setup mutation observer to handle dynamically added folder elements
	 */
	private setupObserver(): void {
		this.observer = new MutationObserver(() => {
			this.debouncedUpdate();
		});

		const fileExplorer = document.querySelector(".nav-files-container");
		if (fileExplorer) {
			this.observer.observe(fileExplorer, {
				childList: true,
				subtree: true,
			});
		}
	}

	/**
	 * Update UI: hide folder notes and attach click handlers
	 */
	private updateFolderNotesUI(): void {
		this.updateHiddenFolderNotes();
		this.attachClickHandlers();
	}

	/**
	 * Attach click handlers to folder title areas (excluding arrows)
	 */
	private attachClickHandlers(): void {
		const folders = this.app.vault.getAllLoadedFiles().filter(
			(f) => f instanceof TFolder
		) as TFolder[];

		for (const folder of folders) {
			// Find the folder title element
			const folderTitleEl = document.querySelector(
				`.nav-folder-title[data-path="${CSS.escape(folder.path)}"]`
			);
			if (!folderTitleEl) continue;

			// Skip if already processed
			if (folderTitleEl.hasAttribute("data-folder-note-handled")) {
				continue;
			}

			// Mark as processed
			folderTitleEl.setAttribute("data-folder-note-handled", "true");

			// Add click handler to the entire folder title area
			folderTitleEl.addEventListener("click", (evt: Event) => {
				const target = evt.target as HTMLElement;

				// Ignore clicks on the collapse arrow - let Obsidian handle those
				if (target.closest(".nav-folder-collapse-indicator")) {
					return;
				}

				evt.preventDefault();
				evt.stopPropagation();

				this.openOrCreateFolderNote(folder);
			});
		}
	}

	/**
	 * Open existing folder note or create one if it doesn't exist
	 */
	private async openOrCreateFolderNote(folder: TFolder): Promise<void> {
		let folderNote = this.getFolderNote(folder);

		if (!folderNote) {
			folderNote = await this.createFolderNote(folder);
		}

		if (folderNote) {
			this.app.workspace.getLeaf().openFile(folderNote);
		}
	}

	/**
	 * Create a folder note for a folder (as a sibling to match Periodic Notes)
	 */
	private async createFolderNote(folder: TFolder): Promise<TFile | null> {
		const folderName = folder.name;

		// Create as sibling: Parent/Folder.md (to match Periodic Notes behavior)
		const parent = folder.parent;
		const parentPath = parent?.path;
		const notePath = !parentPath || parentPath === "/" || parentPath === ""
			? `${folderName}.md`
			: `${parentPath}/${folderName}.md`;

		// Check if it already exists
		const existing = this.app.vault.getAbstractFileByPath(notePath);
		if (existing instanceof TFile) {
			return existing;
		}

		// Create the note
		try {
			const file = await this.app.vault.create(notePath, "");
			return file;
		} catch (e) {
			console.error("Failed to create folder note:", e);
			return null;
		}
	}

	/**
	 * Get the folder note for a folder (a note with the same name as the folder)
	 * Checks two locations (sibling first for Periodic Notes compatibility):
	 * 1. Sibling to the folder: Parent/Folder.md (alongside Parent/Folder/)
	 * 2. Inside the folder: Folder/Folder.md
	 */
	private getFolderNote(folder: TFolder): TFile | null {
		const folderName = folder.name;

		// Check sibling to the folder first: Parent/Folder.md
		// This is where Periodic Notes creates weekly/monthly notes
		const parent = folder.parent;
		if (parent) {
			const parentPath = parent.path;
			const siblingPath = parentPath === "/" || parentPath === ""
				? `${folderName}.md`
				: `${parentPath}/${folderName}.md`;
			const siblingFile = this.app.vault.getAbstractFileByPath(siblingPath);
			if (siblingFile instanceof TFile) {
				return siblingFile;
			}
		}

		// Check inside the folder: Folder/Folder.md
		const insidePath = `${folder.path}/${folderName}.md`;
		const insideFile = this.app.vault.getAbstractFileByPath(insidePath);
		if (insideFile instanceof TFile) {
			return insideFile;
		}

		return null;
	}

	/**
	 * Update the CSS to hide folder notes in the file explorer
	 */
	private updateHiddenFolderNotes(): void {
		const folders = this.app.vault.getAllLoadedFiles().filter(
			(f) => f instanceof TFolder
		) as TFolder[];

		const selectors: string[] = [];

		for (const folder of folders) {
			const folderNote = this.getFolderNote(folder);
			if (folderNote) {
				const escapedPath = CSS.escape(folderNote.path);
				selectors.push(`.nav-file-title[data-path="${escapedPath}"]`);
			}
		}

		if (!this.styleEl) {
			this.styleEl = document.createElement("style");
			this.styleEl.id = "folder-note-view-styles";
			document.head.appendChild(this.styleEl);
		}

		if (selectors.length > 0) {
			this.styleEl.textContent = `${selectors.join(",\n")} { display: none !important; }`;
		} else {
			this.styleEl.textContent = "";
		}
	}
}
