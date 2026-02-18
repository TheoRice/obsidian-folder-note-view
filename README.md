# Folder Note View

An Obsidian plugin that treats folders as notes. Each folder can have a "folder note" - a markdown file with the same name as the folder - which acts as the folder's landing page.

## Features

- **Click folder to open note**: Clicking on a folder name opens its folder note instead of toggling the folder open/closed
- **Arrow toggles folder**: The collapse arrow still works normally to expand/collapse folder contents
- **Auto-create folder notes**: When you create a new folder, a folder note is automatically created inside it
- **Create on click**: Clicking a folder without a folder note automatically creates one
- **Hidden folder notes**: Folder notes are hidden from the file explorer to reduce clutter (they're still accessible by clicking the folder)

## Usage

### Opening a Folder Note
Click anywhere on a folder name (or the whitespace to its right) to open the folder note.

### Toggling Folder Expand/Collapse
Click the arrow icon to the left of the folder name to expand or collapse the folder contents.

### Creating Folder Notes
Folder notes are created automatically when:
1. You create a new folder
2. You click on a folder that doesn't have a folder note yet

### Folder Note Naming Convention
A folder note must have the exact same name as its parent folder:
```
Projects/
  Projects.md    <-- This is the folder note (hidden in explorer)
  task1.md
  task2.md
```

## Installation

### From Obsidian Community Plugins
*Coming soon*

### Manual Installation
1. Download `main.js` and `manifest.json` from the latest release
2. Create a folder called `folder-note-view` in your vault's `.obsidian/plugins/` directory
3. Copy `main.js` and `manifest.json` into the `folder-note-view` folder
4. Restart Obsidian or reload plugins
5. Enable "Folder Note View" in Settings > Community Plugins

## Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (comes with Node.js)

### Build Steps
```bash
# Clone the repository
git clone https://github.com/yourusername/folder-note-view.git
cd folder-note-view

# Install dependencies
npm install

# Build for production
npm run build

# Or run in development mode with hot reload
npm run dev
```

### Development
For development, you can symlink or copy the plugin folder to your vault's `.obsidian/plugins/` directory and run `npm run dev` for automatic rebuilding on changes.

## Compatibility

- Requires Obsidian v0.15.0 or higher
- Works on desktop and mobile

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
