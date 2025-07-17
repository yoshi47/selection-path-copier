# Selection Path Copier

A Visual Studio Code extension that copies file paths with line numbers in GitHub-style format.

## Features

- **Copy Path with Line Numbers**: Select code and copy its file path with line numbers (e.g., `src/main.ts#L10-15`)
- **Copy Path with Code**: Copy both the file path reference and the selected code content
- **Relative or Absolute Paths**: Configure whether to use relative paths (from workspace root) or absolute paths
- **Multi-line Selection Support**: Automatically formats single line (`#L10`) or range (`#L10-15`) references

## Usage

1. Select code in the editor
2. Use one of the following methods:

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

**Copy Path:**
```
src/components/Header.tsx#L25-30
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
