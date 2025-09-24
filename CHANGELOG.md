# Change Log

All notable changes to the "Selection Path Copier" extension will be documented in this file.

## [1.3.0] - 2025-09-24

### Added
- GitHub Permalink feature - copies permanent GitHub links
  - `Copy GitHub Permalink` command (Cmd+Alt+P / Ctrl+Alt+P)
  - `Copy GitHub Permalink with Code` command (Cmd+Alt+Shift+P / Ctrl+Alt+Shift+P)
- New configuration option `githubPermalinkType` to choose between:
  - `commit` (default): Use commit hash for truly permanent references
  - `branch`: Use default branch name (main/master) for always-current references
- Automatic detection of default branch (main/master)
- Support for both SSH and HTTPS GitHub remote URLs
- Permalink formats:
  - Commit: `https://github.com/owner/repo/blob/{commit}/{file}#L{line}`
  - Branch: `https://github.com/owner/repo/blob/{branch}/{file}#L{line}`
- Code can be included with permalinks using existing format settings

## [1.2.0] - 2025-01-23

### Added
- New line number format options:
  - Editor format (file.ts:10)
  - Parentheses format (file.ts(10))
  - GitHub format remains as default
- New code format option for "Copy Path with Code":
  - Plain text format (default)
  - Markdown code block format with syntax highlighting

## [1.1.1] - 2025-01-23

### Added
- New configuration option `includeBlankLine` to control whether to include a blank line between path and code when using "Copy Path with Code"

## [1.1.0] - 2025-01-22

### Added
- Support for copying path when no text is selected (uses cursor position)
- Smart handling of empty lines - copies file path without line number
- Ability to use commands without text selection

## [1.0.3] - Previous Release

### Changed
- Icon image updated
- Performance optimizations

## [1.0.2] - Previous Release

### Changed
- Updated VSCode engine requirement from ^1.102.0 to ^1.74.0

## [1.0.0] - Initial Release

### Added
- Copy file path with line numbers in GitHub-style format
- Copy path with selected code content
- Support for relative and absolute paths
- Multi-line selection support
- Keyboard shortcuts and context menu integration