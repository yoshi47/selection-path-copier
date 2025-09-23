# Selection Path Copier

A Visual Studio Code extension that copies file paths with line numbers in GitHub-style format. Works with both selected text and cursor position.

## Features

- **Copy Path with Line Numbers**: Copy file path with line numbers for selected text or cursor position
- **Smart Cursor Handling**: When no text is selected:
  - Copies path with cursor line number (e.g., `src/main.ts#L10`)
  - On empty lines, copies just the file path without line number
- **Copy Path with Code**: Copy both the file path reference and the code content
- **Relative or Absolute Paths**: Configure whether to use relative paths (from workspace root) or absolute paths
- **Multi-line Selection Support**: Automatically formats single line (`#L10`) or range (`#L10-15`) references

## Usage

### With Text Selection
1. Select code in the editor
2. Use one of the following methods:

### Without Text Selection (Cursor Position)
1. Place your cursor on any line
2. Use the same shortcuts/commands to copy the current line reference
3. On empty lines, only the file path will be copied

### Keyboard Shortcuts
   - **Copy Path**: `Cmd+Alt+C` (Mac) / `Ctrl+Alt+C` (Windows/Linux)
   - **Copy Path with Code**: `Cmd+Alt+Shift+C` (Mac) / `Ctrl+Alt+Shift+C` (Windows/Linux)

### Command Palette
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Search for:
     - `Selection Path Copier: Copy Path` - Copies path with line numbers
     - `Selection Path Copier: Copy Path with Code` - Copies path and selected code

### Context Menu
   - Right-click on selected text
   - Choose from the copy options in the context menu

### Example Output

**Copy Path (with selection):**
```
src/components/Header.tsx#L25-30
```

**Copy Path (cursor on line 25, no selection):**
```
src/components/Header.tsx#L25
```

**Copy Path (cursor on empty line):**
```
src/components/Header.tsx
```

**Copy Path with Code:**
```
src/components/Header.tsx#L25-30
export const Header: React.FC = () => {
  return (
    <header className="main-header">
      <h1>Welcome</h1>
    </header>
  );
}
```

## Extension Settings

This extension contributes the following settings:

* `selection-path-copier.pathType`: Choose between path types
  - `"relative"` (default): Use relative paths from workspace root
  - `"absolute"`: Use absolute file paths

* `selection-path-copier.includeBlankLine`: Control blank line when copying with code
  - `true` (default): Include a blank line between path and code
  - `false`: No blank line between path and code
