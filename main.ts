import { Plugin, TFolder, TFile } from "obsidian";

export default class FolderNoteViewPlugin extends Plugin {
	private styleEl: HTMLStyleElement | null = null;
	private observer: MutationObserver | null = null;

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
				this.updateFolderNotesUI();
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", () => this.updateFolderNotesUI())
		);
		this.registerEvent(
			this.app.vault.on("rename", () => this.updateFolderNotesUI())
		);
	}

	onunload() {
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
			this.updateFolderNotesUI();
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
	 * Create a folder note for a folder
	 */
	private async createFolderNote(folder: TFolder): Promise<TFile | null> {
		const folderName = folder.name;
		const notePath = `${folder.path}/${folderName}.md`;

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
	 */
	private getFolderNote(folder: TFolder): TFile | null {
		const folderName = folder.name;
		const expectedPath = `${folder.path}/${folderName}.md`;

		const file = this.app.vault.getAbstractFileByPath(expectedPath);
		if (file instanceof TFile) {
			return file;
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
