# Selection Path Copier

A Visual Studio Code extension that copies file paths with line numbers, code snippets, and GitHub permalinks. Supports multiple formats (GitHub, Editor, Parentheses) and works with both selected text and cursor position.

## Features

- **Copy Path with Line Numbers**: Copy file path with line numbers for selected text or cursor position
- **Smart Cursor Handling**: When no text is selected:
  - Copies path with cursor line number
  - On empty lines, copies just the file path without line number
- **Copy Path with Code**: Copy both the file path reference and the code content
- **Copy GitHub Permalink**: Generate permanent GitHub links using commit hash for stable references
- **Markdown Code Blocks**: Option to wrap code in markdown code blocks with syntax highlighting
- **Relative or Absolute Paths**: Configure whether to use relative paths (from workspace root) or absolute paths
- **Multi-line Selection Support**: Automatically formats single line or range references
- **Multiple Format Options**: GitHub, Editor, and Parentheses formats

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
   - **Copy GitHub Permalink**: `Cmd+Alt+P` (Mac) / `Ctrl+Alt+P` (Windows/Linux)
   - **Copy GitHub Permalink with Code**: `Cmd+Alt+Shift+P` (Mac) / `Ctrl+Alt+Shift+P` (Windows/Linux)

### Command Palette
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Search for:
     - `Selection Path Copier: Copy Path` - Copies path with line numbers
     - `Selection Path Copier: Copy Path with Code` - Copies path and selected code
     - `Selection Path Copier: Copy GitHub Permalink` - Copies GitHub permalink with commit hash
     - `Selection Path Copier: Copy GitHub Permalink with Code` - Copies GitHub permalink with commit hash and code

### Context Menu
   - Right-click on selected text
   - Choose from the copy options in the context menu

### Example Output

**GitHub Format (default):**
```
src/components/Header.tsx#L25-30
```

**Editor Format:**
```
src/components/Header.tsx:25-30
```

**Parentheses Format:**
```
src/components/Header.tsx(25-30)
```

**GitHub Permalink (commit hash - default):**
```
https://github.com/yoshi47/my-project/blob/e3873f70720c00e07f9b202a97367ab460f8051f/src/components/Header.tsx#L25-L30
```

**GitHub Permalink (branch name):**
```
https://github.com/yoshi47/my-project/blob/main/src/components/Header.tsx#L25-L30
```

**GitHub Permalink with Code:**
```
https://github.com/yoshi47/my-project/blob/e3873f70720c00e07f9b202a97367ab460f8051f/src/components/Header.tsx#L25-L30

export const Header: React.FC = () => {
  return (
    <header className="main-header">
      <h1>Welcome</h1>
    </header>
  );
}
```

**Copy Path with Code (Plain format):**
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

**Copy Path with Code (Markdown format):**
````
src/components/Header.tsx#L25-30

```typescript
export const Header: React.FC = () => {
  return (
    <header className="main-header">
      <h1>Welcome</h1>
    </header>
  );
}
```
````

## Extension Settings

This extension contributes the following settings:

* `selection-path-copier.pathType`: Choose between path types
  - `"relative"` (default): Use relative paths from workspace root
  - `"absolute"`: Use absolute file paths

* `selection-path-copier.includeBlankLine`: Control blank line when copying with code
  - `true` (default): Include a blank line between path and code
  - `false`: No blank line between path and code

* `selection-path-copier.lineNumberFormat`: Choose the line number reference format
  - `"github"` (default): GitHub format (e.g., `file.ts#L10` or `file.ts#L10-20`)
  - `"editor"`: Editor format (e.g., `file.ts:10` or `file.ts:10-20`)
  - `"parentheses"`: Parentheses format (e.g., `file.ts(10)` or `file.ts(10-20)`)

* `selection-path-copier.codeFormat`: Choose the code format when copying with code
  - `"plain"` (default): Plain text format
  - `"markdown"`: Markdown code block with syntax highlighting

* `selection-path-copier.githubPermalinkType`: Choose permalink reference type
  - `"commit"` (default): Use commit hash for permanent reference (e.g., `/blob/abc123...`)
  - `"branch"`: Use default branch name (e.g., `/blob/main` or `/blob/master`)
