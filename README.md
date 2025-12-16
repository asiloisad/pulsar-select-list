# pulsar-select-list

This module is an [etch component](https://github.com/atom/etch) that can be used in Pulsar packages to show a select list with fuzzy filtering, keyboard/mouse navigation and other cool features.

## Usage

After installing the module, you can simply require it and use it as a standalone component:

```js
const SelectListView = require("pulsar-select-list");

const usersSelectList = new SelectListView({
  items: ["Alice", "Bob", "Carol"],
  elementForItem: (item) => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  },
  didConfirmSelection: (item) => {
    console.log("Selected:", item);
  },
});

// Show as modal panel
usersSelectList.show();
```

Or within another etch component:

```jsx
render () {
  return (
    <SelectListView items={this.items} />
  )
}
```

## API

### Constructor Props

When creating a new instance of a select list, or when calling `update` on an existing one, you can supply a JavaScript object that can contain any of the following properties:

#### Required

- `items: [Object]`: an array containing the objects you want to show in the select list.
- `elementForItem: (item: Object, options: Object) -> HTMLElement`: a function that is called whenever an item needs to be displayed.
  - `options: Object`:
    - `selected: Boolean`: indicating whether item is selected or not.
    - `index: Number`: item's index.
    - `filterKey: String|null`: the text that was matched against (from `filterKeyForItem` or item itself).
    - `matchIndices: [Number]|null`: lazy getter - character indices in `filterKey` that matched the query. Only computed when accessed.

#### Optional

- `className: String`: CSS class name(s) to add to the select list element. Multiple classes can be space-separated.
- `maxResults: Number`: the number of maximum items that are shown.
- `filter: (items: [Object], query: String) -> [Object]`: a function that allows to decide which items to show whenever the query changes. By default, it uses Pulsar's built-in fuzzy matcher.
- `filterKeyForItem: (item: Object) -> String`: when `filter` is not provided, this function will be called to retrieve a string property on each item and that will be used to filter them.
- `filterQuery: (query: String) -> String`: a function that allows to apply a transformation to the user query and whose return value will be used to filter items.
- `removeDiacritics: Boolean`: when `true`, removes diacritical marks from both the query and item text before filtering, enabling accent-insensitive matching (e.g., "cafe" matches "café").
- `filterScoreModifier: (score: Number, item: Object) -> Number`: a function to modify the fuzzy match score for each item. Useful for applying custom ranking factors (e.g., boosting by recency or proximity).
- `algorithm: String`: the fuzzy matching algorithm to use. Options: `'fuzzaldrin'` (default), `'command-t'` (path-aware, better for file paths).
- `numThreads: Number`: number of threads for parallel matching. Defaults to 80% of available CPUs.
- `maxGap: Number`: maximum gap between consecutive matched characters (only for `'command-t'` algorithm). Lower values require tighter matches. Defaults to infinite.
- `query: String`: a string that will replace the contents of the query editor.
- `selectQuery: Boolean`: a boolean indicating whether the query text should be selected or not.
- `order: (item1: Object, item2: Object) -> Number`: a function that allows to change the order in which items are shown.
- `emptyMessage: String`: a string shown when the list is empty.
- `errorMessage: String`: a string that needs to be set when you want to notify the user that an error occurred.
- `infoMessage: String`: a string that needs to be set when you want to provide some information to the user.
- `helpMessage: String|Array`: content to display when help is toggled. Can be a string or JSX array for rich formatting.
- `helpMarkdown: String`: markdown content to display when help is toggled. Rendered using Pulsar's built-in markdown renderer.
- `loadingMessage: String`: a string that needs to be set when you are loading items in the background.
- `loadingSpinner: Boolean`: show spinner next to loading message.
- `loadingBadge: String/Number`: a string or number that needs to be set when the progress status changes.
- `itemsClassList: [String]`: an array of strings that will be added as class names to the items element.
- `initialSelectionIndex: Number`: the index of the item to initially select; defaults to `0`.
- `placeholderText: String`: placeholder text to display in the query editor when empty.
- `skipCommandsRegistration: Boolean`: when `true`, skips registering default keyboard commands.

### Registered Commands

By default, the component registers these commands on its element:

- `core:move-up` / `core:move-down`: Navigate items
- `core:move-to-top` / `core:move-to-bottom`: Jump to first/last item
- `core:confirm`: Confirm selection
- `core:cancel`: Cancel selection
- `select-list:help`: Toggle help message visibility (requires `helpMessage` or `helpMarkdown`)

#### Callbacks

- `didChangeQuery: (query: String) -> Void`: called when the query changes.
- `didChangeSelection: (item: Object) -> Void`: called when the selected item changes.
- `didConfirmSelection: (item: Object) -> Void`: called when the user clicks or presses Enter on an item.
- `didConfirmEmptySelection: () -> Void`: called when the user presses Enter but the list is empty.
- `didCancelSelection: () -> Void`: called when the user presses Esc or the list loses focus.
- `willShow: () -> Void`: called when transitioning from hidden to visible, useful for data preparation.

### Instance Properties

- `processedQuery: String`: The cached result of `getFilterQuery()`, updated after each query change. Useful in `elementForItem` to avoid calling `getFilterQuery()` multiple times.
- `selectionIndex: Number|undefined`: The index of the currently selected item, or `undefined` if nothing is selected.
- `refs.queryEditor`: The underlying TextEditor component for the query input.

### Instance Methods

#### Panel Management

- `show()`: Shows the select list as a modal panel and focuses the query editor. Calls `willShow` callback if provided.
- `hide()`: Hides the panel and restores focus to the previously focused element.
- `toggle()`: Toggles the visibility of the panel.
- `isVisible()`: Returns `true` if the panel is currently visible.
- `isHelpMode()`: Returns `true` if help is currently displayed.
- `toggleHelp()`: Toggles help message visibility. Only works if `helpMessage` is set.
- `hideHelp()`: Hides help message if currently shown.

#### Other Methods

- `focus()`: Focuses the query editor.
- `reset()`: Clears the query editor text.
- `destroy()`: Disposes of the component and cleans up resources.
- `update(props)`: Updates the component with new props.
- `getQuery()`: Returns the current query string.
- `getFilterKey(item)`: Returns the filter key string for an item (from cache, `filterKeyForItem`, or item itself).
- `getMatchIndices(item, filterKey?)`: Returns match indices for an item, computing lazily if needed. Prefer using `options.matchIndices` in `elementForItem` instead.
- `getFilterQuery()`: Returns the filtered query string (applies `filterQuery` transformation).
- `setQueryFromSelection()`: Sets the query text from the active editor's selection. Returns `true` if successful, `false` if no editor, no selection, or selection contains newlines.
- `getSelectedItem()`: Returns the currently selected item.
- `selectPrevious()`: Selects the previous item.
- `selectNext()`: Selects the next item.
- `selectFirst()`: Selects the first item.
- `selectLast()`: Selects the last item.
- `selectNone()`: Deselects all items.
- `selectIndex(index)`: Selects the item at the given index.
- `selectItem(item)`: Selects the given item.
- `confirmSelection()`: Confirms the current selection.
- `cancelSelection()`: Cancels the selection.

### Static Methods

#### `SelectListView.getMatchIndices(text, query, options)`

Computes fuzzy match indices for a text against a query. Useful outside of `elementForItem` context.

```js
const { getMatchIndices } = require("pulsar-select-list");

const indices = getMatchIndices("MyComponent.js", "mcjs");
// => [0, 2, 11, 12] or null if no match

// With diacritics removal
const indices = getMatchIndices("café", "cafe", { removeDiacritics: true });
// => [0, 1, 2, 3]
```

- `text: String`: the text to match against.
- `query: String`: the query to match.
- `options: Object` (optional):
  - `removeDiacritics: Boolean`: remove diacritical marks before matching.

Returns an array of character indices that matched, or `null` if no match.

#### `SelectListView.highlightMatches(text, matchIndices, options)`

Creates a DocumentFragment with highlighted match characters.

```js
// In elementForItem, use options.matchIndices (lazy getter):
elementForItem: (item, { filterKey, matchIndices }) => {
  const li = document.createElement("li");
  li.appendChild(SelectListView.highlightMatches(filterKey, matchIndices));
  return li;
}

// With custom class name
const fragment = SelectListView.highlightMatches(text, matchIndices, {
  className: "my-highlight",
});
```

- `text: String`: the text to highlight.
- `matchIndices: [Number]`: array of character indices to highlight.
- `options: Object` (optional):
  - `className: String`: CSS class for highlighted spans; defaults to `'character-match'`.

Returns a `DocumentFragment` containing text nodes and `<span>` elements with the specified class.

#### `SelectListView.removeDiacritics(str)`

Removes diacritical marks (accents) from a string.

```js
SelectListView.removeDiacritics("café"); // => 'cafe'
SelectListView.removeDiacritics("naïve"); // => 'naive'
SelectListView.removeDiacritics("Müller"); // => 'Muller'
```

- `str: String`: the string to process.

Returns the string with diacritical marks removed. Uses `String.normalize('NFD')` internally.

#### `SelectListView.createTwoLineItem(options)`

Creates a two-line list item element with primary and optional secondary lines. This is a convenience helper for the common Atom/Pulsar two-line item pattern.

```js
// In elementForItem:
elementForItem: (item, { filterKey, matchIndices }) => {
  return SelectListView.createTwoLineItem({
    primary: SelectListView.highlightMatches(filterKey, matchIndices),
    secondary: item.description,
    icon: ["icon-file-text"],
  });
}
```

- `options: Object`:
  - `primary: String|Node`: Primary line content (text string or DOM node)
  - `secondary: String|Node` (optional): Secondary line content
  - `icon: [String]` (optional): Icon class names to add to primary line (adds `icon` class automatically)

Returns an `HTMLLIElement` with the structure:

```html
<li class="two-lines">
  <div class="primary-line icon [icon]">[primary]</div>
  <div class="secondary-line">[secondary]</div>
</li>
```

#### `SelectListView.setScheduler(scheduler)`

Sets the etch scheduler.

#### `SelectListView.getScheduler()`

Gets the current etch scheduler.

## Example

```js
const SelectListView = require("pulsar-select-list");
const fs = require("fs");
const path = require("path");

class MyFileList {
  constructor() {
    this.selectList = new SelectListView({
      className: "my-package my-file-list",
      items: [], // initialize required
      filterKeyForItem: (item) => item.name,
      emptyMessage: "No files found",
      helpMarkdown: fs.readFileSync(path.join(__dirname, "help.md"), "utf8"),
      willShow: () => {
        this.loadFiles();
      },
      elementForItem: (item, { index, filterKey, matchIndices }) => {
        const li = document.createElement("li");
        // filterKey is what was matched, matchIndices are positions in filterKey
        // matchIndices is a lazy getter - only computed when accessed
        li.appendChild(SelectListView.highlightMatches(filterKey, matchIndices));
        li.addEventListener("contextmenu", () => {
          this.selectList.selectIndex(index);
        });
        return li;
      },
      didConfirmSelection: (item) => {
        atom.workspace.open(item.path);
        this.selectList.hide();
      },
      didCancelSelection: () => {
        this.selectList.hide();
      },
    });
  }

  loadFiles() {
    // Load files and update items
    this.selectList.update({ items: this.files });
  }

  toggle() {
    this.selectList.toggle();
  }

  destroy() {
    this.selectList.destroy();
  }
}
```

### Advanced: Custom Score Modifier

Use `filterScoreModifier` to customize ranking:

```js
const selectList = new SelectListView({
  items: files,
  elementForItem: (item) => {
    const li = document.createElement("li");
    li.textContent = item.path;
    return li;
  },
  filterKeyForItem: (item) => item.path,
  // Boost score by proximity (items closer to current file rank higher)
  filterScoreModifier: (score, item) => score / item.distance,
  didConfirmSelection: (item) => {
    atom.workspace.open(item.path);
  },
});
```

## Migration from atom-select-list

If you're migrating from `atom-select-list`, here are the key changes:

### Package.json

```diff
"dependencies": {
-  "atom-select-list": ...,
+  "pulsar-select-list": ...
}
```

### Import

```diff
-const SelectListView = require('atom-select-list')
+const SelectListView = require('pulsar-select-list')
```

### Panel Management

The component now manages its own panel. Remove custom panel handling:

```diff
-this.panel = null
-this.previouslyFocusedElement = null

this.selectList = new SelectListView({
+  className: 'my-list',
   items: [],
+  willShow: () => this.onWillShow(),
   // ...
})
-this.selectList.element.classList.add('my-list')

-showView() {
-  this.previouslyFocusedElement = document.activeElement
-  if (!this.panel) {
-    this.panel = atom.workspace.addModalPanel({ item: this.selectList })
-  }
-  this.panel.show()
-  this.selectList.focus()
-}
-
-hideView() {
-  this.panel.hide()
-  if (this.previouslyFocusedElement) {
-    this.previouslyFocusedElement.focus()
-  }
-}
-
-toggleView() {
-  if (this.panel && this.panel.isVisible()) {
-    this.hideView()
-  } else {
-    this.showView()
-  }
-}

// Use built-in methods:
-this.toggleView()
+this.selectList.toggle()

-this.hideView()
+this.selectList.hide()
```

### Diacritics

Replace external diacritics library with built-in static method:

```diff
-const Diacritics = require('diacritic')

-Diacritics.clean(text)
+SelectListView.removeDiacritics(text)
```

### Match Highlighting

Use `filterKey` and `matchIndices` from the options parameter (lazy getter - only computed when accessed):

```diff
-elementForItem(item, options) {
-  const query = this.query || ''
-  const matches = query
-    ? atom.ui.fuzzyMatcher.match(item.name, query, { recordMatchIndexes: true }).matchIndexes
-    : []
-  el.appendChild(SelectListView.highlightMatches(item.name, matches))
+elementForItem(item, { filterKey, matchIndices }) {
+  // matchIndices references positions in filterKey
+  el.appendChild(SelectListView.highlightMatches(filterKey, matchIndices))
}
```
